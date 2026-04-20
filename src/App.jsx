import { useEffect, useState } from 'react';
import OrganizerPortal from './components/OrganizerPortal';
import AttendeePortal from './components/AttendeePortal';
import VerifierPortal from './components/VerifierPortal';
import Hero from './components/Hero';
import ActiveEvents from './components/ActiveEvents';
import './styles/app.css';
import { getReadContract, normalizeEvent } from './lib/ticketchain';

export default function App() {
  const [currentView, setCurrentView] = useState('selection');
  const [walletAddress, setWalletAddress] = useState('');
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [walletError, setWalletError] = useState('');
  const [showContactModal, setShowContactModal] = useState(false);

  const [events, setEvents] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [preselectedEvent, setPreselectedEvent] = useState(null);

  async function connectWallet() {
    try {
      setWalletError('');

      if (!window.ethereum) {
        setWalletError('MetaMask is not installed.');
        return;
      }

      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      if (accounts && accounts.length > 0) {
        setWalletAddress(accounts[0]);
        setIsWalletConnected(true);
        await loadEventsFromBlockchain();
      }
    } catch (error) {
      console.error(error);
      setWalletError('Wallet connection failed.');
    }
  }

  async function loadEventsFromBlockchain() {
    try {
      const contract = await getReadContract();
      const chainEvents = await contract.getAllEvents();
      const formatted = chainEvents.map(normalizeEvent);
      setEvents(formatted);
    } catch (error) {
      console.error(error);
    }
  }

  useEffect(() => {
    if (isWalletConnected) {
      loadEventsFromBlockchain();
    }
  }, [isWalletConnected]);

  function shortAddress(address) {
    return address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '';
  }

  function handleHomeEventSelect(event) {
    setPreselectedEvent(event);
    setCurrentView('attendee');
  }

  return (
    <div className="app-main-wrapper">
      <header className="main-app-header">
        <div className="logo-text">TicketChain</div>

        <nav className="nav-links role-nav">
          <span onClick={() => setCurrentView('organizer')}>Organizer</span>
          <span onClick={() => setCurrentView('attendee')}>Attendee</span>
          <span onClick={() => setCurrentView('verifier')}>Verifier</span>
        </nav>

        <div className="header-actions">
          <button
            type="button"
            className="contact-sales-btn"
            onClick={() => setShowContactModal(true)}
          >
            Contact Sales →
          </button>

          <button
            type="button"
            className={`wallet-connect-btn ${
              isWalletConnected ? 'wallet-connected' : ''
            }`}
            onClick={connectWallet}
          >
            {!isWalletConnected ? (
              'Connect'
            ) : (
              <>
                <span className="wallet-green-dot"></span>
                Connected | {shortAddress(walletAddress)}
              </>
            )}
          </button>
        </div>
      </header>

      {showContactModal && (
        <div
          className="contact-modal-overlay"
          onClick={() => setShowContactModal(false)}
        >
          <div
            className="contact-modal concert-contact-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="contact-modal-close"
              onClick={() => setShowContactModal(false)}
            >
              ×
            </button>

            <div className="contact-modal-dark-layer"></div>

            <div className="contact-modal-inner">
              <p className="contact-modal-mini-title">TicketChain Concert Support</p>

              <h2 className="happy-booking-title">Happy Booking</h2>

              <p className="happy-booking-subtext">
                Let us help you create a smooth, secure, and exciting ticketing
                experience for every event.
              </p>

              <div className="sales-manager-card">
                <p className="sales-manager-label">Sales Manager</p>
                <h3 className="sales-manager-name">Elizabeth Uzoho</h3>

                <div className="sales-contact-item">
                  <span className="sales-contact-tag">Phone</span>
                  <a href="tel:4482008511" className="sales-contact-link">
                    4482008511
                  </a>
                </div>

                <div className="sales-contact-item">
                  <span className="sales-contact-tag">Email</span>
                  <a
                    href="mailto:uzoho.elizabeth@gmail.com"
                    className="sales-contact-link"
                  >
                    uzoho.elizabeth@gmail.com
                  </a>
                </div>
              </div>

              <div className="contact-modal-actions">
                <a
                  href="mailto:uzoho.elizabeth@gmail.com"
                  className="contact-modal-main-btn"
                >
                  Email Sales Manager
                </a>

                <a
                  href="tel:4482008511"
                  className="contact-modal-secondary-btn"
                >
                  Call Now
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {walletError && <div className="wallet-error-banner">{walletError}</div>}

      <main>
        {currentView === 'selection' && (
          <>
            <Hero />
            <ActiveEvents
              events={events}
              onSelectEvent={handleHomeEventSelect}
            />
          </>
        )}

        {currentView === 'organizer' && (
          <OrganizerPortal
            onBack={() => setCurrentView('selection')}
            events={events}
            setEvents={setEvents}
            walletAddress={walletAddress}
            isWalletConnected={isWalletConnected}
            refreshEvents={loadEventsFromBlockchain}
          />
        )}

        {currentView === 'attendee' && (
          <AttendeePortal
            onBack={() => setCurrentView('selection')}
            events={events}
            tickets={tickets}
            setTickets={setTickets}
            setEvents={setEvents}
            walletAddress={walletAddress}
            isWalletConnected={isWalletConnected}
            refreshEvents={loadEventsFromBlockchain}
            preselectedEvent={preselectedEvent}
          />
        )}

        {currentView === 'verifier' && (
          <VerifierPortal
            onBack={() => setCurrentView('selection')}
            tickets={tickets}
            setTickets={setTickets}
            walletAddress={walletAddress}
            isWalletConnected={isWalletConnected}
          />
        )}
      </main>
    </div>
  );
}
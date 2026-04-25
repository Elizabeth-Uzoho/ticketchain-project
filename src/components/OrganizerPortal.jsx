import { useState } from 'react';
import footballBg from '../assets/football.jpg';
import { ethers } from 'ethers';
import {
  safeWalletWrite,
  safeWaitForTransaction,
} from '../lib/ticketchain';

export default function OrganizerPortal({
  onBack,
  events,
  walletAddress,
  isWalletConnected,
  refreshEvents,
}) {
  const [activeSection, setActiveSection] = useState('');
  const [eventName, setEventName] = useState('');
  const [dateTime, setDateTime] = useState('');
  const [venue, setVenue] = useState('');
  const [vipPrice, setVipPrice] = useState('');
  const [regularPrice, setRegularPrice] = useState('');
  const [message, setMessage] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function normalizeText(value) {
    return String(value || '').trim().toLowerCase();
  }

  function hasMatchingEvent(eventList, expectedName, expectedVenue, expectedDateTime) {
    return eventList.some((event) => {
      const sameName =
        normalizeText(event.eventName) === normalizeText(expectedName);

      const sameVenue =
        normalizeText(event.venue) === normalizeText(expectedVenue);

      const eventTime = event.dateTime ? new Date(event.dateTime).getTime() : 0;
      const expectedTime = expectedDateTime
        ? new Date(expectedDateTime).getTime()
        : 0;

      const closeEnoughTime =
        eventTime && expectedTime
          ? Math.abs(eventTime - expectedTime) < 60000
          : false;

      return sameName && sameVenue && closeEnoughTime;
    });
  }

  async function refreshEventsSafely() {
    try {
      const refreshed = await refreshEvents();
      if (Array.isArray(refreshed)) {
        return refreshed;
      }
    } catch (error) {
      console.error('refreshEventsSafely error:', error);
    }

    return null;
  }

  async function recoverCreatedEvent(expectedName, expectedVenue, expectedDateTime) {
    setMessage('Checking blockchain status...');

    for (let i = 0; i < 6; i += 1) {
      const refreshedEvents = await refreshEventsSafely();

      if (
        Array.isArray(refreshedEvents) &&
        hasMatchingEvent(
          refreshedEvents,
          expectedName,
          expectedVenue,
          expectedDateTime
        )
      ) {
        setEventName('');
        setDateTime('');
        setVenue('');
        setVipPrice('');
        setRegularPrice('');
        setActiveSection('view');
        setMessage('Event created successfully.');
        return true;
      }

      if (
        hasMatchingEvent(
          events,
          expectedName,
          expectedVenue,
          expectedDateTime
        )
      ) {
        setEventName('');
        setDateTime('');
        setVenue('');
        setVipPrice('');
        setRegularPrice('');
        setActiveSection('view');
        setMessage('Event created successfully.');
        return true;
      }

      await wait(2500);
    }

    setMessage(
      'MetaMask may have completed the transaction. Please open View Events again in a few seconds.'
    );
    return false;
  }

  function getFriendlyError(error) {
    const text = String(
      error?.reason || error?.shortMessage || error?.message || ''
    );

    const lower = text.toLowerCase();

    if (
      text.includes('ACTION_REJECTED') ||
      lower.includes('user rejected') ||
      lower.includes('user denied')
    ) {
      return 'Transaction was cancelled in MetaMask.';
    }

    if (lower.includes('insufficient funds')) {
      return 'Insufficient funds to complete this transaction.';
    }

    return 'Event creation could not be confirmed immediately. Please check View Events.';
  }

  async function handleCreateEvent() {
    if (isCreating) return;

    try {
      if (!isWalletConnected) {
        setMessage('Please connect MetaMask first.');
        return;
      }

      if (!eventName || !dateTime || !venue || !vipPrice || !regularPrice) {
        setMessage('Please fill in all event details.');
        return;
      }

      setIsCreating(true);
      setMessage('MetaMask approval requested...');

      const expectedName = eventName;
      const expectedVenue = venue;
      const expectedDateTime = dateTime;

      const eventTimestamp = Math.floor(new Date(dateTime).getTime() / 1000);
      const vipPriceWei = ethers.parseEther(vipPrice);
      const regularPriceWei = ethers.parseEther(regularPrice);

      const tx = await safeWalletWrite((contract) =>
        contract.createEvent(
          eventName,
          eventTimestamp,
          venue,
          vipPriceWei,
          regularPriceWei
        )
      );

      setMessage('Waiting for blockchain confirmation...');
      await safeWaitForTransaction(tx);

      await refreshEventsSafely();

      setEventName('');
      setDateTime('');
      setVenue('');
      setVipPrice('');
      setRegularPrice('');
      setMessage('Event created successfully.');
      setActiveSection('view');
    } catch (error) {
      console.error('Organizer create error:', error);

      const recovered = await recoverCreatedEvent(eventName, venue, dateTime);
      if (!recovered) {
        setMessage(getFriendlyError(error));
      }
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div
      className="portal-page organizer-page"
      style={{ backgroundImage: `url(${footballBg})` }}
    >
      <div className="portal-overlay"></div>

      <div className="portal-card portal-card-glass">
        <button onClick={onBack} className="back-btn">
          ← Back to Homepage
        </button>

        <h1>Organizer Portal</h1>
        <p>Create and manage event listings.</p>

        {walletAddress && (
          <p className="wallet-text">Connected Wallet: {walletAddress}</p>
        )}

        <div className="portal-action-row">
          <button
            onClick={() => {
              setActiveSection('create');
              setMessage('');
            }}
            className="portal-small-btn"
          >
            Create Event
          </button>

          <button
            onClick={() => {
              setActiveSection('view');
              setMessage('');
            }}
            className="portal-small-btn"
          >
            View Events
          </button>
        </div>

        {activeSection === 'create' && (
          <div className="function-box">
            <h3>Create Event</h3>

            <input
              type="text"
              placeholder="Event Name"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              className="portal-input"
              disabled={isCreating}
            />

            <input
              type="datetime-local"
              value={dateTime}
              onChange={(e) => setDateTime(e.target.value)}
              className="portal-input"
              disabled={isCreating}
            />

            <input
              type="text"
              placeholder="Venue"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              className="portal-input"
              disabled={isCreating}
            />

            <input
              type="text"
              placeholder="VIP Ticket Price (ETH)"
              value={vipPrice}
              onChange={(e) => setVipPrice(e.target.value)}
              className="portal-input"
              disabled={isCreating}
            />

            <input
              type="text"
              placeholder="Regular Ticket Price (ETH)"
              value={regularPrice}
              onChange={(e) => setRegularPrice(e.target.value)}
              className="portal-input"
              disabled={isCreating}
            />

            <button
              onClick={handleCreateEvent}
              className="portal-small-btn"
              disabled={isCreating}
            >
              {isCreating ? 'Processing...' : 'Save Event'}
            </button>

            {message && <p className="portal-message">{message}</p>}
          </div>
        )}

        {activeSection === 'view' && (
          <div className="function-box">
            <h3>Created Events</h3>

            {events.length === 0 ? (
              <p>No events created yet.</p>
            ) : (
              <div className="ticket-card-grid compact-ticket-grid">
                {events.map((event) => (
                  <div
                    key={event.id}
                    className="fancy-ticket-card compact-fancy-ticket organizer-ticket-card"
                  >
                    <div className="ticket-left-strip">
                      <span className="ticket-type-badge">EVENT</span>
                    </div>

                    <div className="ticket-main">
                      <div className="ticket-top-row">
                        <div>
                          <p className="ticket-mini-label">CREATED EVENT</p>
                          <h4 className="ticket-event-name">{event.eventName}</h4>
                        </div>

                        <div className="ticket-status-pill">
                          {event.active ? 'ACTIVE' : 'INACTIVE'}
                        </div>
                      </div>

                      <div className="ticket-meta-grid compact-ticket-meta">
                        <div>
                          <span className="ticket-label">DATE</span>
                          <p className="ticket-value">
                            {new Date(event.dateTime).toLocaleString()}
                          </p>
                        </div>

                        <div>
                          <span className="ticket-label">VENUE</span>
                          <p className="ticket-value">{event.venue}</p>
                        </div>
                      </div>

                      <div className="ticket-bottom-row organizer-bottom-row">
                        <div className="ticket-serial-box">
                          <span className="ticket-label">VIP</span>
                          <p className="ticket-serial small-ticket-text">
                            {event.vipPriceEth} ETH
                          </p>
                          <span className="ticket-label sold-label">
                            SOLD: {event.vipSold}
                          </span>
                        </div>

                        <div className="ticket-serial-box">
                          <span className="ticket-label">REGULAR</span>
                          <p className="ticket-serial small-ticket-text">
                            {event.regularPriceEth} ETH
                          </p>
                          <span className="ticket-label sold-label">
                            SOLD: {event.regularSold}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="ticket-right-stub">
                      <div className="stub-inner">
                        <span className="stub-title">EVENT</span>
                        <div className="stub-qr">
                          <span>QR</span>
                        </div>
                        <span className="stub-type">
                          {event.active ? 'OPEN' : 'CLOSED'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {message && <p className="portal-message">{message}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
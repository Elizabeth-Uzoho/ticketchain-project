import { useEffect, useState } from 'react';
import concertBg from '../assets/concert.jpg';
import footballBg from '../assets/football.jpg';
import elizabethPicnicBg from '../assets/elizabethpicnic.jpg';
import beyonceBg from '../assets/beyonce.jpg';
import blockchainBg from '../assets/blockchain.jpg';
import {
  getReadContract,
  normalizeTicket,
  safeWalletWrite,
  safeWaitForTransaction,
} from '../lib/ticketchain';

export default function AttendeePortal({
  onBack,
  events,
  tickets,
  setTickets,
  walletAddress,
  isWalletConnected,
  refreshEvents,
  preselectedEvent,
}) {
  const [activeSection, setActiveSection] = useState('');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedTicketType, setSelectedTicketType] = useState('');
  const [message, setMessage] = useState('');
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showBookedTicketPopup, setShowBookedTicketPopup] = useState(false);
  const [latestBookedTicket, setLatestBookedTicket] = useState(null);
  const [isBooking, setIsBooking] = useState(false);

  useEffect(() => {
    if (preselectedEvent) {
      setSelectedEvent(preselectedEvent);
      setSelectedTicketType('');
      setMessage('');
      setShowBookingModal(true);
      setActiveSection('browse');
    }
  }, [preselectedEvent]);

  function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function getEventImage(eventName) {
    const name = String(eventName || '').toLowerCase().trim();

    if (name === 'beyonce picnic') return beyonceBg;
    if (name === 'elizabeth picnic') return elizabethPicnicBg;
    if (name.includes('blockchain')) return blockchainBg;
    if (name === 'beyonce concert') return concertBg;

    if (
      name.includes('league') ||
      name.includes('football') ||
      name.includes('soccer') ||
      name.includes('stadium')
    ) {
      return footballBg;
    }

    return concertBg;
  }

  function handleSelectEvent(event) {
    setSelectedEvent(event);
    setSelectedTicketType('');
    setMessage('');
    setShowBookingModal(true);
    setActiveSection('browse');
  }

  function closeBookingModal() {
    if (isBooking) return;
    setShowBookingModal(false);
    setSelectedTicketType('');
    setMessage('');
  }

  function closeBookedTicketPopup() {
    setShowBookedTicketPopup(false);
  }

  function extractSerialValue(serialNumber) {
    if (!serialNumber) return 0;
    const digitsOnly = String(serialNumber).replace(/\D/g, '');
    return digitsOnly ? Number(digitsOnly) : 0;
  }

  function sortTicketsNewestFirst(ticketList) {
    return [...ticketList].sort((a, b) => {
      const serialDiff =
        extractSerialValue(b.serialNumber) - extractSerialValue(a.serialNumber);

      if (serialDiff !== 0) return serialDiff;

      const timeA = a.dateTime ? new Date(a.dateTime).getTime() : 0;
      const timeB = b.dateTime ? new Date(b.dateTime).getTime() : 0;

      return timeB - timeA;
    });
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

    return 'Booking could not be confirmed immediately. Please check My Tickets.';
  }

  async function loadMyTicketsSilently() {
    if (!isWalletConnected) return [];

    try {
      const readContract = await getReadContract();
      const myTickets = await readContract.getMyTickets({ from: walletAddress });
      const formatted = myTickets.map(normalizeTicket);

      const enriched = formatted.map((ticket) => {
        const evt = events.find((e) => String(e.id) === String(ticket.eventId));

        return {
          ...ticket,
          eventName: evt?.eventName || `Event #${ticket.eventId}`,
          dateTime: evt?.dateTime || null,
          venue: evt?.venue || 'Unknown',
        };
      });

      const sortedTickets = sortTicketsNewestFirst(enriched);
      setTickets(sortedTickets);
      return sortedTickets;
    } catch (fallbackError) {
      console.error('readContract getMyTickets fallback failed:', fallbackError);

      try {
        const txReadContract = await safeWalletWrite((contract) => contract, {
          retries: 0,
        });

        const myTickets = await txReadContract.getMyTickets();
        const formatted = myTickets.map(normalizeTicket);

        const enriched = formatted.map((ticket) => {
          const evt = events.find((e) => String(e.id) === String(ticket.eventId));

          return {
            ...ticket,
            eventName: evt?.eventName || `Event #${ticket.eventId}`,
            dateTime: evt?.dateTime || null,
            venue: evt?.venue || 'Unknown',
          };
        });

        const sortedTickets = sortTicketsNewestFirst(enriched);
        setTickets(sortedTickets);
        return sortedTickets;
      } catch (error) {
        console.error('loadMyTicketsSilently error:', error);
        return [];
      }
    }
  }

  async function loadMyTickets() {
    if (!isWalletConnected) {
      setMessage('Please connect MetaMask first.');
      return [];
    }

    return await loadMyTicketsSilently();
  }

  async function findMatchingBookedTicket(ticketType) {
    const loadedTickets = await loadMyTicketsSilently();

    const exactMatch = loadedTickets.find((ticket) => {
      return (
        selectedEvent &&
        String(ticket.eventId) === String(selectedEvent.id) &&
        String(ticket.ticketType).toLowerCase() === String(ticketType).toLowerCase()
      );
    });

    return exactMatch || loadedTickets[0] || null;
  }

  async function recoverBookingAfterTimeout(ticketType) {
    setMessage('Checking blockchain status...');

    for (let i = 0; i < 6; i += 1) {
      try {
        await refreshEvents();
      } catch (error) {
        console.error('refreshEvents attendee recovery error:', error);
      }

      const foundTicket = await findMatchingBookedTicket(ticketType);

      if (foundTicket) {
        setLatestBookedTicket(foundTicket);
        setShowBookingModal(false);
        setSelectedTicketType('');
        setActiveSection('ticket');
        setShowBookedTicketPopup(true);
        setMessage('Ticket booked successfully.');
        return true;
      }

      await wait(2500);
    }

    setMessage(
      'MetaMask may have completed the transaction. Please open My Tickets again in a few seconds.'
    );
    return false;
  }

  async function handleBookTicket() {
    if (isBooking) return;

    try {
      if (!isWalletConnected) {
        setMessage('Please connect MetaMask first.');
        return;
      }

      if (!selectedEvent) {
        setMessage('Select an event first.');
        return;
      }

      if (!selectedTicketType) {
        setMessage('Choose VIP or Regular.');
        return;
      }

      setIsBooking(true);
      setMessage('Opening MetaMask...');

      const ticketTypeValue = selectedTicketType === 'VIP' ? 0 : 1;
      const valueToSend =
        selectedTicketType === 'VIP'
          ? selectedEvent.vipPriceWei
          : selectedEvent.regularPriceWei;

      const tx = await safeWalletWrite((contract) =>
        contract.bookTicket(selectedEvent.id, ticketTypeValue, {
          value: valueToSend,
        })
      );

      setMessage('Waiting for blockchain confirmation...');
      await safeWaitForTransaction(tx);

      try {
        await refreshEvents();
      } catch (error) {
        console.error('refreshEvents after booking:', error);
      }

      const bookedTicket = await findMatchingBookedTicket(selectedTicketType);

      setShowBookingModal(false);
      setSelectedTicketType('');
      setActiveSection('ticket');

      if (bookedTicket) {
        setLatestBookedTicket(bookedTicket);
        setShowBookedTicketPopup(true);
      }

      setMessage('Ticket booked successfully.');
    } catch (error) {
      console.error('Attendee booking error:', error);

      const recovered = await recoverBookingAfterTimeout(selectedTicketType);
      if (!recovered) {
        setMessage(getFriendlyError(error));
      }
    } finally {
      setIsBooking(false);
    }
  }

  async function openMyTickets() {
    setActiveSection('ticket');
    setMessage('');
    await loadMyTickets();
  }

  const availableEvents = events.filter((event) => event.active);

  return (
    <div
      className="portal-page attendee-page"
      style={{ backgroundImage: `url(${concertBg})` }}
    >
      <div className="portal-overlay"></div>

      <div className="portal-card portal-card-glass">
        <button onClick={onBack} className="back-btn">
          ← Back to Homepage
        </button>

        <h1>Attendee Portal</h1>
        <p>Browse and book your tickets.</p>

        {walletAddress && (
          <p className="wallet-text">Wallet: {walletAddress}</p>
        )}

        <div className="portal-action-row">
          <button
            onClick={() => {
              setActiveSection('browse');
              setMessage('');
            }}
            className="portal-small-btn"
          >
            Browse Events
          </button>

          <button onClick={openMyTickets} className="portal-small-btn">
            My Tickets
          </button>
        </div>

        {activeSection === '' && (
          <div className="function-box attendee-function-box">
            <h3>Welcome</h3>
            <p className="dark-text">
              Choose <strong>Browse Events</strong> to see available events or{' '}
              <strong>My Tickets</strong> to view your booked tickets.
            </p>
          </div>
        )}

        {activeSection === 'browse' && (
          <div className="function-box attendee-function-box">
            <h3>Available Events</h3>

            {availableEvents.length === 0 ? (
              <p className="dark-text">No events available.</p>
            ) : (
              <div className="event-list-grid attendee-event-grid">
                {availableEvents.map((event) => (
                  <div
                    key={event.id}
                    className="mini-display-card compact-event-card attendee-event-card"
                  >
                    <div
                      className="attendee-event-image"
                      style={{
                        backgroundImage: `url(${getEventImage(event.eventName)})`,
                      }}
                    >
                      <div className="attendee-event-image-overlay">
                        <span className="attendee-event-badge">Upcoming</span>
                      </div>
                    </div>

                    <div className="attendee-event-content">
                      <p className="event-card-title">{event.eventName}</p>
                      <p className="event-card-text">
                        {new Date(event.dateTime).toLocaleString()}
                      </p>
                      <p className="event-card-text">{event.venue}</p>
                      <p className="event-card-text">VIP: {event.vipPriceEth} ETH</p>
                      <p className="event-card-text">
                        Regular: {event.regularPriceEth} ETH
                      </p>

                      <button
                        onClick={() => handleSelectEvent(event)}
                        className="portal-small-btn event-select-btn"
                      >
                        Select Event
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeSection === 'ticket' && (
          <div className="function-box">
            <h3>My Tickets</h3>

            {message && <p className="portal-message dark-text">{message}</p>}

            {tickets.length === 0 ? (
              <p className="dark-text">No tickets yet.</p>
            ) : (
              <div className="ticket-card-grid compact-ticket-grid">
                {tickets.map((ticket) => (
                  <div
                    key={ticket.serialNumber}
                    className={`fancy-ticket-card compact-fancy-ticket attendee-ticket-card ${
                      ticket.ticketType === 'VIP' ? 'vip-ticket' : 'regular-ticket'
                    } ${
                      latestBookedTicket?.serialNumber === ticket.serialNumber
                        ? 'new-ticket-highlight'
                        : ''
                    }`}
                  >
                    <div className="ticket-left-strip">
                      <span className="ticket-type-badge">
                        {ticket.ticketType}
                      </span>
                    </div>

                    <div className="ticket-main">
                      <div className="ticket-top-row">
                        <div>
                          <p className="ticket-mini-label">EVENT TICKET</p>
                          <h4 className="ticket-event-name">{ticket.eventName}</h4>
                        </div>

                        <div className="ticket-status-pill">
                          {ticket.isUsed ? 'USED' : 'VALID'}
                        </div>
                      </div>

                      <div className="ticket-meta-grid compact-ticket-meta">
                        <div>
                          <span className="ticket-label">DATE</span>
                          <p className="ticket-value">
                            {ticket.dateTime
                              ? new Date(ticket.dateTime).toLocaleString()
                              : 'N/A'}
                          </p>
                        </div>

                        <div>
                          <span className="ticket-label">VENUE</span>
                          <p className="ticket-value">{ticket.venue}</p>
                        </div>
                      </div>

                      <div className="ticket-bottom-row">
                        <div className="ticket-serial-box">
                          <span className="ticket-label">PRICE</span>
                          <p className="ticket-serial small-ticket-text">
                            {ticket.pricePaidEth || '--'} ETH
                          </p>
                          <span className="ticket-label sold-label">
                            SERIAL: {ticket.serialNumber}
                          </span>
                        </div>

                        <div className="ticket-serial-box">
                          <span className="ticket-label">TYPE</span>
                          <p className="ticket-serial small-ticket-text">
                            {ticket.ticketType}
                          </p>
                          <span className="ticket-label sold-label">
                            ENTRY: {ticket.isUsed ? 'CLOSED' : 'OPEN'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="ticket-right-stub">
                      <div className="stub-inner">
                        <span className="stub-title">ENTRY</span>
                        <div className="stub-qr">
                          <span>QR</span>
                        </div>
                        <span className="stub-type">{ticket.ticketType}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {showBookingModal && selectedEvent && (
        <div className="booking-modal-overlay" onClick={closeBookingModal}>
          <div className="booking-modal" onClick={(e) => e.stopPropagation()}>
            <button
              className="booking-modal-close"
              onClick={closeBookingModal}
              disabled={isBooking}
            >
              ×
            </button>

            <div className="booking-modal-header">
              <p className="booking-modal-kicker">Book Event</p>
              <h3 className="booking-modal-title">{selectedEvent.eventName}</h3>
              <p className="booking-modal-info">
                {new Date(selectedEvent.dateTime).toLocaleString()}
              </p>
              <p className="booking-modal-info">{selectedEvent.venue}</p>
            </div>

            <div className="booking-ticket-options">
              <button
                onClick={() => setSelectedTicketType('VIP')}
                disabled={isBooking}
                className={`ticket-option-card vip-option ${
                  selectedTicketType === 'VIP' ? 'ticket-option-selected' : ''
                }`}
              >
                <span className="ticket-option-label">VIP</span>
                <span className="ticket-option-price">
                  {selectedEvent.vipPriceEth} ETH
                </span>
              </button>

              <button
                onClick={() => setSelectedTicketType('Regular')}
                disabled={isBooking}
                className={`ticket-option-card regular-option ${
                  selectedTicketType === 'Regular'
                    ? 'ticket-option-selected'
                    : ''
                }`}
              >
                <span className="ticket-option-label">Regular</span>
                <span className="ticket-option-price">
                  {selectedEvent.regularPriceEth} ETH
                </span>
              </button>
            </div>

            {selectedTicketType && (
              <p className="booking-selected-line">
                Selected ticket: <strong>{selectedTicketType}</strong>
              </p>
            )}

            {message && <p className="booking-message">{message}</p>}

            <div className="booking-modal-actions">
              <button
                className="booking-main-btn"
                onClick={handleBookTicket}
                disabled={isBooking}
              >
                {isBooking ? 'Processing...' : 'Book Ticket'}
              </button>

              <button
                className="booking-cancel-btn"
                onClick={closeBookingModal}
                disabled={isBooking}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showBookedTicketPopup && latestBookedTicket && (
        <div
          className="booking-modal-overlay"
          onClick={closeBookedTicketPopup}
        >
          <div
            className="booking-modal booked-ticket-popup"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="booking-modal-close"
              onClick={closeBookedTicketPopup}
            >
              ×
            </button>

            <div className="booking-modal-header">
              <p className="booking-modal-kicker">Booking Successful</p>
              <h3 className="booking-modal-title">Your New Ticket</h3>
            </div>

            <div className="booked-ticket-preview">
              <p className="booking-modal-info">
                <strong>Event:</strong> {latestBookedTicket.eventName}
              </p>
              <p className="booking-modal-info">
                <strong>Date:</strong>{' '}
                {latestBookedTicket.dateTime
                  ? new Date(latestBookedTicket.dateTime).toLocaleString()
                  : 'N/A'}
              </p>
              <p className="booking-modal-info">
                <strong>Venue:</strong> {latestBookedTicket.venue}
              </p>
              <p className="booking-modal-info">
                <strong>Ticket Type:</strong> {latestBookedTicket.ticketType}
              </p>
              <p className="booking-modal-info">
                <strong>Price:</strong> {latestBookedTicket.pricePaidEth || '--'} ETH
              </p>
              <p className="booking-modal-info">
                <strong>Serial Number:</strong> {latestBookedTicket.serialNumber}
              </p>
              <p className="booking-modal-info">
                <strong>Status:</strong>{' '}
                {latestBookedTicket.isUsed ? 'USED' : 'VALID'}
              </p>
            </div>

            <div className="booking-modal-actions">
              <button
                className="booking-main-btn"
                onClick={closeBookedTicketPopup}
              >
                View My Tickets
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
import { useEffect, useState } from 'react';
import concertBg from '../assets/concert.jpg';
import { getSignerContract, normalizeTicket } from '../lib/ticketchain';

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
  const [activeSection, setActiveSection] = useState('browse');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedTicketType, setSelectedTicketType] = useState('');
  const [message, setMessage] = useState('');
  const [showBookingModal, setShowBookingModal] = useState(false);

  useEffect(() => {
    if (preselectedEvent) {
      setSelectedEvent(preselectedEvent);
      setSelectedTicketType('');
      setMessage('');
      setShowBookingModal(true);
      setActiveSection('browse');
    }
  }, [preselectedEvent]);

  function handleSelectEvent(event) {
    setSelectedEvent(event);
    setSelectedTicketType('');
    setMessage('');
    setShowBookingModal(true);
    setActiveSection('browse');
  }

  function closeBookingModal() {
    setShowBookingModal(false);
    setSelectedTicketType('');
    setMessage('');
  }

  async function loadMyTickets() {
    try {
      if (!isWalletConnected) {
        setMessage('Please connect MetaMask first.');
        return;
      }

      const contract = await getSignerContract();
      const myTickets = await contract.getMyTickets();
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

      setTickets(enriched);
      setMessage('');
    } catch (error) {
      console.error(error);
      setMessage('Failed to load tickets.');
    }
  }

  async function handleBookTicket() {
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

      const contract = await getSignerContract();
      const ticketTypeValue = selectedTicketType === 'VIP' ? 0 : 1;

      const valueToSend =
        selectedTicketType === 'VIP'
          ? selectedEvent.vipPriceWei
          : selectedEvent.regularPriceWei;

      setMessage('Opening MetaMask...');
      const tx = await contract.bookTicket(selectedEvent.id, ticketTypeValue, {
        value: valueToSend,
      });

      setMessage('Waiting for confirmation...');
      await tx.wait();

      await refreshEvents();
      await loadMyTickets();

      setMessage('Ticket booked successfully.');
      setShowBookingModal(false);
      setSelectedTicketType('');
      setActiveSection('ticket');
    } catch (error) {
      console.error(error);

      if (error?.reason) {
        setMessage(error.reason);
      } else if (error?.message) {
        setMessage(error.message);
      } else {
        setMessage('Booking failed.');
      }
    }
  }

  async function openMyTickets() {
    setActiveSection('ticket');
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
          ← Back to Dashboard
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
          <div
            className="booking-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button className="booking-modal-close" onClick={closeBookingModal}>
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
              >
                Book Ticket
              </button>

              <button
                className="booking-cancel-btn"
                onClick={closeBookingModal}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
import concertBg from '../assets/concert.jpg';

export default function ActiveEvents({ events, onSelectEvent }) {
  const upcomingEvents = events.filter((event) => event.active);

  return (
    <section className="upcoming-events-section">
      <div className="upcoming-events-header">
        <p className="upcoming-events-kicker">Discover your next experience</p>
        <h2 className="upcoming-events-title">Upcoming Events</h2>
        <p className="upcoming-events-subtitle">
          Browse events created by organizers and book the one you want.
        </p>
      </div>

      {upcomingEvents.length === 0 ? (
        <div className="empty-upcoming-state">
          <h3>No upcoming events yet</h3>
          <p>
            Once the organizer creates events, they will appear here for booking.
          </p>
        </div>
      ) : (
        <div className="upcoming-events-grid">
          {upcomingEvents.map((event) => (
            <div key={event.id} className="upcoming-event-card">
              <div
                className="upcoming-event-image"
                style={{ backgroundImage: `url(${concertBg})` }}
              >
                <div className="upcoming-event-image-overlay">
                  <span className="upcoming-event-badge">Upcoming</span>
                </div>
              </div>

              <div className="upcoming-event-body">
                <h3 className="upcoming-event-name">{event.eventName}</h3>

                <div className="upcoming-event-meta">
                  <p>
                    <strong>Date:</strong>{' '}
                    {new Date(event.dateTime).toLocaleString()}
                  </p>
                  <p>
                    <strong>Venue:</strong> {event.venue}
                  </p>
                  <p>
                    <strong>VIP:</strong> {event.vipPriceEth} ETH
                  </p>
                  <p>
                    <strong>Regular:</strong> {event.regularPriceEth} ETH
                  </p>
                </div>

                <button
                  className="book-event-btn"
                  onClick={() => onSelectEvent(event)}
                >
                  Book Event
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
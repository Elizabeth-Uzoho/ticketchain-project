// src/components/RoleSelection.jsx
export default function RoleSelection({ setView }) {
  return (
    <div className="central-stage-content">
      <h1 className="hero-title">Select Your Role</h1>
      <div className="role-bars-container">
        
        {/* Applied Role-Specific Classes */}
        <button className="role-bar role-bar--organizer" onClick={() => setView('organizer')}>
          <div className="icon-placeholder">🏢</div> {/* Replace with modern icon */}
          <div className="role-text">
            <h2>Organizer</h2>
            <p>Create, manage events, and issue secure tickets</p>
          </div>
        </button>
        
        <button className="role-bar role-bar--attendee" onClick={() => setView('attendee')}>
          <div className="icon-placeholder">🎟️</div>
          <div className="role-text">
            <h2>Attendee</h2>
            <p>Browse upcoming events and book your passes</p>
          </div>
        </button>
        
        <button className="role-bar role-bar--verifier" onClick={() => setView('verifier')}>
          <div className="icon-placeholder">🔍</div>
          <div className="role-text">
            <h2>Verifier</h2>
            <p>Scan and validate ticket authenticity</p>
          </div>
        </button>
      </div>
    </div>
  );
}
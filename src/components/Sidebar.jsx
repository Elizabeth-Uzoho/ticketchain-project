export default function Sidebar({ activeRole, setActiveRole }) {
  return (
    <nav className="sidebar">
      <h2>TicketChain</h2>
      <button onClick={() => setActiveRole('organizer')}>Organizer</button>
      <button onClick={() => setActiveRole('attendee')}>Attendee</button>
      <button onClick={() => setActiveRole('verifier')}>Verifier</button>
    </nav>
  );
}
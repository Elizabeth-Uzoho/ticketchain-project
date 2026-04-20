export default function Hero() {
  return (
    <section className="hero-container">
      <div className="hero-content">
        <h1 className="hero-title">
          Smart, Secure
          <br />
          Ticketing for the
          <br />
          Decentralized
          <br />
          Web.
        </h1>

        <p className="hero-subtitle">
          Leverage the power of Ethereum for immutable, transparent event
          access, powered by the TicketChain platform.
        </p>

        <div className="hero-actions">
          <button className="btn-primary">Create a Secure Event →</button>
          <button className="btn-secondary">Verify Authenticity →</button>
        </div>
      </div>

      <div className="hero-visual">
        <div className="phone-mockup">
          <div className="phone-notch"></div>

          <div className="phone-inner">
            <div className="phone-header-new">
              <div className="mini-brand">
                <div className="mini-brand-icon">T</div>
                <div className="mini-brand-text">TicketChain</div>
              </div>

              <h2 className="wallet-heading">
                My Ticket
                <br />
                Wallet.
              </h2>
            </div>

            <div className="event-card-image">
              <div className="event-overlay-text">TicketChain</div>
            </div>

            <div className="ticket-details-full">
              <h3 className="match-title">WORLD CUP FINAL 2026:</h3>
              <h4 className="match-subtitle">USA vs BRAZIL</h4>

              <p className="ticket-info-line">Venue: MetLife Stadium, NY</p>
              <p className="ticket-info-line">
                Date/Time: July 19, 2026, 3 PM EST
              </p>
              <p className="ticket-info-line">Owner Wallet: 0x123...abc</p>

              <div className="validation-area">
                <p className="valid-status-full">Validated Ticket Chain Access</p>
                <p className="hash-id-line">Hash ID: 0x5f40...f4a2 (Valid)</p>

                <div className="fake-qr">
                  {Array.from({ length: 36 }).map((_, index) => (
                    <div key={index}></div>
                  ))}
                </div>

                <p className="verified-ticket-text">Verified Ticket</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
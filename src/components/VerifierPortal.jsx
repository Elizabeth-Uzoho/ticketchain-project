import { useState } from 'react';
import verifierBg from '../assets/verifier.jpg';
import { getReadContract, getSignerContract } from '../lib/ticketchain';

export default function VerifierPortal({
  onBack,
  walletAddress,
  isWalletConnected,
}) {
  const [serialNumber, setSerialNumber] = useState('');
  const [result, setResult] = useState(null);
  const [message, setMessage] = useState('');

  async function handleVerifyTicket() {
    try {
      if (!isWalletConnected) {
        setMessage('Please connect MetaMask first.');
        return;
      }

      if (!serialNumber.trim()) {
        setMessage('Enter a serial number first.');
        return;
      }

      setMessage('');
      setResult(null);

      const readContract = await getReadContract();
      const checked = await readContract.checkTicket(serialNumber);

      if (!checked.exists) {
        setResult({ status: 'invalid', message: 'Invalid Ticket' });
        return;
      }

      if (checked.isUsed) {
        setResult({
          status: 'used',
          message: 'Ticket Already Used',
          ticket: {
            eventName: checked.eventName,
            venue: checked.venue,
            ticketType: Number(checked.ticketType) === 0 ? 'VIP' : 'Regular',
            serialNumber,
          },
        });
        return;
      }

      const signerContract = await getSignerContract();
      setMessage('MetaMask approval requested...');
      const tx = await signerContract.verifyAndUseTicket(serialNumber);

      setMessage('Waiting for blockchain confirmation...');
      await tx.wait();

      const checkedAgain = await readContract.checkTicket(serialNumber);

      setResult({
        status: 'valid',
        message: 'Valid Ticket',
        ticket: {
          eventName: checkedAgain.eventName,
          venue: checkedAgain.venue,
          ticketType: Number(checkedAgain.ticketType) === 0 ? 'VIP' : 'Regular',
          serialNumber,
        },
      });

      setMessage('Ticket verified and marked as used on blockchain.');
    } catch (error) {
      console.error(error);
      if (error?.reason) {
        setMessage(error.reason);
      } else if (error?.message) {
        setMessage(error.message);
      } else {
        setMessage('Failed to verify ticket.');
      }
    }
  }

  return (
    <div
      className="portal-page verifier-page"
      style={{ backgroundImage: `url(${verifierBg})` }}
    >
      <div className="portal-overlay"></div>

      <div className="portal-card portal-card-glass">
        <button onClick={onBack} className="back-btn">
          ← Back to Dashboard
        </button>

        <h1>Verifier Portal</h1>
        <p>Scan tickets to verify authenticity.</p>
        {walletAddress && <p className="wallet-text">Connected Wallet: {walletAddress}</p>}

        <div className="function-box">
          <h3>Verify Ticket</h3>

          <input
            type="text"
            placeholder="Enter serial number"
            value={serialNumber}
            onChange={(e) => setSerialNumber(e.target.value)}
            className="portal-input"
          />

          <button onClick={handleVerifyTicket} className="portal-small-btn">
            Verify
          </button>

          {message && <p className="portal-message">{message}</p>}

          {result && (
            <div className="mini-display-card verification-result-card">
              <p><strong>{result.message}</strong></p>

              {result.ticket ? (
                <>
                  <p><strong>Event:</strong> {result.ticket.eventName}</p>
                  <p><strong>Venue:</strong> {result.ticket.venue}</p>
                  <p><strong>Type:</strong> {result.ticket.ticketType}</p>
                  <p><strong>Serial:</strong> {result.ticket.serialNumber}</p>
                  <p>
                    <strong>Status:</strong>{' '}
                    {result.status === 'valid'
                      ? 'Valid for Entry'
                      : result.status === 'used'
                      ? 'Already Used'
                      : 'Invalid'}
                  </p>
                </>
              ) : (
                <p>This ticket does not exist in the system.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
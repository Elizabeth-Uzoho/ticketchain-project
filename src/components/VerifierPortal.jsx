import { useState } from 'react';
import verifierBg from '../assets/verifier.jpg';
import {
  getReadContract,
  safeWalletWrite,
  safeWaitForTransaction,
} from '../lib/ticketchain';

export default function VerifierPortal({
  onBack,
  walletAddress,
  isWalletConnected,
}) {
  const [serialNumber, setSerialNumber] = useState('');
  const [result, setResult] = useState(null);
  const [message, setMessage] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
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

    return 'Verification could not be confirmed immediately. Please check the ticket again.';
  }

  async function checkTicketStatus(ticketSerial) {
    const readContract = await getReadContract();
    return await readContract.checkTicket(ticketSerial);
  }

  async function recoverVerificationAfterTimeout(ticketSerial) {
    setMessage('Checking ticket status...');

    for (let i = 0; i < 6; i += 1) {
      try {
        const checkedAgain = await checkTicketStatus(ticketSerial);

        if (checkedAgain.exists && checkedAgain.isUsed) {
          setResult({
            status: 'valid',
            message: 'Valid Ticket',
            ticket: {
              eventName: checkedAgain.eventName,
              venue: checkedAgain.venue,
              ticketType: Number(checkedAgain.ticketType) === 0 ? 'VIP' : 'Regular',
              serialNumber: ticketSerial,
            },
          });

          setMessage('Ticket verified and marked as used.');
          return true;
        }
      } catch (error) {
        console.error('Verifier recovery error:', error);
      }

      await wait(2500);
    }

    setMessage(
      'MetaMask may have completed verification. Please check this ticket again in a few seconds.'
    );
    return false;
  }

  async function handleVerifyTicket() {
    if (isVerifying) return;

    try {
      if (!isWalletConnected) {
        setMessage('Please connect MetaMask first.');
        return;
      }

      if (!serialNumber.trim()) {
        setMessage('Enter a serial number first.');
        return;
      }

      setIsVerifying(true);
      setMessage('');
      setResult(null);

      const cleanedSerial = serialNumber.trim();
      const readContract = await getReadContract();
      const checked = await readContract.checkTicket(cleanedSerial);

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
            serialNumber: cleanedSerial,
          },
        });
        return;
      }

      setMessage('MetaMask approval requested...');

      const tx = await safeWalletWrite((contract) =>
        contract.verifyAndUseTicket(cleanedSerial)
      );

      setMessage('Waiting for blockchain confirmation...');
      await safeWaitForTransaction(tx);

      const checkedAgain = await readContract.checkTicket(cleanedSerial);

      setResult({
        status: 'valid',
        message: 'Valid Ticket',
        ticket: {
          eventName: checkedAgain.eventName,
          venue: checkedAgain.venue,
          ticketType: Number(checkedAgain.ticketType) === 0 ? 'VIP' : 'Regular',
          serialNumber: cleanedSerial,
        },
      });

      setMessage('Ticket verified and marked as used.');
    } catch (error) {
      console.error('Verifier error:', error);

      const recovered = await recoverVerificationAfterTimeout(serialNumber.trim());
      if (!recovered) {
        setMessage(getFriendlyError(error));
      }
    } finally {
      setIsVerifying(false);
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
          ← Back to Homepage
        </button>

        <h1>Verifier Portal</h1>
        <p>Scan tickets to verify authenticity.</p>

        {walletAddress && (
          <p className="wallet-text">Connected Wallet: {walletAddress}</p>
        )}

        <div className="function-box">
          <h3>Verify Ticket</h3>

          <input
            type="text"
            placeholder="Enter serial number"
            value={serialNumber}
            onChange={(e) => setSerialNumber(e.target.value)}
            className="portal-input"
            disabled={isVerifying}
          />

          <button
            onClick={handleVerifyTicket}
            className="portal-small-btn"
            disabled={isVerifying}
          >
            {isVerifying ? 'Processing...' : 'Verify'}
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
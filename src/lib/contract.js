import { BrowserProvider, Contract } from 'ethers';

// Replace with your deployed contract address
export const CONTRACT_ADDRESS = 'PASTE_YOUR_DEPLOYED_CONTRACT_ADDRESS_HERE';

// Replace with your real ABI
export const CONTRACT_ABI = [
  "function createEvent(string eventName, string dateTime, string venue, uint256 vipPrice, uint256 regularPrice) external",
  "function bookTicket(uint256 eventId, string ticketType) external",
  "function verifyTicket(string serialNumber) external",
  "function getAllEvents() external view returns (tuple(uint256 id, string eventName, string dateTime, string venue, uint256 vipPrice, uint256 regularPrice, uint256 vipSold, uint256 regularSold)[])",
  "function getTicket(string serialNumber) external view returns (tuple(string serialNumber, uint256 eventId, string eventName, string dateTime, string venue, string ticketType, uint256 price, bool isUsed))"
];

export async function getContract() {
  if (!window.ethereum) {
    throw new Error('MetaMask is not installed.');
  }

  const provider = new BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

  return { provider, signer, contract };
}
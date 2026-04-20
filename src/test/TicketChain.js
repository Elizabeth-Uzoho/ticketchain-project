import { ethers } from 'ethers';

export const CONTRACT_ADDRESS = '0xd4C29B53d515472eFf742957B1fB07DA773B9fE1';

export const CONTRACT_ABI = [
  "function createEvent(string eventName,uint256 eventDateTime,string venue,uint256 vipPriceWei,uint256 regularPriceWei) returns (uint256 eventId)",
  "function getAllEvents() view returns ((uint256 eventId,string eventName,uint256 eventDateTime,string venue,uint256 vipPriceWei,uint256 regularPriceWei,uint256 vipSold,uint256 regularSold,bool exists,bool active,address createdBy)[] allEvents)",
  "function bookTicket(uint256 eventId,uint8 ticketType) payable returns (string serialNumber)",
  "function getMyTickets() view returns ((uint256 ticketId,uint256 eventId,string serialNumber,address owner,uint8 ticketType,uint256 pricePaidWei,bool isUsed,uint256 bookedAt,bool exists)[] myTickets)",
  "function checkTicket(string serialNumber) view returns (bool exists,bool isUsed,uint256 ticketId,uint256 eventId,string eventName,uint256 eventDateTime,string venue,uint8 ticketType,address owner,uint256 pricePaidWei)",
  "function verifyAndUseTicket(string serialNumber) returns (bool valid,bool alreadyUsed,uint256 ticketId,uint256 eventId,string eventName,string venue,uint8 ticketType,address owner)",
  "function organizer() view returns (address)",
  "function setVerifier(address verifier,bool isAuthorized)",
  "event EventCreated(uint256 indexed eventId,string eventName,uint256 eventDateTime,string venue,uint256 vipPriceWei,uint256 regularPriceWei,address indexed createdBy)",
  "event TicketBooked(uint256 indexed ticketId,uint256 indexed eventId,string serialNumber,address indexed owner,uint8 ticketType,uint256 pricePaidWei)"
];

export async function getBrowserProvider() {
  if (!window.ethereum) {
    throw new Error('MetaMask is not installed.');
  }
  return new ethers.BrowserProvider(window.ethereum);
}

export async function getSignerContract() {
  const provider = await getBrowserProvider();
  const signer = await provider.getSigner();
  return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
}

export async function getReadContract() {
  const provider = await getBrowserProvider();
  return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
}

export function normalizeEvent(event) {
  return {
    id: Number(event.eventId),
    eventName: event.eventName,
    dateTime: Number(event.eventDateTime) * 1000,
    venue: event.venue,
    vipPriceWei: event.vipPriceWei.toString(),
    regularPriceWei: event.regularPriceWei.toString(),
    vipPriceEth: ethers.formatEther(event.vipPriceWei),
    regularPriceEth: ethers.formatEther(event.regularPriceWei),
    vipSold: Number(event.vipSold),
    regularSold: Number(event.regularSold),
    exists: event.exists,
    active: event.active,
    createdBy: event.createdBy,
  };
}

export function normalizeTicket(ticket) {
  return {
    ticketId: Number(ticket.ticketId),
    eventId: Number(ticket.eventId),
    serialNumber: ticket.serialNumber,
    owner: ticket.owner,
    ticketType: Number(ticket.ticketType) === 0 ? 'VIP' : 'Regular',
    ticketTypeValue: Number(ticket.ticketType),
    pricePaidWei: ticket.pricePaidWei.toString(),
    pricePaidEth: ethers.formatEther(ticket.pricePaidWei),
    isUsed: ticket.isUsed,
    bookedAt: Number(ticket.bookedAt) * 1000,
    exists: ticket.exists,
  };
}
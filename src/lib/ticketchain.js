import { ethers } from 'ethers';
import { createEVMClient } from '@metamask/connect-evm';
import { App as CapacitorApp } from '@capacitor/app';

export const CONTRACT_ADDRESS =
  import.meta.env.VITE_CONTRACT_ADDRESS ||
  '0xd4C29B53d515472eFf742957B1fB07DA773B9fE1';

export const CONTRACT_ABI = [
  'function createEvent(string eventName,uint256 eventDateTime,string venue,uint256 vipPriceWei,uint256 regularPriceWei) returns (uint256 eventId)',
  'function getAllEvents() view returns ((uint256 eventId,string eventName,uint256 eventDateTime,string venue,uint256 vipPriceWei,uint256 regularPriceWei,uint256 vipSold,uint256 regularSold,bool exists,bool active,address createdBy)[] allEvents)',
  'function bookTicket(uint256 eventId,uint8 ticketType) payable returns (string serialNumber)',
  'function getMyTickets() view returns ((uint256 ticketId,uint256 eventId,string serialNumber,address owner,uint8 ticketType,uint256 pricePaidWei,bool isUsed,uint256 bookedAt,bool exists)[] myTickets)',
  'function checkTicket(string serialNumber) view returns (bool exists,bool isUsed,uint256 ticketId,uint256 eventId,string eventName,uint256 eventDateTime,string venue,uint8 ticketType,address owner,uint256 pricePaidWei)',
  'function verifyAndUseTicket(string serialNumber) returns (bool valid,bool alreadyUsed,uint256 ticketId,uint256 eventId,string eventName,string venue,uint8 ticketType,address owner)',
  'function organizer() view returns (address)',
  'function setVerifier(address verifier,bool isAuthorized)',
  'event EventCreated(uint256 indexed eventId,string eventName,uint256 eventDateTime,string venue,uint256 vipPriceWei,uint256 regularPriceWei,address indexed createdBy)',
  'event TicketBooked(uint256 indexed ticketId,uint256 indexed eventId,string serialNumber,address indexed owner,uint8 ticketType,uint256 pricePaidWei)',
];

const SEPOLIA_CHAIN_ID = '0xaa36a7';
const RPC_URL = import.meta.env.VITE_RPC_URL;

let evmClientPromise = null;
let browserProvider = null;

function ensureRpcUrl() {
  if (!RPC_URL) {
    throw new Error('Missing VITE_RPC_URL in .env');
  }
}

function isMetaMaskMobileTimeout(error) {
  const text = String(
    error?.reason || error?.shortMessage || error?.message || ''
  ).toLowerCase();

  return (
    text.includes('could not coalesce error') ||
    text.includes('rpcerrors') ||
    text.includes('transport request timed out') ||
    text.includes('transport') ||
    text.includes('timed out') ||
    text.includes('timeout') ||
    text.includes('unknown_error')
  );
}

async function openMetaMaskDeepLink(url) {
  try {
    await CapacitorApp.openUrl({ url });
  } catch (error) {
    console.warn(
      'Capacitor openUrl failed, falling back to window.location.href',
      error
    );
    window.location.href = url;
  }
}

async function getEvmClient() {
  ensureRpcUrl();

  if (!evmClientPromise) {
    evmClientPromise = createEVMClient({
      dapp: {
        name: 'TicketChain',
        url: window.location?.href || 'https://localhost',
      },
      api: {
        supportedNetworks: {
          [SEPOLIA_CHAIN_ID]: RPC_URL,
        },
      },
      mobile: {
        preferredOpenLink: (deeplink) => {
          void openMetaMaskDeepLink(deeplink);
        },
        useDeeplink: true,
      },
      ui: {
        headless: true,
      },
      debug: true,
    });
  }

  return evmClientPromise;
}

export async function connectWallet() {
  const client = await getEvmClient();

  const result = await client.connect({
    chainIds: [SEPOLIA_CHAIN_ID],
  });

  const provider = client.getProvider();

  let accounts = result?.accounts;
  let chainId = result?.chainId;

  if (!accounts || accounts.length === 0) {
    accounts = await provider.request({
      method: 'eth_accounts',
    });
  }

  if (!chainId) {
    chainId = await provider.request({
      method: 'eth_chainId',
    });
  }

  if (chainId !== SEPOLIA_CHAIN_ID) {
    try {
      await client.switchChain({ chainId: SEPOLIA_CHAIN_ID });
      chainId = SEPOLIA_CHAIN_ID;
    } catch (error) {
      console.warn('Could not switch to Sepolia automatically:', error);
    }
  }

  browserProvider = new ethers.BrowserProvider(provider);

  return {
    accounts,
    account: accounts?.[0] || null,
    chainId,
  };
}

export async function disconnectWallet() {
  const client = await getEvmClient();
  await client.disconnect();
  browserProvider = null;
}

export function getRpcProvider() {
  ensureRpcUrl();
  return new ethers.JsonRpcProvider(RPC_URL);
}

export async function clearWalletSessionCache() {
  browserProvider = null;
}

export async function getBrowserProvider({ forceFresh = false } = {}) {
  const client = await getEvmClient();
  const provider = client.getProvider();

  if (forceFresh || !browserProvider) {
    browserProvider = new ethers.BrowserProvider(provider);
  }

  const accounts = await provider.request({
    method: 'eth_accounts',
  });

  if (!accounts || accounts.length === 0) {
    await connectWallet();
    return browserProvider;
  }

  const activeChainId = await provider.request({
    method: 'eth_chainId',
  });

  if (activeChainId !== SEPOLIA_CHAIN_ID) {
    try {
      await client.switchChain({ chainId: SEPOLIA_CHAIN_ID });
      browserProvider = new ethers.BrowserProvider(provider);
    } catch (error) {
      console.warn('Could not switch to Sepolia automatically:', error);
    }
  }

  return browserProvider;
}

export async function getSigner({ forceFresh = false } = {}) {
  const provider = await getBrowserProvider({ forceFresh });
  return await provider.getSigner();
}

export async function getSignerContract({ forceFresh = false } = {}) {
  const signer = await getSigner({ forceFresh });
  return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
}

export async function getReadContract() {
  const provider = getRpcProvider();
  return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
}

export async function safeWalletWrite(buildTx, { retries = 1 } = {}) {
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const contract = await getSignerContract({ forceFresh: attempt > 0 });
      const tx = await buildTx(contract);
      return tx;
    } catch (error) {
      lastError = error;
      console.error(`safeWalletWrite attempt ${attempt + 1} failed:`, error);

      if (!isMetaMaskMobileTimeout(error)) {
        throw error;
      }

      await clearWalletSessionCache();
    }
  }

  throw lastError;
}

export async function safeWaitForTransaction(tx, { confirmations = 1 } = {}) {
  try {
    return await tx.wait(confirmations);
  } catch (error) {
    console.error('safeWaitForTransaction wait() failed:', error);

    if (!isMetaMaskMobileTimeout(error) || !tx?.hash) {
      throw error;
    }

    const rpcProvider = getRpcProvider();

    for (let attempt = 0; attempt < 8; attempt += 1) {
      try {
        const receipt = await rpcProvider.getTransactionReceipt(tx.hash);
        if (receipt) {
          return receipt;
        }
      } catch (receiptError) {
        console.error('Receipt polling error:', receiptError);
      }

      await new Promise((resolve) => setTimeout(resolve, 2500));
    }

    throw error;
  }
}

export async function getWalletAddress() {
  try {
    const provider = await getBrowserProvider();
    const signer = await provider.getSigner();
    return await signer.getAddress();
  } catch (error) {
    console.error('getWalletAddress error:', error);
    return null;
  }
}

export async function isWalletConnected() {
  try {
    const client = await getEvmClient();
    const provider = client.getProvider();

    const accounts = await provider.request({
      method: 'eth_accounts',
    });

    return Array.isArray(accounts) && accounts.length > 0;
  } catch (error) {
    console.error('isWalletConnected error:', error);
    return false;
  }
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
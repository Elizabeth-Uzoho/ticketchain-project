import { createEVMClient } from '@metamask/connect-evm';
import { BrowserProvider } from 'ethers';

let clientPromise = null;

function openMetaMaskDeepLink(url) {
  // For Capacitor Android, start with a direct external handoff.
  // If this does not open MetaMask on your device, see note below.
  window.location.href = url;
}

async function getClient() {
  if (!clientPromise) {
    clientPromise = createEVMClient({
      dapp: {
        name: 'TicketChain',
        url: window.location.href,
      },
      api: {
        supportedNetworks: {
          // Sepolia
          '0xaa36a7': import.meta.env.VITE_RPC_URL,
        },
      },
      mobile: {
        preferredOpenLink: (deeplink) => openMetaMaskDeepLink(deeplink),
      },
    });
  }

  return await clientPromise;
}

export async function connectWalletSDK() {
  const client = await getClient();

  // Request a connection session and target Sepolia
  await client.connect({
    chainIds: ['0xaa36a7'],
  });

  const provider = client.getProvider();

  // Ask for account access
  let accounts = await provider.request({
    method: 'eth_requestAccounts',
    params: [],
  });

  // Fallback if the session exists but accounts are not immediately returned
  if (!accounts || accounts.length === 0) {
    accounts = await provider.request({
      method: 'eth_accounts',
      params: [],
    });
  }

  if (!accounts || accounts.length === 0) {
    throw new Error(
      'MetaMask did not return any account. Open MetaMask, approve the connection, and make sure the selected account is on Sepolia.'
    );
  }

  // Check chain and try to switch if needed
  let chainId = await provider.request({
    method: 'eth_chainId',
    params: [],
  });

  if (chainId !== '0xaa36a7') {
    try {
      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0xaa36a7' }],
      });

      chainId = await provider.request({
        method: 'eth_chainId',
        params: [],
      });
    } catch (switchError) {
      console.error('Failed to switch chain:', switchError);
      throw new Error('Please switch MetaMask to the Sepolia network and try again.');
    }
  }

  return {
    provider,
    account: accounts[0],
    chainId,
  };
}

export async function getEthersProvider() {
  const client = await getClient();
  const provider = client.getProvider();
  return new BrowserProvider(provider);
}

export async function disconnectWalletSDK() {
  const client = await getClient();
  await client.disconnect();
}
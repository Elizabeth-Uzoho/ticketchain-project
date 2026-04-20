import { ethers } from "ethers";
import { hashMetadata } from "./hash"; // Uses your new hash logic

// UPDATE THIS ABI to match the exact functions in your TicketRegistry.sol
export const REGISTRY_ABI = [
  "function issueTicket(string ticketId, string eventName, bytes32 metadataHash) public",
  "function getTicket(string ticketId) public view returns ((bytes32 metadataHash, uint256 issuedAt, address issuedBy, string ticketId, string eventName, bool isUsed))"
];

export async function getWalletContext() {
  if (!window.ethereum) {
    throw new Error("MetaMask is required.");
  }
  const provider = new ethers.BrowserProvider(window.ethereum);
  await provider.send("eth_requestAccounts", []);
  const signer = await provider.getSigner();
  const address = await signer.getAddress();
  return { provider, signer, address };
}

export async function getRegistryContract(withSigner = false) {
  const registryAddress = import.meta.env.VITE_REGISTRY_ADDRESS;
  if (!registryAddress) {
    throw new Error("VITE_REGISTRY_ADDRESS is not configured in .env");
  }
  const { provider, signer } = await getWalletContext();
  return new ethers.Contract(
    registryAddress,
    REGISTRY_ABI,
    withSigner ? signer : provider
  );
}

// Logic to issue a ticket to the blockchain
export async function issueTicket(formValues) {
  const metadataHash = hashMetadata(formValues);
  const contract = await getRegistryContract(true);
  
  // This calls the function in your Solidity contract
  const tx = await contract.issueTicket(
    formValues.ticketId.trim(),
    formValues.eventName.trim(),
    metadataHash
  );
  await tx.wait();

  return {
    metadataHash,
    transactionHash: tx.hash
  };
}

// Logic to fetch a ticket from the blockchain
export async function fetchTicket(ticketId) {
  const contract = await getRegistryContract(false);
  const ticket = await contract.getTicket(ticketId.trim());

  return {
    metadataHash: ticket.metadataHash,
    issuedAt: Number(ticket.issuedAt),
    issuedBy: ticket.issuedBy,
    ticketId: ticket.ticketId,
    eventName: ticket.eventName,
    isUsed: ticket.isUsed
  };
}
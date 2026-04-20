import { ethers } from "ethers";

// 1. Normalize the ticket data
export function normalizeMetadata({ ticketId, eventName }) {
  return {
    ticketId: String(ticketId || "").trim(),
    eventName: String(eventName || "").trim(),
  };
}

// 2. Canonicalize (Prepare for hashing)
export function canonicalizeMetadata(metadata) {
  const normalized = normalizeMetadata(metadata);
  // This JSON structure must exactly match how you will recreate it later
  return JSON.stringify({
    ticketId: normalized.ticketId,
    eventName: normalized.eventName,
  });
}

// 3. Create the hash (This creates the bytes32 for your contract)
export function hashMetadata(metadata) {
  return ethers.sha256(ethers.toUtf8Bytes(canonicalizeMetadata(metadata)));
}
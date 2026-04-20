import { hashMetadata } from "./hash";

// 1. Constructs the full certificate object
export function buildTicketReceipt(metadata, registration) {
  return {
    metadata,
    metadataHash: hashMetadata(metadata),
    proofToken: registration.transactionHash || "0x000"
  };
}

// 2. Recomputes hash from metadata to verify integrity
export function recomputeCertificateHash(certificate) {
  if (!certificate.metadata) throw new Error("Certificate metadata missing");
  return hashMetadata(certificate.metadata);
}

// 3. Validates the object structure
export function verifyCertificateShape(certificate) {
  if (!certificate.metadata || !certificate.metadataHash) {
    throw new Error("Invalid certificate: Missing required fields.");
  }
}

// 4. Handles the download of the JSON file
export function downloadCertificate(certificate) {
  const blob = new Blob([JSON.stringify(certificate, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ticket-${certificate.metadata.ticketId}.json`;
  a.click();
}
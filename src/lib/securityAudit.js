import { hashMetadata } from "./hash";
import { buildTicketReceipt, recomputeCertificateHash } from "./certificate";

class SecureRegistrySim {
  constructor(owner) {
    this.owner = owner;
    this.records = new Map();
  }

  // Simulates the authenticated function in your TicketRegistry.sol
  issueTicket({ caller, ticketId, eventName, metadataHash }) {
    if (caller !== this.owner) {
      throw new Error("Unauthorized: Access denied for non-admin");
    }

    if (this.records.has(ticketId)) {
      throw new Error("Registration failed: Ticket already exists");
    }

    this.records.set(ticketId, { ticketId, eventName, metadataHash });
  }
}

class InsecureRegistrySim {
  constructor() {
    this.records = new Map();
  }

  // Simulates a vulnerable registry without access control
  issueTicket({ ticketId, eventName, metadataHash }) {
    this.records.set(ticketId, { ticketId, eventName, metadataHash });
  }
}

export function runSecurityScenarios() {
  const admin = "0xAdmin";
  const attacker = "0xAttacker";
  const sample = { ticketId: "TC-999", eventName: "Blockchain Conference 2026" };
  
  const registration = {
    metadataHash: hashMetadata(sample),
    transactionHash: "0xdevproof"
  };

  const receipt = buildTicketReceipt(sample, registration);
  
  // Scenario A: Tamper Check (Tampering with the event name)
  const tamperedReceipt = {
    ...receipt,
    metadata: { ...receipt.metadata, eventName: "Blockchain Conference 2027" }
  };

  // Setup Secure System
  const secure = new SecureRegistrySim(admin);
  secure.issueTicket({ caller: admin, ...sample, metadataHash: registration.metadataHash });

  // Scenario B: Unauthorized Registration Attempt
  let scenarioB;
  try {
    secure.issueTicket({ 
      caller: attacker, 
      ...sample, 
      metadataHash: registration.metadataHash 
    });
    scenarioB = "Unexpected success";
  } catch (error) {
    scenarioB = error.message; 
  }

  // Scenario C: Insecure Overwrite
  const insecure = new InsecureRegistrySim();
  // Initial registration
  insecure.issueTicket({ ...sample, metadataHash: registration.metadataHash });
  
  // Attacker attempts to overwrite the record with different data
  const forgedHash = hashMetadata({ ticketId: "TC-999", eventName: "Attacker Event" });
  insecure.issueTicket({ 
    ticketId: "TC-999", 
    eventName: "Attacker Event", 
    metadataHash: forgedHash 
  });

  return {
    sampleReceipt: receipt,
    scenarioA: {
      originalHash: receipt.metadataHash,
      tamperedHash: recomputeCertificateHash(tamperedReceipt),
      passesVerification: receipt.metadataHash === recomputeCertificateHash(tamperedReceipt)
    },
    scenarioB: { 
      outcome: scenarioB 
    },
    scenarioC: {
      overwrittenEvent: insecure.records.get(sample.ticketId).eventName,
      wasOverwritten: insecure.records.get(sample.ticketId).eventName !== sample.eventName
    }
  };
}
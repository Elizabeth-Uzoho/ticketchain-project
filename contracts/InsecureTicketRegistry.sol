// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract InsecureTicketRegistry {
    struct TicketRecord {
        bytes32 metadataHash;
        string ticketId;
        string eventName;
        bool isUsed;
    }

    address public organizer;
    mapping(bytes32 => TicketRecord) private tickets;

    constructor() {
        organizer = msg.sender;
    }

    // BROKEN: This function allows overwriting!
    function issueTicket(
        string memory ticketId,
        string memory eventName,
        bytes32 metadataHash
    ) external {
        bytes32 productId = keccak256(abi.encodePacked(ticketId));
        
        // MISSING: require(tickets[productId].issuedAt == 0, "Already exists");
        
        tickets[productId] = TicketRecord({
            metadataHash: metadataHash,
            ticketId: ticketId,
            eventName: eventName,
            isUsed: false
        });
    }

    function getTicket(string memory ticketId) external view returns (TicketRecord memory) {
        return tickets[keccak256(abi.encodePacked(ticketId))];
    }
}
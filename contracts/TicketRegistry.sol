// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract TicketChain {
    enum TicketType {
        VIP,
        Regular
    }

    struct EventData {
        uint256 eventId;
        string eventName;
        uint256 eventDateTime; // unix timestamp
        string venue;
        uint256 vipPriceWei;
        uint256 regularPriceWei;
        uint256 vipSold;
        uint256 regularSold;
        bool exists;
        bool active;
        address createdBy;
    }

    struct TicketData {
        uint256 ticketId;
        uint256 eventId;
        string serialNumber;
        address owner;
        TicketType ticketType;
        uint256 pricePaidWei;
        bool isUsed;
        uint256 bookedAt;
        bool exists;
    }

    address public immutable organizer;
    uint256 public nextEventId = 1;
    uint256 public nextTicketId = 1;

    mapping(uint256 => EventData) private eventsById;
    uint256[] private eventIds;

    mapping(bytes32 => TicketData) private ticketsBySerialHash;
    mapping(address => bytes32[]) private ownerTicketHashes;

    mapping(address => bool) public verifiers;

    event EventCreated(
        uint256 indexed eventId,
        string eventName,
        uint256 eventDateTime,
        string venue,
        uint256 vipPriceWei,
        uint256 regularPriceWei,
        address indexed createdBy
    );

    event TicketBooked(
        uint256 indexed ticketId,
        uint256 indexed eventId,
        string serialNumber,
        address indexed owner,
        TicketType ticketType,
        uint256 pricePaidWei
    );

    event TicketVerified(
        string serialNumber,
        uint256 indexed ticketId,
        uint256 indexed eventId,
        address indexed verifiedBy
    );

    event VerifierUpdated(address indexed verifier, bool isAuthorized);

    modifier onlyOrganizer() {
        require(msg.sender == organizer, "Only organizer");
        _;
    }

    modifier onlyVerifier() {
        require(verifiers[msg.sender] || msg.sender == organizer, "Only verifier");
        _;
    }

    modifier eventExists(uint256 eventId) {
        require(eventsById[eventId].exists, "Event does not exist");
        _;
    }

    constructor() {
        organizer = msg.sender;
    }

    // =========================
    // Organizer functions
    // =========================

    function setVerifier(address verifier, bool isAuthorized) external onlyOrganizer {
        require(verifier != address(0), "Invalid verifier");
        verifiers[verifier] = isAuthorized;
        emit VerifierUpdated(verifier, isAuthorized);
    }

    function createEvent(
        string calldata eventName,
        uint256 eventDateTime,
        string calldata venue,
        uint256 vipPriceWei,
        uint256 regularPriceWei
    ) external onlyOrganizer returns (uint256 eventId) {
        require(bytes(eventName).length > 0, "Event name required");
        require(bytes(venue).length > 0, "Venue required");
        require(eventDateTime > block.timestamp, "Event must be future");
        require(vipPriceWei > 0, "VIP price required");
        require(regularPriceWei > 0, "Regular price required");

        eventId = nextEventId++;

        eventsById[eventId] = EventData({
            eventId: eventId,
            eventName: eventName,
            eventDateTime: eventDateTime,
            venue: venue,
            vipPriceWei: vipPriceWei,
            regularPriceWei: regularPriceWei,
            vipSold: 0,
            regularSold: 0,
            exists: true,
            active: true,
            createdBy: msg.sender
        });

        eventIds.push(eventId);

        emit EventCreated(
            eventId,
            eventName,
            eventDateTime,
            venue,
            vipPriceWei,
            regularPriceWei,
            msg.sender
        );
    }

    function setEventActive(uint256 eventId, bool isActive)
        external
        onlyOrganizer
        eventExists(eventId)
    {
        eventsById[eventId].active = isActive;
    }

    // =========================
    // Attendee functions
    // =========================

    function bookTicket(uint256 eventId, TicketType ticketType)
        external
        payable
        eventExists(eventId)
        returns (string memory serialNumber)
    {
        EventData storage evt = eventsById[eventId];
        require(evt.active, "Event is not active");

        uint256 requiredPrice = ticketType == TicketType.VIP
            ? evt.vipPriceWei
            : evt.regularPriceWei;

        require(msg.value == requiredPrice, "Incorrect payment amount");

        uint256 ticketId = nextTicketId++;
        serialNumber = _generateSerialNumber(ticketId, eventId);

        bytes32 serialHash = keccak256(abi.encodePacked(serialNumber));
        require(!ticketsBySerialHash[serialHash].exists, "Serial already exists");

        ticketsBySerialHash[serialHash] = TicketData({
            ticketId: ticketId,
            eventId: eventId,
            serialNumber: serialNumber,
            owner: msg.sender,
            ticketType: ticketType,
            pricePaidWei: msg.value,
            isUsed: false,
            bookedAt: block.timestamp,
            exists: true
        });

        ownerTicketHashes[msg.sender].push(serialHash);

        if (ticketType == TicketType.VIP) {
            evt.vipSold += 1;
        } else {
            evt.regularSold += 1;
        }

        emit TicketBooked(
            ticketId,
            eventId,
            serialNumber,
            msg.sender,
            ticketType,
            msg.value
        );
    }

    // =========================
    // Verifier functions
    // =========================

    function verifyAndUseTicket(string calldata serialNumber)
        external
        onlyVerifier
        returns (
            bool valid,
            bool alreadyUsed,
            uint256 ticketId,
            uint256 eventId,
            string memory eventName,
            string memory venue,
            TicketType ticketType,
            address owner
        )
    {
        bytes32 serialHash = keccak256(abi.encodePacked(serialNumber));
        TicketData storage ticket = ticketsBySerialHash[serialHash];

        if (!ticket.exists) {
            return (false, false, 0, 0, "", "", TicketType.Regular, address(0));
        }

        EventData storage evt = eventsById[ticket.eventId];

        if (ticket.isUsed) {
            return (
                false,
                true,
                ticket.ticketId,
                ticket.eventId,
                evt.eventName,
                evt.venue,
                ticket.ticketType,
                ticket.owner
            );
        }

        ticket.isUsed = true;

        emit TicketVerified(
            serialNumber,
            ticket.ticketId,
            ticket.eventId,
            msg.sender
        );

        return (
            true,
            false,
            ticket.ticketId,
            ticket.eventId,
            evt.eventName,
            evt.venue,
            ticket.ticketType,
            ticket.owner
        );
    }

    function checkTicket(string calldata serialNumber)
        external
        view
        returns (
            bool exists,
            bool isUsed,
            uint256 ticketId,
            uint256 eventId,
            string memory eventName,
            uint256 eventDateTime,
            string memory venue,
            TicketType ticketType,
            address owner,
            uint256 pricePaidWei
        )
    {
        bytes32 serialHash = keccak256(abi.encodePacked(serialNumber));
        TicketData storage ticket = ticketsBySerialHash[serialHash];

        if (!ticket.exists) {
            return (false, false, 0, 0, "", 0, "", TicketType.Regular, address(0), 0);
        }

        EventData storage evt = eventsById[ticket.eventId];

        return (
            true,
            ticket.isUsed,
            ticket.ticketId,
            ticket.eventId,
            evt.eventName,
            evt.eventDateTime,
            evt.venue,
            ticket.ticketType,
            ticket.owner,
            ticket.pricePaidWei
        );
    }

    // =========================
    // Read functions
    // =========================

    function getEvent(uint256 eventId)
        external
        view
        eventExists(eventId)
        returns (EventData memory)
    {
        return eventsById[eventId];
    }

    function getAllEvents() external view returns (EventData[] memory allEvents) {
        uint256 len = eventIds.length;
        allEvents = new EventData[](len);

        for (uint256 i = 0; i < len; i++) {
            allEvents[i] = eventsById[eventIds[i]];
        }
    }

    function getMyTickets()
        external
        view
        returns (TicketData[] memory myTickets)
    {
        bytes32[] storage hashes = ownerTicketHashes[msg.sender];
        uint256 len = hashes.length;
        myTickets = new TicketData[](len);

        for (uint256 i = 0; i < len; i++) {
            myTickets[i] = ticketsBySerialHash[hashes[i]];
        }
    }

    function getTicketBySerial(string calldata serialNumber)
        external
        view
        returns (TicketData memory)
    {
        bytes32 serialHash = keccak256(abi.encodePacked(serialNumber));
        require(ticketsBySerialHash[serialHash].exists, "Ticket not found");
        return ticketsBySerialHash[serialHash];
    }

    // =========================
    // Organizer withdrawal
    // =========================

    function withdraw() external onlyOrganizer {
        uint256 amount = address(this).balance;
        require(amount > 0, "Nothing to withdraw");

        (bool sent, ) = payable(organizer).call{value: amount}("");
        require(sent, "Withdraw failed");
    }

    // =========================
    // Internal helpers
    // =========================

    function _generateSerialNumber(uint256 ticketId, uint256 eventId)
        internal
        view
        returns (string memory)
    {
        return string(
            abi.encodePacked(
                "TC-",
                _uintToString(eventId),
                "-",
                _uintToString(ticketId),
                "-",
                _uintToString(block.timestamp)
            )
        );
    }

    function _uintToString(uint256 value)
        internal
        pure
        returns (string memory)
    {
        if (value == 0) {
            return "0";
        }

        uint256 temp = value;
        uint256 digits;

        while (temp != 0) {
            digits++;
            temp /= 10;
        }

        bytes memory buffer = new bytes(digits);

        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }

        return string(buffer);
    }
}
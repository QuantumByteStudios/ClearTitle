// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// ============================================================
//  OpenZeppelin Imports
//  We import battle-tested, audited contracts instead of
//  writing security logic from scratch.
// ============================================================

// AccessControl: lets us define roles (ADMIN_ROLE) and
// restrict functions so only certain wallets can call them.
import "@openzeppelin/contracts/access/AccessControl.sol";

// Pausable: adds an emergency stop switch. If a bug is found,
// the admin can pause the contract and no one can call any
// function until it is unpaused.
import "@openzeppelin/contracts/utils/Pausable.sol";

// ReentrancyGuard: prevents "re-entrancy attacks" where a
// malicious contract calls back into our function before it
// finishes, potentially draining ETH. Always use this when
// your contract sends or receives ETH.
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title  LandRegistry
 * @author Land Ownership Registry System
 * @notice This contract stores land ownership records permanently
 *         on the blockchain. Records cannot be deleted or altered
 *         without going through the defined approval workflow.
 *
 * @dev    Roles:
 *           DEFAULT_ADMIN_ROLE — can assign/revoke other roles
 *           REGISTRAR_ROLE     — government registrar (verify, reject, freeze)
 *           SELLER_ROLE        — land owner (register, initiate transfer)
 *           BUYER_ROLE         — buyer (accept transfer)
 *
 *         Key design decisions:
 *           1. landId is a uint256 auto-incremented counter.
 *           2. Files (PDFs) are stored on IPFS; only the hash is stored here.
 *           3. Only ONE active transfer per land at a time (prevents double sale).
 *           4. All state changes emit Events so the backend can sync MongoDB.
 */
contract LandRegistry is AccessControl, Pausable, ReentrancyGuard {
    // ============================================================
    //  ROLES
    //  bytes32 is a 32-byte fixed-size hash. We use keccak256 to
    //  turn a human-readable string into a unique identifier.
    // ============================================================

    /// @notice Registrar role — the government official / admin
    bytes32 public constant REGISTRAR_ROLE = keccak256("REGISTRAR_ROLE");

    // ============================================================
    //  ENUMS
    //  Enums are like a list of named constants.
    //  Solidity stores them internally as uint8 (0, 1, 2, ...).
    // ============================================================

    /**
     * @dev Land lifecycle:
     *      PENDING   → just registered, awaiting registrar review
     *      VERIFIED  → approved by registrar, can be transferred
     *      REJECTED  → registrar rejected it (bad documents etc.)
     *      DISPUTED  → a legal dispute has been filed
     *      FROZEN    → registrar froze it (suspicious activity)
     */
    enum LandStatus {
        PENDING,   // 0
        VERIFIED,  // 1
        REJECTED,  // 2
        DISPUTED,  // 3
        FROZEN     // 4
    }

    /**
     * @dev Transfer request lifecycle:
     *      NONE           → no transfer exists for this land
     *      INITIATED      → seller started the transfer
     *      BUYER_ACCEPTED → buyer agreed to the transfer
     *      APPROVED       → registrar approved, ownership changed
     *      REJECTED       → registrar rejected the transfer
     *      CANCELLED      → seller cancelled before buyer accepted
     */
    enum TransferState {
        NONE,           // 0
        INITIATED,      // 1
        BUYER_ACCEPTED, // 2
        APPROVED,       // 3
        REJECTED,       // 4
        CANCELLED       // 5
    }

    // ============================================================
    //  STRUCTS
    //  Structs are like objects — they group related data together.
    // ============================================================

    /**
     * @dev All data stored on-chain for a single piece of land.
     *      We store the IPFS hash (a string like "QmXyz...") instead
     *      of the actual file, because storing files on-chain is
     *      extremely expensive.
     */
    struct Land {
        uint256 landId;          // Auto-incremented unique ID
        string  surveyNumber;    // Government survey number (unique per district)
        uint256 area;            // Area in square meters
        string  location;        // Human-readable location string
        address currentOwner;    // Wallet address of current owner
        uint256 price;           // Listed price in Wei (1 ETH = 1e18 Wei)
        string  ipfsHash;        // IPFS hash of the deed document
        LandStatus status;       // Current status (see enum above)
        uint256 createdAt;       // block.timestamp when registered
        bool    exists;          // Guard flag — prevents working on non-existent land
    }

    /**
     * @dev A single entry in the ownership history array.
     *      Every time ownership changes (or the land is first registered),
     *      we push a new HistoryEntry onto the land's history array.
     */
    struct HistoryEntry {
        address owner;           // Who owned the land at this point
        uint256 timestamp;       // When this entry was recorded (block.timestamp)
        string  transactionType; // "REGISTERED", "TRANSFER", "VERIFIED", etc.
    }

    /**
     * @dev A transfer request. Only one can exist per land at a time.
     *      This prevents the "double sale" problem where a seller tries
     *      to sell the same land to two different buyers simultaneously.
     */
    struct TransferRequest {
        uint256 landId;     // Which land is being transferred
        address from;       // Seller's wallet address
        address to;         // Buyer's wallet address
        uint256 price;      // Agreed price in Wei
        TransferState state; // Current state of this request
        uint256 initiatedAt; // When the transfer was initiated
        string  rejectionReason; // Populated if registrar rejects
    }

    // ============================================================
    //  STATE VARIABLES
    //  These are stored permanently on the blockchain.
    //  Reading them is free; writing costs gas.
    // ============================================================

    /// @notice Counter for auto-incrementing land IDs. Starts at 1.
    uint256 private _landIdCounter;

    /// @notice Maps landId → Land struct
    mapping(uint256 => Land) private _lands;

    /// @notice Maps landId → array of ownership history entries
    mapping(uint256 => HistoryEntry[]) private _ownershipHistory;

    /// @notice Maps landId → active TransferRequest
    mapping(uint256 => TransferRequest) private _transferRequests;

    /// @notice Maps owner address → array of their landIds
    ///         Useful for "getLandsByOwner" queries
    mapping(address => uint256[]) private _ownerToLands;

    /// @notice Maps surveyNumber → landId to prevent duplicate registration
    ///         of the same physical land parcel
    mapping(string => uint256) private _surveyNumberToLandId;

    // ============================================================
    //  EVENTS
    //  Events are the blockchain's notification system.
    //  The backend listens for these and updates MongoDB.
    //  The "indexed" keyword lets the backend filter events by
    //  that specific field (e.g., find all events for landId 5).
    // ============================================================

    /// @notice Fired when a new land is registered by a seller
    event LandRegistered(
        uint256 indexed landId,
        address indexed owner,
        string  surveyNumber,
        string  ipfsHash,
        uint256 timestamp
    );

    /// @notice Fired when a registrar approves a land record
    event LandVerified(
        uint256 indexed landId,
        address indexed verifiedBy,
        uint256 timestamp
    );

    /// @notice Fired when a registrar rejects a land record
    event LandRejected(
        uint256 indexed landId,
        address indexed rejectedBy,
        string  reason,
        uint256 timestamp
    );

    /// @notice Fired when a seller initiates an ownership transfer
    event TransferInitiated(
        uint256 indexed landId,
        address indexed from,
        address indexed to,
        uint256 price,
        uint256 timestamp
    );

    /// @notice Fired when the buyer accepts the transfer request
    event TransferAccepted(
        uint256 indexed landId,
        address indexed buyer,
        uint256 timestamp
    );

    /// @notice Fired when the registrar approves the transfer (ownership changes)
    event TransferApproved(
        uint256 indexed landId,
        address indexed from,
        address indexed to,
        uint256 price,
        uint256 timestamp
    );

    /// @notice Fired when the registrar rejects the transfer
    event TransferRejected(
        uint256 indexed landId,
        address indexed rejectedBy,
        string  reason,
        uint256 timestamp
    );

    /// @notice Fired when the seller cancels a pending transfer
    event TransferCancelled(
        uint256 indexed landId,
        address indexed cancelledBy,
        uint256 timestamp
    );

    /// @notice Fired when a registrar freezes a land
    event LandFrozen(
        uint256 indexed landId,
        address indexed frozenBy,
        uint256 timestamp
    );

    /// @notice Fired when a registrar unfreezes a land
    event LandUnfrozen(
        uint256 indexed landId,
        address indexed unfrozenBy,
        uint256 timestamp
    );

    /// @notice Fired when a land is marked as disputed
    event LandDisputed(
        uint256 indexed landId,
        address indexed markedBy,
        uint256 timestamp
    );

    // ============================================================
    //  CUSTOM ERRORS
    //  Custom errors (introduced in Solidity 0.8.4) are cheaper
    //  than require(false, "string") because they don't store the
    //  string on-chain. They also give clearer error messages.
    // ============================================================

    error LandDoesNotExist(uint256 landId);
    error NotLandOwner(uint256 landId, address caller);
    error LandNotVerified(uint256 landId, LandStatus currentStatus);
    error LandIsFrozen(uint256 landId);
    error LandIsDisputed(uint256 landId);
    error SurveyNumberAlreadyRegistered(string surveyNumber);
    error ActiveTransferExists(uint256 landId);
    error NoActiveTransfer(uint256 landId);
    error NotTransferBuyer(uint256 landId, address caller);
    error TransferNotInState(uint256 landId, TransferState required, TransferState actual);
    error CannotTransferToSelf();
    error ZeroAddress();
    error EmptyString(string field);
    error InvalidArea();
    error InvalidPrice();

    // ============================================================
    //  CONSTRUCTOR
    //  Called once when the contract is deployed.
    //  We grant the deployer both DEFAULT_ADMIN_ROLE and
    //  REGISTRAR_ROLE so they can immediately start managing the system.
    // ============================================================

    /**
     * @param initialAdmin The wallet address that will be the first admin.
     *                     Typically this is the deployer's address.
     */
    constructor(address initialAdmin) {
        if (initialAdmin == address(0)) revert ZeroAddress();

        // DEFAULT_ADMIN_ROLE is OpenZeppelin's built-in super-role.
        // It can grant and revoke all other roles.
        _grantRole(DEFAULT_ADMIN_ROLE, initialAdmin);

        // Also grant the REGISTRAR_ROLE to the initial admin so they
        // can verify lands immediately after deployment.
        _grantRole(REGISTRAR_ROLE, initialAdmin);

        // Start the counter at 1 (so landId 0 can be used as a "null" check)
        _landIdCounter = 1;
    }

    // ============================================================
    //  MODIFIERS
    //  Modifiers are reusable checks that run before a function body.
    //  The "_;" means "run the rest of the function here".
    // ============================================================

    /**
     * @dev Ensures a land with the given ID actually exists.
     *      We store a boolean `exists` flag in the Land struct for this.
     */
    modifier landExists(uint256 landId) {
        if (!_lands[landId].exists) revert LandDoesNotExist(landId);
        _;
    }

    /**
     * @dev Ensures the caller is the current owner of the land.
     */
    modifier onlyLandOwner(uint256 landId) {
        if (_lands[landId].currentOwner != msg.sender)
            revert NotLandOwner(landId, msg.sender);
        _;
    }

    /**
     * @dev Ensures the land is in VERIFIED status before allowing transfer.
     *      You can't transfer a PENDING or REJECTED land.
     */
    modifier onlyVerifiedLand(uint256 landId) {
        if (_lands[landId].status != LandStatus.VERIFIED)
            revert LandNotVerified(landId, _lands[landId].status);
        _;
    }

    /**
     * @dev Prevents any action on a FROZEN land.
     */
    modifier notFrozen(uint256 landId) {
        if (_lands[landId].status == LandStatus.FROZEN)
            revert LandIsFrozen(landId);
        _;
    }

    /**
     * @dev Prevents any transfer action on a DISPUTED land.
     */
    modifier notDisputed(uint256 landId) {
        if (_lands[landId].status == LandStatus.DISPUTED)
            revert LandIsDisputed(landId);
        _;
    }

    // ============================================================
    //  PAUSABLE — Emergency Stop
    //  The admin can call pause() to stop ALL contract functions.
    //  This is a safety net in case a bug is discovered.
    // ============================================================

    /**
     * @notice Pause all contract functions (emergency use only).
     * @dev    Only callable by DEFAULT_ADMIN_ROLE.
     */
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    /**
     * @notice Resume contract functions after a pause.
     * @dev    Only callable by DEFAULT_ADMIN_ROLE.
     */
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    // ============================================================
    //  LAND REGISTRATION
    // ============================================================

    /**
     * @notice Register a new piece of land on the blockchain.
     *
     * @dev    Anyone can call this (no role restriction) because
     *         any citizen should be able to submit a land for
     *         registration. The registrar then verifies or rejects it.
     *
     *         The land starts in PENDING status.
     *
     * @param surveyNumber  Official government survey number (must be unique)
     * @param area          Area in square meters (must be > 0)
     * @param location      Human-readable location (e.g., "Plot 42, MG Road, Bengaluru")
     * @param price         Asking price in Wei (1 ETH = 1_000_000_000_000_000_000 Wei)
     * @param ipfsHash      The IPFS CID of the uploaded deed document
     *
     * @return landId       The newly assigned land ID
     */
    function registerLand(
        string calldata surveyNumber,
        uint256 area,
        string calldata location,
        uint256 price,
        string calldata ipfsHash
    ) external whenNotPaused returns (uint256 landId) {
        // --- Input validation ---
        // We check every input carefully to prevent garbage data on-chain.
        if (bytes(surveyNumber).length == 0) revert EmptyString("surveyNumber");
        if (bytes(location).length == 0)     revert EmptyString("location");
        if (bytes(ipfsHash).length == 0)     revert EmptyString("ipfsHash");
        if (area == 0)                        revert InvalidArea();
        if (price == 0)                       revert InvalidPrice();

        // Prevent duplicate registration of the same physical land
        if (_surveyNumberToLandId[surveyNumber] != 0)
            revert SurveyNumberAlreadyRegistered(surveyNumber);

        // --- Assign the next land ID ---
        landId = _landIdCounter;
        _landIdCounter++;

        // --- Store the land on-chain ---
        _lands[landId] = Land({
            landId:       landId,
            surveyNumber: surveyNumber,
            area:         area,
            location:     location,
            currentOwner: msg.sender,  // The person calling this function
            price:        price,
            ipfsHash:     ipfsHash,
            status:       LandStatus.PENDING,
            createdAt:    block.timestamp,
            exists:       true
        });

        // --- Update supporting mappings ---
        _surveyNumberToLandId[surveyNumber] = landId;
        _ownerToLands[msg.sender].push(landId);

        // --- Record first history entry ---
        _ownershipHistory[landId].push(HistoryEntry({
            owner:           msg.sender,
            timestamp:       block.timestamp,
            transactionType: "REGISTERED"
        }));

        // --- Notify the backend ---
        emit LandRegistered(landId, msg.sender, surveyNumber, ipfsHash, block.timestamp);
    }

    // ============================================================
    //  REGISTRAR FUNCTIONS (Admin / Government Registrar)
    // ============================================================

    /**
     * @notice Approve (verify) a land record after reviewing documents.
     *
     * @dev    Only REGISTRAR_ROLE can call this.
     *         Land must be in PENDING status.
     *
     * @param landId  The ID of the land to verify
     */
    function verifyLand(uint256 landId)
        external
        whenNotPaused
        onlyRole(REGISTRAR_ROLE)
        landExists(landId)
    {
        Land storage land = _lands[landId];

        // Can only verify a PENDING land
        // (not one that was already verified, rejected, or frozen)
        require(
            land.status == LandStatus.PENDING,
            "LandRegistry: land is not in PENDING status"
        );

        land.status = LandStatus.VERIFIED;

        // Record this action in the ownership history
        _ownershipHistory[landId].push(HistoryEntry({
            owner:           land.currentOwner,
            timestamp:       block.timestamp,
            transactionType: "VERIFIED"
        }));

        emit LandVerified(landId, msg.sender, block.timestamp);
    }

    /**
     * @notice Reject a land registration (bad documents, fraud, etc.).
     *
     * @dev    Only REGISTRAR_ROLE can call this.
     *         Land must be in PENDING status.
     *
     * @param landId  The ID of the land to reject
     * @param reason  Human-readable reason for rejection (stored in event)
     */
    function rejectLand(uint256 landId, string calldata reason)
        external
        whenNotPaused
        onlyRole(REGISTRAR_ROLE)
        landExists(landId)
    {
        if (bytes(reason).length == 0) revert EmptyString("reason");

        Land storage land = _lands[landId];
        require(
            land.status == LandStatus.PENDING,
            "LandRegistry: land is not in PENDING status"
        );

        land.status = LandStatus.REJECTED;

        _ownershipHistory[landId].push(HistoryEntry({
            owner:           land.currentOwner,
            timestamp:       block.timestamp,
            transactionType: "REJECTED"
        }));

        emit LandRejected(landId, msg.sender, reason, block.timestamp);
    }

    /**
     * @notice Freeze a land (suspected fraud, court order, etc.).
     *         A frozen land CANNOT be transferred.
     *
     * @dev    Only REGISTRAR_ROLE can call this.
     *         The land can be unfrozen later with unfreezeLand().
     *
     * @param landId  The ID of the land to freeze
     */
    function freezeLand(uint256 landId)
        external
        whenNotPaused
        onlyRole(REGISTRAR_ROLE)
        landExists(landId)
    {
        Land storage land = _lands[landId];

        // Can only freeze a VERIFIED land (PENDING lands are already blocked)
        require(
            land.status == LandStatus.VERIFIED,
            "LandRegistry: only VERIFIED lands can be frozen"
        );

        land.status = LandStatus.FROZEN;

        _ownershipHistory[landId].push(HistoryEntry({
            owner:           land.currentOwner,
            timestamp:       block.timestamp,
            transactionType: "FROZEN"
        }));

        emit LandFrozen(landId, msg.sender, block.timestamp);
    }

    /**
     * @notice Unfreeze a previously frozen land.
     *         After unfreezing, status returns to VERIFIED.
     *
     * @dev    Only REGISTRAR_ROLE can call this.
     *
     * @param landId  The ID of the land to unfreeze
     */
    function unfreezeLand(uint256 landId)
        external
        whenNotPaused
        onlyRole(REGISTRAR_ROLE)
        landExists(landId)
    {
        Land storage land = _lands[landId];
        require(
            land.status == LandStatus.FROZEN,
            "LandRegistry: land is not FROZEN"
        );

        land.status = LandStatus.VERIFIED;

        _ownershipHistory[landId].push(HistoryEntry({
            owner:           land.currentOwner,
            timestamp:       block.timestamp,
            transactionType: "UNFROZEN"
        }));

        emit LandUnfrozen(landId, msg.sender, block.timestamp);
    }

    /**
     * @notice Mark a land as disputed (e.g., legal case filed).
     *
     * @dev    Only REGISTRAR_ROLE can call this.
     *
     * @param landId  The ID of the land to mark as disputed
     */
    function markDisputed(uint256 landId)
        external
        whenNotPaused
        onlyRole(REGISTRAR_ROLE)
        landExists(landId)
    {
        Land storage land = _lands[landId];
        require(
            land.status == LandStatus.VERIFIED,
            "LandRegistry: only VERIFIED lands can be marked disputed"
        );

        land.status = LandStatus.DISPUTED;

        _ownershipHistory[landId].push(HistoryEntry({
            owner:           land.currentOwner,
            timestamp:       block.timestamp,
            transactionType: "DISPUTED"
        }));

        emit LandDisputed(landId, msg.sender, block.timestamp);
    }

    // ============================================================
    //  TRANSFER FUNCTIONS
    // ============================================================

    /**
     * @notice Start an ownership transfer to a buyer.
     *
     * @dev    Rules enforced here:
     *           1. Caller must be the current owner.
     *           2. Land must be VERIFIED (not pending, rejected, frozen, disputed).
     *           3. No other active transfer can exist for this land.
     *           4. Buyer cannot be the same as the seller.
     *           5. Buyer cannot be the zero address.
     *
     * @param landId  The ID of the land to transfer
     * @param buyer   The wallet address of the intended buyer
     * @param price   The agreed sale price in Wei
     */
    function initiateTransfer(uint256 landId, address buyer, uint256 price)
        external
        whenNotPaused
        landExists(landId)
        onlyLandOwner(landId)
        onlyVerifiedLand(landId)
        notFrozen(landId)
        notDisputed(landId)
    {
        if (buyer == address(0))  revert ZeroAddress();
        if (buyer == msg.sender)  revert CannotTransferToSelf();
        if (price == 0)           revert InvalidPrice();

        // Check no active transfer already exists for this land
        // "Active" means the state is INITIATED or BUYER_ACCEPTED
        TransferRequest storage existing = _transferRequests[landId];
        if (
            existing.state == TransferState.INITIATED ||
            existing.state == TransferState.BUYER_ACCEPTED
        ) {
            revert ActiveTransferExists(landId);
        }

        // Create the transfer request
        _transferRequests[landId] = TransferRequest({
            landId:          landId,
            from:            msg.sender,
            to:              buyer,
            price:           price,
            state:           TransferState.INITIATED,
            initiatedAt:     block.timestamp,
            rejectionReason: ""
        });

        emit TransferInitiated(landId, msg.sender, buyer, price, block.timestamp);
    }

    /**
     * @notice Buyer accepts the transfer request.
     *
     * @dev    Only the intended buyer (stored in the TransferRequest) can
     *         call this. This is an important security check — we don't
     *         want anyone to accept on behalf of the buyer.
     *
     * @param landId  The ID of the land whose transfer to accept
     */
    function acceptTransfer(uint256 landId)
        external
        whenNotPaused
        landExists(landId)
    {
        TransferRequest storage request = _transferRequests[landId];

        // Must be the designated buyer
        if (request.to != msg.sender)
            revert NotTransferBuyer(landId, msg.sender);

        // Transfer must be in INITIATED state
        if (request.state != TransferState.INITIATED)
            revert TransferNotInState(landId, TransferState.INITIATED, request.state);

        request.state = TransferState.BUYER_ACCEPTED;

        emit TransferAccepted(landId, msg.sender, block.timestamp);
    }

    /**
     * @notice Registrar approves the transfer — ownership changes here!
     *
     * @dev    This is the most important function. When called:
     *           1. The land's currentOwner is updated to the buyer.
     *           2. The seller's landId list is updated.
     *           3. The buyer is added to the owner's landId list.
     *           4. A new HistoryEntry is pushed.
     *           5. The TransferRequest state becomes APPROVED.
     *
     *         Uses nonReentrant modifier as a safety measure even though
     *         this version does not send ETH (future versions might).
     *
     * @param landId  The ID of the land whose transfer to approve
     */
    function approveTransfer(uint256 landId)
        external
        whenNotPaused
        nonReentrant
        onlyRole(REGISTRAR_ROLE)
        landExists(landId)
    {
        TransferRequest storage request = _transferRequests[landId];
        Land storage land = _lands[landId];

        // Transfer must be accepted by buyer before registrar can approve
        if (request.state != TransferState.BUYER_ACCEPTED)
            revert TransferNotInState(landId, TransferState.BUYER_ACCEPTED, request.state);

        address previousOwner = land.currentOwner;
        address newOwner = request.to;

        // --- Update ownership ---
        land.currentOwner = newOwner;

        // Update the _ownerToLands mappings:
        // Remove landId from the old owner's array
        _removeLandFromOwner(previousOwner, landId);

        // Add landId to the new owner's array
        _ownerToLands[newOwner].push(landId);

        // --- Record history ---
        _ownershipHistory[landId].push(HistoryEntry({
            owner:           newOwner,
            timestamp:       block.timestamp,
            transactionType: "TRANSFER"
        }));

        // --- Update transfer request state ---
        request.state = TransferState.APPROVED;

        emit TransferApproved(landId, previousOwner, newOwner, request.price, block.timestamp);
    }

    /**
     * @notice Registrar rejects the transfer request.
     *         Land ownership does NOT change. Seller keeps the land.
     *
     * @param landId  The ID of the land whose transfer to reject
     * @param reason  Human-readable reason for rejection
     */
    function rejectTransfer(uint256 landId, string calldata reason)
        external
        whenNotPaused
        onlyRole(REGISTRAR_ROLE)
        landExists(landId)
    {
        if (bytes(reason).length == 0) revert EmptyString("reason");

        TransferRequest storage request = _transferRequests[landId];

        // Can reject at either INITIATED or BUYER_ACCEPTED stage
        require(
            request.state == TransferState.INITIATED ||
            request.state == TransferState.BUYER_ACCEPTED,
            "LandRegistry: transfer is not in a rejectable state"
        );

        request.state = TransferState.REJECTED;
        request.rejectionReason = reason;

        emit TransferRejected(landId, msg.sender, reason, block.timestamp);
    }

    /**
     * @notice Seller cancels the transfer before the buyer accepts it.
     *         Can only cancel if the transfer is still INITIATED
     *         (buyer hasn't accepted yet).
     *
     * @param landId  The ID of the land whose transfer to cancel
     */
    function cancelTransfer(uint256 landId)
        external
        whenNotPaused
        landExists(landId)
        onlyLandOwner(landId)
    {
        TransferRequest storage request = _transferRequests[landId];

        // Can only cancel before the buyer has accepted
        if (request.state != TransferState.INITIATED)
            revert TransferNotInState(landId, TransferState.INITIATED, request.state);

        request.state = TransferState.CANCELLED;

        emit TransferCancelled(landId, msg.sender, block.timestamp);
    }

    // ============================================================
    //  VIEW FUNCTIONS (Reading data — these are FREE, no gas cost)
    // ============================================================

    /**
     * @notice Get all details of a single land by its ID.
     *
     * @param landId  The land ID to look up
     * @return land   The full Land struct
     */
    function getLand(uint256 landId)
        external
        view
        landExists(landId)
        returns (Land memory)
    {
        return _lands[landId];
    }

    /**
     * @notice Get all land IDs owned by a specific wallet address.
     *
     * @param owner   The wallet address to look up
     * @return        Array of land IDs owned by this address
     */
    function getLandsByOwner(address owner)
        external
        view
        returns (uint256[] memory)
    {
        if (owner == address(0)) revert ZeroAddress();
        return _ownerToLands[owner];
    }

    /**
     * @notice Get the full ownership history of a land.
     *         This is the immutable audit trail — every registration,
     *         verification, transfer, freeze etc. is recorded here.
     *
     * @param landId  The land ID whose history to retrieve
     * @return        Array of HistoryEntry structs
     */
    function getOwnershipHistory(uint256 landId)
        external
        view
        landExists(landId)
        returns (HistoryEntry[] memory)
    {
        return _ownershipHistory[landId];
    }

    /**
     * @notice Get the active transfer request for a land.
     *
     * @param landId  The land ID to check
     * @return        The TransferRequest struct (state will be NONE if no transfer)
     */
    function getTransferRequest(uint256 landId)
        external
        view
        landExists(landId)
        returns (TransferRequest memory)
    {
        return _transferRequests[landId];
    }

    /**
     * @notice Get a land's ID by its survey number.
     *         Useful for looking up a land when you only have the survey number.
     *
     * @param surveyNumber  The government survey number
     * @return              The landId (0 if not registered)
     */
    function getLandIdBySurveyNumber(string calldata surveyNumber)
        external
        view
        returns (uint256)
    {
        return _surveyNumberToLandId[surveyNumber];
    }

    /**
     * @notice Get the total number of lands ever registered.
     *         Since IDs start at 1, the total count is (counter - 1).
     *
     * @return  Total number of registered lands
     */
    function totalLands() external view returns (uint256) {
        return _landIdCounter - 1;
    }

    // ============================================================
    //  INTERNAL HELPERS (Private utility functions)
    // ============================================================

    /**
     * @dev Remove a landId from an owner's array when they sell their land.
     *      This uses the "swap and pop" pattern — swap the element to remove
     *      with the last element, then pop the last element.
     *      This is O(n) in the worst case but avoids leaving gaps in the array.
     *
     * @param owner   The address whose array to modify
     * @param landId  The landId to remove
     */
    function _removeLandFromOwner(address owner, uint256 landId) internal {
        uint256[] storage lands = _ownerToLands[owner];
        uint256 len = lands.length;

        for (uint256 i = 0; i < len; i++) {
            if (lands[i] == landId) {
                // Swap with the last element and pop
                lands[i] = lands[len - 1];
                lands.pop();
                break;
            }
        }
    }

    // ============================================================
    //  ROLE MANAGEMENT (convenience wrappers around AccessControl)
    // ============================================================

    /**
     * @notice Grant REGISTRAR_ROLE to an address.
     *         Only DEFAULT_ADMIN_ROLE can call this.
     *
     * @param account  The wallet address to make a registrar
     */
    function grantRegistrarRole(address account)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        if (account == address(0)) revert ZeroAddress();
        _grantRole(REGISTRAR_ROLE, account);
    }

    /**
     * @notice Revoke REGISTRAR_ROLE from an address.
     *         Only DEFAULT_ADMIN_ROLE can call this.
     *
     * @param account  The wallet address to remove as registrar
     */
    function revokeRegistrarRole(address account)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        _revokeRole(REGISTRAR_ROLE, account);
    }
}


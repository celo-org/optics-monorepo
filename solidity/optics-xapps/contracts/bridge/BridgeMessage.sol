// SPDX-License-Identifier: MIT OR Apache-2.0
pragma solidity >=0.6.11;

// ============ External Imports ============
import {TypedMemView} from "@summa-tx/memview-sol/contracts/TypedMemView.sol";

library BridgeMessage {
    // ============ Libraries ============

    using TypedMemView for bytes;
    using TypedMemView for bytes29;

    // ============ Enums ============

    // WARNING: do NOT re-write the numbers / order
    // of message types in an upgrade;
    // will cause in-flight messages to be mis-interpreted
    enum Types {
        Invalid, // 0
        TokenId, // 1
        Message, // 2
        Transfer, // 3
        Details, // 4
        RequestDetails // 5
    }

    // ============ Constants ============

    uint256 private constant TOKEN_ID_LEN = 36; // 4 bytes domain + 32 bytes id
    uint256 private constant IDENTIFIER_LEN = 1;
    uint256 private constant TRANSFER_LEN = 65; // 1 byte identifier + 32 bytes recipient + 32 bytes amount
    uint256 private constant DETAILS_LEN = 66; // 1 byte identifier + 32 bytes name + 32 bytes symbol + 1 byte decimals
    uint256 private constant REQUEST_DETAILS_LEN = 1; // 1 byte identifier

    // ============ Modifiers ============

    /**
     * @notice Asserts a message is of type `_t`
     * @param _view The message
     * @param _t The expected type
     */
    modifier typeAssert(bytes29 _view, Types _t) {
        _view.assertType(uint40(_t));
        _;
    }

    // ============ Internal Functions ============

    /**
     * @notice Checks that Action is valid type
     * @param _action The action
     * @return TRUE if action is valid
     */
    function isValidAction(bytes29 _action) internal pure returns (bool) {
        return
            isDetails(_action) ||
            isRequestDetails(_action) ||
            isTransfer(_action);
    }

    /**
     * @notice Checks that view is a valid message length
     * @param _view The bytes string
     * @return TRUE if message is valid
     */
    function isValidMessageLength(bytes29 _view) internal pure returns (bool) {
        uint256 _len = _view.len();
        return
            _len == TOKEN_ID_LEN + TRANSFER_LEN ||
            _len == TOKEN_ID_LEN + DETAILS_LEN ||
            _len == TOKEN_ID_LEN + REQUEST_DETAILS_LEN;
    }

    /**
     * @notice Formats an action message
     * @param _tokenId The token ID
     * @param _action The action
     * @return The formatted message
     */
    function formatMessage(bytes29 _tokenId, bytes29 _action)
        internal
        view
        typeAssert(_tokenId, Types.TokenId)
        returns (bytes memory)
    {
        require(isValidAction(_action), "!action");
        bytes29[] memory _views = new bytes29[](2);
        _views[0] = _tokenId;
        _views[1] = _action;
        return TypedMemView.join(_views);
    }

    /**
     * @notice Returns the type of the message
     * @param _view The message
     * @return The type of the message
     */
    function messageType(bytes29 _view) internal pure returns (Types) {
        return Types(uint8(_view.typeOf()));
    }

    /**
     * @notice Checks that the message is of type Transfer
     * @param _action The message
     * @return True if the message is of type Transfer
     */
    function isTransfer(bytes29 _action) internal pure returns (bool) {
        return
            actionType(_action) == uint8(Types.Transfer) &&
            messageType(_action) == Types.Transfer;
    }

    /**
     * @notice Checks that the message is of type Details
     * @param _action The message
     * @return True if the message is of type Details
     */
    function isDetails(bytes29 _action) internal pure returns (bool) {
        return
            actionType(_action) == uint8(Types.Details) &&
            messageType(_action) == Types.Details;
    }

    /**
     * @notice Checks that the message is of type Details
     * @param _action The message
     * @return True if the message is of type Details
     */
    function isRequestDetails(bytes29 _action) internal pure returns (bool) {
        return
            actionType(_action) == uint8(Types.RequestDetails) &&
            messageType(_action) == Types.RequestDetails;
    }

    /**
     * @notice Formats Transfer
     * @param _to The recipient address as bytes32
     * @param _amnt The transfer amount
     * @return
     */
    function formatTransfer(bytes32 _to, uint256 _amnt)
        internal
        pure
        returns (bytes29)
    {
        return
            mustBeTransfer(abi.encodePacked(Types.Transfer, _to, _amnt).ref(0));
    }

    /**
     * @notice Formats Details
     * @param _name The name
     * @param _symbol The symbol
     * @param _decimals The decimals
     * @return The Details message
     */
    function formatDetails(
        bytes32 _name,
        bytes32 _symbol,
        uint8 _decimals
    ) internal pure returns (bytes29) {
        return
            mustBeDetails(
                abi.encodePacked(Types.Details, _name, _symbol, _decimals).ref(
                    0
                )
            );
    }

    /**
     * @notice Formats Request Details
     * @return The Request Details message
     */
    function formatRequestDetails() internal pure returns (bytes29) {
        return
            mustBeRequestDetails(abi.encodePacked(Types.RequestDetails).ref(0));
    }

    /**
     * @notice Formats the Token ID
     * @param _domain The domain
     * @param _id The ID
     * @return The formatted Token ID
     */
    function formatTokenId(uint32 _domain, bytes32 _id)
        internal
        pure
        returns (bytes29)
    {
        return mustBeTokenId(abi.encodePacked(_domain, _id).ref(0));
    }

    /**
     * @notice Retrieves the domain from a TokenID
     * @param _tokenId The message
     * @return The domain
     */
    function domain(bytes29 _tokenId)
        internal
        pure
        typeAssert(_tokenId, Types.TokenId)
        returns (uint32)
    {
        return uint32(_tokenId.indexUint(0, 4));
    }

    /**
     * @notice Retrieves the ID from a TokenID
     * @param _tokenId The message
     * @return The ID
     */
    function id(bytes29 _tokenId)
        internal
        pure
        typeAssert(_tokenId, Types.TokenId)
        returns (bytes32)
    {
        // before = 4 bytes domain
        return _tokenId.index(4, 32);
    }

    /**
     * @notice Retrieves the EVM ID
     * @param _tokenId The message
     * @return The EVM ID
     */
    function evmId(bytes29 _tokenId)
        internal
        pure
        typeAssert(_tokenId, Types.TokenId)
        returns (address)
    {
        // before = 4 bytes domain + 12 bytes empty to trim for address
        return _tokenId.indexAddress(16);
    }

    /**
     * @notice Retrieves the action identifier from message
     * @param _message The action
     * @return The message type
     */
    function msgType(bytes29 _message) internal pure returns (uint8) {
        return uint8(_message.indexUint(TOKEN_ID_LEN, 1));
    }

    /**
     * @notice Retrieves the identifier from action
     * @param _action The action
     * @return The action type
     */
    function actionType(bytes29 _action) internal pure returns (uint8) {
        return uint8(_action.indexUint(0, 1));
    }

    /**
     * @notice Retrieves the recipient from a Transfer
     * @param _transferAction The message
     * @return The recipient address as bytes32
     */
    function recipient(bytes29 _transferAction)
        internal
        pure
        typeAssert(_transferAction, Types.Transfer)
        returns (bytes32)
    {
        // before = 1 byte identifier
        return _transferAction.index(1, 32);
    }

    /**
     * @notice Retrieves the EVM Recipient from a Transfer
     * @param _transferAction The message
     * @return The EVM Recipient
     */
    function evmRecipient(bytes29 _transferAction)
        internal
        pure
        typeAssert(_transferAction, Types.Transfer)
        returns (address)
    {
        // before = 1 byte identifier + 12 bytes empty to trim for address
        return _transferAction.indexAddress(13);
    }

    /**
     * @notice Retrieves the amount from a Transfer
     * @param _transferAction The message
     * @return The amount
     */
    function amnt(bytes29 _transferAction)
        internal
        pure
        typeAssert(_transferAction, Types.Transfer)
        returns (uint256)
    {
        // before = 1 byte identifier + 32 bytes ID
        return _transferAction.indexUint(33, 32);
    }

    /**
     * @notice Retrieves the name from Details
     * @param _detailsAction The message
     * @return The name
     */
    function name(bytes29 _detailsAction)
        internal
        pure
        typeAssert(_detailsAction, Types.Details)
        returns (bytes32)
    {
        // before = 1 byte identifier
        return _detailsAction.index(1, 32);
    }

    /**
     * @notice Retrieves the symbol from Details
     * @param _detailsAction The message
     * @return The symbol
     */
    function symbol(bytes29 _detailsAction)
        internal
        pure
        typeAssert(_detailsAction, Types.Details)
        returns (bytes32)
    {
        // before = 1 byte identifier + 32 bytes name
        return _detailsAction.index(33, 32);
    }

    /**
     * @notice Retrieves the decimals from Details
     * @param _detailsAction The message
     * @return The decimals
     */
    function decimals(bytes29 _detailsAction)
        internal
        pure
        typeAssert(_detailsAction, Types.Details)
        returns (uint8)
    {
        // before = 1 byte identifier + 32 bytes name + 32 bytes symbol
        return uint8(_detailsAction.indexUint(65, 1));
    }

    /**
     * @notice Retrieves the token ID from a Message
     * @param _message The message
     * @return The ID
     */
    function tokenId(bytes29 _message)
        internal
        pure
        typeAssert(_message, Types.Message)
        returns (bytes29)
    {
        return _message.slice(0, TOKEN_ID_LEN, uint40(Types.TokenId));
    }

    /**
     * @notice Retrieves the action data from a Message
     * @param _message The message
     * @return The action
     */
    function action(bytes29 _message)
        internal
        pure
        typeAssert(_message, Types.Message)
        returns (bytes29)
    {
        uint256 _actionLen = _message.len() - TOKEN_ID_LEN;
        uint40 _type = uint40(msgType(_message));
        return _message.slice(TOKEN_ID_LEN, _actionLen, _type);
    }

    /**
     * @notice Converts to a Transfer
     * @param _action The message
     * @return The newly typed message
     */
    function tryAsTransfer(bytes29 _action) internal pure returns (bytes29) {
        if (_action.len() == TRANSFER_LEN) {
            return _action.castTo(uint40(Types.Transfer));
        }
        return TypedMemView.nullView();
    }

    /**
     * @notice Converts to a Details
     * @param _action The message
     * @return The newly typed message
     */
    function tryAsDetails(bytes29 _action) internal pure returns (bytes29) {
        if (_action.len() == DETAILS_LEN) {
            return _action.castTo(uint40(Types.Details));
        }
        return TypedMemView.nullView();
    }

    /**
     * @notice Converts to a Details
     * @param _action The message
     * @return The newly typed message
     */
    function tryAsRequestDetails(bytes29 _action)
        internal
        pure
        returns (bytes29)
    {
        if (_action.len() == REQUEST_DETAILS_LEN) {
            return _action.castTo(uint40(Types.RequestDetails));
        }
        return TypedMemView.nullView();
    }

    /**
     * @notice Converts to a TokenID
     * @param _tokenId The message
     * @return The newly typed message
     */
    function tryAsTokenId(bytes29 _tokenId) internal pure returns (bytes29) {
        if (_tokenId.len() == TOKEN_ID_LEN) {
            return _tokenId.castTo(uint40(Types.TokenId));
        }
        return TypedMemView.nullView();
    }

    /**
     * @notice Converts to a Message
     * @param _message The message
     * @return The newly typed message
     */
    function tryAsMessage(bytes29 _message) internal pure returns (bytes29) {
        if (isValidMessageLength(_message)) {
            return _message.castTo(uint40(Types.Message));
        }
        return TypedMemView.nullView();
    }

    /**
     * @notice Asserts that the message is of type Transfer
     * @param _view The message
     * @return The message
     */
    function mustBeTransfer(bytes29 _view) internal pure returns (bytes29) {
        return tryAsTransfer(_view).assertValid();
    }

    /**
     * @notice Asserts that the message is of type Details
     * @param _view The message
     * @return The message
     */
    function mustBeDetails(bytes29 _view) internal pure returns (bytes29) {
        return tryAsDetails(_view).assertValid();
    }

    /**
     * @notice Asserts that the message is of type Details
     * @param _view The message
     * @return The message
     */
    function mustBeRequestDetails(bytes29 _view)
        internal
        pure
        returns (bytes29)
    {
        return tryAsRequestDetails(_view).assertValid();
    }

    /**
     * @notice Asserts that the message is of type TokenID
     * @param _view The message
     * @return The message
     */
    function mustBeTokenId(bytes29 _view) internal pure returns (bytes29) {
        return tryAsTokenId(_view).assertValid();
    }

    /**
     * @notice Asserts that the message is of type Message
     * @param _view The message
     * @return The message
     */
    function mustBeMessage(bytes29 _view) internal pure returns (bytes29) {
        return tryAsMessage(_view).assertValid();
    }
}

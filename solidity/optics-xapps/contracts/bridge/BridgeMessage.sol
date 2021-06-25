// SPDX-License-Identifier: MIT OR Apache-2.0
pragma solidity >=0.6.11;

// ============ External Imports ============
import {TypedMemView} from "@summa-tx/memview-sol/contracts/TypedMemView.sol";

library BridgeMessage {
    using TypedMemView for bytes;
    using TypedMemView for bytes29;

    uint256 private constant TOKEN_ID_LEN = 36;
    uint256 private constant TRANSFER_LEN = 64;
    uint256 private constant DETAILS_LEN = 65;

    enum Types {
        Invalid, // 0
        Transfer, // 1
        Details, // 2
        TokenId, // 3
        Message // 4
    }

    /**
     * @notice Asserts a message is of type `_t`
     * @param _view The message
     * @param _t The expected type
     */
    modifier typeAssert(bytes29 _view, Types _t) {
        _view.assertType(uint40(_t));
        _;
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
        require(isDetails(_action) || isTransfer(_action), "!action");
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
     * @param _view The message
     * @return True if the message is of type Transfer
     */
    function isTransfer(bytes29 _view) internal pure returns (bool) {
        return messageType(_view) == Types.Transfer;
    }

    /**
     * @notice Checks that the message is of type Details
     * @param _view The message
     * @return True if the message is of type Details
     */
    function isDetails(bytes29 _view) internal pure returns (bool) {
        return messageType(_view) == Types.Details;
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
        return mustBeTransfer(abi.encodePacked(_to, _amnt).ref(0));
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
            mustBeDetails(abi.encodePacked(_name, _symbol, _decimals).ref(0));
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
     * @param _view The message
     * @return The domain
     */
    function domain(bytes29 _view)
        internal
        pure
        typeAssert(_view, Types.TokenId)
        returns (uint32)
    {
        return uint32(_view.indexUint(0, 4));
    }

    /**
     * @notice Retrieves the ID from a TokenID
     * @param _view The message
     * @return The ID
     */
    function id(bytes29 _view)
        internal
        pure
        typeAssert(_view, Types.TokenId)
        returns (bytes32)
    {
        return _view.index(4, 32);
    }

    /**
     * @notice Retrieves the EVM ID
     * @param _view The message
     * @return The EVM ID
     */
    function evmId(bytes29 _view)
        internal
        pure
        typeAssert(_view, Types.TokenId)
        returns (address)
    {
        // 4 bytes domain + 12 empty to trim for address
        return _view.indexAddress(16);
    }

    /**
     * @notice Retrieves the recipient from a Transfer
     * @param _view The message
     * @return The recipient address as bytes32
     */
    function recipient(bytes29 _view)
        internal
        pure
        typeAssert(_view, Types.Transfer)
        returns (bytes32)
    {
        return _view.index(0, 32);
    }

    /**
     * @notice Retrieves the EVM Recipient from a Transfer
     * @param _view The message
     * @return The EVM Recipient
     */
    function evmRecipient(bytes29 _view)
        internal
        pure
        typeAssert(_view, Types.Transfer)
        returns (address)
    {
        return _view.indexAddress(12);
    }

    /**
     * @notice Retrieves the amount from a Transfer
     * @param _view The message
     * @return The amount
     */
    function amnt(bytes29 _view)
        internal
        pure
        typeAssert(_view, Types.Transfer)
        returns (uint256)
    {
        return _view.indexUint(32, 32);
    }

    /**
     * @notice Retrieves the name from Details
     * @param _view The message
     * @return The name
     */
    function name(bytes29 _view)
        internal
        pure
        typeAssert(_view, Types.Details)
        returns (bytes32)
    {
        return _view.index(0, 32);
    }

    /**
     * @notice Retrieves the symbol from Details
     * @param _view The message
     * @return The symbol
     */
    function symbol(bytes29 _view)
        internal
        pure
        typeAssert(_view, Types.Details)
        returns (bytes32)
    {
        return _view.index(32, 32);
    }

    /**
     * @notice Retrieves the decimals from Details
     * @param _view The message
     * @return The decimals
     */
    function decimals(bytes29 _view)
        internal
        pure
        typeAssert(_view, Types.Details)
        returns (uint8)
    {
        return uint8(_view.indexUint(64, 1));
    }

    /**
     * @notice Retrieves the token ID from a Message
     * @param _view The message
     * @return The ID
     */
    function tokenId(bytes29 _view)
        internal
        pure
        typeAssert(_view, Types.Message)
        returns (bytes29)
    {
        return _view.slice(0, TOKEN_ID_LEN, uint40(Types.TokenId));
    }

    /**
     * @notice Retrieves the action data from a Message
     * @param _view The message
     * @return The action
     */
    function action(bytes29 _view)
        internal
        pure
        typeAssert(_view, Types.Message)
        returns (bytes29)
    {
        if (_view.len() == TOKEN_ID_LEN + DETAILS_LEN) {
            return
                _view.slice(
                    TOKEN_ID_LEN,
                    TOKEN_ID_LEN + DETAILS_LEN,
                    uint40(Types.Details)
                );
        }
        return
            _view.slice(
                TOKEN_ID_LEN,
                TOKEN_ID_LEN + TRANSFER_LEN,
                uint40(Types.Transfer)
            );
    }

    /**
     * @notice Converts to a Transfer
     * @param _view The message
     * @return The newly typed message
     */
    function tryAsTransfer(bytes29 _view) internal pure returns (bytes29) {
        if (_view.len() == TRANSFER_LEN) {
            return _view.castTo(uint40(Types.Transfer));
        }
        return TypedMemView.nullView();
    }

    /**
     * @notice Converts to a Details
     * @param _view The message
     * @return The newly typed message
     */
    function tryAsDetails(bytes29 _view) internal pure returns (bytes29) {
        if (_view.len() == DETAILS_LEN) {
            return _view.castTo(uint40(Types.Details));
        }
        return TypedMemView.nullView();
    }

    /**
     * @notice Converts to a TokenID
     * @param _view The message
     * @return The newly typed message
     */
    function tryAsTokenId(bytes29 _view) internal pure returns (bytes29) {
        if (_view.len() == 36) {
            return _view.castTo(uint40(Types.TokenId));
        }
        return TypedMemView.nullView();
    }

    /**
     * @notice Converts to a Message
     * @param _view The message
     * @return The newly typed message
     */
    function tryAsMessage(bytes29 _view) internal pure returns (bytes29) {
        uint256 _len = _view.len();
        if (
            _len == TOKEN_ID_LEN + TRANSFER_LEN ||
            _len == TOKEN_ID_LEN + DETAILS_LEN
        ) {
            return _view.castTo(uint40(Types.Message));
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

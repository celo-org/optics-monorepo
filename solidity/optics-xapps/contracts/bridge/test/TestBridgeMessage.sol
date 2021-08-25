// SPDX-License-Identifier: MIT OR Apache-2.0
pragma solidity >=0.6.11;

import "../BridgeMessage.sol";

// ============ External Imports ============
import {TypedMemView} from "@summa-tx/memview-sol/contracts/TypedMemView.sol";

contract TestBridgeMessage {
    using BridgeMessage for bytes29;

    using TypedMemView for bytes;
    using TypedMemView for bytes29;

    uint256 private constant TOKEN_ID_LEN = 36; // 4 bytes domain + 32 bytes id

    function getMessageType(bytes memory _message)
        internal
        view
        returns (uint40)
    {
        return uint40(uint8(_message[TOKEN_ID_LEN]));
    }

    function testIsValidAction(bytes memory _action, BridgeMessage.Types _t)
        external
        view
        returns (bool)
    {
        return BridgeMessage.isValidAction(_action.ref(uint40(_t)));
    }

    function testIsValidMessageLength(bytes memory _message)
        external
        view
        returns (bool)
    {
        uint40 _t = getMessageType(_message);
        return BridgeMessage.isValidMessageLength(_message.ref(_t));
    }

    function testFormatMessage(
        bytes memory _tokenId,
        bytes memory _action,
        BridgeMessage.Types _idType,
        BridgeMessage.Types _actionType
    ) external view returns (bytes memory) {
        bytes29 tokenId = _tokenId.ref(uint40(_idType));
        bytes29 action = _action.ref(uint40(_actionType));
        return BridgeMessage.formatMessage(tokenId, action);
    }

    function testMessageType(bytes memory _message)
        external
        view
        returns (BridgeMessage.Types)
    {
        uint40 _t = getMessageType(_message);
        return BridgeMessage.messageType(_message.ref(_t));
    }

    function testIsTransfer(bytes memory _action) external pure returns (bool) {
        bytes29 action = _action.ref(uint40(BridgeMessage.Types.Transfer));
        return BridgeMessage.isTransfer(action);
    }

    function testIsDetails(bytes memory _action) external pure returns (bool) {
        bytes29 action = _action.ref(uint40(BridgeMessage.Types.Details));
        return BridgeMessage.isDetails(action);
    }

    function testIsRequestDetails(bytes memory _action)
        external
        pure
        returns (bool)
    {
        bytes29 action = _action.ref(
            uint40(BridgeMessage.Types.RequestDetails)
        );
        return BridgeMessage.isRequestDetails(action);
    }

    function testFormatTransfer(bytes32 _to, uint256 _amnt)
        external
        view
        returns (bytes memory)
    {
        return BridgeMessage.formatTransfer(_to, _amnt).clone();
    }

    function testFormatDetails(
        bytes32 _name,
        bytes32 _symbol,
        uint8 _decimals
    ) external view returns (bytes memory) {
        return BridgeMessage.formatDetails(_name, _symbol, _decimals).clone();
    }

    function testFormatRequestDetails() external view returns (bytes memory) {
        return BridgeMessage.formatRequestDetails().clone();
    }

    function testFormatTokenId(uint32 _domain, bytes32 _id)
        external
        view
        returns (bytes memory)
    {
        return BridgeMessage.formatTokenId(_domain, _id).clone();
    }

    function testSplitTokenId(bytes memory _tokenId)
        external
        view
        returns (
            uint32,
            bytes32,
            address
        )
    {
        bytes29 tokenId = _tokenId.ref(uint40(BridgeMessage.Types.TokenId));
        uint32 domain = BridgeMessage.domain(tokenId);
        bytes32 id = BridgeMessage.id(tokenId);
        address evmId = BridgeMessage.evmId(tokenId);
        return (domain, id, evmId);
    }

    function testSplitTransfer(bytes memory _transfer)
        external
        view
        returns (
            uint8,
            bytes32,
            address,
            uint256
        )
    {
        bytes29 transfer = _transfer.ref(uint40(BridgeMessage.Types.Transfer));
        uint8 t = BridgeMessage.actionType(transfer);
        bytes32 recipient = BridgeMessage.recipient(transfer);
        address evmRecipient = BridgeMessage.evmRecipient(transfer);
        uint256 amnt = BridgeMessage.amnt(transfer);
        return (t, recipient, evmRecipient, amnt);
    }

    function testSplitDetails(bytes memory _details)
        external
        view
        returns (
            uint8,
            bytes32,
            bytes32,
            uint8
        )
    {
        bytes29 details = _details.ref(uint40(BridgeMessage.Types.Details));
        uint8 t = BridgeMessage.actionType(details);
        bytes32 name = BridgeMessage.name(details);
        bytes32 symbol = BridgeMessage.symbol(details);
        uint8 decimals = BridgeMessage.decimals(details);
        return (t, name, symbol, decimals);
    }

    function testSplitMessage(bytes memory _message)
        external
        view
        returns (bytes memory, bytes memory)
    {
        bytes29 message = _message.ref(uint40(BridgeMessage.Types.Message));
        bytes29 tokenId = BridgeMessage.tokenId(message);
        bytes29 action = BridgeMessage.action(message);
        return (tokenId.clone(), action.clone());
    }

    function testMustBeTransfer(bytes memory _transfer)
        external
        view
        returns (bytes memory)
    {
        bytes29 transfer = _transfer.ref(uint40(BridgeMessage.Types.Transfer));
        return BridgeMessage.mustBeTransfer(transfer).clone();
    }

    function testMustBeDetails(bytes memory _details)
        external
        view
        returns (bytes memory)
    {
        bytes29 details = _details.ref(uint40(BridgeMessage.Types.Details));
        return BridgeMessage.mustBeDetails(details).clone();
    }

    function testMustBeRequestDetails(bytes memory _request)
        external
        view
        returns (bytes memory)
    {
        bytes29 request = _request.ref(
            uint40(BridgeMessage.Types.RequestDetails)
        );
        return BridgeMessage.mustBeRequestDetails(request).clone();
    }

    function testMustBeTokenId(bytes memory _tokenId)
        external
        view
        returns (bytes memory)
    {
        bytes29 tokenId = _tokenId.ref(uint40(BridgeMessage.Types.TokenId));
        return BridgeMessage.mustBeTokenId(tokenId).clone();
    }

    function testMustBeMessage(bytes memory _message)
        external
        view
        returns (bytes memory)
    {
        bytes29 message = _message.ref(uint40(BridgeMessage.Types.Message));
        return BridgeMessage.mustBeMessage(message).clone();
    }
}

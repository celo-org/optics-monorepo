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
    uint256 private constant IDENTIFIER_LEN = 1;
    uint256 private constant TRANSFER_LEN = 65; // 1 byte identifier + 32 bytes recipient + 32 bytes amount
    uint256 private constant DETAILS_LEN = 66; // 1 byte identifier + 32 bytes name + 32 bytes symbol + 1 byte decimals
    uint256 private constant REQUEST_DETAILS_LEN = 1; // 1 byte identifier

    /**
     * @notice Asserts a message is of type `_t`
     * @param _view The message
     * @param _t The expected type
     */
    modifier typeAssert(bytes29 _view, BridgeMessage.Types _t) {
        _view.assertType(uint40(_t));
        _;
    }

    function testIsValidAction(bytes29 _action) external pure returns (bool) {
        // return
        //     isDetails(_action) ||
        //     isRequestDetails(_action) ||
        //     isTransfer(_action);
        return BridgeMessage.isValidAction(_action);
    }

    function testIsValidMessageLength(bytes29 _view)
        external
        pure
        returns (bool)
    {
        // uint256 _len = _view.len();
        // return
        //     _len == TOKEN_ID_LEN + TRANSFER_LEN ||
        //     _len == TOKEN_ID_LEN + DETAILS_LEN ||
        //     _len == TOKEN_ID_LEN + REQUEST_DETAILS_LEN;
        return BridgeMessage.isValidMessageLength(_view);
    }

    function testFormatMessage(bytes29 _tokenId, bytes29 _action)
        external
        view
        typeAssert(_tokenId, BridgeMessage.Types.TokenId)
        returns (bytes memory)
    {
        // require(isValidAction(_action), "!action");
        // bytes29[] memory _views = new bytes29[](2);
        // _views[0] = _tokenId;
        // _views[1] = _action;
        // return TypedMemView.join(_views);
        return BridgeMessage.formatMessage(_tokenId, _action);
    }

    function testMessageType(bytes29 _view)
        external
        pure
        returns (BridgeMessage.Types)
    {
        // return Types(uint8(_view.typeOf()));
        return BridgeMessage.messageType(_view);
    }

    function testIsTransfer(bytes29 _action) external pure returns (bool) {
        // return
        //     actionType(_action) == uint8(Types.Transfer) &&
        //     messageType(_action) == Types.Transfer;
        return BridgeMessage.isTransfer(_action);
    }

    function testIsDetails(bytes29 _action) external pure returns (bool) {
        // return
        //     actionType(_action) == uint8(Types.Details) &&
        //     messageType(_action) == Types.Details;
        return BridgeMessage.isDetails(_action);
    }

    function testIsRequestDetails(bytes29 _action)
        external
        pure
        returns (bool)
    {
        // return
        //     actionType(_action) == uint8(Types.RequestDetails) &&
        //     messageType(_action) == Types.RequestDetails;
        return BridgeMessage.isRequestDetails(_action);
    }

    function testFormatTransfer(bytes32 _to, uint256 _amnt)
        external
        pure
        returns (bytes29)
    {
        // return
        //     mustBeTransfer(abi.encodePacked(Types.Transfer, _to, _amnt).ref(0));
        return BridgeMessage.formatTransfer(_to, _amnt);
    }

    function testFormatDetails(
        bytes32 _name,
        bytes32 _symbol,
        uint8 _decimals
    ) external pure returns (bytes29) {
        // return
        //     mustBeDetails(
        //         abi.encodePacked(Types.Details, _name, _symbol, _decimals).ref(
        //             0
        //         )
        //     );
        return BridgeMessage.formatDetails(_name, _symbol, _decimals);
    }

    function testFormatRequestDetails() external pure returns (bytes29) {
        // return
        //     mustBeRequestDetails(abi.encodePacked(Types.RequestDetails).ref(0));
        return BridgeMessage.formatRequestDetails();
    }

    function testFormatTokenId(uint32 _domain, bytes32 _id)
        external
        pure
        returns (bytes29)
    {
        // return mustBeTokenId(abi.encodePacked(_domain, _id).ref(0));
        return BridgeMessage.formatTokenId(_domain, _id);
    }

    function testDomain(bytes29 _tokenId)
        external
        pure
        typeAssert(_tokenId, BridgeMessage.Types.TokenId)
        returns (uint32)
    {
        // return uint32(_tokenId.indexUint(0, 4));
        return BridgeMessage.domain(_tokenId);
    }

    function testId(bytes29 _tokenId)
        external
        pure
        typeAssert(_tokenId, BridgeMessage.Types.TokenId)
        returns (bytes32)
    {
        // // before = 4 bytes domain
        // return _tokenId.index(4, 32);
        return BridgeMessage.id(_tokenId);
    }

    function testEvmId(bytes29 _tokenId)
        external
        pure
        typeAssert(_tokenId, BridgeMessage.Types.TokenId)
        returns (address)
    {
        // // before = 4 bytes domain + 12 bytes empty to trim for address
        // return _tokenId.indexAddress(16);
        return BridgeMessage.evmId(_tokenId);
    }

    function testMsgType(bytes29 _message) external pure returns (uint8) {
        // return uint8(_message.indexUint(TOKEN_ID_LEN, 1));
        return BridgeMessage.msgType(_message);
    }

    function testActionType(bytes29 _action) external pure returns (uint8) {
        // return uint8(_action.indexUint(0, 1));
        return BridgeMessage.actionType(_action);
    }

    function testRecipient(bytes29 _transferAction)
        external
        pure
        typeAssert(_transferAction, BridgeMessage.Types.Transfer)
        returns (bytes32)
    {
        // // before = 1 byte identifier
        // return _transferAction.index(1, 32);
        return BridgeMessage.recipient(_transferAction);
    }

    function testEvmRecipient(bytes29 _transferAction)
        external
        pure
        typeAssert(_transferAction, BridgeMessage.Types.Transfer)
        returns (address)
    {
        // // before = 1 byte identifier + 12 bytes empty to trim for address
        // return _transferAction.indexAddress(13);
        return BridgeMessage.evmRecipient(_transferAction);
    }

    function testAmnt(bytes29 _transferAction)
        external
        pure
        typeAssert(_transferAction, BridgeMessage.Types.Transfer)
        returns (uint256)
    {
        // // before = 1 byte identifier + 32 bytes ID
        // return _transferAction.indexUint(33, 32);
        return BridgeMessage.amnt(_transferAction);
    }

    function testName(bytes29 _detailsAction)
        external
        pure
        typeAssert(_detailsAction, BridgeMessage.Types.Details)
        returns (bytes32)
    {
        // // before = 1 byte identifier
        // return _detailsAction.index(1, 32);
        return BridgeMessage.name(_detailsAction);
    }

    function testSymbol(bytes29 _detailsAction)
        external
        pure
        typeAssert(_detailsAction, BridgeMessage.Types.Details)
        returns (bytes32)
    {
        // // before = 1 byte identifier + 32 bytes name
        // return _detailsAction.index(33, 32);
        return BridgeMessage.symbol(_detailsAction);
    }

    function testDecimals(bytes29 _detailsAction)
        external
        pure
        typeAssert(_detailsAction, BridgeMessage.Types.Details)
        returns (uint8)
    {
        // // before = 1 byte identifier + 32 bytes name + 32 bytes symbol
        // return uint8(_detailsAction.indexUint(65, 1));
        return BridgeMessage.decimals(_detailsAction);
    }

    function testTokenId(bytes29 _message)
        external
        pure
        typeAssert(_message, BridgeMessage.Types.Message)
        returns (bytes29)
    {
        // return _message.slice(0, TOKEN_ID_LEN, uint40(Types.TokenId));
        return BridgeMessage.tokenId(_message);
    }

    function testAction(bytes29 _message)
        external
        pure
        typeAssert(_message, BridgeMessage.Types.Message)
        returns (bytes29)
    {
        // uint256 _actionLen = _message.len() - TOKEN_ID_LEN;
        // uint40 _type = uint40(msgType(_message));
        // return _message.slice(TOKEN_ID_LEN, _actionLen, _type);
        return BridgeMessage.action(_message);
    }

    function testTryAsTransfer(bytes29 _action)
        external
        pure
        returns (bytes29)
    {
        // if (_action.len() == TRANSFER_LEN) {
        //     return _action.castTo(uint40(Types.Transfer));
        // }
        // return TypedMemView.nullView();
        return BridgeMessage.tryAsTransfer(_action);
    }

    function testTryAsDetails(bytes29 _action) external pure returns (bytes29) {
        // if (_action.len() == DETAILS_LEN) {
        //     return _action.castTo(uint40(Types.Details));
        // }
        // return TypedMemView.nullView();
        return BridgeMessage.tryAsDetails(_action);
    }

    function testTryAsRequestDetails(bytes29 _action)
        external
        pure
        returns (bytes29)
    {
        // if (_action.len() == REQUEST_DETAILS_LEN) {
        //     return _action.castTo(uint40(Types.RequestDetails));
        // }
        // return TypedMemView.nullView();
        return BridgeMessage.tryAsRequestDetails(_action);
    }

    function testTryAsTokenId(bytes29 _tokenId)
        external
        pure
        returns (bytes29)
    {
        // if (_tokenId.len() == TOKEN_ID_LEN) {
        //     return _tokenId.castTo(uint40(Types.TokenId));
        // }
        // return TypedMemView.nullView();
        return BridgeMessage.tryAsTokenId(_tokenId);
    }

    function testTryAsMessage(bytes29 _message)
        external
        pure
        returns (bytes29)
    {
        // if (isValidMessageLength(_message)) {
        //     return _message.castTo(uint40(Types.Message));
        // }
        // return TypedMemView.nullView();
        return BridgeMessage.tryAsMessage(_message);
    }

    function testMustBeTransfer(bytes29 _view) external pure returns (bytes29) {
        // return tryAsTransfer(_view).assertValid();
        return BridgeMessage.mustBeTransfer(_view);
    }

    function testMustBeDetails(bytes29 _view) external pure returns (bytes29) {
        // return tryAsDetails(_view).assertValid();
        return BridgeMessage.mustBeDetails(_view);
    }

    function testMustBeRequestDetails(bytes29 _view)
        external
        pure
        returns (bytes29)
    {
        // return tryAsRequestDetails(_view).assertValid();
        return BridgeMessage.mustBeRequestDetails(_view);
    }

    function testMustBeTokenId(bytes29 _view) external pure returns (bytes29) {
        // return tryAsTokenId(_view).assertValid();
        return BridgeMessage.mustBeTokenId(_view);
    }

    function testMustBeMessage(bytes29 _view) external pure returns (bytes29) {
        // return tryAsMessage(_view).assertValid();
        return BridgeMessage.mustBeMessage(_view);
    }
}

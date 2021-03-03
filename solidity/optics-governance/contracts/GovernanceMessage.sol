// SPDX-License-Identifier: MIT OR Apache-2.0
pragma solidity >=0.6.11;

import "@summa-tx/memview-sol/contracts/TypedMemView.sol";

library GovernanceMessage {
    using TypedMemView for bytes;
    using TypedMemView for bytes29;

    uint256 private constant MIN_CALL_LEN = 33;
    uint256 private constant GOV_ACTION_LEN = 37;

    enum Types {
        Invalid,        // 0
        Call,           // 1
        TransferOwner,  // 2
        EnrollRouter    // 3
    }

    modifier typeAssert(bytes29 _view, Types _t) {
        _view.assertType(uint40(_t));
        _;
    }

    function messageType(bytes29 _view) internal pure returns (Types) {
        return Types(uint8(_view.typeOf()));
    }

    /*
        Message fields
    */

    // All Types
    function identifier(bytes29 _view)
        internal
        pure
        returns (uint8)
    {
        return uint8(_view.index(0, 1));
    }

    // All Types
    function addr(bytes29 _view)
        internal
        pure
        returns (bytes32)
    {
        return _view.index(1, 32);
    }

    // Types.Call only
    function data(bytes29 _view)
        internal
        pure
        returns (bytes29)
    {
        return _view.slice(33, _view.len() - 33);
    }

    // Types.TransferOwner & Types.EnrollRemote
    function domain(bytes29 _view)
        internal
        pure
        returns (uint32)
    {
        return uint32(_view.index(33, 4));
    }


    /*
        Message Type: CALL

        struct Call {
            identifier, // message ID -- 1 byte
            addr,       // address to call -- 32 bytes
            data        // call data -- 0+ bytes (length unknown)
        }
    */

    function isCall(bytes29 _view) internal pure returns (bool) {
        return identifier(_view) == uint8(Types.Call) && _view.len() >= MIN_CALL_LEN;
    }

    function isTypedCall(bytes29 _view) internal pure returns (bool) {
        return messageType(_view) == Types.Call && isCall(_view);
    }

    function tryAsCall(bytes29 _view) internal pure returns (bytes29) {
        if (isCall(_view)) {
            return _view.castTo(uint40(Types.Call));
        }
        return TypedMemView.nullView();
    }

    function mustBeCall(bytes29 _view) internal pure returns (bytes29) {
        return tryAsCall(_view).assertValid();
    }

    function formatCall(bytes32 _to, bytes memory _data)
        internal
        pure
        returns (bytes29)
    {
        return mustBeCall(abi.encodePacked(Types.Call, _to, _data).ref(0));
    }

    /*
        Message Type: TRANSFER OWNER

        struct TransferOwner {
            identifier, // message ID -- 1 byte
            addr,       // address of new owner -- 32 bytes
            domain      // domain of new owner -- 4 bytes
        }
    */

    function isTransferOwner(bytes29 _view) internal pure returns (bool) {
        return identifier(_view) == uint8(Types.TransferOwner) && _view.len() == GOV_ACTION_LEN;
    }

    function isTypedTransferOwner(bytes29 _view) internal pure returns (bool) {
        return messageType(_view) == Types.TransferOwner && isTransferOwner(_view);
    }

    function tryAsTransferOwner(bytes29 _view) internal pure returns (bytes29) {
        if (isTransferOwner(_view)) {
            return _view.castTo(uint40(Types.TransferOwner));
        }
        return TypedMemView.nullView();
    }

    function mustBeTransferOwner(bytes29 _view) internal pure returns (bytes29) {
        return tryAsTransferOwner(_view).assertValid();
    }

    function formatTransferOwner(bytes32 _owner, uint32 _domain)
        internal
        pure
        returns (bytes29)
    {
        return mustBeTransferOwner(abi.encodePacked(Types.TransferOwner, _owner, _domain).ref(0));
    }

    /*
        Message Type: ENROLL ROUTER

        struct EnrollRouter {
            identifier, // message ID -- 1 byte
            addr,       // address of new router -- 32 bytes
            domain      // domain of new router -- 4 bytes
        }
    */

    function isEnrollRouter(bytes29 _view) internal pure returns (bool) {
        return identifier(_view) == uint8(Types.EnrollRouter) && _view.len() == GOV_ACTION_LEN;
    }

    function isTypedEnrollRouter(bytes29 _view) internal pure returns (bool) {
        return messageType(_view) == Types.EnrollRouter && isEnrollRouter(_view);
    }

    function tryAsEnrollRouter(bytes29 _view) internal pure returns (bytes29) {
        if (isEnrollRouter(_view)) {
            return _view.castTo(uint40(Types.EnrollRouter));
        }
        return TypedMemView.nullView();
    }

    function mustBeEnrollRouter(bytes29 _view) internal pure returns (bytes29) {
        return tryAsEnrollRouter(_view).assertValid();
    }

    function formatEnrollRouter(bytes32 _router, uint32 _domain)
        internal
        pure
        returns (bytes29)
    {
        return mustBeEnrollRouter(abi.encodePacked(Types.EnrollRouter, _router, _domain).ref(0));
    }
}

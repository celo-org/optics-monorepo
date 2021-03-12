// SPDX-License-Identifier: MIT OR Apache-2.0
pragma solidity >=0.6.11;

import "@summa-tx/memview-sol/contracts/TypedMemView.sol";

library GovernanceMessage {
    using TypedMemView for bytes;
    using TypedMemView for bytes29;

    uint256 private constant MIN_CALL_LEN = 33;
    uint256 private constant GOV_ACTION_LEN = 37;

    enum Types {
        Invalid, // 0
        Call, // 1
        TransferGovernor, // 2
        EnrollRouter, // 3
        Data // 4
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
    function identifier(bytes29 _view) internal pure returns (uint8) {
        return uint8(_view.indexUint(0, 1));
    }

    // Types.Call
    function addr(bytes29 _view) internal pure returns (bytes32) {
        return _view.index(1, 32);
    }

    // Types.Call
    function data(bytes29 _view) internal view returns (bytes memory _data) {
        _data = TypedMemView.clone(
            _view.slice(33, _view.len() - 33, uint40(Types.Data))
        );
    }

    // Types.TransferGovernor & Types.EnrollRemote
    function domain(bytes29 _view) internal pure returns (uint32) {
        return uint32(_view.indexUint(1, 4));
    }

    // Types.EnrollRemote
    function router(bytes29 _view) internal pure returns (bytes32) {
        return _view.index(5, 32);
    }

    // Types.TransferGovernor
    function governor(bytes29 _view) internal pure returns (bytes32) {
        return _view.index(5, 32);
    }

    /*
        Message Type: CALL

        struct Call {
            identifier, // message ID -- 1 byte
            addr,       // address to call -- 32 bytes
            data        // call data -- 0+ bytes (length unknown)
        }
    */

    function isValidCall(bytes29 _view) internal pure returns (bool) {
        return
            identifier(_view) == uint8(Types.Call) &&
            _view.len() >= MIN_CALL_LEN;
    }

    function isCall(bytes29 _view) internal pure returns (bool) {
        return isValidCall(_view) && messageType(_view) == Types.Call;
    }

    function tryAsCall(bytes29 _view) internal pure returns (bytes29) {
        if (isValidCall(_view)) {
            return _view.castTo(uint40(Types.Call));
        }
        return TypedMemView.nullView();
    }

    function mustBeCall(bytes29 _view) internal pure returns (bytes29) {
        return tryAsCall(_view).assertValid();
    }

    function formatCall(bytes32 _to, bytes memory _data)
        internal
        view
        returns (bytes memory _msg)
    {
        _msg = TypedMemView.clone(
            mustBeCall(abi.encodePacked(Types.Call, _to, _data).ref(0))
        );
    }

    /*
        Message Type: TRANSFER GOVERNOR

        struct TransferGovernor {
            identifier, // message ID -- 1 byte
            domain,     // domain of new governor -- 4 bytes
            addr        // address of new governor -- 32 bytes
        }
    */

    function isValidTransferGovernor(bytes29 _view)
        internal
        pure
        returns (bool)
    {
        return
            identifier(_view) == uint8(Types.TransferGovernor) &&
            _view.len() == GOV_ACTION_LEN;
    }

    function isTransferGovernor(bytes29 _view) internal pure returns (bool) {
        return
            isValidTransferGovernor(_view) &&
            messageType(_view) == Types.TransferGovernor;
    }

    function tryAsTransferGovernor(bytes29 _view)
        internal
        pure
        returns (bytes29)
    {
        if (isValidTransferGovernor(_view)) {
            return _view.castTo(uint40(Types.TransferGovernor));
        }
        return TypedMemView.nullView();
    }

    function mustBeTransferGovernor(bytes29 _view)
        internal
        pure
        returns (bytes29)
    {
        return tryAsTransferGovernor(_view).assertValid();
    }

    function formatTransferGovernor(uint32 _domain, bytes32 _governor)
        internal
        view
        returns (bytes memory _msg)
    {
        _msg = TypedMemView.clone(
            mustBeTransferGovernor(
                abi
                    .encodePacked(Types.TransferGovernor, _domain, _governor)
                    .ref(0)
            )
        );
    }

    /*
        Message Type: ENROLL ROUTER

        struct EnrollRouter {
            identifier, // message ID -- 1 byte
            domain,     // domain of new router -- 4 bytes
            addr        // address of new router -- 32 bytes
        }
    */

    function isValidEnrollRouter(bytes29 _view) internal pure returns (bool) {
        return
            identifier(_view) == uint8(Types.EnrollRouter) &&
            _view.len() == GOV_ACTION_LEN;
    }

    function isEnrollRouter(bytes29 _view) internal pure returns (bool) {
        return
            isValidEnrollRouter(_view) &&
            messageType(_view) == Types.EnrollRouter;
    }

    function tryAsEnrollRouter(bytes29 _view) internal pure returns (bytes29) {
        if (isValidEnrollRouter(_view)) {
            return _view.castTo(uint40(Types.EnrollRouter));
        }
        return TypedMemView.nullView();
    }

    function mustBeEnrollRouter(bytes29 _view) internal pure returns (bytes29) {
        return tryAsEnrollRouter(_view).assertValid();
    }

    function formatEnrollRouter(uint32 _domain, bytes32 _router)
        internal
        view
        returns (bytes memory _msg)
    {
        _msg = TypedMemView.clone(
            mustBeEnrollRouter(
                abi.encodePacked(Types.EnrollRouter, _domain, _router).ref(0)
            )
        );
    }
}

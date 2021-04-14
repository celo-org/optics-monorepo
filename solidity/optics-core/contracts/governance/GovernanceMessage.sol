// SPDX-License-Identifier: MIT OR Apache-2.0
pragma solidity >=0.6.11;

import "@summa-tx/memview-sol/contracts/TypedMemView.sol";

library GovernanceMessage {
    using TypedMemView for bytes;
    using TypedMemView for bytes29;

    uint256 private constant CALL_PREFIX_LEN = 64;
    uint256 private constant GOV_ACTION_LEN = 37;

    enum Types {
        Invalid, // 0
        Call, // 1
        TransferGovernor, // 2
        SetRouter, // 3
        Data // 4
    }

    struct Call {
        bytes32 to;
        bytes data;
    }

    modifier typeAssert(bytes29 _view, Types _t) {
        _view.assertType(uint40(_t));
        _;
    }

    // Types.Call
    function _data(bytes29 _view) internal view returns (bytes memory) {
        return
            TypedMemView.clone(
                _view.slice(
                    CALL_PREFIX_LEN,
                    _dataLen(_view),
                    uint40(Types.Data)
                )
            );
    }

    function _formatCalls(Call[] memory _calls)
        internal
        view
        returns (bytes memory _msg)
    {
        bytes29[] memory _encodedCalls = new bytes29[](_calls.length + 1);

        // Add Types.Call identifier
        _encodedCalls[0] = abi.encodePacked(Types.Call).ref(0);

        for (uint256 i = 0; i < _calls.length; i++) {
            Call memory _call = _calls[i];
            bytes29 _callMsg =
                abi.encodePacked(_call.to, _call.data.length, _call.data).ref(
                    0
                );

            _encodedCalls[i + 1] = _callMsg;
        }

        _msg = TypedMemView.join(_encodedCalls);
    }

    function _formatTransferGovernor(uint32 _newDomain, bytes32 _newGovernor)
        internal
        view
        returns (bytes memory _msg)
    {
        _msg = TypedMemView.clone(
            _mustBeTransferGovernor(
                abi
                    .encodePacked(
                    Types
                        .TransferGovernor,
                    _newDomain,
                    _newGovernor
                )
                    .ref(0)
            )
        );
    }

    /**
     * @param _d The domain
     * @param _r The router
     */
    function _formatSetRouter(uint32 _d, bytes32 _r)
        internal
        view
        returns (bytes memory _msg)
    {
        _msg = TypedMemView.clone(
            _mustBeSetRouter(abi.encodePacked(Types.SetRouter, _d, _r).ref(0))
        );
    }

    function _getCalls(bytes29 _msg)
        internal
        view
        returns (Call[] memory _calls)
    {
        // Skip 1 byte identifier
        bytes29 _msgPtr = _msg.slice(1, _msg.len() - 1, uint40(Types.Call));

        uint256 counter = 0;
        while (_msgPtr.len() > 0) {
            _calls[counter] = Call({to: _to(_msgPtr), data: _data(_msgPtr)});

            _msgPtr = _nextCall(_msgPtr);
            counter++;
        }
    }

    function _nextCall(bytes29 _view)
        internal
        pure
        typeAssert(_view, Types.Call)
        returns (bytes29)
    {
        uint256 lastCallLen = CALL_PREFIX_LEN + _dataLen(_view);
        return
            _view.slice(
                lastCallLen,
                _view.len() - lastCallLen,
                uint40(Types.Call)
            );
    }

    function _messageType(bytes29 _view) internal pure returns (Types) {
        return Types(uint8(_view.typeOf()));
    }

    /*
        Message fields
    */

    // All Types
    function _identifier(bytes29 _view) internal pure returns (uint8) {
        return uint8(_view.indexUint(0, 1));
    }

    // Types.Call
    function _to(bytes29 _view) internal pure returns (bytes32) {
        return _view.index(0, 32);
    }

    // Types.Call
    function _dataLen(bytes29 _view) internal pure returns (uint256) {
        return uint256(_view.index(32, 32));
    }

    // Types.TransferGovernor & Types.EnrollRemote
    function _domain(bytes29 _view) internal pure returns (uint32) {
        return uint32(_view.indexUint(1, 4));
    }

    // Types.EnrollRemote
    function _router(bytes29 _view) internal pure returns (bytes32) {
        return _view.index(5, 32);
    }

    // Types.TransferGovernor
    function _governor(bytes29 _view) internal pure returns (bytes32) {
        return _view.index(5, 32);
    }

    /*
        Message Type: CALL

        struct Call {
            addr,       // address to call -- 32 bytes
            dataLen,    // call data length -- 32 bytes,
            data        // call data -- 0+ bytes (length unknown)
        }
    */

    function _isValidCall(bytes29 _view) internal pure returns (bool) {
        return
            _identifier(_view) == uint8(Types.Call) &&
            _view.len() >= CALL_PREFIX_LEN;
    }

    function _isCall(bytes29 _view) internal pure returns (bool) {
        return _isValidCall(_view) && _messageType(_view) == Types.Call;
    }

    function _tryAsCall(bytes29 _view) internal pure returns (bytes29) {
        if (_isValidCall(_view)) {
            return _view.castTo(uint40(Types.Call));
        }
        return TypedMemView.nullView();
    }

    function _mustBeCalls(bytes29 _view) internal pure returns (bytes29) {
        return _tryAsCall(_view).assertValid();
    }

    /*
        Message Type: TRANSFER GOVERNOR

        struct TransferGovernor {
            identifier, // message ID -- 1 byte
            domain,     // domain of new governor -- 4 bytes
            addr        // address of new governor -- 32 bytes
        }
    */

    function _isValidTransferGovernor(bytes29 _view)
        internal
        pure
        returns (bool)
    {
        return
            _identifier(_view) == uint8(Types.TransferGovernor) &&
            _view.len() == GOV_ACTION_LEN;
    }

    function _isTransferGovernor(bytes29 _view) internal pure returns (bool) {
        return
            _isValidTransferGovernor(_view) &&
            _messageType(_view) == Types.TransferGovernor;
    }

    function _tryAsTransferGovernor(bytes29 _view)
        internal
        pure
        returns (bytes29)
    {
        if (_isValidTransferGovernor(_view)) {
            return _view.castTo(uint40(Types.TransferGovernor));
        }
        return TypedMemView.nullView();
    }

    function _mustBeTransferGovernor(bytes29 _view)
        internal
        pure
        returns (bytes29)
    {
        return _tryAsTransferGovernor(_view).assertValid();
    }

    /*
        Message Type: ENROLL ROUTER

        struct SetRouter {
            identifier, // message ID -- 1 byte
            domain,     // domain of new router -- 4 bytes
            addr        // address of new router -- 32 bytes
        }
    */

    function _isValidSetRouter(bytes29 _view) internal pure returns (bool) {
        return
            _identifier(_view) == uint8(Types.SetRouter) &&
            _view.len() == GOV_ACTION_LEN;
    }

    function _isSetRouter(bytes29 _view) internal pure returns (bool) {
        return
            _isValidSetRouter(_view) && _messageType(_view) == Types.SetRouter;
    }

    function _tryAsSetRouter(bytes29 _view) internal pure returns (bytes29) {
        if (_isValidSetRouter(_view)) {
            return _view.castTo(uint40(Types.SetRouter));
        }
        return TypedMemView.nullView();
    }

    function _mustBeSetRouter(bytes29 _view) internal pure returns (bytes29) {
        return _tryAsSetRouter(_view).assertValid();
    }
}

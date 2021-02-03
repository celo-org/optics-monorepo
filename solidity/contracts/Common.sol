// SPDX-License-Identifier: MIT OR Apache-2.0
pragma solidity >=0.6.11;

import "@openzeppelin/contracts/cryptography/ECDSA.sol";
import "@summa-tx/memview-sol/contracts/TypedMemView.sol";

library Message {
    using TypedMemView for bytes;
    using TypedMemView for bytes29;

    function formatMessage(
        uint32 _origin,
        bytes32 _sender,
        uint32 _sequence,
        uint32 _destination,
        bytes32 _recipient,
        bytes memory _body
    ) internal pure returns (bytes memory) {
        return
            abi.encodePacked(
                _origin,
                _sender,
                _sequence,
                _destination,
                _recipient,
                _body
            );
    }

    function messageHash(
        uint32 _origin,
        bytes32 _sender,
        uint32 _sequence,
        uint32 _destination,
        bytes32 _recipient,
        bytes memory _body
    ) internal pure returns (bytes32) {
        return
            keccak256(
                formatMessage(
                    _origin,
                    _sender,
                    _sequence,
                    _destination,
                    _recipient,
                    _body
                )
            );
    }

    function origin(bytes29 _message) internal pure returns (uint32) {
        return uint32(_message.indexUint(0, 4));
    }

    function sender(bytes29 _message) internal pure returns (bytes32) {
        return _message.index(4, 32);
    }

    function sequence(bytes29 _message) internal pure returns (uint32) {
        return uint32(_message.indexUint(32, 4));
    }

    function destination(bytes29 _message) internal pure returns (uint32) {
        return uint32(_message.indexUint(36, 4));
    }

    function recipient(bytes29 _message) internal pure returns (bytes32) {
        return _message.index(40, 32);
    }

    function recipientAddress(bytes29 _message)
        internal
        pure
        returns (address)
    {
        return address(uint160(uint256(recipient(_message))));
    }

    function body(bytes29 _message) internal pure returns (bytes29) {
        return _message.slice(72, _message.len() - 72, 0);
    }
}

abstract contract Common {
    enum States {ACTIVE, FAILED}

    uint32 public immutable originSLIP44;
    bytes32 public immutable DOMAIN_HASH;

    address public updater;
    States public state;
    bytes32 public current;

    event Update(
        uint32 indexed _originSLIP44,
        bytes32 indexed _oldRoot,
        bytes32 indexed _newRoot,
        bytes signature
    );
    event DoubleUpdate(
        bytes32[2] _oldRoot,
        bytes32[2] _newRoot,
        bytes _signature,
        bytes _signature2
    );

    constructor(
        uint32 _originSLIP44,
        address _updater,
        bytes32 _current
    ) {
        originSLIP44 = _originSLIP44;
        updater = _updater;
        current = _current;
        DOMAIN_HASH = keccak256(abi.encodePacked(_originSLIP44, "OPTICS"));
        state = States.ACTIVE;
    }

    function fail() internal virtual;

    function _setFailed() internal {
        state = States.FAILED;
    }

    modifier notFailed() {
        require(state != States.FAILED, "failed state");
        _;
    }

    function checkSig(
        bytes32 _oldRoot,
        bytes32 _newRoot,
        bytes memory _signature
    ) internal view returns (bool) {
        bytes32 _digest =
            keccak256(abi.encodePacked(DOMAIN_HASH, _oldRoot, _newRoot));
        _digest = ECDSA.toEthSignedMessageHash(_digest);
        return ECDSA.recover(_digest, _signature) == updater;
    }

    function doubleUpdate(
        bytes32[2] calldata _oldRoot,
        bytes32[2] calldata _newRoot,
        bytes calldata _signature,
        bytes calldata _signature2
    ) external notFailed {
        if (
            Common.checkSig(_oldRoot[0], _newRoot[0], _signature) &&
            Common.checkSig(_oldRoot[1], _newRoot[1], _signature2) &&
            (_oldRoot[0] == _oldRoot[1] && _newRoot[0] != _newRoot[1])
        ) {
            fail();
            emit DoubleUpdate(_oldRoot, _newRoot, _signature, _signature2);
        }
    }
}

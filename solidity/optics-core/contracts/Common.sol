// SPDX-License-Identifier: MIT OR Apache-2.0
pragma solidity >=0.6.11;

import "../libs/Message.sol";

import {Initializable} from "@openzeppelin/contracts/proxy/Initializable.sol";
import "@openzeppelin/contracts/cryptography/ECDSA.sol";

/**
 * @title Common
 * @author Celo Labs Inc.
 * @notice Shared utilities between Home and Replica.
 **/
abstract contract Common is Initializable {
    enum States {
        UNINITIALIZED,
        ACTIVE,
        FAILED
    }

    /// @notice Domain of owning contract
    uint32 public immutable localDomain;
    /// @notice Address of bonded updater
    address public updater;
    /// @notice Current state of contract
    States public state;
    /// @notice Current root
    bytes32 public current;

    /**
     * @notice Event emitted when update is made on Home or unconfirmed update
     * root is enqueued on Replica
     * @param homeDomain Domain of home contract
     * @param oldRoot Old merkle root
     * @param newRoot New merkle root
     * @param signature Updater's signature on `oldRoot` and `newRoot`
     **/
    event Update(
        uint32 indexed homeDomain,
        bytes32 indexed oldRoot,
        bytes32 indexed newRoot,
        bytes signature
    );

    /**
     * @notice Event emitted when valid double update proof is provided to
     * contract
     * @param oldRoot Old root shared between two conflicting updates
     * @param newRoot Array containing two conflicting new roots
     * @param signature Signature on `oldRoot` and `newRoot`[0]
     * @param signature2 Signature on `oldRoot` and `newRoot`[1]
     **/
    event DoubleUpdate(
        bytes32 oldRoot,
        bytes32[2] newRoot,
        bytes signature,
        bytes signature2
    );

    constructor(uint32 _localDomain) {
        localDomain = _localDomain;
    }

    function initialize(address _updater) internal initializer {
        updater = _updater;
        state = States.ACTIVE;
    }

    /// @notice Ensures that contract state != FAILED
    modifier notFailed() {
        require(state != States.FAILED, "failed state");
        _;
    }

    /**
     * @notice Called by external agent. Checks that signatures on two sets of
     * roots are valid and that the new roots conflict with each other. If both
     * cases hold true, the contract is failed and a `DoubleUpdate` event is
     * emitted.
     * @dev When `fail()` is called on Home, updater is slashed.
     * @param _oldRoot Old root shared between two conflicting updates
     * @param _newRoot Array containing two conflicting new roots
     * @param _signature Signature on `_oldRoot` and `_newRoot`[0]
     * @param _signature2 Signature on `_oldRoot` and `_newRoot`[1]
     **/
    function doubleUpdate(
        bytes32 _oldRoot,
        bytes32[2] calldata _newRoot,
        bytes calldata _signature,
        bytes calldata _signature2
    ) external notFailed {
        if (
            Common._isUpdaterSignature(_oldRoot, _newRoot[0], _signature) &&
            Common._isUpdaterSignature(_oldRoot, _newRoot[1], _signature2) &&
            _newRoot[0] != _newRoot[1]
        ) {
            _fail();
            emit DoubleUpdate(_oldRoot, _newRoot, _signature, _signature2);
        }
    }

    /// @notice Hash of Home domain concatenated with "OPTICS"
    function homeDomainHash() public view virtual returns (bytes32);

    /// @notice Hash of Home's domain concatenated with "OPTICS"
    function _homeDomainHash(uint32 homeDomain)
        internal
        pure
        returns (bytes32)
    {
        return keccak256(abi.encodePacked(homeDomain, "OPTICS"));
    }

    /// @notice Sets contract state to FAILED
    function _setFailed() internal {
        state = States.FAILED;
    }

    /// @notice Called when a double update or fraudulent update is detected
    function _fail() internal virtual;

    /**
     * @notice Called internally. Checks that signature is valid (belongs to
     * updater).
     * @param _oldRoot Old merkle root
     * @param _newRoot New merkle root
     * @param _signature Signature on `_oldRoot` and `_newRoot`
     * @return Returns true if signature is valid and false if otherwise
     **/
    function _isUpdaterSignature(
        bytes32 _oldRoot,
        bytes32 _newRoot,
        bytes memory _signature
    ) internal view returns (bool) {
        bytes32 _digest = keccak256(
            abi.encodePacked(homeDomainHash(), _oldRoot, _newRoot)
        );
        _digest = ECDSA.toEthSignedMessageHash(_digest);
        return (ECDSA.recover(_digest, _signature) == updater);
    }
}

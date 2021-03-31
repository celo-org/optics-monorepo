// SPDX-License-Identifier: MIT OR Apache-2.0
pragma solidity >=0.6.11;

import "./Home.sol";
import "./Replica.sol";

import "@openzeppelin/contracts/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@summa-tx/memview-sol/contracts/TypedMemView.sol";

abstract contract UsingOptics is Ownable {
    mapping(address => uint32) public replicaToDomain;
    mapping(uint32 => address) public domainToReplica;
    Home public home;

    mapping(address => mapping(uint32 => bool)) watcherPermissions;

    // solhint-disable-next-line no-empty-blocks
    constructor() Ownable() {}

    function isOwner(address _owner) public view returns (bool) {
        return _owner == owner();
    }

    modifier onlyReplica() {
        require(isReplica(msg.sender), "!replica");
        _;
    }

    function isReplica(address _replica) public view returns (bool) {
        return replicaToDomain[_replica] != 0;
    }

    function ownerEnrollReplica(address _replica, uint32 _domain)
        public
        onlyOwner
    {
        unenrollReplica(_replica);
        replicaToDomain[_replica] = _domain;
        domainToReplica[_domain] = _replica;
    }

    function ownerUnenrollReplica(address _replica) public onlyOwner {
        unenrollReplica(_replica);
    }

    function unenrollReplica(address _replica) internal {
        uint32 _currentDomain = replicaToDomain[_replica];
        domainToReplica[_currentDomain] = address(0);
        replicaToDomain[_replica] = 0;
    }

    function setHome(address _home) public onlyOwner {
        home = Home(_home);
    }

    function setWatcherPermission(
        address _watcher,
        uint32 _domain,
        bool _access
    ) public onlyOwner {
        watcherPermissions[_watcher][_domain] = _access;
    }

    function originDomain() public view returns (uint32) {
        return home.originDomain();
    }

    function enqueueHome(
        uint32 _destination,
        bytes32 _recipient,
        bytes memory _body
    ) public {
        home.enqueue(_destination, _recipient, _body);
    }

    function checkWatcherSig(
        address _watcher,
        uint32 _domain,
        address _updater,
        bytes memory _signature
    ) internal view returns (bool) {
        require(watcherPermissions[_watcher][_domain], "!watcher permission");

        address _replica = domainToReplica[_domain];
        bytes32 _replicaDomainHash = Replica(_replica).domainHash();

        bytes32 _digest =
            keccak256(abi.encodePacked(_replicaDomainHash, _domain, _updater));
        _digest = ECDSA.toEthSignedMessageHash(_digest);
        return ECDSA.recover(_digest, _signature) == _watcher;
    }

    function unenrollReplica(
        address _watcher,
        uint32 _domain,
        address _updater,
        bytes memory _signature
    ) external {
        address _replica = domainToReplica[_domain];
        if (
            _replica != address(0) &&
            Replica(_replica).updater() == _updater &&
            checkWatcherSig(_watcher, _domain, _updater, _signature)
        ) {
            unenrollReplica(_replica);
        }
    }
}

library TypeCasts {
    using TypedMemView for bytes;
    using TypedMemView for bytes29;

    function coerceBytes32(string memory _s)
        internal
        pure
        returns (bytes32 _b)
    {
        _b = bytes(_s).ref(0).index(0, uint8(bytes(_s).length));
    }

    // treat it as a null-terminated string of max 32 bytes
    function coerceString(bytes32 _buf)
        internal
        pure
        returns (string memory _newStr)
    {
        uint8 _slen = 0;
        while (_slen < 32 && _buf[_slen] != 0) {
            _slen++;
        }

        // solhint-disable-next-line no-inline-assembly
        assembly {
            _newStr := mload(0x40)
            mstore(0x40, add(_newStr, 0x40)) // may end up with extra
            mstore(_newStr, _slen)
            mstore(add(_newStr, 0x20), _buf)
        }
    }

    // alignment preserving cast
    function addressToBytes32(address _addr) internal pure returns (bytes32) {
        return bytes32(uint256(uint160(_addr)));
    }

    // alignment preserving cast
    function bytes32ToAddress(bytes32 _buf) internal pure returns (address) {
        return address(uint160(uint256(_buf)));
    }
}

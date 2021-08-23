// SPDX-License-Identifier: MIT OR Apache-2.0
pragma solidity >=0.6.11;

// ============ Internal Imports ============
import {Home} from "./Home.sol";
import {Replica} from "./Replica.sol";
import {TypeCasts} from "../libs/TypeCasts.sol";
// ============ External Imports ============
import {ECDSA} from "@openzeppelin/contracts/cryptography/ECDSA.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract XAppConnectionManager is Ownable {
    mapping(address => uint32) public replicaToDomain;
    mapping(uint32 => address) public domainToReplica;

    Home public home;

    // watcher address => replica remote domain => has/doesn't have permission
    mapping(address => mapping(uint32 => bool)) private watcherPermissions;

    event ReplicaEnrolled(uint32 indexed domain, address replica);

    event ReplicaUnenrolled(uint32 indexed domain, address replica);

    event WatcherPermissionSet(
        uint32 indexed domain,
        address watcher,
        bool access
    );

    // solhint-disable-next-line no-empty-blocks
    constructor() Ownable() {}

    modifier onlyReplica() {
        require(isReplica(msg.sender), "!replica");
        _;
    }

    function unenrollReplica(
        uint32 _domain,
        bytes32 _updater,
        bytes memory _signature
    ) external {
        address _replica = domainToReplica[_domain];
        require(_replica != address(0), "!replica exists");

        require(
            Replica(_replica).updater() == TypeCasts.bytes32ToAddress(_updater),
            "!current updater"
        );

        address _watcher = _recoverWatcherFromSig(
            _domain,
            TypeCasts.addressToBytes32(_replica),
            _updater,
            _signature
        );
        require(watcherPermissions[_watcher][_domain], "!valid watcher");

        _unenrollReplica(_replica);
    }

    function setHome(address _home) public onlyOwner {
        home = Home(_home);
    }

    function ownerEnrollReplica(address _replica, uint32 _domain)
        public
        onlyOwner
    {
        _unenrollReplica(_replica);
        replicaToDomain[_replica] = _domain;
        domainToReplica[_domain] = _replica;

        emit ReplicaEnrolled(_domain, _replica);
    }

    function ownerUnenrollReplica(address _replica) public onlyOwner {
        _unenrollReplica(_replica);
    }

    function setWatcherPermission(
        address _watcher,
        uint32 _domain,
        bool _access
    ) public onlyOwner {
        watcherPermissions[_watcher][_domain] = _access;
        emit WatcherPermissionSet(_domain, _watcher, _access);
    }

    function localDomain() public view returns (uint32) {
        return home.localDomain();
    }

    function isOwner(address _owner) public view returns (bool) {
        return _owner == owner();
    }

    function isReplica(address _replica) public view returns (bool) {
        return replicaToDomain[_replica] != 0;
    }

    function watcherPermission(address _watcher, uint32 _domain)
        public
        view
        returns (bool)
    {
        return watcherPermissions[_watcher][_domain];
    }

    function _unenrollReplica(address _replica) internal {
        uint32 _currentDomain = replicaToDomain[_replica];
        domainToReplica[_currentDomain] = address(0);
        replicaToDomain[_replica] = 0;

        emit ReplicaUnenrolled(_currentDomain, _replica);
    }

    function _recoverWatcherFromSig(
        uint32 _domain,
        bytes32 _replica,
        bytes32 _updater,
        bytes memory _signature
    ) internal view returns (address) {
        bytes32 _homeDomainHash = Replica(TypeCasts.bytes32ToAddress(_replica))
            .homeDomainHash();

        bytes32 _digest = keccak256(
            abi.encodePacked(_homeDomainHash, _domain, _updater)
        );
        _digest = ECDSA.toEthSignedMessageHash(_digest);
        return ECDSA.recover(_digest, _signature);
    }
}

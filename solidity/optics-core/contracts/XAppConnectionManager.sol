// SPDX-License-Identifier: MIT OR Apache-2.0
pragma solidity >=0.6.11;

import "./Home.sol";
import "./Replica.sol";
import "../libs/TypeCasts.sol";

import "@openzeppelin/contracts/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract XAppConnectionManager is Ownable {
    mapping(address => uint32) public replicaToDomain;
    mapping(uint32 => address) public domainToReplica;

    Home public home;

    // watcher address => replica domain => has/doesn't have permission
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
        address _updater,
        bytes memory _signature
    ) external {
        address _replica = domainToReplica[_domain];
        require(_replica != address(0), "!replica exists");
        require(Replica(_replica).updater() == _updater, "!current updater");

        address _watcher =
            recoverWatcherFromSig(_domain, _replica, _updater, _signature);
        require(watcherPermissions[_watcher][_domain], "!valid watcher");

        unenrollReplica(_replica);
    }

    function ownerEnrollReplica(address _replica, uint32 _domain)
        public
        onlyOwner
    {
        unenrollReplica(_replica);
        replicaToDomain[_replica] = _domain;
        domainToReplica[_domain] = _replica;

        emit ReplicaEnrolled(_domain, _replica);
    }

    function ownerUnenrollReplica(address _replica) public onlyOwner {
        unenrollReplica(_replica);
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
        emit WatcherPermissionSet(_domain, _watcher, _access);
    }

    function isOwner(address _owner) public view returns (bool) {
        return _owner == owner();
    }

    function isReplica(address _replica) public view returns (bool) {
        return replicaToDomain[_replica] != 0;
    }

    function localDomain() public view returns (uint32) {
        return home.localDomain();
    }

    function watcherPermission(address _watcher, uint32 _domain)
        public
        view
        returns (bool)
    {
        return watcherPermissions[_watcher][_domain];
    }

    function unenrollReplica(address _replica) internal {
        uint32 _currentDomain = replicaToDomain[_replica];
        domainToReplica[_currentDomain] = address(0);
        replicaToDomain[_replica] = 0;

        emit ReplicaUnenrolled(_currentDomain, _replica);
    }

    function recoverWatcherFromSig(
        uint32 _domain,
        address _replica,
        address _updater,
        bytes memory _signature
    ) internal view returns (address) {
        bytes32 _replicaDomainHash = Replica(_replica).domainHash();

        bytes32 _digest =
            keccak256(abi.encodePacked(_replicaDomainHash, _domain, _updater));
        _digest = ECDSA.toEthSignedMessageHash(_digest);
        return ECDSA.recover(_digest, _signature);
    }
}

// SPDX-License-Identifier: MIT OR Apache-2.0
pragma solidity >=0.6.11;

import "./Home.sol";

import "@openzeppelin/contracts/access/Ownable.sol";
import "@summa-tx/memview-sol/contracts/TypedMemView.sol";

interface OpticsHandlerI {
    function handle(
        uint32 origin,
        bytes32 sender,
        bytes memory message
    ) external returns (bytes memory);
}

abstract contract UsingOptics is Ownable {
    using TypedMemView for bytes;
    using TypedMemView for bytes29;

    mapping(address => uint32) public replicas;
    Home home;

    constructor() Ownable() {}

    function isReplica(address _replica) internal view returns (bool) {
        return replicas[_replica] != 0;
    }

    function enrollReplica(uint32 _domain, address _replica) public onlyOwner {
        replicas[_replica] = _domain;
    }

    function unenrollReplica(address _replica) public onlyOwner {
        replicas[_replica] = 0;
    }

    function setHome(address _home) public onlyOwner {
        home = Home(_home);
    }

    modifier onlyReplica() {
        require(isReplica(msg.sender), "!replica");
        _;
    }

    function coerceBytes32(string memory _s)
        internal
        pure
        returns (bytes32 _b)
    {
        _b = bytes(_s).ref(0).index(0, uint8(bytes(_s).length));
    }

    function addressToBytes32(address _addr) internal pure returns (bytes32) {
        return bytes32(uint256(uint160(_addr)));
    }
}

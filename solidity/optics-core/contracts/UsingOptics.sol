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

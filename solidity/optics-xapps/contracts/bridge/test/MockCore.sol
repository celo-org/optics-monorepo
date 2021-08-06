// SPDX-License-Identifier: MIT OR Apache-2.0
pragma solidity >=0.6.11;

contract MockCore {
    event Enqueue(
        uint32 indexed _destination,
        bytes32 indexed _recipient,
        bytes _body
    );

    function localDomain() external pure returns (uint32) {
        return 5;
    }

    function home() external view returns (address) {
        return address(this);
    }

    function enqueue(
        uint32 _destination,
        bytes32 _recipient,
        bytes calldata _body
    ) external {
        emit Enqueue(_destination, _recipient, _body);
    }

    function isReplica(address) public pure returns (bool) {
        return true;
    }
}

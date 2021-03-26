// SPDX-License-Identifier: MIT OR Apache-2.0
pragma solidity >=0.6.11;

import "../Common.sol";

contract TestCommon is Common {
    constructor(uint32 _originDomain) Common(_originDomain) {} // solhint-disable-line no-empty-blocks

    function testCheckSig(
        bytes32 _oldRoot,
        bytes32 _newRoot,
        bytes memory _signature
    ) external view returns (bool) {
        return checkSig(_oldRoot, _newRoot, _signature);
    }

    function fail() internal override {
        _setFailed();
    }

    function testDomainHash(uint32 _originDomain)
        external
        pure
        returns (bytes32)
    {
        return keccak256(abi.encodePacked(_originDomain, "OPTICS"));
    }
}

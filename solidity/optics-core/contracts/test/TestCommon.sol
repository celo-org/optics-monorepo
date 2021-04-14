// SPDX-License-Identifier: MIT OR Apache-2.0
pragma solidity >=0.6.11;

import "../Common.sol";

contract TestCommon is Common {
    function setUpdater(address _updater) external {
        updater = _updater;
    }

    function testCheckSig(
        bytes32 _oldRoot,
        bytes32 _newRoot,
        bytes memory _signature
    ) external view returns (bool) {
        return _isUpdaterSignature(_oldRoot, _newRoot, _signature);
    }

    function testDomainHash(uint32 _remoteDomain)
        external
        pure
        returns (bytes32)
    {
        return keccak256(abi.encodePacked(_remoteDomain, "OPTICS"));
    }

    function _fail() internal override {
        _setFailed();
    }
}

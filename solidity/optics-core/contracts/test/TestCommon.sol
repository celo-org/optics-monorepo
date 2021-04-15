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
    ) external returns (bool) {
        return checkSig(_oldRoot, _newRoot, _signature);
    }

    function testHomeDomainHash() external payable returns (bytes32) {
        return homeDomainHash();
    }

    /// @notice Hash of `localDomain` concatenated with "OPTICS"
    function homeDomainHash() public payable override returns (bytes32) {
        return keccak256(abi.encodePacked(localDomain, "OPTICS"));
    }

    function _fail() internal override {
        _setFailed();
    }
}

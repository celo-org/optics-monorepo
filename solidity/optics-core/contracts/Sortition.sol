// SPDX-License-Identifier: MIT OR Apache-2.0
pragma solidity >=0.6.11;

interface ISortition {
    function current() external view returns (address);

    function slash(address payable _reporter) external;
}

// Simple contract for managing update selection
// TODO: make this inherit from common, then have home inherit from it?
// Or keep external for easier upgrading?
contract NoSortition is ISortition {
    address internal updater;
    uint256 internal constant BOND_SIZE = 50 ether;

    constructor(address _updater) payable {
        require(msg.value >= BOND_SIZE, "insufficient bond");
        updater = _updater;
    }

    function current() external view override returns (address) {
        return updater;
    }

    function slash(address payable _reporter) external override {
        // TODO: caller gate this
        _reporter.transfer(address(this).balance / 2);
    }
}

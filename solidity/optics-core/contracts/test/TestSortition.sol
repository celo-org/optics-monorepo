// SPDX-License-Identifier: MIT OR Apache-2.0
pragma solidity >=0.6.11;

import "@openzeppelin/contracts/access/Ownable.sol";
import {SortitionI} from "../../interfaces/SortitionI.sol";

contract TestSortition is SortitionI, Ownable {
    address internal updater;
    address internal home;

    event Slashed();

    constructor(address _updater) payable {
        updater = _updater;
    }

    function setHome(address _home) external {
        home = _home;
    }

    function setUpdater(address _updater) external {
        updater = _updater;
    }

    function current() external view override returns (address) {
        return updater;
    }

    // solhint-disable-next-line no-unused-vars
    function slash(address payable _reporter) external override {
        require(msg.sender == home, "!home");
        emit Slashed();
    }
}

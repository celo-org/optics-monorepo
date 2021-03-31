// SPDX-License-Identifier: MIT OR Apache-2.0
pragma solidity >=0.6.11;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract UpdaterManager is Ownable {
    /// @notice Address of bonded updater
    address public updater;
    address internal home;

    event Slashed();

    constructor(address _updater, address _home) payable {
        this.setUpdater(_updater);
        this.setHome(_home);
    }

    // TODO: think about visibility;
    function setHome(address _home) external onlyOwner {
        home = _home;
    }

    function setUpdater(address _updater) external onlyOwner {
        updater = _updater;
    }

    function currentUpdater() external view returns (address) {
        return updater;
    }

    // solhint-disable-next-line no-unused-vars
    function slash(address payable _reporter) external {
        require(msg.sender == home, "!home");
        emit Slashed();
    }
}

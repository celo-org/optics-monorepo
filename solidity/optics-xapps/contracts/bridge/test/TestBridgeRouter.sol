// SPDX-License-Identifier: MIT OR Apache-2.0
pragma solidity >=0.6.11;

import {BridgeRouter} from "../BridgeRouter.sol";

contract TestBridgeRouter is BridgeRouter {
    function getRemoteRouter(uint32 _domain) external view returns (bytes32) {
        return remotes[_domain];
    }
}

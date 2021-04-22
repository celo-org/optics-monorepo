// SPDX-License-Identifier: MIT OR Apache-2.0
pragma solidity >=0.6.11;
pragma experimental ABIEncoderV2;

import "../governance/GovernanceRouter.sol";

contract TestGovernanceRouter is GovernanceRouter {
    constructor(uint32 _localDomain) GovernanceRouter(_localDomain) {} // solhint-disable-line no-empty-blocks

    function testSetRouter(uint32 _domain, bytes32 _router) external {
        _setRouter(_domain, _router); // set the router locally

        bytes memory _setRouterMessage =
            GovernanceMessage.formatSetRouter(_domain, _router);

        _sendToAllRemoteRouters(_setRouterMessage);
    }

    function domainsContains(uint32 _domain) external view returns (bool) {
        for (uint256 i = 0; i < domains.length; i++) {
            if (domains[i] == _domain) return true;
        }

        return false;
    }
}

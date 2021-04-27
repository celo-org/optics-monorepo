// SPDX-License-Identifier: MIT OR Apache-2.0
pragma solidity >=0.6.11;
pragma experimental ABIEncoderV2;

import "../governance/GovernanceRouter.sol";
import {TypeCasts} from "../XAppConnectionManager.sol";

contract TestGovernanceRouter is GovernanceRouter {
    constructor(uint32 _localDomain) GovernanceRouter(_localDomain) {} // solhint-disable-line no-empty-blocks

    function setRouterAddress(uint32 _domain, address _router) external {
        _setRouter(_domain, TypeCasts.addressToBytes32(_router));
    }
}

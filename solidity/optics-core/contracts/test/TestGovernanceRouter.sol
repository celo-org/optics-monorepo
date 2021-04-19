// SPDX-License-Identifier: MIT OR Apache-2.0
pragma solidity >=0.6.11;
pragma experimental ABIEncoderV2;

import "../governance/GovernanceRouter.sol";

contract TestGovernanceRouter is GovernanceRouter {
    constructor(uint32 _localDomain) GovernanceRouter(_localDomain) {} // solhint-disable-line no-empty-blocks
}

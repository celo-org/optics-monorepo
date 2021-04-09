// SPDX-License-Identifier: MIT OR Apache-2.0
pragma solidity >=0.6.11;

import "../XAppConnectionManager.sol";

contract TestXAppConnectionManager is XAppConnectionManager {
    constructor() XAppConnectionManager() {} // solhint-disable-line no-empty-blocks

    function testRecoverWatcherFromSig(
        uint32 _domain,
        address _replica,
        address _updater,
        bytes memory _signature
    ) external view returns (address) {
        return recoverWatcherFromSig(_domain, _replica, _updater, _signature);
    }
}

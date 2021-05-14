// SPDX-License-Identifier: MIT OR Apache-2.0
pragma solidity >=0.6.11;
pragma experimental ABIEncoderV2;

import "../governance/GovernanceRouter.sol";
import {TypeCasts} from "../XAppConnectionManager.sol";

contract TestGovernanceRouter is GovernanceRouter {
    using TypedMemView for bytes;
    using TypedMemView for bytes29;
    using GovernanceMessage for bytes29;

    constructor(uint32 _localDomain) GovernanceRouter(_localDomain) {} // solhint-disable-line no-empty-blocks

    function testSetRouter(uint32 _domain, bytes32 _router) external {
        _setRouter(_domain, _router); // set the router locally

        bytes memory _setRouterMessage =
            GovernanceMessage.formatSetRouter(_domain, _router);

        _sendToAllRemoteRouters(_setRouterMessage);
    }

    function setRouterAddress(uint32 _domain, address _router) external {
        _setRouter(_domain, TypeCasts.addressToBytes32(_router));
    }

    function containsDomain(uint32 _domain) external view returns (bool) {
        for (uint256 i = 0; i < domains.length; i++) {
            if (domains[i] == _domain) return true;
        }

        return false;
    }

    function getCallDataLen(bytes memory _message)
        external
        pure
        returns (uint256)
    {
        bytes29 _msg = _message.ref(0);
        bytes29 _msgPtr =
            _msg.slice(1, _msg.len() - 1, uint40(GovernanceMessage.Types.Call));
        return GovernanceMessage.dataLen(_msgPtr);
    }
}

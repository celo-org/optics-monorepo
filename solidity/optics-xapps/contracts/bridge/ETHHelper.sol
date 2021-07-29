// SPDX-License-Identifier: MIT OR Apache-2.0
pragma solidity >=0.6.11;

import {BridgeRouter} from "./BridgeRouter.sol";

import {TypeCasts} from "@celo-org/optics-sol/contracts/XAppConnectionManager.sol";

interface WETH {
    function deposit() external payable;

    function approve(address _who, uint256 _wad) external;
}

contract ETHHelper {
    WETH immutable weth;
    BridgeRouter immutable bridge;

    constructor(address _weth, address _bridge) {
        weth = WETH(_weth);
        bridge = BridgeRouter(_bridge);
        WETH(_weth).approve(_bridge, uint256(-1));
    }

    function send(uint32 _domain) external payable {
        weth.deposit{value: msg.value}();
        bridge.send(
            address(weth),
            msg.value,
            _domain,
            TypeCasts.addressToBytes32(msg.sender)
        );
    }

    function sendTo(uint32 _domain, address _to) external payable {
        weth.deposit{value: msg.value}();
        bridge.send(
            address(weth),
            msg.value,
            _domain,
            TypeCasts.addressToBytes32(_to)
        );
    }
}

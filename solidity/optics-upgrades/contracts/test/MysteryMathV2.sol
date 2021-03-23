// SPDX-License-Identifier: MIT

pragma solidity >=0.6.11;

import "./MysteryMath.sol";

contract MysteryMathV2 is MysteryMath {
    function version() external pure override returns (uint256 _version) {
        return 2;
    }

    function doMath(uint256 a, uint256 b)
        external
        pure
        override
        returns (uint256 _result)
    {
        _result = a * b;
    }
}

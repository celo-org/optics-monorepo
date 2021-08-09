// SPDX-License-Identifier: MIT OR Apache-2.0
pragma solidity >=0.6.11;

interface IBridgeToken {
    function initialize() external;

    function name() external returns (string memory);

    function balanceOf(address _account) external view returns (uint256);

    function symbol() external view returns (string memory);

    function decimals() external view returns (uint8);

    function burn(address _from, uint256 _amnt) external;

    function mint(address _to, uint256 _amnt) external;

    function setDetails(
        string calldata _name,
        string calldata _symbol,
        uint8 _decimals
    ) external;
}

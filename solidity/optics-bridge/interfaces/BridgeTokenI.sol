// SPDX-License-Identifier: MIT OR Apache-2.0
pragma solidity >=0.6.11;

interface BridgeTokenI {
    function name() external returns (string memory);

    function symbol() external returns (string memory);

    function decimals() external returns (uint8);

    function burn(address from, uint256 amnt) external;

    function mint(address to, uint256 amnt) external;

    function setDetails(
        bytes32 _name,
        bytes32 _symbol,
        uint8 _decimals
    ) external;
}

// SPDX-License-Identifier: MIT OR Apache-2.0
pragma solidity >=0.6.11;

interface SortitionI {
    function current() external view returns (address);

    function slash(address payable _reporter) external;
}

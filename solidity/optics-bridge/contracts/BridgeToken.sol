// SPDX-License-Identifier: MIT OR Apache-2.0
pragma solidity >=0.6.11;

import {ERC20} from "./OZERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {
    TypeCasts
} from "@celo-org/optics-sol/contracts/XAppConnectionManager.sol";
import {BridgeTokenI} from "../interfaces/BridgeTokenI.sol";

contract BridgeToken is BridgeTokenI, Ownable, ERC20 {
    /**
     * @dev Returns the name of the token.
     */
    function name() public view override returns (string memory) {
        return _name;
    }

    /**
     * @dev Returns the symbol of the token, usually a shorter version of the
     * name.
     */
    function symbol() public view override returns (string memory) {
        return _symbol;
    }

    /**
     * @dev Returns the number of decimals used to get its user representation.
     * For example, if `decimals` equals `2`, a balance of `505` tokens should
     * be displayed to a user as `5,05` (`505 / 10 ** 2`).
     *
     * Tokens usually opt for a value of 18, imitating the relationship between
     * Ether and Wei. This is the value {ERC20} uses, unless {_setupDecimals} is
     * called.
     *
     * NOTE: This information is only used for _display_ purposes: it in
     * no way affects any of the arithmetic of the contract, including
     * {IERC20-balanceOf} and {IERC20-transfer}.
     */
    function decimals() public view override returns (uint8) {
        return _decimals;
    }

    function burn(address from, uint256 amnt) external override onlyOwner {
        _burn(from, amnt);
    }

    function mint(address to, uint256 amnt) external override onlyOwner {
        _mint(to, amnt);
    }

    function setDetails(
        bytes32 _newName,
        bytes32 _newSymbol,
        uint8 _newDecimals
    ) external override onlyOwner {
        // careful with naming convention change here
        _name = TypeCasts.coerceString(_newName);
        _symbol = TypeCasts.coerceString(_newSymbol);
        _decimals = _newDecimals;
    }
}

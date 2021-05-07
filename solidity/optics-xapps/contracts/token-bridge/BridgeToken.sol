// SPDX-License-Identifier: MIT OR Apache-2.0
pragma solidity >=0.6.11;

import {ERC20} from "./OZERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {
    TypeCasts
} from "@celo-org/optics-sol/contracts/XAppConnectionManager.sol";
import {IBridgeToken} from "../../interfaces/token-bridge/IBridgeToken.sol";

contract BridgeToken is IBridgeToken, Ownable, ERC20 {
    function burn(address _from, uint256 _amnt) external override onlyOwner {
        _burn(_from, _amnt);
    }

    function mint(address _to, uint256 _amnt) external override onlyOwner {
        _mint(_to, _amnt);
    }

    function setDetails(
        bytes32 _newName,
        bytes32 _newSymbol,
        uint8 _newDecimals
    ) external override onlyOwner {
        // careful with naming convention change here
        token.name = TypeCasts.coerceString(_newName);
        token.symbol = TypeCasts.coerceString(_newSymbol);
        token.decimals = _newDecimals;
    }

    /**
     * @dev Returns the name of the token.
     */
    function name() public view override returns (string memory) {
        return token.name;
    }

    /**
     * @dev Returns the symbol of the token, usually a shorter version of the
     * name.
     */
    function symbol() public view override returns (string memory) {
        return token.symbol;
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
        return token.decimals;
    }
}

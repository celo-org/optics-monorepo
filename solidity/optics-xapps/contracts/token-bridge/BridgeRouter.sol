// SPDX-License-Identifier: MIT OR Apache-2.0
pragma solidity >=0.6.11;

import {BridgeMessage} from "./BridgeMessage.sol";
import {TokenRegistry} from "./TokenRegistry.sol";
import {BridgeToken} from "./BridgeToken.sol";
import {IBridgeToken} from "../../interfaces/token-bridge/IBridgeToken.sol";

import {Home} from "@celo-org/optics-sol/contracts/Home.sol";
import {
    TypeCasts
} from "@celo-org/optics-sol/contracts/XAppConnectionManager.sol";
import {
    IMessageRecipient
} from "@celo-org/optics-sol/interfaces/IMessageRecipient.sol";

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {TypedMemView} from "@summa-tx/memview-sol/contracts/TypedMemView.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import {Router} from "../Router.sol";

contract BridgeRouter is Router, TokenRegistry {
    using TypedMemView for bytes;
    using TypedMemView for bytes29;
    using BridgeMessage for bytes29;
    using SafeERC20 for IERC20;

    constructor(address _xAppConnectionManager)
        TokenRegistry(_xAppConnectionManager)
    {} // solhint-disable-line no-empty-blocks

    /**
     * @notice Handles an incoming message
     * @param _origin The origin domain
     * @param _sender The sender address
     * @param _message The message
     */
    function handle(
        uint32 _origin,
        bytes32 _sender,
        bytes memory _message
    ) external override onlyReplica onlyRemoteRouter(_origin, _sender) {
        bytes29 _msg = _message.ref(0).mustBeMessage();
        bytes29 _tokenId = _msg.tokenId();
        bytes29 _action = _msg.action();
        if (_action.isTransfer()) {
            _handleTransfer(_tokenId, _action);
        } else if (_action.isDetails()) {
            _handleDetails(_tokenId, _action);
        } else {
            require(false, "!action");
        }
    }

    /**
     * @notice Sends a Transfer message.
     * 1. If the token is native, it holds the amount in the
     *    contract. Otherwise the token is a representational
     *    asset, and is burned.
     * 2. Formats new Transfer message and enqueues it to home.
     * @param _token The token address
     * @param _destination The destination domain
     * @param _recipient The recipient address
     * @param _amnt The amount
     */
    function send(
        address _token,
        uint32 _destination,
        bytes32 _recipient,
        uint256 _amnt
    ) external {
        bytes32 _remote = _mustHaveRemote(_destination);
        IERC20 _bridgeToken = IERC20(_token);

        if (_isNative(_bridgeToken)) {
            _bridgeToken.safeTransferFrom(msg.sender, address(this), _amnt);
        } else {
            _downcast(_bridgeToken).burn(msg.sender, _amnt);
        }

        TokenId memory _tokId = _tokenIdFor(_token);
        bytes29 _tokenId =
            BridgeMessage.formatTokenId(_tokId.domain, _tokId.id);
        bytes29 _action = BridgeMessage.formatTransfer(_recipient, _amnt);

        Home(xAppConnectionManager.home()).enqueue(
            _destination,
            _remote,
            BridgeMessage.formatMessage(_tokenId, _action)
        );
    }

    /**
     * @notice Sends a Details message.
     * @param _token The token address
     * @param _destination The destination domain
     */
    function updateDetails(address _token, uint32 _destination) external {
        bytes32 _remote = _mustHaveRemote(_destination);
        IBridgeToken _bridgeToken = IBridgeToken(_token);

        TokenId memory _tokId = _tokenIdFor(_token);
        bytes29 _tokenId =
            BridgeMessage.formatTokenId(_tokId.domain, _tokId.id);

        bytes29 _action =
            BridgeMessage.formatDetails(
                TypeCasts.coerceBytes32(_bridgeToken.name()),
                TypeCasts.coerceBytes32(_bridgeToken.symbol()),
                _bridgeToken.decimals()
            );

        Home(xAppConnectionManager.home()).enqueue(
            _destination,
            _remote,
            BridgeMessage.formatMessage(_tokenId, _action)
        );
    }

    /**
     * @notice Handles an incoming Transfer message.
     *
     * If the token is native, the amount is unlocked. Otherwise, a
     * representational (non-native) token is minted.
     *
     * @param _tokenId The token ID
     * @param _action The action
     */
    function _handleTransfer(bytes29 _tokenId, bytes29 _action)
        internal
        typeAssert(_tokenId, BridgeMessage.Types.TokenId)
        typeAssert(_action, BridgeMessage.Types.Transfer)
    {
        IERC20 _token = _ensureToken(_tokenId);

        if (_isNative(_token)) {
            _token.safeTransfer(_action.evmRecipient(), _action.amnt());
        } else {
            _downcast(_token).mint(_action.evmRecipient(), _action.amnt());
        }
    }

    /**
     * @notice Handles an incoming Details message.
     * @param _tokenId The token ID
     * @param _action The action
     */
    function _handleDetails(bytes29 _tokenId, bytes29 _action)
        internal
        typeAssert(_tokenId, BridgeMessage.Types.TokenId)
        typeAssert(_action, BridgeMessage.Types.Details)
    {
        IERC20 _token = _ensureToken(_tokenId);
        require(!_isNative(_token), "!repr");

        _downcast(_token).setDetails(
            _action.name(),
            _action.symbol(),
            _action.decimals()
        );
    }
}

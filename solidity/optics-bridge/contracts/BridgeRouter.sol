// SPDX-License-Identifier: MIT OR Apache-2.0
pragma solidity >=0.6.11;

import {BridgeMessage} from "./BridgeMessage.sol";
import {TokenRegistry} from "./TokenRegistry.sol";
import {BridgeToken} from "./BridgeToken.sol";
import {IBridgeToken} from "../interfaces/IBridgeToken.sol";

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

contract BridgeRouter is IMessageRecipient, TokenRegistry {
    using TypedMemView for bytes;
    using TypedMemView for bytes29;
    using BridgeMessage for bytes29;
    using SafeERC20 for IERC20;

    mapping(uint32 => bytes32) internal remotes;

    constructor(address _xAppConnectionManager)
        TokenRegistry(_xAppConnectionManager)
    {} // solhint-disable-line no-empty-blocks

    modifier onlyRemoteRouter(uint32 _origin, bytes32 _router) {
        require(_isRemoteRouter(_origin, _router), "Not a remote router");
        _;
    }

    function enrollRemote(uint32 _origin, bytes32 _router) external onlyOwner {
        remotes[_origin] = _router;
    }

    function handle(
        uint32 _origin,
        bytes32 _sender,
        bytes memory _message
    )
        external
        override
        onlyReplica
        onlyRemoteRouter(_origin, _sender)
        returns (bytes memory)
    {
        bytes29 _msg = _message.ref(0).mustBeMessage();
        bytes29 _tokenId = _msg.tokenId();
        bytes29 _action = _msg.action();
        if (_action.isTransfer()) {
            return _handleTransfer(_tokenId, _action);
        }
        if (_action.isDetails()) {
            return _handleDetails(_tokenId, _action);
        }
        require(false, "!action");
        return hex"";
    }

    function send(
        address _token,
        uint32 _destination,
        bytes32 _recipient,
        uint256 _amnt
    ) external {
        bytes32 remote = _mustHaveRemote(_destination);
        IERC20 tok = IERC20(_token);

        if (_isNative(tok)) {
            tok.safeTransferFrom(msg.sender, address(this), _amnt);
        } else {
            _downcast(tok).burn(msg.sender, _amnt);
        }

        TokenId memory _tokId = _tokenIdFor(_token);
        bytes29 _tokenId =
            BridgeMessage.formatTokenId(_tokId.domain, _tokId.id);
        bytes29 _action = BridgeMessage.formatTransfer(_recipient, _amnt);

        Home(xAppConnectionManager.home()).enqueue(
            _destination,
            remote,
            BridgeMessage.formatMessage(_tokenId, _action)
        );
    }

    function updateDetails(address _token, uint32 _destination) external {
        bytes32 remote = _mustHaveRemote(_destination);
        IBridgeToken tok = IBridgeToken(_token);

        TokenId memory _tokId = _tokenIdFor(_token);
        bytes29 _tokenId =
            BridgeMessage.formatTokenId(_tokId.domain, _tokId.id);

        bytes29 _action =
            BridgeMessage.formatDetails(
                TypeCasts.coerceBytes32(tok.name()),
                TypeCasts.coerceBytes32(tok.symbol()),
                tok.decimals()
            );

        Home(xAppConnectionManager.home()).enqueue(
            _destination,
            remote,
            BridgeMessage.formatMessage(_tokenId, _action)
        );
    }

    function _handleTransfer(bytes29 _tokenId, bytes29 _action)
        internal
        typeAssert(_tokenId, BridgeMessage.Types.TokenId)
        typeAssert(_action, BridgeMessage.Types.Transfer)
        returns (bytes memory)
    {
        IERC20 token = _ensureToken(_tokenId);

        if (_isNative(token)) {
            token.safeTransfer(_action.evmRecipient(), _action.amnt());
        } else {
            _downcast(token).mint(_action.evmRecipient(), _action.amnt());
        }

        return hex"";
    }

    function _handleDetails(bytes29 _tokenId, bytes29 _action)
        internal
        typeAssert(_tokenId, BridgeMessage.Types.TokenId)
        typeAssert(_action, BridgeMessage.Types.Details)
        returns (bytes memory)
    {
        IERC20 token = _ensureToken(_tokenId);
        require(!_isNative(token), "!repr");

        _downcast(token).setDetails(
            _action.name(),
            _action.symbol(),
            _action.decimals()
        );

        return hex"";
    }

    function _mustHaveRemote(uint32 _domain)
        internal
        view
        returns (bytes32 _remote)
    {
        _remote = remotes[_domain];
        require(_remote != bytes32(0), "!remote");
    }

    function _isRemoteRouter(uint32 _origin, bytes32 _router)
        internal
        view
        returns (bool)
    {
        return remotes[_origin] == _router;
    }
}

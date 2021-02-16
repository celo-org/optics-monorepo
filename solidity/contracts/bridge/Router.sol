// SPDX-License-Identifier: MIT OR Apache-2.0
pragma solidity >=0.6.11;

import {BridgeMessage} from "./Types.sol";
import {TokenRegistry} from "./TokenRegistry.sol";
import {BridgeTokenI, BridgeToken} from "./BridgeToken.sol";

import {TypeCasts, OpticsHandlerI} from "../UsingOptics.sol";

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {TypedMemView} from "@summa-tx/memview-sol/contracts/TypedMemView.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";

contract BridgeRouter is OpticsHandlerI, TokenRegistry {
    using TypedMemView for bytes;
    using TypedMemView for bytes29;
    using BridgeMessage for bytes29;
    using SafeERC20 for IERC20;

    mapping(uint32 => bytes32) internal remotes;

    constructor() TokenRegistry() {}

    function enrollRemote(uint32 _origin, bytes32 _router) external onlyOwner {
        remotes[_origin] = _router;
    }

    function mustGetRemote(uint32 _domain)
        internal
        view
        returns (bytes32 _remote)
    {
        _remote = remotes[_domain];
        require(_remote != bytes32(0), "!remote");
    }

    function isRemoteRouter(uint32 _origin, bytes32 _router)
        internal
        view
        returns (bool)
    {
        return remotes[_origin] == _router;
    }

    modifier onlyRemoteRouter(uint32 _origin, bytes32 _router) {
        require(isRemoteRouter(_origin, _router));
        _;
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
        if (_action.isXfer()) {
            return handleXfer(_tokenId, _action);
        }
        if (_action.isDetails()) {
            return handleDetails(_tokenId, _action);
        }
        require(false, "!action");
        return hex"";
    }

    function handleXfer(bytes29 _tokenId, bytes29 _action)
        internal
        typeAssert(_tokenId, BridgeMessage.Types.TokenId)
        typeAssert(_action, BridgeMessage.Types.Xfer)
        returns (bytes memory)
    {
        IERC20 _token = ensureToken(_tokenId);

        if (isNative(_token)) {
            _token.safeTransfer(_action.evmRecipient(), _action.amnt());
        } else {
            downcast(_token).mint(_action.evmRecipient(), _action.amnt());
        }

        return hex"";
    }

    function handleDetails(bytes29 _tokenId, bytes29 _action)
        internal
        typeAssert(_tokenId, BridgeMessage.Types.TokenId)
        typeAssert(_action, BridgeMessage.Types.Details)
        returns (bytes memory)
    {
        IERC20 _token = ensureToken(_tokenId);
        require(!isNative(_token), "!repr");

        downcast(_token).setDetails(
            _action.name(),
            _action.symbol(),
            _action.decimals()
        );

        return hex"";
    }

    function send(
        address _token,
        uint32 _destination,
        bytes32 _recipient,
        uint256 _amnt
    ) external {
        IERC20 _tok = IERC20(_token);

        if (isNative(_tok)) {
            _tok.safeTransferFrom(msg.sender, address(this), _amnt);
        } else {
            downcast(_tok).burn(msg.sender, _amnt);
        }

        TokenId memory _tokId = tokenIdFor(_token);
        bytes29 _tokenId =
            BridgeMessage.formatTokenId(_tokId.domain, _tokId.id);
        bytes29 _action = BridgeMessage.formatXfer(_recipient, _amnt);

        home.enqueue(
            _destination,
            mustGetRemote(_destination),
            BridgeMessage.formatMessage(_tokenId, _action)
        );
    }

    function updateDetails(address _token, uint32 _destination) external {
        BridgeTokenI _tok = BridgeTokenI(_token);

        TokenId memory _tokId = tokenIdFor(_token);
        bytes29 _tokenId =
            BridgeMessage.formatTokenId(_tokId.domain, _tokId.id);

        bytes29 _action =
            BridgeMessage.formatDetails(
                TypeCasts.coerceBytes32(_tok.name()),
                TypeCasts.coerceBytes32(_tok.symbol()),
                _tok.decimals()
            );

        home.enqueue(
            _destination,
            mustGetRemote(_destination),
            BridgeMessage.formatMessage(_tokenId, _action)
        );
    }
}

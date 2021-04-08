// SPDX-License-Identifier: MIT OR Apache-2.0
pragma solidity >=0.6.11;

import {BridgeMessage} from "./BridgeMessage.sol";
import {TokenRegistry} from "./TokenRegistry.sol";
import {BridgeToken} from "./BridgeToken.sol";
import {BridgeTokenI} from "../interfaces/BridgeTokenI.sol";

import {TypeCasts} from "@celo-org/optics-sol/contracts/UsingOptics.sol";
import {
    MessageRecipientI
} from "@celo-org/optics-sol/interfaces/MessageRecipientI.sol";

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {TypedMemView} from "@summa-tx/memview-sol/contracts/TypedMemView.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";

contract BridgeRouter is MessageRecipientI, TokenRegistry {
    using TypedMemView for bytes;
    using TypedMemView for bytes29;
    using BridgeMessage for bytes29;
    using SafeERC20 for IERC20;

    mapping(uint32 => bytes32) internal remotes;

    // solhint-disable-next-line no-empty-blocks
    constructor(address _xAppConnectionManager)
        TokenRegistry(_xAppConnectionManager)
    {}

    function enrollRemote(uint32 _origin, bytes32 _router) external onlyOwner {
        remotes[_origin] = _router;
    }

    function mustHaveRemote(uint32 _domain)
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
        require(isRemoteRouter(_origin, _router), "Not a remote router");
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
        if (_action.isTransfer()) {
            return handleTransfer(_tokenId, _action);
        }
        if (_action.isDetails()) {
            return handleDetails(_tokenId, _action);
        }
        require(false, "!action");
        return hex"";
    }

    function handleTransfer(bytes29 _tokenId, bytes29 _action)
        internal
        typeAssert(_tokenId, BridgeMessage.Types.TokenId)
        typeAssert(_action, BridgeMessage.Types.Transfer)
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
        bytes32 _remote = mustHaveRemote(_destination);
        IERC20 _tok = IERC20(_token);

        if (isNative(_tok)) {
            _tok.safeTransferFrom(msg.sender, address(this), _amnt);
        } else {
            downcast(_tok).burn(msg.sender, _amnt);
        }

        TokenId memory _tokId = tokenIdFor(_token);
        bytes29 _tokenId =
            BridgeMessage.formatTokenId(_tokId.domain, _tokId.id);
        bytes29 _action = BridgeMessage.formatTransfer(_recipient, _amnt);

        xAppConnectionManager.enqueueHome(
            _destination,
            _remote,
            BridgeMessage.formatMessage(_tokenId, _action)
        );
    }

    function updateDetails(address _token, uint32 _destination) external {
        bytes32 _remote = mustHaveRemote(_destination);
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

        xAppConnectionManager.enqueueHome(
            _destination,
            _remote,
            BridgeMessage.formatMessage(_tokenId, _action)
        );
    }
}

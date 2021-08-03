// SPDX-License-Identifier: MIT OR Apache-2.0
pragma solidity >=0.6.11;

// ============ Internal Imports ============
import {TokenRegistry} from "./TokenRegistry.sol";
import {Router} from "../Router.sol";
import {IBridgeToken} from "../../interfaces/bridge/IBridgeToken.sol";
import {BridgeMessage} from "./BridgeMessage.sol";
// ============ External Imports ============
import {Home} from "@celo-org/optics-sol/contracts/Home.sol";
import {TypeCasts} from "@celo-org/optics-sol/contracts/XAppConnectionManager.sol";
import {TypedMemView} from "@summa-tx/memview-sol/contracts/TypedMemView.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";

/**
 * @title BridgeRouter
 */
contract BridgeRouter is Router, TokenRegistry {
    using TypedMemView for bytes;
    using TypedMemView for bytes29;
    using BridgeMessage for bytes29;
    using SafeERC20 for IERC20;

    /// @notice 5 bps (0.05%) hardcoded fee. Can be changed by contract upgrade
    uint256 public constant PRE_FILL_FEE_NUMERATOR = 9995;
    uint256 public constant PRE_FILL_FEE_DENOMINATOR = 10000;
    // ======== Events =========

    event Migrate(
        uint32 indexed domain,
        bytes32 indexed id,
        address indexed tokenHolder,
        uint256 balance,
        address oldToken,
        address newToken
    );

    /// @notice A mapping that stores the LP that pre-filled a token transfer
    mapping(bytes32 => address) public liquidityProvider;

    function initialize(address _xAppConnectionManager) public initializer {
        TokenRegistry._initialize(_xAppConnectionManager);
    }

    // ======== External: Handle =========

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
        // parse tokenId and action from message
        bytes29 _msg = _message.ref(0).mustBeMessage();
        bytes29 _tokenId = _msg.tokenId();
        bytes29 _action = _msg.action();
        // handle message based on the intended action
        if (_action.isTransfer()) {
            _handleTransfer(_tokenId, _action);
        } else if (_action.isDetails()) {
            _handleDetails(_tokenId, _action);
        } else {
            require(false, "!valid action");
        }
    }

    // ======== External: Send Token =========

    /**
     * @notice Send tokens to a recipient on a remote chain
     * @param _token The token address
     * @param _amnt The amount
     * @param _destination The destination domain
     * @param _recipient The recipient address
     */
    function send(
        address _token,
        uint256 _amnt,
        uint32 _destination,
        bytes32 _recipient
    ) external {
        // get remote BridgeRouter address; revert if not found
        bytes32 _remote = _mustHaveRemote(_destination);
        // remove tokens from circulation on this chain
        IERC20 _bridgeToken = IERC20(_token);
        if (_isLocalOrigin(_bridgeToken)) {
            // if the token originates on this chain, hold the tokens in escrow
            // in the Router
            _bridgeToken.safeTransferFrom(msg.sender, address(this), _amnt);
        } else {
            // if the token originates on a remote chain, burn the
            // representation tokens on this chain
            _downcast(_bridgeToken).burn(msg.sender, _amnt);
        }
        // format Transfer Tokens action
        bytes29 _action = BridgeMessage.formatTransfer(_recipient, _amnt);
        // send message to remote chain via Optics
        Home(xAppConnectionManager.home()).enqueue(
            _destination,
            _remote,
            BridgeMessage.formatMessage(_formatTokenId(_token), _action)
        );
    }

    // ======== External: Fast Liquidity =========

    /**
     * @notice Allows a liquidity provider to give an
     * end user fast liquidity by pre-filling an
     * incoming transfer message.
     * Transfers tokens from the liquidity provider to the end recipient, minus the LP fee;
     * Records the liquidity provider, who receives
     * the full token amount when the transfer message is handled.
     * @param _message The incoming transfer message to pre-fill
     */
    function preFill(bytes calldata _message) external {
        // parse tokenId and action from message
        bytes29 _msg = _message.ref(0).mustBeMessage();
        bytes29 _tokenId = _msg.tokenId().mustBeTokenId();
        bytes29 _action = _msg.action().mustBeTransfer();
        // calculate prefill ID
        bytes32 _id = _preFillId(_tokenId, _action);
        // require that transfer has not already been pre-filled
        require(liquidityProvider[_id] == address(0), "!unfilled");
        // record liquidity provider
        liquidityProvider[_id] = msg.sender;
        // transfer tokens from liquidity provider to token recipient
        IERC20 _token = _mustHaveToken(_tokenId);
        _token.safeTransferFrom(
            msg.sender,
            _action.evmRecipient(),
            _applyPreFillFee(_action.amnt())
        );
    }

    // ======== External: Update Token Details =========

    /**
     * @notice Update the token metadata on another chain
     * @param _token The token address
     * @param _destination The destination domain
     */
    // TODO: people can call this for nonsense non-ERC-20 tokens
    // name, symbol, decimals could be nonsense
    // remote chains will deploy a token contract based on this message
    function updateDetails(address _token, uint32 _destination) external {
        require(_isLocalOrigin(_token), "!local origin");
        // get remote BridgeRouter address; revert if not found
        bytes32 _remote = _mustHaveRemote(_destination);
        // format Update Details message
        IBridgeToken _bridgeToken = IBridgeToken(_token);
        bytes29 _action = BridgeMessage.formatDetails(
            TypeCasts.coerceBytes32(_bridgeToken.name()),
            TypeCasts.coerceBytes32(_bridgeToken.symbol()),
            _bridgeToken.decimals()
        );
        // send message to remote chain via Optics
        Home(xAppConnectionManager.home()).enqueue(
            _destination,
            _remote,
            BridgeMessage.formatMessage(_formatTokenId(_token), _action)
        );
    }

    // ============ Internal: Send / UpdateDetails ============

    /**
     * @notice Given a tokenAddress, format the tokenId
     * identifier for the message.
     * @param _token The token address
     * @param _tokenId The bytes-encoded tokenId
     */
    function _formatTokenId(address _token)
        internal
        view
        returns (bytes29 _tokenId)
    {
        TokenId memory _tokId = _tokenIdFor(_token);
        _tokenId = BridgeMessage.formatTokenId(_tokId.domain, _tokId.id);
    }

    // ============ Internal: Handle ============

    /**
     * @notice Handles an incoming Transfer message.
     *
     * If the token is of local origin, the amount is sent from escrow.
     * Otherwise, a representation token is minted.
     *
     * @param _tokenId The token ID
     * @param _action The action
     */
    function _handleTransfer(bytes29 _tokenId, bytes29 _action)
        internal
        typeAssert(_tokenId, BridgeMessage.Types.TokenId)
        typeAssert(_action, BridgeMessage.Types.Transfer)
    {
        // get the token contract for the given tokenId on this chain;
        // (if the token is of remote origin and there is
        // no existing representation token contract, the TokenRegistry will
        // deploy a new one)
        IERC20 _token = _ensureToken(_tokenId);
        address _recipient = _action.evmRecipient();
        // If an LP has prefilled this token transfer,
        // send the tokens to the LP instead of the recipient
        bytes32 _id = _preFillId(_tokenId, _action);
        address _lp = liquidityProvider[_id];
        if (_lp != address(0)) {
            _recipient = _lp;
            delete liquidityProvider[_id];
        }
        // send the tokens into circulation on this chain
        if (_isLocalOrigin(_token)) {
            // if the token is of local origin, the tokens have been held in
            // escrow in this contract
            // while they have been circulating on remote chains;
            // transfer the tokens to the recipient
            _token.safeTransfer(_recipient, _action.amnt());
        } else {
            // if the token is of remote origin, mint the tokens to the
            // recipient on this chain
            _downcast(_token).mint(_recipient, _action.amnt());
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
        // get the token contract deployed on this chain
        // revert if no token contract exists
        IERC20 _token = _mustHaveToken(_tokenId);
        // require that the token is of remote origin
        // (otherwise, the BridgeRouter did not deploy the token contract,
        // and therefore cannot update its metadata)
        require(!_isLocalOrigin(_token), "!remote origin");
        // update the token metadata
        _downcast(_token).setDetails(
            TypeCasts.coerceString(_action.name()),
            TypeCasts.coerceString(_action.symbol()),
            _action.decimals()
        );
    }

    // ============ Internal: Fast Liquidity ============

    /**
     * @notice Calculate the token amount after
     * taking a 5 bps (0.05%) liquidity provider fee
     * @param _amnt The token amount before the fee is taken
     * @return _amtAfterFee The token amount after the fee is taken
     */
    function _applyPreFillFee(uint256 _amnt)
        internal
        pure
        returns (uint256 _amtAfterFee)
    {
        _amtAfterFee =
            (_amnt * PRE_FILL_FEE_NUMERATOR) /
            PRE_FILL_FEE_DENOMINATOR;
    }

    /**
     * @notice get the prefillId used to identify
     * fast liquidity provision for incoming token send messages
     * @dev used to identify a token/transfer pair in the prefill LP mapping.
     * NOTE: This approach has a weakness: a user can receive >1 batch of tokens of
     * the same size, but only 1 will be eligible for fast liquidity. The
     * other may only be filled at regular speed. This is because the messages
     * will have identical `tokenId` and `action` fields. This seems fine,
     * tbqh. A delay of a few hours on a corner case is acceptable in v1.
     * @param _tokenId The token ID
     * @param _action The action
     */
    function _preFillId(bytes29 _tokenId, bytes29 _action)
        internal
        view
        returns (bytes32)
    {
        bytes29[] memory _views = new bytes29[](2);
        _views[0] = _tokenId;
        _views[1] = _action;
        return TypedMemView.joinKeccak(_views);
    }

    // ====== CUSTOM REPRESENTATIONS ======

    /**
     * @notice Enroll a custom token. This allows projects to work with
     * governance to specify a custom representation.
     * @dev This is done by inserting the custom representation into the token
     * lookup tables. It is permissioned to the owner (governance) and can
     * potentially break token representations. It must be used with extreme
     * caution.
     * After the token is inserted, new mint instructions will be sent to the
     * custom token. The default representation (and old custom representations)
     * may still be burnt. Until all users have explicitly called migrate, both
     * representations will continue to exist.
     * The custom representation MUST be trusted, and MUST allow the router to
     * both mint AND burn tokens at will.
     * @param _id the canonical ID of the Token to enroll, as a byte vector
     * @param _custom the address of the custom implementation to use.
     */
    function enrollCustom(
        uint32 _domain,
        bytes32 _id,
        address _custom
    ) external onlyOwner {
        bytes29 _tokenId = BridgeMessage.formatTokenId(_domain, _id);
        bytes32 _idHash = _tokenId.keccak();

        // Sanity check. Ensures that human error doesn't cause an
        // unpermissioned contract to be enrolled.
        IBridgeToken(_custom).mint(address(this), 1);
        IBridgeToken(_custom).burn(address(this), 1);

        representationToCanonical[_custom].domain = _tokenId.domain();
        representationToCanonical[_custom].id = _tokenId.id();
        canonicalToRepresentation[_idHash] = _custom;
    }

    /**
     * @notice Migrate all tokens in a previous representation to the latest
     * custom representation. This works by looking up local mappings and then
     * burning old tokens and minting new tokens.
     * @dev This is explicitly opt-in to allow dapps to decide when and how to
     * upgrade to the new representation.
     * @param _oldRepr The address of the old token to migrate
     */
    function migrate(address _oldRepr) external {
        // get the token ID for the old token contract
        TokenId memory _id = representationToCanonical[_oldRepr];
        require(_id.domain != 0, "!repr");

        IBridgeToken _old = IBridgeToken(_oldRepr);
        IBridgeToken _new = _reprFor(_id);
        require(_new != _old, "!different");

        // burn the old tokens & mint the new ones
        uint256 _bal = _old.balanceOf(msg.sender);
        _old.burn(msg.sender, _bal);
        _new.mint(msg.sender, _bal);
        emit Migrate(
            _id.domain,
            _id.id,
            msg.sender,
            _bal,
            address(_old),
            address(_new)
        );
    }
}

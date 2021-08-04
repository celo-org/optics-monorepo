// SPDX-License-Identifier: MIT OR Apache-2.0
pragma solidity >=0.6.11;

// ============ Internal Imports ============
import {BridgeMessage} from "./BridgeMessage.sol";
import {IBridgeToken} from "../../interfaces/bridge/IBridgeToken.sol";
import {XAppConnectionClient} from "../XAppConnectionClient.sol";

// ============ External Imports ============
import {TypeCasts} from "@celo-org/optics-sol/contracts/XAppConnectionManager.sol";
import {UpgradeBeaconProxy} from "@celo-org/optics-sol/contracts/upgrade/UpgradeBeaconProxy.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {TypedMemView} from "@summa-tx/memview-sol/contracts/TypedMemView.sol";
import {Initializable} from "@openzeppelin/contracts/proxy/Initializable.sol";

/**
 * @title TokenRegistry
 * @notice manages a registry of token contracts on this chain
 *
 * We sort token types as "representation token" or "locally originating token".
 * Locally originating - a token contract that was originally deployed on the local chain
 * Representation (repr) - a token that was originally deployed on some other chain
 *
 * When the router handles an incoming message, it determines whether the
 * transfer is for an asset of local origin. If not, it checks for an existing
 * representation contract. If no such representation exists, it deploys a new
 * representation contract. It then stores the relationship in the
 * "reprToCanonical" and "canonicalToRepr" mappings to ensure we can always
 * perform a lookup in either direction
 * Note that locally originating tokens should NEVER be represented in these lookup tables.
 */
abstract contract TokenRegistry is Initializable, XAppConnectionClient {
    using TypedMemView for bytes;
    using TypedMemView for bytes29;
    using BridgeMessage for bytes29;

    // ============ Structs ============

    // We identify tokens by a TokenId:
    // domain - 4 byte chain ID of the chain from which the token originates
    // id - 32 byte identifier of the token address on the origin chain, in that chain's address format
    struct TokenId {
        uint32 domain;
        bytes32 id;
    }

    // ============ Public Storage ============

    /// @dev The UpgradeBeacon that new tokens proxies will read implementation
    /// from
    address public tokenBeacon;

    // local representation token address => token ID
    mapping(address => TokenId) public representationToCanonical;

    // hash of the tightly-packed TokenId => local representation token address
    // If the token is of local origin, this MUST map to address(0).
    mapping(bytes32 => address) public canonicalToRepresentation;

    // ============ Events ============

    event TokenDeployed(
        uint32 indexed domain,
        bytes32 indexed id,
        address indexed representation
    );

    // ======== Initializer =========

    /**
     * @notice Initialize the TokenRegistry with UpgradeBeaconController and
     *          XappConnectionManager.
     * @dev This method deploys two new contracts, and may be expensive to call.
     * @param _xAppConnectionManager The address of the XappConnectionManager
     *        that will manage Optics channel connectoins
     */
    function initialize(address _tokenBeacon, address _xAppConnectionManager)
        public
        initializer
    {
        tokenBeacon = _tokenBeacon;
        XAppConnectionClient._initialize(_xAppConnectionManager);
    }

    // ============ Modifiers ============

    modifier typeAssert(bytes29 _view, BridgeMessage.Types _t) {
        _view.assertType(uint40(_t));
        _;
    }

    // ============ Internal Functions ============

    function _cloneTokenContract() internal returns (address result) {
        return address(new UpgradeBeaconProxy(tokenBeacon, ""));
    }

    function _deployToken(bytes29 _tokenId)
        internal
        typeAssert(_tokenId, BridgeMessage.Types.TokenId)
        returns (address _token)
    {
        // Deploy the token contract by cloning tokenTemplate
        _token = _cloneTokenContract();
        // Initial details are set to a hash of the ID
        bytes32 _idHash = _tokenId.keccak();
        IBridgeToken(_token).setDetails(_idHash, _idHash, 18);
        // store token in mappings
        representationToCanonical[_token].domain = _tokenId.domain();
        representationToCanonical[_token].id = _tokenId.id();
        canonicalToRepresentation[_idHash] = _token;
        // emit event upon deploying new token
        emit TokenDeployed(_tokenId.domain(), _tokenId.id(), _token);
    }

    /// @dev Gets the local address corresponding to the canonical ID, or
    /// address(0)
    function _getTokenAddress(bytes29 _tokenId)
        internal
        view
        typeAssert(_tokenId, BridgeMessage.Types.TokenId)
        returns (address)
    {
        // Token is of local origin
        if (_tokenId.domain() == _localDomain()) {
            return _tokenId.evmId();
        }
        // Token is a representation of a token of remote origin
        address _local = canonicalToRepresentation[_tokenId.keccak()];
        return _local;
    }

    function _ensureToken(bytes29 _tokenId)
        internal
        typeAssert(_tokenId, BridgeMessage.Types.TokenId)
        returns (IERC20)
    {
        address _local = _getTokenAddress(_tokenId);
        if (_local == address(0)) {
            // Representation does not exist yet;
            // deploy representation contract
            _local = _deployToken(_tokenId);
        }
        return IERC20(_local);
    }

    /// @dev returns the token corresponding to the canonical ID, or errors.
    function _mustHaveToken(bytes29 _tokenId)
        internal
        view
        typeAssert(_tokenId, BridgeMessage.Types.TokenId)
        returns (IERC20)
    {
        address _local = _getTokenAddress(_tokenId);
        require(_local != address(0), "!token");
        return IERC20(_local);
    }

    function _tokenIdFor(address _token)
        internal
        view
        returns (TokenId memory _id)
    {
        _id = representationToCanonical[_token];
        if (_id.domain == 0) {
            _id.domain = _localDomain();
            _id.id = TypeCasts.addressToBytes32(_token);
        }
    }

    function _isLocalOrigin(IERC20 _token) internal view returns (bool) {
        return _isLocalOrigin(address(_token));
    }

    function _isLocalOrigin(address _addr) internal view returns (bool) {
        // If the contract WAS deployed by the TokenRegistry,
        // it will be stored in this mapping.
        // If so, it IS NOT of local origin
        if (representationToCanonical[_addr].domain != 0) {
            return false;
        }
        // If the contract WAS NOT deployed by the TokenRegistry,
        // and the contract exists, then it IS of local origin
        // Return true if code exists at _addr
        uint256 _codeSize;
        // solhint-disable-next-line no-inline-assembly
        assembly {
            _codeSize := extcodesize(_addr)
        }
        return _codeSize != 0;
    }

    function _reprFor(bytes29 _tokenId)
        internal
        view
        typeAssert(_tokenId, BridgeMessage.Types.TokenId)
        returns (IERC20)
    {
        return IERC20(canonicalToRepresentation[_tokenId.keccak()]);
    }

    function _downcast(IERC20 _token) internal pure returns (IBridgeToken) {
        return IBridgeToken(address(_token));
    }
}

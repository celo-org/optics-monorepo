// SPDX-License-Identifier: MIT OR Apache-2.0
pragma solidity >=0.6.11;

// ============ Internal Imports ============
import {BridgeMessage} from "./BridgeMessage.sol";
import {Encoding} from "./Encoding.sol";
import {IBridgeToken} from "../../interfaces/bridge/IBridgeToken.sol";
import {XAppConnectionClient} from "../XAppConnectionClient.sol";

// ============ External Imports ============
import {TypeCasts} from "@celo-org/optics-sol/contracts/XAppConnectionManager.sol";
import {UpgradeBeaconProxy} from "@celo-org/optics-sol/contracts/upgrade/UpgradeBeaconProxy.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {TypedMemView} from "@summa-tx/memview-sol/contracts/TypedMemView.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/Initializable.sol";

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
abstract contract TokenRegistry is Initializable {
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
     *         XappConnectionManager.
     * @dev This method deploys two new contracts, and may be expensive to call.
     * @param _tokenBeacon The address of the upgrade beacon for bridge token
     *        proxies
     */
    function __TokenRegistry_initialize(address _tokenBeacon)
        internal
        initializer
    {
        tokenBeacon = _tokenBeacon;
    }

    // ======== Modifiers =========

    modifier typeAssert(bytes29 _view, BridgeMessage.Types _t) {
        _view.assertType(uint40(_t));
        _;
    }

    function _localDomain() internal view virtual returns (uint32);

    // ======== External: Token Lookup Convenience =========

    /**
     * @notice Looks up the canonical identifier for a local representation.
     * @dev If no such canonical ID is known, this instead returns
     *      (0, bytes32(0)).
     * @param _local The local address of the representation
     */
    function getCanonicalAddress(address _local)
        external
        view
        returns (uint32 _domain, bytes32 _id)
    {
        TokenId memory _canonical = representationToCanonical[_local];
        _domain = _canonical.domain;
        _id = _canonical.id;
    }

    /**
     * @notice Looks up the local address corresponding to a domain/id pair.
     * @dev If the token is local, it will return the local address.
     *      If the token is non-local and no local representation exists, this
     *      will return `address(0)`.
     * @param _domain the domain of the canonical version.
     * @param _id the identifier of the canonical version in its domain.
     * @return _token the local address of the token contract
     */
    function getLocalAddress(uint32 _domain, address _id)
        external
        view
        returns (address _token)
    {
        _token = getLocalAddress(_domain, TypeCasts.addressToBytes32(_id));
    }

    // ======== Public: Token Lookup Convenience =========

    /**
     * @notice Looks up the local address corresponding to a domain/id pair.
     * @dev If the token is local, it will return the local address.
     *      If the token is non-local and no local representation exists, this
     *      will return `address(0)`.
     * @param _domain the domain of the canonical version.
     * @param _id the identifier of the canonical version in its domain.
     * @return _token the local address of the token contract
     */
    function getLocalAddress(uint32 _domain, bytes32 _id)
        public
        view
        returns (address _token)
    {
        _token = _getTokenAddress(BridgeMessage.formatTokenId(_domain, _id));
    }

    // ======== Internal Functions =========

    function _defaultDetails(bytes29 _tokenId)
        internal
        pure
        typeAssert(_tokenId, BridgeMessage.Types.TokenId)
        returns (string memory _name, string memory _symbol)
    {
        // get the first and second half of the token ID
        (uint256 _firstHalfId, uint256 _secondHalfId) = Encoding.encodeHex(
            uint256(_tokenId.id())
        );
        // encode the default token name: "optics.[domain].[id]"
        _name = string(
            abi.encodePacked(
                "optics.",
                Encoding.encodeUint32(_tokenId.domain()),
                ".0x",
                _firstHalfId,
                _secondHalfId
            )
        );
        // allocate the memory for a new 32-byte string
        _symbol = new string(32);
        assembly {
            mstore(add(_symbol, 0x20), mload(add(_name, 0x20)))
        }
    }

    /// @dev Deploy and init a new token contract
    function _cloneTokenContract() internal returns (address) {
        address _newProxy = address(new UpgradeBeaconProxy(tokenBeacon, ""));
        IBridgeToken(_newProxy).initialize();
        return _newProxy;
    }

    function _deployToken(bytes29 _tokenId)
        internal
        typeAssert(_tokenId, BridgeMessage.Types.TokenId)
        returns (address _token)
    {
        // deploy the token contract
        _token = _cloneTokenContract();
        // set the default token name & symbol
        string memory _name;
        string memory _symbol;
        (_name, _symbol) = _defaultDetails(_tokenId);
        IBridgeToken(_token).setDetails(_name, _symbol, 18);
        // store token in mappings
        representationToCanonical[_token].domain = _tokenId.domain();
        representationToCanonical[_token].id = _tokenId.id();
        canonicalToRepresentation[_tokenId.keccak()] = _token;
        // emit event upon deploying new token
        emit TokenDeployed(_tokenId.domain(), _tokenId.id(), _token);
    }

    /// @dev Gets the local address corresponding to the canonical ID, or
    /// address(0)
    function _getTokenAddress(bytes29 _tokenId)
        internal
        view
        typeAssert(_tokenId, BridgeMessage.Types.TokenId)
        returns (address _local)
    {
        if (_tokenId.domain() == _localDomain()) {
            // Token is of local origin
            _local = _tokenId.evmId();
        } else {
            // Token is a representation of a token of remote origin
            _local = canonicalToRepresentation[_tokenId.keccak()];
        }
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

    function _isLocalOrigin(address _token) internal view returns (bool) {
        // If the contract WAS deployed by the TokenRegistry,
        // it will be stored in this mapping.
        // If so, it IS NOT of local origin
        if (representationToCanonical[_token].domain != 0) {
            return false;
        }
        // If the contract WAS NOT deployed by the TokenRegistry,
        // and the contract exists, then it IS of local origin
        // Return true if code exists at _addr
        uint256 _codeSize;
        // solhint-disable-next-line no-inline-assembly
        assembly {
            _codeSize := extcodesize(_token)
        }
        return _codeSize != 0;
    }

    /// @dev Find the local representation of a canonical token. May return 0
    function _reprFor(bytes29 _tokenId)
        internal
        view
        typeAssert(_tokenId, BridgeMessage.Types.TokenId)
        returns (IBridgeToken)
    {
        return IBridgeToken(canonicalToRepresentation[_tokenId.keccak()]);
    }

    /// @dev Find the local representation of a canonical token. May return 0
    function _reprFor(TokenId memory _tokenId)
        internal
        view
        returns (IBridgeToken)
    {
        return _reprFor(_serializeId(_tokenId));
    }

    /// @dev downcast an IERC20 to an IBridgeToken. Unsafe. Please know what
    /// you're doing.
    function _downcast(IERC20 _token) internal pure returns (IBridgeToken) {
        return IBridgeToken(address(_token));
    }

    /// @dev serialize a TokenId struct and return the memory view
    function _serializeId(TokenId memory _id) internal pure returns (bytes29) {
        return BridgeMessage.formatTokenId(_id.domain, _id.id);
    }
}

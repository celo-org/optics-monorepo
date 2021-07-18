// SPDX-License-Identifier: MIT OR Apache-2.0
pragma solidity >=0.6.11;

// ============ Internal Imports ============
import {BridgeMessage} from "./BridgeMessage.sol";
import {BridgeToken} from "./BridgeToken.sol";
import {IBridgeToken} from "../../interfaces/bridge/IBridgeToken.sol";
import {XAppConnectionClient} from "../XAppConnectionClient.sol";
// ============ External Imports ============
import {XAppConnectionManager, TypeCasts} from "@celo-org/optics-sol/contracts/XAppConnectionManager.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {TypedMemView} from "@summa-tx/memview-sol/contracts/TypedMemView.sol";

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
abstract contract TokenRegistry is XAppConnectionClient {
    using TypedMemView for bytes;
    using TypedMemView for bytes29;
    using BridgeMessage for bytes29;

    // We identify tokens by a TokenId:
    // domain - 4 byte chain ID of the chain from which the token originates
    // id - 32 byte identifier of the token address on the origin chain, in that chain's address format
    struct TokenId {
        uint32 domain;
        bytes32 id;
    }

    event TokenDeployed(
        uint32 indexed domain,
        bytes32 indexed id,
        address indexed representation
    );

    // Contract bytecode that will be cloned to deploy
    // new representation token contracts
    address internal tokenTemplate;

    // local representation token address => token ID
    mapping(address => TokenId) public representationToCanonical;

    // hash of the tightly-packed TokenId => local representation token address
    // If the token is of local origin, this MUST map to address(0).
    mapping(bytes32 => address) public canonicalToRepresentation;

    // ======== Constructor =========

    constructor(address _xAppConnectionManager)
        XAppConnectionClient(_xAppConnectionManager)
    {
        tokenTemplate = address(new BridgeToken());
    }

    modifier typeAssert(bytes29 _view, BridgeMessage.Types _t) {
        _view.assertType(uint40(_t));
        _;
    }

    function setTemplate(address _newTemplate) external onlyOwner {
        tokenTemplate = _newTemplate;
    }

    function _cloneTokenContract() internal returns (address result) {
        bytes20 targetBytes = bytes20(tokenTemplate);
        // solhint-disable-next-line no-inline-assembly
        assembly {
            let _clone := mload(0x40)
            mstore(
                _clone,
                0x3d602d80600a3d3981f3363d3d373d3d3d363d73000000000000000000000000
            )
            mstore(add(_clone, 0x14), targetBytes)
            mstore(
                add(_clone, 0x28),
                0x5af43d82803e903d91602b57fd5bf30000000000000000000000000000000000
            )
            result := create(0, _clone, 0x37)
        }
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

    function _ensureToken(bytes29 _tokenId)
        internal
        typeAssert(_tokenId, BridgeMessage.Types.TokenId)
        returns (IERC20)
    {
        // Token is of local origin
        if (_tokenId.domain() == _localDomain()) {
            return IERC20(_tokenId.evmId());
        }
        // Token is a representation of a token of remote origin
        address _local = canonicalToRepresentation[_tokenId.keccak()];
        if (_local == address(0)) {
            // Representation does not exist yet;
            // deploy representation contract
            _local = _deployToken(_tokenId);
        }
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

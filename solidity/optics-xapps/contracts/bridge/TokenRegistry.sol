// SPDX-License-Identifier: MIT OR Apache-2.0
pragma solidity >=0.6.11;

// ============ Internal Imports ============
import {BridgeMessage} from "./BridgeMessage.sol";
import {BridgeToken} from "./BridgeToken.sol";
import {IBridgeToken} from "../../interfaces/bridge/IBridgeToken.sol";
import {XAppConnectionClient} from "../XAppConnectionClient.sol";
// ============ External Imports ============
import {
    XAppConnectionManager,
    TypeCasts
} from "@celo-org/optics-sol/contracts/XAppConnectionManager.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {TypedMemView} from "@summa-tx/memview-sol/contracts/TypedMemView.sol";


/**
 * @title TokenRegistry
 * @notice manages a registry of token contracts on this chain
 *
 * We sort token types as "representation" or "native".
 * Native - a token contract that is originally deployed on this chain
 * Representation (repr) - a token that originates on some other chain
 *
 * . We leave upgradability and management of
 * that identity to the token's deployers.
 *
 * When the router handles an incoming message, it determines whether the
 * transfer is for a native asset. If not, it checks for an existing
 * representation. If no such representation exists, it deploys a new
 * representation token contract. It then stores the relationship in the
 * "reprToCanonical" and "canonicalToRepr" mappings to ensure we can always
 * perform a lookup in either direction
 * Note that native tokens should NEVER be represented in these lookup tables.
 */
abstract contract TokenRegistry is XAppConnectionClient {
    using TypedMemView for bytes;
    using TypedMemView for bytes29;
    using BridgeMessage for bytes29;

    // We identify tokens by a TokenId:
    // domain - 4 byte chain ID
    // id - 32 byte identifier in native chain's address format
    struct TokenId {
        uint32 domain;
        bytes32 id;
    }

    // Contract bytecode that will be cloned to deploy
    // new representation token contracts
    address internal tokenTemplate;

    // local representation token address => token ID
    mapping(address => TokenId) internal reprToCanonical;

    // hash of the tightly-packed TokenId => local representation token address
    // If the token is native, this MUST map to address(0).
    mapping(bytes32 => address) internal canonicalToRepr;

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
        reprToCanonical[_token].domain = _tokenId.domain();
        reprToCanonical[_token].id = _tokenId.id();
        canonicalToRepr[_idHash] = _token;
    }

    function _ensureToken(bytes29 _tokenId)
        internal
        typeAssert(_tokenId, BridgeMessage.Types.TokenId)
        returns (IERC20)
    {
        // Native
        if (_tokenId.domain() == _localDomain()) {
            return IERC20(_tokenId.evmId());
        }

        // Repr
        address _local = canonicalToRepr[_tokenId.keccak()];
        if (_local == address(0)) {
            // DEPLO
            _local = _deployToken(_tokenId);
        }
        return IERC20(_local);
    }

    function _tokenIdFor(address _token)
        internal
        view
        returns (TokenId memory _id)
    {
        _id = reprToCanonical[_token];
        if (_id.domain == 0) {
            _id.domain = _localDomain();
            _id.id = TypeCasts.addressToBytes32(_token);
        }
    }

    function _isNative(IERC20 _token) internal view returns (bool) {
        address _addr = address(_token);
        // If this contract deployed it, it isn't native.
        if (reprToCanonical[_addr].domain != 0) {
            return false;
        }
        // Avoid returning true for non-existant contracts
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
        return IERC20(canonicalToRepr[_tokenId.keccak()]);
    }

    function _downcast(IERC20 _token) internal pure returns (IBridgeToken) {
        return IBridgeToken(address(_token));
    }
}

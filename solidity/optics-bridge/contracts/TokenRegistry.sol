// SPDX-License-Identifier: MIT OR Apache-2.0
pragma solidity >=0.6.11;

import {BridgeMessage} from "./BridgeMessage.sol";
import {BridgeToken} from "./BridgeToken.sol";
import {IBridgeToken} from "../interfaces/IBridgeToken.sol";

import {
    XAppConnectionManager,
    TypeCasts
} from "@celo-org/optics-sol/contracts/XAppConnectionManager.sol";

import "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {TypedMemView} from "@summa-tx/memview-sol/contracts/TypedMemView.sol";

// How the token registry works:
// We sort token types as "representation" or "native".
// Native means a contract that is originally deployed on this chain
// Representation (repr) means a token that originates on some other chain
//
// We identify tokens by a 4 byte chain ID and a 32 byte identifier in that
// chain's native address format. We leave upgradability and management of
// that identity to the token's deployers.
//
// When the router handles an incoming message, it determines whether the
// transfer is for a native asset. If not, it checks for an existing
// representation. If no such representation exists, it deploys a new
// representation token contract. It then stores the relationship in the
// "reprToCanonical" and "canonicalToRepr" mappings to ensure we can always
// perform a lookup in either direction
//
// Note that native tokens should NEVER be represented in these lookup tables.

contract TokenRegistry is Ownable {
    using TypedMemView for bytes;
    using TypedMemView for bytes29;
    using BridgeMessage for bytes29;

    // simplifies the mapping type if we do it this way
    struct TokenId {
        uint32 domain;
        bytes32 id;
    }

    XAppConnectionManager public xAppConnectionManager;

    // We should be able to deploy a new token on demand
    address internal tokenTemplate;

    // Map the local address to the token ID.
    mapping(address => TokenId) internal reprToCanonical;

    // Map the hash of the tightly-packed token ID to the address
    // of the local representation.
    //
    // If the token is native, this MUST be address(0).
    mapping(bytes32 => address) internal canonicalToRepr;

    constructor(address _xAppConnectionManager) Ownable() {
        tokenTemplate = address(new BridgeToken());
        setXAppConnectionManager(_xAppConnectionManager);
    }

    modifier onlyReplica() {
        require(xAppConnectionManager.isReplica(msg.sender), "!replica");
        _;
    }

    modifier typeAssert(bytes29 _view, BridgeMessage.Types _t) {
        _view.assertType(uint40(_t));
        _;
    }

    function setTemplate(address _newTemplate) external onlyOwner {
        tokenTemplate = _newTemplate;
    }

    function setXAppConnectionManager(address _xAppConnectionManager)
        public
        onlyOwner
    {
        xAppConnectionManager = XAppConnectionManager(_xAppConnectionManager);
    }

    function createClone(address _target) internal returns (address result) {
        bytes20 targetBytes = bytes20(_target);
        // solhint-disable-next-line no-inline-assembly
        assembly {
            let clone := mload(0x40)
            mstore(
                clone,
                0x3d602d80600a3d3981f3363d3d373d3d3d363d73000000000000000000000000
            )
            mstore(add(clone, 0x14), targetBytes)
            mstore(
                add(clone, 0x28),
                0x5af43d82803e903d91602b57fd5bf30000000000000000000000000000000000
            )
            result := create(0, clone, 0x37)
        }
    }

    function deployToken(bytes29 _tokenId)
        internal
        typeAssert(_tokenId, BridgeMessage.Types.TokenId)
        returns (address _token)
    {
        bytes32 _idHash = _tokenId.keccak();
        _token = createClone(tokenTemplate);

        // Initial details are set to a hash of the ID
        IBridgeToken(_token).setDetails(_idHash, _idHash, 18);

        reprToCanonical[_token].domain = _tokenId.domain();
        reprToCanonical[_token].id = _tokenId.id();
        canonicalToRepr[_idHash] = _token;
    }

    function ensureToken(bytes29 _tokenId)
        internal
        typeAssert(_tokenId, BridgeMessage.Types.TokenId)
        returns (IERC20)
    {
        // Native
        if (_tokenId.domain() == xAppConnectionManager.localDomain()) {
            return IERC20(_tokenId.evmId());
        }

        // Repr
        address _local = canonicalToRepr[_tokenId.keccak()];
        if (_local == address(0)) {
            // DEPLO
            _local = deployToken(_tokenId);
        }
        return IERC20(_local);
    }

    function tokenIdFor(address _token)
        internal
        view
        returns (TokenId memory _id)
    {
        _id = reprToCanonical[_token];
        if (_id.domain == 0) {
            _id.domain = xAppConnectionManager.localDomain();
            _id.id = TypeCasts.addressToBytes32(_token);
        }
    }

    function isNative(IERC20 _token) internal view returns (bool) {
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

    function reprFor(bytes29 _tokenId)
        internal
        view
        typeAssert(_tokenId, BridgeMessage.Types.TokenId)
        returns (IERC20)
    {
        return IERC20(canonicalToRepr[_tokenId.keccak()]);
    }

    function downcast(IERC20 _token) internal pure returns (IBridgeToken) {
        return IBridgeToken(address(_token));
    }
}

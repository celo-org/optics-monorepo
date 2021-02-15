// SPDX-License-Identifier: MIT OR Apache-2.0
pragma solidity >=0.6.11;

import "./Types.sol";
import {BridgeTokenI, BridgeToken} from "./BridgeToken.sol";

import "../UsingOptics.sol";

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {TypedMemView} from "@summa-tx/memview-sol/contracts/TypedMemView.sol";

contract TokenRegistry is UsingOptics {
    using TypedMemView for bytes;
    using TypedMemView for bytes29;
    using BridgeMessage for bytes29;

    struct TokenId {
        uint32 domain;
        bytes32 id;
    }

    address tokenTemplate;
    function createClone(address _target) internal returns (address result) {
        bytes20 targetBytes = bytes20(_target);
        assembly {
            let clone := mload(0x40)
            mstore(clone, 0x3d602d80600a3d3981f3363d3d373d3d3d363d73000000000000000000000000)
            mstore(add(clone, 0x14), targetBytes)
            mstore(
                add(clone, 0x28),
                0x5af43d82803e903d91602b57fd5bf30000000000000000000000000000000000
            )
            result := create(0, clone, 0x37)
        }
    }

    mapping(address => TokenId) internal reprToCanonical;
    mapping(bytes32 => address) internal canoncialToRepr;

    constructor() {
        tokenTemplate = address(new BridgeToken());
    }

    modifier typeAssert(bytes29 _view, BridgeMessage.Types _t) {
        _view.assertType(uint40(_t));
        _;
    }

    function downcast(IERC20 _token) internal pure returns (BridgeTokenI) {
        return BridgeTokenI(address(_token));
    }

    function reprFor(bytes29 _tokenId)
        internal
        view
        typeAssert(_tokenId, BridgeMessage.Types.TokenId)
        returns (IERC20)
    {
        return IERC20(canoncialToRepr[_tokenId.keccak()]);
    }

    function tokenIdFor(address _token)
        internal
        view
        returns (TokenId memory _id)
    {
        _id = reprToCanonical[_token];
        if (_id.domain == 0) {
            _id.domain = home.originSLIP44();
            _id.id = addressToBytes32(_token);
        }
    }

    function isNative(IERC20 _token) internal view returns (bool) {
        return tokenIdFor(address(_token)).domain == home.originSLIP44();
    }

    function deployToken(bytes29 _tokenId)
        internal
        typeAssert(_tokenId, BridgeMessage.Types.TokenId)
        returns (address _token)
    {
        bytes32 _idHash = _tokenId.keccak();
        // TODO: Clone factory on standard bridge token contract
        _token = createClone(tokenTemplate);

        // Initial details are set to a hash of the ID
        BridgeTokenI(_token).setDetails(
            _idHash,
            _idHash,
            18
        );

        reprToCanonical[_token].domain = _tokenId.domain();
        reprToCanonical[_token].id = _tokenId.id();
        canoncialToRepr[_idHash] = _token;
    }

    function ensureToken(bytes29 _tokenId)
        internal
        typeAssert(_tokenId, BridgeMessage.Types.TokenId)
        returns (IERC20)
    {
        // Native
        if (_tokenId.domain() == home.originSLIP44()) {
            return IERC20(_tokenId.evmId());
        }

        // Repr
        address _local = canoncialToRepr[_tokenId.keccak()];
        if (_local == address(0)) {
            // DEPLO
            _local = deployToken(_tokenId);
        }
        return IERC20(_local);
    }
}

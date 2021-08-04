// SPDX-License-Identifier: MIT OR Apache-2.0
pragma solidity >=0.6.11;

// ============ Internal Imports ============
import {BridgeRouter} from "../BridgeRouter.sol";
import {BridgeMessage} from "../BridgeMessage.sol";
import {BridgeToken} from "../BridgeToken.sol";
// ============ External Imports ============
import {TypeCasts} from "@celo-org/optics-sol/contracts/XAppConnectionManager.sol";
import {TypedMemView} from "@summa-tx/memview-sol/contracts/TypedMemView.sol";

contract TestXappConnectionManager {
    function localDomain() external pure returns (uint32) {
        return 5;
    }
}

contract TestFastLiquidity is BridgeRouter {
    using TypedMemView for bytes29;
    using TypedMemView for bytes;
    using BridgeMessage for bytes29;

    uint32 internal constant DOMAIN = 1;
    bytes32 internal constant RECIPIENT = bytes32(uint256(500));
    address internal constant EVM_RECIPIENT = address(500);
    uint256 internal constant TO_SEND = 10000;
    uint256 internal constant POST_FEE = 9995;
    uint256 internal constant FEE = 5;

    BridgeToken t;

    constructor() {
        t = new BridgeToken();
        t.initialize();

        representationToCanonical[address(t)].domain = DOMAIN;
        representationToCanonical[address(t)].id = TypeCasts.addressToBytes32(
            address(t)
        );

        bytes29 _tokenId = BridgeMessage.formatTokenId(
            DOMAIN,
            TypeCasts.addressToBytes32(address(t))
        );
        canonicalToRepresentation[_tokenId.keccak()] = address(t);
        // required to intercept `_localDomain` calls
        _initialize(address(new TestXappConnectionManager()));
    }

    function getMessage()
        internal
        view
        returns (
            bytes memory,
            bytes29,
            bytes29
        )
    {
        bytes29 _tokenId = BridgeMessage.formatTokenId(
            DOMAIN,
            TypeCasts.addressToBytes32(address(t))
        );
        bytes29 _action = BridgeMessage.formatTransfer(RECIPIENT, TO_SEND);
        bytes memory _msg = BridgeMessage.formatMessage(_tokenId, _action);

        bytes29 _tokenId2 = _msg.ref(0).mustBeMessage().tokenId();
        bytes29 _action2 = _msg
            .ref(0)
            .mustBeMessage()
            .action()
            .mustBeTransfer();

        require(_tokenId.equal(_tokenId2), "!tokeq");
        require(_action.equal(_action2), "!acteq");

        return (_msg, _tokenId, _action);
    }

    function test() public {
        t.mint(address(this), 10000);
        t.approve(address(this), 10000);

        require(t.balanceOf(address(this)) == 10000, "!fee");

        bytes memory _msg;
        bytes29 _tokenId;
        bytes29 _action;
        (_msg, _tokenId, _action) = getMessage();
        BridgeRouter(address(this)).preFill(_msg);

        require(t.balanceOf(address(this)) == FEE, "!fee");
        require(t.balanceOf(EVM_RECIPIENT) == POST_FEE, "!rec");

        _handleTransfer(_tokenId, _action);

        require(t.balanceOf(address(this)) == TO_SEND + FEE, "!postfee");
        require(t.balanceOf(EVM_RECIPIENT) == POST_FEE, "!postrecbal");
    }
}

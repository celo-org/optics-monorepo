// SPDX-License-Identifier: MIT OR Apache-2.0
pragma solidity >=0.6.11;

import "@summa-tx/memview-sol/contracts/TypedMemView.sol";

library BridgeMessage {
    using TypedMemView for bytes;
    using TypedMemView for bytes29;

    uint256 private constant TOKEN_ID_LEN = 36;
    uint256 private constant XFER_LEN = 64;
    uint256 private constant DETAILS_LEN = 96;

    enum Types {
        Invalid, // 0
        Xfer, // 1
        Details, // 2
        TokenId, // 3
        Message // 4
    }

    modifier typeAssert(bytes29 _view, Types _t) {
        _view.assertType(uint40(_t));
        _;
    }

    function messageType(bytes29 _view) internal pure returns (Types) {
        return Types(uint8(_view.typeOf()));
    }

    function isXfer(bytes29 _view) internal pure returns (bool) {
        return messageType(_view) == Types.Xfer;
    }

    function isDetails(bytes29 _view) internal pure returns (bool) {
        return messageType(_view) == Types.Details;
    }

    function formatXfer(bytes32 _to, uint256 _amnt)
        internal
        pure
        returns (bytes29)
    {
        return mustBeXfer(abi.encodePacked(_to, _amnt).ref(0));
    }

    function formatDetails(
        bytes32 _name,
        bytes32 _symbol,
        uint256 _decimals
    ) internal pure returns (bytes29) {
        return
            mustBeDetails(abi.encodePacked(_name, _symbol, _decimals).ref(0));
    }

    function formatTokenId(uint32 _domain, bytes32 _id)
        internal
        pure
        returns (bytes29)
    {
        return mustBeTokenId(abi.encodePacked(_domain, _id).ref(0));
    }

    function formatMessage(bytes29 _tokenId, bytes29 _action)
        internal
        view
        typeAssert(_tokenId, Types.TokenId)
        returns (bytes memory)
    {
        require(isDetails(_action) || isXfer(_action), "!action");
        bytes29[] memory _views = new bytes29[](2);
        _views[0] = _tokenId;
        _views[1] = _action;
        return TypedMemView.join(_views);
    }

    function domain(bytes29 _view)
        internal
        pure
        typeAssert(_view, Types.TokenId)
        returns (uint32)
    {
        return uint32(_view.indexUint(0, 4));
    }

    function id(bytes29 _view)
        internal
        pure
        typeAssert(_view, Types.TokenId)
        returns (bytes32)
    {
        return _view.index(4, 32);
    }

    function evmId(bytes29 _view)
        internal
        pure
        typeAssert(_view, Types.TokenId)
        returns (address)
    {
        // 4 bytes domain + 12 empty to trim for address
        return _view.indexAddress(16);
    }

    function recipient(bytes29 _view)
        internal
        pure
        typeAssert(_view, Types.Xfer)
        returns (bytes32)
    {
        return _view.index(0, 32);
    }

    function evmRecipient(bytes29 _view)
        internal
        pure
        typeAssert(_view, Types.Xfer)
        returns (address)
    {
        return _view.indexAddress(12);
    }

    function amnt(bytes29 _view)
        internal
        pure
        typeAssert(_view, Types.Xfer)
        returns (uint256)
    {
        return _view.indexUint(32, 32);
    }

    function name(bytes29 _view)
        internal
        pure
        typeAssert(_view, Types.Details)
        returns (bytes32)
    {
        return _view.index(0, 32);
    }

    function symbol(bytes29 _view)
        internal
        pure
        typeAssert(_view, Types.Details)
        returns (bytes32)
    {
        return _view.index(32, 32);
    }

    function decimals(bytes29 _view)
        internal
        pure
        typeAssert(_view, Types.Details)
        returns (uint256)
    {
        return _view.indexUint(64, 32);
    }

    function tokenId(bytes29 _view)
        internal
        pure
        typeAssert(_view, Types.Message)
        returns (bytes29)
    {
        return _view.slice(0, TOKEN_ID_LEN, uint40(Types.TokenId));
    }

    function action(bytes29 _view)
        internal
        pure
        typeAssert(_view, Types.Message)
        returns (bytes29)
    {
        if (_view.len() == TOKEN_ID_LEN + DETAILS_LEN) {
            return
                _view.slice(
                    TOKEN_ID_LEN,
                    TOKEN_ID_LEN + DETAILS_LEN,
                    uint40(Types.Details)
                );
        }
        return
            _view.slice(
                TOKEN_ID_LEN,
                TOKEN_ID_LEN + XFER_LEN,
                uint40(Types.Xfer)
            );
    }

    function tryAsXfer(bytes29 _view) internal pure returns (bytes29) {
        if (_view.len() == XFER_LEN) {
            return _view.castTo(uint40(Types.Xfer));
        }
        return TypedMemView.nullView();
    }

    function tryAsDetails(bytes29 _view) internal pure returns (bytes29) {
        if (_view.len() == DETAILS_LEN) {
            return _view.castTo(uint40(Types.Details));
        }
        return TypedMemView.nullView();
    }

    function tryAsTokenId(bytes29 _view) internal pure returns (bytes29) {
        if (_view.len() == 36) {
            return _view.castTo(uint40(Types.TokenId));
        }
        return TypedMemView.nullView();
    }

    function tryAsMessage(bytes29 _view) internal pure returns (bytes29) {
        uint256 _len = _view.len();
        if (
            _len == TOKEN_ID_LEN + XFER_LEN ||
            _len == TOKEN_ID_LEN + DETAILS_LEN
        ) {
            return _view.castTo(uint40(Types.Message));
        }
        return TypedMemView.nullView();
    }

    function mustBeXfer(bytes29 _view) internal pure returns (bytes29) {
        return tryAsXfer(_view).assertValid();
    }

    function mustBeDetails(bytes29 _view) internal pure returns (bytes29) {
        return tryAsXfer(_view).assertValid();
    }

    function mustBeTokenId(bytes29 _view) internal pure returns (bytes29) {
        return tryAsTokenId(_view).assertValid();
    }

    function mustBeMessage(bytes29 _view) internal pure returns (bytes29) {
        return tryAsMessage(_view).assertValid();
    }
}

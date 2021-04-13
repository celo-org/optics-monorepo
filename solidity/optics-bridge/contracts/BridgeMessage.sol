// SPDX-License-Identifier: MIT OR Apache-2.0
pragma solidity >=0.6.11;

import "@summa-tx/memview-sol/contracts/TypedMemView.sol";

library BridgeMessage {
    using TypedMemView for bytes;
    using TypedMemView for bytes29;

    uint256 private constant TOKEN_ID_LEN = 36;
    uint256 private constant TRANSFER_LEN = 64;
    uint256 private constant DETAILS_LEN = 65;

    enum Types {
        Invalid, // 0
        Transfer, // 1
        Details, // 2
        TokenId, // 3
        Message // 4
    }

    modifier typeAssert(bytes29 _view, Types _t) {
        _view.assertType(uint40(_t));
        _;
    }

    /**
     * @param _t The tokenId
     * @param _a The action
     */
    function _formatMessage(bytes29 _t, bytes29 _a)
        internal
        view
        typeAssert(_t, Types.TokenId)
        returns (bytes memory)
    {
        require(_isDetails(_a) || _isTransfer(_a), "!action");
        bytes29[] memory _views = new bytes29[](2);
        _views[0] = _t;
        _views[1] = _a;
        return TypedMemView.join(_views);
    }

    function _messageType(bytes29 _view) internal pure returns (Types) {
        return Types(uint8(_view.typeOf()));
    }

    function _isTransfer(bytes29 _view) internal pure returns (bool) {
        return _messageType(_view) == Types.Transfer;
    }

    function _isDetails(bytes29 _view) internal pure returns (bool) {
        return _messageType(_view) == Types.Details;
    }

    /**
     * @param _to The destination address
     * @param _a The amount
     */
    function _formatTransfer(bytes32 _to, uint256 _a)
        internal
        pure
        returns (bytes29)
    {
        return _mustBeTransfer(abi.encodePacked(_to, _a).ref(0));
    }

    /**
     * @param _n The name
     * @param _s The symbol
     * @param _d The decimals
     */
    function _formatDetails(
        bytes32 _n,
        bytes32 _s,
        uint8 _d
    ) internal pure returns (bytes29) {
        return _mustBeDetails(abi.encodePacked(_n, _s, _d).ref(0));
    }

    /**
     * @param _d The domain
     * @param _i The id
     */
    function _formatTokenId(uint32 _d, bytes32 _i)
        internal
        pure
        returns (bytes29)
    {
        return _mustBeTokenId(abi.encodePacked(_d, _i).ref(0));
    }

    function _domain(bytes29 _view)
        internal
        pure
        typeAssert(_view, Types.TokenId)
        returns (uint32)
    {
        return uint32(_view.indexUint(0, 4));
    }

    function _id(bytes29 _view)
        internal
        pure
        typeAssert(_view, Types.TokenId)
        returns (bytes32)
    {
        return _view.index(4, 32);
    }

    function _evmId(bytes29 _view)
        internal
        pure
        typeAssert(_view, Types.TokenId)
        returns (address)
    {
        // 4 bytes domain + 12 empty to trim for address
        return _view.indexAddress(16);
    }

    function _recipient(bytes29 _view)
        internal
        pure
        typeAssert(_view, Types.Transfer)
        returns (bytes32)
    {
        return _view.index(0, 32);
    }

    function _evmRecipient(bytes29 _view)
        internal
        pure
        typeAssert(_view, Types.Transfer)
        returns (address)
    {
        return _view.indexAddress(12);
    }

    function _amnt(bytes29 _view)
        internal
        pure
        typeAssert(_view, Types.Transfer)
        returns (uint256)
    {
        return _view.indexUint(32, 32);
    }

    function _name(bytes29 _view)
        internal
        pure
        typeAssert(_view, Types.Details)
        returns (bytes32)
    {
        return _view.index(0, 32);
    }

    function _symbol(bytes29 _view)
        internal
        pure
        typeAssert(_view, Types.Details)
        returns (bytes32)
    {
        return _view.index(32, 32);
    }

    function _decimals(bytes29 _view)
        internal
        pure
        typeAssert(_view, Types.Details)
        returns (uint8)
    {
        return uint8(_view.indexUint(64, 1));
    }

    function _tokenId(bytes29 _view)
        internal
        pure
        typeAssert(_view, Types.Message)
        returns (bytes29)
    {
        return _view.slice(0, TOKEN_ID_LEN, uint40(Types.TokenId));
    }

    function _action(bytes29 _view)
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
                TOKEN_ID_LEN + TRANSFER_LEN,
                uint40(Types.Transfer)
            );
    }

    function _tryAsTransfer(bytes29 _view) internal pure returns (bytes29) {
        if (_view.len() == TRANSFER_LEN) {
            return _view.castTo(uint40(Types.Transfer));
        }
        return TypedMemView.nullView();
    }

    function _tryAsDetails(bytes29 _view) internal pure returns (bytes29) {
        if (_view.len() == DETAILS_LEN) {
            return _view.castTo(uint40(Types.Details));
        }
        return TypedMemView.nullView();
    }

    function _tryAsTokenId(bytes29 _view) internal pure returns (bytes29) {
        if (_view.len() == 36) {
            return _view.castTo(uint40(Types.TokenId));
        }
        return TypedMemView.nullView();
    }

    function _tryAsMessage(bytes29 _view) internal pure returns (bytes29) {
        uint256 _len = _view.len();
        if (
            _len == TOKEN_ID_LEN + TRANSFER_LEN ||
            _len == TOKEN_ID_LEN + DETAILS_LEN
        ) {
            return _view.castTo(uint40(Types.Message));
        }
        return TypedMemView.nullView();
    }

    function _mustBeTransfer(bytes29 _view) internal pure returns (bytes29) {
        return _tryAsTransfer(_view).assertValid();
    }

    function _mustBeDetails(bytes29 _view) internal pure returns (bytes29) {
        return _tryAsDetails(_view).assertValid();
    }

    function _mustBeTokenId(bytes29 _view) internal pure returns (bytes29) {
        return _tryAsTokenId(_view).assertValid();
    }

    function _mustBeMessage(bytes29 _view) internal pure returns (bytes29) {
        return _tryAsMessage(_view).assertValid();
    }
}

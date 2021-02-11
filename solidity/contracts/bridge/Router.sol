// SPDX-License-Identifier: MIT OR Apache-2.0
pragma solidity >=0.6.11;

import "./Types.sol";
import "../UsingOptics.sol";

import "@summa-tx/memview-sol/contracts/TypedMemView.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface BridgeTokenI {
    function name() external view returns (string memory);

    function symbol() external view returns (string memory);

    function decimals() external view returns (uint256);

    function transfer(address recipient, uint256 amount)
        external
        returns (bool);

    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) external returns (bool);

    function burn(address from, uint256 amnt) external;

    function mint(address to, uint256 amnt) external;

    function setDetails(
        bytes32 _name,
        bytes32 _symbol,
        uint256 _decimals
    ) external;
}

contract BridgeRouter is OpticsHandlerI, UsingOptics {
    using TypedMemView for bytes;
    using TypedMemView for bytes29;
    using BridgeMessage for bytes29;

    struct TokenId {
        uint32 domain;
        bytes32 id;
    }

    mapping(uint32 => bytes32) internal remotes;
    mapping(address => TokenId) internal reprToCanonical;
    mapping(bytes32 => address) internal canoncialToRepr;

    constructor() UsingOptics() {}

    modifier typeAssert(bytes29 _view, BridgeMessage.Types _t) {
        _view.assertType(uint40(_t));
        _;
    }

    function enrollRemote(uint32 _origin, bytes32 _router) external onlyOwner {
        remotes[_origin] = _router;
    }

    function mustGetRemote(uint32 _domain)
        internal
        view
        returns (bytes32 _remote)
    {
        _remote = remotes[_domain];
        require(_remote != bytes32(0), "!remote");
    }

    function isRemoteRouter(uint32 _origin, bytes32 _router)
        internal
        view
        returns (bool)
    {
        return remotes[_origin] == _router;
    }

    modifier onlyRemoteRouter(uint32 _origin, bytes32 _router) {
        require(isRemoteRouter(_origin, _router));
        _;
    }

    function isNative(BridgeTokenI _token) internal view returns (bool) {
        return tokenIdFor(address(_token)).domain == home.originSLIP44();
    }

    function reprFor(bytes29 _tokenId)
        internal
        view
        typeAssert(_tokenId, BridgeMessage.Types.TokenId)
        returns (BridgeTokenI)
    {
        return BridgeTokenI(canoncialToRepr[_tokenId.keccak()]);
    }

    function tokenIdFor(address _token)
        internal
        view
        returns (TokenId memory _id)
    {
        _id = reprToCanonical[_token];
        if (_id.domain == 0) {
            _id.domain = home.originSLIP44();
            _id.id = bytes32(uint256(uint160(_token)));
        }
    }

    function ensureToken(bytes29 _tokenId)
        internal
        view
        typeAssert(_tokenId, BridgeMessage.Types.TokenId)
        returns (BridgeTokenI)
    {
        // TODO: Clone factory on standard bridge token contract
    }

    function handle(
        uint32 _origin,
        bytes32 _sender,
        bytes memory _message
    )
        external
        override
        onlyReplica
        onlyRemoteRouter(_origin, _sender) // hate this
        returns (bytes memory)
    {
        bytes29 _msg = _message.ref(0).mustBeMessage();
        bytes29 _tokenId = _msg.tokenId();
        bytes29 _action = _msg.action();
        if (_action.isXfer()) {
            return handleXfer(_tokenId, _action);
        }
        if (_action.isDetails()) {
            return handleDetails(_tokenId, _action);
        }
        require(false, "!action");
        return hex"";
    }

    function handleXfer(bytes29 _tokenId, bytes29 _action)
        internal
        typeAssert(_tokenId, BridgeMessage.Types.TokenId)
        typeAssert(_action, BridgeMessage.Types.Xfer)
        returns (bytes memory)
    {
        BridgeTokenI _token = ensureToken(_tokenId);

        if (isNative(_token)) {
            _token.transfer(_action.toAsAddress(), _action.amnt());
        } else {
            _token.mint(_action.toAsAddress(), _action.amnt());
        }

        return hex"";
    }

    function handleDetails(bytes29 _tokenId, bytes29 _action)
        internal
        typeAssert(_tokenId, BridgeMessage.Types.TokenId)
        typeAssert(_action, BridgeMessage.Types.Details)
        returns (bytes memory)
    {
        BridgeTokenI _token = ensureToken(_tokenId);
        require(!isNative(_token), "!repr");

        _token.setDetails(_action.name(), _action.symbol(), _action.decimals());

        return hex"";
    }

    function send(
        address _token,
        uint32 _destination,
        bytes32 _recipient,
        uint256 _amnt
    ) external {
        BridgeTokenI _tok = BridgeTokenI(_token);

        if (isNative(_tok)) {
            _tok.transferFrom(msg.sender, address(this), _amnt);
        } else {
            _tok.burn(msg.sender, _amnt);
        }

        TokenId memory _tokId = tokenIdFor(_token);
        bytes29 _tokenId =
            BridgeMessage.formatTokenId(_tokId.domain, _tokId.id);
        bytes29 _action = BridgeMessage.formatXfer(_recipient, _amnt);

        home.enqueue(
            _destination,
            mustGetRemote(_destination),
            BridgeMessage.formatMessage(_tokenId, _action)
        );
    }

    function updateDetails(address _token, uint32 _destination) external {
        BridgeTokenI _tok = BridgeTokenI(_token);

        TokenId memory _tokId = tokenIdFor(_token);
        bytes29 _tokenId =
            BridgeMessage.formatTokenId(_tokId.domain, _tokId.id);

        bytes29 _action =
            BridgeMessage.formatDetails(
                coerceBytes32(_tok.name()),
                coerceBytes32(_tok.symbol()),
                _tok.decimals()
            );

        home.enqueue(
            _destination,
            mustGetRemote(_destination),
            BridgeMessage.formatMessage(_tokenId, _action)
        );
    }
}

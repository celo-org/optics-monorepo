// SPDX-License-Identifier: MIT OR Apache-2.0
pragma solidity >=0.6.11;

import {TypedMemView} from "@summa-tx/memview-sol/contracts/TypedMemView.sol";

import {
    OpticsHandlerI,
    UsingOptics,
    TypeCasts
} from "@celo-org/optics-sol/contracts/UsingOptics.sol";

import {GovernanceMessage} from "./GovernanceMessage.sol";

contract GovernanceRouter is OpticsHandlerI, UsingOptics {
    using TypedMemView for bytes;
    using TypedMemView for bytes29;
    using GovernanceMessage for bytes29;

    uint32 public governorDomain; // domain of Governor chain -- for accepting incoming messages from Governor
    address public governor; // the local entity empowered to call governance functions

    mapping(uint32 => bytes32) public routers; // registry of domain -> remote GovernanceRouter contract address
    uint32[] public domains; // array of all domains registered

    event TransferGovernor(
        uint32 previousGovernorDomain,
        uint32 newGovernorDomain,
        address indexed previousGovernor,
        address indexed newGovernor
    );

    constructor() {
        address _governor = msg.sender;

        uint32 _localDomain = localDomain();
        bool _isLocalDomain = true;

        _transferGovernor(_localDomain, _governor, _isLocalDomain);
    }

    modifier typeAssert(bytes29 _view, GovernanceMessage.Types _t) {
        _view.assertType(uint40(_t));
        _;
    }

    modifier onlyGovernor() {
        require(msg.sender == governor, "Caller is not the governor");
        _;
    }

    /*
    --- MESSAGE HANDLING ---
    */

    function isGovernorRouter(uint32 _domain, bytes32 _address)
        internal
        view
        returns (bool _isGovernorRouter)
    {
        _isGovernorRouter =
            _domain == governorDomain &&
            _address == routers[_domain];
    }

    modifier onlyGovernorRouter(uint32 _domain, bytes32 _address) {
        require(isGovernorRouter(_domain, _address), "!governorRouter");
        _;
    }

    function mustHaveRouter(uint32 _domain)
        internal
        view
        returns (bytes32 _router)
    {
        _router = routers[_domain];
        require(_router != bytes32(0), "!router");
    }

    function localDomain() internal view returns (uint32 _localDomain) {
        _localDomain = home.originDomain();
    }

    function isLocalDomain(uint32 _domain)
        internal
        view
        returns (bool _isLocalDomain)
    {
        _isLocalDomain = _domain == localDomain();
    }

    function handle(
        uint32 _origin,
        bytes32 _sender,
        bytes memory _message
    )
        external
        override
        onlyReplica
        onlyGovernorRouter(_origin, _sender)
        returns (bytes memory _ret)
    {
        bytes29 _msg = _message.ref(0);

        if (_msg.isValidCall()) {
            return handleCall(_msg.tryAsCall());
        } else if (_msg.isValidTransferGovernor()) {
            return handleTransferGovernor(_msg.tryAsTransferGovernor());
        } else if (_msg.isValidEnrollRouter()) {
            return handleEnrollRouter(_msg.tryAsEnrollRouter());
        }

        require(false, "!valid message type");
    }

    function handleCall(bytes29 _msg)
        internal
        typeAssert(_msg, GovernanceMessage.Types.Call)
        returns (bytes memory _ret)
    {
        bytes32 _to = _msg.addr();
        bytes memory _data = _msg.data();

        _call(_to, _data);

        return hex"";
    }

    function handleTransferGovernor(bytes29 _msg)
        internal
        typeAssert(_msg, GovernanceMessage.Types.TransferGovernor)
        returns (bytes memory _ret)
    {
        uint32 _newDomain = _msg.domain();
        address _newGovernor = TypeCasts.bytes32ToAddress(_msg.governor());

        bool _isLocalDomain = isLocalDomain(_newDomain);

        _transferGovernor(_newDomain, _newGovernor, _isLocalDomain);

        return hex"";
    }

    function handleEnrollRouter(bytes29 _msg)
        internal
        typeAssert(_msg, GovernanceMessage.Types.EnrollRouter)
        returns (bytes memory _ret)
    {
        uint32 _domain = _msg.domain();
        bytes32 _router = _msg.router();

        _enrollRouter(_domain, _router);

        return hex"";
    }

    /*
    --- MESSAGE DISPATCHING ---
        only called on the Governor chain
        governor is 0x00 for all other chains
    */

    function callLocal(bytes32 _to, bytes memory _data)
        external
        onlyGovernor
        returns (bytes memory _ret)
    {
        _ret = _call(_to, _data);
    }

    function callRemote(
        uint32 _destination,
        bytes32 _to,
        bytes memory _data
    ) external onlyGovernor {
        bytes32 _router = mustHaveRouter(_destination);

        home.enqueue(
            _destination,
            _router,
            GovernanceMessage.formatCall(_to, _data)
        );
    }

    function transferGovernor(uint32 _newDomain, address _newGovernor)
        external
        onlyGovernor
    {
        bool _isLocalDomain = isLocalDomain(_newDomain);

        _transferGovernor(_newDomain, _newGovernor, _isLocalDomain); // transfer the governor locally

        if (_isLocalDomain) {
            // if the governor domain is local, we only need to change the governor address locally
            // no need to message remote routers; they should already have the same domain set and governor = bytes32(0)
            return;
        }

        bytes memory transferGovernorMessage =
            GovernanceMessage.formatTransferGovernor(_newDomain, _newGovernor);

        _sendToAllRemoteRouters(transferGovernorMessage);
    }

    function enrollRouter(uint32 _domain, bytes32 _router)
        external
        onlyGovernor
    {
        _enrollRouter(_domain, _router); // enroll the router locally

        bytes memory enrollRouterMessage =
            GovernanceMessage.formatEnrollRouter(_domain, _router);

        _sendToAllRemoteRouters(enrollRouterMessage);
    }

    function _sendToAllRemoteRouters(bytes memory _msg) internal {
        for (uint256 i = 0; i < domains.length; i++) {
            if (domains[i] != uint32(0)) {
                home.enqueue(domains[i], routers[domains[i]], _msg);
            }
        }
    }

    /*
    --- INTERNAL FUNCTIONS ---
        perform the actions locally
        called when handling AND dispatching messages
    */

    function _call(bytes32 _to, bytes memory _data)
        internal
        returns (bytes memory _ret)
    {
        address _toContract = TypeCasts.bytes32ToAddress(_to);

        bool _success;
        (_success, _ret) = _toContract.call(_data);

        require(_success, "call failed");
    }

    function _transferGovernor(
        uint32 _newDomain,
        address _newGovernor,
        bool _isLocalDomain
    ) internal {
        // require that the governor domain has a valid router
        if (!_isLocalDomain) {
            mustHaveRouter(_newDomain);
        }

        // Governor is 0x0 unless the governor is local
        address _governor = _isLocalDomain ? _newGovernor : address(0);

        emit TransferGovernor(governorDomain, _newDomain, governor, _governor);

        governorDomain = _newDomain;
        governor = _governor;
    }

    function _enrollRouter(uint32 _domain, bytes32 _router) internal {
        if (_router == bytes32(0)) {
            return _removeRouter(_domain);
        }

        // if this domain being added (rather than modified) we must push it to domains[]
        bool _isNewDomain = routers[_domain] == bytes32(0);

        routers[_domain] = _router;

        if (_isNewDomain) {
            domains.push(_domain);
        }
    }

    function _removeRouter(uint32 _domain) internal {
        delete routers[_domain];

        // find the index of the domain to remove & delete it from domains[]
        for (uint256 i = 0; i < domains.length; i++) {
            if (domains[i] == _domain) {
                delete domains[i];
                return;
            }
        }
    }

    /*
    --- SETUP ROUTER MAPPING ---
        convenience function so deployer can setup the router mapping for the contract locally
        before transferring governorship to the remote governor
    */

    function enrollRouterSetup(uint32 _domain, bytes32 _router)
        external
        onlyGovernor
    {
        _enrollRouter(_domain, _router); // enroll the router locally
    }
}

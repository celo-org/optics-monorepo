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

    /*
    --- STATE ---
    */

    uint32 public governorDomain; // domain of Governor chain -- for accepting incoming messages from Governor
    address public governor; // the local entity empowered to call governance functions

    mapping(uint32 => bytes32) public routers; // registry of domain -> remote GovernanceRouter contract address
    uint32[] public domains; // array of all domains registered

    /*
    --- EVENTS ---
    */

    event TransferGovernor(
        uint32 previousGovernorDomain,
        uint32 newGovernorDomain,
        address indexed previousGovernor,
        address indexed newGovernor
    );
    event ChangeRouter(
        uint32 indexed domain,
        bytes32 previousRouter,
        bytes32 newRouter
    );

    /*
    --- CONSTRUCTOR ---
    */

    constructor() {
        address _governor = msg.sender;

        uint32 _localDomain = localDomain();
        bool _isLocalDomain = true;

        _transferGovernor(_localDomain, _governor, _isLocalDomain);
    }

    /*
    --- FUNCTION MODIFIERS ---
    */

    modifier typeAssert(bytes29 _view, GovernanceMessage.Types _t) {
        _view.assertType(uint40(_t));
        _;
    }

    modifier onlyGovernor() {
        require(msg.sender == governor, "Caller is not the governor");
        _;
    }

    modifier onlyGovernorRouter(uint32 _domain, bytes32 _address) {
        require(isGovernorRouter(_domain, _address), "!governorRouter");
        _;
    }

    /*
    --- DOMAIN/ADDRESS VALIDATION HELPERS  ---
    */

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

    function isGovernorRouter(uint32 _domain, bytes32 _address)
        internal
        view
        returns (bool _isGovernorRouter)
    {
        _isGovernorRouter =
        _domain == governorDomain &&
        _address == routers[_domain];
    }

    function mustHaveRouter(uint32 _domain)
        internal
        view
        returns (bytes32 _router)
    {
        _router = routers[_domain];
        require(_router != bytes32(0), "!router");
    }

    /*
    --- MESSAGE HANDLING ---
        for all non-Governor chains to handle messages
        sent from the Governor chain via Optics
        --
        Governor chain should never receive messages,
        because non-Governor chains are not able to send them
    */

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
        for the Governor chain to send messages
        to other chains via Optics
        --
        functionality not accessible on non-Governor chains
        (governor is set to 0x0 on non-Governor chains)
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
            GovernanceMessage.formatTransferGovernor(_newDomain, TypeCasts.addressToBytes32(_newGovernor));

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
    --- ACTIONS IMPLEMENTATION ---
        implementations of local state changes
        performed when handling AND dispatching messages
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

    function _enrollRouter(uint32 _domain, bytes32 _newRouter) internal {
        bytes32 _previousRouter = routers[_domain];

        emit ChangeRouter(_domain, _previousRouter, _newRouter);

        if (_newRouter == bytes32(0)) {
            _removeDomain(_domain);
            return;
        }

        if (_previousRouter == bytes32(0)) {
            _addDomain(_domain);
        }

        routers[_domain] = _newRouter;
    }

    function _addDomain(uint32 _domain) internal {
        domains.push(_domain);
    }

    function _removeDomain(uint32 _domain) internal {
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
    --- EXTERNAL HELPER FOR CONTRACT SETUP ---
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

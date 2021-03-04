// SPDX-License-Identifier: MIT OR Apache-2.0
pragma solidity >=0.6.11;

import {TypedMemView} from "@summa-tx/memview-sol/contracts/TypedMemView.sol";

import {
    OpticsHandlerI,
    UsingOptics,
    TypeCasts
} from "@celo-org/optics-sol/contracts/UsingOptics.sol";

import {GovernanceMessage} from "./GovernanceMessage.sol";

//TODO: array of all domains with routers that we can loop through
//TODO: loop through all domains, get router, send message

contract GovernanceRouter is OpticsHandlerI, UsingOptics {
    using TypedMemView for bytes;
    using TypedMemView for bytes29;
    using GovernanceMessage for bytes29;

    uint32 public governorDomain; // domain of Governor chain -- for accepting incoming messages from Governor
    address public governor; // the local entity empowered to call governance functions

    mapping(uint32 => bytes32) public routers; //registry of domain -> remote GovernanceRouter contract address
    uint32[] public domains; //array of all domains registered

    constructor() {
        governor = msg.sender;
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

    function mustBeValidGovernorDomain(uint32 _domain)
        internal
        view
        returns (bool _isLocalDomain)
    {
        _isLocalDomain = _domain == home.originDomain();

        if (!_isLocalDomain) {
            mustHaveRouter(_domain);
        }
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
        bytes32 _governor = _msg.addr();
        uint32 _domain = _msg.domain();

        _transferGovernor(_governor, _domain);

        return hex"";
    }

    function handleEnrollRouter(bytes29 _msg)
        internal
        typeAssert(_msg, GovernanceMessage.Types.EnrollRouter)
        returns (bytes memory _ret)
    {
        bytes32 _router = _msg.addr();
        uint32 _domain = _msg.domain();

        _enrollRouter(_router, _domain);

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
        (_ret) = _call(_to, _data);
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

    function transferGovernor(bytes32 _newGovernor, uint32 _newDomain)
        external
        onlyGovernor
    {
        bool _isLocalDomain = _transferGovernor(_newGovernor, _newDomain); //transfer the governor locally

        if (_isLocalDomain) {
            // if the governor domain is local, we only need to change the governor address locally
            // no need to message remote routers; they should already have the same domain set and governor = bytes32(0)
            return;
        }

        bytes memory transferGovernorMessage =
            GovernanceMessage.formatTransferGovernor(_newGovernor, _newDomain);

        _sendToAllRemoteRouters(transferGovernorMessage);
    }

    function enrollRouter(bytes32 _router, uint32 _domain)
        external
        onlyGovernor
    {
        _enrollRouter(_router, _domain); //enroll the router locally

        bytes memory enrollRouterMessage =
            GovernanceMessage.formatEnrollRouter(_router, _domain);

        _sendToAllRemoteRouters(enrollRouterMessage);
    }

    function _sendToAllRemoteRouters(bytes memory _msg) internal {
        for (uint256 i = 0; i < domains.length; i++) {
            home.enqueue(domains[i], routers[domains[i]], _msg);
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

    function _transferGovernor(bytes32 _newGovernor, uint32 _newDomain)
        internal
        returns (bool _isLocalDomain)
    {
        _isLocalDomain = mustBeValidGovernorDomain(_newDomain);

        if (governorDomain != _newDomain) {
            //Update the governorDomain if necessary
            governorDomain = _newDomain;
        }

        address _governor =
            _isLocalDomain
                ? TypeCasts.bytes32ToAddress(_newGovernor)
                : address(0); //Governor is 0x0 if the governor is not local
        if (governor != _governor) {
            //Update the governor if necessary
            governor = _governor;
        }
    }

    function _enrollRouter(bytes32 _router, uint32 _domain) internal {
        if (_router == bytes32(0)) {
            return _removeRouter(_domain);
        }

        bool _isNewDomain = routers[_domain] == bytes32(0);

        routers[_domain] = _router; //add domain->router to routers mapping

        if (_isNewDomain) {
            domains.push(_domain); //push domain to domains array
        }
    }

    function _removeRouter(uint32 _domain) internal {
        delete routers[_domain]; //remove domain from routers mapping

        //remove domain from domains array
        for (uint256 i = 0; i < domains.length; i++) {
            //find the index of the domain to remove
            if (domains[i] == _domain) {
                _deleteFromDomainsAtIndex(i);
                return;
            }
        }
    }

    function _deleteFromDomainsAtIndex(uint256 i) internal {
        //if the index is not the end in the array
        if (i < domains.length - 1) {
            //move the last element in the array to that index
            domains[i] = domains[domains.length - 1];
        }
        //delete the last element from the array
        delete domains[domains.length - 1];
        domains.length--;
    }

    /*
    --- SETUP ROUTER MAPPING ---
        convenience function so deployer can setup the router mapping for the contract locally
        before transferring governorship to the remote governor
    */

    function enrollRouterSetup(bytes32 _router, uint32 _domain)
        external
        onlyGovernor
    {
        _enrollRouter(_router, _domain); //enroll the router locally
    }
}

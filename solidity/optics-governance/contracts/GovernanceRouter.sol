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

    uint32 ownerDomain; // domain of Owner chain -- for accepting incoming messages from Owner
    bytes32 localOwner; // local owner address -- address(0) for non-owner chain

    mapping(uint32 => bytes32) internal routers; //registry of domain -> remote GovernanceRouter contract address

    constructor() {}

    modifier typeAssert(bytes29 _view, GovernanceMessage.Types _t) {
        _view.assertType(uint40(_t));
        _;
    }

    /*
    --- MESSAGE HANDLING ---
    */

    function isOwnerRouter(uint32 _domain, bytes32 _address)
        internal
        view
        returns (bool _isOwnerRouter)
    {
        return _domain == ownerDomain && _address == routers[_domain];
    }

    modifier onlyOwnerRouter(uint32 _domain, bytes32 _address) {
        require(isOwnerRouter(_domain, _address));
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

    function mustBeValidOwnerDomain(uint32 _domain)
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
        onlyOwnerRouter(_origin, _sender)
        returns (bytes memory _ret)
    {
        bytes29 _msg = _message.ref(0);

        if (_msg.isCall()) {
            return handleCall(_msg);
        } else if (_msg.isTransferOwner()) {
            return handleTransferOwner(_msg);
        } else if (_msg.isEnrollRouter()) {
            return handleEnrollRouter(_msg);
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

    function handleTransferOwner(bytes29 _msg)
        internal
        typeAssert(_msg, GovernanceMessage.Types.TransferOwner)
        returns (bytes memory _ret)
    {
        bytes32 _owner = _msg.addr();
        uint32 _domain = _msg.domain();

        _transferOwner(_owner, _domain);

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
        only called on the Owner chain
        owner is 0x00 for all other chains
    */

    function callLocal(bytes32 _to, bytes memory _data)
        external
        onlyOwner
        returns (bytes memory _ret)
    {
        (_ret) = _call(_to, _data);
    }

    function callRemote(
        uint32 _destination,
        bytes32 _to,
        bytes memory _data
    ) external onlyOwner {
        bytes32 _router = mustHaveRouter(_destination);

        home.enqueue(
            _destination,
            _router,
            GovernanceMessage.formatCall(_to, _data)
        );
    }

    function transferOwner(bytes32 _newOwner, uint32 _newDomain)
        external
        onlyOwner
    {
        bool _isLocalDomain = _transferOwner(_newOwner, _newDomain); //transfer the owner locally

        if (_isLocalDomain) {
            // if the owner domain is local, we only need to change the owner address locally
            // no need to message remote routers; they should already have the same domain set and owner = bytes32(0)
            return;
        }

        bytes29 transferOwnerMessage =
            GovernanceMessage.formatTransferOwner(_newOwner, _newDomain);

        /*
        TODO:
        - get [domain, address] of all of the remote GovernanceRouters
        - home.enqueueBatch -- broadcast the same message to an array of [domain, recipient]s (not-yet-implemented ability of Optics -- used for governance specifically -- only callable by Governance Router, which should own the Home)
        */
    }

    function enrollRouter(bytes32 _router, uint32 _domain) external onlyOwner {
        _enrollRouter(_router, _domain); //enroll the router locally

        bytes29 enrollRouterMessage =
            GovernanceMessage.formatEnrollRouter(_router, _domain);

        /*
        TODO:
        - get [domain, address] of all of the remote GovernanceRouters
        - home.enqueueBatch -- broadcast the same message to an array of [domain, recipient]s (not-yet-implemented ability of Optics -- used for governance specifically -- only callable by Governance Router, which should own the Home)
        */
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

    function _transferOwner(bytes32 _newOwner, uint32 _newDomain)
        internal
        returns (bool _isLocalDomain)
    {
        _isLocalDomain = mustBeValidOwnerDomain(_newDomain);

        if (ownerDomain != _newDomain) {
            //Update the ownerDomain if necessary
            ownerDomain = _newDomain;
        }

        bytes32 _owner = _isLocalDomain ? _newOwner : bytes32(0); //Owner is set to 0 if the owner is not local
        if (localOwner != _owner) {
            //Update the owner if necessary
            localOwner = _owner;
        }
    }

    function _enrollRouter(bytes32 _router, uint32 _domain) internal {
        routers[_domain] = _router; //TODO: we will overwrite any existing router; but we want the flexibility to be able to do this, I believe
    }

    /*
    --- SETUP ROUTER MAPPING ---
        convenience function so deployer can setup the router mapping for the contract locally
        before transferring ownership to the remote router
    */

    function enrollRouterSetup(bytes32 _router, uint32 _domain)
        external
        onlyOwner
    {
        _enrollRouter(_router, _domain); //enroll the router locally
    }
}

// SPDX-License-Identifier: MIT OR Apache-2.0
pragma solidity >=0.6.11;

import {TypedMemView} from "@summa-tx/memview-sol/contracts/TypedMemView.sol";

import {
    OpticsHandlerI,
    UsingOptics
} from "@celo-org/optics-sol/contracts/UsingOptics.sol";

import {GovernanceMessage} from "./GovernanceMessage.sol";

//TODO: array of all domains with routers that we can loop through
//TODO: loop through all domains, get router, send message

contract GovernanceRouter is OpticsHandlerI, UsingOptics {
    using TypedMemView for bytes;
    using TypedMemView for bytes29;
    using GovernanceMessage for bytes29;

    uint32 ownerDomain;     // domain of Owner chain -- for accepting incoming messages from Owner
    bytes32 owner;          // local owner address -- address(0) for non-owner chain

    mapping(uint32 => bytes32) internal routers; //registry of domain -> remote GovernanceRouter contract address

    constructor() {}

    /*
    --- MESSAGE HANDLING ---
    */

    function isOwnerRouter(uint32 _domain, bytes32 _address)
    internal
    view
    returns (bool)
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

    function handle(
        uint32 _origin,
        bytes32 _sender,
        bytes memory _message
    )
        external
        override
        onlyReplica
        onlyOwnerRouter(_origin, _sender)
        returns (bytes memory)
    {
        bytes29 _msg = _message.ref(0);

        if (_msg.isCall()) {
            return handleCall(_msg);
        } else if (_msg.isTransferOwner()){
            return handleTransferOwner(_msg);
        } else if (_msg.isEnrollRouter()){
            return handleEnrollRouter(_msg);
        }

        require(false, "!valid message type");
        return hex"";
    }

    function handleCall(bytes29 _msg)
        internal
        typeAssert(_msg, GovernanceMessage.Types.Call)
        returns (bytes memory)
    {
        bytes32 _to = _msg.addr();
        bytes memory _data = _msg.data();

        _call(_to, _data);

        return hex"";
    }

    function handleTransferOwner(bytes29 _msg)
        internal
        typeAssert(_msg, GovernanceMessage.Types.TransferOwner)
        returns (bytes memory)
    {
        bytes32 _owner = _msg.addr();
        uint32 _domain = _msg.domain();

        _transferOwner(_owner, _domain);

        return hex"";
    }

    function handleEnrollRouter(bytes29 _msg)
        internal
        typeAssert(_msg, GovernanceMessage.Types.EnrollRouter)
        returns (bytes memory)
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

    function callLocal(
        bytes32 _to,
        bytes memory _data
    ) external onlyOwner {
        return _call(_to, _data);
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

    function transferOwner(
        bytes32 _owner,
        uint32 _domain
    ) external onlyOwner {
        _transferOwner(_owner, _domain); //transfer the owner locally

        bytes29 transferOwnerMessage = GovernanceMessage.formatTransferOwner(_owner, _domain);

        /*
        TODO:
        - get [domain, address] of all of the remote GovernanceRouters
        - home.enqueueBatch -- broadcast the same message to an array of [domain, recipient]s (not-yet-implemented ability of Optics -- used for governance specifically -- only callable by Governance Router, which should own the Home)
        */
    }

    function enrollRouter(
        bytes32 _router,
        uint32 _domain
    ) external onlyOwner {
        _enrollRouter(_router, _domain); //enroll the router locally

        bytes29 enrollRouterMessage = GovernanceMessage.formatEnrollRouter(_router, _domain);

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

    function _call(
        bytes32 _to,
        bytes memory _data
    ) internal {
        address _toContract = address(_to);

        (_success, _ret) = _toContract.call(payload);

        require(_success, "call failed");

        return _ret;
    }

    function _transferOwner(
        bytes32 _owner,
        uint32 _domain
    ) internal {
        _router = mustHaveRouter(_domain);
        ownerDomain = _domain;

        if(_router = bytes32(address(this))) { //TODO: is this secure? good style? we want the routers[] array to have all routers, inclusive of the local one
            owner = _owner;
        } else if(owner != bytes32(0)){
            owner = bytes32(0);
        }
    }

    function _enrollRouter(
        bytes32 _router,
        uint32 _domain
    ) internal {
        routers[_domain] = _router; //TODO: we will overwrite any existing router; but we want the flexibility to be able to do this, I believe
    }

    /*
    --- SETUP FUNCTIONS ---
        convenience so deployer can setup the contract locally
        before transferring ownership to the remote router
    */

    function transferOwnerSetup(
        bytes32 _owner,
        uint32 _domain
    ) external onlyOwner {
        _transferOwner(_owner, _domain); //transfer the owner locally
    }

    function enrollRouterSetup(
        bytes32 _router,
        uint32 _domain
    ) external onlyOwner {
        _enrollRouter(_router, _domain); //enroll the router locally
    }
}

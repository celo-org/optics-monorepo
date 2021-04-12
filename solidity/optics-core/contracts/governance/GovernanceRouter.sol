// SPDX-License-Identifier: MIT OR Apache-2.0
pragma solidity >=0.6.11;
pragma experimental ABIEncoderV2;

import {TypedMemView} from "@summa-tx/memview-sol/contracts/TypedMemView.sol";

import {Home} from "../Home.sol";
import {XAppConnectionManager, TypeCasts} from "../XAppConnectionManager.sol";
import {IMessageRecipient} from "../../interfaces/IMessageRecipient.sol";
import {GovernanceMessage} from "./GovernanceMessage.sol";

contract GovernanceRouter is IMessageRecipient {
    using TypedMemView for bytes;
    using TypedMemView for bytes29;
    using GovernanceMessage for bytes29;

    XAppConnectionManager public xAppConnectionManager;

    uint32 public immutable localDomain;
    uint32 public governorDomain; // domain of Governor chain -- for accepting incoming messages from Governor
    address public governor; // the local entity empowered to call governance functions, set to 0x0 on non-Governor chains

    mapping(uint32 => bytes32) public routers; // registry of domain -> remote GovernanceRouter contract address
    uint32[] public domains; // array of all domains registered

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

    constructor(uint32 _localDomain) {
        localDomain = _localDomain;
    }

    function initialize(address _xAppConnectionManager) public {
        // initialize governor
        require(
            governorDomain == 0 && governor == address(0),
            "governor already initialized"
        );

        address _governor = msg.sender;
        bool _isLocalDomain = true;
        _transferGovernor(localDomain, _governor, _isLocalDomain);

        // initialize XAppConnectionManager
        setXAppConnectionManager(_xAppConnectionManager);

        require(
            xAppConnectionManager.localDomain() == localDomain,
            "XAppConnectionManager bad domain"
        );
    }

    modifier onlyReplica() {
        require(xAppConnectionManager.isReplica(msg.sender), "!replica");
        _;
    }

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

    /**
     * @notice Message handler
     *
     * For all non-Governor chains to handle messages
     * sent from the Governor chain via Optics.
     *
     * Governor chain should never receive messages,
     * because non-Governor chains are not able to send them
     * @param _origin The domain (of the Governor Router)
     * @param _sender The sender
     * @param _message The message
     * @return _ret
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

    /**
     * @notice Dispatches local call
     * @param _calls The calls
     */
    function callLocal(GovernanceMessage.Call[] calldata _calls)
        external
        onlyGovernor
    {
        for (uint256 i = 0; i < _calls.length; i++) {
            _dispatchCall(_calls[i]);
        }
    }

    /**
     * @notice Dispatches call to remote router
     * @param _destination The destination router
     * @param _calls The calls
     */
    function callRemote(
        uint32 _destination,
        GovernanceMessage.Call[] calldata _calls
    ) external onlyGovernor {
        bytes32 _router = mustHaveRouter(_destination);
        bytes memory _msg = GovernanceMessage.formatCalls(_calls);

        Home(xAppConnectionManager.home()).enqueue(_destination, _router, _msg);
    }

    /**
     * @notice Transfer governorship to a new domain
     * @param _newDomain The domain of the new governor
     * @param _newGovernor The address of the new governor
     */
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
            GovernanceMessage.formatTransferGovernor(
                _newDomain,
                TypeCasts.addressToBytes32(_newGovernor)
            );

        _sendToAllRemoteRouters(transferGovernorMessage);
    }

    /**
     * @notice Enrolls a new router for a given domain and dispatches to all
     * remote routers
     * @param _domain The domain
     * @param _router The new router
     */
    function enrollRouter(uint32 _domain, bytes32 _router)
        external
        onlyGovernor
    {
        _enrollRouter(_domain, _router); // enroll the router locally

        bytes memory enrollRouterMessage =
            GovernanceMessage.formatEnrollRouter(_domain, _router);

        _sendToAllRemoteRouters(enrollRouterMessage);
    }

    /**
     * @notice Enrolls a router locally
     *
     * @dev External helper for contract setup.
     *
     * convenience function so deployer can setup the router mapping for the
     * contract locally before transferring to a new domain to the remote governor.
     * @param _domain The domain
     * @param _router The new router
     */
    function enrollRouterSetup(uint32 _domain, bytes32 _router)
        external
        onlyGovernor
    {
        _enrollRouter(_domain, _router); // enroll the router locally
    }

    /**
     * @notice Sets up XAppConnectionManager
     * @dev Domain/address validation helper
     * @param _xAppConnectionManager The address of the new xAppConnectionManager
     */
    function setXAppConnectionManager(address _xAppConnectionManager)
        public
        onlyGovernor
    {
        xAppConnectionManager = XAppConnectionManager(_xAppConnectionManager);
    }

    /**
     * @notice Handles dispatching a call
     * @param _msg The message
     * @return _ret
     */
    function handleCall(bytes29 _msg)
        internal
        typeAssert(_msg, GovernanceMessage.Types.Call)
        returns (bytes memory _ret)
    {
        GovernanceMessage.Call[] memory _calls = _msg.getCalls();
        for (uint256 i = 0; i < _calls.length; i++) {
            _dispatchCall(_calls[i]);
        }

        return hex"";
    }

    /**
     * @notice Handles transfer to a new Governor
     * @param _msg The message
     * @return _ret
     */
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

    /**
     * @notice Handles enrolling a router
     * @param _msg The message
     * @return _ret
     */
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

    /**
     * @notice Dispatches message to all remote routers
     * @param _msg The message
     */
    function _sendToAllRemoteRouters(bytes memory _msg) internal {
        Home home = Home(xAppConnectionManager.home());

        for (uint256 i = 0; i < domains.length; i++) {
            if (domains[i] != uint32(0)) {
                home.enqueue(domains[i], routers[domains[i]], _msg);
            }
        }
    }

    /**
     * @notice Dispatches call
     * @param _call The call
     * @return _ret
     */
    function _dispatchCall(GovernanceMessage.Call memory _call)
        internal
        returns (bytes memory _ret)
    {
        address _toContract = TypeCasts.bytes32ToAddress(_call.to);

        bool _success;
        (_success, _ret) = _toContract.call(_call.data);

        require(_success, "call failed");
    }

    /**
     * @notice Transfers governorship to a new domain
     * @param _newDomain The new domain
     * @param _newGovernor The address of the new governor
     */
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

    /**
     * @notice Enrolls a new router for a given domain
     * @param _domain The domain
     * @param _newRouter The new router
     */
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

    /**
     * @notice Adds a given domain
     * @param _domain The domain
     */
    function _addDomain(uint32 _domain) internal {
        domains.push(_domain);
    }

    /**
     * @notice Removes a domain and its associated router
     * @param _domain The domain
     */
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

    /**
     * @notice Determines if a given domain and address is the Governor Router
     * @param _domain The domain
     * @param _address The address of the domain's router
     * @return _isGovernorRouter True if the given domain/address is the
     * Governor Router.
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

    /**
     * @notice Requires that a domain have a router and returns the router
     * @param _domain The domain
     * @return _router - The domain's router
     */
    function mustHaveRouter(uint32 _domain)
        internal
        view
        returns (bytes32 _router)
    {
        _router = routers[_domain];
        require(_router != bytes32(0), "!router");
    }

    /**
     * @notice Determines if a given domain is the local domain
     * @param _domain The domain
     * @return _isLocalDomain - True if the given domain is the local domain
     */
    function isLocalDomain(uint32 _domain)
        internal
        view
        returns (bool _isLocalDomain)
    {
        _isLocalDomain = _domain == localDomain;
    }
}

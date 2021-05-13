// SPDX-License-Identifier: MIT OR Apache-2.0
pragma solidity >=0.6.11;
pragma experimental ABIEncoderV2;

import {Initializable} from "@openzeppelin/contracts/proxy/Initializable.sol";
import {TypedMemView} from "@summa-tx/memview-sol/contracts/TypedMemView.sol";

import {Home} from "../Home.sol";
import {XAppConnectionManager, TypeCasts} from "../XAppConnectionManager.sol";
import {IMessageRecipient} from "../../interfaces/IMessageRecipient.sol";
import {GovernanceMessage} from "./GovernanceMessage.sol";

contract GovernanceRouter is Initializable, IMessageRecipient {
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
    event SetRouter(
        uint32 indexed domain,
        bytes32 previousRouter,
        bytes32 newRouter
    );

    constructor(uint32 _localDomain) {
        localDomain = _localDomain;
    }

    function initialize(address _xAppConnectionManager) public initializer {
        // initialize governor
        address _governorAddr = msg.sender;
        bool _isLocalGovernor = true;
        _transferGovernor(localDomain, _governorAddr, _isLocalGovernor);

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

    modifier typeAssert(bytes29 _view, GovernanceMessage.Types _type) {
        _view.assertType(uint40(_type));
        _;
    }

    modifier onlyGovernor() {
        require(msg.sender == governor, "Caller is not the governor");
        _;
    }

    modifier onlyGovernorRouter(uint32 _domain, bytes32 _address) {
        require(_isGovernorRouter(_domain, _address), "!governorRouter");
        _;
    }

    /**
     * @notice Handle Optics messages
     *
     * For all non-Governor chains to handle messages
     * sent from the Governor chain via Optics.
     *
     * Governor chain should never receive messages,
     * because non-Governor chains are not able to send them
     * @param _origin The domain (of the Governor Router)
     * @param _sender The message sender (must be the Governor Router)
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
            return _handleCall(_msg.tryAsCall());
        } else if (_msg.isValidTransferGovernor()) {
            return _handleTransferGovernor(_msg.tryAsTransferGovernor());
        } else if (_msg.isValidSetRouter()) {
            return _handleSetRouter(_msg.tryAsSetRouter());
        }

        require(false, "!valid message type");
    }

    /**
     * @notice Dispatch calls locally
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
     * @notice Dispatch calls on a remote chain via the remote GovernanceRouter
     * @param _destination The domain of the remote chain
     * @param _calls The calls
     */
    function callRemote(
        uint32 _destination,
        GovernanceMessage.Call[] calldata _calls
    ) external onlyGovernor {
        bytes32 _router = _mustHaveRouter(_destination);
        bytes memory _msg = GovernanceMessage.formatCalls(_calls);

        Home(xAppConnectionManager.home()).enqueue(_destination, _router, _msg);
    }

    /**
     * @notice Transfer governorship
     * @param _newDomain The domain of the new governor
     * @param _newGovernor The address of the new governor
     */
    function transferGovernor(uint32 _newDomain, address _newGovernor)
        external
        onlyGovernor
    {
        bool _isLocalGovernor = _isLocalDomain(_newDomain);

        _transferGovernor(_newDomain, _newGovernor, _isLocalGovernor); // transfer the governor locally

        if (_isLocalGovernor) {
            // if the governor domain is local, we only need to change the governor address locally
            // no need to message remote routers; they should already have the same domain set and governor = bytes32(0)
            return;
        }

        bytes memory _transferGovernorMessage =
            GovernanceMessage.formatTransferGovernor(
                _newDomain,
                TypeCasts.addressToBytes32(_newGovernor)
            );

        _sendToAllRemoteRouters(_transferGovernorMessage);
    }

    /**
     * @notice Set the router address for a given domain and
     * dispatch the change to all remote routers
     * @param _domain The domain
     * @param _router The address of the new router
     */
    function setRouter(uint32 _domain, bytes32 _router) external onlyGovernor {
        _setRouter(_domain, _router); // set the router locally

        bytes memory _setRouterMessage =
            GovernanceMessage.formatSetRouter(_domain, _router);

        _sendToAllRemoteRouters(_setRouterMessage);
    }

    /**
     * @notice Set the router address *locally only*
     * for the deployer to setup the router mapping locally
     * before transferring governorship to the "true" governor
     * @dev External helper for contract setup
     * @param _domain The domain
     * @param _router The new router
     */
    function setRouterDuringSetup(uint32 _domain, bytes32 _router)
        external
        onlyGovernor
    {
        _setRouter(_domain, _router); // set the router locally
    }

    /**
     * @notice Set the address of the XAppConnectionManager
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
     * @notice Handle message dispatching calls locally
     * @param _msg The message
     * @return _ret
     */
    function _handleCall(bytes29 _msg)
        internal
        typeAssert(_msg, GovernanceMessage.Types.Call)
        returns (bytes memory)
    {
        GovernanceMessage.Call[] memory _calls = _msg.getCalls();
        for (uint256 i = 0; i < _calls.length; i++) {
            _dispatchCall(_calls[i]);
        }

        return hex"";
    }

    /**
     * @notice Handle message transferring governorship to a new Governor
     * @param _msg The message
     * @return _ret
     */
    function _handleTransferGovernor(bytes29 _msg)
        internal
        typeAssert(_msg, GovernanceMessage.Types.TransferGovernor)
        returns (bytes memory)
    {
        uint32 _newDomain = _msg.domain();
        address _newGovernor = TypeCasts.bytes32ToAddress(_msg.governor());
        bool _isLocalGovernor = _isLocalDomain(_newDomain);

        _transferGovernor(_newDomain, _newGovernor, _isLocalGovernor);

        return hex"";
    }

    /**
     * @notice Handle message setting the router address for a given domain
     * @param _msg The message
     * @return _ret
     */
    function _handleSetRouter(bytes29 _msg)
        internal
        typeAssert(_msg, GovernanceMessage.Types.SetRouter)
        returns (bytes memory)
    {
        uint32 _domain = _msg.domain();
        bytes32 _router = _msg.router();

        _setRouter(_domain, _router);

        return hex"";
    }

    /**
     * @notice Dispatch message to all remote routers
     * @param _msg The message
     */
    function _sendToAllRemoteRouters(bytes memory _msg) internal {
        Home _home = Home(xAppConnectionManager.home());

        for (uint256 i = 0; i < domains.length; i++) {
            if (domains[i] != uint32(0)) {
                _home.enqueue(domains[i], routers[domains[i]], _msg);
            }
        }
    }

    /**
     * @notice Dispatch call locally
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
     * @notice Transfer governorship within this contract's state
     * @param _newDomain The domain of the new governor
     * @param _newGovernor The address of the new governor
     * @param _isLocalGovernor True if the newDomain is the localDomain
     */
    function _transferGovernor(
        uint32 _newDomain,
        address _newGovernor,
        bool _isLocalGovernor
    ) internal {
        // require that the governor domain has a valid router
        if (!_isLocalGovernor) {
            _mustHaveRouter(_newDomain);
        }

        // Governor is 0x0 unless the governor is local
        address _newGov = _isLocalGovernor ? _newGovernor : address(0);

        governorDomain = _newDomain;
        governor = _newGov;

        emit TransferGovernor(governorDomain, _newDomain, governor, _newGov);
    }

    /**
     * @notice Set the router for a given domain
     * @param _domain The domain
     * @param _newRouter The new router
     */
    function _setRouter(uint32 _domain, bytes32 _newRouter) internal {
        bytes32 _previousRouter = routers[_domain];

        emit SetRouter(_domain, _previousRouter, _newRouter);

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
     * @notice Add a domain that has a router
     * @param _domain The domain
     */
    function _addDomain(uint32 _domain) internal {
        domains.push(_domain);
    }

    /**
     * @notice Remove a domain and its associated router
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
     * @notice Determine if a given domain and address is the Governor Router
     * @param _domain The domain
     * @param _address The address of the domain's router
     * @return _ret True if the given domain/address is the
     * Governor Router.
     */
    function _isGovernorRouter(uint32 _domain, bytes32 _address)
        internal
        view
        returns (bool)
    {
        bool isGovernorRouter =
            _domain == governorDomain && _address == routers[_domain];
        bool isLocalGovernor =
            TypeCasts.bytes32ToAddress(_address) == address(this) &&
                governor != address(0);
        return isGovernorRouter || isLocalGovernor;
    }

    /**
     * @notice Determine if a given domain is the local domain
     * @param _domain The domain
     * @return _ret - True if the given domain is the local domain
     */
    function _isLocalDomain(uint32 _domain) internal view returns (bool) {
        return _domain == localDomain;
    }

    /**
     * @notice Require that a domain has a router and returns the router
     * @param _domain The domain
     * @return _router - The domain's router
     */
    function _mustHaveRouter(uint32 _domain)
        internal
        view
        returns (bytes32 _router)
    {
        _router = routers[_domain];
        require(_router != bytes32(0), "!router");
    }
}

// SPDX-License-Identifier: MIT OR Apache-2.0
pragma solidity >=0.6.11;

// ============ External Imports ============
import {Home} from "@celo-org/optics-sol/contracts/Home.sol";
import {XAppConnectionManager} from "@celo-org/optics-sol/contracts/XAppConnectionManager.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

abstract contract XAppConnectionClient is Ownable {
    // ============ Mutable Storage ============

    XAppConnectionManager public xAppConnectionManager;

    // ============ Modifiers ============

    /**
     * @notice Only accept messages from an Optics Replica contract
     */
    modifier onlyReplica() {
        require(_isReplica(msg.sender), "!replica");
        _;
    }

    // ============ Constructor ============

    constructor(address _xAppConnectionManager) {
        xAppConnectionManager = XAppConnectionManager(_xAppConnectionManager);
    }

    // ============ External functions ============

    /**
     * @notice Modify the contract the xApp uses to validate Replica contracts
     * @param _xAppConnectionManager The address of the xAppConnectionManager contract
     */
    function setXAppConnectionManager(address _xAppConnectionManager)
        external
        onlyOwner
    {
        xAppConnectionManager = XAppConnectionManager(_xAppConnectionManager);
    }

    // ============ Internal functions ============

    /**
     * @notice Get the local Home contract from the xAppConnectionManager
     * @return The local Home contract
     */
    function _home() internal view returns (Home) {
        return xAppConnectionManager.home();
    }

    /**
     * @notice Determine whether _potentialReplcia is an enrolled Replica from the xAppConnectionManager
     * @return True if _potentialReplica is an enrolled Replica
     */
    function _isReplica(address _potentialReplica)
        internal
        view
        returns (bool)
    {
        return xAppConnectionManager.isReplica(_potentialReplica);
    }

    /**
     * @notice Get the local domain from the xAppConnectionManager
     * @return The local domain
     */
    function _localDomain() internal view returns (uint32) {
        return xAppConnectionManager.localDomain();
    }
}

// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ICeloHTServicePayments} from "./interfaces/ICeloHTServicePayments.sol";
import {ICeloHTAgentRegistry} from "./interfaces/ICeloHTAgentRegistry.sol";

/// @title CeloHTServicePayments
/// @notice Enforces CeloHT's agent-mediated service pricing and the 80/20
///         agent/treasury revenue split on-chain. The frontend never
///         computes or enforces the split — this contract does, and every
///         unit of the incoming payment is accounted for (no funds created
///         or destroyed).
contract CeloHTServicePayments is ICeloHTServicePayments, AccessControl {
    using SafeERC20 for IERC20;

    bytes32 public constant TREASURY_ADMIN_ROLE = keccak256("TREASURY_ADMIN_ROLE");
    bytes32 public constant FEE_ADMIN_ROLE = keccak256("FEE_ADMIN_ROLE");

    uint16 public constant BPS_DENOMINATOR = 10_000;

    IERC20 public immutable usdm;
    ICeloHTAgentRegistry public immutable agentRegistry;

    address public treasury;
    uint16 public agentShareBps = 8_000; // 80.00%

    mapping(ServiceType => uint256) public price;

    uint256 private _nextPaymentId = 1;
    mapping(uint256 => Payment) private _payments;

    constructor(
        address usdmToken,
        address agentRegistryAddress,
        address initialTreasury,
        address admin,
        uint256 p2pPrice,
        uint256 educationPrice
    ) {
        if (usdmToken == address(0) || agentRegistryAddress == address(0) || initialTreasury == address(0) || admin == address(0)) {
            revert ZeroAddress();
        }
        usdm = IERC20(usdmToken);
        agentRegistry = ICeloHTAgentRegistry(agentRegistryAddress);
        treasury = initialTreasury;

        price[ServiceType.P2P] = p2pPrice;
        price[ServiceType.EDUCATION] = educationPrice;
        price[ServiceType.REFORESTATION] = 0; // Reforestation assistance is always FREE.

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(TREASURY_ADMIN_ROLE, admin);
        _grantRole(FEE_ADMIN_ROLE, admin);
    }

    /// @notice Pays for an agent-mediated service. Reforestation assistance
    ///         is always free (amount == 0) and skips agent/treasury
    ///         distribution accordingly, per protocol rule.
    function payForService(ServiceType serviceType, uint256 agentId) external returns (uint256 paymentId) {
        if (!agentRegistry.agentExists(agentId)) revert AgentNotFound(agentId);
        if (!agentRegistry.isAgentActive(agentId)) revert AgentInactive(agentId);

        uint256 amount = price[serviceType];

        paymentId = _nextPaymentId++;
        _payments[paymentId] = Payment({
            paymentId: paymentId,
            customer: msg.sender,
            agentId: agentId,
            serviceType: serviceType,
            amount: amount,
            timestamp: uint64(block.timestamp)
        });

        emit ServicePaid(paymentId, msg.sender, agentId, serviceType, amount, uint64(block.timestamp));

        if (amount == 0) {
            emit PaymentDistributed(paymentId, 0, 0);
            return paymentId;
        }

        ICeloHTAgentRegistry.Agent memory agent = agentRegistry.getAgent(agentId);

        // Effects are already recorded above; pull funds directly to final
        // recipients to avoid holding an intermediate balance in this
        // contract (checks-effects-interactions).
        uint256 agentShare = (amount * agentShareBps) / BPS_DENOMINATOR;
        uint256 treasuryShare = amount - agentShare; // guarantees full accounting, no dust loss

        usdm.safeTransferFrom(msg.sender, agent.wallet, agentShare);
        usdm.safeTransferFrom(msg.sender, treasury, treasuryShare);

        emit PaymentDistributed(paymentId, agentShare, treasuryShare);
    }

    function setServicePrice(ServiceType serviceType, uint256 newPrice) external onlyRole(FEE_ADMIN_ROLE) {
        emit ServicePriceUpdated(serviceType, price[serviceType], newPrice);
        price[serviceType] = newPrice;
    }

    function setTreasury(address newTreasury) external onlyRole(TREASURY_ADMIN_ROLE) {
        if (newTreasury == address(0)) revert ZeroAddress();
        emit TreasuryUpdated(treasury, newTreasury);
        treasury = newTreasury;
    }

    function setAgentShareBps(uint16 newAgentBps) external onlyRole(FEE_ADMIN_ROLE) {
        if (newAgentBps > BPS_DENOMINATOR) revert InvalidBps(newAgentBps);
        emit SplitUpdated(agentShareBps, newAgentBps);
        agentShareBps = newAgentBps;
    }

    function priceOf(ServiceType serviceType) external view returns (uint256) {
        return price[serviceType];
    }

    function getPayment(uint256 paymentId) external view returns (Payment memory) {
        return _payments[paymentId];
    }

    function supportsInterface(bytes4 interfaceId) public view override(AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}

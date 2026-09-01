// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

/// @title ICeloHTServicePayments
/// @notice Interface for agent-mediated CeloHT service payments (P2P, Education
///         assistance, Reforestation assistance) with an enforced 80/20 split
///         between the servicing agent and the CeloHT treasury.
interface ICeloHTServicePayments {
    enum ServiceType {
        P2P,
        EDUCATION,
        REFORESTATION
    }

    struct Payment {
        uint256 paymentId;
        address customer;
        uint256 agentId;
        ServiceType serviceType;
        uint256 amount;
        uint64 timestamp;
    }

    event ServicePaid(
        uint256 indexed paymentId,
        address indexed customer,
        uint256 indexed agentId,
        ServiceType serviceType,
        uint256 amount,
        uint64 timestamp
    );

    event PaymentDistributed(
        uint256 indexed paymentId,
        uint256 agentShare,
        uint256 treasuryShare
    );

    event ServicePriceUpdated(ServiceType indexed serviceType, uint256 oldPrice, uint256 newPrice);
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
    event SplitUpdated(uint16 oldAgentBps, uint16 newAgentBps);

    error WrongToken(address expected, address provided);
    error IncorrectAmount(uint256 expected, uint256 provided);
    error AgentNotFound(uint256 agentId);
    error AgentInactive(uint256 agentId);
    error ZeroAddress();
    error InvalidBps(uint16 bps);

    function payForService(ServiceType serviceType, uint256 agentId)
        external
        returns (uint256 paymentId);

    function setServicePrice(ServiceType serviceType, uint256 newPrice) external;

    function setTreasury(address newTreasury) external;

    function setAgentShareBps(uint16 newAgentBps) external;

    function priceOf(ServiceType serviceType) external view returns (uint256);

    function getPayment(uint256 paymentId) external view returns (Payment memory);
}

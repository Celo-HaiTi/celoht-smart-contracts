// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

/// @title ICeloHTAgentRegistry
/// @notice Public interface for the CeloHT Agent Registry.
/// @dev Stores only minimal, non-sensitive on-chain agent state. Off-chain
///      identity verification (KYC) is out of scope for this contract — see
///      docs/ARCHITECTURE.md for the separation of concerns.
interface ICeloHTAgentRegistry {
    struct Agent {
        uint256 agentId;
        address wallet;
        uint64 registeredAt;
        bool active;
        bool verified;
    }

    event AgentRegistered(
        uint256 indexed agentId,
        address indexed wallet,
        uint64 timestamp
    );
    event AgentStatusUpdated(uint256 indexed agentId, bool active);
    event AgentVerificationUpdated(uint256 indexed agentId, bool verified);
    event RegistrationFeeUpdated(uint256 oldFee, uint256 newFee);
    event TreasuryUpdated(
        address indexed oldTreasury,
        address indexed newTreasury
    );

    error ZeroAddress();
    error AlreadyRegistered(address wallet);
    error AgentNotFound(uint256 agentId);
    error WrongToken(address expected, address provided);
    error IncorrectAmount(uint256 expected, uint256 provided);

    function registerAgent() external returns (uint256 agentId);

    function setAgentStatus(uint256 agentId, bool active) external;

    function setAgentVerified(uint256 agentId, bool verified) external;

    function setRegistrationFee(uint256 newFee) external;

    function setTreasury(address newTreasury) external;

    function agentExists(uint256 agentId) external view returns (bool);

    function isAgentActive(uint256 agentId) external view returns (bool);

    function agentIdOf(address wallet) external view returns (uint256);

    function getAgent(uint256 agentId) external view returns (Agent memory);

    function registrationFee() external view returns (uint256);
}

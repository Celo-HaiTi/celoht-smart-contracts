// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ICeloHTAgentRegistry} from "./interfaces/ICeloHTAgentRegistry.sol";

/// @title CeloHTAgentRegistry
/// @notice On-chain registry of CeloHT community agents. Stores only the
///         minimum public state needed by the protocol and the DApp:
///         agent ID, wallet, registration time, active status, and a
///         verification flag reflecting an OFF-CHAIN identity check result.
///         No identity documents, images, or personal data are stored here.
contract CeloHTAgentRegistry is ICeloHTAgentRegistry, AccessControl {
    using SafeERC20 for IERC20;

    bytes32 public constant AGENT_ADMIN_ROLE = keccak256("AGENT_ADMIN_ROLE");
    bytes32 public constant TREASURY_ADMIN_ROLE =
        keccak256("TREASURY_ADMIN_ROLE");

    IERC20 public immutable usdm;

    address public treasury;
    uint256 public registrationFee;

    uint256 private _nextAgentId = 1;

    mapping(uint256 => Agent) private _agents;
    mapping(address => uint256) private _agentIdByWallet;

    constructor(
        address usdmToken,
        address initialTreasury,
        uint256 initialRegistrationFee,
        address admin
    ) {
        if (
            usdmToken == address(0) ||
            initialTreasury == address(0) ||
            admin == address(0)
        ) {
            revert ZeroAddress();
        }
        usdm = IERC20(usdmToken);
        treasury = initialTreasury;
        registrationFee = initialRegistrationFee;

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(AGENT_ADMIN_ROLE, admin);
        _grantRole(TREASURY_ADMIN_ROLE, admin);
    }

    /// @notice Registers the caller as a new CeloHT agent, paying the
    ///         registration fee in USDm. Reverts on duplicate registration.
    function registerAgent() external returns (uint256 agentId) {
        if (_agentIdByWallet[msg.sender] != 0)
            revert AlreadyRegistered(msg.sender);

        agentId = _nextAgentId++;

        _agents[agentId] = Agent({
            agentId: agentId,
            wallet: msg.sender,
            registeredAt: uint64(block.timestamp),
            active: true,
            verified: false
        });
        _agentIdByWallet[msg.sender] = agentId;

        if (registrationFee > 0) {
            _transferExact(msg.sender, treasury, registrationFee);
        }

        emit AgentRegistered(agentId, msg.sender, uint64(block.timestamp));
    }

    function setAgentStatus(
        uint256 agentId,
        bool active
    ) external onlyRole(AGENT_ADMIN_ROLE) {
        Agent storage agent = _agents[agentId];
        if (agent.wallet == address(0)) revert AgentNotFound(agentId);
        agent.active = active;
        emit AgentStatusUpdated(agentId, active);
    }

    /// @notice Reflects the result of an OFF-CHAIN identity verification
    ///         process. This flag is NOT identity verification itself — it
    ///         is a pointer to a process that happened outside this contract.
    function setAgentVerified(
        uint256 agentId,
        bool verified
    ) external onlyRole(AGENT_ADMIN_ROLE) {
        Agent storage agent = _agents[agentId];
        if (agent.wallet == address(0)) revert AgentNotFound(agentId);
        agent.verified = verified;
        emit AgentVerificationUpdated(agentId, verified);
    }

    function setRegistrationFee(
        uint256 newFee
    ) external onlyRole(AGENT_ADMIN_ROLE) {
        emit RegistrationFeeUpdated(registrationFee, newFee);
        registrationFee = newFee;
    }

    function setTreasury(
        address newTreasury
    ) external onlyRole(TREASURY_ADMIN_ROLE) {
        if (newTreasury == address(0)) revert ZeroAddress();
        emit TreasuryUpdated(treasury, newTreasury);
        treasury = newTreasury;
    }

    function _transferExact(address from, address to, uint256 amount) private {
        if (from == to) {
            usdm.safeTransferFrom(from, to, amount);
            return;
        }
        uint256 balanceBefore = usdm.balanceOf(to);
        usdm.safeTransferFrom(from, to, amount);
        uint256 received = usdm.balanceOf(to) - balanceBefore;
        if (received != amount) revert IncorrectAmount(amount, received);
    }

    function agentExists(uint256 agentId) external view returns (bool) {
        return _agents[agentId].wallet != address(0);
    }

    function isAgentActive(uint256 agentId) external view returns (bool) {
        return _agents[agentId].active;
    }

    function agentIdOf(address wallet) external view returns (uint256) {
        return _agentIdByWallet[wallet];
    }

    function getAgent(uint256 agentId) external view returns (Agent memory) {
        Agent memory agent = _agents[agentId];
        if (agent.wallet == address(0)) revert AgentNotFound(agentId);
        return agent;
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view override(AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}

// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ICeloHTGovernance} from "./interfaces/ICeloHTGovernance.sol";

/// @title CeloHTGovernance
/// @notice CeloHT community governance: strictly 1 wallet = 1 vote, no
///         governance token, no voting power derived from any token
///         balance. The 0.010 USDm participation fee is a spam-resistance
///         fee that does NOT purchase voting power — every wallet gets
///         exactly one vote per proposal regardless of fee payment size
///         (the fee is fixed, not a bid).
/// @dev RESULT STATUS: ADVISORY ONLY. This contract counts and finalizes
///      votes; it does not execute any treasury action, role change, or
///      protocol parameter change automatically. Any binding effect of a
///      governance result requires a separate, explicitly documented,
///      Safe/multisig-compatible execution step outside this contract.
///      See docs/ARCHITECTURE.md, section "Governance Security".
/// @dev DESIGN NOTE: Proposal creation is gated by PROPOSER_ROLE rather
///      than left fully permissionless, to bound on-chain spam while the
///      protocol is young. This is a documented, reversible policy choice
///      — DEFAULT_ADMIN_ROLE can grant PROPOSER_ROLE broadly (e.g., to all
///      verified agents) as the community scales.
contract CeloHTGovernance is ICeloHTGovernance, AccessControl {
    using SafeERC20 for IERC20;

    bytes32 public constant GOVERNANCE_ADMIN_ROLE = keccak256("GOVERNANCE_ADMIN_ROLE");
    bytes32 public constant PROPOSER_ROLE = keccak256("PROPOSER_ROLE");
    bytes32 public constant TREASURY_ADMIN_ROLE = keccak256("TREASURY_ADMIN_ROLE");

    IERC20 public immutable usdm;

    address public treasury;
    uint256 public participationFee;

    uint256 private _nextProposalId = 1;
    mapping(uint256 => Proposal) private _proposals;
    mapping(uint256 => mapping(address => bool)) private _hasVoted;

    constructor(address usdmToken, address initialTreasury, uint256 initialParticipationFee, address admin) {
        if (usdmToken == address(0) || initialTreasury == address(0) || admin == address(0)) {
            revert ZeroAddress();
        }
        usdm = IERC20(usdmToken);
        treasury = initialTreasury;
        participationFee = initialParticipationFee;

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(GOVERNANCE_ADMIN_ROLE, admin);
        _grantRole(TREASURY_ADMIN_ROLE, admin);
        _grantRole(PROPOSER_ROLE, admin);
    }

    function createProposal(bytes32 contentHash, string calldata metadataURI, uint64 startTime, uint64 endTime)
        external
        onlyRole(PROPOSER_ROLE)
        returns (uint256 proposalId)
    {
        if (startTime >= endTime || endTime <= block.timestamp) revert InvalidWindow(startTime, endTime);

        proposalId = _nextProposalId++;
        _proposals[proposalId] = Proposal({
            proposalId: proposalId,
            proposer: msg.sender,
            contentHash: contentHash,
            metadataURI: metadataURI,
            startTime: startTime,
            endTime: endTime,
            yesVotes: 0,
            noVotes: 0,
            abstainVotes: 0,
            finalized: false
        });

        emit ProposalCreated(proposalId, msg.sender, contentHash, metadataURI, startTime, endTime);
    }

    /// @notice Casts one vote for `proposalId`. Exactly one vote per wallet
    ///         per proposal, enforced by `_hasVoted`. Pays the fixed
    ///         participation fee — paying more has no effect and this
    ///         function does not accept a variable amount.
    function vote(uint256 proposalId, VoteOption option) external {
        Proposal storage proposal = _proposals[proposalId];
        if (proposal.proposer == address(0)) revert ProposalNotFound(proposalId);
        if (block.timestamp < proposal.startTime) revert VotingNotStarted(proposalId);
        if (block.timestamp > proposal.endTime) revert VotingEnded(proposalId);
        if (_hasVoted[proposalId][msg.sender]) revert AlreadyVoted(msg.sender, proposalId);
        if (option == VoteOption.NONE) revert InvalidVoteOption();

        _hasVoted[proposalId][msg.sender] = true;

        if (option == VoteOption.YES) {
            proposal.yesVotes += 1;
        } else if (option == VoteOption.NO) {
            proposal.noVotes += 1;
        } else {
            proposal.abstainVotes += 1;
        }

        if (participationFee > 0) {
            usdm.safeTransferFrom(msg.sender, treasury, participationFee);
        }

        emit VoteCast(proposalId, msg.sender, option);
    }

    function finalizeProposal(uint256 proposalId) external {
        Proposal storage proposal = _proposals[proposalId];
        if (proposal.proposer == address(0)) revert ProposalNotFound(proposalId);
        if (block.timestamp <= proposal.endTime) revert VotingNotEnded(proposalId);
        if (proposal.finalized) revert AlreadyFinalized(proposalId);

        proposal.finalized = true;

        emit ProposalFinalized(proposalId, proposal.yesVotes, proposal.noVotes, proposal.abstainVotes);
    }

    function setParticipationFee(uint256 newFee) external onlyRole(GOVERNANCE_ADMIN_ROLE) {
        emit ParticipationFeeUpdated(participationFee, newFee);
        participationFee = newFee;
    }

    function setTreasury(address newTreasury) external onlyRole(TREASURY_ADMIN_ROLE) {
        if (newTreasury == address(0)) revert ZeroAddress();
        emit TreasuryUpdated(treasury, newTreasury);
        treasury = newTreasury;
    }

    function setProposerAuthorized(address proposer, bool authorized) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (authorized) {
            _grantRole(PROPOSER_ROLE, proposer);
        } else {
            _revokeRole(PROPOSER_ROLE, proposer);
        }
        emit ProposerAuthorizationChanged(proposer, authorized);
    }

    function hasVoted(uint256 proposalId, address voter) external view returns (bool) {
        return _hasVoted[proposalId][voter];
    }

    function getProposal(uint256 proposalId) external view returns (Proposal memory) {
        Proposal memory proposal = _proposals[proposalId];
        if (proposal.proposer == address(0)) revert ProposalNotFound(proposalId);
        return proposal;
    }

    function supportsInterface(bytes4 interfaceId) public view override(AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}

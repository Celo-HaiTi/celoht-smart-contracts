// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

/// @title ICeloHTGovernance
/// @notice Interface for CeloHT community governance. Voting power is
///         strictly 1 wallet = 1 vote and does NOT depend on any token
///         balance — CeloHT issues no governance token. The 0.010 USDm
///         participation fee is a spam-resistance/sustainability fee only;
///         it never purchases additional voting power. Results produced by
///         this contract are ADVISORY unless a specific proposal's execution
///         path is explicitly wired to a Safe/multisig by separate,
///         documented configuration — this contract does not grant
///         unrestricted treasury control to any single wallet.
interface ICeloHTGovernance {
    enum VoteOption {
        NONE,
        YES,
        NO,
        ABSTAIN
    }

    struct Proposal {
        uint256 proposalId;
        address proposer;
        bytes32 contentHash;
        string metadataURI;
        uint64 startTime;
        uint64 endTime;
        uint256 yesVotes;
        uint256 noVotes;
        uint256 abstainVotes;
        bool finalized;
    }

    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed proposer,
        bytes32 contentHash,
        string metadataURI,
        uint64 startTime,
        uint64 endTime
    );
    event VoteCast(uint256 indexed proposalId, address indexed voter, VoteOption option);
    event ProposalFinalized(uint256 indexed proposalId, uint256 yesVotes, uint256 noVotes, uint256 abstainVotes);
    event ParticipationFeeUpdated(uint256 oldFee, uint256 newFee);
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
    event ProposerAuthorizationChanged(address indexed proposer, bool authorized);

    error WrongToken(address expected, address provided);
    error IncorrectAmount(uint256 expected, uint256 provided);
    error InvalidWindow(uint64 startTime, uint64 endTime);
    error ProposalNotFound(uint256 proposalId);
    error VotingNotStarted(uint256 proposalId);
    error VotingEnded(uint256 proposalId);
    error VotingNotEnded(uint256 proposalId);
    error AlreadyVoted(address voter, uint256 proposalId);
    error AlreadyFinalized(uint256 proposalId);
    error InvalidVoteOption();
    error ZeroAddress();
    error NotAuthorizedProposer(address caller);

    function createProposal(bytes32 contentHash, string calldata metadataURI, uint64 startTime, uint64 endTime)
        external
        returns (uint256 proposalId);

    function vote(uint256 proposalId, VoteOption option) external;

    function finalizeProposal(uint256 proposalId) external;

    function setParticipationFee(uint256 newFee) external;

    function setTreasury(address newTreasury) external;

    function setProposerAuthorized(address proposer, bool authorized) external;

    function hasVoted(uint256 proposalId, address voter) external view returns (bool);

    function getProposal(uint256 proposalId) external view returns (Proposal memory);
}

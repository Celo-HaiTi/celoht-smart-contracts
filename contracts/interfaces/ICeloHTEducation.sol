// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

/// @title ICeloHTEducation
/// @notice Interface for the CeloHT soulbound-style education certificate
///         lifecycle: fee payment -> eligibility -> issuance -> verification
///         -> optional revocation. Certificates are non-transferable records,
///         not ERC-721 tokens, to avoid implying tradeable/financial value.
interface ICeloHTEducation {
    struct Certificate {
        uint256 certificateId;
        address recipient;
        address issuer;
        string metadataURI;
        uint64 issuedAt;
        bool revoked;
        uint64 revokedAt;
    }

    event CertificateFeePaid(
        address indexed payer,
        address indexed recipient,
        uint256 amount,
        uint64 timestamp
    );
    event CertificateIssued(
        uint256 indexed certificateId,
        address indexed recipient,
        address indexed issuer,
        string metadataURI
    );
    event CertificateRevoked(
        uint256 indexed certificateId,
        address indexed revokedBy,
        string reason
    );
    event IssuerAuthorizationChanged(address indexed issuer, bool authorized);
    event CertificateFeeUpdated(uint256 oldFee, uint256 newFee);
    event TreasuryUpdated(
        address indexed oldTreasury,
        address indexed newTreasury
    );

    error WrongToken(address expected, address provided);
    error IncorrectAmount(uint256 expected, uint256 provided);
    error NoEligiblePayment(address recipient);
    error CertificateNotFound(uint256 certificateId);
    error AlreadyRevoked(uint256 certificateId);
    error ZeroAddress();

    function payCertificateFee(address recipient) external;

    function issueCertificate(
        address recipient,
        string calldata metadataURI
    ) external returns (uint256 certificateId);

    function revokeCertificate(
        uint256 certificateId,
        string calldata reason
    ) external;

    function setCertificateFee(uint256 newFee) external;

    function setTreasury(address newTreasury) external;

    function setIssuerAuthorized(address issuer, bool authorized) external;

    function isValidCertificate(
        uint256 certificateId
    ) external view returns (bool);

    function getCertificate(
        uint256 certificateId
    ) external view returns (Certificate memory);

    function eligiblePayments(
        address recipient
    ) external view returns (uint256);
}

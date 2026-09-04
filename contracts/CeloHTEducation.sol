// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ICeloHTEducation} from "./interfaces/ICeloHTEducation.sol";

/// @title CeloHTEducation
/// @notice Owns the CeloHT certificate lifecycle: fee payment, eligibility
///         tracking, issuance by an authorized issuer, on-chain
///         verification, and optional revocation. Payment never
///         auto-issues a certificate — issuance is a distinct, authorized
///         action.
/// @dev DESIGN NOTE (see docs/ARCHITECTURE.md, section "Education"):
///      Agent-mediated "education assistance" (0.020 USDm, 80/20 split) is
///      handled by CeloHTServicePayments (ServiceType.EDUCATION), since
///      that flow is agent-mediated and belongs with the other
///      agent-mediated services. This contract owns the certificate fee
///      (0.010 USDm) and lifecycle exclusively, since certificates are not
///      agent-mediated and the fee routes 100% to the treasury.
contract CeloHTEducation is ICeloHTEducation, AccessControl {
    using SafeERC20 for IERC20;

    bytes32 public constant EDUCATION_ISSUER_ROLE =
        keccak256("EDUCATION_ISSUER_ROLE");
    bytes32 public constant TREASURY_ADMIN_ROLE =
        keccak256("TREASURY_ADMIN_ROLE");
    bytes32 public constant FEE_ADMIN_ROLE = keccak256("FEE_ADMIN_ROLE");

    IERC20 public immutable usdm;

    address public treasury;
    uint256 public certificateFee;

    uint256 private _nextCertificateId = 1;
    mapping(uint256 => Certificate) private _certificates;

    /// @dev Number of certificate-fee payments made on behalf of `recipient`
    ///      that have not yet been consumed by an issuance.
    mapping(address => uint256) public eligiblePaymentsRemaining;

    constructor(
        address usdmToken,
        address initialTreasury,
        uint256 initialCertificateFee,
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
        certificateFee = initialCertificateFee;

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(TREASURY_ADMIN_ROLE, admin);
        _grantRole(FEE_ADMIN_ROLE, admin);
        _grantRole(EDUCATION_ISSUER_ROLE, admin);
    }

    /// @notice Pays the certificate fee on behalf of `recipient`, making
    ///         them eligible for one future certificate issuance. Does not
    ///         issue a certificate.
    function payCertificateFee(address recipient) external {
        if (recipient == address(0)) revert ZeroAddress();

        if (certificateFee > 0) {
            _transferExact(msg.sender, treasury, certificateFee);
        }

        eligiblePaymentsRemaining[recipient] += 1;

        emit CertificateFeePaid(
            msg.sender,
            recipient,
            certificateFee,
            uint64(block.timestamp)
        );
    }

    /// @notice Issues a certificate to `recipient`, consuming one eligible
    ///         payment. Only callable by an authorized issuer.
    function issueCertificate(
        address recipient,
        string calldata metadataURI
    ) external onlyRole(EDUCATION_ISSUER_ROLE) returns (uint256 certificateId) {
        if (recipient == address(0)) revert ZeroAddress();
        if (eligiblePaymentsRemaining[recipient] == 0)
            revert NoEligiblePayment(recipient);

        eligiblePaymentsRemaining[recipient] -= 1;

        certificateId = _nextCertificateId++;
        _certificates[certificateId] = Certificate({
            certificateId: certificateId,
            recipient: recipient,
            issuer: msg.sender,
            metadataURI: metadataURI,
            issuedAt: uint64(block.timestamp),
            revoked: false,
            revokedAt: 0
        });

        emit CertificateIssued(
            certificateId,
            recipient,
            msg.sender,
            metadataURI
        );
    }

    function revokeCertificate(
        uint256 certificateId,
        string calldata reason
    ) external onlyRole(EDUCATION_ISSUER_ROLE) {
        Certificate storage cert = _certificates[certificateId];
        if (cert.recipient == address(0))
            revert CertificateNotFound(certificateId);
        if (cert.revoked) revert AlreadyRevoked(certificateId);

        cert.revoked = true;
        cert.revokedAt = uint64(block.timestamp);

        emit CertificateRevoked(certificateId, msg.sender, reason);
    }

    function setCertificateFee(
        uint256 newFee
    ) external onlyRole(FEE_ADMIN_ROLE) {
        emit CertificateFeeUpdated(certificateFee, newFee);
        certificateFee = newFee;
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

    function setIssuerAuthorized(
        address issuer,
        bool authorized
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (authorized) {
            _grantRole(EDUCATION_ISSUER_ROLE, issuer);
        } else {
            _revokeRole(EDUCATION_ISSUER_ROLE, issuer);
        }
        emit IssuerAuthorizationChanged(issuer, authorized);
    }

    function isValidCertificate(
        uint256 certificateId
    ) external view returns (bool) {
        Certificate memory cert = _certificates[certificateId];
        return cert.recipient != address(0) && !cert.revoked;
    }

    function getCertificate(
        uint256 certificateId
    ) external view returns (Certificate memory) {
        Certificate memory cert = _certificates[certificateId];
        if (cert.recipient == address(0))
            revert CertificateNotFound(certificateId);
        return cert;
    }

    function eligiblePayments(
        address recipient
    ) external view returns (uint256) {
        return eligiblePaymentsRemaining[recipient];
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view override(AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}

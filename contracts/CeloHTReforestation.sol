// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ICeloHTReforestation} from "./interfaces/ICeloHTReforestation.sol";

/// @title CeloHTReforestation
/// @notice Accepts voluntary USDm donations for CeloHT's reforestation
///         pillar and records them for transparency and Dune analytics.
///         Does not mint an environmental/impact token and does not claim
///         a fixed trees-per-USDm ratio — reforestation is still in a
///         design/pilot phase at the protocol level.
contract CeloHTReforestation is ICeloHTReforestation, AccessControl {
    using SafeERC20 for IERC20;

    bytes32 public constant TREASURY_ADMIN_ROLE =
        keccak256("TREASURY_ADMIN_ROLE");

    IERC20 public immutable usdm;
    address public treasury;

    uint256 public totalDonated;
    uint256 public donationCount;

    mapping(address => uint256) public donorTotalAmount;

    uint256 private _nextDonationId = 1;
    mapping(uint256 => Donation) private _donations;

    constructor(address usdmToken, address initialTreasury, address admin) {
        if (
            usdmToken == address(0) ||
            initialTreasury == address(0) ||
            admin == address(0)
        ) {
            revert ZeroAddress();
        }
        usdm = IERC20(usdmToken);
        treasury = initialTreasury;

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(TREASURY_ADMIN_ROLE, admin);
    }

    function donate(uint256 amount) external returns (uint256 donationId) {
        if (amount == 0) revert ZeroAmount();

        donationId = _nextDonationId++;
        _donations[donationId] = Donation({
            donationId: donationId,
            donor: msg.sender,
            amount: amount,
            timestamp: uint64(block.timestamp)
        });

        totalDonated += amount;
        donationCount += 1;
        donorTotalAmount[msg.sender] += amount;

        _transferExact(msg.sender, treasury, amount);

        emit DonationReceived(
            donationId,
            msg.sender,
            amount,
            uint64(block.timestamp)
        );
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

    function donorTotal(address donor) external view returns (uint256) {
        return donorTotalAmount[donor];
    }

    function getDonation(
        uint256 donationId
    ) external view returns (Donation memory) {
        Donation memory donation = _donations[donationId];
        if (donation.donor == address(0)) revert DonationNotFound(donationId);
        return donation;
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view override(AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}

// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

/// @title ICeloHTReforestation
/// @notice Interface for voluntary USDm reforestation donations. Does not
///         mint any environmental/impact token and does not claim a fixed
///         tree-per-USDm ratio unless explicitly configured by governance
///         with a documented operational methodology.
interface ICeloHTReforestation {
    struct Donation {
        uint256 donationId;
        address donor;
        uint256 amount;
        uint64 timestamp;
    }

    event DonationReceived(uint256 indexed donationId, address indexed donor, uint256 amount, uint64 timestamp);
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);

    error WrongToken(address expected, address provided);
    error ZeroAmount();
    error ZeroAddress();

    function donate(uint256 amount) external returns (uint256 donationId);

    function setTreasury(address newTreasury) external;

    function totalDonated() external view returns (uint256);

    function donationCount() external view returns (uint256);

    function donorTotal(address donor) external view returns (uint256);

    function getDonation(uint256 donationId) external view returns (Donation memory);
}

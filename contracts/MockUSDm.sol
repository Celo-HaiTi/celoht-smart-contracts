// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title MockUSDm
/// @notice Test-only stand-in for the real USDm token (18 decimals, same as
///         a verified USDm contract). NOT for
///         deployment — tests only.
contract MockUSDm is ERC20 {
    constructor() ERC20("Mock USDm", "USDm") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

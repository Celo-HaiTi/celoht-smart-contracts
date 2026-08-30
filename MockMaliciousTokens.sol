// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title MockWrongToken
/// @notice A second, unrelated ERC-20 used to prove that CeloHT contracts
///         only ever move USDm and reject any other token by construction
///         (immutable `usdm` address; there is no "any ERC20" transfer path).
contract MockWrongToken is ERC20 {
    constructor() ERC20("Wrong Token", "WRONG") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

/// @title MockFeeOnTransferUSDm
/// @notice Simulates a malicious/non-standard ERC-20 that silently takes a
///         fee on transfer, delivering less than the requested amount. Used
///         to test that contracts do not assume `transferFrom` moves the
///         full nominal amount when protocol invariants depend on exact
///         accounting.
contract MockFeeOnTransferUSDm is ERC20 {
    uint256 public feeBps = 500; // 5%

    constructor() ERC20("Malicious USDm", "USDm") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function _update(address from, address to, uint256 value) internal override {
        if (from != address(0) && to != address(0)) {
            uint256 fee = (value * feeBps) / 10_000;
            super._update(from, to, value - fee);
            if (fee > 0) {
                super._update(from, address(0xdead), fee);
            }
        } else {
            super._update(from, to, value);
        }
    }
}

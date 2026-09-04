// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";

contract SplitInvariantTest {
    uint256 internal constant BPS_DENOMINATOR = 10_000;

    function testFuzz_SplitConserves(
        uint256 amount,
        uint16 agentBps
    ) external pure {
        if (agentBps > BPS_DENOMINATOR) return;

        uint256 agentShare = Math.mulDiv(amount, agentBps, BPS_DENOMINATOR);
        uint256 treasuryShare = amount - agentShare;

        assert(agentShare + treasuryShare == amount);
        assert(agentShare <= amount);
        assert(treasuryShare <= amount);
    }
}

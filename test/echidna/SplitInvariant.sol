// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";

contract SplitInvariant {
    uint256 internal constant BPS_DENOMINATOR = 10_000;
    uint256 public amount;
    uint16 public agentBps;

    function setAmount(uint256 newAmount) external {
        amount = newAmount;
    }

    function setAgentBps(uint16 newAgentBps) external {
        agentBps = newAgentBps;
    }

    function echidna_split_conserves() external view returns (bool) {
        if (agentBps > BPS_DENOMINATOR) return true;
        uint256 agentShare = Math.mulDiv(amount, agentBps, BPS_DENOMINATOR);
        uint256 treasuryShare = amount - agentShare;
        return agentShare + treasuryShare == amount;
    }
}

import { expect } from "chai";
import { existsSync } from "fs";
import path from "path";

describe("production mock guard", () => {
  it("keeps test-only mock contracts out of the production source root", () => {
    const mockFiles = [
      "MockUSDm.sol",
      "MockMaliciousTokens.sol",
    ];

    for (const fileName of mockFiles) {
      const candidate = path.join(__dirname, "..", "contracts", fileName);
      expect(
        existsSync(candidate),
        `${fileName} must not live in the production contracts root`,
      ).to.equal(false);
    }
  });
});

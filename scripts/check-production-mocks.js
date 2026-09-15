const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const contractsRoot = path.join(repoRoot, 'contracts');
const allowedMocksDir = path.join(contractsRoot, 'mocks');
const disallowedNames = new Set(['MockUSDm.sol', 'MockMaliciousTokens.sol']);

let failures = [];

if (fs.existsSync(contractsRoot)) {
  for (const entry of fs.readdirSync(contractsRoot, { withFileTypes: true })) {
    if (!entry.isFile()) continue;

    const fullPath = path.join(contractsRoot, entry.name);
    if (disallowedNames.has(entry.name)) {
      failures.push(`Forbidden mock file in production source: ${path.relative(repoRoot, fullPath)}`);
    }
  }
}

for (const dir of [contractsRoot]) {
  if (!fs.existsSync(dir)) continue;

  const stack = [dir];
  while (stack.length) {
    const current = stack.pop();
    for (const child of fs.readdirSync(current, { withFileTypes: true })) {
      const childPath = path.join(current, child.name);
      if (child.isDirectory()) {
        if (childPath === allowedMocksDir) continue;
        stack.push(childPath);
        continue;
      }

      if (!child.isFile() || !/\.sol$/.test(child.name)) continue;

      const text = fs.readFileSync(childPath, 'utf8');
      if (text.includes('MockUSDm') || text.includes('MockWrongToken') || text.includes('MockFeeOnTransferUSDm')) {
        failures.push(`Forbidden mock usage in production source: ${path.relative(repoRoot, childPath)}`);
      }
    }
  }
}

if (failures.length) {
  console.error('Production mock guard failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Production mock guard passed.');

module.exports = {
  root: true,
  env: {
    es2022: true,
    node: true,
    mocha: true,
  },
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: "./tsconfig.json",
    sourceType: "module",
  },
  plugins: ["@typescript-eslint"],
  extends: ["plugin:@typescript-eslint/recommended", "prettier"],
  ignorePatterns: [
    "artifacts/",
    "cache/",
    "coverage/",
    "typechain-types/",
    "node_modules/",
  ],
};

const nextJest = require("next/jest");

/** @type {import('jest').Config} */
const createJestConfig = nextJest({
  dir: "./",
});

const config = {
  coverageProvider: "v8",
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  // docs/ contains point-in-time backup snapshots (e.g. docs/intake-form-backup-*/) that
  // import the live lib and are not meant to run as active tests.
  testPathIgnorePatterns: ["<rootDir>/node_modules/", "<rootDir>/docs/"],
};

module.exports = createJestConfig(config);

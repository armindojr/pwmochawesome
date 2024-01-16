/** @type {import('jest').Config} */
const config = {
  clearMocks: true,

  collectCoverage: true,

  coverageDirectory: "coverage",

  coverageProvider: "v8",

  coverageReporters: [
    "text",
    "lcov"
  ],

  testMatch: [
    "**/?(*.)+(spec|test).[tj]s?(x)"
  ],
};

module.exports = config;

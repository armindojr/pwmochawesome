export default {
  clearMocks: true,

  collectCoverage: false,

  coverageDirectory: "coverage",

  coverageProvider: "v8",

  coverageReporters: ["text", "lcov"],

  testMatch: ["**/test/**.spec.js"],

  transform: {
    "\\.[jt]sx?$": "babel-jest",
  },
};

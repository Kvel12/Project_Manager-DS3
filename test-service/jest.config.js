module.exports = {
    testEnvironment: 'node',
    testTimeout: 60000,
    verbose: true,
    collectCoverage: true,
    coverageDirectory: 'coverage',
    coveragePathIgnorePatterns: ['/node_modules/'],
    setupFiles: ['./jest.setup.js']
  };
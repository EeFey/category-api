const path = require('path');

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: path.resolve(__dirname, '..'),
  roots: ['<rootDir>/test/integration'],
  testMatch: ['**/*.integration.spec.ts'],
  moduleFileExtensions: ['js', 'json', 'ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  coverageDirectory: '<rootDir>/coverage/integration',
  globalSetup: '<rootDir>/test/integration/global-setup.js',
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
  },
};

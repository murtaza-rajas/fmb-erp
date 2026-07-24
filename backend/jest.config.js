module.exports = {
  testEnvironment: 'node',
  testTimeout: 30000,
  setupFilesAfterEnv: ['<rootDir>/tests/helpers/setupEnv.js'],
  collectCoverageFrom: ['src/**/*.js', '!src/server.js', '!src/seed/**'],
};

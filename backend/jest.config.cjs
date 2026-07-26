/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  setupFiles: ['<rootDir>/src/__tests__/setup.ts'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  clearMocks: true,
  restoreMocks: true,
  collectCoverageFrom: [
    'src/services/creditLedger.service.ts',
    'src/controllers/payment.controller.ts',
    'src/middlewares/admin.middleware.ts',
    'src/controllers/reward.controller.ts',
  ],
};

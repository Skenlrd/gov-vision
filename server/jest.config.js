module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/__tests__'],
  testMatch: ['**/*.test.ts'],
  moduleNameMapper: {
    '^@contracts/(.*)$': '<rootDir>/../contracts/$1'
  },
  collectCoverageFrom: [
    'services/**/*.ts',
    'middleware/**/*.ts',
    'routes/**/*.ts',
    '!**/*.d.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50
    }
  }
}

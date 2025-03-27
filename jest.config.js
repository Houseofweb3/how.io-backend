/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['<rootDir>/src/tests/**/*.(test|spec).ts'],
  moduleFileExtensions: ['ts', 'js', 'json', 'node']
};
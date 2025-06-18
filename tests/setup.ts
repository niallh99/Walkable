// Test setup file for Jest
// This file runs before each test suite

beforeAll(async () => {
  // Set up test environment variables if needed
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-jwt-secret-key';
});

afterAll(async () => {
  // Clean up after all tests
});
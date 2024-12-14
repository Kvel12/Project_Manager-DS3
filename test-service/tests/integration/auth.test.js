const axios = require('axios');
const { generateTestUser } = require('../utils/testHelpers');

describe('Auth Service Integration Tests', () => {
  let testUser;
  let authToken;

  beforeEach(() => {
    testUser = generateTestUser();
  });

  test('Should register a new user', async () => {
    const response = await axios.post(`${global.API_GATEWAY_URL}/api/auth/register`, testUser);
    
    expect(response.status).toBe(201);
    expect(response.data).toHaveProperty('message');
    expect(response.data).toHaveProperty('token');
  });

  test('Should not register duplicate user', async () => {
    // Registrar el usuario por primera vez
    await axios.post(`${global.API_GATEWAY_URL}/api/auth/register`, testUser);

    // Intentar registrar el mismo usuario nuevamente
    try {
      await axios.post(`${global.API_GATEWAY_URL}/api/auth/register`, testUser);
    } catch (error) {
      expect(error.response.status).toBe(400);
      expect(error.response.data).toHaveProperty('message');
    }
  });

  test('Should login successfully', async () => {
    // Registrar usuario primero
    await axios.post(`${global.API_GATEWAY_URL}/api/auth/register`, testUser);

    const response = await axios.post(`${global.API_GATEWAY_URL}/api/auth/login`, {
      username: testUser.username,
      password: testUser.password
    });

    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('token');
    authToken = response.data.token;
  });

  test('Should fail login with wrong password', async () => {
    // Registrar usuario primero
    await axios.post(`${global.API_GATEWAY_URL}/api/auth/register`, testUser);

    try {
      await axios.post(`${global.API_GATEWAY_URL}/api/auth/login`, {
        username: testUser.username,
        password: 'wrongpassword'
      });
    } catch (error) {
      expect(error.response.status).toBe(401);
    }
  });

  test('Should validate token', async () => {
    // Registrar y hacer login primero
    await axios.post(`${global.API_GATEWAY_URL}/api/auth/register`, testUser);
    const loginResponse = await axios.post(`${global.API_GATEWAY_URL}/api/auth/login`, {
      username: testUser.username,
      password: testUser.password
    });
    authToken = loginResponse.data.token;

    const response = await axios.get(
      `${global.API_GATEWAY_URL}/api/auth/validate`,
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );

    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('valid', true);
  });
});
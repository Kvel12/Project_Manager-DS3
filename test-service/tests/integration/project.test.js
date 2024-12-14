const axios = require('axios');
const { generateTestUser, generateTestProject, loginUser } = require('../utils/testHelpers');

describe('Project Service Integration Tests', () => {
  let authToken;
  let testUser;

  beforeEach(async () => {
    testUser = generateTestUser();
    await axios.post(`${global.API_GATEWAY_URL}/api/auth/register`, testUser);
    const loginResponse = await loginUser(testUser);
    authToken = loginResponse.token;
  });

  test('Should create a new project', async () => {
    const projectData = generateTestProject();

    const response = await axios.post(
      `${global.API_GATEWAY_URL}/api/projects`,
      projectData,
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );

    expect(response.status).toBe(201);
    expect(response.data).toHaveProperty('id');
    expect(response.data.title).toBe(projectData.title);
  });

  test('Should get project list', async () => {
    // Crear algunos proyectos primero
    const projectData1 = generateTestProject();
    const projectData2 = generateTestProject();

    await axios.post(
      `${global.API_GATEWAY_URL}/api/projects`,
      projectData1,
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );

    await axios.post(
      `${global.API_GATEWAY_URL}/api/projects`,
      projectData2,
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );

    const response = await axios.get(
      `${global.API_GATEWAY_URL}/api/projects`,
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );

    expect(response.status).toBe(200);
    expect(Array.isArray(response.data)).toBe(true);
    expect(response.data.length).toBeGreaterThanOrEqual(2);
  });

  test('Should handle invalid project data', async () => {
    const invalidData = {
      title: '',
      description: 'Test description',
      priority: 'invalid',
      budget: -100
    };

    try {
      await axios.post(
        `${global.API_GATEWAY_URL}/api/projects`,
        invalidData,
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
    } catch (error) {
      expect(error.response.status).toBe(400);
      expect(error.response.data).toHaveProperty('errors');
      expect(Array.isArray(error.response.data.errors)).toBe(true);
    }
  });
});
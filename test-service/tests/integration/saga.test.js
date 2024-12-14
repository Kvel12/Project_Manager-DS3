const axios = require('axios');
const { generateTestUser, generateTestProject, loginUser } = require('../utils/testHelpers');

describe('SAGA Pattern Integration Tests', () => {
  let authToken;
  let testUser;

  beforeEach(async () => {
    testUser = generateTestUser();
    await axios.post(`${global.API_GATEWAY_URL}/api/auth/register`, testUser);
    const loginResponse = await loginUser(testUser);
    authToken = loginResponse.token;
  });

  test('Should complete project creation saga successfully', async () => {
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
    expect(response.data).toHaveProperty('paymentStatus');
    expect(response.data.paymentStatus).toBe('processing');
  }, 60000);

  test('Should rollback project creation on payment failure', async () => {
    const projectData = {
      ...generateTestProject(),
      budget: -1
    };

    try {
      await axios.post(
        `${global.API_GATEWAY_URL}/api/projects`,
        projectData,
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      fail('Should have thrown an error');
    } catch (error) {
      expect(error.response.status).toBe(400);
      expect(error.response.data).toHaveProperty('message');
      
      // Verificar inmediatamente que el proyecto no existe
      const listResponse = await axios.get(
        `${global.API_GATEWAY_URL}/api/projects`,
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      // Verificar que el proyecto no está en la lista
      const projectExists = listResponse.data.some(p => p.title === projectData.title);
      expect(projectExists).toBe(false);
    }
  }, 60000);

  test('Should handle concurrent saga transactions', async () => {
    const projects = Array(3).fill().map(() => generateTestProject());

    const results = await Promise.allSettled(
      projects.map(project => 
        axios.post(
          `${global.API_GATEWAY_URL}/api/projects`,
          project,
          {
            headers: { Authorization: `Bearer ${authToken}` }
          }
        )
      )
    );

    const successful = results.filter(r => r.status === 'fulfilled');
    expect(successful.length).toBeGreaterThan(0);
    
    successful.forEach(result => {
      expect(result.value.data).toHaveProperty('paymentStatus');
      expect(result.value.data.paymentStatus).toBe('processing');
    });
  }, 60000);
});
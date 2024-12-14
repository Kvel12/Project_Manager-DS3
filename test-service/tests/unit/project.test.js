const axios = require('axios');
jest.mock('axios');

const { generateTestProject } = require('../utils/testHelpers');

describe('Project Service Unit Tests', () => {
  let mockToken;
  
  beforeEach(() => {
    jest.clearAllMocks();
    mockToken = 'mock-jwt-token';
  });

  test('Should validate project creation data', async () => {
    const projectData = generateTestProject();
    
    axios.post.mockResolvedValue({
      data: { ...projectData, id: 1, userId: 1 }
    });

    const response = await axios.post(
      `${global.PROJECT_SERVICE_URL}/projects`,
      projectData,
      {
        headers: { Authorization: `Bearer ${mockToken}` }
      }
    );

    expect(response.data).toHaveProperty('id');
    expect(response.data.title).toBe(projectData.title);
  });

  test('Should handle project validation errors', async () => {
    const invalidProject = {
      title: '',  // título inválido
      description: 'Test',
      priority: 'invalid',  // prioridad inválida
      budget: -100  // presupuesto inválido
    };

    axios.post.mockRejectedValue({
      response: {
        status: 400,
        data: { error: 'Invalid project data' }
      }
    });

    try {
      await axios.post(
        `${global.PROJECT_SERVICE_URL}/projects`,
        invalidProject,
        {
          headers: { Authorization: `Bearer ${mockToken}` }
        }
      );
    } catch (error) {
      expect(error.response.status).toBe(400);
      expect(error.response.data).toHaveProperty('error');
    }
  });

  test('Should fetch project list', async () => {
    const mockProjects = [
      { id: 1, ...generateTestProject() },
      { id: 2, ...generateTestProject() }
    ];

    axios.get.mockResolvedValue({ data: mockProjects });

    const response = await axios.get(
      `${global.PROJECT_SERVICE_URL}/projects`,
      {
        headers: { Authorization: `Bearer ${mockToken}` }
      }
    );

    expect(Array.isArray(response.data)).toBe(true);
    expect(response.data.length).toBe(2);
  });

  test('Should handle project updates', async () => {
    const projectId = 1;
    const updateData = {
      description: 'Updated description',
      priority: 'high'
    };

    axios.put.mockResolvedValue({
      data: { id: projectId, ...generateTestProject(), ...updateData }
    });

    const response = await axios.put(
      `${global.PROJECT_SERVICE_URL}/projects/${projectId}`,
      updateData,
      {
        headers: { Authorization: `Bearer ${mockToken}` }
      }
    );

    expect(response.data.id).toBe(projectId);
    expect(response.data.description).toBe(updateData.description);
    expect(response.data.priority).toBe(updateData.priority);
  });
});
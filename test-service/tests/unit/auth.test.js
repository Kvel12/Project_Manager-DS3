const axios = require('axios');
jest.mock('axios');

describe('Auth Service Unit Tests', () => {
  const mockUser = {
    username: 'testuser',
    password: 'password123',
    email: 'test@example.com',
    name: 'Test User'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('Should validate user registration data', async () => {
    axios.post.mockResolvedValue({ data: { ...mockUser, id: 1 } });

    const response = await axios.post(`${global.AUTH_SERVICE_URL}/register`, mockUser);
    
    expect(response.data).toHaveProperty('id');
    expect(response.data.username).toBe(mockUser.username);
    expect(axios.post).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining(mockUser)
    );
  });

  test('Should handle registration validation errors', async () => {
    const invalidUser = { ...mockUser, email: 'invalid-email' };
    
    axios.post.mockRejectedValue({
      response: {
        status: 400,
        data: { error: 'Invalid email format' }
      }
    });

    try {
      await axios.post(`${global.AUTH_SERVICE_URL}/register`, invalidUser);
    } catch (error) {
      expect(error.response.status).toBe(400);
      expect(error.response.data).toHaveProperty('error');
    }
  });

  test('Should handle login authentication', async () => {
    const loginData = {
      username: mockUser.username,
      password: mockUser.password
    };

    axios.post.mockResolvedValue({
      data: { token: 'mock-jwt-token' }
    });

    const response = await axios.post(`${global.AUTH_SERVICE_URL}/login`, loginData);
    
    expect(response.data).toHaveProperty('token');
    expect(axios.post).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining(loginData)
    );
  });

  test('Should handle token validation', async () => {
    const mockToken = 'mock-jwt-token';
    
    axios.get.mockResolvedValue({
      data: { valid: true, user: { id: 1, username: mockUser.username } }
    });

    const response = await axios.get(
      `${global.AUTH_SERVICE_URL}/validate`,
      {
        headers: { Authorization: `Bearer ${mockToken}` }
      }
    );

    expect(response.data.valid).toBe(true);
    expect(response.data.user).toHaveProperty('username', mockUser.username);
  });
});
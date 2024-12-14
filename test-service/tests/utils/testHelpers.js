const axios = require('axios');

// Genera un usuario con datos únicos
const generateTestUser = () => {
  const timestamp = Date.now();
  return {
    username: `testuser_${timestamp}`,
    password: 'password123',
    email: `test_${timestamp}@example.com`,
    name: `Test User ${timestamp}`
  };
};

// Helper para login
const loginUser = async (user) => {
  const response = await axios.post(`${global.API_GATEWAY_URL}/api/auth/login`, {
    username: user.username,
    password: user.password
  });
  return response.data;
};

// Genera datos de proyecto únicos
const generateTestProject = () => {
  const timestamp = Date.now();
  return {
    title: `Project ${timestamp}`,
    description: `Test project description ${timestamp}`,
    priority: 'high',
    budget: 1000 + Math.floor(Math.random() * 1000)
  };
};

module.exports = {
  generateTestUser,
  loginUser,
  generateTestProject
};
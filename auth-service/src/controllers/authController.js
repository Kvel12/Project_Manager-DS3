// auth-service/src/controllers/authController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const logger = require('../sidecars/logging/logger');
const monitor = require('../sidecars/monitoring/monitor');
const authSaga = require('../sagas/authSaga');

const JWT_SECRET = process.env.JWT_SECRET;

// Registrar usuario con SAGA pattern
async function register(req, res) {
  try {
    const { username, password, name } = req.body;
    
    // Iniciar SAGA para registro
    const result = await authSaga.executeRegistration({
      username,
      password: await bcrypt.hash(password, 10),
      name
    });

    logger.info(`User registered: ${result.userId}`);
    monitor.recordEvent('registration', 'success');
    
    res.status(201).json({ 
      token: result.token,
      message: 'User registered successfully' 
    });
  } catch (error) {
    logger.error('Error registering user', error);
    monitor.recordEvent('registration', 'failure');
    res.status(500).json({ message: 'Error registering user' });
  }
}

// Login con monitoring
async function login(req, res) {
  const startTime = Date.now();
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ where: { username } });
    
    if (!user || !(await bcrypt.compare(password, user.password))) {
      monitor.recordEvent('login', 'failure');
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '1h' });
    
    logger.info(`User logged in: ${user.id}`);
    monitor.recordEvent('login', 'success');
    monitor.recordResponseTime('login', Date.now() - startTime);

    res.status(200).json({ token });
  } catch (error) {
    logger.error('Error logging in', error);
    monitor.recordEvent('login', 'error');
    monitor.recordResponseTime('login', Date.now() - startTime);
    res.status(500).json({ message: 'Error logging in' });
  }
}

module.exports = { register, login };
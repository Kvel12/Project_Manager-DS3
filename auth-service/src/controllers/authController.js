// auth-service/src/controllers/authController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const { User } = require('../models');
const logger = require('../sidecars/logging/logger');
const monitor = require('../sidecars/monitoring/monitor');
const sagaManager = require('../sagas/sagaManager');
const config = require('../config');

class AuthController {
  async register(req, res) {
    const startTime = Date.now();
    try {
      const { username, password, name, email, role } = req.body;

      // Verificar si el usuario ya existe
      const existingUser = await User.findOne({ 
        where: { 
          [Op.or]: [{ username }, { email }, {role}] 
        } 
      });

      if (existingUser) {
        monitor.recordFailedOperation('register', 'user_exists');
        return res.status(400).json({ 
          message: 'Username or email already exists' 
        });
      }

      if(req.user && req.user.role !== 'admin' && role && role !== 'user'){
        return res.status(403).json({message: 'Only administrators can assing roles other than "user"'})
      }

      // Hash de la contraseña
      const hashedPassword = await bcrypt.hash(password, 10);

      // Ejecutar el registro usando la saga
      const result = await sagaManager.authSaga.executeRegistration({
        username,
        password: hashedPassword,
        name,
        email,
        role: role || 'user'
      });

      monitor.recordSuccessfulOperation('register');
      logger.info(`User registered successfully: ${result.user.id}`);

      res.status(201).json({
        message: 'User registered successfully',
        token: result.token
      });

    } catch (error) {
      monitor.recordFailedOperation('register', error.message);
      logger.error('Registration error:', error);
      res.status(500).json({ message: 'Error registering user' });
    } finally {
      monitor.recordResponseTime('register', Date.now() - startTime);
    }
  }

  async login(req, res) {
    const startTime = Date.now();
    try {
      const { username, password } = req.body;

      // Buscar usuario
      const user = await User.findOne({ where: { username } });

      // Verificar si el usuario existe
      if (!user) {
        monitor.recordFailedOperation('login', 'invalid_credentials');
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Verificar si la cuenta está bloqueada
      if (user.isLocked()) {
        monitor.recordFailedOperation('login', 'account_locked');
        return res.status(401).json({ 
          message: 'Account is locked. Please try again later',
          lockedUntil: user.lockedUntil
        });
      }

      // Verificar contraseña
      const isValidPassword = await bcrypt.compare(password, user.password);
      
      if (!isValidPassword) {
        await user.incrementLoginAttempts();
        monitor.recordFailedOperation('login', 'invalid_password');
        
        return res.status(401).json({ 
          message: 'Invalid credentials',
          remainingAttempts: 5 - user.loginAttempts
        });
      }

      // Generar token
      const token = jwt.sign(
        { 
          userId: user.id,
          role: user.role 
        },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      // Actualizar último login y resetear intentos
      await user.update({
        lastLogin: new Date(),
        loginAttempts: 0,
        lockedUntil: null
      });

      monitor.recordSuccessfulOperation('login');
      logger.info(`User logged in successfully: ${user.id}`);

      res.json({ token });

    } catch (error) {
      monitor.recordFailedOperation('login', error.message);
      logger.error('Login error:', error);
      res.status(500).json({ message: 'Error during login' });
    } finally {
      monitor.recordResponseTime('login', Date.now() - startTime);
    }
  }

  async validate(req, res) {
    const startTime = Date.now();
    try {
      const token = req.header('Authorization')?.replace('Bearer ', '');

      if (!token) {
        monitor.recordFailedOperation('validate', 'no_token');
        return res.status(401).json({ message: 'No token provided' });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findByPk(decoded.userId);

      if (!user || user.status !== 'active') {
        monitor.recordFailedOperation('validate', 'invalid_token');
        return res.status(401).json({ message: 'Invalid token' });
      }

      monitor.recordSuccessfulOperation('validate');
      res.json({ 
        valid: true,
        userId: user.id,
        role: user.role
      });

    } catch (error) {
      monitor.recordFailedOperation('validate', error.message);
      logger.error('Token validation error:', error);
      res.status(401).json({ message: 'Invalid token' });
    } finally {
      monitor.recordResponseTime('validate', Date.now() - startTime);
    }
  }

  async getUserProfile(req, res) {
    const startTime = Date.now();
    try {
      const user = await User.findByPk(req.user.userId, {
        attributes: { exclude: ['password'] }
      });

      if (!user) {
        monitor.recordFailedOperation('getUserProfile', 'user_not_found');
        return res.status(404).json({ message: 'User not found' });
      }

      monitor.recordSuccessfulOperation('getUserProfile');
      res.json(user);

    } catch (error) {
      monitor.recordFailedOperation('getUserProfile', error.message);
      logger.error('Get user profile error:', error);
      res.status(500).json({ message: 'Error fetching user profile' });
    } finally {
      monitor.recordResponseTime('getUserProfile', Date.now() - startTime);
    }
  }

  // Health check endpoint
  async healthCheck(req, res) {
    try {
      await User.findOne();
      res.json({ status: 'healthy' });
    } catch (error) {
      logger.error('Health check failed:', error);
      res.status(503).json({ status: 'unhealthy' });
    }
  }

  async getAllUser(req, res){
    try{
      if(req.user.role !== 'Admin'){
        return res.status(403).json({mesaage: 'Access denied'});
      }
      const users = await User.findAll({
        attributes: {exclude: ['password']}
      });
      res.status(200).json(users);
    } catch (error) {
      res.status(500).json({message: 'Error fetching users'});
    }
  }
}

module.exports = new AuthController();
// auth-service/src/routes/index.js
const express = require('express');
const authRoutes = require('./authRoutes');

const router = express.Router();

router.use('/auth', authRoutes);

module.exports = router;
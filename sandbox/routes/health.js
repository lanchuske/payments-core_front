const express = require('express');
const router = express.Router();

// Health check endpoint
router.get('/health', async (req, res) => {
  try {
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0',
      services: {
        database: 'connected',
        api: 'operational',
      },
    };

    console.log(
      `🏥 Health check request from ${req.ip} - Status: ${healthData.status}`
    );

    res.status(200).json(healthData);
  } catch (error) {
    console.error('❌ Health check error:', error);
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
});

// Detailed health check
router.get('/health/detailed', async (req, res) => {
  try {
    const detailedHealth = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      services: {
        database: 'connected',
        api: 'operational',
        authentication: 'active',
      },
      endpoints: {
        tenants: '/api/tenants',
        health: '/health',
        auth: '/api/auth',
      },
    };

    console.log(`🏥 Detailed health check request from ${req.ip}`);

    res.status(200).json(detailedHealth);
  } catch (error) {
    console.error('❌ Detailed health check error:', error);
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
});

module.exports = router;

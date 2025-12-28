const express = require('express');
const router = express.Router();
const { getSandboxConfig } = require('../config/urls');

/**
 * Endpoint para obtener configuración del frontend
 * Sirve configuración basada en variables de entorno
 */
router.get('/frontend', (req, res) => {
  try {
    // Obtener configuración centralizada
    const baseConfig = getSandboxConfig();

    // Configuración específica del frontend
    const config = {
      ...baseConfig,

      auth: {
        adminEmail: process.env.SANDBOX_ADMIN_EMAIL || 'admin@sandbox.echeq.ar',
        passwordPlaceholder: 'Ingresa tu contraseña',
        loginEndpoint: '/api/auth/login',
        logoutEndpoint: '/api/auth/logout',
      },

      access: {
        title: 'Información de Acceso',
        adminLabel: '👑 Administrador del Sandbox',
        configLabel: '📋 Configuración',
        passwordInfo: 'Contraseña: Configurada via variable de entorno',
        configInfo:
          'La contraseña se configura en Railway via la variable SANDBOX_ADMIN_PASSWORD',
      },

      ui: {
        theme: {
          primary: '#1976d2',
          secondary: '#dc004e',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          cardBackground: 'white',
          textPrimary: '#333',
          textSecondary: '#666',
        },
        icons: {
          admin: 'fas fa-crown',
          config: 'fas fa-info-circle',
          users: 'fas fa-users',
          back: 'fas fa-arrow-left',
        },
      },
    };

    res.json(config);
  } catch (error) {
    console.error('Error generando configuración del frontend:', error);
    res.status(500).json({
      success: false,
      message: 'Error generando configuración',
      error: error.message,
    });
  }
});

module.exports = router;

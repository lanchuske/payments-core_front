const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { User, Tenant } = require('../models');

/**
 * GET /api/settings
 * Configuraciones generales del sistema
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const settings = {
      system: {
        name: 'ECHEQ Platform',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        features: {
          mfa: true,
          audit_logs: true,
          api_rate_limiting: true,
          ssl_enforcement: true,
        },
      },
      security: {
        jwt_expires_in: process.env.JWT_EXPIRES_IN || '24h',
        password_min_length: 8,
        require_mfa: false,
        session_timeout: 3600,
      },
      email: {
        service: process.env.EMAIL_SERVICE || 'smtp',
        from_address: process.env.EMAIL_USER || 'admin@echeq.ar',
        templates_available: [
          'auth.welcome',
          'echeq.emission_created',
          'echeq.expiration_warning',
        ],
      },
      coelsa: {
        api_url: process.env.COELSA_API_URL || 'https://api.coelsa.com',
        integration_active: true,
        features: ['emision', 'endoso', 'custodia', 'deposito', 'pago'],
      },
    };

    res.json({
      success: true,
      settings: settings,
    });
  } catch (error) {
    console.error('Error en configuraciones:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
    });
  }
});

/**
 * GET /api/tenants/current
 * Configuración del tenant actual del usuario
 */
router.get('/tenants/current', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await User.findByPk(userId, {
      include: [
        {
          model: Tenant,
          as: 'tenant',
          attributes: ['id', 'nombre', 'codigo', 'estado', 'dominios'],
        },
      ],
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado',
      });
    }

    const tenantInfo = {
      success: true,
      tenant: user.tenant || {
        id: 'system',
        nombre: 'Sistema',
        codigo: 'SYS',
        estado: 'ACTIVE',
        dominios: [],
      },
      user_info: {
        id: user.id,
        email: user.email,
        role: user.role,
        company_name: user.company_name,
        status: user.status,
      },
    };

    res.json(tenantInfo);
  } catch (error) {
    console.error('Error en tenant actual:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
    });
  }
});

/**
 * GET /api/settings/user
 * Configuraciones específicas del usuario
 */
router.get('/user', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado',
      });
    }

    const userSettings = {
      success: true,
      user_settings: {
        id: user.id,
        email: user.email,
        role: user.role,
        company_name: user.company_name,
        mfa_enabled: user.mfa_enabled,
        status: user.status,
        last_login: user.last_login,
        preferences: {
          language: 'es',
          timezone: 'America/Argentina/Buenos_Aires',
          notifications: {
            email: true,
            sms: false,
            push: false,
          },
        },
      },
    };

    res.json(userSettings);
  } catch (error) {
    console.error('Error en configuraciones de usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
    });
  }
});

module.exports = router;

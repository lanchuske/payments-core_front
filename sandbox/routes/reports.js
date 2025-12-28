const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { Echeq, User, Client, Custody, Discount } = require('../models');
const { sequelize } = require('../config/database');

/**
 * GET /api/reports
 * Lista de reportes disponibles
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const reports = [
      {
        id: 'echeqs',
        name: 'Reporte de ECHEQs',
        description: 'Reporte completo de ECHEQs con filtros',
        type: 'data',
        formats: ['json', 'csv', 'pdf'],
      },
      {
        id: 'users',
        name: 'Reporte de Usuarios',
        description: 'Listado de usuarios del sistema',
        type: 'data',
        formats: ['json', 'csv', 'pdf'],
      },
      {
        id: 'custody',
        name: 'Reporte de Custodia',
        description: 'Estado de ECHEQs en custodia',
        type: 'data',
        formats: ['json', 'csv', 'pdf'],
      },
      {
        id: 'discounts',
        name: 'Reporte de Descuentos',
        description: 'Historial de solicitudes de descuento',
        type: 'data',
        formats: ['json', 'csv', 'pdf'],
      },
      {
        id: 'system',
        name: 'Reporte del Sistema',
        description: 'Métricas y estado del sistema',
        type: 'metrics',
        formats: ['json'],
      },
    ];

    res.json({
      success: true,
      reports: reports,
    });
  } catch (error) {
    console.error('Error en reportes:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
    });
  }
});

/**
 * POST /api/reports/echeqs
 * Generar reporte de ECHEQs
 */
router.post('/echeqs', authenticateToken, async (req, res) => {
  try {
    const { fecha_desde, fecha_hasta, formato = 'json' } = req.body;

    // Construir filtros
    const whereClause = {};
    if (fecha_desde && fecha_hasta) {
      whereClause.created_at = {
        [sequelize.Op.between]: [new Date(fecha_desde), new Date(fecha_hasta)],
      };
    }

    // Obtener datos
    const echeqs = await Echeq.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'issuer',
          attributes: ['email', 'company_name', 'cuit'],
        },
        {
          model: User,
          as: 'beneficiary',
          attributes: ['email', 'company_name', 'cuit'],
        },
      ],
      order: [['created_at', 'DESC']],
    });

    // Generar reporte según formato
    let reportData;
    let reportUrl;

    switch (formato) {
      case 'json':
        reportData = {
          success: true,
          report_type: 'echeqs',
          generated_at: new Date().toISOString(),
          filters: { fecha_desde, fecha_hasta },
          total_records: echeqs.length,
          data: echeqs,
        };
        break;

      case 'csv':
        // Simular generación de CSV
        reportUrl = `/api/reports/echeqs/download/${Date.now()}.csv`;
        reportData = {
          success: true,
          report_type: 'echeqs',
          format: 'csv',
          report_url: reportUrl,
          message: 'Reporte CSV generado exitosamente',
        };
        break;

      case 'pdf':
        // Simular generación de PDF
        reportUrl = `/api/reports/echeqs/download/${Date.now()}.pdf`;
        reportData = {
          success: true,
          report_type: 'echeqs',
          format: 'pdf',
          report_url: reportUrl,
          message: 'Reporte PDF generado exitosamente',
        };
        break;

      default:
        return res.status(400).json({
          success: false,
          message: 'Formato no soportado',
        });
    }

    res.json(reportData);
  } catch (error) {
    console.error('Error generando reporte de ECHEQs:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
    });
  }
});

/**
 * GET /api/reports/system
 * Reporte del sistema
 */
router.get('/system', authenticateToken, async (req, res) => {
  try {
    const systemReport = {
      success: true,
      report_type: 'system',
      generated_at: new Date().toISOString(),
      metrics: {
        total_echeqs: await Echeq.count(),
        total_users: await User.count(),
        total_clients: await Client.count(),
        total_custody: await Custody.count(),
        total_discounts: await Discount.count(),
      },
      system_info: {
        uptime: process.uptime(),
        memory_usage: process.memoryUsage(),
        environment: process.env.NODE_ENV || 'development',
        node_version: process.version,
        platform: process.platform,
      },
    };

    res.json(systemReport);
  } catch (error) {
    console.error('Error en reporte del sistema:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
    });
  }
});

module.exports = router;

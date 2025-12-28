const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { Echeq, User, Client, Custody, Discount } = require('../models');
const { sequelize } = require('../config/database');
const { Op } = require('sequelize');

/**
 * GET /api/dashboard
 * Dashboard principal con métricas y resumen
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado',
      });
    }

    // Obtener métricas básicas
    const totalEcheqs = await Echeq.count();
    const totalUsers = await User.count();
    const totalClients = await Client.count();
    const totalCustody = await Custody.count();
    const totalDiscounts = await Discount.count();

    // Obtener ECHEQs recientes
    const recentEcheqs = await Echeq.findAll({
      limit: 5,
      order: [['created_at', 'DESC']],
      attributes: ['id', 'number', 'amount', 'status', 'created_at'],
    });

    // Obtener estadísticas por estado
    const echeqStats = await Echeq.findAll({
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      ],
      group: ['status'],
    });

    const dashboardData = {
      success: true,
      metrics: {
        total_echeqs: totalEcheqs,
        total_users: totalUsers,
        total_clients: totalClients,
        total_custody: totalCustody,
        total_discounts: totalDiscounts,
      },
      recent_echeqs: recentEcheqs,
      echeq_stats: echeqStats,
      user_info: {
        id: user.id,
        email: user.email,
        role: user.role,
        company_name: user.company_name,
      },
    };

    res.json(dashboardData);
  } catch (error) {
    console.error('Error en dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
    });
  }
});

/**
 * GET /api/dashboard/metrics
 * Métricas detalladas del sistema
 */
router.get('/metrics', authenticateToken, async (req, res) => {
  try {
    // Métricas por período (últimos 30 días)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const echeqsLast30Days = await Echeq.count({
      where: {
        created_at: {
          [Op.gte]: thirtyDaysAgo,
        },
      },
    });

    const usersLast30Days = await User.count({
      where: {
        created_at: {
          [sequelize.Op.gte]: thirtyDaysAgo,
        },
      },
    });

    const metrics = {
      success: true,
      period: 'last_30_days',
      echeqs: {
        total: await Echeq.count(),
        last_30_days: echeqsLast30Days,
        by_status: await Echeq.findAll({
          attributes: [
            'status',
            [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
          ],
          group: ['status'],
        }),
      },
      users: {
        total: await User.count(),
        last_30_days: usersLast30Days,
        by_role: await User.findAll({
          attributes: [
            'role',
            [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
          ],
          group: ['role'],
        }),
      },
      system: {
        uptime: process.uptime(),
        memory_usage: process.memoryUsage(),
        environment: process.env.NODE_ENV || 'development',
      },
    };

    res.json(metrics);
  } catch (error) {
    console.error('Error en métricas:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
    });
  }
});

module.exports = router;

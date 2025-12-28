const { Custody, Discount, Echeq, User } = require('../models');
const { Sequelize } = require('sequelize');

class ReportController {
  /**
   * Obtener reporte de custodia
   */
  async getCustodyReport(req, res) {
    try {
      const customerId = req.user.id;

      const total = await Custody.count({
        where: { customerId: customerId },
      });

      const totalAmount = await Custody.sum('echeq.amount', {
        where: {
          customerId: customerId,
          status: 'IN_CUSTODY',
        },
        include: [
          {
            model: Echeq,
            as: 'echeq',
            attributes: [],
          },
        ],
      });

      const statusCounts = await Custody.findAll({
        where: { customerId: customerId },
        attributes: [
          'status',
          [Sequelize.fn('COUNT', Sequelize.col('id')), 'count'],
        ],
        group: ['status'],
        raw: true,
      });

      res.json({
        success: true,
        data: {
          total,
          totalAmount: totalAmount || 0,
          statusCounts,
        },
      });
    } catch (error) {
      console.error('Error obteniendo reporte de custodia:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
      });
    }
  }

  /**
   * Obtener reporte de descuentos
   */
  async getDiscountReport(req, res) {
    try {
      const customerId = req.user.id;

      const total = await Discount.count({
        where: { customerId: customerId },
      });

      const totalAmount = await Discount.sum('requested_amount', {
        where: { customerId: customerId },
      });

      const statusCounts = await Discount.findAll({
        where: { customerId: customerId },
        attributes: [
          'status',
          [Sequelize.fn('COUNT', Sequelize.col('id')), 'count'],
        ],
        group: ['status'],
        raw: true,
      });

      res.json({
        success: true,
        data: {
          total,
          totalAmount: totalAmount || 0,
          statusCounts,
        },
      });
    } catch (error) {
      console.error('Error obteniendo reporte de descuentos:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
      });
    }
  }

  /**
   * Obtener analytics de performance
   */
  async getPerformanceAnalytics(req, res) {
    try {
      // Simular métricas de performance
      const responseTime = Math.random() * 100 + 50; // 50-150ms
      const availability = 99.9; // 99.9%
      const errorRate = 0.1; // 0.1%

      res.json({
        success: true,
        data: {
          responseTime: Math.round(responseTime),
          availability,
          errorRate,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Error obteniendo analytics de performance:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
      });
    }
  }
}

module.exports = new ReportController();

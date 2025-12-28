const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const models = require('../models');

/**
 * @swagger
 * /bank-portfolio:
 *   get:
 *     summary: Obtener cartera de ECHEQs del banco desde sandbox
 *     description: Retorna todos los ECHEQs que han sido endosados al banco
 *     tags: [Bank Portfolio - Sandbox]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cartera obtenida exitosamente
 */
router.get(
  '/',
  (req, res, next) => {
    // Middleware simple para autenticación de API
    const apiKey = req.headers['x-api-key'];
    const apiSecret = req.headers['x-api-secret'];

    if (apiKey === 'sandbox_key_123' && apiSecret === 'sandbox_secret_123') {
      req.user = { tenantId: req.headers['x-tenant-id'] };
      next();
    } else {
      res
        .status(401)
        .json({ success: false, message: 'Token de acceso requerido' });
    }
  },
  async (req, res) => {
    try {
      console.log('🔍 DEBUG - Sandbox bank-portfolio endpoint llamado');
      console.log('🔍 DEBUG - req.user:', req.user);

      const tenant_id = req.user.tenantId || req.user.tenant_id;

      // Obtener eCheqs endosados al banco desde el sandbox
      const echeqs = await models.Echeq.findAll({
        where: {
          status: 'ENDORSED',
          beneficiary: 'Banco Santander Argentina', // Solo eCheqs endosados al banco
        },
        order: [['created_at', 'DESC']],
        limit: 50,
      });

      console.log(`🔍 Encontrados ${echeqs.length} eCheqs en sandbox`);
      console.log(
        `🔍 Primer eCheq:`,
        echeqs[0]
          ? {
              number: echeqs[0].number,
              issueDate: echeqs[0].issueDate,
              dueDate: echeqs[0].dueDate,
              amount: echeqs[0].amount,
            }
          : 'No hay eCheqs'
      );

      // Transformar datos al formato esperado
      const portfolioData = echeqs.map(echeq => {
        console.log(
          `🔍 Procesando eCheq:`,
          echeq.number,
          'issueDate:',
          echeq.issueDate,
          'dueDate:',
          echeq.dueDate
        );
        const issueDate = new Date(echeq.issueDate);
        const dueDate = new Date(echeq.dueDate);
        const currentDate = new Date();
        const daysToMaturity = Math.ceil(
          (dueDate - currentDate) / (1000 * 60 * 60 * 24)
        );

        // Calcular descuento del 5% (ejemplo)
        const discountRate = 0.05;
        const purchaseAmount = echeq.amount * (1 - discountRate);
        const expectedReturn = echeq.amount - purchaseAmount;

        return {
          id: echeq.id,
          number: echeq.number,
          amount: parseFloat(echeq.amount),
          issuer: echeq.issuer,
          beneficiary: echeq.beneficiary,
          issueDate: issueDate.toISOString().split('T')[0],
          dueDate: dueDate.toISOString().split('T')[0],
          status: echeq.status === 'ACTIVE' ? 'ENDORSED' : echeq.status,
          purchase_amount: purchaseAmount,
          discount_rate: discountRate,
          days_to_maturity: Math.max(0, daysToMaturity),
          expected_return: expectedReturn,
        };
      });

      res.json({
        success: true,
        message: 'Cartera del banco obtenida exitosamente desde sandbox',
        data: portfolioData,
      });
    } catch (error) {
      console.error('Error fetching bank portfolio from sandbox:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor sandbox',
        error: error.message,
      });
    }
  }
);

/**
 * @swagger
 * /bank-portfolio/summary:
 *   get:
 *     summary: Obtener resumen de la cartera del banco desde sandbox
 *     description: Retorna métricas agregadas de la cartera
 *     tags: [Bank Portfolio - Sandbox]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  '/summary',
  (req, res, next) => {
    // Middleware simple para autenticación de API
    const apiKey = req.headers['x-api-key'];
    const apiSecret = req.headers['x-api-secret'];

    if (apiKey === 'sandbox_key_123' && apiSecret === 'sandbox_secret_123') {
      req.user = { tenantId: req.headers['x-tenant-id'] };
      next();
    } else {
      res
        .status(401)
        .json({ success: false, message: 'Token de acceso requerido' });
    }
  },
  async (req, res) => {
    try {
      console.log('🔍 DEBUG - Sandbox bank-portfolio summary endpoint llamado');

      const tenant_id = req.user.tenantId || req.user.tenant_id;

      // Obtener eCheqs endosados al banco desde el sandbox
      const echeqs = await models.Echeq.findAll({
        where: {
          status: 'ENDORSED',
          beneficiary: 'Banco Santander Argentina',
        },
      });

      console.log(`🔍 Resumen: ${echeqs.length} eCheqs encontrados en sandbox`);
      console.log(
        `🔍 eCheqs encontrados:`,
        echeqs.map(e => ({
          number: e.number,
          amount: e.amount,
          beneficiary: e.beneficiary,
        }))
      );

      // Calcular métricas agregadas
      const totalValue = echeqs.reduce(
        (sum, echeq) => sum + parseFloat(echeq.amount),
        0
      );
      const discountRate = 0.05;
      const totalInvested = totalValue * (1 - discountRate);
      const expectedReturn = totalValue - totalInvested;
      const totalEcheqs = echeqs.length;
      const averageRate = discountRate;
      const operationsCount = totalEcheqs;

      res.json({
        success: true,
        message: 'Resumen de cartera obtenido exitosamente desde sandbox',
        data: {
          totalValue: totalValue || 0,
          totalInvested,
          expectedReturn,
          totalEcheqs: totalEcheqs || 0,
          averageRate,
          operationsCount,
        },
      });
    } catch (error) {
      console.error('Error fetching portfolio summary from sandbox:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor sandbox',
        error: error.message,
      });
    }
  }
);

module.exports = router;

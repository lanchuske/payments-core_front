const { Discount, Echeq, Custody, User } = require('../models');
const coelsaService = require('../integrations/coelsa');
const { Sequelize } = require('sequelize');

class DiscountController {
  /**
   * Solicitar descuento de ECHEQ
   */
  async requestDiscount(req, res) {
    try {
      const { echeq_id, requested_amount, notes } = req.body;

      const customerId = req.user.id;

      // Validar campos requeridos
      if (!echeq_id || !requested_amount) {
        return res.status(400).json({
          success: false,
          message: 'ID del ECHEQ y monto solicitado son requeridos',
        });
      }

      // Verificar que el ECHEQ existe y pertenece al usuario
      const echeq = await Echeq.findOne({
        where: { id: echeqId, customerId: customerId },
        include: [
          {
            model: Custody,
            as: 'custody',
            where: { status: 'IN_CUSTODY' },
            required: true,
          },
        ],
      });

      if (!echeq) {
        return res.status(404).json({
          success: false,
          message: 'ECHEQ no encontrado o no está en custodia',
        });
      }

      // Verificar que el monto solicitado no exceda el valor del ECHEQ
      if (parseFloat(requested_amount) > parseFloat(echeq.amount)) {
        return res.status(400).json({
          success: false,
          message: 'El monto solicitado no puede exceder el valor del ECHEQ',
        });
      }

      // Verificar que no haya un descuento pendiente para este ECHEQ
      const existingDiscount = await Discount.findOne({
        where: {
          echeq_id,
          status: ['PENDING', 'APPROVED'],
        },
      });

      if (existingDiscount) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe una solicitud de descuento para este ECHEQ',
        });
      }

      // Crear solicitud de descuento
      const discount = await Discount.create({
        echeq_id,
        customerId: customerId,
        requested_amount,
        notes,
        status: 'PENDING',
      });

      res.status(201).json({
        success: true,
        message: 'Solicitud de descuento creada exitosamente',
        data: {
          id: discount.id,
          echeq_number: echeq.number,
          requested_amount: discount.requested_amount,
          status: discount.status,
          requested_at: discount.requested_at,
        },
      });
    } catch (error) {
      console.error('Error solicitando descuento:', error);

      if (error.name === 'SequelizeValidationError') {
        return res.status(400).json({
          success: false,
          message: 'Datos de entrada inválidos',
          errors: error.errors.map(e => e.message),
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
      });
    }
  }

  /**
   * Aprobar descuento (solo admin)
   */
  async approveDiscount(req, res) {
    try {
      const { id } = req.params;
      const { approved_amount, rate, notes } = req.body;
      const adminId = req.user.id;

      // Verificar que el usuario es admin
      if (req.user.role !== 'BANK_ADMIN') {
        return res.status(403).json({
          success: false,
          message:
            'Acceso denegado. Solo administradores pueden aprobar descuentos',
        });
      }

      const discount = await Discount.findOne({
        where: { id },
        include: [
          {
            model: Echeq,
            as: 'echeq',
            attributes: ['id', 'number', 'amount', 'currency', 'dueDate'],
          },
        ],
      });

      if (!discount) {
        return res.status(404).json({
          success: false,
          message: 'Solicitud de descuento no encontrada',
        });
      }

      if (discount.status !== 'PENDING') {
        return res.status(400).json({
          success: false,
          message: 'La solicitud no está pendiente de aprobación',
        });
      }

      // Validar monto aprobado
      const approvedAmount = approved_amount || discount.requested_amount;
      if (parseFloat(approvedAmount) > parseFloat(discount.echeq.amount)) {
        return res.status(400).json({
          success: false,
          message: 'El monto aprobado no puede exceder el valor del ECHEQ',
        });
      }

      // Procesar descuento en COELSA
      const coelsaResult = await coelsaService.processDiscount({
        echeq_number: discount.echeq.number,
        amount: approvedAmount,
        currency: discount.echeq.currency,
        dueDate: discount.echeq.dueDate,
        customerId: discount.customerId,
      });

      // Actualizar descuento
      await discount.update({
        approved_amount: approvedAmount,
        rate: rate || 0.05, // 5% por defecto
        status: coelsaResult.success ? 'APPROVED' : 'REJECTED',
        approved_at: new Date(),
        approved_by: adminId,
        coelsa_discount_id: coelsaResult.success
          ? coelsaResult.discount_id
          : null,
        notes: notes || discount.notes,
        rejection_reason: coelsaResult.success ? null : coelsaResult.error,
      });

      res.json({
        success: true,
        message: coelsaResult.success
          ? 'Descuento aprobado exitosamente'
          : 'Descuento rechazado',
        data: {
          id: discount.id,
          status: discount.status,
          approved_amount: discount.approved_amount,
          rate: discount.rate,
          approved_at: discount.approved_at,
          coelsa_discount_id: discount.coelsa_discount_id,
        },
      });
    } catch (error) {
      console.error('Error aprobando descuento:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
      });
    }
  }

  /**
   * Rechazar descuento (solo admin)
   */
  async rejectDiscount(req, res) {
    try {
      const { id } = req.params;
      const { rejection_reason } = req.body;
      const adminId = req.user.id;

      // Verificar que el usuario es admin
      if (req.user.role !== 'BANK_ADMIN') {
        return res.status(403).json({
          success: false,
          message:
            'Acceso denegado. Solo administradores pueden rechazar descuentos',
        });
      }

      const discount = await Discount.findOne({
        where: { id, status: 'PENDING' },
      });

      if (!discount) {
        return res.status(404).json({
          success: false,
          message: 'Solicitud de descuento pendiente no encontrada',
        });
      }

      await discount.update({
        status: 'REJECTED',
        rejection_reason: rejection_reason || 'Rechazado por administrador',
        approved_by: adminId,
      });

      res.json({
        success: true,
        message: 'Descuento rechazado exitosamente',
        data: {
          id: discount.id,
          status: discount.status,
          rejection_reason: discount.rejection_reason,
        },
      });
    } catch (error) {
      console.error('Error rechazando descuento:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
      });
    }
  }

  /**
   * Obtener descuentos del usuario
   */
  async getDiscounts(req, res) {
    try {
      const { page = 1, limit = 10, status } = req.query;
      const customerId = req.user.id;

      const whereClause = { customerId: customerId };

      if (status) {
        whereClause.status = status;
      }

      const offset = (page - 1) * limit;

      const { count, rows: discounts } = await Discount.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: Echeq,
            as: 'echeq',
            attributes: [
              'id',
              'number',
              'amount',
              'currency',
              'dueDate',
              'issuer',
              'beneficiary',
            ],
          },
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['requested_at', 'DESC']],
      });

      res.json({
        success: true,
        data: discounts,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          pages: Math.ceil(count / limit),
        },
      });
    } catch (error) {
      console.error('Error obteniendo descuentos:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
      });
    }
  }

  /**
   * Obtener descuento específico
   */
  async getDiscount(req, res) {
    try {
      const { id } = req.params;
      const customerId = req.user.id;

      const discount = await Discount.findOne({
        where: { id, customerId: customerId },
        include: [
          {
            model: Echeq,
            as: 'echeq',
            attributes: [
              'id',
              'number',
              'amount',
              'currency',
              'dueDate',
              'issuer',
              'beneficiary',
            ],
          },
        ],
      });

      if (!discount) {
        return res.status(404).json({
          success: false,
          message: 'Descuento no encontrado',
        });
      }

      res.json({
        success: true,
        data: discount,
      });
    } catch (error) {
      console.error('Error obteniendo descuento:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
      });
    }
  }

  /**
   * Obtener todos los descuentos (solo admin)
   */
  async getAllDiscounts(req, res) {
    try {
      const { page = 1, limit = 10, status } = req.query;

      // Verificar que el usuario es admin
      if (req.user.role !== 'BANK_ADMIN') {
        return res.status(403).json({
          success: false,
          message:
            'Acceso denegado. Solo administradores pueden ver todos los descuentos',
        });
      }

      const whereClause = {};

      if (status) {
        whereClause.status = status;
      }

      const offset = (page - 1) * limit;

      const { count, rows: discounts } = await Discount.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: Echeq,
            as: 'echeq',
            attributes: [
              'id',
              'number',
              'amount',
              'currency',
              'dueDate',
              'issuer',
              'beneficiary',
            ],
          },
          {
            model: User,
            as: 'customer',
            attributes: ['id', 'email', 'companyName', 'cuit'],
          },
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['requested_at', 'DESC']],
      });

      res.json({
        success: true,
        data: discounts,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          pages: Math.ceil(count / limit),
        },
      });
    } catch (error) {
      console.error('Error obteniendo todos los descuentos:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
      });
    }
  }

  /**
   * Cancelar descuento
   */
  async cancelDiscount(req, res) {
    try {
      const { id } = req.params;
      const customerId = req.user.id;

      const discount = await Discount.findOne({
        where: { id, customerId: customerId, status: 'PENDING' },
      });

      if (!discount) {
        return res.status(404).json({
          success: false,
          message: 'Solicitud de descuento pendiente no encontrada',
        });
      }

      await discount.update({
        status: 'CANCELLED',
      });

      res.json({
        success: true,
        message: 'Descuento cancelado exitosamente',
        data: {
          id: discount.id,
          status: discount.status,
        },
      });
    } catch (error) {
      console.error('Error cancelando descuento:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
      });
    }
  }
}

module.exports = new DiscountController();

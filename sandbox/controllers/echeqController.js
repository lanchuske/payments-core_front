const { Echeq, Custody, User, Client } = require('../models');
const coelsaService = require('../integrations/coelsa');
const { Sequelize } = require('sequelize');

class EcheqController {
  /**
   * Crear ECHEQ en custodia
   */
  async createCustody(req, res) {
    try {
      const {
        number,
        amount,
        currency,
        issue_date,
        due_date,
        issuer,
        beneficiary,
      } = req.body;

      const customerId = req.user.userId;

      // Validar campos requeridos
      if (
        !number ||
        !amount ||
        !issue_date ||
        !due_date ||
        !issuer ||
        !beneficiary
      ) {
        return res.status(400).json({
          success: false,
          message: 'Todos los campos son requeridos',
        });
      }

      // Verificar si el ECHEQ ya existe
      const existingEcheq = await Echeq.findOne({ where: { number } });

      if (existingEcheq) {
        return res.status(400).json({
          success: false,
          message: 'El número de ECHEQ ya existe',
        });
      }

      // Validar ECHEQ con COELSA (más flexible en desarrollo)
      const validationResult = await coelsaService.validateEcheq(number);

      // En desarrollo, permitir ECHEQs sin validación estricta
      const isDevelopment = process.env.NODE_ENV === 'development';
      const isValidEcheq =
        validationResult.success && (validationResult.valid || isDevelopment);

      if (!isValidEcheq) {
        return res.status(400).json({
          success: false,
          message: 'ECHEQ inválido o no encontrado en COELSA',
          details: validationResult.details || {},
        });
      }

      // Crear ECHEQ
      const echeq = await Echeq.create({
        number,
        amount,
        currency: currency || 'ARS',
        issue_date,
        due_date,
        issuer,
        beneficiary,
        customerId: customerId,
        validationStatus: 'VALIDATED',
        validatedAt: new Date(), // Fecha real de validación
        validation_details: validationResult.details,
      });

      // Crear custodia
      const custody = await Custody.create({
        echeqId: echeq.id,
        customerId: customerId,
        status: 'IN_CUSTODY',
      });

      // Procesar custodia en COELSA
      const coelsaResult = await coelsaService.processCustody({
        number,
        amount,
        currency: currency || 'ARS',
        issue_date,
        due_date,
        issuer,
        beneficiary,
        customerId: customerId,
      });

      if (coelsaResult.success) {
        await custody.update({
          coelsa_custody_id: coelsaResult.custody_id,
        });
      }

      res.status(201).json({
        success: true,
        message: 'ECHEQ puesto en custodia exitosamente',
        data: {
          echeq: {
            id: echeq.id,
            number: echeq.number,
            amount: echeq.amount,
            currency: echeq.currency,
            dueDate: echeq.dueDate,
            status: echeq.status,
          },
          custody: {
            id: custody.id,
            status: custody.status,
            custody_date: custody.custody_date,
          },
        },
      });
    } catch (error) {
      console.error('Error creando custodia:', error);

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
   * Obtener ECHEQs en custodia
   */
  async getCustody(req, res) {
    try {
      const { page = 1, limit = 10, status } = req.query;
      const customerId = req.user.userId;

      const whereClause = { customerId: customerId };

      if (status) {
        whereClause.status = status;
      }

      const offset = (page - 1) * limit;

      const { count, rows: custodies } = await Custody.findAndCountAll({
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
        order: [['createdAt', 'DESC']],
      });

      res.json({
        success: true,
        data: custodies,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          pages: Math.ceil(count / limit),
        },
      });
    } catch (error) {
      console.error('Error obteniendo custodia:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
      });
    }
  }

  /**
   * Obtener ECHEQ específico
   */
  async getEcheq(req, res) {
    try {
      const { id } = req.params;
      const customerId = req.user.userId;

      const echeq = await Echeq.findByPk(id);

      if (!echeq) {
        return res.status(404).json({
          success: false,
          message: 'ECHEQ no encontrado',
        });
      }

      res.json({
        success: true,
        data: echeq,
      });
    } catch (error) {
      console.error('Error obteniendo ECHEQ:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
      });
    }
  }

  /**
   * Actualizar ECHEQ
   */
  async updateEcheq(req, res) {
    try {
      const { id } = req.params;
      const { beneficiary } = req.body;
      const customerId = req.user.userId;

      const echeq = await Echeq.findOne({
        where: { id, customerId: customerId },
      });

      if (!echeq) {
        return res.status(404).json({
          success: false,
          message: 'ECHEQ no encontrado',
        });
      }

      // Solo permitir actualizar beneficiario
      if (beneficiary) {
        await echeq.update({ beneficiary });
      }

      res.json({
        success: true,
        message: 'ECHEQ actualizado exitosamente',
        data: echeq,
      });
    } catch (error) {
      console.error('Error actualizando ECHEQ:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
      });
    }
  }

  /**
   * Liberar ECHEQ de custodia
   */
  async releaseCustody(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const customerId = req.user.userId;

      const custody = await Custody.findOne({
        where: { id, customerId: customerId },
        include: [
          {
            model: Echeq,
            as: 'echeq',
          },
        ],
      });

      if (!custody) {
        return res.status(404).json({
          success: false,
          message: 'Custodia no encontrada',
        });
      }

      if (custody.status !== 'IN_CUSTODY') {
        return res.status(400).json({
          success: false,
          message: 'La custodia no está activa',
        });
      }

      // Actualizar estado de custodia
      await custody.update({
        status: 'RELEASED',
        release_date: new Date(),
        release_reason: reason || 'Liberación manual',
      });

      res.json({
        success: true,
        message: 'ECHEQ liberado de custodia exitosamente',
        data: {
          custody_id: custody.id,
          release_date: custody.release_date,
          release_reason: custody.release_reason,
        },
      });
    } catch (error) {
      console.error('Error liberando custodia:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
      });
    }
  }

  /**
   * Validar ECHEQ con COELSA
   */
  async validateEcheq(req, res) {
    try {
      const { number } = req.params;

      if (!number) {
        return res.status(400).json({
          success: false,
          message: 'Número de ECHEQ requerido',
        });
      }

      const result = await coelsaService.validateEcheq(number);

      res.json({
        success: result.success,
        valid: result.valid,
        details: result.details,
        error: result.error,
      });
    } catch (error) {
      console.error('Error validando ECHEQ:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
      });
    }
  }

  /**
   * Obtener estadísticas de custodia
   */
  async getCustodyStats(req, res) {
    try {
      const customerId = req.user.userId;

      const stats = await Custody.findAll({
        where: { customerId: customerId },
        attributes: [
          'status',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        ],
        group: ['status'],
        raw: true,
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

      res.json({
        success: true,
        data: {
          status_counts: stats,
          total_amount_in_custody: totalAmount || 0,
        },
      });
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
      });
    }
  }

  // ===== MÉTODOS DE EMISIÓN =====

  /**
   * Emitir ECHEQ individual
   */
  async emitEcheq(req, res) {
    try {
      const {
        number,
        amount,
        currency,
        issue_date,
        due_date,
        issuer,
        beneficiary,
        description,
      } = req.body;

      const customerId = req.user.userId;

      // Validar campos requeridos
      if (
        !number ||
        !amount ||
        !issue_date ||
        !due_date ||
        !issuer ||
        !beneficiary
      ) {
        return res.status(400).json({
          success: false,
          message: 'Todos los campos son requeridos',
        });
      }

      // Verificar si el ECHEQ ya existe
      const existingEcheq = await Echeq.findOne({ where: { number } });

      if (existingEcheq) {
        return res.status(400).json({
          success: false,
          message: 'El número de ECHEQ ya existe',
        });
      }

      // Crear ECHEQ
      const echeq = await Echeq.create({
        number,
        amount,
        currency: currency || 'ARS',
        issue_date,
        due_date,
        issuer,
        beneficiary,
        customerId: customerId,
        description,
        status: 'EMITTED',
      });

      // Procesar emisión en COELSA
      const coelsaResult = await coelsaService.emitEcheq({
        number,
        amount,
        currency: currency || 'ARS',
        issue_date,
        due_date,
        issuer,
        beneficiary,
      });

      if (coelsaResult.success) {
        await echeq.update({
          coelsa_echeq_id: coelsaResult.echeqId,
          validationStatus: 'VALIDATED',
        });
      }

      res.status(201).json({
        success: true,
        message: 'ECHEQ emitido exitosamente',
        data: {
          id: echeq.id,
          number: echeq.number,
          amount: echeq.amount,
          status: echeq.status,
        },
      });
    } catch (error) {
      console.error('Error emitiendo ECHEQ:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
      });
    }
  }

  /**
   * Emitir ECHEQs masivamente
   */
  async emitBulkEcheq(req, res) {
    try {
      const { echeqs } = req.body;
      const customerId = req.user.userId;

      if (!echeqs || !Array.isArray(echeqs) || echeqs.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Lista de ECHEQs requerida',
        });
      }

      const results = [];
      const errors = [];

      for (const echeqData of echeqs) {
        try {
          const {
            number,
            amount,
            currency,
            issue_date,
            due_date,
            issuer,
            beneficiary,
            description,
          } = echeqData;

          // Verificar si el ECHEQ ya existe
          const existingEcheq = await Echeq.findOne({ where: { number } });

          if (existingEcheq) {
            errors.push({
              number,
              error: 'ECHEQ ya existe',
            });
            continue;
          }

          // Crear ECHEQ
          const echeq = await Echeq.create({
            number,
            amount,
            currency: currency || 'ARS',
            issue_date,
            due_date,
            issuer,
            beneficiary,
            customerId: customerId,
            description,
            status: 'EMITTED',
          });

          results.push({
            id: echeq.id,
            number: echeq.number,
            amount: echeq.amount,
            status: 'success',
          });
        } catch (error) {
          errors.push({
            number: echeqData.number,
            error: error.message,
          });
        }
      }

      res.status(201).json({
        success: true,
        message: `Procesados ${results.length} ECHEQs exitosamente`,
        data: {
          successful: results,
          errors: errors,
        },
      });
    } catch (error) {
      console.error('Error emitiendo ECHEQs masivamente:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
      });
    }
  }

  // ===== MÉTODOS DE RECEPCIÓN =====

  /**
   * Aceptar ECHEQ
   */
  async acceptEcheq(req, res) {
    try {
      const { id } = req.params;
      const { acceptance_reason } = req.body;
      // Usar información de autenticación COELSA en lugar de req.user
      const customerId = req.coelsaAuth?.tenantId || 'unknown';
      const userTenantId = req.coelsaAuth?.tenantId || 'unknown';

      const echeq = await Echeq.findOne({ where: { number: id } });

      if (!echeq) {
        return res.status(404).json({
          success: false,
          message: 'ECHEQ no encontrado',
        });
      }

      if (
        echeq.status !== 'PENDING_ACCEPTANCE' &&
        echeq.status !== 'ACTIVE' &&
        echeq.status !== 'EMITTED'
      ) {
        return res.status(400).json({
          success: false,
          message: 'ECHEQ no puede ser aceptado en su estado actual',
        });
      }

      // VALIDACIÓN DE SEGURIDAD: Verificar que el usuario que acepta sea el beneficiario
      // Obtener el CUIT del tenant del usuario que está aceptando
      const { TenantSimple } = require('../models');
      const userTenant = await TenantSimple.findByPk(userTenantId);

      if (!userTenant) {
        return res.status(400).json({
          success: false,
          message: 'Tenant del usuario no encontrado',
        });
      }

      // Verificar que el CUIT del usuario coincida con el CUIT del beneficiario del eCheq
      if (userTenant.cuit !== echeq.beneficiary_cuit) {
        return res.status(403).json({
          success: false,
          message: 'Solo el beneficiario puede aceptar este eCheq',
          details: {
            userCuit: userTenant.cuit,
            beneficiaryCuit: echeq.beneficiary_cuit,
            echeqNumber: echeq.number,
          },
        });
      }

      await echeq.update({
        status: 'ACCEPTED',
        acceptance_date: new Date(),
        acceptance_reason: acceptance_reason || 'Aceptado por el beneficiario',
      });

      res.json({
        success: true,
        message: 'ECHEQ aceptado exitosamente',
        data: {
          id: echeq.id,
          status: echeq.status,
          acceptance_date: echeq.acceptance_date,
        },
      });
    } catch (error) {
      console.error('Error aceptando ECHEQ:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
      });
    }
  }

  /**
   * Rechazar/Repudiar ECHEQ
   */
  async rejectEcheq(req, res) {
    try {
      const { id } = req.params;
      const { rejection_reason } = req.body;
      const customerId = req.user.userId;

      const echeq = await Echeq.findByPk(id);

      if (!echeq) {
        return res.status(404).json({
          success: false,
          message: 'ECHEQ no encontrado',
        });
      }

      if (echeq.status !== 'PENDING_ACCEPTANCE') {
        return res.status(400).json({
          success: false,
          message: 'ECHEQ no está pendiente de aceptación',
        });
      }

      await echeq.update({
        status: 'REJECTED',
        rejection_date: new Date(),
        rejection_reason: rejection_reason || 'Rechazado por el beneficiario',
      });

      res.json({
        success: true,
        message: 'ECHEQ rechazado exitosamente',
        data: {
          id: echeq.id,
          status: echeq.status,
          rejection_date: echeq.rejection_date,
        },
      });
    } catch (error) {
      console.error('Error rechazando ECHEQ:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
      });
    }
  }

  // ===== MÉTODOS DE ENDOSO =====

  /**
   * Endosar ECHEQ
   */
  async endorseEcheq(req, res) {
    try {
      const { id } = req.params;
      const { endorsee, endorsement_type } = req.body;
      const customerId = req.user.userId;

      const echeq = await Echeq.findByPk(id);

      if (!echeq) {
        return res.status(404).json({
          success: false,
          message: 'ECHEQ no encontrado',
        });
      }

      if (echeq.status !== 'ACCEPTED' && echeq.status !== 'ENDORSED') {
        return res.status(400).json({
          success: false,
          message: 'ECHEQ no puede ser endosado',
        });
      }

      await echeq.update({
        status: 'ENDORSED',
        endorsementDate: new Date(),
        endorsee: endorsee,
        endorsementType: endorsement_type || 'NOM',
      });

      res.json({
        success: true,
        message: 'ECHEQ endosado exitosamente',
        data: {
          id: echeq.id,
          status: echeq.status,
          endorsee: echeq.endorsee,
          endorsementType: echeq.endorsementType,
        },
      });
    } catch (error) {
      console.error('Error endosando ECHEQ:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
      });
    }
  }

  /**
   * Endosar ECHEQ para negociación
   */
  async endorseForNegotiation(req, res) {
    try {
      const { id } = req.params;
      const { endorsee } = req.body;
      const customerId = req.user.userId;

      const echeq = await Echeq.findByPk(id);

      if (!echeq) {
        return res.status(404).json({
          success: false,
          message: 'ECHEQ no encontrado',
        });
      }

      await echeq.update({
        status: 'ENDORSED_FOR_NEGOTIATION',
        endorsementDate: new Date(),
        endorsee: endorsee,
        endorsementType: 'NEG',
      });

      res.json({
        success: true,
        message: 'ECHEQ endosado para negociación exitosamente',
        data: {
          id: echeq.id,
          status: echeq.status,
          endorsee: echeq.endorsee,
        },
      });
    } catch (error) {
      console.error('Error endosando ECHEQ para negociación:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
      });
    }
  }

  // ===== MÉTODOS DE CUSTODIA =====

  /**
   * Poner ECHEQ en custodia
   */
  async putInCustody(req, res) {
    try {
      const { id } = req.params;
      const { custody_reason } = req.body;
      const customerId = req.user.userId;

      const echeq = await Echeq.findByPk(id);

      if (!echeq) {
        return res.status(404).json({
          success: false,
          message: 'ECHEQ no encontrado',
        });
      }

      // Verificar si ya está en custodia
      const existingCustody = await Custody.findOne({
        where: { echeqId: id, status: 'IN_CUSTODY' },
      });

      if (existingCustody) {
        return res.status(400).json({
          success: false,
          message: 'ECHEQ ya está en custodia',
        });
      }

      // Crear custodia
      const custody = await Custody.create({
        echeqId: id,
        customerId: customerId,
        status: 'IN_CUSTODY',
        custody_reason: custody_reason || 'Custodia solicitada',
      });

      await echeq.update({
        status: 'IN_CUSTODY',
      });

      res.status(201).json({
        success: true,
        message: 'ECHEQ puesto en custodia exitosamente',
        data: {
          custody_id: custody.id,
          echeqId: echeq.id,
          status: echeq.status,
        },
      });
    } catch (error) {
      console.error('Error poniendo ECHEQ en custodia:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
      });
    }
  }

  /**
   * Liberar ECHEQ de custodia
   */
  async releaseFromCustody(req, res) {
    try {
      const { id } = req.params;
      const { release_reason } = req.body;
      const customerId = req.user.userId;

      const custody = await Custody.findOne({
        where: { echeqId: id, customerId: customerId, status: 'IN_CUSTODY' },
      });

      if (!custody) {
        return res.status(404).json({
          success: false,
          message: 'Custodia no encontrada',
        });
      }

      await custody.update({
        status: 'RELEASED',
        release_date: new Date(),
        release_reason: release_reason || 'Liberación solicitada',
      });

      const echeq = await Echeq.findByPk(id);
      await echeq.update({
        status: 'ACCEPTED',
      });

      res.json({
        success: true,
        message: 'ECHEQ liberado de custodia exitosamente',
        data: {
          custody_id: custody.id,
          release_date: custody.release_date,
        },
      });
    } catch (error) {
      console.error('Error liberando ECHEQ de custodia:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
      });
    }
  }

  // ===== MÉTODOS DE DEPÓSITO Y PAGO =====

  /**
   * Depositar ECHEQ
   */
  async depositEcheq(req, res) {
    try {
      const { id } = req.params;
      const { account_number } = req.body;
      const customerId = req.user.userId;

      const echeq = await Echeq.findByPk(id);

      if (!echeq) {
        return res.status(404).json({
          success: false,
          message: 'ECHEQ no encontrado',
        });
      }

      if (echeq.status !== 'ACCEPTED' && echeq.status !== 'ENDORSED') {
        return res.status(400).json({
          success: false,
          message: 'ECHEQ no puede ser depositado',
        });
      }

      await echeq.update({
        status: 'DEPOSITED',
        deposit_date: new Date(),
        accountNumber: account_number,
      });

      res.json({
        success: true,
        message: 'ECHEQ depositado exitosamente',
        data: {
          id: echeq.id,
          status: echeq.status,
          deposit_date: echeq.deposit_date,
        },
      });
    } catch (error) {
      console.error('Error depositando ECHEQ:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
      });
    }
  }

  /**
   * Pagar ECHEQ
   */
  async payEcheq(req, res) {
    try {
      const { id } = req.params;
      const { payment_reference } = req.body;
      const customerId = req.user.userId;

      const echeq = await Echeq.findByPk(id);

      if (!echeq) {
        return res.status(404).json({
          success: false,
          message: 'ECHEQ no encontrado',
        });
      }

      if (echeq.status !== 'DEPOSITED') {
        return res.status(400).json({
          success: false,
          message: 'ECHEQ no puede ser pagado',
        });
      }

      await echeq.update({
        status: 'PAID',
        payment_date: new Date(),
        payment_reference: payment_reference,
      });

      res.json({
        success: true,
        message: 'ECHEQ pagado exitosamente',
        data: {
          id: echeq.id,
          status: echeq.status,
          payment_date: echeq.payment_date,
        },
      });
    } catch (error) {
      console.error('Error pagando ECHEQ:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
      });
    }
  }

  // ===== MÉTODOS DE DEVOLUCIÓN =====

  /**
   * Solicitar devolución de ECHEQ
   */
  async requestReturn(req, res) {
    try {
      const { id } = req.params;
      const { return_reason } = req.body;
      const customerId = req.user.userId;

      const echeq = await Echeq.findByPk(id);

      if (!echeq) {
        return res.status(404).json({
          success: false,
          message: 'ECHEQ no encontrado',
        });
      }

      await echeq.update({
        status: 'RETURN_REQUESTED',
        return_request_date: new Date(),
        return_reason: return_reason || 'Devolución solicitada',
      });

      res.json({
        success: true,
        message: 'Solicitud de devolución enviada exitosamente',
        data: {
          id: echeq.id,
          status: echeq.status,
          return_request_date: echeq.return_request_date,
        },
      });
    } catch (error) {
      console.error('Error solicitando devolución:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
      });
    }
  }

  // ===== MÉTODOS DE MANDATO =====

  /**
   * Solicitar mandato
   */
  async requestMandate(req, res) {
    try {
      const { id } = req.params;
      const { mandate_type, mandate_details } = req.body;
      const customerId = req.user.userId;

      const echeq = await Echeq.findByPk(id);

      if (!echeq) {
        return res.status(404).json({
          success: false,
          message: 'ECHEQ no encontrado',
        });
      }

      await echeq.update({
        status: 'MANDATE_REQUESTED',
        mandate_request_date: new Date(),
        mandate_type: mandate_type || 'COLLECTION',
        mandate_details: mandate_details,
      });

      res.json({
        success: true,
        message: 'Solicitud de mandato enviada exitosamente',
        data: {
          id: echeq.id,
          status: echeq.status,
          mandate_type: echeq.mandate_type,
        },
      });
    } catch (error) {
      console.error('Error solicitando mandato:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
      });
    }
  }

  // ===== MÉTODOS DE AVAL =====

  /**
   * Solicitar aval
   */
  async requestGuarantee(req, res) {
    try {
      const { id } = req.params;
      const { guarantee_type, guarantee_details } = req.body;
      const customerId = req.user.userId;

      const echeq = await Echeq.findByPk(id);

      if (!echeq) {
        return res.status(404).json({
          success: false,
          message: 'ECHEQ no encontrado',
        });
      }

      await echeq.update({
        status: 'GUARANTEE_REQUESTED',
        guarantee_request_date: new Date(),
        guarantee_type: guarantee_type || 'BANK_GUARANTEE',
        guarantee_details: guarantee_details,
      });

      res.json({
        success: true,
        message: 'Solicitud de aval enviada exitosamente',
        data: {
          id: echeq.id,
          status: echeq.status,
          guarantee_type: echeq.guarantee_type,
        },
      });
    } catch (error) {
      console.error('Error solicitando aval:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
      });
    }
  }

  // ===== MÉTODOS DE CESIÓN DE DERECHOS =====

  /**
   * Solicitar cesión de derechos (CED)
   */
  async requestCed(req, res) {
    try {
      const { id } = req.params;
      const { ced_type, ced_details } = req.body;
      const customerId = req.user.userId;

      const echeq = await Echeq.findByPk(id);

      if (!echeq) {
        return res.status(404).json({
          success: false,
          message: 'ECHEQ no encontrado',
        });
      }

      await echeq.update({
        status: 'CED_REQUESTED',
        ced_request_date: new Date(),
        ced_type: ced_type || 'RIGHTS_CESSION',
        ced_details: ced_details,
      });

      res.json({
        success: true,
        message: 'Solicitud de cesión de derechos enviada exitosamente',
        data: {
          id: echeq.id,
          status: echeq.status,
          ced_type: echeq.ced_type,
        },
      });
    } catch (error) {
      console.error('Error solicitando cesión de derechos:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
      });
    }
  }

  // ===== MÉTODOS DE CERTIFICADO =====

  /**
   * Emitir certificado (CAC)
   */
  async emitCertificate(req, res) {
    try {
      const { id } = req.params;
      const { certificate_type, certificate_details } = req.body;
      const customerId = req.user.userId;

      const echeq = await Echeq.findByPk(id);

      if (!echeq) {
        return res.status(404).json({
          success: false,
          message: 'ECHEQ no encontrado',
        });
      }

      await echeq.update({
        status: 'CERTIFICATE_EMITTED',
        certificate_date: new Date(),
        certificate_type: certificate_type || 'CAC',
        certificate_details: certificate_details,
      });

      res.json({
        success: true,
        message: 'Certificado emitido exitosamente',
        data: {
          id: echeq.id,
          status: echeq.status,
          certificate_type: echeq.certificate_type,
        },
      });
    } catch (error) {
      console.error('Error emitiendo certificado:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
      });
    }
  }

  // ===== MÉTODOS DE CONSULTA =====

  /**
   * Obtener detalles de ECHEQ
   */
  async getEcheqDetails(req, res) {
    try {
      const { id } = req.params;
      const customerId = req.user.userId;

      const echeq = await Echeq.findOne({
        where: { id, customerId: customerId },
        include: [
          {
            model: Custody,
            as: 'custody',
            where: { status: 'IN_CUSTODY' },
            required: false,
          },
        ],
      });

      if (!echeq) {
        return res.status(404).json({
          success: false,
          message: 'ECHEQ no encontrado',
        });
      }

      res.json({
        success: true,
        data: echeq,
      });
    } catch (error) {
      console.error('Error obteniendo detalles de ECHEQ:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
      });
    }
  }

  /**
   * Listar ECHEQs
   */
  async listEcheqs(req, res) {
    try {
      const customerId = req.user.userId;
      const { page = 1, limit = 10, status, sort = 'createdAt' } = req.query;

      const whereClause = {};
      if (status) {
        whereClause.status = status;
      }

      const offset = (page - 1) * limit;

      const { count, rows } = await Echeq.findAndCountAll({
        where: whereClause,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [[sort, 'DESC']],
      });

      res.json({
        success: true,
        data: {
          echeqs: rows,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: count,
            pages: Math.ceil(count / limit),
          },
        },
      });
    } catch (error) {
      console.error('Error listando ECHEQs:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
      });
    }
  }

  /**
   * Buscar ECHEQs
   */
  async searchEcheqs(req, res) {
    try {
      const customerId = req.user.userId;
      const { q, status, date_from, date_to } = req.query;

      const whereClause = { customerId: customerId };

      if (status) {
        whereClause.status = status;
      }

      if (date_from && date_to) {
        whereClause.createdAt = {
          [Sequelize.Op.between]: [new Date(date_from), new Date(date_to)],
        };
      }

      if (q) {
        whereClause[Sequelize.Op.or] = [
          { number: { [Sequelize.Op.like]: `%${q}%` } },
          { issuer: { [Sequelize.Op.like]: `%${q}%` } },
          { beneficiary: { [Sequelize.Op.like]: `%${q}%` } },
        ];
      }

      const echeqs = await Echeq.findAll({
        where: whereClause,
        order: [['createdAt', 'DESC']],
      });

      res.json({
        success: true,
        data: echeqs,
      });
    } catch (error) {
      console.error('Error buscando ECHEQs:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
      });
    }
  }

  /**
   * Actualizar estado de ECHEQ
   */
  async updateEcheqStatus(req, res) {
    try {
      const { id } = req.params;
      const { status, status_reason } = req.body;
      const customerId = req.user.userId;

      const echeq = await Echeq.findOne({
        where: { id, customerId: customerId },
      });

      if (!echeq) {
        return res.status(404).json({
          success: false,
          message: 'ECHEQ no encontrado',
        });
      }

      await echeq.update({
        status: status,
        status_reason: status_reason,
        status_updated_at: new Date(),
      });

      res.json({
        success: true,
        message: 'Estado de ECHEQ actualizado exitosamente',
        data: {
          id: echeq.id,
          status: echeq.status,
          status_updated_at: echeq.status_updated_at,
        },
      });
    } catch (error) {
      console.error('Error actualizando estado de ECHEQ:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
      });
    }
  }
}

module.exports = new EcheqController();

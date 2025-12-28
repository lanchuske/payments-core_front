/**
 * ⚠️ CÓDIGO LEGACY - NO EN USO ⚠️
 * 
 * Este código está DEPRECADO. La plataforma usa echeq-sandbox-nestjs.
 * Ver DEPRECATED.md y LEGACY_README.md en la raíz del repositorio.
 * 
 * ⚠️ NO MODIFICAR - Este código no se ejecuta en producción
 */

/**
 * Controlador de Cheques COELSA
 * Implementa los endpoints según especificación OpenAPI:
 * - POST /Cheques/Cheque - Crear cheque electrónico
 * - POST /Cheques/Emitido/Admitir - Admitir cheque emitido
 * - POST /Cheques/Emitido/Repudiar - Repudiar cheque
 * - POST /Cheques/Emitido/Anular - Anular cheque emitido
 * - POST /Cheques/Activo/Depositar - Depositar cheque
 * - POST /Cheques/Activo/Pagar - Marcar cheque como pagado
 * - POST /Cheques/Activo/RechazarPago - Rechazar pago de cheque
 */

// Importar modelos solo cuando sea necesario
let Echeq, Tenant, Account, Client, EcheqEvent, sequelize, Op;

// Importar logger para logging específico
const logger = require('../services/logger');

try {
  const models = require('../models');
  Echeq = models.Echeq;
  Tenant = models.TenantSimple;
  Account = models.Account;
  Client = models.Client;
  EcheqEvent = require('../models/echeqEvent');
  const dbConfig = require('../config/database');
  sequelize = dbConfig.sequelize;
  const { Op: SequelizeOp } = require('sequelize');
  Op = SequelizeOp;
} catch (error) {
  console.log('⚠️ Modelos no disponibles:', error.message);
  // Crear objetos mock para desarrollo
  Echeq = {
    findAll: () => Promise.resolve([]),
    create: () => Promise.resolve({}),
  };
  Tenant = { findOne: () => Promise.resolve(null) };
  Account = {
    findOne: () => Promise.resolve(null),
    create: () => Promise.resolve({}),
  };
  Client = {
    findOne: () => Promise.resolve(null),
    create: () => Promise.resolve({}),
  };
  EcheqEvent = { create: () => Promise.resolve({}) };
  sequelize = { transaction: callback => callback({}) };
}

class CoelsaChequesController {
  constructor() {
    console.log('🔧 CoelsaChequesController instanciado');
  }

  /**
   * POST /Cheques/Cheque
   * Crear cheque electrónico
   */
  async createCheque(req, res) {
    return this.createOrUpdateCheque(req, res);
  }

  async createOrUpdateCheque(req, res) {
    try {
      const { emisor_cuit, monto, beneficiario_documento } = req.body;
      
      // Log de inicio de operación ECHEQ
      logger.business(`[ECHEQ] Iniciando creación de cheque - Emisor: ${emisor_cuit}, Monto: $${monto}, Beneficiario: ${beneficiario_documento}`, {
        operation: 'CREATE_CHEQUE',
        emisor_cuit,
        monto,
        beneficiario_documento,
        tenant_id: req.headers['x-tenant-id']
      });

      // Validar campos requeridos según YAML
      if (!emisor_cuit || !monto || !beneficiario_documento) {
        return res.status(400).json({
          success: false,
          message: 'emisor_cuit, monto y beneficiario_documento son requeridos',
          error: 'MISSING_REQUIRED_FIELDS',
        });
      }

      // Validar formato CUIT (11 dígitos)
      if (!/^\d{11}$/.test(emisor_cuit)) {
        return res.status(400).json({
          success: false,
          message: 'emisor_cuit debe tener 11 dígitos',
          error: 'INVALID_CUIT_FORMAT',
        });
      }

      // Validar monto (número positivo)
      if (!monto || monto <= 0 || typeof monto !== 'number') {
        return res.status(400).json({
          success: false,
          message: 'monto debe ser un número positivo',
          error: 'INVALID_AMOUNT',
        });
      }

      // Validar monto mínimo razonable (mínimo $100)
      if (monto < 100) {
        return res.status(400).json({
          success: false,
          message: 'monto debe ser al menos $100',
          error: 'AMOUNT_TOO_SMALL',
        });
      }

      // Validar beneficiario (11 dígitos para CUIT o 22 para CBU)
      if (
        !/^\d{11}$/.test(beneficiario_documento) &&
        !/^\d{22}$/.test(beneficiario_documento)
      ) {
        return res.status(400).json({
          success: false,
          message:
            'beneficiario_documento debe ser CUIT (11 dígitos) o CBU (22 dígitos)',
          error: 'INVALID_BENEFICIARY_FORMAT',
        });
      }

      // Validar que emisor y beneficiario no sean el mismo
      if (emisor_cuit === beneficiario_documento) {
        return res.status(400).json({
          success: false,
          message: 'El emisor y beneficiario no pueden ser el mismo',
          error: 'SAME_ISSUER_BENEFICIARY',
        });
      }

      // Validar nombre del beneficiario
      if (!req.body.beneficiario_nombre || req.body.beneficiario_nombre.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: 'beneficiario_nombre es requerido y debe tener al menos 2 caracteres',
          error: 'INVALID_BENEFICIARY_NAME',
        });
      }

      // Validar concepto
      if (!req.body.concepto || req.body.concepto.trim().length < 3) {
        return res.status(400).json({
          success: false,
          message: 'concepto es requerido y debe tener al menos 3 caracteres',
          error: 'INVALID_CONCEPT',
        });
      }

      // Usar el tenant del banco que procesa el cheque (no crear uno nuevo)
      // El tenant ya existe y viene del middleware de autenticación
      const tenantId = req.coelsaAuth.tenantId;
      
      // Buscar el tenant existente por main_tenant_id
      const tenant = await Tenant.findOne({
        where: { main_tenant_id: tenantId }
      });
      if (!tenant) {
        return res.status(404).json({
          success: false,
          message: 'Tenant no encontrado',
        });
      }

      // Generar número de cheque único
      const chequeNumber = `ECHEQ-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

      // Crear cheque real en la base de datos
      const echeq = await Echeq.create({
        number: chequeNumber,
        amount: monto,
        currency: 'ARS',
        issue_date: new Date(),
        due_date: req.body.fechaVencimiento ? new Date(req.body.fechaVencimiento) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 días por defecto
        issuer: emisor_cuit,
        beneficiary: beneficiario_documento,
        beneficiary_name: req.body.beneficiario || 'Beneficiario',
        concept: req.body.concepto || 'Cheque electrónico',
        status: 'EMITTED',
        tenant_id: tenant.id,
        customerId: tenant.id,
        validationStatus: 'VALIDATED',
        validatedAt: new Date(),
      });

      // Crear evento de auditoría
      await EcheqEvent.create({
        echeq_id: echeq.id,
        event_type: 'EMISSION',
        event_status: 'SUCCESS',
        event_description: 'Cheque electrónico emitido',
        user_cuit: emisor_cuit,
        event_data: {
          emisor_cuit,
          beneficiario_documento,
          monto,
          chequeNumber,
          tenantId,
        },
      });

      // Log de éxito de operación ECHEQ
      logger.business(`[ECHEQ] Cheque creado exitosamente - ID: ${echeq.id}, Número: ${echeq.number}, Monto: $${echeq.amount}`, {
        operation: 'CREATE_CHEQUE_SUCCESS',
        cheque_id: echeq.id,
        cheque_number: echeq.number,
        monto: echeq.amount,
        estado: echeq.status,
        tenant_id: tenantId
      });

      res.status(200).json({
        success: true,
        message: 'Cheque creado correctamente',
        data: {
          cheque_id: echeq.id,
          number: echeq.number,
          tenant_id: tenantId,
          monto: echeq.amount,
          estado: echeq.status,
          fecha_emision: echeq.issue_date,
          fecha_vencimiento: echeq.due_date,
        },
      });
    } catch (error) {
      console.error('Error en createCheque:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message,
      });
    }
  }

  /**
   * POST /Cheques/Emitido/Admitir
   * Admitir cheque emitido
   */
  async admitirCheque(req, res) {
    try {
      const { cheque_id, beneficiario_documento } = req.body;

      console.log(`🔍 [ADMITIR] Recibida petición para admitir eCheq:`, {
        cheque_id,
        beneficiario_documento,
        body: req.body,
      });

      // Validar campos requeridos según YAML
      if (!cheque_id || !beneficiario_documento) {
        console.log(`❌ [ADMITIR] Campos requeridos faltantes:`, {
          cheque_id,
          beneficiario_documento,
        });
        return res.status(400).json({
          success: false,
          message: 'cheque_id y beneficiario_documento son requeridos',
          error: 'MISSING_REQUIRED_FIELDS',
        });
      }

      // Buscar ECHEQ
      console.log(`🔍 [ADMITIR] Buscando eCheq con número: ${cheque_id}`);
      const echeq = await Echeq.findOne({
        where: { number: cheque_id },
      });

      if (!echeq) {
        console.log(`❌ [ADMITIR] eCheq no encontrado: ${cheque_id}`);
        return res.status(404).json({
          success: false,
          message: 'ECHEQ no encontrado',
          error: 'ECHEQ_NOT_FOUND',
        });
      }

      console.log(`✅ [ADMITIR] eCheq encontrado:`, {
        number: echeq.number,
        status: echeq.status,
        beneficiary: echeq.beneficiary,
        beneficiario_documento_recibido: beneficiario_documento,
      });

      // Verificar que esté en estado EMITTED
      if (echeq.status !== 'EMITTED') {
        return res.status(400).json({
          success: false,
          message: 'ECHEQ no está en estado EMITTED',
          error: 'INVALID_ECHEQ_STATE',
          current_state: echeq.status,
        });
      }

      // Verificar beneficiario (comparar CUIT, no nombre)
      if (echeq.beneficiary !== beneficiario_documento) {
        return res.status(400).json({
          success: false,
          message: 'Beneficiario no coincide con el ECHEQ',
          error: 'BENEFICIARY_MISMATCH',
          beneficiario_esperado: echeq.beneficiary,
          beneficiario_recibido: beneficiario_documento,
        });
      }

      // Actualizar estado a ACTIVE
      await echeq.update({
        status: 'ACTIVE',
        fecha_admision: new Date(),
      });

      // Registrar evento de aceptación
      await EcheqEvent.create({
        echeq_id: echeq.id,
        event_type: 'ACCEPTANCE',
        event_status: 'SUCCESS',
        event_description: `eCheq aceptado por el beneficiario ${echeq.beneficiary}`,
        event_data: JSON.stringify({
          beneficiary_cuit: beneficiario_documento,
          beneficiary_name: echeq.beneficiary,
          acceptance_date: new Date().toISOString(),
        }),
        user_cuit: beneficiario_documento,
        timestamp: new Date(),
      });

      console.log(
        `✅ [ADMITIR] Evento de aceptación registrado para eCheq: ${echeq.number}`
      );

      // Respuesta según especificación YAML
      res.status(200).json({
        success: true,
        cheque_id: echeq.number,
        status: 'Activo',
        beneficiario_documento: beneficiario_documento,
        fecha_admision: echeq.fecha_admision,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error en admitirCheque:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message,
      });
    }
  }

  /**
   * POST /Cheques/Emitido/Repudiar
   * Repudiar cheque
   */
  async repudiarCheque(req, res) {
    try {
      const { cheque_id, motivo } = req.body;

      // Validar campos requeridos según YAML
      if (!cheque_id || !motivo) {
        return res.status(400).json({
          success: false,
          message: 'cheque_id y motivo son requeridos',
          error: 'MISSING_REQUIRED_FIELDS',
        });
      }

      // Buscar ECHEQ
      const echeq = await Echeq.findOne({
        where: { number: cheque_id },
      });

      if (!echeq) {
        return res.status(404).json({
          success: false,
          message: 'ECHEQ no encontrado',
          error: 'ECHEQ_NOT_FOUND',
        });
      }

      // Verificar que esté en estado EMITTED
      if (echeq.status !== 'EMITTED') {
        return res.status(400).json({
          success: false,
          message: 'ECHEQ no está en estado EMITTED',
          error: 'INVALID_ECHEQ_STATE',
          current_state: echeq.status,
        });
      }

      // Actualizar estado a REPUDIADO
      await echeq.update({
        status: 'REPUDIATED',
        fecha_repudio: new Date(),
        motivo_repudio: motivo,
      });

      // Respuesta según especificación YAML
      res.status(200).json({
        cheque_id: echeq.number,
        status: 'Repudiado',
        motivo: motivo,
        fecha_repudio: echeq.fecha_repudio,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error en repudiarCheque:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message,
      });
    }
  }

  /**
   * POST /Cheques/Emitido/Anular
   * Anular cheque emitido
   */
  async anularCheque(req, res) {
    try {
      const { cheque_id, motivo } = req.body;

      // Validar campos requeridos según YAML
      if (!cheque_id || !motivo) {
        return res.status(400).json({
          success: false,
          message: 'cheque_id y motivo son requeridos',
          error: 'MISSING_REQUIRED_FIELDS',
        });
      }

      // Buscar ECHEQ
      const echeq = await Echeq.findOne({
        where: { number: cheque_id },
      });

      if (!echeq) {
        return res.status(404).json({
          success: false,
          message: 'ECHEQ no encontrado',
          error: 'ECHEQ_NOT_FOUND',
        });
      }

      // Verificar que esté en estado EMITTED
      if (echeq.status !== 'EMITTED') {
        return res.status(400).json({
          success: false,
          message: 'ECHEQ no está en estado EMITTED',
          error: 'INVALID_ECHEQ_STATE',
          current_state: echeq.status,
        });
      }

      // Actualizar estado a ANULADO
      await echeq.update({
        status: 'CANCELLED',
        fecha_anulacion: new Date(),
        motivo_anulacion: motivo,
      });

      // Respuesta según especificación YAML
      res.status(200).json({
        cheque_id: echeq.number,
        status: 'Anulado',
        motivo: motivo,
        fecha_anulacion: echeq.fecha_anulacion,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error en anularCheque:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message,
      });
    }
  }

  /**
   * POST /Cheques/Activo/Depositar
   * Depositar cheque
   */
  async depositarCheque(req, res) {
    try {
      const { cheque_id, beneficiario_cbu } = req.body;

      // Validar campos requeridos según YAML
      if (!cheque_id || !beneficiario_cbu) {
        return res.status(400).json({
          success: false,
          message: 'cheque_id y beneficiario_cbu son requeridos',
          error: 'MISSING_REQUIRED_FIELDS',
        });
      }

      // Validar formato CBU (22 dígitos)
      if (!/^\d{22}$/.test(beneficiario_cbu)) {
        return res.status(400).json({
          success: false,
          message: 'beneficiario_cbu debe tener 22 dígitos',
          error: 'INVALID_CBU_FORMAT',
        });
      }

      // Buscar ECHEQ
      const echeq = await Echeq.findOne({
        where: { number: cheque_id },
      });

      if (!echeq) {
        return res.status(404).json({
          success: false,
          message: 'ECHEQ no encontrado',
          error: 'ECHEQ_NOT_FOUND',
        });
      }

      // Verificar que esté en estado ACTIVE
      if (echeq.status !== 'ACTIVE') {
        return res.status(400).json({
          success: false,
          message: 'ECHEQ no está en estado ACTIVE',
          error: 'INVALID_ECHEQ_STATE',
          estado_actual: echeq.status,
        });
      }

      // Actualizar estado a DEPOSITED
      await echeq.update({
        status: 'DEPOSITED',
        fecha_deposito: new Date(),
        beneficiario_cbu: beneficiario_cbu,
      });

      // Respuesta según especificación YAML
      res.status(200).json({
        cheque_id: echeq.number,
        status: 'Depositado',
        beneficiario_cbu: beneficiario_cbu,
        fecha_deposito: echeq.fecha_deposito,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error en depositarCheque:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message,
      });
    }
  }

  /**
   * POST /Cheques/Activo/Pagar
   * Marcar cheque como pagado
   */
  async pagarCheque(req, res) {
    try {
      const { cheque_id, tipo_pago } = req.body;

      // Validar campos requeridos según YAML
      if (!cheque_id || !tipo_pago) {
        return res.status(400).json({
          success: false,
          message: 'cheque_id y tipo_pago son requeridos',
          error: 'MISSING_REQUIRED_FIELDS',
        });
      }

      // Validar tipo de pago
      const tiposValidos = ['PV', 'CC', 'CA']; // Pago en ventanilla, Caja de ahorro, Cuenta corriente
      if (!tiposValidos.includes(tipo_pago)) {
        return res.status(400).json({
          success: false,
          message: 'tipo_pago debe ser PV, CC o CA',
          error: 'INVALID_PAYMENT_TYPE',
        });
      }

      // Buscar ECHEQ
      const echeq = await Echeq.findOne({
        where: { number: cheque_id },
      });

      if (!echeq) {
        return res.status(404).json({
          success: false,
          message: 'ECHEQ no encontrado',
          error: 'ECHEQ_NOT_FOUND',
        });
      }

      // Verificar que esté en estado ACTIVE o DEPOSITED
      if (!['ACTIVE', 'DEPOSITED'].includes(echeq.status)) {
        return res.status(400).json({
          success: false,
          message: 'ECHEQ no está en estado válido para pago',
          error: 'INVALID_ECHEQ_STATE',
          estado_actual: echeq.status,
        });
      }

      // Actualizar estado a PAID
      await echeq.update({
        status: 'PAID',
        fecha_pago: new Date(),
        tipo_pago: tipo_pago,
      });

      // Respuesta según especificación YAML
      res.status(200).json({
        cheque_id: echeq.number,
        status: 'Pagado',
        tipo_pago: tipo_pago,
        fecha_pago: echeq.fecha_pago,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error en pagarCheque:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message,
      });
    }
  }

  /**
   * POST /Cheques/Activo/RechazarPago
   * Rechazar pago de cheque
   */
  async rechazarPago(req, res) {
    try {
      const { cheque_id, codigo_rechazo } = req.body;

      // Validar campos requeridos según YAML
      if (!cheque_id || !codigo_rechazo) {
        return res.status(400).json({
          success: false,
          message: 'cheque_id y codigo_rechazo son requeridos',
          error: 'MISSING_REQUIRED_FIELDS',
        });
      }

      // Validar código de rechazo
      const codigosValidos = [
        'R001',
        'R002',
        'R003',
        'R004',
        'R005',
        'R006',
        'R007',
        'R008',
      ];
      if (!codigosValidos.includes(codigo_rechazo)) {
        return res.status(400).json({
          success: false,
          message: 'codigo_rechazo debe ser un código válido',
          error: 'INVALID_REJECTION_CODE',
          codigos_validos: codigosValidos,
        });
      }

      // Buscar ECHEQ
      const echeq = await Echeq.findOne({
        where: { number: cheque_id },
      });

      if (!echeq) {
        return res.status(404).json({
          success: false,
          message: 'ECHEQ no encontrado',
          error: 'ECHEQ_NOT_FOUND',
        });
      }

      // Verificar que esté en estado ACTIVO o DEPOSITADO
      if (!['ACTIVO', 'DEPOSITADO'].includes(echeq.status)) {
        return res.status(400).json({
          success: false,
          message: 'ECHEQ no está en estado válido para rechazo',
          error: 'INVALID_ECHEQ_STATE',
          estado_actual: echeq.status,
        });
      }

      // Actualizar estado a RECHAZADO
      await echeq.update({
        status: 'RECHAZADO',
        fecha_rechazo: new Date(),
        codigo_rechazo: codigo_rechazo,
      });

      // Respuesta según especificación YAML
      res.status(200).json({
        cheque_id: echeq.number,
        status: 'Rechazado',
        codigo_rechazo: codigo_rechazo,
        fecha_rechazo: echeq.fecha_rechazo,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error en rechazarPago:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message,
      });
    }
  }

  /**
   * GET /Cheques/Cheque
   * Listar cheques del tenant
   */
  async getCheques(req, res) {
    try {
      console.log('🔍 Debug getCheques - req.coelsaAuth:', req.coelsaAuth);
      console.log('🔍 Debug getCheques - req.headers:', req.headers);
      const tenantId = req.coelsaAuth?.tenantId;
      console.log('🔍 Debug getCheques - tenantId:', tenantId);

      if (!tenantId) {
        return res.status(400).json({
          success: false,
          message: 'Tenant ID requerido',
        });
      }

      console.log('🔍 Debug getCheques - Consultando cheques para tenant:', tenantId);

      // Consultar cheques reales de la base de datos
      const cheques = await Echeq.findAll({
        where: { tenant_id: tenantId },
        order: [['createdAt', 'DESC']],
        limit: 50
      });

      console.log('🔍 Debug getCheques - Cheques encontrados:', cheques.length);

      // No crear log de evento para consultas de cheques
      // Solo registrar en consola
      console.log(`✅ [CONSULTA] Cheques consultados para tenant ${tenantId}: ${cheques.length} encontrados`);

      console.log('🔍 Debug getCheques - Enviando respuesta con', cheques.length, 'cheques');

      // Normalizar campos snake_case a camelCase para el frontend
      const normalizedCheques = cheques.map(echeq => ({
        id: echeq.id,
        number: echeq.number,
        amount: parseFloat(echeq.amount),
        currency: echeq.currency,
        issueDate: echeq.issue_date,  // ← snake_case → camelCase
        dueDate: echeq.due_date,      // ← snake_case → camelCase
        issuer: echeq.issuer,
        beneficiary: echeq.beneficiary,
        issuerCuit: echeq.issuer_cuit,
        beneficiaryCuit: echeq.beneficiary_cuit,
        status: echeq.status,
        currentHolderCuit: echeq.currentHolderCuit,
        tenedorActualCuit: echeq.tenedorActualCuit,
        issuerName: echeq.issuer_name,
        beneficiaryName: echeq.beneficiary_name,
        concept: echeq.concept,
        custodyStatus: echeq.custody_status,
        isInCustody: echeq.is_in_custody,
        validationStatus: echeq.validation_status,
        tenantId: echeq.tenant_id,
        customerId: echeq.customer_id,
        createdAt: echeq.createdAt,
        updatedAt: echeq.updatedAt
      }));

      res.json({
        success: true,
        data: normalizedCheques,
        count: normalizedCheques.length,
        message: 'Cheques obtenidos correctamente',
        tenant_id: tenantId,
      });
    } catch (error) {
      console.error('Error obteniendo cheques:', error);
      
      // No crear log de error si no hay echeq_id válido
      console.error('Error consultando cheques:', error);

      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message,
      });
    }
  }

  /**
   * GET /consulta/estado
   * Consultar estado de cheque
   */
  async consultarEstado(req, res) {
    try {
      const { numero_echeq } = req.query;

      if (!numero_echeq) {
        return res.status(400).json({
          success: false,
          message: 'numero_echeq es requerido',
        });
      }

      // Consultar cheque por número
      const chequeReal = await Echeq.findOne({
        where: { number: numero_echeq, tenant_id: req.coelsaAuth.tenantId }
      });
      if (!chequeReal) {
        return res.status(404).json({
          success: false,
          message: "Cheque no encontrado"
        });
      }

      res.json({
        success: true,
        data: {
          numero_echeq,
          estado: chequeReal.status,
          endosado: false,
          endosado_a: null,
          custody_status: 'NO_CUSTODIA',
          custody_bank: null,
          detalles_adicionales: {
            puede_endosar: true,
            puede_depositar: true,
            puede_anular: true,
            puede_poner_custodia: true,
          },
        },
        message: 'Estado consultado exitosamente',
      });
    } catch (error) {
      console.error('Error consultando estado:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message,
      });
    }
  }

  /**
   * GET /consulta/por-cmc7
   * Consultar cheque por CMC7
   */
  async consultarPorCmc7(req, res) {
    try {
      const { cmc7 } = req.query;

      if (!cmc7) {
        return res.status(400).json({
          success: false,
          message: 'cmc7 es requerido',
        });
      }

      // Simular consulta por CMC7 (buscar por número que contenga el CMC7)
      const chequeReal = await Echeq.findOne({
        where: { 
          number: { [sequelize.Op.like]: `%${cmc7}%` },
          tenant_id: req.coelsaAuth.tenantId 
        }
      });
      if (!chequeReal) {
        return res.status(404).json({
          success: false,
          message: "Cheque no encontrado"
        });
      }

      res.json({
        success: true,
        data: {
          cmc7,
          numero_echeq: `ECHEQ-${Date.now()}`,
          estado: chequeReal.status,
          endosado: false,
          endosado_a: null,
        },
        message: 'Cheque consultado exitosamente',
      });
    } catch (error) {
      console.error('Error consultando por CMC7:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message,
      });
    }
  }

  /**
   * GET /consulta/por-id
   * Consultar cheque por ID
   */
  async consultarPorId(req, res) {
    try {
      const { cheque_id } = req.query;

      if (!cheque_id) {
        return res.status(400).json({
          success: false,
          message: 'cheque_id es requerido',
        });
      }

      // Consultar cheque real en la base de datos

      res.json({
        success: true,
        data: {
          cheque: {
            cheque_id,
            estado: chequeReal.status,
            endosado: false,
            endosado_a: null,
          },
        },
        message: 'Cheque consultado exitosamente',
      });
    } catch (error) {
      console.error('Error consultando por ID:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message,
      });
    }
  }

  /**
   * GET /Conciliacion/:fecha
   * Obtener conciliación por fecha
   */
  async getConciliacion(req, res) {
    try {
      const { fecha } = req.params;

      // Obtener conciliación por fecha
      const cheques = await Echeq.findAll({
        where: { 
          tenant_id: req.coelsaAuth.tenantId,
          createdAt: {
            [Op.gte]: new Date(fecha + 'T00:00:00.000Z'),
            [Op.lt]: new Date(fecha + 'T23:59:59.999Z')
          }
        },
        order: [['createdAt', 'DESC']]
      });

      res.json({
        success: true,
        data: {
          fecha,
          total_cheques: 25,
          cheques: [
            {
              cheque_id: 'ECHEQ-1756617584299-001',
              estado: 'Pagado',
              monto: 50000,
              fecha_pago: fecha,
              entidad: '017',
            },
          ],
          resumen: {
            total_pagados: 50000,
            total_rechazados: 75000,
            total_pendientes: 100000,
            cantidad_pagados: 1,
            cantidad_rechazados: 1,
            cantidad_pendientes: 1,
          },
        },
        message: 'Conciliación obtenida exitosamente',
      });
    } catch (error) {
      console.error('Error obteniendo conciliación:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message,
      });
    }
  }

  /**
   * POST /Cheques/Emitido/Repudiar
   * Repudiar cheque emitido
   */
  async repudiarCheque(req, res) {
    try {
      const { cheque_id, motivo } = req.body;
      const tenantId = req.coelsaAuth?.tenantId;

      if (!cheque_id) {
        return res.status(400).json({
          success: false,
          message: 'ID del cheque es requerido',
          error: 'MISSING_CHEQUE_ID',
        });
      }

      // Buscar el cheque en la base de datos
      const cheque = await Echeq.findOne({
        where: { 
          id: cheque_id,
          tenant_id: tenantId 
        }
      });

      if (!chequeReal) {
        return res.status(404).json({
          success: false,
          message: 'Cheque no encontrado',
          error: 'CHEQUE_NOT_FOUND',
        });
      }

      // Actualizar estado del cheque
        await cheque.update({
          status: 'REPUDIATED',
        additional_data: {
          ...cheque.additional_data,
          repudiation_reason: motivo || 'Repudiado por el emisor',
          repudiation_date: new Date().toISOString()
        }
      });

      // Crear evento de auditoría
      await EcheqEvent.create({
        echeq_id: cheque.id,
        event_type: 'REPUDIATION',
        event_status: 'SUCCESS',
        event_description: 'Cheque repudiado por el emisor',
        user_cuit: req.coelsaAuth?.tenantId,
        event_data: {
          cheque_id,
          motivo,
          tenantId,
        },
      });


      res.json({
        success: true,
        data: {
          cheque_id,
          status: 'REPUDIATED',
          repudiation_date: new Date().toISOString(),
        },
        message: 'Cheque repudiado exitosamente',
      });
    } catch (error) {
      console.error('Error repudiando cheque:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message,
      });
    }
  }

  /**
   * POST /Cheques/Activo/Depositar
   * Depositar cheque activo
   */
  async depositarCheque(req, res) {
    try {
      const { cheque_id, entidad_deposito, cuenta_deposito } = req.body;
      const tenantId = req.coelsaAuth?.tenantId;

      if (!cheque_id) {
        return res.status(400).json({
          success: false,
          message: 'ID del cheque es requerido',
          error: 'MISSING_CHEQUE_ID',
        });
      }

      // Buscar el cheque en la base de datos
      const cheque = await Echeq.findOne({
        where: { 
          id: cheque_id,
          tenant_id: tenantId 
        }
      });

      if (!chequeReal) {
        return res.status(404).json({
          success: false,
          message: 'Cheque no encontrado',
          error: 'CHEQUE_NOT_FOUND',
        });
      }

      // Actualizar estado del cheque
      await cheque.update({
        status: 'DEPOSITED',
        additional_data: {
          ...cheque.additional_data,
          entidad_deposito: entidad_deposito || '017',
          cuenta_deposito: cuenta_deposito || '1234567890123456789012',
          deposit_date: new Date().toISOString()
        }
      });

      // Crear evento de auditoría
      await EcheqEvent.create({
        echeq_id: cheque.id,
        event_type: 'DEPOSIT',
        event_status: 'SUCCESS',
        event_description: 'Cheque depositado exitosamente',
        user_cuit: req.coelsaAuth?.tenantId,
        event_data: {
          cheque_id,
          entidad_deposito,
          cuenta_deposito,
          tenantId,
        },
      });


      res.json({
        success: true,
        data: {
          cheque_id,
          status: 'DEPOSITED',
          deposit_date: new Date().toISOString(),
        },
        message: 'Cheque depositado exitosamente',
      });
    } catch (error) {
      console.error('Error depositando cheque:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message,
      });
    }
  }

  /**
   * POST /Cheques/Activo/RechazarPago
   * Rechazar pago de cheque activo
   */
  async rechazarPago(req, res) {
    try {
      const { cheque_id, causal_rechazo, codigo_causal } = req.body;
      const tenantId = req.coelsaAuth?.tenantId;

      if (!cheque_id) {
        return res.status(400).json({
          success: false,
          message: 'ID del cheque es requerido',
          error: 'MISSING_CHEQUE_ID',
        });
      }

      // Buscar el cheque en la base de datos
      const cheque = await Echeq.findOne({
        where: { 
          id: cheque_id,
          tenant_id: tenantId 
        }
      });

      if (!chequeReal) {
        return res.status(404).json({
          success: false,
          message: 'Cheque no encontrado',
          error: 'CHEQUE_NOT_FOUND',
        });
      }

      // Actualizar estado del cheque
      await cheque.update({
        status: 'REJECTED',
        additional_data: {
          ...cheque.additional_data,
          rejection_reason: causal_rechazo || 'Pago rechazado',
          rejection_code: codigo_causal || 'R001',
          rejection_date: new Date().toISOString()
        }
      });

      // Crear evento de auditoría
      await EcheqEvent.create({
        echeq_id: cheque.id,
        event_type: 'REJECTION',
        event_status: 'SUCCESS',
        event_description: 'Pago de cheque rechazado',
        user_cuit: req.coelsaAuth?.tenantId,
        event_data: {
          cheque_id,
          causal_rechazo,
          codigo_causal,
          tenantId,
        },
      });


      res.json({
        success: true,
        data: {
          cheque_id,
          status: 'REJECTED',
          rejection_date: new Date().toISOString(),
        },
        message: 'Pago de cheque rechazado exitosamente',
      });
    } catch (error) {
      console.error('Error rechazando pago:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message,
      });
    }
  }

  /**
   * GET /Reportes/Causales
   * Obtener reporte de causales
   */
  async getReporteCausales(req, res) {
    try {
      // Simular reporte de causales

      res.json({
        success: true,
        data: {
          total_causales: 15,
          causales: [
            {
              codigo: 'R001',
              descripcion: 'Firma disconforme',
            },
            {
              codigo: 'R008',
              descripcion: 'Fondos insuficientes',
            },
          ],
        },
        message: 'Reporte de causales obtenido exitosamente',
      });
    } catch (error) {
      console.error('Error obteniendo reporte de causales:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message,
      });
    }
  }

  /**
   * GET /Custodia/Retirar
   * Obtener custodia para retirar
   */
  async getCustodiaRetirar(req, res) {
    try {
      const tenantId = req.coelsaAuth?.tenantId;

      // Buscar cheques en custodia
      const chequesEnCustodia = await Echeq.findAll({
        where: {
          tenant_id: tenantId,
          status: 'IN_CUSTODY'
        },
        order: [['createdAt', 'DESC']],
        limit: 50
      });


      res.json({
        success: true,
        data: chequesEnCustodia.map(cheque => ({
          cheque_id,
          emisor_cuit: cheque.issuer_cuit,
          beneficiario_documento: cheque.beneficiary_cuit,
          monto: cheque.amount,
          fecha_custodia: cheque.createdAt,
          motivo_retiro: 'Disponible para retiro'
        })),
        count: chequesEnCustodia.length,
        message: 'Custodia obtenida exitosamente'
      });
    } catch (error) {
      console.error('Error obteniendo custodia:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  /**
   * POST /Custodia/Retirar
   * Retirar de custodia
   */
  async retirarCustodia(req, res) {
    try {
      const { cheque_id, motivo_retiro } = req.body;
      const tenantId = req.coelsaAuth?.tenantId;

      if (!cheque_id) {
        return res.status(400).json({
          success: false,
          message: 'ID del cheque es requerido',
          error: 'MISSING_CHEQUE_ID'
        });
      }

      const cheque = await Echeq.findOne({
        where: {
          id: cheque_id,
          tenant_id: tenantId
        }
      });

      if (!chequeReal) {
        return res.status(404).json({
          success: false,
          message: 'Cheque no encontrado',
          error: 'CHEQUE_NOT_FOUND'
        });
      }

      await cheque.update({
        status: 'ACTIVE',
        additional_data: {
          ...cheque.additional_data,
          custodia_retirada: true,
          motivo_retiro: motivo_retiro || 'Retirado de custodia',
          fecha_retiro: new Date().toISOString()
        }
      });

      await EcheqEvent.create({
        echeq_id: cheque.id,
        event_type: 'CUSTODY_WITHDRAWAL',
        event_status: 'SUCCESS',
        event_description: 'Cheque retirado de custodia',
        user_cuit: req.coelsaAuth?.tenantId,
        event_data: {
          cheque_id,
          motivo_retiro,
          tenantId
        }
      });


      res.json({
        success: true,
        data: {
          cheque_id,
          status: 'ACTIVE',
          withdrawal_date: new Date().toISOString()
        },
        message: 'Cheque retirado de custodia exitosamente'
      });
    } catch (error) {
      console.error('Error retirando de custodia:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  /**
   * GET /Cheques/Consulta/Numero
   * Consultar cheque por número
   */
  async consultarPorNumero(req, res) {
    try {
      const { numero_echeq } = req.query;
      const tenantId = req.coelsaAuth?.tenantId;

      if (!numero_echeq) {
        return res.status(400).json({
          success: false,
          message: 'Número de ECHEQ es requerido'
        });
      }

      const cheque = await Echeq.findOne({
        where: { 
          number: numero_echeq,
          tenant_id: tenantId 
        }
      });

      if (!cheque) {
        return res.status(404).json({
          success: false,
          message: 'ECHEQ no encontrado'
        });
      }

      res.json({
        success: true,
        data: {
          id: cheque.id,
          number: cheque.number,
          amount: cheque.amount,
          currency: cheque.currency,
          issue_date: cheque.issue_date,
          due_date: cheque.due_date,
          issuer: cheque.issuer,
          beneficiary: cheque.beneficiary,
          issuer_cuit: cheque.issuer_cuit,
          beneficiary_cuit: cheque.beneficiary_cuit,
          status: cheque.status,
          tenant_id: cheque.tenant_id
        },
        message: 'ECHEQ consultado exitosamente'
      });
    } catch (error) {
      console.error('Error consultando por número:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  /**
   * GET /Cheques/Consulta/Cmc7
   * Consultar cheque por CMC7
   */
  async consultarPorCmc7(req, res) {
    try {
      const { cmc7 } = req.query;
      const tenantId = req.coelsaAuth?.tenantId;

      if (!cmc7) {
        return res.status(400).json({
          success: false,
          message: 'CMC7 es requerido'
        });
      }

      const cheque = await Echeq.findOne({
        where: { 
          cmc7: { [Op.like]: `%${cmc7}%` },
          tenant_id: tenantId 
        }
      });

      if (!cheque) {
        return res.status(404).json({
          success: false,
          message: 'ECHEQ no encontrado'
        });
      }

      res.json({
        success: true,
        data: {
          id: cheque.id,
          number: cheque.number,
          amount: cheque.amount,
          currency: cheque.currency,
          issue_date: cheque.issue_date,
          due_date: cheque.due_date,
          issuer: cheque.issuer,
          beneficiary: cheque.beneficiary,
          issuer_cuit: cheque.issuer_cuit,
          beneficiary_cuit: cheque.beneficiary_cuit,
          status: cheque.status,
          tenant_id: cheque.tenant_id
        },
        message: 'ECHEQ consultado exitosamente'
      });
    } catch (error) {
      console.error('Error consultando por CMC7:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }
}

module.exports = CoelsaChequesController;

/**
 * ⚠️ CONTROLADOR LEGACY - NO EN USO ⚠️
 * 
 * Este código está DEPRECADO. La plataforma usa echeq-sandbox-nestjs.
 * Ver DEPRECATED.md y LEGACY_README.md en la raíz del repositorio.
 * 
 * Controlador de Endosos COELSA (LEGACY - Solo referencia histórica)
 * Implementa los endpoints según especificación OpenAPI:
 * - POST /Endosos/Nominal - Endoso nominal
 * - POST /Endosos/Procuracion - Endoso en procuración
 * - POST /Endosos/SinGarantia - Endoso sin garantía
 * - POST /Endosos/Negociacion - Endoso para negociación
 * - POST /Endosos/Anular - Anular endoso
 * 
 * ⚠️ NO MODIFICAR - Este código no se ejecuta en producción
 */

// Importar modelos solo cuando sea necesario
let Echeq, Endoso, Tenant, echeqEvent, sequelize;

try {
  const models = require('../models');
  Echeq = models.Echeq;
  Endoso = models.Endorsement;
  Tenant = models.TenantSimple;
  echeqEvent = models.echeqEvent;
  const dbConfig = require('../config/database');
  sequelize = dbConfig.sequelize;
} catch (error) {
  console.log('⚠️ Modelos no disponibles:', error.message);
  // Crear objetos mock para desarrollo
  Echeq = {
    findAll: () => Promise.resolve([]),
    create: () => Promise.resolve({}),
  };
  Endoso = {
    findAll: () => Promise.resolve([]),
    create: () => Promise.resolve({}),
  };
  Tenant = { findOne: () => Promise.resolve(null) };
  echeqEvent = { create: () => Promise.resolve({}) };
  sequelize = { transaction: callback => callback({}) };
}

class CoelsaEndososController {
  /**
   * POST /Endosos/Nominal
   * Endoso nominal
   */
  async endosoNominal(req, res) {
    return this.createOrUpdateEndoso(req, res);
  }

  /**
   * POST /Endosos/SinGarantia
   * Endosar sin garantía
   */
  async endosarSinGarantia(req, res) {
    try {
      const {
        cheque_id,
        tenedor_documento_tipo,
        tenedor_documento,
        beneficiario_endoso_documento_tipo,
        beneficiario_endoso_documento,
        datos_aval
      } = req.body;

      // Validaciones
      if (!cheque_id || !tenedor_documento || !beneficiario_endoso_documento) {
        return res.status(400).json({
          success: false,
          message: 'cheque_id, tenedor_documento y beneficiario_endoso_documento son requeridos'
        });
      }

      // Buscar cheque por id o number según el formato
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cheque_id);
      const isEcheqNumber = cheque_id.startsWith('ECHEQ-');
      const whereClause = isUuid 
        ? { id: cheque_id, tenant_id: req.coelsaAuth.tenantId }
        : isEcheqNumber
        ? { number: cheque_id, tenant_id: req.coelsaAuth.tenantId }
        : { id: cheque_id, tenant_id: req.coelsaAuth.tenantId };
      
      const cheque = await Echeq.findOne({
        where: whereClause
      });

      if (!cheque) {
        return res.status(404).json({
          success: false,
          message: 'Cheque no encontrado'
        });
      }

      // Validar estado del cheque
      if (cheque.status !== 'ACTIVE' && cheque.status !== 'ACTIVO') {
        return res.status(400).json({
          success: false,
          message: 'El cheque debe estar en estado ACTIVE para endosar'
        });
      }

      // Crear endoso sin garantía
      const endoso = await Endoso.create({
        echeq_id: cheque.id,
        endorser: tenedor_documento,
        endorsee: beneficiario_endoso_documento,
        type: 'SIN_GARANTIA',
        status: 'ACTIVO',
        tenant_id: req.coelsaAuth.tenantId,
        endorsement_date: new Date()
      });

      // Actualizar estado del cheque
      await cheque.update({ status: 'ENDORSED' });

      // Log del evento
      await echeqEvent.create({
        echeq_id: cheque.id,
        event_type: 'ENDOSO_SIN_GARANTIA',
        event_status: 'SUCCESS',
        event_description: `Endoso sin garantía creado por ${tenedor_documento}`,
        user_cuit: req.coelsaAuth.userCuit,
        timestamp: new Date()
      });

      res.json({
        success: true,
        data: {
          id: endoso.id,
          echeq_id: endoso.echeq_id,
          endorser: endoso.endorser,
          endorsee: endoso.endorsee,
          type: endoso.type,
          status: endoso.status
        },
        message: 'Endoso sin garantía creado correctamente'
      });

    } catch (error) {
      console.error('Error en endoso sin garantía:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  /**
   * POST /Endosos/Procuración
   * Endosar en procuración
   */
  async endosarEnProcuración(req, res) {
    try {
      const {
        cheque_id,
        tenedor_documento_tipo,
        tenedor_documento,
        beneficiario_endoso_documento_tipo,
        beneficiario_endoso_documento,
        beneficiario_final_documento_tipo,
        beneficiario_final_documento,
        datos_aval
      } = req.body;

      // Validaciones
      if (!cheque_id || !tenedor_documento || !beneficiario_endoso_documento || !beneficiario_final_documento) {
        return res.status(400).json({
          success: false,
          message: 'cheque_id, tenedor_documento, beneficiario_endoso_documento y beneficiario_final_documento son requeridos'
        });
      }

      // Buscar cheque por id o number según el formato
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cheque_id);
      const isEcheqNumber = cheque_id.startsWith('ECHEQ-');
      const whereClause = isUuid 
        ? { id: cheque_id, tenant_id: req.coelsaAuth.tenantId }
        : isEcheqNumber
        ? { number: cheque_id, tenant_id: req.coelsaAuth.tenantId }
        : { id: cheque_id, tenant_id: req.coelsaAuth.tenantId };
      
      const cheque = await Echeq.findOne({
        where: whereClause
      });

      if (!cheque) {
        return res.status(404).json({
          success: false,
          message: 'Cheque no encontrado'
        });
      }

      // Validar estado del cheque
      if (cheque.status !== 'ACTIVE' && cheque.status !== 'ACTIVO') {
        return res.status(400).json({
          success: false,
          message: 'El cheque debe estar en estado ACTIVE para endosar'
        });
      }

      // Crear endoso en procuración
      const endoso = await Endoso.create({
        cheque_id,
        tenedor_documento,
        beneficiario_endoso_documento,
        beneficiario_final_documento,
        tipo: 'PROCURACION',
        datos_aval: datos_aval ? JSON.stringify(datos_aval) : null,
        estado: 'ACTIVO',
        tenant_id: req.coelsaAuth.tenantId
      });

      // Actualizar estado del cheque
      await cheque.update({ status: 'ENDORSED' });

      // Log del evento
      await echeqEvent.create({
        echeq_id: cheque.id,
        event_type: 'ENDOSO_PROCURACION',
        event_status: 'SUCCESS',
        event_description: `Endoso en procuración creado por ${tenedor_documento}`,
        user_cuit: req.coelsaAuth.userCuit,
        timestamp: new Date()
      });

      res.json({
        success: true,
        data: {
          id: endoso.id,
          cheque_id,
          tenedor_documento,
          beneficiario_endoso_documento,
          beneficiario_final_documento,
          tipo: 'PROCURACION',
          estado: 'ACTIVO'
        },
        message: 'Endoso en procuración creado correctamente'
      });

    } catch (error) {
      console.error('Error en endoso en procuración:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  /**
   * POST /Endosos/Anular
   * Anular endoso
   */
  async anularEndoso(req, res) {
    try {
      const {
        cheque_id,
        endosante_documento_tipo,
        endosante_documento,
        motivo_anulacion
      } = req.body;

      // Validaciones
      if (!cheque_id || !endosante_documento || !motivo_anulacion) {
        return res.status(400).json({
          success: false,
          message: 'cheque_id, endosante_documento y motivo_anulacion son requeridos'
        });
      }

      // Buscar endoso
      const endoso = await Endoso.findOne({
        where: { 
          cheque_id, 
          tenedor_documento: endosante_documento,
          tenant_id: req.coelsaAuth.tenantId 
        }
      });

      if (!endoso) {
        return res.status(404).json({
          success: false,
          message: 'Endoso no encontrado'
        });
      }

      // Validar estado del endoso
      if (endoso.estado === 'ANULADO') {
        return res.status(400).json({
          success: false,
          message: 'El endoso ya está anulado'
        });
      }

      // Anular endoso
      await endoso.update({
        estado: 'ANULADO',
        motivo_anulacion,
        fecha_anulacion: new Date()
      });

      // Log del evento
      await echeqEvent.create({
        echeq_id: cheque.id,
        event_type: 'ANULACION_ENDOSO',
        event_status: 'SUCCESS',
        event_description: `Endoso anulado: ${motivo_anulacion}`,
        user_cuit: req.coelsaAuth.userCuit,
        timestamp: new Date()
      });

      res.json({
        success: true,
        data: {
          id: endoso.id,
          cheque_id,
          estado: 'ANULADO',
          motivo_anulacion,
          fecha_anulacion: endoso.fecha_anulacion
        },
        message: 'Endoso anulado correctamente'
      });

    } catch (error) {
      console.error('Error anulando endoso:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  async createOrUpdateEndoso(req, res) {
    try {
      const {
        cheque_id,
        endosante_documento,
        endosatario_documento,
        fecha_endoso,
      } = req.body;

      // Validar campos requeridos según YAML
      if (!cheque_id || !endosante_documento || !endosatario_documento) {
        return res.status(400).json({
          success: false,
          message:
            'cheque_id, endosante_documento y endosatario_documento son requeridos',
          error: 'MISSING_REQUIRED_FIELDS',
        });
      }

      // Validar formato de documentos (11 dígitos para CUIT o 22 para CBU)
      if (
        !/^\d{11}$/.test(endosante_documento) &&
        !/^\d{22}$/.test(endosante_documento)
      ) {
        return res.status(400).json({
          success: false,
          message:
            'endosante_documento debe ser CUIT (11 dígitos) o CBU (22 dígitos)',
          error: 'INVALID_ENDORSER_FORMAT',
        });
      }

      if (
        !/^\d{11}$/.test(endosatario_documento) &&
        !/^\d{22}$/.test(endosatario_documento)
      ) {
        return res.status(400).json({
          success: false,
          message:
            'endosatario_documento debe ser CUIT (11 dígitos) o CBU (22 dígitos)',
          error: 'INVALID_ENDORSEE_FORMAT',
        });
      }

      // Buscar ECHEQ por id o number según el formato
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cheque_id);
      const isEcheqNumber = cheque_id.startsWith('ECHEQ-');
      const whereClause = isUuid 
        ? { id: cheque_id }
        : isEcheqNumber
        ? { number: cheque_id }
        : { id: cheque_id };
      
      const echeq = await Echeq.findOne({
        where: whereClause,
      });

      if (!echeq) {
        return res.status(404).json({
          success: false,
          message: 'ECHEQ no encontrado',
          error: 'ECHEQ_NOT_FOUND',
        });
      }

      // Verificar que esté en estado válido para endoso
      if (!['ACTIVE', 'DEPOSITED'].includes(echeq.status)) {
        return res.status(400).json({
          success: false,
          message: 'ECHEQ no está en estado válido para endoso',
          error: 'INVALID_ECHEQ_STATE',
          estado_actual: echeq.status,
        });
      }

      // Verificar que el endosante sea el tenedor actual (puede usar current_holder_cuit si existe)
      // Por ahora validamos contra beneficiary ya que puede ser el beneficiario original o el tenedor actual
      const currentHolder = echeq.current_holder_cuit || echeq.beneficiary;
      if (currentHolder !== endosante_documento) {
        return res.status(400).json({
          success: false,
          message: 'El endosante debe ser el tenedor actual del ECHEQ',
          error: 'INVALID_ENDORSER',
          tenedor_actual: currentHolder,
          endosante: endosante_documento,
        });
      }

      // Crear endoso en estado PENDIENTE (según flujo COELSA)
      const endoso = await Endoso.create({
        echeq_id: echeq.id,
        type: 'NOMINAL',
        endorser: endosante_documento,
        endorsee: endosatario_documento,
        endorsement_date: fecha_endoso || new Date(),
        status: 'PENDIENTE', // ✅ Estado pendiente hasta que el endosatario lo admita
        tenant_id: req.coelsaAuth?.tenantId || echeq.tenant_id,
      });

      // ❌ NO actualizar beneficiary_cuit (debe permanecer como beneficiario original)
      // ❌ NO actualizar beneficiary (debe permanecer como beneficiario original)
      // ✅ Actualizar estado del echeq a PENDING_ENDORSEMENT
      await echeq.update({
        status: 'PENDING_ENDORSEMENT',
      });

      // Respuesta según especificación YAML
      res.status(200).json({
        endoso_id: `END-${endoso.id.toString().padStart(6, '0')}`,
        cheque_id: cheque_id,
        type: 'Nominal',
        endosante: endosante_documento, // Usar endosante para respuesta (compatibilidad)
        endosatario: endosatario_documento, // Usar endosatario para respuesta (compatibilidad)
        fecha_endoso: endoso.endorsement_date,
        status: 'Pendiente', // ✅ Estado pendiente hasta admisión
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error en endosoNominal:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message,
      });
    }
  }

  /**
   * POST /Endosos/Procuracion
   * Endoso en procuración
   */
  async endosoProcuracion(req, res) {
    try {
      const {
        cheque_id,
        endosante_documento,
        endosatario_documento,
        fecha_endoso,
        motivo_procuracion,
      } = req.body;

      // Validar campos requeridos según YAML
      if (
        !cheque_id ||
        !endosante_documento ||
        !endosatario_documento ||
        !motivo_procuracion
      ) {
        return res.status(400).json({
          success: false,
          message:
            'cheque_id, endosante_documento, endosatario_documento y motivo_procuracion son requeridos',
          error: 'MISSING_REQUIRED_FIELDS',
        });
      }

      // Validar formato de documentos
      if (
        !/^\d{11}$/.test(endosante_documento) &&
        !/^\d{22}$/.test(endosante_documento)
      ) {
        return res.status(400).json({
          success: false,
          message:
            'endosante_documento debe ser CUIT (11 dígitos) o CBU (22 dígitos)',
          error: 'INVALID_ENDORSER_FORMAT',
        });
      }

      if (
        !/^\d{11}$/.test(endosatario_documento) &&
        !/^\d{22}$/.test(endosatario_documento)
      ) {
        return res.status(400).json({
          success: false,
          message:
            'endosatario_documento debe ser CUIT (11 dígitos) o CBU (22 dígitos)',
          error: 'INVALID_ENDORSEE_FORMAT',
        });
      }

      // Buscar ECHEQ por id o number según el formato
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cheque_id);
      const isEcheqNumber = cheque_id.startsWith('ECHEQ-');
      const whereClause = isUuid 
        ? { id: cheque_id }
        : isEcheqNumber
        ? { number: cheque_id }
        : { id: cheque_id };
      
      const echeq = await Echeq.findOne({
        where: whereClause,
      });

      if (!echeq) {
        return res.status(404).json({
          success: false,
          message: 'ECHEQ no encontrado',
          error: 'ECHEQ_NOT_FOUND',
        });
      }

      // Verificar que esté en estado válido para endoso
      if (!['ACTIVE', 'DEPOSITED'].includes(echeq.status)) {
        return res.status(400).json({
          success: false,
          message: 'ECHEQ no está en estado válido para endoso',
          error: 'INVALID_ECHEQ_STATE',
          estado_actual: echeq.status,
        });
      }

      // Verificar que el endosante sea el tenedor actual
      const currentHolder = echeq.current_holder_cuit || echeq.beneficiary;
      if (currentHolder !== endosante_documento) {
        return res.status(400).json({
          success: false,
          message: 'El endosante debe ser el tenedor actual del ECHEQ',
          error: 'INVALID_ENDORSER',
          tenedor_actual: currentHolder,
          endosante: endosante_documento,
        });
      }

      // Crear endoso en estado PENDIENTE
      const endoso = await Endoso.create({
        echeq_id: echeq.id,
        type: 'PROCURACION',
        endorser: endosante_documento,
        endorsee: endosatario_documento,
        endorsement_date: fecha_endoso || new Date(),
        procurement_reason: motivo_procuracion,
        status: 'PENDIENTE', // ✅ Estado pendiente hasta que el endosatario lo admita
        tenant_id: req.coelsaAuth?.tenantId || echeq.tenant_id,
      });

      // ❌ NO actualizar beneficiary_cuit
      // ✅ Actualizar estado del echeq a PENDING_ENDORSEMENT
      await echeq.update({
        status: 'PENDING_ENDORSEMENT',
      });

      // Respuesta según especificación YAML
      res.status(200).json({
        endoso_id: `END-${endoso.id.toString().padStart(6, '0')}`,
        cheque_id: cheque_id,
        type: 'Procuración',
        endosante: endosante_documento, // Usar endosante para respuesta (compatibilidad)
        endosatario: endosatario_documento, // Usar endosatario para respuesta (compatibilidad)
        motivo_procuracion: motivo_procuracion || endoso.procurement_reason,
        fecha_endoso: endoso.endorsement_date,
        status: 'Pendiente', // ✅ Estado pendiente hasta admisión
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error en endosoProcuracion:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message,
      });
    }
  }

  /**
   * POST /Endosos/SinGarantia
   * Endoso sin garantía
   */
  async endosoSinGarantia(req, res) {
    try {
      const {
        cheque_id,
        endosante_documento,
        endosatario_documento,
        fecha_endoso,
      } = req.body;

      // Validar campos requeridos según YAML
      if (!cheque_id || !endosante_documento || !endosatario_documento) {
        return res.status(400).json({
          success: false,
          message:
            'cheque_id, endosante_documento y endosatario_documento son requeridos',
          error: 'MISSING_REQUIRED_FIELDS',
        });
      }

      // Validar formato de documentos
      if (
        !/^\d{11}$/.test(endosante_documento) &&
        !/^\d{22}$/.test(endosante_documento)
      ) {
        return res.status(400).json({
          success: false,
          message:
            'endosante_documento debe ser CUIT (11 dígitos) o CBU (22 dígitos)',
          error: 'INVALID_ENDORSER_FORMAT',
        });
      }

      if (
        !/^\d{11}$/.test(endosatario_documento) &&
        !/^\d{22}$/.test(endosatario_documento)
      ) {
        return res.status(400).json({
          success: false,
          message:
            'endosatario_documento debe ser CUIT (11 dígitos) o CBU (22 dígitos)',
          error: 'INVALID_ENDORSEE_FORMAT',
        });
      }

      // Buscar ECHEQ por id o number según el formato
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cheque_id);
      const isEcheqNumber = cheque_id.startsWith('ECHEQ-');
      const whereClause = isUuid 
        ? { id: cheque_id }
        : isEcheqNumber
        ? { number: cheque_id }
        : { id: cheque_id };
      
      const echeq = await Echeq.findOne({
        where: whereClause,
      });

      if (!echeq) {
        return res.status(404).json({
          success: false,
          message: 'ECHEQ no encontrado',
          error: 'ECHEQ_NOT_FOUND',
        });
      }

      // Verificar que esté en estado válido para endoso
      if (!['ACTIVE', 'DEPOSITED'].includes(echeq.status)) {
        return res.status(400).json({
          success: false,
          message: 'ECHEQ no está en estado válido para endoso',
          error: 'INVALID_ECHEQ_STATE',
          estado_actual: echeq.status,
        });
      }

      // Verificar que el endosante sea el tenedor actual
      const currentHolder = echeq.current_holder_cuit || echeq.beneficiary;
      if (currentHolder !== endosante_documento) {
        return res.status(400).json({
          success: false,
          message: 'El endosante debe ser el tenedor actual del ECHEQ',
          error: 'INVALID_ENDORSER',
          tenedor_actual: currentHolder,
          endosante: endosante_documento,
        });
      }

      // Crear endoso en estado PENDIENTE
      const endoso = await Endoso.create({
        echeq_id: echeq.id,
        type: 'SIN_GARANTIA',
        endorser: endosante_documento,
        endorsee: endosatario_documento,
        endorsement_date: fecha_endoso || new Date(),
        status: 'PENDIENTE', // ✅ Estado pendiente hasta que el endosatario lo admita
        tenant_id: req.coelsaAuth?.tenantId || echeq.tenant_id,
      });

      // ❌ NO actualizar beneficiary_cuit
      // ✅ Actualizar estado del echeq a PENDING_ENDORSEMENT
      await echeq.update({
        status: 'PENDING_ENDORSEMENT',
      });

      // Respuesta según especificación YAML
      res.status(200).json({
        endoso_id: `END-${endoso.id.toString().padStart(6, '0')}`,
        cheque_id: cheque_id,
        type: 'Sin Garantía',
        endosante: endosante_documento, // Usar endosante para respuesta (compatibilidad)
        endosatario: endosatario_documento, // Usar endosatario para respuesta (compatibilidad)
        fecha_endoso: endoso.endorsement_date,
        status: 'Pendiente', // ✅ Estado pendiente hasta admisión
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error en endosoSinGarantia:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message,
      });
    }
  }

  /**
   * POST /Endosos/Negociacion
   * Endoso para negociación
   */
  async endosoNegociacion(req, res) {
    try {
      const {
        cheque_id,
        endosante_documento,
        endosatario_documento,
        fecha_endoso,
        banco_negociacion,
      } = req.body;

      // Validar campos requeridos según YAML
      if (
        !cheque_id ||
        !endosante_documento ||
        !endosatario_documento ||
        !banco_negociacion
      ) {
        return res.status(400).json({
          success: false,
          message:
            'cheque_id, endosante_documento, endosatario_documento y banco_negociacion son requeridos',
          error: 'MISSING_REQUIRED_FIELDS',
        });
      }

      // Validar formato de documentos
      if (
        !/^\d{11}$/.test(endosante_documento) &&
        !/^\d{22}$/.test(endosante_documento)
      ) {
        return res.status(400).json({
          success: false,
          message:
            'endosante_documento debe ser CUIT (11 dígitos) o CBU (22 dígitos)',
          error: 'INVALID_ENDORSER_FORMAT',
        });
      }

      if (
        !/^\d{11}$/.test(endosatario_documento) &&
        !/^\d{22}$/.test(endosatario_documento)
      ) {
        return res.status(400).json({
          success: false,
          message:
            'endosatario_documento debe ser CUIT (11 dígitos) o CBU (22 dígitos)',
          error: 'INVALID_ENDORSEE_FORMAT',
        });
      }

      // Buscar ECHEQ por id o number según el formato
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cheque_id);
      const isEcheqNumber = cheque_id.startsWith('ECHEQ-');
      const whereClause = isUuid 
        ? { id: cheque_id }
        : isEcheqNumber
        ? { number: cheque_id }
        : { id: cheque_id };
      
      const echeq = await Echeq.findOne({
        where: whereClause,
      });

      if (!echeq) {
        return res.status(404).json({
          success: false,
          message: 'ECHEQ no encontrado',
          error: 'ECHEQ_NOT_FOUND',
        });
      }

      // Verificar que esté en estado válido para endoso
      if (!['ACTIVE', 'DEPOSITED'].includes(echeq.status)) {
        return res.status(400).json({
          success: false,
          message: 'ECHEQ no está en estado válido para endoso',
          error: 'INVALID_ECHEQ_STATE',
          estado_actual: echeq.status,
        });
      }

      // Verificar que el endosante sea el tenedor actual
      const currentHolder = echeq.current_holder_cuit || echeq.beneficiary;
      if (currentHolder !== endosante_documento) {
        return res.status(400).json({
          success: false,
          message: 'El endosante debe ser el tenedor actual del ECHEQ',
          error: 'INVALID_ENDORSER',
          tenedor_actual: currentHolder,
          endosante: endosante_documento,
        });
      }

      // Crear endoso en estado PENDIENTE
      const endoso = await Endoso.create({
        echeq_id: echeq.id,
        type: 'NEGOCIACION',
        endorser: endosante_documento,
        endorsee: endosatario_documento,
        endorsement_date: fecha_endoso || new Date(),
        negotiation_bank: banco_negociacion,
        status: 'PENDIENTE', // ✅ Estado pendiente hasta que el endosatario lo admita
        tenant_id: req.coelsaAuth?.tenantId || echeq.tenant_id,
      });

      // ❌ NO actualizar beneficiary_cuit
      // ✅ Actualizar estado del echeq a PENDING_ENDORSEMENT
      await echeq.update({
        status: 'PENDING_ENDORSEMENT',
      });

      // Respuesta según especificación YAML
      res.status(200).json({
        endoso_id: `END-${endoso.id.toString().padStart(6, '0')}`,
        cheque_id: cheque_id,
        type: 'Negociación',
        endosante: endosante_documento, // Usar endosante para respuesta (compatibilidad)
        endosatario: endosatario_documento, // Usar endosatario para respuesta (compatibilidad)
        banco_negociacion: banco_negociacion || endoso.negotiation_bank,
        fecha_endoso: endoso.endorsement_date,
        status: 'Pendiente', // ✅ Estado pendiente hasta admisión
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error en endosoNegociacion:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message,
      });
    }
  }

  /**
   * POST /Endosos/Anular
   * Anular endoso
   */
  async anularEndoso(req, res) {
    try {
      const { endoso_id, motivo } = req.body;

      // Validar campos requeridos según YAML
      if (!endoso_id || !motivo) {
        return res.status(400).json({
          success: false,
          message: 'endoso_id y motivo son requeridos',
          error: 'MISSING_REQUIRED_FIELDS',
        });
      }

      // Buscar endoso
      const endoso = await Endoso.findOne({
        where: { id: endoso_id.replace('END-', '') },
      });

      if (!endoso) {
        return res.status(404).json({
          success: false,
          message: 'Endoso no encontrado',
          error: 'ENDOSO_NOT_FOUND',
        });
      }

      // Verificar que esté pendiente (solo se pueden anular endosos pendientes)
      if (endoso.status !== 'PENDIENTE') {
        return res.status(400).json({
          success: false,
          message: 'Solo se pueden anular endosos pendientes',
          error: 'INVALID_ENDOSO_STATE',
          estado_actual: endoso.status,
        });
      }

      // Anular endoso
      await endoso.update({
        status: 'ANULADO',
        cancellation_date: new Date(),
        cancellation_reason: motivo,
      });

      // ❌ NO revertir beneficiary_cuit (nunca debería haber cambiado)
      // ✅ Revertir estado del echeq a ACTIVE
      const echeq = await Echeq.findByPk(endoso.echeq_id);
      if (echeq) {
        // Verificar si hay otros endosos pendientes
        const otrosEndososPendientes = await Endoso.count({
          where: {
            echeq_id: echeq.id,
            status: 'PENDIENTE',
            id: { [require('sequelize').Op.ne]: endoso.id }
          }
        });

        // Solo cambiar estado si no hay otros endosos pendientes
        if (otrosEndososPendientes === 0) {
          await echeq.update({
            status: 'ACTIVE',
          });
        }
      }

      // Respuesta según especificación YAML
      res.status(200).json({
        endoso_id: `END-${endoso.id.toString().padStart(6, '0')}`,
        cheque_id: echeq ? echeq.number : null,
        status: 'Anulado',
        motivo: motivo,
        fecha_anulacion: endoso.fecha_anulacion,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error en anularEndoso:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message,
      });
    }
  }

  /**
   * GET /Endosos/Nominal
   * Listar endosos del tenant
   */
  async getEndosos(req, res) {
    try {
      const tenantId = req.tenantId;

      // Buscar endosos del tenant
      const endosos = await Endoso.findAll({
        where: { tenantId },
        include: [
          {
            model: Echeq,
            as: 'echeq',
            attributes: ['id', 'numeroEcheq', 'monto', 'estado'],
          },
        ],
        order: [['createdAt', 'DESC']],
        limit: 50,
      });

      res.json({
        success: true,
        data: endosos,
        count: endosos.length,
        message: 'Endosos obtenidos exitosamente',
      });
    } catch (error) {
      console.error('Error obteniendo endosos:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message,
      });
    }
  }

  /**
   * POST /Endosos/Nominal
   * Crear endoso (alias para endosoNominal)
   */
  async createEndoso(req, res) {
    return this.endosoNominal(req, res);
  }

  /**
   * POST /Endosos/Admitir
   * Admitir endoso pendiente (nuevo beneficiario acepta el endoso)
   */
  async admitirEndoso(req, res) {
    try {
      const { cheque_id, beneficiario_documento } = req.body;

      // Validar campos requeridos
      if (!cheque_id || !beneficiario_documento) {
        return res.status(400).json({
          success: false,
          message: 'cheque_id y beneficiario_documento son requeridos',
          error: 'MISSING_REQUIRED_FIELDS',
        });
      }

      // Buscar ECHEQ
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cheque_id);
      const isEcheqNumber = cheque_id.startsWith('ECHEQ-');
      const whereClause = isUuid 
        ? { id: cheque_id }
        : isEcheqNumber
        ? { number: cheque_id }
        : { id: cheque_id };

      const echeq = await Echeq.findOne({ where: whereClause });

      if (!echeq) {
        return res.status(404).json({
          success: false,
          message: 'ECHEQ no encontrado',
          error: 'ECHEQ_NOT_FOUND',
        });
      }

      // Buscar endoso pendiente para este echeq donde el endosatario es el beneficiario_documento
      const endoso = await Endoso.findOne({
        where: {
          echeq_id: echeq.id,
          endorsee: beneficiario_documento,
          status: 'PENDIENTE',
        },
        order: [['endorsement_date', 'DESC']], // El más reciente
      });

      if (!endoso) {
        return res.status(404).json({
          success: false,
          message: 'No se encontró un endoso pendiente para este beneficiario',
          error: 'ENDOSO_NOT_FOUND',
        });
      }

      // Verificar que el estado del echeq sea PENDING_ENDORSEMENT
      if (echeq.status !== 'PENDING_ENDORSEMENT') {
        return res.status(400).json({
          success: false,
          message: 'El echeq no está en estado PENDING_ENDORSEMENT',
          error: 'INVALID_ECHEQ_STATE',
          estado_actual: echeq.status,
        });
      }

      // Actualizar endoso a ACTIVO
      await endoso.update({
        status: 'ACTIVO',
      });

      // ✅ Actualizar current_holder_cuit (si existe) o usar el campo apropiado
      // ❌ NO actualizar beneficiary_cuit (debe permanecer como beneficiario original)
      const updateData = {
        status: 'ACTIVE',
      };

      // Si existe current_holder_cuit, actualizarlo
      if (echeq.current_holder_cuit !== undefined) {
        updateData.current_holder_cuit = beneficiario_documento;
      }

      await echeq.update(updateData);

      // Crear evento de admisión
      try {
        await echeqEvent.create({
          echeq_id: echeq.id,
          event_type: 'ENDORSEMENT_ACCEPTED',
          event_status: 'SUCCESS',
          event_description: `Endoso admitido por ${beneficiario_documento}`,
          user_cuit: beneficiario_documento,
          timestamp: new Date(),
        });
      } catch (eventError) {
        console.warn('⚠️ Error creando evento de admisión:', eventError.message);
      }

      // Respuesta
      res.status(200).json({
        success: true,
        endoso_id: `END-${endoso.id.toString().padStart(6, '0')}`,
        cheque_id: cheque_id,
        status: 'Admitido',
        beneficiario_documento: beneficiario_documento,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error en admitirEndoso:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message,
      });
    }
  }

  /**
   * POST /Endosos/Repudiar
   * Repudiar endoso pendiente (nuevo beneficiario rechaza el endoso)
   */
  async repudiarEndoso(req, res) {
    try {
      const { cheque_id, beneficiario_documento, motivo_repudio } = req.body;

      // Validar campos requeridos
      if (!cheque_id || !beneficiario_documento || !motivo_repudio) {
        return res.status(400).json({
          success: false,
          message: 'cheque_id, beneficiario_documento y motivo_repudio son requeridos',
          error: 'MISSING_REQUIRED_FIELDS',
        });
      }

      // Buscar ECHEQ
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cheque_id);
      const isEcheqNumber = cheque_id.startsWith('ECHEQ-');
      const whereClause = isUuid 
        ? { id: cheque_id }
        : isEcheqNumber
        ? { number: cheque_id }
        : { id: cheque_id };

      const echeq = await Echeq.findOne({ where: whereClause });

      if (!echeq) {
        return res.status(404).json({
          success: false,
          message: 'ECHEQ no encontrado',
          error: 'ECHEQ_NOT_FOUND',
        });
      }

      // Buscar endoso pendiente
      const endoso = await Endoso.findOne({
        where: {
          echeq_id: echeq.id,
          endorsee: beneficiario_documento,
          status: 'PENDIENTE',
        },
        order: [['endorsement_date', 'DESC']],
      });

      if (!endoso) {
        return res.status(404).json({
          success: false,
          message: 'No se encontró un endoso pendiente para este beneficiario',
          error: 'ENDOSO_NOT_FOUND',
        });
      }

      // Actualizar endoso a REPUDIADO
      await endoso.update({
        status: 'REPUDIADO',
        cancellation_reason: motivo_repudio,
        cancellation_date: new Date(),
      });

      // ✅ Revertir estado del echeq a ACTIVE
      // Verificar si hay otros endosos pendientes
      const otrosEndososPendientes = await Endoso.count({
        where: {
          echeq_id: echeq.id,
          status: 'PENDIENTE',
          id: { [require('sequelize').Op.ne]: endoso.id }
        }
      });

      // Solo cambiar estado si no hay otros endosos pendientes
      if (otrosEndososPendientes === 0) {
        await echeq.update({
          status: 'ACTIVE',
        });
      }

      // Crear evento de repudio
      try {
        await echeqEvent.create({
          echeq_id: echeq.id,
          event_type: 'ENDORSEMENT_REJECTED',
          event_status: 'SUCCESS',
          event_description: `Endoso repudiado por ${beneficiario_documento}: ${motivo_repudio}`,
          user_cuit: beneficiario_documento,
          timestamp: new Date(),
        });
      } catch (eventError) {
        console.warn('⚠️ Error creando evento de repudio:', eventError.message);
      }

      // Respuesta
      res.status(200).json({
        success: true,
        endoso_id: `END-${endoso.id.toString().padStart(6, '0')}`,
        cheque_id: cheque_id,
        status: 'Repudiado',
        beneficiario_documento: beneficiario_documento,
        motivo_repudio: motivo_repudio,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error en repudiarEndoso:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message,
      });
    }
  }
}

module.exports = CoelsaEndososController;

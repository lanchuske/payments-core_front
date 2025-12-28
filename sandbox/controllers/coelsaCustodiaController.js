/**
 * ⚠️ CÓDIGO LEGACY - NO EN USO ⚠️
 * 
 * Este código está DEPRECADO. La plataforma usa echeq-sandbox-nestjs.
 * Ver DEPRECATED.md y LEGACY_README.md en la raíz del repositorio.
 * 
 * ⚠️ NO MODIFICAR - Este código no se ejecuta en producción
 */

/**
 * Controlador COELSA - Custodia
 * Implementa operaciones de custodia de cheques según especificación COELSA
 */

// Importar modelos solo cuando sea necesario
let Custody, Echeq, User, Tenant;

try {
  const models = require('../models');
  Custody = models.Custody;
  Echeq = models.Echeq;
  User = models.User;
  Tenant = models.Tenant;
} catch (error) {
  console.log('⚠️ Modelos no disponibles:', error.message);
  // Crear objetos mock para desarrollo
  Custody = {
    findAll: () => Promise.resolve([]),
    create: () => Promise.resolve({}),
  };
  Echeq = { findOne: () => Promise.resolve(null) };
  User = { findOne: () => Promise.resolve(null) };
  Tenant = { findOne: () => Promise.resolve(null) };
}

const { v4: uuidv4 } = require('uuid');

/**
 * Poner cheque en custodia
 * POST /Custodia/Poner
 */
const ponerEnCustodia = async (req, res) => {
  try {
    const { cheque_id, emisor_cuit, beneficiario_documento } = req.body;

    // Validaciones
    if (!cheque_id || !emisor_cuit || !beneficiario_documento) {
      return res.status(400).json({
        success: false,
        message: 'cheque_id, emisor_cuit y beneficiario_documento son requeridos',
        error: 'MISSING_REQUIRED_FIELDS',
        timestamp: new Date().toISOString(),
      });
    }

    // Crear custodia
    const custodia = await Custody.create({
      id: uuidv4(),
      echeq_id: cheque_id,
      customer_id: uuidv4(), // Generar UUID válido para customer_id
      emisor_cuit,
      status: 'IN_CUSTODY',
      tenant_id: req.coelsaAuth.tenantId,
      custody_date: new Date(),
      motivo: 'Custodia por solicitud',
      custodian_info: `Custodia para ${beneficiario_documento}`,
    });

    res.status(200).json({
      success: true,
      message: 'Cheque puesto en custodia exitosamente',
      data: {
        custodia_id: custodia.id,
        cheque_id: custodia.echeq_id,
        emisor_cuit: custodia.emisor_cuit,
        beneficiario_documento: custodia.customer_id,
        status: custodia.status,
        fecha_custodia: custodia.fecha_custodia,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error en ponerEnCustodia:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Rescatar cheque de custodia
 * POST /Custodia/Rescatar
 */
const rescatarDeCustodia = async (req, res) => {
  try {
    const { cheque_id, customer_id, motivo_rescate } = req.body;

    // Validaciones
    if (!cheque_id || !customer_id) {
      return res.status(400).json({
        success: false,
        message: 'cheque_id y customer_id son requeridos',
        error: 'MISSING_REQUIRED_FIELDS',
        timestamp: new Date().toISOString(),
      });
    }

    // Buscar custodia activa
    const custodia = await Custody.findOne({
      where: {
        echeqId: cheque_id,
        customerId: customer_id,
        status: 'IN_CUSTODY',
      },
    });

    if (!custodia) {
      return res.status(404).json({
        success: false,
        message: 'No se encontró custodia activa para este cheque y usuario',
        error: 'CUSTODY_NOT_FOUND',
        timestamp: new Date().toISOString(),
      });
    }

    // Actualizar estado de custodia
    await custodia.update({
      status: 'RESCATADA',
      fecha_rescate: new Date(),
      motivo_rescate: motivo_rescate || 'Rescate solicitado por el usuario',
    });

    res.status(200).json({
      success: true,
      message: 'Cheque rescatado de custodia exitosamente',
      data: {
        id: custodia.id,
        cheque_id: custodia.echeqId,
        customerId: custodia.customerId,
        fecha_rescate: custodia.fecha_rescate,
        motivo_rescate: custodia.motivo_rescate,
        status: custodia.status,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error en rescatarDeCustodia:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Consultar estado de custodia
 * GET /Custodia/Estado/{cheque_id}
 */
const consultarEstadoCustodia = async (req, res) => {
  try {
    const { cheque_id } = req.params;

    if (!cheque_id) {
      return res.status(400).json({
        success: false,
        message: 'cheque_id es requerido',
        error: 'MISSING_REQUIRED_FIELDS',
        timestamp: new Date().toISOString(),
      });
    }

    // Buscar custodia del cheque
    const custodia = await Custody.findOne({
      where: { echeqId: cheque_id },
      include: [
        {
          model: Echeq,
          as: 'echeq',
          attributes: ['id', 'numero_cheque', 'monto', 'beneficiario'],
        },
        {
          model: User,
          as: 'customer',
          attributes: ['id', 'name', 'email'],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    if (!custodia) {
      return res.status(200).json({
        success: true,
        message: 'El cheque no está en custodia',
        data: {
          en_custodia: false,
          cheque_id: cheque.id,
          timestamp: new Date().toISOString(),
        },
      });
    }

    res.status(200).json({
      success: true,
      message: 'Estado de custodia consultado exitosamente',
      data: {
        en_custodia: true,
        id: custodia.id,
        cheque_id: custodia.echeqId,
        customerId: custodia.customerId,
        fecha_custodia: custodia.fecha_custodia,
        motivo: custodia.motivo,
        status: custodia.status,
        fecha_rescate: custodia.fecha_rescate,
        motivo_rescate: custodia.motivo_rescate,
        cheque: custodia.echeq,
        customer: custodia.customer,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error en consultarEstadoCustodia:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
};

const getCustodia = async (req, res) => {
  try {
    const tenantId = req.tenantId;

    // Buscar custodia del tenant
    const custodia = await Custody.findAll({
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
      data: custodia,
      count: custodia.length,
      message: 'Custodia obtenida exitosamente',
    });
  } catch (error) {
    console.error('Error obteniendo custodia:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message,
    });
  }
};

module.exports = {
  getCustodia,
  ponerEnCustodia,
  rescatarDeCustodia,
  consultarEstadoCustodia,
};

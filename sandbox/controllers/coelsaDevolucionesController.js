/**
 * Controlador COELSA - Devoluciones
 * Implementa operaciones de devolución de cheques según especificación COELSA
 */

// Importar modelos solo cuando sea necesario
let Devolucion, Echeq, User, Tenant;

try {
  const models = require('../models');
  Devolucion = models.Return;
  Echeq = models.Echeq;
  User = models.User;
  Tenant = models.TenantSimple;
} catch (error) {
  console.log('⚠️ Modelos no disponibles:', error.message);
  // Crear objetos mock para desarrollo
  Devolucion = {
    findAll: () => Promise.resolve([]),
    create: () => Promise.resolve({}),
  };
  Echeq = { findOne: () => Promise.resolve(null) };
  User = { findOne: () => Promise.resolve(null) };
  Tenant = { findOne: () => Promise.resolve(null) };
}

const { v4: uuidv4 } = require('uuid');

/**
 * Solicitar devolución
 * POST /Devoluciones/Solicitar
 */
const solicitarDevolucion = async (req, res) => {
  try {
    const { cheque_id, motivo, fecha_solicitud } = req.body;

    // Validaciones
    if (!cheque_id || !motivo || !fecha_solicitud) {
      return res.status(400).json({
        success: false,
        message:
          'Todos los campos son requeridos: cheque_id, motivo, fecha_solicitud',
        error: 'MISSING_REQUIRED_FIELDS',
        timestamp: new Date().toISOString(),
      });
    }

    // Verificar que el cheque existe
    const cheque = await Echeq.findOne({ where: { number: cheque_id } });
    if (!cheque) {
      return res.status(404).json({
        success: false,
        message: 'Cheque no encontrado',
        error: 'CHEQUE_NOT_FOUND',
        timestamp: new Date().toISOString(),
      });
    }

    // Verificar que no haya una devolución pendiente
    const devolucionExistente = await Devolucion.findOne({
      where: {
        cheque_id: cheque.id,
        status: 'PENDIENTE',
      },
    });

    if (devolucionExistente) {
      return res.status(409).json({
        success: false,
        message:
          'Ya existe una solicitud de devolución pendiente para este cheque',
        error: 'DEVOLUCION_ALREADY_PENDING',
        timestamp: new Date().toISOString(),
      });
    }

    // Crear solicitud de devolución
    const devolucion = await Devolucion.create({
      id: uuidv4(),
      cheque_id: cheque.id,
      motivo: motivo,
      fecha_solicitud: fecha_solicitud,
      status: 'PENDIENTE',
      solicitante_id: req.userId || '8f34610f-2903-4d0b-9b6d-99267f91537e',
      tenantId: req.tenantId || 'da8a5c42-31c0-4c01-8157-742b99010780',
    });

    res.status(200).json({
      success: true,
      message: 'Solicitud de devolución creada exitosamente',
      data: {
        id: devolucion.id,
        cheque_id: devolucion.cheque_id,
        motivo: devolucion.motivo,
        fecha_solicitud: devolucion.fecha_solicitud,
        status: devolucion.status,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error en solicitarDevolucion:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Anular devolución
 * POST /Devoluciones/Anular
 */
const anularDevolucion = async (req, res) => {
  try {
    const { devolucion_id, motivo_anulacion } = req.body;

    if (!devolucion_id) {
      return res.status(400).json({
        success: false,
        message: 'devolucion_id es requerido',
        error: 'MISSING_REQUIRED_FIELDS',
        timestamp: new Date().toISOString(),
      });
    }

    const devolucion = await Devolucion.findByPk(devolucion_id);
    if (!devolucion) {
      return res.status(404).json({
        success: false,
        message: 'Devolución no encontrada',
        error: 'DEVOLUCION_NOT_FOUND',
        timestamp: new Date().toISOString(),
      });
    }

    if (devolucion.status !== 'PENDIENTE') {
      return res.status(400).json({
        success: false,
        message: 'Solo se pueden anular devoluciones pendientes',
        error: 'INVALID_DEVOLUCION_STATE',
        timestamp: new Date().toISOString(),
      });
    }

    await devolucion.update({
      status: 'ANULADA',
      motivo_rechazo: motivo_anulacion || 'Anulada por el solicitante',
    });

    res.status(200).json({
      success: true,
      message: 'Devolución anulada exitosamente',
      data: {
        id: devolucion.id,
        status: devolucion.status,
        motivo_rechazo: devolucion.motivo_rechazo,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error en anularDevolucion:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Aceptar devolución
 * POST /Devoluciones/Aceptar
 */
const aceptarDevolucion = async (req, res) => {
  try {
    const { devolucion_id, aprobador_id } = req.body;

    if (!devolucion_id || !aprobador_id) {
      return res.status(400).json({
        success: false,
        message: 'devolucion_id y aprobador_id son requeridos',
        error: 'MISSING_REQUIRED_FIELDS',
        timestamp: new Date().toISOString(),
      });
    }

    const devolucion = await Devolucion.findByPk(devolucion_id);
    if (!devolucion) {
      return res.status(404).json({
        success: false,
        message: 'Devolución no encontrada',
        error: 'DEVOLUCION_NOT_FOUND',
        timestamp: new Date().toISOString(),
      });
    }

    if (devolucion.status !== 'PENDIENTE') {
      return res.status(400).json({
        success: false,
        message: 'Solo se pueden aceptar devoluciones pendientes',
        error: 'INVALID_DEVOLUCION_STATE',
        timestamp: new Date().toISOString(),
      });
    }

    await devolucion.update({
      status: 'APROBADA',
      aprobador_id: aprobador_id,
      fecha_resolucion: new Date(),
    });

    res.status(200).json({
      success: true,
      message: 'Devolución aceptada exitosamente',
      data: {
        id: devolucion.id,
        status: devolucion.status,
        aprobador_id: devolucion.aprobador_id,
        fecha_resolucion: devolucion.fecha_resolucion,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error en aceptarDevolucion:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Rechazar devolución
 * POST /Devoluciones/Rechazar
 */
const rechazarDevolucion = async (req, res) => {
  try {
    const { devolucion_id, aprobador_id, motivo_rechazo } = req.body;

    if (!devolucion_id || !aprobador_id || !motivo_rechazo) {
      return res.status(400).json({
        success: false,
        message: 'devolucion_id, aprobador_id y motivo_rechazo son requeridos',
        error: 'MISSING_REQUIRED_FIELDS',
        timestamp: new Date().toISOString(),
      });
    }

    const devolucion = await Devolucion.findByPk(devolucion_id);
    if (!devolucion) {
      return res.status(404).json({
        success: false,
        message: 'Devolución no encontrada',
        error: 'DEVOLUCION_NOT_FOUND',
        timestamp: new Date().toISOString(),
      });
    }

    if (devolucion.status !== 'PENDIENTE') {
      return res.status(400).json({
        success: false,
        message: 'Solo se pueden rechazar devoluciones pendientes',
        error: 'INVALID_DEVOLUCION_STATE',
        timestamp: new Date().toISOString(),
      });
    }

    await devolucion.update({
      status: 'RECHAZADA',
      aprobador_id: aprobador_id,
      motivo_rechazo: motivo_rechazo,
      fecha_resolucion: new Date(),
    });

    res.status(200).json({
      success: true,
      message: 'Devolución rechazada exitosamente',
      data: {
        id: devolucion.id,
        status: devolucion.status,
        aprobador_id: devolucion.aprobador_id,
        motivo_rechazo: devolucion.motivo_rechazo,
        fecha_resolucion: devolucion.fecha_resolucion,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error en rechazarDevolucion:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Consultar estado de devolución
 * GET /Devoluciones/Estado/{cheque_id}
 */
const consultarEstadoDevolucion = async (req, res) => {
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

    const devolucion = await Devolucion.findOne({
      where: { cheque_id: cheque_id },
      include: [
        {
          model: Echeq,
          as: 'echeq',
          attributes: ['id', 'numero_cheque', 'monto', 'beneficiario'],
        },
        {
          model: User,
          as: 'solicitante',
          attributes: ['id', 'name', 'email'],
        },
        {
          model: User,
          as: 'aprobador',
          attributes: ['id', 'name', 'email'],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    if (!devolucion) {
      return res.status(200).json({
        success: true,
        message: 'No hay solicitudes de devolución para este cheque',
        data: {
          tiene_devolucion: false,
          cheque_id: cheque_id,
          timestamp: new Date().toISOString(),
        },
      });
    }

    res.status(200).json({
      success: true,
      message: 'Estado de devolución consultado exitosamente',
      data: {
        tiene_devolucion: true,
        id: devolucion.id,
        cheque_id: devolucion.cheque_id,
        motivo: devolucion.motivo,
        fecha_solicitud: devolucion.fecha_solicitud,
        status: devolucion.status,
        fecha_resolucion: devolucion.fecha_resolucion,
        motivo_rechazo: devolucion.motivo_rechazo,
        cheque: devolucion.echeq,
        solicitante: devolucion.solicitante,
        aprobador: devolucion.aprobador,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error en consultarEstadoDevolucion:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * GET /Devoluciones/Solicitar
 * Listar devoluciones del tenant
 */
const getDevoluciones = async (req, res) => {
  try {
    const tenantId = req.tenantId;

    // Buscar registros del tenant
    const registros = await Devolucion.findAll({
      where: { tenantId },
      order: [['createdAt', 'DESC']],
      limit: 50,
    });

    res.json({
      success: true,
      data: registros,
      count: registros.length,
      message: 'Registros obtenidos exitosamente',
    });
  } catch (error) {
    console.error('Error obteniendo registros:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message,
    });
  }
};

/**
 * POST /Devoluciones/Solicitar
 * Solicitar devolución (alias para método existente)
 */
const solicitarDevolucionPost = async (req, res) => {
  // Redirigir al método existente
  return solicitarDevolucion(req, res);
};

/**
 * Devolver cheque
 * POST /Devoluciones/Devolver
 */
const devolver = async (req, res) => {
  try {
    const { cheque_id, motivo } = req.body;

    if (!cheque_id) {
      return res.status(400).json({
        success: false,
        message: 'cheque_id es requerido',
        error: 'MISSING_REQUIRED_FIELDS',
        timestamp: new Date().toISOString(),
      });
    }

    // Buscar el cheque
    const cheque = await Echeq.findOne({
      where: { 
        id: cheque_id,
        tenant_id: req.coelsaAuth.tenantId 
      }
    });

    if (!cheque) {
      return res.status(404).json({
        success: false,
        message: 'Cheque no encontrado',
        error: 'CHEQUE_NOT_FOUND',
        timestamp: new Date().toISOString(),
      });
    }

    // Validar estado del cheque
    if (cheque.status === 'CANCELLED') {
      return res.status(400).json({
        success: false,
        message: 'El cheque ya está cancelado',
        error: 'INVALID_CHEQUE_STATE',
        timestamp: new Date().toISOString(),
      });
    }

    // Crear devolución
    const devolucion = await Devolucion.create({
      id: uuidv4(),
      echeq_id: cheque_id,
      reason: motivo || 'Devolución solicitada',
      request_date: new Date().toISOString().split('T')[0], // Formato DATEONLY
      requester_info: {
        tenant_id: req.coelsaAuth.tenantId,
        request_type: 'devolucion',
        timestamp: new Date().toISOString()
      },
      status: 'PENDIENTE',
      tenant_id: req.coelsaAuth.tenantId,
    });

    // Actualizar estado del cheque
    await cheque.update({
      status: 'RETURN_REQUESTED',
      fecha_devolucion: new Date(),
    });

    res.status(200).json({
      success: true,
      message: 'Cheque devuelto exitosamente',
      data: {
        devolucion_id: devolucion.id,
        cheque_id: cheque.id,
        estado: devolucion.estado,
        motivo: devolucion.motivo,
        fecha_solicitud: devolucion.fecha_solicitud,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error en devolver:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
};

module.exports = {
  getDevoluciones,
  solicitarDevolucion: solicitarDevolucionPost,
  anularDevolucion,
  aceptarDevolucion,
  rechazarDevolucion,
  consultarEstadoDevolucion,
  devolver,
};

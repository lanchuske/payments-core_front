/**
 * Ejemplos de Uso del BFF Client
 * 
 * Este archivo muestra ejemplos prácticos de cómo usar el bffClient
 * para reemplazar acceso directo a la base de datos.
 */

const bffClient = require('../services/bffClient');
const { formatErrorResponse, asyncHandler } = require('../utils/errorHandler');
const express = require('express');
const router = express.Router();

// ============================================================================
// EJEMPLO 1: Obtener un Tenant
// ============================================================================

router.get('/admin/tenants/:id', asyncHandler(async (req, res) => {
  const response = await bffClient.getTenant(req.params.id);
  res.json(response);
}));

// ============================================================================
// EJEMPLO 2: Listar Tenants con Filtros
// ============================================================================

router.get('/admin/tenants', asyncHandler(async (req, res) => {
  const { status, type, page, limit } = req.query;
  
  const params = {};
  if (status) params.status = status;
  if (type) params.type = type;
  if (page) params.page = page;
  if (limit) params.limit = limit;
  
  const response = await bffClient.getTenants(params);
  res.json(response);
}));

// ============================================================================
// EJEMPLO 3: Crear Tenant
// ============================================================================

router.post('/admin/tenants', asyncHandler(async (req, res) => {
  const response = await bffClient.createTenant(req.body);
  res.status(201).json(response);
}));

// ============================================================================
// EJEMPLO 4: Eliminar Tenant
// ============================================================================

router.delete('/admin/tenants/:id', asyncHandler(async (req, res) => {
  const response = await bffClient.deleteTenant(req.params.id);
  res.json(response);
}));

// ============================================================================
// EJEMPLO 5: Obtener Certificados
// ============================================================================

router.get('/admin/certificates', asyncHandler(async (req, res) => {
  const params = {};
  if (req.query.tenant_id) params.tenant_id = req.query.tenant_id;
  if (req.query.echeq_id) params.echeq_id = req.query.echeq_id;
  if (req.query.status) params.status = req.query.status;
  
  const response = await bffClient.getCertificados(params);
  res.json(response);
}));

// ============================================================================
// EJEMPLO 6: Emitir Certificado
// ============================================================================

router.post('/admin/certificates/emitir', asyncHandler(async (req, res) => {
  const response = await bffClient.emitirCertificado(req.body);
  res.json(response);
}));

// ============================================================================
// EJEMPLO 7: Obtener Cesiones (Assignments)
// ============================================================================

router.get('/admin/assignments', asyncHandler(async (req, res) => {
  const params = {};
  if (req.query.tenant_id) params.tenant_id = req.query.tenant_id;
  if (req.query.echeq_id) params.echeq_id = req.query.echeq_id;
  
  const response = await bffClient.getCesiones(params);
  res.json(response);
}));

// ============================================================================
// EJEMPLO 8: Obtener Avales (Guarantees)
// ============================================================================

router.get('/admin/guarantees', asyncHandler(async (req, res) => {
  const params = {};
  if (req.query.tenant_id) params.tenant_id = req.query.tenant_id;
  if (req.query.echeq_id) params.echeq_id = req.query.echeq_id;
  
  const response = await bffClient.getAvales(params);
  res.json(response);
}));

// ============================================================================
// EJEMPLO 9: Obtener Mandatos
// ============================================================================

router.get('/admin/mandates', asyncHandler(async (req, res) => {
  const params = {};
  if (req.query.tenant_id) params.tenant_id = req.query.tenant_id;
  if (req.query.type === 'cobro') {
    const response = await bffClient.getMandatosCobro(params);
    res.json(response);
  } else if (req.query.type === 'negociacion') {
    const response = await bffClient.getMandatosNegociacion(params);
    res.json(response);
  } else {
    res.status(400).json({
      success: false,
      message: 'Tipo de mandato requerido (cobro o negociacion)',
    });
  }
}));

// ============================================================================
// EJEMPLO 10: Obtener Notificaciones
// ============================================================================

router.get('/admin/notifications', asyncHandler(async (req, res) => {
  const params = {};
  if (req.query.tenant_id) params.tenant_id = req.query.tenant_id;
  if (req.query.status === 'pendientes') {
    const response = await bffClient.getNotificacionesPendientes(params);
    res.json(response);
  } else {
    const response = await bffClient.getNotificaciones(params);
    res.json(response);
  }
}));

// ============================================================================
// EJEMPLO 11: Request Genérico (para endpoints personalizados)
// ============================================================================

router.get('/admin/custom-endpoint', asyncHandler(async (req, res) => {
  const response = await bffClient.request({
    method: 'GET',
    url: '/custom/path',
    params: req.query,
  });
  res.json(response);
}));

// ============================================================================
// EJEMPLO 12: Con Manejo de Errores Personalizado
// ============================================================================

router.get('/admin/tenants/:id/details', async (req, res) => {
  try {
    const response = await bffClient.getTenant(req.params.id);
    res.json(response);
  } catch (error) {
    // Manejo personalizado de errores
    if (error.response?.status === 404) {
      return res.status(404).json({
        success: false,
        message: 'Tenant no encontrado',
      });
    }
    
    // Usar el helper de errores
    res.status(error.response?.status || 500)
       .json(formatErrorResponse(error, 'Error obteniendo detalles del tenant'));
  }
});

// ============================================================================
// EJEMPLO 13: Establecer Contexto de Request (para middleware)
// ============================================================================

// En un middleware:
function setBFFContext(req, res, next) {
  // Establecer contexto para que bffClient use token y tenantId automáticamente
  bffClient.setRequestContext({
    token: req.headers.authorization?.replace(/^Bearer /, ''),
    tenantId: req.user?.tenantId || req.headers['x-tenant-id'],
  });
  next();
}

// Usar el middleware:
router.use('/admin', setBFFContext);

// ============================================================================
// EJEMPLO 14: Limpiar Contexto después de Request
// ============================================================================

function clearBFFContext(req, res, next) {
  res.on('finish', () => {
    bffClient.clearRequestContext();
  });
  next();
}

router.use(clearBFFContext);

module.exports = router;


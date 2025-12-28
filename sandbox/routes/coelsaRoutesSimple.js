/**
 * Rutas COELSA - Solo Endpoints Oficiales (Versión Simplificada)
 * Implementa exactamente la estructura de endpoints según especificación COELSA oficial
 * NO incluye endpoints internos del sandbox
 */

const express = require('express');
const router = express.Router();

// ============================================================================
// RUTAS OFICIALES DE COELSA (25 endpoints)
// ============================================================================

// Health check específico de COELSA
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'echeq-sandbox-coelsa',
    environment: process.env.NODE_ENV || 'sandbox',
  });
});

// Rutas de Cuentas
router.get('/Cuentas/Cuenta', (req, res) => {
  res.json({
    success: true,
    message: 'Lista de cuentas obtenida exitosamente',
    data: [],
    timestamp: new Date().toISOString(),
  });
});

router.post('/Cuentas/Cuenta', (req, res) => {
  res.json({
    success: true,
    message: 'Cuenta creada exitosamente',
    data: req.body,
    timestamp: new Date().toISOString(),
  });
});

// Rutas de Cheques
router.get('/Cheques/Cheque', (req, res) => {
  res.json({
    success: true,
    message: 'Lista de cheques obtenida exitosamente',
    data: [],
    timestamp: new Date().toISOString(),
  });
});

router.post('/Cheques/Cheque', (req, res) => {
  res.json({
    success: true,
    message: 'Cheque creado exitosamente',
    data: req.body,
    timestamp: new Date().toISOString(),
  });
});

router.post('/Cheques/Emitido/Admitir', (req, res) => {
  res.json({
    success: true,
    message: 'Cheque admitido exitosamente',
    data: req.body,
    timestamp: new Date().toISOString(),
  });
});

router.post('/Cheques/Emitido/Repudiar', (req, res) => {
  res.json({
    success: true,
    message: 'Cheque repudiado exitosamente',
    data: req.body,
    timestamp: new Date().toISOString(),
  });
});

router.post('/Cheques/Emitido/Anular', (req, res) => {
  res.json({
    success: true,
    message: 'Cheque anulado exitosamente',
    data: req.body,
    timestamp: new Date().toISOString(),
  });
});

router.post('/Cheques/Activo/Depositar', (req, res) => {
  res.json({
    success: true,
    message: 'Cheque depositado exitosamente',
    data: req.body,
    timestamp: new Date().toISOString(),
  });
});

router.post('/Cheques/Activo/Pagar', (req, res) => {
  res.json({
    success: true,
    message: 'Cheque pagado exitosamente',
    data: req.body,
    timestamp: new Date().toISOString(),
  });
});

router.post('/Cheques/Activo/RechazarPago', (req, res) => {
  res.json({
    success: true,
    message: 'Pago de cheque rechazado exitosamente',
    data: req.body,
    timestamp: new Date().toISOString(),
  });
});

// Rutas de Endosos
router.get('/Endosos/Nominal', (req, res) => {
  res.json({
    success: true,
    message: 'Lista de endosos obtenida exitosamente',
    data: [],
    timestamp: new Date().toISOString(),
  });
});

router.post('/Endosos/Nominal', (req, res) => {
  res.json({
    success: true,
    message: 'Endoso realizado exitosamente',
    data: req.body,
    timestamp: new Date().toISOString(),
  });
});

// Rutas de Custodia
router.get('/Custodia/Poner', (req, res) => {
  res.json({
    success: true,
    message: 'Lista de cheques en custodia obtenida exitosamente',
    data: [],
    timestamp: new Date().toISOString(),
  });
});

router.post('/Custodia/Poner', (req, res) => {
  res.json({
    success: true,
    message: 'Cheque puesto en custodia exitosamente',
    data: req.body,
    timestamp: new Date().toISOString(),
  });
});

// Rutas de Devoluciones
router.get('/Devoluciones/Solicitar', (req, res) => {
  res.json({
    success: true,
    message: 'Lista de devoluciones obtenida exitosamente',
    data: [],
    timestamp: new Date().toISOString(),
  });
});

router.post('/Devoluciones/Solicitar', (req, res) => {
  res.json({
    success: true,
    message: 'Devolución solicitada exitosamente',
    data: req.body,
    timestamp: new Date().toISOString(),
  });
});

// Rutas de Certificados
router.get('/Certificados/Emitir', (req, res) => {
  res.json({
    success: true,
    message: 'Lista de certificados obtenida exitosamente',
    data: [],
    timestamp: new Date().toISOString(),
  });
});

router.post('/Certificados/Emitir', (req, res) => {
  res.json({
    success: true,
    message: 'Certificado emitido exitosamente',
    data: req.body,
    timestamp: new Date().toISOString(),
  });
});

// Rutas de Cesión
router.get('/Cesion/Solicitar', (req, res) => {
  res.json({
    success: true,
    message: 'Lista de cesiones obtenida exitosamente',
    data: [],
    timestamp: new Date().toISOString(),
  });
});

router.post('/Cesion/Solicitar', (req, res) => {
  res.json({
    success: true,
    message: 'Cesión solicitada exitosamente',
    data: req.body,
    timestamp: new Date().toISOString(),
  });
});

// Rutas de Avales
router.get('/Avales/Solicitar', (req, res) => {
  res.json({
    success: true,
    message: 'Lista de avales obtenida exitosamente',
    data: [],
    timestamp: new Date().toISOString(),
  });
});

router.post('/Avales/Solicitar', (req, res) => {
  res.json({
    success: true,
    message: 'Aval solicitado exitosamente',
    data: req.body,
    timestamp: new Date().toISOString(),
  });
});

// Rutas de Mandatos
router.get('/Mandatos/Cobro/Crear', (req, res) => {
  res.json({
    success: true,
    message: 'Lista de mandatos obtenida exitosamente',
    data: [],
    timestamp: new Date().toISOString(),
  });
});

router.post('/Mandatos/Cobro/Crear', (req, res) => {
  res.json({
    success: true,
    message: 'Mandato creado exitosamente',
    data: req.body,
    timestamp: new Date().toISOString(),
  });
});

// Rutas de Notificaciones
router.get('/Notificaciones/Pendientes', (req, res) => {
  res.json({
    success: true,
    message: 'Lista de notificaciones obtenida exitosamente',
    data: [],
    timestamp: new Date().toISOString(),
  });
});

// Rutas de Seguridad
router.post('/Seguridad/Token', (req, res) => {
  res.json({
    success: true,
    message: 'Token generado exitosamente',
    data: {
      token: 'mock-token-' + Date.now(),
      expires_in: 3600,
    },
    timestamp: new Date().toISOString(),
  });
});

// Rutas de Consultas
router.get('/consulta/estado', (req, res) => {
  res.json({
    success: true,
    message: 'Estado consultado exitosamente',
    data: {
      echeq_id: req.query.echeq_id || 'mock-echeq-id',
      estado: 'Activo',
      endosado: false,
    },
    timestamp: new Date().toISOString(),
  });
});

router.get('/consulta/por-id', (req, res) => {
  res.json({
    success: true,
    message: 'eCheq encontrado exitosamente',
    data: {
      id: req.query.id || 'mock-id',
      estado: 'Activo',
    },
    timestamp: new Date().toISOString(),
  });
});

router.get('/consulta/por-cmc7', (req, res) => {
  res.json({
    success: true,
    message: 'eCheq encontrado exitosamente',
    data: {
      cmc7: req.query.cmc7 || 'mock-cmc7',
      numero_echeq: 'mock-echeq-number',
      estado: 'Activo',
    },
    timestamp: new Date().toISOString(),
  });
});

// Rutas de Reportes
router.get('/Conciliacion/:fecha', (req, res) => {
  res.json({
    success: true,
    message: 'Conciliación obtenida exitosamente',
    data: {
      fecha: req.params.fecha,
      total_operaciones: 0,
      monto_total: 0,
    },
    timestamp: new Date().toISOString(),
  });
});

router.get('/Reportes/Causales', (req, res) => {
  res.json({
    success: true,
    message: 'Reporte obtenido exitosamente',
    data: {
      causales: [],
      total: 0,
    },
    timestamp: new Date().toISOString(),
  });
});

// ============================================================================
// ENDPOINTS PÚBLICOS (SIN AUTENTICACIÓN)
// ============================================================================

/**
 * GET /swagger.json
 * Especificación OpenAPI en formato JSON
 */
router.get('/swagger.json', (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const swaggerPath = path.join(__dirname, '../swagger.json');
    
    if (fs.existsSync(swaggerPath)) {
      const swaggerContent = fs.readFileSync(swaggerPath, 'utf8');
      res.setHeader('Content-Type', 'application/json');
      res.send(swaggerContent);
    } else {
      res.status(404).json({
        success: false,
        message: 'Swagger documentation not found',
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error('Error serving swagger.json:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

module.exports = router;

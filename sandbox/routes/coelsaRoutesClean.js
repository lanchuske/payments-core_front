/**
 * Rutas COELSA - Solo Endpoints Oficiales
 * Implementa exactamente la estructura de endpoints según especificación COELSA oficial
 * NO incluye endpoints internos del sandbox
 */

const express = require('express');
const router = express.Router();
const logger = require('../services/logger');

// Importar middleware de autenticación COELSA
const {
  validateCoelsaApiKeys,
  coelsaAuditLog,
} = require('../middleware/coelsaAuth');

// Importar controladores COELSA
const coelsaAccountsController = require('../controllers/coelsaAccountsController');
const coelsaChequesController = require('../controllers/coelsaChequesController');
const coelsaEndososController = require('../controllers/coelsaEndososController');
const coelsaCustodiaController = require('../controllers/coelsaCustodiaController');
const coelsaDevolucionesController = require('../controllers/coelsaDevolucionesController');
const coelsaCertificadosController = require('../controllers/coelsaCertificadosController');
const coelsaCesionController = require('../controllers/coelsaCesionController');
const coelsaAvalesController = require('../controllers/coelsaAvalesController');
const coelsaMandatosController = require('../controllers/coelsaMandatosController');
const coelsaNotificacionesController = require('../controllers/coelsaNotificacionesController');
const coelsaSeguridadController = require('../controllers/coelsaSeguridadController');

// ============================================================================
// MIDDLEWARE DE AUTENTICACIÓN COELSA
// ============================================================================

// Aplicar autenticación COELSA a todas las rutas excepto las públicas
router.use((req, res, next) => {
  const publicRoutes = [
    '/health',
    '/swagger.json',
  ];
  
  const isPublicRoute = publicRoutes.some(route => req.path === route);
  
  if (isPublicRoute) {
    return next();
  }
  
  // Aplicar autenticación COELSA para rutas protegidas
  validateCoelsaApiKeys(req, res, next);
});

// ============================================================================
// RUTAS OFICIALES DE COELSA
// ============================================================================

// Rutas de Cuentas
router.get('/Cuentas/Cuenta', (req, res) => new coelsaAccountsController().getCuentas(req, res));
router.post('/Cuentas/Cuenta', (req, res) => {
  const controller = new coelsaAccountsController();
  return controller.createCuenta(req, res);
});

// Rutas de Cheques
router.get('/Cheques/Cheque', (req, res) => new coelsaChequesController().getCheques(req, res));
router.post('/Cheques/Cheque', (req, res) => {
  const controller = new coelsaChequesController();
  return controller.createCheque(req, res);
});
router.post('/Cheques/Emitido/Admitir', (req, res) => new coelsaChequesController().admitirCheque(req, res));
router.post('/Cheques/Emitido/Repudiar', (req, res) => new coelsaChequesController().repudiarCheque(req, res));
router.post('/Cheques/Emitido/Anular', (req, res) => new coelsaChequesController().anularCheque(req, res));
router.post('/Cheques/Activo/Depositar', (req, res) => new coelsaChequesController().depositarCheque(req, res));
router.post('/Cheques/Activo/Pagar', (req, res) => new coelsaChequesController().pagarCheque(req, res));
router.post('/Cheques/Activo/RechazarPago', (req, res) => new coelsaChequesController().rechazarPago(req, res));

// Rutas de Endosos
router.get('/Endosos/Nominal', (req, res) => new coelsaEndososController().getEndosos(req, res));
router.post('/Endosos/Nominal', (req, res) => {
  const controller = new coelsaEndososController();
  return controller.createEndoso(req, res);
});

// Rutas de Custodia
router.get('/Custodia/Poner', (req, res) => new coelsaCustodiaController().getCustodia(req, res));
router.post('/Custodia/Poner', (req, res) => new coelsaCustodiaController().ponerEnCustodia(req, res));

// Rutas de Devoluciones
router.get('/Devoluciones/Solicitar', (req, res) => new coelsaDevolucionesController().getDevoluciones(req, res));
router.post('/Devoluciones/Solicitar', (req, res) => new coelsaDevolucionesController().solicitarDevolucion(req, res));

// Rutas de Certificados
router.get('/Certificados/Emitir', (req, res) => new coelsaCertificadosController().getCertificados(req, res));
router.post('/Certificados/Emitir', (req, res) => new coelsaCertificadosController().emitirCertificado(req, res));

// Rutas de Cesión
router.get('/Cesion/Solicitar', (req, res) => new coelsaCesionController().getCesiones(req, res));
router.post('/Cesion/Solicitar', (req, res) => new coelsaCesionController().solicitarCesion(req, res));

// Rutas de Avales
router.get('/Avales/Solicitar', (req, res) => coelsaAvalesController.getAvales(req, res));
router.post('/Avales/Solicitar', (req, res) => coelsaAvalesController.solicitarAval(req, res));

// Rutas de Mandatos
router.get('/Mandatos/Cobro/Crear', (req, res) => new coelsaMandatosController().getMandatos(req, res));
router.post('/Mandatos/Cobro/Crear', (req, res) => new coelsaMandatosController().crearMandato(req, res));

// Rutas de Notificaciones
router.get('/Notificaciones/Pendientes', (req, res) => coelsaNotificacionesController.getNotificaciones(req, res));

// Rutas de Seguridad
router.post('/Seguridad/Token', (req, res) => new coelsaSeguridadController().generateToken(req, res));

// Rutas de Consultas
router.get('/consulta/estado', (req, res) => new coelsaChequesController().consultarEstado(req, res));
router.get('/consulta/por-cmc7', (req, res) => new coelsaChequesController().consultarPorCmc7(req, res));
router.get('/consulta/por-id', (req, res) => new coelsaChequesController().consultarPorId(req, res));

// Rutas de Reportes
router.get('/Conciliacion/:fecha', (req, res) => new coelsaChequesController().getConciliacion(req, res));
router.get('/Reportes/Causales', (req, res) => new coelsaChequesController().getReporteCausales(req, res));

// Health check específico de COELSA
router.get('/health', (req, res) => {
  logger.api('Health check requested', {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });
  
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'echeq-sandbox-coelsa',
    environment: process.env.NODE_ENV || 'sandbox',
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

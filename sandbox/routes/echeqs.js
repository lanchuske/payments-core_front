const express = require('express');
const router = express.Router();
const echeqController = require('../controllers/echeqController');
const {
  authenticateToken,
  requireRole,
  auditLog,
} = require('../middleware/auth');
const { validateCoelsaApiKeys } = require('../middleware/coelsaAuth');

// Rutas específicas para el backend (usando autenticación COELSA) - ANTES del middleware general
router.post(
  '/backend/:id/accept',
  validateCoelsaApiKeys,
  auditLog('ACCEPT_ECHEQ'),
  echeqController.acceptEcheq
);

// Todas las demás rutas requieren autenticación JWT
router.use(authenticateToken);

// ===== RUTAS DE EMISIÓN =====
router.post('/emission', auditLog('EMIT_ECHEQ'), echeqController.emitEcheq);
router.post(
  '/emission/bulk',
  auditLog('EMIT_BULK_ECHEQ'),
  echeqController.emitBulkEcheq
);

// ===== RUTAS DE RECEPCIÓN =====
router.post(
  '/:id/accept',
  auditLog('ACCEPT_ECHEQ'),
  echeqController.acceptEcheq
);
router.post(
  '/:id/reject',
  auditLog('REJECT_ECHEQ'),
  echeqController.rejectEcheq
);

// ===== RUTAS DE ENDOSO =====
router.post(
  '/:id/endorse',
  auditLog('ENDORSE_ECHEQ'),
  echeqController.endorseEcheq
);
router.post(
  '/:id/endorse/negotiation',
  auditLog('ENDORSE_NEGOTIATION'),
  echeqController.endorseForNegotiation
);

// ===== RUTAS DE CUSTODIA =====
router.post(
  '/:id/custody',
  auditLog('PUT_IN_CUSTODY'),
  echeqController.putInCustody
);
router.post(
  '/:id/custody/release',
  auditLog('RELEASE_FROM_CUSTODY'),
  echeqController.releaseFromCustody
);

// ===== RUTAS DE DEPÓSITO Y PAGO =====
router.post(
  '/:id/deposit',
  auditLog('DEPOSIT_ECHEQ'),
  echeqController.depositEcheq
);
router.post('/:id/pay', auditLog('PAY_ECHEQ'), echeqController.payEcheq);

// ===== RUTAS DE DEVOLUCIÓN =====
router.post(
  '/:id/return',
  auditLog('REQUEST_RETURN'),
  echeqController.requestReturn
);

// ===== RUTAS DE MANDATO =====
router.post(
  '/:id/mandate',
  auditLog('REQUEST_MANDATE'),
  echeqController.requestMandate
);

// ===== RUTAS DE AVAL =====
router.post(
  '/:id/guarantee',
  auditLog('REQUEST_GUARANTEE'),
  echeqController.requestGuarantee
);

// ===== RUTAS DE CESIÓN DE DERECHOS =====
router.post('/:id/ced', auditLog('REQUEST_CED'), echeqController.requestCed);

// ===== RUTAS DE CERTIFICADO =====
router.post(
  '/:id/certificate',
  auditLog('EMIT_CERTIFICATE'),
  echeqController.emitCertificate
);

// ===== RUTAS DE CONSULTA =====
router.get('/list', auditLog('LIST_ECHEQS'), echeqController.listEcheqs);
router.get('/search', auditLog('SEARCH_ECHEQS'), echeqController.searchEcheqs);
router.get('/:id', auditLog('GET_ECHEQ'), echeqController.getEcheq);
router.get(
  '/:id/details',
  auditLog('GET_ECHEQ_DETAILS'),
  echeqController.getEcheqDetails
);

// ===== RUTAS DE ACTUALIZACIÓN =====
router.put('/:id', auditLog('UPDATE_ECHEQ'), echeqController.updateEcheq);
router.put(
  '/:id/status',
  auditLog('UPDATE_ECHEQ_STATUS'),
  echeqController.updateEcheqStatus
);

// ===== RUTAS DE CUSTODIA (EXISTENTES) =====
router.post(
  '/custody',
  auditLog('CREATE_CUSTODY'),
  echeqController.createCustody
);
router.get('/custody', auditLog('GET_CUSTODY'), echeqController.getCustody);
router.get(
  '/custody/stats',
  auditLog('GET_CUSTODY_STATS'),
  echeqController.getCustodyStats
);
router.put(
  '/custody/:id/release',
  auditLog('RELEASE_CUSTODY'),
  echeqController.releaseCustody
);

// ===== RUTAS DE VALIDACIÓN =====
router.get(
  '/validate/:number',
  auditLog('VALIDATE_ECHEQ'),
  echeqController.validateEcheq
);

module.exports = router;

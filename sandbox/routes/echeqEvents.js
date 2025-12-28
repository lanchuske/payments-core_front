/**
 * Rutas para eventos de eCheqs
 * Maneja la trazabilidad y eventos de eCheqs
 */

const express = require('express');
const router = express.Router();
const echeqEventsController = require('../controllers/echeqEventsController');

/**
 * GET /echeq-events/:echeqNumber
 * Obtener eventos de trazabilidad de un eCheq específico
 */
router.get('/:echeqNumber', echeqEventsController.getEcheqEvents);

/**
 * GET /echeq-events
 * Obtener todos los eventos (para debugging)
 */
router.get('/', echeqEventsController.getAllEvents);

module.exports = router;

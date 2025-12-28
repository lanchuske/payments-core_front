/**
 * Controlador de Eventos de eCheqs
 * Maneja la trazabilidad y eventos de eCheqs
 */

const EcheqEvent = require('../models/echeqEvent');
const Echeq = require('../models/Echeq');

class EcheqEventsController {
  /**
   * GET /echeq-events/:echeqNumber
   * Obtener eventos de trazabilidad de un eCheq específico
   */
  async getEcheqEvents(req, res) {
    try {
      const { echeqNumber } = req.params;

      console.log(`🔍 [EVENTOS] Obteniendo eventos para eCheq: ${echeqNumber}`);

      // Resolver el UUID del eCheq por número y luego buscar eventos por echeq_id
      const echeq = await Echeq.findOne({ where: { number: echeqNumber } });
      if (!echeq) {
        return res.status(404).json({
          success: false,
          message: 'eCheq no encontrado',
          data: { echeq_number: echeqNumber, events: [], total_events: 0 },
        });
      }

      const events = await EcheqEvent.findAll({
        where: { echeq_id: echeq.id },
        order: [['timestamp', 'ASC']],
      });

      console.log(
        `✅ [EVENTOS] Encontrados ${events.length} eventos para eCheq: ${echeqNumber}`
      );

      // Transformar eventos para el frontend
      const transformedEvents = events.map(event => ({
        id: event.id,
        event_type: event.event_type,
        event_status: event.event_status,
        event_description: event.event_description,
        event_data: event.event_data,
        user_cuit: event.user_cuit,
        timestamp: event.timestamp,
        created_at: event.created_at,
      }));

      res.json({
        success: true,
        data: {
          echeq_number: echeqNumber,
          events: transformedEvents,
          total_events: transformedEvents.length,
        },
      });
    } catch (error) {
      console.error('Error en getEcheqEvents:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message,
      });
    }
  }

  /**
   * GET /echeq-events
   * Obtener todos los eventos (para debugging)
   */
  async getAllEvents(req, res) {
    try {
      const { limit = 100, offset = 0 } = req.query;

      const events = await EcheqEvent.findAll({
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['timestamp', 'DESC']],
      });

      res.json({
        success: true,
        data: {
          events: events,
          total_events: events.length,
        },
      });
    } catch (error) {
      console.error('Error en getAllEvents:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message,
      });
    }
  }
}

module.exports = new EcheqEventsController();

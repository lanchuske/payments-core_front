/**
 * Servicio de Colas
 * Manejo de RabbitMQ y Bull para procesamiento asíncrono
 */

const amqp = require('amqplib');
const { rabbitMQConfig, bullQueues, routingKeys } = require('../config/queue');
const logger = require('./logger');

class QueueService {
  constructor() {
    this.connection = null;
    this.channel = null;
    this.isConnected = false;
    this.queues = {};
    this.exchanges = {};
    this.consumers = new Map();
  }

  /**
   * Conectar a RabbitMQ
   */
  async connect() {
    try {
      this.connection = await amqp.connect(
        rabbitMQConfig.url,
        rabbitMQConfig.options
      );
      this.channel = await this.connection.createChannel();
      this.isConnected = true;

      // Configurar exchanges
      await this.setupExchanges();

      // Configurar colas
      await this.setupQueues();

      // Configurar bindings
      await this.setupBindings();

      logger.info('✅ Conexión a RabbitMQ establecida');

      // Manejar desconexión
      this.connection.on('close', () => {
        this.isConnected = false;
        logger.warn('❌ Conexión a RabbitMQ cerrada');
        this.reconnect();
      });

      this.connection.on('error', error => {
        logger.error('❌ Error en conexión RabbitMQ:', error);
        this.reconnect();
      });
    } catch (error) {
      logger.error('❌ Error conectando a RabbitMQ:', error);
      throw error;
    }
  }

  /**
   * Reconectar automáticamente
   */
  async reconnect() {
    if (this.isConnected) return;

    logger.info('🔄 Intentando reconectar a RabbitMQ...');
    setTimeout(async () => {
      try {
        await this.connect();
      } catch (error) {
        logger.error('❌ Error en reconexión:', error);
        this.reconnect();
      }
    }, 5000);
  }

  /**
   * Configurar exchanges
   */
  async setupExchanges() {
    for (const [name, exchange] of Object.entries(rabbitMQConfig.exchanges)) {
      await this.channel.assertExchange(exchange, 'topic', { durable: true });
      this.exchanges[name] = exchange;
      logger.info(`📡 Exchange configurado: ${exchange}`);
    }
  }

  /**
   * Configurar colas
   */
  async setupQueues() {
    for (const [name, queue] of Object.entries(rabbitMQConfig.queues)) {
      const queueOptions = {
        durable: true,
        arguments: {
          'x-message-ttl': 86400000, // 24 horas
          'x-max-length': 10000,
          'x-overflow': 'drop-head',
        },
      };

      await this.channel.assertQueue(queue, queueOptions);
      this.queues[name] = queue;
      logger.info(`📦 Cola configurada: ${queue}`);
    }
  }

  /**
   * Configurar bindings
   */
  async setupBindings() {
    // Binding para notificaciones COELSA
    await this.channel.bindQueue(
      rabbitMQConfig.queues.coelsaNotifications,
      rabbitMQConfig.exchanges.coelsaEvents,
      routingKeys.coelsa.notifications
    );

    // Binding para eventos del sistema
    await this.channel.bindQueue(
      rabbitMQConfig.queues.auditEvents,
      rabbitMQConfig.exchanges.systemEvents,
      routingKeys.system.events
    );

    logger.info('🔗 Bindings configurados');
  }

  /**
   * Publicar mensaje en RabbitMQ
   */
  async publishMessage(exchange, routingKey, message, options = {}) {
    if (!this.isConnected) {
      throw new Error('No conectado a RabbitMQ');
    }

    const defaultOptions = {
      persistent: true,
      timestamp: Date.now(),
      messageId: require('uuid').v4(),
      correlationId: options.correlationId || require('uuid').v4(),
    };

    const publishOptions = { ...defaultOptions, ...options };

    try {
      const success = this.channel.publish(
        exchange,
        routingKey,
        Buffer.from(JSON.stringify(message)),
        publishOptions
      );

      if (success) {
        logger.info(`📤 Mensaje publicado: ${routingKey}`, {
          exchange,
          routingKey,
          messageId: publishOptions.messageId,
        });
      } else {
        throw new Error('Error publicando mensaje');
      }

      return {
        success: true,
        messageId: publishOptions.messageId,
        correlationId: publishOptions.correlationId,
      };
    } catch (error) {
      logger.error('❌ Error publicando mensaje:', error);
      throw error;
    }
  }

  /**
   * Publicar mensaje de COELSA
   */
  async publishCoelsaMessage(type, data, tenantId = null) {
    const message = {
      type,
      data,
      tenantId,
      timestamp: new Date().toISOString(),
      source: 'echeq-platform',
    };

    const routingKey = tenantId
      ? `coelsa.${type}.${tenantId}`
      : `coelsa.${type}`;

    return this.publishMessage(
      rabbitMQConfig.exchanges.coelsaEvents,
      routingKey,
      message
    );
  }

  /**
   * Publicar mensaje del sistema
   */
  async publishSystemMessage(type, data) {
    const message = {
      type,
      data,
      timestamp: new Date().toISOString(),
      source: 'echeq-platform',
    };

    return this.publishMessage(
      rabbitMQConfig.exchanges.systemEvents,
      `system.${type}`,
      message
    );
  }

  /**
   * Consumir mensajes de una cola
   */
  async consumeQueue(queueName, handler, options = {}) {
    if (!this.isConnected) {
      throw new Error('No conectado a RabbitMQ');
    }

    const defaultOptions = {
      noAck: false,
      prefetch: 1,
    };

    const consumeOptions = { ...defaultOptions, ...options };

    try {
      await this.channel.prefetch(consumeOptions.prefetch);

      const consumer = await this.channel.consume(
        queueName,
        async msg => {
          if (!msg) return;

          try {
            const content = JSON.parse(msg.content.toString());
            logger.info(`📥 Mensaje recibido: ${queueName}`, {
              messageId: msg.properties.messageId,
              correlationId: msg.properties.correlationId,
            });

            // Procesar mensaje
            await handler(content, msg);

            // Confirmar procesamiento
            this.channel.ack(msg);
          } catch (error) {
            logger.error('❌ Error procesando mensaje:', error);

            // Rechazar mensaje y enviar a cola de dead letter
            this.channel.nack(msg, false, false);
          }
        },
        consumeOptions
      );

      this.consumers.set(queueName, consumer);
      logger.info(`👂 Consumidor iniciado: ${queueName}`);
    } catch (error) {
      logger.error('❌ Error iniciando consumidor:', error);
      throw error;
    }
  }

  /**
   * Agregar trabajo a cola Bull
   */
  async addJob(queueName, data, options = {}) {
    try {
      const queue = bullQueues[queueName];
      if (!queue) {
        throw new Error(`Cola Bull no encontrada: ${queueName}`);
      }

      const defaultOptions = {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: 100,
        removeOnFail: 50,
      };

      const jobOptions = { ...defaultOptions, ...options };
      const job = await queue.add(data.type || 'default', data, jobOptions);

      logger.info(`📋 Trabajo agregado a cola Bull: ${queueName}`, {
        jobId: job.id,
        type: data.type,
      });

      return {
        success: true,
        jobId: job.id,
        queueName,
      };
    } catch (error) {
      logger.error('❌ Error agregando trabajo a cola Bull:', error);
      throw error;
    }
  }

  /**
   * Procesar trabajos de cola Bull
   */
  async processBullQueue(queueName, processor, options = {}) {
    try {
      const queue = bullQueues[queueName];
      if (!queue) {
        throw new Error(`Cola Bull no encontrada: ${queueName}`);
      }

      const defaultOptions = {
        concurrency: 1,
      };

      const processOptions = { ...defaultOptions, ...options };

      queue.process(processOptions.concurrency, async job => {
        try {
          logger.info(`⚙️ Procesando trabajo Bull: ${queueName}`, {
            jobId: job.id,
            type: job.data.type,
          });

          const result = await processor(job.data, job);

          logger.info(`✅ Trabajo Bull completado: ${queueName}`, {
            jobId: job.id,
          });

          return result;
        } catch (error) {
          logger.error('❌ Error procesando trabajo Bull:', error);
          throw error;
        }
      });

      // Manejar eventos de la cola
      queue.on('completed', job => {
        logger.info(`✅ Trabajo completado: ${job.id}`);
      });

      queue.on('failed', (job, err) => {
        logger.error(`❌ Trabajo falló: ${job.id}`, err);
      });

      queue.on('stalled', job => {
        logger.warn(`⚠️ Trabajo estancado: ${job.id}`);
      });

      logger.info(`⚙️ Procesador Bull iniciado: ${queueName}`);
    } catch (error) {
      logger.error('❌ Error iniciando procesador Bull:', error);
      throw error;
    }
  }

  /**
   * Obtener estadísticas de colas
   */
  async getQueueStats() {
    const stats = {};

    // Estadísticas de RabbitMQ
    for (const [name, queue] of Object.entries(this.queues)) {
      try {
        const queueInfo = await this.channel.checkQueue(queue);
        stats[name] = {
          messages: queueInfo.messageCount,
          consumers: queueInfo.consumerCount,
          type: 'rabbitmq',
        };
      } catch (error) {
        logger.error(`Error obteniendo stats de cola ${name}:`, error);
      }
    }

    // Estadísticas de Bull
    for (const [name, queue] of Object.entries(bullQueues)) {
      try {
        const jobCounts = await queue.getJobCounts();
        stats[name] = {
          ...jobCounts,
          type: 'bull',
        };
      } catch (error) {
        logger.error(`Error obteniendo stats de cola Bull ${name}:`, error);
      }
    }

    return stats;
  }

  /**
   * Limpiar colas
   */
  async cleanQueues() {
    try {
      // Limpiar colas RabbitMQ
      for (const queue of Object.values(this.queues)) {
        await this.channel.purgeQueue(queue);
      }

      // Limpiar colas Bull
      for (const queue of Object.values(bullQueues)) {
        await queue.clean(0, 'completed');
        await queue.clean(0, 'failed');
      }

      logger.info('🧹 Colas limpiadas');
    } catch (error) {
      logger.error('❌ Error limpiando colas:', error);
      throw error;
    }
  }

  /**
   * Cerrar conexiones
   */
  async close() {
    try {
      // Cerrar consumidores
      for (const [queueName, consumer] of this.consumers) {
        await this.channel.cancel(consumer.consumerTag);
        logger.info(`🛑 Consumidor cerrado: ${queueName}`);
      }

      // Cerrar canal y conexión
      if (this.channel) {
        await this.channel.close();
      }
      if (this.connection) {
        await this.connection.close();
      }

      this.isConnected = false;
      logger.info('🛑 Conexiones de colas cerradas');
    } catch (error) {
      logger.error('❌ Error cerrando conexiones:', error);
      throw error;
    }
  }
}

// Instancia singleton
const queueService = new QueueService();

module.exports = queueService;

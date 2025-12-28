/**
 * Modelo CoelsaConfig - Configuración de COELSA por Tenant
 * Gestión de configuraciones específicas de COELSA para cada banco
 */

const { DataTypes } = require('sequelize');

module.exports = sequelize => {
  const CoelsaConfig = sequelize.define(
    'CoelsaConfig',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      tenant_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'tenants',
          key: 'id',
        },
        comment: 'ID del tenant (banco)',
      },
      environment: {
        type: DataTypes.ENUM('sandbox', 'staging', 'production'),
        allowNull: false,
        defaultValue: 'sandbox',
        comment: 'Ambiente de COELSA',
      },
      base_url: {
        type: DataTypes.STRING(500),
        allowNull: false,
        comment: 'URL base de la API de COELSA',
      },
      api_key: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'API Key de COELSA',
      },
      api_secret: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: 'API Secret de COELSA (encriptado)',
      },
      private_key: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Clave privada para firma digital',
      },
      certificate: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Certificado digital',
      },
      timeout: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 30000,
        comment: 'Timeout en milisegundos',
      },
      max_retries: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 3,
        comment: 'Número máximo de reintentos',
      },
      retry_delay: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1000,
        comment: 'Delay entre reintentos en milisegundos',
      },
      endpoints: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Configuración de endpoints específicos',
        defaultValue: JSON.stringify({
          validate: '/validate',
          custody: '/custody',
          payment: '/payment',
          return: '/return',
          mandate: '/mandate',
          guarantee: '/guarantee',
          ced: '/ced',
        }),
        get() {
          const value = this.getDataValue('endpoints');
          return value ? JSON.parse(value) : {};
        },
        set(value) {
          this.setDataValue('endpoints', JSON.stringify(value || {}));
        },
      },
      features: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Características habilitadas',
        defaultValue: JSON.stringify({
          digital_signature: false,
          hmac_auth: true,
          certificate_auth: false,
          idempotency: true,
          webhooks: false,
        }),
        get() {
          const value = this.getDataValue('features');
          return value ? JSON.parse(value) : {};
        },
        set(value) {
          this.setDataValue('features', JSON.stringify(value || {}));
        },
      },
      webhook_url: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: 'URL para webhooks de COELSA',
      },
      webhook_secret: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Secret para validar webhooks',
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Indica si la configuración está activa',
      },
      last_test: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Última vez que se probó la conexión',
      },
      test_status: {
        type: DataTypes.ENUM('pending', 'success', 'failed'),
        allowNull: false,
        defaultValue: 'pending',
        comment: 'Estado de la última prueba de conexión',
      },
      test_message: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Mensaje de la última prueba',
      },
      created_by_info: {
        type: DataTypes.JSONB,
        allowNull: false,
        comment: 'Información del usuario que creó la configuración',
      },
      updated_by_info: {
        type: DataTypes.JSONB,
        allowNull: true,
        comment: 'Información del usuario que actualizó la configuración',
      },
    },
    {
      tableName: 'coelsa_configs',
      schema: 'echeqsandbox',
      timestamps: true,
      underscored: false,
      indexes: [
        {
          unique: true,
          fields: ['tenant_id'],
        },
        {
          fields: ['environment'],
        },
        {
          fields: ['is_active'],
        },
      ],
    }
  );

  // Asociaciones
  CoelsaConfig.associate = models => {
    CoelsaConfig.belongsTo(models.Tenant, {
      foreignKey: 'tenant_id',
      as: 'tenant',
    });

    CoelsaConfig.belongsTo(models.User, {
      foreignKey: 'created_by',
      as: 'creator',
    });

    CoelsaConfig.belongsTo(models.User, {
      foreignKey: 'updated_by',
      as: 'updater',
    });
  };

  // Métodos de instancia
  CoelsaConfig.prototype.testConnection = async function () {
    try {
      const axios = require('axios');
      const response = await axios.get(`${this.base_url}/health`, {
        timeout: this.timeout,
        headers: {
          'X-API-Key': this.api_key,
        },
      });

      this.last_test = new Date();
      this.test_status = 'success';
      this.test_message = 'Conexión exitosa';
      await this.save();

      return {
        success: true,
        message: 'Conexión exitosa',
        data: response.data,
      };
    } catch (error) {
      this.last_test = new Date();
      this.test_status = 'failed';
      this.test_message = error.message;
      await this.save();

      return {
        success: false,
        message: error.message,
        error: error.response?.data || error.message,
      };
    }
  };

  CoelsaConfig.prototype.getConfigForService = function () {
    return {
      baseURL: this.base_url,
      apiKey: this.api_key,
      apiSecret: this.api_secret,
      privateKey: this.private_key,
      certificate: this.certificate,
      timeout: this.timeout,
      maxRetries: this.max_retries,
      retryDelay: this.retry_delay,
      endpoints: this.endpoints,
      features: this.features,
      webhookUrl: this.webhook_url,
      webhookSecret: this.webhook_secret,
    };
  };

  return CoelsaConfig;
};

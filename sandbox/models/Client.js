/**
 * Modelo Client - Gestión de Clientes por Tenant
 * Clientes del banco (empresas, personas físicas)
 */

const { DataTypes } = require('sequelize');

module.exports = sequelize => {
  const Client = sequelize.define(
    'Client',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      tenant_id: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: 'ID del tenant (banco) al que pertenece',
      },
      type: {
        type: DataTypes.ENUM(
          'EMPRESA',
          'PERSONA_FISICA',
          'FINANCIERA',
          'MANDATARIO',
          'AVALISTA'
        ),
        allowNull: false,
        comment: 'Tipo de cliente',
      },
      tax_id: {
        type: DataTypes.STRING(13),
        allowNull: false,
        comment: 'CUIT o CUIL del cliente',
      },
      business_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'Razón social o nombre completo',
      },
      trade_name: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Nombre de fantasía (solo para empresas)',
      },
      fiscal_address: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Domicilio fiscal del cliente',
        defaultValue: '{}',
        get() {
          const value = this.getDataValue('fiscal_address');
          return value ? JSON.parse(value) : {};
        },
        set(value) {
          this.setDataValue('fiscal_address', JSON.stringify(value || {}));
        },
      },
      commercial_address: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Domicilio comercial del cliente',
        defaultValue: '{}',
        get() {
          const value = this.getDataValue('commercial_address');
          return value ? JSON.parse(value) : {};
        },
        set(value) {
          this.setDataValue('commercial_address', JSON.stringify(value || {}));
        },
      },
      contacts: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Información de contactos',
        defaultValue: JSON.stringify({
          email_principal: null,
          email_secundario: null,
          telefono_principal: null,
          telefono_secundario: null,
          celular: null,
        }),
        get() {
          const value = this.getDataValue('contacts');
          return value ? JSON.parse(value) : {};
        },
        set(value) {
          this.setDataValue('contacts', JSON.stringify(value || {}));
        },
      },
      banking_data: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Datos bancarios del cliente',
        defaultValue: JSON.stringify({
          cbu_principal: null,
          cbu_secundario: null,
          banco_principal: null,
          banco_secundario: null,
        }),
        get() {
          const value = this.getDataValue('banking_data');
          return value ? JSON.parse(value) : {};
        },
        set(value) {
          this.setDataValue('banking_data', JSON.stringify(value || {}));
        },
      },
      operational_config: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Configuración operativa del cliente',
        defaultValue: JSON.stringify({
          permite_emision: true,
          permite_endoso: true,
          permite_custodia: true,
          permite_negociacion: false,
          requiere_aprobacion_interna: false,
          limite_emision_diaria: 100000,
          limite_emision_individual: 50000,
        }),
        get() {
          const value = this.getDataValue('operational_config');
          return value ? JSON.parse(value) : {};
        },
        set(value) {
          this.setDataValue('operational_config', JSON.stringify(value || {}));
        },
      },
      risk_classification: {
        type: DataTypes.ENUM('BAJO', 'MEDIO', 'ALTO', 'MUY_ALTO'),
        allowNull: false,
        defaultValue: 'MEDIO',
        comment: 'Clasificación de riesgo del cliente',
      },
      status: {
        type: DataTypes.ENUM(
          'ACTIVE',
          'INACTIVE',
          'SUSPENDED',
          'PENDING_APPROVAL'
        ),
        allowNull: false,
        defaultValue: 'PENDING_APPROVAL',
        comment: 'Estado del cliente',
      },
      registration_date: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        comment: 'Fecha de alta del cliente',
      },
      activation_date: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Fecha de activación del cliente',
      },
      suspension_date: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Fecha de suspensión del cliente',
      },
      additional_data: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Datos adicionales específicos del tipo de cliente',
        defaultValue: '{}',
        get() {
          const value = this.getDataValue('additional_data');
          return value ? JSON.parse(value) : {};
        },
        set(value) {
          this.setDataValue('additional_data', JSON.stringify(value || {}));
        },
      },
      documents: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Documentos asociados al cliente',
        defaultValue: JSON.stringify({
          contrato: null,
          estatutos: null,
          poder: null,
          otros: [],
        }),
        get() {
          const value = this.getDataValue('documentos');
          return value ? JSON.parse(value) : {};
        },
        set(value) {
          this.setDataValue('documentos', JSON.stringify(value || {}));
        },
      },
      metadata: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Metadatos adicionales del cliente',
        defaultValue: '{}',
        get() {
          const value = this.getDataValue('metadata');
          return value ? JSON.parse(value) : {};
        },
        set(value) {
          this.setDataValue('metadata', JSON.stringify(value || {}));
        },
      },
    },
    {
      tableName: 'clients',
      schema: 'echeqsandbox',
      timestamps: true,
      underscored: false,
      indexes: [
        {
          name: 'clients_tenant_id_idx',
          fields: ['tenant_id'],
        },
        {
          name: 'clients_tax_id_idx',
          fields: ['tax_id'],
        },
        {
          name: 'clients_tenant_tax_id_idx',
          fields: ['tenant_id', 'tax_id'],
          unique: true,
        },
        {
          name: 'clients_type_idx',
          fields: ['type'],
        },
        {
          name: 'clients_status_idx',
          fields: ['status'],
        },
        {
          name: 'clients_risk_classification_idx',
          fields: ['risk_classification'],
        },
      ],
      hooks: {
        beforeCreate: client => {
          // Validar formato de CUIT/CUIL
          if (!client.tax_id || !/^\d{2}-\d{8}-\d{1}$/.test(client.tax_id)) {
            throw new Error(
              'Formato de CUIT/CUIL inválido. Debe ser XX-XXXXXXXX-X'
            );
          }
        },
        beforeUpdate: client => {
          // Actualizar fecha de activación si cambia el estado a ACTIVE
          if (
            client.changed('status') &&
            client.status === 'ACTIVE' &&
            !client.activation_date
          ) {
            client.activation_date = new Date();
          }
          // Actualizar fecha de suspensión si cambia el estado a SUSPENDED
          if (client.changed('status') && client.status === 'SUSPENDED') {
            client.suspension_date = new Date();
          }
        },
      },
    }
  );

  // Métodos de instancia
  Client.prototype.isActive = function () {
    return this.estado === 'ACTIVE';
  };

  Client.prototype.isSuspended = function () {
    return this.estado === 'SUSPENDED';
  };

  Client.prototype.canPerformOperation = function (operation, amount = 0) {
    if (!this.isActive()) {
      return false;
    }

    const config = this.configuracion_operativa || {};

    // Verificar permisos por operación
    switch (operation) {
      case 'emision':
        if (!config.permite_emision) return false;
        break;
      case 'endoso':
        if (!config.permite_endoso) return false;
        break;
      case 'custodia':
        if (!config.permite_custodia) return false;
        break;
      case 'negociacion':
        if (!config.permite_negociacion) return false;
        break;
    }

    // Verificar límites de monto
    if (amount > 0) {
      if (amount > config.limite_emision_individual) {
        return false;
      }
    }

    return true;
  };

  Client.prototype.requiresInternalApproval = function () {
    const config = this.configuracion_operativa || {};
    return config.requiere_aprobacion_interna === true;
  };

  Client.prototype.getContactInfo = function () {
    return this.contactos || {};
  };

  Client.prototype.getBankingInfo = function () {
    return this.datos_bancarios || {};
  };

  Client.prototype.getOperationalConfig = function () {
    return this.configuracion_operativa || {};
  };

  Client.prototype.isEmpresa = function () {
    return this.tipo === 'EMPRESA';
  };

  Client.prototype.isPersonaFisica = function () {
    return this.tipo === 'PERSONA_FISICA';
  };

  Client.prototype.isFinanciera = function () {
    return this.tipo === 'FINANCIERA';
  };

  Client.prototype.isMandatario = function () {
    return this.tipo === 'MANDATARIO';
  };

  Client.prototype.isAvalista = function () {
    return this.tipo === 'AVALISTA';
  };

  return Client;
};

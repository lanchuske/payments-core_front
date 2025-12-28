/**
 * Modelo Account - Gestión de Cuentas Emisoras
 * Cuentas bancarias habilitadas para emisión de ECHEQs
 */

const { DataTypes } = require('sequelize');

module.exports = sequelize => {
  const Account = sequelize.define(
    'Account',
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
      client_id: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: 'ID del cliente propietario de la cuenta',
      },
      cbu: {
        type: DataTypes.STRING(22),
        allowNull: false,
        comment: 'CBU de la cuenta bancaria',
      },
      account_number: {
        type: DataTypes.STRING(50),
        allowNull: false,
        comment: 'Número de cuenta bancaria',
      },
      account_type: {
        type: DataTypes.ENUM('CORRIENTE', 'CAJA_AHORRO', 'ESPECIAL'),
        allowNull: false,
        defaultValue: 'CORRIENTE',
        comment: 'Tipo de cuenta bancaria',
      },
      currency: {
        type: DataTypes.ENUM('ARS', 'USD', 'EUR'),
        allowNull: false,
        defaultValue: 'ARS',
        comment: 'Moneda de la cuenta',
      },
      bank: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'Nombre del banco',
      },
      branch: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Sucursal del banco',
      },
      issuance_config: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Configuración específica para emisión',
        defaultValue: JSON.stringify({
          permite_emision: true,
          limite_emision_diaria: 1000000,
          limite_emision_individual: 100000,
          requiere_aprobacion: false,
          monto_minimo_aprobacion: 50000,
          firmantes_autorizados: [],
          clausulas_permitidas: ['A_LA_ORDEN', 'NO_A_LA_ORDEN'],
          beneficiarios_permitidos: [],
        }),
        get() {
          const value = this.getDataValue('issuance_config');
          return value ? JSON.parse(value) : {};
        },
        set(value) {
          this.setDataValue('issuance_config', JSON.stringify(value || {}));
        },
      },
      endorsement_config: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Configuración específica para endosos',
        defaultValue: JSON.stringify({
          permite_endoso: true,
          tipos_endoso_permitidos: [
            'NOMINAL',
            'NEGOCIACION',
            'SIN_GARANTIA',
            'PROCURACION',
          ],
          requiere_aprobacion_endoso: false,
          monto_minimo_aprobacion_endoso: 25000,
        }),
        get() {
          const value = this.getDataValue('endorsement_config');
          return value ? JSON.parse(value) : {};
        },
        set(value) {
          this.setDataValue('endorsement_config', JSON.stringify(value || {}));
        },
      },
      custody_config: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Configuración específica para custodia',
        defaultValue: JSON.stringify({
          permite_custodia: true,
          banco_custodio: null,
          requiere_aprobacion_custodia: false,
        }),
        get() {
          const value = this.getDataValue('custody_config');
          return value ? JSON.parse(value) : {};
        },
        set(value) {
          this.setDataValue('custody_config', JSON.stringify(value || {}));
        },
      },
      status: {
        type: DataTypes.ENUM(
          'ACTIVE',
          'INACTIVE',
          'SUSPENDED',
          'PENDING_APPROVAL',
          'BLOCKED'
        ),
        allowNull: false,
        defaultValue: 'PENDING_APPROVAL',
        comment: 'Estado de la cuenta',
      },
      registration_date: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        comment: 'Fecha de alta de la cuenta',
      },
      activation_date: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Fecha de activación de la cuenta',
      },
      suspension_date: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Fecha de suspensión de la cuenta',
      },
      blocking_date: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Fecha de bloqueo de la cuenta',
      },
      current_balance: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: true,
        comment: 'Saldo actual de la cuenta',
      },
      available_balance: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: true,
        comment: 'Saldo disponible de la cuenta',
      },
      credit_limit: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: true,
        comment: 'Límite de crédito de la cuenta',
      },
      additional_data: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Datos adicionales de la cuenta',
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
        comment: 'Documentos asociados a la cuenta',
        defaultValue: JSON.stringify({
          contrato_cuenta: null,
          autorizacion_emision: null,
          otros: [],
        }),
        get() {
          const value = this.getDataValue('documents');
          return value ? JSON.parse(value) : {};
        },
        set(value) {
          this.setDataValue('documents', JSON.stringify(value || {}));
        },
      },
      metadata: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Metadatos adicionales de la cuenta',
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
      tableName: 'accounts',
      schema: 'echeqsandbox',
      timestamps: true,
      underscored: false,
      indexes: [
        {
          name: 'accounts_tenant_id_idx',
          fields: ['tenant_id'],
        },
        {
          name: 'accounts_client_id_idx',
          fields: ['client_id'],
        },
        {
          name: 'accounts_cbu_idx',
          fields: ['cbu'],
          unique: true,
        },
        {
          name: 'accounts_account_number_idx',
          fields: ['account_number'],
        },
        {
          name: 'accounts_status_idx',
          fields: ['status'],
        },
        {
          name: 'accounts_account_type_idx',
          fields: ['account_type'],
        },
        {
          name: 'accounts_currency_idx',
          fields: ['currency'],
        },
      ],
      hooks: {
        beforeCreate: account => {
          // Validar formato de CBU
          if (!account.cbu || !/^\d{22}$/.test(account.cbu)) {
            throw new Error('Formato de CBU inválido. Debe tener 22 dígitos');
          }
        },
        beforeUpdate: account => {
          // Actualizar fecha de activación si cambia el estado a ACTIVE
          if (
            account.changed('status') &&
            account.status === 'ACTIVE' &&
            !account.activation_date
          ) {
            account.activation_date = new Date();
          }
          // Actualizar fecha de suspensión si cambia el estado a SUSPENDED
          if (account.changed('status') && account.status === 'SUSPENDED') {
            account.suspension_date = new Date();
          }
          // Actualizar fecha de bloqueo si cambia el estado a BLOCKED
          if (account.changed('status') && account.status === 'BLOCKED') {
            account.blocking_date = new Date();
          }
        },
      },
    }
  );

  // Métodos de instancia
  Account.prototype.isActive = function () {
    return this.status === 'ACTIVE';
  };

  Account.prototype.isSuspended = function () {
    return this.status === 'SUSPENDED';
  };

  Account.prototype.isBlocked = function () {
    return this.status === 'BLOCKED';
  };

  Account.prototype.canEmitEcheq = function (amount = 0) {
    if (!this.isActive()) {
      return false;
    }

    const config = this.issuance_config || {};

    if (!config.permite_emision) {
      return false;
    }

    if (amount > 0) {
      if (amount > config.limite_emision_individual) {
        return false;
      }
    }

    return true;
  };

  Account.prototype.canEndorseEcheq = function (tipoEndoso, amount = 0) {
    if (!this.isActive()) {
      return false;
    }

    const config = this.endorsement_config || {};

    if (!config.permite_endoso) {
      return false;
    }

    if (!config.tipos_endoso_permitidos.includes(tipoEndoso)) {
      return false;
    }

    if (amount > 0 && config.monto_minimo_aprobacion_endoso) {
      if (amount > config.monto_minimo_aprobacion_endoso) {
        return false;
      }
    }

    return true;
  };

  Account.prototype.canCustodyEcheq = function () {
    if (!this.isActive()) {
      return false;
    }

    const config = this.custody_config || {};
    return config.permite_custodia === true;
  };

  Account.prototype.requiresApprovalForEmission = function (amount = 0) {
    const config = this.issuance_config || {};

    if (!config.requiere_aprobacion) {
      return false;
    }

    if (amount > 0 && config.monto_minimo_aprobacion) {
      return amount >= config.monto_minimo_aprobacion;
    }

    return config.requiere_aprobacion;
  };

  Account.prototype.requiresApprovalForEndorsement = function (amount = 0) {
    const config = this.endorsement_config || {};

    if (!config.requiere_aprobacion_endoso) {
      return false;
    }

    if (amount > 0 && config.monto_minimo_aprobacion_endoso) {
      return amount >= config.monto_minimo_aprobacion_endoso;
    }

    return config.requiere_aprobacion_endoso;
  };

  Account.prototype.getEmissionConfig = function () {
    return this.issuance_config || {};
  };

  Account.prototype.getEndorsementConfig = function () {
    return this.endorsement_config || {};
  };

  Account.prototype.getCustodyConfig = function () {
    return this.custody_config || {};
  };

  Account.prototype.getAuthorizedSigners = function () {
    const config = this.issuance_config || {};
    return config.firmantes_autorizados || [];
  };

  Account.prototype.getAllowedClauses = function () {
    const config = this.issuance_config || {};
    return config.clausulas_permitidas || ['A_LA_ORDEN'];
  };

  Account.prototype.getAllowedBeneficiaries = function () {
    const config = this.issuance_config || {};
    return config.beneficiarios_permitidos || [];
  };

  Account.prototype.getDailyEmissionLimit = function () {
    const config = this.issuance_config || {};
    return config.limite_emision_diaria || 1000000;
  };

  Account.prototype.getIndividualEmissionLimit = function () {
    const config = this.issuance_config || {};
    return config.limite_emision_individual || 100000;
  };

  return Account;
};

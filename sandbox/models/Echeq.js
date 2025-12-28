/**
 * ⚠️ CÓDIGO LEGACY - NO EN USO ⚠️
 * 
 * Este código está DEPRECADO. La plataforma usa echeq-sandbox-nestjs.
 * Ver DEPRECATED.md y LEGACY_README.md en la raíz del repositorio.
 * 
 * ⚠️ NO MODIFICAR - Este código no se ejecuta en producción
 */

const { DataTypes } = require('sequelize');

module.exports = sequelize => {
  const Echeq = sequelize.define(
    'Echeq',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      tenant_id: {
        type: DataTypes.UUID,
        allowNull: true,
        comment: 'ID del tenant al que pertenece el ECHEQ',
      },
      number: {
        type: DataTypes.STRING(50),
        allowNull: false,
        comment: 'Número del ECHEQ',
      },
      amount: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        validate: {
          min: 0,
        },
      },
      currency: {
        type: DataTypes.STRING(3),
        defaultValue: 'ARS',
        validate: {
          isIn: [['ARS', 'USD']],
        },
      },
      issue_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      due_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      issuer: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      beneficiary: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      issuer_cuit: {
        type: DataTypes.STRING(13),
        allowNull: true,
        comment: 'CUIT del emisor del eCheq',
      },
      beneficiary_cuit: {
        type: DataTypes.STRING(13),
        allowNull: true,
        comment: 'CUIT del beneficiario del eCheq',
      },
      status: {
        type: DataTypes.ENUM(
          'ACTIVE',
          'CANCELLED',
          'PAID',
          'EXPIRED',
          'EMITTED',
          'PENDING_ACCEPTANCE',
          'ACCEPTED',
          'REJECTED',
          'REPUDIATED',
          'ENDORSED',
          'ENDORSED_FOR_NEGOTIATION',
          'PENDING_ENDORSEMENT',
          'IN_CUSTODY',
          'DEPOSITED',
          'RETURN_REQUESTED',
          'MANDATE_REQUESTED',
          'GUARANTEE_REQUESTED',
          'CED_REQUESTED',
          'CERTIFICATE_EMITTED'
        ),
        defaultValue: 'ACTIVE',
      },
      customer_id: {
        type: DataTypes.UUID,
        allowNull: true,
        comment: 'ID del cliente propietario del ECHEQ',
      },
      coelsa_reference: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Referencia de COELSA',
      },
      validation_status: {
        type: DataTypes.ENUM('PENDING', 'VALIDATED', 'INVALID', 'ERROR'),
        defaultValue: 'PENDING',
        comment: 'Estado de validación',
      },
      validation_details: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Detalles de validación',
        get() {
          const value = this.getDataValue('validation_details');
          return value ? JSON.parse(value) : {};
        },
        set(value) {
          this.setDataValue('validation_details', JSON.stringify(value || {}));
        },
      },
      validated_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Fecha y hora de validación',
      },
      additional_data: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Datos adicionales del ECHEQ',
        defaultValue: '{}',
        get() {
          const value = this.getDataValue('additional_data');
          return value ? JSON.parse(value) : {};
        },
        set(value) {
          this.setDataValue('additional_data', JSON.stringify(value || {}));
        },
      },
      metadata: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Metadatos adicionales del ECHEQ',
        defaultValue: '{}',
        get() {
          const value = this.getDataValue('metadata');
          return value ? JSON.parse(value) : {};
        },
        set(value) {
          this.setDataValue('metadata', JSON.stringify(value || {}));
        },
      },
      admission_date: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Fecha de admisión del cheque',
      },
      rejection_date: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Fecha de repudio del cheque',
      },
      rejection_reason: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Motivo del repudio del cheque',
      },
    },
    {
      tableName: 'echeqs',
      schema: 'echeqsandbox',
      timestamps: true,
      underscored: false,
      indexes: [
        {
          name: 'echeqs_tenant_id_idx',
          fields: ['tenant_id'],
        },
        {
          name: 'echeqs_number_idx',
          fields: ['number'],
        },
        {
          name: 'echeqs_tenant_number_idx',
          fields: ['tenant_id', 'number'],
          unique: true,
        },
        {
          name: 'echeqs_customer_id_idx',
          fields: ['customer_id'],
        },
        {
          name: 'echeqs_status_idx',
          fields: ['status'],
        },
        {
          name: 'echeqs_due_date_idx',
          fields: ['due_date'],
        },
        {
          name: 'echeqs_issuer_idx',
          fields: ['issuer'],
        },
        {
          name: 'echeqs_beneficiary_idx',
          fields: ['beneficiary'],
        },
        {
          name: 'echeqs_issuer_cuit_idx',
          fields: ['issuer_cuit'],
        },
        {
          name: 'echeqs_beneficiary_cuit_idx',
          fields: ['beneficiary_cuit'],
        },
      ],
    }
  );

  // Métodos de instancia
  Echeq.prototype.isActive = function () {
    return this.status === 'ACTIVE';
  };

  Echeq.prototype.isCancelled = function () {
    return this.status === 'CANCELLED';
  };

  Echeq.prototype.isPaid = function () {
    return this.status === 'PAID';
  };

  Echeq.prototype.isExpired = function () {
    return this.status === 'EXPIRED';
  };

  Echeq.prototype.isValidated = function () {
    return this.validationStatus === 'VALIDATED';
  };

  Echeq.prototype.getAdditionalData = function () {
    return this.additional_data || {};
  };

  Echeq.prototype.getMetadata = function () {
    return this.metadata || {};
  };

  return Echeq;
};

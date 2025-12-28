const { DataTypes } = require('sequelize');

module.exports = sequelize => {
  const Discount = sequelize.define(
    'Discount',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      tenant_id: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: 'ID del tenant al que pertenece el descuento',
      },
      echeq_id: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: 'ID del ECHEQ para descuento',
      },
      customer_id: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: 'ID del cliente solicitante del descuento',
      },
      requested_amount: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        validate: {
          min: 0,
        },
      },
      approved_amount: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: true,
        validate: {
          min: 0,
        },
      },
      rate: {
        type: DataTypes.DECIMAL(5, 4),
        allowNull: true,
        validate: {
          min: 0,
          max: 1,
        },
      },
      status: {
        type: DataTypes.ENUM(
          'PENDING',
          'APPROVED',
          'REJECTED',
          'CANCELLED',
          'COMPLETED'
        ),
        defaultValue: 'PENDING',
      },
      requested_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      approved_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      approved_by: {
        type: DataTypes.UUID,
        allowNull: true,
        comment: 'ID del usuario que aprobó el descuento',
      },
      rejection_reason: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      coelsa_discount_id: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'ID de descuento en COELSA',
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Notas adicionales del descuento',
      },
      additional_data: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Datos adicionales del descuento',
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
        comment: 'Metadatos adicionales del descuento',
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
      tableName: 'discounts',
      schema: 'echeqsandbox',
      timestamps: true,
      underscored: false,
      indexes: [
        {
          name: 'discounts_tenant_id_idx',
          fields: ['tenant_id'],
        },
        {
          name: 'discounts_echeq_id_idx',
          fields: ['echeq_id'],
        },
        {
          name: 'discounts_customer_id_idx',
          fields: ['customer_id'],
        },
        {
          name: 'discounts_status_idx',
          fields: ['status'],
        },
        {
          name: 'discounts_requested_at_idx',
          fields: ['requested_at'],
        },
        {
          name: 'discounts_approved_by_idx',
          fields: ['approved_by'],
        },
      ],
    }
  );

  // Métodos de instancia
  Discount.prototype.isPending = function () {
    return this.status === 'PENDING';
  };

  Discount.prototype.isApproved = function () {
    return this.status === 'APPROVED';
  };

  Discount.prototype.isRejected = function () {
    return this.status === 'REJECTED';
  };

  Discount.prototype.isCancelled = function () {
    return this.status === 'CANCELLED';
  };

  Discount.prototype.isCompleted = function () {
    return this.status === 'COMPLETED';
  };

  Discount.prototype.getAdditionalData = function () {
    return this.additional_data || {};
  };

  Discount.prototype.getMetadata = function () {
    return this.metadata || {};
  };

  return Discount;
};

const { DataTypes } = require('sequelize');

module.exports = sequelize => {
  const Custody = sequelize.define(
    'Custody',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      tenant_id: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: 'ID del tenant al que pertenece la custodia',
      },
      echeq_id: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: 'ID del ECHEQ en custodia',
      },
      customer_id: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: 'ID del cliente propietario de la custodia',
      },
      status: {
        type: DataTypes.ENUM('IN_CUSTODY', 'RELEASED', 'EXPIRED', 'CANCELLED'),
        defaultValue: 'IN_CUSTODY',
      },
      custody_date: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      release_date: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      release_reason: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      coelsa_custody_id: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'ID de custodia en COELSA',
      },
      additional_data: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Datos adicionales de la custodia',
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
        comment: 'Metadatos adicionales de la custodia',
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
      tableName: 'custody',
      schema: 'echeqsandbox',
      timestamps: true,
      underscored: false,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      indexes: [
        {
          name: 'custody_tenant_id_idx',
          fields: ['tenant_id'],
        },
        {
          name: 'custody_echeq_id_idx',
          fields: ['echeq_id'],
        },
        {
          name: 'custody_customer_id_idx',
          fields: ['customer_id'],
        },
        {
          name: 'custody_status_idx',
          fields: ['status'],
        },
        {
          name: 'custody_custody_date_idx',
          fields: ['custody_date'],
        },
      ],
    }
  );

  // Métodos de instancia
  Custody.prototype.isInCustody = function () {
    return this.status === 'IN_CUSTODY';
  };

  Custody.prototype.isReleased = function () {
    return this.status === 'RELEASED';
  };

  Custody.prototype.isExpired = function () {
    return this.status === 'EXPIRED';
  };

  Custody.prototype.isCancelled = function () {
    return this.status === 'CANCELLED';
  };

  Custody.prototype.getAdditionalData = function () {
    return this.additional_data || {};
  };

  Custody.prototype.getMetadata = function () {
    return this.metadata || {};
  };

  return Custody;
};

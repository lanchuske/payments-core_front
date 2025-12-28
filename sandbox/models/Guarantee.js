const { DataTypes } = require('sequelize');

module.exports = sequelize => {
  const Guarantee = sequelize.define(
    'Guarantee',
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
      },
      echeq_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'echeqs',
          key: 'id',
        },
      },
      guarantee_type: {
        type: DataTypes.ENUM('TOTAL', 'PARCIAL'),
        allowNull: false,
      },
      guarantor_info: {
        type: DataTypes.JSONB,
        allowNull: false,
        comment: 'Información del avalista (nombre, CUIT, contacto, etc.)',
      },
      guarantee_amount: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
      },
      request_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM('PENDIENTE', 'APROBADO', 'RECHAZADO', 'ANULADO'),
        allowNull: false,
        defaultValue: 'PENDIENTE',
      },
      resolution_date: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      rejection_reason: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      metadata: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
    },
    {
      tableName: 'guarantees',
      schema: 'echeqsandbox',
      timestamps: true,
      underscored: false,
      indexes: [
        {
          fields: ['echeq_id'],
        },
        {
          fields: ['tenant_id'],
        },
        {
          fields: ['status'],
        },
        {
          fields: ['request_date'],
        },
      ],
    }
  );

  return Guarantee;
};



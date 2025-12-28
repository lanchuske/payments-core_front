const { DataTypes } = require('sequelize');

module.exports = sequelize => {
  const Return = sequelize.define(
    'Return',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      echeq_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'echeqs',
          key: 'id',
        },
      },
      reason: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      request_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM('PENDIENTE', 'APROBADA', 'RECHAZADA', 'ANULADA'),
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
      requester_info: {
        type: DataTypes.JSONB,
        allowNull: false,
        comment: 'Información del solicitante (nombre, CUIT, etc.)',
      },
      approver_info: {
        type: DataTypes.JSONB,
        allowNull: true,
        comment: 'Información del aprobador (nombre, CUIT, etc.)',
      },
      tenant_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'tenants',
          key: 'id',
        },
      },
      metadata: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
    },
    {
      tableName: 'returns',
      schema: 'echeqsandbox',
      timestamps: true,
      underscored: false,
      indexes: [
        {
          fields: ['echeq_id'],
        },
        {
          fields: ['status'],
        },
        {
          fields: ['request_date'],
        },
        {
          fields: ['tenant_id'],
        },
      ],
    }
  );

  return Return;
};

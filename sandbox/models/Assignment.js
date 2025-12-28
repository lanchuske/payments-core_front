const { DataTypes } = require('sequelize');

module.exports = sequelize => {
  const Assignment = sequelize.define(
    'Assignment',
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
      assignment_type: {
        type: DataTypes.ENUM('TOTAL', 'PARCIAL'),
        allowNull: false,
      },
      assignor_info: {
        type: DataTypes.JSONB,
        allowNull: false,
        comment: 'Información del cedente (nombre, CUIT, contacto, etc.)',
      },
      assignee_info: {
        type: DataTypes.JSONB,
        allowNull: false,
        comment: 'Información del cesionario (nombre, CUIT, contacto, etc.)',
      },
      assignment_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      assignment_amount: {
        type: DataTypes.DECIMAL(15, 2),
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
      metadata: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
    },
    {
      tableName: 'assignments',
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
          fields: ['assignment_date'],
        },
      ],
    }
  );

  return Assignment;
};



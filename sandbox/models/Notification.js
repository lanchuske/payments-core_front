const { DataTypes } = require('sequelize');

module.exports = sequelize => {
  const Notification = sequelize.define(
    'Notification',
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
      entity_info: {
        type: DataTypes.JSONB,
        allowNull: false,
        comment: 'Información de la entidad (nombre, CUIT, contacto, etc.)',
      },
      type: {
        type: DataTypes.ENUM('SUCCESS', 'WARNING', 'ERROR', 'INFO'),
        allowNull: false,
      },
      title: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      message: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      created_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM('PENDIENTE', 'LEIDA', 'ARCHIVADA'),
        allowNull: false,
        defaultValue: 'PENDIENTE',
      },
      priority: {
        type: DataTypes.ENUM('BAJA', 'MEDIA', 'ALTA', 'URGENTE'),
        allowNull: false,
        defaultValue: 'MEDIA',
      },
      read_date: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      metadata: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
    },
    {
      tableName: 'notifications',
      schema: 'echeqsandbox',
      timestamps: true,
      underscored: false,
      indexes: [
        {
          fields: ['tenant_id'],
        },
        {
          fields: ['status'],
        },
        {
          fields: ['type'],
        },
        {
          fields: ['priority'],
        },
        {
          fields: ['created_date'],
        },
      ],
    }
  );

  return Notification;
};



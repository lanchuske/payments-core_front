const { DataTypes } = require('sequelize');

module.exports = sequelize => {
  const SystemLog = sequelize.define(
    'SystemLog',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      timestamp: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      level: {
        type: DataTypes.ENUM('INFO', 'WARN', 'ERROR', 'DEBUG'),
        allowNull: false,
        defaultValue: 'INFO',
      },
      service: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      message: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      action: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      userInfo: {
        type: DataTypes.JSONB,
        allowNull: true,
        comment: 'Información del usuario (nombre, email, etc.)',
      },
      tenantId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'tenants',
          key: 'id',
        },
      },
      resourceType: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      resourceId: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      ipAddress: {
        type: DataTypes.STRING(45), // IPv6 compatible
        allowNull: true,
      },
      userAgent: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      method: {
        type: DataTypes.STRING(10),
        allowNull: true,
      },
      url: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      statusCode: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      details: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      metadata: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: {},
      },
    },
    {
      tableName: 'system_logs',
      schema: 'echeqsandbox',
      timestamps: true,
      underscored: true, // La BD usa snake_case (user_info, created_at, etc.)
      // En ambiente local, no crear índices problemáticos
      indexes:
        process.env.NODE_ENV === 'sandbox'
          ? [
              {
                name: 'system_logs_timestamp_idx',
                fields: ['timestamp'],
              },
              {
                name: 'system_logs_service_idx',
                fields: ['service'],
              },
              {
                name: 'system_logs_level_idx',
                fields: ['level'],
              },
              {
                name: 'system_logs_action_idx',
                fields: ['action'],
              },
            ]
          : [
              {
                name: 'system_logs_timestamp_idx',
                fields: ['timestamp'],
              },
              {
                name: 'system_logs_service_idx',
                fields: ['service'],
              },
              {
                name: 'system_logs_level_idx',
                fields: ['level'],
              },
              {
                name: 'system_logs_action_idx',
                fields: ['action'],
              },
              {
                name: 'system_logs_tenant_idx',
                fields: ['tenantId'],
              },
            ],
    }
  );

  return SystemLog;
};

/**
 * Modelo TenantSimple HÍBRIDO - Versión mejorada para sincronización
 * Soporta tanto operaciones independientes como sincronización con backend principal
 */

const { DataTypes } = require('sequelize');

module.exports = sequelize => {
  const TenantSimple = sequelize.define(
    'TenantSimple',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      // 🔗 NUEVO: Referencia al tenant del backend principal
      main_tenant_id: {
        type: DataTypes.UUID,
        allowNull: true,
        comment: 'ID del tenant en el backend principal (para sincronización)',
      },
      code: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        comment: 'Código único del tenant',
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'Nombre del banco o entidad financiera',
      },
      // 🔑 NUEVO: Credenciales generadas por el sandbox
      api_key: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'API Key generada por el sandbox',
      },
      api_secret: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'API Secret generada por el sandbox',
      },
      // 🔄 NUEVO: Control de sincronización
      sync_with_main: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Indica si está sincronizado con el backend principal',
      },
      is_independent: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Indica si es un tenant independiente (no sincronizado)',
      },
      sandbox_credentials: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: {},
        comment: 'Configuraciones específicas del sandbox',
      },
      cuit: {
        type: DataTypes.STRING(11),
        allowNull: true,
        comment: 'CUIT del tenant (11 dígitos)',
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Indica si el tenant está activo en el sandbox',
      },
    },
    {
      tableName: 'tenants',
      schema: 'echeqsandbox',
      timestamps: true,
      underscored: false,
      comment: 'Tabla híbrida de tenants para sandbox con sincronización opcional',
    }
  );

  return TenantSimple;
};

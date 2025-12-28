/**
 * Modelo TenantSimple - Versión simplificada para Sandbox
 * Solo para configuración de APIs, no para gestión completa de tenants
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
      sandbox_credentials: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: {},
        comment: 'Configuraciones específicas del sandbox',
      },
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
      main_tenant_id: {
        type: DataTypes.UUID,
        allowNull: true,
        comment: 'ID del tenant en el backend principal',
      },
      sync_with_main: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Si está sincronizado con el backend principal',
      },
      is_independent: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        comment: 'Si es un tenant independiente del sandbox',
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
      underscored: true, // La BD usa snake_case (created_at, updated_at)
      comment: 'Tabla simplificada de tenants para configuración de sandbox',
    }
  );

  return TenantSimple;
};

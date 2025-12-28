/**
 * Modelo User - Usuarios del sistema
 * Maneja autenticación y gestión de usuarios
 */

const { DataTypes } = require('sequelize');

module.exports = sequelize => {
  const User = sequelize.define(
    'User',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        validate: {
          isEmail: true,
        },
        comment: 'Email del usuario',
      },
      password: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'Contraseña hasheada',
      },
      company_name: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Nombre de la empresa',
      },
      role: {
        type: DataTypes.ENUM('SYSTEM_ADMIN', 'BANK_ADMIN', 'USER'),
        allowNull: false,
        defaultValue: 'USER',
        comment: 'Rol del usuario en el sistema',
      },
      status: {
        type: DataTypes.ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED'),
        allowNull: false,
        defaultValue: 'ACTIVE',
        comment: 'Estado del usuario',
      },
      tenantId: {
        type: DataTypes.UUID,
        allowNull: true,
        comment: 'ID del tenant al que pertenece el usuario',
      },
      lastLogin: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Último login del usuario',
      },
      metadata: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: {},
        comment: 'Metadatos adicionales del usuario',
      },
    },
    {
      tableName: 'users',
      schema: 'echeqsandbox',
      timestamps: true,
      underscored: false,
      comment: 'Tabla de usuarios del sistema',
    }
  );

  return User;
};


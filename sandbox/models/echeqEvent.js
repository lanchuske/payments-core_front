const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const EcheqEvent = sequelize.define(
  'EcheqEvent',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    echeq_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'echeqs',
        key: 'id',
      },
    },
    event_type: {
      type: DataTypes.STRING,
      allowNull: false,
      comment:
        'EMISSION, VALIDATION, ACCEPTANCE, REJECTION, ENDORSEMENT, DISCOUNT, PAYMENT, etc.',
    },
    event_status: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'SUCCESS, FAILED, PENDING, etc.',
    },
    event_description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Descripción detallada del evento',
    },
    event_data: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Datos adicionales del evento en formato JSON',
    },
    user_id: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'ID del usuario que realizó la acción',
    },
    user_cuit: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'CUIT del usuario que realizó la acción',
    },
    timestamp: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: 'echeq_events',
    schema: 'echeqsandbox',
    timestamps: true,
    underscored: false,
    indexes: [
      {
        fields: ['echeq_id'],
      },
      {
        fields: ['event_type'],
      },
      {
        fields: ['timestamp'],
      },
    ],
  }
);

module.exports = EcheqEvent;

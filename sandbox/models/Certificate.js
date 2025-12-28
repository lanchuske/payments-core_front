const { DataTypes } = require('sequelize');

module.exports = sequelize => {
  const Certificate = sequelize.define(
    'Certificate',
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
      certificate_type: {
        type: DataTypes.ENUM('CAC', 'CAC_FINAL', 'CAC_PARCIAL'),
        allowNull: false,
      },
      certificate_number: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      issue_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      expiry_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      validity_days: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM('ACTIVO', 'VENCIDO', 'ANULADO'),
        allowNull: false,
        defaultValue: 'ACTIVO',
      },
      metadata: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
    },
    {
      tableName: 'certificates',
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
          fields: ['certificate_number'],
        },
        {
          fields: ['status'],
        },
      ],
    }
  );

  return Certificate;
};



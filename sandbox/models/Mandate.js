const { DataTypes } = require('sequelize');

module.exports = sequelize => {
  const Mandate = sequelize.define(
    'Mandate',
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
      mandatary_info: {
        type: DataTypes.JSONB,
        allowNull: false,
        comment: 'Información del mandatario (nombre, CUIT, contacto, etc.)',
      },
      mandate_type: {
        type: DataTypes.ENUM('PAYMENT_MANDATE', 'COLLECTION_MANDATE', 'OTHER'),
        allowNull: false,
      },
      mandate_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM('ACTIVE', 'INACTIVE', 'REVOKED', 'EXPIRED'),
        allowNull: false,
        defaultValue: 'ACTIVE',
      },
      expiry_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      observations: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      metadata: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
    },
    {
      tableName: 'mandates',
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
          fields: ['mandate_date'],
        },
      ],
    }
  );

  return Mandate;
};



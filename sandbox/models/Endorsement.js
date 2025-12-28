/**
 * ⚠️ CÓDIGO LEGACY - NO EN USO ⚠️
 * 
 * Este código está DEPRECADO. La plataforma usa echeq-sandbox-nestjs.
 * Ver DEPRECATED.md y LEGACY_README.md en la raíz del repositorio.
 * 
 * ⚠️ NO MODIFICAR - Este código no se ejecuta en producción
 */

const { DataTypes } = require('sequelize');

/**
 * Endorsement Model
 * Manages ECHEQ endorsements according to COELSA specification
 */

module.exports = sequelize => {
  const Endorsement = sequelize.define(
    'Endorsement',
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },

      // Referencia al ECHEQ
      echeq_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'echeqs',
          key: 'id',
        },
      },

      // Referencia al tenant
      tenant_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'tenants',
          key: 'id',
        },
      },

      // Tipo de endoso según COELSA
      type: {
        type: DataTypes.ENUM(
          'NOMINAL',
          'PROCURACION',
          'SIN_GARANTIA',
          'NEGOCIACION'
        ),
        allowNull: false,
        comment: 'Tipo de endoso según especificación COELSA',
      },

      // Endosante (quien transfiere el ECHEQ)
      endorser: {
        type: DataTypes.STRING(22),
        allowNull: false,
        comment: 'CUIT (11 dígitos) o CBU (22 dígitos) del endosante',
      },

      // Endosatario (quien recibe el ECHEQ)
      endorsee: {
        type: DataTypes.STRING(22),
        allowNull: false,
        comment: 'CUIT (11 dígitos) o CBU (22 dígitos) del endosatario',
      },

      // Fecha del endoso
      endorsement_date: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },

      // Motivo de procuración (solo para endosos en procuración)
      procurement_reason: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Motivo del endoso en procuración',
      },

      // Banco de negociación (solo para endosos de negociación)
      negotiation_bank: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Banco donde se negocia el ECHEQ',
      },

      // Estado del endoso
      status: {
        type: DataTypes.ENUM('PENDIENTE', 'ACTIVO', 'ANULADO', 'REPUDIADO', 'VENCIDO'),
        allowNull: false,
        defaultValue: 'PENDIENTE',
      },

      // Fecha de anulación (si aplica)
      cancellation_date: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      // Motivo de anulación
      cancellation_reason: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },

      // Campos de auditoría
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
      tableName: 'endorsements',
      schema: 'echeqsandbox',
      timestamps: true,
      underscored: false,

      // Índices para optimizar consultas
      indexes: [
        {
          fields: ['echeq_id'],
        },
        {
          fields: ['tenant_id'],
        },
        {
          fields: ['endorser'],
        },
        {
          fields: ['endorsee'],
        },
        {
          fields: ['type'],
        },
        {
          fields: ['status'],
        },
        {
          fields: ['endorsement_date'],
        },
      ],

      // Comentarios de la tabla
      comment: 'Tabla de endosos de ECHEQs según especificación COELSA',
    }
  );

  // Hooks
  Endorsement.beforeCreate((endorsement, options) => {
    // Validar que el endosante y endosatario tengan formato válido
    if (
      endorsement.endosante &&
      !/^\d{11}$|^\d{22}$/.test(endorsement.endosante)
    ) {
      throw new Error(
        'endosante debe ser CUIT (11 dígitos) o CBU (22 dígitos)'
      );
    }

    if (
      endorsement.endosatario &&
      !/^\d{11}$|^\d{22}$/.test(endorsement.endosatario)
    ) {
      throw new Error(
        'endosatario debe ser CUIT (11 dígitos) o CBU (22 dígitos)'
      );
    }

    // Validar campos específicos según tipo
    if (endorsement.tipo === 'PROCURACION' && !endorsement.motivo_procuracion) {
      throw new Error(
        'motivo_procuracion es requerido para endosos en procuración'
      );
    }

    if (endorsement.tipo === 'NEGOCIACION' && !endorsement.banco_negociacion) {
      throw new Error(
        'banco_negociacion es requerido para endosos de negociación'
      );
    }
  });

  Endorsement.beforeUpdate((endorsement, options) => {
    // Si se está anulando, validar que se proporcione motivo
    if (endorsement.estado === 'ANULADO' && !endorsement.motivo_anulacion) {
      throw new Error('motivo_anulacion es requerido para anular un endoso');
    }
  });

  // Métodos de instancia
  Endorsement.prototype.isActive = function () {
    return this.estado === 'ACTIVO';
  };

  Endorsement.prototype.canBeAnnulled = function () {
    return this.estado === 'ACTIVO';
  };

  Endorsement.prototype.getEndosanteType = function () {
    return this.endosante.length === 11 ? 'CUIT' : 'CBU';
  };

  Endorsement.prototype.getEndosatarioType = function () {
    return this.endosatario.length === 11 ? 'CUIT' : 'CBU';
  };

  // Métodos de clase
  Endorsement.findByEcheqId = function (echeqId) {
    return this.findAll({
      where: { echeq_id: echeqId },
      order: [['fecha_endoso', 'ASC']],
    });
  };

  Endorsement.findActiveByEcheqId = function (echeqId) {
    return this.findAll({
      where: {
        echeq_id: echeqId,
        estado: 'ACTIVO',
      },
      order: [['fecha_endoso', 'ASC']],
    });
  };

  Endorsement.findByEndosante = function (endosante) {
    return this.findAll({
      where: { endosante: endosante },
      order: [['fecha_endoso', 'DESC']],
    });
  };

  Endorsement.findByEndosatario = function (endosatario) {
    return this.findAll({
      where: { endosatario: endosatario },
      order: [['fecha_endoso', 'DESC']],
    });
  };

  return Endorsement;
};

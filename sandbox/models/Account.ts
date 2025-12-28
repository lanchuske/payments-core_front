/**
 * Modelo Account - Gestión de Cuentas Emisoras (TypeScript)
 * Cuentas bancarias habilitadas para emisión de ECHEQs
 */

import { DataTypes, Model, Optional, Sequelize } from 'sequelize';
import { AccountData } from './types';

// Interfaces para configuración
export interface IssuanceConfig {
  permite_emision: boolean;
  limite_emision_diaria: number;
  limite_emision_individual: number;
  requiere_aprobacion: boolean;
  monto_minimo_aprobacion: number;
  firmantes_autorizados: string[];
  clausulas_permitidas: string[];
  beneficiarios_permitidos: string[];
}

export interface EndorsementConfig {
  permite_endoso: boolean;
  tipos_endoso_permitidos: string[];
  requiere_aprobacion_endoso: boolean;
  monto_minimo_aprobacion_endoso: number;
}

export interface CustodyConfig {
  permite_custodia: boolean;
  banco_custodio: string | null;
  requiere_aprobacion_custodia: boolean;
}

export interface AccountDocuments {
  contrato_cuenta: string | null;
  autorizacion_emision: string | null;
  otros: string[];
}

// Interface para el modelo Account
export interface AccountAttributes {
  id: string;
  tenant_id: string;
  client_id: string;
  cbu: string;
  account_number: string;
  account_type: 'CORRIENTE' | 'CAJA_AHORRO' | 'ESPECIAL';
  currency: 'ARS' | 'USD' | 'EUR';
  bank: string;
  branch?: string;
  issuance_config: IssuanceConfig;
  endorsement_config: EndorsementConfig;
  custody_config: CustodyConfig;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING_APPROVAL' | 'BLOCKED';
  registration_date: Date;
  activation_date?: Date;
  suspension_date?: Date;
  blocking_date?: Date;
  current_balance?: number;
  available_balance?: number;
  credit_limit?: number;
  additional_data: Record<string, any>;
  documents: AccountDocuments;
  metadata: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface AccountCreationAttributes extends Optional<AccountAttributes, 'id' | 'created_at' | 'updated_at'> {}

// Clase del modelo Account con métodos tipados
export class Account extends Model<AccountAttributes, AccountCreationAttributes> implements AccountAttributes {
  public id!: string;
  public tenant_id!: string;
  public client_id!: string;
  public cbu!: string;
  public account_number!: string;
  public account_type!: 'CORRIENTE' | 'CAJA_AHORRO' | 'ESPECIAL';
  public currency!: 'ARS' | 'USD' | 'EUR';
  public bank!: string;
  public branch?: string;
  public issuance_config!: IssuanceConfig;
  public endorsement_config!: EndorsementConfig;
  public custody_config!: CustodyConfig;
  public status!: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING_APPROVAL' | 'BLOCKED';
  public registration_date!: Date;
  public activation_date?: Date;
  public suspension_date?: Date;
  public blocking_date?: Date;
  public current_balance?: number;
  public available_balance?: number;
  public credit_limit?: number;
  public additional_data!: Record<string, any>;
  public documents!: AccountDocuments;
  public metadata!: Record<string, any>;
  public created_at!: Date;
  public updated_at!: Date;

  // Métodos de instancia tipados
  public isActive(): boolean {
    return this.status === 'ACTIVE';
  }

  public isSuspended(): boolean {
    return this.status === 'SUSPENDED';
  }

  public isBlocked(): boolean {
    return this.status === 'BLOCKED';
  }

  public canEmitEcheq(amount: number = 0): boolean {
    if (!this.isActive()) {
      return false;
    }

    const config = this.issuance_config;

    if (!config.permite_emision) {
      return false;
    }

    if (amount > 0) {
      if (amount > config.limite_emision_individual) {
        return false;
      }
    }

    return true;
  }

  public canEndorseEcheq(tipoEndoso: string, amount: number = 0): boolean {
    if (!this.isActive()) {
      return false;
    }

    const config = this.endorsement_config;

    if (!config.permite_endoso) {
      return false;
    }

    if (!config.tipos_endoso_permitidos.includes(tipoEndoso)) {
      return false;
    }

    if (amount > 0 && config.monto_minimo_aprobacion_endoso) {
      if (amount > config.monto_minimo_aprobacion_endoso) {
        return false;
      }
    }

    return true;
  }

  public canCustodyEcheq(): boolean {
    if (!this.isActive()) {
      return false;
    }

    const config = this.custody_config;
    return config.permite_custodia === true;
  }

  public requiresApprovalForEmission(amount: number = 0): boolean {
    const config = this.issuance_config;

    if (!config.requiere_aprobacion) {
      return false;
    }

    if (amount > 0 && config.monto_minimo_aprobacion) {
      return amount >= config.monto_minimo_aprobacion;
    }

    return config.requiere_aprobacion;
  }

  public requiresApprovalForEndorsement(amount: number = 0): boolean {
    const config = this.endorsement_config;

    if (!config.requiere_aprobacion_endoso) {
      return false;
    }

    if (amount > 0 && config.monto_minimo_aprobacion_endoso) {
      return amount >= config.monto_minimo_aprobacion_endoso;
    }

    return config.requiere_aprobacion_endoso;
  }

  public getEmissionConfig(): IssuanceConfig {
    return this.issuance_config;
  }

  public getEndorsementConfig(): EndorsementConfig {
    return this.endorsement_config;
  }

  public getCustodyConfig(): CustodyConfig {
    return this.custody_config;
  }

  public getAuthorizedSigners(): string[] {
    const config = this.issuance_config;
    return config.firmantes_autorizados || [];
  }

  public getAllowedClauses(): string[] {
    const config = this.issuance_config;
    return config.clausulas_permitidas || ['A_LA_ORDEN'];
  }

  public getAllowedBeneficiaries(): string[] {
    const config = this.issuance_config;
    return config.beneficiarios_permitidos || [];
  }

  public getDailyEmissionLimit(): number {
    const config = this.issuance_config;
    return config.limite_emision_diaria || 1000000;
  }

  public getIndividualEmissionLimit(): number {
    const config = this.issuance_config;
    return config.limite_emision_individual || 100000;
  }
}

// Función para inicializar el modelo
export const initAccountModel = (sequelize: Sequelize): typeof Account => {
  Account.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      tenant_id: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: 'ID del tenant (banco) al que pertenece',
      },
      client_id: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: 'ID del cliente propietario de la cuenta',
      },
      cbu: {
        type: DataTypes.STRING(22),
        allowNull: false,
        comment: 'CBU de la cuenta bancaria',
      },
      account_number: {
        type: DataTypes.STRING(50),
        allowNull: false,
        comment: 'Número de cuenta bancaria',
      },
      account_type: {
        type: DataTypes.ENUM('CORRIENTE', 'CAJA_AHORRO', 'ESPECIAL'),
        allowNull: false,
        defaultValue: 'CORRIENTE',
        comment: 'Tipo de cuenta bancaria',
      },
      currency: {
        type: DataTypes.ENUM('ARS', 'USD', 'EUR'),
        allowNull: false,
        defaultValue: 'ARS',
        comment: 'Moneda de la cuenta',
      },
      bank: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'Nombre del banco',
      },
      branch: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Sucursal del banco',
      },
      issuance_config: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Configuración específica para emisión',
        defaultValue: JSON.stringify({
          permite_emision: true,
          limite_emision_diaria: 1000000,
          limite_emision_individual: 100000,
          requiere_aprobacion: false,
          monto_minimo_aprobacion: 50000,
          firmantes_autorizados: [],
          clausulas_permitidas: ['A_LA_ORDEN', 'NO_A_LA_ORDEN'],
          beneficiarios_permitidos: [],
        }),
        get() {
          const value = this.getDataValue('issuance_config');
          return value ? JSON.parse(value) : {};
        },
        set(value: any) {
          this.setDataValue('issuance_config', JSON.stringify(value || {}));
        },
      },
      endorsement_config: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Configuración específica para endosos',
        defaultValue: JSON.stringify({
          permite_endoso: true,
          tipos_endoso_permitidos: [
            'NOMINAL',
            'NEGOCIACION',
            'SIN_GARANTIA',
            'PROCURACION',
          ],
          requiere_aprobacion_endoso: false,
          monto_minimo_aprobacion_endoso: 25000,
        }),
        get() {
          const value = this.getDataValue('endorsement_config');
          return value ? JSON.parse(value) : {};
        },
        set(value: any) {
          this.setDataValue('endorsement_config', JSON.stringify(value || {}));
        },
      },
      custody_config: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Configuración específica para custodia',
        defaultValue: JSON.stringify({
          permite_custodia: true,
          banco_custodio: null,
          requiere_aprobacion_custodia: false,
        }),
        get() {
          const value = this.getDataValue('custody_config');
          return value ? JSON.parse(value) : {};
        },
        set(value: any) {
          this.setDataValue('custody_config', JSON.stringify(value || {}));
        },
      },
      status: {
        type: DataTypes.ENUM(
          'ACTIVE',
          'INACTIVE',
          'SUSPENDED',
          'PENDING_APPROVAL',
          'BLOCKED'
        ),
        allowNull: false,
        defaultValue: 'PENDING_APPROVAL',
        comment: 'Estado de la cuenta',
      },
      registration_date: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        comment: 'Fecha de alta de la cuenta',
      },
      activation_date: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Fecha de activación de la cuenta',
      },
      suspension_date: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Fecha de suspensión de la cuenta',
      },
      blocking_date: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Fecha de bloqueo de la cuenta',
      },
      current_balance: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: true,
        comment: 'Saldo actual de la cuenta',
      },
      available_balance: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: true,
        comment: 'Saldo disponible de la cuenta',
      },
      credit_limit: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: true,
        comment: 'Límite de crédito de la cuenta',
      },
      additional_data: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Datos adicionales de la cuenta',
        defaultValue: '{}',
        get() {
          const value = this.getDataValue('additional_data');
          return value ? JSON.parse(value) : {};
        },
        set(value: any) {
          this.setDataValue('additional_data', JSON.stringify(value || {}));
        },
      },
      documents: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Documentos asociados a la cuenta',
        defaultValue: JSON.stringify({
          contrato_cuenta: null,
          autorizacion_emision: null,
          otros: [],
        }),
        get() {
          const value = this.getDataValue('documents');
          return value ? JSON.parse(value) : {};
        },
        set(value: any) {
          this.setDataValue('documents', JSON.stringify(value || {}));
        },
      },
      metadata: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Metadatos adicionales de la cuenta',
        defaultValue: '{}',
        get() {
          const value = this.getDataValue('metadata');
          return value ? JSON.parse(value) : {};
        },
        set(value: any) {
          this.setDataValue('metadata', JSON.stringify(value || {}));
        },
      },
    },
    {
      sequelize,
      tableName: 'accounts',
      schema: 'echeqsandbox',
      timestamps: true,
      underscored: false,
      indexes: [
        {
          name: 'accounts_tenant_id_idx',
          fields: ['tenant_id'],
        },
        {
          name: 'accounts_client_id_idx',
          fields: ['client_id'],
        },
        {
          name: 'accounts_cbu_idx',
          fields: ['cbu'],
          unique: true,
        },
        {
          name: 'accounts_account_number_idx',
          fields: ['account_number'],
        },
        {
          name: 'accounts_status_idx',
          fields: ['status'],
        },
        {
          name: 'accounts_account_type_idx',
          fields: ['account_type'],
        },
        {
          name: 'accounts_currency_idx',
          fields: ['currency'],
        },
      ],
      hooks: {
        beforeCreate: (account: Account) => {
          // Validar formato de CBU
          if (!account.cbu || !/^\d{22}$/.test(account.cbu)) {
            throw new Error('Formato de CBU inválido. Debe tener 22 dígitos');
          }
        },
        beforeUpdate: (account: Account) => {
          // Actualizar fecha de activación si cambia el estado a ACTIVE
          if (
            account.changed('status') &&
            account.status === 'ACTIVE' &&
            !account.activation_date
          ) {
            account.activation_date = new Date();
          }
          // Actualizar fecha de suspensión si cambia el estado a SUSPENDED
          if (account.changed('status') && account.status === 'SUSPENDED') {
            account.suspension_date = new Date();
          }
          // Actualizar fecha de bloqueo si cambia el estado a BLOCKED
          if (account.changed('status') && account.status === 'BLOCKED') {
            account.blocking_date = new Date();
          }
        },
      },
    }
  );

  return Account;
};

export default initAccountModel;

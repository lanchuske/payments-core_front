/**
 * Modelo TenantSimple - Versión simplificada para Sandbox (TypeScript)
 * Solo para configuración de APIs, no para gestión completa de tenants
 */

import { DataTypes, Model, Optional, Sequelize } from 'sequelize';
import { TenantSimpleData } from './types';

// Interface para el modelo TenantSimple
export interface TenantSimpleAttributes extends TenantSimpleData {
  sandbox_credentials: Record<string, any>;
  is_active: boolean;
}

export interface TenantSimpleCreationAttributes extends Optional<TenantSimpleAttributes, 'id' | 'created_at' | 'updated_at'> {}

// Clase del modelo TenantSimple con métodos tipados
export class TenantSimple extends Model<TenantSimpleAttributes, TenantSimpleCreationAttributes> implements TenantSimpleAttributes {
  public id!: string;
  public code!: string;
  public name!: string;
  public cuit!: string;
  public status!: 'active' | 'inactive' | 'suspended';
  public sandbox_credentials!: Record<string, any>;
  public is_active!: boolean;
  public created_at!: Date;
  public updated_at!: Date;

  // Métodos de instancia tipados
  public isActive(): boolean {
    return this.is_active;
  }

  public getSandboxCredentials(): Record<string, any> {
    return this.sandbox_credentials || {};
  }

  public setSandboxCredentials(credentials: Record<string, any>): void {
    this.sandbox_credentials = credentials;
  }

  public getCredential(key: string): any {
    return this.sandbox_credentials?.[key];
  }

  public setCredential(key: string, value: any): void {
    this.sandbox_credentials = {
      ...this.sandbox_credentials,
      [key]: value,
    };
  }
}

// Función para inicializar el modelo
export const initTenantSimpleModel = (sequelize: Sequelize): typeof TenantSimple => {
  TenantSimple.init(
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
      cuit: {
        type: DataTypes.STRING(11),
        allowNull: false,
        comment: 'CUIT del tenant',
      },
      status: {
        type: DataTypes.ENUM('active', 'inactive', 'suspended'),
        allowNull: false,
        defaultValue: 'active',
        comment: 'Estado del tenant',
      },
      sandbox_credentials: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: {},
        comment: 'Configuraciones específicas del sandbox',
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Indica si el tenant está activo en el sandbox',
      },
    },
    {
      sequelize,
      tableName: 'tenants',
      schema: 'echeqsandbox',
      timestamps: true,
      underscored: false,
      comment: 'Tabla simplificada de tenants para configuración de sandbox',
    }
  );

  return TenantSimple;
};

export default initTenantSimpleModel;

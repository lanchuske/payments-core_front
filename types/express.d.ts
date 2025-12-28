import { Request, Response } from 'express';

declare global {
  namespace Express {
    interface Request {
      user?: any;
      tenant?: any;
    }
  }
}

export interface ApiResponse {
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
  timestamp?: string;
}

export interface CoelsaRequest extends Request {
  body: {
    emisor_cuit?: string;
    receptor_cuit?: string;
    monto?: number;
    fecha_vencimiento?: string;
    [key: string]: any;
  };
}

export interface CoelsaAuthRequest extends Request {
  headers: {
    'x-api-key'?: string;
    'x-api-secret'?: string;
    'x-tenant-id'?: string;
  };
}

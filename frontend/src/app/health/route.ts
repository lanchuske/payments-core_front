/**
 * API Route para Health Check de Railway
 * Endpoint requerido por Railway en /health
 * SIMPLE Y RÁPIDO - Sin dependencias de BD
 */

import { NextResponse } from 'next/server';

/**
 * GET /health - Health check del sistema para Railway
 * Respuesta inmediata sin esperar conexiones externas
 */
export async function GET() {
  // Respuesta inmediata para Railway healthcheck
  return NextResponse.json(
    {
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      service: 'echeq-sandbox-nextjs'
    },
    { 
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      }
    }
  );
}

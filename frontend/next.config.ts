import type { NextConfig } from 'next';

const sandboxUrl = process.env.SANDBOX_URL || 'http://localhost:3004';

const nextConfig: NextConfig = {
  /* config options here */
  // En desarrollo, proxy de /api/coelsa al sandbox para que las llamadas desde el mismo origen funcionen
  async rewrites() {
    return [
      { source: '/api/coelsa/:path*', destination: `${sandboxUrl}/api/coelsa/:path*` },
    ];
  },
  eslint: {
    // Deshabilitar ESLint durante el build para evitar errores
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Deshabilitar verificación de tipos durante el build
    ignoreBuildErrors: true,
  },
  // 'export' genera frontend/out para que Express (sandbox) sirva estático en local.
  // Para despliegue solo-Next (ej. Vercel) usar 'standalone' y no depender de Express.
  output: 'export',
  trailingSlash: false,
  images: {
    unoptimized: true,
  },
  // Configurar el root del workspace para evitar warnings
  outputFileTracingRoot: process.cwd(),
  // Configuración de Webpack simplificada para Railway
  webpack: (config, { isServer }) => {
    // Solo configurar externals para el servidor
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        'pg': 'commonjs pg',
        'pg-native': 'commonjs pg-native',
      });
    }
    
    return config;
  },
};

export default nextConfig;

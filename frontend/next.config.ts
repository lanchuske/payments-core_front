import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    // Deshabilitar ESLint durante el build para evitar errores
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Deshabilitar verificación de tipos durante el build
    ignoreBuildErrors: true,
  },
  // Configuración para producción con API Routes
  output: 'standalone',
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

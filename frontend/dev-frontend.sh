#!/bin/bash

# Script para desarrollar el frontend Next.js con Yarn
echo "🚀 Iniciando desarrollo del frontend Next.js con Yarn..."

# Verificar si yarn está instalado
if ! command -v yarn &> /dev/null; then
    echo "❌ Yarn no está instalado. Instalando..."
    npm install -g yarn
fi

# Instalar dependencias si no están instaladas
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependencias con Yarn..."
    yarn install
fi

# Crear archivo .env.local si no existe
if [ ! -f ".env.local" ]; then
    echo "⚙️ Creando archivo de configuración..."
    echo "NEXT_PUBLIC_API_URL=http://localhost:3002/api/coelsa" > .env.local
fi

# Iniciar el servidor de desarrollo
echo "🌐 Iniciando servidor de desarrollo en http://localhost:3000..."
echo "📝 Usando Yarn para el desarrollo"
yarn dev

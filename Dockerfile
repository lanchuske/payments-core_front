# Dockerfile para ECHEQ Sandbox Unificado (Next.js)
# Uso: docker build --build-arg NODE_ENV=production -t echeq-sandbox .

FROM node:18

# Argumentos de build
ARG NODE_ENV=production
ARG PORT=3001
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SWAGGER_URL
ARG NEXT_PUBLIC_FRONTEND_URL

# Establecer directorio de trabajo
WORKDIR /app

# Instalar dependencias del sistema necesarias para build
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copiar archivos de dependencias del frontend
COPY frontend/package.json ./
COPY frontend/yarn.lock* ./

# Instalar dependencias (incluyendo devDependencies para el build)
# IMPORTANTE: No configurar NODE_ENV=production todavía para que yarn instale devDependencies
RUN echo "Instalando dependencias de Next.js (incluyendo devDependencies)..." && \
    unset NODE_ENV && \
    yarn install --frozen-lockfile --network-timeout 1000000 && \
    echo "Verificando binarios nativos de lightningcss..." && \
    ls -la node_modules/lightningcss/*.node 2>/dev/null || echo "Binarios nativos no encontrados, se intentará durante el build" && \
    echo "Verificando @tailwindcss/postcss..." && \
    test -d node_modules/@tailwindcss/postcss && echo "✅ @tailwindcss/postcss encontrado" || echo "⚠️  @tailwindcss/postcss no encontrado"

# Copiar código fuente del frontend
COPY frontend/ .

# Verificar que todas las dependencias necesarias están disponibles
RUN echo "Verificando dependencias después de copiar código..." && \
    echo "Verificando binarios de lightningcss..." && \
    find node_modules/lightningcss* -name "*.node" -type f 2>/dev/null | head -5 && \
    echo "Verificando @tailwindcss/postcss..." && \
    test -d node_modules/@tailwindcss/postcss && echo "✅ @tailwindcss/postcss encontrado" || \
    (echo "❌ ERROR: @tailwindcss/postcss no encontrado - ejecutando yarn install..." && \
     unset NODE_ENV && \
     yarn install --frozen-lockfile --network-timeout 1000000 && \
     test -d node_modules/@tailwindcss/postcss && echo "✅ @tailwindcss/postcss instalado" || \
     (echo "❌ ERROR: @tailwindcss/postcss aún no encontrado después de reinstalar" && exit 1))

# Exponer variables NEXT_PUBLIC_* como ENV antes del build (necesario para Next.js)
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_SWAGGER_URL=$NEXT_PUBLIC_SWAGGER_URL
ENV NEXT_PUBLIC_FRONTEND_URL=$NEXT_PUBLIC_FRONTEND_URL

# Construir aplicación Next.js
RUN echo "Construyendo aplicación Next.js..." && \
    echo "Variables de entorno NEXT_PUBLIC_*:" && \
    echo "  NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL:-'no definida'}" && \
    echo "  NEXT_PUBLIC_SWAGGER_URL=${NEXT_PUBLIC_SWAGGER_URL:-'no definida'}" && \
    echo "  NEXT_PUBLIC_FRONTEND_URL=${NEXT_PUBLIC_FRONTEND_URL:-'no definida'}" && \
    NODE_ENV=production yarn build && \
    echo "Aplicación construida exitosamente" && \
    echo "Verificando output de Next.js..." && \
    ls -la .next/ 2>/dev/null | head -10 && \
    if [ -d .next/standalone ]; then \
        echo "✅ Next.js standalone mode detectado" && \
        ls -la .next/standalone/ | head -10; \
    else \
        echo "⚠️  Next.js no está en modo standalone, usando modo normal"; \
    fi

# Para modo standalone, copiar archivos necesarios a .next/standalone
# Next.js standalone requiere .next/static y .next/server en el mismo directorio
RUN if [ -d .next/standalone ]; then \
        echo "📦 Configurando estructura para modo standalone..." && \
        mkdir -p .next/standalone/.next && \
        cp -r .next/static .next/standalone/.next/ 2>/dev/null || echo "No hay archivos static" && \
        cp -r .next/server .next/standalone/.next/ 2>/dev/null || echo "No hay archivos server"; \
    fi

# Crear usuario no-root para seguridad
RUN groupadd -r nodejs && \
    useradd -r -g nodejs nextjs

# Cambiar ownership de archivos
RUN chown -R nextjs:nodejs /app
USER nextjs

# Exponer puerto
EXPOSE $PORT

# Variables de entorno
ENV NODE_ENV=$NODE_ENV
ENV PORT=$PORT

# Comando de inicio - Next.js standalone mode
# Con output: standalone, Next.js genera .next/standalone/server.js que debe ejecutarse directamente
# El directorio de trabajo debe ser .next/standalone para que encuentre las dependencias
CMD ["sh", "-c", "if [ -f .next/standalone/server.js ]; then cd .next/standalone && PORT=${PORT:-3000} node server.js; else yarn start -p ${PORT:-3000}; fi"]

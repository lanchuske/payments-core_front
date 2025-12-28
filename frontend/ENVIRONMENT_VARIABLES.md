# Configuración de Variables de Entorno - Frontend ECHEQ Sandbox

## Descripción

El frontend de ECHEQ Sandbox ahora soporta variables de entorno para configurar dinámicamente las URLs de las APIs, evitando URLs hardcodeadas. **Opción 1**: Todo por Next.js en puerto 3001 - más moderno y eficiente.

## Variables de Entorno Soportadas

### Variables Requeridas (NEXT_PUBLIC_*)

- `NEXT_PUBLIC_API_URL`: URL base de la API del backend
  - Valor por defecto: `http://localhost:3001/api/coelsa`
  - Ejemplo: `http://localhost:3001/api/coelsa`

- `NEXT_PUBLIC_SWAGGER_URL`: URL base para documentación Swagger
  - Valor por defecto: `http://localhost:3001/api/sandbox/api-docs`
  - Ejemplo: `http://localhost:3001/api/sandbox/api-docs`

- `NEXT_PUBLIC_FRONTEND_URL`: URL base del frontend
  - Valor por defecto: `http://localhost:3001`
  - Ejemplo: `http://localhost:3001`

### Variables Opcionales

- `PORT`: Puerto único (Next.js)
  - Valor por defecto: `3001`
  - Ejemplo: `3001`

- `NODE_ENV`: Entorno de ejecución
  - Valores: `development`, `production`, `test`
  - Valor por defecto: `development`

## Configuración

### 1. Crear archivo `.env.local`

Crea un archivo `.env.local` en la raíz del directorio `frontend/`:

```bash
# Variables de entorno para el frontend de ECHEQ Sandbox
# Configurado para trabajar con backend en puerto 3002

# URL base de la API del backend
NEXT_PUBLIC_API_URL=http://localhost:3002/api/coelsa

# URL base para documentación Swagger
NEXT_PUBLIC_SWAGGER_URL=http://localhost:3002/api/sandbox/api-docs

# URL base del frontend (para referencias internas)
NEXT_PUBLIC_FRONTEND_URL=http://localhost:3001

# Puertos (para referencia)
NEXT_PUBLIC_BACKEND_PORT=3002
NEXT_PUBLIC_FRONTEND_PORT=3001

# Configuración de desarrollo
NODE_ENV=development
```

### 2. Configuración para diferentes entornos

#### Desarrollo Local (con backend en puerto 3002)
```bash
NEXT_PUBLIC_API_URL=http://localhost:3002/api/coelsa
NEXT_PUBLIC_SWAGGER_URL=http://localhost:3002/api/sandbox/api-docs
NEXT_PUBLIC_FRONTEND_URL=http://localhost:3001
NEXT_PUBLIC_BACKEND_PORT=3002
NEXT_PUBLIC_FRONTEND_PORT=3001
NODE_ENV=development
```

#### Producción
```bash
NEXT_PUBLIC_API_URL=https://api.echeq-sandbox.com/api/coelsa
NEXT_PUBLIC_SWAGGER_URL=https://api.echeq-sandbox.com/api/sandbox/api-docs
NEXT_PUBLIC_FRONTEND_URL=https://echeq-sandbox.com
NODE_ENV=production
```

#### Staging
```bash
NEXT_PUBLIC_API_URL=https://staging-api.echeq-sandbox.com/api/coelsa
NEXT_PUBLIC_SWAGGER_URL=https://staging-api.echeq-sandbox.com/api/sandbox/api-docs
NEXT_PUBLIC_FRONTEND_URL=https://staging.echeq-sandbox.com
NODE_ENV=development
```

## Integración con Backend y Railway

### Estructura de Puertos

- **Backend**: Puerto 3002 (configurado en tu `.env` del backend)
- **Frontend**: Puerto 3001 (Next.js por defecto, o 3000 si está disponible)

### Variables del Backend Relacionadas

Tu backend ya tiene configurado:
```bash
PORT=3002
NODE_ENV=development
CORS_ORIGIN=*
```

### Compatibilidad con Railway

La configuración está diseñada para funcionar tanto en desarrollo local como en Railway:

#### Desarrollo Local
```bash
NEXT_PUBLIC_API_URL=http://localhost:3002/api/coelsa
NEXT_PUBLIC_SWAGGER_URL=http://localhost:3002/api/sandbox/api-docs
NEXT_PUBLIC_FRONTEND_URL=http://localhost:3001
```

#### Railway (Automático)
```bash
# Railway configura automáticamente:
RAILWAY_ENVIRONMENT=production
RAILWAY_PUBLIC_DOMAIN=tu-app.railway.app

# Las URLs se adaptan automáticamente a:
# https://tu-app.railway.app/api/coelsa
# https://tu-app.railway.app/api/sandbox/api-docs
```

### Un Solo Archivo .env

**✅ Ventaja**: Todo en un solo `.env` que funciona para:
- Desarrollo local
- Railway deployment
- Diferentes entornos

**📁 Ubicación**: Archivo `.env` en la raíz del proyecto (compartido entre backend y frontend)

## Uso en el Código

### Configuración Centralizada

El archivo `src/lib/config.ts` contiene la configuración centralizada:

```typescript
import { config, getApiUrl, getSwaggerUrl } from '@/lib/config';

// Usar configuración directamente
const apiUrl = config.API_BASE_URL;
const backendPort = config.BACKEND_PORT;

// Usar funciones helper
const healthEndpoint = getApiUrl('/health');
const swaggerWithCredentials = getSwaggerUrl(credentials);
```

### Ejemplos de Uso

#### Llamadas a API
```typescript
// Antes (hardcodeado)
const response = await fetch('http://localhost:3002/api/coelsa/Cheques/Cheque');

// Después (configurable)
const response = await fetch(getApiUrl('/Cheques/Cheque'));
```

#### URLs de Swagger
```typescript
// Antes (hardcodeado)
const swaggerUrl = 'http://localhost:3002/api/sandbox/api-docs';

// Después (configurable)
const swaggerUrl = getSwaggerUrl(credentials);
```

## Archivos Modificados

Los siguientes archivos fueron actualizados para usar variables de entorno:

1. `src/lib/config.ts` - Nueva configuración centralizada
2. `src/lib/api.ts` - Actualizado para usar configuración centralizada
3. `src/components/AdminPanel/DocumentationTab.tsx` - URLs de Swagger configurables
4. `src/components/AdminPanel/TestingTab.tsx` - URLs de API configurables

## Notas Importantes

- Las variables de entorno que comienzan con `NEXT_PUBLIC_` son accesibles en el navegador
- Las variables sin este prefijo solo están disponibles en el servidor
- Los cambios en `.env.local` requieren reiniciar el servidor de desarrollo
- El archivo `.env.local` no debe ser committeado al repositorio (está en `.gitignore`)
- El frontend está configurado para trabajar con el backend en puerto 3002

## Troubleshooting

### Problema: Las variables no se cargan
- Verifica que el archivo se llame `.env.local` (no `.env`)
- Reinicia el servidor de desarrollo (`yarn dev`)
- Verifica que las variables comiencen con `NEXT_PUBLIC_`

### Problema: URLs incorrectas
- Verifica que las URLs no terminen con `/` innecesariamente
- Confirma que el backend esté corriendo en el puerto 3002
- Revisa la consola del navegador para errores de CORS

### Problema: CORS errors
- Verifica que `CORS_ORIGIN=*` esté configurado en el backend
- Confirma que el frontend esté corriendo en el puerto correcto
- Revisa que las URLs coincidan entre frontend y backend

# Sandbox – ejecución en entorno local

Para que el frontend del sandbox funcione en local (Express en puerto 3004):

## 1. Variables de entorno del backend (raíz del proyecto)

```bash
cp .env.example .env
```

Edita `.env` y asegura al menos:

- `PORT=3004`
- `DATABASE_URL=postgresql://payments:payments_dev@localhost:5432/payments_db`
- `JWT_SECRET=` (string largo aleatorio; ej: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
- `ADMIN_KEY=admin1234` (o la clave que uses para el panel de administración)

Opcional: `.env.local` en la misma raíz sobreescribe `.env` (no commitear).

## 2. Variables del frontend (build time)

El frontend se construye con `NEXT_PUBLIC_*`; si faltan, la app puede fallar al llamar a la API.

```bash
cd frontend
cp .env.local.example .env.local
```

En `.env.local` deja algo como:

- `NEXT_PUBLIC_API_URL=http://localhost:3004/api/coelsa`
- `NEXT_PUBLIC_SWAGGER_URL=http://localhost:3004/api/coelsa/swagger.json`
- `NEXT_PUBLIC_FRONTEND_URL=http://localhost:3004`
- `NEXT_PUBLIC_ADMIN_KEY=admin1234`

(Ajusta el puerto si en `.env` del backend usas otro distinto de 3004.)

## 3. Build del frontend (export estático)

El backend Express sirve el frontend desde `frontend/out`. Ese directorio se genera con:

```bash
cd frontend
yarn install
yarn build
```

Con `output: 'export'` en `next.config.ts`, `yarn build` crea la carpeta `out/`.

## 4. Arrancar el backend

Desde la **raíz** del proyecto (payments-core_front):

```bash
yarn install
node start-with-dotenv.js
```

O:

```bash
yarn start
```

El script carga `.env` y `.env.local` desde la raíz del proyecto (por `__dirname`), así que da igual desde qué directorio ejecutes el comando.

Abre en el navegador: **http://localhost:3004**

## Resumen de archivos

| Archivo              | Ubicación              | Uso                                      |
|----------------------|------------------------|------------------------------------------|
| `.env`               | raíz (core_front)      | Backend: PORT, DATABASE_URL, JWT_SECRET  |
| `.env.local`         | raíz (opcional)        | Sobreescribe .env                        |
| `frontend/.env.local`| frontend/              | Build: NEXT_PUBLIC_API_URL, etc.         |

Los errores `net::ERR_FILE_NOT_FOUND` para `util.js`, `extensionState.js` suelen ser de extensiones del navegador (p. ej. React DevTools), no del proyecto. Si la página carga pero la API falla, revisa que `NEXT_PUBLIC_API_URL` en `frontend/.env.local` coincida con el PORT del backend y que hayas vuelto a hacer `yarn build` en `frontend/` después de cambiar `.env.local`.

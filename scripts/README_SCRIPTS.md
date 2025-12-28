# Clasificación de Scripts - echeq-sandbox

Este documento clasifica los scripts en la carpeta `scripts/` del sandbox para determinar cuáles son necesarios para el funcionamiento de la aplicación y cuáles son temporales de sesiones de trabajo completadas.

## Resumen Ejecutivo

- **Total de scripts**: 3
- **Necesarios**: 1 (migración SQL de referencia)
- **Temporales (pueden eliminarse)**: 2 (scripts de testing/debugging)

---

## Scripts Analizados

### 1. `20251030_add_cheque_tipo.sql` ⚠️ **MIGRACIÓN SQL - REFERENCIA**

**Tipo**: Migración de base de datos  
**Fecha**: 2025-10-30  
**Propósito**: Agregar columna `cheque_tipo` (ENUM: 'CC', 'CPD') a la tabla `echeqs`

**Análisis**:
- ✅ Es una migración SQL con fecha específica (2025-10-30)
- ⚠️ La columna `cheque_tipo` **NO aparece** en el modelo `Echeq.js`
- ⚠️ No se encuentra referencia a `cheque_tipo` en el código del sandbox
- ⚠️ No se ejecuta automáticamente (no está en package.json ni en scripts de migración)

**Recomendación**: 
- **MANTENER** como referencia histórica de migración
- **O ELIMINAR** si la migración nunca se aplicó y no se planea usar
- Si se decide mantener, debería actualizarse el modelo `Echeq.js` para incluir este campo

**Estado**: ⚠️ **MIGRACIÓN INCOMPLETA O NO APLICADA**

---

### 2. `test-data-mapping.js` ❌ **TEMPORAL - ELIMINAR**

**Tipo**: Script de testing/debugging  
**Propósito**: Verificar mapeo de datos entre backend y frontend, detectar bugs como CUIT faltante

**Análisis**:
- ❌ No se referencia en `package.json`
- ❌ No se usa en ningún script de build o deployment
- ❌ Es un script de testing manual para debugging
- ❌ Requiere configuración manual (tokens, URLs)
- ❌ Usa `axios` directamente (no es parte del flujo de la aplicación)

**Recomendación**: **ELIMINAR** - Script temporal de sesión de debugging completada

**Estado**: ❌ **TEMPORAL - NO NECESARIO**

---

### 3. `test-e2e-bugs.js` ❌ **TEMPORAL - ELIMINAR**

**Tipo**: Script E2E de testing/debugging  
**Propósito**: Detectar bugs de UI usando Playwright (campos faltantes, placeholders, mapeo incorrecto)

**Análisis**:
- ❌ No se referencia en `package.json`
- ❌ No se usa en ningún script de build o deployment
- ❌ Es un script de testing manual para debugging
- ❌ Requiere configuración manual (credenciales hardcodeadas: `dario@echeq.ar`, `admin123`)
- ❌ Usa Playwright directamente (no es parte del flujo de la aplicación)
- ⚠️ **Seguridad**: Contiene credenciales hardcodeadas

**Recomendación**: **ELIMINAR** - Script temporal de sesión de debugging completada

**Estado**: ❌ **TEMPORAL - NO NECESARIO**

---

## Clasificación Final

### ✅ **NECESARIOS** (1 script)

1. **`20251030_add_cheque_tipo.sql`** - Migración SQL de referencia
   - **Acción**: Mantener como referencia histórica O eliminar si nunca se aplicó
   - **Nota**: Si se mantiene, debería actualizarse el modelo `Echeq.js`

### ❌ **TEMPORALES - ELIMINAR** (2 scripts)

1. **`test-data-mapping.js`** - Script de testing temporal
2. **`test-e2e-bugs.js`** - Script E2E temporal (contiene credenciales hardcodeadas)

---

## Recomendaciones

1. **Eliminar scripts temporales**: Los 2 scripts de testing pueden eliminarse ya que son de sesiones de debugging completadas.

2. **Decidir sobre la migración SQL**:
   - Si la migración `20251030_add_cheque_tipo.sql` nunca se aplicó y no se planea usar, **eliminarla**.
   - Si se aplicó pero el modelo no se actualizó, **actualizar el modelo `Echeq.js`** para incluir el campo `cheque_tipo`.
   - Si se quiere mantener como referencia histórica, **mantenerla** pero documentar que requiere actualización del modelo.

3. **Seguridad**: El script `test-e2e-bugs.js` contiene credenciales hardcodeadas. Si se mantiene temporalmente, debería usar variables de entorno.

---

## Notas Adicionales

- Los scripts de testing (`test-*.js`) no están integrados en el flujo de CI/CD
- No hay scripts de migración automática en el sandbox (a diferencia del backend)
- El sandbox usa Sequelize para modelos, pero las migraciones SQL son manuales

---

**Fecha de análisis**: 2025-01-XX  
**Analizado por**: AI Assistant




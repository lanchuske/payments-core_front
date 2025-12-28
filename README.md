# ⚠️ echeq-sandbox (LEGACY - NO EN USO)

## 🚨 ADVERTENCIA CRÍTICA

**Este repositorio está DEPRECADO y NO se usa en producción.**

### ❌ NO MODIFIQUES ESTE CÓDIGO ESPERANDO CAMBIOS EN PRODUCCIÓN

Si necesitas trabajar en el sandbox COELSA, el repositorio activo es:
- ✅ **`echeq-sandbox-nestjs`** - [Ir al repositorio activo](../../echeq-sandbox-nestjs)

---

## 📋 Información del Repositorio (Histórica)

Este fue el sandbox original implementado en Express.js, pero fue completamente reemplazado por la implementación en NestJS.

### Estado

- **Status**: ❌ DEPRECADO / NO EN USO
- **Última actualización activa**: Antes de migración a NestJS
- **Código activo**: Ver `echeq-sandbox-nestjs`

### ¿Por qué existe este repositorio?

- Referencia histórica del desarrollo
- Posible migración de lógica específica si es necesario
- Documentación de evolución del proyecto

---

## 🏗️ Arquitectura Real de la Plataforma

```
Frontend (echeq-frontend)
    ↓
BFF (echeq-banckend)
    ↓
Sandbox NestJS (echeq-sandbox-nestjs) ← ✅ ESTE ES EL ACTIVO
```

**El BFF configura la URL del sandbox desde `echeq.api_configs.base_url` y NUNCA apunta a este repositorio Express.**

---

## 📚 Documentación Adicional

- **`LEGACY_README.md`**: Documentación detallada sobre el estado legacy
- **`DEPRECATED.md`**: Advertencias para desarrolladores y agentes IA
- **Código activo**: Ver `echeq-sandbox-nestjs/README.md`

---



**REGLAS CRÍTICAS:**

1. ❌ **NUNCA** modifiques este repositorio pensando que afectará producción
2. ✅ **SIEMPRE** trabaja en `echeq-sandbox-nestjs` para cambios al sandbox
3. 📖 Lee `DEPRECATED.md` y `LEGACY_README.md` antes de cualquier modificación
4. 🔍 Verifica en `echeq-banckend/utils/sandbox-helpers.js` qué sandbox se usa realmente

---

**Última actualización**: 2025-10-31  
**Estado**: DEPRECADO / LEGACY  
**Repositorio activo**: `echeq-sandbox-nestjs`


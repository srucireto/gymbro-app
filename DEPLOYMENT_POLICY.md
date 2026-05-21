# Política de Deployment

## ⚠️ REGLA CRÍTICA

**NO hacer push automático a producción (`git push origin main`) a menos que el usuario lo pida explícitamente.**

## Flujo de trabajo correcto:

1. ✅ Hacer cambios en el código
2. ✅ Commitear localmente (`git commit`)
3. ✅ Verificar que el build funciona (`npm run build`)
4. ✅ Mostrar al usuario qué cambios se hicieron
5. ⏸️ **ESPERAR** a que el usuario pida explícitamente hacer deploy
6. ✅ Solo cuando el usuario diga "pushea a prod" o similar, entonces ejecutar `git push origin main`

## Comandos permitidos sin permiso:
- `git add`
- `git commit`
- `npm run build`
- `npm run dev`

## Comandos que requieren permiso explícito:
- ❌ `git push origin main`
- ❌ `git push`
- ❌ `vercel deploy`
- ❌ Cualquier comando que envíe código a producción

## Excepciones:
Ninguna. Siempre esperar confirmación del usuario antes de deployar.

---

**Creado:** 2026-05-21
**Razón:** El usuario prefiere controlar cuándo se hace deploy a producción para revisar cambios antes de que sean públicos.

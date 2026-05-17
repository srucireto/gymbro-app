# Guía de Deployment · GymBro

## Flujo de deployment

**El deployment se hace SIEMPRE mediante GitHub → Vercel auto-deploy.**

No usar `vercel --prod` manualmente. Vercel está configurado para hacer deploy automático cuando detecta un push a la rama `main`.

---

## Pasos para deployar

### 1. Verificar que todo funciona localmente

```bash
# Dev server corriendo sin errores
npm run dev

# Build exitoso
npm run build
```

### 2. Hacer commit de los cambios

```bash
# Ver cambios
git status

# Agregar archivos
git add -A

# Commit con mensaje descriptivo
git commit -m "feat: descripción concisa de los cambios

Detalles adicionales si es necesario.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

### 3. Push a GitHub

```bash
git push origin main
```

### 4. Vercel auto-deploya

Vercel detecta el push automáticamente y:
- Ejecuta `npm install`
- Ejecuta `npm run build`
- Deploya a producción si el build es exitoso
- Actualiza la URL principal: https://gymbro-app-roan.vercel.app

---

## Verificar el deployment

### Opción 1: Dashboard de Vercel

1. Ir a https://vercel.com/srucireto-projects/gymbro-app
2. Ver el deployment en progreso
3. Ver logs si hay errores

### Opción 2: CLI de Vercel

```bash
# Listar deployments recientes
vercel ls

# Ver logs del deployment más reciente
vercel logs
```

---

## Errores comunes

### Build falla en Vercel pero funciona localmente

**Causa:** TypeScript en modo estricto encuentra errores que no se muestran en dev.

**Solución:**
```bash
# Ejecutar build localmente para ver los errores
npm run build

# Corregir errores de TypeScript
# Commit y push nuevamente
```

### Deployment se queda en "Building..." por mucho tiempo

**Causa:** Build timeout (límite de 10 minutos en plan Free).

**Solución:**
- Verificar que no haya dependencias pesadas innecesarias
- Optimizar el build si es necesario

### Variables de entorno faltantes

**Causa:** `.env.local` no está en GitHub (y no debería estarlo).

**Solución:**
1. Ir a https://vercel.com/srucireto-projects/gymbro-app/settings/environment-variables
2. Agregar las variables necesarias:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

---

## Rollback a deployment anterior

Si el deployment nuevo tiene problemas:

```bash
# Listar deployments
vercel ls

# Promover un deployment anterior a producción
vercel promote <url-del-deployment-anterior> --prod
```

O desde el Dashboard de Vercel:
1. Ir a https://vercel.com/srucireto-projects/gymbro-app
2. Seleccionar el deployment anterior
3. Click en "Promote to Production"

---

## Flujo completo de ejemplo

```bash
# 1. Verificar que funciona
npm run build

# 2. Commit
git add -A
git commit -m "feat: nueva funcionalidad X

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

# 3. Push (esto dispara el deployment automático)
git push origin main

# 4. Esperar ~30 segundos
# 5. Verificar en https://gymbro-app-roan.vercel.app
```

---

## IMPORTANTE: No usar vercel CLI para deployment

❌ **NO HACER:**
```bash
vercel --prod
vercel deploy
```

✅ **SÍ HACER:**
```bash
git push origin main
```

El auto-deploy de GitHub → Vercel es más confiable y mantiene un historial claro de qué commit corresponde a cada deployment.

---

## URLs principales

- **Producción:** https://gymbro-app-roan.vercel.app
- **Dashboard:** https://vercel.com/srucireto-projects/gymbro-app
- **Repositorio:** https://github.com/srucireto/gymbro-app

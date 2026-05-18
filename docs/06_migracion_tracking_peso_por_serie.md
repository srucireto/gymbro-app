# Migración: Tracking con peso por serie

## Cambio realizado

Se migró el sistema de tracking de **1 registro por ejercicio** a **1 registro por serie**, permitiendo registrar un peso diferente para cada serie del mismo ejercicio.

## Motivación

En la práctica real del gimnasio:
- El peso puede cambiar entre series (fatiga, ajuste en tiempo real)
- En ejercicios compuestos, la lumbar puede ceder y requiere reducir peso
- Se hacen drop sets en la última serie
- Es más realista registrar el peso exacto usado en cada serie

## Cambios técnicos realizados

### 1. Base de datos

**Archivo:** `supabase/migrations/003_tracking_peso_por_serie.sql`

**Schema antiguo:**
```sql
create table tracking (
  id            uuid primary key,
  user_id       uuid references auth.users(id),
  semana_id     uuid references semanas(id),
  ejercicio_id  uuid references ejercicios(id),
  peso_trabajo  numeric,           -- peso único para todo el ejercicio
  reps_s1       integer,
  reps_s2       integer,
  reps_s3       integer,
  reps_s4       integer
);
```

**Schema nuevo:**
```sql
create table tracking (
  id            uuid primary key,
  user_id       uuid references auth.users(id),
  semana_id     uuid references semanas(id),
  ejercicio_id  uuid references ejercicios(id),
  numero_serie  integer not null check (numero_serie between 1 and 4),
  peso          numeric,           -- kg para esta serie específica
  reps          integer,           -- reps logradas en esta serie
  unique (semana_id, ejercicio_id, numero_serie)
);
```

**Migración de datos:**
- La migración SQL convierte automáticamente los datos existentes
- Cada fila antigua se expande en 1-4 filas nuevas (una por serie con datos)
- El peso_trabajo se copia a todas las series

### 2. TypeScript

**Archivo:** `src/types/index.ts`

**Interface actualizada:**
```typescript
export interface Tracking {
  id: string
  user_id: string
  semana_id: string
  ejercicio_id: string
  numero_serie: 1 | 2 | 3 | 4
  peso?: number | null
  reps?: number | null
  created_at?: string
}

export type TrackingEjercicio = {
  ejercicio_id: string
  series: Tracking[]
}
```

### 3. UI (SesionDetailPage.tsx)

**Cambios:**
- El estado `tracking` ahora es `Record<string, Tracking[]>` (array de series por ejercicio)
- Cada serie tiene su propio par de inputs: `[Peso S1] [Reps S1]`
- Layout:
  ```
  S1  [ peso ]  [ reps ]
  S2  [ peso ]  [ reps ]
  S3  [ peso ]  [ reps ]
  S4  [ peso ]  [ reps ]  (si aplica)
  ```

**Funciones actualizadas:**
- `handleTrackingChange`: ahora recibe `(ejercicioId, numeroSerie, field, value)`
- Guarda cada serie como un registro independiente con upsert en conflicto único

## Cómo aplicar la migración

### Paso 1: Ejecutar la migración SQL en Supabase

1. Ir a Supabase Dashboard → SQL Editor
2. Copiar el contenido de `supabase/migrations/003_tracking_peso_por_serie.sql`
3. Ejecutar la migración
4. Verificar que los datos se migraron correctamente:
   ```sql
   -- Ver datos migrados
   select * from tracking order by ejercicio_id, numero_serie;

   -- Comparar con backup (antes de eliminar)
   select * from tracking_old;
   ```

### Paso 2: Verificar en la app

1. Hacer `npm run dev`
2. Abrir una sesión de entrenamiento
3. Verificar que los inputs de tracking se muestran correctamente
4. Probar guardar datos: peso diferente en cada serie
5. Recargar la página y verificar que los datos persisten

### Paso 3: Eliminar backup (opcional)

Una vez confirmado que todo funciona:
```sql
drop table tracking_old;
```

## Ejemplos de uso

### Caso 1: Mismo peso en todas las series
```
S1  [ 100 kg ]  [ 12 reps ]
S2  [ 100 kg ]  [ 10 reps ]
S3  [ 100 kg ]  [  9 reps ]
```

### Caso 2: Drop set en última serie
```
S1  [ 80 kg ]  [ 8 reps ]
S2  [ 80 kg ]  [ 7 reps ]
S3  [ 60 kg ]  [ 12 reps ]  ← drop set
```

### Caso 3: Ajuste por fatiga/lumbar
```
S1  [ 120 kg ]  [ 10 reps ]
S2  [ 120 kg ]  [  8 reps ]
S3  [ 110 kg ]  [  8 reps ]  ← bajó peso por fatiga
S4  [ 100 kg ]  [  8 reps ]  ← bajó más por seguridad lumbar
```

## Retrocompatibilidad

⚠️ **NO hay retrocompatibilidad con el diseño anterior**

Si ya tienes datos en producción:
1. La migración SQL los convierte automáticamente
2. El código viejo NO funcionará con el nuevo schema
3. Debes deployar código nuevo y migración DB al mismo tiempo

## Testing

### Casos a probar:
- [ ] Crear tracking nuevo (ejercicio sin datos previos)
- [ ] Editar tracking existente (modificar peso de una serie)
- [ ] Ejercicio con 3 series vs 4 series
- [ ] Dejar campos vacíos (nulls)
- [ ] Cambiar peso entre series
- [ ] Recargar página y verificar persistencia

### Queries útiles para debug:
```sql
-- Ver tracking de un ejercicio específico
select * from tracking
where ejercicio_id = 'xxx'
order by numero_serie;

-- Ver tracking de una semana
select e.nombre, t.numero_serie, t.peso, t.reps
from tracking t
join ejercicios e on e.id = t.ejercicio_id
where t.semana_id = 'yyy'
order by e.orden, t.numero_serie;
```

## Próximos pasos (futuro)

Mejoras opcionales que se pueden implementar después:

1. **Pre-poblar peso de S1**: Si hay historial del ejercicio, sugerir el último peso usado
2. **Copy peso a todas las series**: Botón "usar mismo peso" para copiar S1 → S2, S3, S4
3. **Análisis de progresión**: Gráficos de evolución de peso por ejercicio a lo largo del tiempo
4. **Detección de drop sets**: Marcar automáticamente cuando el peso baja >15% entre series

---

**Fecha de migración:** 2026-05-17
**Versión schema DB:** v3 (003_tracking_peso_por_serie)

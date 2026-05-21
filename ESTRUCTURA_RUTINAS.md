# Estructura de Datos - Rutinas

Especificación completa de la estructura JSON para rutinas en GymBro.

## Estructura General

```json
{
  "nombre": "Nombre de la rutina",
  "semanas_duracion": 6,
  "activa": true,
  "sesiones": [...]
}
```

---

## Campos de Rutina

### `nombre` (string, requerido)
Nombre descriptivo de la rutina.

**Ejemplos:**
- `"PPL - Push Pull Legs"`
- `"Upper Lower Split"`
- `"Full Body 3x"`

### `semanas_duracion` (number, requerido)
Duración del mesociclo en semanas.

**Valores típicos:** 4, 6, 8, 12

### `activa` (boolean, requerido)
Indica si la rutina está activa.

**Valores:** `true` o `false`

### `sesiones` (array, requerido)
Lista de sesiones de entrenamiento.

---

## Estructura de Sesiones

```json
{
  "nombre": "Push A",
  "tipo": "push",
  "intensidad": "pesada",
  "buffer_minimo_horas": 48,
  "es_post_partido": false,
  "orden": 1,
  "ejercicios": [...]
}
```

### `nombre` (string, requerido)
Nombre de la sesión.

**Ejemplos:** `"Push A"`, `"Pull B"`, `"Legs"`, `"Upper Body"`

### `tipo` (string, requerido)
Tipo de sesión.

**Valores permitidos:**
- `"push"` - Empujes, cuádriceps, hombros, pecho, tríceps
- `"pull"` - Jalones, isquiotibiales, espalda, bíceps, trapecio

### `intensidad` (string, requerido)
Nivel de intensidad de la sesión.

**Valores permitidos:**
- `"pesada"` - Compuestos, cargas altas, RIR bajo
- `"liviana"` - Aislamiento, volumen, conexión mente-músculo

### `buffer_minimo_horas` (number, requerido)
Horas mínimas de descanso antes de la siguiente sesión.

**Valores comunes:**
- `48` - Upper body normal
- `72` - Lower body (necesita más recuperación)
- `24` - Sesiones muy livianas

### `es_post_partido` (boolean, requerido)
Indica si esta sesión puede programarse después de un partido de fútbol.

**Reglas:**
- `true` - Solo sesiones de pierna liviana o upper body
- `false` - Lower body pesado nunca es post-partido

### `orden` (number, requerido)
Posición de la sesión en la rutina.

**Valores:** 1, 2, 3, 4, ...

### `ejercicios` (array, requerido)
Lista de ejercicios de la sesión.

---

## Estructura de Ejercicios

```json
{
  "nombre": "Press banca",
  "grupo_muscular": "Pecho",
  "series": 4,
  "reps_target": "6-8",
  "rir_target": "1-2",
  "notas": "Activar escapulas, mantener tension",
  "youtube_search": "press banca tecnica",
  "orden": 1
}
```

### `nombre` (string, requerido)
Nombre del ejercicio.

**Ejemplos:** `"Press banca"`, `"Dominadas"`, `"Sentadilla"`

### `grupo_muscular` (string, requerido)
Grupo muscular principal trabajado.

**Categorías principales:**
- Torso: `"Pecho"`, `"Espalda"`, `"Hombros"`, `"Core"`
- Brazos: `"Bíceps"`, `"Tríceps"`, `"Antebrazos"`
- Piernas: `"Cuádriceps"`, `"Isquiotibiales"`, `"Glúteos"`, `"Gemelos"`

**Subdivisiones permitidas:**
- `"Pecho superior"`, `"Pecho inferior"`
- `"Hombro anterior"`, `"Hombro lateral"`, `"Hombro posterior"`
- `"Espalda alta"`, `"Espalda media"`, `"Espalda baja"`

### `series` (number, requerido)
Número de series efectivas del ejercicio.

**Valores típicos:** 3, 4 (ocasionalmente 2 o 5)

### `reps_target` (string, requerido)
Rango objetivo de repeticiones.

**Formatos válidos:**
- Rangos: `"6-8"`, `"8-12"`, `"12-15"`, `"15-20"`
- Isométricos: `"30-60s"`, `"45s"`

**Guía de rangos:**
- Fuerza: `"3-5"`, `"5-8"`
- Hipertrofia: `"6-12"`, `"8-12"`
- Resistencia/pump: `"12-15"`, `"15-20"`

### `rir_target` (string, requerido)
RIR (Reps in Reserve) objetivo - repeticiones que quedan en el tanque.

**Formatos válidos:**
- Valores únicos: `"0"`, `"1"`, `"2"`, `"3"`
- Rangos: `"1-2"`, `"2-3"`, `"0-1"`

**Guía de RIR:**
- Compuestos pesados: `"2-3"`
- Hipertrofia general: `"1-2"`
- Aislamiento/pump: `"0-1"`

### `notas` (string, opcional)
Cues técnicos o indicaciones importantes.

**Ejemplos:**
- `"Activar escapulas, mantener tension en pecho"`
- `"Core activado, no arquear espalda"`
- `"Control en la bajada, evitar trapecio"`

### `youtube_search` (string, opcional)
Query de búsqueda para videos de técnica en YouTube.

**Formato:** Nombre del ejercicio + "form" o "technique"

**Ejemplos:**
- `"press banca tecnica"`
- `"deadlift tutorial"`
- `"pull ups form"`

### `orden` (number, requerido)
Posición del ejercicio en la sesión.

**Valores:** 1, 2, 3, 4, ...

---

## Ejemplo Completo

Ver `rutina-template.json` para un ejemplo funcional completo de una rutina PPL con 6 sesiones.

---

## Validación

### Campos Requeridos por Entidad

**Rutina:**
- ✅ nombre
- ✅ semanas_duracion
- ✅ activa
- ✅ sesiones (array no vacío)

**Sesión:**
- ✅ nombre
- ✅ tipo (`"push"` o `"pull"`)
- ✅ intensidad (`"pesada"` o `"liviana"`)
- ✅ buffer_minimo_horas
- ✅ es_post_partido
- ✅ orden
- ✅ ejercicios (array no vacío)

**Ejercicio:**
- ✅ nombre
- ✅ grupo_muscular
- ✅ series
- ✅ reps_target
- ✅ rir_target
- ✅ orden
- ⚪ notas (opcional)
- ⚪ youtube_search (opcional)

### Restricciones

- **tipo**: Solo `"push"` o `"pull"` (case-sensitive)
- **intensidad**: Solo `"pesada"` o `"liviana"` (case-sensitive)
- **orden**: Debe ser secuencial (1, 2, 3, ...) sin saltos
- **series**: Número positivo (típicamente 2-5)
- **buffer_minimo_horas**: Número positivo (múltiplo de 24 recomendado)

---

## Cargar Rutina a la Base de Datos

Una vez que tengas tu JSON estructurado:

```bash
npm run cargar-rutina mi-rutina.json <user_id>
```

Ver `scripts/README.md` para documentación completa del script de carga.

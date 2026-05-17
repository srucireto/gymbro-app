# Objetivo del sistema dinámico de programación

## El problema que resuelve

Una rutina de hipertrofia fija asume que el calendario de entrenamiento es predecible. En este caso no lo es:

- El partido de futsal normalmente es el viernes, pero puede moverse a **cualquier día de la semana**
- El aviso llega el **viernes anterior** (2–3 días de anticipación)
- El entreno de futsal es siempre martes, excepto cuando el partido cae ese día (→ se mueve al viernes)
- Nunca hay dos partidos en la misma semana

El orden de las sesiones de gym importa porque existe una jerarquía de buffers de recuperación entre sesiones y partido. Ignorarlos = riesgo real de lesión (tirón de isquios).

El sistema necesita responder a la pregunta: **"El partido esta semana es el [día], ¿qué hago cada día?"** y devolver un calendario semanal correcto automáticamente.

---

## Qué hace el sistema

El usuario ingresa al inicio de cada semana:
1. **Qué día es el partido esta semana** (o "viernes" si es semana normal)
2. Opcionalmente: si hay alguna sesión que quiere saltear o mover

El sistema responde con:
- El calendario completo de la semana (qué sesión va cada día)
- Indicación de si alguna sesión cae en versión modificada (Pull A liviano, Pull B mantenimiento)
- Advertencias si algún buffer está al límite
- Qué sesión, si no entra en la semana, se pospone a la siguiente

---

## Qué NO hace el sistema

- No modifica los ejercicios dentro de cada sesión (eso está fijo en la rutina)
- No reemplaza el criterio del atleta si hay molestias físicas
- No sugiere cambios de mesociclo (eso se hace cada 7 semanas con revisión de progresión)
- No trackea pesos ni progresión (eso lo hace la planilla Excel)

---

## Rutinas soportadas

El sistema está diseñado para soportar múltiples rutinas cargadas por el usuario. Cada rutina tiene:

- **Nombre** (ej. "Mesociclo 1 — Base", "Mesociclo 2 — Volumen")
- **Sesiones** (lista de días: Pull A, Push A, Pull B, Push B)
- **Qué sesión es la más crítica para la cadena posterior** (la que necesita mayor buffer antes del partido)
- **Versión liviana de la sesión crítica** (para casos de buffer reducido)

Cuando el usuario sube una nueva rutina, define estas propiedades. El algoritmo de scheduling es el mismo para todas.

---

## Algoritmo central

```
INPUT:
  - dia_partido: lunes | martes | miércoles | jueves | viernes | sábado | domingo
  - rutina_activa: objeto con sesiones y buffers requeridos
  - semana_actual: fecha de inicio

OUTPUT:
  - calendario: { lunes: sesión | "futsal" | "partido" | "descanso", ... }
  - advertencias: lista de ajustes aplicados
  - sesiones_pospuestas: sesiones que no entraron esta semana

LÓGICA:
  1. Marcar el día del partido en el calendario
  2. Marcar el martes como "futsal entreno" 
     - Excepción: si partido = martes → martes = partido, viernes = futsal entreno
  3. Colocar sesiones de gym respetando buffers mínimos:
     - Sesión de cadena posterior pesada (Pull A) → mínimo 96hs antes del partido
     - Sesión de cuádriceps pesado (Push A) → mínimo 48hs antes del partido
     - Sesión de mantenimiento (Pull B) → mínimo 24hs antes del partido
     - Sesión post-partido (Push B) → después del partido
  4. Si Pull A no puede colocarse con 96hs de buffer → usar versión liviana
  5. Si alguna sesión no tiene slot válido → marcar como pospuesta a semana siguiente
  6. Retornar calendario + advertencias
```

---

## Estructura de datos de una rutina

```json
{
  "id": "mesociclo_1",
  "nombre": "Mesociclo 1 — Base",
  "fecha_inicio": "2025-06-01",
  "semanas_duracion": 6,
  "sesiones": [
    {
      "id": "pull_a",
      "nombre": "Pull A",
      "tipo": "pull",
      "intensidad": "pesada",
      "buffer_minimo_horas": 96,
      "tiene_version_liviana": true,
      "version_liviana_id": "pull_b"
    },
    {
      "id": "push_a",
      "nombre": "Push A",
      "tipo": "push",
      "intensidad": "pesada",
      "buffer_minimo_horas": 48,
      "tiene_version_liviana": false
    },
    {
      "id": "pull_b",
      "nombre": "Pull B",
      "tipo": "pull",
      "intensidad": "liviana",
      "buffer_minimo_horas": 24,
      "tiene_version_liviana": false
    },
    {
      "id": "push_b",
      "nombre": "Push B",
      "tipo": "push",
      "intensidad": "liviana",
      "buffer_minimo_horas": 0,
      "es_post_partido": true,
      "tiene_version_liviana": false
    }
  ]
}
```

---

## Estados posibles de una sesión en el calendario

| Estado | Significado |
|---|---|
| `normal` | Sesión completa, todos los buffers respetados |
| `liviana` | Sesión con versión reducida por buffer insuficiente |
| `pospuesta` | No entró en la semana, se agenda la siguiente |
| `omitida` | No entra y no se puede recuperar (raro, solo si hay 2 semanas seguidas complicadas) |

---

## Ciclo de vida del sistema

```
Semana 1–6:   Usuario entrena con la rutina activa
               Cada semana: ingresa día de partido → sistema genera calendario

Semana 7:     Deload automático (mismos ejercicios, 60% volumen)

Post-semana 7: Usuario sube planilla Excel con progresión real
               → Análisis manual con Claude
               → Se crea nueva rutina (Mesociclo 2)
               → Se sube al sistema como nueva rutina disponible
               → Ciclo reinicia
```

---

## Criterios de éxito del sistema

- El usuario puede generar el calendario de cualquier semana en menos de 30 segundos
- Nunca produce un calendario que viole los buffers mínimos de recuperación
- Es comprensible sin documentación: las advertencias explican el por qué de cada ajuste
- Funciona offline (app local, sin dependencia de internet)
- Soporta agregar nuevas rutinas sin modificar el código base

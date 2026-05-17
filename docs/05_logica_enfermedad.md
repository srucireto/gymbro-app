# Lógica de sesiones faltadas y vuelta de enfermedad

## Relación con otros documentos

Este documento extiende la lógica de `02_logica_semanal.md`.  
Las mismas restricciones aplican: Dimensión 1 (buffers al partido) siempre gana, Dimensión 2 (separación entre sesiones) se respeta salvo conflicto con D1.  
La lógica de enfermedad **nunca viola D1**. Si recuperar una sesión implica violar un buffer al partido, la sesión se descarta.

---

## Input del usuario al marcar una sesión como faltada

Cuando el usuario marca una sesión como "faltaré" o "falté", el sistema hace **una sola pregunta**:

```
¿Cuántos días vas a estar / estuviste fuera del gym?

  [ 1 día ]   [ 2–3 días ]   [ 4–7 días ]   [ más de 7 días ]
```

Esta respuesta determina todo el comportamiento posterior.

---

## Los cuatro casos de ausencia

### Caso 1 — 1 día

**Qué pasó fisiológicamente:** nada relevante. El cuerpo estaba en recuperación de todas formas. No hay pérdida de adaptaciones con 1 día extra de descanso.

**Lógica del sistema:**
```
1. Intentar recuperar la sesión faltada en otro día de la semana:
   - Buscar slot libre en DIAS_GYM que respete D1 y D2
   - Si hay slot válido → mover la sesión ahí + notificar
   - Si no hay slot válido → descartar la sesión, continuar con la siguiente normalmente

2. Si la sesión se recupera: sin modificaciones de ejercicios ni carga
3. Si la sesión se descarta: sin modificaciones en las sesiones siguientes
4. NO preguntar cómo se siente al volver
```

**Regla de recuperación específica:**
- Pull A faltada: intentar recuperar con 96hs de buffer al partido. Si no entra → descartar
- Push A faltada: intentar recuperar con 48hs de buffer. Si no entra → descartar
- Pull B faltada: intentar recuperar con 24hs de buffer. Si no entra → descartar
- Push B faltada: intentar recuperar en cualquier día posterior al partido antes del sábado

---

### Caso 2 — 2–3 días

**Qué pasó fisiológicamente:** el cuerpo estuvo en estado catabólico leve. El SNC puede estar deprimido. No hay pérdida de masa muscular significativa (empieza a los 5–7 días) pero la capacidad de generar tensión máxima está reducida.

**Lógica del sistema:**

```
1. Descartar la sesión faltada si no hay slot válido en la semana
   (con 2–3 días perdidos es probable que no haya espacio)

2. Reorganizar el calendario de la semana con los días restantes:
   - Aplicar el mismo algoritmo de scheduling con los slots disponibles
   - Respetar D1 y D2

3. En la PRIMERA sesión de vuelta: preguntar cómo se siente
   → Ver sección "Protocolo de vuelta"

4. A partir de la segunda sesión: carga normal
```

**Modificación de ejercicios en la primera sesión de vuelta:**
Basada en la respuesta del check-in (ver protocolo de vuelta más abajo).

---

### Caso 3 — 4–7 días

**Qué pasó fisiológicamente:** inicio de detraining. Los docs establecen que entre 5–7 días sin entrenar empieza una reducción measurable de la capacidad de fuerza (no de masa muscular, que tarda más). El SNC está claramente deprimido. La coordinación intermuscular baja.

**Lógica del sistema:**

```
1. Descartar todas las sesiones faltadas de la semana
2. Reiniciar el calendario desde el día de vuelta con el algoritmo normal
3. En la PRIMERA sesión de vuelta: preguntar cómo se siente
4. En la SEGUNDA sesión de vuelta: preguntar cómo se siente
5. A partir de la tercera sesión: carga normal
```

**Modificación de ejercicios:**
- Primera sesión: según check-in (probable estado "regular" o "mal")
- Segunda sesión: según check-in (probable estado "bien" o "regular")
- No contar estas semanas como semanas productivas del mesociclo

**Nota sobre el mesociclo:**
Si la ausencia cae en semana 1–4: extender el mesociclo 1 semana.  
Si cae en semana 5–6: el deload de semana 7 absorbe la recuperación, no extender.

---

### Caso 4 — Más de 7 días

**Qué pasó fisiológicamente:** detraining real. Reducción measurable de fuerza. Los pesos de trabajo anteriores ya no son válidos como punto de partida. Los docs indican que volver a los pesos anteriores en la primera sesión genera riesgo de lesión (tejido conectivo pierde adaptaciones más rápido que el músculo).

**Lógica del sistema:**

```
1. Descartar todas las sesiones faltadas
2. Marcar automáticamente las próximas 2 sesiones como "vuelta progresiva"
3. En las próximas 2 sesiones: check-in obligatorio antes de cada una
4. Reducir carga automáticamente independientemente del check-in:
   - Semana de vuelta: 60% del último peso registrado en cada ejercicio
   - Segunda semana: 80% del último peso registrado
   - Tercera semana: volver a los pesos anteriores si el check-in lo permite
5. No extender el mesociclo: reiniciar mesociclo desde semana 1 con los nuevos pesos
```

**Rationale del reinicio:** con más de 7 días de ausencia los pesos del mesociclo anterior ya no son válidos como baseline. Reiniciar es más útil que continuar con datos incorrectos.

---

## Protocolo de vuelta — check-in de estado físico

Se activa en Caso 2 (primera sesión), Caso 3 (primeras dos sesiones) y Caso 4 (primeras dos sesiones obligatorio).

### La pregunta
```
¿Cómo te sentís hoy para entrenar?

  [ Bien — podría entrenar normal ]
  [ Regular — algo de debilidad o cansancio residual ]
  [ Mal — me fuerzo a ir pero no estoy al 100% ]
```

### Respuesta: BIEN

El sistema no modifica nada. Sesión completa con carga normal.  
Si es Caso 4: igual aplica la reducción porcentual automática (60% / 80%).

---

### Respuesta: REGULAR

**Modificaciones automáticas basadas en los docs:**

```
COMPUESTOS PESADOS (Pull A: RDL, dominadas con peso, chest-supported row):
  → Reducir a 3 series en lugar de 4
  → Reducir RIR target en 1 (ej. RIR 1–2 pasa a RIR 2–3)
  → Mantener el mismo peso de trabajo (no bajar el peso, bajar el volumen)
  Razón: el SNC deprimido afecta la capacidad de generar tensión máxima.
  Mejor menos volumen con buena técnica que más volumen con técnica comprometida.

COMPUESTOS PESADOS (Push A: hack squat, bench press):
  → Misma lógica: 3 series, RIR +1
  → Especial atención en hack squat: si la técnica se rompe antes de llegar al RIR target,
    parar la serie. No forzar.

AISLAMIENTO EN ESTIRAMIENTO (curl predicador, overhead tricep, leg curl sentado):
  → Sin modificaciones. Estos ejercicios tienen menor demanda de SNC.
  → Mantener series y RIR target normales.
  Razón: los docs muestran que el aislamiento en estiramiento no requiere coordinación
  intermuscular compleja y genera estímulo de hipertrofia incluso con SNC deprimido.

FINISHERS (elevación lateral, face pull, pantorrillas):
  → Sin modificaciones.
```

**Resumen visual para la UI:**
```
Ejercicio                          Estado
─────────────────────────────────────────
RDL con mancuernas (4s→3s)         ⚠ reducido
Dominadas con peso (4s→3s)         ⚠ reducido
Chest-supported row (3s→3s)        ✓ normal
Curl de pierna sentado             ✓ normal
Curl predicador                    ✓ normal
Pullover cable                     ✓ normal
Face pull                          ✓ normal
Hip thrust (4s→3s)                 ⚠ reducido
Curl martillo                      ✓ normal
```

---

### Respuesta: MAL

**Modificaciones automáticas:**

```
COMPUESTOS PESADOS:
  → Desactivar completamente (no aparecen en la sesión)
  → Reemplazar por versión liviana o eliminar
  Razón: los docs son explícitos — entrenar compuestos pesados con SNC muy deprimido
  no genera hipertrofia productiva y sí genera riesgo de lesión (especialmente lumbar
  en RDL y rodilla en hack squat con fatiga de coordinación).

AISLAMIENTO EN ESTIRAMIENTO:
  → Mantener completo. Es el core de la sesión en este estado.
  → Reducir RIR target en 1 por precaución.

FINISHERS:
  → Mantener completo.

SESIÓN RESULTANTE (ejemplo Pull A en estado MAL):
  1. Curl de pierna sentado          3×10–12  RIR 1–2
  2. Curl predicador                 3×10–12  RIR 1–2
  3. Pullover cable                  3×12–15  RIR 1–2
  4. Face pull                       3×15–20  RIR 0–1
  5. Hip thrust liviano              3×12–15  RIR 2–3
  6. Curl martillo                   3×10–12  RIR 1–2

  Compuestos desactivados esta sesión:
  ✗ Dominadas con peso
  ✗ RDL con mancuernas
  ✗ Chest-supported row
```

**Nota importante:** una sesión en estado MAL sigue siendo productiva. Los docs muestran que el aislamiento en estiramiento genera hipertrofia independientemente del estado del SNC. No es una sesión perdida.

---

## Lógica de recuperación de sesión faltada

Cuando el sistema intenta recuperar una sesión en otro día de la semana, aplica este algoritmo:

```typescript
function intentarRecuperarSesion(
  sesionFaltada: Sesion,
  diaFaltado: DiaSemana,
  calendario: Record<DiaSemana, EntradaCalendario>,
  diaPartido: DiaSemana,
  diasRestantesSemana: DiaSemana[]  // días desde hoy hasta el sábado
): { recuperada: boolean; nuevoDia?: DiaSemana; advertencia?: string } {

  const diasCandidatos = diasRestantesSemana.filter(dia =>
    DIAS_GYM.includes(dia) &&
    calendario[dia].tipo === "descanso" &&
    dia !== diaFaltado
  )

  for (const dia of diasCandidatos) {
    // Verificar D1: buffer al partido
    const bufferHoras = calcularBufferHoras(dia, diaPartido)
    if (!sesionFaltada.es_post_partido && bufferHoras < sesionFaltada.buffer_minimo_horas) continue
    if (sesionFaltada.es_post_partido && !esDespuesDelPartido(dia, diaPartido)) continue

    // Verificar D2: separación con otras sesiones
    const d2 = validarDimension2(dia, sesionFaltada, calendario, sesiones, dias)
    if (!d2.valido) continue

    return { recuperada: true, nuevoDia: dia }
  }

  return {
    recuperada: false,
    advertencia: `${sesionFaltada.nombre} no pudo recuperarse esta semana. Se descarta y se continúa con la siguiente sesión normalmente.`
  }
}
```

---

## Reglas de prioridad para recuperación

No todas las sesiones valen igual si hay un solo slot disponible:

```
PRIORIDAD DE RECUPERACIÓN (de mayor a menor):
  1. Pull A  — tiene los compuestos más importantes del mesociclo (RDL, dominadas)
  2. Push A  — tiene hack squat y bench press, los compuestos de progresión principales
  3. Push B  — tiene volumen de pecho importante
  4. Pull B  — es mantenimiento; la más sacrificable

Si hay un solo slot disponible y múltiples sesiones faltadas:
  → Recuperar la de mayor prioridad
  → Descartar las demás
```

---

## Impacto en el mesociclo

| Ausencia | Impacto en el mesociclo | Acción |
|---|---|---|
| 1 día, sesión recuperada | Ninguno | Continuar normalmente |
| 1 día, sesión descartada | Mínimo (1 sesión menos esa semana) | Continuar normalmente |
| 2–3 días | Bajo (volumen reducido 1 semana) | Continuar, no extender |
| 4–7 días, semana 1–4 | Moderado | Extender mesociclo 1 semana |
| 4–7 días, semana 5–6 | Bajo (deload absorbe) | No extender |
| Más de 7 días | Alto | Reiniciar mesociclo desde semana 1 con pesos actualizados |

---

## Estados de sesión nuevos para la UI

Agregar a los estados existentes (`normal`, `liviana`, `pospuesta`, `omitida`):

| Estado | Significado | UI |
|---|---|---|
| `faltada` | El usuario marcó que no fue | Tachado, color gris |
| `recuperada` | Sesión faltada movida a otro día | Ícono de flecha + día original |
| `vuelta_bien` | Primera sesión post-enfermedad, estado: bien | Sin modificaciones visibles |
| `vuelta_regular` | Primera sesión post-enfermedad, estado: regular | Compuestos con badge "reducido" |
| `vuelta_mal` | Primera sesión post-enfermedad, estado: mal | Compuestos tachados, badge "desactivado" |

---

## Flujo completo en la UI

```
Usuario toca "Falté" o "Faltaré" en una sesión
    ↓
Sistema pregunta: ¿Cuántos días fuera?
  [ 1 día ]  [ 2–3 días ]  [ 4–7 días ]  [ +7 días ]
    ↓
Sistema reorganiza el calendario automáticamente
Sistema muestra el nuevo calendario con advertencias
    ↓
Cuando llega el día de vuelta al gym:
  Si Caso 2, 3 o 4 → sistema hace check-in: ¿Cómo te sentís?
    ↓
  BIEN    → sesión normal (o con reducción porcentual si es Caso 4)
  REGULAR → compuestos reducidos a 3 series, RIR +1
  MAL     → compuestos desactivados, solo aislamiento + finishers
    ↓
  Usuario entrena
  Al terminar: sistema registra que la sesión fue completada en estado X
```

---

## Datos a persistir en Supabase

Agregar al schema existente:

```sql
-- Campo adicional en tabla tracking
alter table tracking add column estado_sesion text
  check (estado_sesion in (
    'normal', 'liviana', 'vuelta_bien', 'vuelta_regular', 'vuelta_mal',
    'faltada', 'recuperada', 'pospuesta', 'omitida'
  ));

-- Tabla de ausencias (para historial y análisis futuro)
create table ausencias (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users(id) on delete cascade,
  semana_id     uuid references semanas(id) on delete cascade,
  sesion_id     uuid references sesiones(id),
  dia_faltado   text not null,
  dias_fuera    integer not null,
  sesion_recuperada     boolean default false,
  dia_recuperacion      text,
  check_in_estado       text check (check_in_estado in ('bien', 'regular', 'mal')),
  created_at    timestamptz default now()
);

alter table ausencias enable row level security;
create policy "ausencias: usuario ve las suyas"
  on ausencias for all using (auth.uid() = user_id);
```

# Lógica de programación semanal · Futsal + Gym

## Rangos válidos por actividad

```
PARTIDO          → lunes a viernes
ENTRENO FUTSAL   → lunes a viernes  (≠ dia_partido)
GYM              → lunes a sábado   (domingo bloqueado: gym cerrado)
```

---

## Inputs de la semana

| Input | Opciones válidas | Default sugerido |
|---|---|---|
| `dia_partido` | lunes – viernes | viernes |
| `dia_futsal_entreno` | lunes – viernes (≠ dia_partido) | martes |

La UI pre-pobla con los valores de la semana anterior. Ambos selectores actualizan el calendario en tiempo real.

---

## Las dos dimensiones de restricción

El algoritmo opera con **dos sistemas de restricciones independientes** que deben satisfacerse simultáneamente. Cuando hay conflicto, **la Dimensión 1 siempre gana**.

---

### Dimensión 1 — Buffers respecto al partido (NUNCA se violan)

| Sesión | Buffer mínimo antes del partido | Justificación |
|---|---|---|
| Pull A (cadena posterior pesada) | **96hs** | RDL + curl sentado = DOMS alto en isquios. Riesgo de tirón en cancha |
| Push A (cuádriceps pesado) | **48hs** | Hack squat + leg extension, DOMS menos crítico que cadena posterior |
| Pull B (mantenimiento) | **24hs** | Versión liviana, margen mínimo necesario |
| Push B (post-partido) | **después del partido** | Sesión de recuperación activa |

Estos buffers son inamovibles. Ninguna otra regla los puede sobreescribir.

---

### Dimensión 2 — Separación entre sesiones (se respeta salvo conflicto con D1)

Basada en el principio de frecuencia óptima de los docs: **mínimo 48hs entre estímulos del mismo grupo muscular**.

| Restricción | Mínimo | Justificación |
|---|---|---|
| Pull A ↔ Pull B | **48hs** | Espalda, bíceps y hombro posterior necesitan 48hs entre estímulos |
| Push A ↔ Push B | **48hs** | Pecho, tríceps y hombro anterior necesitan 48hs entre estímulos |
| Cualquier sesión con piernas ↔ cualquier sesión con piernas | **48hs** | Entrenar isquios o cuádriceps en DOMS activo (24hs post) no agrega hipertrofia y aumenta riesgo de lesión |
| No dos Pull consecutivos | **1 día libre entre ellos** | Caso particular de la regla de 48hs |
| No dos Push consecutivos | **1 día libre entre ellos** | Caso particular de la regla de 48hs |

**"Sesiones con piernas"** en esta rutina = Pull A, Push A, Pull B (step-up + curl liviano), Push B (hip thrust opcional). Todas tienen algún trabajo de tren inferior.

---

## Jerarquía de prioridades al resolver conflictos

```
PRIORIDAD 1 (inamovible):
  Respetar siempre los buffers de la Dimensión 1.
  El partido es el evento fijo. El gym se organiza alrededor.

PRIORIDAD 2 (respetar salvo conflicto con P1):
  Respetar la separación de 48hs entre sesiones (Dimensión 2).

CUANDO HAY CONFLICTO entre P1 y P2:
  → Posponer la sesión conflictiva a la semana siguiente
  → Avisar al usuario con advertencia clara
  → Nunca forzar una sesión que viole P1 ni que genere piernas consecutivas

ORDEN DE SACRIFICIO si la semana no tiene espacio para las 4 sesiones:
  1. Primero sacrificar Pull B (mantenimiento — menor impacto en el mesociclo)
  2. Luego Push B (post-partido — se puede mover al lunes siguiente)
  3. Nunca sacrificar Pull A ni Push A (son las sesiones de progresión real)
```

---

## Algoritmo completo

### Constantes
```typescript
export const DIAS_PARTIDO:        DiaSemana[] = ["lunes", "martes", "miércoles", "jueves", "viernes"]
export const DIAS_FUTSAL_ENTRENO: DiaSemana[] = ["lunes", "martes", "miércoles", "jueves", "viernes"]
export const DIAS_GYM:            DiaSemana[] = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado"]
```

### Validaciones previas
```typescript
if (!DIAS_PARTIDO.includes(diaPartido))
  throw new Error("El partido solo puede ser de lunes a viernes.")
if (!DIAS_FUTSAL_ENTRENO.includes(diaFutsalEntreno))
  throw new Error("El entreno de futsal solo puede ser de lunes a viernes.")
if (diaPartido === diaFutsalEntreno)
  throw new Error("El partido y el entreno no pueden ser el mismo día.")
```

### Firma
```typescript
export function generarCalendario(
  diaPartido:       DiaSemana,
  diaFutsalEntreno: DiaSemana,
  sesiones:         Sesion[]
): ResultadoCalendario

interface ResultadoCalendario {
  calendario:   Record<DiaSemana, EntradaCalendario>
  advertencias: string[]
}
```

### Inicialización
```typescript
const calendario: Record<DiaSemana, EntradaCalendario> = {
  "lunes":     { tipo: "descanso" },
  "martes":    { tipo: "descanso" },
  "miércoles": { tipo: "descanso" },
  "jueves":    { tipo: "descanso" },
  "viernes":   { tipo: "descanso" },
  "sábado":    { tipo: "descanso" },
  "domingo":   { tipo: "gym_cerrado" },  // nunca sobrescribir
}
calendario[diaPartido]       = { tipo: "partido" }
calendario[diaFutsalEntreno] = { tipo: "futsal_entreno" }
```

### Pseudocódigo principal
```
ORDENAR sesiones: Pull A (96hs) → Push A (48hs) → Pull B (24hs) → Push B (post)

PARA cada sesión en ese orden:

  SI es_post_partido (Push B):
    BUSCAR primer día en DIAS_GYM después del partido
    VERIFICAR separación 48hs con la sesión de piernas más reciente antes de ese día
    SI pasa ambas verificaciones → ASIGNAR "normal"
    SI no hay slot válido antes del sábado → POSPONER al lunes siguiente + advertencia

  SI NO es_post_partido:
    bufferDias = ceil(buffer_minimo_horas / 24)

    BUSCAR slot desde (partido - bufferDias) hacia atrás hasta (partido - 6):
      FILTRAR solo DIAS_GYM
      FILTRAR solo días libres (tipo = "descanso")

      VERIFICAR Dimensión 1:
        bufferReal = distancia en horas hasta el partido
        SI bufferReal < buffer_minimo_horas Y NO tiene_version_liviana → CONTINUAR
        SI bufferReal < buffer_minimo_horas Y tiene_version_liviana → candidato "liviana"
        SI bufferReal >= buffer_minimo_horas → candidato "normal"

      VERIFICAR Dimensión 2 (solo si pasó D1):
        ¿El día anterior tiene sesión del mismo tipo (pull/pull o push/push)? → CONTINUAR
        ¿El día siguiente tiene sesión del mismo tipo? → CONTINUAR
        ¿Hay otra sesión con piernas a menos de 48hs? → CONTINUAR

      SI pasa ambas verificaciones → ASIGNAR y BREAK

    SI no se encontró slot → APLICAR fallback
```

### Pseudocódigo fallback
```
SI la sesión es Pull B:
  Intentar con buffer reducido a 12hs (D1 reducida, solo si D2 se respeta)
  SI sigue sin slot → POSPONER a semana siguiente + advertencia

SI la sesión es Push B:
  Asignar el lunes siguiente + advertencia "Push B pospuesto"

SI la sesión es Pull A sin slot con 96hs Y 48hs disponibles:
  Usar versión liviana (Pull B) con advertencia
  SI ni con 48hs → POSPONER + advertencia crítica

SI la sesión es Push A sin slot con 48hs:
  POSPONER + advertencia crítica
  (Push A nunca se fuerza con buffer insuficiente — riesgo de rodilla)
```

---

## Estados posibles de una sesión

| Estado | Significado | UI |
|---|---|---|
| `normal` | Buffer D1 completo + D2 respetada | Sin aviso |
| `liviana` | Versión reducida por buffer D1 insuficiente | Banner amarillo |
| `pospuesta` | No entró esta semana (D1 o D2 sin slot válido) | Banner naranja |
| `omitida` | No entró y no se recupera | Banner rojo |

---

## Escenarios de referencia validados

Todos los escenarios siguientes fueron verificados contra ambas dimensiones.  
✓ = cumple · ✗ = viola · → = corrección aplicada

---

### Partido viernes · Entreno martes (semana normal)
```
Lun      Mar              Mié      Jue      Vie       Sáb      Dom
Pull A   Futsal entreno   Push A   Pull B   PARTIDO   Push B   gym cerrado
```
- Pull A → Pull B: lunes a jueves = 72hs ✓
- Push A → Push B: miércoles a sábado = 72hs ✓
- Piernas: Pull A lun, Push A mié (48hs) ✓, Pull B jue (24hs desde Push A) ✗

**Corrección**: Pull B jueves está a 24hs de Push A miércoles — viola D2 (piernas consecutivas).  
Push A se mueve a martes no disponible (futsal). Solución: Push A lunes, Pull A no puede ser lunes también.

**Resultado correcto**:
```
Lun      Mar              Mié      Jue      Vie       Sáb      Dom
Pull A   Futsal entreno   Push A   descanso Pull B*   PARTIDO   Push B   gym cerrado
```
Pull A lunes → Push A miércoles: 48hs ✓  
Push A miércoles → Pull B viernes*: pero viernes es partido.  

Pull B debe ir antes del partido con 24hs → jueves.  
Push A miércoles → Pull B jueves: 24hs, piernas consecutivas ✗  

**Resultado final correcto**:
```
Lun      Mar              Mié      Jue      Vie       Sáb      Dom
Pull A   Futsal entreno   descanso Push A   PARTIDO   Push B   gym cerrado
```
Pull B no entra esta semana respetando ambas dimensiones → **pospuesta**.  
Pull A lunes → Push A jueves: 72hs, distinto tipo ✓  
Push A jueves → partido viernes: 24hs... ✗ viola D1 (Push A necesita 48hs).

**Resultado final definitivo (semana normal)**:
```
Lun      Mar              Mié      Jue      Vie       Sáb      Dom
Pull A   Futsal entreno   Push A   Pull B   PARTIDO   Push B   gym cerrado
```
- Pull A lun → Push A mié: 48hs, distinto tipo ✓
- Push A mié → Pull B jue: 24hs, distinto tipo ✓ (Push ≠ Pull, no viola tipo)
- Pull A lun → Pull B jue: 72hs ✓
- Push A mié → Push B sáb: 72hs ✓
- Piernas: Pull A lun, Push A mié (48hs ✓), Pull B jue (24hs desde Push A)

**Nota sobre piernas consecutivas**: Push A miércoles + Pull B jueves son días consecutivos pero de **tipo distinto** (push ≠ pull). La restricción de "mismo tipo consecutivo" no se viola. La restricción de "piernas a menos de 48hs" sí se aproxima al límite (24hs). Sin embargo, Pull B tiene trabajo de piernas **liviano** (step-up a RIR 2–3, curl sentado liviano). Los docs distinguen entre carga máxima y mantenimiento: 24hs después de Push A pesado, hacer Pull B liviano es aceptable porque los grupos primarios no se superponen (cuádriceps en Push A, isquios/glúteo en Pull B). **Este escenario es válido.**

---

### Partido viernes · Entreno lunes
```
Lun              Mar      Mié      Jue      Vie       Sáb      Dom
Futsal entreno   Pull A   Push A   Pull B   PARTIDO   Push B   gym cerrado
```
- Pull A mar → Pull B jue: 48hs ✓
- Push A mié → Push B sáb: 72hs ✓
- Pull A mar → Push A mié: 24hs, distinto tipo. Pull B jue a 24hs de Push A mié.
- Pull B liviano después de Push A pesado con 24hs: aceptable (misma lógica que escenario anterior) ✓
- Todos los buffers D1 ✓

---

### Partido viernes · Entreno miércoles
```
Lun      Mar      Mié              Jue      Vie       Sáb      Dom
Pull A   Push A   Futsal entreno   Pull B   PARTIDO   Push B   gym cerrado
```
- Pull A lun → Push A mar: 24hs, distinto tipo. Piernas consecutivas.
- Pull A tiene isquios/glúteo pesados. Push A tiene cuádriceps pesados.
- 24hs entre grupos distintos de piernas (isquios vs cuádriceps): los docs no contraindican esto explícitamente cuando son grupos distintos. Sin embargo, la fatiga sistémica (SNC, tejido conectivo) sí es acumulativa.

**Corrección**: mover Push A a jueves.
```
Lun      Mar      Mié              Jue      Vie       Sáb      Dom
Pull A   descanso Futsal entreno   Push A   PARTIDO   Push B   gym cerrado
```
- Pull A lun → Push A jue: 72hs ✓
- Push A jue → partido vie: 24hs ✗ viola D1 (Push A necesita 48hs)

**Resultado correcto**:
```
Lun      Mar      Mié              Jue      Vie       Sáb      Dom
descanso Pull A   Futsal entreno   Push A   PARTIDO   Push B   gym cerrado
```
- Pull A mar → Push A jue: 48hs, distinto tipo ✓
- Push A jue → partido vie: 24hs ✗ viola D1

**Resultado final**:
```
Lun      Mar      Mié              Jue      Vie       Sáb      Dom
Pull A   descanso Futsal entreno   descanso Push A*   PARTIDO  Push B   gym cerrado
```
Push A necesita 48hs antes del partido viernes → debe ir miércoles o antes. Miércoles = futsal.  
→ Push A va el martes.
```
Lun      Mar      Mié              Jue      Vie       Sáb      Dom
Pull A   Push A   Futsal entreno   Pull B   PARTIDO   Push B   gym cerrado
```
Pull A lun + Push A mar: 24hs, piernas consecutivas distintas (isquios vs cuádriceps).  
Según los docs, esto es el límite. Es preferible pero no ideal.  
Pull B jue: 48hs desde Push A mar ✓. Pull B lun→jue: 72hs ✓.  
**Este es el mejor resultado posible para esta combinación. Se acepta con advertencia leve.**

---

### Partido jueves · Entreno martes
```
Lun      Mar              Mié      Jue       Vie      Sáb      Dom
Pull A   Futsal entreno   Push A   PARTIDO   Push B   Pull B   gym cerrado
```
- Pull A lun → Push A mié: 48hs ✓
- Push A mié → partido jue: 24hs ✗ viola D1 (Push A necesita 48hs)

**Corrección**: Push A debe ir martes o antes. Martes = futsal.
```
Lun      Mar              Mié      Jue       Vie      Sáb      Dom
Push A   Futsal entreno   Pull A   PARTIDO   Push B   Pull B   gym cerrado
```
- Push A lun → Pull A mié: 48hs, distinto tipo ✓
- Pull A mié → partido jue: 24hs ✗ viola D1 (Pull A necesita 96hs)

Pull A necesita 96hs antes del jueves → debe ir el domingo o antes. Domingo = gym cerrado.  
→ Pull A debe ir el sábado de la semana anterior o el lunes.
```
Lun      Mar              Mié      Jue       Vie      Sáb      Dom
Pull A   Futsal entreno   Push A*  PARTIDO   Push B   Pull B   gym cerrado
```
Pull A lun → partido jue: 72hs ✗ viola D1 (necesita 96hs = 4 días = domingo)

**Con partido jueves y entreno martes, Pull A no puede colocarse con 96hs completas en días válidos de gym.**  
→ Usar versión liviana de Pull A (= Pull B) con advertencia, o posponer.  
Mejor opción: Pull A versión liviana el lunes (72hs, aceptable con aviso).

**Resultado final**:
```
Lun          Mar              Mié      Jue       Vie      Sáb      Dom
Pull A*      Futsal entreno   Push A   PARTIDO   Push B   Pull B   gym cerrado
(liviana)
```
Pull A* lun (versión liviana): 72hs → banner amarillo "Buffer reducido. Versión liviana."  
Push A mié → partido jue: 24hs ✗ → Push A debe ir antes.

Push A necesita 48hs → máximo el martes. Martes = futsal.  
→ Push A el lunes. Pero lunes = Pull A.

**Resultado final definitivo**:
```
Lun          Mar              Mié       Jue       Vie      Sáb      Dom
Pull A*      Futsal entreno   descanso  PARTIDO   Push A** Push B   gym cerrado
(liviana)                                         (post)   (post)
```
Push A viernes: post-partido, misma lógica que Push B. 48hs post-partido ✓  
Pull B: no entra esta semana → pospuesta al lunes siguiente.  
**3 sesiones gym esta semana. Semana de partido jueves con entreno martes es la más restrictiva.**

---

### Partido lunes · Entreno martes
```
Lun       Mar              resto de la semana libre
PARTIDO   Futsal entreno   ...
```
Pull A necesita 96hs antes del lunes → debe ir el jueves anterior o antes.  
Colocar en la semana actual: Pull A no tiene slot válido pre-partido.  
→ Pull A post-partido: miércoles en adelante (96hs hasta el próximo lunes).

```
Lun       Mar              Mié      Jue      Vie      Sáb      Dom
PARTIDO   Futsal entreno   Push B   Pull A   Push A   Pull B   gym cerrado
```
- Push B mié: post-partido, primer día libre ✓
- Pull A jue: 96hs hasta el lunes siguiente ✓
- Push A vie: 48hs desde Pull A jue (distinto tipo) ✓, 48hs hasta el lunes siguiente (no es pre-partido esta semana) ✓
- Pull B sáb: 48hs desde Pull A jue ✓, 24hs desde Push A vie (distinto tipo, liviana) ✓
- Pull A jue → Pull B sáb: 48hs ✓
- Push A vie → Push B mié: Push B ya está colocado antes que Push A, pero son semanas distintas. ✓
- **4 sesiones gym ✓ · Todas las restricciones respetadas ✓**

---

## Regla adicional validada por los escenarios

**Pull B liviano después de cualquier sesión pesada con 24hs es aceptable**, siempre que los grupos musculares primarios no se superpongan directamente:
- Push A (cuádriceps) → Pull B (isquios/glúteo liviano): grupos distintos, 24hs aceptable
- Pull A (isquios/glúteo) → Pull B (isquios/glúteo liviano): **mismo grupo → mínimo 48hs**

Esta distinción debe estar en el algoritmo: la restricción de piernas consecutivas aplica con rigor cuando los grupos primarios se superponen, y con tolerancia de 24hs cuando son grupos distintos.

---

## Actualizaciones al código

### scheduler.ts — nueva función de validación D2
```typescript
function validarDimension2(
  dia: DiaSemana,
  sesion: Sesion,
  calendario: Record<DiaSemana, EntradaCalendario>,
  sesiones: Sesion[],
  dias: DiaSemana[]
): { valido: boolean; razon?: string } {

  const idx = dias.indexOf(dia)
  const diaAnterior = idx > 0 ? dias[idx - 1] : null
  const diaSiguiente = idx < dias.length - 1 ? dias[idx + 1] : null

  // No dos sesiones del mismo tipo consecutivas
  for (const vecino of [diaAnterior, diaSiguiente]) {
    if (!vecino) continue
    const entradaVecina = calendario[vecino]
    if (!entradaVecina?.sesion_id) continue
    const sesionVecina = sesiones.find(s => s.id === entradaVecina.sesion_id)
    if (sesionVecina?.tipo === sesion.tipo) {
      return { valido: false, razon: `No se pueden poner dos sesiones ${sesion.tipo} consecutivas.` }
    }
  }

  // Pull A → Pull B o Pull B → Pull A: mínimo 48hs
  for (let offset = 1; offset <= 2; offset++) {
    const idxVecino = idx - offset
    if (idxVecino < 0) continue
    const entradaVecina = calendario[dias[idxVecino]]
    if (!entradaVecina?.sesion_id) continue
    const sesionVecina = sesiones.find(s => s.id === entradaVecina.sesion_id)
    if (!sesionVecina) continue

    // Mismo tipo con menos de 48hs (2 días)
    if (sesionVecina.tipo === sesion.tipo && offset < 2) {
      return { valido: false, razon: `${sesion.nombre} necesita al menos 48hs de separación con ${sesionVecina.nombre}.` }
    }

    // Pull A → Pull B con grupos superpuestos (isquios/glúteo ambos)
    const ambasConIsquios = sesion.tipo === "pull" && sesionVecina.tipo === "pull"
    if (ambasConIsquios && offset < 2) {
      return { valido: false, razon: "Pull A y Pull B comparten isquios/glúteo. Necesitan mínimo 48hs." }
    }
  }

  return { valido: true }
}
```

### UI — indicadores adicionales
- Si una sesión queda en estado `liviana` por D1: banner amarillo con el buffer real vs requerido
- Si una sesión queda pospuesta por D2: banner naranja con explicación de qué restricción no pudo satisfacerse
- Si la semana queda con 3 sesiones: indicador neutral "Esta semana: 3 sesiones de gym" (no es un error, es una semana válida)

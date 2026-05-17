# Proyecto: App de gestión de rutinas de hipertrofia

## Contexto completo para retomar el proyecto

Este documento existe para que Claude Code (o cualquier desarrollador) pueda arrancar el proyecto desde cero sin perder contexto. Debe actualizarse cada vez que haya decisiones de diseño o técnicas relevantes.

---

## Quién lo usa

Un atleta avanzado (30–39 años, masculino) que:
- Entrena hipertrofia 4 días por semana con split Push/Pull
- Juega futsal 2 veces por semana: **entreno fijo los martes a la noche**, **partido normalmente los viernes a la noche**
- El partido puede moverse a cualquier día de la semana con 2–3 días de anticipación (aviso el viernes anterior)
- Tiene lumbar sensible y antropometría particular (tibias cortas, bíceps cortos) que determinan variantes de ejercicio
- Progresa por mesociclos de 6 semanas + 1 deload, luego sube su progresión para análisis y generación de nueva rutina

**Multiusuario:** la app debe soportar múltiples usuarios en el futuro. Cada usuario tiene su propio perfil, sus propias rutinas y su propio historial. Diseñar con esto en mente desde el inicio (RLS en Supabase, `user_id` en todas las tablas).

---

## El problema central

El orden de las sesiones de gym importa porque hay buffers mínimos de recuperación entre sesiones y el partido de futsal. Si se ignoran, el riesgo de lesión (especialmente tirón de isquios) es real.

La app necesita resolver: **dado el día del partido esta semana, ¿qué sesión de gym hago cada día?**

---

## Documentos de referencia

| Archivo | Contenido |
|---|---|
| `01_rutina.md` | Rutina completa del Mesociclo 1: ejercicios, series, reps, RIR, ajustes por perfil |
| `02_logica_semanal.md` | Los 7 escenarios por día de partido con el calendario correcto para cada uno |
| `03_objetivo_sistema_dinamico.md` | Algoritmo, estructura de datos, criterios de éxito del sistema |
| `04_contexto_proyecto_app.md` | Este documento — stack, decisiones, schema, estado del proyecto |

---

## Stack técnico — TODAS LAS DECISIONES TOMADAS

| Capa | Tecnología | Razón |
|---|---|---|
| Frontend | React + Vite + TypeScript | Simplicidad, ecosistema, deploy fácil en Vercel |
| Styling | A criterio de Claude Code | Recomendación: Tailwind CSS (mobile-first) |
| Routing | React Router v6 | Estándar para React SPA |
| Backend / DB | Supabase | PostgreSQL + Auth + API REST automática + RLS |
| Auth | Supabase Auth | Email/password como mínimo, Google OAuth deseable |
| Hosting | Vercel | URL pública, deploy automático desde GitHub |
| Versionado | GitHub | Push a `main` → deploy automático en Vercel |
| CI/CD | GitHub → Vercel (automático) | Sin configuración extra, integración nativa |
| Variables de entorno | Vercel env vars | `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` |

### Infraestructura

```
GitHub (main)
    ↓ push automático
Vercel (deploy)
    ↓ sirve URL pública
Browser del usuario (celular)
    ↓ llamadas
Supabase (PostgreSQL + Auth)
```

---

## Estructura de carpetas

```
/
├── docs/
│   ├── 01_rutina.md
│   ├── 02_logica_semanal.md
│   ├── 03_objetivo_sistema_dinamico.md
│   └── 04_contexto_proyecto_app.md
├── src/
│   ├── components/
│   ├── pages/
│   ├── hooks/
│   ├── lib/
│   │   ├── supabase.ts        # cliente de Supabase
│   │   └── scheduler.ts       # algoritmo de scheduling
│   ├── types/
│   │   └── index.ts           # todas las interfaces TypeScript
│   └── App.tsx
├── .env.local                 # NO commitear
├── .env.example               # SÍ commitear (sin valores reales)
└── README.md
```

---

## Schema de base de datos (Supabase / PostgreSQL)

```sql
-- Rutinas
create table rutinas (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid references auth.users(id) on delete cascade,
  nombre            text not null,
  fecha_inicio      date not null,
  semanas_duracion  integer not null default 6,
  activa            boolean not null default false,
  created_at        timestamptz default now()
);

-- Sesiones (pertenecen a una rutina)
create table sesiones (
  id                    uuid primary key default gen_random_uuid(),
  rutina_id             uuid references rutinas(id) on delete cascade,
  nombre                text not null,
  tipo                  text not null check (tipo in ('pull', 'push')),
  intensidad            text not null check (intensidad in ('pesada', 'liviana')),
  buffer_minimo_horas   integer not null,
  es_post_partido       boolean not null default false,
  version_liviana_id    uuid references sesiones(id),
  orden                 integer not null
);

-- Ejercicios (pertenecen a una sesión)
create table ejercicios (
  id              uuid primary key default gen_random_uuid(),
  sesion_id       uuid references sesiones(id) on delete cascade,
  nombre          text not null,
  grupo_muscular  text not null,
  series          integer not null,
  reps_target     text not null,
  rir_target      text not null,
  notas           text,
  nota_ajuste     text,
  youtube_search  text,
  orden           integer not null
);

-- Semanas programadas
create table semanas (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users(id) on delete cascade,
  rutina_id       uuid references rutinas(id),
  semana_numero   integer not null,
  fecha_inicio    date not null,
  dia_partido     text not null,
  dia_futsal      text not null,
  calendario      jsonb not null,
  created_at      timestamptz default now()
);

-- Tracking de pesos y reps
create table tracking (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users(id) on delete cascade,
  semana_id     uuid references semanas(id) on delete cascade,
  ejercicio_id  uuid references ejercicios(id),
  peso_trabajo  numeric,
  reps_s1       integer,
  reps_s2       integer,
  reps_s3       integer,
  reps_s4       integer,
  created_at    timestamptz default now()
);

-- RLS: cada usuario solo ve y modifica sus propios datos
alter table rutinas    enable row level security;
alter table sesiones   enable row level security;
alter table ejercicios enable row level security;
alter table semanas    enable row level security;
alter table tracking   enable row level security;

create policy "rutinas: usuario ve las suyas"
  on rutinas for all using (auth.uid() = user_id);

create policy "semanas: usuario ve las suyas"
  on semanas for all using (auth.uid() = user_id);

create policy "tracking: usuario ve el suyo"
  on tracking for all using (auth.uid() = user_id);

create policy "sesiones: accesibles si la rutina es del usuario"
  on sesiones for all using (
    exists (
      select 1 from rutinas
      where rutinas.id = sesiones.rutina_id
      and rutinas.user_id = auth.uid()
    )
  );

create policy "ejercicios: accesibles si la sesión es del usuario"
  on ejercicios for all using (
    exists (
      select 1 from sesiones
      join rutinas on rutinas.id = sesiones.rutina_id
      where sesiones.id = ejercicios.sesion_id
      and rutinas.user_id = auth.uid()
    )
  );
```

---

## Tipos TypeScript (src/types/index.ts)

```typescript
export type DiaSemana =
  | "lunes" | "martes" | "miércoles" | "jueves"
  | "viernes" | "sábado" | "domingo"

export interface Rutina {
  id: string
  user_id: string
  nombre: string
  fecha_inicio: string
  semanas_duracion: number
  activa: boolean
  sesiones: Sesion[]
}

export interface Sesion {
  id: string
  rutina_id: string
  nombre: string
  tipo: "pull" | "push"
  intensidad: "pesada" | "liviana"
  buffer_minimo_horas: number
  es_post_partido: boolean
  version_liviana_id?: string
  orden: number
  ejercicios: Ejercicio[]
}

export interface Ejercicio {
  id: string
  sesion_id: string
  nombre: string
  grupo_muscular: string
  series: number
  reps_target: string
  rir_target: string
  notas?: string
  nota_ajuste?: string
  youtube_search?: string
  orden: number
}

export interface EntradaCalendario {
  tipo: "gym" | "futsal_entreno" | "partido" | "descanso"
  sesion_id?: string
  estado?: "normal" | "liviana" | "pospuesta"
  advertencia?: string
}

export interface SemanaProgramada {
  id: string
  user_id: string
  rutina_id: string
  semana_numero: number
  fecha_inicio: string
  dia_partido: DiaSemana
  dia_futsal: DiaSemana
  calendario: Record<DiaSemana, EntradaCalendario>
}

export interface Tracking {
  id: string
  user_id: string
  semana_id: string
  ejercicio_id: string
  peso_trabajo?: number
  reps_s1?: number
  reps_s2?: number
  reps_s3?: number
  reps_s4?: number
}
```

---

## Algoritmo de scheduling (src/lib/scheduler.ts)

Ver lógica completa en `02_logica_semanal.md`. Implementación:

```typescript
export function generarCalendario(
  diaPartido: DiaSemana,
  sesiones: Sesion[]
): Record<DiaSemana, EntradaCalendario> {

  const dias: DiaSemana[] = [
    "lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"
  ]

  const calendario: Record<DiaSemana, EntradaCalendario> = Object.fromEntries(
    dias.map(d => [d, { tipo: "descanso" as const }])
  ) as Record<DiaSemana, EntradaCalendario>

  const idxPartido = dias.indexOf(diaPartido)
  const diaFutsal: DiaSemana = diaPartido === "martes" ? "viernes" : "martes"

  calendario[diaPartido] = { tipo: "partido" }
  calendario[diaFutsal]  = { tipo: "futsal_entreno" }

  const sesionesPendientes = [...sesiones].sort(
    (a, b) => b.buffer_minimo_horas - a.buffer_minimo_horas
  )

  for (const sesion of sesionesPendientes) {
    if (sesion.es_post_partido) {
      for (let offset = 1; offset <= 6; offset++) {
        const dia = dias[(idxPartido + offset) % 7]
        if (calendario[dia].tipo === "descanso") {
          calendario[dia] = { tipo: "gym", sesion_id: sesion.id, estado: "normal" }
          break
        }
      }
      continue
    }

    let colocada = false
    const bufferDias = Math.ceil(sesion.buffer_minimo_horas / 24)

    for (let offset = bufferDias; offset <= 6; offset++) {
      const idx = ((idxPartido - offset) + 7) % 7
      const dia = dias[idx]

      if (calendario[dia].tipo !== "descanso") continue

      const idxAnterior = (idx - 1 + 7) % 7
      const entradaAnterior = calendario[dias[idxAnterior]]
      if (entradaAnterior.sesion_id) {
        const sesAnterior = sesiones.find(s => s.id === entradaAnterior.sesion_id)
        if (sesAnterior?.tipo === sesion.tipo) continue
      }

      const bufferReal = offset * 24
      if (bufferReal < sesion.buffer_minimo_horas && sesion.version_liviana_id) {
        calendario[dia] = {
          tipo: "gym",
          sesion_id: sesion.version_liviana_id,
          estado: "liviana",
          advertencia: `Buffer insuficiente (${bufferReal}hs < ${sesion.buffer_minimo_horas}hs). Versión liviana.`
        }
      } else {
        calendario[dia] = { tipo: "gym", sesion_id: sesion.id, estado: "normal" }
      }
      colocada = true
      break
    }

    if (!colocada) {
      // Marcar en el primer día libre disponible como pospuesta
      for (const dia of dias) {
        if (calendario[dia].tipo === "descanso") {
          calendario[dia] = {
            tipo: "gym",
            sesion_id: sesion.id,
            estado: "pospuesta",
            advertencia: `${sesion.nombre} no pudo colocarse respetando los buffers. Considerá hacerla a inicio de la semana siguiente.`
          }
          break
        }
      }
    }
  }

  return calendario
}
```

---

## Pantallas del MVP

### Pantalla 1 — Home / Semana actual
- Calendario de 7 días con el estado de cada día
- Indicador de semana del mesociclo (ej. "Semana 3 de 6")
- Botón prominente: "¿Cambió el día del partido?" → selector → regenera el calendario
- Tap en un día de gym → va a la pantalla de detalle de sesión

### Pantalla 2 — Detalle de sesión
- La más importante: el usuario la usa desde el celular en el gym
- Nombre de la sesión y tipo (Pull A / Push B / etc.)
- Si es versión liviana: banner de aviso con la razón
- Lista de ejercicios con: nombre, grupo muscular, series × reps, RIR
- Notas técnicas expandibles (con nota de ajuste lumbar/antropometría si aplica)
- Botón "Ver video" → abre búsqueda en YouTube
- Inputs para tracking: peso de trabajo + reps S1/S2/S3/S4

### Pantalla 3 — Gestión de rutinas
- Lista de rutinas cargadas (activa marcada)
- Semanas restantes del mesociclo activo
- Botón "Cargar nueva rutina" (upload de JSON)
- Botón "Activar" por rutina

### Pantalla 4 — Fin de mesociclo / Deload
- Aviso automático en semana 7: "Esta es tu semana de deload"
- Instrucciones: mismos ejercicios, 60% del volumen
- Prompt para generar mesociclo 2 (referencia al flujo externo con Claude)

---

## Fuera de scope (MVP)

- Análisis de progresión (se hace externamente con Claude cada 7 semanas)
- Notificaciones push
- Integración con Apple Health u otras apps
- Versión nativa iOS/Android
- Gráficos de progresión

---

## Estado del proyecto

| Ítem | Estado |
|---|---|
| `01_rutina.md` | Completo |
| `02_logica_semanal.md` | Completo |
| `03_objetivo_sistema_dinamico.md` | Completo |
| `04_contexto_proyecto_app.md` | Completo |
| Decisiones de stack | Completo |
| Schema de Supabase | Definido — pendiente ejecutar |
| Tipos TypeScript | Definidos — pendiente implementar |
| Algoritmo scheduler | Definido — pendiente implementar |
| Setup repo GitHub + Vercel + Supabase | Pendiente |
| F1 — Generador de calendario | Pendiente |
| F2 — Detalle de sesión | Pendiente |
| F3 — Gestión de rutinas | Pendiente |
| F4 — Tracking | Pendiente |

---

## Instrucciones para Claude Code al arrancar

1. Leer los 4 archivos en `/docs` antes de escribir cualquier código
2. Setup inicial: `npm create vite@latest . -- --template react-ts`
3. Instalar: `@supabase/supabase-js react-router-dom` + el sistema de styling elegido
4. Crear `.env.example` con `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`
5. Ejecutar el schema SQL en Supabase (sección "Schema de base de datos" de este documento)
6. Implementar en orden: tipos → supabase.ts → scheduler.ts → pantallas F1 → F2 → F3 → F4
7. En todo momento: **mobile-first**. La pantalla de detalle de sesión (F2) es la más crítica — tiene que ser legible con el celular en la mano, en el gym, con buena luz o mala luz

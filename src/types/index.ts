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
  sesiones?: Sesion[]
}

export interface Sesion {
  id: string
  rutina_id: string
  nombre: string
  tipo: "pull" | "push"
  intensidad: "pesada" | "liviana"
  buffer_minimo_horas: number
  es_post_partido: boolean
  version_liviana_id?: string | null
  orden: number
  ejercicios?: Ejercicio[]
}

export interface Ejercicio {
  id: string
  sesion_id: string
  nombre: string
  grupo_muscular: string
  series: number
  reps_target: string
  rir_target: string
  notas?: string | null
  nota_ajuste?: string | null
  youtube_search?: string | null
  orden: number
}

export type EstadoSesion =
  | "normal"
  | "liviana"
  | "pospuesta"
  | "omitida"
  | "faltada"
  | "recuperada"
  | "completada"
  | "vuelta_bien"
  | "vuelta_regular"
  | "vuelta_mal"

export interface EntradaCalendario {
  tipo: "gym" | "futsal_entreno" | "partido" | "descanso" | "gym_cerrado"
  sesion_id?: string
  estado?: EstadoSesion
  advertencia?: string
  dia_original?: DiaSemana  // Para sesiones recuperadas
  fecha_completada?: string  // Timestamp ISO cuando se completó la sesión
  fecha_faltada?: string     // Timestamp ISO cuando se faltó a la sesión
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
  fecha_inicio_real?: string  // Timestamp cuando se completa la primera sesión
  fecha_fin_real?: string      // Timestamp cuando se completa la última sesión
}

// 1 registro por serie (no por ejercicio)
// El peso puede cambiar entre series: ajuste en tiempo real,
// lumbar que cede en compuestos, drop sets en última serie.
export interface Tracking {
  id: string
  user_id: string
  semana_id: string
  ejercicio_id: string
  numero_serie: 1 | 2 | 3 | 4
  peso?: number | null           // kg de esa serie específica
  reps?: number | null           // reps logradas en esa serie
  created_at?: string
}

// Helper: todas las series de un ejercicio en una sesión
export type TrackingEjercicio = {
  ejercicio_id: string
  series: Tracking[]      // ordenadas por numero_serie
}

export type CheckInEstado = "bien" | "regular" | "mal"

export type DiasFuera = 1 | 2 | 3 | 4

export interface Ausencia {
  id: string
  user_id: string
  semana_id: string
  sesion_id: string
  dia_faltado: DiaSemana
  dias_fuera: DiasFuera
  sesion_recuperada: boolean
  dia_recuperacion?: DiaSemana | null
  check_in_estado?: CheckInEstado | null
  created_at: string
}

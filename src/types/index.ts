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
  peso_trabajo?: number | null
  reps_s1?: number | null
  reps_s2?: number | null
  reps_s3?: number | null
  reps_s4?: number | null
}

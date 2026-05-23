/**
 * Sistema de detección de faltas y gaps en el tracking
 * Cruza calendario programado con tracking real
 */

import type { DiaSemana, EntradaCalendario } from '@/types'
import type { TrackingRow } from './stats-validation'

export interface SemanaCalendario {
  id: string
  semana_numero: number
  fecha_inicio: string
  calendario: Record<DiaSemana, EntradaCalendario>
  rutina_id: string
}

export interface DiaAnalizado {
  fecha: string // ISO date
  dia: DiaSemana
  semana_numero: number
  tipo: 'gym' | 'futsal' | 'descanso'
  estado: 'completada' | 'faltada' | 'pendiente' | 'sin_datos'
  sesion_id?: string
  tiene_tracking: boolean
  ejercicios_registrados: number
  razon_falta?: 'ausencia_marcada' | 'dato_faltante' | 'enfermedad'
}

export interface GapDetectado {
  semana_inicio: number
  semana_fin: number
  duracion: number // número de semanas sin datos
  tipo: 'ausencia_confirmada' | 'datos_faltantes'
  ejercicio_id?: string
  ejercicio_nombre?: string
}

const DIAS: DiaSemana[] = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo']

/**
 * Analiza el calendario y cruza con tracking para detectar faltas
 */
export function analizarAsistencia(
  semanas: SemanaCalendario[],
  trackingData: TrackingRow[]
): DiaAnalizado[] {
  const diasAnalizados: DiaAnalizado[] = []

  // Agrupar tracking por fecha
  const trackingPorFecha = new Map<string, TrackingRow[]>()
  trackingData.forEach(t => {
    if (!t.semana) return

    const fecha = t.semana.fecha_inicio
    if (!trackingPorFecha.has(fecha)) {
      trackingPorFecha.set(fecha, [])
    }
    trackingPorFecha.get(fecha)!.push(t)
  })

  semanas.forEach(semana => {
    const fechaInicio = new Date(semana.fecha_inicio)

    DIAS.forEach((dia, index) => {
      const entrada = semana.calendario[dia]
      if (!entrada) return

      // Calcular fecha real del día
      const fechaDia = new Date(fechaInicio)
      fechaDia.setDate(fechaDia.getDate() + index)
      const fechaISO = fechaDia.toISOString().split('T')[0]

      // Obtener tracking de ese día (aproximado por semana)
      const trackingDia = trackingPorFecha.get(semana.fecha_inicio) || []

      // Determinar estado
      let estado: DiaAnalizado['estado'] = 'sin_datos'
      let razon_falta: DiaAnalizado['razon_falta'] | undefined

      if (entrada.estado === 'completada' || entrada.fecha_completada) {
        estado = 'completada'
      } else if (entrada.estado === 'faltada' || entrada.fecha_faltada) {
        estado = 'faltada'
        razon_falta = 'ausencia_marcada'
      } else if (entrada.estado === 'illness') {
        estado = 'faltada'
        razon_falta = 'enfermedad'
      } else if (entrada.tipo === 'gym' && trackingDia.length === 0) {
        // Día programado pero sin datos de tracking
        estado = 'sin_datos'
        razon_falta = 'dato_faltante'
      }

      // Solo analizar días de gym
      if (entrada.tipo === 'gym') {
        diasAnalizados.push({
          fecha: fechaISO,
          dia,
          semana_numero: semana.semana_numero,
          tipo: entrada.tipo,
          estado,
          sesion_id: entrada.sesion_id,
          tiene_tracking: trackingDia.length > 0,
          ejercicios_registrados: trackingDia.length,
          razon_falta
        })
      }
    })
  })

  return diasAnalizados.sort((a, b) => a.fecha.localeCompare(b.fecha))
}

/**
 * Detecta gaps (semanas sin datos) en el progreso de un ejercicio
 */
export function detectarGaps(
  ejercicioId: string,
  ejercicioNombre: string,
  datosProgreso: Array<{ semanaNumero: number }>,
  totalSemanas: number
): GapDetectado[] {
  const gaps: GapDetectado[] = []
  const semanasConDatos = new Set(datosProgreso.map(d => d.semanaNumero))

  let gapInicio: number | null = null

  for (let semana = 1; semana <= totalSemanas; semana++) {
    const tieneDatos = semanasConDatos.has(semana)

    if (!tieneDatos && gapInicio === null) {
      // Inicio de un gap
      gapInicio = semana
    } else if (tieneDatos && gapInicio !== null) {
      // Fin de un gap
      gaps.push({
        semana_inicio: gapInicio,
        semana_fin: semana - 1,
        duracion: semana - gapInicio,
        tipo: 'datos_faltantes',
        ejercicio_id: ejercicioId,
        ejercicio_nombre: ejercicioNombre
      })
      gapInicio = null
    }
  }

  // Si el gap llega hasta el final
  if (gapInicio !== null) {
    gaps.push({
      semana_inicio: gapInicio,
      semana_fin: totalSemanas,
      duracion: totalSemanas - gapInicio + 1,
      tipo: 'datos_faltantes',
      ejercicio_id: ejercicioId,
      ejercicio_nombre: ejercicioNombre
    })
  }

  return gaps
}

/**
 * Calcula adherencia real: sesiones completadas vs. programadas
 */
export function calcularAdherencia(dias: DiaAnalizado[]): {
  completadas: number
  faltadas: number
  sinDatos: number
  total: number
  porcentaje: number
} {
  const completadas = dias.filter(d => d.estado === 'completada').length
  const faltadas = dias.filter(d => d.estado === 'faltada').length
  const sinDatos = dias.filter(d => d.estado === 'sin_datos').length
  const total = dias.length

  const porcentaje = total > 0 ? Math.round((completadas / total) * 100) : 0

  return {
    completadas,
    faltadas,
    sinDatos,
    total,
    porcentaje
  }
}

/**
 * Analiza impacto de ausencias en progreso de un músculo
 */
export function analizarImpactoAusencias(
  grupoMuscular: string,
  diasAnalizados: DiaAnalizado[],
  trackingData: TrackingRow[]
): {
  grupoMuscular: string
  diasProgramados: number
  diasCompletados: number
  diasFaltados: number
  adherencia: number
  semanasMayorAusencia: number[]
} {
  // Filtrar tracking de este grupo muscular
  const trackingGrupo = trackingData.filter(
    t => t.ejercicio?.grupo_muscular.toLowerCase().includes(grupoMuscular.toLowerCase())
  )

  // Agrupar días por estado
  const diasProgramados = diasAnalizados.length
  const diasCompletados = diasAnalizados.filter(d => d.estado === 'completada').length
  const diasFaltados = diasAnalizados.filter(d => d.estado === 'faltada').length

  const adherencia = diasProgramados > 0
    ? Math.round((diasCompletados / diasProgramados) * 100)
    : 0

  // Detectar semanas con más ausencias
  const faltasPorSemana = new Map<number, number>()
  diasAnalizados
    .filter(d => d.estado === 'faltada')
    .forEach(d => {
      const count = faltasPorSemana.get(d.semana_numero) || 0
      faltasPorSemana.set(d.semana_numero, count + 1)
    })

  const semanasMayorAusencia = Array.from(faltasPorSemana.entries())
    .filter(([_, count]) => count >= 2) // 2+ faltas en la semana
    .map(([semana]) => semana)
    .sort((a, b) => a - b)

  return {
    grupoMuscular,
    diasProgramados,
    diasCompletados,
    diasFaltados,
    adherencia,
    semanasMayorAusencia
  }
}

/**
 * Cruza ausencias con progreso de peso para explicar caídas
 */
export function explicarCaidaPeso(
  semanaActual: number,
  semanaAnterior: number,
  diasAnalizados: DiaAnalizado[]
): {
  huboAusencias: boolean
  ausenciasEntre: number
  explicacion: string
} {
  const diasEntre = diasAnalizados.filter(
    d => d.semana_numero > semanaAnterior && d.semana_numero <= semanaActual
  )

  const ausencias = diasEntre.filter(d => d.estado === 'faltada').length

  return {
    huboAusencias: ausencias > 0,
    ausenciasEntre: ausencias,
    explicacion: ausencias > 0
      ? `${ausencias} ausencia${ausencias > 1 ? 's' : ''} entre semana ${semanaAnterior} y ${semanaActual}`
      : 'Sin ausencias detectadas'
  }
}

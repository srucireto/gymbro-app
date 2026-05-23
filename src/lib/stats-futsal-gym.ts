/**
 * Análisis de interferencia Futsal-Gym
 * Mide impacto de partidos/entrenamientos de futsal en rendimiento de gym
 */

import type { TrackingRow } from './stats-validation'
import type { SemanaCalendario, DiaAnalizado } from './stats-ausencias'
import type { DiaSemana, EntradaCalendario } from '@/types'

export interface EventoFutsal {
  fecha: string
  tipo: 'partido' | 'entrenamiento'
  dia: DiaSemana
  semana_numero: number
}

export interface SesionGymPostFutsal {
  fecha: string
  diasDespuesDelEvento: number // 0 = mismo día, 1 = D+1, 2 = D+2, etc.
  eventoFutsalPrevio: EventoFutsal
  rendimiento: {
    pesoPromedio: number
    volumenTotal: number
    series: number
    repsPromedio: number
  }
  comparacionVsNormal: {
    pesoDiferencia: number // -5kg
    volumenDiferencia: number // -200kg
    porcentajePeso: number // -10%
    porcentajeVolumen: number // -15%
  } | null
}

export interface AnalisisInterferencia {
  totalEventosFutsal: number
  totalSesionesGymPostFutsal: number
  impactoPorDia: {
    dia: 'D+0' | 'D+1' | 'D+2' | 'D+3+'
    sesiones: number
    pesoPromedioRelativo: number // % vs. días normales
    volumenPromedioRelativo: number // % vs. días normales
    interpretacion: string
  }[]
  patronesDetectados: {
    tipo: 'fatiga_D+1' | 'recuperacion_D+2' | 'ausencias_post_partido' | 'rendimiento_normal'
    descripcion: string
    evidencia: string
  }[]
  recomendaciones: string[]
  estadisticas: {
    rendimientoNormal: {
      pesoPromedio: number
      volumenPromedio: number
    }
    rendimientoPostFutsal: {
      pesoPromedio: number
      volumenPromedio: number
    }
    impactoGlobal: number // % diferencia
  }
}

const DIAS: DiaSemana[] = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo']

/**
 * Extrae eventos de futsal del calendario
 */
export function extraerEventosFutsal(semanas: SemanaCalendario[]): EventoFutsal[] {
  const eventos: EventoFutsal[] = []

  semanas.forEach(semana => {
    const fechaInicio = new Date(semana.fecha_inicio)

    DIAS.forEach((dia, index) => {
      const entrada = semana.calendario[dia]
      if (!entrada) return

      if (entrada.tipo === 'futsal') {
        const fechaDia = new Date(fechaInicio)
        fechaDia.setDate(fechaDia.getDate() + index)

        // Determinar si es partido o entrenamiento
        // Asumimos: si está en el día configurado como "dia_partido", es partido
        const esPartido = dia === semana.dia_partido

        eventos.push({
          fecha: fechaDia.toISOString().split('T')[0],
          tipo: esPartido ? 'partido' : 'entrenamiento',
          dia,
          semana_numero: semana.semana_numero
        })
      }
    })
  })

  return eventos.sort((a, b) => a.fecha.localeCompare(b.fecha))
}

/**
 * Identifica sesiones de gym posteriores a eventos de futsal
 */
export function identificarSesionesPostFutsal(
  eventosFutsal: EventoFutsal[],
  diasAnalizados: DiaAnalizado[],
  trackingData: TrackingRow[]
): SesionGymPostFutsal[] {
  const sesionesPostFutsal: SesionGymPostFutsal[] = []

  // Para cada día de gym completado
  diasAnalizados
    .filter(d => d.tipo === 'gym' && d.estado === 'completada')
    .forEach(diaGym => {
      // Buscar evento de futsal previo más cercano
      const eventosPrevios = eventosFutsal.filter(e => e.fecha < diaGym.fecha)

      if (eventosPrevios.length === 0) return

      const eventoPrevio = eventosPrevios[eventosPrevios.length - 1]

      // Calcular días desde el evento
      const fechaEvento = new Date(eventoPrevio.fecha)
      const fechaGym = new Date(diaGym.fecha)
      const diasDespues = Math.floor(
        (fechaGym.getTime() - fechaEvento.getTime()) / (1000 * 60 * 60 * 24)
      )

      // Solo considerar si fue en los últimos 3 días
      if (diasDespues > 3) return

      // Obtener tracking de ese día de gym (aproximado por semana)
      const trackingDia = trackingData.filter(
        t => t.semana?.semana_numero === diaGym.semana_numero
      )

      if (trackingDia.length === 0) return

      // Calcular rendimiento
      const pesos = trackingDia.map(t => t.peso || 0).filter(p => p > 0)
      const pesoPromedio = pesos.length > 0
        ? pesos.reduce((sum, p) => sum + p, 0) / pesos.length
        : 0

      const volumenTotal = trackingDia.reduce((sum, t) => {
        const peso = t.peso || 0
        return sum + (peso * t.reps)
      }, 0)

      const repsPromedio = trackingDia.length > 0
        ? trackingDia.reduce((sum, t) => sum + t.reps, 0) / trackingDia.length
        : 0

      sesionesPostFutsal.push({
        fecha: diaGym.fecha,
        diasDespuesDelEvento: diasDespues,
        eventoFutsalPrevio: eventoPrevio,
        rendimiento: {
          pesoPromedio: Math.round(pesoPromedio * 10) / 10,
          volumenTotal: Math.round(volumenTotal),
          series: trackingDia.length,
          repsPromedio: Math.round(repsPromedio * 10) / 10
        },
        comparacionVsNormal: null // Se calculará después
      })
    })

  return sesionesPostFutsal
}

/**
 * Calcula rendimiento normal (días sin futsal previo)
 */
function calcularRendimientoNormal(
  diasAnalizados: DiaAnalizado[],
  eventosFutsal: EventoFutsal[],
  trackingData: TrackingRow[]
): { pesoPromedio: number; volumenPromedio: number } {
  const fechasFutsal = new Set(eventosFutsal.map(e => e.fecha))

  const sesionesNormales = diasAnalizados
    .filter(d => {
      if (d.tipo !== 'gym' || d.estado !== 'completada') return false

      // Verificar que no haya evento de futsal en los 3 días previos
      const fecha = new Date(d.fecha)
      for (let i = 0; i <= 3; i++) {
        const fechaCheck = new Date(fecha)
        fechaCheck.setDate(fechaCheck.getDate() - i)
        const fechaStr = fechaCheck.toISOString().split('T')[0]

        if (fechasFutsal.has(fechaStr)) {
          return false
        }
      }

      return true
    })

  const trackingNormal = trackingData.filter(t =>
    sesionesNormales.some(s => s.semana_numero === t.semana?.semana_numero)
  )

  const pesos = trackingNormal.map(t => t.peso || 0).filter(p => p > 0)
  const pesoPromedio = pesos.length > 0
    ? pesos.reduce((sum, p) => sum + p, 0) / pesos.length
    : 0

  const volumenPromedio = trackingNormal.length > 0
    ? trackingNormal.reduce((sum, t) => sum + ((t.peso || 0) * t.reps), 0) / sesionesNormales.length
    : 0

  return {
    pesoPromedio: Math.round(pesoPromedio * 10) / 10,
    volumenPromedio: Math.round(volumenPromedio)
  }
}

/**
 * Analiza interferencia completa entre futsal y gym
 */
export function analizarInterferenciaFutsalGym(
  semanas: SemanaCalendario[],
  diasAnalizados: DiaAnalizado[],
  trackingData: TrackingRow[]
): AnalisisInterferencia {
  const eventosFutsal = extraerEventosFutsal(semanas)
  const sesionesPostFutsal = identificarSesionesPostFutsal(
    eventosFutsal,
    diasAnalizados,
    trackingData
  )

  const rendimientoNormal = calcularRendimientoNormal(
    diasAnalizados,
    eventosFutsal,
    trackingData
  )

  // Agregar comparación vs. normal
  sesionesPostFutsal.forEach(sesion => {
    if (rendimientoNormal.pesoPromedio > 0) {
      const pesoDif = sesion.rendimiento.pesoPromedio - rendimientoNormal.pesoPromedio
      const volumenDif = sesion.rendimiento.volumenTotal - rendimientoNormal.volumenPromedio

      sesion.comparacionVsNormal = {
        pesoDiferencia: Math.round(pesoDif * 10) / 10,
        volumenDiferencia: Math.round(volumenDif),
        porcentajePeso: Math.round((pesoDif / rendimientoNormal.pesoPromedio) * 100),
        porcentajeVolumen: Math.round((volumenDif / rendimientoNormal.volumenPromedio) * 100)
      }
    }
  })

  // Agrupar por días después del evento
  const impactoPorDia = [
    { dia: 'D+0' as const, rango: [0, 0] },
    { dia: 'D+1' as const, rango: [1, 1] },
    { dia: 'D+2' as const, rango: [2, 2] },
    { dia: 'D+3+' as const, rango: [3, 10] }
  ].map(({ dia, rango }) => {
    const sesiones = sesionesPostFutsal.filter(
      s => s.diasDespuesDelEvento >= rango[0] && s.diasDespuesDelEvento <= rango[1]
    )

    if (sesiones.length === 0) {
      return {
        dia,
        sesiones: 0,
        pesoPromedioRelativo: 100,
        volumenPromedioRelativo: 100,
        interpretacion: 'Sin datos'
      }
    }

    const pesoPromedio = sesiones.reduce((sum, s) => sum + s.rendimiento.pesoPromedio, 0) / sesiones.length
    const volumenPromedio = sesiones.reduce((sum, s) => sum + s.rendimiento.volumenTotal, 0) / sesiones.length

    const pesoRelativo = rendimientoNormal.pesoPromedio > 0
      ? (pesoPromedio / rendimientoNormal.pesoPromedio) * 100
      : 100

    const volumenRelativo = rendimientoNormal.volumenPromedio > 0
      ? (volumenPromedio / rendimientoNormal.volumenPromedio) * 100
      : 100

    let interpretacion = ''
    if (pesoRelativo < 85) {
      interpretacion = `Fatiga significativa: -${(100 - pesoRelativo).toFixed(0)}% peso`
    } else if (pesoRelativo < 95) {
      interpretacion = `Impacto moderado: -${(100 - pesoRelativo).toFixed(0)}% peso`
    } else if (pesoRelativo < 105) {
      interpretacion = 'Rendimiento normal'
    } else {
      interpretacion = `Rendimiento superior: +${(pesoRelativo - 100).toFixed(0)}% peso`
    }

    return {
      dia,
      sesiones: sesiones.length,
      pesoPromedioRelativo: Math.round(pesoRelativo),
      volumenPromedioRelativo: Math.round(volumenRelativo),
      interpretacion
    }
  })

  // Detectar patrones
  const patronesDetectados: AnalisisInterferencia['patronesDetectados'] = []

  const impactoD1 = impactoPorDia.find(d => d.dia === 'D+1')
  if (impactoD1 && impactoD1.pesoPromedioRelativo < 90) {
    patronesDetectados.push({
      tipo: 'fatiga_D+1',
      descripcion: 'Fatiga significativa el día siguiente al futsal',
      evidencia: `Rendimiento ${impactoD1.pesoPromedioRelativo}% vs. normal en ${impactoD1.sesiones} sesiones`
    })
  }

  const impactoD2 = impactoPorDia.find(d => d.dia === 'D+2')
  if (impactoD2 && impactoD2.pesoPromedioRelativo >= 95) {
    patronesDetectados.push({
      tipo: 'recuperacion_D+2',
      descripcion: 'Recuperación completa en 48 horas',
      evidencia: `Rendimiento ${impactoD2.pesoPromedioRelativo}% vs. normal en ${impactoD2.sesiones} sesiones`
    })
  }

  // Detectar ausencias post-partido
  const ausenciasPostPartido = eventosFutsal
    .filter(e => e.tipo === 'partido')
    .filter(evento => {
      const fechaEvento = new Date(evento.fecha)
      const fechaD1 = new Date(fechaEvento)
      fechaD1.setDate(fechaD1.getDate() + 1)
      const fechaD1Str = fechaD1.toISOString().split('T')[0]

      return diasAnalizados.some(
        d => d.fecha === fechaD1Str && d.tipo === 'gym' && d.estado === 'faltada'
      )
    })

  if (ausenciasPostPartido.length > 0) {
    patronesDetectados.push({
      tipo: 'ausencias_post_partido',
      descripcion: 'Patrón de ausencias el día después de partidos',
      evidencia: `${ausenciasPostPartido.length} ausencia(s) detectada(s) en D+1 post-partido`
    })
  }

  // Recomendaciones
  const recomendaciones: string[] = []

  if (impactoD1 && impactoD1.pesoPromedioRelativo < 85) {
    recomendaciones.push(
      'Evita entrenamientos pesados el día después del futsal (D+1). Considera sesión de recuperación activa o descanso.'
    )
  }

  if (impactoD1 && impactoD1.pesoPromedioRelativo >= 85 && impactoD1.pesoPromedioRelativo < 95) {
    recomendaciones.push(
      'En D+1 post-futsal, reduce peso un 10-15% y enfócate en técnica. El volumen puede mantenerse.'
    )
  }

  if (impactoD2 && impactoD2.pesoPromedioRelativo >= 95) {
    recomendaciones.push(
      'Recuperación óptima en 48h. Programa entrenamientos pesados en D+2 o D+3.'
    )
  }

  if (ausenciasPostPartido.length >= 2) {
    recomendaciones.push(
      `Patrón de ausencias post-partido detectado (${ausenciasPostPartido.length}x). Considera ajustar calendario o reducir intensidad del partido.`
    )
  }

  if (recomendaciones.length === 0) {
    recomendaciones.push('Sin interferencia significativa detectada. Continúa con programación actual.')
  }

  // Calcular rendimiento promedio post-futsal
  const rendimientoPostFutsal = sesionesPostFutsal.length > 0
    ? {
        pesoPromedio: Math.round(
          (sesionesPostFutsal.reduce((sum, s) => sum + s.rendimiento.pesoPromedio, 0) / sesionesPostFutsal.length) * 10
        ) / 10,
        volumenPromedio: Math.round(
          sesionesPostFutsal.reduce((sum, s) => sum + s.rendimiento.volumenTotal, 0) / sesionesPostFutsal.length
        )
      }
    : { pesoPromedio: 0, volumenPromedio: 0 }

  const impactoGlobal = rendimientoNormal.pesoPromedio > 0
    ? Math.round(
        ((rendimientoPostFutsal.pesoPromedio - rendimientoNormal.pesoPromedio) / rendimientoNormal.pesoPromedio) * 100
      )
    : 0

  return {
    totalEventosFutsal: eventosFutsal.length,
    totalSesionesGymPostFutsal: sesionesPostFutsal.length,
    impactoPorDia,
    patronesDetectados,
    recomendaciones,
    estadisticas: {
      rendimientoNormal,
      rendimientoPostFutsal,
      impactoGlobal
    }
  }
}

/**
 * Sistema de reporte de auditoría interna
 * Formato especificado en las directrices del usuario
 */

import type { TrackingRow } from './stats-validation'
import type { DiaAnalizado } from './stats-ausencias'

export interface EvolucionCargaSemanal {
  semana: number
  volumen: number // kg total movidos
  pesoPromedio: number
  series: number
  razon?: 'ausencia_detectada' | 'dato_faltante' | 'enfermedad' | 'normal'
  explicacion?: string
}

export interface ReporteAuditoriaMusculo {
  musculo: string
  asistencias: number // Días completados
  faltas: number // Días faltados
  evolucionCarga: EvolucionCargaSemanal[]
  conexion1a1: 'VERIFICADO' | '⚠️ ALERTA' | '❌ ERROR'
  formulaVolumen: string // Muestra el cálculo matemático
  alertas: string[]
  estadisticas: {
    volumenTotal: number
    volumenPromedioPorSemana: number
    pesoMaximo: number
    tendencia: 'ascendente' | 'estancado' | 'descendente'
    porcentajeCambio: number
  }
}

export interface ReporteAuditoriaEjercicio {
  ejercicio: string
  grupoMuscular: string
  asistencias: number
  faltas: number
  evolucionCarga: EvolucionCargaSemanal[]
  conexion1a1: 'VERIFICADO' | '⚠️ ALERTA' | '❌ ERROR'
  formulaVolumen: string
  alertas: string[]
  estadisticas: {
    pesoMaximo: number
    pesoPromedio: number
    rm1Estimado: number // 1RM estimado
    tendencia: 'ascendente' | 'estancado' | 'descendente'
    porcentajeCambio: number
  }
}

/**
 * Genera reporte de auditoría para un grupo muscular
 */
export function generarReporteMusculo(
  musculo: string,
  trackingData: TrackingRow[],
  diasAnalizados: DiaAnalizado[]
): ReporteAuditoriaMusculo {
  const alertas: string[] = []

  // Filtrar tracking de este músculo
  const trackingMusculo = trackingData.filter(t =>
    t.ejercicio?.grupo_muscular.toLowerCase().includes(musculo.toLowerCase())
  )

  // Calcular asistencias y faltas
  const asistencias = diasAnalizados.filter(d => d.estado === 'completada' && d.tiene_tracking).length
  const faltas = diasAnalizados.filter(d => d.estado === 'faltada').length

  // Agrupar por semana
  const porSemana = new Map<number, TrackingRow[]>()
  trackingMusculo.forEach(t => {
    if (!t.semana) return
    const semanaNum = t.semana.semana_numero
    if (!porSemana.has(semanaNum)) {
      porSemana.set(semanaNum, [])
    }
    porSemana.get(semanaNum)!.push(t)
  })

  // Calcular evolución de carga
  const evolucionCarga: EvolucionCargaSemanal[] = Array.from(porSemana.entries())
    .sort(([a], [b]) => a - b)
    .map(([semana, datos]) => {
      const volumen = datos.reduce((sum, t) => {
        const peso = t.peso || 0
        return sum + (peso * t.reps)
      }, 0)

      const pesoPromedio = datos.length > 0
        ? datos.reduce((sum, t) => sum + (t.peso || 0), 0) / datos.length
        : 0

      const series = datos.length

      // Detectar si hubo ausencias en esa semana
      const diasSemana = diasAnalizados.filter(d => d.semana_numero === semana)
      const faltasSemana = diasSemana.filter(d => d.estado === 'faltada')

      let razon: EvolucionCargaSemanal['razon'] = 'normal'
      let explicacion: string | undefined

      if (faltasSemana.length > 0) {
        const tieneEnfermedad = faltasSemana.some(d => d.razon_falta === 'enfermedad')
        razon = tieneEnfermedad ? 'enfermedad' : 'ausencia_detectada'
        explicacion = `${faltasSemana.length} día${faltasSemana.length > 1 ? 's' : ''} faltado${faltasSemana.length > 1 ? 's' : ''}`
      }

      return {
        semana,
        volumen: Math.round(volumen),
        pesoPromedio: Math.round(pesoPromedio * 10) / 10,
        series,
        razon,
        explicacion
      }
    })

  // Verificar conexión 1:1
  let conexion1a1: ReporteAuditoriaMusculo['conexion1a1'] = 'VERIFICADO'

  // Validar que días completados tengan datos de tracking
  const diasCompletosSinTracking = diasAnalizados.filter(
    d => d.estado === 'completada' && !d.tiene_tracking
  )

  if (diasCompletosSinTracking.length > 0) {
    conexion1a1 = '⚠️ ALERTA'
    alertas.push(
      `${diasCompletosSinTracking.length} día${diasCompletosSinTracking.length > 1 ? 's' : ''} marcado${diasCompletosSinTracking.length > 1 ? 's' : ''} como completado${diasCompletosSinTracking.length > 1 ? 's' : ''} pero sin datos en tracking`
    )
  }

  // Validar gaps en evolución de carga
  if (evolucionCarga.length > 0) {
    const primeraSemanNumber = evolucionCarga[0].semana
    const ultimaSemana = evolucionCarga[evolucionCarga.length - 1].semana
    const semanasEsperadas = ultimaSemana - primeraSemanNumber + 1

    if (evolucionCarga.length < semanasEsperadas) {
      const gaps = semanasEsperadas - evolucionCarga.length
      alertas.push(
        `${gaps} semana${gaps > 1 ? 's' : ''} sin datos entre semana ${primeraSemanNumber} y ${ultimaSemana}`
      )

      if (conexion1a1 === 'VERIFICADO') {
        conexion1a1 = '⚠️ ALERTA'
      }
    }
  }

  // Detectar semanas con volumen 0
  const semanasVolumenCero = evolucionCarga.filter(e => e.volumen === 0)
  if (semanasVolumenCero.length > 0) {
    alertas.push(
      `${semanasVolumenCero.length} semana${semanasVolumenCero.length > 1 ? 's' : ''} con volumen 0: ${semanasVolumenCero.map(e => `S${e.semana}`).join(', ')}`
    )

    if (conexion1a1 === 'VERIFICADO') {
      conexion1a1 = '⚠️ ALERTA'
    }
  }

  // Calcular estadísticas
  const volumenTotal = evolucionCarga.reduce((sum, e) => sum + e.volumen, 0)
  const volumenPromedioPorSemana = evolucionCarga.length > 0
    ? volumenTotal / evolucionCarga.length
    : 0

  const pesoMaximo = trackingMusculo.reduce((max, t) => {
    const peso = t.peso || 0
    return peso > max ? peso : max
  }, 0)

  // Calcular tendencia
  let tendencia: 'ascendente' | 'estancado' | 'descendente' = 'estancado'
  let porcentajeCambio = 0

  if (evolucionCarga.length >= 2) {
    const primero = evolucionCarga[0].volumen
    const ultimo = evolucionCarga[evolucionCarga.length - 1].volumen

    if (primero > 0) {
      porcentajeCambio = ((ultimo - primero) / primero) * 100

      if (porcentajeCambio > 5) {
        tendencia = 'ascendente'
      } else if (porcentajeCambio < -5) {
        tendencia = 'descendente'
      }
    }
  }

  // Generar fórmula de volumen (ejemplo con datos reales)
  let formulaVolumen = 'Volumen = Σ(series × reps × peso)'

  if (evolucionCarga.length > 0) {
    const ejemploSemana = evolucionCarga[evolucionCarga.length - 1]
    formulaVolumen += `\nÚltima semana (S${ejemploSemana.semana}): ${ejemploSemana.series} series × promedio ${ejemploSemana.pesoPromedio}kg = ${ejemploSemana.volumen}kg total`
  }

  return {
    musculo,
    asistencias,
    faltas,
    evolucionCarga,
    conexion1a1,
    formulaVolumen,
    alertas,
    estadisticas: {
      volumenTotal,
      volumenPromedioPorSemana: Math.round(volumenPromedioPorSemana),
      pesoMaximo,
      tendencia,
      porcentajeCambio: Math.round(porcentajeCambio * 10) / 10
    }
  }
}

/**
 * Calcula 1RM estimado usando la fórmula de Epley
 * 1RM = peso × (1 + reps / 30)
 */
function calcular1RM(peso: number, reps: number): number {
  if (reps === 1) return peso
  return Math.round(peso * (1 + reps / 30) * 10) / 10
}

/**
 * Genera reporte de auditoría para un ejercicio específico
 */
export function generarReporteEjercicio(
  ejercicioId: string,
  ejercicioNombre: string,
  grupoMuscular: string,
  trackingData: TrackingRow[],
  diasAnalizados: DiaAnalizado[]
): ReporteAuditoriaEjercicio {
  const alertas: string[] = []

  // Filtrar tracking de este ejercicio
  const trackingEjercicio = trackingData.filter(t => t.ejercicio?.id === ejercicioId)

  // Asistencias y faltas (aproximado, basado en grupo muscular)
  const asistencias = diasAnalizados.filter(d => d.estado === 'completada').length
  const faltas = diasAnalizados.filter(d => d.estado === 'faltada').length

  // Agrupar por semana
  const porSemana = new Map<number, TrackingRow[]>()
  trackingEjercicio.forEach(t => {
    if (!t.semana) return
    const semanaNum = t.semana.semana_numero
    if (!porSemana.has(semanaNum)) {
      porSemana.set(semanaNum, [])
    }
    porSemana.get(semanaNum)!.push(t)
  })

  // Calcular evolución de carga
  const evolucionCarga: EvolucionCargaSemanal[] = Array.from(porSemana.entries())
    .sort(([a], [b]) => a - b)
    .map(([semana, datos]) => {
      const volumen = datos.reduce((sum, t) => sum + ((t.peso || 0) * t.reps), 0)
      const pesoPromedio = datos.length > 0
        ? datos.reduce((sum, t) => sum + (t.peso || 0), 0) / datos.length
        : 0

      return {
        semana,
        volumen: Math.round(volumen),
        pesoPromedio: Math.round(pesoPromedio * 10) / 10,
        series: datos.length,
        razon: 'normal' as const
      }
    })

  // Validación 1:1
  let conexion1a1: ReporteAuditoriaEjercicio['conexion1a1'] = 'VERIFICADO'

  if (evolucionCarga.length === 0) {
    conexion1a1 = '❌ ERROR'
    alertas.push('No hay datos de tracking para este ejercicio')
  }

  // Calcular estadísticas
  const pesoMaximo = trackingEjercicio.reduce((max, t) => {
    const peso = t.peso || 0
    return peso > max ? peso : max
  }, 0)

  const pesoPromedio = trackingEjercicio.length > 0
    ? trackingEjercicio.reduce((sum, t) => sum + (t.peso || 0), 0) / trackingEjercicio.length
    : 0

  // Calcular 1RM estimado (usando el mejor set)
  let rm1Estimado = pesoMaximo
  trackingEjercicio.forEach(t => {
    if (t.peso && t.reps) {
      const rm = calcular1RM(t.peso, t.reps)
      if (rm > rm1Estimado) {
        rm1Estimado = rm
      }
    }
  })

  // Calcular tendencia
  let tendencia: 'ascendente' | 'estancado' | 'descendente' = 'estancado'
  let porcentajeCambio = 0

  if (evolucionCarga.length >= 2) {
    const primero = evolucionCarga[0].pesoPromedio
    const ultimo = evolucionCarga[evolucionCarga.length - 1].pesoPromedio

    if (primero > 0) {
      porcentajeCambio = ((ultimo - primero) / primero) * 100

      if (porcentajeCambio > 2) {
        tendencia = 'ascendente'
      } else if (porcentajeCambio < -2) {
        tendencia = 'descendente'
      }
    }
  }

  const formulaVolumen = `1RM estimado (Epley): peso × (1 + reps/30)\nMejor 1RM: ${rm1Estimado}kg`

  return {
    ejercicio: ejercicioNombre,
    grupoMuscular,
    asistencias,
    faltas,
    evolucionCarga,
    conexion1a1,
    formulaVolumen,
    alertas,
    estadisticas: {
      pesoMaximo,
      pesoPromedio: Math.round(pesoPromedio * 10) / 10,
      rm1Estimado,
      tendencia,
      porcentajeCambio: Math.round(porcentajeCambio * 10) / 10
    }
  }
}

/**
 * Imprime reporte en consola con formato legible
 */
export function imprimirReporte(reporte: ReporteAuditoriaMusculo | ReporteAuditoriaEjercicio) {
  console.log('\n' + '='.repeat(60))
  console.log(`📊 REPORTE DE AUDITORÍA INTERNA`)
  console.log('='.repeat(60))

  if ('musculo' in reporte) {
    console.log(`\n[${reporte.musculo.toUpperCase()}]`)
  } else {
    console.log(`\n[${reporte.ejercicio}]`)
    console.log(`   Grupo: ${reporte.grupoMuscular}`)
  }

  console.log(`   Asistencias / Faltas: ${reporte.asistencias} / ${reporte.faltas}`)
  console.log(`   Estado de Conexión: ${reporte.conexion1a1}`)

  console.log('\n📈 Evolución de Carga:')
  reporte.evolucionCarga.forEach(e => {
    const razonStr = e.razon && e.razon !== 'normal' ? ` [${e.razon}${e.explicacion ? ': ' + e.explicacion : ''}]` : ''
    console.log(`   Semana ${e.semana}: ${e.volumen}kg (${e.series} series, ${e.pesoPromedio}kg prom)${razonStr}`)
  })

  console.log('\n📐 Fórmula de Volumen:')
  reporte.formulaVolumen.split('\n').forEach(linea => {
    console.log(`   ${linea}`)
  })

  if (reporte.alertas.length > 0) {
    console.log('\n⚠️  Alertas:')
    reporte.alertas.forEach(alerta => {
      console.log(`   - ${alerta}`)
    })
  }

  console.log('\n📊 Estadísticas:')
  Object.entries(reporte.estadisticas).forEach(([key, value]) => {
    console.log(`   ${key}: ${value}`)
  })

  console.log('='.repeat(60) + '\n')
}

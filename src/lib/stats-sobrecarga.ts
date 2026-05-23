/**
 * Análisis de sobrecarga progresiva y evolución de carga
 * Detecta estancamientos y recomienda ajustes
 */

import type { TrackingRow } from './stats-validation'

export interface AnalisisSobrecarga {
  ejercicioId: string
  ejercicioNombre: string
  grupoMuscular: string
  semanas: SemanaAnalisis[]
  estadoProgresion: 'progresando' | 'estancado' | 'regresando'
  recomendacion: string
  metricasProgreso: {
    incrementoPesoTotal: number // kg ganados desde inicio
    incrementoPorcentual: number // %
    semanasProgreso: number // Semanas consecutivas con aumento
    semanasEstancamiento: number // Semanas sin cambio
    velocidadProgreso: number // kg/semana promedio
  }
}

export interface SemanaAnalisis {
  semana: number
  fechaInicio: string
  pesoPromedio: number
  pesoMaximo: number
  volumenTotal: number
  series: number
  repsPromedio: number
  rm1Estimado: number
  cambioVsSemanaAnterior: {
    peso: number // +2.5kg
    volumen: number // +150kg
    porcentaje: number // +5%
  } | null
  estadoSemana: 'progreso' | 'estancamiento' | 'regresion' | 'ausencia'
  explicacion: string
}

export interface DeteccionEstancamiento {
  ejercicioNombre: string
  semanasEstancado: number
  ultimoPeso: number
  sugerencias: string[]
  causasPosibles: ('falta_sobrecarga' | 'fatiga' | 'ausencias' | 'tecnica')[]
}

/**
 * Analiza sobrecarga progresiva de un ejercicio
 */
export function analizarSobrecargaProgresiva(
  ejercicioId: string,
  ejercicioNombre: string,
  grupoMuscular: string,
  trackingData: TrackingRow[]
): AnalisisSobrecarga {
  // Filtrar tracking de este ejercicio
  const trackingEjercicio = trackingData.filter(t => t.ejercicio?.id === ejercicioId)

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

  // Analizar cada semana
  const semanasOrdenadas = Array.from(porSemana.entries()).sort(([a], [b]) => a - b)
  const semanas: SemanaAnalisis[] = []

  let semanaAnterior: SemanaAnalisis | null = null

  semanasOrdenadas.forEach(([semanaNum, datos]) => {
    const pesos = datos.map(t => t.peso || 0).filter(p => p > 0)
    const pesoPromedio = pesos.length > 0
      ? pesos.reduce((sum, p) => sum + p, 0) / pesos.length
      : 0

    const pesoMaximo = Math.max(...pesos, 0)

    const volumenTotal = datos.reduce((sum, t) => {
      const peso = t.peso || 0
      return sum + (peso * t.reps)
    }, 0)

    const repsPromedio = datos.length > 0
      ? datos.reduce((sum, t) => sum + t.reps, 0) / datos.length
      : 0

    // Calcular 1RM estimado (Epley)
    const rm1Estimado = pesoMaximo > 0 && repsPromedio > 0
      ? Math.round(pesoMaximo * (1 + repsPromedio / 30) * 10) / 10
      : pesoMaximo

    // Comparar con semana anterior
    let cambioVsSemanaAnterior: SemanaAnalisis['cambioVsSemanaAnterior'] = null
    let estadoSemana: SemanaAnalisis['estadoSemana'] = 'estancamiento'
    let explicacion = ''

    if (semanaAnterior) {
      const cambioPeso = pesoPromedio - semanaAnterior.pesoPromedio
      const cambioVolumen = volumenTotal - semanaAnterior.volumenTotal
      const porcentaje = semanaAnterior.pesoPromedio > 0
        ? (cambioPeso / semanaAnterior.pesoPromedio) * 100
        : 0

      cambioVsSemanaAnterior = {
        peso: Math.round(cambioPeso * 10) / 10,
        volumen: Math.round(cambioVolumen),
        porcentaje: Math.round(porcentaje * 10) / 10
      }

      // Determinar estado
      if (cambioPeso > 1) {
        estadoSemana = 'progreso'
        explicacion = `+${cambioPeso.toFixed(1)}kg respecto a semana ${semanaAnterior.semana}`
      } else if (cambioPeso < -1) {
        estadoSemana = 'regresion'
        explicacion = `${cambioPeso.toFixed(1)}kg respecto a semana ${semanaAnterior.semana} (posible fatiga o deload)`
      } else if (Math.abs(cambioPeso) <= 1 && cambioVolumen > 50) {
        estadoSemana = 'progreso'
        explicacion = `Mismo peso pero +${cambioVolumen}kg volumen (más reps o series)`
      } else {
        estadoSemana = 'estancamiento'
        explicacion = `Sin cambio significativo respecto a semana ${semanaAnterior.semana}`
      }
    } else {
      estadoSemana = 'progreso'
      explicacion = 'Primera semana de registro'
    }

    semanas.push({
      semana: semanaNum,
      fechaInicio: datos[0].semana?.fecha_inicio || '',
      pesoPromedio: Math.round(pesoPromedio * 10) / 10,
      pesoMaximo,
      volumenTotal: Math.round(volumenTotal),
      series: datos.length,
      repsPromedio: Math.round(repsPromedio * 10) / 10,
      rm1Estimado,
      cambioVsSemanaAnterior,
      estadoSemana,
      explicacion
    })

    semanaAnterior = semanas[semanas.length - 1]
  })

  // Calcular métricas de progreso
  const primeraSemanaPeso = semanas[0]?.pesoPromedio || 0
  const ultimaSemanaPeso = semanas[semanas.length - 1]?.pesoPromedio || 0
  const incrementoPesoTotal = ultimaSemanaPeso - primeraSemanaPeso
  const incrementoPorcentual = primeraSemanaPeso > 0
    ? (incrementoPesoTotal / primeraSemanaPeso) * 100
    : 0

  // Contar rachas de progreso y estancamiento
  let semanasProgreso = 0
  let semanasEstancamiento = 0
  let rachaActual = 0

  semanas.forEach((s) => {
    if (s.estadoSemana === 'progreso') {
      semanasProgreso++
      rachaActual++
    } else if (s.estadoSemana === 'estancamiento') {
      semanasEstancamiento++
      rachaActual = 0
    }
  })

  const velocidadProgreso = semanas.length > 1
    ? incrementoPesoTotal / (semanas.length - 1)
    : 0

  // Determinar estado global de progresión
  let estadoProgresion: AnalisisSobrecarga['estadoProgresion'] = 'estancado'
  let recomendacion = ''

  if (semanasEstancamiento >= 3) {
    estadoProgresion = 'estancado'
    recomendacion = `Llevas ${semanasEstancamiento} semanas sin progreso. Considera: (1) Aumentar carga 2.5-5kg, (2) Agregar series, (3) Revisar técnica, (4) Verificar recuperación`
  } else if (incrementoPorcentual > 5) {
    estadoProgresion = 'progresando'
    recomendacion = `Excelente progreso (+${incrementoPorcentual.toFixed(1)}%). Mantén la sobrecarga gradual.`
  } else if (incrementoPorcentual < -5) {
    estadoProgresion = 'regresando'
    recomendacion = `Pérdida de fuerza detectada (${incrementoPorcentual.toFixed(1)}%). Revisa fatiga, sueño y nutrición.`
  } else {
    estadoProgresion = 'estancado'
    recomendacion = `Progreso lento (+${incrementoPorcentual.toFixed(1)}%). Considera ciclo de intensidad o cambio de ejercicio.`
  }

  return {
    ejercicioId,
    ejercicioNombre,
    grupoMuscular,
    semanas,
    estadoProgresion,
    recomendacion,
    metricasProgreso: {
      incrementoPesoTotal: Math.round(incrementoPesoTotal * 10) / 10,
      incrementoPorcentual: Math.round(incrementoPorcentual * 10) / 10,
      semanasProgreso,
      semanasEstancamiento,
      velocidadProgreso: Math.round(velocidadProgreso * 100) / 100
    }
  }
}

/**
 * Detecta ejercicios estancados y sugiere acciones
 */
export function detectarEstancamientos(
  trackingData: TrackingRow[],
  umbralSemanas: number = 3
): DeteccionEstancamiento[] {
  // Agrupar por ejercicio
  const porEjercicio = new Map<string, TrackingRow[]>()

  trackingData.forEach(t => {
    if (!t.ejercicio) return
    const key = t.ejercicio.id
    if (!porEjercicio.has(key)) {
      porEjercicio.set(key, [])
    }
    porEjercicio.get(key)!.push(t)
  })

  const estancamientos: DeteccionEstancamiento[] = []

  porEjercicio.forEach((datos, ejercicioId) => {
    const ejercicioNombre = datos[0]?.ejercicio?.nombre || 'Desconocido'
    const grupoMuscular = datos[0]?.ejercicio?.grupo_muscular || 'Desconocido'

    const analisis = analizarSobrecargaProgresiva(
      ejercicioId,
      ejercicioNombre,
      grupoMuscular,
      trackingData
    )

    // Detectar estancamiento
    if (analisis.metricasProgreso.semanasEstancamiento >= umbralSemanas) {
      const sugerencias: string[] = []
      const causasPosibles: DeteccionEstancamiento['causasPosibles'] = []

      // Analizar causas
      const ultimasSemanas = analisis.semanas.slice(-umbralSemanas)
      const hayAusencias = ultimasSemanas.some(s => s.estadoSemana === 'ausencia')

      if (hayAusencias) {
        causasPosibles.push('ausencias')
        sugerencias.push('Mejorar consistencia: ausencias detectadas en últimas semanas')
      }

      // Falta de sobrecarga
      const pesoConstante = ultimasSemanas.every(s =>
        Math.abs(s.pesoPromedio - ultimasSemanas[0].pesoPromedio) < 1
      )

      if (pesoConstante) {
        causasPosibles.push('falta_sobrecarga')
        sugerencias.push(`Aumentar peso: llevas ${umbralSemanas} semanas con ~${ultimasSemanas[0].pesoPromedio}kg`)
      }

      // Volumen bajo
      const volumenBajo = ultimasSemanas.some(s => s.series < 3)
      if (volumenBajo) {
        causasPosibles.push('tecnica')
        sugerencias.push('Revisar volumen: algunas semanas tienen <3 series')
      }

      // Sugerencias generales
      if (sugerencias.length === 0) {
        causasPosibles.push('fatiga')
        sugerencias.push('Considera: deload, cambio de ejercicio, o revisar técnica')
      }

      estancamientos.push({
        ejercicioNombre,
        semanasEstancado: analisis.metricasProgreso.semanasEstancamiento,
        ultimoPeso: analisis.semanas[analisis.semanas.length - 1].pesoPromedio,
        sugerencias,
        causasPosibles
      })
    }
  })

  return estancamientos.sort((a, b) => b.semanasEstancado - a.semanasEstancado)
}

/**
 * Genera reporte de sobrecarga para un grupo muscular
 */
export function generarReporteSobrecargaMusculo(
  grupoMuscular: string,
  trackingData: TrackingRow[]
): {
  grupoMuscular: string
  ejercicios: AnalisisSobrecarga[]
  estadoGeneral: 'progresando' | 'estancado' | 'regresando'
  recomendacionGeneral: string
} {
  // Filtrar tracking de este músculo
  const trackingMusculo = trackingData.filter(t =>
    t.ejercicio?.grupo_muscular.toLowerCase().includes(grupoMuscular.toLowerCase())
  )

  // Obtener ejercicios únicos
  const ejerciciosUnicos = new Map<string, { id: string; nombre: string }>()
  trackingMusculo.forEach(t => {
    if (t.ejercicio && !ejerciciosUnicos.has(t.ejercicio.id)) {
      ejerciciosUnicos.set(t.ejercicio.id, {
        id: t.ejercicio.id,
        nombre: t.ejercicio.nombre
      })
    }
  })

  // Analizar cada ejercicio
  const ejercicios: AnalisisSobrecarga[] = []

  ejerciciosUnicos.forEach(({ id, nombre }) => {
    const analisis = analizarSobrecargaProgresiva(
      id,
      nombre,
      grupoMuscular,
      trackingData
    )
    ejercicios.push(analisis)
  })

  // Determinar estado general
  const progresando = ejercicios.filter(e => e.estadoProgresion === 'progresando').length
  const estancado = ejercicios.filter(e => e.estadoProgresion === 'estancado').length
  const regresando = ejercicios.filter(e => e.estadoProgresion === 'regresando').length

  let estadoGeneral: 'progresando' | 'estancado' | 'regresando' = 'estancado'
  let recomendacionGeneral = ''

  if (progresando > estancado + regresando) {
    estadoGeneral = 'progresando'
    recomendacionGeneral = `${progresando}/${ejercicios.length} ejercicios progresando. Mantén la sobrecarga.`
  } else if (regresando > progresando) {
    estadoGeneral = 'regresando'
    recomendacionGeneral = `${regresando}/${ejercicios.length} ejercicios en regresión. Revisa fatiga y recuperación.`
  } else {
    estadoGeneral = 'estancado'
    recomendacionGeneral = `${estancado}/${ejercicios.length} ejercicios estancados. Considera cambios en programación.`
  }

  return {
    grupoMuscular,
    ejercicios,
    estadoGeneral,
    recomendacionGeneral
  }
}

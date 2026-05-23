/**
 * Utilidades de validación para datos de tracking
 * Garantiza conexión 1:1 entre historial y métricas
 */

export interface TrackingRow {
  id: string
  peso: number | null
  reps: number
  numero_serie: number
  ejercicio?: {
    id: string
    nombre: string
    grupo_muscular: string
  }
  semana?: {
    semana_numero: number
    fecha_inicio: string
  }
}

export interface ValidationWarning {
  type: 'NULL_PESO' | 'NULL_REPS' | 'MISSING_EJERCICIO' | 'MISSING_SEMANA'
  severity: 'error' | 'warning'
  ejercicio: string
  semana: number | null
  serie: number
  message: string
}

/**
 * Valida una fila de tracking y retorna warnings si hay problemas
 */
export function validateTrackingRow(row: TrackingRow): ValidationWarning | null {
  // Validar peso NULL
  if (row.peso === null || row.peso === undefined) {
    return {
      type: 'NULL_PESO',
      severity: 'error',
      ejercicio: row.ejercicio?.nombre || 'Desconocido',
      semana: row.semana?.semana_numero || null,
      serie: row.numero_serie,
      message: `⚠️ Serie sin peso registrado: ${row.ejercicio?.nombre || 'Desconocido'} - Semana ${row.semana?.semana_numero || '?'} - Serie ${row.numero_serie}`
    }
  }

  // Validar reps NULL
  if (row.reps === null || row.reps === undefined || row.reps === 0) {
    return {
      type: 'NULL_REPS',
      severity: 'warning',
      ejercicio: row.ejercicio?.nombre || 'Desconocido',
      semana: row.semana?.semana_numero || null,
      serie: row.numero_serie,
      message: `⚠️ Serie sin repeticiones: ${row.ejercicio?.nombre || 'Desconocido'} - Semana ${row.semana?.semana_numero || '?'} - Serie ${row.numero_serie}`
    }
  }

  // Validar relaciones
  if (!row.ejercicio) {
    return {
      type: 'MISSING_EJERCICIO',
      severity: 'error',
      ejercicio: 'NULL',
      semana: row.semana?.semana_numero || null,
      serie: row.numero_serie,
      message: `❌ Fila de tracking sin ejercicio asociado (ID: ${row.id})`
    }
  }

  if (!row.semana) {
    return {
      type: 'MISSING_SEMANA',
      severity: 'error',
      ejercicio: row.ejercicio?.nombre || 'Desconocido',
      semana: null,
      serie: row.numero_serie,
      message: `❌ Fila de tracking sin semana asociada (ID: ${row.id})`
    }
  }

  return null
}

/**
 * Filtra y valida un array de tracking, excluyendo filas inválidas
 * y registrando warnings en consola
 */
export function validateAndFilterTracking(
  trackingData: TrackingRow[],
  options: {
    logWarnings?: boolean
    throwOnError?: boolean
  } = {}
): {
  validRows: TrackingRow[]
  warnings: ValidationWarning[]
  invalidCount: number
} {
  const { logWarnings = true, throwOnError = false } = options

  const validRows: TrackingRow[] = []
  const warnings: ValidationWarning[] = []
  let invalidCount = 0

  trackingData.forEach((row) => {
    const warning = validateTrackingRow(row)

    if (warning) {
      warnings.push(warning)
      invalidCount++

      if (logWarnings) {
        if (warning.severity === 'error') {
          console.error(warning.message)
        } else {
          console.warn(warning.message)
        }
      }

      if (throwOnError && warning.severity === 'error') {
        throw new Error(warning.message)
      }

      // No agregar a validRows si tiene error crítico
      if (warning.type === 'NULL_PESO' || warning.type === 'MISSING_EJERCICIO' || warning.type === 'MISSING_SEMANA') {
        return
      }
    }

    validRows.push(row)
  })

  if (logWarnings && warnings.length > 0) {
    console.log(`\n📊 Validación de tracking completada:`)
    console.log(`   ✅ Filas válidas: ${validRows.length}`)
    console.log(`   ❌ Filas inválidas: ${invalidCount}`)
    console.log(`   ⚠️  Total warnings: ${warnings.length}`)
  }

  return { validRows, warnings, invalidCount }
}

/**
 * Calcula volumen de forma segura, manejando casos NULL
 */
export function calcularVolumenSeguro(peso: number | null, reps: number): number {
  if (peso === null || peso === undefined || isNaN(peso)) {
    return 0
  }
  if (reps === null || reps === undefined || isNaN(reps) || reps === 0) {
    return 0
  }
  return Number(peso) * reps
}

/**
 * Agrupa tracking por semana para análisis temporal
 */
export function agruparPorSemana(trackingData: TrackingRow[]): Map<number, TrackingRow[]> {
  const porSemana = new Map<number, TrackingRow[]>()

  trackingData.forEach((row) => {
    if (!row.semana) return

    const semanaNum = row.semana.semana_numero
    if (!porSemana.has(semanaNum)) {
      porSemana.set(semanaNum, [])
    }
    porSemana.get(semanaNum)!.push(row)
  })

  return porSemana
}

/**
 * Agrupa tracking por grupo muscular normalizado
 */
export function normalizarGrupoMuscular(grupo: string): string {
  const grupoLower = grupo.toLowerCase().trim()

  if (grupoLower.includes('hombro')) return 'hombros'
  if (grupoLower.includes('espalda')) return 'espalda'
  if (grupoLower.includes('pecho')) return 'pecho'
  if (grupoLower.includes('bíceps') || grupoLower.includes('biceps')) return 'bíceps'
  if (grupoLower.includes('tríceps') || grupoLower.includes('triceps')) return 'tríceps'
  if (grupoLower.includes('trapecio')) return 'trapecio'
  if (grupoLower.includes('cuádriceps') || grupoLower.includes('cuadriceps')) return 'cuádriceps'
  if (grupoLower.includes('isquio')) return 'isquiotibiales'
  if (grupoLower.includes('gemelo')) return 'gemelos'
  if (grupoLower.includes('glúteo') || grupoLower.includes('gluteo')) return 'glúteos'
  if (grupoLower.includes('abdomen') || grupoLower.includes('core')) return 'core'
  if (grupoLower.includes('antebrazo')) return 'antebrazos'

  return grupoLower
}

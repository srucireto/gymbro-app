import type {
  DiaSemana,
  Sesion,
  EntradaCalendario,
  CheckInEstado,
  DiasFuera,
  Ejercicio
} from '@/types'
import { DIAS_GYM } from './scheduler'

const DIAS: DiaSemana[] = [
  "lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"
]

/**
 * Calcula las horas de buffer entre un día y el día del partido
 */
function calcularBufferHoras(dia: DiaSemana, diaPartido: DiaSemana): number {
  const idxDia = DIAS.indexOf(dia)
  const idxPartido = DIAS.indexOf(diaPartido)

  let diff = idxPartido - idxDia
  if (diff < 0) diff += 7

  return diff * 24
}

/**
 * Verifica si un día está después del partido
 */
function esDespuesDelPartido(dia: DiaSemana, diaPartido: DiaSemana): boolean {
  const idxDia = DIAS.indexOf(dia)
  const idxPartido = DIAS.indexOf(diaPartido)

  return idxDia > idxPartido
}

/**
 * Validación simple de Dimensión 2: separación entre sesiones del mismo tipo
 */
function validarDimension2Simple(
  dia: DiaSemana,
  sesion: Sesion,
  calendario: Record<DiaSemana, EntradaCalendario>,
  sesiones: Sesion[]
): boolean {
  const idxDia = DIAS.indexOf(dia)
  const diaAnterior = DIAS[(idxDia - 1 + 7) % 7]
  const entradaAnterior = calendario[diaAnterior]

  if (entradaAnterior.sesion_id) {
    const sesionAnterior = sesiones.find(s => s.id === entradaAnterior.sesion_id)
    // No permitir dos sesiones del mismo tipo consecutivas
    if (sesionAnterior?.tipo === sesion.tipo) {
      return false
    }
  }

  return true
}

/**
 * Intenta recuperar una sesión faltada en otro día de la semana
 */
export function intentarRecuperarSesion(
  sesionFaltada: Sesion,
  diaFaltado: DiaSemana,
  calendario: Record<DiaSemana, EntradaCalendario>,
  diaPartido: DiaSemana,
  sesiones: Sesion[]
): { recuperada: boolean; nuevoDia?: DiaSemana; advertencia?: string } {

  const idxFaltado = DIAS.indexOf(diaFaltado)
  const idxHoy = DIAS.indexOf(diaFaltado)  // Asumimos que hoy es el día faltado
  const idxSabado = DIAS.indexOf("sábado")

  // Días candidatos: desde hoy hasta el sábado
  const diasCandidatos: DiaSemana[] = []
  for (let i = idxHoy + 1; i <= idxSabado; i++) {
    const dia = DIAS[i]
    if (DIAS_GYM.includes(dia) &&
        calendario[dia].tipo === "descanso" &&
        dia !== diaFaltado) {
      diasCandidatos.push(dia)
    }
  }

  // Probar cada día candidato
  for (const dia of diasCandidatos) {
    // Verificar D1: buffer al partido
    if (!sesionFaltada.es_post_partido) {
      const bufferHoras = calcularBufferHoras(dia, diaPartido)
      if (bufferHoras < sesionFaltada.buffer_minimo_horas) continue
    } else {
      if (!esDespuesDelPartido(dia, diaPartido)) continue
    }

    // Verificar D2: separación con otras sesiones
    if (!validarDimension2Simple(dia, sesionFaltada, calendario, sesiones)) continue

    // Este día es válido
    return { recuperada: true, nuevoDia: dia }
  }

  // No se pudo recuperar
  return {
    recuperada: false,
    advertencia: `${sesionFaltada.nombre} no pudo recuperarse esta semana. Se descarta y se continúa con la siguiente sesión normalmente.`
  }
}

/**
 * Determina si se necesita check-in basado en los días fuera
 */
export function necesitaCheckIn(diasFuera: DiasFuera): boolean {
  return diasFuera >= 2  // Caso 2, 3 y 4
}

/**
 * Determina cuántas sesiones necesitan check-in
 */
export function sesionesConCheckIn(diasFuera: DiasFuera): number {
  if (diasFuera === 1) return 0
  if (diasFuera === 2 || diasFuera === 3) return 1  // Caso 2
  return 2  // Caso 3 y 4
}

/**
 * Modifica los ejercicios de una sesión según el estado del check-in
 */
export function modificarEjerciciosPorCheckIn(
  ejercicios: Ejercicio[],
  checkInEstado: CheckInEstado
): Ejercicio[] {

  if (checkInEstado === "bien") {
    // Sin modificaciones
    return ejercicios
  }

  if (checkInEstado === "regular") {
    return ejercicios.map(ej => {
      // Identificar compuestos pesados por nombre/grupo y series
      const esCompuestoPesado =
        (ej.nombre.toLowerCase().includes('rdl') ||
         ej.nombre.toLowerCase().includes('dominadas') ||
         ej.nombre.toLowerCase().includes('chest-supported') ||
         ej.nombre.toLowerCase().includes('hack squat') ||
         ej.nombre.toLowerCase().includes('bench press') ||
         ej.nombre.toLowerCase().includes('press de banca') ||
         ej.nombre.toLowerCase().includes('sentadilla')) &&
        ej.series >= 4

      if (esCompuestoPesado) {
        // Reducir a 3 series y aumentar RIR en 1
        const nuevoRIR = ej.rir_target.includes('–')
          ? ej.rir_target.split('–').map(n => parseInt(n) + 1).join('–')
          : String(parseInt(ej.rir_target) + 1)

        return {
          ...ej,
          series: 3,
          rir_target: nuevoRIR,
          notas: (ej.notas || '') + '\n⚠️ REDUCIDO: 3 series por estado regular'
        }
      }

      return ej
    })
  }

  if (checkInEstado === "mal") {
    return ejercicios.map(ej => {
      // Identificar compuestos pesados
      const esCompuestoPesado =
        (ej.nombre.toLowerCase().includes('rdl') ||
         ej.nombre.toLowerCase().includes('dominadas') ||
         ej.nombre.toLowerCase().includes('chest-supported') ||
         ej.nombre.toLowerCase().includes('remo') ||
         ej.nombre.toLowerCase().includes('hack squat') ||
         ej.nombre.toLowerCase().includes('bench press') ||
         ej.nombre.toLowerCase().includes('press de banca') ||
         ej.nombre.toLowerCase().includes('sentadilla')) &&
        ej.series >= 3

      if (esCompuestoPesado) {
        // Marcar como desactivado
        return {
          ...ej,
          series: 0,
          notas: (ej.notas || '') + '\n✗ DESACTIVADO: estado físico mal, solo aislamiento hoy'
        }
      }

      // Aislamiento: reducir RIR en 1 por precaución
      const nuevoRIR = ej.rir_target.includes('–')
        ? ej.rir_target.split('–').map(n => Math.max(0, parseInt(n) - 1)).join('–')
        : String(Math.max(0, parseInt(ej.rir_target) - 1))

      return {
        ...ej,
        rir_target: nuevoRIR
      }
    }).filter(ej => ej.series > 0)  // Filtrar los desactivados
  }

  return ejercicios
}

/**
 * Calcula el factor de reducción de peso para caso 4 (+7 días)
 */
export function calcularFactorReduccionPeso(semanaVuelta: number): number {
  if (semanaVuelta === 1) return 0.6   // 60%
  if (semanaVuelta === 2) return 0.8   // 80%
  return 1.0  // 100%
}

/**
 * Determina las prioridades de recuperación de sesiones
 */
const PRIORIDADES_SESION: Record<string, number> = {
  'pull_a': 1,
  'push_a': 2,
  'push_b': 3,
  'pull_b': 4
}

export function obtenerPrioridadSesion(sesion: Sesion): number {
  const key = sesion.nombre.toLowerCase().replace(/\s+/g, '_')
  return PRIORIDADES_SESION[key] || 99
}

/**
 * Ordena sesiones faltadas por prioridad de recuperación
 */
export function ordenarPorPrioridad(sesiones: Sesion[]): Sesion[] {
  return [...sesiones].sort((a, b) =>
    obtenerPrioridadSesion(a) - obtenerPrioridadSesion(b)
  )
}

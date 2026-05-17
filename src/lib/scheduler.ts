import type { DiaSemana, Sesion, EntradaCalendario } from '@/types'

const DIAS: DiaSemana[] = [
  "lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"
]

export const DIAS_PARTIDO: DiaSemana[] = [
  "lunes", "martes", "miércoles", "jueves", "viernes"
]

export const DIAS_FUTSAL_ENTRENO: DiaSemana[] = [
  "lunes", "martes", "miércoles", "jueves", "viernes"
]

export const DIAS_GYM: DiaSemana[] = [
  "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"
  // domingo excluido: gym cerrado
]

function validarDimension2(
  dia: DiaSemana,
  sesion: Sesion,
  calendario: Record<DiaSemana, EntradaCalendario>,
  sesiones: Sesion[]
): { valido: boolean; razon?: string } {
  const idx = DIAS.indexOf(dia)
  const diaAnterior = idx > 0 ? DIAS[idx - 1] : null
  const diaSiguiente = idx < DIAS.length - 1 ? DIAS[idx + 1] : null

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
  // Push A → Push B o Push B → Push A: mínimo 48hs
  for (let offset = 1; offset <= 2; offset++) {
    const idxVecino = idx - offset
    if (idxVecino < 0) continue
    const diaVecino = DIAS[idxVecino]
    const entradaVecina = calendario[diaVecino]
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

    // Push A → Pull B liviano con 24hs es ACEPTABLE (grupos distintos)
    // No hacer nada especial aquí, la validación de tipo ya lo permite
  }

  // Verificar hacia adelante también
  for (let offset = 1; offset <= 2; offset++) {
    const idxVecino = idx + offset
    if (idxVecino >= DIAS.length) continue
    const diaVecino = DIAS[idxVecino]
    const entradaVecina = calendario[diaVecino]
    if (!entradaVecina?.sesion_id) continue
    const sesionVecina = sesiones.find(s => s.id === entradaVecina.sesion_id)
    if (!sesionVecina) continue

    // Mismo tipo con menos de 48hs
    if (sesionVecina.tipo === sesion.tipo && offset < 2) {
      return { valido: false, razon: `${sesion.nombre} necesita al menos 48hs de separación con ${sesionVecina.nombre}.` }
    }

    // Pull A → Pull B con grupos superpuestos
    const ambasConIsquios = sesion.tipo === "pull" && sesionVecina.tipo === "pull"
    if (ambasConIsquios && offset < 2) {
      return { valido: false, razon: "Pull A y Pull B comparten isquios/glúteo. Necesitan mínimo 48hs." }
    }
  }

  return { valido: true }
}

export function generarCalendario(
  diaPartido: DiaSemana,
  diaFutsalEntreno: DiaSemana,
  sesiones: Sesion[]
): Record<DiaSemana, EntradaCalendario> {
  // Validaciones
  if (!DIAS_PARTIDO.includes(diaPartido)) {
    throw new Error("El partido solo puede ser de lunes a viernes.")
  }
  if (!DIAS_FUTSAL_ENTRENO.includes(diaFutsalEntreno)) {
    throw new Error("El entreno de futsal solo puede ser de lunes a viernes.")
  }
  if (diaPartido === diaFutsalEntreno) {
    throw new Error("El partido y el entreno no pueden ser el mismo día.")
  }

  // Inicializar calendario
  const calendario: Record<DiaSemana, EntradaCalendario> = {
    "lunes": { tipo: "descanso" },
    "martes": { tipo: "descanso" },
    "miércoles": { tipo: "descanso" },
    "jueves": { tipo: "descanso" },
    "viernes": { tipo: "descanso" },
    "sábado": { tipo: "descanso" },
    "domingo": { tipo: "gym_cerrado" }
  }

  const idxPartido = DIAS.indexOf(diaPartido)

  // Marcar partido y entreno de futsal
  calendario[diaPartido] = { tipo: "partido" }
  calendario[diaFutsalEntreno] = { tipo: "futsal_entreno" }

  // Ordenar sesiones por buffer descendente (más críticas primero)
  // Pull A (96hs) → Push A (48hs) → Pull B (24hs) → Push B (post)
  const sesionesPendientes = [...sesiones].sort(
    (a, b) => b.buffer_minimo_horas - a.buffer_minimo_horas
  )

  for (const sesion of sesionesPendientes) {
    // Sesiones post-partido se colocan después del partido
    if (sesion.es_post_partido) {
      let colocada = false

      for (let offset = 1; offset <= 6; offset++) {
        const idx = (idxPartido + offset) % 7
        const dia = DIAS[idx]

        // Solo días válidos para gym
        if (!DIAS_GYM.includes(dia)) continue
        if (calendario[dia].tipo !== "descanso") continue

        // Verificar Dimensión 2
        const validacionD2 = validarDimension2(dia, sesion, calendario, sesiones)
        if (!validacionD2.valido) continue

        calendario[dia] = {
          tipo: "gym",
          sesion_id: sesion.id,
          estado: "normal"
        }
        colocada = true
        break
      }

      // Si no hay slot válido
      if (!colocada) {
        calendario[diaPartido] = {
          ...calendario[diaPartido],
          advertencia: `${sesion.nombre} pospuesta al lunes siguiente (no hay slot que respete ambas dimensiones)`
        }
      }
      continue
    }

    // Para sesiones pre-partido, buscar slot válido respetando ambas dimensiones
    let colocada = false
    const bufferDias = Math.ceil(sesion.buffer_minimo_horas / 24)

    // Buscar desde (partido - bufferDias) hacia atrás hasta (partido - 6)
    for (let offset = bufferDias; offset <= 6; offset++) {
      const idx = ((idxPartido - offset) + 7) % 7
      const dia = DIAS[idx]

      // Solo días válidos para gym
      if (!DIAS_GYM.includes(dia)) continue
      if (calendario[dia].tipo !== "descanso") continue

      const bufferReal = offset * 24

      // DIMENSIÓN 1: Verificar buffer mínimo
      let estadoD1: "normal" | "liviana" | "rechazado" = "rechazado"
      let sesionIdFinal = sesion.id

      if (bufferReal >= sesion.buffer_minimo_horas) {
        estadoD1 = "normal"
      } else if (sesion.version_liviana_id) {
        estadoD1 = "liviana"
        sesionIdFinal = sesion.version_liviana_id
      } else {
        // Buffer insuficiente y no hay versión liviana → continuar buscando
        continue
      }

      // DIMENSIÓN 2: Verificar separación entre sesiones
      // Usar la sesión que realmente se va a colocar (puede ser la versión liviana)
      const sesionAValidar = estadoD1 === "liviana"
        ? sesiones.find(s => s.id === sesion.version_liviana_id) || sesion
        : sesion

      const validacionD2 = validarDimension2(dia, sesionAValidar, calendario, sesiones)
      if (!validacionD2.valido) {
        // D2 no se cumple, continuar buscando
        continue
      }

      // Ambas dimensiones OK → asignar
      if (estadoD1 === "normal") {
        calendario[dia] = {
          tipo: "gym",
          sesion_id: sesionIdFinal,
          estado: "normal"
        }
      } else {
        calendario[dia] = {
          tipo: "gym",
          sesion_id: sesionIdFinal,
          estado: "liviana",
          advertencia: `${sesion.nombre} con buffer reducido (${bufferReal}hs < ${sesion.buffer_minimo_horas}hs). Versión liviana aplicada.`
        }
      }

      colocada = true
      break
    }

    // Lógica de fallback si no se pudo colocar
    if (!colocada) {
      // Pull B: intentar con buffer reducido o posponer
      if (sesion.nombre === "Pull B") {
        calendario[diaPartido] = {
          ...calendario[diaPartido],
          advertencia: `${sesion.nombre} no pudo colocarse respetando ambas dimensiones. Recomendado: hacerla al inicio de la semana siguiente.`
        }
      }
      // Pull A: usar versión liviana con advertencia crítica
      else if (sesion.nombre === "Pull A") {
        calendario[diaPartido] = {
          ...calendario[diaPartido],
          advertencia: `⚠️ ${sesion.nombre} no pudo colocarse con 96hs. Versión liviana recomendada o posponer.`
        }
      }
      // Push A o Push B: posponer con advertencia crítica
      else {
        calendario[diaPartido] = {
          ...calendario[diaPartido],
          advertencia: `⚠️ ${sesion.nombre} no pudo colocarse respetando los buffers. Posponer a la semana siguiente.`
        }
      }
    }
  }

  return calendario
}

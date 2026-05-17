import type { DiaSemana, Sesion, EntradaCalendario } from '@/types'

const DIAS: DiaSemana[] = [
  "lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"
]

export function generarCalendario(
  diaPartido: DiaSemana,
  sesiones: Sesion[]
): Record<DiaSemana, EntradaCalendario> {
  // Inicializar calendario con todos los días en descanso
  const calendario: Record<DiaSemana, EntradaCalendario> = Object.fromEntries(
    DIAS.map(d => [d, { tipo: "descanso" as const }])
  ) as Record<DiaSemana, EntradaCalendario>

  const idxPartido = DIAS.indexOf(diaPartido)
  
  // Determinar día de entreno de futsal
  // Normalmente es martes, excepto cuando el partido cae martes → se mueve a viernes
  const diaFutsal: DiaSemana = diaPartido === "martes" ? "viernes" : "martes"

  // Marcar partido y entreno de futsal
  calendario[diaPartido] = { tipo: "partido" }
  calendario[diaFutsal] = { tipo: "futsal_entreno" }

  // Ordenar sesiones por buffer descendente (más críticas primero)
  const sesionesPendientes = [...sesiones].sort(
    (a, b) => b.buffer_minimo_horas - a.buffer_minimo_horas
  )

  for (const sesion of sesionesPendientes) {
    // Sesiones post-partido se colocan después del partido
    if (sesion.es_post_partido) {
      for (let offset = 1; offset <= 6; offset++) {
        const dia = DIAS[(idxPartido + offset) % 7]
        if (calendario[dia].tipo === "descanso") {
          calendario[dia] = { 
            tipo: "gym", 
            sesion_id: sesion.id, 
            estado: "normal" 
          }
          break
        }
      }
      continue
    }

    // Para sesiones pre-partido, buscar slot válido respetando buffers
    let colocada = false
    const bufferDias = Math.ceil(sesion.buffer_minimo_horas / 24)

    for (let offset = bufferDias; offset <= 6; offset++) {
      const idx = ((idxPartido - offset) + 7) % 7
      const dia = DIAS[idx]

      if (calendario[dia].tipo !== "descanso") continue

      // Verificar que no haya dos sesiones del mismo tipo consecutivas
      const idxAnterior = (idx - 1 + 7) % 7
      const entradaAnterior = calendario[DIAS[idxAnterior]]
      if (entradaAnterior.sesion_id) {
        const sesAnterior = sesiones.find(s => s.id === entradaAnterior.sesion_id)
        if (sesAnterior?.tipo === sesion.tipo) continue
      }

      const bufferReal = offset * 24

      // Si el buffer es insuficiente y hay versión liviana, usar esa
      if (bufferReal < sesion.buffer_minimo_horas && sesion.version_liviana_id) {
        calendario[dia] = {
          tipo: "gym",
          sesion_id: sesion.version_liviana_id,
          estado: "liviana",
          advertencia: `Buffer insuficiente (${bufferReal}hs < ${sesion.buffer_minimo_horas}hs). Versión liviana.`
        }
      } else {
        calendario[dia] = { 
          tipo: "gym", 
          sesion_id: sesion.id, 
          estado: "normal" 
        }
      }
      colocada = true
      break
    }

    // Si no se pudo colocar, marcar como pospuesta
    if (!colocada) {
      for (const dia of DIAS) {
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

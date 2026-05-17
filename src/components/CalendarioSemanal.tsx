import { useNavigate } from 'react-router-dom'
import type { DiaSemana, EntradaCalendario, Sesion } from '@/types'

const DIAS: DiaSemana[] = [
  "lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"
]

interface Props {
  calendario: Record<DiaSemana, EntradaCalendario>
  sesiones: Sesion[]
}

export default function CalendarioSemanal({ calendario, sesiones }: Props) {
  const navigate = useNavigate()

  const getSesionNombre = (sesionId?: string) => {
    if (!sesionId) return null
    const sesion = sesiones.find(s => s.id === sesionId)
    return sesion?.nombre || 'Sesión'
  }

  const getTipoColor = (tipo: EntradaCalendario['tipo']) => {
    switch (tipo) {
      case 'gym':
        return 'bg-blue-100 border-blue-300 text-blue-900'
      case 'partido':
        return 'bg-red-100 border-red-300 text-red-900'
      case 'futsal_entreno':
        return 'bg-yellow-100 border-yellow-300 text-yellow-900'
      case 'descanso':
        return 'bg-gray-100 border-gray-300 text-gray-600'
      case 'gym_cerrado':
        return 'bg-gray-200 border-gray-400 text-gray-700'
    }
  }

  const getTipoLabel = (entrada: EntradaCalendario) => {
    switch (entrada.tipo) {
      case 'gym':
        return getSesionNombre(entrada.sesion_id) || 'Gym'
      case 'partido':
        return 'Partido'
      case 'futsal_entreno':
        return 'Futsal'
      case 'descanso':
        return 'Descanso'
      case 'gym_cerrado':
        return 'Gym cerrado'
    }
  }

  return (
    <div className="space-y-2">
      {DIAS.map((dia) => {
        const entrada = calendario[dia]
        const esGym = entrada.tipo === 'gym'
        
        return (
          <button
            key={dia}
            onClick={() => esGym && entrada.sesion_id && navigate(`/sesion/${entrada.sesion_id}`)}
            disabled={!esGym}
            className={`w-full p-4 border-2 rounded-lg text-left transition ${
              getTipoColor(entrada.tipo)
            } ${esGym ? 'hover:scale-[1.02] active:scale-[0.98]' : ''}`}
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="text-xs font-semibold uppercase tracking-wide mb-1">
                  {dia}
                </div>
                <div className="font-bold">
                  {getTipoLabel(entrada)}
                </div>
                {entrada.estado === 'liviana' && (
                  <div className="text-xs mt-1 opacity-75">
                    Versión liviana
                  </div>
                )}
                {entrada.estado === 'pospuesta' && (
                  <div className="text-xs mt-1 opacity-75">
                    Pospuesta
                  </div>
                )}
              </div>
              {esGym && <div className="text-lg">→</div>}
            </div>
            {entrada.advertencia && (
              <div className="text-xs mt-2 opacity-75 leading-tight">
                ⚠️ {entrada.advertencia}
              </div>
            )}
          </button>
        )
      })}
    </div>
  )
}

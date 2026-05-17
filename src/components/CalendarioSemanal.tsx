import { useNavigate } from 'react-router-dom'
import type { DiaSemana, EntradaCalendario, Sesion } from '@/types'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

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

  const getTipoVariant = (tipo: EntradaCalendario['tipo']): "default" | "secondary" | "destructive" | "outline" => {
    switch (tipo) {
      case 'gym':
        return 'default'
      case 'partido':
        return 'destructive'
      case 'futsal_entreno':
        return 'secondary'
      case 'descanso':
      case 'gym_cerrado':
        return 'outline'
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
    <div className="space-y-3">
      {DIAS.map((dia) => {
        const entrada = calendario[dia]
        const esGym = entrada.tipo === 'gym'

        return (
          <Card
            key={dia}
            className={cn(
              "transition-all",
              esGym && "cursor-pointer hover:shadow-md active:scale-[0.98]"
            )}
            onClick={() => esGym && entrada.sesion_id && navigate(`/sesion/${entrada.sesion_id}`)}
          >
            <CardContent className="p-4">
              <div className="flex justify-between items-start gap-3">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {dia}
                    </span>
                    <Badge variant={getTipoVariant(entrada.tipo)} className="text-xs">
                      {getTipoLabel(entrada)}
                    </Badge>
                  </div>
                  {entrada.estado === 'liviana' && (
                    <Badge variant="secondary" className="text-xs">
                      Versión liviana
                    </Badge>
                  )}
                  {entrada.estado === 'pospuesta' && (
                    <Badge variant="outline" className="text-xs">
                      Pospuesta
                    </Badge>
                  )}
                  {entrada.advertencia && (
                    <p className="text-xs text-muted-foreground leading-tight">
                      ⚠️ {entrada.advertencia}
                    </p>
                  )}
                </div>
                {esGym && (
                  <div className="text-lg text-muted-foreground">→</div>
                )}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

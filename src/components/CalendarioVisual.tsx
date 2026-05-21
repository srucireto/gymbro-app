import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EventoCalendario {
  fecha: string // ISO date
  tipo: 'completada' | 'faltada'
  sesionNombre?: string
}

interface Props {
  eventos: EventoCalendario[]
  fechaInicioMesociclo?: string | null  // ISO date cuando empezó el mesociclo
  fechaFinMesociclo?: string | null     // ISO date cuando terminó el mesociclo
}

const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

export default function CalendarioVisual({ eventos, fechaInicioMesociclo, fechaFinMesociclo }: Props) {
  const [mesActual, setMesActual] = useState(new Date())
  const [diasDelMes, setDiasDelMes] = useState<Date[]>([])

  useEffect(() => {
    generarDiasDelMes()
  }, [mesActual])

  const generarDiasDelMes = () => {
    const año = mesActual.getFullYear()
    const mes = mesActual.getMonth()

    // Primer día del mes
    const primerDia = new Date(año, mes, 1)
    // Último día del mes
    const ultimoDia = new Date(año, mes + 1, 0)

    // Días a mostrar (incluyendo espacios vacíos al inicio)
    const dias: Date[] = []

    // Agregar días vacíos al inicio para alinear con el día de la semana
    const primerDiaSemana = primerDia.getDay()
    for (let i = 0; i < primerDiaSemana; i++) {
      dias.push(new Date(0)) // Fecha placeholder para días vacíos
    }

    // Agregar todos los días del mes
    for (let dia = 1; dia <= ultimoDia.getDate(); dia++) {
      dias.push(new Date(año, mes, dia))
    }

    setDiasDelMes(dias)
  }

  const mesAnterior = () => {
    setMesActual(new Date(mesActual.getFullYear(), mesActual.getMonth() - 1, 1))
  }

  const mesSiguiente = () => {
    setMesActual(new Date(mesActual.getFullYear(), mesActual.getMonth() + 1, 1))
  }

  const obtenerEventosDelDia = (fecha: Date): EventoCalendario[] => {
    if (fecha.getTime() === 0) return [] // Día vacío

    const fechaStr = fecha.toISOString().split('T')[0]
    return eventos.filter(evento => {
      const eventoFecha = new Date(evento.fecha).toISOString().split('T')[0]
      return eventoFecha === fechaStr
    })
  }

  const esHoy = (fecha: Date): boolean => {
    if (fecha.getTime() === 0) return false
    const hoy = new Date()
    return fecha.toDateString() === hoy.toDateString()
  }

  const estaDentroMesociclo = (fecha: Date): boolean => {
    if (fecha.getTime() === 0) return false
    if (!fechaInicioMesociclo) return false

    const fechaInicio = new Date(fechaInicioMesociclo)
    fechaInicio.setHours(0, 0, 0, 0)

    const fechaDia = new Date(fecha)
    fechaDia.setHours(0, 0, 0, 0)

    // Si no hay fecha fin, el mesociclo está en progreso
    if (!fechaFinMesociclo) {
      return fechaDia >= fechaInicio
    }

    const fechaFin = new Date(fechaFinMesociclo)
    fechaFin.setHours(0, 0, 0, 0)

    return fechaDia >= fechaInicio && fechaDia <= fechaFin
  }

  const esPrimerDiaMesociclo = (fecha: Date): boolean => {
    if (!fechaInicioMesociclo) return false
    const fechaInicio = new Date(fechaInicioMesociclo)
    return fecha.toDateString() === fechaInicio.toDateString()
  }

  const esUltimoDiaMesociclo = (fecha: Date): boolean => {
    if (!fechaFinMesociclo) return false
    const fechaFin = new Date(fechaFinMesociclo)
    return fecha.toDateString() === fechaFin.toDateString()
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            {MESES[mesActual.getMonth()]} {mesActual.getFullYear()}
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={mesAnterior}
              className="h-8 w-8"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={mesSiguiente}
              className="h-8 w-8"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Encabezado de días de la semana */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {DIAS_SEMANA.map(dia => (
            <div
              key={dia}
              className="text-center text-xs font-semibold text-muted-foreground p-2"
            >
              {dia}
            </div>
          ))}
        </div>

        {/* Grid de días */}
        <div className="grid grid-cols-7 gap-1">
          {diasDelMes.map((fecha, index) => {
            const esVacio = fecha.getTime() === 0
            const eventosDelDia = obtenerEventosDelDia(fecha)
            const tieneCompletada = eventosDelDia.some(e => e.tipo === 'completada')
            const tieneFaltada = eventosDelDia.some(e => e.tipo === 'faltada')
            const hoy = esHoy(fecha)
            const dentroMesociclo = estaDentroMesociclo(fecha)
            const primerDia = esPrimerDiaMesociclo(fecha)
            const ultimoDia = esUltimoDiaMesociclo(fecha)

            return (
              <div
                key={index}
                className={cn(
                  "aspect-square p-1 rounded-md relative transition-all",
                  esVacio && "opacity-0 pointer-events-none",
                  hoy && "ring-2 ring-primary",
                  // Fondo para días dentro del mesociclo
                  dentroMesociclo && !tieneCompletada && !tieneFaltada && "bg-blue-50/30",
                  // Días con eventos
                  tieneCompletada && "bg-green-100",
                  tieneFaltada && !tieneCompletada && "bg-gray-100",
                  // Días fuera del mesociclo sin eventos
                  !tieneCompletada && !tieneFaltada && !dentroMesociclo && "hover:bg-muted/50",
                  // Bordes especiales para inicio/fin del mesociclo
                  primerDia && "ring-2 ring-blue-500 ring-inset",
                  ultimoDia && "ring-2 ring-blue-700 ring-inset"
                )}
              >
                {!esVacio && (
                  <>
                    <div className={cn(
                      "text-sm font-medium",
                      tieneCompletada && "text-green-700",
                      tieneFaltada && !tieneCompletada && "text-gray-500",
                      (primerDia || ultimoDia) && !tieneCompletada && !tieneFaltada && "text-blue-700 font-bold"
                    )}>
                      {fecha.getDate()}
                    </div>

                    {/* Indicadores de eventos */}
                    {eventosDelDia.length > 0 && (
                      <div className="absolute bottom-1 left-1 right-1 flex gap-0.5 justify-center">
                        {tieneCompletada && (
                          <div className="h-1.5 w-1.5 rounded-full bg-green-600" />
                        )}
                        {tieneFaltada && (
                          <div className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            )
          })}
        </div>

        {/* Leyenda */}
        <div className="space-y-3 mt-4 pt-4 border-t">
          <div className="flex items-center flex-wrap gap-x-4 gap-y-2 text-sm">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-green-600" />
              <span className="text-muted-foreground">Completada</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-gray-400" />
              <span className="text-muted-foreground">Faltada</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded bg-blue-50/30 border border-blue-200" />
              <span className="text-muted-foreground">Mesociclo</span>
            </div>
          </div>
          {fechaInicioMesociclo && (
            <div className="text-xs text-muted-foreground">
              <span className="font-semibold text-blue-700">●</span> Bordes azules marcan inicio/fin del mesociclo
            </div>
          )}
        </div>

        {/* Resumen del mes */}
        {eventos.length > 0 && (() => {
          const eventosDelMes = eventos.filter(evento => {
            const eventoFecha = new Date(evento.fecha)
            return eventoFecha.getMonth() === mesActual.getMonth() &&
                   eventoFecha.getFullYear() === mesActual.getFullYear()
          })

          const completadas = eventosDelMes.filter(e => e.tipo === 'completada').length
          const faltadas = eventosDelMes.filter(e => e.tipo === 'faltada').length

          if (eventosDelMes.length === 0) return null

          return (
            <div className="mt-4 p-3 bg-muted rounded-lg">
              <div className="text-sm font-semibold mb-2">Resumen del mes</div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                    {completadas}
                  </Badge>
                  <span className="text-muted-foreground">Completadas</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-300">
                    {faltadas}
                  </Badge>
                  <span className="text-muted-foreground">Faltadas</span>
                </div>
              </div>
            </div>
          )
        })()}
      </CardContent>
    </Card>
  )
}

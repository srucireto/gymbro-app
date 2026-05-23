import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import {
  validateAndFilterTracking,
  calcularVolumenSeguro,
  normalizarGrupoMuscular,
  type TrackingRow
} from '@/lib/stats-validation'

interface DatoSemana {
  semanaNumero: number
  fechaInicio: string
  pesoPromedio: number
  repsPromedio: number
  volumenTotal: number
  // ✅ Acumuladores internos para cálculo correcto
  _sumatoriaPeso?: number
  _sumatoriaReps?: number
  _contadorSeries?: number
}

interface EjercicioProgreso {
  ejercicioId: string
  ejercicioNombre: string
  grupoMuscular: string
  datosProgreso: DatoSemana[]
}

export default function StatsProgreso() {
  const [ejercicios, setEjercicios] = useState<EjercicioProgreso[]>([])
  const [loading, setLoading] = useState(true)
  const [grupoActivo, setGrupoActivo] = useState<string>('')

  useEffect(() => {
    fetchProgreso()
  }, [])

  async function fetchProgreso() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: trackingData, error } = await supabase
        .from('tracking')
        .select(`
          *,
          ejercicio:ejercicios(id, nombre, grupo_muscular),
          semana:semanas(semana_numero, fecha_inicio)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })

      if (error) throw error

      // ✅ VALIDACIÓN: Filtrar datos inválidos
      const { validRows, invalidCount } = validateAndFilterTracking(
        (trackingData || []) as TrackingRow[],
        { logWarnings: true }
      )

      if (invalidCount > 0) {
        console.warn(`⚠️ StatsProgreso: ${invalidCount} filas excluidas por datos inválidos`)
      }

      const ejerciciosMap = new Map<string, EjercicioProgreso>()

      validRows.forEach((t) => {
        if (!t.ejercicio || !t.semana) return

        const key = t.ejercicio.id
        if (!ejerciciosMap.has(key)) {
          ejerciciosMap.set(key, {
            ejercicioId: t.ejercicio.id,
            ejercicioNombre: t.ejercicio.nombre,
            grupoMuscular: t.ejercicio.grupo_muscular,
            datosProgreso: []
          })
        }

        const ejercicio = ejerciciosMap.get(key)!

        // Buscar o crear dato de semana
        let datoSemana = ejercicio.datosProgreso.find(
          d => d.semanaNumero === t.semana.semana_numero && d.fechaInicio === t.semana.fecha_inicio
        )

        if (!datoSemana) {
          datoSemana = {
            semanaNumero: t.semana.semana_numero,
            fechaInicio: t.semana.fecha_inicio,
            pesoPromedio: 0,
            repsPromedio: 0,
            volumenTotal: 0,
            // Acumuladores para cálculo correcto
            _sumatoriaPeso: 0,
            _sumatoriaReps: 0,
            _contadorSeries: 0
          }
          ejercicio.datosProgreso.push(datoSemana)
        }

        // ✅ CÁLCULO CORRECTO: Acumular primero, promediar después
        if (t.peso !== null && t.peso !== undefined) {
          datoSemana._sumatoriaPeso! += Number(t.peso)
          datoSemana._contadorSeries! += 1
        }

        datoSemana._sumatoriaReps! += t.reps
        datoSemana.volumenTotal += calcularVolumenSeguro(t.peso, t.reps)
      })

      // ✅ CALCULAR PROMEDIOS AL FINAL (no incrementalmente)
      const ejerciciosList = Array.from(ejerciciosMap.values()).map(ej => ({
        ...ej,
        datosProgreso: ej.datosProgreso
          .map(d => ({
            semanaNumero: d.semanaNumero,
            fechaInicio: d.fechaInicio,
            pesoPromedio: d._contadorSeries! > 0
              ? d._sumatoriaPeso! / d._contadorSeries!
              : 0,
            repsPromedio: d._contadorSeries! > 0
              ? d._sumatoriaReps! / d._contadorSeries!
              : 0,
            volumenTotal: d.volumenTotal
          }))
          .sort((a, b) => a.semanaNumero - b.semanaNumero)
      }))

      setEjercicios(ejerciciosList)
    } catch (error) {
      console.error('Error fetching progreso:', error)
    } finally {
      setLoading(false)
    }
  }

  function calcularTendencia(datos: EjercicioProgreso['datosProgreso']) {
    if (datos.length < 2) return { tipo: 'neutral', porcentaje: 0 }

    const primero = datos[0]
    const ultimo = datos[datos.length - 1]
    const cambio = ((ultimo.pesoPromedio - primero.pesoPromedio) / primero.pesoPromedio) * 100

    if (Math.abs(cambio) < 2) return { tipo: 'neutral', porcentaje: 0 }
    return {
      tipo: cambio > 0 ? 'subiendo' : 'bajando',
      porcentaje: Math.abs(cambio)
    }
  }

  // Función movida a stats-validation.ts

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">Cargando progreso...</div>
        </CardContent>
      </Card>
    )
  }

  if (ejercicios.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Progreso de Peso</CardTitle>
          <CardDescription>
            Análisis de carga progresiva por ejercicio
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="mb-2">No hay datos de progreso aún</p>
            <p className="text-sm">
              Completa sesiones y registra el peso usado para ver tu evolución.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Agrupar ejercicios por grupo muscular normalizado
  const ejerciciosPorGrupo = ejercicios.reduce((acc, ej) => {
    const grupo = normalizarGrupoMuscular(ej.grupoMuscular)
    if (!acc[grupo]) {
      acc[grupo] = []
    }
    acc[grupo].push(ej)
    return acc
  }, {} as Record<string, typeof ejercicios>)

  const gruposOrdenados = Object.keys(ejerciciosPorGrupo).sort()

  // Establecer el primer grupo como activo si aún no hay uno seleccionado
  if (!grupoActivo && gruposOrdenados.length > 0) {
    setGrupoActivo(gruposOrdenados[0])
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Progreso de Peso</CardTitle>
          <CardDescription>
            {ejercicios.length} {ejercicios.length === 1 ? 'ejercicio' : 'ejercicios'} con seguimiento
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Leyenda explicativa */}
          <div className="p-3 bg-muted/30 rounded-lg">
            <div className="text-xs font-medium mb-2 text-muted-foreground">Guía del gráfico:</div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-8 h-0.5 bg-primary"></div>
                <span className="text-muted-foreground">Progresión de peso</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary border border-background"></div>
                <span className="text-muted-foreground">Peso de cada semana</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-4 bg-primary/10 border-b-2 border-primary"></div>
                <span className="text-muted-foreground">Zona de progreso</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
                  <path d="M2 8h12M10 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground"/>
                </svg>
                <span className="text-muted-foreground">Arrastra para ver más</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs navegables por músculo */}
      <Card className="sticky top-0 z-10 shadow-md">
        <CardContent className="p-2">
          <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-thin">
            {gruposOrdenados.map(grupo => {
              const isActive = grupoActivo === grupo
              return (
                <button
                  key={grupo}
                  onClick={() => {
                    setGrupoActivo(grupo)
                    const element = document.getElementById(`grupo-${grupo}`)
                    if (element) {
                      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
                    }
                  }}
                  className={`
                    px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors
                    ${isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                    }
                  `}
                >
                  <span className="capitalize">{grupo}</span>
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Ejercicios agrupados por músculo */}
      {gruposOrdenados.map(grupoMuscular => (
        <div
          key={grupoMuscular}
          id={`grupo-${grupoMuscular}`}
          className="space-y-3 scroll-mt-20"
        >
          <div className="px-2">
            <h3 className="text-sm font-semibold capitalize text-primary">
              {grupoMuscular}
            </h3>
          </div>

          {ejerciciosPorGrupo[grupoMuscular].map(ej => {
            const tendencia = calcularTendencia(ej.datosProgreso)
            const ultimosDatos = ej.datosProgreso

            return (
              <Card key={ej.ejercicioId}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{ej.ejercicioNombre}</CardTitle>
                      <CardDescription className="text-xs capitalize">
                        {ej.grupoMuscular}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-1 text-sm">
                      {tendencia.tipo === 'subiendo' && (
                        <>
                          <TrendingUp className="h-4 w-4 text-green-600" />
                          <span className="text-green-600 font-medium">+{tendencia.porcentaje.toFixed(1)}%</span>
                        </>
                      )}
                      {tendencia.tipo === 'bajando' && (
                        <>
                          <TrendingDown className="h-4 w-4 text-red-600" />
                          <span className="text-red-600 font-medium">-{tendencia.porcentaje.toFixed(1)}%</span>
                        </>
                      )}
                      {tendencia.tipo === 'neutral' && (
                        <>
                          <Minus className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-400 font-medium">~</span>
                        </>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="overflow-x-auto overflow-y-hidden pb-2">
                      <div
                        className="relative h-40 bg-muted/10 rounded-lg p-4"
                        style={{ minWidth: `${Math.max(ultimosDatos.length * 60, 320)}px` }}
                      >
                        <div className="absolute inset-x-4 top-4 h-full flex flex-col justify-between pb-8">
                          {[0, 1, 2, 3, 4].map((i) => (
                            <div key={i} className="border-b border-muted/30" />
                          ))}
                        </div>

                        <svg className="absolute inset-x-4 top-4 bottom-8 w-[calc(100%-2rem)]" preserveAspectRatio="none">
                          {(() => {
                            const maxPeso = Math.max(...ultimosDatos.map(d => d.pesoPromedio))
                            const minPeso = Math.min(...ultimosDatos.map(d => d.pesoPromedio))
                            const range = maxPeso - minPeso || 1
                            const padding = range * 0.1

                            const points = ultimosDatos.map((dato, index) => {
                              const x = (index / (ultimosDatos.length - 1)) * 100
                              const normalizedY = ((dato.pesoPromedio - minPeso + padding) / (range + 2 * padding)) * 100
                              const y = 100 - normalizedY
                              return `${x},${y}`
                            }).join(' ')

                            const pathD = ultimosDatos.map((dato, index) => {
                              const x = (index / (ultimosDatos.length - 1)) * 100
                              const normalizedY = ((dato.pesoPromedio - minPeso + padding) / (range + 2 * padding)) * 100
                              const y = 100 - normalizedY
                              return index === 0 ? `M ${x} ${y}` : `L ${x} ${y}`
                            }).join(' ')

                            const areaPathD = `${pathD} L 100 100 L 0 100 Z`

                            return (
                              <>
                                <path
                                  d={areaPathD}
                                  fill="hsl(var(--primary))"
                                  fillOpacity="0.1"
                                />
                                <polyline
                                  points={points}
                                  fill="none"
                                  stroke="hsl(var(--primary))"
                                  strokeWidth="3"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                                {ultimosDatos.map((dato, index) => {
                                  const x = (index / (ultimosDatos.length - 1)) * 100
                                  const normalizedY = ((dato.pesoPromedio - minPeso + padding) / (range + 2 * padding)) * 100
                                  const y = 100 - normalizedY
                                  return (
                                    <circle
                                      key={index}
                                      cx={`${x}%`}
                                      cy={`${y}%`}
                                      r="3"
                                      fill="hsl(var(--primary))"
                                      stroke="hsl(var(--background))"
                                      strokeWidth="1.5"
                                    />
                                  )
                                })}
                              </>
                            )
                          })()}
                        </svg>

                        <div className="absolute inset-x-4 bottom-0 flex justify-between">
                          {ultimosDatos.map((dato, index) => (
                            <div key={index} className="flex flex-col items-center gap-1" style={{ minWidth: '50px' }}>
                              <div className="text-xs font-bold">
                                {dato.pesoPromedio.toFixed(1)}
                              </div>
                              <div className="text-xs text-muted-foreground font-medium">
                                S{dato.semanaNumero}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t text-xs text-muted-foreground text-center">
                      {ultimosDatos[ultimosDatos.length - 1].repsPromedio.toFixed(1)} reps promedio · {ultimosDatos[ultimosDatos.length - 1].volumenTotal.toFixed(0)} kg total · {ultimosDatos.length} semanas
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ))}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface EjercicioProgreso {
  ejercicioId: string
  ejercicioNombre: string
  grupoMuscular: string
  datosProgreso: {
    semanaNumero: number
    fechaInicio: string
    pesoPromedio: number
    repsPromedio: number
    volumenTotal: number // peso × reps total
  }[]
}

export default function StatsProgreso() {
  const [ejercicios, setEjercicios] = useState<EjercicioProgreso[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProgreso()
  }, [])

  async function fetchProgreso() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Obtener tracking agrupado por ejercicio y semana
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

      // Agrupar por ejercicio y calcular promedios por semana
      const ejerciciosMap = new Map<string, EjercicioProgreso>()

      trackingData?.forEach((t: any) => {
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
        const semanaKey = `${t.semana.semana_numero}-${t.semana.fecha_inicio}`

        let datoSemana = ejercicio.datosProgreso.find(
          d => d.semanaNumero === t.semana.semana_numero && d.fechaInicio === t.semana.fecha_inicio
        )

        if (!datoSemana) {
          datoSemana = {
            semanaNumero: t.semana.semana_numero,
            fechaInicio: t.semana.fecha_inicio,
            pesoPromedio: 0,
            repsPromedio: 0,
            volumenTotal: 0
          }
          ejercicio.datosProgreso.push(datoSemana)
        }

        // Acumular para calcular promedio
        const count = ejercicio.datosProgreso.filter(
          d => d.semanaNumero === t.semana.semana_numero
        ).length

        datoSemana.pesoPromedio = ((datoSemana.pesoPromedio * (count - 1)) + Number(t.peso)) / count
        datoSemana.repsPromedio = ((datoSemana.repsPromedio * (count - 1)) + t.reps) / count
        datoSemana.volumenTotal += Number(t.peso) * t.reps
      })

      // Ordenar progreso por semana
      const ejerciciosList = Array.from(ejerciciosMap.values()).map(ej => ({
        ...ej,
        datosProgreso: ej.datosProgreso.sort((a, b) => a.semanaNumero - b.semanaNumero)
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

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Progreso de Peso</CardTitle>
          <CardDescription>
            {ejercicios.length} {ejercicios.length === 1 ? 'ejercicio' : 'ejercicios'} con seguimiento
          </CardDescription>
        </CardHeader>
      </Card>

      {ejercicios.map(ej => {
        const tendencia = calcularTendencia(ej.datosProgreso)
        const ultimosDatos = ej.datosProgreso.slice(-3) // Últimas 3 semanas

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
              {/* Gráfico de barras vertical */}
              <div className="space-y-3">
                <div className="flex items-end justify-between gap-2 h-32">
                  {ultimosDatos.map((dato, index) => {
                    const maxPeso = Math.max(...ultimosDatos.map(d => d.pesoPromedio))
                    const altura = (dato.pesoPromedio / maxPeso) * 100

                    return (
                      <div key={`${dato.semanaNumero}-${index}`} className="flex-1 flex flex-col items-center gap-2">
                        <div className="text-xs font-medium text-center">
                          {dato.pesoPromedio.toFixed(1)} kg
                        </div>
                        <div
                          className="w-full bg-primary rounded-t transition-all"
                          style={{ height: `${altura}%` }}
                        />
                        <div className="text-xs text-muted-foreground text-center">
                          S{dato.semanaNumero}
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="pt-2 border-t text-xs text-muted-foreground text-center">
                  {ultimosDatos[ultimosDatos.length - 1].repsPromedio.toFixed(1)} reps promedio · {ultimosDatos[ultimosDatos.length - 1].volumenTotal.toFixed(0)} kg total
                </div>
              </div>

              {ej.datosProgreso.length > 3 && (
                <div className="mt-2 pt-2 border-t text-xs text-muted-foreground text-center">
                  Últimas 3 de {ej.datosProgreso.length} semanas
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

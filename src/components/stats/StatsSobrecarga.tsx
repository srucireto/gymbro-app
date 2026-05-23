import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle } from 'lucide-react'
import { validateAndFilterTracking, type TrackingRow } from '@/lib/stats-validation'
import {
  analizarSobrecargaProgresiva,
  detectarEstancamientos,
  type AnalisisSobrecarga,
  type DeteccionEstancamiento
} from '@/lib/stats-sobrecarga'

export default function StatsSobrecarga() {
  const [ejercicios, setEjercicios] = useState<AnalisisSobrecarga[]>([])
  const [estancamientos, setEstancamientos] = useState<DeteccionEstancamiento[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSobrecarga()
  }, [])

  async function fetchSobrecarga() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: trackingData } = await supabase
        .from('tracking')
        .select(`
          *,
          ejercicio:ejercicios(id, nombre, grupo_muscular),
          semana:semanas(semana_numero, fecha_inicio)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })

      const { validRows } = validateAndFilterTracking(
        (trackingData || []) as TrackingRow[],
        { logWarnings: false }
      )

      // Obtener ejercicios únicos
      const ejerciciosMap = new Map<string, { id: string; nombre: string; grupo: string }>()
      validRows.forEach(t => {
        if (t.ejercicio && !ejerciciosMap.has(t.ejercicio.id)) {
          ejerciciosMap.set(t.ejercicio.id, {
            id: t.ejercicio.id,
            nombre: t.ejercicio.nombre,
            grupo: t.ejercicio.grupo_muscular
          })
        }
      })

      // Analizar sobrecarga de cada ejercicio
      const analisis: AnalisisSobrecarga[] = []

      ejerciciosMap.forEach(({ id, nombre, grupo }) => {
        const resultado = analizarSobrecargaProgresiva(id, nombre, grupo, validRows)
        // Solo mostrar ejercicios con al menos 2 semanas de datos
        if (resultado.semanas.length >= 2) {
          analisis.push(resultado)
        }
      })

      // Detectar estancamientos
      const estancados = detectarEstancamientos(validRows, 3)

      setEjercicios(analisis)
      setEstancamientos(estancados)
    } catch (error) {
      console.error('Error analizando sobrecarga:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">Analizando sobrecarga progresiva...</div>
        </CardContent>
      </Card>
    )
  }

  if (ejercicios.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">📈 Sobrecarga Progresiva</CardTitle>
          <CardDescription>Análisis de progresión de carga por ejercicio</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">
            No hay suficientes datos para analizar sobrecarga (mínimo 2 semanas por ejercicio)
          </div>
        </CardContent>
      </Card>
    )
  }

  const IconoEstado = ({ estado }: { estado: AnalisisSobrecarga['estadoProgresion'] }) => {
    switch (estado) {
      case 'progresando':
        return <TrendingUp className="h-4 w-4 text-green-600" />
      case 'regresando':
        return <TrendingDown className="h-4 w-4 text-red-600" />
      case 'estancado':
        return <Minus className="h-4 w-4 text-yellow-600" />
    }
  }

  return (
    <div className="space-y-4">
      {/* Alertas de estancamientos */}
      {estancamientos.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-yellow-900">
              <AlertTriangle className="h-5 w-5" />
              Ejercicios Estancados Detectados
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {estancamientos.map((e, i) => (
              <Alert key={i} className="bg-white border-yellow-300">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-sm">
                  <strong>{e.ejercicioNombre}</strong> lleva {e.semanasEstancado} semanas sin progreso
                  <div className="mt-2 space-y-1">
                    {e.sugerencias.map((s, j) => (
                      <div key={j} className="text-xs text-yellow-800">• {s}</div>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Lista de ejercicios */}
      {ejercicios.map(ej => (
        <Card key={ej.ejercicioId}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <IconoEstado estado={ej.estadoProgresion} />
                  {ej.ejercicioNombre}
                </CardTitle>
                <CardDescription className="text-xs capitalize">
                  {ej.grupoMuscular}
                </CardDescription>
              </div>
              <Badge
                variant={
                  ej.estadoProgresion === 'progresando' ? 'default' :
                  ej.estadoProgresion === 'regresando' ? 'destructive' :
                  'secondary'
                }
              >
                {ej.estadoProgresion}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Métricas de progreso */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-xs text-muted-foreground">Cambio Total</div>
                <div className="text-lg font-bold flex items-center gap-1">
                  {ej.metricasProgreso.incrementoPesoTotal > 0 ? '+' : ''}
                  {ej.metricasProgreso.incrementoPesoTotal}kg
                  <span className="text-sm font-normal text-muted-foreground">
                    ({ej.metricasProgreso.incrementoPorcentual > 0 ? '+' : ''}
                    {ej.metricasProgreso.incrementoPorcentual}%)
                  </span>
                </div>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-xs text-muted-foreground">Velocidad</div>
                <div className="text-lg font-bold">
                  {ej.metricasProgreso.velocidadProgreso > 0 ? '+' : ''}
                  {ej.metricasProgreso.velocidadProgreso}kg/sem
                </div>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-xs text-muted-foreground">Semanas Progreso</div>
                <div className="text-lg font-bold text-green-600">
                  {ej.metricasProgreso.semanasProgreso}
                </div>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-xs text-muted-foreground">Semanas Estancado</div>
                <div className="text-lg font-bold text-yellow-600">
                  {ej.metricasProgreso.semanasEstancamiento}
                </div>
              </div>
            </div>

            {/* Recomendación */}
            <Alert className={
              ej.estadoProgresion === 'progresando' ? 'bg-green-50 border-green-200' :
              ej.estadoProgresion === 'regresando' ? 'bg-red-50 border-red-200' :
              'bg-yellow-50 border-yellow-200'
            }>
              <CheckCircle className={`h-4 w-4 ${
                ej.estadoProgresion === 'progresando' ? 'text-green-600' :
                ej.estadoProgresion === 'regresando' ? 'text-red-600' :
                'text-yellow-600'
              }`} />
              <AlertDescription className="text-sm">
                <strong>Recomendación:</strong> {ej.recomendacion}
              </AlertDescription>
            </Alert>

            {/* Evolución semanal */}
            <div>
              <div className="text-sm font-semibold mb-2">Evolución Semanal</div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {ej.semanas.map(s => (
                  <div
                    key={s.semana}
                    className={`p-2 rounded border text-xs ${
                      s.estadoSemana === 'progreso' ? 'bg-green-50 border-green-200' :
                      s.estadoSemana === 'regresion' ? 'bg-red-50 border-red-200' :
                      s.estadoSemana === 'ausencia' ? 'bg-gray-50 border-gray-200' :
                      'bg-yellow-50 border-yellow-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-medium">Semana {s.semana}</div>
                      <div className="flex items-center gap-2">
                        {s.cambioVsSemanaAnterior && (
                          <span className={`text-xs font-semibold ${
                            s.cambioVsSemanaAnterior.peso > 0 ? 'text-green-700' :
                            s.cambioVsSemanaAnterior.peso < 0 ? 'text-red-700' :
                            'text-gray-600'
                          }`}>
                            {s.cambioVsSemanaAnterior.peso > 0 ? '+' : ''}
                            {s.cambioVsSemanaAnterior.peso}kg
                          </span>
                        )}
                        <span className="font-bold">{s.pesoPromedio}kg</span>
                      </div>
                    </div>
                    <div className="mt-1 text-muted-foreground">
                      {s.series} series × {s.repsPromedio} reps • {(s.volumenTotal / 1000).toFixed(1)}k kg vol • 1RM ~{s.rm1Estimado}kg
                    </div>
                    <div className="mt-1 text-xs italic">{s.explicacion}</div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

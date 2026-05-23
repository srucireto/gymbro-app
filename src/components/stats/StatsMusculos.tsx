import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Activity, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  validateAndFilterTracking,
  calcularVolumenSeguro,
  normalizarGrupoMuscular,
  type TrackingRow
} from '@/lib/stats-validation'

interface VolumenMuscular {
  grupoMuscular: string
  series: number
  repeticiones: number
  volumenTotal: number // peso × reps total
  ejercicios: string[] // nombres de ejercicios
}

export default function StatsMusculos() {
  const [volumenes, setVolumenes] = useState<VolumenMuscular[]>([])
  const [loading, setLoading] = useState(true)
  const [semanaActual, setSemanaActual] = useState<number | null>(null)

  useEffect(() => {
    fetchVolumenes()
  }, [])

  // Función movida a stats-validation.ts

  async function fetchVolumenes() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Obtener semana actual
      const hoy = new Date().toISOString().split('T')[0]
      const { data: semanaData } = await supabase
        .from('semanas')
        .select('semana_numero')
        .lte('fecha_inicio', hoy)
        .order('fecha_inicio', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (semanaData) {
        setSemanaActual(semanaData.semana_numero)
      }

      // Obtener tracking con ejercicio info
      const { data: trackingData, error } = await supabase
        .from('tracking')
        .select(`
          *,
          ejercicio:ejercicios(nombre, grupo_muscular, series),
          semana:semanas(semana_numero, fecha_inicio)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })

      if (error) throw error

      // ✅ VALIDACIÓN: Filtrar datos inválidos (NULL, relaciones rotas)
      const { validRows, warnings, invalidCount } = validateAndFilterTracking(
        (trackingData || []) as TrackingRow[],
        { logWarnings: true }
      )

      if (invalidCount > 0) {
        console.warn(`⚠️ StatsMusculos: ${invalidCount} filas de tracking excluidas por datos inválidos`)
      }

      // Agrupar por grupo muscular NORMALIZADO
      const musculosMap = new Map<string, VolumenMuscular>()

      validRows.forEach((t) => {
        if (!t.ejercicio) return

        const grupoNormalizado = normalizarGrupoMuscular(t.ejercicio.grupo_muscular)

        if (!musculosMap.has(grupoNormalizado)) {
          musculosMap.set(grupoNormalizado, {
            grupoMuscular: grupoNormalizado,
            series: 0,
            repeticiones: 0,
            volumenTotal: 0,
            ejercicios: []
          })
        }

        const musculo = musculosMap.get(grupoNormalizado)!
        musculo.series += 1
        musculo.repeticiones += t.reps

        // ✅ CÁLCULO SEGURO: Maneja NULL correctamente
        musculo.volumenTotal += calcularVolumenSeguro(t.peso, t.reps)

        // Agregar ejercicio si no está ya
        if (!musculo.ejercicios.includes(t.ejercicio.nombre)) {
          musculo.ejercicios.push(t.ejercicio.nombre)
        }
      })

      // Ordenar alfabéticamente por nombre del grupo
      const volumenesList = Array.from(musculosMap.values()).sort(
        (a, b) => a.grupoMuscular.localeCompare(b.grupoMuscular)
      )

      setVolumenes(volumenesList)
    } catch (error) {
      console.error('Error fetching volúmenes musculares:', error)
    } finally {
      setLoading(false)
    }
  }

  function detectarDesbalance() {
    if (volumenes.length < 2) return null

    const maxVolumen = Math.max(...volumenes.map(v => v.volumenTotal))
    const minVolumen = Math.min(...volumenes.map(v => v.volumenTotal))

    // Si la diferencia es mayor al 40%, hay desbalance
    const diferencia = ((maxVolumen - minVolumen) / maxVolumen) * 100

    if (diferencia > 40) {
      const musculoMayor = volumenes.find(v => v.volumenTotal === maxVolumen)!
      const musculoMenor = volumenes.find(v => v.volumenTotal === minVolumen)!

      return {
        mayor: musculoMayor.grupoMuscular,
        menor: musculoMenor.grupoMuscular,
        porcentaje: diferencia.toFixed(0)
      }
    }

    return null
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">Cargando volumen muscular...</div>
        </CardContent>
      </Card>
    )
  }

  if (volumenes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Volumen por Músculo</CardTitle>
          <CardDescription>
            Repeticiones efectivas y balance muscular
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="mb-2">No hay datos de volumen aún</p>
            <p className="text-sm">
              Completa sesiones para ver el análisis de volumen por grupo muscular.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const desbalance = detectarDesbalance()
  const totalVolumen = volumenes.reduce((sum, v) => sum + v.volumenTotal, 0)
  const totalSeries = volumenes.reduce((sum, v) => sum + v.series, 0)
  const totalReps = volumenes.reduce((sum, v) => sum + v.repeticiones, 0)

  return (
    <div className="space-y-4">
      {/* Resumen global */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Volumen por Músculo</CardTitle>
          <CardDescription>
            {semanaActual ? `Datos acumulados` : 'Análisis completo'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold">{totalSeries}</div>
              <div className="text-xs text-muted-foreground">Series</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{totalReps}</div>
              <div className="text-xs text-muted-foreground">Reps</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{(totalVolumen / 1000).toFixed(1)}k</div>
              <div className="text-xs text-muted-foreground">kg total</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alerta de desbalance */}
      {desbalance && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            <strong>Posible desbalance detectado:</strong> {desbalance.mayor} tiene {desbalance.porcentaje}% más volumen que {desbalance.menor}.
          </AlertDescription>
        </Alert>
      )}

      {/* Lista de músculos - Grid de 2 columnas */}
      <div className="grid grid-cols-2 gap-3">
        {volumenes.map((v, index) => {
          const porcentaje = (v.volumenTotal / totalVolumen) * 100

          return (
            <Card key={v.grupoMuscular}>
              <CardContent className="p-3">
                <div className="mb-2">
                  <div className="font-semibold capitalize text-sm">{v.grupoMuscular}</div>
                  <div className="text-xs text-muted-foreground">
                    {v.ejercicios.length} {v.ejercicios.length === 1 ? 'ej' : 'ejs'}
                  </div>
                </div>

                <div className="text-center mb-2">
                  <div className="text-2xl font-bold">{porcentaje.toFixed(0)}%</div>
                  <div className="text-xs text-muted-foreground">
                    {v.series} series
                  </div>
                </div>

                {/* Barra de progreso */}
                <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      index === 0 ? 'bg-primary' :
                      index === 1 ? 'bg-blue-500' :
                      index === 2 ? 'bg-green-500' :
                      'bg-gray-400'
                    }`}
                    style={{ width: `${porcentaje}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                  <span>{v.repeticiones} reps</span>
                  <span>{(v.volumenTotal / 1000).toFixed(1)}k kg</span>
                </div>

                {/* Lista de ejercicios */}
                <div className="pt-2 border-t text-xs text-muted-foreground">
                  {v.ejercicios.slice(0, 2).join(', ')}
                  {v.ejercicios.length > 2 && ` +${v.ejercicios.length - 2}`}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

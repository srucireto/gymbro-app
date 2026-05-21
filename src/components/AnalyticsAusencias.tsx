import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import type { Ausencia } from '@/types'

interface EstadisticasAusencias {
  totalAusencias: number
  porTipo: {
    unDia: number
    dosTresDias: number
    cuatroSieteDias: number
    masSieteDias: number
  }
  tasaRecuperacion: number
  checkInsCompletados: number
  checkInsPendientes: number
  ultimaAusencia: Ausencia | null
}

export default function AnalyticsAusencias() {
  const [stats, setStats] = useState<EstadisticasAusencias | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Obtener todas las ausencias del usuario
        const { data: ausencias, error } = await supabase
          .from('ausencias')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (error) throw error

        if (!ausencias || ausencias.length === 0) {
          setStats(null)
          return
        }

        // Calcular estadísticas
        const porTipo = {
          unDia: ausencias.filter(a => a.dias_fuera === 1).length,
          dosTresDias: ausencias.filter(a => a.dias_fuera === 2).length,
          cuatroSieteDias: ausencias.filter(a => a.dias_fuera === 3).length,
          masSieteDias: ausencias.filter(a => a.dias_fuera === 4).length
        }

        const ausenciasRecuperables = ausencias.filter(a => a.dias_fuera === 1)
        const sesionesRecuperadas = ausenciasRecuperables.filter(a => a.sesion_recuperada)
        const tasaRecuperacion = ausenciasRecuperables.length > 0
          ? Math.round((sesionesRecuperadas.length / ausenciasRecuperables.length) * 100)
          : 0

        const ausenciasConCheckIn = ausencias.filter(a => a.dias_fuera >= 2)
        const checkInsCompletados = ausenciasConCheckIn.filter(a => a.check_in_estado !== null).length
        const checkInsPendientes = ausenciasConCheckIn.filter(a => a.check_in_estado === null).length

        setStats({
          totalAusencias: ausencias.length,
          porTipo,
          tasaRecuperacion,
          checkInsCompletados,
          checkInsPendientes,
          ultimaAusencia: ausencias[0]
        })
      } catch (error) {
        console.error('Error fetching ausencias stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-sm text-muted-foreground">Cargando estadísticas...</div>
        </CardContent>
      </Card>
    )
  }

  if (!stats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">📊 Estadísticas de Ausencias</CardTitle>
          <CardDescription>No hay ausencias registradas aún</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const getTendencia = () => {
    if (stats.totalAusencias === 0) return null
    if (stats.totalAusencias <= 2) return { icon: TrendingUp, text: 'Excelente adherencia', color: 'text-green-600' }
    if (stats.totalAusencias <= 5) return { icon: Minus, text: 'Adherencia moderada', color: 'text-yellow-600' }
    return { icon: TrendingDown, text: 'Revisar consistencia', color: 'text-orange-600' }
  }

  const tendencia = getTendencia()

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">📊 Estadísticas de Ausencias</CardTitle>
              <CardDescription>Historial y análisis de sesiones faltadas</CardDescription>
            </div>
            {tendencia && (
              <div className={`flex items-center gap-1 ${tendencia.color}`}>
                <tendencia.icon className="h-4 w-4" />
                <span className="text-sm font-medium">{tendencia.text}</span>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Resumen general */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-muted rounded-lg">
              <div className="text-3xl font-bold">{stats.totalAusencias}</div>
              <div className="text-sm text-muted-foreground">Total de ausencias</div>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <div className="text-3xl font-bold">{stats.tasaRecuperacion}%</div>
              <div className="text-sm text-muted-foreground">Sesiones recuperadas</div>
            </div>
          </div>

          {/* Distribución por tipo */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Distribución por duración</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 rounded bg-blue-50">
                <span className="text-sm">1 día</span>
                <Badge variant="outline">{stats.porTipo.unDia}</Badge>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-yellow-50">
                <span className="text-sm">2-3 días</span>
                <Badge variant="outline">{stats.porTipo.dosTresDias}</Badge>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-orange-50">
                <span className="text-sm">4-7 días</span>
                <Badge variant="outline">{stats.porTipo.cuatroSieteDias}</Badge>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-red-50">
                <span className="text-sm">Más de 7 días</span>
                <Badge variant="outline">{stats.porTipo.masSieteDias}</Badge>
              </div>
            </div>
          </div>

          {/* Check-ins */}
          {(stats.checkInsCompletados > 0 || stats.checkInsPendientes > 0) && (
            <div>
              <h3 className="text-sm font-semibold mb-3">Estado de check-ins</h3>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="text-2xl font-bold text-green-700">{stats.checkInsCompletados}</div>
                  <div className="text-xs text-green-600">Completados</div>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="text-2xl font-bold text-blue-700">{stats.checkInsPendientes}</div>
                  <div className="text-xs text-blue-600">Pendientes</div>
                </div>
              </div>
            </div>
          )}

          {/* Última ausencia */}
          {stats.ultimaAusencia && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <strong>Última ausencia:</strong>{' '}
                {stats.ultimaAusencia.dias_fuera === 1 && '1 día'}
                {stats.ultimaAusencia.dias_fuera === 2 && '2-3 días'}
                {stats.ultimaAusencia.dias_fuera === 3 && '4-7 días'}
                {stats.ultimaAusencia.dias_fuera === 4 && 'Más de 7 días'}
                {' · '}
                {stats.ultimaAusencia.sesion_recuperada ? '✓ Recuperada' : stats.ultimaAusencia.check_in_estado ? '✓ Check-in completado' : 'Pendiente'}
              </AlertDescription>
            </Alert>
          )}

          {/* Insights */}
          {stats.porTipo.masSieteDias > 0 && (
            <Alert className="bg-orange-50 border-orange-200">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-sm text-orange-900">
                <strong>Atención:</strong> Has tenido {stats.porTipo.masSieteDias} ausencia{stats.porTipo.masSieteDias > 1 ? 's' : ''} prolongada{stats.porTipo.masSieteDias > 1 ? 's' : ''} (+7 días).
                Asegúrate de seguir el protocolo de vuelta progresiva para evitar lesiones.
              </AlertDescription>
            </Alert>
          )}

          {stats.tasaRecuperacion === 100 && stats.porTipo.unDia > 0 && (
            <Alert className="bg-green-50 border-green-200">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-sm text-green-900">
                <strong>¡Excelente!</strong> Has recuperado el 100% de las sesiones de 1 día.
                Esto muestra gran flexibilidad en tu planificación.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

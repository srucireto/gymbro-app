import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Activity, AlertTriangle, CheckCircle, TrendingDown } from 'lucide-react'
import { validateAndFilterTracking, type TrackingRow } from '@/lib/stats-validation'
import { analizarAsistencia, type SemanaCalendario, type DiaAnalizado } from '@/lib/stats-ausencias'
import {
  analizarInterferenciaFutsalGym,
  type AnalisisInterferencia
} from '@/lib/stats-futsal-gym'

export default function StatsFutsalGym() {
  const [analisis, setAnalisis] = useState<AnalisisInterferencia | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAnalisis()
  }, [])

  async function fetchAnalisis() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Obtener tracking
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

      // Obtener semanas con calendario
      const { data: semanas } = await supabase
        .from('semanas')
        .select('*')
        .eq('user_id', user.id)
        .order('fecha_inicio', { ascending: true })

      if (!semanas || semanas.length === 0) {
        setAnalisis(null)
        return
      }

      // Analizar asistencia
      const diasAnalizados = analizarAsistencia(
        semanas as SemanaCalendario[],
        validRows
      )

      // Analizar interferencia
      const resultado = analizarInterferenciaFutsalGym(
        semanas as SemanaCalendario[],
        diasAnalizados,
        validRows
      )

      setAnalisis(resultado)
    } catch (error) {
      console.error('Error analizando interferencia Futsal-Gym:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">Analizando interferencia Futsal-Gym...</div>
        </CardContent>
      </Card>
    )
  }

  if (!analisis || analisis.totalEventosFutsal === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">⚽️ Interferencia Futsal-Gym</CardTitle>
          <CardDescription>Impacto de partidos/entrenamientos de futsal en rendimiento de gym</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">
            No hay eventos de futsal registrados en el calendario
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Resumen */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Interferencia Futsal-Gym
          </CardTitle>
          <CardDescription>
            Análisis de {analisis.totalEventosFutsal} eventos de futsal y su impacto en {analisis.totalSesionesGymPostFutsal} sesiones de gym
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Estadísticas generales */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-muted rounded-lg">
              <div className="text-xs text-muted-foreground">Rendimiento Normal</div>
              <div className="text-lg font-bold">
                {analisis.estadisticas.rendimientoNormal.pesoPromedio}kg
              </div>
              <div className="text-xs text-muted-foreground">
                {(analisis.estadisticas.rendimientoNormal.volumenPromedio / 1000).toFixed(1)}k kg vol
              </div>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <div className="text-xs text-muted-foreground">Post-Futsal</div>
              <div className="text-lg font-bold flex items-center gap-1">
                {analisis.estadisticas.rendimientoPostFutsal.pesoPromedio}kg
                <span className={`text-sm ${
                  analisis.estadisticas.impactoGlobal < 0 ? 'text-red-600' : 'text-green-600'
                }`}>
                  ({analisis.estadisticas.impactoGlobal > 0 ? '+' : ''}
                  {analisis.estadisticas.impactoGlobal}%)
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                {(analisis.estadisticas.rendimientoPostFutsal.volumenPromedio / 1000).toFixed(1)}k kg vol
              </div>
            </div>
          </div>

          {/* Impacto global */}
          {analisis.estadisticas.impactoGlobal < -5 && (
            <Alert className="bg-red-50 border-red-200">
              <TrendingDown className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-sm text-red-900">
                <strong>Interferencia significativa detectada:</strong> El futsal reduce el rendimiento en gym un {Math.abs(analisis.estadisticas.impactoGlobal)}% en promedio.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Impacto por día */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">📅 Impacto por Día Post-Futsal</CardTitle>
          <CardDescription className="text-xs">
            Rendimiento relativo vs. días normales (100% = sin cambio)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {analisis.impactoPorDia.map(d => (
            <div
              key={d.dia}
              className={`p-3 rounded border ${
                d.pesoPromedioRelativo < 85 ? 'bg-red-50 border-red-200' :
                d.pesoPromedioRelativo < 95 ? 'bg-yellow-50 border-yellow-200' :
                d.pesoPromedioRelativo < 105 ? 'bg-green-50 border-green-200' :
                'bg-blue-50 border-blue-200'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="font-semibold text-sm">{d.dia}</div>
                  <div className="text-xs text-muted-foreground">{d.sesiones} sesiones</div>
                </div>
                <div className="text-right">
                  <div className={`text-lg font-bold ${
                    d.pesoPromedioRelativo < 90 ? 'text-red-600' :
                    d.pesoPromedioRelativo < 100 ? 'text-yellow-600' :
                    'text-green-600'
                  }`}>
                    {d.pesoPromedioRelativo}%
                  </div>
                  <div className="text-xs text-muted-foreground">peso</div>
                </div>
              </div>
              <div className="text-xs">
                <strong>Volumen:</strong> {d.volumenPromedioRelativo}%
              </div>
              <div className="text-xs mt-1 italic">{d.interpretacion}</div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Patrones detectados */}
      {analisis.patronesDetectados.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">🔍 Patrones Detectados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {analisis.patronesDetectados.map((patron, i) => (
              <Alert
                key={i}
                className={
                  patron.tipo === 'fatiga_D+1' ? 'bg-yellow-50 border-yellow-200' :
                  patron.tipo === 'ausencias_post_partido' ? 'bg-red-50 border-red-200' :
                  'bg-blue-50 border-blue-200'
                }
              >
                <AlertTriangle className={`h-4 w-4 ${
                  patron.tipo === 'fatiga_D+1' ? 'text-yellow-600' :
                  patron.tipo === 'ausencias_post_partido' ? 'text-red-600' :
                  'text-blue-600'
                }`} />
                <AlertDescription className="text-sm">
                  <strong>{patron.descripcion}</strong>
                  <div className="mt-1 text-xs">{patron.evidencia}</div>
                </AlertDescription>
              </Alert>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Recomendaciones */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2 text-blue-900">
            <CheckCircle className="h-5 w-5" />
            Recomendaciones
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {analisis.recomendaciones.map((rec, i) => (
            <div key={i} className="p-3 bg-white rounded border border-blue-200 text-sm">
              {rec}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Leyenda */}
      <Card>
        <CardContent className="pt-6">
          <div className="text-xs text-muted-foreground space-y-1">
            <div><strong>D+0:</strong> Mismo día del evento de futsal</div>
            <div><strong>D+1:</strong> 24 horas después</div>
            <div><strong>D+2:</strong> 48 horas después</div>
            <div><strong>D+3+:</strong> 72 horas o más después</div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

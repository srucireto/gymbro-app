import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, TrendingUp, TrendingDown, Minus, CheckCircle, XCircle } from 'lucide-react'
import { validateAndFilterTracking, normalizarGrupoMuscular, type TrackingRow } from '@/lib/stats-validation'
import { analizarAsistencia, type SemanaCalendario } from '@/lib/stats-ausencias'
import {
  generarReporteMusculo,
  imprimirReporte,
  type ReporteAuditoriaMusculo
} from '@/lib/stats-auditoria'

export default function StatsAuditoria() {
  const [reportes, setReportes] = useState<ReporteAuditoriaMusculo[]>([])
  const [loading, setLoading] = useState(true)
  const [debugMode, setDebugMode] = useState(false)

  useEffect(() => {
    fetchAuditoria()
  }, [])

  async function fetchAuditoria() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // 1. Obtener tracking con validación
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
        { logWarnings: debugMode }
      )

      // 2. Obtener calendario de semanas
      const { data: semanas } = await supabase
        .from('semanas')
        .select('*')
        .eq('user_id', user.id)
        .order('fecha_inicio', { ascending: true })

      if (!semanas || semanas.length === 0) {
        setReportes([])
        return
      }

      // 3. Analizar asistencia
      const diasAnalizados = analizarAsistencia(
        semanas as SemanaCalendario[],
        validRows
      )

      // 4. Agrupar tracking por músculo
      const musculosMap = new Map<string, TrackingRow[]>()

      validRows.forEach(t => {
        if (!t.ejercicio) return
        const grupoNormalizado = normalizarGrupoMuscular(t.ejercicio.grupo_muscular)

        if (!musculosMap.has(grupoNormalizado)) {
          musculosMap.set(grupoNormalizado, [])
        }
        musculosMap.get(grupoNormalizado)!.push(t)
      })

      // 5. Generar reportes de auditoría para cada músculo
      const reportesGenerados: ReporteAuditoriaMusculo[] = []

      musculosMap.forEach((trackingMusculo, musculo) => {
        const reporte = generarReporteMusculo(
          musculo,
          trackingMusculo,
          diasAnalizados
        )

        reportesGenerados.push(reporte)

        // Imprimir en consola si está en modo debug
        if (debugMode) {
          imprimirReporte(reporte)
        }
      })

      // Ordenar por nombre de músculo
      reportesGenerados.sort((a, b) => a.musculo.localeCompare(b.musculo))

      setReportes(reportesGenerados)
    } catch (error) {
      console.error('Error generando auditoría:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">Generando auditoría...</div>
        </CardContent>
      </Card>
    )
  }

  if (reportes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">📊 Auditoría de Datos</CardTitle>
          <CardDescription>Conexión 1:1 entre calendario y tracking</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">
            No hay datos suficientes para generar auditoría
          </div>
        </CardContent>
      </Card>
    )
  }

  const IconoConexion = ({ estado }: { estado: ReporteAuditoriaMusculo['conexion1a1'] }) => {
    switch (estado) {
      case 'VERIFICADO':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case '⚠️ ALERTA':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />
      case '❌ ERROR':
        return <XCircle className="h-4 w-4 text-red-600" />
    }
  }

  const IconoTendencia = ({ tendencia }: { tendencia: 'ascendente' | 'estancado' | 'descendente' }) => {
    switch (tendencia) {
      case 'ascendente':
        return <TrendingUp className="h-4 w-4 text-green-600" />
      case 'descendente':
        return <TrendingDown className="h-4 w-4 text-red-600" />
      case 'estancado':
        return <Minus className="h-4 w-4 text-gray-400" />
    }
  }

  return (
    <div className="space-y-4">
      {/* Header con modo debug */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">📊 Auditoría de Datos</CardTitle>
              <CardDescription>Conexión 1:1 entre calendario y tracking</CardDescription>
            </div>
            <button
              onClick={() => {
                setDebugMode(!debugMode)
                if (!debugMode) {
                  fetchAuditoria() // Recargar con logs
                }
              }}
              className="text-xs px-3 py-1 rounded bg-muted hover:bg-muted/80"
            >
              {debugMode ? '🐛 Debug ON' : 'Debug OFF'}
            </button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            {reportes.length} grupos musculares analizados
          </div>
        </CardContent>
      </Card>

      {/* Reportes por músculo */}
      {reportes.map(reporte => (
        <Card key={reporte.musculo}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-base capitalize flex items-center gap-2">
                  {reporte.musculo}
                  <IconoConexion estado={reporte.conexion1a1} />
                  <span className="text-xs font-normal text-muted-foreground">
                    {reporte.conexion1a1}
                  </span>
                </CardTitle>
                <CardDescription className="text-xs">
                  {reporte.asistencias} asistencias / {reporte.faltas} faltas
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <IconoTendencia tendencia={reporte.estadisticas.tendencia} />
                <span className={`text-sm font-medium ${
                  reporte.estadisticas.tendencia === 'ascendente' ? 'text-green-600' :
                  reporte.estadisticas.tendencia === 'descendente' ? 'text-red-600' :
                  'text-gray-400'
                }`}>
                  {reporte.estadisticas.porcentajeCambio > 0 ? '+' : ''}
                  {reporte.estadisticas.porcentajeCambio.toFixed(1)}%
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Alertas */}
            {reporte.alertas.length > 0 && (
              <Alert className="bg-yellow-50 border-yellow-200">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-sm text-yellow-900">
                  <strong>Alertas detectadas:</strong>
                  <ul className="mt-1 ml-4 list-disc">
                    {reporte.alertas.map((alerta, i) => (
                      <li key={i} className="text-xs">{alerta}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Estadísticas */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-xs text-muted-foreground">Volumen Total</div>
                <div className="text-lg font-bold">
                  {(reporte.estadisticas.volumenTotal / 1000).toFixed(1)}k kg
                </div>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-xs text-muted-foreground">Peso Máximo</div>
                <div className="text-lg font-bold">
                  {reporte.estadisticas.pesoMaximo} kg
                </div>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-xs text-muted-foreground">Prom/Semana</div>
                <div className="text-lg font-bold">
                  {(reporte.estadisticas.volumenPromedioPorSemana / 1000).toFixed(1)}k kg
                </div>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-xs text-muted-foreground">Tendencia</div>
                <div className="text-sm font-semibold capitalize">
                  {reporte.estadisticas.tendencia}
                </div>
              </div>
            </div>

            {/* Evolución de carga semanal */}
            <div>
              <div className="text-sm font-semibold mb-2">Evolución de Carga</div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {reporte.evolucionCarga.map(e => (
                  <div
                    key={e.semana}
                    className={`p-2 rounded border text-xs ${
                      e.razon === 'ausencia_detectada' ? 'bg-yellow-50 border-yellow-200' :
                      e.razon === 'enfermedad' ? 'bg-red-50 border-red-200' :
                      e.volumen === 0 ? 'bg-gray-50 border-gray-200' :
                      'bg-green-50 border-green-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-medium">Semana {e.semana}</div>
                      <div className="flex items-center gap-2">
                        {e.razon && e.razon !== 'normal' && (
                          <Badge variant="outline" className="text-xs">
                            {e.razon === 'ausencia_detectada' ? '⚠️ Ausencia' : '🤒 Enfermedad'}
                          </Badge>
                        )}
                        <span className="font-semibold">
                          {(e.volumen / 1000).toFixed(1)}k kg
                        </span>
                      </div>
                    </div>
                    <div className="mt-1 text-muted-foreground">
                      {e.series} series × {e.pesoPromedio}kg promedio
                      {e.explicacion && ` • ${e.explicacion}`}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Fórmula de volumen */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded">
              <div className="text-xs font-medium text-blue-900 mb-1">📐 Fórmula de Cálculo</div>
              <pre className="text-xs text-blue-700 whitespace-pre-wrap font-mono">
                {reporte.formulaVolumen}
              </pre>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

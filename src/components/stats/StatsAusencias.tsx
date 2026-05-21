import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, TrendingUp, TrendingDown, Minus, Calendar as CalendarIcon } from 'lucide-react'
import type { Ausencia, DiaSemana, EntradaCalendario } from '@/types'
import CalendarioVisual from '@/components/CalendarioVisual'

interface EstadisticasAusencias {
  totalAusencias: number
  porTipo: {
    unDia: number
    dosTresDias: number
    cuatroSieteDias: number
    masSieteDias: number
  }
  tasaRecuperacion: number
  ultimaAusencia: Ausencia | null
}

interface EventoCalendario {
  fecha: string
  tipo: 'completada' | 'faltada'
  sesionNombre?: string
}

interface InfoMesociclo {
  semanaNumero: number
  semanasTotal: number
  fechaInicio: string | null
  fechaFin: string | null
  rutinaNombre: string
}

export default function StatsAusencias() {
  const [stats, setStats] = useState<EstadisticasAusencias | null>(null)
  const [eventos, setEventos] = useState<EventoCalendario[]>([])
  const [mesociclo, setMesociclo] = useState<InfoMesociclo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          console.error('Usuario no autenticado')
          setLoading(false)
          return
        }

        console.log('🔍 Cargando estadísticas de ausencias para userId:', user.id)

        // Obtener la semana actual y la rutina para información del mesociclo
        // RLS filtrará automáticamente por user_id
        const { data: semanasData, error: semanasError } = await supabase
          .from('semanas')
          .select('*, rutina:rutinas(nombre, semanas_duracion)')
          .order('created_at', { ascending: false })
          .limit(1)

        console.log('📊 Semana actual query:', { semanasData, semanasError })

        if (semanasData && semanasData.length > 0) {
          const semanaActual = semanasData[0]
          const rutina = Array.isArray(semanaActual.rutina)
            ? semanaActual.rutina[0]
            : semanaActual.rutina

          console.log('📊 Rutina extraída:', rutina)

          setMesociclo({
            semanaNumero: semanaActual.semana_numero,
            semanasTotal: rutina?.semanas_duracion || 6,
            fechaInicio: semanaActual.fecha_inicio_real || null,
            fechaFin: semanaActual.fecha_fin_real || null,
            rutinaNombre: rutina?.nombre || 'Rutina'
          })
        } else {
          console.log('⚠️ No se encontró semana actual')
        }

        // Obtener todas las semanas para extraer eventos del calendario
        // RLS filtrará automáticamente por user_id
        const { data: semanas } = await supabase
          .from('semanas')
          .select('id, fecha_inicio, calendario, rutina_id')
          .order('fecha_inicio', { ascending: true })

        // Extraer eventos del calendario
        const eventosExtraidos: EventoCalendario[] = []
        const DIAS: DiaSemana[] = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo']

        semanas?.forEach((semana) => {
          const calendario = semana.calendario as Record<DiaSemana, EntradaCalendario>
          const fechaInicioSemana = new Date(semana.fecha_inicio)

          DIAS.forEach((dia, index) => {
            const entrada = calendario[dia]
            if (!entrada || entrada.tipo !== 'gym') return

            // Calcular la fecha real del día
            const fechaDia = new Date(fechaInicioSemana)
            fechaDia.setDate(fechaDia.getDate() + index)

            // Si tiene timestamp de completada/faltada, usar ese
            if (entrada.fecha_completada) {
              eventosExtraidos.push({
                fecha: entrada.fecha_completada,
                tipo: 'completada',
                sesionNombre: entrada.sesion_id
              })
            } else if (entrada.fecha_faltada) {
              eventosExtraidos.push({
                fecha: entrada.fecha_faltada,
                tipo: 'faltada',
                sesionNombre: entrada.sesion_id
              })
            } else if (entrada.estado === 'completada') {
              // Fallback: si está marcada como completada pero no tiene timestamp
              eventosExtraidos.push({
                fecha: fechaDia.toISOString(),
                tipo: 'completada',
                sesionNombre: entrada.sesion_id
              })
            } else if (entrada.estado === 'faltada') {
              // Fallback: si está marcada como faltada pero no tiene timestamp
              eventosExtraidos.push({
                fecha: fechaDia.toISOString(),
                tipo: 'faltada',
                sesionNombre: entrada.sesion_id
              })
            }
          })
        })

        setEventos(eventosExtraidos)
        console.log('📅 Eventos extraídos:', eventosExtraidos.length, eventosExtraidos)
        console.log('📊 Mesociclo:', mesociclo)
        console.log('📊 Semanas encontradas:', semanas?.length)

        // Obtener todas las ausencias del usuario
        // RLS filtrará automáticamente por user_id
        const { data: ausencias, error } = await supabase
          .from('ausencias')
          .select('*')
          .order('created_at', { ascending: false })

        if (error) throw error

        console.log('📊 Ausencias encontradas:', ausencias?.length || 0, ausencias)

        if (!ausencias || ausencias.length === 0) {
          setStats(null)
          return
        }

        // Agrupar ausencias consecutivas
        const dias = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo']
        const ausenciasOrdenadas = [...ausencias].sort((a, b) => {
          const dateA = new Date(a.created_at)
          const dateB = new Date(b.created_at)
          return dateA.getTime() - dateB.getTime()
        })

        const gruposConsecutivos: number[] = []
        let grupoActual = 1
        let diaAnterior: string | null = null
        let fechaAnterior: Date | null = null

        ausenciasOrdenadas.forEach((ausencia, index) => {
          const fechaActual = new Date(ausencia.created_at)
          const diaActual = ausencia.dia_faltado

          if (index === 0) {
            // Primera ausencia
            diaAnterior = diaActual
            fechaAnterior = fechaActual
          } else {
            const diaAnteriorIdx = dias.indexOf(diaAnterior!)
            const diaActualIdx = dias.indexOf(diaActual)

            // Calcular diferencia de días entre fechas
            const diffTime = fechaActual.getTime() - fechaAnterior!.getTime()
            const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24))

            // Son consecutivos si:
            // 1. Es el día siguiente en la semana (ej: martes después de lunes)
            // 2. O es lunes después de domingo (cambio de semana)
            // 3. Y la diferencia de fechas es <= 2 días (para manejar fines de semana)
            const esConsecutivo = (
              (diaActualIdx === diaAnteriorIdx + 1) ||
              (diaAnterior === 'domingo' && diaActual === 'lunes')
            ) && diffDays <= 2

            if (esConsecutivo) {
              grupoActual++
            } else {
              gruposConsecutivos.push(grupoActual)
              grupoActual = 1
            }

            diaAnterior = diaActual
            fechaAnterior = fechaActual
          }
        })
        // Agregar el último grupo
        gruposConsecutivos.push(grupoActual)

        console.log('📊 Grupos consecutivos:', gruposConsecutivos)

        // Clasificar grupos por duración
        const porTipo = {
          unDia: gruposConsecutivos.filter(g => g === 1).length,
          dosTresDias: gruposConsecutivos.filter(g => g >= 2 && g <= 3).length,
          cuatroSieteDias: gruposConsecutivos.filter(g => g >= 4 && g <= 7).length,
          masSieteDias: gruposConsecutivos.filter(g => g > 7).length
        }

        // Tasa de recuperación (basada en ausencias individuales recuperadas)
        const sesionesRecuperadas = ausencias.filter(a => a.sesion_recuperada)
        const tasaRecuperacion = ausencias.length > 0
          ? Math.round((sesionesRecuperadas.length / ausencias.length) * 100)
          : 0

        setStats({
          totalAusencias: gruposConsecutivos.length, // Total de períodos de ausencia
          porTipo,
          tasaRecuperacion,
          ultimaAusencia: ausencias[0]
        })
      } catch (error) {
        console.error('Error fetching ausencias stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()

    // Recargar cuando la página se vuelve visible (cuando vuelves de otra página)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('👀 Página visible, recargando estadísticas...')
        fetchStats()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
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
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Cuando faltes a una sesión, aquí verás análisis de tu consistencia y patrones de ausencias.
          </div>
        </CardContent>
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

  const formatearFecha = (fechaISO: string | null): string => {
    if (!fechaISO) return 'No iniciado'
    const fecha = new Date(fechaISO)
    return fecha.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  return (
    <div className="space-y-4">
      {/* Información del Mesociclo */}
      {mesociclo && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">{mesociclo.rutinaNombre}</CardTitle>
            </div>
            <CardDescription>
              Semana {mesociclo.semanaNumero} de {mesociclo.semanasTotal}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 gap-3">
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">Fecha de inicio real</div>
                <div className="text-sm font-semibold">
                  {formatearFecha(mesociclo.fechaInicio)}
                </div>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">Fecha de finalización</div>
                <div className="text-sm font-semibold">
                  {mesociclo.fechaFin ? formatearFecha(mesociclo.fechaFin) : 'En progreso'}
                </div>
              </div>
            </div>
            {mesociclo.fechaInicio && mesociclo.fechaFin && (
              <div className="text-xs text-muted-foreground pt-2 border-t">
                Duración total:{' '}
                {Math.ceil(
                  (new Date(mesociclo.fechaFin).getTime() - new Date(mesociclo.fechaInicio).getTime()) /
                  (1000 * 60 * 60 * 24)
                )}{' '}
                días
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Calendario Visual */}
      <CalendarioVisual
        eventos={eventos}
        fechaInicioMesociclo={mesociclo?.fechaInicio}
        fechaFinMesociclo={mesociclo?.fechaFin}
      />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">📊 Resumen de Ausencias</CardTitle>
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
                {stats.ultimaAusencia.sesion_recuperada ? '✓ Recuperada' : 'Pendiente'}
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

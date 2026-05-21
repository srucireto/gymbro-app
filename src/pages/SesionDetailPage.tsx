import { useEffect, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import type { Sesion, Ejercicio, Tracking, DiaSemana, EntradaCalendario } from '@/types'
import SlideToConfirm from '@/components/SlideToConfirm'
import MessageDialog from '@/components/MessageDialog'
import ConfirmDialog from '@/components/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { AlertCircle, Play, CheckCircle2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export default function SesionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()

  // State from navigation (if passed)
  const navState = location.state as { semanaId?: string; dia?: DiaSemana; diaPartido?: DiaSemana } | null

  const [sesion, setSesion] = useState<Sesion | null>(null)
  const [ejercicios, setEjercicios] = useState<Ejercicio[]>([])
  const [tracking, setTracking] = useState<Record<string, Tracking[]>>({})
  const [expandido, setExpandido] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)

  // Illness logic state
  const [semanaId, setSemanaId] = useState<string | null>(navState?.semanaId || null)
  const [dia, setDia] = useState<DiaSemana | null>(navState?.dia || null)
  const [showCompletarDialog, setShowCompletarDialog] = useState(false)
  const [ejerciciosIncompletos, setEjerciciosIncompletos] = useState<string[]>([])
  const [userId, setUserId] = useState<string | null>(null)

  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    title: string
    description: string
    onConfirm: () => void
  }>({ open: false, title: '', description: '', onConfirm: () => {} })

  // Message dialog state
  const [messageDialog, setMessageDialog] = useState<{
    open: boolean
    title: string
    message: string
    variant: 'default' | 'success' | 'error'
  }>({ open: false, title: '', message: '', variant: 'default' })

  useEffect(() => {
    async function fetchSesion() {
      if (!id) {
        console.log('No hay ID de sesión')
        return
      }

      console.log('Buscando sesión con ID:', id)

      try {
        // Obtener sesión (no requiere autenticación)
        const { data: sesionData, error: sesionError } = await supabase
          .from('sesiones')
          .select('*')
          .eq('id', id)
          .single()

        console.log('Resultado de búsqueda de sesión:', { sesionData, sesionError })

        if (sesionError) throw sesionError
        setSesion(sesionData)

        // Obtener ejercicios (no requiere autenticación)
        const { data: ejerciciosData, error: ejerciciosError } = await supabase
          .from('ejercicios')
          .select('*')
          .eq('sesion_id', id)
          .order('orden')

        if (ejerciciosError) throw ejerciciosError
        setEjercicios(ejerciciosData || [])

        // Obtener usuario (requerido con autenticación)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          console.error('Usuario no autenticado')
          throw new Error('Usuario no autenticado')
        }
        console.log('Usuario encontrado:', user.id)
        setUserId(user.id)

        // Obtener tracking existente
        // RLS filtrará automáticamente por user_id
        const { data: trackingData } = await supabase
          .from('tracking')
          .select('*')
          .in('ejercicio_id', (ejerciciosData || []).map(e => e.id))
          .order('numero_serie', { ascending: true })

        // Agrupar por ejercicio_id
        const trackingMap: Record<string, Tracking[]> = {}
        trackingData?.forEach(t => {
          if (!trackingMap[t.ejercicio_id]) {
            trackingMap[t.ejercicio_id] = []
          }
          trackingMap[t.ejercicio_id].push(t)
        })
        setTracking(trackingMap)

        // Si no tenemos semana/dia del nav state, intentar obtenerlo del calendario
        if (!semanaId || !dia) {
          // RLS filtrará automáticamente por user_id
          const { data: semanaActual } = await supabase
            .from('semanas')
            .select('id, dia_partido, calendario')
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

            if (semanaActual) {
              setSemanaId(semanaActual.id)

              // Buscar en qué día está programada esta sesión en el calendario JSONB
              const calendario = semanaActual.calendario as Record<DiaSemana, EntradaCalendario>
              const diaEncontrado = Object.entries(calendario).find(
                ([_, entrada]) => entrada.sesion_id === id
              )?.[0] as DiaSemana | undefined

              if (diaEncontrado) {
                setDia(diaEncontrado)
              }
            }
          }
      } catch (error) {
        console.error('Error fetching sesion:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchSesion()
  }, [id, semanaId, dia])

  const handleTrackingChange = async (
    ejercicioId: string,
    numeroSerie: number,
    field: 'peso' | 'reps',
    value: string
  ) => {
    const numValue = value === '' ? null : parseFloat(value)

    // Obtener o crear el array de series para este ejercicio
    const seriesEjercicio = tracking[ejercicioId] || []

    // Buscar si ya existe un registro para esta serie
    let serieIndex = seriesEjercicio.findIndex(s => s.numero_serie === numeroSerie)

    let updatedSerie: Tracking

    if (serieIndex >= 0) {
      // Actualizar serie existente
      updatedSerie = {
        ...seriesEjercicio[serieIndex],
        [field]: numValue
      }
      seriesEjercicio[serieIndex] = updatedSerie
    } else {
      // Crear nueva serie
      updatedSerie = {
        id: crypto.randomUUID(),
        user_id: '',
        semana_id: semanaId || '',
        ejercicio_id: ejercicioId,
        numero_serie: numeroSerie as 1 | 2 | 3 | 4,
        [field]: numValue
      }
      seriesEjercicio.push(updatedSerie)
      seriesEjercicio.sort((a, b) => a.numero_serie - b.numero_serie)
    }

    setTracking({
      ...tracking,
      [ejercicioId]: seriesEjercicio
    })

    // Auto-save to database
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !semanaId) return

      const dataToUpsert = {
        ...updatedSerie,
        user_id: user.id,
        semana_id: semanaId
      }

      await supabase
        .from('tracking')
        .upsert(dataToUpsert, {
          onConflict: 'semana_id,ejercicio_id,numero_serie',
          ignoreDuplicates: false
        })
    } catch (error) {
      console.error('Error saving tracking:', error)
    }
  }

  const toggleExpandido = (ejercicioId: string) => {
    setExpandido({
      ...expandido,
      [ejercicioId]: !expandido[ejercicioId]
    })
  }

  const abrirVideoYouTube = (searchQuery: string) => {
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`
    window.open(url, '_blank')
  }

  const handleFaltarClick = () => {
    setConfirmDialog({
      open: true,
      title: 'Marcar como faltada',
      description: `¿Marcar la sesión de ${sesion?.nombre} como faltada? El calendario se reorganizará automáticamente.`,
      onConfirm: () => handleMissedSession()
    })
  }

  const handleMissedSession = async () => {
    if (!id || !semanaId || !dia) {
      setConfirmDialog({ ...confirmDialog, open: false })
      setMessageDialog({
        open: true,
        title: 'Error',
        message: 'No se puede marcar como faltada: falta información de contexto',
        variant: 'error'
      })
      return
    }

    if (!userId) {
      console.warn('No hay usuario autenticado, usando ID por defecto')
    }

    setConfirmDialog({ ...confirmDialog, open: false })

    try {
      // Obtener la semana actual con su calendario y sesiones
      const { data: semanaData, error: semanaError } = await supabase
        .from('semanas')
        .select('calendario, dia_partido, rutina_id')
        .eq('id', semanaId)
        .single()

      if (semanaError) throw semanaError

      // Obtener todas las sesiones de la rutina
      const { data: sesionesData, error: sesionesError } = await supabase
        .from('sesiones')
        .select('*')
        .eq('rutina_id', semanaData.rutina_id)

      if (sesionesError) throw sesionesError

      // Encontrar la sesión actual
      const sesionActual = sesionesData?.find(s => s.id === id)
      if (!sesionActual) {
        throw new Error('No se encontró la sesión')
      }

      // Importar la función de reorganización
      const { reorganizarCalendarioPorAusencia } = await import('@/lib/illness')

      // Siempre marcar como 1 día
      const diasFuera = 1

      // Reorganizar el calendario
      const resultado = reorganizarCalendarioPorAusencia(
        diasFuera,
        sesionActual,
        dia,
        semanaData.calendario,
        semanaData.dia_partido,
        sesionesData || []
      )

      // Agregar timestamp a la sesión faltada
      const ahora = new Date().toISOString()
      const calendarioConTimestamp = { ...resultado.nuevoCalendario }

      // Buscar la entrada que fue marcada como faltada y agregarle el timestamp
      Object.keys(calendarioConTimestamp).forEach((diaKey) => {
        const entrada = calendarioConTimestamp[diaKey as DiaSemana]
        if (entrada.estado === 'faltada' && diaKey === dia) {
          calendarioConTimestamp[diaKey as DiaSemana] = {
            ...entrada,
            fecha_faltada: ahora
          }
        }
      })

      // Actualizar el calendario en la BD
      const { error: updateError } = await supabase
        .from('semanas')
        .update({ calendario: calendarioConTimestamp })
        .eq('id', semanaId)

      if (updateError) throw updateError

      // Determinar si la sesión fue recuperada
      const sesionRecuperada = calendarioConTimestamp[dia]?.estado === 'recuperada' ||
                               Object.values(calendarioConTimestamp).some(
                                 e => e.estado === 'recuperada' && e.dia_original === dia
                               )

      const diaRecuperacion = Object.entries(calendarioConTimestamp).find(
        ([_, entrada]) => entrada.estado === 'recuperada' && entrada.dia_original === dia
      )?.[0] as DiaSemana | undefined

      // Crear registro de ausencia
      const { error: ausenciaError } = await supabase
        .from('ausencias')
        .insert({
          user_id: userId,
          semana_id: semanaId,
          sesion_id: id,
          dia_faltado: dia,
          dias_fuera: diasFuera,
          sesion_recuperada: sesionRecuperada,
          dia_recuperacion: diaRecuperacion
        })

      if (ausenciaError) throw ausenciaError

      // Mostrar mensaje según el resultado
      setMessageDialog({
        open: true,
        title: 'Sesión marcada como faltada',
        message: resultado.mensaje,
        variant: 'success'
      })

      // Volver al home después de 2 segundos
      setTimeout(() => navigate('/'), 2000)
    } catch (error) {
      console.error('Error marking session as missed:', error)

      // Only show error if it's a database error, not navigation
      if (error && typeof error === 'object' && 'code' in error) {
        setMessageDialog({
          open: true,
          title: 'Error',
          message: 'Error al marcar sesión como faltada: ' + (error as any).message,
          variant: 'error'
        })
      } else {
        // If it's not a database error, the operation likely succeeded
        console.warn('Non-critical error, operation may have succeeded:', error)
      }
    }
  }

  const handleCompletarSesion = () => {
    // Verificar qué ejercicios están incompletos
    const incompletos = ejercicios.filter(ejercicio => {
      const seriesTracking = tracking[ejercicio.id] || []
      const isCompleto = Array.from({ length: ejercicio.series }, (_, i) => i + 1).every(numSerie => {
        const serie = seriesTracking.find(s => s.numero_serie === numSerie)
        return serie && serie.peso !== null && serie.peso !== undefined &&
               serie.reps !== null && serie.reps !== undefined
      })
      return !isCompleto
    }).map(e => e.nombre)

    if (incompletos.length > 0) {
      setEjerciciosIncompletos(incompletos)
      setShowCompletarDialog(true)
    } else {
      // Todos completos, marcar sesión como completada
      completarSesion()
    }
  }

  const completarSesion = async () => {
    if (!semanaId || !dia) {
      console.error('No hay datos de semana o día')
      return
    }

    setShowCompletarDialog(false)

    try {
      // Obtener los datos actuales de la semana
      const { data: semanaData, error: semanaError } = await supabase
        .from('semanas')
        .select('*')
        .eq('id', semanaId)
        .single()

      if (semanaError) throw semanaError
      if (!semanaData) {
        throw new Error('No se encontró la semana')
      }

      const calendarioActual = semanaData.calendario as Record<DiaSemana, any>
      const ahora = new Date().toISOString()

      // Marcar la sesión como completada en el calendario con timestamp
      const nuevoCalendario = {
        ...calendarioActual,
        [dia]: {
          ...calendarioActual[dia],
          estado: 'completada',
          fecha_completada: ahora
        }
      }

      // Contar sesiones de gym completadas antes y después de este cambio
      const sesionesGymCompletadasAntes = Object.values(calendarioActual).filter(
        (entrada: any) => entrada.tipo === 'gym' && entrada.estado === 'completada'
      ).length

      const sesionesGymCompletadasDespues = Object.values(nuevoCalendario).filter(
        (entrada: any) => entrada.tipo === 'gym' && entrada.estado === 'completada'
      ).length

      const sesionesGymTotales = Object.values(nuevoCalendario).filter(
        (entrada: any) => entrada.tipo === 'gym'
      ).length

      // Preparar el objeto de actualización
      const updateData: any = { calendario: nuevoCalendario }

      // Si es la primera sesión completada, guardar fecha_inicio_real
      if (sesionesGymCompletadasAntes === 0 && sesionesGymCompletadasDespues === 1) {
        updateData.fecha_inicio_real = ahora
        console.log('🎉 Primera sesión del mesociclo completada, guardando fecha_inicio_real')
      }

      // Si es la última sesión, guardar fecha_fin_real
      if (sesionesGymCompletadasDespues === sesionesGymTotales) {
        updateData.fecha_fin_real = ahora
        console.log('🏁 Última sesión del mesociclo completada, guardando fecha_fin_real')
      }

      const { error } = await supabase
        .from('semanas')
        .update(updateData)
        .eq('id', semanaData.id)

      if (error) throw error

      console.log('✅ Sesión marcada como completada')

      setMessageDialog({
        open: true,
        title: '¡Sesión completada!',
        message: 'Has completado la sesión exitosamente. ¡Buen trabajo! 💪',
        variant: 'success'
      })
      setTimeout(() => navigate('/'), 2000)
    } catch (error) {
      console.error('Error al completar sesión:', error)
      setMessageDialog({
        open: true,
        title: 'Error',
        message: 'No se pudo guardar la sesión. Por favor, intenta de nuevo.',
        variant: 'error'
      })
    }
  }

  const handleCompletarConIncompletos = () => {
    // El usuario confirma que quiere completar aunque hay ejercicios incompletos
    completarSesion()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Cargando...</div>
      </div>
    )
  }

  if (!sesion) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Sesión no encontrada</div>
      </div>
    )
  }

  const tipoColor = sesion.tipo === 'pull' ? 'bg-blue-100 text-blue-900' : 'bg-green-100 text-green-900'

  return (
    <div className="min-h-screen bg-[#fafafa] pb-20">
      {/* Header sticky */}
      <div className="sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b border-border z-10">
        <div className="container mx-auto px-4 py-4 max-w-md">
          <Button
            onClick={() => navigate('/')}
            variant="ghost"
            size="sm"
            className="mb-3 -ml-2"
          >
            ← Volver
          </Button>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <h1 className="text-2xl font-bold tracking-tight">
                {sesion.nombre}
              </h1>
              <div className="flex gap-2 mt-2">
                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${tipoColor}`}>
                  {sesion.tipo.toUpperCase()}
                </span>
                <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-muted text-muted-foreground">
                  {sesion.intensidad}
                </span>
              </div>
            </div>
            {semanaId && dia && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleFaltarClick}
              >
                <AlertCircle className="h-4 w-4 mr-1" />
                Faltar
              </Button>
            )}
            {/* Debug info */}
            {import.meta.env.MODE === 'development' && (
              <div className="text-xs text-gray-500 mt-2">
                Debug: semana={semanaId?.slice(0,8) || 'null'} | dia={dia || 'null'} | userId={userId?.slice(0,8) || 'null'}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-md">
        <div className="space-y-6">
          {ejercicios.map((ejercicio, idx) => {
            const seriesTracking = tracking[ejercicio.id] || []
            const isExpandido = expandido[ejercicio.id]

            // Helper para obtener tracking de una serie específica
            const getSerieTracking = (numeroSerie: number) => {
              return seriesTracking.find(s => s.numero_serie === numeroSerie)
            }

            // Verificar si el ejercicio está completo
            const isCompleto = Array.from({ length: ejercicio.series }, (_, i) => i + 1).every(numSerie => {
              const serie = getSerieTracking(numSerie)
              return serie && serie.peso !== null && serie.peso !== undefined &&
                     serie.reps !== null && serie.reps !== undefined
            })

            return (
              <div
                key={ejercicio.id}
                className={`bg-card rounded-lg border overflow-hidden shadow-lg transition-all ${
                  isCompleto
                    ? 'border-green-300 bg-green-50/30'
                    : 'border-gray-200'
                }`}
              >
                <div className="p-5">
                  {/* Header del ejercicio */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="text-xs text-muted-foreground font-semibold">
                          EJERCICIO {idx + 1}
                        </div>
                        {isCompleto && (
                          <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300 text-xs">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Completado
                          </Badge>
                        )}
                      </div>
                      <h3 className="text-lg font-bold leading-tight mb-1">
                        {ejercicio.nombre}
                      </h3>
                      <div className="text-sm text-muted-foreground">
                        {ejercicio.grupo_muscular}
                      </div>
                    </div>
                    {ejercicio.youtube_search && (
                      <Button
                        onClick={() => abrirVideoYouTube(ejercicio.youtube_search!)}
                        variant="outline"
                        size="icon"
                        className="shrink-0 ml-3 h-9 w-9"
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  {/* Meta info */}
                  <div className="flex gap-4 text-sm font-semibold mb-4 pb-4 border-b border-border">
                    <div>
                      <span className="text-muted-foreground">Series:</span>{' '}
                      <span className="text-foreground">{ejercicio.series}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Reps:</span>{' '}
                      <span className="text-foreground">{ejercicio.reps_target}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">RIR:</span>{' '}
                      <span className="text-foreground">{ejercicio.rir_target}</span>
                    </div>
                  </div>

                  {/* Notas técnicas */}
                  {(ejercicio.notas || ejercicio.nota_ajuste) && (
                    <>
                      <Button
                        onClick={() => toggleExpandido(ejercicio.id)}
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start mb-3 h-auto py-2 font-semibold"
                      >
                        {isExpandido ? '▼' : '▶'} Notas técnicas
                      </Button>

                      {isExpandido && (
                        <Alert className="mb-4">
                          <AlertDescription className="text-sm space-y-2">
                            {ejercicio.notas && <p>{ejercicio.notas}</p>}
                            {ejercicio.nota_ajuste && (
                              <p className="text-orange-700 font-semibold">
                                ⚠️ {ejercicio.nota_ajuste}
                              </p>
                            )}
                          </AlertDescription>
                        </Alert>
                      )}
                    </>
                  )}

                  {/* Tracking */}
                  <div className="border-t border-border pt-4">
                    <div className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-4">
                      Tracking
                    </div>
                    <div className="space-y-3">
                      {/* Serie 1 */}
                      <div>
                        <div className="text-xs font-semibold text-gray-600 mb-1">Serie 1</div>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="number"
                            inputMode="decimal"
                            step="0.5"
                            placeholder="Peso (kg)"
                            value={getSerieTracking(1)?.peso ?? ''}
                            onChange={(e) => handleTrackingChange(ejercicio.id, 1, 'peso', e.target.value)}
                            className="px-3 py-2 border border-gray-200 rounded-lg text-center font-bold focus:border-blue-500 focus:outline-none placeholder:text-xs placeholder:font-normal placeholder:text-gray-400"
                          />
                          <input
                            type="number"
                            inputMode="numeric"
                            placeholder="Reps"
                            value={getSerieTracking(1)?.reps ?? ''}
                            onChange={(e) => handleTrackingChange(ejercicio.id, 1, 'reps', e.target.value)}
                            className="px-3 py-2 border border-gray-200 rounded-lg text-center font-bold focus:border-blue-500 focus:outline-none placeholder:text-xs placeholder:font-normal placeholder:text-gray-400"
                          />
                        </div>
                      </div>

                      {/* Serie 2 */}
                      <div>
                        <div className="text-xs font-semibold text-gray-600 mb-1">Serie 2</div>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="number"
                            inputMode="decimal"
                            step="0.5"
                            placeholder="Peso (kg)"
                            value={getSerieTracking(2)?.peso ?? ''}
                            onChange={(e) => handleTrackingChange(ejercicio.id, 2, 'peso', e.target.value)}
                            className="px-3 py-2 border border-gray-200 rounded-lg text-center font-bold focus:border-blue-500 focus:outline-none placeholder:text-xs placeholder:font-normal placeholder:text-gray-400"
                          />
                          <input
                            type="number"
                            inputMode="numeric"
                            placeholder="Reps"
                            value={getSerieTracking(2)?.reps ?? ''}
                            onChange={(e) => handleTrackingChange(ejercicio.id, 2, 'reps', e.target.value)}
                            className="px-3 py-2 border border-gray-200 rounded-lg text-center font-bold focus:border-blue-500 focus:outline-none placeholder:text-xs placeholder:font-normal placeholder:text-gray-400"
                          />
                        </div>
                      </div>

                      {/* Serie 3 */}
                      <div>
                        <div className="text-xs font-semibold text-gray-600 mb-1">Serie 3</div>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="number"
                            inputMode="decimal"
                            step="0.5"
                            placeholder="Peso (kg)"
                            value={getSerieTracking(3)?.peso ?? ''}
                            onChange={(e) => handleTrackingChange(ejercicio.id, 3, 'peso', e.target.value)}
                            className="px-3 py-2 border border-gray-200 rounded-lg text-center font-bold focus:border-blue-500 focus:outline-none placeholder:text-xs placeholder:font-normal placeholder:text-gray-400"
                          />
                          <input
                            type="number"
                            inputMode="numeric"
                            placeholder="Reps"
                            value={getSerieTracking(3)?.reps ?? ''}
                            onChange={(e) => handleTrackingChange(ejercicio.id, 3, 'reps', e.target.value)}
                            className="px-3 py-2 border border-gray-200 rounded-lg text-center font-bold focus:border-blue-500 focus:outline-none placeholder:text-xs placeholder:font-normal placeholder:text-gray-400"
                          />
                        </div>
                      </div>

                      {/* Serie 4 (si aplica) */}
                      {ejercicio.series === 4 && (
                        <div>
                          <div className="text-xs font-semibold text-gray-600 mb-1">Serie 4</div>
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="number"
                              inputMode="decimal"
                              step="0.5"
                              placeholder="Peso (kg)"
                              value={getSerieTracking(4)?.peso ?? ''}
                              onChange={(e) => handleTrackingChange(ejercicio.id, 4, 'peso', e.target.value)}
                              className="px-3 py-2 border border-gray-200 rounded-lg text-center font-bold focus:border-blue-500 focus:outline-none placeholder:text-xs placeholder:font-normal placeholder:text-gray-400"
                            />
                            <input
                              type="number"
                              inputMode="numeric"
                              placeholder="Reps"
                              value={getSerieTracking(4)?.reps ?? ''}
                              onChange={(e) => handleTrackingChange(ejercicio.id, 4, 'reps', e.target.value)}
                              className="px-3 py-2 border border-gray-200 rounded-lg text-center font-bold focus:border-blue-500 focus:outline-none placeholder:text-xs placeholder:font-normal placeholder:text-gray-400"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Slide to Confirm - Completar Sesión */}
        <div className="mt-8">
          <SlideToConfirm
            onConfirm={handleCompletarSesion}
            text="Deslizar para completar sesión"
          />
        </div>
      </div>

      {/* Dialog de ejercicios incompletos */}
      <Dialog open={showCompletarDialog} onOpenChange={setShowCompletarDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ejercicios incompletos</DialogTitle>
            <DialogDescription>
              Los siguientes ejercicios no tienen todas las series completadas:
            </DialogDescription>
          </DialogHeader>

          <div className="my-4">
            <ul className="space-y-2">
              {ejerciciosIncompletos.map((nombre, idx) => (
                <li key={idx} className="flex items-center gap-2 text-sm">
                  <AlertCircle className="h-4 w-4 text-orange-500" />
                  <span className="font-medium">{nombre}</span>
                </li>
              ))}
            </ul>
          </div>

          <Alert className="bg-blue-50 border-blue-200">
            <AlertDescription className="text-sm text-blue-900">
              ¿Saltaste estos ejercicios o aún los vas a completar?
            </AlertDescription>
          </Alert>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setShowCompletarDialog(false)}
              className="w-full sm:w-auto"
            >
              Volver a completar
            </Button>
            <Button
              onClick={handleCompletarConIncompletos}
              className="w-full sm:w-auto"
            >
              Sí, los salté - Completar sesión
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}
        title={confirmDialog.title}
        description={confirmDialog.description}
        onConfirm={confirmDialog.onConfirm}
      />

      {/* Message Dialog */}
      <MessageDialog
        open={messageDialog.open}
        onOpenChange={(open) => setMessageDialog({ ...messageDialog, open })}
        title={messageDialog.title}
        message={messageDialog.message}
        variant={messageDialog.variant}
      />
    </div>
  )
}

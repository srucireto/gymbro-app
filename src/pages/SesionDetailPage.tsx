import { useEffect, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import type { Sesion, Ejercicio, Tracking, DiasFuera, CheckInEstado, DiaSemana, Ausencia } from '@/types'
import MissedSessionDialog from '@/components/MissedSessionDialog'
import CheckInDialog from '@/components/CheckInDialog'
import SlideToConfirm from '@/components/SlideToConfirm'
import { modificarEjerciciosPorCheckIn, necesitaCheckIn } from '@/lib/illness'
import { Button } from '@/components/ui/button'
import { AlertCircle, Play, CheckCircle2, Check } from 'lucide-react'
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
  const [originalEjercicios, setOriginalEjercicios] = useState<Ejercicio[]>([]) // Para restaurar después de check-in
  const [tracking, setTracking] = useState<Record<string, Tracking[]>>({})
  const [expandido, setExpandido] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)

  // Illness logic state
  const [semanaId, setSemanaId] = useState<string | null>(navState?.semanaId || null)
  const [dia, setDia] = useState<DiaSemana | null>(navState?.dia || null)
  const [diaPartido, setDiaPartido] = useState<DiaSemana | null>(navState?.diaPartido || null)
  const [showMissedDialog, setShowMissedDialog] = useState(false)
  const [showCheckInDialog, setShowCheckInDialog] = useState(false)
  const [pendingAusencia, setPendingAusencia] = useState<Ausencia | null>(null)
  const [checkInRequired, setCheckInRequired] = useState(false)
  const [ejerciciosModificados, setEjerciciosModificados] = useState(false)
  const [showCompletarDialog, setShowCompletarDialog] = useState(false)
  const [ejerciciosIncompletos, setEjerciciosIncompletos] = useState<string[]>([])

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
        setOriginalEjercicios(ejerciciosData || [])

        // Verificar si hay usuario autenticado para tracking y ausencias
        const { data: { user } } = await supabase.auth.getUser()

        if (user) {
          // Obtener tracking existente (requiere autenticación)
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
            const { data: semanaActual } = await supabase
              .from('semanas')
              .select('id, dia_partido')
              .eq('user_id', user.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .single()

            if (semanaActual) {
              setSemanaId(semanaActual.id)
              setDiaPartido(semanaActual.dia_partido)

              // Buscar en qué día está programada esta sesión
              const { data: entrada } = await supabase
                .from('calendario_semanal')
                .select('dia')
                .eq('semana_id', semanaActual.id)
                .eq('sesion_id', id)
                .single()

              if (entrada) {
                setDia(entrada.dia)
              }
            }
          }

          // Verificar si hay ausencia pendiente de check-in para esta sesión
          const { data: ausenciaData } = await supabase
            .from('ausencias')
            .select('*')
            .eq('user_id', user.id)
            .eq('sesion_id', id)
            .eq('sesion_recuperada', false)
            .is('check_in_estado', null)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

          if (ausenciaData && necesitaCheckIn(ausenciaData.dias_fuera)) {
            setPendingAusencia(ausenciaData)
            setCheckInRequired(true)
            setShowCheckInDialog(true)
          }
        } else {
          console.log('No hay usuario autenticado - solo modo lectura')
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

  const handleMissedSession = async (diasFuera: DiasFuera) => {
    if (!id || !semanaId || !dia) {
      alert('No se puede marcar como faltada: falta información de contexto')
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Crear registro de ausencia
      const { error } = await supabase
        .from('ausencias')
        .insert({
          user_id: user.id,
          semana_id: semanaId,
          sesion_id: id,
          dia_faltado: dia,
          dias_fuera: diasFuera,
          sesion_recuperada: false
        })

      if (error) throw error

      setShowMissedDialog(false)

      // Si necesita check-in, mostrar el diálogo
      if (necesitaCheckIn(diasFuera)) {
        alert('Se reorganizará el calendario. Al volver se pedirá check-in.')
      }

      // Volver al home
      navigate('/')
    } catch (error) {
      console.error('Error marking session as missed:', error)
      alert('Error al marcar sesión como faltada')
    }
  }

  const handleCheckIn = async (estado: CheckInEstado) => {
    if (!pendingAusencia) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Actualizar ausencia con el estado del check-in
      const { error } = await supabase
        .from('ausencias')
        .update({ check_in_estado: estado })
        .eq('id', pendingAusencia.id)

      if (error) throw error

      // Aplicar modificaciones a los ejercicios según el estado
      const ejerciciosModificadosResult = modificarEjerciciosPorCheckIn(originalEjercicios, estado)
      setEjercicios(ejerciciosModificadosResult)
      setEjerciciosModificados(estado !== 'bien')

      setShowCheckInDialog(false)
      setCheckInRequired(false)
      setPendingAusencia(null)
    } catch (error) {
      console.error('Error saving check-in:', error)
      alert('Error al guardar check-in')
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

  const completarSesion = () => {
    // TODO: Aquí puedes agregar lógica adicional como:
    // - Guardar un registro de sesión completada en la BD
    // - Marcar la entrada del calendario como completada
    // - Mostrar un mensaje de éxito
    alert('¡Sesión completada! 🎉')
    setShowCompletarDialog(false)
    navigate('/')
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
            {!checkInRequired && semanaId && dia && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowMissedDialog(true)}
              >
                <AlertCircle className="h-4 w-4 mr-1" />
                Faltar
              </Button>
            )}
          </div>
        </div>
      </div>

      {ejerciciosModificados && (
        <div className="container mx-auto px-4 pt-4 max-w-md">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Ejercicios modificados por check-in. Consulta las notas de cada ejercicio.
            </AlertDescription>
          </Alert>
        </div>
      )}

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
                            step="0.5"
                            placeholder="Peso (kg)"
                            value={getSerieTracking(1)?.peso ?? ''}
                            onChange={(e) => handleTrackingChange(ejercicio.id, 1, 'peso', e.target.value)}
                            className="px-3 py-2 border border-gray-200 rounded-lg text-center font-bold focus:border-blue-500 focus:outline-none placeholder:text-xs placeholder:font-normal placeholder:text-gray-400"
                          />
                          <input
                            type="number"
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
                            step="0.5"
                            placeholder="Peso (kg)"
                            value={getSerieTracking(2)?.peso ?? ''}
                            onChange={(e) => handleTrackingChange(ejercicio.id, 2, 'peso', e.target.value)}
                            className="px-3 py-2 border border-gray-200 rounded-lg text-center font-bold focus:border-blue-500 focus:outline-none placeholder:text-xs placeholder:font-normal placeholder:text-gray-400"
                          />
                          <input
                            type="number"
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
                            step="0.5"
                            placeholder="Peso (kg)"
                            value={getSerieTracking(3)?.peso ?? ''}
                            onChange={(e) => handleTrackingChange(ejercicio.id, 3, 'peso', e.target.value)}
                            className="px-3 py-2 border border-gray-200 rounded-lg text-center font-bold focus:border-blue-500 focus:outline-none placeholder:text-xs placeholder:font-normal placeholder:text-gray-400"
                          />
                          <input
                            type="number"
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
                              step="0.5"
                              placeholder="Peso (kg)"
                              value={getSerieTracking(4)?.peso ?? ''}
                              onChange={(e) => handleTrackingChange(ejercicio.id, 4, 'peso', e.target.value)}
                              className="px-3 py-2 border border-gray-200 rounded-lg text-center font-bold focus:border-blue-500 focus:outline-none placeholder:text-xs placeholder:font-normal placeholder:text-gray-400"
                            />
                            <input
                              type="number"
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

      {/* Missed Session Dialog */}
      <MissedSessionDialog
        open={showMissedDialog}
        onClose={() => setShowMissedDialog(false)}
        onConfirm={handleMissedSession}
        sesionNombre={sesion.nombre}
      />

      {/* Check-in Dialog */}
      {pendingAusencia && (
        <CheckInDialog
          open={showCheckInDialog}
          onCheckIn={handleCheckIn}
          diasFuera={pendingAusencia.dias_fuera}
        />
      )}
    </div>
  )
}

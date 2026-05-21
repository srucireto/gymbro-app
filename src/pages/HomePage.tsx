import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useRutinaActiva, useSemanaActual } from '@/hooks/useSupabase'
import { generarCalendario, DIAS_PARTIDO, DIAS_FUTSAL_ENTRENO } from '@/lib/scheduler'
import CalendarioSemanal from '@/components/CalendarioSemanal'
import ConfirmDialog from '@/components/ConfirmDialog'
import MessageDialog from '@/components/MessageDialog'
import type { DiaSemana, SemanaProgramada } from '@/types'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { BarChart3, LogOut } from 'lucide-react'

export default function HomePage() {
  const navigate = useNavigate()
  const { rutina, sesiones, loading: loadingRutina } = useRutinaActiva()
  const { semana, setSemana, loading: loadingSemana } = useSemanaActual()
  const [todasLasSemanas, setTodasLasSemanas] = useState<SemanaProgramada[]>([])
  const [mostrarSelector, setMostrarSelector] = useState(false)
  const [paso, setPaso] = useState<1 | 2>(1)
  const [diaPartidoSeleccionado, setDiaPartidoSeleccionado] = useState<DiaSemana | null>(null)
  const [guardando, setGuardando] = useState(false)

  // Dialog states
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    title: string
    description: string
    onConfirm: () => void
  }>({ open: false, title: '', description: '', onConfirm: () => {} })

  const [messageDialog, setMessageDialog] = useState<{
    open: boolean
    title: string
    message: string
    variant: 'default' | 'success' | 'error'
  }>({ open: false, title: '', message: '', variant: 'default' })

  const loading = loadingRutina || loadingSemana

  // Obtener todas las semanas del mesociclo para calcular progreso total
  useEffect(() => {
    async function fetchTodasLasSemanas() {
      if (!rutina) return

      const { data } = await supabase
        .from('semanas')
        .select('*')
        .eq('rutina_id', rutina.id)
        .order('semana_numero')

      if (data) {
        setTodasLasSemanas(data)
      }
    }

    fetchTodasLasSemanas()
  }, [rutina])

  const handleSeleccionarDiaPartido = (dia: DiaSemana) => {
    setDiaPartidoSeleccionado(dia)
    setPaso(2)
  }

  const handleConfirmarDias = async (diaEntrenamiento: DiaSemana) => {
    if (!rutina || !sesiones.length || !diaPartidoSeleccionado) return

    // Validaciones (aunque la UI ya las previene)
    if (!DIAS_PARTIDO.includes(diaPartidoSeleccionado)) {
      alert('El partido solo puede ser de lunes a viernes.')
      return
    }
    if (!DIAS_FUTSAL_ENTRENO.includes(diaEntrenamiento)) {
      alert('El entreno de futsal solo puede ser de lunes a viernes.')
      return
    }
    if (diaPartidoSeleccionado === diaEntrenamiento) {
      alert('El partido y el entreno no pueden ser el mismo día.')
      return
    }

    setGuardando(true)
    try {
      const calendario = generarCalendario(diaPartidoSeleccionado, diaEntrenamiento, sesiones)

      const hoy = new Date()
      const inicioSemana = new Date(hoy)
      const diaSemanaActual = inicioSemana.getDay()
      const diff = diaSemanaActual === 0 ? -6 : 1 - diaSemanaActual
      inicioSemana.setDate(inicioSemana.getDate() + diff)

      const semanaNumero = semana ? semana.semana_numero : 1

      const { data, error } = await supabase
        .from('semanas')
        .upsert({
          id: semana?.id,
          rutina_id: rutina.id,
          semana_numero: semanaNumero,
          fecha_inicio: inicioSemana.toISOString().split('T')[0],
          dia_partido: diaPartidoSeleccionado,
          dia_futsal: diaEntrenamiento,
          calendario
        }, { onConflict: 'id' })
        .select()
        .single()

      if (error) throw error

      setSemana(data)
      setMostrarSelector(false)
      setPaso(1)
      setDiaPartidoSeleccionado(null)
    } catch (error) {
      console.error('Error guardando semana:', error)
      const message = error instanceof Error ? error.message : 'Error al guardar. Intenta de nuevo.'
      alert(message)
    } finally {
      setGuardando(false)
    }
  }

  const handleCancelar = () => {
    setMostrarSelector(false)
    setPaso(1)
    setDiaPartidoSeleccionado(null)
  }

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      navigate('/login')
    } catch (error) {
      console.error('Error al cerrar sesión:', error)
    }
  }

  const handleUnmarkMissed = (dia: DiaSemana, sesionId: string) => {
    if (!semana) return

    setConfirmDialog({
      open: true,
      title: 'Restaurar sesión',
      description: `¿Restaurar la sesión del ${dia}? Esto la marcará como pendiente nuevamente.`,
      onConfirm: () => executeUnmarkMissed(dia, sesionId)
    })
  }

  const executeUnmarkMissed = async (dia: DiaSemana, sesionId: string) => {
    if (!semana) return

    setConfirmDialog({ ...confirmDialog, open: false })

    try {
      // Obtener el calendario actual
      const calendario = semana.calendario as Record<DiaSemana, any>

      // Encontrar la sesión original antes de que fuera marcada como faltada
      const entradaOriginal = calendario[dia]

      // Restaurar el estado original (eliminar el estado "faltada")
      const nuevoCalendario = {
        ...calendario,
        [dia]: {
          ...entradaOriginal,
          tipo: 'gym',
          sesion_id: sesionId,
          estado: 'normal'
        }
      }

      // Actualizar el calendario en la BD
      const { error: updateError } = await supabase
        .from('semanas')
        .update({ calendario: nuevoCalendario })
        .eq('id', semana.id)

      if (updateError) throw updateError

      // Eliminar el registro de ausencia si existe
      console.log('🔍 Intentando eliminar ausencia:', {
        semana_id: semana.id,
        sesion_id: sesionId
      })

      // Eliminar TODAS las ausencias de esta sesión en esta semana
      // (sin filtrar por dia_faltado que podría no coincidir)
      const { data: deletedData, error: deleteError } = await supabase
        .from('ausencias')
        .delete({ count: 'exact' })
        .eq('semana_id', semana.id)
        .eq('sesion_id', sesionId)
        .select()

      if (deleteError) {
        console.error('❌ Error al eliminar ausencia:', deleteError)
        throw deleteError
      } else {
        console.log('✅ Ausencias eliminadas:', deletedData?.length || 0)
        if (deletedData && deletedData.length > 0) {
          console.log('Detalles de ausencias eliminadas:', deletedData)
        } else {
          console.warn('⚠️ No se encontraron ausencias para eliminar. Esto es extraño.')
        }
      }

      // Actualizar el estado local
      setSemana({ ...semana, calendario: nuevoCalendario })

      setMessageDialog({
        open: true,
        title: 'Sesión restaurada',
        message: 'La sesión ha sido restaurada correctamente y está nuevamente como pendiente.',
        variant: 'success'
      })
    } catch (error) {
      console.error('Error al restaurar sesión:', error)
      setMessageDialog({
        open: true,
        title: 'Error',
        message: 'No se pudo restaurar la sesión. Por favor, intenta de nuevo.',
        variant: 'error'
      })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Cargando...</div>
      </div>
    )
  }

  if (!rutina) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-6 max-w-md">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">GymBro</h1>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
          <Alert>
            <AlertDescription>
              No hay ninguna rutina activa configurada.
            </AlertDescription>
          </Alert>
          <Button asChild className="w-full mt-4">
            <Link to="/rutinas">
              Configurar rutina
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  const diaFutsalDefault = semana?.dia_futsal || "martes"
  const calendario = semana?.calendario || generarCalendario("viernes", diaFutsalDefault, sesiones)
  const semanaDelMesociclo = semana?.semana_numero || 1

  // Calcular progreso basado en TODAS las sesiones completadas del mesociclo
  const calcularProgreso = () => {
    if (!semana || !rutina || todasLasSemanas.length === 0) return 0

    const calendarioObj = semana.calendario as Record<DiaSemana, any>

    // Contar sesiones de gym en la semana (excluir partido, futsal, descanso, gym_cerrado)
    const sesionesGymPorSemana = Object.values(calendarioObj).filter(
      (entrada: any) => entrada.tipo === 'gym'
    ).length

    // Total de sesiones en el mesociclo completo
    const totalSesiones = sesionesGymPorSemana * rutina.semanas_duracion

    // Contar sesiones completadas en TODAS las semanas del mesociclo
    const sesionesCompletadas = todasLasSemanas.reduce((total, sem) => {
      const cal = sem.calendario as Record<DiaSemana, any>
      const completadasEnSemana = Object.values(cal).filter(
        (entrada: any) => entrada.tipo === 'gym' && entrada.estado === 'completada'
      ).length
      return total + completadasEnSemana
    }, 0)

    if (totalSesiones === 0) return 0
    return Math.round((sesionesCompletadas / totalSesiones) * 100)
  }

  const progresoMesociclo = calcularProgreso()

  return (
    <div className="min-h-screen bg-[#fafafa] pb-20">
      <div className="container mx-auto px-4 py-6 max-w-md">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">GymBro</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {rutina.nombre}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/rutinas">
                Rutinas
              </Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Progreso del mesociclo */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardDescription className="text-xs uppercase tracking-wide font-semibold">
              Progreso del mesociclo
            </CardDescription>
            <CardTitle className="text-3xl font-bold">
              Semana {semanaDelMesociclo} <span className="text-muted-foreground">/ {rutina.semanas_duracion}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Barra de progreso */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Sesiones completadas</span>
                <span className="font-semibold">
                  {progresoMesociclo}%
                </span>
              </div>
              <Progress
                value={progresoMesociclo}
                className="h-2"
              />
            </div>

            {/* Deload warning */}
            {semanaDelMesociclo === 7 && (
              <Button variant="link" asChild className="p-0 h-auto text-orange-600 font-semibold">
                <Link to="/deload">
                  Ver instrucciones de deload →
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Selector de días */}
        {mostrarSelector ? (
          <Card className="mb-6 border-2 border-primary shadow-md">
            <CardHeader>
              <CardTitle className="text-xl">
                {paso === 1 ? '¿Qué día es el partido?' : '¿Qué día es el entrenamiento?'}
              </CardTitle>
              {paso === 1 && (
                <CardDescription>
                  Paso 1 de 2 · Solo lunes a viernes
                </CardDescription>
              )}
              {paso === 2 && (
                <CardDescription>
                  Paso 2 de 2 · Partido el <span className="font-semibold">{diaPartidoSeleccionado}</span>
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              {paso === 1 ? (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    {DIAS_PARTIDO.map((dia) => (
                      <Button
                        key={dia}
                        onClick={() => handleSeleccionarDiaPartido(dia)}
                        variant="outline"
                        className="h-auto py-3"
                      >
                        {dia.charAt(0).toUpperCase() + dia.slice(1)}
                      </Button>
                    ))}
                  </div>
                  <Button
                    onClick={handleCancelar}
                    variant="ghost"
                    className="w-full"
                  >
                    Cancelar
                  </Button>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    {DIAS_FUTSAL_ENTRENO.filter(dia => dia !== diaPartidoSeleccionado).map((dia) => {
                      const esSugerido = diaPartidoSeleccionado === "martes"
                        ? dia === "viernes"
                        : dia === "martes"

                      return (
                        <Button
                          key={dia}
                          onClick={() => handleConfirmarDias(dia)}
                          disabled={guardando}
                          variant={esSugerido ? "default" : "outline"}
                          className="h-auto py-3 flex flex-col"
                        >
                          {dia.charAt(0).toUpperCase() + dia.slice(1)}
                          {esSugerido && <span className="text-xs">✓ Sugerido</span>}
                        </Button>
                      )
                    })}
                  </div>
                  <Button
                    onClick={() => setPaso(1)}
                    disabled={guardando}
                    variant="ghost"
                    className="w-full"
                  >
                    ← Volver
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        ) : (
          <Button
            onClick={() => setMostrarSelector(true)}
            className="w-full py-6 mb-6 text-base font-semibold"
            size="lg"
            variant="outline"
          >
            ¿Cambió el día del partido?
          </Button>
        )}

        {/* Calendario semanal */}
        <div className="mb-4">
          <h2 className="text-xl font-semibold tracking-tight">
            Esta semana
          </h2>
        </div>

        <CalendarioSemanal
          calendario={calendario}
          sesiones={sesiones}
          semanaId={semana?.id}
          diaPartido={semana?.dia_partido}
          onUnmarkMissed={handleUnmarkMissed}
        />

        {/* Link a Estadísticas */}
        <div className="mt-6">
          <Button
            asChild
            variant="outline"
            className="w-full py-6 text-base"
          >
            <Link to="/stats" className="flex items-center justify-center gap-2">
              <BarChart3 className="h-5 w-5" />
              <span className="font-semibold">Ver Estadísticas</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Custom Dialogs */}
      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}
        title={confirmDialog.title}
        description={confirmDialog.description}
        onConfirm={confirmDialog.onConfirm}
      />

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

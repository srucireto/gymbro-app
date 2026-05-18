import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useRutinaActiva, useSemanaActual } from '@/hooks/useSupabase'
import { generarCalendario, DIAS_PARTIDO, DIAS_FUTSAL_ENTRENO } from '@/lib/scheduler'
import CalendarioSemanal from '@/components/CalendarioSemanal'
import type { DiaSemana } from '@/types'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function HomePage() {
  const { rutina, sesiones, loading: loadingRutina } = useRutinaActiva()
  const { semana, setSemana, loading: loadingSemana } = useSemanaActual()
  const [mostrarSelector, setMostrarSelector] = useState(false)
  const [paso, setPaso] = useState<1 | 2>(1)
  const [diaPartidoSeleccionado, setDiaPartidoSeleccionado] = useState<DiaSemana | null>(null)
  const [guardando, setGuardando] = useState(false)

  const loading = loadingRutina || loadingSemana

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
          <h1 className="text-2xl font-bold mb-6">GymBro</h1>
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
          <Button variant="outline" size="sm" asChild>
            <Link to="/rutinas">
              Rutinas
            </Link>
          </Button>
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
          {semanaDelMesociclo === 7 && (
            <CardContent className="pt-0">
              <Button variant="link" asChild className="p-0 h-auto text-orange-600 font-semibold">
                <Link to="/deload">
                  Ver instrucciones de deload →
                </Link>
              </Button>
            </CardContent>
          )}
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
        />
      </div>
    </div>
  )
}

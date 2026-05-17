import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useRutinaActiva, useSemanaActual } from '@/hooks/useSupabase'
import { generarCalendario, DIAS_PARTIDO, DIAS_FUTSAL_ENTRENO } from '@/lib/scheduler'
import CalendarioSemanal from '@/components/CalendarioSemanal'
import type { DiaSemana } from '@/types'
import { supabase } from '@/lib/supabase'

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
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-6 max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">GymBro</h1>
          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4 mb-4">
            <p className="text-yellow-900 mb-4">
              No hay ninguna rutina activa configurada.
            </p>
            <Link
              to="/rutinas"
              className="block w-full bg-blue-600 text-white text-center py-3 rounded-lg font-semibold hover:bg-blue-700"
            >
              Configurar rutina
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const diaFutsalDefault = semana?.dia_futsal || "martes"
  const calendario = semana?.calendario || generarCalendario("viernes", diaFutsalDefault, sesiones)
  const semanaDelMesociclo = semana?.semana_numero || 1

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="container mx-auto px-4 py-6 max-w-md">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">GymBro</h1>
            <p className="text-sm text-gray-600">
              {rutina.nombre}
            </p>
          </div>
          <Link
            to="/rutinas"
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            Rutinas
          </Link>
        </div>

        <div className="bg-white rounded-lg p-4 mb-6 border border-gray-200">
          <div className="text-sm text-gray-600 mb-1">Semana del mesociclo</div>
          <div className="text-2xl font-bold text-gray-900">
            {semanaDelMesociclo} de {rutina.semanas_duracion}
          </div>
          {semanaDelMesociclo === 7 && (
            <Link
              to="/deload"
              className="mt-3 block text-sm text-orange-600 hover:text-orange-700 font-semibold"
            >
              Ver instrucciones de deload →
            </Link>
          )}
        </div>

        {mostrarSelector ? (
          <div className="bg-white rounded-lg p-4 mb-6 border-2 border-blue-500">
            {paso === 1 ? (
              <>
                <h2 className="font-bold text-gray-900 mb-4">
                  Paso 1: ¿Qué día es el partido esta semana?
                </h2>
                <p className="text-xs text-gray-500 mb-3">
                  Solo lunes a viernes (no hay partidos los fines de semana)
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {DIAS_PARTIDO.map((dia) => (
                    <button
                      key={dia}
                      onClick={() => handleSeleccionarDiaPartido(dia)}
                      className="py-3 px-4 bg-blue-50 hover:bg-blue-100 border-2 border-blue-200 rounded-lg font-semibold text-blue-900"
                    >
                      {dia.charAt(0).toUpperCase() + dia.slice(1)}
                    </button>
                  ))}
                </div>
                <button
                  onClick={handleCancelar}
                  className="mt-3 w-full py-2 text-sm text-gray-600 hover:text-gray-800"
                >
                  Cancelar
                </button>
              </>
            ) : (
              <>
                <h2 className="font-bold text-gray-900 mb-2">
                  Paso 2: ¿Qué día es el entrenamiento de futsal?
                </h2>
                <p className="text-sm text-gray-600 mb-4">
                  Partido: <span className="font-semibold">{diaPartidoSeleccionado}</span>
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {DIAS_FUTSAL_ENTRENO.filter(dia => dia !== diaPartidoSeleccionado).map((dia) => {
                    const esSugerido = diaPartidoSeleccionado === "martes"
                      ? dia === "viernes"
                      : dia === "martes"

                    return (
                      <button
                        key={dia}
                        onClick={() => handleConfirmarDias(dia)}
                        disabled={guardando}
                        className={`py-3 px-4 border-2 rounded-lg font-semibold disabled:opacity-50 ${
                          esSugerido
                            ? 'bg-green-50 border-green-500 text-green-900 hover:bg-green-100'
                            : 'bg-blue-50 border-blue-200 text-blue-900 hover:bg-blue-100'
                        }`}
                      >
                        {dia.charAt(0).toUpperCase() + dia.slice(1)}
                        {esSugerido && <span className="text-xs block">✓ Sugerido</span>}
                      </button>
                    )
                  })}
                </div>
                <button
                  onClick={() => setPaso(1)}
                  disabled={guardando}
                  className="mt-3 w-full py-2 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50"
                >
                  ← Volver
                </button>
              </>
            )}
          </div>
        ) : (
          <button
            onClick={() => setMostrarSelector(true)}
            className="w-full bg-blue-600 text-white py-4 rounded-lg font-bold mb-6 hover:bg-blue-700 active:scale-98"
          >
            ¿Cambió el día del partido?
          </button>
        )}

        <h2 className="text-lg font-bold text-gray-900 mb-3">
          Esta semana
        </h2>

        <CalendarioSemanal calendario={calendario} sesiones={sesiones} />
      </div>
    </div>
  )
}

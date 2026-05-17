import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import type { Rutina } from '@/types'

export default function RutinasPage() {
  const navigate = useNavigate()
  const [rutinas, setRutinas] = useState<Rutina[]>([])
  const [loading, setLoading] = useState(true)
  const [cargando, setCargando] = useState(false)

  useEffect(() => {
    fetchRutinas()
  }, [])

  async function fetchRutinas() {
    try {
      const { data, error } = await supabase
        .from('rutinas')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setRutinas(data || [])
    } catch (error) {
      console.error('Error fetching rutinas:', error)
    } finally {
      setLoading(false)
    }
  }

  async function activarRutina(rutinaId: string) {
    try {
      // Desactivar todas las rutinas
      await supabase
        .from('rutinas')
        .update({ activa: false })
        .neq('id', '00000000-0000-0000-0000-000000000000')

      // Activar la seleccionada
      const { error } = await supabase
        .from('rutinas')
        .update({ activa: true })
        .eq('id', rutinaId)

      if (error) throw error

      fetchRutinas()
      alert('Rutina activada correctamente')
    } catch (error) {
      console.error('Error activando rutina:', error)
      alert('Error al activar rutina')
    }
  }

  async function handleCargarJSON(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setCargando(true)
    try {
      const text = await file.text()
      const data = JSON.parse(text)

      // Validar estructura básica
      if (!data.nombre || !data.sesiones) {
        throw new Error('JSON inválido: debe contener nombre y sesiones')
      }

      // Insertar rutina
      const { data: rutinaData, error: rutinaError } = await supabase
        .from('rutinas')
        .insert({
          nombre: data.nombre,
          fecha_inicio: data.fecha_inicio || new Date().toISOString().split('T')[0],
          semanas_duracion: data.semanas_duracion || 6,
          activa: false
        })
        .select()
        .single()

      if (rutinaError) throw rutinaError

      // Insertar sesiones
      for (const sesion of data.sesiones) {
        const { data: sesionData, error: sesionError } = await supabase
          .from('sesiones')
          .insert({
            rutina_id: rutinaData.id,
            nombre: sesion.nombre,
            tipo: sesion.tipo,
            intensidad: sesion.intensidad,
            buffer_minimo_horas: sesion.buffer_minimo_horas,
            es_post_partido: sesion.es_post_partido || false,
            orden: sesion.orden
          })
          .select()
          .single()

        if (sesionError) throw sesionError

        // Insertar ejercicios
        if (sesion.ejercicios) {
          const ejerciciosToInsert = sesion.ejercicios.map((ej: any) => ({
            sesion_id: sesionData.id,
            nombre: ej.nombre,
            grupo_muscular: ej.grupo_muscular,
            series: ej.series,
            reps_target: ej.reps_target,
            rir_target: ej.rir_target,
            notas: ej.notas,
            nota_ajuste: ej.nota_ajuste,
            youtube_search: ej.youtube_search,
            orden: ej.orden
          }))

          const { error: ejerciciosError } = await supabase
            .from('ejercicios')
            .insert(ejerciciosToInsert)

          if (ejerciciosError) throw ejerciciosError
        }
      }

      fetchRutinas()
      alert('Rutina cargada exitosamente')
      e.target.value = ''
    } catch (error) {
      console.error('Error cargando rutina:', error)
      alert('Error al cargar rutina: ' + (error as Error).message)
    } finally {
      setCargando(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Cargando...</div>
      </div>
    )
  }

  const rutinaActiva = rutinas.find(r => r.activa)

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="container mx-auto px-4 py-6 max-w-md">
        <button
          onClick={() => navigate('/')}
          className="text-blue-600 hover:text-blue-700 mb-4 text-sm font-semibold"
        >
          ← Volver
        </button>

        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          Gestión de Rutinas
        </h1>

        <div className="bg-white rounded-lg border-2 border-gray-200 p-4 mb-6">
          <label className="block">
            <div className="text-sm font-semibold text-gray-700 mb-2">
              Cargar nueva rutina (JSON)
            </div>
            <input
              type="file"
              accept=".json"
              onChange={handleCargarJSON}
              disabled={cargando}
              className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
            />
          </label>
        </div>

        <h2 className="text-lg font-bold text-gray-900 mb-3">
          Rutinas disponibles
        </h2>

        {rutinas.length === 0 ? (
          <div className="bg-gray-100 rounded-lg p-6 text-center text-gray-600">
            No hay rutinas cargadas.
            <br />
            Carga una rutina usando el botón de arriba.
          </div>
        ) : (
          <div className="space-y-3">
            {rutinas.map((rutina) => (
              <div
                key={rutina.id}
                className={`bg-white rounded-lg border-2 p-4 ${
                  rutina.activa
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900">
                      {rutina.nombre}
                    </h3>
                    <div className="text-sm text-gray-600 mt-1">
                      {rutina.semanas_duracion} semanas
                    </div>
                    {rutina.activa && (
                      <div className="inline-block mt-2 text-xs bg-blue-600 text-white px-2 py-1 rounded-full font-semibold">
                        ACTIVA
                      </div>
                    )}
                  </div>
                  {!rutina.activa && (
                    <button
                      onClick={() => activarRutina(rutina.id)}
                      className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700"
                    >
                      Activar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {rutinaActiva && (
          <div className="mt-6 bg-green-50 border-2 border-green-200 rounded-lg p-4">
            <div className="text-sm font-semibold text-green-900 mb-1">
              Rutina activa:
            </div>
            <div className="font-bold text-green-900">
              {rutinaActiva.nombre}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

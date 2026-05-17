import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import type { Sesion, Ejercicio, Tracking } from '@/types'

export default function SesionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [sesion, setSesion] = useState<Sesion | null>(null)
  const [ejercicios, setEjercicios] = useState<Ejercicio[]>([])
  const [tracking, setTracking] = useState<Record<string, Tracking>>({})
  const [expandido, setExpandido] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchSesion() {
      if (!id) return

      try {
        // Obtener sesión
        const { data: sesionData, error: sesionError } = await supabase
          .from('sesiones')
          .select('*')
          .eq('id', id)
          .single()

        if (sesionError) throw sesionError
        setSesion(sesionData)

        // Obtener ejercicios
        const { data: ejerciciosData, error: ejerciciosError } = await supabase
          .from('ejercicios')
          .select('*')
          .eq('sesion_id', id)
          .order('orden')

        if (ejerciciosError) throw ejerciciosError
        setEjercicios(ejerciciosData || [])

        // Obtener tracking existente (si hay)
        const { data: trackingData } = await supabase
          .from('tracking')
          .select('*')
          .in('ejercicio_id', (ejerciciosData || []).map(e => e.id))

        const trackingMap: Record<string, Tracking> = {}
        trackingData?.forEach(t => {
          trackingMap[t.ejercicio_id] = t
        })
        setTracking(trackingMap)
      } catch (error) {
        console.error('Error fetching sesion:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchSesion()
  }, [id])

  const handleTrackingChange = async (
    ejercicioId: string,
    field: keyof Tracking,
    value: string
  ) => {
    const numValue = value === '' ? null : parseFloat(value)
    
    const updatedTracking = {
      ...tracking[ejercicioId],
      ejercicio_id: ejercicioId,
      [field]: numValue
    }

    setTracking({
      ...tracking,
      [ejercicioId]: updatedTracking
    })

    // Auto-save to database
    try {
      await supabase
        .from('tracking')
        .upsert(updatedTracking, { onConflict: 'ejercicio_id' })
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
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="sticky top-0 bg-white border-b border-gray-200 z-10">
        <div className="container mx-auto px-4 py-4 max-w-md">
          <button
            onClick={() => navigate('/')}
            className="text-blue-600 hover:text-blue-700 mb-2 text-sm font-semibold"
          >
            ← Volver
          </button>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {sesion.nombre}
              </h1>
              <div className="flex gap-2 mt-1">
                <span className={`text-xs px-2 py-1 rounded-full font-semibold ${tipoColor}`}>
                  {sesion.tipo.toUpperCase()}
                </span>
                <span className="text-xs px-2 py-1 rounded-full font-semibold bg-gray-100 text-gray-700">
                  {sesion.intensidad}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-4 max-w-md">
        <div className="space-y-4">
          {ejercicios.map((ejercicio, idx) => {
            const track = tracking[ejercicio.id] || {}
            const isExpandido = expandido[ejercicio.id]

            return (
              <div
                key={ejercicio.id}
                className="bg-white rounded-lg border-2 border-gray-200 overflow-hidden"
              >
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <div className="text-xs text-gray-500 mb-1">
                        Ejercicio {idx + 1}
                      </div>
                      <h3 className="font-bold text-gray-900 leading-tight">
                        {ejercicio.nombre}
                      </h3>
                      <div className="text-sm text-gray-600 mt-1">
                        {ejercicio.grupo_muscular}
                      </div>
                    </div>
                    {ejercicio.youtube_search && (
                      <button
                        onClick={() => abrirVideoYouTube(ejercicio.youtube_search!)}
                        className="text-xs bg-red-100 text-red-700 px-3 py-1 rounded-full font-semibold hover:bg-red-200"
                      >
                        Video
                      </button>
                    )}
                  </div>

                  <div className="flex gap-4 text-sm font-semibold text-gray-700 mb-3">
                    <div>
                      <span className="text-gray-500">Series:</span> {ejercicio.series}
                    </div>
                    <div>
                      <span className="text-gray-500">Reps:</span> {ejercicio.reps_target}
                    </div>
                    <div>
                      <span className="text-gray-500">RIR:</span> {ejercicio.rir_target}
                    </div>
                  </div>

                  {(ejercicio.notas || ejercicio.nota_ajuste) && (
                    <button
                      onClick={() => toggleExpandido(ejercicio.id)}
                      className="w-full text-left text-sm text-blue-600 hover:text-blue-700 font-semibold mb-3"
                    >
                      {isExpandido ? '▼' : '▶'} Notas técnicas
                    </button>
                  )}

                  {isExpandido && (
                    <div className="bg-blue-50 rounded-lg p-3 mb-3 text-sm text-gray-700 leading-relaxed">
                      {ejercicio.notas && <p className="mb-2">{ejercicio.notas}</p>}
                      {ejercicio.nota_ajuste && (
                        <p className="text-orange-700 font-semibold">
                          ⚠️ {ejercicio.nota_ajuste}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="border-t-2 border-gray-100 pt-3">
                    <div className="text-xs font-semibold text-gray-700 mb-2">
                      TRACKING
                    </div>
                    <div className="grid grid-cols-5 gap-2">
                      <input
                        type="number"
                        step="0.5"
                        placeholder="Peso"
                        value={track.peso_trabajo || ''}
                        onChange={(e) => handleTrackingChange(ejercicio.id, 'peso_trabajo', e.target.value)}
                        className="col-span-2 px-3 py-2 border-2 border-gray-300 rounded-lg text-center font-bold focus:border-blue-500 focus:outline-none"
                      />
                      <input
                        type="number"
                        placeholder="S1"
                        value={track.reps_s1 || ''}
                        onChange={(e) => handleTrackingChange(ejercicio.id, 'reps_s1', e.target.value)}
                        className="px-2 py-2 border-2 border-gray-300 rounded-lg text-center font-bold focus:border-blue-500 focus:outline-none"
                      />
                      <input
                        type="number"
                        placeholder="S2"
                        value={track.reps_s2 || ''}
                        onChange={(e) => handleTrackingChange(ejercicio.id, 'reps_s2', e.target.value)}
                        className="px-2 py-2 border-2 border-gray-300 rounded-lg text-center font-bold focus:border-blue-500 focus:outline-none"
                      />
                      <input
                        type="number"
                        placeholder="S3"
                        value={track.reps_s3 || ''}
                        onChange={(e) => handleTrackingChange(ejercicio.id, 'reps_s3', e.target.value)}
                        className="px-2 py-2 border-2 border-gray-300 rounded-lg text-center font-bold focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    {ejercicio.series === 4 && (
                      <div className="mt-2">
                        <input
                          type="number"
                          placeholder="S4"
                          value={track.reps_s4 || ''}
                          onChange={(e) => handleTrackingChange(ejercicio.id, 'reps_s4', e.target.value)}
                          className="w-full px-2 py-2 border-2 border-gray-300 rounded-lg text-center font-bold focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

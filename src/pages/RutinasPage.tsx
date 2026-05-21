import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import type { Rutina } from '@/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Trash2, Copy, ChevronDown, ChevronUp } from 'lucide-react'

export default function RutinasPage() {
  const navigate = useNavigate()
  const [rutinas, setRutinas] = useState<Rutina[]>([])
  const [loading, setLoading] = useState(true)
  const [cargando, setCargando] = useState(false)
  const [mostrarJSON, setMostrarJSON] = useState(false)

  useEffect(() => {
    fetchRutinas()
  }, [])

  async function fetchRutinas() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setRutinas([])
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('rutinas')
        .select('*')
        .eq('user_id', user.id)
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
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuario no autenticado')

      // Desactivar todas las rutinas del usuario
      await supabase
        .from('rutinas')
        .update({ activa: false })
        .eq('user_id', user.id)

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

  async function eliminarRutina(rutinaId: string, nombre: string) {
    if (!confirm(`¿Estás seguro de eliminar la rutina "${nombre}"? Esta acción no se puede deshacer.`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('rutinas')
        .delete()
        .eq('id', rutinaId)

      if (error) throw error

      fetchRutinas()
      alert('Rutina eliminada correctamente')
    } catch (error) {
      console.error('Error eliminando rutina:', error)
      alert('Error al eliminar rutina')
    }
  }

  function copiarJSON() {
    const templateJSON = {
      "nombre": "Nombre de tu rutina",
      "semanas_duracion": 6,
      "activa": true,
      "sesiones": [
        {
          "nombre": "Push A",
          "tipo": "push",
          "intensidad": "pesada",
          "buffer_minimo_horas": 48,
          "es_post_partido": false,
          "orden": 1,
          "ejercicios": [
            {
              "nombre": "Press banca",
              "grupo_muscular": "Pecho",
              "series": 4,
              "reps_target": "6-8",
              "rir_target": "1-2",
              "notas": "Activar escapulas, mantener tension",
              "youtube_search": "press banca tecnica",
              "orden": 1
            }
          ]
        }
      ]
    }

    navigator.clipboard.writeText(JSON.stringify(templateJSON, null, 2))
    alert('JSON copiado al portapapeles')
  }

  function formatearFecha(fecha: string): string {
    const date = new Date(fecha)
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
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
    <div className="min-h-screen bg-[#fafafa] pb-20">
      <div className="container mx-auto px-4 py-6 max-w-md">
        {/* Header */}
        <div className="mb-8">
          <Button
            onClick={() => navigate('/')}
            variant="ghost"
            size="sm"
            className="mb-4 -ml-2"
          >
            ← Volver
          </Button>

          <h1 className="text-3xl font-bold tracking-tight">
            Gestión de Rutinas
          </h1>
          <p className="text-muted-foreground mt-1">
            Carga y administra tus rutinas de entrenamiento
          </p>
        </div>

        {/* JSON Base Template */}
        <Card className="mb-6 border-blue-200 bg-blue-50/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">📋 JSON Base</CardTitle>
                <CardDescription>
                  Template para crear rutinas con cualquier IA
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMostrarJSON(!mostrarJSON)}
              >
                {mostrarJSON ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          </CardHeader>
          {mostrarJSON && (
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Usa este formato JSON para que una IA (ChatGPT, Claude, Gemini) te genere rutinas personalizadas.
                Copia el template y pídele que cree una rutina siguiendo esta estructura.
              </p>

              <div className="flex gap-2">
                <Button
                  onClick={copiarJSON}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar template
                </Button>
              </div>

              <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-xs">
                <pre>{JSON.stringify({
                  "nombre": "Nombre de tu rutina",
                  "semanas_duracion": 6,
                  "activa": true,
                  "sesiones": [
                    {
                      "nombre": "Push A",
                      "tipo": "push",
                      "intensidad": "pesada",
                      "buffer_minimo_horas": 48,
                      "es_post_partido": false,
                      "orden": 1,
                      "ejercicios": [
                        {
                          "nombre": "Press banca",
                          "grupo_muscular": "Pecho",
                          "series": 4,
                          "reps_target": "6-8",
                          "rir_target": "1-2",
                          "notas": "Activar escapulas",
                          "youtube_search": "press banca tecnica",
                          "orden": 1
                        }
                      ]
                    }
                  ]
                }, null, 2)}</pre>
              </div>

              <Alert className="bg-blue-50 border-blue-200">
                <AlertDescription className="text-sm text-blue-900">
                  <strong>Campos requeridos:</strong> nombre, semanas_duracion, tipo (push/pull),
                  intensidad (pesada/liviana), grupo_muscular, series, reps_target, rir_target
                </AlertDescription>
              </Alert>
            </CardContent>
          )}
        </Card>

        {/* Cargar nueva rutina */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Cargar nueva rutina</CardTitle>
            <CardDescription>Importa el archivo JSON generado por la IA</CardDescription>
          </CardHeader>
          <CardContent>
            <label className="block">
              <input
                type="file"
                accept=".json"
                onChange={handleCargarJSON}
                disabled={cargando}
                className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 disabled:opacity-50 cursor-pointer"
              />
            </label>
          </CardContent>
        </Card>

        {/* Título sección */}
        <div className="mb-4">
          <h2 className="text-xl font-semibold tracking-tight">
            Rutinas disponibles
          </h2>
        </div>

        {rutinas.length === 0 ? (
          <Alert>
            <AlertDescription>
              No hay rutinas cargadas. Importa un archivo JSON para comenzar.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-3">
            {rutinas.map((rutina) => (
              <Card
                key={rutina.id}
                className={rutina.activa ? 'border-2 border-primary' : ''}
              >
                <CardHeader>
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <CardTitle className="text-lg">
                          {rutina.nombre}
                        </CardTitle>
                        {rutina.activa && (
                          <Badge variant="default">ACTIVA</Badge>
                        )}
                      </div>
                      <CardDescription className="space-y-1">
                        <div>{rutina.semanas_duracion} semanas de duración</div>
                        <div className="text-xs">
                          Creada: {formatearFecha(rutina.created_at || rutina.fecha_inicio)}
                        </div>
                      </CardDescription>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      {!rutina.activa && (
                        <Button
                          onClick={() => activarRutina(rutina.id)}
                          size="sm"
                        >
                          Activar
                        </Button>
                      )}
                      <Button
                        onClick={() => eliminarRutina(rutina.id, rutina.nombre)}
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}

        {rutinaActiva && (
          <Alert className="mt-6 border-green-200 bg-green-50">
            <AlertDescription className="text-green-900">
              <span className="font-semibold">Rutina activa:</span> {rutinaActiva.nombre}
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  )
}

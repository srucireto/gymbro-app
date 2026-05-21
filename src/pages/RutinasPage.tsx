import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import type { Rutina } from '@/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'

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

        {/* Cargar nueva rutina */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Cargar nueva rutina</CardTitle>
            <CardDescription>Importa un archivo JSON con tu rutina</CardDescription>
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
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <CardTitle className="text-lg">
                          {rutina.nombre}
                        </CardTitle>
                        {rutina.activa && (
                          <Badge variant="default">ACTIVA</Badge>
                        )}
                      </div>
                      <CardDescription>
                        {rutina.semanas_duracion} semanas de duración
                      </CardDescription>
                    </div>
                    {!rutina.activa && (
                      <Button
                        onClick={() => activarRutina(rutina.id)}
                        size="sm"
                      >
                        Activar
                      </Button>
                    )}
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

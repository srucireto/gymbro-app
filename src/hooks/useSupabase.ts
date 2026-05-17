import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Rutina, Sesion, SemanaProgramada } from '@/types'

export function useRutinaActiva() {
  const [rutina, setRutina] = useState<Rutina | null>(null)
  const [sesiones, setSesiones] = useState<Sesion[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchRutinaActiva() {
      console.log('[DEBUG] Iniciando fetchRutinaActiva...')
      console.log('[DEBUG] Supabase URL:', import.meta.env.VITE_SUPABASE_URL)
      console.log('[DEBUG] Supabase Key existe:', !!import.meta.env.VITE_SUPABASE_ANON_KEY)

      try {
        // Obtener rutina activa
        console.log('[DEBUG] Consultando rutinas con activa=true...')
        const { data: rutinaData, error: rutinaError } = await supabase
          .from('rutinas')
          .select('*')
          .eq('activa', true)
          .single()

        console.log('[DEBUG] Respuesta de query rutinas:', {
          data: rutinaData,
          error: rutinaError,
          errorCode: rutinaError?.code,
          errorMessage: rutinaError?.message,
          errorDetails: rutinaError?.details
        })

        if (rutinaError) {
          console.error('[DEBUG] Error al consultar rutina:', rutinaError)
          alert('Error cargando rutina: ' + rutinaError.message)
          throw rutinaError
        }

        console.log('[DEBUG] Rutina encontrada:', rutinaData?.nombre)
        setRutina(rutinaData)

        // Obtener sesiones de la rutina activa
        if (rutinaData) {
          console.log('[DEBUG] Consultando sesiones para rutina:', rutinaData.id)
          const { data: sesionesData, error: sesionesError } = await supabase
            .from('sesiones')
            .select('*')
            .eq('rutina_id', rutinaData.id)
            .order('orden')

          console.log('[DEBUG] Respuesta de query sesiones:', {
            count: sesionesData?.length,
            error: sesionesError
          })

          if (sesionesError) {
            console.error('[DEBUG] Error al consultar sesiones:', sesionesError)
            alert('Error cargando sesiones: ' + sesionesError.message)
            throw sesionesError
          }
          console.log('[DEBUG] Sesiones encontradas:', sesionesData?.length)
          setSesiones(sesionesData || [])
        }
        console.log('[DEBUG] fetchRutinaActiva completado exitosamente')
      } catch (error) {
        console.error('[DEBUG] Error en fetchRutinaActiva:', error)
        alert('Error crítico: ' + (error instanceof Error ? error.message : String(error)))
      } finally {
        console.log('[DEBUG] Finalizando con loading=false')
        setLoading(false)
      }
    }

    fetchRutinaActiva()
  }, [])

  console.log('[DEBUG] useRutinaActiva render - rutina:', rutina?.nombre, 'sesiones:', sesiones.length, 'loading:', loading)
  return { rutina, sesiones, loading }
}

export function useSemanaActual() {
  const [semana, setSemana] = useState<SemanaProgramada | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchSemanaActual() {
      try {
        const hoy = new Date().toISOString().split('T')[0]
        
        const { data, error } = await supabase
          .from('semanas')
          .select('*')
          .lte('fecha_inicio', hoy)
          .order('fecha_inicio', { ascending: false })
          .limit(1)
          .single()

        if (error && error.code !== 'PGRST116') throw error
        setSemana(data)
      } catch (error) {
        console.error('Error fetching semana actual:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchSemanaActual()
  }, [])

  return { semana, setSemana, loading }
}

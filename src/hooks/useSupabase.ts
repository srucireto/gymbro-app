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
      try {
        // Obtener rutina activa
        console.log('[DEBUG] Consultando rutinas con activa=true...')
        const { data: rutinaData, error: rutinaError } = await supabase
          .from('rutinas')
          .select('*')
          .eq('activa', true)
          .single()

        if (rutinaError) {
          console.error('[DEBUG] Error al consultar rutina:', rutinaError)
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

          if (sesionesError) {
            console.error('[DEBUG] Error al consultar sesiones:', sesionesError)
            throw sesionesError
          }
          console.log('[DEBUG] Sesiones encontradas:', sesionesData?.length)
          setSesiones(sesionesData || [])
        }
        console.log('[DEBUG] fetchRutinaActiva completado exitosamente')
      } catch (error) {
        console.error('[DEBUG] Error en fetchRutinaActiva:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchRutinaActiva()
  }, [])

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

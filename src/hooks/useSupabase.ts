import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Rutina, Sesion, SemanaProgramada } from '@/types'

export function useRutinaActiva() {
  const [rutina, setRutina] = useState<Rutina | null>(null)
  const [sesiones, setSesiones] = useState<Sesion[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchRutinaActiva() {
      try {
        // Verificar autenticación primero
        const { data: { user } } = await supabase.auth.getUser()
        console.log('🔍 useRutinaActiva - Usuario:', user?.id)

        const { data: rutinaData, error: rutinaError } = await supabase
          .from('rutinas')
          .select('*')
          .eq('activa', true)
          .maybeSingle()

        console.log('🔍 useRutinaActiva - Resultado:', { rutinaData, rutinaError })

        if (rutinaError) throw rutinaError

        setRutina(rutinaData)

        if (rutinaData) {
          const { data: sesionesData, error: sesionesError } = await supabase
            .from('sesiones')
            .select('*')
            .eq('rutina_id', rutinaData.id)
            .order('orden')

          if (sesionesError) throw sesionesError
          setSesiones(sesionesData || [])
        }
      } catch (error) {
        console.error('Error fetching rutina activa:', error)
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

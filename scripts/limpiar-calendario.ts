import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

const userId = 'd890b311-9890-4f07-8b8b-d2b63b73ceee'

async function limpiarCalendario() {
  console.log('🧹 Limpiando calendario de sesiones vacías\n')

  // Obtener la rutina del usuario
  const { data: rutina } = await supabase
    .from('rutinas')
    .select('id')
    .eq('user_id', userId)
    .eq('activa', true)
    .single()

  if (!rutina) {
    console.log('❌ No se encontró rutina activa')
    return
  }

  // Obtener la semana actual
  const { data: semana } = await supabase
    .from('semanas')
    .select('*')
    .eq('rutina_id', rutina.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!semana) {
    console.log('❌ No se encontró semana')
    return
  }

  console.log(`📅 Semana ${semana.semana_numero}`)
  console.log(`   ID: ${semana.id}`)

  const calendario = semana.calendario as Record<string, any>

  // Mostrar estado actual
  console.log('\n📋 Estado actual del calendario:')
  Object.entries(calendario).forEach(([dia, entrada]) => {
    console.log(`   ${dia}: ${entrada.tipo} - ${entrada.estado || 'normal'}`)
  })

  // Encontrar días marcados como completados SIN datos de tracking
  const diasALimpiar: string[] = []

  for (const [dia, entrada] of Object.entries(calendario)) {
    if (entrada.estado === 'completada' && entrada.tipo === 'gym') {
      // Verificar si hay tracking para esta sesión
      const sesionId = entrada.sesion_id

      if (sesionId) {
        // Obtener ejercicios de esta sesión
        const { data: ejercicios } = await supabase
          .from('ejercicios')
          .select('id')
          .eq('sesion_id', sesionId)

        if (ejercicios && ejercicios.length > 0) {
          const ejercicioIds = ejercicios.map(e => e.id)

          // Verificar si hay tracking
          const { data: tracking } = await supabase
            .from('tracking')
            .select('id')
            .in('ejercicio_id', ejercicioIds)
            .eq('semana_id', semana.id)
            .limit(1)

          if (!tracking || tracking.length === 0) {
            diasALimpiar.push(dia)
          }
        }
      }
    }
  }

  if (diasALimpiar.length === 0) {
    console.log('\n✅ No hay sesiones vacías que limpiar')
    return
  }

  console.log(`\n🗑️ Sesiones vacías a desmarcar: ${diasALimpiar.join(', ')}`)

  // Limpiar calendario
  const calendarioLimpio = { ...calendario }

  diasALimpiar.forEach(dia => {
    calendarioLimpio[dia] = {
      ...calendarioLimpio[dia],
      estado: 'normal',
      timestamp: null
    }
  })

  // Actualizar en la base de datos
  const { error } = await supabase
    .from('semanas')
    .update({ calendario: calendarioLimpio })
    .eq('id', semana.id)

  if (error) {
    console.error('❌ Error:', error)
    return
  }

  console.log('\n✅ Calendario limpiado correctamente')
  console.log('\n📋 Nuevo estado del calendario:')
  Object.entries(calendarioLimpio).forEach(([dia, entrada]) => {
    const cambio = diasALimpiar.includes(dia) ? ' ← LIMPIADO' : ''
    console.log(`   ${dia}: ${entrada.tipo} - ${entrada.estado || 'normal'}${cambio}`)
  })
}

limpiarCalendario()
  .then(() => {
    console.log('\n✅ Script completado')
    process.exit(0)
  })
  .catch(error => {
    console.error('\n❌ Error:', error)
    process.exit(1)
  })

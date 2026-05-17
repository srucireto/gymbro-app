import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.local' })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function eliminarInactivas() {
  console.log('🗑️  Eliminando rutinas inactivas...\n')

  // Obtener rutinas inactivas
  const { data: rutinasInactivas, error: errorGet } = await supabase
    .from('rutinas')
    .select('*')
    .eq('activa', false)

  if (errorGet) {
    console.error('❌ Error al obtener rutinas:', errorGet)
    return
  }

  console.log(`Rutinas inactivas encontradas: ${rutinasInactivas.length}\n`)

  for (const rutina of rutinasInactivas) {
    console.log(`🗑️  Eliminando: ${rutina.nombre}`)
    console.log(`   ID: ${rutina.id}`)

    // 1. Eliminar semanas asociadas
    const { error: errorSemanas } = await supabase
      .from('semanas')
      .delete()
      .eq('rutina_id', rutina.id)

    if (errorSemanas) {
      console.error(`   ❌ Error eliminando semanas: ${errorSemanas.message}`)
      continue
    }
    console.log(`   ✓ Semanas eliminadas`)

    // 2. Eliminar sesiones asociadas
    const { error: errorSesiones } = await supabase
      .from('sesiones')
      .delete()
      .eq('rutina_id', rutina.id)

    if (errorSesiones) {
      console.error(`   ❌ Error eliminando sesiones: ${errorSesiones.message}`)
      continue
    }
    console.log(`   ✓ Sesiones eliminadas`)

    // 3. Eliminar la rutina
    const { error: errorRutina } = await supabase
      .from('rutinas')
      .delete()
      .eq('id', rutina.id)

    if (errorRutina) {
      console.error(`   ❌ Error eliminando rutina: ${errorRutina.message}`)
    } else {
      console.log(`   ✓ Rutina eliminada\n`)
    }
  }

  console.log('✅ Limpieza completada')
}

eliminarInactivas()

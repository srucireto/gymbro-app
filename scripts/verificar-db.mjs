import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.local' })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function verificar() {
  console.log('🔍 Verificando base de datos...\n')

  // Verificar rutinas
  const { data: rutinas, error: rutinasError } = await supabase
    .from('rutinas')
    .select('id, nombre, activa, created_at')
    .order('created_at', { ascending: false })

  if (rutinasError) {
    console.error('❌ Error al consultar rutinas:', rutinasError)
    return
  }

  console.log(`📊 Rutinas encontradas: ${rutinas.length}`)
  rutinas.forEach((r, i) => {
    console.log(`  ${i + 1}. ${r.nombre} (activa: ${r.activa}) - ID: ${r.id.slice(0, 8)}...`)
  })

  // Verificar rutina activa
  const { data: rutinaActiva, error: activaError } = await supabase
    .from('rutinas')
    .select('*')
    .eq('activa', true)

  if (activaError) {
    console.error('\n❌ Error al consultar rutina activa:', activaError)
    return
  }

  console.log(`\n✅ Rutinas activas: ${rutinaActiva.length}`)
  if (rutinaActiva.length > 1) {
    console.log('⚠️  ADVERTENCIA: Hay más de una rutina activa. El .single() fallará.')
  }
}

verificar()

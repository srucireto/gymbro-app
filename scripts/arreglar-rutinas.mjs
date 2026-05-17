import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.local' })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function arreglar() {
  console.log('🔧 Arreglando rutinas duplicadas...\n')

  // Obtener todas las rutinas activas
  const { data: rutinas, error } = await supabase
    .from('rutinas')
    .select('*')
    .eq('activa', true)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('❌ Error:', error)
    return
  }

  console.log(`📊 Rutinas activas encontradas: ${rutinas.length}`)

  if (rutinas.length <= 1) {
    console.log('✅ No hay rutinas duplicadas.')
    return
  }

  // Mantener la más reciente activa, desactivar las demás
  const [rutinaReciente, ...rutinasViejas] = rutinas

  console.log(`\n✅ Manteniendo activa: ${rutinaReciente.nombre} (${rutinaReciente.id.slice(0, 8)}...)`)

  for (const rutina of rutinasViejas) {
    console.log(`❌ Desactivando: ${rutina.nombre} (${rutina.id.slice(0, 8)}...)`)

    const { error: updateError } = await supabase
      .from('rutinas')
      .update({ activa: false })
      .eq('id', rutina.id)

    if (updateError) {
      console.error(`   Error al desactivar: ${updateError.message}`)
    } else {
      console.log(`   ✓ Desactivada exitosamente`)
    }
  }

  console.log('\n🎉 ¡Listo! Ahora solo hay una rutina activa.')
}

arreglar()

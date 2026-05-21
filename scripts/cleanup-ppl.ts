import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function cleanupPPL() {
  console.log('🧹 Limpiando rutinas PPL duplicadas\n')

  // Buscar todas las rutinas PPL
  const { data: rutinas, error: findError } = await supabase
    .from('rutinas')
    .select('*')
    .ilike('nombre', '%PPL%')

  if (findError) {
    console.error('❌ Error buscando rutinas:', findError)
    return
  }

  if (!rutinas || rutinas.length === 0) {
    console.log('✅ No hay rutinas PPL para eliminar')
    return
  }

  console.log(`📋 Encontradas ${rutinas.length} rutinas PPL:`)
  rutinas.forEach(r => {
    console.log(`   - ${r.nombre} (${r.created_at})`)
  })

  console.log('\n🗑️ Eliminando...')

  for (const rutina of rutinas) {
    // Primero eliminar semanas relacionadas
    const { error: semanasError } = await supabase
      .from('semanas')
      .delete()
      .eq('rutina_id', rutina.id)

    if (semanasError) {
      console.error(`   ⚠️ Error eliminando semanas de ${rutina.nombre}:`, semanasError)
    }

    // Luego eliminar sesiones relacionadas
    const { error: sesionesError } = await supabase
      .from('sesiones')
      .delete()
      .eq('rutina_id', rutina.id)

    if (sesionesError) {
      console.error(`   ⚠️ Error eliminando sesiones de ${rutina.nombre}:`, sesionesError)
    }

    // Finalmente eliminar la rutina
    const { error: deleteError } = await supabase
      .from('rutinas')
      .delete()
      .eq('id', rutina.id)

    if (deleteError) {
      console.error(`   ❌ Error eliminando ${rutina.nombre}:`, deleteError)
    } else {
      console.log(`   ✅ Eliminada: ${rutina.nombre}`)
    }
  }

  console.log('\n✅ Limpieza completada')
}

cleanupPPL()
  .then(() => {
    console.log('\n✅ Script completado')
    process.exit(0)
  })
  .catch(error => {
    console.error('\n❌ Error:', error)
    process.exit(1)
  })

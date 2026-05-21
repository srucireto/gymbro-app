import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

// User ID correcto de santiagorucireto@gmail.com
const CORRECT_USER_ID = 'd890b311-9e3e-4c98-a751-9e62b70fe1ac'

async function fixMesociclo() {
  console.log('🔧 Actualizando Mesociclo 1 con el user_id correcto\n')
  console.log('   User ID correcto:', CORRECT_USER_ID)

  // Actualizar Mesociclo 1
  const { error } = await supabase
    .from('rutinas')
    .update({ user_id: CORRECT_USER_ID })
    .ilike('nombre', '%mesociclo%')

  if (error) {
    console.error('❌ Error:', error)
    return
  }

  console.log('✅ Mesociclo 1 actualizado correctamente')

  // Verificar
  const { data } = await supabase
    .from('rutinas')
    .select('*')
    .ilike('nombre', '%mesociclo%')
    .single()

  if (data) {
    console.log('\n📋 Verificación:')
    console.log(`   Nombre: ${data.nombre}`)
    console.log(`   User ID: ${data.user_id}`)
    console.log(`   Coincide: ${data.user_id === CORRECT_USER_ID ? '✓' : '✗'}`)
  }
}

fixMesociclo()
  .then(() => {
    console.log('\n✅ Completado')
    process.exit(0)
  })
  .catch(error => {
    console.error('\n❌ Error:', error)
    process.exit(1)
  })

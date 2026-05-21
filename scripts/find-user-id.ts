import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function findUserId() {
  console.log('🔍 Buscando user_id de santiagorucireto@gmail.com\n')

  // Buscar user_ids únicos en las rutinas
  const { data: rutinas } = await supabase
    .from('rutinas')
    .select('user_id')

  const userIds = [...new Set(rutinas?.map(r => r.user_id).filter(Boolean))]

  console.log('📋 User IDs encontrados en rutinas:')
  userIds.forEach(id => console.log(`   - ${id}`))

  // Si solo hay un user_id (además del null), ese debe ser de santiagorucireto
  if (userIds.length === 1) {
    console.log(`\n✅ Solo hay un user_id: ${userIds[0]}`)
    console.log('   Probablemente este es de santiagorucireto@gmail.com')

    // Actualizar Mesociclo 1
    console.log('\n🔄 Actualizando Mesociclo 1...')
    const { data: mesociclo, error: findError } = await supabase
      .from('rutinas')
      .select('*')
      .ilike('nombre', '%mesociclo%')
      .single()

    if (findError || !mesociclo) {
      console.error('❌ No se encontró Mesociclo 1')
      return
    }

    const { error: updateError } = await supabase
      .from('rutinas')
      .update({ user_id: userIds[0] })
      .eq('id', mesociclo.id)

    if (updateError) {
      console.error('❌ Error al actualizar:', updateError)
      return
    }

    console.log('✅ Mesociclo 1 actualizado correctamente')

    // Desactivar las otras rutinas de este usuario
    console.log('\n🔄 Desactivando otras rutinas...')
    const { error: deactivateError } = await supabase
      .from('rutinas')
      .update({ activa: false })
      .eq('user_id', userIds[0])
      .neq('id', mesociclo.id)

    if (deactivateError) {
      console.error('⚠️ Error al desactivar otras rutinas:', deactivateError)
    } else {
      console.log('✅ Otras rutinas desactivadas')
    }

  } else {
    console.log(`\n⚠️ Hay ${userIds.length} user_ids diferentes`)
    console.log('No puedo determinar automáticamente cuál es de santiagorucireto@gmail.com')
  }
}

findUserId()
  .then(() => {
    console.log('\n✅ Completado')
    process.exit(0)
  })
  .catch(error => {
    console.error('\n❌ Error:', error)
    process.exit(1)
  })

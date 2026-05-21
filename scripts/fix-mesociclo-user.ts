import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function fixMesocicloUser() {
  console.log('🔧 Arreglando user_id de Mesociclo 1\n')

  // Obtener el usuario actual (santiagorucireto@gmail.com debe estar logueado)
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    console.error('❌ Error: No hay usuario autenticado')
    console.log('\nDebes estar logueado como santiagorucireto@gmail.com')
    console.log('Puedes autenticarte temporalmente en el navegador y copiar el token')
    return
  }

  console.log('✅ Usuario autenticado:', user.email)
  console.log('   User ID:', user.id)

  // Buscar la rutina Mesociclo 1
  const { data: rutinas, error: rutinasError } = await supabase
    .from('rutinas')
    .select('*')
    .ilike('nombre', '%mesociclo%')

  if (rutinasError) {
    console.error('❌ Error buscando rutinas:', rutinasError)
    return
  }

  if (!rutinas || rutinas.length === 0) {
    console.log('❌ No se encontró rutina Mesociclo')
    return
  }

  const mesociclo = rutinas[0]
  console.log('\n📋 Rutina encontrada:')
  console.log(`   Nombre: ${mesociclo.nombre}`)
  console.log(`   user_id actual: ${mesociclo.user_id}`)
  console.log(`   activa: ${mesociclo.activa}`)

  // Actualizar el user_id
  console.log('\n🔄 Actualizando user_id...')
  const { error: updateError } = await supabase
    .from('rutinas')
    .update({ user_id: user.id })
    .eq('id', mesociclo.id)

  if (updateError) {
    console.error('❌ Error al actualizar:', updateError)
    return
  }

  console.log('✅ Rutina actualizada correctamente')
  console.log(`   ${mesociclo.nombre} ahora pertenece a ${user.email}`)

  // Verificar
  const { data: verificacion } = await supabase
    .from('rutinas')
    .select('*')
    .eq('id', mesociclo.id)
    .single()

  if (verificacion) {
    console.log('\n✅ Verificación:')
    console.log(`   user_id: ${verificacion.user_id}`)
    console.log(`   Coincide: ${verificacion.user_id === user.id ? '✓' : '✗'}`)
  }
}

fixMesocicloUser()
  .then(() => {
    console.log('\n✅ Completado')
    process.exit(0)
  })
  .catch(error => {
    console.error('\n❌ Error:', error)
    process.exit(1)
  })

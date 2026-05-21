import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function diagnosticar() {
  console.log('🔍 Diagnóstico de rutinas y usuarios\n')

  // 1. Listar todos los usuarios
  console.log('📋 USUARIOS:')
  const { data: users, error: usersError } = await supabase.auth.admin.listUsers()

  if (usersError) {
    console.error('Error obteniendo usuarios:', usersError)
  } else {
    users.users.forEach(user => {
      console.log(`  - ${user.email} → ${user.id}`)
    })
  }

  console.log('\n📋 RUTINAS:')

  // 2. Listar todas las rutinas
  const { data: rutinas, error: rutinasError } = await supabase
    .from('rutinas')
    .select('*')
    .order('created_at', { ascending: false })

  if (rutinasError) {
    console.error('Error obteniendo rutinas:', rutinasError)
    return
  }

  if (!rutinas || rutinas.length === 0) {
    console.log('  No hay rutinas en la base de datos')
    return
  }

  rutinas.forEach(rutina => {
    console.log(`  - "${rutina.nombre}"`)
    console.log(`    user_id: ${rutina.user_id}`)
    console.log(`    activa: ${rutina.activa}`)
    console.log(`    created_at: ${new Date(rutina.created_at).toLocaleString('es-ES')}`)
    console.log('')
  })

  // 3. Buscar específicamente "Mesociclo 1"
  console.log('🔎 Buscando "Mesociclo 1":')
  const mesociclo1 = rutinas.find(r => r.nombre.toLowerCase().includes('mesociclo'))

  if (mesociclo1) {
    console.log(`  ✅ Encontrada: "${mesociclo1.nombre}"`)
    console.log(`     user_id: ${mesociclo1.user_id}`)
    console.log(`     activa: ${mesociclo1.activa}`)

    // Verificar a qué usuario pertenece
    const owner = users.users.find(u => u.id === mesociclo1.user_id)
    if (owner) {
      console.log(`     Pertenece a: ${owner.email}`)
    } else {
      console.log(`     ⚠️  user_id no coincide con ningún usuario existente`)
    }
  } else {
    console.log('  ❌ No se encontró rutina "Mesociclo 1"')
  }

  // 4. Verificar usuario específico
  console.log('\n🔎 Usuario santiagorucireto@gmail.com:')
  const santiago = users.users.find(u => u.email === 'santiagorucireto@gmail.com')

  if (santiago) {
    console.log(`  ID: ${santiago.id}`)
    const susRutinas = rutinas.filter(r => r.user_id === santiago.id)
    console.log(`  Rutinas: ${susRutinas.length}`)
    susRutinas.forEach(r => {
      console.log(`    - ${r.nombre} ${r.activa ? '(ACTIVA)' : ''}`)
    })
  } else {
    console.log('  ❌ Usuario no encontrado')
  }
}

diagnosticar()
  .then(() => {
    console.log('\n✅ Diagnóstico completado')
    process.exit(0)
  })
  .catch(error => {
    console.error('\n❌ Error:', error)
    process.exit(1)
  })

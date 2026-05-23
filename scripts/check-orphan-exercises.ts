import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

const TEST_EMAIL = 'test@gymbro.com'
const TEST_PASSWORD = 'test123456'

async function checkOrphanExercises() {
  console.log('🔍 VERIFICACIÓN DE EJERCICIOS HUÉRFANOS\n')

  const { data: authData } = await supabase.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD
  })

  const userId = authData.user!.id

  const { data: rutina } = await supabase
    .from('rutinas')
    .select('id')
    .eq('user_id', userId)
    .eq('activa', true)
    .single()

  const { data: sesiones } = await supabase
    .from('sesiones')
    .select('id')
    .eq('rutina_id', rutina!.id)

  const sesionIds = sesiones!.map(s => s.id)

  // Obtener ejercicios huérfanos
  const { data: huerfanos } = await supabase
    .from('ejercicios')
    .select('id, nombre, grupo_muscular, sesion_id')
    .not('sesion_id', 'in', `(${sesionIds.join(',')})`)

  console.log(`Total ejercicios huérfanos: ${huerfanos?.length || 0}\n`)

  let conTracking = 0
  let sinTracking = 0

  for (const ej of huerfanos || []) {
    const { count } = await supabase
      .from('tracking')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('ejercicio_id', ej.id)

    if (count && count > 0) {
      console.log(`⚠️  ${ej.nombre} - ${count} sets (TIENE TRACKING)`)
      conTracking++
    } else {
      sinTracking++
    }
  }

  console.log(`\n📊 RESUMEN:`)
  console.log(`   ✅ Ejercicios huérfanos CON tracking: ${conTracking}`)
  console.log(`   ❌ Ejercicios huérfanos SIN tracking: ${sinTracking}`)

  if (conTracking === 0) {
    console.log(`\n✨ TODOS los ejercicios huérfanos pueden ser eliminados de forma segura`)
    console.log(`   (no tienen tracking asociado)`)
  } else {
    console.log(`\n⚠️  PRECAUCIÓN: ${conTracking} ejercicios huérfanos tienen tracking`)
    console.log(`   No deberían eliminarse sin investigar primero`)
  }
}

checkOrphanExercises()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Error:', error)
    process.exit(1)
  })

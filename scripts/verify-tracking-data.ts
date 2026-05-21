import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

const TEST_EMAIL = 'test@gymbro.com'
const TEST_PASSWORD = 'test123456'

async function verifyTrackingData() {
  console.log('🔍 Verificando datos de tracking\n')

  // Autenticar
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD
  })

  if (authError || !authData.user) {
    console.error('❌ Error de autenticación:', authError?.message)
    process.exit(1)
  }

  const userId = authData.user.id
  console.log(`✅ Autenticado como: ${authData.user.email}`)
  console.log(`   User ID: ${userId}\n`)

  // Verificar semanas
  const { data: semanas, error: semanasError } = await supabase
    .from('semanas')
    .select('id, semana_numero, fecha_inicio')
    .eq('user_id', userId)
    .order('semana_numero')

  console.log(`📅 Semanas encontradas: ${semanas?.length || 0}`)
  if (semanasError) {
    console.error('Error:', semanasError)
  }

  if (semanas && semanas.length > 0) {
    semanas.forEach(s => {
      console.log(`   - Semana ${s.semana_numero}: ${s.fecha_inicio} (ID: ${s.id.substring(0, 8)}...)`)
    })

    // Para cada semana, buscar tracking
    for (const semana of semanas) {
      console.log(`\n🔍 Tracking para Semana ${semana.semana_numero}:`)

      const { data: tracking, error: trackError } = await supabase
        .from('tracking')
        .select('ejercicio_id, numero_serie, peso, reps')
        .eq('semana_id', semana.id)

      if (trackError) {
        console.error(`   Error: ${trackError.message}`)
      } else {
        console.log(`   Total sets: ${tracking?.length || 0}`)
        if (tracking && tracking.length > 0) {
          tracking.slice(0, 3).forEach((t, i) => {
            console.log(`   ${i + 1}. Serie ${t.numero_serie}: ${t.peso}kg × ${t.reps} reps`)
          })
          if (tracking.length > 3) {
            console.log(`   ... y ${tracking.length - 3} sets más`)
          }
        }
      }
    }
  }

  // También buscar TODOS los tracking del usuario sin filtrar por semana
  console.log('\n📊 Tracking total del usuario (sin filtrar por semana):')
  const { data: allTracking, error: allError } = await supabase
    .from('tracking')
    .select('*')
    .eq('user_id', userId)

  if (allError) {
    console.error(`Error: ${allError.message}`)
  } else {
    console.log(`Total sets: ${allTracking?.length || 0}`)
  }
}

verifyTrackingData()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('\n❌ Error:', error)
    process.exit(1)
  })

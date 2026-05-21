import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function checkAllTracking() {
  const testUserId = '868619cb-b255-4335-ba0b-8768c37dbc05'

  // Ver TODOS los registros de tracking (sin filtrar por usuario)
  const { data: allTracking, error } = await supabase
    .from('tracking')
    .select('user_id, ejercicio_id, numero_serie, peso, reps, semana_id')
    .order('created_at', { ascending: false })
    .limit(10)

  console.log('Últimos 10 registros de tracking en la base de datos:')
  console.log('─'.repeat(60))

  if (error) {
    console.error('Error:', error)
    return
  }

  if (!allTracking || allTracking.length === 0) {
    console.log('No hay registros de tracking en la base de datos')
    return
  }

  allTracking.forEach((t, i) => {
    const isTestUser = t.user_id === testUserId
    const marker = isTestUser ? '✓ TEST USER' : '  '
    console.log(`${i + 1}. ${marker} user_id: ${t.user_id?.substring(0, 8)}..., ejercicio: ${t.ejercicio_id?.substring(0, 8)}..., serie: ${t.numero_serie}, peso: ${t.peso}kg, reps: ${t.reps}`)
  })

  // Contar por usuario
  console.log('\n' + '─'.repeat(60))
  console.log('Conteo por usuario:')

  const { data: countByUser } = await supabase
    .from('tracking')
    .select('user_id')

  if (countByUser) {
    const userCounts = countByUser.reduce((acc: any, t) => {
      const uid = t.user_id || 'NULL'
      acc[uid] = (acc[uid] || 0) + 1
      return acc
    }, {})

    Object.entries(userCounts).forEach(([uid, count]) => {
      const isTestUser = uid === testUserId
      const label = isTestUser ? 'TEST USER' : uid.substring(0, 8) + '...'
      console.log(`  ${label}: ${count} registros`)
    })
  }
}

checkAllTracking()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error:', error)
    process.exit(1)
  })

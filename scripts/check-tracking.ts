import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function checkTracking() {
  const userId = '868619cb-b255-4335-ba0b-8768c37dbc05'

  // Get all tracking data for this user
  const { data: tracking, error } = await supabase
    .from('tracking')
    .select('*')
    .eq('user_id', userId)

  console.log(`Total tracking records for test user: ${tracking?.length || 0}`)

  if (tracking && tracking.length > 0) {
    console.log('\nFirst 5 records:')
    tracking.slice(0, 5).forEach((t, i) => {
      console.log(`  ${i + 1}. Ejercicio: ${t.ejercicio_id}, Serie: ${t.numero_serie}, Peso: ${t.peso}kg, Reps: ${t.reps}`)
    })

    // Get total stats
    const totalSets = tracking.length
    const totalReps = tracking.reduce((sum, t) => sum + (t.reps || 0), 0)
    const totalKg = tracking.reduce((sum, t) => sum + ((t.peso || 0) * (t.reps || 0)), 0)

    console.log(`\nStats:`)
    console.log(`  Total Sets: ${totalSets}`)
    console.log(`  Total Reps: ${totalReps}`)
    console.log(`  Total kg: ${(totalKg / 1000).toFixed(1)}k`)
  }

  if (error) {
    console.error('Error:', error)
  }
}

checkTracking()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error:', error)
    process.exit(1)
  })

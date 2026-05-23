import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

const TEST_EMAIL = 'test@gymbro.com'
const TEST_PASSWORD = 'test123456'

async function listExactNames() {
  const { data: authData } = await supabase.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD
  })

  const userId = authData.user!.id

  // Buscar ejercicios relacionados con los grupos problemáticos
  const gruposMusculares = ['Hombro posterior', 'Hombro lateral', 'Pantorrilla', 'Pecho inferior']

  console.log('📋 NOMBRES EXACTOS EN BASE DE DATOS:\n')
  console.log('='.repeat(80))

  for (const grupo of gruposMusculares) {
    const { data: ejercicios } = await supabase
      .from('ejercicios')
      .select('id, nombre, grupo_muscular, series')
      .eq('grupo_muscular', grupo)

    console.log(`\n${grupo}:`)

    if (!ejercicios || ejercicios.length === 0) {
      console.log('  ❌ No hay ejercicios')
      continue
    }

    for (const ej of ejercicios) {
      console.log(`  📌 "${ej.nombre}" (${ej.series} series)`)

      // Verificar tracking
      const { count } = await supabase
        .from('tracking')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('ejercicio_id', ej.id)

      const { data: tracking } = await supabase
        .from('tracking')
        .select('peso, reps')
        .eq('user_id', userId)
        .eq('ejercicio_id', ej.id)

      if (tracking && tracking.length > 0) {
        const pesos = tracking.map(t => t.peso || 0)
        const pesoMin = Math.min(...pesos)
        const pesoMax = Math.max(...pesos)
        const volumen = tracking.reduce((sum, t) => sum + (t.peso || 0) * (t.reps || 0), 0)

        console.log(`     → ${count} sets`)
        console.log(`     → Peso: ${pesoMin}kg - ${pesoMax}kg`)
        console.log(`     → Volumen: ${(volumen / 1000).toFixed(1)}k kg`)
      } else {
        console.log(`     → ❌ SIN TRACKING`)
      }
    }
  }

  console.log('\n' + '='.repeat(80))
}

listExactNames()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Error:', error)
    process.exit(1)
  })

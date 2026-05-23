import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

const TEST_EMAIL = 'test@gymbro.com'
const TEST_PASSWORD = 'test123456'

// Ejercicios que el usuario reportó mostrando 0kg
const EJERCICIOS_PROBLEMA = [
  'Hip thrust liviano',
  'Face pull',
  'Elevación lateral con mancuernas',
  'Rear delt fly',
  'Elevación lateral en cable',
  'Curl de pierna sentado liviano',
  'Pantorrilla de pie',
  'Pantorrilla de pie liviano',
  'Cruce de poleas'
]

async function verifySpecificExercises() {
  console.log('🔍 VERIFICACIÓN DE EJERCICIOS ESPECÍFICOS\n')
  console.log('='.repeat(80))

  const { data: authData } = await supabase.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD
  })

  const userId = authData.user!.id

  console.log(`\n📧 Usuario: ${TEST_EMAIL}`)
  console.log(`🆔 User ID: ${userId}\n`)

  for (const ejercicioNombre of EJERCICIOS_PROBLEMA) {
    console.log('\n' + '-'.repeat(80))
    console.log(`💪 ${ejercicioNombre}`)
    console.log('-'.repeat(80))

    // 1. Buscar ejercicio en tabla ejercicios
    const { data: ejercicio } = await supabase
      .from('ejercicios')
      .select('id, nombre, grupo_muscular, series')
      .ilike('nombre', ejercicioNombre)
      .single()

    if (!ejercicio) {
      console.log('❌ NO EXISTE en tabla ejercicios')
      continue
    }

    console.log(`✅ Existe en tabla ejercicios:`)
    console.log(`   ID: ${ejercicio.id}`)
    console.log(`   Grupo muscular: ${ejercicio.grupo_muscular}`)
    console.log(`   Series configuradas: ${ejercicio.series}`)

    // 2. Contar tracking records
    const { data: trackingRecords, count } = await supabase
      .from('tracking')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .eq('ejercicio_id', ejercicio.id)

    console.log(`\n📊 Tracking records: ${count || 0}`)

    if (!trackingRecords || trackingRecords.length === 0) {
      console.log('❌ NO HAY TRACKING PARA ESTE EJERCICIO')
      continue
    }

    // 3. Analizar pesos y reps
    const pesos = trackingRecords.map(t => t.peso || 0)
    const reps = trackingRecords.map(t => t.reps || 0)
    const pesoMin = Math.min(...pesos)
    const pesoMax = Math.max(...pesos)
    const pesoPromedio = pesos.reduce((a, b) => a + b, 0) / pesos.length
    const repsMin = Math.min(...reps)
    const repsMax = Math.max(...reps)
    const repsPromedio = reps.reduce((a, b) => a + b, 0) / reps.length
    const volumenTotal = trackingRecords.reduce((sum, t) => sum + (t.peso || 0) * (t.reps || 0), 0)

    console.log(`\n   Peso: ${pesoMin.toFixed(1)}kg - ${pesoMax.toFixed(1)}kg (promedio: ${pesoPromedio.toFixed(1)}kg)`)
    console.log(`   Reps: ${repsMin} - ${repsMax} (promedio: ${repsPromedio.toFixed(1)})`)
    console.log(`   Volumen total: ${(volumenTotal / 1000).toFixed(1)}k kg`)

    // 4. Verificar NULL values
    const conPesoNull = trackingRecords.filter(t => t.peso === null || t.peso === undefined).length
    const conRepsNull = trackingRecords.filter(t => t.reps === null || t.reps === undefined).length
    const conPesoCero = trackingRecords.filter(t => t.peso === 0).length

    if (conPesoNull > 0 || conRepsNull > 0 || conPesoCero > 0) {
      console.log(`\n⚠️  PROBLEMAS DETECTADOS:`)
      if (conPesoNull > 0) console.log(`   - ${conPesoNull} sets con peso NULL`)
      if (conRepsNull > 0) console.log(`   - ${conRepsNull} sets con reps NULL`)
      if (conPesoCero > 0) console.log(`   - ${conPesoCero} sets con peso = 0`)
    }

    // 5. Mostrar algunos registros de ejemplo
    console.log(`\n   Primeros 3 sets:`)
    trackingRecords.slice(0, 3).forEach((t, i) => {
      console.log(`   ${i + 1}. Serie ${t.numero_serie}: ${t.peso}kg × ${t.reps} reps`)
    })
  }

  console.log('\n' + '='.repeat(80))
  console.log('✅ VERIFICACIÓN COMPLETA')
  console.log('='.repeat(80))

  // Resumen final
  console.log('\n📌 RESUMEN:')
  console.log(`Total ejercicios verificados: ${EJERCICIOS_PROBLEMA.length}`)

  // Verificar agregación por grupo muscular
  console.log('\n🔬 VERIFICACIÓN DE AGREGACIÓN POR GRUPO MUSCULAR:\n')

  const { data: allTracking } = await supabase
    .from('tracking')
    .select(`
      *,
      ejercicio:ejercicios(nombre, grupo_muscular)
    `)
    .eq('user_id', userId)

  if (allTracking) {
    const porGrupo = allTracking.reduce((acc: any, t: any) => {
      const grupo = t.ejercicio?.grupo_muscular || 'Desconocido'
      if (!acc[grupo]) {
        acc[grupo] = { sets: 0, volumen: 0, ejercicios: new Set() }
      }
      acc[grupo].sets++
      acc[grupo].volumen += (t.peso || 0) * (t.reps || 0)
      acc[grupo].ejercicios.add(t.ejercicio?.nombre || 'Desconocido')
      return acc
    }, {})

    // Filtrar solo grupos relacionados con ejercicios problema
    const gruposRelevantes = new Set<string>()
    EJERCICIOS_PROBLEMA.forEach(nombre => {
      const tracking = allTracking.find((t: any) => t.ejercicio?.nombre === nombre)
      if (tracking?.ejercicio?.grupo_muscular) {
        gruposRelevantes.add(tracking.ejercicio.grupo_muscular)
      }
    })

    console.log('Grupos musculares de ejercicios con problema reportado:\n')
    Array.from(gruposRelevantes).forEach(grupo => {
      const stats = porGrupo[grupo]
      if (stats) {
        console.log(`${grupo}:`)
        console.log(`  Sets totales: ${stats.sets}`)
        console.log(`  Volumen total: ${(stats.volumen / 1000).toFixed(1)}k kg`)
        console.log(`  Ejercicios: ${Array.from(stats.ejercicios).join(', ')}`)
        console.log()
      }
    })
  }
}

verifySpecificExercises()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('\n❌ Error:', error)
    process.exit(1)
  })

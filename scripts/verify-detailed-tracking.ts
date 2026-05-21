import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

const TEST_EMAIL = 'test@gymbro.com'
const TEST_PASSWORD = 'test123456'

async function verifyDetailedTracking() {
  console.log('🔍 Verificación DETALLADA de datos\n')

  const { data: authData } = await supabase.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD
  })

  if (!authData.user) {
    console.error('❌ Error de autenticación')
    process.exit(1)
  }

  const userId = authData.user.id
  console.log(`✅ Usuario: ${TEST_EMAIL}`)
  console.log(`   ID: ${userId}\n`)

  // Obtener tracking con información de ejercicios
  const { data: tracking } = await supabase
    .from('tracking')
    .select(`
      *,
      ejercicio:ejercicios(nombre, grupo_muscular, series),
      semana:semanas(semana_numero, fecha_inicio)
    `)
    .eq('user_id', userId)
    .order('created_at')

  if (!tracking || tracking.length === 0) {
    console.log('❌ No hay datos de tracking')
    return
  }

  console.log(`📊 Total: ${tracking.length} sets registrados\n`)

  // Agrupar por semana
  const porSemana = tracking.reduce((acc: any, t: any) => {
    const semNum = t.semana?.semana_numero || 'Sin semana'
    if (!acc[semNum]) acc[semNum] = []
    acc[semNum].push(t)
    return acc
  }, {})

  Object.keys(porSemana).sort().forEach((semNum: string) => {
    const sets = porSemana[semNum]
    const semana = sets[0].semana

    console.log(`📅 Semana ${semNum} (${semana?.fecha_inicio || 'N/A'})`)
    console.log(`   Total: ${sets.length} sets\n`)

    // Agrupar por ejercicio
    const porEjercicio = sets.reduce((acc: any, t: any) => {
      const nombre = t.ejercicio?.nombre || 'Desconocido'
      if (!acc[nombre]) acc[nombre] = []
      acc[nombre].push(t)
      return acc
    }, {})

    Object.entries(porEjercicio).forEach(([nombre, ejercicioSets]: [string, any]) => {
      const ej = ejercicioSets[0].ejercicio
      console.log(`   💪 ${nombre} (${ej?.grupo_muscular || 'N/A'})`)
      console.log(`      Series planeadas: ${ej?.series || 'N/A'}`)
      console.log(`      Sets registrados: ${ejercicioSets.length}`)

      // Mostrar cada set
      ejercicioSets.forEach((set: any) => {
        console.log(`        • Serie ${set.numero_serie}: ${set.peso}kg × ${set.reps} reps`)
      })
      console.log()
    })
  })

  // Resumen por grupo muscular
  console.log('─'.repeat(60))
  console.log('📊 RESUMEN POR GRUPO MUSCULAR\n')

  const porGrupo = tracking.reduce((acc: any, t: any) => {
    const grupo = t.ejercicio?.grupo_muscular || 'Desconocido'
    if (!acc[grupo]) {
      acc[grupo] = { sets: 0, reps: 0, kg: 0 }
    }
    acc[grupo].sets++
    acc[grupo].reps += t.reps
    acc[grupo].kg += t.peso * t.reps
    return acc
  }, {})

  Object.entries(porGrupo).forEach(([grupo, stats]: [string, any]) => {
    console.log(`${grupo}:`)
    console.log(`  ${stats.sets} sets, ${stats.reps} reps, ${(stats.kg / 1000).toFixed(1)}k kg total`)
  })
}

verifyDetailedTracking()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('\n❌ Error:', error)
    process.exit(1)
  })

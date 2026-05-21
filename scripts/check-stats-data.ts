import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Cargar variables de entorno desde .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

const TEST_EMAIL = 'test@gymbro.com'
const TEST_PASSWORD = 'test123456'

async function checkStatsData() {
  console.log('📊 Verificando datos para sección STATS\n')

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

  // Obtener rutina activa
  const { data: rutina } = await supabase
    .from('rutinas')
    .select('*')
    .eq('user_id', userId)
    .eq('activa', true)
    .single()

  if (!rutina) {
    console.error('❌ No hay rutina activa')
    process.exit(1)
  }

  console.log('📅 RUTINA ACTIVA')
  console.log(`   Nombre: ${rutina.nombre}`)
  console.log(`   Duración: ${rutina.semanas_duracion} semanas`)
  console.log(`   Fecha inicio: ${rutina.fecha_inicio}\n`)

  // ======================================
  // TAB 1: AUSENCIAS (illness/missed)
  // ======================================
  const { data: semanas } = await supabase
    .from('semanas')
    .select('*')
    .eq('rutina_id', rutina.id)
    .order('semana_numero')

  console.log('='.repeat(60))
  console.log('TAB 1: AUSENCIAS (illness/missed)')
  console.log('='.repeat(60))

  let totalIllness = 0
  let totalMissed = 0

  if (semanas) {
    semanas.forEach(semana => {
      const cal = semana.calendario as Record<string, any>
      const illnessDays = Object.entries(cal).filter(([_, v]) => v.estado === 'illness')
      const missedDays = Object.entries(cal).filter(([_, v]) => v.estado === 'missed')

      if (illnessDays.length > 0 || missedDays.length > 0) {
        console.log(`\nSemana ${semana.semana_numero} (${semana.fecha_inicio}):`)
        if (illnessDays.length > 0) {
          console.log(`  🤒 Illness: ${illnessDays.map(([k]) => k).join(', ')}`)
          totalIllness += illnessDays.length
        }
        if (missedDays.length > 0) {
          console.log(`  ⏭️  Missed: ${missedDays.map(([k]) => k).join(', ')}`)
          totalMissed += missedDays.length
        }
      }
    })
  }

  if (totalIllness === 0 && totalMissed === 0) {
    console.log('\n✓ No hay ausencias registradas')
  } else {
    console.log(`\n📊 TOTAL: ${totalIllness} illness, ${totalMissed} missed`)
  }

  // ======================================
  // TAB 2: PROGRESO (tracking por semana)
  // ======================================
  console.log('\n' + '='.repeat(60))
  console.log('TAB 2: PROGRESO (ejercicios completados)')
  console.log('='.repeat(60))

  const { data: tracking } = await supabase
    .from('tracking')
    .select(`
      *,
      ejercicio:ejercicios(nombre, grupo_muscular),
      semana:semanas(semana_numero, fecha_inicio)
    `)
    .eq('user_id', userId)
    .order('created_at')

  if (!tracking || tracking.length === 0) {
    console.log('\n⚠️ No hay datos de tracking')
  } else {
    const porSemana = tracking.reduce((acc: any, t: any) => {
      const semNum = t.semana?.semana_numero || 'Sin semana'
      if (!acc[semNum]) acc[semNum] = []
      acc[semNum].push(t)
      return acc
    }, {})

    Object.keys(porSemana).sort().forEach((semNum: string) => {
      const sets = porSemana[semNum]
      console.log(`\nSemana ${semNum}:`)
      console.log(`  Total sets: ${sets.length}`)

      // Agrupar por ejercicio
      const porEjercicio = sets.reduce((acc: any, t: any) => {
        const nombre = t.ejercicio?.nombre || 'Desconocido'
        if (!acc[nombre]) acc[nombre] = []
        acc[nombre].push(t)
        return acc
      }, {})

      Object.entries(porEjercicio).forEach(([nombre, ejercicioSets]: [string, any]) => {
        console.log(`    ${nombre}: ${ejercicioSets.length} sets`)
      })
    })

    console.log(`\n📊 TOTAL: ${tracking.length} sets registrados`)
  }

  // ======================================
  // TAB 3: MÚSCULOS (volumen por grupo)
  // ======================================
  console.log('\n' + '='.repeat(60))
  console.log('TAB 3: MÚSCULOS (volumen por grupo muscular)')
  console.log('='.repeat(60))

  if (!tracking || tracking.length === 0) {
    console.log('\n⚠️ No hay datos de tracking')
  } else {
    const porGrupo = tracking.reduce((acc: any, t: any) => {
      const grupo = t.ejercicio?.grupo_muscular || 'Desconocido'
      if (!acc[grupo]) {
        acc[grupo] = { sets: 0, reps: 0, volumen: 0 }
      }
      acc[grupo].sets++
      acc[grupo].reps += t.reps
      acc[grupo].volumen += t.peso * t.reps
      return acc
    }, {})

    console.log()
    Object.entries(porGrupo)
      .sort(([, a]: [string, any], [, b]: [string, any]) => b.volumen - a.volumen)
      .forEach(([grupo, stats]: [string, any]) => {
        console.log(`${grupo}:`)
        console.log(`  Sets: ${stats.sets}`)
        console.log(`  Reps totales: ${stats.reps}`)
        console.log(`  Volumen: ${(stats.volumen / 1000).toFixed(1)}k kg`)
      })
  }

  console.log('\n' + '='.repeat(60))
  console.log('✅ Verificación completa')
  console.log('='.repeat(60))
}

checkStatsData()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('\n❌ Error:', error)
    process.exit(1)
  })

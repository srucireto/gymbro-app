import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

const TEST_EMAIL = 'test@gymbro.com'
const TEST_PASSWORD = 'test123456'

async function debugMuscleGroups() {
  console.log('🔍 Debug: Grupos Musculares\n')

  const { data: authData } = await supabase.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD
  })

  const userId = authData.user!.id

  // Obtener tracking con información de ejercicios
  const { data: tracking } = await supabase
    .from('tracking')
    .select(`
      *,
      ejercicio:ejercicios(nombre, grupo_muscular),
      semana:semanas(semana_numero)
    `)
    .eq('user_id', userId)
    .order('created_at')

  if (!tracking || tracking.length === 0) {
    console.log('❌ No hay datos de tracking')
    return
  }

  console.log(`Total sets registrados: ${tracking.length}\n`)

  // Agrupar por grupo muscular
  const porGrupo: Record<string, any[]> = {}

  tracking.forEach(t => {
    const grupo = t.ejercicio?.grupo_muscular || 'Desconocido'
    if (!porGrupo[grupo]) {
      porGrupo[grupo] = []
    }
    porGrupo[grupo].push(t)
  })

  console.log('📊 DESGLOSE POR GRUPO MUSCULAR:\n')

  Object.entries(porGrupo).forEach(([grupo, sets]) => {
    console.log(`${grupo}:`)
    console.log(`  Total sets: ${sets.length}`)

    // Agrupar por ejercicio dentro de este grupo
    const porEjercicio: Record<string, any[]> = {}
    sets.forEach(t => {
      const nombre = t.ejercicio?.nombre || 'Desconocido'
      if (!porEjercicio[nombre]) {
        porEjercicio[nombre] = []
      }
      porEjercicio[nombre].push(t)
    })

    Object.entries(porEjercicio).forEach(([nombre, ejercicioSets]) => {
      const totalReps = ejercicioSets.reduce((sum, t) => sum + t.reps, 0)
      const totalVolumen = ejercicioSets.reduce((sum, t) => sum + (t.peso * t.reps), 0)
      console.log(`    ${nombre}:`)
      console.log(`      Sets: ${ejercicioSets.length}`)
      console.log(`      Reps: ${totalReps}`)
      console.log(`      Volumen: ${(totalVolumen / 1000).toFixed(1)}k kg`)
    })

    const totalReps = sets.reduce((sum, t) => sum + t.reps, 0)
    const totalVolumen = sets.reduce((sum, t) => sum + (t.peso * t.reps), 0)
    console.log(`  TOTAL GRUPO: ${sets.length} sets, ${totalReps} reps, ${(totalVolumen / 1000).toFixed(1)}k kg\n`)
  })

  // Ahora verificar qué muestra la UI
  console.log('='.repeat(60))
  console.log('VERIFICACIÓN CON LO QUE DEBE MOSTRAR LA UI:\n')

  // La UI agrupa algunos grupos musculares bajo categorías más generales
  // Por ejemplo, "Hombros" en UI puede incluir "Hombros" y "Hombro anterior"
  // "Pecho" en UI puede incluir "Pecho", "Pecho clavicular", "Pecho general"

  const uiGroupings: Record<string, string[]> = {
    'Hombros (UI)': ['Hombros', 'Hombro anterior'],
    'Pecho (UI)': ['Pecho', 'Pecho clavicular', 'Pecho general'],
    'Tríceps (UI)': ['Tríceps']
  }

  Object.entries(uiGroupings).forEach(([uiName, dbGroups]) => {
    const allSets = dbGroups.flatMap(g => porGrupo[g] || [])
    const totalReps = allSets.reduce((sum, t) => sum + t.reps, 0)
    const totalVolumen = allSets.reduce((sum, t) => sum + (t.peso * t.reps), 0)

    console.log(`${uiName}:`)
    console.log(`  Grupos DB incluidos: ${dbGroups.join(', ')}`)
    console.log(`  Sets: ${allSets.length}`)
    console.log(`  Reps: ${totalReps}`)
    console.log(`  Volumen: ${(totalVolumen / 1000).toFixed(1)}k kg\n`)
  })
}

debugMuscleGroups()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('\n❌ Error:', error)
    process.exit(1)
  })

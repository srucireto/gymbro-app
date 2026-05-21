import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

const TEST_EMAIL = 'test@gymbro.com'
const TEST_PASSWORD = 'test123456'

async function showDetailedTracking() {
  console.log('📋 ANÁLISIS DETALLADO DE TRACKING\n')
  console.log('='.repeat(70))

  const { data: authData } = await supabase.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD
  })

  const userId = authData.user!.id

  // Obtener todo el tracking con joins
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
    console.log('❌ No hay datos de tracking\n')
    return
  }

  console.log(`\n✅ Total sets registrados: ${tracking.length}\n`)
  console.log('='.repeat(70))

  // Agrupar por semana
  const porSemana: Record<number, any[]> = {}
  tracking.forEach(t => {
    const semNum = t.semana?.semana_numero || 0
    if (!porSemana[semNum]) {
      porSemana[semNum] = []
    }
    porSemana[semNum].push(t)
  })

  // Mostrar cada semana en detalle
  Object.keys(porSemana)
    .sort((a, b) => Number(a) - Number(b))
    .forEach((semNumStr) => {
      const semNum = Number(semNumStr)
      const sets = porSemana[semNum]
      const semana = sets[0].semana

      console.log(`\n📅 SEMANA ${semNum} (${semana?.fecha_inicio || 'N/A'})`)
      console.log('-'.repeat(70))

      // Agrupar por ejercicio
      const porEjercicio: Record<string, any[]> = {}
      sets.forEach(t => {
        const nombre = t.ejercicio?.nombre || 'Desconocido'
        if (!porEjercicio[nombre]) {
          porEjercicio[nombre] = []
        }
        porEjercicio[nombre].push(t)
      })

      // Mostrar cada ejercicio
      Object.entries(porEjercicio).forEach(([nombre, ejercicioSets]) => {
        const ej = ejercicioSets[0].ejercicio
        console.log(`\n  💪 ${nombre}`)
        console.log(`     Grupo muscular: ${ej?.grupo_muscular || 'N/A'}`)
        console.log(`     Series en BD: ${ej?.series || 'N/A'}`)
        console.log(`     Sets registrados: ${ejercicioSets.length}`)
        console.log()

        // Ordenar por número de serie
        ejercicioSets
          .sort((a, b) => a.numero_serie - b.numero_serie)
          .forEach(set => {
            const pesoStr = set.peso !== null && set.peso !== undefined
              ? `${set.peso}kg`
              : 'SIN PESO'
            const repsStr = set.reps !== null && set.reps !== undefined
              ? `${set.reps} reps`
              : 'SIN REPS'

            console.log(`     Serie ${set.numero_serie}: ${pesoStr} × ${repsStr}`)
          })
      })

      console.log()
      console.log('-'.repeat(70))
    })

  // Resumen por grupo muscular
  console.log('\n📊 RESUMEN POR GRUPO MUSCULAR (TODAS LAS SEMANAS)')
  console.log('='.repeat(70))

  const porGrupo: Record<string, { sets: number, reps: number, peso: number, ejercicios: Set<string> }> = {}

  tracking.forEach(t => {
    const grupo = t.ejercicio?.grupo_muscular || 'Desconocido'
    if (!porGrupo[grupo]) {
      porGrupo[grupo] = { sets: 0, reps: 0, peso: 0, ejercicios: new Set() }
    }
    porGrupo[grupo].sets++
    porGrupo[grupo].reps += t.reps || 0
    porGrupo[grupo].peso += (t.peso || 0) * (t.reps || 0)
    porGrupo[grupo].ejercicios.add(t.ejercicio?.nombre || 'Desconocido')
  })

  Object.entries(porGrupo)
    .sort(([, a], [, b]) => b.peso - a.peso)
    .forEach(([grupo, stats]) => {
      console.log(`\n${grupo}:`)
      console.log(`  Ejercicios: ${Array.from(stats.ejercicios).join(', ')}`)
      console.log(`  Sets totales: ${stats.sets}`)
      console.log(`  Reps totales: ${stats.reps}`)
      console.log(`  Volumen total: ${(stats.peso / 1000).toFixed(1)}k kg`)
      if (stats.sets > 0) {
        console.log(`  Promedio reps/set: ${(stats.reps / stats.sets).toFixed(1)}`)
      }
    })

  // Verificar si hay sets sin peso o sin reps
  console.log('\n⚠️  VERIFICACIÓN DE DATOS FALTANTES')
  console.log('='.repeat(70))

  const sinPeso = tracking.filter(t => t.peso === null || t.peso === undefined)
  const sinReps = tracking.filter(t => t.reps === null || t.reps === undefined)
  const pesoZero = tracking.filter(t => t.peso === 0)

  console.log(`\nSets sin peso (NULL): ${sinPeso.length}`)
  if (sinPeso.length > 0) {
    console.log('Ejercicios afectados:')
    const ejerciciosSinPeso = new Set(sinPeso.map(t => t.ejercicio?.nombre))
    ejerciciosSinPeso.forEach(ej => console.log(`  - ${ej}`))
  }

  console.log(`\nSets sin reps (NULL): ${sinReps.length}`)
  if (sinReps.length > 0) {
    console.log('Ejercicios afectados:')
    const ejerciciosSinReps = new Set(sinReps.map(t => t.ejercicio?.nombre))
    ejerciciosSinReps.forEach(ej => console.log(`  - ${ej}`))
  }

  console.log(`\nSets con peso = 0: ${pesoZero.length}`)
  if (pesoZero.length > 0) {
    console.log('Ejercicios con peso 0 (peso corporal):')
    const ejerciciosPesoZero = new Set(pesoZero.map(t => t.ejercicio?.nombre))
    ejerciciosPesoZero.forEach(ej => console.log(`  - ${ej}`))
  }

  console.log('\n' + '='.repeat(70))
}

showDetailedTracking()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('\n❌ Error:', error)
    process.exit(1)
  })

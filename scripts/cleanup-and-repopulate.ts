import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

const TEST_EMAIL = 'test@gymbro.com'
const TEST_PASSWORD = 'test123456'

async function cleanupAndRepopulate() {
  console.log('🧹 Limpieza y repoblación completa\n')

  const { data: authData } = await supabase.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD
  })

  const userId = authData.user!.id

  // Obtener rutina
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

  // Obtener sesiones
  const { data: sesiones } = await supabase
    .from('sesiones')
    .select('*')
    .eq('rutina_id', rutina.id)
    .order('orden')

  const pullA = sesiones?.find(s => s.nombre === 'Pull A')
  const pushA = sesiones?.find(s => s.nombre === 'Push A')

  if (!pullA || !pushA) {
    console.error('❌ No se encontraron ambas sesiones')
    process.exit(1)
  }

  console.log('📋 Rutina:', rutina.nombre)
  console.log('   Push A:', pushA.id)
  console.log('   Pull A:', pullA.id)
  console.log()

  // 1. Borrar TODO el tracking
  console.log('🗑️  Borrando tracking antiguo...')
  await supabase.from('tracking').delete().eq('user_id', userId)
  console.log('✅ Tracking limpio')

  // 2. Borrar TODOS los ejercicios de ambas sesiones
  console.log('\n🗑️  Borrando ejercicios antiguos...')
  await supabase.from('ejercicios').delete().in('sesion_id', [pushA.id, pullA.id])
  console.log('✅ Ejercicios limpios')

  // 3. Crear ejercicios de Push A
  console.log('\n➕ Creando ejercicios Push A...')
  const ejerciciosPushA = [
    { nombre: 'Press Banca', grupo_muscular: 'Pecho', series: 4 },
    { nombre: 'Press Militar', grupo_muscular: 'Hombros', series: 3 },
    { nombre: 'Fondos', grupo_muscular: 'Tríceps', series: 3 }
  ]

  for (let i = 0; i < ejerciciosPushA.length; i++) {
    const ej = ejerciciosPushA[i]
    const { data, error } = await supabase
      .from('ejercicios')
      .insert({
        sesion_id: pushA.id,
        nombre: ej.nombre,
        grupo_muscular: ej.grupo_muscular,
        series: ej.series,
        reps_target: '8-12',
        rir_target: '2-3',
        orden: i + 1
      })
      .select()
      .single()

    if (error) {
      console.error(`  ❌ ${ej.nombre}:`, error.message)
    } else {
      console.log(`  ✅ ${ej.nombre}`)
    }
  }

  // 4. Crear ejercicios de Pull A
  console.log('\n➕ Creando ejercicios Pull A...')
  const ejerciciosPullA = [
    { nombre: 'Dominadas', grupo_muscular: 'Espalda', series: 4 },
    { nombre: 'Remo con barra', grupo_muscular: 'Espalda', series: 4 },
    { nombre: 'Curl con barra', grupo_muscular: 'Bíceps', series: 3 }
  ]

  for (let i = 0; i < ejerciciosPullA.length; i++) {
    const ej = ejerciciosPullA[i]
    const { data, error } = await supabase
      .from('ejercicios')
      .insert({
        sesion_id: pullA.id,
        nombre: ej.nombre,
        grupo_muscular: ej.grupo_muscular,
        series: ej.series,
        reps_target: '8-12',
        rir_target: '2-3',
        orden: i + 1
      })
      .select()
      .single()

    if (error) {
      console.error(`  ❌ ${ej.nombre}:`, error.message)
    } else {
      console.log(`  ✅ ${ej.nombre}`)
    }
  }

  // 5. Obtener todos los ejercicios creados
  const { data: todosEjercicios } = await supabase
    .from('ejercicios')
    .select('*')
    .in('sesion_id', [pushA.id, pullA.id])
    .order('orden')

  console.log(`\n📊 Total ejercicios: ${todosEjercicios?.length || 0}`)

  // 6. Obtener semanas 1 y 2
  const { data: semanas } = await supabase
    .from('semanas')
    .select('*')
    .eq('rutina_id', rutina.id)
    .in('semana_numero', [1, 2])
    .order('semana_numero')

  if (!semanas || semanas.length < 2) {
    console.error('❌ No se encontraron semanas 1 y 2')
    process.exit(1)
  }

  // 7. Poblar tracking
  console.log('\n💾 Poblando tracking (2 semanas completas)...\n')

  for (const semana of semanas) {
    console.log(`Semana ${semana.semana_numero}:`)

    const calendario = semana.calendario as Record<string, any>
    const diasGym = Object.entries(calendario)
      .filter(([_, config]: [string, any]) => config.tipo === 'gym')
      .sort((a, b) => {
        const orden = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo']
        return orden.indexOf(a[0]) - orden.indexOf(b[0])
      })

    for (const [dia, config] of diasGym) {
      const sesion = sesiones?.find(s => s.id === config.sesion_id)
      if (!sesion) continue

      console.log(`  ${dia}: ${sesion.nombre}`)

      const ejerciciosSesion = todosEjercicios?.filter(e => e.sesion_id === sesion.id) || []

      for (const ejercicio of ejerciciosSesion) {
        const numSeries = ejercicio.series

        // Peso base según ejercicio
        let pesoBase = 0
        if (ejercicio.nombre.includes('Dominadas')) {
          pesoBase = 0 // Peso corporal
        } else if (ejercicio.nombre.includes('Remo')) {
          pesoBase = 60
        } else if (ejercicio.grupo_muscular === 'Bíceps') {
          pesoBase = 30
        } else if (ejercicio.nombre.includes('Press Banca')) {
          pesoBase = 80
        } else if (ejercicio.nombre.includes('Press Militar')) {
          pesoBase = 50
        } else if (ejercicio.nombre.includes('Fondos')) {
          pesoBase = 0 // Peso corporal
        }

        for (let serie = 1; serie <= numSeries; serie++) {
          const peso = pesoBase > 0 ? pesoBase - (serie - 1) * 2.5 : 0
          const reps = 12 - (serie - 1) * 2

          await supabase.from('tracking').insert({
            user_id: userId,
            semana_id: semana.id,
            ejercicio_id: ejercicio.id,
            numero_serie: serie,
            peso: peso,
            reps: reps
          })
        }
      }

      console.log(`    ✓ ${ejerciciosSesion.length} ejercicios completados`)
    }
  }

  // 8. Verificación final
  console.log('\n' + '='.repeat(60))
  console.log('✅ VERIFICACIÓN FINAL')
  console.log('='.repeat(60))

  const { data: trackingFinal } = await supabase
    .from('tracking')
    .select(`
      *,
      ejercicio:ejercicios(nombre, grupo_muscular)
    `)
    .eq('user_id', userId)

  if (trackingFinal) {
    console.log(`\nTotal sets: ${trackingFinal.length}`)

    const porGrupo = trackingFinal.reduce((acc: any, t: any) => {
      const grupo = t.ejercicio?.grupo_muscular || 'Desconocido'
      if (!acc[grupo]) {
        acc[grupo] = { sets: 0, reps: 0, volumen: 0 }
      }
      acc[grupo].sets++
      acc[grupo].reps += t.reps
      acc[grupo].volumen += t.peso * t.reps
      return acc
    }, {})

    console.log('\nGrupos musculares:')
    Object.entries(porGrupo)
      .sort(([, a]: [string, any], [, b]: [string, any]) => b.volumen - a.volumen)
      .forEach(([grupo, stats]: [string, any]) => {
        console.log(`  ${grupo}: ${stats.sets} sets, ${stats.reps} reps, ${(stats.volumen / 1000).toFixed(1)}k kg`)
      })

    console.log('\n✨ Datos poblados correctamente')
    console.log('   Push A: 3 ejercicios (Pecho, Hombros, Tríceps)')
    console.log('   Pull A: 3 ejercicios (Espalda, Bíceps)')
    console.log('   Total: 6 ejercicios × 2 semanas')
  }
}

cleanupAndRepopulate()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('\n❌ Error:', error)
    process.exit(1)
  })

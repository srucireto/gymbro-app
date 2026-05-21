import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

const TEST_EMAIL = 'test@gymbro.com'
const TEST_PASSWORD = 'test123456'

async function fixPullSession() {
  console.log('🔧 Arreglando sesión Pull A\n')

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

  // Obtener sesión Pull A
  const { data: sesiones } = await supabase
    .from('sesiones')
    .select('*')
    .eq('rutina_id', rutina.id)
    .order('orden')

  const pullA = sesiones?.find(s => s.nombre === 'Pull A')
  const pushA = sesiones?.find(s => s.nombre === 'Push A')

  if (!pullA) {
    console.error('❌ No se encontró sesión Pull A')
    process.exit(1)
  }

  console.log('📋 Sesiones encontradas:')
  console.log(`  Push A: ${pushA?.id}`)
  console.log(`  Pull A: ${pullA.id}\n`)

  // 1. Agregar ejercicios a Pull A
  console.log('➕ Agregando ejercicios a Pull A...\n')

  const ejerciciosPullA = [
    {
      nombre: 'Dominadas',
      grupo_muscular: 'Espalda',
      series: 4,
      reps_target: '8-12',
      rir_target: '2-3',
      notas: 'Agarre amplio'
    },
    {
      nombre: 'Remo con barra',
      grupo_muscular: 'Espalda',
      series: 4,
      reps_target: '8-12',
      rir_target: '2-3',
      notas: 'Mantener espalda recta'
    },
    {
      nombre: 'Curl con barra',
      grupo_muscular: 'Bíceps',
      series: 3,
      reps_target: '10-15',
      rir_target: '1-2',
      notas: 'Control en excéntrica'
    }
  ]

  const ejerciciosCreados = []

  for (let i = 0; i < ejerciciosPullA.length; i++) {
    const ej = ejerciciosPullA[i]
    const { data, error } = await supabase
      .from('ejercicios')
      .insert({
        sesion_id: pullA.id,
        nombre: ej.nombre,
        grupo_muscular: ej.grupo_muscular,
        series: ej.series,
        reps_target: ej.reps_target,
        rir_target: ej.rir_target,
        notas: ej.notas,
        orden: i + 1
      })
      .select()
      .single()

    if (error) {
      console.error(`❌ Error creando ${ej.nombre}:`, error.message)
    } else {
      console.log(`✅ ${ej.nombre} creado`)
      ejerciciosCreados.push(data)
    }
  }

  // 2. Borrar tracking antiguo que no tiene ejercicios válidos
  console.log('\n🗑️  Limpiando tracking antiguo...')

  const { error: deleteError } = await supabase
    .from('tracking')
    .delete()
    .eq('user_id', userId)

  if (deleteError) {
    console.error('❌ Error borrando tracking:', deleteError.message)
  } else {
    console.log('✅ Tracking antiguo eliminado')
  }

  // 3. Obtener todos los ejercicios de ambas sesiones
  const { data: todosEjercicios } = await supabase
    .from('ejercicios')
    .select('*')
    .in('sesion_id', [pushA!.id, pullA.id])
    .order('orden')

  console.log(`\n📊 Total ejercicios en rutina: ${todosEjercicios?.length || 0}`)

  if (todosEjercicios) {
    todosEjercicios.forEach(ej => {
      const sesion = sesiones?.find(s => s.id === ej.sesion_id)
      console.log(`  - ${ej.nombre} (${sesion?.nombre})`)
    })
  }

  // 4. Obtener semanas 1 y 2
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

  console.log('\n💾 Poblando tracking para 2 semanas completas...\n')

  // 5. Poblar tracking para ambas sesiones en ambas semanas
  for (const semana of semanas) {
    console.log(`Semana ${semana.semana_numero}:`)

    const calendario = semana.calendario as Record<string, any>

    // Encontrar días de gym
    const diasGym = Object.entries(calendario)
      .filter(([_, config]: [string, any]) => config.tipo === 'gym')
      .sort((a, b) => {
        const orden = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo']
        return orden.indexOf(a[0]) - orden.indexOf(b[0])
      })

    for (const [dia, config] of diasGym) {
      const sesion = sesiones?.find(s => s.id === config.sesion_id)

      if (!sesion) {
        console.log(`  ⚠️ ${dia}: Sesión no encontrada`)
        continue
      }

      console.log(`  ${dia}: ${sesion.nombre}`)

      // Obtener ejercicios de esta sesión
      const ejerciciosSesion = todosEjercicios?.filter(e => e.sesion_id === sesion.id) || []

      for (const ejercicio of ejerciciosSesion) {
        const numSeries = ejercicio.series || 3

        // Peso base según ejercicio
        let pesoBase = 0
        if (ejercicio.nombre.includes('Dominadas')) {
          pesoBase = 0 // Peso corporal
        } else if (ejercicio.grupo_muscular === 'Espalda') {
          pesoBase = 60 // Remo
        } else if (ejercicio.grupo_muscular === 'Bíceps') {
          pesoBase = 30 // Curl
        } else if (ejercicio.grupo_muscular === 'Pecho') {
          pesoBase = 80 // Press Banca
        } else if (ejercicio.grupo_muscular === 'Hombros') {
          pesoBase = 50 // Press Militar
        } else if (ejercicio.grupo_muscular === 'Tríceps') {
          pesoBase = 0 // Fondos con peso corporal
        }

        for (let serie = 1; serie <= numSeries; serie++) {
          const peso = pesoBase > 0 ? pesoBase - (serie - 1) * 2.5 : 0
          const reps = 12 - (serie - 1) * 2

          const { error } = await supabase.from('tracking').insert({
            user_id: userId,
            semana_id: semana.id,
            ejercicio_id: ejercicio.id,
            numero_serie: serie,
            peso: peso,
            reps: reps
          })

          if (error) {
            console.error(`    ❌ Error en ${ejercicio.nombre} serie ${serie}:`, error.message)
          }
        }
      }

      console.log(`    ✓ ${ejerciciosSesion.length} ejercicios completados`)
    }
  }

  // 6. Verificación final
  console.log('\n' + '='.repeat(60))
  console.log('✅ VERIFICACIÓN FINAL')
  console.log('='.repeat(60))

  const { data: trackingFinal } = await supabase
    .from('tracking')
    .select(`
      *,
      ejercicio:ejercicios(nombre, grupo_muscular, sesion_id),
      semana:semanas(semana_numero)
    `)
    .eq('user_id', userId)

  if (trackingFinal) {
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

    console.log(`\nTotal sets: ${trackingFinal.length}`)
    console.log('\nPor grupo muscular:')
    Object.entries(porGrupo)
      .sort(([, a]: [string, any], [, b]: [string, any]) => b.volumen - a.volumen)
      .forEach(([grupo, stats]: [string, any]) => {
        console.log(`  ${grupo}: ${stats.sets} sets, ${stats.reps} reps, ${(stats.volumen / 1000).toFixed(1)}k kg`)
      })

    const porSesion = trackingFinal.reduce((acc: any, t: any) => {
      const sesionId = t.ejercicio?.sesion_id
      const sesion = sesiones?.find(s => s.id === sesionId)
      const key = sesion?.nombre || 'Desconocida'
      if (!acc[key]) acc[key] = 0
      acc[key]++
      return acc
    }, {})

    console.log('\nPor sesión:')
    Object.entries(porSesion).forEach(([nombre, count]) => {
      console.log(`  ${nombre}: ${count} sets`)
    })
  }
}

fixPullSession()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('\n❌ Error:', error)
    process.exit(1)
  })

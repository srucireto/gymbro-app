import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

const TEST_EMAIL = 'test@gymbro.com'
const TEST_PASSWORD = 'test123456'

async function addMoreExercises() {
  console.log('➕ Agregando más ejercicios a la rutina\n')

  const { data: authData } = await supabase.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD
  })

  const userId = authData.user!.id

  // Obtener rutina y sesiones
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

  const { data: sesiones } = await supabase
    .from('sesiones')
    .select('*')
    .eq('rutina_id', rutina.id)
    .order('orden')

  const pushA = sesiones?.find(s => s.nombre === 'Push A')
  const pullA = sesiones?.find(s => s.nombre === 'Pull A')

  if (!pushA || !pullA) {
    console.error('❌ No se encontraron las sesiones')
    process.exit(1)
  }

  console.log('📋 Rutina:', rutina.nombre)
  console.log('   Push A:', pushA.id)
  console.log('   Pull A:', pullA.id)
  console.log()

  // Obtener ejercicios actuales
  const { data: ejerciciosActuales } = await supabase
    .from('ejercicios')
    .select('*')
    .in('sesion_id', [pushA.id, pullA.id])

  console.log('💪 Ejercicios actuales:', ejerciciosActuales?.length)
  ejerciciosActuales?.forEach(ej => {
    const sesion = sesiones?.find(s => s.id === ej.sesion_id)
    console.log(`  - ${ej.nombre} (${sesion?.nombre})`)
  })
  console.log()

  // Definir nuevos ejercicios
  const nuevosEjerciciosPush = [
    { nombre: 'Press inclinado con mancuernas', grupo_muscular: 'Pecho', series: 4, orden: 2 },
    { nombre: 'Aperturas con mancuernas', grupo_muscular: 'Pecho', series: 3, orden: 3 },
    { nombre: 'Elevaciones laterales', grupo_muscular: 'Hombros', series: 3, orden: 5 },
    { nombre: 'Elevaciones frontales', grupo_muscular: 'Hombros', series: 3, orden: 6 },
    { nombre: 'Extensiones de tríceps con cuerda', grupo_muscular: 'Tríceps', series: 3, orden: 8 },
    { nombre: 'Press francés', grupo_muscular: 'Tríceps', series: 3, orden: 9 }
  ]

  const nuevosEjerciciosPull = [
    { nombre: 'Jalón al pecho', grupo_muscular: 'Espalda', series: 4, orden: 3 },
    { nombre: 'Remo con mancuerna', grupo_muscular: 'Espalda', series: 3, orden: 4 },
    { nombre: 'Curl martillo', grupo_muscular: 'Bíceps', series: 3, orden: 6 },
    { nombre: 'Curl concentrado', grupo_muscular: 'Bíceps', series: 3, orden: 7 }
  ]

  console.log('➕ Agregando ejercicios nuevos a Push A...')
  for (const ej of nuevosEjerciciosPush) {
    const { error } = await supabase
      .from('ejercicios')
      .insert({
        sesion_id: pushA.id,
        nombre: ej.nombre,
        grupo_muscular: ej.grupo_muscular,
        series: ej.series,
        reps_target: '8-12',
        rir_target: '2-3',
        orden: ej.orden
      })

    if (error) {
      console.log(`  ❌ ${ej.nombre}:`, error.message)
    } else {
      console.log(`  ✅ ${ej.nombre} (${ej.grupo_muscular}, ${ej.series} series)`)
    }
  }

  console.log('\n➕ Agregando ejercicios nuevos a Pull A...')
  for (const ej of nuevosEjerciciosPull) {
    const { error } = await supabase
      .from('ejercicios')
      .insert({
        sesion_id: pullA.id,
        nombre: ej.nombre,
        grupo_muscular: ej.grupo_muscular,
        series: ej.series,
        reps_target: '8-12',
        rir_target: '2-3',
        orden: ej.orden
      })

    if (error) {
      console.log(`  ❌ ${ej.nombre}:`, error.message)
    } else {
      console.log(`  ✅ ${ej.nombre} (${ej.grupo_muscular}, ${ej.series} series)`)
    }
  }

  // Verificar total de ejercicios
  const { data: todoEjercicios } = await supabase
    .from('ejercicios')
    .select('*')
    .in('sesion_id', [pushA.id, pullA.id])
    .order('orden')

  console.log('\n📊 Total ejercicios después de agregar:', todoEjercicios?.length)
  console.log('\nPush A:')
  todoEjercicios
    ?.filter(e => e.sesion_id === pushA.id)
    .forEach(ej => console.log(`  ${ej.orden}. ${ej.nombre} (${ej.grupo_muscular}) - ${ej.series} series`))

  console.log('\nPull A:')
  todoEjercicios
    ?.filter(e => e.sesion_id === pullA.id)
    .forEach(ej => console.log(`  ${ej.orden}. ${ej.nombre} (${ej.grupo_muscular}) - ${ej.series} series`))

  console.log('\n✨ Ejercicios agregados. Ahora ejecuta populate-full-mesocycle.ts para repoblar el tracking.')
}

addMoreExercises()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('\n❌ Error:', error)
    process.exit(1)
  })

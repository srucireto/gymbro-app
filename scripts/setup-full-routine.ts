import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

const TEST_EMAIL = 'test@gymbro.com'
const TEST_PASSWORD = 'test123456'

// Definición completa de ejercicios según rutina.md
const EJERCICIOS_PULL_A = [
  { nombre: 'Dominadas pronas con peso', grupo_muscular: 'Dorsal ancho', series: 4, reps_target: '6-8', rir_target: '1-2', peso_base: 10 },
  { nombre: 'RDL con mancuernas', grupo_muscular: 'Isquios', series: 4, reps_target: '8-10', rir_target: '1-2', peso_base: 30 },
  { nombre: 'Chest-supported row', grupo_muscular: 'Espalda media', series: 3, reps_target: '8-10', rir_target: '1-2', peso_base: 40 },
  { nombre: 'Curl de pierna sentado', grupo_muscular: 'Isquios', series: 4, reps_target: '10-12', rir_target: '0-1', peso_base: 45 },
  { nombre: 'Curl predicador', grupo_muscular: 'Bíceps', series: 3, reps_target: '10-12', rir_target: '0-1', peso_base: 25 },
  { nombre: 'Pullover con cable', grupo_muscular: 'Dorsal ancho', series: 3, reps_target: '12-15', rir_target: '0-1', peso_base: 30 },
  { nombre: 'Face pull', grupo_muscular: 'Hombro posterior', series: 3, reps_target: '15-20', rir_target: '0', peso_base: 20 },
  { nombre: 'Hip thrust con barra', grupo_muscular: 'Glúteo', series: 3, reps_target: '10-12', rir_target: '0-1', peso_base: 80 },
  { nombre: 'Curl martillo', grupo_muscular: 'Braquial', series: 3, reps_target: '10-12', rir_target: '0-1', peso_base: 14 }
]

const EJERCICIOS_PUSH_A = [
  { nombre: 'Press de banca plano con barra', grupo_muscular: 'Pecho', series: 4, reps_target: '5-7', rir_target: '1-2', peso_base: 80 },
  { nombre: 'Sentadilla hack', grupo_muscular: 'Cuádriceps', series: 4, reps_target: '8-10', rir_target: '1-2', peso_base: 100 },
  { nombre: 'Press inclinado con mancuernas', grupo_muscular: 'Pecho clavicular', series: 3, reps_target: '8-10', rir_target: '1-2', peso_base: 32 },
  { nombre: 'Press militar sentado con mancuernas', grupo_muscular: 'Hombro anterior', series: 3, reps_target: '8-10', rir_target: '1', peso_base: 22 },
  { nombre: 'Extensión de pierna', grupo_muscular: 'Cuádriceps', series: 3, reps_target: '10-12', rir_target: '0-1', peso_base: 50 },
  { nombre: 'Cruce de poleas', grupo_muscular: 'Pecho inferior', series: 3, reps_target: '12-15', rir_target: '0-1', peso_base: 15 },
  { nombre: 'Extensión tríceps overhead con cable', grupo_muscular: 'Tríceps', series: 3, reps_target: '10-12', rir_target: '0-1', peso_base: 25 },
  { nombre: 'Elevación lateral con mancuernas', grupo_muscular: 'Hombro lateral', series: 3, reps_target: '12-15', rir_target: '0', peso_base: 10 },
  { nombre: 'Pantorrilla de pie', grupo_muscular: 'Pantorrilla', series: 4, reps_target: '8-12', rir_target: '0-1', peso_base: 70 }
]

const EJERCICIOS_PULL_B = [
  { nombre: 'Jalón al pecho agarre ancho', grupo_muscular: 'Dorsal ancho', series: 4, reps_target: '8-10', rir_target: '1-2', peso_base: 55 },
  { nombre: 'Remo sentado en polea', grupo_muscular: 'Trapecio medio', series: 3, reps_target: '10-12', rir_target: '1', peso_base: 50 },
  { nombre: 'Remo mancuerna a una mano', grupo_muscular: 'Dorsal', series: 3, reps_target: '10-12', rir_target: '0-1', peso_base: 30 },
  { nombre: 'Step-up con mancuernas', grupo_muscular: 'Glúteo', series: 3, reps_target: '8-10', rir_target: '2-3', peso_base: 16 },
  { nombre: 'Curl de pierna sentado liviano', grupo_muscular: 'Isquios', series: 3, reps_target: '12-15', rir_target: '2-3', peso_base: 35 },
  { nombre: 'Curl bayesiano en cable', grupo_muscular: 'Bíceps', series: 3, reps_target: '12-15', rir_target: '0-1', peso_base: 15 },
  { nombre: 'Rear delt fly', grupo_muscular: 'Hombro posterior', series: 3, reps_target: '12-15', rir_target: '0-1', peso_base: 12 },
  { nombre: 'Y-raise en prono', grupo_muscular: 'Trapecio inferior', series: 3, reps_target: '12-15', rir_target: '0', peso_base: 5 },
  { nombre: 'Roll-out abdominal', grupo_muscular: 'Core', series: 3, reps_target: '8-12', rir_target: '0-1', peso_base: 0 }
]

const EJERCICIOS_PUSH_B = [
  { nombre: 'Press inclinado con barra', grupo_muscular: 'Pecho clavicular', series: 4, reps_target: '6-8', rir_target: '1-2', peso_base: 65 },
  { nombre: 'Press plano con mancuernas', grupo_muscular: 'Pecho', series: 3, reps_target: '8-10', rir_target: '1-2', peso_base: 34 },
  { nombre: 'Press militar sentado (B)', grupo_muscular: 'Hombro anterior', series: 3, reps_target: '8-10', rir_target: '1-2', peso_base: 22 },
  { nombre: 'Extensión de pierna post-partido', grupo_muscular: 'Cuádriceps', series: 4, reps_target: '10-12', rir_target: '1-2', peso_base: 45 },
  { nombre: 'Aperturas con mancuernas inclinado', grupo_muscular: 'Pecho', series: 3, reps_target: '10-12', rir_target: '0-1', peso_base: 16 },
  { nombre: 'Extensión overhead mancuerna', grupo_muscular: 'Tríceps', series: 3, reps_target: '10-12', rir_target: '0-1', peso_base: 18 },
  { nombre: 'Elevación lateral en cable', grupo_muscular: 'Hombro lateral', series: 3, reps_target: '12-15', rir_target: '0', peso_base: 8 },
  { nombre: 'Hip thrust liviano', grupo_muscular: 'Glúteo', series: 3, reps_target: '12-15', rir_target: '2-3', peso_base: 60 },
  { nombre: 'Pantorrilla de pie liviano', grupo_muscular: 'Pantorrilla', series: 3, reps_target: '10-12', rir_target: '1-2', peso_base: 50 }
]

async function setupFullRoutine() {
  console.log('🏋️ Configurando rutina completa según rutina.md\n')

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

  console.log('📋 Rutina:', rutina.nombre)
  console.log('   Duración:', rutina.semanas_duracion, 'semanas\n')

  // 1. Borrar TODAS las sesiones y ejercicios antiguos
  console.log('🗑️  Borrando sesiones y ejercicios antiguos...')
  await supabase.from('tracking').delete().eq('user_id', userId)
  await supabase.from('ejercicios').delete().in('sesion_id',
    (await supabase.from('sesiones').select('id').eq('rutina_id', rutina.id)).data?.map(s => s.id) || []
  )
  await supabase.from('sesiones').delete().eq('rutina_id', rutina.id)
  console.log('✅ Limpio\n')

  // 2. Crear las 4 sesiones
  console.log('➕ Creando sesiones...')

  const sesionesData = [
    { nombre: 'Pull A', tipo: 'pull', intensidad: 'pesada', orden: 1 },
    { nombre: 'Push A', tipo: 'push', intensidad: 'pesada', orden: 2 },
    { nombre: 'Pull B', tipo: 'pull', intensidad: 'liviana', orden: 3 },
    { nombre: 'Push B', tipo: 'push', intensidad: 'liviana', orden: 4 }
  ]

  const sesionesCreadas: Record<string, any> = {}

  for (const sesionInfo of sesionesData) {
    const { data, error } = await supabase
      .from('sesiones')
      .insert({
        rutina_id: rutina.id,
        nombre: sesionInfo.nombre,
        tipo: sesionInfo.tipo,
        intensidad: sesionInfo.intensidad,
        buffer_minimo_horas: 24,
        es_post_partido: false,
        orden: sesionInfo.orden
      })
      .select()
      .single()

    if (error) {
      console.error(`❌ Error creando ${sesionInfo.nombre}:`, error.message)
    } else {
      sesionesCreadas[sesionInfo.nombre] = data
      console.log(`✅ ${sesionInfo.nombre} (${sesionInfo.tipo}, ${sesionInfo.intensidad})`)
    }
  }

  console.log()

  // 3. Agregar ejercicios a cada sesión
  const ejerciciosPorSesion = {
    'Pull A': EJERCICIOS_PULL_A,
    'Push A': EJERCICIOS_PUSH_A,
    'Pull B': EJERCICIOS_PULL_B,
    'Push B': EJERCICIOS_PUSH_B
  }

  for (const [nombreSesion, ejercicios] of Object.entries(ejerciciosPorSesion)) {
    const sesion = sesionesCreadas[nombreSesion]
    if (!sesion) continue

    console.log(`➕ Agregando ${ejercicios.length} ejercicios a ${nombreSesion}...`)

    for (let i = 0; i < ejercicios.length; i++) {
      const ej = ejercicios[i]
      await supabase.from('ejercicios').insert({
        sesion_id: sesion.id,
        nombre: ej.nombre,
        grupo_muscular: ej.grupo_muscular,
        series: ej.series,
        reps_target: ej.reps_target,
        rir_target: ej.rir_target,
        orden: i + 1
      })
    }
    console.log(`✅ ${nombreSesion} completo`)
  }

  console.log('\n' + '='.repeat(70))
  console.log('✅ RUTINA CONFIGURADA')
  console.log('='.repeat(70))
  console.log('\nTotal sesiones: 4')
  console.log('Total ejercicios:', Object.values(ejerciciosPorSesion).flat().length)
  console.log('\nEjecutar populate-routine-tracking.ts para poblar 6 semanas de datos.')
}

setupFullRoutine()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('\n❌ Error:', error)
    process.exit(1)
  })

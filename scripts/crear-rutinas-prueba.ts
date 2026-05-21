import { createClient } from '@supabase/supabase-js'
import * as readline from 'readline'

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

function question(query: string): Promise<string> {
  return new Promise(resolve => rl.question(query, resolve))
}

async function crearRutinasPrueba() {
  console.log('🔧 Creador de rutinas de prueba para Test@gymbro.com\n')

  const email = await question('Email del usuario de prueba (Test@gymbro.com): ')
  const password = await question('Password del usuario de prueba: ')

  // Autenticar como el usuario de prueba
  console.log('\n🔐 Autenticando...')
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password: password.trim()
  })

  if (authError || !authData.user) {
    console.error('❌ Error de autenticación:', authError?.message)
    rl.close()
    return
  }

  console.log('✅ Autenticado como:', authData.user.email)
  console.log('   User ID:', authData.user.id)

  // Crear 3 rutinas PPL de prueba
  console.log('\n📋 Creando rutinas de prueba...')

  const rutinasBase = [
    {
      nombre: 'PPL - Push Pull Legs',
      semanas_duracion: 6,
      activa: false
    },
    {
      nombre: 'PPL - Push Pull Legs',
      semanas_duracion: 6,
      activa: false
    },
    {
      nombre: 'PPL - Push Pull Legs',
      semanas_duracion: 6,
      activa: false
    }
  ]

  for (let i = 0; i < rutinasBase.length; i++) {
    const rutina = rutinasBase[i]

    const { data: rutinaData, error: rutinaError } = await supabase
      .from('rutinas')
      .insert({
        ...rutina,
        user_id: authData.user.id,
        fecha_inicio: new Date().toISOString().split('T')[0]
      })
      .select()
      .single()

    if (rutinaError) {
      console.error(`   ❌ Error creando rutina ${i + 1}:`, rutinaError)
      continue
    }

    console.log(`   ✅ Creada rutina ${i + 1}: ${rutina.nombre}`)

    // Crear sesiones de prueba
    const sesionesBase = [
      { nombre: 'Push A', tipo: 'push', intensidad: 'pesada', orden: 1 },
      { nombre: 'Pull A', tipo: 'pull', intensidad: 'pesada', orden: 2 },
      { nombre: 'Legs A', tipo: 'push', intensidad: 'pesada', orden: 3 }
    ]

    for (const sesion of sesionesBase) {
      const { data: sesionData, error: sesionError } = await supabase
        .from('sesiones')
        .insert({
          rutina_id: rutinaData.id,
          ...sesion,
          buffer_minimo_horas: 48,
          es_post_partido: false
        })
        .select()
        .single()

      if (sesionError) {
        console.error(`      ⚠️ Error creando sesión ${sesion.nombre}:`, sesionError)
        continue
      }

      // Crear 2 ejercicios de prueba por sesión
      const ejercicios = [
        {
          nombre: 'Ejercicio 1',
          grupo_muscular: 'Pecho',
          series: 3,
          reps_target: '8-12',
          rir_target: '2',
          orden: 1
        },
        {
          nombre: 'Ejercicio 2',
          grupo_muscular: 'Espalda',
          series: 3,
          reps_target: '8-12',
          rir_target: '2',
          orden: 2
        }
      ]

      await supabase
        .from('ejercicios')
        .insert(ejercicios.map(ej => ({
          sesion_id: sesionData.id,
          ...ej
        })))
    }
  }

  console.log('\n✅ Rutinas de prueba creadas correctamente')

  // Cerrar sesión
  await supabase.auth.signOut()
  rl.close()
}

crearRutinasPrueba()
  .then(() => {
    console.log('\n✅ Script completado')
    process.exit(0)
  })
  .catch(error => {
    console.error('\n❌ Error:', error)
    rl.close()
    process.exit(1)
  })

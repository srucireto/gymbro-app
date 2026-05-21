import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

const TEST_EMAIL = 'test@gymbro.com'
const TEST_PASSWORD = 'test123456'

async function setupTestUser() {
  console.log('🧪 Setup de datos de prueba para test@gymbro.com\n')
  console.log('=' .repeat(60))

  // Autenticar como test@gymbro.com
  console.log('\n🔐 Autenticando como test@gymbro.com...')

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD
  })

  if (authError || !authData.user) {
    console.error('❌ Error de autenticación:', authError?.message)
    process.exit(1)
  }

  console.log('✅ Autenticado como:', authData.user.email)
  const userId = authData.user.id

  // 1. Limpiar datos existentes
  console.log('\n1️⃣ Limpiando datos existentes...')

  const { data: rutinasExistentes } = await supabase
    .from('rutinas')
    .select('id')
    .eq('user_id', userId)

  if (rutinasExistentes && rutinasExistentes.length > 0) {
    for (const rutina of rutinasExistentes) {
      // Eliminar semanas
      await supabase.from('semanas').delete().eq('rutina_id', rutina.id)
      // Eliminar sesiones (y cascadeará a ejercicios y tracking)
      await supabase.from('sesiones').delete().eq('rutina_id', rutina.id)
    }
    // Eliminar rutinas
    await supabase.from('rutinas').delete().eq('user_id', userId)
    console.log(`   ✓ Limpiadas ${rutinasExistentes.length} rutinas existentes`)
  } else {
    console.log('   ✓ No hay datos previos')
  }

  // 2. Crear rutina de prueba
  console.log('\n2️⃣ Creando rutina de prueba...')

  const { data: rutina, error: rutinaError } = await supabase
    .from('rutinas')
    .insert({
      user_id: userId,
      nombre: 'Rutina de Prueba',
      fecha_inicio: '2026-05-18',
      semanas_duracion: 6,
      activa: true
    })
    .select()
    .single()

  if (rutinaError) throw rutinaError
  console.log(`   ✓ Rutina creada: ${rutina.nombre} (ID: ${rutina.id})`)

  // 3. Crear sesiones
  console.log('\n3️⃣ Creando sesiones...')

  const sesionesData = [
    { nombre: 'Push A', tipo: 'push', intensidad: 'pesada', orden: 1 },
    { nombre: 'Pull A', tipo: 'pull', intensidad: 'pesada', orden: 2 },
  ]

  const sesiones: any[] = []

  for (const sesionData of sesionesData) {
    const { data: sesion, error: sesionError } = await supabase
      .from('sesiones')
      .insert({
        rutina_id: rutina.id,
        ...sesionData,
        buffer_minimo_horas: 48,
        es_post_partido: false
      })
      .select()
      .single()

    if (sesionError) throw sesionError
    console.log(`   ✓ Sesión creada: ${sesion.nombre}`)
    sesiones.push(sesion)
  }

  // 4. Crear ejercicios para Push A
  console.log('\n4️⃣ Creando ejercicios...')

  const ejerciciosData = [
    { nombre: 'Press Banca', grupo_muscular: 'Pecho', series: 4 },
    { nombre: 'Press Militar', grupo_muscular: 'Hombros', series: 3 },
    { nombre: 'Fondos', grupo_muscular: 'Tríceps', series: 3 },
  ]

  const ejercicios: any[] = []

  for (const [index, ejData] of ejerciciosData.entries()) {
    const { data: ejercicio, error: ejercicioError } = await supabase
      .from('ejercicios')
      .insert({
        sesion_id: sesiones[0].id, // Push A
        ...ejData,
        reps_target: '8-12',
        rir_target: '1-2',
        orden: index + 1
      })
      .select()
      .single()

    if (ejercicioError) throw ejercicioError
    console.log(`   ✓ Ejercicio creado: ${ejercicio.nombre} (${ejercicio.series} series)`)
    ejercicios.push(ejercicio)
  }

  // 5. Crear semana
  console.log('\n5️⃣ Creando semana...')

  const calendario = {
    lunes: { tipo: 'partido', estado: 'normal' },
    martes: { tipo: 'gym', sesion_id: sesiones[0].id, estado: 'normal' },
    miércoles: { tipo: 'gym', sesion_id: sesiones[1].id, estado: 'normal' },
    jueves: { tipo: 'descanso', estado: 'normal' },
    viernes: { tipo: 'futsal_entreno', estado: 'normal' },
    sábado: { tipo: 'gym', sesion_id: sesiones[0].id, estado: 'normal' },
    domingo: { tipo: 'gym_cerrado', estado: 'normal' },
  }

  const { data: semana, error: semanaError } = await supabase
    .from('semanas')
    .insert({
      user_id: userId,
      rutina_id: rutina.id,
      semana_numero: 1,
      fecha_inicio: '2026-05-18',
      dia_partido: 'lunes',
      dia_futsal: 'viernes',
      calendario
    })
    .select()
    .single()

  if (semanaError) throw semanaError
  console.log(`   ✓ Semana creada: Semana ${semana.semana_numero}`)

  // 6. Crear tracking data (simulando que completó la sesión del martes)
  console.log('\n6️⃣ Creando datos de tracking (martes completado)...')

  const trackingData = []

  // Press Banca: 4 series con progresión de peso
  trackingData.push(
    { ejercicio_id: ejercicios[0].id, numero_serie: 1, peso: 80, reps: 10 },
    { ejercicio_id: ejercicios[0].id, numero_serie: 2, peso: 80, reps: 9 },
    { ejercicio_id: ejercicios[0].id, numero_serie: 3, peso: 80, reps: 8 },
    { ejercicio_id: ejercicios[0].id, numero_serie: 4, peso: 75, reps: 10 }
  )

  // Press Militar: 3 series
  trackingData.push(
    { ejercicio_id: ejercicios[1].id, numero_serie: 1, peso: 50, reps: 10 },
    { ejercicio_id: ejercicios[1].id, numero_serie: 2, peso: 50, reps: 9 },
    { ejercicio_id: ejercicios[1].id, numero_serie: 3, peso: 50, reps: 8 }
  )

  // Fondos: 2 de 3 series (simulando que se fue antes de terminar)
  trackingData.push(
    { ejercicio_id: ejercicios[2].id, numero_serie: 1, peso: 0, reps: 12 },
    { ejercicio_id: ejercicios[2].id, numero_serie: 2, peso: 0, reps: 10 }
    // Serie 3 sin datos - se fue del gym
  )

  for (const track of trackingData) {
    const { error: trackError } = await supabase
      .from('tracking')
      .insert({
        user_id: userId,
        semana_id: semana.id,
        ...track
      })

    if (trackError) throw trackError
  }

  console.log(`   ✓ ${trackingData.length} sets registrados`)
  console.log('   ✓ Press Banca: 4 series completas')
  console.log('   ✓ Press Militar: 3 series completas')
  console.log('   ✓ Fondos: 2 de 3 series (parcial)')

  // 7. Marcar la sesión del martes como completada
  console.log('\n7️⃣ Marcando sesión del martes como completada...')

  const calendarioActualizado = {
    ...calendario,
    martes: {
      ...calendario.martes,
      estado: 'completada',
      timestamp: new Date().toISOString()
    }
  }

  const { error: updateError } = await supabase
    .from('semanas')
    .update({ calendario: calendarioActualizado })
    .eq('id', semana.id)

  if (updateError) throw updateError
  console.log('   ✓ Sesión del martes marcada como completada')

  // 8. Verificación
  console.log('\n8️⃣ VERIFICACIÓN FINAL')
  console.log('=' .repeat(60))

  // Verificar rutina
  const { data: rutinaVerif } = await supabase
    .from('rutinas')
    .select('*')
    .eq('user_id', userId)
    .single()

  console.log(`\n✓ Rutina: ${rutinaVerif?.nombre} (activa: ${rutinaVerif?.activa})`)

  // Verificar sesiones
  const { data: sesionesVerif } = await supabase
    .from('sesiones')
    .select('*, ejercicios(*)')
    .eq('rutina_id', rutina.id)

  console.log(`✓ Sesiones: ${sesionesVerif?.length}`)
  sesionesVerif?.forEach(s => {
    console.log(`   - ${s.nombre}: ${s.ejercicios?.length} ejercicios`)
  })

  // Verificar tracking
  const ejercicioIds = ejercicios.map(e => e.id)
  const { data: trackingVerif } = await supabase
    .from('tracking')
    .select('*')
    .in('ejercicio_id', ejercicioIds)

  console.log(`✓ Tracking: ${trackingVerif?.length} sets registrados`)

  // Verificar calendario
  const { data: semanaVerif } = await supabase
    .from('semanas')
    .select('*')
    .eq('id', semana.id)
    .single()

  const cal = semanaVerif?.calendario as any
  const diasCompletados = Object.entries(cal)
    .filter(([_, v]: [string, any]) => v.estado === 'completada')
    .map(([k]) => k)

  console.log(`✓ Calendario: ${diasCompletados.length} día(s) completado(s) - ${diasCompletados.join(', ')}`)

  console.log('\n' + '=' .repeat(60))
  console.log('✅ Setup completado exitosamente')
  console.log('\n📊 RESUMEN DE DATOS DE PRUEBA:')
  console.log('─'.repeat(60))
  console.log('Rutina: "Rutina de Prueba" (6 semanas)')
  console.log('Sesiones: Push A, Pull A')
  console.log('Ejercicios en Push A:')
  console.log('  • Press Banca (4 series): 80kg x 10, 80kg x 9, 80kg x 8, 75kg x 10')
  console.log('  • Press Militar (3 series): 50kg x 10, 50kg x 9, 50kg x 8')
  console.log('  • Fondos (2/3 series): Peso corporal x 12, x 10 (serie 3 sin datos)')
  console.log('Semana 1: Martes completado (9 sets registrados)')
  console.log('─'.repeat(60))
  console.log('\n✅ Ahora puedes verificar:')
  console.log('1. Login como test@gymbro.com')
  console.log('2. Home → Ver calendario con martes completado')
  console.log('3. Métricas → Progreso → Ver gráficos de Press Banca, Press Militar, Fondos')
  console.log('4. Métricas → Músculos → Ver volumen de Pecho, Hombros, Tríceps')
  console.log('5. Métricas → Ausencias → Ver adherencia 100% (1/1 sesión completada)')
}

setupTestUser()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('\n❌ Error:', error)
    process.exit(1)
  })

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

const TEST_EMAIL = 'test@gymbro.com'
const TEST_PASSWORD = 'test123456'

async function populateTestData() {
  console.log('📊 Creando 2 semanas completas de datos para test@gymbro.com\n')
  console.log('='.repeat(60))

  // 1. Autenticar
  console.log('\n🔐 Autenticando...')
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

  // 2. Obtener rutina activa
  console.log('\n📋 Obteniendo rutina activa...')
  const { data: rutina } = await supabase
    .from('rutinas')
    .select('id, nombre')
    .eq('user_id', userId)
    .eq('activa', true)
    .single()

  if (!rutina) {
    console.error('❌ No hay rutina activa')
    process.exit(1)
  }

  console.log(`✅ Rutina: ${rutina.nombre}`)

  // 3. Obtener sesiones y ejercicios
  const { data: sesiones } = await supabase
    .from('sesiones')
    .select('id, nombre, ejercicios(id, nombre, grupo_muscular, series)')
    .eq('rutina_id', rutina.id)
    .order('orden')

  if (!sesiones || sesiones.length === 0) {
    console.error('❌ No hay sesiones')
    process.exit(1)
  }

  console.log(`✅ ${sesiones.length} sesiones encontradas`)

  // 4. Limpiar datos existentes
  console.log('\n🧹 Limpiando datos anteriores...')

  // Primero obtener IDs de ejercicios para limpiar tracking
  const ejercicioIds = sesiones.flatMap(s => s.ejercicios?.map(e => e.id) || [])

  if (ejercicioIds.length > 0) {
    await supabase
      .from('tracking')
      .delete()
      .in('ejercicio_id', ejercicioIds)
  }

  // Limpiar semanas anteriores
  await supabase
    .from('semanas')
    .delete()
    .eq('rutina_id', rutina.id)

  console.log('✅ Datos limpiados')

  // 5. Crear 2 semanas de datos
  console.log('\n📅 Creando 2 semanas de datos...')

  const fechaInicio1 = '2026-05-11' // Semana 1 (hace 2 semanas)
  const fechaInicio2 = '2026-05-18' // Semana 2 (semana pasada)

  const semanas = [
    { numero: 1, fecha_inicio: fechaInicio1 },
    { numero: 2, fecha_inicio: fechaInicio2 }
  ]

  // Calendario tipo: lunes partido, martes gym, jueves gym, viernes futsal, domingo descanso
  // Solo 2 sesiones de gym por semana para evitar duplicados del mismo ejercicio
  const calendarioBase = {
    lunes: { tipo: 'partido', estado: 'normal' },
    martes: { tipo: 'gym', sesion_id: sesiones[0].id, estado: 'normal' }, // Push A
    miércoles: { tipo: 'descanso', estado: 'normal' },
    jueves: { tipo: 'gym', sesion_id: sesiones[1]?.id || sesiones[0].id, estado: 'normal' }, // Pull A (o Push A si no hay Pull A)
    viernes: { tipo: 'futsal_entreno', estado: 'normal' },
    sábado: { tipo: 'descanso', estado: 'normal' },
    domingo: { tipo: 'gym_cerrado', estado: 'normal' }
  }

  for (const semana of semanas) {
    console.log(`\n  → Semana ${semana.numero} (inicio: ${semana.fecha_inicio})`)

    // Crear semana
    const { data: semanaData, error: semanaError } = await supabase
      .from('semanas')
      .insert({
        user_id: userId,
        rutina_id: rutina.id,
        semana_numero: semana.numero,
        fecha_inicio: semana.fecha_inicio,
        dia_partido: 'lunes',
        dia_futsal: 'viernes',
        calendario: calendarioBase
      })
      .select()
      .single()

    if (semanaError) {
      console.error('❌ Error creando semana:', semanaError)
      continue
    }

    console.log(`    ✓ Semana ${semana.numero} creada`)

    // Crear tracking para cada sesión de gym del calendario
    let totalSets = 0
    const diasGym = ['martes', 'jueves'] // Solo 2 días para evitar duplicados

    for (const dia of diasGym) {
      const diaInfo = calendarioBase[dia as keyof typeof calendarioBase]
      if (diaInfo.tipo !== 'gym') continue

      const sesionId = (diaInfo as any).sesion_id
      const sesion = sesiones.find(s => s.id === sesionId)

      if (!sesion || !sesion.ejercicios) continue

      console.log(`    → ${dia}: ${sesion.nombre}`)

      // Para cada ejercicio de la sesión
      for (const ejercicio of sesion.ejercicios) {
        const numSeries = ejercicio.series || 3

        // Generar datos de tracking para cada serie
        // Peso base según grupo muscular
        let pesoBase = 50
        if (ejercicio.grupo_muscular?.toLowerCase().includes('pecho')) pesoBase = 80
        if (ejercicio.grupo_muscular?.toLowerCase().includes('hombro')) pesoBase = 50
        if (ejercicio.grupo_muscular?.toLowerCase().includes('tríceps')) pesoBase = 0 // peso corporal

        for (let serie = 1; serie <= numSeries; serie++) {
          // Variación de peso y reps por serie (fatiga)
          const peso = pesoBase > 0 ? pesoBase - (serie - 1) * 2.5 : 0
          const reps = 12 - (serie - 1) * 2 // 12, 10, 8...

          const { error: trackError } = await supabase
            .from('tracking')
            .insert({
              user_id: userId,
              semana_id: semanaData.id,
              ejercicio_id: ejercicio.id,
              numero_serie: serie,
              peso: peso,
              reps: reps
            })

          if (trackError) {
            console.error(`      ❌ Error en tracking (serie ${serie}): ${trackError.message}`)
          } else {
            totalSets++
          }
        }

        console.log(`      ✓ ${ejercicio.nombre}: ${numSeries} series`)
      }
    }

    // Marcar sesiones como completadas
    const calendarioCompletado = { ...calendarioBase }
    diasGym.forEach(dia => {
      const diaInfo = calendarioCompletado[dia as keyof typeof calendarioCompletado]
      if (diaInfo.tipo === 'gym') {
        (diaInfo as any).estado = 'completada'
        ;(diaInfo as any).timestamp = new Date().toISOString()
      }
    })

    await supabase
      .from('semanas')
      .update({ calendario: calendarioCompletado })
      .eq('id', semanaData.id)

    console.log(`    ✓ ${totalSets} sets registrados`)
    console.log(`    ✓ ${diasGym.length} sesiones marcadas como completadas`)
  }

  // 6. Verificación final
  console.log('\n' + '='.repeat(60))
  console.log('📊 VERIFICACIÓN FINAL')
  console.log('='.repeat(60))

  const { data: semanasVerif } = await supabase
    .from('semanas')
    .select('semana_numero, fecha_inicio')
    .eq('rutina_id', rutina.id)
    .order('semana_numero')

  console.log(`\n✅ ${semanasVerif?.length} semanas creadas:`)
  semanasVerif?.forEach(s => {
    console.log(`   - Semana ${s.semana_numero}: ${s.fecha_inicio}`)
  })

  const { data: trackingVerif } = await supabase
    .from('tracking')
    .select('id')
    .eq('user_id', userId)

  console.log(`\n✅ ${trackingVerif?.length} sets registrados en total`)

  console.log('\n' + '='.repeat(60))
  console.log('✅ Datos de prueba creados exitosamente\n')
}

populateTestData()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('\n❌ Error:', error)
    process.exit(1)
  })

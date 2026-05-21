import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function fixDates() {
  console.log('🔧 Ajustando fechas para consistencia\n')

  const { data: authData } = await supabase.auth.signInWithPassword({
    email: 'test@gymbro.com',
    password: 'test123456'
  })

  const userId = authData.user!.id

  // 1. Obtener rutina
  const { data: rutina } = await supabase
    .from('rutinas')
    .select('*')
    .eq('user_id', userId)
    .single()

  console.log('📅 Situación actual:')
  console.log('  Rutina inicio:', rutina.fecha_inicio)
  console.log('  Hoy:', new Date().toISOString().split('T')[0])

  // 2. Cambiar fecha de inicio de rutina a 2026-05-04
  // Esto hace que hoy (21 mayo) sea día 17 = Semana 3
  const nuevaFechaInicio = '2026-05-04'

  console.log('\n🔄 Actualizando...')
  console.log('  Nueva fecha inicio rutina:', nuevaFechaInicio)

  const { error: rutinaError } = await supabase
    .from('rutinas')
    .update({ fecha_inicio: nuevaFechaInicio })
    .eq('id', rutina.id)

  if (rutinaError) throw rutinaError
  console.log('  ✅ Rutina actualizada')

  // 3. Ajustar fechas de semanas para que sean consistentes
  const { data: semanas } = await supabase
    .from('semanas')
    .select('*')
    .eq('rutina_id', rutina.id)
    .order('semana_numero')

  if (semanas) {
    console.log('\n📆 Ajustando semanas...')
    for (const semana of semanas) {
      // Calcular la fecha correcta basándose en el número de semana
      // Semana 1: 2026-05-04, Semana 2: 2026-05-11, etc.
      const fecha = new Date('2026-05-04')
      fecha.setDate(fecha.getDate() + (semana.semana_numero - 1) * 7)
      const fechaStr = fecha.toISOString().split('T')[0]

      console.log(`  Semana ${semana.semana_numero}: ${semana.fecha_inicio} → ${fechaStr}`)

      const { error } = await supabase
        .from('semanas')
        .update({ fecha_inicio: fechaStr })
        .eq('id', semana.id)

      if (error) throw error
    }
    console.log('  ✅ Todas las semanas actualizadas')
  }

  // 4. Crear Semana 3 (la actual) para que aparezca en el calendario
  console.log('\n➕ Creando Semana 3 (actual)...')

  // Obtener sesiones para el calendario
  const { data: sesiones } = await supabase
    .from('sesiones')
    .select('id, nombre')
    .eq('rutina_id', rutina.id)
    .order('orden')

  if (!sesiones || sesiones.length === 0) {
    console.log('  ⚠️ No hay sesiones')
  } else {
    const calendario = {
      lunes: { tipo: 'partido', estado: 'normal' },
      martes: { tipo: 'gym', sesion_id: sesiones[0].id, estado: 'normal' },
      miércoles: { tipo: 'descanso', estado: 'normal' },
      jueves: { tipo: 'gym', sesion_id: sesiones[1]?.id || sesiones[0].id, estado: 'normal' },
      viernes: { tipo: 'futsal_entreno', estado: 'normal' },
      sábado: { tipo: 'descanso', estado: 'normal' },
      domingo: { tipo: 'gym_cerrado', estado: 'normal' }
    }

    const { error: semana3Error } = await supabase
      .from('semanas')
      .insert({
        user_id: userId,
        rutina_id: rutina.id,
        semana_numero: 3,
        fecha_inicio: '2026-05-18',
        dia_partido: 'lunes',
        dia_futsal: 'viernes',
        calendario
      })

    if (semana3Error) {
      // Si ya existe, ignorar
      if (!semana3Error.message.includes('duplicate')) {
        throw semana3Error
      }
      console.log('  ℹ️ Semana 3 ya existe')
    } else {
      console.log('  ✅ Semana 3 creada')
    }
  }

  // 5. Verificación
  console.log('\n' + '='.repeat(60))
  console.log('✅ RESULTADO FINAL')
  console.log('='.repeat(60))

  const hoy = new Date().toISOString().split('T')[0]
  const inicioRutina = new Date(nuevaFechaInicio)
  const hoyDate = new Date(hoy)
  const diasDesdeInicio = Math.floor((hoyDate.getTime() - inicioRutina.getTime()) / (1000 * 60 * 60 * 24))
  const semanaActual = Math.floor(diasDesdeInicio / 7) + 1

  console.log('\nRutina inicio:', nuevaFechaInicio)
  console.log('Hoy:', hoy)
  console.log('Días transcurridos:', diasDesdeInicio)
  console.log('Semana actual:', semanaActual, '/ 6')

  const { data: semanasVerif } = await supabase
    .from('semanas')
    .select('*')
    .eq('rutina_id', rutina.id)
    .order('semana_numero')

  console.log('\nSemanas en BD:')
  semanasVerif?.forEach(s => {
    const inicio = new Date(s.fecha_inicio)
    const fin = new Date(inicio)
    fin.setDate(fin.getDate() + 6)
    const estado = hoyDate >= inicio && hoyDate <= fin ? '← ACTUAL' : ''

    const cal = s.calendario as any
    const completadas = Object.entries(cal)
      .filter(([_, v]: [string, any]) => v.estado === 'completada')
      .map(([k]) => k)

    console.log(`  Semana ${s.semana_numero}: ${s.fecha_inicio} a ${fin.toISOString().split('T')[0]} ${estado}`)
    console.log(`    Sesiones completadas: ${completadas.length > 0 ? completadas.join(', ') : 'ninguna'}`)
  })

  console.log('\n✨ Ahora la app debería mostrar:')
  console.log('  - Progreso: Semana 3 / 6')
  console.log('  - Sesiones completadas: las de Semana 1 y 2 ya pasadas')
  console.log('  - Estadísticas: todos los datos visibles')
}

fixDates()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('\n❌ Error:', error)
    process.exit(1)
  })

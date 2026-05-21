import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function checkDates() {
  const { data: authData } = await supabase.auth.signInWithPassword({
    email: 'test@gymbro.com',
    password: 'test123456'
  })

  const userId = authData.user!.id

  // Obtener rutina y sus fechas
  const { data: rutina } = await supabase
    .from('rutinas')
    .select('*')
    .eq('user_id', userId)
    .single()

  console.log('📅 RUTINA')
  console.log('  Nombre:', rutina.nombre)
  console.log('  Fecha inicio:', rutina.fecha_inicio)
  console.log('  Semanas duración:', rutina.semanas_duracion)

  const hoy = new Date().toISOString().split('T')[0]
  console.log('  Hoy:', hoy)

  // Obtener semanas
  const { data: semanas } = await supabase
    .from('semanas')
    .select('*')
    .eq('rutina_id', rutina.id)
    .order('semana_numero')

  console.log('\n📆 SEMANAS CREADAS')
  semanas?.forEach(s => {
    console.log(`  Semana ${s.semana_numero}: ${s.fecha_inicio}`)
    const cal = s.calendario as any
    const completadas = Object.entries(cal)
      .filter(([_, v]: [string, any]) => v.estado === 'completada')
      .map(([k]) => k)
    console.log(`    Días completados: ${completadas.join(', ') || 'ninguno'}`)
  })

  // Calcular qué semana es HOY
  const inicioRutina = new Date(rutina.fecha_inicio)
  const hoyDate = new Date(hoy)
  const diasDesdeInicio = Math.floor((hoyDate.getTime() - inicioRutina.getTime()) / (1000 * 60 * 60 * 24))
  const semanaActual = Math.floor(diasDesdeInicio / 7) + 1

  console.log('\n🔢 CÁLCULO')
  console.log('  Días desde inicio rutina:', diasDesdeInicio)
  console.log('  Semana actual calculada:', semanaActual)

  console.log('\n⚠️ PROBLEMAS DETECTADOS:')

  if (semanas && semanas.length > 0) {
    // Verificar si hay semanas que empezaron antes de la rutina
    semanas.forEach(s => {
      const fechaSemana = new Date(s.fecha_inicio)
      if (fechaSemana < inicioRutina) {
        console.log(`  ❌ Semana ${s.semana_numero} empieza ANTES de la rutina (${s.fecha_inicio} vs ${rutina.fecha_inicio})`)
      }
    })

    // Verificar si la semana actual tiene sesiones completadas
    const semanaHoy = semanas.find(s => {
      const fechaSemana = new Date(s.fecha_inicio)
      const finSemana = new Date(fechaSemana)
      finSemana.setDate(finSemana.getDate() + 6)
      return hoyDate >= fechaSemana && hoyDate <= finSemana
    })

    if (semanaHoy) {
      console.log(`\n✅ Semana actual encontrada: Semana ${semanaHoy.semana_numero}`)
      const cal = semanaHoy.calendario as any
      const completadas = Object.entries(cal)
        .filter(([_, v]: [string, any]) => v.estado === 'completada')
        .map(([k]) => k)

      if (completadas.length === 0) {
        console.log('  ⚠️ No hay sesiones completadas esta semana → por eso muestra 0%')
      } else {
        console.log(`  ✓ ${completadas.length} sesiones completadas: ${completadas.join(', ')}`)
      }
    } else {
      console.log('\n❌ No se encontró semana para la fecha actual')
    }
  }
}

checkDates()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error:', error)
    process.exit(1)
  })

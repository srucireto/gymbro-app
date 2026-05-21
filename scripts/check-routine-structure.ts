import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

const TEST_EMAIL = 'test@gymbro.com'
const TEST_PASSWORD = 'test123456'

async function checkRoutineStructure() {
  console.log('🔍 Verificando estructura de la rutina\n')

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
    console.log('❌ No hay rutina activa')
    return
  }

  console.log('📋 RUTINA')
  console.log(`  Nombre: ${rutina.nombre}`)
  console.log(`  Duración: ${rutina.semanas_duracion} semanas`)
  console.log(`  Fecha inicio: ${rutina.fecha_inicio}\n`)

  // Obtener sesiones
  const { data: sesiones } = await supabase
    .from('sesiones')
    .select('*')
    .eq('rutina_id', rutina.id)
    .order('orden')

  console.log('💪 SESIONES CONFIGURADAS:')
  if (!sesiones || sesiones.length === 0) {
    console.log('  ⚠️ No hay sesiones\n')
  } else {
    sesiones.forEach(s => {
      console.log(`  ${s.orden}. ${s.nombre} (ID: ${s.id})`)
    })
    console.log()
  }

  // Obtener semanas y ver qué sesiones tienen asignadas
  const { data: semanas } = await supabase
    .from('semanas')
    .select('*')
    .eq('rutina_id', rutina.id)
    .order('semana_numero')

  console.log('📅 SEMANAS Y SUS CALENDARIOS:\n')
  if (!semanas || semanas.length === 0) {
    console.log('  ⚠️ No hay semanas\n')
  } else {
    semanas.forEach(sem => {
      console.log(`Semana ${sem.semana_numero} (${sem.fecha_inicio}):`)
      const cal = sem.calendario as Record<string, any>

      Object.entries(cal).forEach(([dia, config]: [string, any]) => {
        if (config.tipo === 'gym') {
          const sesion = sesiones?.find(s => s.id === config.sesion_id)
          console.log(`  ${dia}: ${config.tipo} - ${sesion?.nombre || 'Sesión desconocida'} (estado: ${config.estado})`)
        } else {
          console.log(`  ${dia}: ${config.tipo} (estado: ${config.estado})`)
        }
      })
      console.log()
    })
  }

  // Ver ejercicios por sesión
  console.log('🏋️ EJERCICIOS POR SESIÓN:\n')
  if (sesiones) {
    for (const sesion of sesiones) {
      const { data: ejercicios } = await supabase
        .from('ejercicios')
        .select('*')
        .eq('sesion_id', sesion.id)
        .order('orden')

      console.log(`${sesion.nombre}:`)
      if (!ejercicios || ejercicios.length === 0) {
        console.log('  ⚠️ Sin ejercicios configurados')
      } else {
        ejercicios.forEach(ej => {
          console.log(`  - ${ej.nombre} (${ej.grupo_muscular}) - ${ej.series} series`)
        })
      }
      console.log()
    }
  }

  // Ver qué tracking existe
  console.log('📊 TRACKING EXISTENTE:\n')
  const { data: tracking } = await supabase
    .from('tracking')
    .select(`
      *,
      ejercicio:ejercicios(nombre, sesion_id),
      semana:semanas(semana_numero)
    `)
    .eq('user_id', userId)

  if (!tracking || tracking.length === 0) {
    console.log('  ⚠️ No hay tracking\n')
  } else {
    // Agrupar por sesión
    const porSesion: Record<string, any[]> = {}
    tracking.forEach(t => {
      const sesionId = t.ejercicio?.sesion_id
      const sesion = sesiones?.find(s => s.id === sesionId)
      const key = sesion?.nombre || 'Desconocida'
      if (!porSesion[key]) {
        porSesion[key] = []
      }
      porSesion[key].push(t)
    })

    Object.entries(porSesion).forEach(([nombre, sets]) => {
      console.log(`${nombre}: ${sets.length} sets`)
    })
  }
}

checkRoutineStructure()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('\n❌ Error:', error)
    process.exit(1)
  })

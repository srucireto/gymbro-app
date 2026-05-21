import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

const TEST_EMAIL = 'test@gymbro.com'
const TEST_PASSWORD = 'test123456'

// Pesos base por ejercicio (kg)
const PESOS_BASE: Record<string, number> = {
  'Dominadas pronas con peso': 10,
  'RDL con mancuernas': 30,
  'Chest-supported row': 40,
  'Curl de pierna sentado': 45,
  'Curl predicador': 25,
  'Pullover con cable': 30,
  'Face pull': 20,
  'Hip thrust con barra': 80,
  'Curl martillo': 14,
  'Press de banca plano con barra': 80,
  'Sentadilla hack': 100,
  'Press inclinado con mancuernas': 32,
  'Press militar sentado con mancuernas': 22,
  'Extensión de pierna': 50,
  'Cruce de poleas': 15,
  'Extensión tríceps overhead con cable': 25,
  'Elevación lateral con mancuernas': 10,
  'Pantorrilla de pie': 70,
  'Jalón al pecho agarre ancho': 55,
  'Remo sentado en polea': 50,
  'Remo mancuerna a una mano': 30,
  'Step-up con mancuernas': 16,
  'Curl de pierna sentado liviano': 35,
  'Curl bayesiano en cable': 15,
  'Rear delt fly': 12,
  'Y-raise en prono': 5,
  'Roll-out abdominal': 0,
  'Press inclinado con barra': 65,
  'Press plano con mancuernas': 34,
  'Press militar sentado (B)': 22,
  'Extensión de pierna post-partido': 45,
  'Aperturas con mancuernas inclinado': 16,
  'Extensión overhead mancuerna': 18,
  'Elevación lateral en cable': 8,
  'Hip thrust liviano': 60,
  'Pantorrilla de pie liviano': 50
}

// Incremento por semana (kg)
const INCREMENTO_SEMANAL: Record<string, number> = {
  // Compuestos pesados: +2.5kg/semana
  'Press de banca plano con barra': 2.5,
  'Sentadilla hack': 2.5,
  'RDL con mancuernas': 2.5,
  'Press inclinado con barra': 2.5,
  'Hip thrust con barra': 2.5,
  'Dominadas pronas con peso': 2.5,

  // Mancuernas/máquinas medias: +1.25kg/semana
  'Press inclinado con mancuernas': 1.25,
  'Press plano con mancuernas': 1.25,
  'Chest-supported row': 1.25,
  'Jalón al pecho agarre ancho': 1.25,
  'Remo sentado en polea': 1.25,
  'Remo mancuerna a una mano': 1.25,
  'Press militar sentado con mancuernas': 1.25,
  'Press militar sentado (B)': 1.25,
  'Extensión de pierna': 1.25,
  'Curl de pierna sentado': 1.25,

  // Aislamiento: +0.625kg/semana
  'Curl predicador': 0.625,
  'Curl martillo': 0.625,
  'Curl bayesiano en cable': 0.625,
  'Extensión tríceps overhead con cable': 0.625,
  'Extensión overhead mancuerna': 0.625,
  'Pullover con cable': 0.625,

  // Resto: sin progresión o mínima
  'default': 0
}

async function populateRoutineTracking() {
  console.log('💾 Poblando tracking de rutina completa (6 semanas)\n')

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

  // Obtener sesiones y ejercicios
  const { data: sesiones } = await supabase
    .from('sesiones')
    .select('*')
    .eq('rutina_id', rutina.id)
    .order('orden')

  const { data: ejercicios } = await supabase
    .from('ejercicios')
    .select('*')
    .in('sesion_id', sesiones?.map(s => s.id) || [])
    .order('orden')

  console.log('📋 Configuración:')
  console.log('   Sesiones:', sesiones?.length)
  console.log('   Ejercicios:', ejercicios?.length)
  console.log()

  // Borrar tracking antiguo
  console.log('🗑️  Limpiando tracking antiguo...')
  await supabase.from('tracking').delete().eq('user_id', userId)
  console.log('✅ Limpio\n')

  // Borrar semanas antiguas y recrear
  console.log('📅 Recreando semanas...')
  await supabase.from('semanas').delete().eq('rutina_id', rutina.id)

  const fechaInicio = new Date(rutina.fecha_inicio)
  const pullA = sesiones?.find(s => s.nombre === 'Pull A')
  const pushA = sesiones?.find(s => s.nombre === 'Push A')
  const pullB = sesiones?.find(s => s.nombre === 'Pull B')
  const pushB = sesiones?.find(s => s.nombre === 'Push B')

  const semanasCreadas = []

  for (let semNum = 1; semNum <= 6; semNum++) {
    const fechaSemana = new Date(fechaInicio)
    fechaSemana.setDate(fechaSemana.getDate() + (semNum - 1) * 7)

    // Calendario según rutina.md: Lun=Pull A, Mie=Push A, Jue=Pull B, Sab=Push B
    const calendario = {
      lunes: { tipo: 'gym', sesion_id: pullA!.id, estado: 'completada' },
      martes: { tipo: 'futsal_entreno', estado: 'normal' },
      miércoles: { tipo: 'gym', sesion_id: pushA!.id, estado: 'completada' },
      jueves: { tipo: 'gym', sesion_id: pullB!.id, estado: 'completada' },
      viernes: { tipo: 'partido', estado: 'normal' },
      sábado: { tipo: 'gym', sesion_id: pushB!.id, estado: 'completada' },
      domingo: { tipo: 'descanso', estado: 'normal' }
    }

    const { data } = await supabase
      .from('semanas')
      .insert({
        user_id: userId,
        rutina_id: rutina.id,
        semana_numero: semNum,
        fecha_inicio: fechaSemana.toISOString().split('T')[0],
        dia_partido: 'viernes',
        dia_futsal: 'martes',
        calendario
      })
      .select()
      .single()

    if (data) {
      semanasCreadas.push(data)
      console.log(`✅ Semana ${semNum} (${data.fecha_inicio})`)
    }
  }

  console.log()

  // Poblar tracking
  console.log('💪 Poblando tracking con progresión...\n')

  let totalSets = 0

  for (const semana of semanasCreadas) {
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

      const ejerciciosSesion = ejercicios?.filter(e => e.sesion_id === sesion.id) || []
      console.log(`  ${dia}: ${sesion.nombre} (${ejerciciosSesion.length} ejercicios)`)

      for (const ejercicio of ejerciciosSesion) {
        const pesoBase = PESOS_BASE[ejercicio.nombre] || 0
        const incremento = INCREMENTO_SEMANAL[ejercicio.nombre] || INCREMENTO_SEMANAL['default']

        // Peso de esta semana
        const pesoSemana = pesoBase + (semana.semana_numero - 1) * incremento

        // Extraer reps del reps_target (ej: "6-8" → usar 7 como promedio)
        const repsMatch = ejercicio.reps_target.match(/(\d+)-(\d+)/)
        let repsBase = 10
        if (repsMatch) {
          const [, min, max] = repsMatch
          repsBase = Math.ceil((parseInt(min) + parseInt(max)) / 2)
        }

        const numSeries = ejercicio.series

        for (let serie = 1; serie <= numSeries; serie++) {
          // Drop set: -5% por serie
          const pesoDrop = pesoSemana > 0 ? Math.max(0, pesoSemana - (serie - 1) * pesoSemana * 0.05) : 0

          // Reps: bajan por fatiga (-1 o -2 por serie)
          const repsDrop = serie === 1 ? 0 : (serie - 1) * 1.5
          const reps = Math.max(repsBase - Math.floor(repsDrop), Math.ceil(repsBase * 0.6))

          await supabase.from('tracking').insert({
            user_id: userId,
            semana_id: semana.id,
            ejercicio_id: ejercicio.id,
            numero_serie: serie,
            peso: Math.round(pesoDrop * 10) / 10, // Redondear a 1 decimal
            reps: reps
          })

          totalSets++
        }
      }
    }
  }

  // Verificación final
  console.log('\n' + '='.repeat(70))
  console.log('✅ TRACKING POBLADO')
  console.log('='.repeat(70))

  const { data: tracking } = await supabase
    .from('tracking')
    .select(`
      *,
      ejercicio:ejercicios(nombre, grupo_muscular)
    `)
    .eq('user_id', userId)

  if (tracking) {
    console.log(`\nTotal sets: ${tracking.length}`)

    const porGrupo = tracking.reduce((acc: any, t: any) => {
      const grupo = t.ejercicio?.grupo_muscular || 'Desconocido'
      if (!acc[grupo]) {
        acc[grupo] = { sets: 0, reps: 0, volumen: 0 }
      }
      acc[grupo].sets++
      acc[grupo].reps += t.reps || 0
      acc[grupo].volumen += (t.peso || 0) * (t.reps || 0)
      return acc
    }, {})

    console.log('\nPor grupo muscular:')
    Object.entries(porGrupo)
      .sort(([, a]: [string, any], [, b]: [string, any]) => b.volumen - a.volumen)
      .slice(0, 10) // Top 10
      .forEach(([grupo, stats]: [string, any]) => {
        console.log(`  ${grupo}: ${stats.sets} sets, ${stats.reps} reps, ${(stats.volumen / 1000).toFixed(1)}k kg`)
      })

    console.log('\n✨ Rutina completa poblada: 4 sesiones/semana × 6 semanas')
  }
}

populateRoutineTracking()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('\n❌ Error:', error)
    process.exit(1)
  })

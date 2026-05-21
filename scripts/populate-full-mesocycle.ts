import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

const TEST_EMAIL = 'test@gymbro.com'
const TEST_PASSWORD = 'test123456'

async function populateFullMesocycle() {
  console.log('📊 Poblando mesociclo completo (6 semanas)\n')

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
  console.log('   Duración:', rutina.semanas_duracion, 'semanas')
  console.log('   Inicio:', rutina.fecha_inicio)
  console.log()

  // Obtener sesiones y ejercicios
  const { data: sesiones } = await supabase
    .from('sesiones')
    .select('*')
    .eq('rutina_id', rutina.id)
    .order('orden')

  const pushA = sesiones?.find(s => s.nombre === 'Push A')
  const pullA = sesiones?.find(s => s.nombre === 'Pull A')

  if (!pushA || !pullA) {
    console.error('❌ No se encontraron ambas sesiones')
    process.exit(1)
  }

  const { data: ejercicios } = await supabase
    .from('ejercicios')
    .select('*')
    .in('sesion_id', [pushA.id, pullA.id])
    .order('orden')

  console.log('💪 Ejercicios configurados:')
  ejercicios?.forEach(ej => {
    const sesion = sesiones?.find(s => s.id === ej.sesion_id)
    console.log(`  ${ej.nombre} (${sesion?.nombre}) - ${ej.series} series`)
  })
  console.log()

  // Verificar semanas existentes
  const { data: semanasExistentes } = await supabase
    .from('semanas')
    .select('*')
    .eq('rutina_id', rutina.id)
    .order('semana_numero')

  console.log('📅 Semanas existentes:', semanasExistentes?.map(s => s.semana_numero).join(', '))
  console.log()

  // Crear semanas faltantes (4, 5, 6)
  const fechaInicio = new Date(rutina.fecha_inicio)
  const semanasACrear = []

  for (let semNum = 4; semNum <= 6; semNum++) {
    const existe = semanasExistentes?.find(s => s.semana_numero === semNum)
    if (!existe) {
      const fechaSemana = new Date(fechaInicio)
      fechaSemana.setDate(fechaSemana.getDate() + (semNum - 1) * 7)

      const calendario = {
        lunes: { tipo: 'partido', estado: 'normal' },
        martes: { tipo: 'gym', sesion_id: pushA.id, estado: 'completada' },
        miércoles: { tipo: 'descanso', estado: 'normal' },
        jueves: { tipo: 'gym', sesion_id: pullA.id, estado: 'completada' },
        viernes: { tipo: 'futsal_entreno', estado: 'normal' },
        sábado: { tipo: 'descanso', estado: 'normal' },
        domingo: { tipo: 'gym_cerrado', estado: 'normal' }
      }

      semanasACrear.push({
        user_id: userId,
        rutina_id: rutina.id,
        semana_numero: semNum,
        fecha_inicio: fechaSemana.toISOString().split('T')[0],
        dia_partido: 'lunes',
        dia_futsal: 'viernes',
        calendario
      })
    }
  }

  if (semanasACrear.length > 0) {
    console.log('➕ Creando semanas faltantes:', semanasACrear.map(s => s.semana_numero).join(', '))
    const { error } = await supabase.from('semanas').insert(semanasACrear)
    if (error) {
      console.error('❌ Error creando semanas:', error.message)
    } else {
      console.log('✅ Semanas creadas')
    }
  }

  // Obtener todas las semanas (incluyendo las recién creadas)
  const { data: todasLasSemanas } = await supabase
    .from('semanas')
    .select('*')
    .eq('rutina_id', rutina.id)
    .order('semana_numero')

  console.log('\n📊 Total semanas:', todasLasSemanas?.length)
  console.log()

  // Limpiar tracking existente
  console.log('🗑️  Limpiando tracking antiguo...')
  await supabase.from('tracking').delete().eq('user_id', userId)
  console.log('✅ Tracking limpio\n')

  // Poblar tracking con progresión realista
  console.log('💾 Poblando tracking con progresión (6 semanas)...\n')

  // Definir pesos base y progresión por ejercicio
  const pesosPorEjercicio: Record<string, { base: number; incremento: number }> = {
    'Press Banca': { base: 75, incremento: 2.5 },      // 75kg → 87.5kg en 6 semanas
    'Press Militar': { base: 45, incremento: 2.5 },    // 45kg → 57.5kg
    'Fondos': { base: 0, incremento: 0 },              // Peso corporal
    'Dominadas': { base: 0, incremento: 0 },           // Peso corporal
    'Remo con barra': { base: 55, incremento: 2.5 },   // 55kg → 67.5kg
    'Curl con barra': { base: 27.5, incremento: 1.25 } // 27.5kg → 33.75kg
  }

  let totalSets = 0

  for (const semana of todasLasSemanas || []) {
    console.log(`Semana ${semana.semana_numero} (${semana.fecha_inicio}):`)

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

      console.log(`  ${dia}: ${sesion.nombre}`)

      const ejerciciosSesion = ejercicios?.filter(e => e.sesion_id === sesion.id) || []

      for (const ejercicio of ejerciciosSesion) {
        const numSeries = ejercicio.series
        const pesoConfig = pesosPorEjercicio[ejercicio.nombre] || { base: 0, incremento: 0 }

        // Calcular peso para esta semana (progresión lineal)
        const pesoSemana = pesoConfig.base + (semana.semana_numero - 1) * pesoConfig.incremento

        for (let serie = 1; serie <= numSeries; serie++) {
          // Drop set progresivo: cada serie baja 2.5kg (o 5-10% del peso)
          const pesoDrop = pesoSemana > 0 ? Math.max(0, pesoSemana - (serie - 1) * 2.5) : 0

          // Reps: empezamos con 12 y bajamos a medida que aumenta el peso (fatiga)
          // Semanas 1-2: 12-10 reps, Semanas 3-4: 10-8 reps, Semanas 5-6: 8-6 reps
          let repsBase = 12
          if (semana.semana_numero >= 3 && semana.semana_numero <= 4) {
            repsBase = 10
          } else if (semana.semana_numero >= 5) {
            repsBase = 8
          }
          const reps = Math.max(6, repsBase - (serie - 1) * 2)

          await supabase.from('tracking').insert({
            user_id: userId,
            semana_id: semana.id,
            ejercicio_id: ejercicio.id,
            numero_serie: serie,
            peso: pesoDrop,
            reps: reps
          })

          totalSets++
        }
      }

      console.log(`    ✓ ${ejerciciosSesion.length} ejercicios completados`)
    }
  }

  // Verificación final
  console.log('\n' + '='.repeat(60))
  console.log('✅ VERIFICACIÓN FINAL')
  console.log('='.repeat(60))

  const { data: trackingFinal } = await supabase
    .from('tracking')
    .select(`
      *,
      ejercicio:ejercicios(nombre, grupo_muscular),
      semana:semanas(semana_numero)
    `)
    .eq('user_id', userId)
    .order('created_at')

  if (trackingFinal) {
    console.log(`\nTotal sets: ${trackingFinal.length}`)

    // Por semana
    const porSemana = trackingFinal.reduce((acc: any, t: any) => {
      const semNum = t.semana?.semana_numero || 'Sin semana'
      if (!acc[semNum]) acc[semNum] = { sets: 0, reps: 0, volumen: 0 }
      acc[semNum].sets++
      acc[semNum].reps += t.reps
      acc[semNum].volumen += t.peso * t.reps
      return acc
    }, {})

    console.log('\nPor semana:')
    Object.entries(porSemana)
      .sort(([a], [b]) => Number(a) - Number(b))
      .forEach(([sem, stats]: [string, any]) => {
        console.log(`  Semana ${sem}: ${stats.sets} sets, ${stats.reps} reps, ${(stats.volumen / 1000).toFixed(1)}k kg`)
      })

    // Por grupo muscular (total)
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

    console.log('\nPor grupo muscular (total):')
    Object.entries(porGrupo)
      .sort(([, a]: [string, any], [, b]: [string, any]) => b.volumen - a.volumen)
      .forEach(([grupo, stats]: [string, any]) => {
        console.log(`  ${grupo}: ${stats.sets} sets, ${stats.reps} reps, ${(stats.volumen / 1000).toFixed(1)}k kg`)
      })

    // Progresión de peso (ejemplo con Press Banca)
    const pressBancaSets = trackingFinal.filter(t => t.ejercicio?.nombre === 'Press Banca')
    if (pressBancaSets.length > 0) {
      console.log('\n📈 Progresión Press Banca (primera serie de cada semana):')
      const porSemanaPress = pressBancaSets
        .filter(t => t.numero_serie === 1)
        .reduce((acc: any, t: any) => {
          const semNum = t.semana?.semana_numero
          if (!acc[semNum]) acc[semNum] = t
          return acc
        }, {})

      Object.entries(porSemanaPress)
        .sort(([a], [b]) => Number(a) - Number(b))
        .forEach(([sem, set]: [string, any]) => {
          console.log(`  Semana ${sem}: ${set.peso}kg × ${set.reps} reps`)
        })
    }

    console.log('\n✨ Mesociclo completo poblado')
    console.log(`   6 semanas × 2 sesiones/semana = ${todasLasSemanas?.length || 0} semanas`)
    console.log(`   ${ejercicios?.length || 0} ejercicios diferentes`)
    console.log(`   ${totalSets} sets totales`)
  }
}

populateFullMesocycle()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('\n❌ Error:', error)
    process.exit(1)
  })

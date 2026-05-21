#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import { readFile } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Autenticar
const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
  email: 'test@gymbro.com',
  password: 'test123456'
})

if (authError) {
  console.error('❌ Error de autenticación:', authError.message)
  process.exit(1)
}

const userId = authData.user.id
console.log('✅ Usuario autenticado:', userId)

// Obtener rutina activa
const { data: rutinaData, error: rutinaError } = await supabase
  .from('rutinas')
  .select('*')
  .eq('user_id', userId)
  .eq('activa', true)
  .single()

if (rutinaError) {
  console.error('❌ Error obteniendo rutina:', rutinaError)
  process.exit(1)
}

console.log(`📋 Rutina encontrada: ${rutinaData.nombre}`)

// Cargar rutina de ejemplo para obtener sesiones de Legs
const rutinaPath = join(__dirname, '../data/ejemplo-rutina.json')
const rutinaJSON = JSON.parse(await readFile(rutinaPath, 'utf-8'))

// Filtrar solo las sesiones de Legs (orden 5 y 6)
const legsSessions = rutinaJSON.sesiones.filter(s => s.tipo === 'legs')

console.log(`\n🦵 Agregando ${legsSessions.length} sesiones de Legs...`)

const sesionesCreadas = []

for (const sesion of legsSessions) {
  // Verificar si ya existe una sesión con este nombre
  const { data: existente } = await supabase
    .from('sesiones')
    .select('id')
    .eq('rutina_id', rutinaData.id)
    .eq('nombre', sesion.nombre)
    .maybeSingle()

  if (existente) {
    console.log(`   ⚠️  ${sesion.nombre} ya existe, saltando...`)
    continue
  }

  const { data: sesionData, error: sesionError } = await supabase
    .from('sesiones')
    .insert({
      rutina_id: rutinaData.id,
      nombre: sesion.nombre,
      tipo: sesion.tipo,
      intensidad: sesion.intensidad,
      buffer_minimo_horas: sesion.buffer_minimo_horas,
      es_post_partido: sesion.es_post_partido || false,
      orden: sesion.orden
    })
    .select()
    .single()

  if (sesionError) {
    console.error(`   ❌ Error creando ${sesion.nombre}:`, sesionError)
    continue
  }

  sesionesCreadas.push(sesionData)
  console.log(`   ✅ ${sesionData.nombre} creada`)

  // Insertar ejercicios
  if (sesion.ejercicios) {
    const ejerciciosToInsert = sesion.ejercicios.map((ej) => ({
      sesion_id: sesionData.id,
      nombre: ej.nombre,
      grupo_muscular: ej.grupo_muscular,
      series: ej.series,
      reps_target: ej.reps_target,
      rir_target: ej.rir_target,
      notas: ej.notas,
      nota_ajuste: ej.nota_ajuste,
      youtube_search: ej.youtube_search,
      orden: ej.orden
    }))

    const { error: ejerciciosError } = await supabase
      .from('ejercicios')
      .insert(ejerciciosToInsert)

    if (ejerciciosError) {
      console.error(`      ❌ Error insertando ejercicios:`, ejerciciosError)
    } else {
      console.log(`      ✅ ${ejerciciosToInsert.length} ejercicios agregados`)
    }
  }
}

if (sesionesCreadas.length === 0) {
  console.log('\n⚠️  No se crearon sesiones nuevas (ya existían)')
  process.exit(0)
}

console.log(`\n✨ ${sesionesCreadas.length} sesiones de Legs agregadas exitosamente`)

// Ahora generar tracking para estas sesiones en las semanas existentes
console.log('\n📊 Generando tracking para sesiones de Legs...')

// Obtener todas las semanas
const { data: semanas, error: semanasError } = await supabase
  .from('semanas')
  .select('*')
  .eq('user_id', userId)
  .order('fecha_inicio', { ascending: true })

if (semanasError) {
  console.error('❌ Error obteniendo semanas:', semanasError)
  process.exit(1)
}

const DIAS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo']

// Para cada semana, simular que se completó al menos 1 sesión de Legs
let trackingCount = 0

for (const semana of semanas) {
  const calendario = semana.calendario

  // Buscar un día de gym que no esté usado y marcar como Legs completada
  let diaParaLegs = null
  for (const dia of DIAS) {
    const entrada = calendario[dia]
    if (entrada?.tipo === 'gym' && !entrada.estado) {
      diaParaLegs = dia
      break
    }
  }

  if (!diaParaLegs) {
    // Si no hay días disponibles, usar un día aleatorio de gym
    const diasGym = DIAS.filter(d => calendario[d]?.tipo === 'gym')
    if (diasGym.length > 0) {
      diaParaLegs = diasGym[Math.floor(Math.random() * diasGym.length)]
    }
  }

  if (!diaParaLegs) continue

  // Elegir una sesión de Legs aleatoriamente
  const sesionLegs = sesionesCreadas[Math.floor(Math.random() * sesionesCreadas.length)]

  // Obtener ejercicios de esta sesión
  const { data: ejerciciosData } = await supabase
    .from('ejercicios')
    .select('id, nombre, grupo_muscular, series')
    .eq('sesion_id', sesionLegs.id)
    .order('orden')

  if (!ejerciciosData || ejerciciosData.length === 0) continue

  // Generar tracking para cada ejercicio
  for (const ej of ejerciciosData) {
    const pesoBase = getPesoBaseParaEjercicio(ej.nombre)
    const incrementoSemanal = 2.5
    const peso = pesoBase + (semana.semana_numero - 1) * incrementoSemanal

    for (let serie = 1; serie <= ej.series; serie++) {
      const repsBase = getRepsBaseParaEjercicio(ej.nombre)
      const reps = repsBase + Math.floor(Math.random() * 3)

      const { error: trackingError } = await supabase
        .from('tracking')
        .insert({
          user_id: userId,
          ejercicio_id: ej.id,
          semana_id: semana.id,
          numero_serie: serie,
          peso: Number(peso.toFixed(1)),
          reps: reps
        })

      if (!trackingError) {
        trackingCount++
      }
    }
  }
}

console.log(`✅ ${trackingCount} registros de tracking creados para ejercicios de piernas`)
console.log('\n🎉 Proceso completado')

// Helper functions
function getPesoBaseParaEjercicio(nombre) {
  const nombre_lower = nombre.toLowerCase()

  // Ejercicios compuestos de piernas pesados
  if (nombre_lower.includes('sentadilla') && nombre_lower.includes('barra')) {
    return 80 + Math.random() * 20 // 80-100kg
  }
  if (nombre_lower.includes('peso muerto')) {
    return 70 + Math.random() * 20 // 70-90kg
  }
  if (nombre_lower.includes('prensa')) {
    return 120 + Math.random() * 30 // 120-150kg
  }

  // Ejercicios unilaterales o con mancuernas
  if (nombre_lower.includes('búlgara') || nombre_lower.includes('mancuernas')) {
    return 20 + Math.random() * 15 // 20-35kg
  }

  // Hip thrust
  if (nombre_lower.includes('hip thrust')) {
    return 60 + Math.random() * 20 // 60-80kg
  }

  // Ejercicios de aislamiento
  if (nombre_lower.includes('curl femoral') || nombre_lower.includes('extensiones')) {
    return 30 + Math.random() * 15 // 30-45kg
  }
  if (nombre_lower.includes('gemelos')) {
    return 40 + Math.random() * 20 // 40-60kg
  }

  return 30 + Math.random() * 10
}

function getRepsBaseParaEjercicio(nombre) {
  const nombre_lower = nombre.toLowerCase()

  // Ejercicios compuestos pesados (6-8 reps)
  if ((nombre_lower.includes('sentadilla') && nombre_lower.includes('barra')) ||
      (nombre_lower.includes('peso muerto') && !nombre_lower.includes('mancuernas'))) {
    return 6 + Math.floor(Math.random() * 3)
  }

  // Ejercicios secundarios (8-10 reps)
  if (nombre_lower.includes('prensa') || nombre_lower.includes('búlgara') ||
      nombre_lower.includes('hip thrust')) {
    return 8 + Math.floor(Math.random() * 3)
  }

  // Ejercicios de aislamiento (12-15 reps)
  if (nombre_lower.includes('curl') || nombre_lower.includes('extensiones')) {
    return 12 + Math.floor(Math.random() * 4)
  }

  // Gemelos (15-20 reps)
  if (nombre_lower.includes('gemelos')) {
    return 15 + Math.floor(Math.random() * 6)
  }

  return 10 + Math.floor(Math.random() * 3)
}

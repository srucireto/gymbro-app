#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Get user ID
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

// Get all semanas with calendario
const { data: semanas, error: semanasError } = await supabase
  .from('semanas')
  .select('*')
  .eq('user_id', userId)
  .order('fecha_inicio', { ascending: true })

if (semanasError) {
  console.error('❌ Error obteniendo semanas:', semanasError)
  process.exit(1)
}

console.log(`📅 Semanas encontradas: ${semanas.length}`)

// Count completed sessions
let sesionesCompletadas = []
const DIAS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo']

for (const semana of semanas) {
  const calendario = semana.calendario

  for (const dia of DIAS) {
    const entrada = calendario[dia]
    if (entrada?.tipo === 'gym' && entrada?.estado === 'completada') {
      sesionesCompletadas.push({
        semanaId: semana.id,
        semanaNumero: semana.semana_numero,
        dia: dia,
        sesionId: entrada.sesion_id,
        fechaCompletada: entrada.fecha_completada
      })
    }
  }
}

console.log(`✅ Sesiones completadas encontradas: ${sesionesCompletadas.length}`)

// For each completed session, get exercises and create tracking data
let trackingCount = 0

for (const sesionInfo of sesionesCompletadas) {
  // Get ejercicios for this session
  const { data: ejerciciosData, error: ejerciciosError } = await supabase
    .from('ejercicios')
    .select('id, nombre, grupo_muscular, series')
    .eq('sesion_id', sesionInfo.sesionId)
    .order('orden')

  if (ejerciciosError) {
    console.error('❌ Error obteniendo ejercicios:', ejerciciosError)
    continue
  }

  // For each exercise, create tracking entries for all series
  for (const ej of ejerciciosData) {
    // Simulate progressive overload (peso base + incremento por semana)
    const pesoBase = getPesoBaseParaEjercicio(ej.nombre)
    const incrementoSemanal = 2.5 // kg por semana
    const peso = pesoBase + (sesionInfo.semanaNumero - 1) * incrementoSemanal

    // Create tracking entries for all series
    for (let serie = 1; serie <= ej.series; serie++) {
      // Simulate rep ranges with slight variation
      const repsBase = getRepsBaseParaEjercicio(ej.nombre)
      const reps = repsBase + Math.floor(Math.random() * 3) // ±0-2 reps variation

      const { error: trackingError } = await supabase
        .from('tracking')
        .insert({
          user_id: userId,
          ejercicio_id: ej.id,
          semana_id: sesionInfo.semanaId,
          numero_serie: serie,
          peso: Number(peso.toFixed(1)),
          reps: reps
        })

      if (trackingError) {
        console.error('❌ Error insertando tracking:', trackingError.message)
      } else {
        trackingCount++
      }
    }
  }
}

console.log(`✅ Tracking creado: ${trackingCount} registros`)

// Helper functions to simulate realistic weights and reps
function getPesoBaseParaEjercicio(nombre) {
  const nombre_lower = nombre.toLowerCase()

  // Ejercicios compuestos pesados (6-8 reps)
  if (nombre_lower.includes('press banca') || nombre_lower.includes('peso muerto')) {
    return 60 + Math.random() * 20 // 60-80kg
  }
  if (nombre_lower.includes('press inclinado') || nombre_lower.includes('remo con barra')) {
    return 50 + Math.random() * 15 // 50-65kg
  }
  if (nombre_lower.includes('dominadas')) {
    return 0 // Bodyweight
  }

  // Ejercicios secundarios (8-12 reps)
  if (nombre_lower.includes('press militar') || nombre_lower.includes('press arnold')) {
    return 30 + Math.random() * 10 // 30-40kg
  }
  if (nombre_lower.includes('remo') || nombre_lower.includes('jalon')) {
    return 40 + Math.random() * 15 // 40-55kg
  }
  if (nombre_lower.includes('fondos')) {
    return 0 // Bodyweight
  }

  // Ejercicios con mancuernas (10-12 reps)
  if (nombre_lower.includes('mancuernas') || nombre_lower.includes('mancuerna')) {
    return 15 + Math.random() * 10 // 15-25kg (por mancuerna)
  }

  // Ejercicios de aislamiento ligeros (12-15 reps)
  if (nombre_lower.includes('elevaciones laterales')) {
    return 8 + Math.random() * 4 // 8-12kg
  }
  if (nombre_lower.includes('curl') || nombre_lower.includes('extension')) {
    return 12 + Math.random() * 8 // 12-20kg
  }
  if (nombre_lower.includes('face pulls') || nombre_lower.includes('aperturas')) {
    return 15 + Math.random() * 10 // 15-25kg
  }

  // Default para ejercicios desconocidos
  return 20 + Math.random() * 10 // 20-30kg
}

function getRepsBaseParaEjercicio(nombre) {
  const nombre_lower = nombre.toLowerCase()

  // Ejercicios compuestos pesados (6-8 reps)
  if (nombre_lower.includes('press banca') || nombre_lower.includes('peso muerto') ||
      nombre_lower.includes('dominadas')) {
    return 6 + Math.floor(Math.random() * 3) // 6-8 reps
  }

  // Ejercicios secundarios (8-10 reps)
  if (nombre_lower.includes('press militar') || nombre_lower.includes('press inclinado') ||
      nombre_lower.includes('remo con barra') || nombre_lower.includes('press arnold')) {
    return 8 + Math.floor(Math.random() * 3) // 8-10 reps
  }

  // Ejercicios con mancuernas (10-12 reps)
  if (nombre_lower.includes('mancuernas') || nombre_lower.includes('mancuerna') ||
      nombre_lower.includes('remo') || nombre_lower.includes('jalon') ||
      nombre_lower.includes('curl') || nombre_lower.includes('fondos')) {
    return 10 + Math.floor(Math.random() * 3) // 10-12 reps
  }

  // Ejercicios de aislamiento (12-15 reps)
  if (nombre_lower.includes('elevaciones') || nombre_lower.includes('extension') ||
      nombre_lower.includes('face pulls') || nombre_lower.includes('aperturas') ||
      nombre_lower.includes('encogimientos')) {
    return 12 + Math.floor(Math.random() * 4) // 12-15 reps
  }

  // Default
  return 10 + Math.floor(Math.random() * 3) // 10-12 reps
}

console.log('✨ Generación de tracking completada')

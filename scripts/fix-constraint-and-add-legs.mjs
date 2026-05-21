#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import { readFile } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Leer env del archivo si existe, o del proceso
let supabaseUrl, supabaseAnonKey, databaseUrl

try {
  const envContent = await readFile(join(__dirname, '../.env.local'), 'utf8')
  const envLines = envContent.split('\n')
  envLines.forEach(line => {
    const [key, ...values] = line.split('=')
    const value = values.join('=').trim()
    if (key === 'VITE_SUPABASE_URL') supabaseUrl = value
    if (key === 'VITE_SUPABASE_ANON_KEY') supabaseAnonKey = value
    if (key === 'VITE_DATABASE_URL') databaseUrl = value
  })
} catch (e) {
  supabaseUrl = process.env.VITE_SUPABASE_URL
  supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY
  databaseUrl = process.env.VITE_DATABASE_URL
}

if (!databaseUrl) {
  console.error('❌ No se encontró VITE_DATABASE_URL')
  console.error('Por favor ejecuta manualmente en Supabase Dashboard SQL Editor:')
  console.error('ALTER TABLE sesiones DROP CONSTRAINT IF EXISTS sesiones_tipo_check;')
  console.error("ALTER TABLE sesiones ADD CONSTRAINT sesiones_tipo_check CHECK (tipo IN ('push', 'pull', 'legs'));")
  process.exit(1)
}

// Actualizar constraint con pg
console.log('🔧 Actualizando constraint...')
const client = new pg.Client({ connectionString: databaseUrl })

try {
  await client.connect()

  await client.query('ALTER TABLE sesiones DROP CONSTRAINT IF EXISTS sesiones_tipo_check')
  console.log('✅ Constraint anterior eliminado')

  await client.query("ALTER TABLE sesiones ADD CONSTRAINT sesiones_tipo_check CHECK (tipo IN ('push', 'pull', 'legs'))")
  console.log('✅ Nuevo constraint agregado (push, pull, legs)')

  await client.end()
} catch (error) {
  console.error('❌ Error actualizando constraint:', error.message)
  await client.end()
  process.exit(1)
}

// Continuar con Supabase para agregar sesiones
const supabase = createClient(supabaseUrl, supabaseAnonKey)

const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
  email: 'test@gymbro.com',
  password: 'test123456'
})

if (authError) {
  console.error('❌ Error de autenticación:', authError.message)
  process.exit(1)
}

const userId = authData.user.id
console.log('\n✅ Usuario autenticado:', userId)

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

console.log(`📋 Rutina: ${rutinaData.nombre}`)

// Cargar sesiones de Legs del JSON
const rutinaPath = join(__dirname, '../data/ejemplo-rutina.json')
const rutinaJSON = JSON.parse(await readFile(rutinaPath, 'utf-8'))
const legsSessions = rutinaJSON.sesiones.filter(s => s.tipo === 'legs')

console.log(`\n🦵 Agregando ${legsSessions.length} sesiones de Legs...`)

const sesionesCreadas = []

for (const sesion of legsSessions) {
  const { data: existente } = await supabase
    .from('sesiones')
    .select('id')
    .eq('rutina_id', rutinaData.id)
    .eq('nombre', sesion.nombre)
    .maybeSingle()

  if (existente) {
    console.log(`   ⚠️  ${sesion.nombre} ya existe`)
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
    console.error(`   ❌ Error: ${sesion.nombre}:`, sesionError.message)
    continue
  }

  sesionesCreadas.push(sesionData)
  console.log(`   ✅ ${sesionData.nombre}`)

  if (sesion.ejercicios) {
    const ejerciciosToInsert = sesion.ejercicios.map(ej => ({
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

    if (!ejerciciosError) {
      console.log(`      ✅ ${ejerciciosToInsert.length} ejercicios`)
    }
  }
}

if (sesionesCreadas.length === 0) {
  console.log('\n⚠️  Sesiones ya existían')
  process.exit(0)
}

console.log(`\n📊 Generando tracking para ${sesionesCreadas.length} sesiones de Legs...`)

const { data: semanas } = await supabase
  .from('semanas')
  .select('*')
  .eq('user_id', userId)
  .order('fecha_inicio', { ascending: true })

let trackingCount = 0

for (const semana of semanas) {
  const sesionLegs = sesionesCreadas[Math.floor(Math.random() * sesionesCreadas.length)]

  const { data: ejerciciosData } = await supabase
    .from('ejercicios')
    .select('id, nombre, series')
    .eq('sesion_id', sesionLegs.id)

  if (!ejerciciosData) continue

  for (const ej of ejerciciosData) {
    const pesoBase = getPesoBase(ej.nombre)
    const peso = pesoBase + (semana.semana_numero - 1) * 2.5

    for (let serie = 1; serie <= ej.series; serie++) {
      const reps = getRepsBase(ej.nombre) + Math.floor(Math.random() * 3)

      const { error } = await supabase
        .from('tracking')
        .insert({
          user_id: userId,
          ejercicio_id: ej.id,
          semana_id: semana.id,
          numero_serie: serie,
          peso: Number(peso.toFixed(1)),
          reps: reps
        })

      if (!error) trackingCount++
    }
  }
}

console.log(`✅ ${trackingCount} registros de tracking creados`)
console.log('\n🎉 Completado')

function getPesoBase(nombre) {
  const n = nombre.toLowerCase()
  if (n.includes('sentadilla') && n.includes('barra')) return 80 + Math.random() * 20
  if (n.includes('peso muerto')) return 70 + Math.random() * 20
  if (n.includes('prensa')) return 120 + Math.random() * 30
  if (n.includes('búlgara') || n.includes('mancuernas')) return 20 + Math.random() * 15
  if (n.includes('hip thrust')) return 60 + Math.random() * 20
  if (n.includes('curl') || n.includes('extensiones')) return 30 + Math.random() * 15
  if (n.includes('gemelos')) return 40 + Math.random() * 20
  return 30 + Math.random() * 10
}

function getRepsBase(nombre) {
  const n = nombre.toLowerCase()
  if ((n.includes('sentadilla') && n.includes('barra')) || (n.includes('peso muerto') && !n.includes('mancuernas'))) {
    return 6 + Math.floor(Math.random() * 3)
  }
  if (n.includes('prensa') || n.includes('búlgara') || n.includes('hip thrust')) {
    return 8 + Math.floor(Math.random() * 3)
  }
  if (n.includes('curl') || n.includes('extensiones')) {
    return 12 + Math.floor(Math.random() * 4)
  }
  if (n.includes('gemelos')) {
    return 15 + Math.floor(Math.random() * 6)
  }
  return 10 + Math.floor(Math.random() * 3)
}

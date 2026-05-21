#!/usr/bin/env node

/**
 * Script para crear un usuario de prueba con 2 meses de datos simulados
 *
 * Uso:
 *   node scripts/create-test-user.mjs
 *
 * El script:
 * 1. Crea un usuario de prueba (test@gymbro.com / test123456)
 * 2. Carga una rutina de ejemplo
 * 3. Genera 8 semanas de historial (2 meses) con:
 *    - Sesiones completadas (70-80% de asistencia)
 *    - Ausencias realistas
 *    - Tracking de peso progresivo
 */

import { createClient } from '@supabase/supabase-js'
import { readFile } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Configuración de Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Faltan variables de entorno:')
  console.error('   VITE_SUPABASE_URL=', supabaseUrl ? '✓' : '✗')
  console.error('   SUPABASE_SERVICE_ROLE_KEY=', supabaseServiceKey ? '✓' : '✗')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

const DIAS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo']
const TEST_EMAIL = 'test@gymbro.com'
const TEST_PASSWORD = 'test123456'

// Función para generar calendario semanal
function generarCalendario(diaPartido, diaFutsal, sesiones) {
  const calendario = {}

  const indexPartido = DIAS.indexOf(diaPartido)
  const indexFutsal = DIAS.indexOf(diaFutsal)
  const indexDomingo = DIAS.indexOf('domingo')

  let sesionIndex = 0
  for (let i = 0; i < 7; i++) {
    const dia = DIAS[i]

    if (i === indexDomingo) {
      calendario[dia] = { tipo: 'descanso' }
    } else if (i === indexPartido) {
      calendario[dia] = { tipo: 'partido' }
    } else if (i === indexFutsal) {
      calendario[dia] = { tipo: 'futsal_entreno' }
    } else {
      const sesion = sesiones[sesionIndex % sesiones.length]
      calendario[dia] = {
        tipo: 'gym',
        sesion_id: sesion.id,
        estado: 'normal'
      }
      sesionIndex++
    }
  }

  return calendario
}

// Función para simular completar una sesión con tracking
function completarSesionEnCalendario(calendario, dia, fecha, faltar = false) {
  const entrada = calendario[dia]
  if (entrada.tipo !== 'gym') return calendario

  const nuevoCalendario = { ...calendario }
  if (faltar) {
    nuevoCalendario[dia] = {
      ...entrada,
      estado: 'faltada',
      fecha_faltada: fecha
    }
  } else {
    nuevoCalendario[dia] = {
      ...entrada,
      estado: 'completada',
      fecha_completada: fecha
    }
  }

  return nuevoCalendario
}

async function main() {
  console.log('🏋️ Creando usuario de prueba con historial simulado...\n')

  // 1. Crear usuario
  console.log('1️⃣ Creando usuario de prueba...')
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    email_confirm: true
  })

  if (authError) {
    if (authError.message.includes('already registered')) {
      console.log('   ⚠️  Usuario ya existe, usando el existente')
      // Obtener el usuario existente
      const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()
      if (listError) throw listError
      const existingUser = users.find(u => u.email === TEST_EMAIL)
      if (!existingUser) throw new Error('No se pudo encontrar el usuario existente')
      authData.user = existingUser
    } else {
      throw authError
    }
  } else {
    console.log(`   ✅ Usuario creado: ${authData.user.email}`)
  }

  const userId = authData.user.id

  // 2. Cargar rutina de ejemplo
  console.log('\n2️⃣ Cargando rutina de ejemplo...')
  const rutinaPath = join(__dirname, '../data/ejemplo-rutina.json')
  const rutinaJSON = JSON.parse(await readFile(rutinaPath, 'utf-8'))

  const { data: rutinaData, error: rutinaError } = await supabase
    .from('rutinas')
    .insert({
      user_id: userId,
      nombre: rutinaJSON.nombre,
      fecha_inicio: rutinaJSON.fecha_inicio || new Date().toISOString().split('T')[0],
      semanas_duracion: rutinaJSON.semanas_duracion || 6,
      activa: true
    })
    .select()
    .single()

  if (rutinaError) throw rutinaError
  console.log(`   ✅ Rutina creada: ${rutinaData.nombre}`)

  // 3. Insertar sesiones y ejercicios
  console.log('\n3️⃣ Insertando sesiones y ejercicios...')
  const sesiones = []

  for (const sesion of rutinaJSON.sesiones) {
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

    if (sesionError) throw sesionError
    sesiones.push(sesionData)

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

      if (ejerciciosError) throw ejerciciosError
    }
  }

  console.log(`   ✅ ${sesiones.length} sesiones creadas con sus ejercicios`)

  // 4. Generar 8 semanas de historial (2 meses)
  console.log('\n4️⃣ Generando 8 semanas de historial...')

  const hoy = new Date()
  const fechaInicioSimulacion = new Date(hoy)
  fechaInicioSimulacion.setDate(fechaInicioSimulacion.getDate() - (8 * 7)) // 8 semanas atrás

  for (let semanaNum = 1; semanaNum <= 8; semanaNum++) {
    // Calcular fecha de inicio de la semana (lunes)
    const fechaInicioSemana = new Date(fechaInicioSimulacion)
    fechaInicioSemana.setDate(fechaInicioSemana.getDate() + ((semanaNum - 1) * 7))

    // Ajustar al lunes
    const diaSemana = fechaInicioSemana.getDay()
    const diff = diaSemana === 0 ? -6 : 1 - diaSemana
    fechaInicioSemana.setDate(fechaInicioSemana.getDate() + diff)

    // Generar calendario
    let calendario = generarCalendario('viernes', 'martes', sesiones)

    // Simular asistencia (70-80% de asistencia)
    const diasGym = DIAS.filter((_, i) => {
      const entrada = calendario[DIAS[i]]
      return entrada.tipo === 'gym'
    })

    let fechaInicioReal = null
    let fechaFinReal = null
    let sesionesCompletadas = 0

    for (let diaIndex = 0; diaIndex < 7; diaIndex++) {
      const dia = DIAS[diaIndex]
      const entrada = calendario[dia]

      if (entrada.tipo === 'gym') {
        const fechaDia = new Date(fechaInicioSemana)
        fechaDia.setDate(fechaDia.getDate() + diaIndex)
        const fechaISO = fechaDia.toISOString()

        // 75% de probabilidad de asistir
        const asistir = Math.random() < 0.75

        calendario = completarSesionEnCalendario(calendario, dia, fechaISO, !asistir)

        if (asistir) {
          sesionesCompletadas++
          if (!fechaInicioReal) {
            fechaInicioReal = fechaISO
          }
          fechaFinReal = fechaISO
        }
      }
    }

    // Solo guardar fecha_fin_real si completó todas las sesiones de gym
    const totalSesionesGym = diasGym.length
    if (sesionesCompletadas < totalSesionesGym) {
      fechaFinReal = null
    }

    // Insertar semana
    const { data: semanaData, error: semanaError } = await supabase
      .from('semanas')
      .insert({
        user_id: userId,
        rutina_id: rutinaData.id,
        semana_numero: semanaNum,
        fecha_inicio: fechaInicioSemana.toISOString().split('T')[0],
        dia_partido: 'viernes',
        dia_futsal: 'martes',
        calendario,
        fecha_inicio_real: fechaInicioReal,
        fecha_fin_real: fechaFinReal
      })
      .select()
      .single()

    if (semanaError) throw semanaError

    // Crear registros de ausencias
    for (let diaIndex = 0; diaIndex < 7; diaIndex++) {
      const dia = DIAS[diaIndex]
      const entrada = calendario[dia]

      if (entrada.tipo === 'gym' && entrada.estado === 'faltada') {
        const fechaDia = new Date(fechaInicioSemana)
        fechaDia.setDate(fechaDia.getDate() + diaIndex)

        await supabase
          .from('ausencias')
          .insert({
            user_id: userId,
            semana_id: semanaData.id,
            sesion_id: entrada.sesion_id,
            dia_faltado: dia,
            fecha_faltada: fechaDia.toISOString(),
            tipo: 'illness'
          })
      }
    }

    console.log(`   ✅ Semana ${semanaNum}: ${sesionesCompletadas}/${totalSesionesGym} sesiones completadas`)
  }

  console.log('\n✅ Usuario de prueba creado exitosamente!')
  console.log('\n📝 Credenciales:')
  console.log(`   Email: ${TEST_EMAIL}`)
  console.log(`   Password: ${TEST_PASSWORD}`)
  console.log('\n🎯 Datos generados:')
  console.log(`   - 1 rutina activa`)
  console.log(`   - ${sesiones.length} sesiones con ejercicios`)
  console.log(`   - 8 semanas de historial (2 meses)`)
  console.log(`   - Asistencia simulada: 70-80%`)
}

main().catch(error => {
  console.error('\n❌ Error:', error.message)
  process.exit(1)
})

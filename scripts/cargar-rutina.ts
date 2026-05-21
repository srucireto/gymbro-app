import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

// Configuración de Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

interface EjercicioJSON {
  nombre: string
  grupo_muscular: string
  series: number
  reps_target: string
  rir_target: string
  notas?: string
  youtube_search?: string
  orden: number
}

interface SesionJSON {
  nombre: string
  tipo: 'push' | 'pull'
  intensidad: 'pesada' | 'liviana'
  buffer_minimo_horas: number
  es_post_partido: boolean
  orden: number
  ejercicios: EjercicioJSON[]
}

interface RutinaJSON {
  nombre: string
  semanas_duracion: number
  activa: boolean
  sesiones: SesionJSON[]
}

async function cargarRutina(archivoJSON: string, userId: string) {
  try {
    // Leer archivo JSON
    const rutaCompleta = path.resolve(archivoJSON)
    const contenido = fs.readFileSync(rutaCompleta, 'utf-8')
    const rutinaData: RutinaJSON = JSON.parse(contenido)

    console.log(`📋 Cargando rutina: ${rutinaData.nombre}`)
    console.log(`   Duración: ${rutinaData.semanas_duracion} semanas`)
    console.log(`   Sesiones: ${rutinaData.sesiones.length}`)

    // 1. Crear la rutina
    const { data: rutina, error: errorRutina } = await supabase
      .from('rutinas')
      .insert({
        user_id: userId,
        nombre: rutinaData.nombre,
        fecha_inicio: new Date().toISOString().split('T')[0],
        semanas_duracion: rutinaData.semanas_duracion,
        activa: rutinaData.activa
      })
      .select()
      .single()

    if (errorRutina) {
      throw new Error(`Error creando rutina: ${errorRutina.message}`)
    }

    console.log(`✅ Rutina creada con ID: ${rutina.id}`)

    // 2. Crear sesiones y ejercicios
    for (const sesionData of rutinaData.sesiones) {
      console.log(`\n📦 Creando sesión: ${sesionData.nombre}`)

      const { data: sesion, error: errorSesion } = await supabase
        .from('sesiones')
        .insert({
          rutina_id: rutina.id,
          nombre: sesionData.nombre,
          tipo: sesionData.tipo,
          intensidad: sesionData.intensidad,
          buffer_minimo_horas: sesionData.buffer_minimo_horas,
          es_post_partido: sesionData.es_post_partido,
          orden: sesionData.orden
        })
        .select()
        .single()

      if (errorSesion) {
        throw new Error(`Error creando sesión ${sesionData.nombre}: ${errorSesion.message}`)
      }

      console.log(`   ✅ Sesión creada con ID: ${sesion.id}`)

      // 3. Crear ejercicios de la sesión
      const ejercicios = sesionData.ejercicios.map(ej => ({
        sesion_id: sesion.id,
        nombre: ej.nombre,
        grupo_muscular: ej.grupo_muscular,
        series: ej.series,
        reps_target: ej.reps_target,
        rir_target: ej.rir_target,
        notas: ej.notas || null,
        youtube_search: ej.youtube_search || null,
        orden: ej.orden
      }))

      const { error: errorEjercicios } = await supabase
        .from('ejercicios')
        .insert(ejercicios)

      if (errorEjercicios) {
        throw new Error(`Error creando ejercicios: ${errorEjercicios.message}`)
      }

      console.log(`   ✅ ${ejercicios.length} ejercicios creados`)
    }

    console.log(`\n🎉 Rutina cargada exitosamente!`)
    console.log(`   ID: ${rutina.id}`)
    console.log(`   Nombre: ${rutina.nombre}`)
    console.log(`   Sesiones: ${rutinaData.sesiones.length}`)
    console.log(`   Ejercicios totales: ${rutinaData.sesiones.reduce((sum, s) => sum + s.ejercicios.length, 0)}`)

    return rutina.id

  } catch (error) {
    console.error('❌ Error:', error)
    throw error
  }
}

// Uso del script
const args = process.argv.slice(2)

if (args.length < 2) {
  console.error(`
❌ Uso incorrecto

Uso:
  npm run cargar-rutina <archivo.json> <user_id>

Ejemplo:
  npm run cargar-rutina rutina-ppl.json abc123-def456-ghi789

Donde:
  - archivo.json: Ruta al archivo JSON de la rutina
  - user_id: ID del usuario en Supabase
  `)
  process.exit(1)
}

const [archivoJSON, userId] = args

cargarRutina(archivoJSON, userId)
  .then(rutinaId => {
    console.log(`\n✅ Rutina ${rutinaId} lista para usar`)
    process.exit(0)
  })
  .catch(error => {
    console.error('\n❌ Error fatal:', error.message)
    process.exit(1)
  })

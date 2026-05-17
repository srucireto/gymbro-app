import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import fs from 'fs'

config({ path: '.env.local' })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables de entorno no encontradas en .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function cargarRutina() {
  try {
    console.log('📖 Leyendo mesociclo1.json...')
    const data = JSON.parse(fs.readFileSync('mesociclo1.json', 'utf8'))

    console.log('🔄 Insertando rutina...')
    const { data: rutina, error: rutinaError } = await supabase
      .from('rutinas')
      .insert({
        nombre: data.nombre,
        fecha_inicio: data.fecha_inicio,
        semanas_duracion: data.semanas_duracion,
        activa: true
      })
      .select()
      .single()

    if (rutinaError) throw rutinaError
    console.log(`✅ Rutina creada: ${rutina.nombre} (ID: ${rutina.id})`)

    const sesionesMap = {}

    console.log('🔄 Insertando sesiones...')
    for (const sesion of data.sesiones) {
      const { data: sesionData, error: sesionError } = await supabase
        .from('sesiones')
        .insert({
          rutina_id: rutina.id,
          nombre: sesion.nombre,
          tipo: sesion.tipo,
          intensidad: sesion.intensidad,
          buffer_minimo_horas: sesion.buffer_minimo_horas,
          es_post_partido: sesion.es_post_partido,
          orden: sesion.orden
        })
        .select()
        .single()

      if (sesionError) throw sesionError
      
      sesionesMap[sesion.nombre] = sesionData
      console.log(`  ✓ ${sesion.nombre} (ID: ${sesionData.id})`)

      // Insertar ejercicios de esta sesión
      if (sesion.ejercicios && sesion.ejercicios.length > 0) {
        const ejercicios = sesion.ejercicios.map(ej => ({
          sesion_id: sesionData.id,
          nombre: ej.nombre,
          grupo_muscular: ej.grupo_muscular,
          series: ej.series,
          reps_target: ej.reps_target,
          rir_target: ej.rir_target,
          notas: ej.notas || null,
          nota_ajuste: ej.nota_ajuste || null,
          youtube_search: ej.youtube_search || null,
          orden: ej.orden
        }))

        const { error: ejerciciosError } = await supabase
          .from('ejercicios')
          .insert(ejercicios)

        if (ejerciciosError) throw ejerciciosError
        console.log(`    → ${ejercicios.length} ejercicios insertados`)
      }
    }

    // Actualizar Pull A con version_liviana_id apuntando a Pull B
    console.log('🔄 Configurando version_liviana_id...')
    const { error: updateError } = await supabase
      .from('sesiones')
      .update({ version_liviana_id: sesionesMap['Pull B'].id })
      .eq('id', sesionesMap['Pull A'].id)

    if (updateError) throw updateError
    console.log('  ✓ Pull A configurado con versión liviana (Pull B)')

    console.log('\n🎉 ¡Rutina cargada exitosamente!')
    console.log(`\n📱 Recarga la app (http://localhost:5173) y deberías ver "${rutina.nombre}" activa`)
  } catch (error) {
    console.error('\n❌ Error:', error.message)
    if (error.details) console.error('Detalles:', error.details)
    if (error.hint) console.error('Sugerencia:', error.hint)
    process.exit(1)
  }
}

cargarRutina()

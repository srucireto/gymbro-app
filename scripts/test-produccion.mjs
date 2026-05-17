import { createClient } from '@supabase/supabase-js'

// Usar exactamente las mismas variables que producción
const supabaseUrl = 'https://ugobviybuiuakpeuvspj.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVnb2J2aXlidWl1YWtwZXV2c3BqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwNDk1OTIsImV4cCI6MjA5NDYyNTU5Mn0.EmfheDNwstgNgi_EVG3JAm-OvrY7uLjkIP2tGQ0nmqs'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testProduccion() {
  console.log('🔍 Simulando lo que hace la app en producción...\n')

  try {
    // Exactamente la misma query que useRutinaActiva
    console.log('📡 Consultando rutina activa...')
    const { data: rutinaData, error: rutinaError } = await supabase
      .from('rutinas')
      .select('*')
      .eq('activa', true)
      .single()

    if (rutinaError) {
      console.error('❌ Error al obtener rutina:', rutinaError)
      console.error('   Código:', rutinaError.code)
      console.error('   Mensaje:', rutinaError.message)
      console.error('   Detalles:', rutinaError.details)
      return
    }

    console.log('✅ Rutina encontrada:', rutinaData.nombre)
    console.log('   ID:', rutinaData.id)
    console.log('   Activa:', rutinaData.activa)

    // Consultar sesiones
    console.log('\n📡 Consultando sesiones...')
    const { data: sesionesData, error: sesionesError } = await supabase
      .from('sesiones')
      .select('*')
      .eq('rutina_id', rutinaData.id)
      .order('orden')

    if (sesionesError) {
      console.error('❌ Error al obtener sesiones:', sesionesError)
      return
    }

    console.log(`✅ Sesiones encontradas: ${sesionesData.length}`)
    sesionesData.forEach(s => {
      console.log(`   - ${s.nombre} (orden: ${s.orden})`)
    })

    console.log('\n✅ TODO FUNCIONA CORRECTAMENTE')

  } catch (error) {
    console.error('❌ Error inesperado:', error)
  }
}

testProduccion()

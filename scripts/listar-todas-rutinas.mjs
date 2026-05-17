import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.local' })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function listarTodas() {
  console.log('📋 Listando TODAS las rutinas en la base de datos...\n')

  const { data: rutinas, error } = await supabase
    .from('rutinas')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('❌ Error:', error)
    return
  }

  console.log(`Total de rutinas: ${rutinas.length}\n`)

  for (const rutina of rutinas) {
    console.log(`${rutina.activa ? '✅ ACTIVA' : '⚪ Inactiva'} - ${rutina.nombre}`)
    console.log(`   ID: ${rutina.id}`)
    console.log(`   Creada: ${new Date(rutina.created_at).toLocaleString()}`)
    console.log(`   Semanas: ${rutina.semanas_duracion}`)
    console.log('')
  }
}

listarTodas()

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function buscarSetsHuerfanos() {
  console.log('🔍 Buscando sets completados en toda la base de datos\n')

  // Buscar TODOS los sets sin filtrar
  const { data: todosSets, error } = await supabase
    .from('tracking')
    .select(`
      *,
      ejercicios(
        nombre,
        sesiones(
          nombre,
          rutinas(nombre, user_id)
        )
      )
    `)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    console.error('❌ Error:', error)
    return
  }

  if (!todosSets || todosSets.length === 0) {
    console.log('❌ No hay ningún set completado en toda la base de datos')
    return
  }

  console.log(`📋 Total de sets encontrados: ${todosSets.length}\n`)

  // Agrupar por rutina
  const setsPorRutina: Record<string, any[]> = {}

  todosSets.forEach(set => {
    const rutinaNombre = set.ejercicios?.sesiones?.rutinas?.nombre || 'Sin rutina'
    const rutinaUserId = set.ejercicios?.sesiones?.rutinas?.user_id || 'null'
    const key = `${rutinaNombre} (${rutinaUserId.substring(0, 8)}...)`

    if (!setsPorRutina[key]) setsPorRutina[key] = []
    setsPorRutina[key].push(set)
  })

  console.log('Sets por rutina:')
  Object.entries(setsPorRutina).forEach(([rutina, sets]) => {
    console.log(`\n  📦 ${rutina}`)
    console.log(`     Total sets: ${sets.length}`)

    // Mostrar algunos detalles
    const primeros3 = sets.slice(0, 3)
    primeros3.forEach((set: any) => {
      console.log(`     - ${set.ejercicios?.nombre || 'Ejercicio'}: ${set.peso}kg x ${set.reps} reps`)
      console.log(`       Sesión: ${set.ejercicios?.sesiones?.nombre || 'Desconocida'}`)
    })

    if (sets.length > 3) {
      console.log(`     ... y ${sets.length - 3} más`)
    }
  })

  // Verificar si alguno pertenece a Mesociclo 1
  const setsMesociclo = todosSets.filter(set =>
    set.ejercicios?.sesiones?.rutinas?.nombre?.toLowerCase().includes('mesociclo')
  )

  console.log(`\n🎯 Sets de Mesociclo 1: ${setsMesociclo.length}`)

  if (setsMesociclo.length > 0) {
    console.log('\nDetalles:')
    setsMesociclo.forEach(set => {
      console.log(`  - ${set.ejercicios?.nombre}: ${set.peso}kg x ${set.reps}`)
      console.log(`    User ID de la rutina: ${set.ejercicios?.sesiones?.rutinas?.user_id}`)
      console.log(`    Fecha: ${new Date(set.created_at).toLocaleString('es-ES')}`)
    })
  }
}

buscarSetsHuerfanos()
  .then(() => {
    console.log('\n✅ Búsqueda completada')
    process.exit(0)
  })
  .catch(error => {
    console.error('\n❌ Error:', error)
    process.exit(1)
  })

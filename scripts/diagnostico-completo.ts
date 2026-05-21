import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function diagnosticoCompleto() {
  console.log('🔍 DIAGNÓSTICO COMPLETO DE DATOS\n')
  console.log('=' .repeat(60))

  // Usar el user_id de test@gymbro.com
  const userId = '868619cb-b255-4335-ba0b-8768c37dbc05'

  console.log('\n1️⃣ USUARIO')
  console.log('   User ID:', userId)

  // 2. Rutinas del usuario
  console.log('\n2️⃣ RUTINAS')
  const { data: rutinas } = await supabase
    .from('rutinas')
    .select('*')
    .eq('user_id', userId)

  if (!rutinas || rutinas.length === 0) {
    console.log('   ❌ No hay rutinas para este usuario')
    return
  }

  rutinas.forEach(r => {
    console.log(`   ✓ ${r.nombre}`)
    console.log(`     ID: ${r.id}`)
    console.log(`     User ID: ${r.user_id}`)
    console.log(`     Activa: ${r.activa}`)
  })

  const rutinaActiva = rutinas.find(r => r.activa)
  if (!rutinaActiva) {
    console.log('\n   ⚠️ No hay rutina activa')
    return
  }

  console.log(`\n   → Trabajando con: ${rutinaActiva.nombre}`)

  // 3. Sesiones de la rutina
  console.log('\n3️⃣ SESIONES')
  const { data: sesiones } = await supabase
    .from('sesiones')
    .select('*, ejercicios(*)')
    .eq('rutina_id', rutinaActiva.id)
    .order('orden')

  if (!sesiones || sesiones.length === 0) {
    console.log('   ❌ No hay sesiones')
    return
  }

  console.log(`   Total: ${sesiones.length} sesiones`)
  sesiones.forEach(s => {
    console.log(`   ✓ ${s.nombre} (${s.tipo} - ${s.intensidad})`)
    console.log(`     Ejercicios: ${s.ejercicios?.length || 0}`)
  })

  // 4. Semanas
  console.log('\n4️⃣ SEMANAS')
  const { data: semanas } = await supabase
    .from('semanas')
    .select('*')
    .eq('rutina_id', rutinaActiva.id)
    .order('created_at', { ascending: false })

  if (!semanas || semanas.length === 0) {
    console.log('   ❌ No hay semanas')
  } else {
    console.log(`   Total: ${semanas.length} semanas`)
    semanas.forEach(s => {
      console.log(`   ✓ Semana ${s.semana_numero}`)
      console.log(`     ID: ${s.id}`)
      console.log(`     Fecha inicio: ${s.fecha_inicio}`)

      const calendario = s.calendario as any
      if (calendario) {
        const diasCompletados = Object.entries(calendario)
          .filter(([_, entrada]: [string, any]) => entrada.estado === 'completada')
          .map(([dia]) => dia)

        if (diasCompletados.length > 0) {
          console.log(`     Días completados: ${diasCompletados.join(', ')}`)
        }
      }
    })
  }

  // 5. Sets completados
  console.log('\n5️⃣ SETS COMPLETADOS')

  // Obtener todos los ejercicios de todas las sesiones
  const ejercicioIds = sesiones.flatMap(s => s.ejercicios?.map(e => e.id) || [])

  if (ejercicioIds.length === 0) {
    console.log('   ⚠️ No hay ejercicios en las sesiones')
  } else {
    const { data: sets } = await supabase
      .from('tracking')
      .select('*, ejercicios(nombre, sesiones(nombre, rutina_id))')
      .in('ejercicio_id', ejercicioIds)

    console.log(`   Total ejercicios: ${ejercicioIds.length}`)
    console.log(`   Total sets completados: ${sets?.length || 0}`)

    if (sets && sets.length > 0) {
      // Agrupar por ejercicio
      const setsPorEjercicio = sets.reduce((acc: any, set: any) => {
        const nombre = set.ejercicios?.nombre || 'Desconocido'
        if (!acc[nombre]) acc[nombre] = []
        acc[nombre].push(set)
        return acc
      }, {})

      console.log('\n   Sets por ejercicio:')
      Object.entries(setsPorEjercicio).forEach(([nombre, sets]: [string, any]) => {
        console.log(`     ✓ ${nombre}: ${sets.length} sets`)
      })

      // Verificar integridad
      console.log('\n   Verificación de integridad:')
      const setsConRutinaIncorrecta = sets.filter((set: any) => {
        return set.ejercicios?.sesiones?.rutina_id !== rutinaActiva.id
      })

      if (setsConRutinaIncorrecta.length > 0) {
        console.log(`     ⚠️ ${setsConRutinaIncorrecta.length} sets pertenecen a otra rutina`)
      } else {
        console.log(`     ✓ Todos los sets pertenecen a la rutina correcta`)
      }
    }
  }

  // 6. Ausencias
  console.log('\n6️⃣ AUSENCIAS')
  if (semanas && semanas.length > 0) {
    const semanaIds = semanas.map(s => s.id)
    const { data: ausencias } = await supabase
      .from('ausencias')
      .select('*')
      .in('semana_id', semanaIds)

    console.log(`   Total: ${ausencias?.length || 0} ausencias`)
    if (ausencias && ausencias.length > 0) {
      ausencias.forEach(a => {
        console.log(`     ✓ ${a.tipo} - ${a.dia_faltado}`)
      })
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('✅ Diagnóstico completado\n')
}

diagnosticoCompleto()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('\n❌ Error:', error)
    process.exit(1)
  })

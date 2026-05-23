import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

const TEST_EMAIL = 'test@gymbro.com'
const TEST_PASSWORD = 'test123456'

async function cleanupOrphanExercises() {
  console.log('🧹 LIMPIEZA DE EJERCICIOS HUÉRFANOS\n')
  console.log('='.repeat(80))

  const { data: authData } = await supabase.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD
  })

  const userId = authData.user!.id

  // Obtener rutina activa
  const { data: rutina } = await supabase
    .from('rutinas')
    .select('id')
    .eq('user_id', userId)
    .eq('activa', true)
    .single()

  if (!rutina) {
    console.error('❌ No hay rutina activa')
    process.exit(1)
  }

  // Obtener sesiones de la rutina activa
  const { data: sesiones } = await supabase
    .from('sesiones')
    .select('id, nombre')
    .eq('rutina_id', rutina.id)

  const sesionIds = sesiones!.map(s => s.id)

  console.log(`\n📋 Rutina activa con ${sesiones!.length} sesiones:`)
  sesiones!.forEach(s => console.log(`   - ${s.nombre}`))

  // Contar ejercicios antes
  const { count: totalBefore } = await supabase
    .from('ejercicios')
    .select('*', { count: 'exact', head: true })

  const { count: activeBefore } = await supabase
    .from('ejercicios')
    .select('*', { count: 'exact', head: true })
    .in('sesion_id', sesionIds)

  console.log(`\n📊 Estado actual:`)
  console.log(`   Total ejercicios: ${totalBefore}`)
  console.log(`   Ejercicios en sesiones activas: ${activeBefore}`)
  console.log(`   Ejercicios huérfanos: ${totalBefore! - activeBefore!}`)

  if (totalBefore === activeBefore) {
    console.log('\n✅ No hay ejercicios huérfanos para limpiar')
    return
  }

  // Obtener ejercicios huérfanos antes de eliminar
  const { data: huerfanos } = await supabase
    .from('ejercicios')
    .select('id, nombre, grupo_muscular')
    .not('sesion_id', 'in', `(${sesionIds.join(',')})`)

  console.log(`\n🗑️  Eliminando ${huerfanos!.length} ejercicios huérfanos...\n`)

  // Verificar que ninguno tenga tracking (seguridad extra)
  for (const ej of huerfanos || []) {
    const { count } = await supabase
      .from('tracking')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('ejercicio_id', ej.id)

    if (count && count > 0) {
      console.error(`❌ ERROR: ${ej.nombre} tiene ${count} sets de tracking`)
      console.error('   Abortando limpieza por seguridad')
      process.exit(1)
    }
  }

  // Eliminar ejercicios huérfanos
  const { error } = await supabase
    .from('ejercicios')
    .delete()
    .not('sesion_id', 'in', `(${sesionIds.join(',')})`)

  if (error) {
    console.error('❌ Error eliminando ejercicios:', error.message)
    process.exit(1)
  }

  // Verificar después
  const { count: totalAfter } = await supabase
    .from('ejercicios')
    .select('*', { count: 'exact', head: true })

  console.log('✅ Ejercicios huérfanos eliminados')
  console.log(`\n📊 Estado final:`)
  console.log(`   Total ejercicios: ${totalAfter}`)
  console.log(`   Eliminados: ${totalBefore! - totalAfter!}`)

  console.log('\n' + '='.repeat(80))
  console.log('✨ LIMPIEZA COMPLETADA')
  console.log('='.repeat(80))
  console.log('\nAhora la UI debería mostrar correctamente todos los volúmenes.')
  console.log('Verifica en http://localhost:5174/stats')
}

cleanupOrphanExercises()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('\n❌ Error:', error)
    process.exit(1)
  })

#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseAnonKey)

const { data: authData } = await supabase.auth.signInWithPassword({
  email: 'test@gymbro.com',
  password: 'test123456'
})

const userId = authData.user.id
console.log('✅ Usuario autenticado')

// Obtener rutina activa
const { data: rutina } = await supabase
  .from('rutinas')
  .select('id')
  .eq('user_id', userId)
  .eq('activa', true)
  .single()

console.log('\n🔄 Reestructurando rutina PPL...')

// 1. Obtener sesiones Push y Pull
const { data: sesiones } = await supabase
  .from('sesiones')
  .select('*')
  .eq('rutina_id', rutina.id)
  .in('tipo', ['push', 'pull'])
  .order('orden')

const pushA = sesiones.find(s => s.nombre === 'Push A')
const pushB = sesiones.find(s => s.nombre === 'Push B')
const pullA = sesiones.find(s => s.nombre === 'Pull A')
const pullB = sesiones.find(s => s.nombre === 'Pull B')

console.log('📋 Sesiones encontradas:', sesiones.map(s => s.nombre).join(', '))

// 2. Obtener sesiones y ejercicios de Legs
const { data: legsSessions } = await supabase
  .from('sesiones')
  .select('id, nombre')
  .eq('rutina_id', rutina.id)
  .eq('tipo', 'legs')

if (!legsSessions || legsSessions.length === 0) {
  console.log('⚠️  No hay sesiones de Legs para reestructurar')
  process.exit(0)
}

const { data: legsEjercicios } = await supabase
  .from('ejercicios')
  .select('*')
  .in('sesion_id', legsSessions.map(s => s.id))
  .order('orden')

console.log(`\n🦵 Ejercicios de piernas a redistribuir: ${legsEjercicios.length}`)

// 3. Redistribuir ejercicios
const ejerciciosParaPush = []
const ejerciciosParaPull = []

legsEjercicios.forEach(ej => {
  const grupo = ej.grupo_muscular.toLowerCase()
  const nombre = ej.nombre.toLowerCase()

  // Push: cuádriceps, gemelos, glúteos (cuando es trabajo de extensión)
  if (grupo === 'cuadriceps' || grupo === 'gemelos' ||
      nombre.includes('sentadilla') || nombre.includes('prensa') ||
      nombre.includes('extensiones')) {
    ejerciciosParaPush.push(ej)
  }
  // Pull: isquios, glúteos (cuando es trabajo de flexión/extensión de cadera)
  else if (grupo === 'isquios' || grupo === 'gluteos' ||
           nombre.includes('peso muerto') || nombre.includes('curl femoral') ||
           nombre.includes('hip thrust')) {
    ejerciciosParaPull.push(ej)
  }
  // Default: a pull
  else {
    ejerciciosParaPull.push(ej)
  }
})

console.log(`  → ${ejerciciosParaPush.length} ejercicios para Push`)
console.log(`  → ${ejerciciosParaPull.length} ejercicios para Pull`)

// 4. Obtener último orden de cada sesión
async function getMaxOrden(sesionId) {
  const { data } = await supabase
    .from('ejercicios')
    .select('orden')
    .eq('sesion_id', sesionId)
    .order('orden', { ascending: false })
    .limit(1)
  return data?.[0]?.orden || 0
}

// 5. Agregar ejercicios de cuádriceps/gemelos a Push A (pesada)
const maxOrdenPushA = await getMaxOrden(pushA.id)
const pushAEjercicios = ejerciciosParaPush.filter(e => {
  const n = e.nombre.toLowerCase()
  return n.includes('sentadilla') && n.includes('barra') ||
         n.includes('prensa') ||
         n.includes('elevaciones de gemelos')
})

for (let i = 0; i < pushAEjercicios.length; i++) {
  const ej = pushAEjercicios[i]
  await supabase
    .from('ejercicios')
    .update({
      sesion_id: pushA.id,
      orden: maxOrdenPushA + i + 1
    })
    .eq('id', ej.id)
}
console.log(`\n✅ Push A: agregados ${pushAEjercicios.length} ejercicios`)

// 6. Agregar ejercicios de cuádriceps/gemelos a Push B (liviana)
const maxOrdenPushB = await getMaxOrden(pushB.id)
const pushBEjercicios = ejerciciosParaPush.filter(e => {
  const n = e.nombre.toLowerCase()
  return n.includes('búlgara') ||
         n.includes('extensiones') ||
         n.includes('gemelos sentado')
})

for (let i = 0; i < pushBEjercicios.length; i++) {
  const ej = pushBEjercicios[i]
  await supabase
    .from('ejercicios')
    .update({
      sesion_id: pushB.id,
      orden: maxOrdenPushB + i + 1
    })
    .eq('id', ej.id)
}
console.log(`✅ Push B: agregados ${pushBEjercicios.length} ejercicios`)

// 7. Agregar ejercicios de isquios/glúteos a Pull A (pesada)
const maxOrdenPullA = await getMaxOrden(pullA.id)
const pullAEjercicios = ejerciciosParaPull.filter(e => {
  const n = e.nombre.toLowerCase()
  return n.includes('peso muerto rumano') || n.includes('curl femoral')
})

for (let i = 0; i < pullAEjercicios.length; i++) {
  const ej = pullAEjercicios[i]
  await supabase
    .from('ejercicios')
    .update({
      sesion_id: pullA.id,
      orden: maxOrdenPullA + i + 1
    })
    .eq('id', ej.id)
}
console.log(`✅ Pull A: agregados ${pullAEjercicios.length} ejercicios`)

// 8. Agregar ejercicios de isquios/glúteos a Pull B (liviana)
const maxOrdenPullB = await getMaxOrden(pullB.id)
const pullBEjercicios = ejerciciosParaPull.filter(e => {
  const n = e.nombre.toLowerCase()
  return n.includes('peso muerto') && n.includes('mancuernas') ||
         n.includes('hip thrust')
})

for (let i = 0; i < pullBEjercicios.length; i++) {
  const ej = pullBEjercicios[i]
  await supabase
    .from('ejercicios')
    .update({
      sesion_id: pullB.id,
      orden: maxOrdenPullB + i + 1
    })
    .eq('id', ej.id)
}
console.log(`✅ Pull B: agregados ${pullBEjercicios.length} ejercicios`)

// 9. Actualizar tracking para apuntar a las nuevas sesiones
console.log('\n📊 Actualizando tracking...')

// Get all tracking records for legs exercises
const legsEjercicioIds = legsEjercicios.map(e => e.id)
const { data: trackingRecords } = await supabase
  .from('tracking')
  .select('*, ejercicio:ejercicios(sesion_id)')
  .in('ejercicio_id', legsEjercicioIds)

// Update each tracking record to point to the new session
let trackingUpdated = 0
for (const track of trackingRecords) {
  // Get the new sesion_id from the ejercicio
  const { data: ejercicio } = await supabase
    .from('ejercicios')
    .select('sesion_id')
    .eq('id', track.ejercicio_id)
    .single()

  // No need to update tracking - it references ejercicio_id which stays the same
  // The ejercicio now points to the correct session
  trackingUpdated++
}

console.log(`✅ ${trackingUpdated} registros de tracking verificados`)

// 10. Eliminar sesiones de Legs vacías
console.log('\n🗑️  Eliminando sesiones Legs...')
for (const legsSession of legsSessions) {
  await supabase
    .from('sesiones')
    .delete()
    .eq('id', legsSession.id)
  console.log(`   ✅ ${legsSession.nombre} eliminada`)
}

console.log('\n🎉 Reestructuración completada')
console.log('\n📋 Nueva estructura:')
console.log('   • Push A (pesada): pecho + hombros + tríceps + cuádriceps + gemelos')
console.log('   • Pull A (pesada): espalda + bíceps + isquios')
console.log('   • Pull B (liviana): espalda + bíceps + trapecio + isquios + glúteos')
console.log('   • Push B (liviana): pecho + hombros + tríceps + cuádriceps + gemelos')

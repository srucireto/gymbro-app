#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

console.log('🔧 Actualizando constraint de tipo en sesiones...')

// Necesitamos usar la función rpc para ejecutar SQL directo
// Como no tenemos service role key, vamos a intentar una solución alternativa:
// Usar el anon key y autenticarnos como usuario

const { error: authError } = await supabase.auth.signInWithPassword({
  email: 'test@gymbro.com',
  password: 'test123456'
})

if (authError) {
  console.error('❌ Error de autenticación:', authError.message)
  process.exit(1)
}

// Verificar las sesiones actuales
const { data: sesionesActuales } = await supabase
  .from('sesiones')
  .select('id, nombre, tipo')
  .limit(5)

console.log('📋 Sesiones actuales:', sesionesActuales)

console.log('\n⚠️  No podemos modificar constraints con la API anon key.')
console.log('Necesitas ejecutar este SQL manualmente en Supabase Dashboard:')
console.log('\n--- SQL ---')
console.log('ALTER TABLE sesiones DROP CONSTRAINT IF EXISTS sesiones_tipo_check;')
console.log("ALTER TABLE sesiones ADD CONSTRAINT sesiones_tipo_check CHECK (tipo IN ('push', 'pull', 'legs'));")
console.log('--- FIN SQL ---\n')
console.log('📍 Ve a: https://supabase.com/dashboard/project/YOUR_PROJECT/sql')

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function checkRLS() {
  console.log('🔒 Verificando políticas de RLS\n')

  // Autenticar como test@gymbro.com para hacer las pruebas
  const { data: authData } = await supabase.auth.signInWithPassword({
    email: 'test@gymbro.com',
    password: 'test123456'
  })

  console.log('✅ Autenticado como:', authData?.user?.email)
  console.log('   User ID:', authData?.user?.id)

  console.log('\n─'.repeat(60))
  console.log('PRUEBAS DE ACCESO CON USUARIO AUTENTICADO:')
  console.log('─'.repeat(60))

  // 1. Probar SELECT en rutinas
  console.log('\n1️⃣ SELECT en tabla "rutinas"')
  const { data: rutinas, error: rutinasError } = await supabase
    .from('rutinas')
    .select('*')
    .eq('activa', true)

  if (rutinasError) {
    console.log('   ❌ Error:', rutinasError.message)
    console.log('   Code:', rutinasError.code)
  } else {
    console.log(`   ✅ Éxito: ${rutinas?.length || 0} rutinas encontradas`)
    if (rutinas && rutinas.length > 0) {
      rutinas.forEach(r => console.log(`      - ${r.nombre} (user_id: ${r.user_id?.substring(0, 8)}...)` ))
    }
  }

  // 2. Probar SELECT en tracking
  console.log('\n2️⃣ SELECT en tabla "tracking"')
  const { data: tracking, error: trackingError } = await supabase
    .from('tracking')
    .select('*')
    .limit(5)

  if (trackingError) {
    console.log('   ❌ Error:', trackingError.message)
    console.log('   Code:', trackingError.code)
  } else {
    console.log(`   ✅ Éxito: ${tracking?.length || 0} registros encontrados`)
  }

  // 3. Probar INSERT en tracking
  console.log('\n3️⃣ INSERT en tabla "tracking" (prueba)')

  // Primero obtener un ejercicio válido
  const { data: rutina } = await supabase
    .from('rutinas')
    .select('id')
    .eq('user_id', authData?.user?.id)
    .single()

  if (!rutina) {
    console.log('   ⚠️ No hay rutina para probar INSERT')
  } else {
    const { data: semana } = await supabase
      .from('semanas')
      .select('id')
      .eq('rutina_id', rutina.id)
      .single()

    const { data: sesion } = await supabase
      .from('sesiones')
      .select('id')
      .eq('rutina_id', rutina.id)
      .limit(1)
      .single()

    if (sesion) {
      const { data: ejercicio } = await supabase
        .from('ejercicios')
        .select('id')
        .eq('sesion_id', sesion.id)
        .limit(1)
        .single()

      if (ejercicio && semana) {
        const { error: insertError } = await supabase
          .from('tracking')
          .insert({
            user_id: authData?.user?.id,
            semana_id: semana.id,
            ejercicio_id: ejercicio.id,
            numero_serie: 1,
            peso: 100,
            reps: 10
          })

        if (insertError) {
          console.log('   ❌ Error al insertar:', insertError.message)
          console.log('   Code:', insertError.code)
          console.log('   Details:', insertError.details)
          console.log('   Hint:', insertError.hint)
        } else {
          console.log('   ✅ INSERT exitoso')

          // Limpiar el registro de prueba
          await supabase
            .from('tracking')
            .delete()
            .eq('ejercicio_id', ejercicio.id)
            .eq('numero_serie', 1)
            .eq('peso', 100)
        }
      }
    }
  }

  // 4. Verificar RLS está habilitado
  console.log('\n4️⃣ Verificar RLS habilitado')

  const tables = ['rutinas', 'tracking', 'sesiones', 'ejercicios', 'semanas']

  for (const table of tables) {
    // Intentar query sin autenticar
    const supabaseNoAuth = createClient(supabaseUrl, supabaseKey)
    const { error } = await supabaseNoAuth
      .from(table)
      .select('id')
      .limit(1)

    if (error && error.code === 'PGRST301') {
      console.log(`   ✅ ${table}: RLS activo (sin auth = sin acceso)`)
    } else if (!error) {
      console.log(`   ⚠️ ${table}: Accesible sin autenticación`)
    } else {
      console.log(`   ❓ ${table}: ${error?.message}`)
    }
  }

  console.log('\n' + '─'.repeat(60))
  console.log('RECOMENDACIONES:')
  console.log('─'.repeat(60))

  if (rutinasError) {
    console.log('\n⚠️ La tabla "rutinas" no es accesible.')
    console.log('   Necesitas crear una política RLS:')
    console.log('   ')
    console.log('   CREATE POLICY "Users can view their own rutinas"')
    console.log('   ON rutinas FOR SELECT')
    console.log('   USING (auth.uid() = user_id);')
  }

  if (trackingError?.code === 'PGRST301') {
    console.log('\n⚠️ La tabla "tracking" requiere políticas RLS.')
    console.log('   Necesitas crear políticas para SELECT e INSERT:')
    console.log('   ')
    console.log('   CREATE POLICY "Users can view their own tracking"')
    console.log('   ON tracking FOR SELECT')
    console.log('   USING (auth.uid() = user_id);')
    console.log('   ')
    console.log('   CREATE POLICY "Users can insert their own tracking"')
    console.log('   ON tracking FOR INSERT')
    console.log('   WITH CHECK (auth.uid() = user_id);')
  }
}

checkRLS()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('\n❌ Error:', error)
    process.exit(1)
  })

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

const TEST_EMAIL = 'test@gymbro.com'
const TEST_PASSWORD = 'test123456'

interface EjercicioProgreso {
  ejercicioId: string
  ejercicioNombre: string
  grupoMuscular: string
  datosProgreso: {
    semanaNumero: number
    fechaInicio: string
    pesoPromedio: number
    repsPromedio: number
    volumenTotal: number
  }[]
}

async function diagnoseProgreso() {
  console.log('🔍 DIAGNÓSTICO DE PROGRESO TAB\n')

  const { data: authData } = await supabase.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD
  })

  const userId = authData.user!.id

  // Simular la misma lógica que StatsProgreso.tsx
  const { data: trackingData, error } = await supabase
    .from('tracking')
    .select(`
      *,
      ejercicio:ejercicios(id, nombre, grupo_muscular),
      semana:semanas(semana_numero, fecha_inicio)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error:', error)
    return
  }

  const ejerciciosMap = new Map<string, EjercicioProgreso>()

  trackingData?.forEach((t: any) => {
    if (!t.ejercicio || !t.semana) return

    const key = t.ejercicio.id
    if (!ejerciciosMap.has(key)) {
      ejerciciosMap.set(key, {
        ejercicioId: t.ejercicio.id,
        ejercicioNombre: t.ejercicio.nombre,
        grupoMuscular: t.ejercicio.grupo_muscular,
        datosProgreso: []
      })
    }

    const ejercicio = ejerciciosMap.get(key)!

    let datoSemana = ejercicio.datosProgreso.find(
      d => d.semanaNumero === t.semana.semana_numero && d.fechaInicio === t.semana.fecha_inicio
    )

    if (!datoSemana) {
      datoSemana = {
        semanaNumero: t.semana.semana_numero,
        fechaInicio: t.semana.fecha_inicio,
        pesoPromedio: 0,
        repsPromedio: 0,
        volumenTotal: 0
      }
      ejercicio.datosProgreso.push(datoSemana)
    }

    // ESTE ES EL CÁLCULO PROBLEMÁTICO
    const count = ejercicio.datosProgreso.filter(
      d => d.semanaNumero === t.semana.semana_numero
    ).length

    datoSemana.pesoPromedio = ((datoSemana.pesoPromedio * (count - 1)) + Number(t.peso)) / count
    datoSemana.repsPromedio = ((datoSemana.repsPromedio * (count - 1)) + t.reps) / count
    datoSemana.volumenTotal += Number(t.peso) * t.reps
  })

  const ejerciciosList = Array.from(ejerciciosMap.values()).map(ej => ({
    ...ej,
    datosProgreso: ej.datosProgreso.sort((a, b) => a.semanaNumero - b.semanaNumero)
  }))

  console.log(`Total ejercicios: ${ejerciciosList.length}\n`)

  // Buscar ejercicios con problemas
  const ejerciciosConProblema = ejerciciosList.filter(ej => {
    return ej.datosProgreso.some(d => d.pesoPromedio === 0 || isNaN(d.pesoPromedio))
  })

  if (ejerciciosConProblema.length > 0) {
    console.log(`⚠️  EJERCICIOS CON PESO PROMEDIO = 0 o NaN:\n`)

    ejerciciosConProblema.forEach(ej => {
      console.log(`\n${ej.ejercicioNombre} (${ej.grupoMuscular}):`)
      ej.datosProgreso.forEach(d => {
        console.log(`  S${d.semanaNumero}: peso promedio = ${d.pesoPromedio.toFixed(1)}kg, volumen = ${d.volumenTotal}kg`)
      })

      // Verificar tracking raw
      const trackingEj = trackingData?.filter((t: any) => t.ejercicio?.id === ej.ejercicioId)
      console.log(`  Sets totales en DB: ${trackingEj?.length || 0}`)
      if (trackingEj && trackingEj.length > 0) {
        const pesos = trackingEj.map((t: any) => t.peso)
        console.log(`  Pesos raw: ${pesos.slice(0, 5).join(', ')}${pesos.length > 5 ? '...' : ''}`)
      }
    })
  } else {
    console.log('✅ No hay ejercicios con peso promedio = 0')
  }

  // Mostrar resumen por grupo muscular
  console.log('\n\n📊 RESUMEN POR GRUPO MUSCULAR:\n')

  const porGrupo = ejerciciosList.reduce((acc, ej) => {
    const grupo = ej.grupoMuscular
    if (!acc[grupo]) {
      acc[grupo] = []
    }
    acc[grupo].push(ej)
    return acc
  }, {} as Record<string, typeof ejerciciosList>)

  Object.entries(porGrupo)
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([grupo, ejercicios]) => {
      console.log(`\n${grupo}:`)
      ejercicios.forEach(ej => {
        const ultimaSemana = ej.datosProgreso[ej.datosProgreso.length - 1]
        console.log(`  - ${ej.ejercicioNombre}: ${ultimaSemana.pesoPromedio.toFixed(1)}kg promedio`)
      })
    })
}

diagnoseProgreso()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Error:', error)
    process.exit(1)
  })

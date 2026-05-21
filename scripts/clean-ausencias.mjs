import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Default user ID
const userId = '00000000-0000-0000-0000-000000000000'

console.log(`🗑️  Deleting all ausencias for user: ${userId}`)

const { data, error } = await supabase
  .from('ausencias')
  .delete()
  .eq('user_id', userId)
  .select()

if (error) {
  console.error('❌ Error:', error)
  process.exit(1)
}

console.log(`✅ Deleted ${data?.length || 0} ausencias`)
console.log('Details:', data)

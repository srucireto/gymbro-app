#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

const { data, error } = await supabase.auth.signInWithPassword({
  email: 'test@gymbro.com',
  password: 'test123456'
})

if (error) {
  console.error('Error:', error.message)
  process.exit(1)
}

console.log(data.user.id)

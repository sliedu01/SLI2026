import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function checkSchema() {
  const { data, error } = await supabase.from('budget_managements').select('*').limit(1)
  if (error) {
    console.error(error)
  } else {
    console.log('Columns in budget_managements:', Object.keys(data[0] || {}))
  }
  
  const { data: catData } = await supabase.from('budget_categories').select('*').limit(1)
  console.log('Columns in budget_categories:', Object.keys(catData?.[0] || {}))
}

checkSchema()

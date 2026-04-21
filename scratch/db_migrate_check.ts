import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function migrate() {
  console.log('🔄 Attempting to add budget_amount to budget_managements...')
  
  // NOTE: Supabase client usually doesn't allow raw SQL unless an RPC is set up.
  // We'll try to insert a record with the new column to see if it even exists or if it fails.
  const { error } = await supabase.from('budget_managements').insert([{ 
    name: 'MIGRATION_TEST', 
    category_id: 'any', // should fail anyway but check error
    budget_amount: 0 
  }])
  
  if (error && error.message.includes('column "budget_amount" of relation "budget_managements" does not exist')) {
    console.error('❌ Column does not exist. Please run the following SQL in Supabase Dashboard:')
    console.log('ALTER TABLE budget_managements ADD COLUMN budget_amount NUMERIC DEFAULT 0;')
  } else if (error && error.code === '23503') { 
    // Foreign key violation, but if the error wasn't "column not found", then column MIGHT exist
    console.log('✅ Column budget_amount seems to exist (passed check).')
  } else if (!error) {
    console.log('✅ Column exists and test insert worked (cleaning up...)')
    await supabase.from('budget_managements').delete().eq('name', 'MIGRATION_TEST')
  } else {
    console.log('⚠️ Unexpected result:', error.message)
  }
}

migrate()

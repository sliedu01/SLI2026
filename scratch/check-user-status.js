
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// .env.local 로드
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase env variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function checkUser() {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .ilike('name', '%조정구%')

  if (error) {
    console.error('Error fetching user:', error)
    return
  }

  if (data && data.length > 0) {
    console.log('User found:', JSON.stringify(data, null, 2))
    
    // 권한 테이블도 확인
    const { data: perms, error: permErr } = await supabase
      .from('user_permissions')
      .select('*')
      .eq('user_id', data[0].id)
    
    if (permErr) {
      console.error('Error fetching perms:', permErr)
    } else {
      console.log('Permissions found:', JSON.stringify(perms, null, 2))
    }
  } else {
    console.log('User "조정구" not found in user_profiles')
  }
}

checkUser()

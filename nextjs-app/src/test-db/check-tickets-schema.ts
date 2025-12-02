
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function checkTicketsSchema() {
  // We can't directly query schema with supabase-js easily without admin rights or rpc
  // But we can try to select one ticket and see the keys
  
  const { data, error } = await supabase
    .from('tickets')
    .select('*')
    .limit(1)

  if (error) {
    console.error('Error fetching tickets:', error)
  } else {
    if (data && data.length > 0) {
      console.log('Ticket keys:', Object.keys(data[0]))
    } else {
      console.log('No tickets found to check schema.')
    }
  }
}

checkTicketsSchema()

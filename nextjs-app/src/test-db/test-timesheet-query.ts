
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testQuery() {
  console.log('Testing query...')
  
  // 1. Check if we can fetch clock_events
  const { data: events, error: eventsError } = await supabase
    .from('clock_events')
    .select('*')
    .limit(1)
    
  if (eventsError) {
    console.error('Error fetching clock_events:', eventsError)
  } else {
    console.log('Successfully fetched clock_events:', events.length)
  }

  // 2. Check the nested query
  const { data, error } = await supabase
    .from('clock_events')
    .select(`
      *,
      teams (name),
      clock_event_tickets (
        ticket_id,
        tickets (
          title,
          status
        )
      )
    `)
    .limit(5)

  if (error) {
    console.error('Error executing nested query:', error)
  } else {
    console.log('Successfully executed nested query. Rows:', data?.length)
    if (data && data.length > 0) {
        console.log('Sample row:', JSON.stringify(data[0], null, 2))
    }
  }
}

testQuery()

import { createClient } from '@/lib/supabase/server'
import TicketsList from '@/components/tickets/TicketsList'

export default async function TicketsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return <div>Please login</div>

  // Fetch user's teams to allow creating tickets
  const { data: teamMembers } = await supabase
    .from('team_members')
    .select('team_id, teams(id, name)')
    .eq('user_id', user.id)

  const teams = teamMembers?.map((tm: any) => tm.teams) || []

  // Fetch active clock event
  const { data: activeEvent } = await supabase
    .from('clock_events')
    .select('*')
    .eq('user_id', user.id)
    .is('end_timestamp', null)
    .single()

  let activeTicketId = null
  let activeTicketStartTime = null

  if (activeEvent) {
     const { data: activeTicket } = await supabase
       .from('clock_event_tickets')
       .select('ticket_id, start_timestamp')
       .eq('clock_event_id', activeEvent.id)
       .not('start_timestamp', 'is', null)
       .single()
     
     if (activeTicket) {
        activeTicketId = activeTicket.ticket_id
        activeTicketStartTime = activeTicket.start_timestamp
     }
  }

  // Fetch tickets visible to user (via RLS)
  const { data: tickets, error: ticketsError } = await supabase
    .from('tickets')
    .select('*, teams(name), profiles!created_by(full_name)')
    .order('created_at', { ascending: false })

  if (ticketsError) {
    console.error('Error fetching tickets:', ticketsError)
  } else {
    console.log('Fetched tickets:', tickets?.length)
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">My Tickets & Activities</h1>
      
      <TicketsList 
        tickets={tickets || []} 
        teams={teams} 
        activeEvent={activeEvent}
        activeTicketId={activeTicketId}
        activeTicketStartTime={activeTicketStartTime}
      />
    </div>
  )
}

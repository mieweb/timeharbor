
'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { startOfDay, endOfDay, parseISO } from 'date-fns'

export async function getTeamDashboardData(startDate: string, endDate: string) {
  const supabase = await createClient()
  const adminSupabase = createAdminClient()
  
  try {
    // 1. Verify User
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('Not authenticated')
    }

    // 2. Get Teams where user is Leader/Admin
    const { data: leaderTeams, error: teamError } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', user.id)
      .in('role', ['admin', 'leader'])

    if (teamError) throw new Error(teamError.message)
    
    if (!leaderTeams || leaderTeams.length === 0) {
      return { data: [], error: null } // Not a leader
    }

    const teamIds = leaderTeams.map(t => t.team_id)

    // 3. Get all members of these teams
    const { data: teamMembers, error: membersError } = await adminSupabase
      .from('team_members')
      .select('user_id, team_id')
      .in('team_id', teamIds)

    if (membersError) throw new Error(membersError.message)

    // Filter out the current user (admin/leader) from the dashboard view
    const memberIds = Array.from(new Set(teamMembers
      .map(m => m.user_id)
      .filter(id => id !== user.id)
    ))

    // 4. Fetch Clock Events for these members in range
    const start = startOfDay(parseISO(startDate)).toISOString()
    const end = endOfDay(parseISO(endDate)).toISOString()

    const { data: events, error: eventsError } = await adminSupabase
      .from('clock_events')
      .select(`
        *,
        clock_event_tickets (
          ticket_id,
          tickets (
            title,
            status
          )
        )
      `)
      .in('user_id', memberIds)
      .gte('start_timestamp', start)
      .lte('start_timestamp', end)
      .order('start_timestamp', { ascending: false })

    if (eventsError) throw new Error(eventsError.message)

    // 5. Fetch Profiles for Names
    const { data: profiles, error: profilesError } = await adminSupabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', memberIds)

    if (profilesError) throw new Error(profilesError.message)

    // 6. Fetch Emails (Optional, using Admin Auth)
    // We'll try to map IDs to Emails. 
    // Note: listUsers might not return all if > 50, need pagination if many users.
    // For now, assume reasonable team size.
    const { data: { users: authUsers }, error: authError } = await adminSupabase.auth.admin.listUsers({
        perPage: 1000
    })
    
    const emailMap = new Map()
    if (authUsers) {
        authUsers.forEach(u => emailMap.set(u.id, u.email))
    }

    // 7. Combine and Aggregate Data
    const profileMap = new Map(profiles?.map(p => [p.id, p]) || [])
    const aggregatedData = new Map<string, any>()

    // Sort events by start_timestamp ascending first to help with min/max logic if needed, 
    // though we can just compare.
    events.sort((a, b) => new Date(a.start_timestamp).getTime() - new Date(b.start_timestamp).getTime())

    events.forEach(event => {
      const date = new Date(event.start_timestamp)
      const dateStr = date.toISOString().split('T')[0] // YYYY-MM-DD
      const key = `${event.user_id}_${dateStr}`
      
      if (!aggregatedData.has(key)) {
        // Initialize
        const profile = profileMap.get(event.user_id)
        const email = emailMap.get(event.user_id)
        
        let displayName = profile?.full_name
        if (!displayName && email) {
            const namePart = email.split('@')[0]
            displayName = namePart
              .split(/[._-]/)
              .map((part: string) => part.charAt(0).toUpperCase() + part.slice(1))
              .join(' ')
        }

        aggregatedData.set(key, {
          id: key, // Use composite key as ID
          userId: event.user_id,
          date: event.start_timestamp, // Use the first event's timestamp as the date reference
          member: displayName || 'Unknown',
          email: email || 'N/A',
          hours: 0,
          clockIn: event.start_timestamp, // First event start
          clockOut: event.end_timestamp, // First event end (temp)
          status: 'Completed',
          tickets: new Set(),
          isActive: false
        })
      }
      
      const entry = aggregatedData.get(key)
      
      // Update Hours
      entry.hours += (event.accumulated_time || 0)
      
      // Update Clock In (Earliest)
      if (new Date(event.start_timestamp) < new Date(entry.clockIn)) {
          entry.clockIn = event.start_timestamp
      }
      
      // Update Clock Out (Latest)
      // Logic: If ANY event is active, the day is Active.
      // If the day is not active, Clock Out is the latest end_timestamp.
      if (!event.end_timestamp) {
          entry.isActive = true
          entry.status = 'Active'
          entry.clockOut = null
      } else if (!entry.isActive) {
          // Only update clockOut if we are not already marked as active
          // (If we are active, clockOut should remain null or reflect the active state)
          if (!entry.clockOut || new Date(event.end_timestamp) > new Date(entry.clockOut)) {
              entry.clockOut = event.end_timestamp
          }
      }
      
      // Aggregate Tickets
      const eventTickets = event.clock_event_tickets?.map((cet: any) => cet.tickets?.title).filter(Boolean) || []
      eventTickets.forEach((t: string) => entry.tickets.add(t))
    })

    const dashboardData = Array.from(aggregatedData.values()).map(item => ({
      ...item,
      tickets: Array.from(item.tickets).join(', ') || 'No tickets'
    }))

    // Sort by date desc
    dashboardData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    return { data: dashboardData, error: null }

  } catch (error: any) {
    console.error('Error in getTeamDashboardData:', error)
    return { data: null, error: error.message }
  }
}

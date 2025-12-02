
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

    const memberIds = Array.from(new Set(teamMembers.map(m => m.user_id)))

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

    // 7. Combine Data
    const profileMap = new Map(profiles?.map(p => [p.id, p]) || [])

    const dashboardData = events.map(event => {
      const profile = profileMap.get(event.user_id)
      const email = emailMap.get(event.user_id)
      
      // Extract tickets
      const tickets = event.clock_event_tickets?.map((cet: any) => cet.tickets).filter(Boolean) || []
      const ticketTitles = tickets.map((t: any) => t.title).join(', ') || 'No tickets'

      // Fallback for name: Profile Name -> Email Name -> Email -> 'Unknown'
      let displayName = profile?.full_name
      if (!displayName && email) {
          // Try to make a name from email (e.g. john.doe@gmail.com -> John Doe)
          const namePart = email.split('@')[0]
          displayName = namePart
            .split(/[._-]/)
            .map((part: string) => part.charAt(0).toUpperCase() + part.slice(1))
            .join(' ')
      }

      return {
        id: event.id,
        date: event.start_timestamp,
        member: displayName || 'Unknown',
        email: email || 'N/A',
        hours: event.accumulated_time || 0, // This is in seconds usually? Or minutes? Schema said integer. Usually seconds.
        clockIn: event.start_timestamp,
        clockOut: event.end_timestamp,
        status: event.end_timestamp ? 'Completed' : 'Active',
        tickets: ticketTitles,
        isActive: !event.end_timestamp
      }
    })

    return { data: dashboardData, error: null }

  } catch (error: any) {
    console.error('Error in getTeamDashboardData:', error)
    return { data: null, error: error.message }
  }
}

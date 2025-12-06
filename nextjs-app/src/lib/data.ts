import { createClient, createServiceClient } from '@/lib/supabase/server'
import { startOfDay, startOfWeek, endOfDay, endOfWeek } from 'date-fns'

export async function getDashboardStats() {
  const supabase = await createClient()
  const serviceSupabase = createServiceClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const now = new Date()
  const todayStart = startOfDay(now).toISOString()
  const todayEnd = endOfDay(now).toISOString()
  const weekStart = startOfWeek(now, { weekStartsOn: 1 }).toISOString() // Monday start
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 }).toISOString()

  // Today's Hours
  const { data: todayEvents } = await supabase
    .from('clock_events')
    .select('accumulated_time, start_timestamp, end_timestamp')
    .eq('user_id', user.id)
    .gte('start_timestamp', todayStart)
    .lte('start_timestamp', todayEnd)

  let todaySeconds = 0
  todayEvents?.forEach(e => {
    todaySeconds += (e.accumulated_time || 0)
    if (!e.end_timestamp && e.start_timestamp) {
      const start = new Date(e.start_timestamp).getTime()
      todaySeconds += Math.floor((now.getTime() - start) / 1000)
    }
  })

  // Week's Hours
  const { data: weekEvents } = await supabase
    .from('clock_events')
    .select('accumulated_time, start_timestamp, end_timestamp')
    .eq('user_id', user.id)
    .gte('start_timestamp', weekStart)
    .lte('start_timestamp', weekEnd)

  let weekSeconds = 0
  weekEvents?.forEach(e => {
    weekSeconds += (e.accumulated_time || 0)
    if (!e.end_timestamp && e.start_timestamp) {
      const start = new Date(e.start_timestamp).getTime()
      weekSeconds += Math.floor((now.getTime() - start) / 1000)
    }
  })

  // Active Sessions
  const { count: activeSessionsCount } = await supabase
    .from('clock_events')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .is('end_timestamp', null)

  // Get active event
  const { data: activeEvent } = await supabase
    .from('clock_events')
    .select('*')
    .eq('user_id', user.id)
    .is('end_timestamp', null)
    .single()

  // Active Teams (Total Projects/Teams user is part of)
  const { count: totalTeams } = await supabase
    .from('team_members')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)

  // User's teams
  const { data: userTeams } = await supabase
    .from('team_members')
    .select('team_id')
    .eq('user_id', user.id)

  // Recent Activity
  const { data: recentActivity } = await supabase
    .from('clock_events')
    .select(`
      *,
      teams (name)
    `)
    .eq('user_id', user.id)
    .order('start_timestamp', { ascending: false })
    .limit(10)

  // Check if user is a leader or admin of any team AND that team has other members
  const { data: leaderTeams } = await supabase
    .from('team_members')
    .select('team_id')
    .eq('user_id', user.id)
    .in('role', ['leader', 'admin'])

  let isTeamLeaderWithMembers = false
  let leaderTeamsCount = 0
  
  if (leaderTeams && leaderTeams.length > 0) {
      leaderTeamsCount = leaderTeams.length
      const teamIds = leaderTeams.map(t => t.team_id)
      
      // Check if any of these teams have members OTHER than the current user
      const { count: otherMembersCount } = await supabase
        .from('team_members')
        .select('*', { count: 'exact', head: true })
        .in('team_id', teamIds)
        .neq('user_id', user.id)
        
      if (otherMembersCount && otherMembersCount > 0) {
          isTeamLeaderWithMembers = true
      }
  }

  // Get team members for Team Status - organized by teams
  const teamsWithMembers: any[] = []
  if (userTeams && userTeams.length > 0) {
    const teamIds = userTeams.map(t => t.team_id)
    
    console.log('User teams:', userTeams)
    console.log('Team IDs:', teamIds)
    
    // Get all teams user belongs to
    const { data: userTeamsData, error: teamsError } = await supabase
      .from('teams')
      .select('id, name')
      .in('id', teamIds)

    console.log('Teams data:', userTeamsData)
    console.log('Teams error:', teamsError)

    if (userTeamsData) {
      // First, get all unique user IDs across all teams
      const allUserIds = new Set<string>()
      const teamMembersMap = new Map<string, string[]>()
      
      for (const team of userTeamsData) {
        const { data: members } = await supabase
          .from('team_members')
          .select('user_id')
          .eq('team_id', team.id)
        
        if (members && members.length > 0) {
          const userIds = members.map(m => m.user_id)
          teamMembersMap.set(team.id, userIds)
          userIds.forEach(id => allUserIds.add(id))
        }
      }
      
      console.log('All user IDs:', Array.from(allUserIds))
      
      // Fetch all profiles at once using service role to bypass RLS
      const { data: allProfiles, error: profilesError } = await serviceSupabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', Array.from(allUserIds))
      
      console.log('All profiles fetched:', allProfiles)
      console.log('Profiles error:', profilesError)
      console.log('Service client initialized:', !!serviceSupabase)
      
      // Create a map of profiles for quick lookup
      const profilesMap = new Map()
      if (allProfiles && allProfiles.length > 0) {
        allProfiles.forEach(p => profilesMap.set(p.id, p))
        console.log('Profiles map size:', profilesMap.size)
      } else {
        console.log('No profiles found or empty array!')
      }
      
      // Now build team members with their profiles
      for (const team of userTeamsData) {
        console.log('Processing team:', team.name)
        
        const memberIds = teamMembersMap.get(team.id) || []
        const teamMembers = []
        
        for (const userId of memberIds) {
          const profile = profilesMap.get(userId)
          
          console.log('User ID:', userId, 'Profile:', profile)
          
          // Check if user has an active clock event
          const { data: activeClock } = await supabase
            .from('clock_events')
            .select('id')
            .eq('user_id', userId)
            .is('end_timestamp', null)
            .maybeSingle()

          teamMembers.push({
            id: userId,
            name: profile?.full_name || profile?.email?.split('@')[0] || 'User',
            email: profile?.email || '',
            status: activeClock ? 'Active' : 'Offline'
          })
        }

        console.log('Final team members for', team.name, ':', teamMembers)

        // Only add teams that have members
        if (teamMembers.length > 0) {
          teamsWithMembers.push({
            teamId: team.id,
            teamName: team.name,
            members: teamMembers
          })
        }
      }
    }
  }

  console.log('Final teamsWithMembers:', teamsWithMembers)

  return {
    todayHours: formatDuration(todaySeconds),
    weekHours: formatDuration(weekSeconds),
    activeSessionsCount: activeSessionsCount || 0,
    totalTeams: totalTeams || 0,
    recentActivity: recentActivity || [],
    isTeamLeader: isTeamLeaderWithMembers,
    leaderTeamsCount,
    activeEvent: activeEvent || null,
    userTeams: userTeams || [],
    teamsWithMembers
  }
}

export function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return `${h}:${m.toString().padStart(2, '0')}`
}

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
      isTeamLeaderWithMembers = true
      
      /* 
      // Previously we only showed dashboard if there were OTHER members
      const teamIds = leaderTeams.map(t => t.team_id)
      
      const { count: otherMembersCount } = await supabase
        .from('team_members')
        .select('*', { count: 'exact', head: true })
        .in('team_id', teamIds)
        .neq('user_id', user.id)
        
      if (otherMembersCount && otherMembersCount > 0) {
          isTeamLeaderWithMembers = true
      }
      */
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
      
      // Fetch all profiles at once using service role to bypass RLS
      const { data: allProfiles, error: profilesError } = await serviceSupabase
        .from('profiles')
        .select('id, full_name')
        .in('id', Array.from(allUserIds))
      
      // Create a map of profiles for quick lookup
      const profilesMap = new Map()
      if (allProfiles && allProfiles.length > 0) {
        allProfiles.forEach(p => profilesMap.set(p.id, p))
      }

      // Fetch emails from Auth Admin for fallback
      const adminUsersMap = new Map()
      try {
        const userPromises = Array.from(allUserIds).map(id => 
          serviceSupabase.auth.admin.getUserById(id)
        )
        const usersResults = await Promise.all(userPromises)
        usersResults.forEach(({ data: { user } }) => {
          if (user) adminUsersMap.set(user.id, user)
        })
      } catch (e) {
        console.error('Error fetching admin users:', e)
      }
      
      // Now build team members with their profiles
      for (const team of userTeamsData) {
        const memberIds = teamMembersMap.get(team.id) || []
        const teamMembers = []
        
        for (const userId of memberIds) {
          const profile = profilesMap.get(userId)
          const authUser = adminUsersMap.get(userId)
          
          // Check if user has an active clock event
          const { data: activeClock } = await supabase
            .from('clock_events')
            .select('id')
            .eq('user_id', userId)
            .is('end_timestamp', null)
            .maybeSingle()

          const displayName = profile?.full_name || authUser?.email?.split('@')[0] || 'User'

          teamMembers.push({
            id: userId,
            name: displayName,
            email: authUser?.email || '',
            status: activeClock ? 'Active' : 'Offline'
          })
        }

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

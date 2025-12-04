import { createClient } from '@/lib/supabase/server'
import { startOfDay, startOfWeek, endOfDay, endOfWeek } from 'date-fns'

export async function getDashboardStats() {
  const supabase = await createClient()
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

  // Active Teams (Total Projects/Teams user is part of)
  const { count: totalTeams } = await supabase
    .from('team_members')
    .select('*', { count: 'exact', head: true })
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
    .limit(5)

  // Check if user is a leader or admin of any team AND that team has other members
  const { data: leaderTeams } = await supabase
    .from('team_members')
    .select('team_id')
    .eq('user_id', user.id)
    .in('role', ['leader', 'admin'])

  let isTeamLeaderWithMembers = false
  
  if (leaderTeams && leaderTeams.length > 0) {
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

  return {
    todayHours: formatDuration(todaySeconds),
    weekHours: formatDuration(weekSeconds),
    activeSessionsCount: activeSessionsCount || 0,
    totalTeams: totalTeams || 0,
    recentActivity: recentActivity || [],
    isTeamLeader: isTeamLeaderWithMembers
  }
}

export function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return `${h}:${m.toString().padStart(2, '0')}`
}

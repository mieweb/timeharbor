'use server'

import { createClient } from '@/lib/supabase/server'
import { startOfDay, endOfDay, parseISO } from 'date-fns'

export async function getTimesheetData(startDate: string, endDate: string, targetUserId?: string) {
  const supabase = await createClient()
  
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('Not authenticated')
    }

    // If targetUserId is provided and different from current user, check permissions
    let userIdToFetch = user.id
    if (targetUserId && targetUserId !== user.id) {
      // Check if current user is a leader/admin of any team the target user belongs to
      // OR simply check if current user is a leader/admin (simplified for now, but ideally should be scoped to team)
      
      // Let's check if they share a team where current user is leader
      const { data: leadership, error: leadershipError } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user.id)
        .in('role', ['leader', 'admin'])
      
      if (leadershipError || !leadership || leadership.length === 0) {
        throw new Error('Unauthorized to view this user\'s timesheet')
      }
      
      const leaderTeamIds = leadership.map(l => l.team_id)
      
      const { data: membership, error: membershipError } = await supabase
        .from('team_members')
        .select('id')
        .eq('user_id', targetUserId)
        .in('team_id', leaderTeamIds)
        .limit(1)
        
      if (membershipError || !membership || membership.length === 0) {
         throw new Error('User is not in your managed teams')
      }
      
      userIdToFetch = targetUserId
    }

    const start = startOfDay(parseISO(startDate)).toISOString()
    const end = endOfDay(parseISO(endDate)).toISOString()

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
      .eq('user_id', userIdToFetch)
      .gte('start_timestamp', start)
      .lte('start_timestamp', end)
      .order('start_timestamp', { ascending: false })

    if (error) {
      console.error('Supabase error in getTimesheetData:', error)
      throw new Error(error.message)
    }

    return { data, error: null }
  } catch (error: any) {
    console.error('Error in getTimesheetData:', error)
    return { data: null, error: error.message }
  }
}

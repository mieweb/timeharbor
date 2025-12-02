'use server'

import { createClient } from '@/lib/supabase/server'
import { startOfDay, endOfDay, parseISO } from 'date-fns'

export async function getTimesheetData(startDate: string, endDate: string) {
  const supabase = await createClient()
  
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('Not authenticated')
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
      .eq('user_id', user.id) // Ensure we only fetch for the current user
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

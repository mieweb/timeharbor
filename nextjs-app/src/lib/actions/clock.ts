'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { sendNotification } from '@/lib/notifications'

export async function startClock(teamId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  // Stop any existing clock event for this user in this team
  await supabase
    .from('clock_events')
    .update({ end_timestamp: new Date().toISOString() })
    .eq('user_id', user.id)
    .eq('team_id', teamId)
    .is('end_timestamp', null)

  // Start new clock event
  const { data, error } = await supabase
    .from('clock_events')
    .insert({
      user_id: user.id,
      team_id: teamId,
      start_timestamp: new Date().toISOString()
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  // Notify team admins (simplified: just notify self for demo)
  try {
    await sendNotification(user.id, {
      title: 'Clock In',
      body: 'You have successfully clocked in.',
      url: `/teams?id=${teamId}`
    })
  } catch (e) {
    console.error('Failed to send notification', e)
  }

  revalidatePath('/timesheet')
  return data
}

export async function stopClock(teamId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const now = new Date().toISOString()

  // Find active clock event
  const { data: activeEvent } = await supabase
    .from('clock_events')
    .select('*')
    .eq('user_id', user.id)
    .eq('team_id', teamId)
    .is('end_timestamp', null)
    .single()

  if (!activeEvent) return

  // Calculate duration
  const startTime = new Date(activeEvent.start_timestamp).getTime()
  const endTime = new Date(now).getTime()
  const duration = Math.floor((endTime - startTime) / 1000) + (activeEvent.accumulated_time || 0)

  // Update clock event
  await supabase
    .from('clock_events')
    .update({
      end_timestamp: now,
      accumulated_time: duration
    })
    .eq('id', activeEvent.id)

  // Stop any active tickets in this clock event
  const { data: activeTickets } = await supabase
    .from('clock_event_tickets')
    .select('*')
    .eq('clock_event_id', activeEvent.id)
    .not('start_timestamp', 'is', null)

  if (activeTickets) {
    for (const ticket of activeTickets) {
      const ticketStart = new Date(ticket.start_timestamp).getTime()
      const ticketDuration = Math.floor((endTime - ticketStart) / 1000) + (ticket.accumulated_time || 0)
      
      await supabase
        .from('clock_event_tickets')
        .update({
          start_timestamp: null,
          accumulated_time: ticketDuration
        })
        .eq('id', ticket.id)
        
      // Also update the main ticket accumulated time
      const { data: ticketData } = await supabase.from('tickets').select('accumulated_time').eq('id', ticket.ticket_id).single()
      if (ticketData) {
          await supabase.from('tickets').update({
              accumulated_time: (ticketData.accumulated_time || 0) + Math.floor((endTime - ticketStart) / 1000)
          }).eq('id', ticket.ticket_id)
      }
    }
  }

  revalidatePath('/timesheet')
}

export async function startTicket(ticketId: string, teamId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  // 1. Ensure active clock event
  let { data: activeEvent } = await supabase
    .from('clock_events')
    .select('*')
    .eq('user_id', user.id)
    .eq('team_id', teamId)
    .is('end_timestamp', null)
    .single()

  if (!activeEvent) {
    // Start clock if not running
    activeEvent = await startClock(teamId)
  }

  if (!activeEvent) throw new Error('Failed to start clock event')

  const now = new Date().toISOString()

  // 2. Stop any currently running ticket timers for this clock event
  const { data: runningTickets } = await supabase
    .from('clock_event_tickets')
    .select('*')
    .eq('clock_event_id', activeEvent.id)
    .not('start_timestamp', 'is', null)

  if (runningTickets) {
    for (const ticket of runningTickets) {
      const startTime = new Date(ticket.start_timestamp).getTime()
      const endTime = new Date(now).getTime()
      const duration = Math.floor((endTime - startTime) / 1000) + (ticket.accumulated_time || 0)

      await supabase
        .from('clock_event_tickets')
        .update({
          start_timestamp: null,
          accumulated_time: duration
        })
        .eq('id', ticket.id)

      // Update main ticket accumulated time
      const { data: ticketData } = await supabase.from('tickets').select('accumulated_time').eq('id', ticket.ticket_id).single()
      if (ticketData) {
        await supabase.from('tickets').update({
          accumulated_time: (ticketData.accumulated_time || 0) + Math.floor((endTime - startTime) / 1000)
        }).eq('id', ticket.ticket_id)
      }
    }
  }

  // 3. Start timer for the selected ticket
  // Check if we already have an entry for this ticket in this clock event
  const { data: existingEntry } = await supabase
    .from('clock_event_tickets')
    .select('*')
    .eq('clock_event_id', activeEvent.id)
    .eq('ticket_id', ticketId)
    .single()

  if (existingEntry) {
    await supabase
      .from('clock_event_tickets')
      .update({
        start_timestamp: now
      })
      .eq('id', existingEntry.id)
  } else {
    await supabase
      .from('clock_event_tickets')
      .insert({
        clock_event_id: activeEvent.id,
        ticket_id: ticketId,
        start_timestamp: now
      })
  }

  revalidatePath('/tickets')
  revalidatePath(`/teams?id=${teamId}`)
}

export async function stopTicket(ticketId: string, teamId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const now = new Date().toISOString()

  // Find active clock event
  const { data: activeEvent } = await supabase
    .from('clock_events')
    .select('id')
    .eq('user_id', user.id)
    .eq('team_id', teamId)
    .is('end_timestamp', null)
    .single()

  if (!activeEvent) return // No active session, so no active ticket to stop

  // Find the specific active ticket entry
  const { data: ticketEntry } = await supabase
    .from('clock_event_tickets')
    .select('*')
    .eq('clock_event_id', activeEvent.id)
    .eq('ticket_id', ticketId)
    .not('start_timestamp', 'is', null)
    .single()

  if (!ticketEntry) return // Ticket not running

  const startTime = new Date(ticketEntry.start_timestamp).getTime()
  const endTime = new Date(now).getTime()
  const duration = Math.floor((endTime - startTime) / 1000) + (ticketEntry.accumulated_time || 0)

  // Update clock_event_tickets
  await supabase
    .from('clock_event_tickets')
    .update({
      start_timestamp: null,
      accumulated_time: duration
    })
    .eq('id', ticketEntry.id)

  // Update main tickets table
  const { data: ticketData } = await supabase.from('tickets').select('accumulated_time').eq('id', ticketId).single()
  if (ticketData) {
    await supabase.from('tickets').update({
      accumulated_time: (ticketData.accumulated_time || 0) + Math.floor((endTime - startTime) / 1000)
    }).eq('id', ticketId)
  }

  revalidatePath('/tickets')
  revalidatePath(`/teams?id=${teamId}`)
}

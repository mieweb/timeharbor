'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createTicket(formData: FormData) {
  console.log('createTicket action called')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    console.error('createTicket: User not authenticated')
    throw new Error('Not authenticated')
  }

  const title = formData.get('title') as string
  const githubUrl = formData.get('github_url') as string
  const teamId = formData.get('team_id') as string

  console.log('createTicket payload:', { title, githubUrl, teamId, userId: user.id })

  if (!teamId) throw new Error('Team ID is required')

  // Verify user is a member of the team
  const { data: member, error: memberError } = await supabase
    .from('team_members')
    .select('id')
    .eq('team_id', teamId)
    .eq('user_id', user.id)
    .single()

  if (memberError) {
      console.error('createTicket: Error checking team membership', memberError)
  }

  if (!member) {
    console.error('createTicket: User is not a member of the team')
    throw new Error('You must be a member of the team to create a ticket')
  }

  const { data, error } = await supabase
    .from('tickets')
    .insert({
      title,
      github_url: githubUrl,
      team_id: teamId,
      created_by: user.id,
      status: 'open'
    })
    .select()

  if (error) {
    console.error('createTicket: Error inserting ticket', error)
    throw new Error(error.message)
  }

  console.log('createTicket: Ticket created successfully', data)

  revalidatePath('/tickets')
  revalidatePath(`/teams?id=${teamId}`)
}

export async function updateTicketStatus(ticketId: string, status: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('tickets')
    .update({ status, updated_at: new Date().toISOString(), updated_by: user.id })
    .eq('id', ticketId)

  if (error) throw new Error(error.message)

  revalidatePath('/tickets')
}

export async function deleteTicket(ticketId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('tickets')
    .delete()
    .eq('id', ticketId)

  if (error) throw new Error(error.message)

  revalidatePath('/tickets')
}

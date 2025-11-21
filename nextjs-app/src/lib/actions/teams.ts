'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createTeam(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Not authenticated')
  }

  const name = formData.get('name') as string
  const code = Math.random().toString(36).substr(2, 8).toUpperCase()

  const { data: team, error: teamError } = await supabase
    .from('teams')
    .insert({
      name,
      code,
      created_by: user.id
    })
    .select()
    .single()

  if (teamError) {
    throw new Error(teamError.message)
  }

  const { error: memberError } = await supabase
    .from('team_members')
    .insert({
      team_id: team.id,
      user_id: user.id,
      role: 'leader'
    })

  if (memberError) {
    // Cleanup team if member creation fails? Or just throw
    throw new Error(memberError.message)
  }

  revalidatePath('/teams')
  redirect('/teams')
}

export async function joinTeam(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Not authenticated')
  }

  const code = formData.get('code') as string

  const { data: team, error: teamError } = await supabase
    .from('teams')
    .select('id')
    .eq('code', code)
    .single()

  if (teamError || !team) {
    throw new Error('Team not found')
  }

  const { error: memberError } = await supabase
    .from('team_members')
    .insert({
      team_id: team.id,
      user_id: user.id,
      role: 'member'
    })

  if (memberError) {
    if (memberError.code === '23505') { // Unique violation
       throw new Error('Already a member')
    }
    throw new Error(memberError.message)
  }

  revalidatePath('/teams')
  redirect('/teams')
}

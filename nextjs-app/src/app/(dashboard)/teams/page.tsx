import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TeamsList from '@/components/teams/TeamsList'
import TeamDetails from '@/components/teams/TeamDetails'

export default async function TeamPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { id: teamId } = await searchParams

  if (teamId) {
    // Detail View
    const { data: team } = await supabase
      .from('teams')
      .select('*, team_members(*, profiles(*))')
      .eq('id', teamId)
      .single()

    if (!team) {
      return <div className="alert alert-error">Team not found</div>
    }

    // Check if user is member
    const isMember = team.team_members.some((m: any) => m.user_id === user.id)
    if (!isMember) {
      return <div className="alert alert-error">You are not a member of this team</div>
    }

    return <TeamDetails team={team} userId={user.id} />
  } else {
    // List View
    const { data: teamMembers } = await supabase
      .from('team_members')
      .select('team_id, role, teams(*)')
      .eq('user_id', user.id)

    const teams = teamMembers?.map((tm: any) => ({
      ...tm.teams,
      role: tm.role
    })) || []

    return <TeamsList teams={teams} userId={user.id} />
  }
}

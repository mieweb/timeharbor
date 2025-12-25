import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
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

    // Fetch emails for members using Admin Client to display names correctly
    const adminSupabase = createAdminClient()
    const { data: { users: authUsers } } = await adminSupabase.auth.admin.listUsers({
        perPage: 1000
    })
    
    const emailMap = new Map()
    if (authUsers) {
        authUsers.forEach(u => emailMap.set(u.id, u.email))
    }

    // Enrich team members with email
    const enrichedMembers = team.team_members.map((member: any) => {
        const email = emailMap.get(member.user_id)
        // Ensure profiles object exists
        const profiles = member.profiles || {}
        return {
            ...member,
            profiles: {
                ...profiles,
                email: email || null
            }
        }
    })
    
    const enrichedTeam = {
        ...team,
        team_members: enrichedMembers
    }

    return <TeamDetails team={enrichedTeam} userId={user.id} />
  } else {
    // List View
    const { data: teamMembers } = await supabase
      .from('team_members')
      .select('team_id, role, teams(*, team_members(count))')
      .eq('user_id', user.id)

    const teams = teamMembers?.map((tm: any) => ({
      ...tm.teams,
      role: tm.role,
      memberCount: tm.teams.team_members?.[0]?.count || 0
    })) || []

    return <TeamsList teams={teams} userId={user.id} />
  }
}

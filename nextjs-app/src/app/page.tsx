import { createClient } from '@/lib/supabase/server'
import { getDashboardStats, getOpenTickets, getOpenTicketsCount } from '@/lib/data'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import DashboardTabs from '@/components/dashboard/DashboardTabs'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const stats = await getDashboardStats()
  const openTickets = await getOpenTickets()
  const openTicketsCount = await getOpenTicketsCount()
  
  if (!stats) return <div>Loading...</div>

  return (
    <div className="space-y-8">
      <DashboardTabs 
        openTickets={openTickets} 
        isTeamLeader={stats.isTeamLeader}
        recentActivity={stats.recentActivity}
        teamsStatus={stats.teamsStatus}
        stats={stats}
      />
    </div>
  )
}

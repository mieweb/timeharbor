import { getDashboardStats, formatDuration } from '@/lib/data'
import QuickTimeTrackingWrapper from '@/components/dashboard/QuickTimeTrackingWrapper'
import TeamStatus from '@/components/dashboard/TeamStatus'
import TeamDashboard from '@/components/dashboard/TeamDashboard'
import DashboardTabs from '@/components/dashboard/DashboardTabs'
import { format, parseISO } from 'date-fns'

export default async function HomePage() {
  const stats = await getDashboardStats()

  if (!stats) {
    return <div className="p-8">Loading...</div>
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <DashboardTabs 
        openTickets={stats.openTickets || []} 
        isTeamLeader={!!stats.leaderTeamsCount}
        recentActivity={stats.recentActivity || []}
        teamsStatus={stats.teamsStatus || []}
        stats={stats}
      />
    </div>
  )
}

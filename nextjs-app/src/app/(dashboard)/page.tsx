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
      {/* Welcome Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Welcome Back! 👋</h1>
        <p className="text-gray-600">Here's what's happening with your work today</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 shadow-[inset_4px_0px_0px_0px_#76ABAE] p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-gray-500">Today's Hours</span>
            <div className="bg-th-accent/80 rounded-lg p-2 text-white">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
            </div>
          </div>
          <div className="text-3xl font-bold mb-1 text-th-dark">{stats.todayHours}</div>
          <div className="flex items-center gap-1 text-sm text-green-600">
            <span>Start tracking</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 shadow-[inset_4px_0px_0px_0px_#76ABAE] p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-gray-500">This Week</span>
            <div className="bg-th-accent/80 rounded-lg p-2 text-white">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 3v18h18"/>
                <path d="m19 9-5 5-4-4-3 3"/>
              </svg>
            </div>
          </div>
          <div className="text-3xl font-bold mb-1 text-th-dark">{stats.weekHours}</div>
          <div className="flex items-center gap-1 text-sm text-green-600">
            <span>+15% last week</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 shadow-[inset_4px_0px_0px_0px_#76ABAE] p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-gray-500">Open Tickets</span>
            <div className="bg-th-accent/80 rounded-lg p-2 text-white">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="13" x="3" y="8" rx="2" ry="2"/>
                <path d="M12 8V4H8"/>
                <path d="M16 4h-4"/>
              </svg>
            </div>
          </div>
          <div className="text-3xl font-bold mb-1 text-th-dark">6</div>
          <div className="flex items-center gap-1 text-sm text-green-600">
            <span>3 high priority</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 shadow-[inset_4px_0px_0px_0px_#76ABAE] p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-gray-500">Active Teams</span>
            <div className="bg-th-accent/80 rounded-lg p-2 text-white">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
          </div>
          <div className="text-3xl font-bold mb-1 text-th-dark">{stats.totalTeams}</div>
          <div className="flex items-center gap-1 text-sm text-green-600">
            <span>{stats.leaderTeamsCount || 0} as leader</span>
          </div>
        </div>
      </div>

      <DashboardTabs 
        openTickets={stats.openTickets || []} 
        isTeamLeader={!!stats.leaderTeamsCount}
        recentActivity={stats.recentActivity || []}
        teamsStatus={stats.teamsStatus || []}
      />
    </div>
  )
}

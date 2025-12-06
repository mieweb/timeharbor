import { createClient } from '@/lib/supabase/server'
import { getDashboardStats, formatDuration } from '@/lib/data'
import QuickTimeTrackingWrapper from '@/components/dashboard/QuickTimeTrackingWrapper'
import TeamStatus from '@/components/dashboard/TeamStatus'
import TeamDashboard from '@/components/dashboard/TeamDashboard'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { format, parseISO } from 'date-fns'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const stats = await getDashboardStats()
  
  if (!stats) return <div>Loading...</div>

  const isFirstTimeUser = stats.totalTeams === 0

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      {/* Welcome Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Welcome Back! 👋</h1>
        <p className="text-gray-600">Track your time efficiently across teams and projects</p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {/* Quick Time Tracking */}
        <QuickTimeTrackingWrapper 
          activeEvent={stats.activeEvent}
          userTeams={stats.userTeams}
        />
        
        {/* Timesheet Access */}
        <Link href="/timesheet" className="bg-gradient-to-br from-purple-500 to-purple-700 rounded-lg shadow p-6 text-white hover:shadow-lg transition-all group">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Personal Timesheet</h3>
            <div className="bg-white/20 rounded-full p-2 group-hover:bg-white/30 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            </div>
          </div>
          <p className="text-purple-100 mb-4">View and manage your detailed time entries, analyze your work patterns</p>
          <div className="flex items-center gap-2 text-sm font-medium">
            <span>Go to Timesheet</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-x-1 transition-transform">
              <line x1="5" y1="12" x2="19" y2="12"/>
              <polyline points="12 5 19 12 12 19"/>
            </svg>
          </div>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
        <div className="bg-base-100 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-gray-500">Today's Hours</span>
            <div className="bg-gray-100 rounded-full p-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
            </div>
          </div>
          <div className="text-3xl font-bold mb-1">{stats.todayHours}</div>
          <div className="flex items-center gap-1 text-sm text-green-600">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
              <polyline points="16 7 22 7 22 13"/>
            </svg>
            <span>Start tracking time</span>
          </div>
        </div>

        <div className="bg-base-100 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-gray-500">This Week</span>
            <div className="bg-green-100 rounded-full p-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600">
                <path d="M3 3v18h18"/>
                <path d="m19 9-5 5-4-4-3 3"/>
              </svg>
            </div>
          </div>
          <div className="text-3xl font-bold mb-1">{stats.weekHours}</div>
          <div className="flex items-center gap-1 text-sm text-green-600">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
              <polyline points="16 7 22 7 22 13"/>
            </svg>
            <span>+15% from last week</span>
          </div>
        </div>

        <div className="bg-base-100 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-gray-500">Active Clock-ins</span>
            <div className="bg-yellow-100 rounded-full p-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-600">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
              </svg>
            </div>
          </div>
          <div className="text-3xl font-bold mb-1">{stats.activeSessionsCount}</div>
          <div className="flex items-center gap-1 text-sm text-green-600">
            <span>{stats.activeSessionsCount === 0 ? 'Ready to start' : 'In progress'}</span>
          </div>
        </div>

        <div className="bg-base-100 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-gray-500">Active Teams</span>
            <div className="bg-blue-100 rounded-full p-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
          </div>
          <div className="text-3xl font-bold mb-1">{stats.totalTeams}</div>
          <div className="flex items-center gap-1 text-sm text-gray-600">
            <span>{stats.leaderTeamsCount || 0} as leader</span>
          </div>
        </div>
      </div>

      {/* Recent Activity and Team Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="bg-amber-100 rounded-lg p-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-600">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                  <polyline points="9 22 9 12 15 12 15 22"/>
                </svg>
              </div>
              <h2 className="text-xl font-semibold">Recent Activity</h2>
            </div>
            <button className="text-indigo-600 text-sm font-medium hover:text-indigo-700">View All</button>
          </div>
          
          <div className="space-y-3">
            {stats.recentActivity.slice(0, 4).map((activity: any) => {
              const start = activity.start_timestamp ? parseISO(activity.start_timestamp) : null
              const end = activity.end_timestamp ? parseISO(activity.end_timestamp) : null
              
              const formatStr = 'MM/dd/yyyy, h:mm a'
              const timeRange = start 
                ? `${format(start, formatStr)} - ${end ? format(end, formatStr) : 'Now'}`
                : 'Unknown'

              let duration = activity.accumulated_time || 0
              const isCurrentSession = !activity.end_timestamp && activity.start_timestamp
              if (isCurrentSession) {
                const startTime = new Date(activity.start_timestamp).getTime()
                duration += Math.floor((Date.now() - startTime) / 1000)
              }

              return (
                <div 
                  key={activity.id} 
                  className={`rounded-lg shadow p-4 flex items-center justify-between hover:shadow-md transition-shadow ${
                    isCurrentSession 
                      ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300' 
                      : 'bg-base-100'
                  }`}
                >
                  <div className="flex-1 flex items-center gap-3">
                    {isCurrentSession && (
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                      </div>
                    )}
                    <div className="flex-1">
                      <div className={`font-semibold ${isCurrentSession ? 'text-green-900' : 'text-gray-900'}`}>
                        {activity.teams?.name || activity.ticket_id || 'Unknown'}
                        {isCurrentSession && <span className="ml-2 text-xs font-normal text-green-600">(Active)</span>}
                      </div>
                      <div className={`text-sm mt-1 ${isCurrentSession ? 'text-green-700' : 'text-gray-500'}`}>
                        {timeRange}
                      </div>
                    </div>
                  </div>
                  <div className={`px-4 py-2 rounded-lg font-semibold ${
                    isCurrentSession 
                      ? 'bg-green-500 text-white' 
                      : 'bg-indigo-100 text-indigo-700'
                  }`}>
                    {formatDuration(duration)}
                  </div>
                </div>
              )
            })}
            {stats.recentActivity.length === 0 && (
              <div className="text-center py-12 text-gray-500 bg-base-100 rounded-lg shadow">
                <p>No recent activity found</p>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-1">
          <TeamStatus teams={stats.teamsWithMembers || []} />
        </div>
      </div>

      {/* Team Dashboard */}
      {stats.isTeamLeader && (
        <div className="mb-8">
          <TeamDashboard />
        </div>
      )}
    </div>
  )
}

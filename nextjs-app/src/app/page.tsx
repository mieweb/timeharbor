import { createClient } from '@/lib/supabase/server'
import { getDashboardStats, formatDuration } from '@/lib/data'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import LocalTimeDisplay from '@/components/LocalTimeDisplay'
import TeamDashboard from '@/components/dashboard/TeamDashboard'

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
    <div className="py-6 px-8">
      {/* Welcome Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-base-content mb-4">Welcome to TimeHarbor</h2>
        <p className="text-base-content opacity-70 mb-6">
          Track your time efficiently across teams and projects.
        </p>
      </div>

      {/* First Time User / No Data State */}
      {isFirstTimeUser && (
        <div className="card bg-base-100 shadow-lg p-8 mb-8">
          <div className="text-center">
            <div className="text-6xl mb-4">🚀</div>
            <h3 className="text-2xl font-bold text-base-content mb-4">Welcome to TimeHarbor!</h3>
            <p className="text-base-content opacity-70 mb-6 max-w-md mx-auto">
              Get started by joining a team or creating your first project. Your time tracking journey begins here!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/teams" className="btn btn-primary">
                📋 Join a Team
              </Link>
              <Link href="/guide" className="btn btn-outline">
                📖 View Guide
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Team Dashboard Section (for Admins/Leaders) */}
      {stats.isTeamLeader && (
        <TeamDashboard />
      )}

      {/* Personal Dashboard Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold">Your Personal Dashboard</h3>
          <div className="flex gap-2">
            <Link href="/timesheet" className="btn btn-sm btn-outline btn-primary gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><line x1="3" x2="21" y1="9" y2="9"/><line x1="9" x2="9" y1="21" y2="9"/></svg>
                View My Timesheet
            </Link>
            <button className="btn btn-sm btn-outline btn-error gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>
                Report an Issue
            </button>
          </div>
        </div>

        {/* Quick Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="card bg-base-100 shadow p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{stats.todayHours}</div>
              <div className="text-sm text-base-content opacity-70">Today's Hours</div>
            </div>
          </div>
          <div className="card bg-base-100 shadow p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{stats.weekHours}</div>
              <div className="text-sm text-base-content opacity-70">This Week</div>
            </div>
          </div>
          <div className="card bg-base-100 shadow p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{stats.activeSessionsCount}</div>
              <div className="text-sm text-base-content opacity-70">Active Clock-ins</div>
            </div>
          </div>
          <div className="card bg-base-100 shadow p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{stats.totalTeams}</div>
              <div className="text-sm text-base-content opacity-70">Active Teams</div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card bg-base-100 shadow p-6">
          <h4 className="text-lg font-bold mb-4">Recent Activity</h4>
          
          {stats.recentActivity.length > 0 ? (
            <div className="space-y-3">
              {stats.recentActivity.map((event: any) => {
                let duration = event.accumulated_time || 0
                const isActive = !event.end_timestamp && event.start_timestamp
                
                if (isActive) {
                    const startTime = new Date(event.start_timestamp).getTime()
                    duration += Math.floor((Date.now() - startTime) / 1000)
                }

                return (
                    <div key={event.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-4">
                        {/* Icon */}
                        <div className="shrink-0">
                            {isActive ? (
                                <div className="w-6 h-6 rounded-full bg-green-500 shadow-sm border-2 border-white"></div>
                            ) : (
                                <div className="w-6 h-6 rounded bg-green-500 flex items-center justify-center text-white">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                </div>
                            )}
                        </div>
                        
                        {/* Text Info */}
                        <div>
                            <div className="font-bold text-base-content">{event.teams?.name || 'Unknown Team'}</div>
                            <div className="text-sm text-gray-500 mt-0.5">
                                {isActive ? (
                                    <span>Started <LocalTimeDisplay date={event.start_timestamp} /> (Active)</span>
                                ) : (
                                    <>
                                        <LocalTimeDisplay date={event.start_timestamp} />
                                        {' - '}
                                        <LocalTimeDisplay date={event.end_timestamp} />
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                    
                    {/* Duration Badge */}
                    <div className="text-right">
                        <div className="bg-indigo-600 text-white text-sm font-bold px-3 py-1 rounded-md inline-block min-w-[60px] text-center">
                            {formatDuration(duration)}
                        </div>
                        {isActive && (
                            <div className="text-xs text-green-500 font-medium mt-1">Running</div>
                        )}
                    </div>
                    </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">⏰</div>
              <p className="text-base-content opacity-70 mb-4">No recent activity found</p>
              <p className="text-sm text-base-content opacity-60">Start tracking your time by clocking into a project!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

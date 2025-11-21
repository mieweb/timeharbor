import { createClient } from '@/lib/supabase/server'
import { getDashboardStats } from '@/lib/data'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { format } from 'date-fns'

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
    <div className="py-6">
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
        <div className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold">Team Dashboard</h3>
            <Link href="/notifications" className="btn btn-sm btn-outline">
              🔔 Notification Settings
            </Link>
          </div>
          
          <div className="alert alert-info">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            <span>Team analytics and reports are coming soon! Use the "Teams" page to manage your members.</span>
          </div>
        </div>
      )}

      {/* Personal Dashboard Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold">Your Personal Dashboard</h3>
          <div className="flex gap-2">
            <Link href="/timesheet" className="btn btn-sm btn-outline btn-primary">
              📊 View My Timesheet
            </Link>
            <button className="btn btn-sm btn-outline btn-secondary">
              🐛 Report an Issue
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
          <h4 className="text-lg font-semibold mb-4">Recent Activity</h4>
          
          {stats.recentActivity.length > 0 ? (
            <div className="space-y-4">
              {stats.recentActivity.map((event: any) => (
                <div key={event.id} className="flex items-center justify-between p-3 bg-base-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">
                      {event.end_timestamp ? '✅' : '🟢'}
                    </div>
                    <div>
                      <div className="font-semibold">{event.teams?.name || 'Unknown Team'}</div>
                      <div className="text-sm text-base-content opacity-70">
                        {event.end_timestamp ? (
                          `${format(new Date(event.start_timestamp), 'HH:mm')} - ${format(new Date(event.end_timestamp), 'HH:mm')}`
                        ) : (
                          `Started ${format(new Date(event.start_timestamp), 'HH:mm')} (Active)`
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    {/* We'll need a helper for total time including active time */}
                    <div className="badge badge-primary">
                      {/* Placeholder for duration calculation */}
                      {event.accumulated_time ? `${Math.floor(event.accumulated_time / 60)}m` : '0m'}
                    </div>
                    {!event.end_timestamp && (
                      <div className="text-xs text-success mt-1">Running</div>
                    )}
                  </div>
                </div>
              ))}
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

import { getDashboardStats, formatDuration } from '@/lib/data'
import Link from 'next/link'
import { format, parseISO } from 'date-fns'

export default async function HomePage() {
  const stats = await getDashboardStats()

  if (!stats) {
    return <div className="p-8">Loading...</div>
  }

  return (
    <div className="p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <h1 className="text-2xl font-bold">Your Personal Dashboard</h1>
        <div className="flex gap-2">
            <Link href="/timesheet" className="btn btn-outline btn-primary btn-sm gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><line x1="3" x2="21" y1="9" y2="9"/><line x1="9" x2="9" y1="21" y2="9"/></svg>
                View My Timesheet
            </Link>
            <button className="btn btn-outline btn-error btn-sm gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>
                Report an Issue
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="card bg-base-100 shadow p-6 text-center">
            <div className="text-3xl font-bold text-primary mb-1">{stats.todayHours}</div>
            <div className="text-sm text-gray-500">Today's Hours</div>
        </div>
        <div className="card bg-base-100 shadow p-6 text-center">
            <div className="text-3xl font-bold text-primary mb-1">{stats.weekHours}</div>
            <div className="text-sm text-gray-500">This Week</div>
        </div>
        <div className="card bg-base-100 shadow p-6 text-center">
            <div className="text-3xl font-bold text-primary mb-1">{stats.activeSessionsCount}</div>
            <div className="text-sm text-gray-500">Active Clock-ins</div>
        </div>
        <div className="card bg-base-100 shadow p-6 text-center">
            <div className="text-3xl font-bold text-primary mb-1">{stats.totalTeams}</div>
            <div className="text-sm text-gray-500">Active Teams</div>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
        <div className="space-y-3">
            {stats.recentActivity.map((activity: any) => {
                const start = activity.start_timestamp ? parseISO(activity.start_timestamp) : null
                const end = activity.end_timestamp ? parseISO(activity.end_timestamp) : null
                
                // Format: 11/25/2025, 2:59 PM
                const formatStr = 'MM/dd/yyyy, h:mm a'
                const timeRange = start 
                    ? `${format(start, formatStr)} - ${end ? format(end, formatStr) : 'Now'}`
                    : 'Unknown'

                let duration = activity.accumulated_time || 0
                if (!activity.end_timestamp && activity.start_timestamp) {
                    const startTime = new Date(activity.start_timestamp).getTime()
                    duration += Math.floor((Date.now() - startTime) / 1000)
                }

                return (
                    <div key={activity.id} className="card bg-base-100 shadow-sm p-4 flex flex-row items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded flex items-center justify-center ${activity.end_timestamp ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                                {activity.end_timestamp ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                                )}
                            </div>
                            <div>
                                <div className="font-semibold">{activity.teams?.name || 'Unknown Team'}</div>
                                <div className="text-sm text-gray-500">{timeRange}</div>
                            </div>
                        </div>
                        <div className={`badge badge-lg ${activity.end_timestamp ? 'badge-primary' : 'badge-secondary'}`}>
                            {formatDuration(duration)}
                        </div>
                    </div>
                )
            })}
            {stats.recentActivity.length === 0 && (
                <div className="text-center py-8 text-gray-500">No recent activity found</div>
            )}
        </div>
      </div>
    </div>
  )
}

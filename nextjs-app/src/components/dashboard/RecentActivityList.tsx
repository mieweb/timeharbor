'use client'

import { format, parseISO } from 'date-fns'
import { useEffect, useState } from 'react'

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return `${h}:${m.toString().padStart(2, '0')}`
}

export default function RecentActivityList({ activities }: { activities: any[] }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null // Return null on server/initial render to avoid hydration mismatch
  }

  return (
    <div className="space-y-3">
      {activities.slice(0, 4).map((activity: any) => {
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
      {activities.length === 0 && (
        <div className="text-center py-12 text-gray-500 bg-base-100 rounded-lg shadow">
          <p>No recent activity found</p>
        </div>
      )}
    </div>
  )
}

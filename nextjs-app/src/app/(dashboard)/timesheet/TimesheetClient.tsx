'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { getTimesheetData } from '@/lib/actions/timesheet'
import { format, startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, parseISO } from 'date-fns'

interface TimesheetClientProps {
  initialUserName: string
  initialUserEmail: string
  targetUserId?: string
  isEditable?: boolean
}

interface Ticket {
  title: string
  status: string
}

interface ClockEventTicket {
  ticket_id: string
  tickets: Ticket
}

interface ClockEvent {
  id: string
  start_timestamp: string
  end_timestamp: string | null
  accumulated_time: number
  teams: {
    name: string
  }
  clock_event_tickets: ClockEventTicket[]
}

export default function TimesheetClient({ initialUserName, initialUserEmail, targetUserId, isEditable = false }: TimesheetClientProps) {
  const [startDate, setStartDate] = useState(format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'))
  const [endDate, setEndDate] = useState(format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'))
  const [selectedPreset, setSelectedPreset] = useState('thisweek')
  const [clockIns, setClockIns] = useState<ClockEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalHours: "0:00",
    totalSessions: 0,
    averageSessionHours: "0.0",
    workingDays: 0
  })

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await getTimesheetData(startDate, endDate, targetUserId)

      if (error) {
        throw new Error(error)
      }

      // @ts-ignore - Supabase types might not perfectly match the deep nested structure automatically
      setClockIns(data || [])
      // @ts-ignore
      calculateStats(data || [])
    } catch (error: any) {
      console.error('Error fetching timesheet:', error.message || error)
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const calculateStats = (events: ClockEvent[]) => {
    let totalSeconds = 0
    const uniqueDays = new Set()

    events.forEach(event => {
      let duration = event.accumulated_time || 0
      if (!event.end_timestamp && event.start_timestamp) {
        // If currently running, add time until now
        const start = new Date(event.start_timestamp).getTime()
        duration += Math.floor((Date.now() - start) / 1000)
      }
      totalSeconds += duration
      uniqueDays.add(format(new Date(event.start_timestamp), 'yyyy-MM-dd'))
    })

    const h = Math.floor(totalSeconds / 3600)
    const m = Math.floor((totalSeconds % 3600) / 60)
    const totalHours = `${h}:${m.toString().padStart(2, '0')}`
    
    const totalSessions = events.length
    const avgHours = totalSessions > 0 ? (totalSeconds / 3600 / totalSessions).toFixed(1) : "0.0"

    setStats({
      totalHours,
      totalSessions,
      averageSessionHours: avgHours,
      workingDays: uniqueDays.size
    })
  }

  const handlePresetChange = (preset: string) => {
    const now = new Date()
    let start = now
    let end = now

    switch (preset) {
      case 'today':
        start = startOfDay(now)
        end = endOfDay(now)
        break
      case 'yesterday':
        start = startOfDay(subDays(now, 1))
        end = endOfDay(subDays(now, 1))
        break
      case 'last7days':
        start = subDays(now, 6)
        end = endOfDay(now)
        break
      case 'thisweek':
        start = startOfWeek(now, { weekStartsOn: 1 })
        end = endOfWeek(now, { weekStartsOn: 1 })
        break
      case 'last14days':
        start = subDays(now, 13)
        end = endOfDay(now)
        break
      case 'thismonth':
        start = startOfMonth(now)
        end = endOfMonth(now)
        break
    }

    setStartDate(format(start, 'yyyy-MM-dd'))
    setEndDate(format(end, 'yyyy-MM-dd'))
    setSelectedPreset(preset)
  }

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    return `${h}h ${m}m`
  }

  const formatTime = (isoString: string) => {
    return format(new Date(isoString), 'h:mm a')
  }

  const formatDate = (isoString: string) => {
    return format(new Date(isoString), 'M/d/yyyy')
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/" className="btn btn-outline btn-primary btn-sm">
          ← Back to Dashboard
        </Link>
        <h3 className="text-2xl font-bold text-base-content flex items-center gap-2">
          <span className="text-3xl">📊</span> My Timesheet
        </h3>
      </div>

      {/* User Info Card */}
      <div className="card bg-base-100 shadow-sm border border-base-200 p-6 mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h4 className="text-xl font-bold text-base-content">{initialUserName}</h4>
            <p className="text-base-content opacity-60">{initialUserEmail}</p>
          </div>
          <div>
            <div className="badge badge-primary p-4 text-lg font-semibold rounded-md">
              Total Hours: {stats.totalHours}
            </div>
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="mb-8">
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <label className="font-semibold text-base-content min-w-[90px]">Date Range:</label>
          <div className="flex items-center gap-2">
            <input 
              type="date" 
              className="input input-bordered input-sm" 
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value)
                setSelectedPreset('custom')
              }}
            />
            <span className="opacity-60 text-sm">to</span>
            <input 
              type="date" 
              className="input input-bordered input-sm" 
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value)
                setSelectedPreset('custom')
              }}
            />
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <button className="btn btn-sm btn-outline" onClick={fetchData}>Apply</button>
          {[
            { label: 'Today', value: 'today' },
            { label: 'Yesterday', value: 'yesterday' },
            { label: 'Last 7 Days', value: 'last7days' },
            { label: 'This Week', value: 'thisweek' },
            { label: 'Last 14 Days', value: 'last14days' }
          ].map((preset) => (
            <button 
              key={preset.value}
              className={`btn btn-sm ${selectedPreset === preset.value ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => handlePresetChange(preset.value)}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Clock-in Details Table */}
      <div className="card bg-base-100 shadow-sm border border-base-200">
        <div className="p-4 border-b border-base-200 flex items-center justify-between">
          <h5 className="text-lg font-bold text-base-content">Clock-in Details</h5>
          <div className="flex items-center gap-3">
            <span className="text-sm text-base-content opacity-60">{clockIns.length} clock-in{clockIns.length !== 1 ? 's' : ''}</span>
            <button className="btn btn-square btn-sm btn-ghost border border-base-300" title="Refresh" onClick={fetchData}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>
            </button>
            <button className={`btn btn-sm ${isEditable ? 'btn-outline' : 'btn-disabled opacity-50'}`}>Edit</button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="table w-full">
            <thead>
              <tr className="bg-base-100 border-b border-base-200">
                <th className="font-semibold text-base-content">Date</th>
                <th className="font-semibold text-base-content">
                  <div className="flex items-center gap-1">
                    Clock-in
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                  </div>
                </th>
                <th className="font-semibold text-base-content">Clock-out</th>
                <th className="font-semibold text-base-content">Duration</th>
                <th className="font-semibold text-base-content">Ticket</th>
                <th className="font-semibold text-base-content">Team</th>
                <th className="font-semibold text-base-content">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-base-content opacity-60">Loading...</td>
                </tr>
              ) : clockIns.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-base-content opacity-60">No records found for this period</td>
                </tr>
              ) : (
                clockIns.map((entry) => {
                  const isActive = !entry.end_timestamp;
                  const tickets = entry.clock_event_tickets?.map(t => t.tickets?.title).filter(Boolean) || [];
                  const ticketDisplay = tickets.length > 0 ? tickets.join(', ') : 'No activity';

                  return (
                    <tr key={entry.id} className="hover:bg-base-50 relative group">
                      <td className="font-medium relative">
                        {/* Green bar for active row */}
                        {isActive && (
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-success"></div>
                        )}
                        {formatDate(entry.start_timestamp)}
                      </td>
                      <td>{formatTime(entry.start_timestamp)}</td>
                      <td>{entry.end_timestamp ? formatTime(entry.end_timestamp) : <span className="opacity-60">Not clocked out</span>}</td>
                      <td>
                        {isActive ? (
                          <span className="font-medium">Running...</span>
                        ) : (
                          formatDuration(entry.accumulated_time || 0)
                        )}
                      </td>
                      <td>
                        <span className="text-sm truncate max-w-[200px] block" title={ticketDisplay}>
                          {ticketDisplay}
                        </span>
                      </td>
                      <td>
                        <span className="text-primary hover:underline cursor-pointer">
                          {entry.teams?.name || 'Unknown'}
                        </span>
                      </td>
                      <td>
                        {isActive ? (
                          <span className="text-success font-bold">Active</span>
                        ) : (
                          <span className="text-base-content opacity-60">Closed</span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}


'use client'

import { useState, useEffect, useRef } from 'react'
import { format, subDays, startOfWeek, endOfWeek, startOfDay, endOfDay, parseISO } from 'date-fns'
import { getTeamDashboardData } from '@/lib/actions/dashboard'
import { Filter, X } from 'lucide-react'
import Link from 'next/link'

import { createClient } from '@/lib/supabase/client'

type DashboardEvent = {
  id: string
  userId: string // Added userId
  date: string
  member: string
  email: string
  hours: number
  clockIn: string
  clockOut: string | null
  status: string
  tickets: string
  isActive: boolean
}

type ColumnConfig = {
  key: string
  label: string
  filterable: boolean
}

const COLUMNS: ColumnConfig[] = [
  { key: 'date', label: 'Date', filterable: true },
  { key: 'member', label: 'Team Member', filterable: true },
  { key: 'email', label: 'Email', filterable: true },
  { key: 'hours', label: 'Hours', filterable: true },
  { key: 'clockIn', label: 'Clock-in', filterable: true },
  { key: 'clockOut', label: 'Clock-out', filterable: true },
  { key: 'status', label: 'Status', filterable: true },
  { key: 'tickets', label: 'Tickets', filterable: false },
]

export default function TeamDashboard({ lastUpdate }: { lastUpdate?: number }) {
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [data, setData] = useState<DashboardEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState('Today')
  
  // Filter State
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [activeFilterColumn, setActiveFilterColumn] = useState<string | null>(null)
  const filterRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchData()
  }, [startDate, endDate, lastUpdate])

  // Close filter popup when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setActiveFilterColumn(null)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      // Convert local date strings to ISO timestamps (UTC) to respect user's timezone
      const start = startOfDay(parseISO(startDate)).toISOString()
      const end = endOfDay(parseISO(endDate)).toISOString()
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone

      const { data: events, error } = await getTeamDashboardData(start, end, timezone)
      if (error) {
        console.error(error)
      } else {
        setData(events || [])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleFilter = (filter: string) => {
    setActiveFilter(filter)
    const now = new Date()
    let start = now
    let end = now

    switch (filter) {
      case 'Today':
        start = now
        end = now
        break
      case 'Yesterday':
        start = subDays(now, 1)
        end = subDays(now, 1)
        break
      case 'Last 7 Days':
        start = subDays(now, 6)
        end = now
        break
      case 'This Week':
        start = startOfWeek(now, { weekStartsOn: 1 })
        end = endOfWeek(now, { weekStartsOn: 1 })
        break
      case 'Last 14 Days':
        start = subDays(now, 13)
        end = now
        break
    }

    setStartDate(format(start, 'yyyy-MM-dd'))
    setEndDate(format(end, 'yyyy-MM-dd'))
  }

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    return `${h}:${m.toString().padStart(2, '0')}`
  }

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  
  const formatDate = (dateStr: string) => {
      return new Date(dateStr).toLocaleDateString()
  }

  const getFilteredData = () => {
    return data.filter(row => {
      return Object.entries(filters).every(([key, value]) => {
        if (!value) return true
        
        if (['date', 'clockIn', 'clockOut'].includes(key)) {
             const val = row[key as keyof DashboardEvent]
             if (!val || typeof val !== 'string') return false
             
             const d = new Date(val)
             const year = d.getFullYear()
             const month = String(d.getMonth() + 1).padStart(2, '0')
             const day = String(d.getDate()).padStart(2, '0')
             const rowDateYMD = `${year}-${month}-${day}`
             return rowDateYMD === value
        }

        let cellValue = ''
        switch(key) {
          case 'member': cellValue = row.member; break;
          case 'email': cellValue = row.email; break;
          case 'hours': cellValue = formatDuration(row.hours); break;
          case 'status': cellValue = row.status; break;
          default: return true
        }
        
        if (['hours', 'status'].includes(key)) {
            return cellValue.toLowerCase() === value.toLowerCase()
        }
        
        return cellValue.toLowerCase().includes(value.toLowerCase())
      })
    })
  }

  const filteredData = getFilteredData()

  const clearFilter = (key: string) => {
    const newFilters = { ...filters }
    delete newFilters[key]
    setFilters(newFilters)
  }

  return (
    <div className="mb-8 md:mb-12">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        {/* Header with Title and Filters */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <div className="flex items-center gap-2">
            <div className="bg-th-accent/10 rounded-lg p-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-th-accent">
                <path d="M3 3v18h18"/>
                <path d="m19 9-5 5-4-4-3 3"/>
              </svg>
            </div>
            <h3 className="text-xl font-bold text-th-dark">Team Activity Report</h3>
          </div>
          
          {/* Date Filter Buttons */}
          <div className="flex flex-wrap gap-2">
            {['Today', 'Yesterday', 'Last 7 Days', 'This Week', 'Last 14 Days'].map((f) => (
              <button 
                key={f}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeFilter === f 
                    ? 'bg-th-accent text-white shadow-sm' 
                    : 'bg-th-light text-th-dark hover:bg-gray-200'
                }`}
                onClick={() => handleFilter(f)}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Date Range (collapsible or always visible) */}
        <div className="mb-6 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm text-th-dark">Custom Date Range:</span>
            <input 
              type="date" 
              className="input input-bordered input-sm focus:border-th-accent focus:ring-th-accent" 
              value={startDate}
              onChange={(e) => {
                  setStartDate(e.target.value)
                  setActiveFilter('Custom')
              }}
            />
            <span className="text-sm text-gray-500">to</span>
            <input 
              type="date" 
              className="input input-bordered input-sm focus:border-th-accent focus:ring-th-accent" 
              value={endDate}
              onChange={(e) => {
                  setEndDate(e.target.value)
                  setActiveFilter('Custom')
              }}
            />
            <button className="btn btn-sm bg-th-accent hover:bg-th-accent/90 text-white border-none" onClick={fetchData}>Apply</button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="table w-full">
            <thead>
              <tr className="border-b border-gray-200">
                {COLUMNS.map((col) => (
                  <th key={col.key} className="bg-transparent font-bold text-th-dark text-sm relative group py-4">
                    <div className="flex items-center gap-2">
                      <span>{col.label}</span>
                      {col.filterable && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation()
                            setActiveFilterColumn(activeFilterColumn === col.key ? null : col.key)
                          }}
                          className={`btn btn-ghost btn-xs p-0.5 ${filters[col.key] ? 'text-th-accent' : 'text-gray-400 opacity-0 group-hover:opacity-100'}`}
                        >
                          <Filter size={12} />
                        </button>
                      )}
                    </div>

                    {/* Filter Popup */}
                    {activeFilterColumn === col.key && (
                      <div 
                        ref={filterRef}
                        className="absolute top-full left-0 mt-2 z-50 bg-white shadow-xl border border-gray-100 rounded-lg p-3 w-56 md:w-64"
                      >
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold opacity-70 text-th-dark">Filter {col.label}</span>
                            <button 
                              onClick={() => setActiveFilterColumn(null)} 
                              className="btn btn-ghost btn-xs btn-circle"
                            >
                              <X size={14} />
                            </button>
                          </div>
                          
                          <select className="select select-bordered select-xs w-full focus:border-th-accent focus:ring-th-accent" disabled>
                            <option>{['date', 'hours', 'clockIn', 'clockOut', 'status'].includes(col.key) ? 'Equals' : 'Contains'}</option>
                          </select>
                          
                          {['date', 'clockIn', 'clockOut'].includes(col.key) ? (
                             <input 
                                type="date" 
                                className="input input-bordered input-sm w-full focus:border-th-accent focus:ring-th-accent"
                                autoFocus
                                value={filters[col.key] || ''}
                                onChange={(e) => setFilters({ ...filters, [col.key]: e.target.value })}
                              />
                          ) : (
                              <input 
                                type="text" 
                                placeholder="Filter..." 
                                className="input input-bordered input-sm w-full focus:border-th-accent focus:ring-th-accent"
                                autoFocus
                                value={filters[col.key] || ''}
                                onChange={(e) => setFilters({ ...filters, [col.key]: e.target.value })}
                              />
                          )}
                          
                          <div className="flex justify-end gap-2 mt-1">
                            <button 
                              className="btn btn-xs btn-ghost text-gray-500"
                              onClick={() => {
                                clearFilter(col.key)
                                setActiveFilterColumn(null)
                              }}
                            >
                              Clear
                            </button>
                            <button 
                              className="btn btn-xs bg-th-accent hover:bg-th-accent/90 text-white border-none"
                              onClick={() => setActiveFilterColumn(null)}
                            >
                              Close
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12">
                    <span className="loading loading-spinner loading-md text-th-accent"></span>
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-gray-500">
                    {data.length === 0 ? 'No activity found for this period.' : 'No records match your filters.'}
                  </td>
                </tr>
              ) : (
                filteredData.map((row) => (
                  <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-4 text-gray-600">{formatDate(row.date)}</td>
                    <td className="font-semibold text-th-dark">
                      <Link href={`/timesheet/${row.userId}`} className="hover:text-th-accent transition-colors">
                        {row.member}
                      </Link>
                    </td>
                    <td className="text-gray-500 text-sm">{row.email}</td>
                    <td className="font-medium text-th-dark">{formatDuration(row.hours)}</td>
                    <td className="text-gray-600">{formatTime(row.clockIn)}</td>
                    <td className="text-gray-600">{formatTime(row.clockOut)}</td>
                    <td>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        row.status === 'Completed' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="text-gray-600">{row.tickets}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

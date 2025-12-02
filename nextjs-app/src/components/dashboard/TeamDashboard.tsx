
'use client'

import { useState, useEffect, useRef } from 'react'
import { format, subDays, startOfWeek, endOfWeek, startOfDay, endOfDay, parseISO } from 'date-fns'
import { getTeamDashboardData } from '@/lib/actions/dashboard'
import { Filter, X } from 'lucide-react'

import Link from 'next/link'

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

export default function TeamDashboard() {
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
  }, [startDate, endDate])

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
      const { data: events, error } = await getTeamDashboardData(startDate, endDate)
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
    <div className="mb-12">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold">Team Dashboard</h3>
      </div>

      <div className="card bg-base-100 shadow-lg p-6">
        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <span className="font-semibold">Date Range:</span>
            <input 
              type="date" 
              className="input input-bordered input-sm" 
              value={startDate}
              onChange={(e) => {
                  setStartDate(e.target.value)
                  setActiveFilter('Custom')
              }}
            />
            <span>to</span>
            <input 
              type="date" 
              className="input input-bordered input-sm" 
              value={endDate}
              onChange={(e) => {
                  setEndDate(e.target.value)
                  setActiveFilter('Custom')
              }}
            />
            <button className="btn btn-sm btn-outline" onClick={fetchData}>Apply Date Range</button>
          </div>

          <div className="join">
            {['Today', 'Yesterday', 'Last 7 Days', 'This Week', 'Last 14 Days'].map((f) => (
              <button 
                key={f}
                className={`join-item btn btn-sm ${activeFilter === f ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => handleFilter(f)}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto min-h-[400px]">
          <table className="table w-full">
            <thead>
              <tr>
                {COLUMNS.map((col) => (
                  <th key={col.key} className="relative group">
                    <div className="flex items-center gap-2">
                      {col.label}
                      {col.filterable && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation()
                            setActiveFilterColumn(activeFilterColumn === col.key ? null : col.key)
                          }}
                          className={`btn btn-ghost btn-xs p-0.5 ${filters[col.key] ? 'text-primary' : 'text-gray-400 opacity-0 group-hover:opacity-100'}`}
                        >
                          <Filter size={14} />
                        </button>
                      )}
                    </div>

                    {/* Filter Popup */}
                    {activeFilterColumn === col.key && (
                      <div 
                        ref={filterRef}
                        className="absolute top-full left-0 mt-2 z-50 bg-base-100 shadow-xl border border-base-200 rounded-lg p-3 w-64"
                      >
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold opacity-70">Filter {col.label}</span>
                            <button 
                              onClick={() => setActiveFilterColumn(null)} 
                              className="btn btn-ghost btn-xs btn-circle"
                            >
                              <X size={14} />
                            </button>
                          </div>
                          
                          <select className="select select-bordered select-xs w-full" disabled>
                            <option>{['date', 'hours', 'clockIn', 'clockOut', 'status'].includes(col.key) ? 'Equals' : 'Contains'}</option>
                          </select>
                          
                          {['date', 'clockIn', 'clockOut'].includes(col.key) ? (
                             <input 
                                type="date" 
                                className="input input-bordered input-sm w-full"
                                autoFocus
                                value={filters[col.key] || ''}
                                onChange={(e) => setFilters({ ...filters, [col.key]: e.target.value })}
                              />
                          ) : (
                              <input 
                                type="text" 
                                placeholder="Filter..." 
                                className="input input-bordered input-sm w-full"
                                autoFocus
                                value={filters[col.key] || ''}
                                onChange={(e) => setFilters({ ...filters, [col.key]: e.target.value })}
                              />
                          )}
                          
                          <div className="flex justify-end gap-2 mt-1">
                            <button 
                              className="btn btn-xs btn-ghost"
                              onClick={() => {
                                clearFilter(col.key)
                                setActiveFilterColumn(null)
                              }}
                            >
                              Clear
                            </button>
                            <button 
                              className="btn btn-xs btn-primary"
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
                  <td colSpan={8} className="text-center py-8">Loading...</td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8">
                    {data.length === 0 ? 'No activity found for this period.' : 'No records match your filters.'}
                  </td>
                </tr>
              ) : (
                filteredData.map((row) => (
                  <tr key={row.id}>
                    <td>{formatDate(row.date)}</td>
                    <td className="font-medium text-primary">
                      <Link href={`/timesheet/${row.userId}`} className="hover:underline">
                        {row.member}
                      </Link>
                    </td>
                    <td className="text-gray-500">{row.email}</td>
                    <td>{formatDuration(row.hours)}</td>
                    <td>{formatTime(row.clockIn)}</td>
                    <td>{formatTime(row.clockOut)}</td>
                    <td>
                      <span className={`badge ${row.isActive ? 'badge-success' : 'badge-ghost'}`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="max-w-xs truncate" title={row.tickets}>{row.tickets}</td>
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

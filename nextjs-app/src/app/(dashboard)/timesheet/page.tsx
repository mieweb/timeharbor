'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function TimesheetPage() {
  const [startDate, setStartDate] = useState('2023-10-01')
  const [endDate, setEndDate] = useState('2023-10-31')
  const [selectedPreset, setSelectedPreset] = useState('thisweek')

  // Mock data
  const userName = "Demo User"
  const userEmail = "demo@example.com"
  const totalHours = "42.5"
  const totalSessions = 15
  const averageSessionHours = "2.8"
  const workingDays = 12

  const clockIns = [
    { id: 1, date: '2023-10-25', start: '09:00 AM', end: '05:00 PM', duration: '8h 0m', team: 'Engineering', status: 'Closed' },
    { id: 2, date: '2023-10-24', start: '09:30 AM', end: '06:00 PM', duration: '8h 30m', team: 'Engineering', status: 'Reviewed' },
    { id: 3, date: '2023-10-23', start: '10:00 AM', end: '04:00 PM', duration: '6h 0m', team: 'Design', status: 'Open' },
  ]

  return (
    <div className="p-6">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/" className="btn btn-outline btn-primary">&larr; Back to Dashboard</Link>
        <h3 className="text-2xl font-bold text-base-content">
          📊 My Timesheet
        </h3>
      </div>

      {/* User Info Card */}
      <div className="card bg-base-100 shadow p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xl font-semibold text-base-content">{userName}</h4>
            <p className="text-base-content opacity-70">{userEmail}</p>
          </div>
          <div className="text-right">
            <div className="badge badge-primary badge-lg">Total Hours: {totalHours}</div>
          </div>
        </div>
      </div>

      {/* Date Filter */}
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <label className="font-medium text-base-content">Date Range:</label>
        <input 
          type="date" 
          className="input input-bordered" 
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
        <span className="opacity-60">to</span>
        <input 
          type="date" 
          className="input input-bordered" 
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />
        <div className="flex items-center gap-2">
          <button className="btn btn-sm btn-primary">Apply</button>
          {['Today', 'Yesterday', 'Last 7 Days', 'This Week', 'Last 14 Days'].map((preset) => (
            <button 
              key={preset}
              className={`btn btn-sm ${selectedPreset === preset.toLowerCase().replace(/ /g, '') ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setSelectedPreset(preset.toLowerCase().replace(/ /g, ''))}
            >
              {preset}
            </button>
          ))}
        </div>
      </div>

      {/* Clock-in Details Grid */}
      <div className="card bg-base-100 shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h5 className="text-lg font-semibold text-base-content">Clock-in Details</h5>
          <div className="flex items-center gap-2">
            <span className="text-sm text-base-content opacity-70">3 records found</span>
            <button className="btn btn-sm btn-outline btn-primary" title="Refresh Data">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
              </svg>
            </button>
            <button className="btn btn-sm btn-outline">Edit</button>
          </div>
        </div>
        
        <div className="overflow-x-auto border border-base-300 rounded-lg">
          <table className="table w-full">
            <thead>
              <tr>
                <th>Date</th>
                <th>Start Time</th>
                <th>End Time</th>
                <th>Duration</th>
                <th>Team</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {clockIns.map((entry) => (
                <tr key={entry.id}>
                  <td>{entry.date}</td>
                  <td>{entry.start}</td>
                  <td>{entry.end}</td>
                  <td>{entry.duration}</td>
                  <td>{entry.team}</td>
                  <td>
                    <span className={`badge ${
                      entry.status === 'Closed' ? 'badge-success' : 
                      entry.status === 'Reviewed' ? 'badge-info' : 'badge-ghost'
                    }`}>
                      {entry.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <div className="card bg-base-100 shadow p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{totalSessions}</div>
            <div className="text-sm text-base-content opacity-70">Total Clock-ins</div>
          </div>
        </div>
        <div className="card bg-base-100 shadow p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{averageSessionHours}</div>
            <div className="text-sm text-base-content opacity-70">Avg Clock-in Length</div>
          </div>
        </div>
        <div className="card bg-base-100 shadow p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{workingDays}</div>
            <div className="text-sm text-base-content opacity-70">Working Days</div>
          </div>
        </div>
      </div>
    </div>
  )
}


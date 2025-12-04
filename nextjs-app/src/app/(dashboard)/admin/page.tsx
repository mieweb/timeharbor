'use client'

import { useState } from 'react'

export default function AdminPage() {
  const [selectedTeam, setSelectedTeam] = useState('')
  const [selectedItems, setSelectedItems] = useState<number[]>([])
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false)

  // Mock data
  const adminTeams = [
    { _id: '1', name: 'Engineering' },
    { _id: '2', name: 'Design' },
    { _id: '3', name: 'Marketing' }
  ]

  const timeEntries = [
    { id: 1, user: 'Alice Smith', date: '2023-10-25', duration: '8h 0m', status: 'Open' },
    { id: 2, user: 'Bob Jones', date: '2023-10-25', duration: '7h 30m', status: 'Reviewed' },
    { id: 3, user: 'Charlie Brown', date: '2023-10-24', duration: '8h 0m', status: 'Closed' },
    { id: 4, user: 'Alice Smith', date: '2023-10-24', duration: '8h 0m', status: 'Open' },
  ]

  const toggleSelection = (id: number) => {
    if (selectedItems.includes(id)) {
      setSelectedItems(selectedItems.filter(item => item !== id))
    } else {
      setSelectedItems([...selectedItems, id])
    }
  }

  const selectAll = () => {
    if (selectedItems.length === timeEntries.length) {
      setSelectedItems([])
    } else {
      setSelectedItems(timeEntries.map(e => e.id))
    }
  }

  return (
    <div className="p-6">
      <div className="flex flex-col gap-4">
        <h3 className="text-xl font-semibold text-base-content">Administrative Time Entry Review</h3>

        {/* Team Selection */}
        <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
          <label htmlFor="adminTeamSelect" className="label font-medium">Select Team to Review:</label>
          <select 
            id="adminTeamSelect" 
            className="select select-bordered w-full md:w-64"
            value={selectedTeam}
            onChange={(e) => setSelectedTeam(e.target.value)}
          >
            <option value="">Choose a team...</option>
            {adminTeams.map(team => (
              <option key={team._id} value={team._id}>{team.name}</option>
            ))}
          </select>
        </div>

        {selectedTeam ? (
          <>
            {/* Batch Actions */}
            <div className="card bg-base-100 shadow p-4 mb-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex gap-2">
                  <button className="btn btn-primary btn-sm" disabled={selectedItems.length === 0}>Mark as Reviewed</button>
                  <button className="btn btn-success btn-sm" disabled={selectedItems.length === 0}>Mark as Closed</button>
                  <button className="btn btn-error btn-sm" disabled={selectedItems.length === 0}>Mark as Deleted</button>
                </div>
                <span className="text-sm text-base-content opacity-70">{selectedItems.length} items selected</span>
                {/* Help button */}
                <button 
                  className="btn btn-circle btn-ghost btn-xs" 
                  title="Help with status meanings"
                  onClick={() => setIsHelpModalOpen(true)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Data Grid (Table) */}
            <div className="overflow-x-auto border border-base-300 rounded-lg bg-base-100">
              <table className="table w-full">
                <thead>
                  <tr>
                    <th>
                      <label>
                        <input type="checkbox" className="checkbox" checked={selectedItems.length === timeEntries.length && timeEntries.length > 0} onChange={selectAll} />
                      </label>
                    </th>
                    <th>User</th>
                    <th>Date</th>
                    <th>Duration</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {timeEntries.map((entry) => (
                    <tr key={entry.id} className="hover">
                      <th>
                        <label>
                          <input 
                            type="checkbox" 
                            className="checkbox" 
                            checked={selectedItems.includes(entry.id)} 
                            onChange={() => toggleSelection(entry.id)}
                          />
                        </label>
                      </th>
                      <td>{entry.user}</td>
                      <td>{entry.date}</td>
                      <td>{entry.duration}</td>
                      <td>
                        <span className={`badge ${
                          entry.status === 'Closed' ? 'badge-success' : 
                          entry.status === 'Reviewed' ? 'badge-info' : 
                          entry.status === 'Deleted' ? 'badge-error' : 'badge-primary'
                        }`}>
                          {entry.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="alert alert-warning">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            <span>Please select a team to review time entries. You can only review teams where you are an admin or leader.</span>
          </div>
        )}
      </div>

      {/* Help Modal */}
      {isHelpModalOpen && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">Status Meanings</h3>
            <div className="space-y-3">
              <div>
                <span className="badge badge-primary">Open</span>
                <p className="text-sm mt-1">Time entry is active and being worked on</p>
              </div>
              <div>
                <span className="badge badge-info">Reviewed</span>
                <p className="text-sm mt-1">Entry has been reviewed by admin/leader</p>
              </div>
              <div>
                <span className="badge badge-success">Closed</span>
                <p className="text-sm mt-1">Entry is finalized. For volunteer projects: complete. For paid projects: may indicate compensation processed.</p>
              </div>
              <div>
                <span className="badge badge-error">Deleted</span>
                <p className="text-sm mt-1">Entry has been marked for removal</p>
              </div>
            </div>
            <div className="modal-action">
              <button className="btn" onClick={() => setIsHelpModalOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

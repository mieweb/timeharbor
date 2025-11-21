'use client'

import { useState } from 'react'
import TicketCard from './TicketCard'
import ClockControl from './ClockControl'
import { createTicket } from '@/lib/actions/tickets'

interface TicketsListProps {
  tickets: any[]
  teams: any[]
  activeEvent: any
  activeTicketId: string | null
  activeTicketStartTime: string | null
}

export default function TicketsList({ 
  tickets, 
  teams, 
  activeEvent, 
  activeTicketId,
  activeTicketStartTime 
}: TicketsListProps) {
  const [isCreating, setIsCreating] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  // Default to the team of the active event, or the first team
  const [selectedTeamId, setSelectedTeamId] = useState(activeEvent?.team_id || teams[0]?.id || '')

  const filteredTickets = tickets.filter(t => {
    const matchesTeam = selectedTeamId ? t.team_id === selectedTeamId : true
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesTeam && matchesSearch
  })

  const handleCreateSubmit = async (formData: FormData) => {
    try {
      await createTicket(formData)
      setIsCreating(false)
    } catch (error: any) {
      console.error(error)
      alert('Failed to create ticket: ' + error.message)
    }
  }

  return (
    <div className="space-y-6">
      {teams.length === 0 && (
        <div role="alert" className="alert alert-warning">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          <span>No teams found. You must join or create a team to manage tickets.</span>
          <div>
            <a href="/teams" className="btn btn-sm">Go to Teams</a>
          </div>
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <span className="text-base font-medium whitespace-nowrap">Select Team:</span>
          <select 
            className="select select-bordered select-sm w-full md:w-64"
            value={selectedTeamId}
            onChange={(e) => setSelectedTeamId(e.target.value)}
          >
            {teams.map(team => (
              <option key={team.id} value={team.id}>{team.name}</option>
            ))}
          </select>
          
          <button 
            className="btn btn-primary btn-sm"
            onClick={() => setIsCreating(!isCreating)}
          >
            {isCreating ? 'Cancel' : 'Create Ticket'}
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <input 
        type="text" 
        placeholder="Search tickets..." 
        className="input input-bordered w-full"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />

      {/* Clock Control */}
      <ClockControl teamId={selectedTeamId} activeEvent={activeEvent} />

      {/* Create Form */}
      {isCreating && (
        <div className="card bg-base-100 shadow border border-base-200">
          <div className="card-body p-4">
            <form action={handleCreateSubmit} className="flex flex-col gap-4">
              <input type="hidden" name="team_id" value={selectedTeamId} />
              
              <input 
                name="title" 
                required 
                className="input input-bordered w-full" 
                placeholder="Ticket Title (e.g., 'Create Dashboard', 'Implement Auth')" 
                autoFocus
              />
              
              <input 
                name="github_url" 
                className="input input-bordered w-full" 
                placeholder="Reference Link or Notes" 
              />
              
              <div className="flex gap-2">
                <button type="submit" className="btn btn-primary">Create</button>
                <button 
                  type="button" 
                  className="btn btn-ghost border-base-300"
                  onClick={() => setIsCreating(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tickets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {filteredTickets.map(ticket => (
          <TicketCard 
            key={ticket.id} 
            ticket={ticket} 
            activeTicketId={activeTicketId}
            activeEvent={activeEvent}
            activeTicketStartTime={activeTicketStartTime}
          />
        ))}
        
        {filteredTickets.length === 0 && (
          <div className="col-span-full text-center py-10 opacity-50">
            No tickets found.
          </div>
        )}
      </div>
    </div>
  )
}

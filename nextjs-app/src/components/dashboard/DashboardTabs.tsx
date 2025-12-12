'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, LogIn, X, Check, Copy, Loader2, Pencil, Trash2, ChevronRight } from 'lucide-react'
import RecentActivityList from './RecentActivityList'
import TeamStatus from './TeamStatus'
import TeamDashboard from './TeamDashboard'
import { useTeamStore } from '@/store/useTeamStore'
import { startTicket, stopTicket } from '@/lib/actions/clock'
import { createTicket, updateTicket, deleteTicket } from '@/lib/actions/tickets'
import { createTeamAndReturn, joinTeamAndReturn } from '@/lib/actions/teams'
import TicketTimer from './TicketTimer'
import PersonalTimesheetGrid from '@/components/timesheet/PersonalTimesheetGrid'

interface DashboardTabsProps {
  openTickets: any[]
  isTeamLeader: boolean
  recentActivity: any[]
  teamsStatus: any[]
  stats: {
    todayHours: string
    weekHours: string
    totalTeams: number
    leaderTeamsCount: number
    activeEvent?: any
  }
}

export default function DashboardTabs({ openTickets, isTeamLeader, recentActivity, teamsStatus, stats }: DashboardTabsProps) {
  const [activeTab, setActiveTab] = useState<'personal' | 'team' | 'timesheet'>('personal')
  const [activeTicketId, setActiveTicketId] = useState<string | null>(stats.activeEvent?.ticket_id || null)
  const [loadingTicketId, setLoadingTicketId] = useState<string | null>(null)
  const { setTeams, initializeSubscription, lastUpdate, selectedTeamId, teams } = useTeamStore()
  const router = useRouter()

  const filteredTickets = selectedTeamId 
    ? openTickets.filter(ticket => ticket.team_id === selectedTeamId)
    : openTickets

  const filteredActivity = selectedTeamId
    ? recentActivity.filter(activity => activity.team_id === selectedTeamId)
    : recentActivity

  // Modal States
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [isJoining, setIsJoining] = useState(false)
  const [newTeamName, setNewTeamName] = useState('')
  const [joinTeamCode, setJoinTeamCode] = useState('')
  const [joinError, setJoinError] = useState<string | null>(null)
  const [createdTeamCode, setCreatedTeamCode] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Create Ticket Modal State
  const [showCreateTicketModal, setShowCreateTicketModal] = useState(false)
  const [createTicketError, setCreateTicketError] = useState<string | null>(null)

  // Scroll ref for tickets
  const ticketsScrollRef = useRef<HTMLDivElement>(null)

  const scrollTickets = (direction: 'left' | 'right') => {
    if (ticketsScrollRef.current) {
      const scrollAmount = 320 // card width + gap
      ticketsScrollRef.current.scrollBy({
        left: direction === 'right' ? scrollAmount : -scrollAmount,
        behavior: 'smooth'
      })
    }
  }

  // Edit Ticket Modal State
  const [showEditTicketModal, setShowEditTicketModal] = useState(false)
  const [editingTicket, setEditingTicket] = useState<any>(null)
  const [editTicketError, setEditTicketError] = useState<string | null>(null)

  // Initialize store with server data
  useEffect(() => {
    setTeams(teamsStatus)
  }, [teamsStatus, setTeams])

  // Initialize realtime subscription
  useEffect(() => {
    const cleanup = initializeSubscription()
    return cleanup
  }, [initializeSubscription])

  // Refresh server components when data changes
  useEffect(() => {
    router.refresh()
  }, [lastUpdate, router])

  // Sync active ticket from server stats
  useEffect(() => {
    setActiveTicketId(stats.activeEvent?.activeTicket?.ticket_id || null)
  }, [stats.activeEvent])

  const handleCreateTicketSubmit = async (formData: FormData) => {
    setCreateTicketError(null)
    try {
      await createTicket(formData)
      setShowCreateTicketModal(false)
      router.refresh()
    } catch (error: any) {
      console.error(error)
      setCreateTicketError(error.message)
    }
  }

  const handleEditTicketSubmit = async (formData: FormData) => {
    setEditTicketError(null)
    try {
      await updateTicket(formData)
      setShowEditTicketModal(false)
      setEditingTicket(null)
      router.refresh()
    } catch (error: any) {
      console.error(error)
      setEditTicketError(error.message)
    }
  }

  const handleDeleteTicket = async (ticketId: string) => {
    if (!confirm('Are you sure you want to delete this ticket? This action cannot be undone.')) return
    
    try {
      await deleteTicket(ticketId)
      router.refresh()
    } catch (error: any) {
      console.error(error)
      alert('Failed to delete ticket: ' + error.message)
    }
  }

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTeamName.trim()) return

    setIsCreating(true)
    try {
      const team = await createTeamAndReturn(newTeamName)
      setCreatedTeamCode(team.code)
      setNewTeamName('')
      router.refresh()
    } catch (error) {
      console.error('Failed to create team:', error)
    } finally {
      setIsCreating(false)
    }
  }

  const handleJoinTeam = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!joinTeamCode.trim()) return

    setIsJoining(true)
    setJoinError(null)
    try {
      await joinTeamAndReturn(joinTeamCode)
      setJoinTeamCode('')
      setShowJoinModal(false)
      router.refresh()
    } catch (error: any) {
      console.error('Failed to join team:', error)
      setJoinError(error.message || 'Failed to join team')
    } finally {
      setIsJoining(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const closeCreateModal = () => {
    setShowCreateModal(false)
    setCreatedTeamCode(null)
    setNewTeamName('')
    setCopied(false)
  }

  const handleStartTimer = async (ticketId: string, teamId: string) => {
    setLoadingTicketId(ticketId)
    try {
      await startTicket(ticketId, teamId)
      setActiveTicketId(ticketId)
      router.refresh()
    } catch (error) {
      console.error('Failed to start timer', error)
    } finally {
      setLoadingTicketId(null)
    }
  }

  const handleStopTimer = async (ticketId: string, teamId: string) => {
    setLoadingTicketId(ticketId)
    try {
      await stopTicket(ticketId, teamId)
      setActiveTicketId(null)
      router.refresh()
    } catch (error) {
      console.error('Failed to stop timer', error)
    } finally {
      setLoadingTicketId(null)
    }
  }

  const getPriorityClass = (priority: string) => {
    switch(priority?.toLowerCase()) {
      case 'high': return 'badge-error';
      case 'medium': return 'badge-warning';
      case 'low': return 'badge-success';
      default: return 'badge-ghost';
    }
  }

  return (
    <div>
      <div className="sticky top-16 z-40 backdrop-blur-xl pt-4 flex border-b border-gray-200 mb-4 overflow-x-auto scrollbar-hide">
        <button 
          className={`pb-2 md:pb-3 px-1 mr-4 md:mr-8 text-sm md:text-lg font-medium transition-colors relative whitespace-nowrap ${
            activeTab === 'personal' 
              ? 'text-th-accent' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('personal')}
        >
          Personal Dashboard
          {activeTab === 'personal' && (
            <div className="absolute bottom-0 left-0 w-full h-1 bg-th-accent rounded-t-full"></div>
          )}
        </button>
        <button 
          className={`pb-2 md:pb-3 px-1 mr-4 md:mr-8 text-sm md:text-lg font-medium transition-colors relative whitespace-nowrap ${
            activeTab === 'team' 
              ? 'text-th-accent' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('team')}
        >
          Team Dashboard
          {activeTab === 'team' && (
            <div className="absolute bottom-0 left-0 w-full h-1 bg-th-accent rounded-t-full"></div>
          )}
        </button>
        <button 
          className={`pb-2 md:pb-3 px-1 mr-4 md:mr-8 text-sm md:text-lg font-medium transition-colors relative whitespace-nowrap ${
            activeTab === 'timesheet' 
              ? 'text-th-accent' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('timesheet')}
        >
          Personal Timesheet
          {activeTab === 'timesheet' && (
            <div className="absolute bottom-0 left-0 w-full h-1 bg-th-accent rounded-t-full"></div>
          )}
        </button>
      </div>

      {activeTab === 'personal' && (
        <div className="space-y-8">
          <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-3 md:gap-6 mb-4 md:mb-8">
            {/* Welcome Header */}
            <div className="shrink-0">
              <h1 className="text-xl md:text-3xl font-bold mb-1 md:mb-2">Welcome Back! 👋</h1>
              <p className="text-xs md:text-base text-gray-600">Here's what's happening with your work today</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 w-full xl:w-auto">
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 border-t-4 border-t-th-accent p-2 md:p-4">
                <div className="flex items-center justify-between mb-0 md:mb-1">
                  <span className="text-[10px] md:text-xs text-gray-500 font-medium uppercase tracking-wider">Today's Hours</span>
                  <div className="bg-th-accent/80 rounded p-1 md:p-1.5 text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 md:w-4 md:h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/>
                      <polyline points="12 6 12 12 16 14"/>
                    </svg>
                  </div>
                </div>
                <div className="text-lg md:text-2xl font-bold text-th-dark">{stats.todayHours}</div>
                <div className="hidden md:flex items-center gap-1 text-[10px] md:text-xs text-green-600">
                  <span>Start tracking</span>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-100 border-t-4 border-t-th-accent p-2 md:p-4">
                <div className="flex items-center justify-between mb-0 md:mb-1">
                  <span className="text-[10px] md:text-xs text-gray-500 font-medium uppercase tracking-wider">This Week</span>
                  <div className="bg-th-accent/80 rounded p-1 md:p-1.5 text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 md:w-4 md:h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 3v18h18"/>
                      <path d="m19 9-5 5-4-4-3 3"/>
                    </svg>
                  </div>
                </div>
                <div className="text-lg md:text-2xl font-bold text-th-dark">{stats.weekHours}</div>
                <div className="hidden md:flex items-center gap-1 text-[10px] md:text-xs text-green-600">
                  <span>+15% last week</span>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-100 border-t-4 border-t-th-accent p-2 md:p-4">
                <div className="flex items-center justify-between mb-0 md:mb-1">
                  <span className="text-[10px] md:text-xs text-gray-500 font-medium uppercase tracking-wider">Open Tickets</span>
                  <div className="bg-th-accent/80 rounded p-1 md:p-1.5 text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 md:w-4 md:h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="18" height="13" x="3" y="8" rx="2" ry="2"/>
                      <path d="M12 8V4H8"/>
                      <path d="M16 4h-4"/>
                    </svg>
                  </div>
                </div>
                <div className="text-lg md:text-2xl font-bold text-th-dark">{openTickets.length}</div>
                <div className="hidden md:flex items-center gap-1 text-[10px] md:text-xs text-green-600">
                  <span>3 high priority</span>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-100 border-t-4 border-t-th-accent p-2 md:p-4">
                <div className="flex items-center justify-between mb-0 md:mb-1">
                  <span className="text-[10px] md:text-xs text-gray-500 font-medium uppercase tracking-wider">Active Teams</span>
                  <div className="bg-th-accent/80 rounded p-1 md:p-1.5 text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 md:w-4 md:h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                      <circle cx="9" cy="7" r="4"/>
                      <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
                      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                    </svg>
                  </div>
                </div>
                {stats.totalTeams === 0 ? (
                  <div className="flex flex-col gap-1 mt-1">
                    <button 
                      onClick={() => setShowCreateModal(true)}
                      className="flex items-center gap-1 text-[10px] md:text-xs font-bold text-th-accent hover:text-th-accent/80 transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      Create Team
                    </button>
                    <button 
                      onClick={() => setShowJoinModal(true)}
                      className="flex items-center gap-1 text-[10px] md:text-xs font-bold text-gray-600 hover:text-th-accent transition-colors"
                    >
                      <LogIn className="w-3 h-3" />
                      Join Team
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="text-lg md:text-2xl font-bold text-th-dark">{stats.totalTeams}</div>
                    <div className="hidden md:flex items-center gap-1 text-[10px] md:text-xs text-green-600">
                      <span>{stats.leaderTeamsCount || 0} as leader</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Open Tickets Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-th-accent p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-th-dark">My Open Tickets</h3>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => scrollTickets('right')}
                  className="btn btn-sm btn-ghost btn-circle" 
                  title="Scroll Right"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => setShowCreateTicketModal(true)}
                  className="btn btn-sm bg-th-accent hover:bg-opacity-90 text-white border-none gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Create Ticket
                </button>
              </div>
            </div>

            <div 
              ref={ticketsScrollRef}
              className="flex overflow-x-auto gap-6 pb-4 snap-x scrollbar-hide"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {filteredTickets.length > 0 ? (
                filteredTickets.map((ticket) => (
                  <div key={ticket.id} className="min-w-[300px] max-w-[300px] flex-none snap-start card bg-white border border-gray-100 hover:shadow-md transition-shadow shadow-[inset_0px_4px_0px_0px_#76ABAE]">
                    <div className="card-body p-5">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="text-lg font-bold text-th-dark line-clamp-2 h-12" title={ticket.title}>{ticket.title}</h4>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => {
                              setEditingTicket(ticket)
                              setShowEditTicketModal(true)
                            }}
                            className="text-gray-400 hover:text-th-accent transition-colors"
                            title="Edit Ticket"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDeleteTicket(ticket.id)}
                            className="text-gray-400 hover:text-red-500 transition-colors"
                            title="Delete Ticket"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <span className={`badge ${getPriorityClass(ticket.priority)} badge-sm`}>{ticket.priority}</span>
                        </div>
                      </div>
                      <div className="text-xs text-gray-400 mb-3">#TKT-{ticket.id.substring(0, 8)}</div>
                      
                      <p className="text-sm text-gray-500 mb-4 line-clamp-3">
                        {ticket.description || 'No description provided for this ticket.'}
                      </p>
                      
                      <div className="flex items-center gap-2 mb-4 text-xs text-gray-500">
                        <i className="fa-solid fa-user"></i>
                        <span>{ticket.teams?.name || 'Unknown Team'}</span>
                        <span className="ml-auto">Due: Dec 12</span>
                      </div>

                      {activeTicketId === ticket.id && stats.activeEvent?.activeTicket && (
                         <div className="mb-4 flex items-center gap-2 justify-center bg-gray-50 p-2 rounded">
                            <span className="text-xs font-semibold text-gray-500">Running:</span>
                            <TicketTimer 
                                startTime={stats.activeEvent.activeTicket.start_timestamp} 
                                accumulatedTime={ticket.accumulated_time || 0} 
                            />
                         </div>
                      )}

                      <div className="flex gap-2 mt-auto">
                        {activeTicketId === ticket.id ? (
                          <button 
                            onClick={() => handleStopTimer(ticket.id, ticket.team_id)}
                            disabled={loadingTicketId === ticket.id}
                            className="btn btn-sm btn-error text-white border-none flex-1"
                          >
                            {loadingTicketId === ticket.id ? 'Stopping...' : 'Stop Timer'}
                          </button>
                        ) : (
                          <button 
                            onClick={() => handleStartTimer(ticket.id, ticket.team_id)}
                            disabled={loadingTicketId === ticket.id}
                            className="btn btn-sm bg-th-accent hover:bg-opacity-90 text-white border-none flex-1"
                          >
                            {loadingTicketId === ticket.id ? 'Starting...' : 'Start Timer'}
                          </button>
                        )}
                        <Link href={`/tickets/${ticket.id}`} className="btn btn-sm btn-outline flex-1">View Details</Link>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full text-center py-8 text-gray-500">
                  No open tickets found. <Link href="/tickets" className="text-th-accent hover:underline">Create one?</Link>
                </div>
              )}
            </div>
          </div>

          {/* Recent Activity Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-th-accent p-6">
            <h3 className="text-xl font-bold text-th-dark mb-4">Recent Activity</h3>
            <RecentActivityList activities={filteredActivity} />
          </div>
        </div>
      )}

      {activeTab === 'team' && (
        <div className="space-y-8">
            {/* Team Status Section */}
            <TeamStatus />

            {isTeamLeader ? (
                <TeamDashboard lastUpdate={lastUpdate} />
            ) : (
                <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-100">
                    <p className="text-gray-500">You are not a leader of any team.</p>
                </div>
            )}
        </div>
      )}

      {activeTab === 'timesheet' && (
        <div className="space-y-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2">My Timesheet 📊</h1>
            <p className="text-gray-600">View and manage your time entries</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <PersonalTimesheetGrid />
          </div>
        </div>
      )}

      {/* Create Team Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={closeCreateModal}
          />
          
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900">
                  {createdTeamCode ? 'Team Created! 🎉' : 'Create New Team'}
                </h3>
                <button onClick={closeCreateModal} className="text-gray-400 hover:text-gray-600">
                  <X className="w-6 h-6" />
                </button>
              </div>

              {createdTeamCode ? (
                <div className="space-y-6">
                  <p className="text-gray-600">
                    Your team has been created successfully. Share this code with your team members to let them join.
                  </p>
                  
                  <div className="relative">
                    <input 
                      type="text" 
                      readOnly 
                      value={createdTeamCode} 
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-mono text-lg text-center tracking-wider text-th-accent focus:outline-none"
                    />
                    <button 
                      onClick={() => copyToClipboard(createdTeamCode)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 hover:bg-white rounded-lg transition-colors text-gray-500 hover:text-th-accent"
                    >
                      {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
                    </button>
                  </div>

                  <button 
                    onClick={closeCreateModal}
                    className="w-full py-3 bg-th-accent text-white rounded-xl font-bold hover:bg-opacity-90 transition-all"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <form onSubmit={handleCreateTeam} className="space-y-6">
                  <div>
                    <p className="text-gray-500 mb-4">
                      Enter a name for your new team. You will be the team leader.
                    </p>
                    <input
                      type="text"
                      value={newTeamName}
                      onChange={(e) => setNewTeamName(e.target.value)}
                      placeholder="Team name"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-th-accent focus:ring-2 focus:ring-th-accent/20 outline-none transition-all text-gray-900 bg-white"
                      required
                    />
                  </div>

                  <div className="flex gap-3">
                    <button 
                      type="button" 
                      onClick={closeCreateModal}
                      className="flex-1 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-all"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      disabled={isCreating || !newTeamName.trim()}
                      className="flex-1 py-3 bg-th-accent text-white rounded-xl font-bold hover:bg-opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isCreating ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        'Create Team'
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Join Team Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => {
              setShowJoinModal(false)
              setJoinError(null)
              setJoinTeamCode('')
            }}
          />
          
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900">
                  Join a Team
                </h3>
                <button 
                  onClick={() => {
                    setShowJoinModal(false)
                    setJoinError(null)
                    setJoinTeamCode('')
                  }} 
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleJoinTeam} className="space-y-6">
                <div>
                  <p className="text-gray-500 mb-4">
                    Enter the team code or invitation link to join an existing team.
                  </p>
                  <input
                    type="text"
                    value={joinTeamCode}
                    onChange={(e) => {
                      setJoinTeamCode(e.target.value)
                      setJoinError(null)
                    }}
                    placeholder="Team code or link"
                    className={`w-full px-4 py-3 rounded-xl border ${
                      joinError ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : 'border-gray-200 focus:border-th-accent focus:ring-th-accent/20'
                    } focus:ring-2 outline-none transition-all text-gray-900 bg-white`}
                    required
                  />
                  {joinError && (
                    <p className="mt-2 text-sm text-red-500 flex items-center gap-1">
                      <X className="w-4 h-4" />
                      {joinError}
                    </p>
                  )}
                </div>

                <div className="flex gap-3">
                  <button 
                    type="button" 
                    onClick={() => {
                      setShowJoinModal(false)
                      setJoinError(null)
                      setJoinTeamCode('')
                    }}
                    className="flex-1 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={isJoining || !joinTeamCode.trim()}
                    className="flex-1 py-3 bg-th-accent text-white rounded-xl font-bold hover:bg-opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isJoining ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Joining...
                      </>
                    ) : (
                      'Join Team'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Create Ticket Modal */}
      {showCreateTicketModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setShowCreateTicketModal(false)}
          />
          
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900">
                  Create New Ticket
                </h3>
                <button 
                  onClick={() => setShowCreateTicketModal(false)} 
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {createTicketError && (
                <div className="alert alert-error text-sm py-2 mb-4">
                    <span>{createTicketError}</span>
                </div>
              )}

              <form action={handleCreateTicketSubmit} className="space-y-6">
                {selectedTeamId ? (
                    <input type="hidden" name="team_id" value={selectedTeamId} />
                ) : (
                    <div className="form-control">
                        <label className="label">
                            <span className="label-text font-medium text-gray-700">Select Team</span>
                        </label>
                        <select name="team_id" className="select select-bordered w-full bg-white text-gray-900" required defaultValue="">
                            <option value="" disabled>Select a team</option>
                            {teams.map(team => (
                                <option key={team.teamId} value={team.teamId}>{team.teamName}</option>
                            ))}
                        </select>
                    </div>
                )}

                <div className="form-control">
                    <label className="label">
                        <span className="label-text font-medium text-gray-700">Ticket Title</span>
                    </label>
                    <input 
                        name="title" 
                        type="text" 
                        placeholder="e.g. Fix login page bug" 
                        className="input input-bordered w-full bg-white text-gray-900" 
                        required 
                    />
                </div>

                <div className="form-control">
                    <label className="label">
                        <span className="label-text font-medium text-gray-700">GitHub URL (Optional)</span>
                    </label>
                    <input 
                        name="github_url" 
                        type="url" 
                        placeholder="https://github.com/..." 
                        className="input input-bordered w-full bg-white text-gray-900" 
                    />
                </div>

                <div className="flex gap-3 mt-6">
                    <button 
                        type="button" 
                        onClick={() => setShowCreateTicketModal(false)}
                        className="flex-1 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-all"
                    >
                        Cancel
                    </button>
                    <button 
                        type="submit" 
                        className="flex-1 py-3 bg-th-accent text-white rounded-xl font-bold hover:bg-opacity-90 transition-all"
                    >
                        Create Ticket
                    </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Ticket Modal */}
      {showEditTicketModal && editingTicket && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => {
              setShowEditTicketModal(false)
              setEditingTicket(null)
            }}
          />
          
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900">
                  Edit Ticket
                </h3>
                <button 
                  onClick={() => {
                    setShowEditTicketModal(false)
                    setEditingTicket(null)
                  }} 
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {editTicketError && (
                <div className="alert alert-error text-sm py-2 mb-4">
                    <span>{editTicketError}</span>
                </div>
              )}

              <form action={handleEditTicketSubmit} className="space-y-6">
                <input type="hidden" name="ticket_id" value={editingTicket.id} />
                
                <div className="form-control">
                    <label className="label">
                        <span className="label-text font-medium text-gray-700">Ticket Title</span>
                    </label>
                    <input 
                        name="title" 
                        type="text" 
                        defaultValue={editingTicket.title}
                        placeholder="e.g. Fix login page bug" 
                        className="input input-bordered w-full bg-white text-gray-900" 
                        required 
                    />
                </div>

                <div className="form-control">
                    <label className="label">
                        <span className="label-text font-medium text-gray-700">GitHub URL (Optional)</span>
                    </label>
                    <input 
                        name="github_url" 
                        type="url" 
                        defaultValue={editingTicket.github_url}
                        placeholder="https://github.com/..." 
                        className="input input-bordered w-full bg-white text-gray-900" 
                    />
                </div>

                <div className="flex gap-3 mt-6">
                    <button 
                        type="button" 
                        onClick={() => {
                          setShowEditTicketModal(false)
                          setEditingTicket(null)
                        }}
                        className="flex-1 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-all"
                    >
                        Cancel
                    </button>
                    <button 
                        type="submit" 
                        className="flex-1 py-3 bg-th-accent text-white rounded-xl font-bold hover:bg-opacity-90 transition-all"
                    >
                        Save Changes
                    </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

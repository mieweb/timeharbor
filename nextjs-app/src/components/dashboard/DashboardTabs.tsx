'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, LogIn, X, Check, Copy, Loader2 } from 'lucide-react'
import RecentActivityList from './RecentActivityList'
import TeamStatus from './TeamStatus'
import TeamDashboard from './TeamDashboard'
import { useTeamStore } from '@/store/useTeamStore'
import { startTicket, stopTicket } from '@/lib/actions/clock'
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
  const { setTeams, initializeSubscription, lastUpdate, selectedTeamId } = useTeamStore()
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
      <div className="flex border-b border-gray-200 mb-6">
        <button 
          className={`pb-3 px-1 mr-8 text-lg font-medium transition-colors relative ${
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
          className={`pb-3 px-1 mr-8 text-lg font-medium transition-colors relative ${
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
          className={`pb-3 px-1 mr-8 text-lg font-medium transition-colors relative ${
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
          {/* Welcome Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2">Welcome Back! 👋</h1>
            <p className="text-gray-600">Here's what's happening with your work today</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 border-t-4 border-t-th-accent p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-gray-500">Today's Hours</span>
                <div className="bg-th-accent/80 rounded-lg p-2 text-white">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                  </svg>
                </div>
              </div>
              <div className="text-3xl font-bold mb-1 text-th-dark">{stats.todayHours}</div>
              <div className="flex items-center gap-1 text-sm text-green-600">
                <span>Start tracking</span>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 border-t-4 border-t-th-accent p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-gray-500">This Week</span>
                <div className="bg-th-accent/80 rounded-lg p-2 text-white">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 3v18h18"/>
                    <path d="m19 9-5 5-4-4-3 3"/>
                  </svg>
                </div>
              </div>
              <div className="text-3xl font-bold mb-1 text-th-dark">{stats.weekHours}</div>
              <div className="flex items-center gap-1 text-sm text-green-600">
                <span>+15% last week</span>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 border-t-4 border-t-th-accent p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-gray-500">Open Tickets</span>
                <div className="bg-th-accent/80 rounded-lg p-2 text-white">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="18" height="13" x="3" y="8" rx="2" ry="2"/>
                    <path d="M12 8V4H8"/>
                    <path d="M16 4h-4"/>
                  </svg>
                </div>
              </div>
              <div className="text-3xl font-bold mb-1 text-th-dark">{openTickets.length}</div>
              <div className="flex items-center gap-1 text-sm text-green-600">
                <span>3 high priority</span>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 border-t-4 border-t-th-accent p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-gray-500">Active Teams</span>
                <div className="bg-th-accent/80 rounded-lg p-2 text-white">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                </div>
              </div>
              {stats.totalTeams === 0 ? (
                <div className="flex flex-col gap-2 mt-2">
                  <button 
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 text-sm font-bold text-th-accent hover:text-th-accent/80 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Create Team
                  </button>
                  <button 
                    onClick={() => setShowJoinModal(true)}
                    className="flex items-center gap-2 text-sm font-bold text-gray-600 hover:text-th-accent transition-colors"
                  >
                    <LogIn className="w-4 h-4" />
                    Join Team
                  </button>
                </div>
              ) : (
                <>
                  <div className="text-3xl font-bold mb-1 text-th-dark">{stats.totalTeams}</div>
                  <div className="flex items-center gap-1 text-sm text-green-600">
                    <span>{stats.leaderTeamsCount || 0} as leader</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Open Tickets Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-th-accent p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-th-dark">My Open Tickets</h3>
              <div className="join">
                
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {filteredTickets.length > 0 ? (
                filteredTickets.map((ticket) => (
                  <div key={ticket.id} className="card bg-white border border-gray-100 hover:shadow-md transition-shadow shadow-[inset_0px_4px_0px_0px_#76ABAE]">
                    <div className="card-body p-5">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="text-lg font-bold text-th-dark line-clamp-2 h-12" title={ticket.title}>{ticket.title}</h4>
                        <span className={`badge ${getPriorityClass(ticket.priority)} badge-sm`}>{ticket.priority}</span>
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
    </div>
  )
}

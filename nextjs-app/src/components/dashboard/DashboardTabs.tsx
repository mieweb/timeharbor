'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import RecentActivityList from './RecentActivityList'
import TeamStatus from './TeamStatus'
import TeamDashboard from './TeamDashboard'
import { useTeamStore } from '@/store/useTeamStore'

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
  }
}

export default function DashboardTabs({ openTickets, isTeamLeader, recentActivity, teamsStatus, stats }: DashboardTabsProps) {
  const [activeTab, setActiveTab] = useState<'personal' | 'team'>('personal')
  const { setTeams, initializeSubscription, lastUpdate } = useTeamStore()
  const router = useRouter()

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
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 shadow-[inset_4px_0px_0px_0px_#76ABAE] p-6">
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

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 shadow-[inset_4px_0px_0px_0px_#76ABAE] p-6">
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

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 shadow-[inset_4px_0px_0px_0px_#76ABAE] p-6">
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

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 shadow-[inset_4px_0px_0px_0px_#76ABAE] p-6">
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
              <div className="text-3xl font-bold mb-1 text-th-dark">{stats.totalTeams}</div>
              <div className="flex items-center gap-1 text-sm text-green-600">
                <span>{stats.leaderTeamsCount || 0} as leader</span>
              </div>
            </div>
          </div>

          {/* Open Tickets Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-th-dark">My Open Tickets</h3>
              <div className="join">
                
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {openTickets.length > 0 ? (
                openTickets.map((ticket) => (
                  <div key={ticket.id} className="card bg-white border border-gray-100 hover:shadow-md transition-shadow shadow-[inset_0px_4px_0px_0px_#76ABAE]">
                    <div className="card-body p-5">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold text-th-dark line-clamp-2 h-12" title={ticket.title}>{ticket.title}</h4>
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

                      <div className="flex gap-2 mt-auto">
                        <Link href="/tickets" className="btn btn-sm bg-th-accent hover:bg-opacity-90 text-white border-none flex-1">Start Timer</Link>
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
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-xl font-bold text-th-dark mb-4">Recent Activity</h3>
            <RecentActivityList activities={recentActivity} />
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
    </div>
  )
}

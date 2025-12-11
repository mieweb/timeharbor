'use client'

import { useState } from 'react'
import Link from 'next/link'
import RecentActivityList from './RecentActivityList'
import TeamStatus from './TeamStatus'
import TeamDashboard from './TeamDashboard'

interface DashboardTabsProps {
  openTickets: any[]
  isTeamLeader: boolean
  recentActivity: any[]
  teamsStatus: any[]
}

export default function DashboardTabs({ openTickets, isTeamLeader, recentActivity, teamsStatus }: DashboardTabsProps) {
  const [activeTab, setActiveTab] = useState<'personal' | 'team'>('personal')

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
            <TeamStatus teams={teamsStatus} />

            {isTeamLeader ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h3 className="text-xl font-semibold mb-4">Team Dashboard</h3>
                    <TeamDashboard />
                </div>
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

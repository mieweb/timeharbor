import { createClient } from '@/lib/supabase/server'
import { getDashboardStats, getOpenTickets, getOpenTicketsCount } from '@/lib/data'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import DashboardTabs from '@/components/dashboard/DashboardTabs'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const stats = await getDashboardStats()
  const openTickets = await getOpenTickets()
  const openTicketsCount = await getOpenTicketsCount()
  
  if (!stats) return <div>Loading...</div>

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="mb-8">
        <h2 className="text-4xl font-bold text-th-dark mb-2 flex items-center gap-2">
          Welcome Back! <span className="text-4xl">👋</span>
        </h2>
        <p className="text-gray-500 text-lg">
          Here's what's happening with your work today
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Today's Hours */}
        <div className="card bg-white shadow-sm border border-gray-100 p-6">
          <div className="flex justify-between items-start mb-4">
            <span className="text-gray-500 font-medium">Today's Hours</span>
            <div className="p-2 bg-th-accent/10 rounded-lg text-th-accent">
              <i className="fa-regular fa-clock"></i>
            </div>
          </div>
          <div className="text-3xl font-bold text-th-dark mb-2">{stats.todayHours}</div>
          <Link href="/tickets" className="text-sm text-th-accent hover:underline text-left">Start tracking</Link>
        </div>

        {/* This Week */}
        <div className="card bg-white shadow-sm border border-gray-100 p-6">
          <div className="flex justify-between items-start mb-4">
            <span className="text-gray-500 font-medium">This Week</span>
            <div className="p-2 bg-green-50 rounded-lg text-green-500">
              <i className="fa-solid fa-chart-simple"></i>
            </div>
          </div>
          <div className="text-3xl font-bold text-th-dark mb-2">{stats.weekHours}</div>
          <div className="text-sm text-success">+15% last week</div>
        </div>

        {/* Open Tickets */}
        <div className="card bg-white shadow-sm border border-gray-100 p-6">
          <div className="flex justify-between items-start mb-4">
            <span className="text-gray-500 font-medium">Open Tickets</span>
            <div className="p-2 bg-yellow-50 rounded-lg text-yellow-500">
              <i className="fa-solid fa-ticket"></i>
            </div>
          </div>
          <div className="text-3xl font-bold text-th-dark mb-2">{openTicketsCount}</div>
          <div className="text-sm text-th-accent">3 high priority</div>
        </div>

        {/* Active Teams */}
        <div className="card bg-white shadow-sm border border-gray-100 p-6">
          <div className="flex justify-between items-start mb-4">
            <span className="text-gray-500 font-medium">Active Teams</span>
            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-500">
              <i className="fa-solid fa-users"></i>
            </div>
          </div>
          <div className="text-3xl font-bold text-th-dark mb-2">{stats.totalTeams}</div>
          <div className="text-sm text-th-accent">2 as leader</div>
        </div>
      </div>

      <DashboardTabs 
        openTickets={openTickets} 
        isTeamLeader={stats.isTeamLeader}
        recentActivity={stats.recentActivity}
        teamsStatus={stats.teamsStatus}
      />
    </div>
  )
}

'use client'

import { useState } from 'react'
import { createTeam, joinTeam } from '@/lib/actions/teams'
import Link from 'next/link'

interface Team {
  id: string
  name: string
  code: string
  role: string
  memberCount?: number
}

export default function TeamsList({ teams, userId }: { teams: Team[], userId: string }) {
  const [showCreate, setShowCreate] = useState(false)
  const [showJoin, setShowJoin] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCreate(formData: FormData) {
    try {
      await createTeam(formData)
      setShowCreate(false)
    } catch (e: any) {
      if (e.message === 'NEXT_REDIRECT') return
      setError(e.message)
    }
  }

  async function handleJoin(formData: FormData) {
    try {
      await joinTeam(formData)
      setShowJoin(false)
    } catch (e: any) {
      if (e.message === 'NEXT_REDIRECT') return
      setError(e.message)
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Teams</h1>
        <p className="text-gray-500 dark:text-gray-400">Manage and collaborate with your teams</p>
      </div>
      
      {error && (
        <div className="alert alert-error mb-6 text-sm">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="btn btn-xs btn-ghost">✕</button>
        </div>
      )}

      <div className="flex flex-wrap gap-4 mb-8">
        <button 
          onClick={() => { setShowCreate(true); setShowJoin(false); setError(null) }} 
          className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors shadow-sm"
        >
          + Create Team
        </button>
        <button 
          onClick={() => { setShowJoin(true); setShowCreate(false); setError(null) }} 
          className="px-6 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium rounded-lg transition-colors"
        >
          Join Team
        </button>
      </div>

      {showCreate && (
        <form action={handleCreate} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8 max-w-md">
          <h4 className="font-bold text-lg mb-4">Create New Team</h4>
          <div className="flex flex-col gap-4">
            <input type="text" name="name" placeholder="Team Name" className="input input-bordered w-full" required />
            <div className="flex gap-3">
              <button type="submit" className="btn bg-indigo-600 hover:bg-indigo-700 text-white border-none flex-1">Create</button>
              <button type="button" onClick={() => setShowCreate(false)} className="btn btn-ghost flex-1">Cancel</button>
            </div>
          </div>
        </form>
      )}

      {showJoin && (
        <form action={handleJoin} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8 max-w-md">
          <h4 className="font-bold text-lg mb-4">Join Existing Team</h4>
          <div className="flex flex-col gap-4">
            <input type="text" name="code" placeholder="Enter Team Code" className="input input-bordered w-full" required />
            <div className="flex gap-3">
              <button type="submit" className="btn bg-indigo-600 hover:bg-indigo-700 text-white border-none flex-1">Join</button>
              <button type="button" onClick={() => setShowJoin(false)} className="btn btn-ghost flex-1">Cancel</button>
            </div>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {teams.map(team => (
          <div key={team.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 flex flex-col h-full hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white truncate pr-2">{team.name}</h3>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                ['leader', 'admin'].includes(team.role) 
                  ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' 
                  : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
              }`}>
                {team.role === 'leader' || team.role === 'admin' ? 'Leader' : 'Member'}
              </span>
            </div>
            
            <div className="mb-6 flex-grow">
              <div className="font-mono text-sm text-gray-500 dark:text-gray-400 mb-4">
                Code: {team.code}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">
                {team.memberCount || 1} members • 0 hours this week
              </div>
            </div>

            <Link 
              href={`/teams?id=${team.id}`} 
              className="w-full py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/40 dark:text-indigo-300 font-medium rounded-lg text-center transition-colors"
            >
              View Team
            </Link>
          </div>
        ))}
        
        {teams.length === 0 && !showCreate && !showJoin && (
          <div className="col-span-full text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
            <p className="text-gray-500 dark:text-gray-400 mb-4">You haven't joined any teams yet.</p>
            <button 
              onClick={() => setShowCreate(true)} 
              className="text-indigo-600 hover:text-indigo-700 font-medium"
            >
              Create a team to get started
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

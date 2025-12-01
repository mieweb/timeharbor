'use client'

import { useState } from 'react'
import { createTeam, joinTeam } from '@/lib/actions/teams'
import Link from 'next/link'

interface Team {
  id: string
  name: string
  code: string
  role: string
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
    <div className="p-6">
      <h3 className="text-xl font-semibold mb-4">Teams</h3>
      
      {error && (
        <div className="alert alert-error mb-4">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="btn btn-xs btn-ghost">✕</button>
        </div>
      )}

      <div className="flex gap-4 mb-4">
        <button 
          onClick={() => { setShowCreate(true); setShowJoin(false); setError(null) }} 
          className="btn btn-primary"
        >
          Create Team
        </button>
        <button 
          onClick={() => { setShowJoin(true); setShowCreate(false); setError(null) }} 
          className="btn btn-neutral"
        >
          Join Team
        </button>
      </div>

      {showCreate && (
        <form action={handleCreate} className="card bg-base-100 shadow p-4 mb-4 flex flex-col gap-2 max-w-md">
          <h4 className="font-bold">Create New Team</h4>
          <input type="text" name="name" placeholder="Team Name" className="input input-bordered" required />
          <div className="flex gap-2 mt-2">
            <button type="submit" className="btn btn-primary">Create</button>
            <button type="button" onClick={() => setShowCreate(false)} className="btn btn-outline">Cancel</button>
          </div>
        </form>
      )}

      {showJoin && (
        <form action={handleJoin} className="card bg-base-100 shadow p-4 mb-4 flex flex-col gap-2 max-w-md">
          <h4 className="font-bold">Join Existing Team</h4>
          <input type="text" name="code" placeholder="Enter Team Code" className="input input-bordered" required />
          <div className="flex gap-2 mt-2">
            <button type="submit" className="btn btn-neutral">Join</button>
            <button type="button" onClick={() => setShowJoin(false)} className="btn btn-outline">Cancel</button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {teams.map(team => (
          <div key={team.id} className="card bg-base-100 shadow hover:shadow-md transition-shadow">
            <div className="card-body p-4">
              <div className="flex items-start justify-between gap-2">
                <Link href={`/teams?id=${team.id}`} className="card-title text-lg hover:text-primary">
                  {team.name}
                </Link>
                {['leader', 'admin'].includes(team.role) && (
                  <div className="badge badge-outline">{team.role}</div>
                )}
              </div>
              <p className="text-sm text-gray-500">Code: {team.code}</p>
            </div>
          </div>
        ))}
        {teams.length === 0 && !showCreate && !showJoin && (
          <div className="col-span-full text-center py-8 text-gray-500">
            You haven't joined any teams yet. Create or join one to get started!
          </div>
        )}
      </div>
    </div>
  )
}

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
    <div className="p-4 md:p-6">
      <h3 className="text-lg md:text-xl font-semibold mb-4">Teams</h3>
      
      {error && (
        <div className="alert alert-error mb-4 text-sm">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="btn btn-xs btn-ghost">✕</button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-2 md:gap-4 mb-4">
        <button 
          onClick={() => { setShowCreate(true); setShowJoin(false); setError(null) }} 
          className="btn btn-primary btn-sm md:btn-md w-full sm:w-auto"
        >
          Create Team
        </button>
        <button 
          onClick={() => { setShowJoin(true); setShowCreate(false); setError(null) }} 
          className="btn btn-neutral btn-sm md:btn-md w-full sm:w-auto"
        >
          Join Team
        </button>
      </div>

      {showCreate && (
        <form action={handleCreate} className="card bg-base-100 shadow p-4 mb-4 flex flex-col gap-2 w-full max-w-md">
          <h4 className="font-bold text-sm md:text-base">Create New Team</h4>
          <input type="text" name="name" placeholder="Team Name" className="input input-bordered input-sm md:input-md" required />
          <div className="flex gap-2 mt-2">
            <button type="submit" className="btn btn-primary btn-sm md:btn-md flex-1">Create</button>
            <button type="button" onClick={() => setShowCreate(false)} className="btn btn-outline btn-sm md:btn-md flex-1">Cancel</button>
          </div>
        </form>
      )}

      {showJoin && (
        <form action={handleJoin} className="card bg-base-100 shadow p-4 mb-4 flex flex-col gap-2 w-full max-w-md">
          <h4 className="font-bold text-sm md:text-base">Join Existing Team</h4>
          <input type="text" name="code" placeholder="Enter Team Code" className="input input-bordered input-sm md:input-md" required />
          <div className="flex gap-2 mt-2">
            <button type="submit" className="btn btn-neutral btn-sm md:btn-md flex-1">Join</button>
            <button type="button" onClick={() => setShowJoin(false)} className="btn btn-outline btn-sm md:btn-md flex-1">Cancel</button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        {teams.map(team => (
          <div key={team.id} className="card bg-base-100 shadow hover:shadow-md transition-shadow">
            <div className="card-body p-3 md:p-4">
              <div className="flex items-start justify-between gap-2">
                <Link href={`/teams?id=${team.id}`} className="card-title text-base md:text-lg hover:text-primary">
                  {team.name}
                </Link>
                {['leader', 'admin'].includes(team.role) && (
                  <div className="badge badge-outline badge-sm">{team.role}</div>
                )}
              </div>
              <p className="text-xs md:text-sm text-base-content/60">Code: {team.code}</p>
            </div>
          </div>
        ))}
        {teams.length === 0 && !showCreate && !showJoin && (
          <div className="col-span-full text-center py-8 text-base-content/60 text-sm md:text-base">
            You haven't joined any teams yet. Create or join one to get started!
          </div>
        )}
      </div>
    </div>
  )
}

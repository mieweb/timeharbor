'use client'

import Link from 'next/link'
import { useState } from 'react'

interface Profile {
  full_name: string
  email: string
  avatar_url?: string
}

interface TeamMember {
  id: string
  user_id: string
  role: string
  profiles: Profile
}

interface Team {
  id: string
  name: string
  code: string
  team_members: TeamMember[]
}

export default function TeamDetails({ team, userId }: { team: Team, userId: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(team.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="p-6">
      <div className="card bg-base-100 shadow p-6 mb-6">
        <Link href="/teams" className="btn btn-outline mb-4 w-fit">&larr; Back to Teams</Link>
        
        <h4 className="text-2xl font-bold mb-2">{team.name}</h4>
        
        <div className="flex items-center gap-2 mb-6">
          <span className="badge badge-neutral p-3">Join Code: {team.code}</span>
          <button onClick={handleCopy} className="btn btn-sm btn-outline">
            {copied ? 'Copied!' : 'Copy Code'}
          </button>
        </div>

        <h5 className="font-semibold mb-4 text-lg">Collaborators:</h5>
        <div className="flex flex-wrap gap-2">
          {team.team_members.map(member => (
            <div key={member.id} className="badge badge-lg badge-neutral gap-2 p-4">
              <div className="w-6 h-6 rounded-full bg-base-100 text-base-content flex items-center justify-center text-xs">
                {member.profiles?.full_name?.[0] || member.profiles?.email?.[0] || '?'}
              </div>
              {member.profiles?.full_name || member.profiles?.email || 'Unknown'}
              {member.role !== 'member' && <span className="text-xs opacity-70">({member.role})</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

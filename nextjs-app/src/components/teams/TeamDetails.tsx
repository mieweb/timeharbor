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

  const getDisplayName = (profile: Profile) => {
    if (profile?.full_name) return profile.full_name
    if (profile?.email) {
      const namePart = profile.email.split('@')[0]
      return namePart
        .split(/[._-]/)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ')
    }
    return 'Unknown'
  }

  return (
    <div className="p-4 md:p-6">
      <div className="card bg-base-100 shadow p-4 md:p-6 mb-4 md:mb-6">
        <Link href="/teams" className="btn btn-outline btn-sm md:btn-md mb-4 w-fit">&larr; Back to Teams</Link>
        
        <h4 className="text-xl md:text-2xl font-bold mb-2">{team.name}</h4>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-4 md:mb-6">
          <span className="badge badge-neutral p-2 md:p-3 text-xs md:text-sm">Join Code: {team.code}</span>
          <button onClick={handleCopy} className="btn btn-xs md:btn-sm btn-outline">
            {copied ? 'Copied!' : 'Copy Code'}
          </button>
        </div>

        <h5 className="font-semibold mb-3 md:mb-4 text-base md:text-lg">Collaborators:</h5>
        <div className="flex flex-wrap gap-2">
          {team.team_members.map(member => {
            const displayName = getDisplayName(member.profiles)
            return (
            <div key={member.id} className="badge badge-md md:badge-lg badge-neutral gap-2 p-3 md:p-4">
              <div className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-base-100 text-base-content flex items-center justify-center text-xs">
                {displayName[0] || '?'}
              </div>
              <span className="text-xs md:text-sm">{displayName}</span>
              {member.role !== 'member' && <span className="text-xs opacity-70">({member.role})</span>}
            </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'

type TeamMember = {
  id: string
  name: string
  email: string
  status: 'Active' | 'Offline'
}

type Team = {
  teamId: string
  teamName: string
  members: TeamMember[]
}

export default function TeamStatus({ teams }: { teams: Team[] }) {
  const [openTeams, setOpenTeams] = useState<Set<string>>(new Set())

  const toggleTeam = (teamId: string) => {
    const newOpenTeams = new Set(openTeams)
    if (newOpenTeams.has(teamId)) {
      newOpenTeams.delete(teamId)
    } else {
      newOpenTeams.add(teamId)
    }
    setOpenTeams(newOpenTeams)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-green-500'
      case 'Offline':
        return 'bg-gray-400'
      default:
        return 'bg-gray-400'
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getAvatarColor = (index: number) => {
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-yellow-500',
      'bg-indigo-500'
    ]
    return colors[index % colors.length]
  }

  return (
    <div className="bg-base-100 rounded-lg shadow p-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="bg-blue-100 rounded-full p-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
        </div>
        <h3 className="text-lg font-semibold">Team Status</h3>
      </div>

      <div className="space-y-3">
        {teams.map((team) => (
          <div key={team.teamId} className="border rounded-lg overflow-hidden">
            {/* Team Header - Clickable */}
            <button
              onClick={() => toggleTeam(team.teamId)}
              className="w-full flex items-center justify-between p-4 bg-base-200 hover:bg-base-300 transition-colors"
            >
              <div className="flex items-center gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-600">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                <div className="text-left">
                  <h4 className="font-semibold text-gray-900">{team.teamName}</h4>
                  <span className="text-xs text-gray-500">{team.members.length} {team.members.length === 1 ? 'member' : 'members'}</span>
                </div>
              </div>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`transition-transform ${openTeams.has(team.teamId) ? 'rotate-180' : ''}`}
              >
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>
            
            {/* Team Members Dropdown */}
            {openTeams.has(team.teamId) && (
              <div className="bg-base-100 border-t">
                {team.members.map((member, index) => (
                  <div key={member.id} className="flex items-center justify-between p-3 hover:bg-base-200/50 transition-colors border-b last:border-b-0">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className={`w-9 h-9 ${getAvatarColor(index)} rounded-full flex items-center justify-center text-white font-semibold text-xs`}>
                          {getInitials(member.name)}
                        </div>
                        {/* Status indicator dot */}
                        <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 ${getStatusColor(member.status)} rounded-full border-2 border-white`}></div>
                      </div>
                      <div>
                        <div className="font-medium text-sm">{member.name}</div>
                        <div className="text-xs text-gray-500">{member.email}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 ${getStatusColor(member.status)} rounded-full`}></div>
                      <span className={`text-xs font-medium ${member.status === 'Active' ? 'text-green-600' : 'text-gray-500'}`}>
                        {member.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        {teams.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p>No team members found</p>
          </div>
        )}
      </div>
    </div>
  )
}

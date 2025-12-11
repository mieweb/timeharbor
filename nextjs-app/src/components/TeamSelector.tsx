'use client'

import { useState, useEffect } from 'react'
import { ChevronRight, Plus, LogIn, X, Check, Users } from 'lucide-react'
import { useTeamStore } from '@/store/useTeamStore'
import Link from 'next/link'

interface Team {
  teamId: string
  teamName: string
  role: string
}

interface TeamSelectorProps {
  userTeams: Team[]
}

export default function TeamSelector({ userTeams }: TeamSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const { selectedTeamId, setSelectedTeamId } = useTeamStore()
  
  // Initialize with the first team if available
  useEffect(() => {
    if (userTeams && userTeams.length > 0 && !selectedTeamId) {
      setSelectedTeamId(userTeams[0].teamId)
    }
  }, [userTeams, selectedTeamId, setSelectedTeamId])

  const selectedTeam = userTeams.find(t => t.teamId === selectedTeamId)

  if (!userTeams || userTeams.length === 0) return null

  return (
    <>
      {/* Trigger Button */}
      <button 
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors group"
      >
        <div className="text-right hidden md:block">
          <div className="text-sm font-bold text-white group-hover:text-th-accent transition-colors">
            {selectedTeam?.teamName || 'Select Team'}
          </div>
          <div className="text-xs text-gray-400 capitalize">
            {selectedTeam?.role || 'Member'}
          </div>
        </div>
        <div className="w-10 h-10 rounded-full bg-th-accent/20 flex items-center justify-center text-th-accent border border-th-accent/30">
          <Users className="w-5 h-5" />
        </div>
      </button>

      {/* Slide-over Panel */}
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setIsOpen(false)}
          />

          {/* Panel */}
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Your Teams</h2>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto">
              <p className="text-gray-500 mb-6">Switch between teams or create a new one</p>

              {/* Teams List */}
              <div className="space-y-4 mb-8">
                {userTeams.map((team) => (
                  <button
                    key={team.teamId}
                    onClick={() => {
                      setSelectedTeamId(team.teamId)
                      setIsOpen(false)
                    }}
                    className={`w-full p-4 rounded-xl border-2 text-left transition-all relative group ${
                      selectedTeamId === team.teamId 
                        ? 'border-th-accent bg-th-accent/5' 
                        : 'border-gray-100 hover:border-gray-200 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-lg text-gray-900 mb-1">{team.teamName}</h3>
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${
                            team.role === 'leader' || team.role === 'admin' ? 'bg-orange-400' : 'bg-blue-400'
                          }`} />
                          <span className="text-sm text-gray-500 capitalize">{team.role}</span>
                        </div>
                      </div>
                      {selectedTeamId === team.teamId && (
                        <div className="bg-th-accent text-white p-1 rounded-full">
                          <Check className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              <div className="border-t border-gray-100 pt-6 space-y-3">
                <Link 
                  href="/teams/create" 
                  onClick={() => setIsOpen(false)}
                  className="flex items-center justify-center gap-2 w-full p-4 bg-th-accent text-white rounded-xl font-bold hover:bg-opacity-90 transition-all shadow-sm hover:shadow-md"
                >
                  <Plus className="w-5 h-5" />
                  Create New Team
                </Link>
                
                <Link 
                  href="/teams/join" 
                  onClick={() => setIsOpen(false)}
                  className="flex items-center justify-center gap-2 w-full p-4 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 hover:border-gray-300 transition-all"
                >
                  <LogIn className="w-5 h-5" />
                  Join Existing Team
                </Link>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-100 bg-gray-50">
              <button className="flex items-center justify-center gap-2 text-gray-500 hover:text-gray-700 text-sm font-medium w-full">
                <Users className="w-4 h-4" />
                Team Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

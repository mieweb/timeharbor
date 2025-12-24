'use client'

import { useState, useEffect } from 'react'
import { ChevronRight, Plus, LogIn, X, Check, Users, Copy, Loader2 } from 'lucide-react'
import { useTeamStore } from '@/store/useTeamStore'
import Link from 'next/link'
import { createTeamAndReturn, joinTeamAndReturn } from '@/lib/actions/teams'
import { useRouter } from 'next/navigation'

interface Team {
  teamId: string
  teamName: string
  teamCode?: string
  role: string
}

interface TeamSelectorProps {
  userTeams: Team[]
}

export default function TeamSelector({ userTeams }: TeamSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [isJoining, setIsJoining] = useState(false)
  const [newTeamName, setNewTeamName] = useState('')
  const [joinTeamCode, setJoinTeamCode] = useState('')
  const [joinError, setJoinError] = useState<string | null>(null)
  const [createdTeamCode, setCreatedTeamCode] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [copiedTeamId, setCopiedTeamId] = useState<string | null>(null)
  const { selectedTeamId, setSelectedTeamId } = useTeamStore()
  const router = useRouter()
  
  // Initialize with the first team if available
  useEffect(() => {
    if (userTeams && userTeams.length > 0 && !selectedTeamId) {
      setSelectedTeamId(userTeams[0].teamId)
    }
  }, [userTeams, selectedTeamId, setSelectedTeamId])

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTeamName.trim()) return

    setIsCreating(true)
    try {
      const team = await createTeamAndReturn(newTeamName)
      setCreatedTeamCode(team.code)
      setNewTeamName('')
      router.refresh()
    } catch (error) {
      console.error('Failed to create team:', error)
    } finally {
      setIsCreating(false)
    }
  }

  const handleJoinTeam = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!joinTeamCode.trim()) return

    setIsJoining(true)
    setJoinError(null)
    try {
      const team = await joinTeamAndReturn(joinTeamCode)
      setJoinTeamCode('')
      setShowJoinModal(false)
      setSelectedTeamId(team.id)
      router.refresh()
    } catch (error: any) {
      console.error('Failed to join team:', error)
      setJoinError(error.message || 'Failed to join team')
    } finally {
      setIsJoining(false)
    }
  }

  const copyToClipboard = (text: string, teamId?: string) => {
    navigator.clipboard.writeText(text)
    if (teamId) {
      setCopiedTeamId(teamId)
      setTimeout(() => setCopiedTeamId(null), 2000)
    } else {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const closeCreateModal = () => {
    setShowCreateModal(false)
    setCreatedTeamCode(null)
    setNewTeamName('')
    setCopied(false)
  }

  const selectedTeam = userTeams.find(t => t.teamId === selectedTeamId)

  if (!userTeams || userTeams.length === 0) return null

  return (
    <>
      {/* Trigger Button */}
      <button 
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 md:gap-3 px-2 md:px-3 py-2 rounded-lg hover:bg-white/10 transition-colors group"
      >
        <div className="text-right block">
          <div className="text-xs md:text-sm font-bold text-white group-hover:text-th-accent transition-colors max-w-[100px] md:max-w-none truncate">
            {selectedTeam?.teamName || 'Select Team'}
          </div>
          <div className="text-[10px] md:text-xs text-gray-400 capitalize hidden md:block">
            {selectedTeam?.role || 'Member'}
          </div>
        </div>
        <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-th-accent/20 flex items-center justify-center text-th-accent border border-th-accent/30 shrink-0">
          <Users className="w-4 h-4 md:w-5 md:h-5" />
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
          <div className="relative w-full max-w-md bg-white h-[100dvh] shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">
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
                  <div key={team.teamId} className="relative group">
                    <button
                      onClick={() => {
                        setSelectedTeamId(team.teamId)
                        setIsOpen(false)
                      }}
                      className={`w-full p-4 rounded-xl border-2 text-left transition-all relative ${
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
                    
                    {/* Copy Code Button - Only for leaders/admins */}
                    {(team.role === 'leader' || team.role === 'admin') && team.teamCode && (
                      <div className="absolute right-4 bottom-4 z-10">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            copyToClipboard(team.teamCode!, team.teamId)
                          }}
                          className="flex items-center gap-1.5 px-2 py-1 bg-white border border-gray-200 rounded-md shadow-sm hover:bg-gray-50 text-xs font-medium text-gray-500 transition-all opacity-0 group-hover:opacity-100"
                          title="Copy Team Code"
                        >
                          {copiedTeamId === team.teamId ? (
                            <>
                              <Check className="w-3 h-3 text-green-500" />
                              <span className="text-green-600">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Code: {team.teamCode}</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-100 pt-6 space-y-3">
                <button 
                  onClick={() => {
                    setIsOpen(false)
                    setShowCreateModal(true)
                  }}
                  className="flex items-center justify-center gap-2 w-full p-4 bg-th-accent text-white rounded-xl font-bold hover:bg-opacity-90 transition-all shadow-sm hover:shadow-md"
                >
                  <Plus className="w-5 h-5" />
                  Create New Team
                </button>
                
                <button 
                  onClick={() => {
                    setIsOpen(false)
                    setShowJoinModal(true)
                  }}
                  className="flex items-center justify-center gap-2 w-full p-4 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 hover:border-gray-300 transition-all"
                >
                  <LogIn className="w-5 h-5" />
                  Join Existing Team
                </button>
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

      {/* Create Team Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={closeCreateModal}
          />
          
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900">
                  {createdTeamCode ? 'Team Created! 🎉' : 'Create New Team'}
                </h3>
                <button onClick={closeCreateModal} className="text-gray-400 hover:text-gray-600">
                  <X className="w-6 h-6" />
                </button>
              </div>

              {createdTeamCode ? (
                <div className="space-y-6">
                  <p className="text-gray-600">
                    Your team has been created successfully. Share this code with your team members to let them join.
                  </p>
                  
                  <div className="relative">
                    <input 
                      type="text" 
                      readOnly 
                      value={createdTeamCode} 
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-mono text-lg text-center tracking-wider text-th-accent focus:outline-none"
                    />
                    <button 
                      onClick={() => copyToClipboard(createdTeamCode)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 hover:bg-white rounded-lg transition-colors text-gray-500 hover:text-th-accent"
                    >
                      {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
                    </button>
                  </div>

                  <button 
                    onClick={closeCreateModal}
                    className="w-full py-3 bg-th-accent text-white rounded-xl font-bold hover:bg-opacity-90 transition-all"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <form onSubmit={handleCreateTeam} className="space-y-6">
                  <div>
                    <p className="text-gray-500 mb-4">
                      Enter a name for your new team. You will be the team leader.
                    </p>
                    <input
                      type="text"
                      value={newTeamName}
                      onChange={(e) => setNewTeamName(e.target.value)}
                      placeholder="Team name"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-th-accent focus:ring-2 focus:ring-th-accent/20 outline-none transition-all text-gray-900 bg-white"
                      required
                    />
                  </div>

                  <div className="flex gap-3">
                    <button 
                      type="button" 
                      onClick={closeCreateModal}
                      className="flex-1 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-all"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      disabled={isCreating || !newTeamName.trim()}
                      className="flex-1 py-3 bg-th-accent text-white rounded-xl font-bold hover:bg-opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isCreating ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        'Create Team'
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Join Team Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => {
              setShowJoinModal(false)
              setJoinError(null)
              setJoinTeamCode('')
            }}
          />
          
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900">
                  Join a Team
                </h3>
                <button 
                  onClick={() => {
                    setShowJoinModal(false)
                    setJoinError(null)
                    setJoinTeamCode('')
                  }} 
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleJoinTeam} className="space-y-6">
                <div>
                  <p className="text-gray-500 mb-4">
                    Enter the team code or invitation link to join an existing team.
                  </p>
                  <input
                    type="text"
                    value={joinTeamCode}
                    onChange={(e) => {
                      setJoinTeamCode(e.target.value)
                      setJoinError(null)
                    }}
                    placeholder="Team code or link"
                    className={`w-full px-4 py-3 rounded-xl border ${
                      joinError ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : 'border-gray-200 focus:border-th-accent focus:ring-th-accent/20'
                    } focus:ring-2 outline-none transition-all text-gray-900 bg-white`}
                    required
                  />
                  {joinError && (
                    <p className="mt-2 text-sm text-red-500 flex items-center gap-1">
                      <X className="w-4 h-4" />
                      {joinError}
                    </p>
                  )}
                </div>

                <div className="flex gap-3">
                  <button 
                    type="button" 
                    onClick={() => {
                      setShowJoinModal(false)
                      setJoinError(null)
                      setJoinTeamCode('')
                    }}
                    className="flex-1 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={isJoining || !joinTeamCode.trim()}
                    className="flex-1 py-3 bg-th-accent text-white rounded-xl font-bold hover:bg-opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isJoining ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Joining...
                      </>
                    ) : (
                      'Join Team'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

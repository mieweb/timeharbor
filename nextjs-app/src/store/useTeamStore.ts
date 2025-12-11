import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'

export type TeamMember = {
  id: string
  name: string
  email: string
  status: 'Active' | 'Offline'
}

export type Team = {
  teamId: string
  teamName: string
  members: TeamMember[]
}

interface TeamStore {
  teams: Team[]
  lastUpdate: number
  setTeams: (teams: Team[]) => void
  updateMemberStatus: (userId: string, status: 'Active' | 'Offline') => void
  triggerUpdate: () => void
  initializeSubscription: () => () => void
}

export const useTeamStore = create<TeamStore>((set, get) => ({
  teams: [],
  lastUpdate: Date.now(),
  setTeams: (teams) => set({ teams }),
  updateMemberStatus: (userId, status) => {
    set((state) => ({
      teams: state.teams.map((team) => ({
        ...team,
        members: team.members.map((member) =>
          member.id === userId ? { ...member, status } : member
        ),
      })),
    }))
  },
  triggerUpdate: () => set({ lastUpdate: Date.now() }),
  initializeSubscription: () => {
    const supabase = createClient()
    const channel = supabase
      .channel('team-store-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'clock_events' },
        (payload) => {
          const { eventType, new: newRecord } = payload as any
          
          // 1. Update Status
          let newStatus: 'Active' | 'Offline' = 'Offline'
          
          if (eventType === 'INSERT') {
             if (!newRecord.end_timestamp) newStatus = 'Active'
          } else if (eventType === 'UPDATE') {
             if (!newRecord.end_timestamp) newStatus = 'Active'
             else newStatus = 'Offline'
          }
          
          // Only update status if we have this member
          get().updateMemberStatus(newRecord.user_id, newStatus)

          // 2. Trigger general update for other components (like Activity Report)
          get().triggerUpdate()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }
}))

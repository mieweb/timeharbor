import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'
import { useClockStore } from './useClockStore'

interface AuthState {
  loading: boolean
  logout: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  loading: false,
  logout: async () => {
    try {
      set({ loading: true })
      const supabase = createClient()
      
      // Sign out from Supabase (this handles client-side session)
      await supabase.auth.signOut()
      
      // Clear global state
      useClockStore.getState().setActiveEvent(null)
      useClockStore.getState().updateElapsedTime()
      
      // Call the server-side signout route to ensure cookies are cleared
      // This is a fallback/redundancy to ensure server state is also cleared
      await fetch('/auth/signout', {
        method: 'POST',
      })

      // Force a hard reload to clear any remaining state/cache and redirect to login
      window.location.href = '/login'
    } catch (error) {
      console.error('Logout failed:', error)
      set({ loading: false })
    }
  },
}))

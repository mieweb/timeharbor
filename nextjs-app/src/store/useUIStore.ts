import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UIState {
  isMenuOpen: boolean
  theme: 'light' | 'dark'
  toggleMenu: () => void
  setTheme: (theme: 'light' | 'dark') => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      isMenuOpen: false,
      theme: 'light',
      toggleMenu: () => set((state) => ({ isMenuOpen: !state.isMenuOpen })),
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'ui-storage', // unique name for localStorage
      partialize: (state) => ({ theme: state.theme }), // only persist theme
    }
  )
)

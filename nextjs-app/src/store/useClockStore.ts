import { create } from 'zustand'

interface ClockState {
  activeEvent: any | null
  elapsedTime: string
  setActiveEvent: (event: any | null) => void
  updateElapsedTime: () => void
}

export const useClockStore = create<ClockState>((set, get) => ({
  activeEvent: null,
  elapsedTime: '0:00:00',
  setActiveEvent: (event) => set({ activeEvent: event }),
  updateElapsedTime: () => {
    const { activeEvent } = get()
    if (!activeEvent) {
      set({ elapsedTime: '0:00:00' })
      return
    }
    
    const start = new Date(activeEvent.start_timestamp).getTime()
    const now = new Date().getTime()
    const diff = Math.floor((now - start) / 1000)
    
    const hours = Math.floor(diff / 3600)
    const minutes = Math.floor((diff % 3600) / 60)
    const seconds = diff % 60
    
    set({ 
      elapsedTime: `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}` 
    })
  }
}))

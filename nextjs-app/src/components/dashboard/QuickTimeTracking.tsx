'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'

export default function QuickTimeTracking({ 
  activeEvent, 
  onClockIn, 
  onClockOut 
}: { 
  activeEvent: any
  onClockIn: () => void
  onClockOut: () => void
}) {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [mounted, setMounted] = useState(false)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    setMounted(true)
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  // Track elapsed time when clocked in
  useEffect(() => {
    if (activeEvent) {
      const start = new Date(activeEvent.start_timestamp).getTime()
      const initialElapsed = Math.floor((Date.now() - start) / 1000) + (activeEvent.accumulated_time || 0)
      setElapsedTime(initialElapsed)

      const interval = setInterval(() => {
        setElapsedTime(prev => prev + 1)
      }, 1000)

      return () => clearInterval(interval)
    } else {
      setElapsedTime(0)
    }
  }, [activeEvent])

  const formatTime = (date: Date) => {
    const hours = date.getHours()
    const minutes = date.getMinutes()
    const seconds = date.getSeconds()
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  const formatPeriod = (date: Date) => {
    return date.getHours() >= 12 ? 'PM' : 'AM'
  }

  const formatElapsedTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const handleClockIn = async () => {
    setIsLoading(true)
    try {
      await onClockIn()
    } catch (error) {
      console.error('Clock in failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClockOut = async () => {
    setIsLoading(true)
    try {
      await onClockOut()
    } catch (error) {
      console.error('Clock out failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Prevent hydration mismatch by not rendering time until mounted
  if (!mounted) {
    return (
      <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg p-6 text-white shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="bg-white/20 rounded-full p-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
            </div>
            <h2 className="text-lg font-semibold">Quick Time Tracking</h2>
          </div>
          <div className="flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-full">
            <div className={`w-2 h-2 rounded-full ${activeEvent ? 'bg-green-400 animate-pulse' : 'bg-white/50'}`}></div>
            <span className="text-sm font-medium">{activeEvent ? 'Clocked In' : 'Ready to Clock In'}</span>
          </div>
        </div>

        <div className="flex items-end justify-between mb-6">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl md:text-6xl font-bold tabular-nums">--:--:--</span>
              <span className="text-2xl font-medium mb-1">--</span>
            </div>
            <p className="text-white/80 mt-1">Loading...</p>
          </div>

          <div className="flex gap-3">
            <button 
              onClick={handleClockIn}
              disabled={true}
              className="bg-white text-indigo-600 hover:bg-white/90 disabled:bg-white/30 disabled:text-white/50 px-6 py-3 rounded-lg font-medium flex items-center gap-2 transition-all shadow-lg hover:shadow-xl disabled:cursor-not-allowed"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
                <polyline points="10 17 15 12 10 7"/>
                <line x1="15" x2="3" y1="12" y2="12"/>
              </svg>
              Clock In
            </button>
            <button 
              onClick={handleClockOut}
              disabled={true}
              className="bg-white/20 hover:bg-white/30 disabled:bg-white/10 disabled:text-white/30 px-6 py-3 rounded-lg font-medium flex items-center gap-2 transition-all border border-white/30 disabled:cursor-not-allowed"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" x2="9" y1="12" y2="12"/>
              </svg>
              Clock Out
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg p-6 text-white shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="bg-white/20 rounded-full p-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <h2 className="text-lg font-semibold">Quick Time Tracking</h2>
        </div>
        <div className="flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-full">
          <div className={`w-2 h-2 rounded-full ${activeEvent ? 'bg-green-400 animate-pulse' : 'bg-white/50'}`}></div>
          <span className="text-sm font-medium">{activeEvent ? 'Clocked In' : 'Ready to Clock In'}</span>
        </div>
      </div>

      <div className="flex items-end justify-between mb-6">
        <div>
          {activeEvent ? (
            <>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-5xl md:text-6xl font-bold tabular-nums text-green-300">{formatElapsedTime(elapsedTime)}</span>
              </div>
              <p className="text-white/80 mt-1">Time tracked - Currently clocked in</p>
            </>
          ) : (
            <>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl md:text-6xl font-bold tabular-nums">0:00:00</span>
              </div>
              <p className="text-white/80 mt-1">Not clocked in - Click "Clock In" to start tracking</p>
            </>
          )}
        </div>

        <div className="flex gap-3">
          <button 
            onClick={handleClockIn}
            disabled={!!activeEvent || isLoading}
            className="bg-white text-indigo-600 hover:bg-white/90 disabled:bg-white/30 disabled:text-white/50 px-6 py-3 rounded-lg font-medium flex items-center gap-2 transition-all shadow-lg hover:shadow-xl disabled:cursor-not-allowed"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
              <polyline points="10 17 15 12 10 7"/>
              <line x1="15" x2="3" y1="12" y2="12"/>
            </svg>
            {isLoading ? 'Clocking In...' : 'Clock In'}
          </button>
          <button 
            onClick={handleClockOut}
            disabled={!activeEvent || isLoading}
            className="bg-white/20 hover:bg-white/30 disabled:bg-white/10 disabled:text-white/30 px-6 py-3 rounded-lg font-medium flex items-center gap-2 transition-all border border-white/30 disabled:cursor-not-allowed"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" x2="9" y1="12" y2="12"/>
            </svg>
            {isLoading ? 'Clocking Out...' : 'Clock Out'}
          </button>
        </div>
      </div>
    </div>
  )
}

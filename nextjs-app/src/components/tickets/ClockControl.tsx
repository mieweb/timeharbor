'use client'

import { useState, useEffect } from 'react'
import { startClock, stopClock } from '@/lib/actions/clock'

interface ClockControlProps {
  teamId: string
  activeEvent: any
}

export default function ClockControl({ teamId, activeEvent }: ClockControlProps) {
  const [isClockedIn, setIsClockedIn] = useState(!!activeEvent)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (activeEvent) {
      setIsClockedIn(true)
      
      const start = new Date(activeEvent.start_timestamp).getTime()
      const initialElapsed = Math.floor((Date.now() - start) / 1000) + (activeEvent.accumulated_time || 0)
      setElapsedTime(initialElapsed)

      const interval = setInterval(() => {
        setElapsedTime(prev => prev + 1)
      }, 1000)

      return () => clearInterval(interval)
    } else {
      setIsClockedIn(false)
      setElapsedTime(0)
    }
  }, [activeEvent])

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const handleClockIn = async () => {
    if (!teamId) return
    setIsLoading(true)
    try {
      await startClock(teamId)
    } catch (error) {
      console.error(error)
      alert('Failed to clock in')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClockOut = async () => {
    // If activeEvent exists, use its team_id, otherwise use passed teamId (though activeEvent should exist if clocked in)
    const idToStop = activeEvent?.team_id || teamId
    if (!idToStop) return
    
    setIsLoading(true)
    try {
      await stopClock(idToStop)
    } catch (error) {
      console.error(error)
      alert('Failed to clock out')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-4">
      {isClockedIn ? (
        <>
          <button 
            onClick={handleClockOut} 
            className="btn btn-outline text-th-accent hover:bg-th-accent hover:text-white hover:border-th-accent border-th-accent"
            disabled={isLoading}
          >
            {isLoading ? 'Clocking Out...' : 'Clock Out'}
          </button>
          <div className="flex items-center gap-2">
            <span className="text-2xl">⏱️</span>
            <span className="font-mono text-2xl font-bold text-th-dark">{formatTime(elapsedTime)}</span>
          </div>
        </>
      ) : (
        <button 
          onClick={handleClockIn} 
          className="btn btn-outline text-th-accent hover:bg-th-accent hover:text-white hover:border-th-accent border-th-accent"
          disabled={isLoading || !teamId}
        >
          {isLoading ? 'Clocking In...' : 'Clock In'}
        </button>
      )}
    </div>
  )
}

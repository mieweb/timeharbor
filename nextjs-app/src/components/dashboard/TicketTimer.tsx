'use client'
import { useState, useEffect } from 'react'

interface TicketTimerProps {
  startTime: string
  accumulatedTime: number
}

export default function TicketTimer({ startTime, accumulatedTime }: TicketTimerProps) {
  const [elapsed, setElapsed] = useState(accumulatedTime)

  useEffect(() => {
    const start = new Date(startTime).getTime()
    
    const updateElapsed = () => {
      const now = Date.now()
      const currentSessionDuration = Math.max(0, Math.floor((now - start) / 1000))
      setElapsed(accumulatedTime + currentSessionDuration)
    }

    updateElapsed()
    const interval = setInterval(updateElapsed, 1000)
    return () => clearInterval(interval)
  }, [startTime, accumulatedTime])

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  return <span className="font-mono text-th-accent font-bold text-sm">{formatTime(elapsed)}</span>
}

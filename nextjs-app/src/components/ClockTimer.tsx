'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { startClock, stopClock } from '@/lib/actions/clock'
import { useRouter } from 'next/navigation'

type ClockEvent = {
  id: string
  start_timestamp: string
  accumulated_time: number
}

export default function ClockTimer({ 
  initialEvent, 
  teamId, 
  userId 
}: { 
  initialEvent: ClockEvent | null
  teamId: string
  userId: string
}) {
  const [event, setEvent] = useState<ClockEvent | null>(initialEvent)
  const [elapsed, setElapsed] = useState(0)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    setEvent(initialEvent)
  }, [initialEvent])

  useEffect(() => {
    if (!event) {
      setElapsed(0)
      return
    }

    const updateElapsed = () => {
      const start = new Date(event.start_timestamp).getTime()
      const now = new Date().getTime()
      const currentSessionDuration = Math.floor((now - start) / 1000)
      setElapsed((event.accumulated_time || 0) + currentSessionDuration)
    }

    updateElapsed()
    const interval = setInterval(updateElapsed, 1000)

    return () => clearInterval(interval)
  }, [event])

  useEffect(() => {
    const channel = supabase
      .channel('clock_events_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'clock_events',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          router.refresh()
          
          if (payload.eventType === 'INSERT') {
             if (payload.new.team_id === teamId && !payload.new.end_timestamp) {
                 setEvent(payload.new as ClockEvent)
             }
          } else if (payload.eventType === 'UPDATE') {
             if (payload.new.id === event?.id && payload.new.end_timestamp) {
                 setEvent(null)
             }
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, userId, teamId, event, router])

  const handleStart = async () => {
    await startClock(teamId)
  }

  const handleStop = async () => {
    await stopClock(teamId)
  }

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return `${h}h ${m}m ${s}s`
  }

  if (event) {
    return (
      <div className="bg-green-50 p-4 rounded border border-green-200">
        <p className="text-green-800 font-medium mb-2">
          Clocked In: <span className="font-mono text-xl ml-2">{formatTime(elapsed)}</span>
        </p>
        <p className="text-xs text-green-600 mb-4">
          Started at {new Date(event.start_timestamp).toLocaleTimeString()}
        </p>
        <button 
            onClick={handleStop}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 w-full"
        >
          Clock Out
        </button>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 p-4 rounded border border-gray-200">
      <p className="text-gray-600 mb-2">You are currently clocked out.</p>
      <button 
        onClick={handleStart}
        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 w-full"
      >
        Clock In
      </button>
    </div>
  )
}

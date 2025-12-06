'use client'

import QuickTimeTracking from '@/components/dashboard/QuickTimeTracking'
import { startClock, stopClock } from '@/lib/actions/clock'
import { useRouter } from 'next/navigation'

export default function QuickTimeTrackingWrapper({ 
  activeEvent,
  userTeams 
}: { 
  activeEvent: any
  userTeams: any[]
}) {
  const router = useRouter()

  const handleClockIn = async () => {
    if (userTeams.length > 0) {
      try {
        await startClock(userTeams[0].team_id)
        router.refresh()
      } catch (error) {
        console.error('Failed to clock in:', error)
      }
    }
  }

  const handleClockOut = async () => {
    if (activeEvent) {
      try {
        await stopClock(activeEvent.team_id)
        router.refresh()
      } catch (error) {
        console.error('Failed to clock out:', error)
      }
    }
  }

  return (
    <QuickTimeTracking 
      activeEvent={activeEvent}
      onClockIn={handleClockIn}
      onClockOut={handleClockOut}
    />
  )
}

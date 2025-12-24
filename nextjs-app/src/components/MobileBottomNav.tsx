'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Home, Users, Ticket, User, Clock } from 'lucide-react'
import { startClock, stopClock } from '@/lib/actions/clock'

interface MobileBottomNavProps {
  user: any
  activeEvent?: any
  userTeams?: any[]
}

export default function MobileBottomNav({ user, activeEvent, userTeams }: MobileBottomNavProps) {
  const pathname = usePathname()
  const router = useRouter()

  if (!user) return null

  const handleClockAction = async () => {
    if (activeEvent) {
      try {
        await stopClock(activeEvent.team_id)
        router.refresh()
      } catch (error) {
        console.error('Failed to clock out:', error)
      }
    } else {
      if (userTeams && userTeams.length > 0) {
        try {
          const teamId = userTeams[0].teamId || userTeams[0].team_id
          await startClock(teamId)
          router.refresh()
        } catch (error) {
          console.error('Failed to clock in:', error)
        }
      } else {
        router.push('/teams')
      }
    }
  }

  const isActive = (path: string) => pathname === path

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 md:hidden pb-4">
      <div className="flex items-center justify-around h-16 px-2">
        <Link 
          href="/" 
          className={`flex flex-col items-center justify-center w-16 h-full space-y-1 ${isActive('/') ? 'text-th-accent' : 'text-gray-500'}`}
        >
          <Home className="w-6 h-6" />
          <span className="text-[10px] font-medium">Home</span>
        </Link>

        <Link 
          href="/teams" 
          className={`flex flex-col items-center justify-center w-16 h-full space-y-1 ${isActive('/teams') ? 'text-th-accent' : 'text-gray-500'}`}
        >
          <Users className="w-6 h-6" />
          <span className="text-[10px] font-medium">Teams</span>
        </Link>

        <div className="relative -top-5">
          <button
            onClick={handleClockAction}
            className={`flex items-center justify-center w-14 h-14 rounded-full shadow-lg border-4 border-white ${
              activeEvent ? 'bg-red-500' : 'bg-th-accent'
            } text-white transition-transform active:scale-95`}
          >
            <Clock className="w-6 h-6" />
          </button>
        </div>

        <Link 
          href="/tickets" 
          className={`flex flex-col items-center justify-center w-16 h-full space-y-1 ${isActive('/tickets') ? 'text-th-accent' : 'text-gray-500'}`}
        >
          <Ticket className="w-6 h-6" />
          <span className="text-[10px] font-medium">Tickets</span>
        </Link>

        <Link 
          href="/profile" 
          className={`flex flex-col items-center justify-center w-16 h-full space-y-1 ${isActive('/profile') ? 'text-th-accent' : 'text-gray-500'}`}
        >
          <User className="w-6 h-6" />
          <span className="text-[10px] font-medium">Profile</span>
        </Link>
      </div>
    </div>
  )
}

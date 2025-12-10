'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'

export default function DashboardControls() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null)

  useEffect(() => {
    setLastRefreshed(new Date())
  }, [])

  const refresh = () => {
    startTransition(() => {
      router.refresh()
      setLastRefreshed(new Date())
    })
  }

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refresh()
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="text-gray-500 hidden sm:inline">
        Updated: {lastRefreshed ? lastRefreshed.toLocaleTimeString() : '...'}
      </span>
      <button 
        onClick={refresh} 
        disabled={isPending}
        className={`flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-th-accent transition-colors shadow-sm ${isPending ? 'opacity-70 cursor-not-allowed' : ''}`}
        title="Refresh Dashboard"
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          width="16" 
          height="16" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          className={isPending ? 'animate-spin' : ''}
        >
          <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
          <path d="M3 3v5h5"/>
          <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/>
          <path d="M16 21h5v-5"/>
        </svg>
        <span>{isPending ? 'Refreshing...' : 'Refresh'}</span>
      </button>
    </div>
  )
}

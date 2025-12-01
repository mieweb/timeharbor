'use client'

import { useState, useEffect } from 'react'
import { startTicket, stopTicket } from '@/lib/actions/clock'
import { updateTicketStatus, deleteTicket } from '@/lib/actions/tickets'

interface TicketCardProps {
  ticket: any
  activeTicketId: string | null
  activeEvent: any
  activeTicketStartTime?: string | null
}

export default function TicketCard({ ticket, activeTicketId, activeEvent, activeTicketStartTime }: TicketCardProps) {
  const isActive = activeTicketId === ticket.id
  const [elapsedTime, setElapsedTime] = useState(ticket.accumulated_time || 0)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    let interval: NodeJS.Timeout

    if (isActive && activeEvent) {
      if (activeTicketStartTime) {
        const start = new Date(activeTicketStartTime).getTime()
        const initialElapsed = Math.floor((Date.now() - start) / 1000) + (ticket.accumulated_time || 0)
        setElapsedTime(initialElapsed)
      }

      interval = setInterval(() => {
        setElapsedTime((prev: number) => prev + 1)
      }, 1000)
    } else {
      setElapsedTime(ticket.accumulated_time || 0)
    }

    return () => clearInterval(interval)
  }, [isActive, activeEvent, ticket.accumulated_time, activeTicketStartTime])

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const handleStart = async () => {
    setIsLoading(true)
    try {
      await startTicket(ticket.id, ticket.team_id)
    } catch (error) {
      console.error(error)
      alert('Failed to start ticket')
    } finally {
      setIsLoading(false)
    }
  }

  const handleStop = async () => {
    setIsLoading(true)
    try {
      await stopTicket(ticket.id, ticket.team_id)
    } catch (error) {
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="card bg-base-100 shadow-sm border border-base-200 hover:shadow-md transition-shadow">
      <div className="card-body p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-semibold text-lg line-clamp-1" title={ticket.title}>{ticket.title}</h3>
          <div className="flex gap-1">
             <button className="btn btn-ghost btn-xs text-primary">
                <i className="fa-solid fa-pencil"></i>
             </button>
             <form action={deleteTicket.bind(null, ticket.id)}>
                <button className="btn btn-ghost btn-xs text-error">
                    <i className="fa-solid fa-trash"></i>
                </button>
             </form>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-3">
            <span className="badge badge-neutral text-xs">{formatTime(elapsedTime)}</span>
        </div>

        <div className="flex justify-between items-center mt-auto">
            <a href={ticket.github_url || '#'} target="_blank" rel="noopener noreferrer" className="link link-primary text-sm">
                Reference
            </a>
            
            {isActive ? (
                 <button 
                    onClick={handleStop}
                    className="btn btn-sm btn-error btn-outline min-w-[80px]"
                    disabled={isLoading}
                >
                    Stop
                </button>
            ) : (
                <button 
                    onClick={handleStart}
                    className="btn btn-sm btn-primary btn-outline min-w-[80px]"
                    disabled={isLoading}
                >
                    Start
                </button>
            )}
        </div>
      </div>
    </div>
  )
}

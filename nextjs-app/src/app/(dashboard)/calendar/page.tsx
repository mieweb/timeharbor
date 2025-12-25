'use client'

import { useState } from 'react'

export default function CalendarPage() {
  const [isSyncing, setIsSyncing] = useState(false)
  const [isConnected, setIsConnected] = useState(false) // Mock state for now

  const handleConnect = () => {
    setIsSyncing(true)
    // Simulate connection delay
    setTimeout(() => {
      setIsConnected(true)
      setIsSyncing(false)
    }, 1500)
  }

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-base-content mb-2">Calendar Integration</h1>
        <p className="text-sm md:text-base text-base-content/70 md:text-lg">
          Connect your Google Calendar to automatically sync and log time from your meetings.
        </p>
      </div>

      {/* Calendar Events Section */}
      <div className="mb-6 md:mb-8">
        <div className="mb-4">
          <h3 className="text-lg md:text-xl font-semibold text-base-content">Your Calendar Events</h3>
          {isSyncing && (
            <p className="text-xs md:text-sm text-base-content/60 mt-1">Loading events...</p>
          )}
        </div>
        
        {!isConnected ? (
          !isSyncing && (
            <div className="text-center py-8 text-base-content/60">
              <div>
                <svg className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-4 text-base-content/40" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd"></path>
                </svg>
                                <h3 className="text-base md:text-lg font-medium text-base-content mb-2">Connect Google Calendar</h3>
                <p className="text-sm md:text-base mb-4">Connect your Google account to see calendar events and log meeting time.</p>
                <button onClick={handleConnect} className="btn bg-th-accent hover:bg-opacity-90 text-white border-none btn-sm md:btn-md">
                  Connect Google Account
                </button>
              </div>
            </div>
          )
        ) : (
          <div className="grid gap-3 md:gap-4 mb-6">
             {/* Mock Events */}
             {[
               { id: 1, title: 'Team Standup', date: 'Today', time: '10:00 AM', endTime: '10:30 AM', duration: 30 },
               { id: 2, title: 'Project Review', date: 'Today', time: '2:00 PM', endTime: '3:00 PM', duration: 60 }
             ].map(event => (
              <div key={event.id} className="card bg-base-100 shadow-sm border border-base-300 p-3 md:p-4">
                <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
                  <div className="flex-1 w-full">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-base md:text-lg">📅</span>
                      <h4 className="font-semibold text-sm md:text-base text-base-content">{event.title}</h4>
                    </div>
                    <p className="text-xs md:text-sm text-base-content/70 mb-2">
                      <span className="font-medium">{event.date}</span> • 
                      <span>{event.time} - {event.endTime}</span> • 
                      <span className="bg-th-accent/10 text-th-accent px-2 py-1 rounded-full text-xs font-medium ml-2">{event.duration} min</span>
                    </p>
                  </div>
                  <button className="btn btn-xs md:btn-sm bg-th-accent hover:bg-opacity-90 text-white border-none w-full sm:w-auto">
                    <span className="hidden sm:inline">Log </span>{event.duration}min
                  </button>
                </div>
              </div>
             ))}
          </div>
        )}
      </div>

      {/* Connection Status */}
      {isConnected && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 md:p-4 mb-4 md:mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 md:w-8 md:h-8 bg-green-100 dark:bg-green-800 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 md:w-5 md:h-5 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path>
              </svg>
            </div>
            <div>
              <h4 className="font-medium text-sm md:text-base text-green-900 dark:text-green-100">Google Calendar Connected</h4>
              <p className="text-green-800 dark:text-green-200 text-xs md:text-sm">Your Google Calendar is connected and ready to sync events.</p>
            </div>
          </div>
        </div>
      )}

      {/* Privacy Notice */}
      <div className="bg-th-accent/5 border border-th-accent/20 rounded-lg p-3 md:p-4">
        <div className="flex gap-3">
          <div className="text-th-accent mt-0.5">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <h4 className="font-medium text-sm md:text-base text-th-dark">Privacy & Security</h4>
            <p className="text-xs md:text-sm text-th-dark/70">
              We only read basic event information (title, date, time, duration) to help you log time. We never access meeting content, attendees, or other sensitive data.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}


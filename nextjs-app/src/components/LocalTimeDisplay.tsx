'use client'

import { parseISO, format } from 'date-fns'
import { useEffect, useState } from 'react'

export default function LocalTimeDisplay({ 
  date, 
  format: formatStr = 'MM/dd/yyyy, h:mm a' 
}: { 
  date: string
  format?: string 
}) {
  const [formattedDate, setFormattedDate] = useState<string>('')

  useEffect(() => {
    // This code runs in the user's browser
    // 1. Ensure timestamp is treated as UTC
    const dateStr = date.endsWith('Z') || date.includes('+') ? date : `${date}Z`
    // 2. Format using the browser's local timezone
    setFormattedDate(format(parseISO(dateStr), formatStr))
  }, [date, formatStr])

  // Render nothing initially to avoid "hydration mismatch" errors
  if (!formattedDate) return <span className="opacity-0">Loading...</span>

  return <span>{formattedDate}</span>
}

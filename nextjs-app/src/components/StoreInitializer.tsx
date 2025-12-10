'use client'
import { useEffect, useRef } from 'react'
import { useClockStore } from '@/store/useClockStore'

export default function StoreInitializer({ activeEvent }: { activeEvent: any }) {
  const initialized = useRef(false)
  
  // Initialize once
  if (!initialized.current) {
    useClockStore.setState({ activeEvent })
    initialized.current = true
  }

  // Update if prop changes (e.g. after router.refresh())
  useEffect(() => {
    useClockStore.setState({ activeEvent })
  }, [activeEvent])

  return null
}

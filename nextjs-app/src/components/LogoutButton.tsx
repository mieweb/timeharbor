'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function LogoutButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const handleLogout = async () => {
    setLoading(true)
    await supabase.auth.signOut()
    router.refresh()
    setLoading(false)
  }

  return (
    <button 
      onClick={handleLogout} 
      className="btn btn-outline btn-error btn-sm"
      disabled={loading}
    >
      {loading ? (
        <>
          <span className="loading loading-spinner loading-sm"></span>
          Logging out...
        </>
      ) : (
        'Logout'
      )}
    </button>
  )
}

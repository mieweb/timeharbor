'use client'

import { useAuthStore } from '@/store/useAuthStore'

export default function LogoutButton() {
  const { logout, loading } = useAuthStore()

  return (
    <button 
      onClick={() => logout()}
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

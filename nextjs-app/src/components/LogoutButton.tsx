'use client'

import { useState } from 'react'

export default function LogoutButton() {
  const [loading, setLoading] = useState(false)

  return (
    <form action="/auth/signout" method="post" onSubmit={() => setLoading(true)}>
      <button 
        type="submit"
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
    </form>
  )
}

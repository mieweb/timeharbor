'use client'

import { useState } from 'react'
import { login, signup } from './actions'

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleLogin(formData: FormData) {
    setLoading(true)
    setError(null)
    try {
      const res = await login(null, formData)
      if (res?.error) {
        setError(res.error)
      }
    } catch (e) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  async function handleSignup(formData: FormData) {
    setLoading(true)
    setError(null)
    try {
      const res = await signup(null, formData)
      if (res?.error) {
        setError(res.error)
      }
    } catch (e) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className="flex flex-col gap-4 p-4 max-w-md mx-auto mt-10 border rounded-lg shadow">
      <h1 className="text-2xl font-bold">TimeHarbor Login</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
          {error}
        </div>
      )}

      <label htmlFor="email">Email or Username:</label>
      <input 
        id="email" 
        name="email" 
        type="text" 
        className="border p-2 rounded" 
        placeholder="username"
      />
      
      <label htmlFor="password">Password:</label>
      <input 
        id="password" 
        name="password" 
        type="password" 
        className="border p-2 rounded" 
      />
      
      <div className="flex gap-2">
        <button 
          formAction={handleLogin} 
          disabled={loading}
          className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600 disabled:opacity-50 flex-1"
        >
          {loading ? 'Processing...' : 'Log in'}
        </button>
        <button 
          formAction={handleSignup} 
          disabled={loading}
          className="bg-green-500 text-white p-2 rounded hover:bg-green-600 disabled:opacity-50 flex-1"
        >
          Sign up
        </button>
      </div>
    </form>
  )
}

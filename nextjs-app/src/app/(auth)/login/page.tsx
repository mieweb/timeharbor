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
      if ((e as Error).message === 'NEXT_REDIRECT' || (e as any).digest?.startsWith('NEXT_REDIRECT')) {
        throw e
      }
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
      if ((e as Error).message === 'NEXT_REDIRECT' || (e as any).digest?.startsWith('NEXT_REDIRECT')) {
        throw e
      }
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleClientAction = (e: React.MouseEvent<HTMLButtonElement>, action: (formData: FormData) => Promise<void>) => {
    e.preventDefault()
    const form = e.currentTarget.closest('form')
    if (form) {
      if (form.checkValidity()) {
        action(new FormData(form))
      } else {
        form.reportValidity()
      }
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <form className="card bg-base-100 shadow-xl w-full max-w-md" method="POST">
        <div className="card-body">
          <h1 className="card-title text-2xl md:text-3xl font-bold text-center mb-4">
            TimeHarbor Login
          </h1>
          
          {error && (
            <div className="alert alert-error">
              <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <div className="form-control">
            <label className="label" htmlFor="email">
              <span className="label-text">Email or Username</span>
            </label>
            <input 
              id="email" 
              name="email" 
              type="text" 
              className="input input-bordered w-full" 
              placeholder="username"
              required
            />
          </div>
          
          <div className="form-control">
            <label className="label" htmlFor="password">
              <span className="label-text">Password</span>
            </label>
            <input 
              id="password" 
              name="password" 
              type="password" 
              className="input input-bordered w-full" 
              placeholder="••••••••"
              required
            />
          </div>
          
          <div className="card-actions flex-col md:flex-row gap-2 mt-4">
            <button 
              formAction={login} 
              onClick={(e) => handleClientAction(e, handleLogin)}
              disabled={loading}
              className="btn btn-primary flex-1 w-full md:w-auto"
            >
              {loading ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  Processing...
                </>
              ) : (
                'Log in'
              )}
            </button>
            <button 
              formAction={signup} 
              onClick={(e) => handleClientAction(e, handleSignup)}
              disabled={loading}
              className="btn btn-secondary flex-1 w-full md:w-auto"
            >
              Sign up
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

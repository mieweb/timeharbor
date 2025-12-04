import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const supabaseUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/supabase`
    : process.env.NEXT_PUBLIC_SUPABASE_URL!

  return createBrowserClient(
    supabaseUrl,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        storageKey: 'sb-10-auth-token',
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      },
      realtime: {
        // Force Realtime to use the same proxied URL
        params: {
          eventsPerSecond: 10
        }
      },
      global: {
        headers: {
          'X-Client-Info': 'supabase-js-web'
        }
      }
    }
  )
}
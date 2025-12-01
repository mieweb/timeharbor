import { createClient } from '@/lib/supabase/server'
import TimesheetClient from './TimesheetClient'

export default async function TimesheetPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  let userName = "Guest"
  let userEmail = ""

  if (user) {
    userEmail = user.email || ""
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single()
      
    if (profile && profile.full_name) {
      userName = profile.full_name
    } else {
      userName = user.email?.split('@')[0] || "User"
    }
  }

  return (
    <TimesheetClient 
      initialUserName={userName}
      initialUserEmail={userEmail}
    />
  )
}



import { createClient } from '@/lib/supabase/server'
import TimesheetClient from '../TimesheetClient'
import { redirect } from 'next/navigation'

export default async function UserTimesheetPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Verify permission (Leader check)
  // We do a quick check here, but the server action also enforces it.
  // This is mainly to get the user's name for the UI.
  
  // 1. Check if current user is leader
  const { data: leadership } = await supabase
    .from('team_members')
    .select('team_id')
    .eq('user_id', user.id)
    .in('role', ['leader', 'admin'])
    
  if (!leadership || leadership.length === 0) {
    redirect('/') // Not a leader
  }
  
  // 2. Get target user profile
  let userName = "Unknown User"
  let userEmail = ""
  
  // Try profiles table
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', userId)
    .single()
    
  if (profile && profile.full_name) {
    userName = profile.full_name
  } else {
     // If no profile name, we might need to fetch from auth admin if possible, 
     // or just show "User [ID]" if we can't access auth table directly here easily without admin client.
     // But we can try to get it from the team member info if we had it joined.
     // For now, let's default to a generic name if profile is missing.
     userName = "Team Member"
  }

  return (
    <TimesheetClient 
      initialUserName={userName}
      initialUserEmail={userEmail}
      targetUserId={userId}
      isEditable={true}
    />
  )
}

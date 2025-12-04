// Script to add DELETE policy for tickets
// Run this with: node add-delete-policy.js

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'http://10.15.48.64:54321'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function addDeletePolicy() {
  console.log('Adding DELETE policy for tickets...')
  
  const { data, error } = await supabase.rpc('exec_sql', {
    sql: `
      create policy "Creators and admins can delete tickets."
        on public.tickets for delete
        using (
          auth.uid() = created_by or
          exists (
            select 1 from public.team_members
            where team_members.team_id = tickets.team_id
            and team_members.user_id = auth.uid()
            and team_members.role in ('admin', 'leader')
          )
        );
    `
  })

  if (error) {
    console.error('Error creating policy:', error)
    process.exit(1)
  }

  console.log('Policy created successfully!')
  console.log(data)
}

addDeletePolicy()

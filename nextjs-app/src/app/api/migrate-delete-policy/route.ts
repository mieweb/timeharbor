// Temporary migration endpoint to add delete policy
// Access at: http://localhost:3000/api/migrate-delete-policy

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  const sql = `
    create policy if not exists "Creators and admins can delete tickets."
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

  try {
    // Use direct SQL query through the Postgres connection
    const { data, error } = await supabase
      .from('_migrations')
      .select('*')
      .limit(0)

    if (error) {
      console.error('Connection error:', error)
    }

    // Execute raw SQL - note: this might not work without RPC function
    console.log('SQL to execute:', sql)
    
    return NextResponse.json({ 
      message: 'Please run this SQL manually in your Supabase SQL editor:',
      sql: sql
    })
  } catch (err: any) {
    console.error('Migration error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

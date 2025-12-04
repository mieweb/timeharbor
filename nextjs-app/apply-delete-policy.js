#!/usr/bin/env node
/**
 * Script to add DELETE policy for tickets table
 * This fixes the issue where users cannot delete tickets
 * 
 * Usage: node apply-delete-policy.js
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function applyDeletePolicy() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Error: Missing environment variables')
    console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  console.log('🔄 Applying DELETE policy for tickets table...\n')

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
    // Use RPC to execute raw SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql })
    
    if (error) {
      console.error('❌ Error executing SQL via RPC:', error.message)
      console.log('\n📋 Please run the following SQL manually in your Supabase SQL Editor:\n')
      console.log(sql)
      console.log('\nSteps:')
      console.log('1. Go to your Supabase project dashboard')
      console.log('2. Navigate to SQL Editor')
      console.log('3. Paste the SQL above')
      console.log('4. Click Run')
      process.exit(1)
    }

    console.log('✅ DELETE policy successfully applied!')
    console.log('\nYou can now delete tickets in your application.')
    
  } catch (err) {
    console.error('❌ Unexpected error:', err.message)
    console.log('\n📋 Please run the following SQL manually in your Supabase SQL Editor:\n')
    console.log(sql)
    console.log('\nSteps:')
    console.log('1. Go to your Supabase project dashboard')
    console.log('2. Navigate to SQL Editor')
    console.log('3. Paste the SQL above')
    console.log('4. Click Run')
    process.exit(1)
  }
}

applyDeletePolicy()

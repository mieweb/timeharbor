-- ================================================================
-- FIX FOR TICKET DELETION ISSUE
-- ================================================================
-- Problem: Tickets cannot be deleted because there is no DELETE 
-- policy in Row Level Security (RLS) for the tickets table.
--
-- Solution: Add a DELETE policy that allows:
-- 1. Ticket creators to delete their own tickets
-- 2. Team admins and leaders to delete any tickets in their team
--
-- HOW TO APPLY:
-- 1. Go to your Supabase project dashboard
-- 2. Navigate to SQL Editor (on the left sidebar)
-- 3. Click "New Query"
-- 4. Copy and paste this entire file
-- 5. Click "Run" or press Cmd+Enter (Mac) / Ctrl+Enter (Windows)
-- 6. You should see "Success. No rows returned"
--
-- After running this, ticket deletion will work immediately.
-- ================================================================

-- First drop the policy if it exists (to avoid errors if running multiple times)
drop policy if exists "Creators and admins can delete tickets." on public.tickets;

-- Then create the policy
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

-- Verify the policy was created
-- You can run this separately to check:
-- SELECT * FROM pg_policies WHERE tablename = 'tickets' AND policyname = 'Creators and admins can delete tickets.';

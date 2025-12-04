# Fix for Ticket Deletion

## Problem
Tickets cannot be deleted because there is no DELETE policy in the Row Level Security (RLS) for the tickets table.

## Solution
Run the following SQL in your Supabase SQL Editor:

```sql
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
```

## How to Apply

### Option 1: Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Paste the SQL above
4. Click **Run**

### Option 2: Command Line (if psql is available)
```bash
psql -h 10.15.48.64 -p 54322 -U postgres -d postgres -f supabase/add_ticket_delete_policy.sql
```

### Option 3: API Endpoint (Dev Only)
1. Make sure your Next.js app is running
2. Visit: http://localhost:3000/api/migrate-delete-policy
3. Copy the SQL from the response
4. Run it in Supabase SQL Editor

## What This Does
- Allows ticket creators to delete their own tickets
- Allows team admins and leaders to delete any tickets in their team
- The CASCADE delete will automatically remove related clock_event_tickets entries

## After Running
Once the policy is added, ticket deletion will work immediately without needing to restart the app.

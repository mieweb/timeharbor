# 🔧 Fix: Ticket Deletion Not Working

## Problem
You cannot delete tickets because the **DELETE policy is missing** from the Row Level Security (RLS) on the `tickets` table in Supabase.

## Quick Fix (Recommended - 2 minutes)

### Step 1: Open Supabase SQL Editor
1. Go to your Supabase project dashboard
2. Click on **SQL Editor** in the left sidebar
3. Click **New Query**

### Step 2: Run the SQL
Copy and paste this SQL into the editor:

```sql
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
```

### Step 3: Execute
- Click **Run** or press `Cmd+Enter` (Mac) / `Ctrl+Enter` (Windows)
- You should see: **"Success. No rows returned"**

### Step 4: Test
- Go back to your Next.js app
- Try deleting a ticket
- It should work now! ✅

---

## What This Does

This policy allows ticket deletion for:
- ✅ **Ticket creators** - Users can delete their own tickets
- ✅ **Team admins** - Team admins can delete any ticket in their team
- ✅ **Team leaders** - Team leaders can delete any ticket in their team

The CASCADE delete will automatically remove related `clock_event_tickets` entries.

---

## Alternative: Using the SQL File

If you prefer, you can also run the SQL file I created:

```bash
cd /home/dharapoonam/timeharbour-nextjs/nextjs-app
cat APPLY_THIS_FIX.sql
```

Then copy the contents and paste them into Supabase SQL Editor.

---

## Verify the Fix

To verify the policy was created successfully, run this query in Supabase SQL Editor:

```sql
SELECT * 
FROM pg_policies 
WHERE tablename = 'tickets' 
  AND policyname = 'Creators and admins can delete tickets.';
```

You should see one row returned with the policy details.

---

## Technical Details

The issue was that the `schema.sql` had policies for:
- ✅ SELECT (viewing tickets)
- ✅ INSERT (creating tickets)  
- ✅ UPDATE (editing tickets)
- ❌ DELETE (deleting tickets) ← **MISSING**

I've now:
1. ✅ Created `APPLY_THIS_FIX.sql` - Ready to run in Supabase
2. ✅ Updated `supabase/schema.sql` - For future database setups
3. ✅ Created this README - Step-by-step instructions

---

## Need Help?

If you encounter any issues:
1. Make sure you're logged into the correct Supabase project
2. Ensure you have admin access to the project
3. Check that RLS is enabled on the tickets table
4. Verify the policy name doesn't already exist

---

**After applying this fix, ticket deletion will work immediately - no app restart required!**

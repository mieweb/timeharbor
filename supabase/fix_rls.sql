-- Fix infinite recursion in team_members policy
-- We use a security definer function to bypass RLS when checking membership
create or replace function public.is_team_member(_team_id uuid)
returns boolean as $$
begin
  return exists (
    select 1 from public.team_members
    where team_id = _team_id
    and user_id = auth.uid()
  );
end;
$$ language plpgsql security definer;

create or replace function public.is_admin_or_leader(_team_id uuid)
returns boolean as $$
begin
  return exists (
    select 1 from public.team_members
    where team_id = _team_id
    and user_id = auth.uid()
    and role in ('admin', 'leader')
  );
end;
$$ language plpgsql security definer;

-- Drop existing problematic policies
drop policy if exists "Team members can view other members." on public.team_members;
drop policy if exists "Admins and leaders can manage members." on public.team_members;

-- Re-create policies using the function to avoid recursion
create policy "Team members can view other members."
  on public.team_members for select
  using (
    public.is_team_member(team_id)
  );

create policy "Admins and leaders can manage members."
  on public.team_members for all
  using (
    public.is_admin_or_leader(team_id)
  );

-- Allow team creators to add members (needed for initial setup)
create policy "Team creators can add members"
  on public.team_members for insert
  with check (
    exists (
      select 1 from public.teams
      where teams.id = team_members.team_id
      and teams.created_by = auth.uid()
    )
  );

-- Allow creators to view their own teams (needed for the initial insert().select() to work)
create policy "Creators can view their own teams"
  on public.teams for select
  using ( created_by = auth.uid() );

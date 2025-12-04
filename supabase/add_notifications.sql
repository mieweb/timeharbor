-- Migration: Add Notifications Feature
-- This script adds the notifications table and related infrastructure
-- Run this in Supabase SQL Editor

-- Create notifications table
create table if not exists public.notifications (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  type text not null check (type in ('clock-in', 'clock-out', 'ticket-assignment', 'team-invite')),
  title text not null,
  message text not null,
  data jsonb, -- Stores teamId, userId, clockEventId, etc.
  read boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create indexes for faster queries
create index if not exists notifications_user_id_idx on public.notifications(user_id);
create index if not exists notifications_read_idx on public.notifications(read);
create index if not exists notifications_created_at_idx on public.notifications(created_at desc);

-- Enable Row Level Security
alter table public.notifications enable row level security;

-- RLS Policies for notifications
drop policy if exists "Users can view their own notifications." on public.notifications;
create policy "Users can view their own notifications."
  on public.notifications for select
  using ( auth.uid() = user_id );

drop policy if exists "Users can update their own notifications." on public.notifications;
create policy "Users can update their own notifications."
  on public.notifications for update
  using ( auth.uid() = user_id );

drop policy if exists "Users can insert notifications." on public.notifications;
create policy "Users can insert notifications."
  on public.notifications for insert
  with check ( true );

-- Helper function to get team leaders
create or replace function public.get_team_leaders(team_uuid uuid)
returns table (user_id uuid, full_name text, push_subscription jsonb) as $$
begin
  return query
  select p.id, p.full_name, p.push_subscription
  from public.team_members tm
  join public.profiles p on p.id = tm.user_id
  where tm.team_id = team_uuid
  and tm.role in ('admin', 'leader');
end;
$$ language plpgsql security definer;

-- Enable Realtime for notifications
alter publication supabase_realtime add table notifications;

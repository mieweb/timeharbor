-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles table (extends auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  full_name text,
  avatar_url text,
  push_subscription jsonb,
  updated_at timestamp with time zone,
  
  constraint username_length check (char_length(full_name) >= 3)
);

-- Teams table
create table public.teams (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  code text unique not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_by uuid references public.profiles(id)
);

-- Team Members table
create table public.team_members (
  id uuid default uuid_generate_v4() primary key,
  team_id uuid references public.teams(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  role text check (role in ('member', 'admin', 'leader')) default 'member',
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  unique(team_id, user_id)
);

-- Tickets table
create table public.tickets (
  id uuid default uuid_generate_v4() primary key,
  team_id uuid references public.teams(id) on delete cascade not null,
  title text not null,
  github_url text,
  accumulated_time integer default 0, -- in seconds
  status text check (status in ('open', 'reviewed', 'deleted', 'closed')) default 'open',
  created_by uuid references public.profiles(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone,
  updated_by uuid references public.profiles(id),
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamp with time zone
);

-- Clock Events table
create table public.clock_events (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  team_id uuid references public.teams(id) on delete cascade not null,
  start_timestamp timestamp with time zone default timezone('utc'::text, now()) not null,
  end_timestamp timestamp with time zone,
  accumulated_time integer default 0, -- in seconds
  
  constraint valid_time_range check (end_timestamp is null or end_timestamp >= start_timestamp)
);

-- Clock Event Tickets (Tracks time spent on specific tickets within a clock event)
create table public.clock_event_tickets (
  id uuid default uuid_generate_v4() primary key,
  clock_event_id uuid references public.clock_events(id) on delete cascade not null,
  ticket_id uuid references public.tickets(id) on delete cascade not null,
  start_timestamp timestamp with time zone, -- if currently running
  accumulated_time integer default 0 -- in seconds
);

-- Enable Row Level Security
alter table public.profiles enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.tickets enable row level security;
alter table public.clock_events enable row level security;
alter table public.clock_event_tickets enable row level security;

-- Policies

-- Profiles
create policy "Public profiles are viewable by everyone."
  on public.profiles for select
  using ( true );

create policy "Users can insert their own profile."
  on public.profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update own profile."
  on public.profiles for update
  using ( auth.uid() = id );

-- Teams
create policy "Team members can view teams."
  on public.teams for select
  using (
    exists (
      select 1 from public.team_members
      where team_members.team_id = teams.id
      and team_members.user_id = auth.uid()
    )
  );

create policy "Users can create teams."
  on public.teams for insert
  with check ( auth.uid() = created_by );

create policy "Admins and leaders can update teams."
  on public.teams for update
  using (
    exists (
      select 1 from public.team_members
      where team_members.team_id = teams.id
      and team_members.user_id = auth.uid()
      and team_members.role in ('admin', 'leader')
    )
  );

-- Team Members
create policy "Team members can view other members."
  on public.team_members for select
  using (
    exists (
      select 1 from public.team_members tm
      where tm.team_id = team_members.team_id
      and tm.user_id = auth.uid()
    )
  );

create policy "Admins and leaders can manage members."
  on public.team_members for all
  using (
    exists (
      select 1 from public.team_members tm
      where tm.team_id = team_members.team_id
      and tm.user_id = auth.uid()
      and tm.role in ('admin', 'leader')
    )
  );

-- Tickets
create policy "Team members can view tickets."
  on public.tickets for select
  using (
    exists (
      select 1 from public.team_members
      where team_members.team_id = tickets.team_id
      and team_members.user_id = auth.uid()
    )
  );

create policy "Team members can create tickets."
  on public.tickets for insert
  with check (
    exists (
      select 1 from public.team_members
      where team_members.team_id = tickets.team_id
      and team_members.user_id = auth.uid()
    )
  );

create policy "Creators and admins can update tickets."
  on public.tickets for update
  using (
    auth.uid() = created_by or
    exists (
      select 1 from public.team_members
      where team_members.team_id = tickets.team_id
      and team_members.user_id = auth.uid()
      and team_members.role in ('admin', 'leader')
    )
  );

-- Clock Events
create policy "Team members can view clock events."
  on public.clock_events for select
  using (
    exists (
      select 1 from public.team_members
      where team_members.team_id = clock_events.team_id
      and team_members.user_id = auth.uid()
    )
  );

create policy "Users can manage their own clock events."
  on public.clock_events for all
  using ( auth.uid() = user_id );

create policy "Admins can update clock events."
  on public.clock_events for update
  using (
    exists (
      select 1 from public.team_members
      where team_members.team_id = clock_events.team_id
      and team_members.user_id = auth.uid()
      and team_members.role in ('admin', 'leader')
    )
  );

-- Clock Event Tickets
create policy "Team members can view clock event tickets."
  on public.clock_event_tickets for select
  using (
    exists (
      select 1 from public.clock_events
      join public.team_members on team_members.team_id = clock_events.team_id
      where clock_events.id = clock_event_tickets.clock_event_id
      and team_members.user_id = auth.uid()
    )
  );

create policy "Users can manage their own clock event tickets."
  on public.clock_event_tickets for all
  using (
    exists (
      select 1 from public.clock_events
      where clock_events.id = clock_event_tickets.clock_event_id
      and clock_events.user_id = auth.uid()
    )
  );

-- Functions
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

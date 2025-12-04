-- Allow creators and admins to delete tickets
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

-- Enable Realtime for clock_events
alter publication supabase_realtime add table clock_events;

-- Enable Realtime for notifications
alter publication supabase_realtime add table notifications;

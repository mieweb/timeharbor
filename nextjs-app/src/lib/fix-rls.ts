
import { Client } from 'pg'

const client = new Client({
  connectionString: process.env.DATABASE_URL,
})

async function applyPolicies() {
  try {
    await client.connect()
    console.log('Connected to database')

    const sql = `
      -- Enable RLS
      ALTER TABLE clock_events ENABLE ROW LEVEL SECURITY;
      ALTER TABLE clock_event_tickets ENABLE ROW LEVEL SECURITY;

      -- Drop existing policies to avoid errors
      DROP POLICY IF EXISTS "Users can view their own clock events" ON clock_events;
      DROP POLICY IF EXISTS "Team members can view clock events" ON clock_events;
      DROP POLICY IF EXISTS "Team leaders can view team clock events" ON clock_events;
      DROP POLICY IF EXISTS "Team leaders can view all member clock events" ON clock_events;
      DROP POLICY IF EXISTS "Users can insert their own clock events" ON clock_events;
      DROP POLICY IF EXISTS "Users can update their own clock events" ON clock_events;
      DROP POLICY IF EXISTS "Team leaders can update member clock events" ON clock_events;
      
      DROP POLICY IF EXISTS "Users can view their own clock event tickets" ON clock_event_tickets;
      DROP POLICY IF EXISTS "Users can view clock event tickets if they can view the event" ON clock_event_tickets;
      DROP POLICY IF EXISTS "Users can insert their own clock event tickets" ON clock_event_tickets;
      DROP POLICY IF EXISTS "Users can update their own clock event tickets" ON clock_event_tickets;

      -- clock_events policies
      CREATE POLICY "Users can view their own clock events"
      ON clock_events FOR SELECT
      USING (auth.uid() = user_id);
      
      CREATE POLICY "Team leaders can view all member clock events"
      ON clock_events FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM team_members tm_leader
          JOIN team_members tm_member ON tm_leader.team_id = tm_member.team_id
          WHERE tm_leader.user_id = auth.uid()
          AND tm_leader.role IN ('leader', 'admin')
          AND tm_member.user_id = clock_events.user_id
        )
      );

      CREATE POLICY "Users can insert their own clock events"
      ON clock_events FOR INSERT
      WITH CHECK (auth.uid() = user_id);

      CREATE POLICY "Users can update their own clock events"
      ON clock_events FOR UPDATE
      USING (auth.uid() = user_id);

      CREATE POLICY "Team leaders can update member clock events"
      ON clock_events FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM team_members tm_leader
          JOIN team_members tm_member ON tm_leader.team_id = tm_member.team_id
          WHERE tm_leader.user_id = auth.uid()
          AND tm_leader.role IN ('leader', 'admin')
          AND tm_member.user_id = clock_events.user_id
        )
      );

      -- clock_event_tickets policies
      CREATE POLICY "Users can view clock event tickets if they can view the event"
      ON clock_event_tickets FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM clock_events
          WHERE clock_events.id = clock_event_tickets.clock_event_id
        )
      );

      CREATE POLICY "Users can insert their own clock event tickets"
      ON clock_event_tickets FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM clock_events
          WHERE clock_events.id = clock_event_tickets.clock_event_id
          AND clock_events.user_id = auth.uid()
        )
      );

      CREATE POLICY "Users can update their own clock event tickets"
      ON clock_event_tickets FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM clock_events
          WHERE clock_events.id = clock_event_tickets.clock_event_id
          AND clock_events.user_id = auth.uid()
        )
      );
      
      -- Ensure tickets are visible (assuming tickets are linked to teams, and users are in teams)
      -- For now, let's make tickets visible to authenticated users to be safe, or check team membership
      -- Assuming tickets table exists and has RLS enabled
      
      ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
      DROP POLICY IF EXISTS "Users can view tickets" ON tickets;
      CREATE POLICY "Users can view tickets"
      ON tickets FOR SELECT
      USING (auth.role() = 'authenticated'); 

      -- Teams policies
      ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
      DROP POLICY IF EXISTS "Team members can view teams" ON teams;
      DROP POLICY IF EXISTS "Authenticated users can view teams" ON teams;
      
      -- Simplify teams policy for now to avoid circular dependency issues or complexity
      CREATE POLICY "Authenticated users can view teams"
      ON teams FOR SELECT
      USING (auth.role() = 'authenticated');

      -- Team members policies
      ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
      DROP POLICY IF EXISTS "Users can view their own team memberships" ON team_members;
      CREATE POLICY "Users can view their own team memberships"
      ON team_members FOR SELECT
      USING (user_id = auth.uid());
      
      -- Tickets policies
      ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
      
      -- Drop ALL potential existing policies on tickets to ensure clean slate
      DROP POLICY IF EXISTS "Users can view tickets" ON tickets;
      DROP POLICY IF EXISTS "Users can view their own tickets or team tickets if leader" ON tickets;
      DROP POLICY IF EXISTS "Users can view only their own tickets" ON tickets;
      DROP POLICY IF EXISTS "Team members can view tickets" ON tickets;
      DROP POLICY IF EXISTS "Team members can view tickets." ON tickets; -- Check for trailing dot or variations
      DROP POLICY IF EXISTS "Authenticated users can view tickets" ON tickets;
      
      -- Create the STRICT policy
      CREATE POLICY "Users can view only their own tickets"
      ON tickets FOR SELECT
      USING (
        created_by = auth.uid()
      );
    `
    
    await client.query(sql)
    console.log('Policies applied successfully')
  } catch (err) {
    console.error('Error applying policies:', err)
  } finally {
    await client.end()
  }
}

applyPolicies()

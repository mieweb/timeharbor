
import { Client } from 'pg'

const client = new Client({
  connectionString: process.env.DATABASE_URL,
})

async function checkSchema() {
  try {
    await client.connect()
    console.log('Connected to database')

    // Check tables
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `)
    console.log('Tables:', tablesRes.rows.map(r => r.table_name))

    // Check foreign keys for clock_events
    const fkRes2 = await client.query(`
      SELECT
          tc.table_schema, 
          tc.constraint_name, 
          tc.table_name, 
          kcu.column_name, 
          ccu.table_schema AS foreign_table_schema,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name 
      FROM 
          information_schema.table_constraints AS tc 
          JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
          JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
            AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = 'clock_events';
    `)
    console.log('Foreign Keys for clock_events:', fkRes2.rows)

    // Check columns for tickets
    const ticketsCols = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'tickets';
    `)
    console.log('Tickets columns:', ticketsCols.rows)

  } catch (err) {
    console.error('Error checking schema:', err)
  } finally {
    await client.end()
  }
}

checkSchema()

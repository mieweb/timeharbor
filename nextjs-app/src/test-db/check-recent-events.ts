
import { Client } from 'pg'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const client = new Client({
  connectionString: process.env.DATABASE_URL,
})

async function checkRecentClockEvents() {
  try {
    await client.connect()
    const res = await client.query(`
      SELECT id, user_id, team_id, start_timestamp, accumulated_time 
      FROM clock_events 
      ORDER BY start_timestamp DESC 
      LIMIT 5;
    `)
    console.log('Recent Clock Events:', res.rows)
  } catch (err) {
    console.error(err)
  } finally {
    await client.end()
  }
}

checkRecentClockEvents()

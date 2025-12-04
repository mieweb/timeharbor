
import { Client } from 'pg'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const client = new Client({
  connectionString: process.env.DATABASE_URL,
})

async function listClockEventsPolicies() {
  try {
    await client.connect()
    const res = await client.query(`
      SELECT policyname, cmd, qual, with_check 
      FROM pg_policies 
      WHERE tablename = 'clock_events';
    `)
    console.log('Policies on clock_events table:')
    res.rows.forEach(row => {
      console.log(`- ${row.policyname} (${row.cmd}): ${row.qual}`)
    })
  } catch (err) {
    console.error(err)
  } finally {
    await client.end()
  }
}

listClockEventsPolicies()

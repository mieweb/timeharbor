
import { Client } from 'pg'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const client = new Client({
  connectionString: process.env.DATABASE_URL,
})

async function checkTest123Members() {
  try {
    await client.connect()
    const teamId = '9dbdbbb5-e507-4b22-a490-82cfb1488e3e'
    const res = await client.query(`
      SELECT user_id, role 
      FROM team_members 
      WHERE team_id = $1;
    `, [teamId])
    console.log(`Members of team test123 (${teamId}):`, res.rows)
  } catch (err) {
    console.error(err)
  } finally {
    await client.end()
  }
}

checkTest123Members()

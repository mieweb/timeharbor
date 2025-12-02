
import { Client } from 'pg'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const client = new Client({
  connectionString: process.env.DATABASE_URL,
})

async function checkTeamLeadership() {
  try {
    await client.connect()
    const teamId = 'bef65842-c6de-4c54-8ed9-bf2a46685692'
    const res = await client.query(`
      SELECT user_id, role 
      FROM team_members 
      WHERE team_id = $1;
    `, [teamId])
    console.log(`Members of team ${teamId}:`, res.rows)
  } catch (err) {
    console.error(err)
  } finally {
    await client.end()
  }
}

checkTeamLeadership()

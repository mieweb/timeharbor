
import { Client } from 'pg'

const client = new Client({
  connectionString: process.env.DATABASE_URL,
})

async function checkTeamMembersSchema() {
  try {
    await client.connect()
    console.log('Connected to database')

    const res = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'team_members';
    `)
    console.log('Team Members columns:', res.rows)

  } catch (err) {
    console.error('Error checking schema:', err)
  } finally {
    await client.end()
  }
}

checkTeamMembersSchema()

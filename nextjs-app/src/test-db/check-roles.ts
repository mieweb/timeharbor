
import { Client } from 'pg'

const client = new Client({
  connectionString: process.env.DATABASE_URL,
})

async function checkRoles() {
  try {
    await client.connect()
    console.log('Connected to database')

    const res = await client.query(`
        SELECT DISTINCT role FROM team_members;
    `)
    console.log('Roles:', res.rows)

  } catch (err) {
    console.error('Error checking roles:', err)
  } finally {
    await client.end()
  }
}

checkRoles()

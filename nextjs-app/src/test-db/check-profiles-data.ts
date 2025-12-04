
import { Client } from 'pg'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const client = new Client({
  connectionString: process.env.DATABASE_URL,
})

async function checkProfiles() {
  try {
    await client.connect()
    const res = await client.query(`
      SELECT id, full_name FROM profiles;
    `)
    // Note: email might not be in profiles based on previous schema check, but let's check what is there.
    // Previous schema check said: id, full_name, avatar_url, push_subscription, updated_at.
    // So email is likely not in profiles, but in auth.users.
    
    console.log('Profiles:', res.rows)
    
    const res2 = await client.query(`
      SELECT * FROM team_members LIMIT 5;
    `)
    console.log('Team Members Sample:', res2.rows)

  } catch (err) {
    console.error(err)
  } finally {
    await client.end()
  }
}

checkProfiles()

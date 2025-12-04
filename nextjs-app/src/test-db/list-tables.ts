
import { Client } from 'pg'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const client = new Client({
  connectionString: process.env.DATABASE_URL,
})

async function listTables() {
  try {
    await client.connect()
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public';
    `)
    console.log('Tables:', res.rows.map(r => r.table_name))
  } catch (err) {
    console.error(err)
  } finally {
    await client.end()
  }
}

listTables()

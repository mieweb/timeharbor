
import { Client } from 'pg'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const client = new Client({
  connectionString: process.env.DATABASE_URL,
})

async function checkSchema() {
  try {
    await client.connect()
    const res = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'tickets';
    `)
    console.log('Tickets columns:', res.rows)
  } catch (err) {
    console.error(err)
  } finally {
    await client.end()
  }
}

checkSchema()

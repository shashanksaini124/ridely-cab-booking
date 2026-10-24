
import 'dotenv/config'
import pool from './postgres.js'

try {
  const result = await pool.query(
    'SELECT NOW() AS server_time, current_database() AS database_name'
  )

  console.log('Supabase PostgreSQL connected successfully!')
  console.log(result.rows[0])
} catch (error) {
  console.error('PostgreSQL connection failed:', error.message)
  process.exitCode = 1
} finally {
  await pool.end()
}

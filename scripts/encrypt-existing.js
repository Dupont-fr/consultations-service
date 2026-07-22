require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') })
const { encrypt } = require('../src/utils/encryption')
const { Pool } = require('pg')

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

async function main() {
  const fields = ['motif_consultation', 'observations', 'conclusion', 'decision', 'prescription']
  const col = fields.join(',')
  const { rows } = await pool.query(`SELECT id, ${col} FROM consultations`)

  let count = 0
  for (const row of rows) {
    for (const f of fields) {
      if (row[f] && !row[f].includes(':')) {
        const enc = encrypt(row[f])
        await pool.query(`UPDATE consultations SET ${f} = $1 WHERE id = $2`, [enc, row.id])
        count++
      }
    }
  }
  console.log(`✓ ${rows.length} consultations traitées, ${count} champs chiffrés`)
  process.exit(0)
}

main().catch(err => { console.error(err); process.exit(1) })

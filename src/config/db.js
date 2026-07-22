const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
})

pool.on('error', (err) => {
  console.error('❌ Erreur inattendue du pool PostgreSQL:', err.message)
})

const initDB = async () => {
  const client = await pool.connect()
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS consultations (
        id SERIAL PRIMARY KEY,
        patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,

        poids VARCHAR(50),
        taille VARCHAR(50),
        temperature VARCHAR(50),
        tension VARCHAR(50),
        motif_consultation TEXT,

        observations TEXT,
        conclusion TEXT,
        decision TEXT,
        prescription TEXT,

        doctor_id VARCHAR(255),
        doctor_name VARCHAR(255),
        doctor_specialty VARCHAR(255),
        created_by VARCHAR(255),

        statut VARCHAR(20) DEFAULT 'en_attente',

        consultation_date DATE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    const existing = await client.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'consultations'`
    )
    const cols = existing.rows.map(r => r.column_name)

    const addCol = (name, type) => {
      if (!cols.includes(name)) {
        return client.query(`ALTER TABLE consultations ADD COLUMN IF NOT EXISTS ${name} ${type}`)
      }
    }

    await addCol('poids', 'VARCHAR(50)')
    await addCol('taille', 'VARCHAR(50)')
    await addCol('temperature', 'VARCHAR(50)')
    await addCol('tension', 'VARCHAR(50)')
    await addCol('motif_consultation', 'TEXT')
    await addCol('observations', 'TEXT')
    await addCol('conclusion', 'TEXT')
    await addCol('decision', 'TEXT')
    await addCol('prescription', 'TEXT')
    await addCol('doctor_id', 'VARCHAR(255)')
    await addCol('doctor_name', 'VARCHAR(255)')
    await addCol('doctor_specialty', 'VARCHAR(255)')
    await addCol('doctor_hospital', 'VARCHAR(255)')
    await addCol('created_by', 'VARCHAR(255)')
    await addCol('statut', "VARCHAR(20) DEFAULT 'en_attente'")
    await addCol('contact_urgence_nom', 'VARCHAR(255)')
    await addCol('contact_urgence_telephone', 'VARCHAR(50)')
    await addCol('transfert_depuis', 'VARCHAR(255)')
    await addCol('transfert_vers', 'VARCHAR(255)')
    await addCol('transfert_par', 'VARCHAR(255)')
    await addCol('transfert_le', 'TIMESTAMP')

      await client.query(`
      CREATE TABLE IF NOT EXISTS consultation_interventions (
        id SERIAL PRIMARY KEY,
        consultation_id INTEGER NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
        doctor_id VARCHAR(255),
        doctor_name VARCHAR(255),
        doctor_specialty VARCHAR(255),
        doctor_hospital VARCHAR(255),
        action VARCHAR(50) NOT NULL,
        changes JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    const existingInt = await client.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'consultation_interventions'`
    )
    const intCols = existingInt.rows.map(r => r.column_name)

    if (!intCols.includes('changes')) {
      await client.query(`ALTER TABLE consultation_interventions ADD COLUMN changes JSONB`)
    }

    await client.query(`
      CREATE TABLE IF NOT EXISTS examens (
        id SERIAL PRIMARY KEY,
        consultation_id INTEGER NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL,
        description TEXT,
        hopital_source VARCHAR(255),
        hopital_destination VARCHAR(255),
        statut VARCHAR(20) DEFAULT 'en_attente',
        resultats TEXT,
        date_realisation TIMESTAMP,
        realise_par VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_consultation_per_day
      ON consultations (patient_id, doctor_hospital, doctor_specialty, consultation_date)
      WHERE statut != 'transferee'
    `)

    console.log('✅ Tables "consultations", "consultation_interventions" et "examens" prêtes')
  } finally {
    client.release()
  }
}

module.exports = { pool, initDB }

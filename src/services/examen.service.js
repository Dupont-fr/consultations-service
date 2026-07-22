const { pool } = require('../config/db')
const { encrypt, decrypt } = require('../utils/encryption')

class ExamenService {
  static async create(data) {
    const { consultationId, type, description, hopitalSource, hopitalDestination } = data
    const result = await pool.query(
      `INSERT INTO examens (consultation_id, type, description, hopital_source, hopital_destination)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [consultationId, type, description || null, hopitalSource || null, hopitalDestination || null],
    )
    return this.formatRow(result.rows[0])
  }

  static async getByConsultation(consultationId) {
    const result = await pool.query(
      `SELECT * FROM examens WHERE consultation_id = $1 ORDER BY created_at ASC`,
      [consultationId],
    )
    return result.rows.map(this.formatRow)
  }

  static async getByHospital(hospital, user) {
    const conditions = []
    const params = []
    let idx = 1

    if (hospital && user?.role !== 'ADMIN') {
      conditions.push(`(e.hopital_destination = $${idx} OR e.hopital_source = $${idx})`)
      params.push(hospital)
      idx++
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    const result = await pool.query(
      `SELECT e.*, c.id as consultation_ref_id, c.consultation_date, c.doctor_hospital,
              p.nom_patient, p.prenom_patient
       FROM examens e
       LEFT JOIN consultations c ON c.id = e.consultation_id
       LEFT JOIN patients p ON p.id = c.patient_id
       ${where}
       ORDER BY e.created_at DESC`,
      params,
    )
    return result.rows.map((r) => ({
      ...this.formatRow(r),
      consultationDate: r.consultation_date,
      consultationHospital: r.doctor_hospital,
      patientName: [r.nom_patient, r.prenom_patient].filter(Boolean).join(' '),
    }))
  }

  static async getPendingByHospital(hospital) {
    const result = await pool.query(
      `SELECT e.*, c.id as consultation_ref_id, c.consultation_date, c.doctor_hospital,
              p.nom_patient, p.prenom_patient
       FROM examens e
       LEFT JOIN consultations c ON c.id = e.consultation_id
       LEFT JOIN patients p ON p.id = c.patient_id
       WHERE e.hopital_destination = $1 AND e.statut = 'en_attente'
       ORDER BY e.created_at DESC`,
      [hospital],
    )
    return result.rows.map((r) => ({
      ...this.formatRow(r),
      consultationDate: r.consultation_date,
      consultationHospital: r.doctor_hospital,
      patientName: [r.nom_patient, r.prenom_patient].filter(Boolean).join(' '),
    }))
  }

  static async getById(id) {
    const result = await pool.query(
      `SELECT e.*, c.id as consultation_ref_id, c.consultation_date, c.doctor_hospital,
              p.nom_patient, p.prenom_patient
       FROM examens e
       LEFT JOIN consultations c ON c.id = e.consultation_id
       LEFT JOIN patients p ON p.id = c.patient_id
       WHERE e.id = $1`,
      [id],
    )
    if (result.rows.length === 0) throw new Error('Examen non trouvé')
    const r = result.rows[0]
    return {
      ...this.formatRow(r),
      consultationDate: r.consultation_date,
      consultationHospital: r.doctor_hospital,
      patientName: [r.nom_patient, r.prenom_patient].filter(Boolean).join(' '),
    }
  }

  static async updateResult(id, data) {
    const { resultats, realisePar } = data
    const encryptedResultats = encrypt(resultats)
    const result = await pool.query(
      `UPDATE examens SET resultats = $1, statut = 'realise', date_realisation = CURRENT_TIMESTAMP, realise_par = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3 RETURNING *`,
      [encryptedResultats, realisePar || null, id],
    )
    if (result.rows.length === 0) throw new Error('Examen non trouvé')
    return this.formatRow(result.rows[0])
  }

  static formatRow(row) {
    return {
      id: row.id,
      consultationId: row.consultation_id,
      type: row.type,
      description: row.description,
      hopitalSource: row.hopital_source,
      hopitalDestination: row.hopital_destination,
      statut: row.statut,
      resultats: decrypt(row.resultats),
      dateRealisation: row.date_realisation,
      realisePar: row.realise_par,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  }
}

module.exports = ExamenService
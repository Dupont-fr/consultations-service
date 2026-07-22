const { pool } = require('../config/db')
const { encrypt, decrypt } = require('../utils/encryption')

const SENSITIVE_FIELDS = ['motifConsultation', 'observations', 'conclusion', 'decision', 'prescription']
const SENSITIVE_COLS = ['motif_consultation', 'observations', 'conclusion', 'decision', 'prescription']

class ConsultationService {
  static async logIntervention(consultationId, doctorInfo, action, changes = null) {
    await pool.query(
      `INSERT INTO consultation_interventions
        (consultation_id, doctor_id, doctor_name, doctor_specialty, doctor_hospital, action, changes)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [
        consultationId,
        doctorInfo?.doctorId || null,
        doctorInfo?.doctorName || null,
        doctorInfo?.doctorSpecialty || null,
        doctorInfo?.doctorHospital || null,
        action,
        changes ? JSON.stringify(changes) : null,
      ],
    )
  }

  static async create(data) {
    let {
      patientId, date, motifConsultation,
      poids, taille, temperature, tension,
      observations, conclusion, decision, prescription,
      doctorId, doctorName, doctorSpecialty, doctorHospital, statut,
      contactUrgenceNom, contactUrgenceTelephone,
    } = data

    if (patientId && doctorHospital && doctorSpecialty && date) {
      const existing = await pool.query(
        `SELECT id FROM consultations
         WHERE patient_id = $1
           AND doctor_hospital = $2
           AND doctor_specialty = $3
           AND consultation_date = $4
           AND statut != 'transferee'`,
        [patientId, doctorHospital, doctorSpecialty, date],
      )
      if (existing.rows.length > 0) {
        throw new Error(
          `Ce patient a déjà été consulté dans le service "${doctorSpecialty}" à "${doctorHospital}" le ${date}. Un patient ne peut être consulté qu'une seule fois par jour et par service dans le même hôpital.`,
        )
      }
    }

    motifConsultation = encrypt(motifConsultation)
    observations = encrypt(observations)
    conclusion = encrypt(conclusion)
    decision = encrypt(decision)
    prescription = encrypt(prescription)

    const result = await pool.query(
      `INSERT INTO consultations
        (patient_id, consultation_date, motif_consultation,
         poids, taille, temperature, tension,
         observations, conclusion, decision, prescription,
         doctor_id, doctor_name, doctor_specialty, doctor_hospital, created_by, statut,
         contact_urgence_nom, contact_urgence_telephone)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
       RETURNING *`,
      [
        patientId, date, motifConsultation || null,
        poids || null, taille || null, temperature || null, tension || null,
        observations || null, conclusion || null, decision || null, prescription || null,
        doctorId || null, doctorName || null, doctorSpecialty || null, doctorHospital || null,
        data.createdBy || doctorId || null,
        statut || 'en_attente',
        contactUrgenceNom || null, contactUrgenceTelephone || null,
      ],
    )

    const consultation = result.rows[0]

    const initial = {}
    for (const f of ['motifConsultation','poids','taille','temperature','tension','observations','conclusion','decision','prescription']) {
      if (data[f]) initial[f] = data[f]
    }

    const hasDoctor = doctorSpecialty && doctorSpecialty !== 'null'
    await this.logIntervention(
      consultation.id,
      { doctorId, doctorName, doctorSpecialty, doctorHospital },
      hasDoctor ? 'prise_en_charge' : 'creation',
      Object.keys(initial).length > 0 ? initial : null,
    )

    return consultation
  }

  static formatRow(row) {
    return {
      _id: row.id,
      id: row.id,
      patientId: row.patient_id,
      patientName: [row.nom_patient, row.prenom_patient].filter(Boolean).join(' '),
      patientGenre: row.genre_patient,
      date: row.consultation_date,
      motifConsultation: decrypt(row.motif_consultation),
      poids: row.poids,
      taille: row.taille,
      temperature: row.temperature,
      tension: row.tension,
      observations: decrypt(row.observations),
      conclusion: decrypt(row.conclusion),
      decision: decrypt(row.decision),
      prescription: decrypt(row.prescription),
      doctorId: row.doctor_id,
      doctorName: row.doctor_name,
      doctorSpecialty: row.doctor_specialty,
      doctorHospital: row.doctor_hospital,
      contactUrgenceNom: row.contact_urgence_nom,
      contactUrgenceTelephone: row.contact_urgence_telephone,
      transfertDepuis: row.transfert_depuis,
      transfertVers: row.transfert_vers,
      createdBy: row.created_by,
      statut: row.statut,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  }

  static async getAll(filters = {}) {
    const { page = 1, limit = 50, patientId } = filters
    const conditions = []
    const params = []
    let idx = 1

    if (patientId) {
      conditions.push(`c.patient_id = $${idx++}`)
      params.push(patientId)
    }

    if (filters.doctorId) {
      conditions.push(`(c.doctor_id = $${idx} OR c.id IN (SELECT consultation_id FROM consultation_interventions WHERE doctor_id = $${idx}))`)
      params.push(filters.doctorId)
      idx++
    }

    if (filters.doctorHospital) {
      conditions.push(`c.doctor_hospital = $${idx++}`)
      params.push(filters.doctorHospital)
    }

    if (filters.doctorSpecialty) {
      conditions.push(`(c.doctor_specialty = $${idx} OR c.id IN (SELECT consultation_id FROM consultation_interventions WHERE doctor_specialty = $${idx}))`)
      params.push(filters.doctorSpecialty)
      idx++
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
    const offset = (page - 1) * limit

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM consultations c ${where}`, params,
    )
    const total = parseInt(countResult.rows[0].count, 10)

    const dataResult = await pool.query(
      `SELECT c.*, p.nom_patient, p.prenom_patient, p.genre_patient
       FROM consultations c
       LEFT JOIN patients p ON p.id = c.patient_id
       ${where}
       ORDER BY c.consultation_date DESC, c.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, limit, offset],
    )

    return {
      data: dataResult.rows.map(this.formatRow),
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
    }
  }

  static async getFieldOwners(consultationId) {
    const result = await pool.query(
      `SELECT * FROM consultation_interventions WHERE consultation_id = $1 ORDER BY created_at ASC`,
      [consultationId],
    )
    const fieldOwners = {}
    for (const intervention of result.rows) {
      if (!intervention.changes) continue
      const changes = typeof intervention.changes === 'string' ? JSON.parse(intervention.changes) : intervention.changes
      for (const [field, value] of Object.entries(changes)) {
        let hasValue = false
        if (value && typeof value === 'object' && 'new' in value) {
          hasValue = value.new !== null && value.new !== undefined && value.new !== ''
        } else {
          hasValue = value !== null && value !== undefined && value !== ''
        }
        if (hasValue) {
          fieldOwners[field] = intervention.doctor_id
        }
      }
    }
    return fieldOwners
  }

  static async getById(id, currentDoctorId) {
    const result = await pool.query(
      `SELECT c.*, p.nom_patient, p.prenom_patient, p.genre_patient
       FROM consultations c
       LEFT JOIN patients p ON p.id = c.patient_id
       WHERE c.id = $1`,
      [id],
    )
    if (result.rows.length === 0) throw new Error('Consultation non trouvée')

    const consultation = this.formatRow(result.rows[0])

    const interventionsResult = await pool.query(
      `SELECT * FROM consultation_interventions
       WHERE consultation_id = $1
       ORDER BY created_at ASC`,
      [id],
    )
    consultation.interventions = interventionsResult.rows.map((r) => ({
      id: r.id,
      doctorId: r.doctor_id,
      doctorName: r.doctor_name,
      doctorSpecialty: r.doctor_specialty,
      doctorHospital: r.doctor_hospital,
      action: r.action,
      changes: r.changes,
      createdAt: r.created_at,
    }))

    const fieldOwners = await this.getFieldOwners(id)
    consultation.fieldOwners = fieldOwners

    const readOnlyFields = {}
    for (const [field, owner] of Object.entries(fieldOwners)) {
      readOnlyFields[field] = owner && owner !== currentDoctorId
    }
    consultation.readOnlyFields = readOnlyFields

    return consultation
  }

  static async update(id, data) {
    const currentDoctorId = data._currentDoctorId
    delete data._currentDoctorId

    const before = await pool.query(
      `SELECT * FROM consultations WHERE id = $1`, [id],
    )
    if (before.rows.length === 0) throw new Error('Consultation non trouvée')
    const old = before.rows[0]

    const fieldOwners = await this.getFieldOwners(id)

    const fields = []
    const params = []
    let idx = 1

    const map = {
      patientId: 'patient_id',
      date: 'consultation_date',
      motifConsultation: 'motif_consultation',
      poids: 'poids',
      taille: 'taille',
      temperature: 'temperature',
      tension: 'tension',
      observations: 'observations',
      conclusion: 'conclusion',
      decision: 'decision',
      prescription: 'prescription',
      doctorId: 'doctor_id',
      doctorName: 'doctor_name',
      doctorSpecialty: 'doctor_specialty',
      doctorHospital: 'doctor_hospital',
      contactUrgenceNom: 'contact_urgence_nom',
      contactUrgenceTelephone: 'contact_urgence_telephone',
      statut: 'statut',
    }

    const originalSensitive = {}
    for (const key of ['motifConsultation', 'observations', 'conclusion', 'decision', 'prescription']) {
      if (data[key] !== undefined) originalSensitive[key] = data[key]
    }
    for (const key of ['motifConsultation', 'observations', 'conclusion', 'decision', 'prescription']) {
      if (data[key] !== undefined) data[key] = encrypt(data[key])
    }

    const trackFields = ['motifConsultation','poids','taille','temperature','tension','observations','conclusion','decision','prescription']

    for (const [key, col] of Object.entries(map)) {
      if (key === 'doctorId') {
        if (currentDoctorId) {
          fields.push(`${col} = $${idx++}`)
          params.push(currentDoctorId)
        }
        continue
      }
      if (key.startsWith('doctor')) {
        if (data[key] !== undefined && data[key] !== null) {
          fields.push(`${col} = $${idx++}`)
          params.push(data[key])
        }
        continue
      }
      if (data[key] === undefined) continue
      if (!trackFields.includes(key) && key !== 'statut' && key !== 'patientId' && key !== 'date') {
        fields.push(`${col} = $${idx++}`)
        params.push(data[key])
        continue
      }
      if (key === 'statut') {
        fields.push(`${col} = $${idx++}`)
        params.push(data[key])
        continue
      }
      if (trackFields.includes(key)) {
        const owner = fieldOwners[key]
        const canEdit = !owner || owner === currentDoctorId
        if (!canEdit) {
          throw new Error(`Vous ne pouvez pas modifier le champ "${key}" car il a été renseigné par un autre médecin`)
        }
        fields.push(`${col} = $${idx++}`)
        params.push(data[key])
      }
    }

    if (fields.length === 0) throw new Error('Aucune donnée à mettre à jour')

    fields.push(`updated_at = CURRENT_TIMESTAMP`)
    params.push(id)

    const result = await pool.query(
      `UPDATE consultations SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      params,
    )
    if (result.rows.length === 0) throw new Error('Consultation non trouvée')

    const changes = {}
    for (const f of trackFields) {
      const col = map[f]
      const oldVal = decrypt(old[col])
      const newVal = originalSensitive[f] !== undefined ? originalSensitive[f] : (data[f] !== undefined ? data[f] : undefined)
      if (newVal !== undefined && String(newVal) !== String(oldVal)) {
        changes[f] = { old: oldVal || null, new: newVal || null }
      }
    }

    const hasDoctorTakingOver = data.doctorSpecialty && data.doctorSpecialty !== 'null'
    if (hasDoctorTakingOver || Object.keys(changes).length > 0) {
      const prev = await pool.query(
        `SELECT id FROM consultation_interventions
         WHERE consultation_id = $1 AND action = 'prise_en_charge'
         LIMIT 1`,
        [id],
      )
      const action = prev.rows.length === 0 ? 'prise_en_charge' : 'modification'
      await this.logIntervention(
        id,
        { doctorId: currentDoctorId, doctorName: data.doctorName, doctorSpecialty: data.doctorSpecialty, doctorHospital: data.doctorHospital },
        action,
        Object.keys(changes).length > 0 ? changes : null,
      )
    }

    const full = await pool.query(
      `SELECT c.*, p.nom_patient, p.prenom_patient, p.genre_patient
       FROM consultations c LEFT JOIN patients p ON p.id = c.patient_id WHERE c.id = $1`,
      [id],
    )
    return this.formatRow(full.rows[0])
  }

  static async delete(id) {
    const result = await pool.query(
      'DELETE FROM consultations WHERE id = $1 RETURNING *',
      [id],
    )
    if (result.rows.length === 0) throw new Error('Consultation non trouvée')
    return result.rows[0]
  }

  static async transfer(id, data) {
    const { destinationHospital, currentDoctorId, doctorName, doctorSpecialty } = data

    const before = await pool.query('SELECT * FROM consultations WHERE id = $1', [id])
    if (before.rows.length === 0) throw new Error('Consultation non trouvée')

    const orig = before.rows[0]
    const oldHospital = orig.doctor_hospital

    const existingDest = await pool.query(
      `SELECT id FROM consultations
       WHERE patient_id = $1
         AND doctor_hospital = $2
         AND doctor_specialty = $3
         AND consultation_date = $4
         AND statut != 'transferee'`,
      [orig.patient_id, destinationHospital, orig.doctor_specialty, orig.consultation_date],
    )
    if (existingDest.rows.length > 0) {
      throw new Error(
        `Ce patient a déjà été consulté dans le service "${orig.doctor_specialty}" à "${destinationHospital}" le ${orig.consultation_date}. Transfert impossible.`,
      )
    }

    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      // 1. Mark original as transferred in the source hospital
      await client.query(
        `UPDATE consultations SET statut = 'transferee', transfert_vers = $1, transfert_par = $2, transfert_le = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $3`,
        [destinationHospital, currentDoctorId, id],
      )

      // 2. Create a duplicate consultation in the destination hospital
      const copy = await client.query(
        `INSERT INTO consultations
          (patient_id, consultation_date, motif_consultation,
           poids, taille, temperature, tension,
           observations, conclusion, decision, prescription,
           doctor_id, doctor_name, doctor_specialty, doctor_hospital, created_by, statut,
           contact_urgence_nom, contact_urgence_telephone,
           transfert_depuis, transfert_vers, transfert_par, transfert_le)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,CURRENT_TIMESTAMP)
         RETURNING *`,
        [
          orig.patient_id, orig.consultation_date, orig.motif_consultation,
          orig.poids, orig.taille, orig.temperature, orig.tension,
          orig.observations, orig.conclusion, orig.decision, orig.prescription,
          orig.doctor_id, orig.doctor_name, orig.doctor_specialty, destinationHospital,
          orig.created_by, 'en_attente',
          orig.contact_urgence_nom, orig.contact_urgence_telephone,
          oldHospital, destinationHospital, currentDoctorId,
        ],
      )

      const newConsultation = copy.rows[0]

      // 3. Log intervention on the original
      await client.query(
        `INSERT INTO consultation_interventions (consultation_id, doctor_id, doctor_name, doctor_specialty, doctor_hospital, action, changes)
         VALUES ($1, $2, $3, $4, $5, 'transfert_sortant', $6)`,
        [id, currentDoctorId, doctorName, doctorSpecialty, oldHospital,
         JSON.stringify({ transfert_vers: destinationHospital, copie_id: newConsultation.id })],
      )

      // 4. Log intervention on the new copy
      await client.query(
        `INSERT INTO consultation_interventions (consultation_id, doctor_id, doctor_name, doctor_specialty, doctor_hospital, action, changes)
         VALUES ($1, $2, $3, $4, $5, 'transfert_entrant', $6)`,
        [newConsultation.id, currentDoctorId, doctorName, doctorSpecialty, destinationHospital,
         JSON.stringify({ transfert_depuis: oldHospital, original_id: id })],
      )

      await client.query('COMMIT')

      return this.formatRow(newConsultation)
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  }
}

module.exports = ConsultationService

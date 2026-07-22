const { pool } = require('../config/db')

class NotificationService {
  static async create({ hospital, userId, type, title, message, link, data }) {
    const result = await pool.query(
      `INSERT INTO notifications (hospital, user_id, type, title, message, link, data)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [hospital || null, userId || null, type, title, message || null, link || null, data ? JSON.stringify(data) : null],
    )
    return this.formatRow(result.rows[0])
  }

  static async getByHospital(hospital, { page = 1, limit = 50 } = {}) {
    const offset = (page - 1) * limit
    const result = await pool.query(
      `SELECT * FROM notifications WHERE hospital = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [hospital, limit, offset],
    )
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM notifications WHERE hospital = $1`, [hospital],
    )
    return {
      data: result.rows.map(this.formatRow),
      total: parseInt(countResult.rows[0].count, 10),
    }
  }

  static async getByUserId(userId, { page = 1, limit = 50 } = {}) {
    const offset = (page - 1) * limit
    const result = await pool.query(
      `SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [userId, limit, offset],
    )
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM notifications WHERE user_id = $1`, [userId],
    )
    return {
      data: result.rows.map(this.formatRow),
      total: parseInt(countResult.rows[0].count, 10),
    }
  }

  static async getUnreadCount(hospital, userId) {
    const conditions = []
    const params = []
    if (hospital) {
      params.push(hospital)
      conditions.push(`hospital = $${params.length}`)
    }
    if (userId) {
      params.push(userId)
      conditions.push(`user_id = $${params.length}`)
    }
    if (params.length === 0) return 0
    const where = `AND (${conditions.join(' OR ')})`
    const result = await pool.query(
      `SELECT COUNT(*) FROM notifications WHERE read = false ${where}`, params,
    )
    return parseInt(result.rows[0].count, 10)
  }

  static async markRead(id) {
    await pool.query('UPDATE notifications SET read = true WHERE id = $1', [id])
  }

  static async markAllRead(hospital, userId) {
    const conditions = []
    const params = []
    if (hospital) {
      params.push(hospital)
      conditions.push(`hospital = $${params.length}`)
    }
    if (userId) {
      params.push(userId)
      conditions.push(`user_id = $${params.length}`)
    }
    if (params.length === 0) return
    const where = conditions.length > 0 ? `WHERE ${conditions.join(' OR ')}` : ''
    await pool.query(`UPDATE notifications SET read = true ${where}`, params)
  }

  static formatRow(row) {
    return {
      id: row.id,
      hospital: row.hospital,
      userId: row.user_id,
      type: row.type,
      title: row.title,
      message: row.message,
      link: row.link,
      data: row.data,
      read: row.read,
      createdAt: row.created_at,
    }
  }
}

module.exports = NotificationService

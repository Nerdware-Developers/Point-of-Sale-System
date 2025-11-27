import { query } from '../config/database.js';

export const auditLog = async (userId, action, tableName = null, recordId = null, details = null) => {
  try {
    await query(
      'INSERT INTO audit_logs (user_id, action, table_name, record_id, details) VALUES ($1, $2, $3, $4, $5)',
      [userId, action, tableName, recordId, details ? JSON.stringify(details) : null]
    );
  } catch (error) {
    console.error('Audit log error:', error);
  }
};


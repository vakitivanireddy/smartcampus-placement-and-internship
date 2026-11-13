const { query } = require('../db/pool');
const env = require('../config/env');

/**
 * Generates in-app reminders from bookmarks, tracked applications and their
 * dates. There is no email/SMS provider configured, so this function only
 * writes rows to the notifications table.
 */
async function syncNotifications(userId) {
  const deadlineRows = await query(
    `SELECT DISTINCT o.id, o.title, o.company, DATE_FORMAT(o.application_deadline, '%Y-%m-%d') AS deadline,
            DATEDIFF(o.application_deadline, CURDATE()) AS days_left
     FROM opportunities o
     LEFT JOIN bookmarks b ON b.opportunity_id = o.id AND b.user_id = ?
     LEFT JOIN applications a ON a.opportunity_id = o.id AND a.user_id = ?
     WHERE o.is_active = 1 AND (b.id IS NOT NULL OR a.id IS NOT NULL)
       AND o.application_deadline >= CURDATE()
       AND o.application_deadline <= DATE_ADD(CURDATE(), INTERVAL ? DAY)`,
    [userId, userId, env.deadlineReminderDays],
  );

  for (const row of deadlineRows) {
    const when = row.days_left === 0 ? 'today' : row.days_left === 1 ? 'tomorrow' : `in ${row.days_left} days`;
    await query(
      `INSERT IGNORE INTO notifications (user_id, type, title, message, link, due_at, dedupe_key)
       VALUES (?, 'deadline', ?, ?, ?, ?, ?)`,
      [
        userId,
        `Deadline ${when}: ${row.title}`,
        `${row.company} closes applications ${when} (${row.deadline}). This reminder is based on an opportunity you bookmarked or are tracking.`,
        `/opportunities/${row.id}`,
        `${row.deadline} 09:00:00`,
        `deadline-${row.id}-${row.deadline}`,
      ],
    );
  }

  const eventRows = await query(
    `SELECT a.id, a.assessment_date, a.interview_date, o.id AS opportunity_id, o.title, o.company
     FROM applications a JOIN opportunities o ON o.id = a.opportunity_id
     WHERE a.user_id = ?
       AND (
         (a.assessment_date IS NOT NULL AND a.assessment_date BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 14 DAY))
         OR (a.interview_date IS NOT NULL AND a.interview_date BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 14 DAY))
       )`,
    [userId],
  );
  for (const row of eventRows) {
    for (const type of ['assessment', 'interview']) {
      const at = row[`${type}_date`];
      if (!at) continue;
      const stamp = new Date(at).toISOString().slice(0, 16).replace('T', ' ');
      await query(
        `INSERT IGNORE INTO notifications (user_id, type, title, message, link, due_at, dedupe_key)
         VALUES (?, ?, ?, ?, '/applications', ?, ?)`,
        [
          userId,
          type,
          `${type === 'assessment' ? 'Assessment' : 'Interview'} coming up: ${row.title}`,
          `${row.company} has a scheduled ${type} on ${stamp} UTC. Open your tracker to review details.`,
          at,
          `${type}-${row.id}-${stamp}`,
        ],
      );
    }
  }
}

async function listNotifications(userId) {
  await syncNotifications(userId);
  const rows = await query(
    `SELECT id, type, title, message, link, due_at, is_read, created_at
     FROM notifications WHERE user_id = ? ORDER BY is_read ASC, created_at DESC LIMIT 50`,
    [userId],
  );
  const unread = rows.filter((row) => !row.is_read).length;
  return { notifications: rows.map((row) => ({ ...row, is_read: Boolean(row.is_read) })), unread };
}

module.exports = { syncNotifications, listNotifications };

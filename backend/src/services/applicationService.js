const { query } = require('../db/pool');

const APPLICATION_STATUSES = ['interested', 'applied', 'assessment', 'interview', 'selected', 'rejected'];

async function listApplications(userId) {
  const rows = await query(
    `SELECT a.id, a.status, a.applied_date, a.assessment_date, a.interview_date, a.notes,
            a.created_at, a.updated_at,
            o.id AS opportunity_id, o.title, o.company, o.type, o.location, o.work_mode,
            o.salary_stipend, DATE_FORMAT(o.application_deadline, '%Y-%m-%d') AS application_deadline,
            o.is_sample, o.is_active
     FROM applications a
     JOIN opportunities o ON o.id = a.opportunity_id
     WHERE a.user_id = ?
     ORDER BY FIELD(a.status, 'interview','assessment','applied','interested','selected','rejected'),
              a.updated_at DESC`,
    [userId],
  );
  return rows.map((row) => ({
    id: row.id,
    status: row.status,
    applied_date: row.applied_date ? new Date(row.applied_date).toISOString().slice(0, 10) : null,
    assessment_date: row.assessment_date,
    interview_date: row.interview_date,
    notes: row.notes,
    created_at: row.created_at,
    updated_at: row.updated_at,
    opportunity: {
      id: row.opportunity_id,
      title: row.title,
      company: row.company,
      type: row.type,
      location: row.location,
      work_mode: row.work_mode,
      salary_stipend: row.salary_stipend,
      application_deadline: row.application_deadline,
      is_sample: Boolean(row.is_sample),
      is_active: Boolean(row.is_active),
    },
  }));
}

async function getStatusCounts(userId) {
  const rows = await query(
    'SELECT status, COUNT(*) AS count FROM applications WHERE user_id = ? GROUP BY status',
    [userId],
  );
  const counts = Object.fromEntries(APPLICATION_STATUSES.map((status) => [status, 0]));
  for (const row of rows) counts[row.status] = Number(row.count);
  counts.total = Object.values(counts).reduce((sum, value) => sum + value, 0);
  return counts;
}

async function getUpcomingEvents(userId, days = 30) {
  const applicationEvents = await query(
    `SELECT a.id AS application_id, a.status, o.id AS opportunity_id, o.title, o.company,
            'assessment' AS event_type, a.assessment_date AS event_at
     FROM applications a JOIN opportunities o ON o.id = a.opportunity_id
     WHERE a.user_id = ? AND a.assessment_date IS NOT NULL
       AND a.assessment_date >= NOW() AND a.assessment_date <= DATE_ADD(NOW(), INTERVAL ? DAY)
     UNION ALL
     SELECT a.id, a.status, o.id, o.title, o.company, 'interview', a.interview_date
     FROM applications a JOIN opportunities o ON o.id = a.opportunity_id
     WHERE a.user_id = ? AND a.interview_date IS NOT NULL
       AND a.interview_date >= NOW() AND a.interview_date <= DATE_ADD(NOW(), INTERVAL ? DAY)`,
    [userId, days, userId, days],
  );

  const deadlineEvents = await query(
    `SELECT DISTINCT o.id AS opportunity_id, o.title, o.company,
            (SELECT a2.id FROM applications a2 WHERE a2.user_id = ? AND a2.opportunity_id = o.id LIMIT 1) AS application_id,
            DATE_FORMAT(o.application_deadline, '%Y-%m-%d') AS event_at
     FROM opportunities o
     LEFT JOIN bookmarks b ON b.opportunity_id = o.id AND b.user_id = ?
     LEFT JOIN applications a ON a.opportunity_id = o.id AND a.user_id = ?
     WHERE o.is_active = 1 AND (b.id IS NOT NULL OR a.id IS NOT NULL)
       AND o.application_deadline >= CURDATE()
       AND o.application_deadline <= DATE_ADD(CURDATE(), INTERVAL ? DAY)`,
    [userId, userId, userId, days],
  );

  const events = [
    ...applicationEvents.map((event) => ({
      event_type: event.event_type,
      event_at: event.event_at,
      title: `${event.event_type === 'assessment' ? 'Assessment' : 'Interview'}: ${event.title}`,
      company: event.company,
      opportunity_id: event.opportunity_id,
      application_id: event.application_id,
      link: '/applications',
    })),
    ...deadlineEvents.map((event) => ({
      event_type: 'deadline',
      event_at: `${event.event_at}T23:59:00`,
      title: `Application deadline: ${event.title}`,
      company: event.company,
      opportunity_id: event.opportunity_id,
      application_id: event.application_id,
      link: `/opportunities/${event.opportunity_id}`,
    })),
  ];

  return events.sort((a, b) => new Date(a.event_at) - new Date(b.event_at));
}

module.exports = { APPLICATION_STATUSES, listApplications, getStatusCounts, getUpcomingEvents };

const { query } = require('../db/pool');
const { notFound } = require('../utils/httpError');
const asyncHandler = require('../utils/asyncHandler');

const CATEGORY_ORDER = ['DSA', 'Programming', 'Core CS', 'Development', 'Aptitude', 'Interviews'];

function decorateTopic(topic) {
  const tasksTotal = Number(topic.tasks_total || 0);
  const tasksCompleted = Number(topic.tasks_completed || 0);
  const percent = tasksTotal > 0
    ? Math.round((tasksCompleted / tasksTotal) * 100)
    : (topic.is_completed ? 100 : 0);
  return {
    ...topic,
    tasks_total: tasksTotal,
    tasks_completed: tasksCompleted,
    resources_total: Number(topic.resources_total || 0),
    notes_total: Number(topic.notes_total || 0),
    is_completed: Boolean(topic.is_completed),
    progress_percent: percent,
  };
}

const listTopics = asyncHandler(async (req, res) => {
  const topics = await query(
    `SELECT t.id, t.slug, t.title, t.category, t.description, t.estimated_minutes, t.sort_order,
            COALESCE(sp.is_completed, 0) AS is_completed, sp.completed_at,
            (SELECT COUNT(*) FROM practice_tasks pt WHERE pt.topic_id = t.id) AS tasks_total,
            (SELECT COUNT(*) FROM practice_task_progress ptp JOIN practice_tasks pt ON pt.id = ptp.task_id
              WHERE pt.topic_id = t.id AND ptp.user_id = ? AND ptp.is_completed = 1) AS tasks_completed,
            (SELECT COUNT(*) FROM learning_resources lr WHERE lr.topic_id = t.id) AS resources_total,
            (SELECT COUNT(*) FROM personal_notes pn WHERE pn.topic_id = t.id AND pn.user_id = ?) AS notes_total
     FROM preparation_topics t
     LEFT JOIN student_progress sp ON sp.topic_id = t.id AND sp.user_id = ?
     WHERE t.is_active = 1
     ORDER BY FIELD(t.category, ${CATEGORY_ORDER.map((c) => `'${c}'`).join(',')}), t.sort_order, t.title`,
    [req.user.id, req.user.id, req.user.id],
  );
  const decorated = topics.map(decorateTopic);
  const completed = decorated.filter((topic) => topic.is_completed).length;
  const categories = CATEGORY_ORDER.map((category) => {
    const items = decorated.filter((topic) => topic.category === category);
    return {
      category,
      total: items.length,
      completed: items.filter((topic) => topic.is_completed).length,
    };
  });
  const practiceTasksTotal = decorated.reduce((sum, topic) => sum + topic.tasks_total, 0);
  const practiceTasksCompleted = decorated.reduce((sum, topic) => sum + topic.tasks_completed, 0);

  res.json({
    data: decorated,
    summary: {
      topics_total: decorated.length,
      topics_completed: completed,
      completion_percent: decorated.length ? Math.round((completed / decorated.length) * 100) : 0,
      practice_tasks_total: practiceTasksTotal,
      practice_tasks_completed: practiceTasksCompleted,
      practice_percent: practiceTasksTotal ? Math.round((practiceTasksCompleted / practiceTasksTotal) * 100) : 0,
      categories,
      total_estimated_minutes: decorated.reduce((sum, topic) => sum + topic.estimated_minutes, 0),
    },
  });
});

const getTopic = asyncHandler(async (req, res) => {
  const rows = await query(
    `SELECT t.*, COALESCE(sp.is_completed, 0) AS is_completed, sp.completed_at
     FROM preparation_topics t
     LEFT JOIN student_progress sp ON sp.topic_id = t.id AND sp.user_id = ?
     WHERE t.slug = ? AND t.is_active = 1 LIMIT 1`,
    [req.user.id, req.params.slug],
  );
  if (!rows[0]) throw notFound('Preparation topic not found.');
  const topic = rows[0];
  const [resources, tasks, notes, neighbours] = await Promise.all([
    query('SELECT id, title, url, provider, resource_type, is_free FROM learning_resources WHERE topic_id = ? ORDER BY id', [topic.id]),
    query(
      `SELECT pt.id, pt.title, pt.description, pt.sort_order, COALESCE(ptp.is_completed, 0) AS is_completed, ptp.completed_at
       FROM practice_tasks pt
       LEFT JOIN practice_task_progress ptp ON ptp.task_id = pt.id AND ptp.user_id = ?
       WHERE pt.topic_id = ? ORDER BY pt.sort_order, pt.id`,
      [req.user.id, topic.id],
    ),
    query(
      'SELECT id, title, body, created_at, updated_at FROM personal_notes WHERE user_id = ? AND topic_id = ? ORDER BY updated_at DESC',
      [req.user.id, topic.id],
    ),
    query(
      `SELECT slug, title FROM preparation_topics WHERE is_active = 1 AND sort_order < ? ORDER BY sort_order DESC LIMIT 1`,
      [topic.sort_order],
    ),
  ]);
  const nextRows = await query(
    `SELECT slug, title FROM preparation_topics WHERE is_active = 1 AND sort_order > ? ORDER BY sort_order ASC LIMIT 1`,
    [topic.sort_order],
  );
  const taskCompleted = tasks.filter((task) => task.is_completed).length;
  res.json({
    data: {
      ...topic,
      is_completed: Boolean(topic.is_completed),
      resources,
      tasks: tasks.map((task) => ({ ...task, is_completed: Boolean(task.is_completed) })),
      notes,
      progress: {
        tasks_total: tasks.length,
        tasks_completed: taskCompleted,
        percent: tasks.length ? Math.round((taskCompleted / tasks.length) * 100) : (topic.is_completed ? 100 : 0),
      },
      previous: neighbours[0] || null,
      next: nextRows[0] || null,
    },
  });
});

const updateTopicProgress = asyncHandler(async (req, res) => {
  const topic = await query('SELECT id FROM preparation_topics WHERE id = ?', [req.params.id]);
  if (!topic[0]) throw notFound('Preparation topic not found.');
  const completed = req.body.completed;
  await query(
    `INSERT INTO student_progress (user_id, topic_id, is_completed, completed_at)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE is_completed = VALUES(is_completed), completed_at = VALUES(completed_at)`,
    [req.user.id, req.params.id, completed ? 1 : 0, completed ? new Date() : null],
  );
  res.json({ message: completed ? 'Topic marked as completed.' : 'Topic marked as in progress.', data: { completed } });
});

const updateTaskProgress = asyncHandler(async (req, res) => {
  const task = await query('SELECT id, topic_id FROM practice_tasks WHERE id = ?', [req.params.id]);
  if (!task[0]) throw notFound('Practice task not found.');
  const completed = req.body.completed;
  await query(
    `INSERT INTO practice_task_progress (user_id, task_id, is_completed, completed_at)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE is_completed = VALUES(is_completed), completed_at = VALUES(completed_at)`,
    [req.user.id, req.params.id, completed ? 1 : 0, completed ? new Date() : null],
  );
  const counts = await query(
    `SELECT COUNT(*) AS total, SUM(ptp.is_completed = 1) AS completed
     FROM practice_tasks pt LEFT JOIN practice_task_progress ptp
       ON ptp.task_id = pt.id AND ptp.user_id = ?
     WHERE pt.topic_id = ?`,
    [req.user.id, task[0].topic_id],
  );
  res.json({
    message: completed ? 'Practice task completed.' : 'Practice task marked incomplete.',
    data: {
      completed,
      tasks_total: Number(counts[0].total),
      tasks_completed: Number(counts[0].completed || 0),
    },
  });
});

const createNote = asyncHandler(async (req, res) => {
  const topic = await query('SELECT id FROM preparation_topics WHERE id = ?', [req.params.id]);
  if (!topic[0]) throw notFound('Preparation topic not found.');
  const result = await query(
    'INSERT INTO personal_notes (user_id, topic_id, title, body) VALUES (?, ?, ?, ?)',
    [req.user.id, req.params.id, req.body.title, req.body.body],
  );
  const rows = await query('SELECT * FROM personal_notes WHERE id = ?', [result.insertId]);
  res.status(201).json({ data: rows[0], message: 'Note saved.' });
});

const updateNote = asyncHandler(async (req, res) => {
  await query(
    'UPDATE personal_notes SET title = ?, body = ? WHERE id = ? AND user_id = ?',
    [req.body.title, req.body.body, req.params.id, req.user.id],
  );
  const rows = await query('SELECT * FROM personal_notes WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  if (!rows[0]) throw notFound('Note not found.');
  res.json({ data: rows[0], message: 'Note updated.' });
});

const deleteNote = asyncHandler(async (req, res) => {
  await query('DELETE FROM personal_notes WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  res.json({ message: 'Note deleted.' });
});

const listAllNotes = asyncHandler(async (req, res) => {
  const rows = await query(
    `SELECT pn.id, pn.title, pn.body, pn.created_at, pn.updated_at, t.slug AS topic_slug, t.title AS topic_title
     FROM personal_notes pn LEFT JOIN preparation_topics t ON t.id = pn.topic_id
     WHERE pn.user_id = ? ORDER BY pn.updated_at DESC`,
    [req.user.id],
  );
  res.json({ data: rows });
});

module.exports = {
  listTopics, getTopic, updateTopicProgress, updateTaskProgress,
  createNote, updateNote, deleteNote, listAllNotes,
};

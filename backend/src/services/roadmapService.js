const { query, withTransaction } = require('../db/pool');
const { getSkillGap } = require('./skillGapService');
const { generateAiRoadmap, isConfigured } = require('./aiRoadmapService');
const { notFound, badRequest } = require('../utils/httpError');

function addDays(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

async function allTopics() {
  return query('SELECT id, slug, title, category, description FROM preparation_topics WHERE is_active = 1 ORDER BY sort_order');
}

function buildRuleTasks(gap, index, topicBySlug, resourcesByTopic) {
  const topic = topicBySlug[gap.topic_slug] || null;
  const topicResource = topic ? resourcesByTopic[topic.id]?.[0] : null;
  const resourceUrl = gap.resource_url || topicResource?.url || null;
  const base = 1 + index * 2;
  const tasks = [
    {
      title: `Study ${gap.name} fundamentals`,
      description: `${gap.why} Work through the linked resource and write a one-page summary of the key ideas you need for interviews.`,
      priority: gap.priority,
      offset_days: base,
      skill_name: gap.name,
      topic_slug: topic?.slug || gap.topic_slug,
      resource_url: resourceUrl,
    },
    {
      title: `Practice ${gap.name} with a small exercise`,
      description: topic
        ? `Turn the notes into practice. Try one exercise from ${topic.title} and record what was difficult. Do not mark this complete until you can explain the approach without help.`
        : `Build a small, focused exercise using ${gap.name}. Record the problem, approach and what you would improve next time.`,
      priority: gap.priority,
      offset_days: base + 1,
      skill_name: gap.name,
      topic_slug: topic?.slug || gap.topic_slug,
      resource_url: topicResource?.url || gap.resource_url || null,
    },
  ];
  return tasks;
}

function generalTasks(topicsBySlug) {
  return [
    {
      title: 'Complete one timed DSA practice set',
      description: 'Solve two medium problems in 60 minutes. Review mistakes and add the patterns you missed to your notes.',
      priority: 'high',
      offset_days: 7,
      skill_name: 'Data Structures and Algorithms',
      topic_slug: 'dsa',
      resource_url: 'https://neetcode.io/roadmap',
    },
    {
      title: 'Take a timed aptitude sectional test',
      description: 'Use a 30-minute sectional test. Classify every mistake as knowledge, carelessness or time management.',
      priority: 'medium',
      offset_days: 12,
      skill_name: 'Aptitude',
      topic_slug: 'aptitude',
      resource_url: 'https://www.indiabix.com/aptitude/questions-and-answers/',
    },
    {
      title: 'Do a mock technical interview',
      description: 'Practise explaining one project and solving one problem out loud. Ask a peer to give written feedback.',
      priority: 'high',
      offset_days: 18,
      skill_name: 'Communication',
      topic_slug: 'technical-interviews',
      resource_url: 'https://www.pramp.com/',
    },
    {
      title: 'Apply to three matching opportunities',
      description: 'Update your resume, check eligibility, and track each application. Tailor your project bullets to the role.',
      priority: 'high',
      offset_days: 24,
      skill_name: 'Communication',
      topic_slug: null,
      resource_url: null,
    },
    {
      title: 'Review progress and refresh your roadmap',
      description: 'Mark completed tasks, update your skills, then regenerate the roadmap from the latest gap analysis.',
      priority: 'medium',
      offset_days: 28,
      skill_name: null,
      topic_slug: null,
      resource_url: null,
    },
  ];
}

async function savePlan(userId, { role, summary, generatedBy, tasks, gapTopicIds }) {
  return withTransaction(async (connection) => {
    const [planResult] = await connection.execute(
      'INSERT INTO study_plans (user_id, target_role, generated_by, summary) VALUES (?, ?, ?, ?)',
      [userId, role, generatedBy, summary.slice(0, 990)],
    );
    let order = 1;
    for (const task of tasks) {
      let skillId = null;
      if (task.skill_name) {
        const [skillRows] = await connection.execute('SELECT id FROM skills WHERE LOWER(name) = LOWER(?) LIMIT 1', [task.skill_name]);
        skillId = skillRows[0]?.id || null;
      }
      await connection.execute(
        `INSERT INTO study_tasks (plan_id, title, description, skill_id, topic_id, resource_url, priority, target_date, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          planResult.insertId,
          task.title.slice(0, 220),
          task.description || null,
          skillId,
          gapTopicIds?.[task.topic_slug] || null,
          task.resource_url || null,
          task.priority || 'medium',
          addDays(task.offset_days || 7),
          order++,
        ],
      );
    }
    return planResult.insertId;
  });
}

async function generateRoadmap(user, { role, useAi = false } = {}) {
  const targetRole = role || user.profile?.target_role;
  if (!targetRole) {
    throw badRequest('Choose a target role in your profile or select one when generating a roadmap.');
  }
  const gap = await getSkillGap(user, { role: targetRole });
  const topics = await allTopics();
  const topicBySlug = Object.fromEntries(topics.map((topic) => [topic.slug, topic]));
  const topicIds = Object.fromEntries(topics.map((topic) => [topic.slug, topic.id]));
  const resourceRows = await query(
    `SELECT id, topic_id, title, url, provider FROM learning_resources WHERE topic_id IS NOT NULL ORDER BY id`,
  );
  const resourcesByTopic = {};
  for (const resource of resourceRows) {
    if (!resourcesByTopic[resource.topic_id]) resourcesByTopic[resource.topic_id] = [];
    resourcesByTopic[resource.topic_id].push(resource);
  }

  const priorityGaps = gap.gaps
    .filter((item) => item.importance === 'required')
    .slice(0, 5);
  const fallbackGaps = priorityGaps.length ? priorityGaps : gap.gaps.slice(0, 4);

  let generatedBy = 'rule';
  let summary;
  let tasks;
  let aiWarning = null;

  if (useAi) {
    try {
      const ai = await generateAiRoadmap({ role: targetRole, gaps: fallbackGaps, topics });
      if (ai) {
        generatedBy = 'ai';
        summary = ai.summary || `AI-assisted four-week plan for ${targetRole}, based on your current skill gaps.`;
        tasks = ai.tasks.map((task) => ({
          ...task,
          topic_slug: task.topic_slug && topicBySlug[task.topic_slug] ? task.topic_slug : null,
        }));
      } else {
        aiWarning = 'AI is not configured on this server. A rule-based roadmap was generated instead.';
      }
    } catch (error) {
      aiWarning = `The AI provider could not be reached (${error.message}). A rule-based roadmap was generated instead.`;
    }
  }

  if (!tasks) {
    tasks = [];
    fallbackGaps.forEach((item, index) => {
      tasks.push(...buildRuleTasks(item, index, topicBySlug, resourcesByTopic));
    });
    tasks.push(...generalTasks());
    const focus = fallbackGaps.map((item) => item.name).join(', ') || 'maintaining your current strengths';
    summary = `A four-week ${targetRole} plan generated from your profile and current skill gaps. Priority focus: ${focus}. Dates are editable and can be adjusted to your schedule. This plan is a study recommendation, not a guarantee of placement.`;
  }

  const planId = await savePlan(user.id, {
    role: targetRole,
    summary,
    generatedBy,
    tasks,
    gapTopicIds: topicIds,
  });
  const plan = await getPlanById(user.id, planId);
  return { plan, meta: { generated_by: generatedBy, ai_warning: aiWarning, ai_configured: isConfigured() } };
}

async function getLatestPlan(userId) {
  const rows = await query(
    'SELECT * FROM study_plans WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT 1',
    [userId],
  );
  if (!rows[0]) return null;
  return getPlanById(userId, rows[0].id);
}

async function getPlanById(userId, planId) {
  const rows = await query('SELECT * FROM study_plans WHERE id = ? AND user_id = ?', [planId, userId]);
  if (!rows[0]) throw notFound('Study plan not found.');
  const tasks = await query(
    `SELECT st.*, s.name AS skill_name, pt.slug AS topic_slug, pt.title AS topic_title
     FROM study_tasks st
     LEFT JOIN skills s ON s.id = st.skill_id
     LEFT JOIN preparation_topics pt ON pt.id = st.topic_id
     WHERE st.plan_id = ? ORDER BY st.is_completed ASC, st.target_date ASC, st.sort_order ASC`,
    [planId],
  );
  const today = new Date().toISOString().slice(0, 10);
  const decorated = tasks.map((task) => {
    const due = new Date(task.target_date).toISOString().slice(0, 10);
    return {
      ...task,
      target_date: due,
      is_completed: Boolean(task.is_completed),
      is_overdue: !task.is_completed && due < today,
    };
  });
  const completed = decorated.filter((task) => task.is_completed).length;
  return {
    ...rows[0],
    tasks: decorated,
    progress: {
      total: decorated.length,
      completed,
      percent: decorated.length ? Math.round((completed / decorated.length) * 100) : 0,
      overdue: decorated.filter((task) => task.is_overdue).length,
    },
  };
}

async function createTask(userId, payload) {
  const plan = await getLatestPlan(userId);
  if (!plan) throw badRequest('Generate a study plan before adding tasks.');
  const result = await query(
    `INSERT INTO study_tasks (plan_id, title, description, resource_url, priority, target_date, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      plan.id, payload.title, payload.description || null, payload.resource_url || null,
      payload.priority || 'medium', payload.target_date, (plan.tasks.at(-1)?.sort_order || 0) + 1,
    ],
  );
  const rows = await query('SELECT * FROM study_tasks WHERE id = ?', [result.insertId]);
  return rows[0];
}

async function updateTask(userId, taskId, payload) {
  const rows = await query(
    `SELECT st.id FROM study_tasks st JOIN study_plans sp ON sp.id = st.plan_id
     WHERE st.id = ? AND sp.user_id = ?`,
    [taskId, userId],
  );
  if (!rows[0]) throw notFound('Study task not found.');
  const fields = [];
  const params = [];
  for (const [column, key] of [
    ['title', 'title'], ['description', 'description'], ['resource_url', 'resource_url'],
    ['priority', 'priority'], ['target_date', 'target_date'],
  ]) {
    if (payload[key] !== undefined) {
      fields.push(`${column} = ?`);
      params.push(payload[key] || null);
    }
  }
  if (payload.is_completed !== undefined) {
    fields.push('is_completed = ?', 'completed_at = ?');
    params.push(payload.is_completed ? 1 : 0, payload.is_completed ? new Date() : null);
  }
  if (fields.length === 0) throw badRequest('Nothing to update.');
  params.push(taskId);
  await query(`UPDATE study_tasks SET ${fields.join(', ')} WHERE id = ?`, params);
  const updated = await query('SELECT * FROM study_tasks WHERE id = ?', [taskId]);
  return updated[0];
}

async function deleteTask(userId, taskId) {
  const rows = await query(
    `SELECT st.id FROM study_tasks st JOIN study_plans sp ON sp.id = st.plan_id
     WHERE st.id = ? AND sp.user_id = ?`,
    [taskId, userId],
  );
  if (!rows[0]) throw notFound('Study task not found.');
  await query('DELETE FROM study_tasks WHERE id = ?', [taskId]);
}

module.exports = { generateRoadmap, getLatestPlan, createTask, updateTask, deleteTask, isAiConfigured: isConfigured };

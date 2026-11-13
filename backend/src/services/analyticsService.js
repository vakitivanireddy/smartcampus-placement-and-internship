const { query } = require('../db/pool');
const { getEligibilitySummary } = require('./opportunityService');
const { getStatusCounts } = require('./applicationService');
const { getSkillGap } = require('./skillGapService');
const { getLatestPlan } = require('./roadmapService');

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function startOfWeek(date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() - ((day + 6) % 7));
  return d;
}

function buildWeeks(count = 8) {
  const currentWeek = startOfWeek(new Date());
  const first = new Date(currentWeek.getTime() - (count - 1) * WEEK_MS);
  return Array.from({ length: count }, (_, index) => {
    const start = new Date(first.getTime() + index * WEEK_MS);
    return {
      start,
      label: start.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', timeZone: 'UTC' }),
    };
  });
}

function bucketFor(dateValue, weeks) {
  if (!dateValue) return -1;
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return -1;
  const index = Math.floor((date.getTime() - weeks[0].start.getTime()) / WEEK_MS);
  return index >= 0 && index < weeks.length ? index : -1;
}

async function getAnalytics(user) {
  const weeks = buildWeeks(8);
  const rangeStart = weeks[0].start.toISOString().slice(0, 19).replace('T', ' ');

  const [eligibility, statusCounts, topics, plan, gap] = await Promise.all([
    getEligibilitySummary(user),
    getStatusCounts(user.id),
    query(
      `SELECT t.id, t.title, t.category, t.slug, COALESCE(sp.is_completed, 0) AS is_completed,
              sp.completed_at
       FROM preparation_topics t
       LEFT JOIN student_progress sp ON sp.topic_id = t.id AND sp.user_id = ?
       WHERE t.is_active = 1
       ORDER BY FIELD(t.category, 'DSA','Programming','Core CS','Development','Aptitude','Interviews'), t.sort_order`,
      [user.id],
    ),
    getLatestPlan(user.id),
    user.profile?.target_role ? getSkillGap(user, { role: user.profile.target_role }).catch(() => null) : Promise.resolve(null),
  ]);

  const [topicEvents, taskEvents, roadmapEvents, applicationEvents, skillEvents, skillBefore] = await Promise.all([
    query('SELECT completed_at FROM student_progress WHERE user_id = ? AND is_completed = 1 AND completed_at >= ?', [user.id, rangeStart]),
    query('SELECT completed_at FROM practice_task_progress WHERE user_id = ? AND is_completed = 1 AND completed_at >= ?', [user.id, rangeStart]),
    query(
      `SELECT st.completed_at FROM study_tasks st JOIN study_plans sp ON sp.id = st.plan_id
       WHERE sp.user_id = ? AND st.is_completed = 1 AND st.completed_at >= ?`,
      [user.id, rangeStart],
    ),
    query('SELECT created_at FROM applications WHERE user_id = ? AND created_at >= ?', [user.id, rangeStart]),
    query('SELECT created_at FROM student_skills WHERE user_id = ? AND is_confirmed = 1 AND created_at >= ? ORDER BY created_at', [user.id, rangeStart]),
    query('SELECT COUNT(*) AS count FROM student_skills WHERE user_id = ? AND is_confirmed = 1 AND created_at < ?', [user.id, rangeStart]),
  ]);

  const weekly = weeks.map((week) => ({
    week: week.label,
    week_start: week.start.toISOString().slice(0, 10),
    topics_completed: 0,
    practice_tasks_completed: 0,
    roadmap_tasks_completed: 0,
    preparation_activity: 0,
    applications: 0,
    skills_added: 0,
    skills_cumulative: 0,
  }));

  for (const row of topicEvents) {
    const index = bucketFor(row.completed_at, weeks);
    if (index >= 0) {
      weekly[index].topics_completed += 1;
      weekly[index].preparation_activity += 1;
    }
  }
  for (const row of taskEvents) {
    const index = bucketFor(row.completed_at, weeks);
    if (index >= 0) {
      weekly[index].practice_tasks_completed += 1;
      weekly[index].preparation_activity += 1;
    }
  }
  for (const row of roadmapEvents) {
    const index = bucketFor(row.completed_at, weeks);
    if (index >= 0) {
      weekly[index].roadmap_tasks_completed += 1;
      weekly[index].preparation_activity += 1;
    }
  }
  for (const row of applicationEvents) {
    const index = bucketFor(row.created_at, weeks);
    if (index >= 0) weekly[index].applications += 1;
  }
  for (const row of skillEvents) {
    const index = bucketFor(row.created_at, weeks);
    if (index >= 0) weekly[index].skills_added += 1;
  }
  let cumulative = Number(skillBefore[0].count);
  for (const week of weekly) {
    cumulative += week.skills_added;
    week.skills_cumulative = cumulative;
  }

  const completedTopics = topics.filter((topic) => topic.is_completed);
  const pendingTopics = topics.filter((topic) => !topic.is_completed);
  const categories = [...new Set(topics.map((topic) => topic.category))].map((category) => ({
    category,
    total: topics.filter((topic) => topic.category === category).length,
    completed: topics.filter((topic) => topic.category === category && topic.is_completed).length,
  }));

  const skillCategories = await query(
    `SELECT s.category, COUNT(*) AS count, AVG(ss.proficiency) AS avg_proficiency
     FROM student_skills ss JOIN skills s ON s.id = ss.skill_id
     WHERE ss.user_id = ? AND ss.is_confirmed = 1
     GROUP BY s.category ORDER BY count DESC`,
    [user.id],
  );

  const totalTopics = topics.length;
  const completionPercent = totalTopics ? Math.round((completedTopics.length / totalTopics) * 100) : 0;
  const requiredGaps = gap ? gap.gaps.filter((item) => item.importance === 'required') : [];
  const workload = plan ? plan.progress : { total: 0, completed: 0, percent: 0, overdue: 0 };

  return {
    preparation: {
      completion_percent: completionPercent,
      topics_total: totalTopics,
      topics_completed: completedTopics.length,
      topics_pending: pendingTopics.length,
      categories,
      completed: completedTopics.map((topic) => ({ title: topic.title, category: topic.category, slug: topic.slug, completed_at: topic.completed_at })),
      pending: pendingTopics.map((topic) => ({ title: topic.title, category: topic.category, slug: topic.slug })),
      roadmap: workload,
    },
    applications: {
      counts: statusCounts,
      funnel: ['interested', 'applied', 'assessment', 'interview', 'selected', 'rejected'].map((status) => ({
        status, count: statusCounts[status] || 0,
      })),
      conversion_rate: statusCounts.total ? Math.round(((statusCounts.selected + statusCounts.interview + statusCounts.assessment) / statusCounts.total) * 100) : 0,
    },
    eligibility: {
      counts: eligibility.counts,
      by_type: {
        internship: eligibility.opportunities.filter((opp) => opp.type === 'internship').length,
        placement: eligibility.opportunities.filter((opp) => opp.type === 'placement').length,
        job: eligibility.opportunities.filter((opp) => opp.type === 'job').length,
      },
    },
    skills: {
      total: (user.skills || []).length,
      by_category: skillCategories.map((row) => ({
        category: row.category,
        count: Number(row.count),
        avg_proficiency: Number(Number(row.avg_proficiency).toFixed(1)),
      })),
      target_role: gap?.role || user.profile?.target_role || null,
      readiness: gap?.readiness ?? null,
      required_gaps: requiredGaps.length,
      top_gaps: requiredGaps.slice(0, 5).map((item) => ({
        name: item.name, priority: item.priority, status: item.status,
        current: item.current_proficiency, required: item.required_proficiency,
      })),
    },
    weekly,
    meta: {
      generated_at: new Date().toISOString(),
      weeks: weeks.length,
      caveat: 'Charts use records stored in this application. Skill levels are self-reported, not tested scores.',
      sample_data_notice: 'Opportunity eligibility counts are based on active sample opportunities.',
    },
  };
}

module.exports = { getAnalytics };

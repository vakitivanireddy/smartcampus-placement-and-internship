const { query } = require('../db/pool');
const { getEligibilitySummary } = require('./opportunityService');
const { getStatusCounts, getUpcomingEvents, listApplications } = require('./applicationService');
const { getSkillGap } = require('./skillGapService');
const { getLatestPlan } = require('./roadmapService');
const { syncNotifications } = require('./notificationService');

function daysUntil(dateString) {
  const target = new Date(`${dateString}T23:59:59Z`);
  return Math.max(0, Math.ceil((target - new Date()) / (24 * 60 * 60 * 1000)));
}

async function getPreparationSnapshot(userId) {
  const topicRows = await query(
    `SELECT COUNT(*) AS total, SUM(COALESCE(sp.is_completed, 0)) AS completed
     FROM preparation_topics t
     LEFT JOIN student_progress sp ON sp.topic_id = t.id AND sp.user_id = ?
     WHERE t.is_active = 1`,
    [userId],
  );
  const taskRows = await query(
    `SELECT COUNT(*) AS total, SUM(COALESCE(ptp.is_completed, 0)) AS completed
     FROM practice_tasks pt
     LEFT JOIN practice_task_progress ptp ON ptp.task_id = pt.id AND ptp.user_id = ?`,
    [userId],
  );
  const topicTotal = Number(topicRows[0].total);
  const topicsCompleted = Number(topicRows[0].completed || 0);
  return {
    topics_total: topicTotal,
    topics_completed: topicsCompleted,
    completion_percent: topicTotal ? Math.round((topicsCompleted / topicTotal) * 100) : 0,
    practice_tasks_total: Number(taskRows[0].total),
    practice_tasks_completed: Number(taskRows[0].completed || 0),
  };
}

async function getDashboard(user) {
  const [eligibility, statusCounts, prep, projects, certifications, resumes, notifications] = await Promise.all([
    getEligibilitySummary(user),
    getStatusCounts(user.id),
    getPreparationSnapshot(user.id),
    query('SELECT COUNT(*) AS count FROM student_projects WHERE user_id = ?', [user.id]),
    query('SELECT COUNT(*) AS count FROM student_certifications WHERE user_id = ?', [user.id]),
    query('SELECT id, created_at FROM resumes WHERE user_id = ? AND status = \'processed\' ORDER BY created_at DESC LIMIT 1', [user.id]),
    syncNotifications(user.id).then(() => query('SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND is_read = 0', [user.id])),
  ]);

  const upcomingDeadlines = eligibility.opportunities
    .filter((opp) => daysUntil(opp.application_deadline) <= 14)
    .slice(0, 5)
    .map((opp) => ({
      id: opp.id,
      title: opp.title,
      company: opp.company,
      application_deadline: opp.application_deadline,
      days_left: daysUntil(opp.application_deadline),
      type: opp.type,
      eligibility_status: opp.eligibility.status,
    }));

  const [applications, events, plan, gap] = await Promise.all([
    listApplications(user.id),
    getUpcomingEvents(user.id, 30),
    getLatestPlan(user.id),
    user.profile?.target_role ? getSkillGap(user, { role: user.profile.target_role }).catch(() => null) : Promise.resolve(null),
  ]);

  const profileFields = [
    user.profile?.college, user.profile?.branch, user.profile?.graduation_year,
    user.profile?.cgpa, user.profile?.target_role,
  ];
  const profileChecks = [
    profileFields.filter(Boolean).length >= 4,
    (user.skills || []).length >= 3,
    Number(projects[0].count) > 0,
    Number(certifications[0].count) > 0,
    resumes.length > 0,
  ];
  const profilePercent = Math.round((profileChecks.filter(Boolean).length / profileChecks.length) * 100);

  const topGaps = gap ? gap.gaps.filter((item) => item.importance === 'required').slice(0, 3) : [];
  const nextSteps = [];

  if ((user.skills || []).length === 0) {
    nextSteps.push({
      title: 'Add your skills', description: 'Your skill list is empty, so eligibility cannot assess skill requirements.',
      link: '/profile#skills', priority: 'high', icon: 'skills',
    });
  }
  if (resumes.length === 0) {
    nextSteps.push({
      title: 'Upload your resume', description: 'Upload a text-based PDF to extract skills and speed up your profile setup.',
      link: '/resume', priority: 'high', icon: 'resume',
    });
  }
  if (!user.profile?.target_role) {
    nextSteps.push({
      title: 'Choose a target role', description: 'A target role powers your skill-gap analysis and personalised roadmap.',
      link: '/profile', priority: 'high', icon: 'target',
    });
  }
  const openEligible = eligibility.opportunities.filter((opp) => opp.eligibility.status === 'eligible');
  const appliedIds = new Set(applications.filter((app) => app.status !== 'interested').map((app) => app.opportunity.id));
  if (openEligible.some((opp) => !appliedIds.has(opp.id))) {
    nextSteps.push({
      title: `Apply to ${openEligible.filter((opp) => !appliedIds.has(opp.id)).length} eligible opportunit${openEligible.filter((opp) => !appliedIds.has(opp.id)).length === 1 ? 'y' : 'ies'}`,
      description: 'You meet the mandatory criteria for these sample roles. Review the details and track your applications.',
      link: '/opportunities?eligibility=eligible', priority: 'high', icon: 'opportunity',
    });
  }
  if (topGaps[0]) {
    nextSteps.push({
      title: `Close your ${topGaps[0].name} gap`,
      description: `This is a high-priority requirement for ${gap.role}. Your self-rated level is ${topGaps[0].current_proficiency ?? 'not added'}/5 against an expected ${topGaps[0].required_proficiency}/5.`,
      link: `/preparation/${topGaps[0].topic_slug}`, priority: topGaps[0].priority, icon: 'skillgap',
    });
  }
  if (!plan) {
    nextSteps.push({
      title: 'Generate your study roadmap',
      description: 'Turn your skill gaps into a dated four-week plan with resources and editable tasks.',
      link: '/roadmap', priority: 'medium', icon: 'roadmap',
    });
  }
  if (upcomingDeadlines[0]) {
    nextSteps.push({
      title: `Deadline in ${upcomingDeadlines[0].days_left} day${upcomingDeadlines[0].days_left === 1 ? '' : 's'}`,
      description: `${upcomingDeadlines[0].company} — ${upcomingDeadlines[0].title}. Check eligibility and submit before the deadline.`,
      link: `/opportunities/${upcomingDeadlines[0].id}`, priority: 'high', icon: 'deadline',
    });
  }
  if (nextSteps.length === 0) {
    nextSteps.push({
      title: 'Keep your momentum', description: 'Your profile is complete, your roadmap is active and you have applications in progress. Review your tracker this week.',
      link: '/applications', priority: 'medium', icon: 'check',
    });
  }

  return {
    opportunities: {
      total: eligibility.counts.total,
      eligible: eligibility.counts.eligible,
      not_eligible: eligibility.counts.not_eligible,
      needs_info: eligibility.counts.needs_info,
      internships: eligibility.opportunities.filter((opp) => opp.type === 'internship').length,
      placements: eligibility.opportunities.filter((opp) => opp.type === 'placement').length,
    },
    applications: { ...statusCounts, recent: applications.slice(0, 5) },
    preparation: {
      ...prep,
      roadmap: plan ? { id: plan.id, target_role: plan.target_role, progress: plan.progress, generated_at: plan.created_at } : null,
    },
    profile_completion: profilePercent,
    upcoming_deadlines: upcomingDeadlines,
    upcoming_events: events.slice(0, 5),
    skill_gap: gap ? {
      role: gap.role,
      readiness: gap.readiness,
      gaps: topGaps,
      summary: gap.summary,
      caveat: gap.caveat,
    } : null,
    notifications_unread: Number(notifications[0].count),
    next_steps: nextSteps.slice(0, 5),
    meta: {
      generated_at: new Date().toISOString(),
      opportunities_notice: 'Counts use active sample opportunities whose deadline has not passed.',
      reminders: 'In-app reminders only. Email/SMS is not configured.',
    },
  };
}

module.exports = { getDashboard, getPreparationSnapshot, daysUntil };

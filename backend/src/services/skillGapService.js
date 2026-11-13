const { query } = require('../db/pool');
const { getForAdmin } = require('./opportunityService');
const { normalise } = require('./eligibilityService');
const { notFound } = require('../utils/httpError');

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };

function mapTopicForSkill(name, category) {
  const lower = normalise(name);
  if (['data structures and algorithms', 'problem solving'].includes(lower)) return { slug: 'dsa', title: 'Data Structures and Algorithms' };
  if (['sql', 'dbms', 'mysql', 'postgresql', 'mongodb', 'redis'].includes(lower)) return { slug: 'dbms-sql', title: 'DBMS and SQL' };
  if (['operating systems', 'linux'].includes(lower)) return { slug: 'operating-systems', title: 'Operating Systems' };
  if (['computer networks'].includes(lower)) return { slug: 'computer-networks', title: 'Computer Networks' };
  if (['object-oriented programming', 'system design'].includes(lower)) return { slug: 'oop', title: 'Object-Oriented Programming' };
  if (['communication', 'agile'].includes(lower)) return { slug: 'hr-interviews', title: 'HR and Behavioural Interviews' };
  if (['aptitude'].includes(lower)) return { slug: 'aptitude', title: 'Aptitude and Reasoning' };
  if (category === 'programming' || lower === 'spring boot') return { slug: 'programming-languages', title: 'Programming Languages' };
  if (['framework', 'tool'].includes(category)) return { slug: 'web-development', title: 'Web Development' };
  if (category === 'database') return { slug: 'dbms-sql', title: 'DBMS and SQL' };
  return { slug: 'technical-interviews', title: 'Technical Interviews' };
}

async function getRoleNames(user) {
  const rows = await query('SELECT DISTINCT role_name FROM role_skills ORDER BY role_name');
  const names = rows.map((row) => row.role_name);
  for (const extra of [user.profile?.target_role, ...(user.preferred_roles || [])]) {
    if (extra && !names.some((name) => name.toLowerCase() === extra.toLowerCase())) names.push(extra);
  }
  return names;
}

async function getRequirementsForRole(roleName) {
  const rows = await query(
    `SELECT rs.role_name, rs.skill_id, rs.importance, rs.required_proficiency,
            s.name, s.category, s.description, s.resource_url
     FROM role_skills rs JOIN skills s ON s.id = rs.skill_id
     WHERE LOWER(rs.role_name) = LOWER(?)
     ORDER BY rs.importance = 'preferred', s.name`,
    [roleName],
  );
  return rows;
}

async function resolveRequirements(user, { role, opportunity_id: opportunityId }) {
  if (opportunityId) {
    const opp = await getForAdmin(opportunityId);
    return {
      targetLabel: `${opp.title} at ${opp.company}`,
      roleName: opp.title,
      mode: 'opportunity',
      opportunity: opp,
      requirements: opp.skills.map((skill) => ({
        skill_id: skill.skill_id,
        name: skill.name,
        category: skill.category,
        importance: skill.importance,
        required_proficiency: skill.min_proficiency,
        resource_url: skill.resource_url,
        description: null,
      })),
    };
  }

  const desiredRole = role || user.profile?.target_role || 'Java Developer';
  let requirements = await getRequirementsForRole(desiredRole);
  if (requirements.length === 0) {
    const fallback = user.profile?.target_role || 'Java Developer';
    requirements = await getRequirementsForRole(fallback);
    if (requirements.length === 0) throw notFound('No skill requirements are configured for that role yet. Choose another role.');
    return {
      targetLabel: fallback,
      roleName: fallback,
      mode: 'role',
      requirements,
    };
  }
  return { targetLabel: desiredRole, roleName: desiredRole, mode: 'role', requirements };
}

function computeSkillGap(user, requirements, context) {
  const owned = new Map((user.skills || []).map((skill) => [normalise(skill.name), skill]));
  const items = [];

  for (const req of requirements) {
    const current = owned.get(normalise(req.name));
    const required = Number(req.required_proficiency);
    const proficiency = current ? Number(current.proficiency) : 0;
    let status = 'missing';
    if (current && proficiency >= required) status = 'strong';
    else if (current) status = 'weak';

    const gap = Math.max(0, required - proficiency);
    let priority = 'low';
    if (req.importance === 'required') {
      if (status === 'missing') priority = 'high';
      else if (status === 'weak') priority = gap >= 2 ? 'high' : 'medium';
    } else if (status !== 'strong') {
      priority = gap >= 2 ? 'medium' : 'low';
    }

    const topic = mapTopicForSkill(req.name, req.category);
    let why;
    if (status === 'strong') {
      why = `Your self-rated level (${proficiency}/5) meets the expected level of ${required}/5 for this ${req.importance} skill.`;
    } else if (status === 'weak') {
      why = `You have ${req.name} at a self-rated level of ${proficiency}/5, but this ${req.importance} skill expects ${required}/5. A gap of ${gap} level${gap === 1 ? '' : 's'} is worth closing.`;
    } else {
      why = `${req.name} is listed as a ${req.importance} skill for this target and is not on your profile. Add it only when you have genuine experience, then build it up deliberately.`;
    }

    items.push({
      skill_id: req.skill_id,
      name: req.name,
      category: req.category,
      importance: req.importance,
      required_proficiency: required,
      current_proficiency: current ? proficiency : null,
      status,
      gap,
      progress: Math.min(100, Math.round((proficiency / required) * 100)),
      priority,
      resource_url: req.resource_url || null,
      topic_slug: topic.slug,
      topic_title: topic.title,
      why,
      self_reported: true,
    });
  }

  items.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] || a.name.localeCompare(b.name));
  const required = items.filter((item) => item.importance === 'required');
  const preferred = items.filter((item) => item.importance === 'preferred');
  const requiredMet = required.filter((item) => item.status === 'strong').length;
  const preferredMet = preferred.filter((item) => item.status === 'strong').length;
  const readiness = required.length === 0 ? 100 : Math.round((requiredMet / required.length) * 100);

  const topGaps = required
    .filter((item) => item.status !== 'strong')
    .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] || b.gap - a.gap)
    .slice(0, 4);

  const recommendations = topGaps.map((gap) => ({
    skill: gap.name,
    priority: gap.priority,
    action: gap.status === 'missing'
      ? `Start with the fundamentals of ${gap.name}, then complete a small applied exercise.`
      : `Strengthen ${gap.name} from level ${gap.current_proficiency} towards level ${gap.required_proficiency} with focused practice.`,
    why: gap.why,
    resource_url: gap.resource_url,
    topic_slug: gap.topic_slug,
  }));

  return {
    ...context,
    readiness,
    summary: {
      total: items.length,
      required_total: required.length,
      required_met: requiredMet,
      preferred_total: preferred.length,
      preferred_met: preferredMet,
      missing: items.filter((item) => item.status === 'missing').length,
      weak: items.filter((item) => item.status === 'weak').length,
      strong: items.filter((item) => item.status === 'strong').length,
      high_priority: items.filter((item) => item.priority === 'high').length,
    },
    items,
    strengths: items.filter((item) => item.status === 'strong').map((item) => item.name),
    gaps: items.filter((item) => item.status !== 'strong'),
    recommendations,
    caveat: 'Proficiency levels are self-reported for preparation planning. They are not test scores or verified credentials. Missing preferred skills never block eligibility.',
  };
}

async function getSkillGap(user, options = {}) {
  const context = await resolveRequirements(user, options);
  return computeSkillGap(user, context.requirements, {
    target_label: context.targetLabel,
    role: context.roleName,
    mode: context.mode,
    opportunity_id: context.opportunity?.id || null,
  });
}

async function getSkillGapForProfile(user, role) {
  return getSkillGap(user, { role: role || user.profile?.target_role });
}

module.exports = {
  getSkillGap,
  getSkillGapForProfile,
  getRoleNames,
  getRequirementsForRole,
  computeSkillGap,
  mapTopicForSkill,
};

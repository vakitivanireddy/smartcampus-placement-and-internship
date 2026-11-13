/**
 * Pure, rule-based eligibility evaluation. This module deliberately has no
 * database dependency so it can be unit tested and reused by both the student
 * and admin APIs.
 */

function normalise(value) {
  return String(value ?? '').trim().toLowerCase();
}

function skillMap(studentSkills) {
  const map = new Map();
  for (const skill of studentSkills) {
    map.set(normalise(skill.name), skill);
  }
  return map;
}

const REQUIREMENT_META = {
  max_backlogs: {
    label: 'Active backlogs',
    profileKey: 'active_backlogs',
    compare: (profileValue, requiredValue) => Number(profileValue) <= Number(requiredValue),
    describe: (value) => `at most ${value} active backlog${Number(value) === 1 ? '' : 's'}`,
    actual: (value) => `${value} active backlog${Number(value) === 1 ? '' : 's'}`,
  },
  min_tenth_percentage: {
    label: 'Class 10 percentage',
    profileKey: 'tenth_percentage',
    compare: (profileValue, requiredValue) => Number(profileValue) >= Number(requiredValue),
    describe: (value) => `at least ${value}% in Class 10`,
    actual: (value) => `${value}% in Class 10`,
  },
  min_twelfth_percentage: {
    label: 'Class 12 percentage',
    profileKey: 'twelfth_percentage',
    compare: (profileValue, requiredValue) => Number(profileValue) >= Number(requiredValue),
    describe: (value) => `at least ${value}% in Class 12`,
    actual: (value) => `${value}% in Class 12`,
  },
};

function evaluateEligibility({ profile, studentSkills = [], opportunity }) {
  const checks = [];
  const reasons = [];
  const missingSkills = [];
  const matchedSkills = [];
  const preferredMissing = [];

  const addCheck = (key, label, status, detail) => {
    checks.push({ key, label, status, detail });
  };
  const addReason = (severity, message) => {
    reasons.push({ severity, message });
  };

  const branches = (opportunity.branches || []).filter(Boolean);
  const branch = normalise(profile?.branch);
  if (branches.length === 0) {
    addCheck('branch', 'Branch', 'pass', 'Open to all branches.');
  } else if (!branch) {
    addCheck('branch', 'Branch', 'unknown', 'Add your branch to your profile to check this requirement.');
    addReason('info', 'Your branch is missing from your profile, so branch eligibility cannot be confirmed.');
  } else if (!branches.map(normalise).includes(branch)) {
    addCheck('branch', 'Branch', 'fail', `This opportunity is open to ${branches.join(', ')}; your profile lists ${profile.branch}.`);
    addReason('error', `You are not eligible because this opportunity is restricted to ${branches.join(', ')} branches, while your profile lists ${profile.branch}.`);
  } else {
    addCheck('branch', 'Branch', 'pass', `${profile.branch} is an eligible branch.`);
  }

  const batches = (opportunity.batches || []).map(Number).filter(Boolean);
  const graduationYear = profile?.graduation_year ? Number(profile.graduation_year) : null;
  if (batches.length === 0) {
    addCheck('batch', 'Graduation batch', 'pass', 'No graduation batch restriction is configured.');
  } else if (!graduationYear) {
    addCheck('batch', 'Graduation batch', 'unknown', 'Add your graduation year to your profile.');
    addReason('info', 'Your graduation year is missing, so batch eligibility cannot be confirmed.');
  } else if (!batches.includes(graduationYear)) {
    addCheck('batch', 'Graduation batch', 'fail', `Open to ${batches.join(', ')} batches; your graduation year is ${graduationYear}.`);
    addReason('error', `You are not eligible because this opportunity is for the ${batches.join(', ')} graduating batch, while your profile lists ${graduationYear}.`);
  } else {
    addCheck('batch', 'Graduation batch', 'pass', `Graduation year ${graduationYear} is eligible.`);
  }

  if (opportunity.min_cgpa === null || opportunity.min_cgpa === undefined) {
    addCheck('cgpa', 'Minimum CGPA', 'pass', 'No minimum CGPA is configured.');
  } else if (profile?.cgpa === null || profile?.cgpa === undefined) {
    addCheck('cgpa', 'Minimum CGPA', 'unknown', `Add your CGPA to check the minimum of ${opportunity.min_cgpa}.`);
    addReason('info', `Your CGPA is missing, so the minimum CGPA requirement of ${opportunity.min_cgpa} cannot be confirmed.`);
  } else if (Number(profile.cgpa) < Number(opportunity.min_cgpa)) {
    addCheck('cgpa', 'Minimum CGPA', 'fail', `Required ${opportunity.min_cgpa}; your profile contains ${profile.cgpa}.`);
    addReason('error', `You are not eligible because the minimum required CGPA is ${opportunity.min_cgpa}, while your profile contains ${profile.cgpa}.`);
  } else {
    addCheck('cgpa', 'Minimum CGPA', 'pass', `Your CGPA of ${profile.cgpa} meets the minimum of ${opportunity.min_cgpa}.`);
  }

  for (const requirement of opportunity.requirements || []) {
    const meta = REQUIREMENT_META[requirement.type];
    if (!meta) continue;
    const profileValue = profile?.[meta.profileKey];
    if (profileValue === null || profileValue === undefined || profileValue === '') {
      addCheck(requirement.type, meta.label, 'unknown', `Add your ${meta.label.toLowerCase()} to your profile.`);
      addReason('info', `Your ${meta.label.toLowerCase()} is missing, so the requirement (${meta.describe(requirement.value)}) cannot be confirmed.`);
      continue;
    }
    if (meta.compare(profileValue, requirement.value)) {
      addCheck(requirement.type, meta.label, 'pass', `Your ${meta.actual(profileValue)} meets the requirement of ${meta.describe(requirement.value)}.`);
    } else {
      addCheck(requirement.type, meta.label, 'fail', `Required ${meta.describe(requirement.value)}; your profile contains ${meta.actual(profileValue)}.`);
      addReason('error', `You are not eligible because this opportunity requires ${meta.describe(requirement.value)}, while your profile contains ${meta.actual(profileValue)}.`);
    }
  }

  const requiredSkills = (opportunity.skills || []).filter((skill) => skill.importance === 'required');
  const preferredSkills = (opportunity.skills || []).filter((skill) => skill.importance === 'preferred');
  const owned = skillMap(studentSkills);

  if (requiredSkills.length === 0) {
    addCheck('skills', 'Required skills', 'pass', 'No mandatory skills are configured.');
  } else if (studentSkills.length === 0) {
    addCheck('skills', 'Required skills', 'unknown', 'Add verified skills to your profile to check skill requirements.');
    addReason('info', 'No skills are listed on your profile yet, so required-skill eligibility cannot be confirmed. Add skills manually or extract them from your resume.');
  } else {
    for (const requirement of requiredSkills) {
      const skill = owned.get(normalise(requirement.name));
      if (!skill) {
        missingSkills.push({
          name: requirement.name,
          importance: 'required',
          min_proficiency: requirement.min_proficiency,
          current_proficiency: null,
          gap: requirement.min_proficiency,
        });
      } else if (Number(skill.proficiency) < Number(requirement.min_proficiency)) {
        missingSkills.push({
          name: requirement.name,
          importance: 'required',
          min_proficiency: requirement.min_proficiency,
          current_proficiency: skill.proficiency,
          gap: requirement.min_proficiency - skill.proficiency,
        });
      } else {
        matchedSkills.push({ name: requirement.name, proficiency: skill.proficiency, min_proficiency: requirement.min_proficiency });
      }
    }

    if (missingSkills.length > 0) {
      const missingNames = missingSkills.map((skill) => skill.name).join(', ');
      addCheck(
        'skills',
        'Required skills',
        'fail',
        `${missingSkills.length} of ${requiredSkills.length} required skills are missing or below the expected level: ${missingNames}.`,
      );
      addReason(
        'error',
        `You are not eligible because these mandatory skills are missing or below the expected level (${missingSkills.map((s) => `${s.name}: level ${s.current_proficiency ?? 'not added'}/${s.min_proficiency}`).join('; ')}). Required skills are mandatory; preferred skills do not block eligibility.`,
      );
    } else {
      addCheck('skills', 'Required skills', 'pass', `You meet all ${requiredSkills.length} mandatory skill requirement${requiredSkills.length === 1 ? '' : 's'}.`);
    }
  }

  for (const requirement of preferredSkills) {
    const skill = owned.get(normalise(requirement.name));
    if (!skill || Number(skill.proficiency) < Number(requirement.min_proficiency)) {
      preferredMissing.push({
        name: requirement.name,
        min_proficiency: requirement.min_proficiency,
        current_proficiency: skill ? skill.proficiency : null,
      });
    }
  }
  if (preferredMissing.length > 0) {
    addReason(
      'info',
      `Preferred skills are not mandatory and do not make you ineligible: ${preferredMissing.map((s) => s.name).join(', ')}. Adding them can strengthen your application.`,
    );
  }

  let status = 'eligible';
  if (checks.some((check) => check.status === 'fail')) status = 'not_eligible';
  else if (checks.some((check) => check.status === 'unknown')) status = 'needs_info';

  const summary = status === 'eligible'
    ? 'You meet all mandatory eligibility criteria for this opportunity.'
    : status === 'needs_info'
      ? 'Some information needed for an eligibility decision is missing from your profile.'
      : 'You do not currently meet one or more mandatory eligibility criteria.';

  return {
    status,
    summary,
    checks,
    reasons,
    missingSkills,
    matchedSkills,
    preferredMissing,
  };
}

module.exports = { evaluateEligibility, REQUIREMENT_META, normalise };

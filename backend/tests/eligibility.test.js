const test = require('node:test');
const assert = require('node:assert/strict');
const { evaluateEligibility } = require('../src/services/eligibilityService');

const baseProfile = {
  branch: 'CSE',
  graduation_year: 2027,
  cgpa: 8.2,
  active_backlogs: 0,
  tenth_percentage: 88,
  twelfth_percentage: 84,
};

const baseOpportunity = {
  min_cgpa: 7.5,
  branches: ['CSE', 'IT'],
  batches: [2026, 2027],
  requirements: [],
  skills: [
    { name: 'Java', importance: 'required', min_proficiency: 3 },
    { name: 'SQL', importance: 'preferred', min_proficiency: 4 },
  ],
};

const skills = [{ name: 'Java', proficiency: 4 }];

test('eligible when all mandatory criteria are met and preferred skills are missing', () => {
  const result = evaluateEligibility({ profile: baseProfile, studentSkills: skills, opportunity: baseOpportunity });
  assert.equal(result.status, 'eligible');
  assert.equal(result.missingSkills.length, 0);
  assert.equal(result.preferredMissing.length, 1);
  assert.ok(result.reasons.some((reason) => reason.message.includes('Preferred skills are not mandatory')));
});

test('not eligible when CGPA is below the minimum and explanation includes both values', () => {
  const result = evaluateEligibility({
    profile: { ...baseProfile, cgpa: 7.5 },
    studentSkills: skills,
    opportunity: { ...baseOpportunity, min_cgpa: 8.0 },
  });
  assert.equal(result.status, 'not_eligible');
  assert.ok(result.reasons.some((reason) => reason.message.includes('8') && reason.message.includes('7.5')));
});

test('needs_info when CGPA is missing', () => {
  const result = evaluateEligibility({
    profile: { ...baseProfile, cgpa: null },
    studentSkills: skills,
    opportunity: baseOpportunity,
  });
  assert.equal(result.status, 'needs_info');
  assert.ok(result.checks.find((check) => check.key === 'cgpa').status === 'unknown');
});

test('branch mismatch is a hard failure', () => {
  const result = evaluateEligibility({
    profile: { ...baseProfile, branch: 'Mechanical' },
    studentSkills: skills,
    opportunity: baseOpportunity,
  });
  assert.equal(result.status, 'not_eligible');
  assert.ok(result.reasons.some((reason) => reason.message.includes('Mechanical')));
});

test('graduation batch mismatch is a hard failure', () => {
  const result = evaluateEligibility({
    profile: { ...baseProfile, graduation_year: 2025 },
    studentSkills: skills,
    opportunity: baseOpportunity,
  });
  assert.equal(result.status, 'not_eligible');
  assert.ok(result.reasons.some((reason) => reason.message.includes('2025')));
});

test('missing mandatory skill blocks eligibility', () => {
  const result = evaluateEligibility({
    profile: baseProfile,
    studentSkills: [],
    opportunity: baseOpportunity,
  });
  assert.equal(result.status, 'needs_info', 'an empty skill list means the profile needs more information');
});

test('a non-empty profile missing a mandatory skill is not eligible', () => {
  const result = evaluateEligibility({
    profile: baseProfile,
    studentSkills: [{ name: 'SQL', proficiency: 5 }],
    opportunity: baseOpportunity,
  });
  assert.equal(result.status, 'not_eligible');
  assert.ok(result.missingSkills.some((skill) => skill.name === 'Java'));
});

test('proficiency below requirement blocks eligibility', () => {
  const result = evaluateEligibility({
    profile: baseProfile,
    studentSkills: [{ name: 'Java', proficiency: 2 }],
    opportunity: baseOpportunity,
  });
  assert.equal(result.status, 'not_eligible');
  assert.ok(result.missingSkills.some((skill) => skill.name === 'Java' && skill.gap === 1));
});

test('preferred skill below requirement does not block eligibility', () => {
  const result = evaluateEligibility({
    profile: baseProfile,
    studentSkills: [{ name: 'Java', proficiency: 4 }, { name: 'SQL', proficiency: 1 }],
    opportunity: baseOpportunity,
  });
  assert.equal(result.status, 'eligible');
  assert.ok(result.preferredMissing.some((skill) => skill.name === 'SQL'));
});

test('configured backlog requirement is evaluated', () => {
  const opportunity = {
    ...baseOpportunity,
    requirements: [{ type: 'max_backlogs', value: 0, label: 'No active backlogs' }],
  };
  const result = evaluateEligibility({
    profile: { ...baseProfile, active_backlogs: 2 },
    studentSkills: skills,
    opportunity,
  });
  assert.equal(result.status, 'not_eligible');
  assert.ok(result.checks.some((check) => check.key === 'max_backlogs' && check.status === 'fail'));
});

test('missing extra requirement data produces needs_info', () => {
  const opportunity = {
    ...baseOpportunity,
    requirements: [{ type: 'min_tenth_percentage', value: 75, label: 'Minimum 75% in Class 10' }],
  };
  const result = evaluateEligibility({
    profile: { ...baseProfile, tenth_percentage: null },
    studentSkills: skills,
    opportunity,
  });
  assert.equal(result.status, 'needs_info');
});

test('hard failure takes precedence over missing information', () => {
  const result = evaluateEligibility({
    profile: { ...baseProfile, cgpa: null, branch: 'Civil' },
    studentSkills: skills,
    opportunity: baseOpportunity,
  });
  assert.equal(result.status, 'not_eligible');
});

test('open-branch opportunity accepts any branch', () => {
  const result = evaluateEligibility({
    profile: { ...baseProfile, branch: 'Civil' },
    studentSkills: skills,
    opportunity: { ...baseOpportunity, branches: [], batches: [] },
  });
  assert.equal(result.status, 'eligible');
});

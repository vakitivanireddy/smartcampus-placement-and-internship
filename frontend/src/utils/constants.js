export const APPLICATION_STATUSES = [
  { value: 'interested', label: 'Interested', tone: 'slate', hint: 'Saved as a target; not applied yet.' },
  { value: 'applied', label: 'Applied', tone: 'blue', hint: 'Application submitted.' },
  { value: 'assessment', label: 'Assessment', tone: 'violet', hint: 'Online test or assignment stage.' },
  { value: 'interview', label: 'Interview', tone: 'amber', hint: 'Interview rounds in progress.' },
  { value: 'selected', label: 'Selected', tone: 'green', hint: 'Offer received.' },
  { value: 'rejected', label: 'Rejected', tone: 'red', hint: 'Not moving forward.' },
];

export const STATUS_LABELS = Object.fromEntries(APPLICATION_STATUSES.map((s) => [s.value, s.label]));

export const ELIGIBILITY = {
  eligible: { label: 'Eligible', tone: 'green' },
  needs_info: { label: 'Needs info', tone: 'amber' },
  not_eligible: { label: 'Not eligible', tone: 'red' },
};

export const OPPORTUNITY_TYPES = [
  { value: 'internship', label: 'Internship' },
  { value: 'placement', label: 'Placement' },
  { value: 'job', label: 'Job' },
];

export const WORK_MODES = [
  { value: 'onsite', label: 'On-site' },
  { value: 'remote', label: 'Remote' },
  { value: 'hybrid', label: 'Hybrid' },
];

export const PRIORITIES = [
  { value: 'high', label: 'High', tone: 'red' },
  { value: 'medium', label: 'Medium', tone: 'amber' },
  { value: 'low', label: 'Low', tone: 'slate' },
];

export const SKILL_LEVELS = [
  { value: 1, label: '1 — Beginner' },
  { value: 2, label: '2 — Learning' },
  { value: 3, label: '3 — Comfortable' },
  { value: 4, label: '4 — Strong' },
  { value: 5, label: '5 — Advanced' },
];

export const PREP_CATEGORIES = ['DSA', 'Programming', 'Core CS', 'Development', 'Aptitude', 'Interviews'];

export const PROFILE_CHECK_LABELS = {
  'Basic and academic details': 'Basic and academic details',
  'Target role selected': 'Target role selected',
};

export const ROLE_OPTIONS = [
  'Java Developer',
  'Full Stack Developer',
  'Frontend Developer',
  'Backend Developer',
  'Data Analyst',
  'Data Scientist',
  'DevOps Engineer',
];

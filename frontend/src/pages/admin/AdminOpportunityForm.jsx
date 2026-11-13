import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Plus,
  Save,
  Sparkles,
  Target,
  Trash2,
} from 'lucide-react';
import { api, errorMessage } from '../../api/client.js';
import { useApi } from '../../hooks/useApi.js';
import { useToast } from '../../context/ToastContext.jsx';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  ErrorState,
  FormField,
  Input,
  Loader,
  Notice,
  PageHeader,
  Select,
  Textarea,
} from '../../components/ui.jsx';
import { OPPORTUNITY_TYPES, SKILL_LEVELS, WORK_MODES } from '../../utils/constants.js';
import { todayISO } from '../../utils/format.js';

const EXTRA_TYPES = [
  { value: 'max_backlogs', label: 'Maximum active backlogs' },
  { value: 'min_tenth_percentage', label: 'Minimum Class 10 percentage' },
  { value: 'min_twelfth_percentage', label: 'Minimum Class 12 percentage' },
];

const SUGGESTED_BRANCHES = ['CSE', 'IT', 'ECE', 'EEE', 'Mechanical', 'Civil', 'Chemical', 'AIML', 'Data Science'];
const SUGGESTED_BATCHES = [2025, 2026, 2027, 2028, 2029, 2030];

function emptyForm() {
  return {
    title: '',
    company: '',
    type: 'internship',
    location: '',
    work_mode: 'onsite',
    salary_stipend: '',
    description: '',
    min_cgpa: '',
    openings: '',
    application_deadline: '',
    other_requirements: '',
    branches: [],
    batches: [],
    skills: [],
    requirements: [],
    is_active: true,
    is_sample: true,
  };
}

function formFromOpportunity(opportunity) {
  return {
    title: opportunity.title || '',
    company: opportunity.company || '',
    type: opportunity.type || 'internship',
    location: opportunity.location || '',
    work_mode: opportunity.work_mode || 'onsite',
    salary_stipend: opportunity.salary_stipend || '',
    description: opportunity.description || '',
    min_cgpa: opportunity.min_cgpa ?? '',
    openings: opportunity.openings ?? '',
    application_deadline: opportunity.application_deadline || '',
    other_requirements: opportunity.other_requirements || '',
    branches: opportunity.branches || [],
    batches: (opportunity.batches || []).map(Number),
    skills: (opportunity.skills || []).map((skill) => ({
      skill_id: skill.skill_id,
      name: skill.name,
      importance: skill.importance || 'required',
      min_proficiency: skill.min_proficiency || 3,
    })),
    requirements: (opportunity.requirements || []).map((requirement) => ({
      type: requirement.type,
      value: requirement.value,
      label: requirement.label || '',
    })),
    is_active: Boolean(opportunity.is_active),
    is_sample: Boolean(opportunity.is_sample),
  };
}

export default function AdminOpportunityForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const editing = Boolean(id);

  const meta = useApi('/admin/opportunity-meta');
  const existing = useApi(editing ? `/admin/opportunities/${id}` : null);

  const [form, setForm] = useState(emptyForm);
  const [skillDraft, setSkillDraft] = useState({ name: '', importance: 'required', min_proficiency: 3 });
  const [branchDraft, setBranchDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [details, setDetails] = useState([]);

  useEffect(() => {
    if (existing.data) setForm(formFromOpportunity(existing.data));
  }, [existing.data]);

  const skillOptions = useMemo(() => {
    const names = (meta.data?.skills || []).map((skill) => skill.name);
    for (const skill of form.skills) {
      if (skill.name && !names.some((name) => name.toLowerCase() === skill.name.toLowerCase())) names.push(skill.name);
    }
    return names;
  }, [meta.data, form.skills]);

  const branchOptions = useMemo(() => {
    const names = [...SUGGESTED_BRANCHES, ...(meta.data?.branches || []), ...form.branches];
    return [...new Set(names.filter(Boolean))];
  }, [meta.data, form.branches]);

  const batchOptions = useMemo(() => {
    const years = [...SUGGESTED_BATCHES, ...(meta.data?.batches || []), ...form.batches.map(Number)];
    return [...new Set(years.filter((year) => Number.isFinite(year)))].sort((a, b) => a - b);
  }, [meta.data, form.batches]);

  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  const toggleBranch = (branch) => {
    setForm((current) => ({
      ...current,
      branches: current.branches.includes(branch)
        ? current.branches.filter((item) => item !== branch)
        : [...current.branches, branch],
    }));
  };

  const addCustomBranch = () => {
    const branch = branchDraft.trim();
    if (!branch) return;
    if (form.branches.some((item) => item.toLowerCase() === branch.toLowerCase())) {
      toast.info('That branch is already selected.');
      return;
    }
    setForm((current) => ({ ...current, branches: [...current.branches, branch] }));
    setBranchDraft('');
  };

  const toggleBatch = (year) => {
    const value = Number(year);
    setForm((current) => ({
      ...current,
      batches: current.batches.includes(value)
        ? current.batches.filter((item) => item !== value)
        : [...current.batches, value].sort((a, b) => a - b),
    }));
  };

  const addSkill = () => {
    const name = skillDraft.name.trim();
    if (!name) {
      toast.warning('Choose or type a skill first.');
      return;
    }
    if (form.skills.some((skill) => skill.name.toLowerCase() === name.toLowerCase())) {
      toast.info('That skill is already listed.');
      return;
    }
    const catalogueMatch = (meta.data?.skills || []).find((skill) => skill.name.toLowerCase() === name.toLowerCase());
    setForm((current) => ({
      ...current,
      skills: [
        ...current.skills,
        {
          ...(catalogueMatch ? { skill_id: catalogueMatch.id } : {}),
          name,
          importance: skillDraft.importance,
          min_proficiency: Number(skillDraft.min_proficiency),
        },
      ],
    }));
    setSkillDraft({ name: '', importance: 'required', min_proficiency: 3 });
  };

  const updateSkill = (index, key, value) => {
    setForm((current) => ({
      ...current,
      skills: current.skills.map((skill, skillIndex) =>
        skillIndex === index ? { ...skill, [key]: key === 'min_proficiency' ? Number(value) : value } : skill,
      ),
    }));
  };

  const removeSkill = (index) => {
    setForm((current) => ({ ...current, skills: current.skills.filter((_, skillIndex) => skillIndex !== index) }));
  };

  const addRequirement = () => {
    setForm((current) => ({
      ...current,
      requirements: [...current.requirements, { type: 'max_backlogs', value: 0, label: '' }],
    }));
  };

  const updateRequirement = (index, key, value) => {
    setForm((current) => ({
      ...current,
      requirements: current.requirements.map((requirement, requirementIndex) =>
        requirementIndex === index ? { ...requirement, [key]: value } : requirement,
      ),
    }));
  };

  const removeRequirement = (index) => {
    setForm((current) => ({
      ...current,
      requirements: current.requirements.filter((_, requirementIndex) => requirementIndex !== index),
    }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setFormError('');
    setDetails([]);

    if (!form.application_deadline) {
      setFormError('Choose an application deadline.');
      return;
    }
    if (form.skills.some((skill) => !skill.name.trim())) {
      setFormError('Every skill row needs a skill name.');
      return;
    }

    const payload = {
      title: form.title.trim(),
      company: form.company.trim(),
      type: form.type,
      location: form.location.trim(),
      work_mode: form.work_mode,
      salary_stipend: form.salary_stipend.trim(),
      description: form.description.trim(),
      min_cgpa: form.min_cgpa === '' ? null : Number(form.min_cgpa),
      openings: form.openings === '' ? null : Number(form.openings),
      application_deadline: form.application_deadline,
      other_requirements: form.other_requirements.trim(),
      branches: form.branches,
      batches: form.batches.map(Number),
      skills: form.skills.map((skill) => ({
        ...(skill.skill_id ? { skill_id: Number(skill.skill_id) } : {}),
        name: skill.name.trim(),
        importance: skill.importance,
        min_proficiency: Number(skill.min_proficiency),
      })),
      requirements: form.requirements.map((requirement) => ({
        type: requirement.type,
        value: Number(requirement.value),
        label: requirement.label?.trim() || '',
      })),
      is_active: Boolean(form.is_active),
      is_sample: Boolean(form.is_sample),
    };

    setSaving(true);
    try {
      if (editing) {
        await api.put(`/admin/opportunities/${id}`, payload);
        toast.success('Opportunity updated. Eligibility is recalculated for students.');
      } else {
        await api.post('/admin/opportunities', payload);
        toast.success('Opportunity created and visible to students.');
      }
      navigate('/admin/opportunities');
    } catch (err) {
      setFormError(errorMessage(err));
      if (Array.isArray(err.details)) setDetails(err.details);
    } finally {
      setSaving(false);
    }
  };

  if (editing && existing.loading) return <Loader label="Loading opportunity…" />;
  if (editing && existing.error) return <ErrorState message={existing.error} onRetry={existing.reload} />;
  if (meta.error) return <ErrorState message={meta.error} onRetry={meta.reload} />;

  return (
    <div className="page-stack">
      <Link to="/admin/opportunities" className="back-link">
        <ArrowLeft size={16} /> Back to opportunity catalogue
      </Link>

      <PageHeader
        eyebrow={editing ? 'Edit opportunity' : 'New opportunity'}
        title={editing ? `Edit ${existing.data?.title || 'opportunity'}` : 'Add a sample opportunity'}
        description="Define the role and its eligibility criteria. Students see the result immediately and can analyse a scoped skill gap."
        actions={
          <>
            <Button variant="secondary" to="/admin/opportunities">
              Cancel
            </Button>
            <Button type="submit" form="opportunity-form" icon={Save} loading={saving}>
              {editing ? 'Save changes' : 'Create opportunity'}
            </Button>
          </>
        }
      />

      <Notice tone="warning" icon={AlertTriangle}>
        Keep the sample-data label enabled for demonstration roles with fictional companies. Disable it only when the placement
        cell has verified a real opening.
      </Notice>

      <form id="opportunity-form" className="admin-form" onSubmit={submit}>
        {formError && (
          <div className="inline-error">
            <div>
              <strong>{formError}</strong>
              {details.length > 0 && (
                <ul className="inline-error-list">
                  {details.map((detail, index) => (
                    <li key={`${detail.field}-${index}`}>
                      <span>{detail.field}</span> {detail.message}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        <div className="admin-form-grid">
          <div className="admin-form-main">
            <Card>
              <CardHeader title="Role basics" description="What students see first in the opportunity explorer." action={<Sparkles size={18} className="card-head-icon" />} />
              <div className="form-stack">
                <div className="form-grid two">
                  <FormField label="Role title" htmlFor="opp-title" required>
                    <Input id="opp-title" value={form.title} onChange={update('title')} minLength={3} maxLength={180} required placeholder="e.g. Frontend Developer Intern" />
                  </FormField>
                  <FormField label="Company" htmlFor="opp-company" required>
                    <Input id="opp-company" value={form.company} onChange={update('company')} minLength={2} maxLength={180} required placeholder="Fictional or verified company" />
                  </FormField>
                </div>
                <div className="form-grid three">
                  <FormField label="Opportunity type" htmlFor="opp-type" required>
                    <Select id="opp-type" value={form.type} onChange={update('type')}>
                      {OPPORTUNITY_TYPES.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Select>
                  </FormField>
                  <FormField label="Work mode" htmlFor="opp-mode" required>
                    <Select id="opp-mode" value={form.work_mode} onChange={update('work_mode')}>
                      {WORK_MODES.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Select>
                  </FormField>
                  <FormField label="Location" htmlFor="opp-location" required>
                    <Input id="opp-location" value={form.location} onChange={update('location')} minLength={2} maxLength={150} required placeholder="e.g. Bengaluru" />
                  </FormField>
                </div>
                <div className="form-grid three">
                  <FormField label="Stipend / salary" htmlFor="opp-salary" hint="Free text, e.g. ₹25,000/month.">
                    <Input id="opp-salary" value={form.salary_stipend} onChange={update('salary_stipend')} maxLength={120} />
                  </FormField>
                  <FormField label="Openings" htmlFor="opp-openings" hint="Leave blank if not specified.">
                    <Input id="opp-openings" type="number" min="1" max="100000" value={form.openings} onChange={update('openings')} />
                  </FormField>
                  <FormField label="Application deadline" htmlFor="opp-deadline" required>
                    <Input id="opp-deadline" type="date" value={form.application_deadline} onChange={update('application_deadline')} required />
                  </FormField>
                </div>
                <FormField label="Role description" htmlFor="opp-description" required hint="At least 30 characters. Separate paragraphs with a blank line.">
                  <Textarea id="opp-description" rows={7} minLength={30} maxLength={8000} value={form.description} onChange={update('description')} required />
                </FormField>
                <FormField label="Other requirements" htmlFor="opp-other" hint="Optional free text shown alongside the structured criteria.">
                  <Textarea id="opp-other" rows={3} maxLength={2000} value={form.other_requirements} onChange={update('other_requirements')} />
                </FormField>
              </div>
            </Card>

            <Card>
              <CardHeader
                title="Eligibility criteria"
                description="Academic filters checked live against each student profile. Leave a filter empty to allow everyone."
                action={<Target size={18} className="card-head-icon" />}
              />
              <div className="form-stack">
                <div className="form-grid two">
                  <FormField label="Minimum CGPA" htmlFor="opp-cgpa" hint="0–10. Leave blank for no minimum.">
                    <Input id="opp-cgpa" type="number" min="0" max="10" step="0.01" value={form.min_cgpa} onChange={update('min_cgpa')} />
                  </FormField>
                  <FormField label="Graduation batches" hint="No selection means no batch restriction.">
                    <div className="chip-toggle-row">
                      {batchOptions.map((year) => (
                        <button
                          type="button"
                          key={year}
                          className={`filter-chip ${form.batches.includes(Number(year)) ? 'selected' : ''}`}
                          onClick={() => toggleBatch(year)}
                        >
                          {year}
                          {form.batches.includes(Number(year)) && <CheckCircle2 size={13} />}
                        </button>
                      ))}
                    </div>
                  </FormField>
                </div>

                <FormField label="Eligible branches" hint="No selection means all branches are allowed.">
                  <div className="chip-toggle-row">
                    {branchOptions.map((branch) => (
                      <button
                        type="button"
                        key={branch}
                        className={`filter-chip ${form.branches.includes(branch) ? 'selected' : ''}`}
                        onClick={() => toggleBranch(branch)}
                      >
                        {branch}
                        {form.branches.includes(branch) && <CheckCircle2 size={13} />}
                      </button>
                    ))}
                  </div>
                  <div className="chip-input mt-2">
                    <Input
                      value={branchDraft}
                      onChange={(event) => setBranchDraft(event.target.value)}
                      placeholder="Add another branch"
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          addCustomBranch();
                        }
                      }}
                    />
                    <Button variant="secondary" icon={Plus} onClick={addCustomBranch}>
                      Add
                    </Button>
                  </div>
                </FormField>

                <div>
                  <div className="flex-between">
                    <span className="field-label">Extra academic requirements</span>
                    <Button variant="ghost" size="sm" icon={Plus} onClick={addRequirement}>
                      Add requirement
                    </Button>
                  </div>
                  {form.requirements.length === 0 ? (
                    <p className="field-hint">No extra requirement. CGPA, branch and batch are still checked.</p>
                  ) : (
                    <div className="stack-list mt-2">
                      {form.requirements.map((requirement, index) => (
                        <div className="inline-form-row" key={`requirement-${index}`}>
                          <Select
                            value={requirement.type}
                            onChange={(event) => updateRequirement(index, 'type', event.target.value)}
                            aria-label="Requirement type"
                          >
                            {EXTRA_TYPES.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </Select>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={requirement.value}
                            onChange={(event) => updateRequirement(index, 'value', event.target.value)}
                            aria-label="Requirement value"
                          />
                          <Input
                            value={requirement.label}
                            onChange={(event) => updateRequirement(index, 'label', event.target.value)}
                            placeholder="Optional label"
                            aria-label="Requirement label"
                            maxLength={180}
                          />
                          <button type="button" className="icon-btn danger" onClick={() => removeRequirement(index)} aria-label="Remove requirement">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Card>

            <Card>
              <CardHeader
                title="Skill requirements"
                description="Required skills must be met for eligibility. Preferred skills are shown to students but never block them."
                action={<Badge tone="indigo">{form.skills.length} skills</Badge>}
              />
              <div className="inline-form-row skill-draft-row">
                <Input
                  list="admin-skill-options"
                  value={skillDraft.name}
                  onChange={(event) => setSkillDraft((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Type or choose a skill"
                  aria-label="Skill name"
                />
                <datalist id="admin-skill-options">
                  {skillOptions.map((name) => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
                <Select
                  value={skillDraft.importance}
                  onChange={(event) => setSkillDraft((current) => ({ ...current, importance: event.target.value }))}
                  aria-label="Skill importance"
                >
                  <option value="required">Required</option>
                  <option value="preferred">Preferred</option>
                </Select>
                <Select
                  value={skillDraft.min_proficiency}
                  onChange={(event) => setSkillDraft((current) => ({ ...current, min_proficiency: event.target.value }))}
                  aria-label="Expected skill level"
                >
                  {SKILL_LEVELS.map((level) => (
                    <option key={level.value} value={level.value}>
                      {level.label}
                    </option>
                  ))}
                </Select>
                <Button variant="secondary" icon={Plus} onClick={addSkill}>
                  Add skill
                </Button>
              </div>

              {form.skills.length === 0 ? (
                <p className="muted small mt-2">No skill requirements yet. Roles without skill requirements are open to every eligible student.</p>
              ) : (
                <div className="stack-list mt-3">
                  {form.skills.map((skill, index) => (
                    <div className="inline-form-row skill-requirement-row" key={`${skill.name}-${index}`}>
                      <Input
                        value={skill.name}
                        onChange={(event) => updateSkill(index, 'name', event.target.value)}
                        aria-label={`Skill ${index + 1} name`}
                        maxLength={100}
                      />
                      <Select value={skill.importance} onChange={(event) => updateSkill(index, 'importance', event.target.value)} aria-label="Importance">
                        <option value="required">Required</option>
                        <option value="preferred">Preferred</option>
                      </Select>
                      <Select
                        value={skill.min_proficiency}
                        onChange={(event) => updateSkill(index, 'min_proficiency', event.target.value)}
                        aria-label="Expected level"
                      >
                        {SKILL_LEVELS.map((level) => (
                          <option key={level.value} value={level.value}>
                            {level.label}
                          </option>
                        ))}
                      </Select>
                      <button type="button" className="icon-btn danger" onClick={() => removeSkill(index)} aria-label={`Remove ${skill.name}`}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          <aside className="admin-form-side">
            <Card className="sticky-card">
              <CardHeader title="Publishing" description="Visibility and data labelling." />
              <div className="form-stack">
                <label className={`checkbox-card ${form.is_active ? 'checked' : ''}`}>
                  <input type="checkbox" checked={form.is_active} onChange={(event) => setForm((current) => ({ ...current, is_active: event.target.checked }))} />
                  <span>
                    <strong>Visible to students</strong>
                    <small>Inactive roles stay in the admin catalogue but are hidden from students.</small>
                  </span>
                </label>
                <label className={`checkbox-card ${form.is_sample ? 'checked' : ''}`}>
                  <input
                    type="checkbox"
                    checked={form.is_sample}
                    onChange={(event) => setForm((current) => ({ ...current, is_sample: event.target.checked }))}
                  />
                  <span>
                    <strong>Label as sample data</strong>
                    <small>Shown with a sample badge. Keep this on for fictional demonstration roles.</small>
                  </span>
                </label>
                <div className="side-facts">
                  <div>
                    <span>Deadline status</span>
                    <strong>{!form.application_deadline ? 'Not set' : form.application_deadline < todayISO() ? 'Already expired' : 'Open'}</strong>
                  </div>
                  <div>
                    <span>Required skills</span>
                    <strong>{form.skills.filter((skill) => skill.importance === 'required').length}</strong>
                  </div>
                  <div>
                    <span>Preferred skills</span>
                    <strong>{form.skills.filter((skill) => skill.importance === 'preferred').length}</strong>
                  </div>
                  <div>
                    <span>Branches</span>
                    <strong>{form.branches.length || 'All'}</strong>
                  </div>
                </div>
              </div>
            </Card>

            <Card>
              <CardHeader title="Preview" description="A quick summary of the role card students will see." />
              <div className="admin-preview-card">
                <div className="opportunity-badges">
                  <Badge tone={form.type === 'internship' ? 'indigo' : form.type === 'placement' ? 'violet' : 'blue'}>{form.type}</Badge>
                  <Badge tone="slate">{form.work_mode}</Badge>
                  {form.is_sample && <Badge tone="amber">Sample</Badge>}
                </div>
                <h3>{form.title || 'Role title'}</h3>
                <p>{form.company || 'Company name'}</p>
                <div className="admin-preview-facts">
                  <span>{form.location || 'Location'}</span>
                  <span>Min CGPA {form.min_cgpa === '' ? 'Any' : form.min_cgpa}</span>
                  <span>
                    <CalendarClock size={13} /> {form.application_deadline || 'No deadline'}
                  </span>
                </div>
                <div className="skill-chips">
                  {form.skills.slice(0, 6).map((skill, index) => (
                    <span key={`${skill.name}-${index}`} className={`skill-chip ${skill.importance}`}>
                      {skill.name || 'Skill'}
                    </span>
                  ))}
                  {form.skills.length === 0 && <span className="muted small">No skills configured</span>}
                </div>
              </div>
            </Card>

            <div className="side-note">
              <AlertTriangle size={17} />
              <p>
                <strong>Real data only when verified.</strong> Remove the sample label only after the placement cell confirms the
                opening, dates and criteria.
              </p>
            </div>
          </aside>
        </div>
      </form>
    </div>
  );
}

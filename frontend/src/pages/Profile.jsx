import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Award,
  Briefcase,
  CheckCircle2,
  Circle,
  ExternalLink,
  FileText,
  FolderGit2,
  GraduationCap,
  Link2,
  Pencil,
  Plus,
  Save,
  Sparkles,
  Target,
  Trash2,
  UserRound,
  X,
} from 'lucide-react';
import { api, errorMessage } from '../api/client.js';
import { useApi } from '../hooks/useApi.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  ConfirmDialog,
  ErrorState,
  FormField,
  Input,
  Loader,
  Modal,
  Notice,
  PageHeader,
  ProgressBar,
  Select,
  Textarea,
} from '../components/ui.jsx';
import { ROLE_OPTIONS, SKILL_LEVELS } from '../utils/constants.js';
import { formatDate, titleCase } from '../utils/format.js';

const PROFILE_FIELDS = [
  'name',
  'college',
  'branch',
  'graduation_year',
  'cgpa',
  'active_backlogs',
  'tenth_percentage',
  'twelfth_percentage',
  'target_role',
  'phone',
  'bio',
  'linkedin_url',
  'github_url',
];

function buildProfileForm(user) {
  const profile = user?.profile || {};
  return {
    name: user?.name || '',
    college: profile.college || '',
    branch: profile.branch || '',
    graduation_year: profile.graduation_year ?? '',
    cgpa: profile.cgpa ?? '',
    active_backlogs: profile.active_backlogs ?? '',
    tenth_percentage: profile.tenth_percentage ?? '',
    twelfth_percentage: profile.twelfth_percentage ?? '',
    target_role: profile.target_role || '',
    phone: profile.phone || '',
    bio: profile.bio || '',
    linkedin_url: profile.linkedin_url || '',
    github_url: profile.github_url || '',
  };
}

const emptyProject = { title: '', description: '', tech_stack: '', link: '' };
const emptyCertification = { name: '', issuer: '', issue_date: '', credential_url: '' };

export default function Profile() {
  const { refresh } = useAuth();
  const toast = useToast();
  const profile = useApi('/profile');
  const catalogue = useApi('/profile/skills/catalogue');
  const [form, setForm] = useState(buildProfileForm(null));
  const [preferredRoles, setPreferredRoles] = useState([]);
  const [roleInput, setRoleInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [skillForm, setSkillForm] = useState({ name: '', proficiency: 3 });
  const [skillBusy, setSkillBusy] = useState(false);
  const [skillError, setSkillError] = useState('');
  const [confirm, setConfirm] = useState(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [projectModal, setProjectModal] = useState(null);
  const [certModal, setCertModal] = useState(null);
  const [modalSaving, setModalSaving] = useState(false);
  const [modalError, setModalError] = useState('');

  const user = profile.data?.user;
  const skills = user?.skills || [];
  const projects = profile.data?.projects || [];
  const certifications = profile.data?.certifications || [];
  const completion = profile.data?.completion;

  useEffect(() => {
    if (!user) return;
    setForm(buildProfileForm(user));
    setPreferredRoles(user.preferred_roles || []);
  }, [user]);

  const skillNames = useMemo(() => (catalogue.data || []).map((skill) => skill.name), [catalogue.data]);
  const skillSuggestions = useMemo(
    () => (catalogue.data || []).filter((skill) => !skills.some((owned) => owned.name.toLowerCase() === skill.name.toLowerCase())).slice(0, 60),
    [catalogue.data, skills],
  );

  if (profile.loading) return <Loader label="Loading your profile…" />;
  if (profile.error) return <ErrorState message={profile.error} onRetry={profile.reload} />;
  if (!user) return null;

  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  const saveProfile = async (event) => {
    event.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      const payload = { ...form, preferred_roles: preferredRoles };
      for (const key of PROFILE_FIELDS) {
        if (payload[key] === '') payload[key] = key === 'name' ? payload[key] : null;
      }
      for (const key of ['graduation_year', 'cgpa', 'active_backlogs', 'tenth_percentage', 'twelfth_percentage']) {
        if (payload[key] !== null && payload[key] !== '') payload[key] = Number(payload[key]);
      }
      await api.put('/profile', payload);
      await profile.reload({ quiet: true });
      await refresh();
      toast.success('Profile updated successfully.');
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const addPreferredRole = () => {
    const role = roleInput.trim();
    if (!role) return;
    if (preferredRoles.length >= 5) {
      toast.warning('You can add up to five preferred roles.');
      return;
    }
    if (preferredRoles.some((item) => item.toLowerCase() === role.toLowerCase())) {
      toast.info('That role is already in your list.');
      return;
    }
    setPreferredRoles((current) => [...current, role]);
    setRoleInput('');
  };

  const addSkill = async (event) => {
    event.preventDefault();
    const name = skillForm.name.trim();
    if (!name) {
      setSkillError('Choose a skill from the list or type a new one.');
      return;
    }
    if (skills.some((skill) => skill.name.toLowerCase() === name.toLowerCase())) {
      setSkillError('That skill is already on your profile. Update its level instead.');
      return;
    }
    setSkillBusy(true);
    setSkillError('');
    try {
      const catalogueMatch = (catalogue.data || []).find((skill) => skill.name.toLowerCase() === name.toLowerCase());
      await api.post('/profile/skills', {
        ...(catalogueMatch ? { skill_id: catalogueMatch.id } : {}),
        name,
        proficiency: Number(skillForm.proficiency),
        source: 'manual',
      });
      setSkillForm({ name: '', proficiency: 3 });
      await profile.reload({ quiet: true });
      toast.success('Skill added. Add only skills you can genuinely discuss.');
    } catch (err) {
      setSkillError(errorMessage(err));
    } finally {
      setSkillBusy(false);
    }
  };

  const updateSkillLevel = async (skill, proficiency) => {
    try {
      await api.put(`/profile/skills/${skill.id}`, { proficiency: Number(proficiency) });
      await profile.reload({ quiet: true });
      toast.success(`${skill.name} updated to level ${proficiency}.`);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const handleConfirm = async () => {
    if (!confirm) return;
    setConfirmBusy(true);
    try {
      await confirm.action();
      setConfirm(null);
      await profile.reload({ quiet: true });
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setConfirmBusy(false);
    }
  };

  const saveProject = async (event) => {
    event.preventDefault();
    setModalSaving(true);
    setModalError('');
    const payload = {
      title: projectModal.data.title.trim(),
      description: projectModal.data.description.trim(),
      tech_stack: projectModal.data.tech_stack.trim(),
      link: projectModal.data.link.trim(),
    };
    try {
      if (projectModal.item?.id) await api.put(`/profile/projects/${projectModal.item.id}`, payload);
      else await api.post('/profile/projects', payload);
      toast.success(projectModal.item ? 'Project updated.' : 'Project added.');
      setProjectModal(null);
      await profile.reload({ quiet: true });
    } catch (err) {
      setModalError(errorMessage(err));
    } finally {
      setModalSaving(false);
    }
  };

  const saveCertification = async (event) => {
    event.preventDefault();
    setModalSaving(true);
    setModalError('');
    const payload = {
      name: certModal.data.name.trim(),
      issuer: certModal.data.issuer.trim(),
      issue_date: certModal.data.issue_date || null,
      credential_url: certModal.data.credential_url.trim(),
    };
    try {
      if (certModal.item?.id) await api.put(`/profile/certifications/${certModal.item.id}`, payload);
      else await api.post('/profile/certifications', payload);
      toast.success(certModal.item ? 'Certification updated.' : 'Certification added.');
      setCertModal(null);
      await profile.reload({ quiet: true });
    } catch (err) {
      setModalError(errorMessage(err));
    } finally {
      setModalSaving(false);
    }
  };

  const groupedSkills = Object.entries(
    skills.reduce((groups, skill) => {
      const category = skill.category || 'other';
      groups[category] = groups[category] || [];
      groups[category].push(skill);
      return groups;
    }, {}),
  ).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Your profile"
        title="Keep your placement profile accurate"
        description="Eligibility, skill gaps and roadmaps all read from this profile. Update it whenever your academics, skills or target role change."
        actions={
          <>
            <Button variant="secondary" to="/resume" icon={FileText}>
              Resume
            </Button>
            <Button icon={Save} onClick={saveProfile} loading={saving}>
              Save changes
            </Button>
          </>
        }
      />

      {completion && completion.percent < 100 && (
        <Notice tone="info" icon={Sparkles}>
          <strong>Profile {completion.percent}% complete.</strong> Add the missing items in the checklist to improve eligibility accuracy.
        </Notice>
      )}

      <div className="profile-layout">
        <div className="profile-main">
          <Card id="basics">
            <CardHeader title="Personal and academic details" description="Used to check branch, batch, CGPA and academic requirements." action={<UserRound size={18} className="card-head-icon" />} />
            <form className="form-stack" onSubmit={saveProfile}>
              {formError && <div className="inline-error">{formError}</div>}
              <div className="form-grid two">
                <FormField label="Full name" htmlFor="profile-name" required>
                  <Input id="profile-name" value={form.name} onChange={update('name')} required minLength={2} />
                </FormField>
                <FormField label="Email address" htmlFor="profile-email" hint="Email is your sign-in identity and cannot be edited here.">
                  <Input id="profile-email" value={user.email} readOnly disabled />
                </FormField>
              </div>
              <div className="form-grid two">
                <FormField label="College" htmlFor="profile-college">
                  <Input id="profile-college" value={form.college} onChange={update('college')} placeholder="College or university name" />
                </FormField>
                <FormField label="Branch" htmlFor="profile-branch">
                  <Input id="profile-branch" value={form.branch} onChange={update('branch')} placeholder="e.g. CSE" />
                </FormField>
              </div>
              <div className="form-grid three">
                <FormField label="Graduation year" htmlFor="profile-graduation">
                  <Input id="profile-graduation" type="number" min="2000" max="2100" value={form.graduation_year} onChange={update('graduation_year')} />
                </FormField>
                <FormField label="CGPA" htmlFor="profile-cgpa" hint="On a 10-point scale.">
                  <Input id="profile-cgpa" type="number" min="0" max="10" step="0.01" value={form.cgpa} onChange={update('cgpa')} />
                </FormField>
                <FormField label="Active backlogs" htmlFor="profile-backlogs">
                  <Input id="profile-backlogs" type="number" min="0" max="50" value={form.active_backlogs} onChange={update('active_backlogs')} />
                </FormField>
              </div>
              <div className="form-grid two">
                <FormField label="Class 10 percentage" htmlFor="profile-tenth">
                  <Input id="profile-tenth" type="number" min="0" max="100" step="0.01" value={form.tenth_percentage} onChange={update('tenth_percentage')} />
                </FormField>
                <FormField label="Class 12 percentage" htmlFor="profile-twelfth">
                  <Input id="profile-twelfth" type="number" min="0" max="100" step="0.01" value={form.twelfth_percentage} onChange={update('twelfth_percentage')} />
                </FormField>
              </div>
              <div className="form-grid two">
                <FormField label="Target role" htmlFor="profile-target" hint="Drives role readiness, skill gaps and your roadmap.">
                  <Select id="profile-target" value={form.target_role} onChange={update('target_role')}>
                    <option value="">Choose a target role</option>
                    {ROLE_OPTIONS.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </Select>
                </FormField>
                <FormField label="Phone" htmlFor="profile-phone">
                  <Input id="profile-phone" value={form.phone} onChange={update('phone')} placeholder="+91 …" />
                </FormField>
              </div>
              <FormField label="Short bio" htmlFor="profile-bio" hint="Optional. Keep it factual and under 600 characters.">
                <Textarea id="profile-bio" rows={4} maxLength={600} value={form.bio} onChange={update('bio')} />
              </FormField>
              <div className="form-grid two">
                <FormField label="LinkedIn URL" htmlFor="profile-linkedin">
                  <Input id="profile-linkedin" type="url" value={form.linkedin_url} onChange={update('linkedin_url')} placeholder="https://linkedin.com/in/…" />
                </FormField>
                <FormField label="GitHub URL" htmlFor="profile-github">
                  <Input id="profile-github" type="url" value={form.github_url} onChange={update('github_url')} placeholder="https://github.com/…" />
                </FormField>
              </div>
              <div className="preferred-roles">
                <span className="field-label">Preferred roles</span>
                <p className="field-hint">Up to five roles that interest you. These do not affect eligibility.</p>
                <div className="chip-row">
                  {preferredRoles.map((role) => (
                    <span className="role-chip" key={role}>
                      {role}
                      <button type="button" onClick={() => setPreferredRoles((current) => current.filter((item) => item !== role))} aria-label={`Remove ${role}`}>
                        <X size={13} />
                      </button>
                    </span>
                  ))}
                  {preferredRoles.length === 0 && <span className="muted small">No preferred roles added yet.</span>}
                </div>
                <div className="chip-input">
                  <Input
                    list="preferred-role-options"
                    placeholder="Add a role, e.g. Backend Developer"
                    value={roleInput}
                    onChange={(event) => setRoleInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        addPreferredRole();
                      }
                    }}
                  />
                  <datalist id="preferred-role-options">
                    {ROLE_OPTIONS.map((role) => (
                      <option key={role} value={role} />
                    ))}
                  </datalist>
                  <Button variant="secondary" icon={Plus} onClick={addPreferredRole}>
                    Add
                  </Button>
                </div>
              </div>
              <div className="form-actions">
                <Button type="submit" icon={Save} loading={saving}>
                  Save profile
                </Button>
              </div>
            </form>
          </Card>

          <Card id="skills">
            <CardHeader
              title="Skills"
              description="Self-reported levels are for preparation planning, not verified credentials."
              action={<Badge tone="indigo">{skills.length} skills</Badge>}
            />
            <form className="skill-add-form" onSubmit={addSkill}>
              <FormField label="Add a skill" htmlFor="skill-name" className="grow">
                <Input
                  id="skill-name"
                  list="skill-options"
                  placeholder="Start typing, e.g. Java, React, SQL…"
                  value={skillForm.name}
                  onChange={(event) => setSkillForm((current) => ({ ...current, name: event.target.value }))}
                />
                <datalist id="skill-options">
                  {skillSuggestions.map((skill) => (
                    <option key={skill.id} value={skill.name} />
                  ))}
                </datalist>
              </FormField>
              <FormField label="Your level" htmlFor="skill-level">
                <Select
                  id="skill-level"
                  value={skillForm.proficiency}
                  onChange={(event) => setSkillForm((current) => ({ ...current, proficiency: event.target.value }))}
                >
                  {SKILL_LEVELS.map((level) => (
                    <option key={level.value} value={level.value}>
                      {level.label}
                    </option>
                  ))}
                </Select>
              </FormField>
              <Button type="submit" icon={Plus} loading={skillBusy}>
                Add skill
              </Button>
            </form>
            {skillError && <div className="inline-error mt-2">{skillError}</div>}

            {skills.length === 0 ? (
              <div className="mini-empty">
                <Target size={22} />
                <p>No skills yet. Add at least three skills for eligibility and skill-gap analysis to work well.</p>
              </div>
            ) : (
              <div className="skill-groups">
                {groupedSkills.map(([category, items]) => (
                  <div className="skill-group" key={category}>
                    <span className="skill-group-label">{titleCase(category)}</span>
                    <div className="skill-rows">
                      {items.map((skill) => (
                        <div className="skill-row" key={skill.id}>
                          <div className="skill-row-name">
                            <strong>{skill.name}</strong>
                            <small>
                              {skill.source === 'resume' ? 'From resume' : 'Added manually'} · {skill.proficiency}/5
                            </small>
                          </div>
                          <Select
                            className="skill-level-select"
                            value={skill.proficiency}
                            onChange={(event) => updateSkillLevel(skill, event.target.value)}
                            aria-label={`Proficiency for ${skill.name}`}
                          >
                            {[1, 2, 3, 4, 5].map((level) => (
                              <option key={level} value={level}>
                                Level {level}
                              </option>
                            ))}
                          </Select>
                          <button
                            type="button"
                            className="icon-btn danger"
                            aria-label={`Remove ${skill.name}`}
                            title={`Remove ${skill.name}`}
                            onClick={() =>
                              setConfirm({
                                title: `Remove ${skill.name}?`,
                                description: 'This may change your eligibility for some roles and your skill-gap analysis.',
                                confirmLabel: 'Remove skill',
                                action: () => api.delete(`/profile/skills/${skill.id}`),
                                success: 'Skill removed.',
                              })
                            }
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="section-footer-links">
              <Link to="/skill-gap" className="text-link">
                <Target size={15} /> See your skill-gap analysis
              </Link>
              <Link to="/resume" className="text-link">
                <FileText size={15} /> Extract skills from a resume
              </Link>
            </div>
          </Card>

          <Card id="projects">
            <CardHeader
              title="Projects"
              description="Projects give interviewers evidence of your applied skills."
              action={
                <Button
                  size="sm"
                  variant="secondary"
                  icon={Plus}
                  onClick={() => {
                    setModalError('');
                    setProjectModal({ item: null, data: { ...emptyProject } });
                  }}
                >
                  Add project
                </Button>
              }
            />
            {projects.length === 0 ? (
              <div className="mini-empty">
                <FolderGit2 size={22} />
                <p>No projects yet. Add at least one project you can explain end to end.</p>
              </div>
            ) : (
              <div className="entry-list">
                {projects.map((project) => (
                  <div className="entry-card" key={project.id}>
                    <span className="entry-icon">
                      <FolderGit2 size={18} />
                    </span>
                    <div className="entry-copy">
                      <strong>{project.title}</strong>
                      {project.description && <p>{project.description}</p>}
                      <div className="entry-meta">
                        {project.tech_stack && <Badge tone="slate">{project.tech_stack}</Badge>}
                        {project.link && (
                          <a href={project.link} target="_blank" rel="noreferrer" className="text-link">
                            <ExternalLink size={13} /> View project
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="entry-actions">
                      <button
                        type="button"
                        className="icon-btn"
                        aria-label={`Edit ${project.title}`}
                        onClick={() => {
                          setModalError('');
                          setProjectModal({
                            item: project,
                            data: {
                              title: project.title || '',
                              description: project.description || '',
                              tech_stack: project.tech_stack || '',
                              link: project.link || '',
                            },
                          });
                        }}
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        className="icon-btn danger"
                        aria-label={`Delete ${project.title}`}
                        onClick={() =>
                          setConfirm({
                            title: `Delete ${project.title}?`,
                            description: 'This removes the project from your profile. It cannot be undone.',
                            confirmLabel: 'Delete project',
                            action: () => api.delete(`/profile/projects/${project.id}`),
                            success: 'Project deleted.',
                          })
                        }
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card id="certifications">
            <CardHeader
              title="Certifications"
              description="Add only certifications you have actually completed."
              action={
                <Button
                  size="sm"
                  variant="secondary"
                  icon={Plus}
                  onClick={() => {
                    setModalError('');
                    setCertModal({ item: null, data: { ...emptyCertification } });
                  }}
                >
                  Add certification
                </Button>
              }
            />
            {certifications.length === 0 ? (
              <div className="mini-empty">
                <Award size={22} />
                <p>No certifications yet. Add one if you completed a structured course or exam.</p>
              </div>
            ) : (
              <div className="entry-list">
                {certifications.map((certification) => (
                  <div className="entry-card" key={certification.id}>
                    <span className="entry-icon amber">
                      <Award size={18} />
                    </span>
                    <div className="entry-copy">
                      <strong>{certification.name}</strong>
                      <p>
                        {certification.issuer || 'Issuer not listed'}
                        {certification.issue_date ? ` · ${formatDate(certification.issue_date)}` : ''}
                      </p>
                      {certification.credential_url && (
                        <a href={certification.credential_url} target="_blank" rel="noreferrer" className="text-link">
                          <ExternalLink size={13} /> Verify credential
                        </a>
                      )}
                    </div>
                    <div className="entry-actions">
                      <button
                        type="button"
                        className="icon-btn"
                        aria-label={`Edit ${certification.name}`}
                        onClick={() => {
                          setModalError('');
                          setCertModal({
                            item: certification,
                            data: {
                              name: certification.name || '',
                              issuer: certification.issuer || '',
                              issue_date: certification.issue_date ? certification.issue_date.slice(0, 10) : '',
                              credential_url: certification.credential_url || '',
                            },
                          });
                        }}
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        className="icon-btn danger"
                        aria-label={`Delete ${certification.name}`}
                        onClick={() =>
                          setConfirm({
                            title: `Delete ${certification.name}?`,
                            description: 'This removes the certification from your profile.',
                            confirmLabel: 'Delete certification',
                            action: () => api.delete(`/profile/certifications/${certification.id}`),
                            success: 'Certification deleted.',
                          })
                        }
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <aside className="profile-side">
          <Card className="profile-summary">
            <div className="profile-summary-top">
              <span className="profile-avatar">{user.name?.slice(0, 1).toUpperCase()}</span>
              <div>
                <strong>{user.name}</strong>
                <span>{user.email}</span>
              </div>
            </div>
            <div className="profile-completion">
              <div className="progress-label">
                <span>Profile completion</span>
                <strong>{completion?.percent || 0}%</strong>
              </div>
              <ProgressBar value={completion?.percent || 0} tone={(completion?.percent || 0) >= 80 ? 'green' : 'amber'} />
            </div>
            {completion?.checks?.length > 0 && (
              <div className="checklist">
                {completion.checks.map((check) => (
                  <div className={`checklist-item ${check.done ? 'done' : ''}`} key={check.label}>
                    {check.done ? <CheckCircle2 size={17} /> : <Circle size={17} />}
                    <span>{check.label}</span>
                  </div>
                ))}
              </div>
            )}
            {profile.data?.latest_resume && (
              <div className="latest-resume">
                <FileText size={17} />
                <div>
                  <strong>{profile.data.latest_resume.original_filename}</strong>
                  <span>Latest resume · {formatDate(profile.data.latest_resume.created_at)}</span>
                </div>
                <Link to="/resume" className="text-link">
                  Manage
                </Link>
              </div>
            )}
          </Card>

          <Card>
            <CardHeader title="Profile tips" description="Small changes that make your results more accurate." />
            <ul className="tip-list">
              <li>
                <GraduationCap size={16} />
                <span>Keep branch, batch and CGPA current so eligibility does not fall back to “needs info”.</span>
              </li>
              <li>
                <Target size={16} />
                <span>Choose one realistic target role. You can compare other roles on the skill-gap page.</span>
              </li>
              <li>
                <Briefcase size={16} />
                <span>Only add skills you can demonstrate in an interview. Self-reported levels are not verified.</span>
              </li>
              <li>
                <Link2 size={16} />
                <span>Add project and credential links so reviewers can verify your work.</span>
              </li>
            </ul>
          </Card>

          <Card className="side-cta">
            <Sparkles size={20} />
            <h3>Turn gaps into a plan</h3>
            <p>Use your target role and current skills to generate a dated four-week roadmap.</p>
            <Button variant="secondary" size="sm" to="/roadmap">
              Open roadmap
            </Button>
          </Card>
        </aside>
      </div>

      <Modal
        open={Boolean(projectModal)}
        onClose={() => setProjectModal(null)}
        title={projectModal?.item ? 'Edit project' : 'Add a project'}
        description="Describe what you built, the stack you used and your specific contribution."
        footer={
          <>
            <Button variant="ghost" onClick={() => setProjectModal(null)} disabled={modalSaving}>
              Cancel
            </Button>
            <Button type="submit" form="project-form" loading={modalSaving}>
              {projectModal?.item ? 'Save project' : 'Add project'}
            </Button>
          </>
        }
      >
        {projectModal && (
          <form id="project-form" className="form-stack" onSubmit={saveProject}>
            {modalError && <div className="inline-error">{modalError}</div>}
            <FormField label="Project title" required>
              <Input
                value={projectModal.data.title}
                onChange={(event) => setProjectModal((current) => ({ ...current, data: { ...current.data, title: event.target.value } }))}
                required
                minLength={2}
              />
            </FormField>
            <FormField label="Description" hint="What problem does it solve? What was your contribution?">
              <Textarea
                rows={4}
                value={projectModal.data.description}
                onChange={(event) => setProjectModal((current) => ({ ...current, data: { ...current.data, description: event.target.value } }))}
                maxLength={2000}
              />
            </FormField>
            <FormField label="Tech stack" hint="Comma-separated, e.g. React, Node.js, MySQL.">
              <Input
                value={projectModal.data.tech_stack}
                onChange={(event) => setProjectModal((current) => ({ ...current, data: { ...current.data, tech_stack: event.target.value } }))}
                maxLength={500}
              />
            </FormField>
            <FormField label="Link" hint="GitHub repository or live demo URL including https://.">
              <Input
                type="url"
                value={projectModal.data.link}
                onChange={(event) => setProjectModal((current) => ({ ...current, data: { ...current.data, link: event.target.value } }))}
                placeholder="https://github.com/…"
              />
            </FormField>
          </form>
        )}
      </Modal>

      <Modal
        open={Boolean(certModal)}
        onClose={() => setCertModal(null)}
        title={certModal?.item ? 'Edit certification' : 'Add a certification'}
        description="Add a completed certification with a verifiable credential when possible."
        footer={
          <>
            <Button variant="ghost" onClick={() => setCertModal(null)} disabled={modalSaving}>
              Cancel
            </Button>
            <Button type="submit" form="certification-form" loading={modalSaving}>
              {certModal?.item ? 'Save certification' : 'Add certification'}
            </Button>
          </>
        }
      >
        {certModal && (
          <form id="certification-form" className="form-stack" onSubmit={saveCertification}>
            {modalError && <div className="inline-error">{modalError}</div>}
            <FormField label="Certification name" required>
              <Input
                value={certModal.data.name}
                onChange={(event) => setCertModal((current) => ({ ...current, data: { ...current.data, name: event.target.value } }))}
                required
                minLength={2}
              />
            </FormField>
            <div className="form-grid two">
              <FormField label="Issuer">
                <Input
                  value={certModal.data.issuer}
                  onChange={(event) => setCertModal((current) => ({ ...current, data: { ...current.data, issuer: event.target.value } }))}
                />
              </FormField>
              <FormField label="Issue date">
                <Input
                  type="date"
                  value={certModal.data.issue_date}
                  onChange={(event) => setCertModal((current) => ({ ...current, data: { ...current.data, issue_date: event.target.value } }))}
                />
              </FormField>
            </div>
            <FormField label="Credential URL">
              <Input
                type="url"
                value={certModal.data.credential_url}
                onChange={(event) => setCertModal((current) => ({ ...current, data: { ...current.data, credential_url: event.target.value } }))}
                placeholder="https://…"
              />
            </FormField>
          </form>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        onConfirm={handleConfirm}
        title={confirm?.title}
        description={confirm?.description}
        confirmLabel={confirm?.confirmLabel}
        loading={confirmBusy}
      />
    </div>
  );
}

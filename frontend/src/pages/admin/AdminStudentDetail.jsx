import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Award,
  BookOpen,
  Briefcase,
  CalendarClock,
  CheckCircle2,
  Circle,
  ExternalLink,
  FolderGit2,
  GraduationCap,
  Mail,
  MapPin,
  NotebookPen,
  Target,
  UserCheck,
  UserX,
} from 'lucide-react';
import { api, errorMessage } from '../../api/client.js';
import { useApi } from '../../hooks/useApi.js';
import { useToast } from '../../context/ToastContext.jsx';
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardHeader,
  ConfirmDialog,
  ErrorState,
  Loader,
  Notice,
  PageHeader,
  ProgressBar,
  StatCard,
} from '../../components/ui.jsx';
import { STATUS_LABELS } from '../../utils/constants.js';
import { formatDate, titleCase } from '../../utils/format.js';

const STATUS_TONES = {
  interested: 'slate',
  applied: 'blue',
  assessment: 'violet',
  interview: 'amber',
  selected: 'green',
  rejected: 'red',
};

export default function AdminStudentDetail() {
  const { id } = useParams();
  const toast = useToast();
  const { data: student, loading, error, reload } = useApi(`/admin/students/${id}`);
  const [confirmToggle, setConfirmToggle] = useState(false);
  const [toggleBusy, setToggleBusy] = useState(false);

  if (loading) return <Loader label="Loading student profile…" />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!student) return null;

  const skills = student.skills || [];
  const projects = student.projects || [];
  const certifications = student.certifications || [];
  const applications = student.applications || [];
  const preparation = student.preparation || [];
  const notes = student.notes || [];
  const completed = preparation.filter((topic) => topic.is_completed).length;
  const prepPercent = preparation.length ? Math.round((completed / preparation.length) * 100) : 0;
  const confirmedSkills = skills.filter((skill) => skill.is_confirmed);

  const groupedSkills = Object.entries(
    confirmedSkills.reduce((groups, skill) => {
      const category = skill.category || 'other';
      groups[category] = groups[category] || [];
      groups[category].push(skill);
      return groups;
    }, {}),
  ).sort(([a], [b]) => a.localeCompare(b));

  const toggleStatus = async () => {
    setToggleBusy(true);
    try {
      await api.patch(`/admin/students/${student.id}/status`, { is_active: !student.is_active });
      toast.success(student.is_active ? 'Student account deactivated.' : 'Student account activated.');
      setConfirmToggle(false);
      await reload({ quiet: true });
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setToggleBusy(false);
    }
  };

  return (
    <div className="page-stack">
      <Link to="/admin/students" className="back-link">
        <ArrowLeft size={16} /> Back to students
      </Link>

      <Card className="detail-hero">
        <div className="detail-hero-main">
          <Avatar name={student.name} size="lg" tone="indigo" />
          <div className="detail-title">
            <div className="opportunity-badges">
              <Badge tone={student.is_active ? 'green' : 'slate'} dot>
                {student.is_active ? 'Active account' : 'Inactive account'}
              </Badge>
              {student.target_role && <Badge tone="indigo">{student.target_role}</Badge>}
              <Badge tone="slate">Student</Badge>
            </div>
            <h1>{student.name}</h1>
            <p className="detail-company">
              <Mail size={15} /> {student.email}
              {student.college && (
                <>
                  <span>·</span>
                  <GraduationCap size={15} /> {student.college}
                </>
              )}
            </p>
          </div>
        </div>
        <div className="detail-hero-actions">
          <Button variant="secondary" to="/admin/students" icon={ArrowLeft}>
            All students
          </Button>
          <Button
            variant={student.is_active ? 'danger' : 'primary'}
            icon={student.is_active ? UserX : UserCheck}
            onClick={() => setConfirmToggle(true)}
          >
            {student.is_active ? 'Deactivate' : 'Activate'}
          </Button>
        </div>
      </Card>

      <Notice tone="info" icon={BookOpen}>
        Preparation and skill levels are recorded from student activity and self-reporting. Use them as planning signals, not
        assessment results.
      </Notice>

      <div className="stats-grid four">
        <StatCard icon={GraduationCap} label="CGPA" value={student.cgpa ?? '—'} meta={student.active_backlogs != null ? `${student.active_backlogs} active backlogs` : 'Backlogs not added'} tone="indigo" />
        <StatCard icon={Target} label="Confirmed skills" value={confirmedSkills.length} meta={`${skills.length - confirmedSkills.length} unconfirmed`} tone="violet" />
        <StatCard icon={Briefcase} label="Applications" value={applications.length} meta={`${applications.filter((app) => ['applied', 'assessment', 'interview'].includes(app.status)).length} in progress`} tone="blue" />
        <StatCard icon={BookOpen} label="Preparation" value={`${prepPercent}%`} meta={`${completed}/${preparation.length} topics completed`} tone="green" />
      </div>

      <div className="profile-layout">
        <div className="profile-main">
          <Card>
            <CardHeader
              title="Profile and academics"
              description="Details used by the eligibility engine for this student."
              action={<Avatar name={student.name} size="sm" />}
            />
            <div className="admin-fact-grid">
              <Fact label="College" value={student.college} icon={GraduationCap} />
              <Fact label="Branch" value={student.branch} icon={BookOpen} />
              <Fact label="Graduation year" value={student.graduation_year} icon={CalendarClock} />
              <Fact label="CGPA" value={student.cgpa} icon={Target} />
              <Fact label="Class 10" value={student.tenth_percentage != null ? `${student.tenth_percentage}%` : null} />
              <Fact label="Class 12" value={student.twelfth_percentage != null ? `${student.twelfth_percentage}%` : null} />
              <Fact label="Phone" value={student.phone} />
              <Fact label="Joined" value={formatDate(student.created_at)} />
            </div>
            {(student.linkedin_url || student.github_url) && (
              <div className="profile-link-row">
                {student.linkedin_url && (
                  <a href={student.linkedin_url} target="_blank" rel="noreferrer" className="text-link">
                    LinkedIn <ExternalLink size={13} />
                  </a>
                )}
                {student.github_url && (
                  <a href={student.github_url} target="_blank" rel="noreferrer" className="text-link">
                    GitHub <ExternalLink size={13} />
                  </a>
                )}
              </div>
            )}
            {student.bio && <p className="muted-copy mt-3">{student.bio}</p>}
          </Card>

          <Card>
            <CardHeader
              title="Skills"
              description="Self-reported levels, grouped by category. Only confirmed skills are used in readiness analysis."
              action={<Badge tone="indigo">{confirmedSkills.length} confirmed</Badge>}
            />
            {groupedSkills.length === 0 ? (
              <div className="mini-empty">
                <Target size={22} />
                <p>This student has not confirmed any skills yet.</p>
              </div>
            ) : (
              <div className="admin-skill-groups">
                {groupedSkills.map(([category, items]) => (
                  <div className="admin-skill-group" key={category}>
                    <span className="skill-group-label">{titleCase(category)}</span>
                    <div className="skill-chips">
                      {items.map((skill) => (
                        <span key={skill.id} className="skill-chip required">
                          {skill.name} · {skill.proficiency}/5
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <CardHeader title="Applications" description="Every role this student is tracking, with current stage." action={<Badge tone="slate">{applications.length} total</Badge>} />
            {applications.length === 0 ? (
              <div className="mini-empty">
                <Briefcase size={22} />
                <p>No applications tracked by this student.</p>
              </div>
            ) : (
              <div className="table-wrap">
                <table className="data-table compact">
                  <thead>
                    <tr>
                      <th>Role</th>
                      <th>Company</th>
                      <th>Status</th>
                      <th>Applied</th>
                      <th>Assessment</th>
                      <th>Interview</th>
                      <th>Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {applications.map((application) => (
                      <tr key={application.id}>
                        <td>
                          <strong>{application.title}</strong>
                        </td>
                        <td>{application.company}</td>
                        <td>
                          <Badge tone={STATUS_TONES[application.status] || 'slate'}>{STATUS_LABELS[application.status]}</Badge>
                        </td>
                        <td>{formatDate(application.applied_date)}</td>
                        <td>{application.assessment_date ? formatDate(application.assessment_date) : '—'}</td>
                        <td>{application.interview_date ? formatDate(application.interview_date) : '—'}</td>
                        <td className="muted">{formatDate(application.updated_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card>
            <CardHeader
              title="Preparation progress"
              description="Topics the student has marked complete. Practical tasks are tracked per topic."
              action={
                <Badge tone={prepPercent >= 70 ? 'green' : prepPercent >= 40 ? 'amber' : 'slate'}>{prepPercent}% complete</Badge>
              }
            />
            <div className="admin-prep-progress">
              <ProgressBar value={prepPercent} tone={prepPercent >= 70 ? 'green' : 'amber'} label={`${completed} of ${preparation.length} topics`} />
            </div>
            <div className="admin-topic-list">
              {preparation.map((topic) => (
                <div className={`admin-topic-row ${topic.is_completed ? 'done' : ''}`} key={`${topic.category}-${topic.title}`}>
                  {topic.is_completed ? <CheckCircle2 size={17} /> : <Circle size={17} />}
                  <div>
                    <strong>{topic.title}</strong>
                    <span>{topic.category}</span>
                  </div>
                  <span className="admin-topic-date">{topic.completed_at ? formatDate(topic.completed_at) : 'Not completed'}</span>
                </div>
              ))}
            </div>
          </Card>

          <div className="admin-grid">
            <Card>
              <CardHeader title="Projects" description="Evidence added to the profile." action={<FolderGit2 size={18} className="card-head-icon" />} />
              {projects.length === 0 ? (
                <p className="muted small">No projects added.</p>
              ) : (
                <div className="entry-list">
                  {projects.map((project) => (
                    <div className="entry-card" key={project.id}>
                      <span className="entry-icon">
                        <FolderGit2 size={17} />
                      </span>
                      <div className="entry-copy">
                        <strong>{project.title}</strong>
                        {project.description && <p>{project.description}</p>}
                        <div className="entry-meta">
                          {project.tech_stack && <Badge tone="slate">{project.tech_stack}</Badge>}
                          {project.link && (
                            <a href={project.link} target="_blank" rel="noreferrer" className="text-link">
                              Open <ExternalLink size={12} />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card>
              <CardHeader title="Certifications" description="Self-reported credentials." action={<Award size={18} className="card-head-icon" />} />
              {certifications.length === 0 ? (
                <p className="muted small">No certifications added.</p>
              ) : (
                <div className="entry-list">
                  {certifications.map((certification) => (
                    <div className="entry-card" key={certification.id}>
                      <span className="entry-icon amber">
                        <Award size={17} />
                      </span>
                      <div className="entry-copy">
                        <strong>{certification.name}</strong>
                        <p>
                          {certification.issuer || 'Issuer not listed'}
                          {certification.issue_date ? ` · ${formatDate(certification.issue_date)}` : ''}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>

        <aside className="profile-side">
          <Card className="profile-summary">
            <div className="profile-summary-top">
              <Avatar name={student.name} size="md" tone="indigo" />
              <div>
                <strong>{student.name}</strong>
                <span>{student.email}</span>
              </div>
            </div>
            <div className="side-facts">
              <div>
                <span>Target role</span>
                <strong>{student.target_role || 'Not set'}</strong>
              </div>
              <div>
                <span>Branch</span>
                <strong>{student.branch || 'Not added'}</strong>
              </div>
              <div>
                <span>Batch</span>
                <strong>{student.graduation_year || 'Not added'}</strong>
              </div>
              <div>
                <span>Account status</span>
                <strong>{student.is_active ? 'Active' : 'Inactive'}</strong>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Private notes" description="The student's latest preparation notes." action={<NotebookPen size={18} className="card-head-icon" />} />
            {notes.length === 0 ? (
              <p className="muted small">No preparation notes saved.</p>
            ) : (
              <div className="note-list compact">
                {notes.map((note) => (
                  <article className="note-card" key={note.id}>
                    <div className="note-head">
                      <strong>{note.title}</strong>
                    </div>
                    <p>{note.body}</p>
                    <small>Updated {formatDate(note.updated_at)}</small>
                  </article>
                ))}
              </div>
            )}
          </Card>

          <Card className="side-cta">
            <MapPin size={20} />
            <h3>Readiness context</h3>
            <p>
              Eligibility is recalculated for this student on every opportunity request. Use the opportunity catalogue to review
              criteria and sample data notices.
            </p>
            <Button variant="secondary" size="sm" to="/admin/opportunities">
              Review opportunities
            </Button>
          </Card>
        </aside>
      </div>

      <ConfirmDialog
        open={confirmToggle}
        onClose={() => setConfirmToggle(false)}
        onConfirm={toggleStatus}
        title={student.is_active ? 'Deactivate this student account?' : 'Activate this student account?'}
        description={
          student.is_active
            ? `${student.name} will be signed out and blocked from signing in. All records stay stored.`
            : `${student.name} will be able to sign in again with their existing password.`
        }
        confirmLabel={student.is_active ? 'Deactivate account' : 'Activate account'}
        tone={student.is_active ? 'danger' : 'primary'}
        loading={toggleBusy}
      />
    </div>
  );
}

function Fact({ label, value, icon: Icon }) {
  return (
    <div className="admin-fact">
      {Icon && (
        <span className="admin-fact-icon">
          <Icon size={16} />
        </span>
      )}
      <div>
        <span>{label}</span>
        <strong>{value || '—'}</strong>
      </div>
    </div>
  );
}

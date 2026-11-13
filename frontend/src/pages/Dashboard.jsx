import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUpRight,
  Briefcase,
  CheckCircle2,
  ClipboardList,
  Clock3,
  FileText,
  GraduationCap,
  Map,
  Sparkles,
  Target,
  TrendingUp,
  UserRound,
  CalendarDays,
  BookOpen,
  AlertTriangle,
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { useApi } from '../hooks/useApi.js';
import { useAuth } from '../context/AuthContext.jsx';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  ErrorState,
  Loader,
  PageHeader,
  ProgressBar,
  StatCard,
} from '../components/ui.jsx';
import { ELIGIBILITY, STATUS_LABELS } from '../utils/constants.js';
import { daysUntil, deadlineLabel, formatDate, formatShortDate, timeAgo } from '../utils/format.js';

const STEP_ICONS = {
  skills: Sparkles,
  resume: FileText,
  target: Target,
  opportunity: Briefcase,
  skillgap: Target,
  roadmap: Map,
  deadline: Clock3,
  check: CheckCircle2,
};

const ELIGIBILITY_COLORS = { eligible: '#059669', needs_info: '#d97706', not_eligible: '#dc2626' };

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      {label && <span>{label}</span>}
      {payload.map((item) => (
        <strong key={item.dataKey || item.name}>
          {item.name}: {item.value}
        </strong>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useApi('/dashboard');

  if (loading) return <Loader label="Building your placement snapshot…" />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return null;

  const { opportunities, applications, preparation, profile_completion: profilePercent, upcoming_deadlines: deadlines = [], upcoming_events: events = [], skill_gap: gap, next_steps: nextSteps = [], notifications_unread: unread } = data;

  const eligibilityData = [
    { name: 'Eligible', key: 'eligible', value: opportunities.eligible },
    { name: 'Needs info', key: 'needs_info', value: opportunities.needs_info },
    { name: 'Not eligible', key: 'not_eligible', value: opportunities.not_eligible },
  ].filter((item) => item.value > 0);

  const pipelineData = ['interested', 'applied', 'assessment', 'interview', 'selected', 'rejected'].map((status) => ({
    name: STATUS_LABELS[status],
    count: applications[status] || 0,
  }));

  const activeApplications = (applications.applied || 0) + (applications.assessment || 0) + (applications.interview || 0);
  const ringStyle = { '--ring-value': `${Math.max(profilePercent, 2) * 3.6}deg` };

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow={`${greeting()}, ${user?.name?.split(' ')[0] || 'there'}`}
        title="Your placement readiness at a glance"
        description="Eligibility is recalculated from your live profile every time you open this page. Keep your skills and academics current for accurate results."
        actions={
          <>
            <Button variant="secondary" to="/profile" icon={UserRound}>
              Update profile
            </Button>
            <Button to="/opportunities" icon={Briefcase}>
              Find opportunities
            </Button>
          </>
        }
      />

      {profilePercent < 100 && (
        <div className="banner banner-indigo">
          <span className="banner-icon">
            <Sparkles size={19} />
          </span>
          <div>
            <strong>Your profile is {profilePercent}% complete.</strong>
            <p>Complete the remaining steps to make eligibility and skill-gap results more reliable.</p>
          </div>
          <Button variant="white" size="sm" to="/profile">
            Complete profile
          </Button>
        </div>
      )}

      <div className="stats-grid four">
        <StatCard
          icon={Briefcase}
          label="Eligible opportunities"
          value={`${opportunities.eligible}`}
          meta={`of ${opportunities.total} active ${opportunities.total === 1 ? 'opening' : 'openings'} · ${opportunities.needs_info} need info`}
          tone="green"
          to="/opportunities?eligibility=eligible"
        />
        <StatCard
          icon={ClipboardList}
          label="Applications in progress"
          value={activeApplications}
          meta={`${applications.total} tracked in total`}
          tone="indigo"
          to="/applications"
        />
        <StatCard
          icon={BookOpen}
          label="Preparation completion"
          value={`${preparation.completion_percent}%`}
          meta={`${preparation.topics_completed}/${preparation.topics_total} topics · ${preparation.practice_tasks_completed}/${preparation.practice_tasks_total} practice tasks`}
          tone="violet"
          to="/preparation"
        />
        <StatCard
          icon={UserRound}
          label="Profile completion"
          value={`${profilePercent}%`}
          meta={unread ? `${unread} unread in-app reminder${unread === 1 ? '' : 's'}` : 'No unread reminders'}
          tone="amber"
          to="/profile"
        />
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-main">
          <Card className="next-steps-card">
            <CardHeader
              title="What to do next"
              description="Ordered by impact on your placement readiness."
              action={<Badge tone="indigo">{nextSteps.length} actions</Badge>}
            />
            <div className="next-step-list">
              {nextSteps.map((step, index) => {
                const Icon = STEP_ICONS[step.icon] || Target;
                return (
                  <Link to={step.link} key={`${step.title}-${index}`} className="next-step">
                    <span className="next-step-number">{String(index + 1).padStart(2, '0')}</span>
                    <span className="next-step-icon">
                      <Icon size={18} />
                    </span>
                    <span className="next-step-copy">
                      <strong>{step.title}</strong>
                      <small>{step.description}</small>
                    </span>
                    <Badge tone={step.priority === 'high' ? 'red' : step.priority === 'medium' ? 'amber' : 'slate'}>{step.priority}</Badge>
                    <ArrowRight size={17} className="next-step-arrow" />
                  </Link>
                );
              })}
            </div>
          </Card>

          <div className="chart-grid">
            <Card>
              <CardHeader
                title="Eligibility mix"
                description="Active sample opportunities with deadlines still open."
                action={<Badge tone="slate">Sample data</Badge>}
              />
              {eligibilityData.length ? (
                <div className="donut-layout">
                  <div className="donut-chart">
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={eligibilityData} dataKey="value" nameKey="name" innerRadius={62} outerRadius={88} paddingAngle={3} stroke="none">
                          {eligibilityData.map((entry) => (
                            <Cell key={entry.key} fill={ELIGIBILITY_COLORS[entry.key]} />
                          ))}
                        </Pie>
                        <Tooltip content={<ChartTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="donut-center">
                      <strong>{opportunities.eligible}</strong>
                      <span>eligible</span>
                    </div>
                  </div>
                  <div className="legend-list">
                    {eligibilityData.map((entry) => (
                      <div key={entry.key} className="legend-item">
                        <span className="legend-dot" style={{ background: ELIGIBILITY_COLORS[entry.key] }} />
                        <span>{entry.name}</span>
                        <strong>{entry.value}</strong>
                      </div>
                    ))}
                    <Link to="/opportunities" className="legend-link">
                      View all opportunities <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              ) : (
                <p className="muted-copy">No active opportunities to summarise right now.</p>
              )}
            </Card>

            <Card>
              <CardHeader
                title="Application pipeline"
                description="Where your tracked applications stand."
                action={
                  <Link to="/applications" className="link-inline">
                    Open tracker <ArrowUpRight size={14} />
                  </Link>
                }
              />
              {applications.total > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={pipelineData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e7eaf3" />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 11 }} interval={0} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: '#f4f5fb' }} />
                    <Bar dataKey="count" name="Applications" fill="#6366f1" radius={[6, 6, 0, 0]} maxBarSize={36} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="mini-empty">
                  <ClipboardList size={22} />
                  <p>No applications tracked yet. Save an opportunity as interested to start your pipeline.</p>
                  <Button size="sm" variant="secondary" to="/opportunities">
                    Browse opportunities
                  </Button>
                </div>
              )}
            </Card>
          </div>

          <Card>
            <CardHeader
              title="Deadlines approaching"
              description="Openings closing within the next 14 days."
              action={
                <Link to="/opportunities?sort=deadline_asc" className="link-inline">
                  All opportunities <ArrowUpRight size={14} />
                </Link>
              }
            />
            {deadlines.length ? (
              <div className="deadline-list">
                {deadlines.map((deadline) => {
                  const days = daysUntil(deadline.application_deadline);
                  const status = ELIGIBILITY[deadline.eligibility_status] || ELIGIBILITY.needs_info;
                  return (
                    <Link to={`/opportunities/${deadline.id}`} key={deadline.id} className="deadline-row">
                      <span className="deadline-date">
                        <strong>{formatShortDate(deadline.application_deadline)}</strong>
                        <small>{deadlineLabel(deadline.application_deadline)}</small>
                      </span>
                      <span className="deadline-copy">
                        <strong>{deadline.title}</strong>
                        <small>
                          {deadline.company} · {deadline.type}
                        </small>
                      </span>
                      <Badge tone={status.tone} dot>
                        {status.label}
                      </Badge>
                      <span className={`deadline-days ${days !== null && days <= 3 ? 'urgent' : ''}`}>
                        {days !== null ? `${days}d` : '—'}
                      </span>
                      <ArrowRight size={16} />
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="mini-empty">
                <CheckCircle2 size={22} />
                <p>No deadlines in the next two weeks. Use the time to close a skill gap.</p>
                <Button size="sm" variant="secondary" to="/skill-gap">
                  Review skill gaps
                </Button>
              </div>
            )}
          </Card>

          <Card>
            <CardHeader
              title="Recent applications"
              description="The latest activity from your tracker."
              action={
                <Link to="/applications" className="link-inline">
                  Full tracker <ArrowUpRight size={14} />
                </Link>
              }
            />
            {applications.recent?.length ? (
              <div className="table-wrap">
                <table className="data-table compact">
                  <thead>
                    <tr>
                      <th>Role</th>
                      <th>Company</th>
                      <th>Status</th>
                      <th>Deadline</th>
                      <th>Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {applications.recent.map((application) => (
                      <tr key={application.id}>
                        <td>
                          <Link to={`/opportunities/${application.opportunity.id}`} className="table-link">
                            {application.opportunity.title}
                          </Link>
                        </td>
                        <td>{application.opportunity.company}</td>
                        <td>
                          <Badge tone={statusTone(application.status)}>{STATUS_LABELS[application.status]}</Badge>
                        </td>
                        <td>{formatDate(application.opportunity.application_deadline)}</td>
                        <td className="muted">{timeAgo(application.updated_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="mini-empty">
                <ClipboardList size={22} />
                <p>Applications you track will appear here with status and reminder details.</p>
              </div>
            )}
          </Card>
        </div>

        <aside className="dashboard-side">
          <Card className="profile-ring-card">
            <CardHeader title="Profile strength" description="Complete profiles get more reliable checks." />
            <div className="profile-ring-wrap">
              <div className="profile-ring" style={ringStyle}>
                <div className="profile-ring-inner">
                  <strong>{profilePercent}%</strong>
                  <span>complete</span>
                </div>
              </div>
            </div>
            <div className="side-actions">
              <Button variant="secondary" to="/profile" size="sm" icon={UserRound}>
                Improve profile
              </Button>
              {!preparation.roadmap && (
                <Button variant="ghost" to="/roadmap" size="sm" icon={Map}>
                  Build roadmap
                </Button>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Target-role readiness"
              description={gap ? `${gap.role} · self-reported skills` : 'Choose a target role to unlock this view.'}
              action={<Target size={18} className="card-head-icon" />}
            />
            {gap ? (
              <>
                <div className="readiness-row">
                  <strong>{gap.readiness}%</strong>
                  <span>required skills met</span>
                </div>
                <ProgressBar value={gap.readiness} tone={gap.readiness >= 70 ? 'green' : gap.readiness >= 40 ? 'amber' : 'red'} />
                <p className="muted-copy small">{gap.summary.required_met} of {gap.summary.required_total} required skills are at the expected level.</p>
                <div className="gap-mini-list">
                  {gap.gaps.slice(0, 3).map((item) => (
                    <div key={item.name} className="gap-mini">
                      <div>
                        <strong>{item.name}</strong>
                        <small>{item.status === 'missing' ? 'Not added' : `Level ${item.current_proficiency}/5`} · needs {item.required_proficiency}/5</small>
                      </div>
                      <Badge tone={item.priority === 'high' ? 'red' : item.priority === 'medium' ? 'amber' : 'slate'}>{item.priority}</Badge>
                    </div>
                  ))}
                </div>
                <Button variant="secondary" size="sm" to="/skill-gap" className="full-width">
                  Open skill-gap analysis
                </Button>
              </>
            ) : (
              <div className="mini-empty">
                <Target size={22} />
                <p>Add a target role on your profile to see role readiness and priority gaps.</p>
                <Button size="sm" variant="secondary" to="/profile">
                  Choose target role
                </Button>
              </div>
            )}
          </Card>

          <Card>
            <CardHeader title="Study roadmap" description="Your latest four-week preparation plan." action={<Map size={18} className="card-head-icon" />} />
            {preparation.roadmap ? (
              <>
                <div className="roadmap-meta">
                  <Badge tone="indigo">{preparation.roadmap.target_role}</Badge>
                  <span>Generated {formatDate(preparation.roadmap.generated_at)}</span>
                </div>
                <div className="readiness-row small-row">
                  <strong>{preparation.roadmap.progress.percent}%</strong>
                  <span>{preparation.roadmap.progress.completed}/{preparation.roadmap.progress.total} tasks · {preparation.roadmap.progress.overdue} overdue</span>
                </div>
                <ProgressBar value={preparation.roadmap.progress.percent} tone="violet" />
                <Button variant="secondary" size="sm" to="/roadmap" className="full-width">
                  Open roadmap
                </Button>
              </>
            ) : (
              <div className="mini-empty">
                <Map size={22} />
                <p>Turn your skill gaps into a dated, editable four-week study plan.</p>
                <Button size="sm" to="/roadmap" icon={Sparkles}>
                  Generate roadmap
                </Button>
              </div>
            )}
          </Card>

          <Card>
            <CardHeader title="Coming up" description="Assessments, interviews and saved deadlines." action={<CalendarDays size={18} className="card-head-icon" />} />
            {events.length ? (
              <div className="event-list">
                {events.map((event, index) => (
                  <div className="event-item" key={`${event.title}-${index}`}>
                    <span className={`event-marker ${event.event_type}`} />
                    <div>
                      <strong>{event.title}</strong>
                      <small>
                        {event.company} · {formatDate(event.event_at, { hour: '2-digit', minute: '2-digit' })}
                      </small>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted-copy small">No assessments or interviews in the next 30 days. Save deadlines to see them here.</p>
            )}
          </Card>

          <div className="side-note">
            <AlertTriangle size={17} />
            <p>
              <strong>Demo data notice</strong>
              Opportunity eligibility counts use clearly labelled sample openings. They are not verified live jobs.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function statusTone(status) {
  return { interested: 'slate', applied: 'blue', assessment: 'violet', interview: 'amber', selected: 'green', rejected: 'red' }[status] || 'slate';
}

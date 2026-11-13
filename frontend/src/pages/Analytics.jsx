import { Link } from 'react-router-dom';
import {
  BarChart3,
  BookOpen,
  Briefcase,
  ClipboardList,
  Info,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useApi } from '../hooks/useApi.js';
import {
  Badge,
  Card,
  CardHeader,
  EmptyState,
  ErrorState,
  Loader,
  Notice,
  PageHeader,
  ProgressBar,
  StatCard,
} from '../components/ui.jsx';
import { STATUS_LABELS } from '../utils/constants.js';
import { titleCase } from '../utils/format.js';

const STATUS_COLORS = {
  interested: '#94a3b8',
  applied: '#3b82f6',
  assessment: '#8b5cf6',
  interview: '#f59e0b',
  selected: '#059669',
  rejected: '#dc2626',
};

const ELIGIBILITY_COLORS = { eligible: '#059669', needs_info: '#d97706', not_eligible: '#dc2626' };

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      {label && <span>{label}</span>}
      {payload.map((item) => (
        <strong key={item.dataKey || item.name} style={{ color: item.color }}>
          {item.name}: {item.value}
        </strong>
      ))}
    </div>
  );
}

export default function Analytics() {
  const { data, loading, error, reload } = useApi('/analytics');

  if (loading) return <Loader label="Calculating your analytics…" />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return null;

  const { preparation, applications, eligibility, skills, weekly } = data;
  const eligibilityData = [
    { name: 'Eligible', key: 'eligible', value: eligibility.counts.eligible },
    { name: 'Needs info', key: 'needs_info', value: eligibility.counts.needs_info },
    { name: 'Not eligible', key: 'not_eligible', value: eligibility.counts.not_eligible },
  ].filter((item) => item.value > 0);
  const funnelData = applications.funnel.map((item) => ({ name: STATUS_LABELS[item.status], key: item.status, count: item.count }));
  const readiness = skills.readiness;
  const hasWeeklyActivity = weekly.some((week) => week.preparation_activity > 0 || week.applications > 0 || week.skills_added > 0);

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Analytics"
        title="See what is actually moving"
        description="Progress is based on records stored in this application. Self-reported skills are planning indicators, not tested scores."
        actions={
          <ButtonLinks />
        }
      />

      <Notice tone="info" icon={Info}>
        Charts use your completed preparation topics, practice tasks, roadmap tasks, applications and confirmed skills. The last
        eight weeks are shown. {data.meta.caveat}
      </Notice>

      <div className="stats-grid four">
        <StatCard icon={BookOpen} label="Preparation completion" value={`${preparation.completion_percent}%`} meta={`${preparation.topics_completed}/${preparation.topics_total} topics · ${preparation.topics_pending} pending`} tone="indigo" to="/preparation" />
        <StatCard icon={ClipboardList} label="Applications tracked" value={applications.counts.total} meta={`${applications.conversion_rate}% reached assessment or beyond`} tone="blue" to="/applications" />
        <StatCard icon={Briefcase} label="Eligible roles" value={eligibility.counts.eligible} meta={`of ${eligibility.counts.total} active sample openings`} tone="green" to="/opportunities?eligibility=eligible" />
        <StatCard icon={Target} label="Role readiness" value={readiness === null ? '—' : `${readiness}%`} meta={skills.target_role ? `${skills.required_gaps} required gaps for ${skills.target_role}` : 'Choose a target role to unlock'} tone="amber" to="/skill-gap" />
      </div>

      <div className="chart-grid">
        <Card className="span-two">
          <CardHeader
            title="Weekly preparation activity"
            description="Completed topics, practice tasks, roadmap tasks and new applications over the last eight weeks."
            action={<Badge tone="indigo">Last 8 weeks</Badge>}
          />
          {hasWeeklyActivity ? (
            <ResponsiveContainer width="100%" height={290}>
              <ComposedChart data={weekly} margin={{ top: 10, right: 10, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e7eaf3" />
                <XAxis dataKey="week" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: '#f6f7fc' }} />
                <Bar dataKey="preparation_activity" name="Preparation activity" fill="#6366f1" radius={[5, 5, 0, 0]} maxBarSize={26} />
                <Bar dataKey="applications" name="Applications" fill="#0ea5e9" radius={[5, 5, 0, 0]} maxBarSize={26} />
                <Line type="monotone" dataKey="skills_cumulative" name="Skills (cumulative)" stroke="#059669" strokeWidth={2} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState
              icon={TrendingUp}
              title="No weekly activity yet"
              description="Complete a preparation task, finish a roadmap item or add an application to start the trend."
              action={<ButtonLink />}
            />
          )}
        </Card>

        <Card>
          <CardHeader title="Eligibility mix" description="Active sample openings." />
          {eligibilityData.length ? (
            <>
              <div className="analytics-donut">
                <ResponsiveContainer width="100%" height={210}>
                  <PieChart>
                    <Pie data={eligibilityData} dataKey="value" nameKey="name" innerRadius={58} outerRadius={84} paddingAngle={3} stroke="none">
                      {eligibilityData.map((entry) => (
                        <Cell key={entry.key} fill={ELIGIBILITY_COLORS[entry.key]} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="donut-center">
                  <strong>{eligibility.counts.total}</strong>
                  <span>open roles</span>
                </div>
              </div>
              <div className="legend-list compact">
                {eligibilityData.map((entry) => (
                  <div className="legend-item" key={entry.key}>
                    <span className="legend-dot" style={{ background: ELIGIBILITY_COLORS[entry.key] }} />
                    <span>{entry.name}</span>
                    <strong>{entry.value}</strong>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="muted small">No active eligibility data.</p>
          )}
        </Card>
      </div>

      <div className="chart-grid">
        <Card>
          <CardHeader
            title="Application funnel"
            description="Status distribution and conversion."
            action={<Badge tone="slate">{applications.counts.total} total</Badge>}
          />
          {applications.counts.total > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={funnelData} layout="vertical" margin={{ top: 4, right: 18, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e7eaf3" />
                  <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={76} tickLine={false} axisLine={false} tick={{ fill: '#475569', fontSize: 11 }} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: '#f6f7fc' }} />
                  <Bar dataKey="count" name="Applications" radius={[0, 5, 5, 0]} maxBarSize={22}>
                    {funnelData.map((entry) => (
                      <Cell key={entry.key} fill={STATUS_COLORS[entry.key]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="conversion-note">
                <Trophy size={16} />
                <span>
                  <strong>{applications.conversion_rate}%</strong> of tracked applications reached assessment, interview or selection.
                </span>
              </div>
            </>
          ) : (
            <p className="muted small">Track an application to populate the funnel.</p>
          )}
        </Card>

        <Card>
          <CardHeader title="Preparation by category" description="Completed topics against each library category." />
          {preparation.categories.length ? (
            <div className="category-progress-list">
              {preparation.categories.map((category) => (
                <div className="category-progress" key={category.category}>
                  <div className="progress-label">
                    <span>{category.category}</span>
                    <strong>
                      {category.completed}/{category.total}
                    </strong>
                  </div>
                  <ProgressBar value={category.total ? (category.completed / category.total) * 100 : 0} tone="indigo" size="sm" />
                </div>
              ))}
            </div>
          ) : (
            <p className="muted small">No preparation topics available.</p>
          )}
        </Card>
      </div>

      <div className="chart-grid">
        <Card>
          <CardHeader
            title="Skills by category"
            description="Confirmed skills and average self-reported level."
            action={<Link to="/profile#skills" className="link-inline">Update skills</Link>}
          />
          {skills.by_category.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={skills.by_category} margin={{ top: 4, right: 10, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e7eaf3" />
                <XAxis dataKey="category" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: '#f6f7fc' }} />
                <Bar dataKey="count" name="Skills" fill="#8b5cf6" radius={[5, 5, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState icon={Sparkles} title="No skills added yet" description="Add skills to see category distribution and role readiness." action={<ButtonLink label="Add skills" to="/profile#skills" />} />
          )}
        </Card>

        <Card>
          <CardHeader
            title="Priority skill gaps"
            description={skills.target_role ? `Required gaps for ${skills.target_role}.` : 'Set a target role to compare your skills.'}
            action={<Link to="/skill-gap" className="link-inline">Full analysis</Link>}
          />
          {skills.top_gaps.length ? (
            <div className="top-gap-list">
              {skills.top_gaps.map((gap) => (
                <div className="top-gap-row" key={gap.name}>
                  <div className="top-gap-copy">
                    <strong>{gap.name}</strong>
                    <span>
                      {gap.current ? `Level ${gap.current}/5` : 'Not added'} · expected {gap.required}/5
                    </span>
                  </div>
                  <Badge tone={gap.priority === 'high' ? 'red' : gap.priority === 'medium' ? 'amber' : 'slate'}>{gap.priority}</Badge>
                  <ProgressBar value={gap.current ? (gap.current / gap.required) * 100 : 0} tone={gap.priority === 'high' ? 'red' : 'amber'} size="sm" />
                </div>
              ))}
            </div>
          ) : skills.target_role ? (
            <div className="mini-empty">
              <Target size={22} />
              <p>No required skill gaps for this role. Keep your skills fresh with practice.</p>
            </div>
          ) : (
            <EmptyState icon={Target} title="No target role selected" description="Choose a target role on your profile to see readiness and priority gaps." action={<ButtonLink label="Choose role" to="/profile" />} />
          )}
        </Card>
      </div>

      <Card>
        <CardHeader title="Roadmap workload" description="Active roadmap tasks and overdue items." action={<Link to="/roadmap" className="link-inline">Open roadmap</Link>} />
        {preparation.roadmap?.total ? (
          <div className="roadmap-workload">
            <div>
              <span className="workload-value">{preparation.roadmap.completed}</span>
              <span className="workload-label">completed</span>
            </div>
            <div>
              <span className="workload-value">{preparation.roadmap.total - preparation.roadmap.completed}</span>
              <span className="workload-label">remaining</span>
            </div>
            <div>
              <span className={`workload-value ${preparation.roadmap.overdue ? 'danger' : ''}`}>{preparation.roadmap.overdue}</span>
              <span className="workload-label">overdue</span>
            </div>
            <div className="workload-progress">
              <ProgressBar value={preparation.roadmap.percent} tone="violet" label="Completion" />
            </div>
          </div>
        ) : (
          <p className="muted small">No active roadmap. Generate one to track workload here.</p>
        )}
      </Card>
    </div>
  );
}

function ButtonLinks() {
  return (
    <div className="page-header-actions-inline">
      <Link to="/applications" className="btn btn-secondary btn-md">
        <ClipboardList size={16} /> Tracker
      </Link>
      <Link to="/preparation" className="btn btn-secondary btn-md">
        <BookOpen size={16} /> Preparation
      </Link>
    </div>
  );
}

function ButtonLink({ to = '/preparation', label = 'Go to preparation' }) {
  return (
    <Link to={to} className="btn btn-secondary btn-sm">
      <BarChart3 size={15} /> {label}
    </Link>
  );
}

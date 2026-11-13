import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  BarChart3,
  BookOpen,
  Briefcase,
  CalendarClock,
  ClipboardList,
  GraduationCap,
  Library,
  Sparkles,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useApi } from '../../hooks/useApi.js';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  ErrorState,
  Loader,
  Notice,
  PageHeader,
  ProgressBar,
  StatCard,
} from '../../components/ui.jsx';
import { STATUS_LABELS } from '../../utils/constants.js';
import { formatDate, timeAgo } from '../../utils/format.js';

const STATUS_COLORS = {
  interested: '#94a3b8',
  applied: '#3b82f6',
  assessment: '#8b5cf6',
  interview: '#f59e0b',
  selected: '#059669',
  rejected: '#dc2626',
};

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      {label && <span>{label}</span>}
      {payload.map((item) => (
        <strong key={item.dataKey || item.name}>{item.name}: {item.value}</strong>
      ))}
    </div>
  );
}

export default function AdminDashboard() {
  const { data, loading, error, reload } = useApi('/admin/stats');

  if (loading) return <Loader label="Loading placement cell overview…" />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return null;

  const statusData = Object.entries(data.applications.by_status).map(([status, count]) => ({
    key: status,
    name: STATUS_LABELS[status] || status,
    count,
  }));
  const topSkills = data.top_skills.slice(0, 8);

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Placement cell"
        title="Placement drive at a glance"
        description="Monitor student readiness, opportunity activity and application outcomes across the demo workspace."
        actions={
          <>
            <Button variant="secondary" to="/admin/students" icon={Users}>
              Students
            </Button>
            <Button to="/admin/opportunities/new" icon={Briefcase}>
              New opportunity
            </Button>
          </>
        }
      />

      <Notice tone="warning" icon={Sparkles}>
        <strong>Sample workspace.</strong> Seeded opportunities are clearly labelled sample data and are not verified live
        openings. Student skill levels are self-reported.
      </Notice>

      <div className="stats-grid four">
        <StatCard icon={Users} label="Students" value={data.students.total} meta={`${data.students.active} active accounts`} tone="indigo" to="/admin/students" />
        <StatCard icon={Briefcase} label="Open opportunities" value={data.opportunities.open} meta={`${data.opportunities.active} active · ${data.opportunities.total} total`} tone="blue" to="/admin/opportunities" />
        <StatCard icon={ClipboardList} label="Applications" value={data.applications.total} meta={`${data.applications.by_status.interview || 0} at interview · ${data.applications.by_status.selected || 0} selected`} tone="amber" to="/admin/applications" />
        <StatCard icon={BookOpen} label="Average preparation" value={`${data.preparation.avg_completion_percent}%`} meta={`${data.preparation.topics_total} topics in the library`} tone="green" />
      </div>

      <div className="chart-grid">
        <Card>
          <CardHeader
            title="Application status mix"
            description="All tracked applications in the workspace."
            action={<Badge tone="slate">{data.applications.total} total</Badge>}
          />
          {data.applications.total > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={statusData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e7eaf3" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 11 }} interval={0} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: '#f6f7fc' }} />
                <Bar dataKey="count" name="Applications" radius={[5, 5, 0, 0]} maxBarSize={34}>
                  {statusData.map((entry) => (
                    <Cell key={entry.key} fill={STATUS_COLORS[entry.key]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="mini-empty">
              <ClipboardList size={22} />
              <p>No applications tracked yet.</p>
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title="Top skills" description="Most common confirmed skills across active students." action={<Target size={18} className="card-head-icon" />} />
          {topSkills.length ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={topSkills} layout="vertical" margin={{ top: 4, right: 15, left: 12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e7eaf3" />
                <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={116} tickLine={false} axisLine={false} tick={{ fill: '#475569', fontSize: 10 }} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: '#f6f7fc' }} />
                <Bar dataKey="student_count" name="Students" fill="#6366f1" radius={[0, 5, 5, 0]} maxBarSize={20} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="muted small">No student skills recorded yet.</p>
          )}
        </Card>
      </div>

      <div className="admin-grid">
        <Card>
          <CardHeader
            title="Upcoming deadlines"
            description="The next five active opportunities closing soon."
            action={<Link to="/admin/opportunities" className="link-inline">Manage roles <ArrowUpRight size={14} /></Link>}
          />
          {data.upcoming_deadlines.length ? (
            <div className="deadline-list">
              {data.upcoming_deadlines.map((deadline) => (
                <div className="deadline-row" key={deadline.id}>
                  <span className="deadline-date">
                    <strong>{formatDate(deadline.application_deadline)}</strong>
                    <small>{deadline.applications_count} applications</small>
                  </span>
                  <span className="deadline-copy">
                    <strong>{deadline.title}</strong>
                    <small>{deadline.company}</small>
                  </span>
                  <Link to={`/admin/opportunities/${deadline.id}/edit`} className="text-link">
                    Edit
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted small">No upcoming deadlines.</p>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Recent application activity"
            description="Latest tracker updates across students."
            action={<Link to="/admin/applications" className="link-inline">Insights <ArrowUpRight size={14} /></Link>}
          />
          {data.recent_applications.length ? (
            <div className="activity-list">
              {data.recent_applications.map((application) => (
                <div className="activity-row" key={application.id}>
                  <span className="activity-avatar">{application.student_name.slice(0, 1).toUpperCase()}</span>
                  <div>
                    <strong>{application.student_name}</strong>
                    <p>
                      {application.title} · {application.company}
                    </p>
                  </div>
                  <Badge tone={statusTone(application.status)}>{STATUS_LABELS[application.status]}</Badge>
                  <span className="activity-time">{timeAgo(application.created_at)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted small">No application activity yet.</p>
          )}
        </Card>
      </div>

      <div className="quick-links">
        <Link to="/admin/students" className="quick-link">
          <span className="quick-icon indigo">
            <Users size={20} />
          </span>
          <div>
            <strong>Student readiness</strong>
            <span>View profiles, skills and preparation progress.</span>
          </div>
          <ArrowUpRight size={16} />
        </Link>
        <Link to="/admin/skill-gaps" className="quick-link">
          <span className="quick-icon amber">
            <Target size={20} />
          </span>
          <div>
            <strong>Skill gap trends</strong>
            <span>Identify requirements students most often miss.</span>
          </div>
          <ArrowUpRight size={16} />
        </Link>
        <Link to="/admin/resources" className="quick-link">
          <span className="quick-icon green">
            <Library size={20} />
          </span>
          <div>
            <strong>Learning resources</strong>
            <span>Maintain the preparation resource library.</span>
          </div>
          <ArrowUpRight size={16} />
        </Link>
        <Link to="/admin/opportunities" className="quick-link">
          <span className="quick-icon blue">
            <Briefcase size={20} />
          </span>
          <div>
            <strong>Opportunity catalogue</strong>
            <span>Create, edit and retire sample opportunities.</span>
          </div>
          <ArrowUpRight size={16} />
        </Link>
      </div>
    </div>
  );
}

function statusTone(status) {
  return { interested: 'slate', applied: 'blue', assessment: 'violet', interview: 'amber', selected: 'green', rejected: 'red' }[status] || 'slate';
}

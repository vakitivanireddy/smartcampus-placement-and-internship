import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  BarChart3,
  Briefcase,
  ClipboardList,
  Target,
  TrendingUp,
  Trophy,
  Users,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useApi } from '../../hooks/useApi.js';
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
} from '../../components/ui.jsx';
import { APPLICATION_STATUSES, STATUS_LABELS } from '../../utils/constants.js';
import { formatDate, titleCase } from '../../utils/format.js';

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
        <strong key={item.dataKey || item.name}>
          {item.name}: {item.value}
        </strong>
      ))}
    </div>
  );
}

export default function AdminApplications() {
  const { data, loading, error, reload } = useApi('/admin/applications/stats');

  if (loading) return <Loader label="Loading application analytics…" />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return null;

  const byStatus = data.by_status || {};
  const total = Number(data.total || 0);
  const reached = (byStatus.assessment || 0) + (byStatus.interview || 0) + (byStatus.selected || 0);
  const conversion = total ? Math.round((reached / total) * 100) : 0;
  const offers = byStatus.selected || 0;
  const offerRate = total ? Math.round((offers / total) * 100) : 0;
  const statusData = APPLICATION_STATUSES.map((status) => ({
    key: status.value,
    name: status.label,
    count: byStatus[status.value] || 0,
  }));
  const pipelineData = APPLICATION_STATUSES.filter((status) => ['applied', 'assessment', 'interview'].includes(status.value)).map(
    (status) => ({ name: status.label, count: byStatus[status.value] || 0 }),
  );
  const weekly = (data.weekly || []).map((week) => ({ ...week, label: week.week }));
  const maxApplications = Math.max(1, ...(data.by_opportunity || []).map((row) => row.total));

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Placement cell"
        title="Application outcomes and activity"
        description="Aggregate tracker data across all students. Stages are self-reported by students and updated by hand, so treat this as a working signal."
        actions={
          <>
            <Link to="/admin/students" className="btn btn-secondary btn-md">
              <Users size={16} /> Students
            </Link>
            <Link to="/admin/opportunities" className="btn btn-secondary btn-md">
              <Briefcase size={16} /> Opportunities
            </Link>
          </>
        }
      />

      <Notice tone="info" icon={ClipboardList}>
        Every application on this page was added by a student in this demo workspace. The totals include sample opportunities and
        do not represent real placement outcomes.
      </Notice>

      <div className="stats-grid four">
        <StatCard icon={ClipboardList} label="Applications tracked" value={total} meta="Across all students and roles" tone="indigo" />
        <StatCard icon={TrendingUp} label="Reached assessment+" value={`${conversion}%`} meta={`${reached} applications beyond applied`} tone="blue" />
        <StatCard icon={Trophy} label="Selected" value={offers} meta={`${offerRate}% of tracked applications`} tone="green" />
        <StatCard icon={Target} label="At interview" value={byStatus.interview || 0} meta={`${byStatus.assessment || 0} currently in assessment`} tone="amber" />
      </div>

      <div className="chart-grid">
        <Card className="span-two">
          <CardHeader
            title="Weekly application activity"
            description="Applications added over the last eight weeks, grouped by ISO week."
            action={<Badge tone="indigo">Last 8 weeks</Badge>}
          />
          {weekly.length ? (
            <ResponsiveContainer width="100%" height={290}>
              <BarChart data={weekly} margin={{ top: 10, right: 10, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e7eaf3" />
                <XAxis dataKey="week" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: '#f6f7fc' }} />
                <Bar dataKey="count" name="Applications added" fill="#6366f1" radius={[5, 5, 0, 0]} maxBarSize={34} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState
              icon={BarChart3}
              title="No applications in the last eight weeks"
              description="Trends appear here as students add roles to their tracker."
            />
          )}
        </Card>

        <Card>
          <CardHeader
            title="Status mix"
            description="All tracked applications by current stage."
            action={<Badge tone="slate">{total} total</Badge>}
          />
          {total ? (
            <ResponsiveContainer width="100%" height={290}>
              <BarChart data={statusData} layout="vertical" margin={{ top: 4, right: 18, left: 12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e7eaf3" />
                <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={78} tickLine={false} axisLine={false} tick={{ fill: '#475569', fontSize: 11 }} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: '#f6f7fc' }} />
                <Bar dataKey="count" name="Applications" radius={[0, 5, 5, 0]} maxBarSize={22}>
                  {statusData.map((entry) => (
                    <Cell key={entry.key} fill={STATUS_COLORS[entry.key]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="muted small">No applications tracked yet.</p>
          )}
        </Card>
      </div>

      <div className="chart-grid">
        <Card>
          <CardHeader title="Pipeline snapshot" description="Active applications only: applied, assessment and interview." />
          <div className="admin-pipeline">
            {pipelineData.map((stage) => (
              <div className="admin-pipeline-row" key={stage.name}>
                <span>{stage.name}</span>
                <ProgressBar value={total ? (stage.count / total) * 100 : 0} tone="indigo" size="sm" />
                <strong>{stage.count}</strong>
              </div>
            ))}
            <div className="conversion-note">
              <Trophy size={16} />
              <span>
                <strong>{conversion}%</strong> of applications reached assessment, interview or selection.
              </span>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Stage counts" description="A direct comparison of every tracker status." />
          <div className="admin-status-grid">
            {APPLICATION_STATUSES.map((status) => (
              <div className="admin-status-card" key={status.value}>
                <span className={`legend-dot tone-${status.tone}`} />
                <div>
                  <strong>{byStatus[status.value] || 0}</strong>
                  <span>{status.label}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Applications by opportunity"
          description="Which roles attract the most tracker activity, and where they stand."
          action={<Badge tone="slate">{(data.by_opportunity || []).length} roles</Badge>}
        />
        {(data.by_opportunity || []).length === 0 ? (
          <EmptyState
            icon={Briefcase}
            title="No opportunity activity yet"
            description="Create opportunities and track applications to see role-level engagement."
          />
        ) : (
          <div className="table-wrap">
            <table className="data-table admin-table">
              <thead>
                <tr>
                  <th>Role</th>
                  <th>Type</th>
                  <th>Deadline</th>
                  <th>Total</th>
                  {APPLICATION_STATUSES.map((status) => (
                    <th key={status.value}>{status.label}</th>
                  ))}
                  <th>Volume</th>
                </tr>
              </thead>
              <tbody>
                {data.by_opportunity.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <strong>{row.title}</strong>
                      <div className="cell-sub">{row.company}</div>
                    </td>
                    <td>{titleCase(row.type)}</td>
                    <td>{formatDate(row.application_deadline)}</td>
                    <td>
                      <Badge tone={row.total ? 'indigo' : 'slate'}>{row.total}</Badge>
                    </td>
                    {APPLICATION_STATUSES.map((status) => (
                      <td key={status.value} className={row[status.value] ? '' : 'muted'}>
                        {row[status.value] || 0}
                      </td>
                    ))}
                    <td className="volume-cell">
                      <ProgressBar value={(row.total / maxApplications) * 100} tone="violet" size="sm" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <p className="page-footnote">
        <ArrowUpRight size={15} />
        <span>
          Status labels: {APPLICATION_STATUSES.map((status) => STATUS_LABELS[status.value]).join(' · ')}. Reminders remain in-app
          only; no email or SMS is sent.
        </span>
      </p>
    </div>
  );
}

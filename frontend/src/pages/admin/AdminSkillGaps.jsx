import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  BookOpen,
  Info,
  Search,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react';
import { api } from '../../api/client.js';
import { useApi } from '../../hooks/useApi.js';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  ErrorState,
  FormField,
  Input,
  Loader,
  Notice,
  PageHeader,
  ProgressBar,
  Select,
  StatCard,
} from '../../components/ui.jsx';
import { titleCase } from '../../utils/format.js';

const FILTERS = [
  { value: 'all', label: 'All skills' },
  { value: 'required', label: 'Required' },
  { value: 'preferred', label: 'Preferred' },
];

export default function AdminSkillGaps() {
  const [role, setRole] = useState('');
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const path = `/admin/skill-gaps${role ? api.query({ role }) : ''}`;
  const { data, meta, loading, error, reload } = useApi(path);

  const roles = data?.roles || [];
  const trends = data?.trends || [];

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return trends.filter((trend) => {
      if (filter !== 'all' && trend.importance !== filter) return false;
      if (!needle) return true;
      return `${trend.skill_name} ${trend.role_name}`.toLowerCase().includes(needle);
    });
  }, [trends, filter, search]);

  const summary = useMemo(() => {
    const totalStudents = roles.reduce((sum, item) => sum + item.students, 0);
    const highGap = trends.filter((trend) => trend.gap_percent >= 50).length;
    const requiredMissing = trends
      .filter((trend) => trend.importance === 'required')
      .reduce((sum, trend) => sum + trend.students_missing, 0);
    return { totalStudents, highGap, requiredMissing };
  }, [roles, trends]);

  const topGap = trends[0];

  if (loading) return <Loader label="Aggregating skill-gap trends…" />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Placement cell"
        title="Where students most often fall short"
        description="Aggregate gaps between self-reported skills and the requirements configured for each student's target role. Use this to plan workshops and preparation content."
        actions={
          <Button variant="secondary" to="/admin/resources" icon={BookOpen}>
            Resource library
          </Button>
        }
      />

      <Notice tone="warning" icon={Info}>
        {meta?.basis ||
          'This view compares each student’s confirmed, self-rated skills with role requirements. It is a preparation trend, not an assessment result.'}
      </Notice>

      <div className="stats-grid four">
        <StatCard icon={Users} label="Students with a target role" value={summary.totalStudents} meta={`${roles.length} target roles represented`} tone="indigo" />
        <StatCard icon={Target} label="Skills in this view" value={trends.length} meta={`${filtered.length} shown after filters`} tone="violet" />
        <StatCard icon={TrendingUp} label="High-gap skills" value={summary.highGap} meta="At least half of students missing or below level" tone="amber" />
        <StatCard icon={AlertTriangle} label="Required gaps" value={summary.requiredMissing} meta="Total required-skill misses across roles" tone="red" />
      </div>

      {topGap && (
        <Card className="top-gap-banner">
          <div>
            <Badge tone="red" dot>
              Biggest gap
            </Badge>
            <h3>
              {topGap.skill_name} for {topGap.role_name}
            </h3>
            <p>
              {topGap.students_missing} of {topGap.students_with_role} students are missing this {topGap.importance} skill or are
              below the expected level {topGap.required_proficiency}/5. That is a {topGap.gap_percent}% gap rate.
            </p>
          </div>
          <ProgressBar value={topGap.gap_percent} tone="red" size="md" label="Gap rate" />
        </Card>
      )}

      <Card>
        <div className="tracker-toolbar">
          <div className="search-box grow">
            <Search size={18} />
            <Input
              type="search"
              placeholder="Search skill or role…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Search skill-gap trends"
            />
          </div>
          <div className="table-filter-row">
            <FormField label="Target role" htmlFor="gap-role-filter">
              <Select
                id="gap-role-filter"
                value={role}
                onChange={(event) => setRole(event.target.value)}
              >
                <option value="">All target roles</option>
                {roles.map((item) => (
                  <option key={item.role_name} value={item.role_name}>
                    {item.role_name} ({item.students})
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Importance" htmlFor="gap-importance-filter">
              <Select id="gap-importance-filter" value={filter} onChange={(event) => setFilter(event.target.value)}>
                {FILTERS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>
        </div>
        {(role || filter !== 'all' || search) && (
          <div className="active-filters">
            <span>Filtered by:</span>
            {role && <span className="filter-chip static">{role}</span>}
            {filter !== 'all' && <span className="filter-chip static">{titleCase(filter)}</span>}
            {search && <span className="filter-chip static">Search: {search}</span>}
            <button
              type="button"
              className="clear-all"
              onClick={() => {
                setRole('');
                setFilter('all');
                setSearch('');
              }}
            >
              Clear all
            </button>
          </div>
        )}
      </Card>

      {roles.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No target roles configured yet"
          description="Skill-gap trends appear once students set a target role and add confirmed skills."
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No skills match those filters"
          description="Try another role, importance level or search term."
          action={
            <button
              type="button"
              className="btn btn-secondary btn-md"
              onClick={() => {
                setRole('');
                setFilter('all');
                setSearch('');
              }}
            >
              Clear filters
            </button>
          }
        />
      ) : (
        <Card className="table-card">
          <CardHeader
            title="Skill-gap trends"
            description="Ordered by the number of students missing the skill. Gap rate compares confirmed skills with the expected level."
            action={<Badge tone="slate">{filtered.length} rows</Badge>}
          />
          <div className="table-wrap">
            <table className="data-table admin-table">
              <thead>
                <tr>
                  <th>Skill</th>
                  <th>Target role</th>
                  <th>Importance</th>
                  <th>Expected level</th>
                  <th>Students</th>
                  <th>Missing</th>
                  <th>Gap rate</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((trend, index) => (
                  <tr key={`${trend.role_name}-${trend.skill_name}-${index}`}>
                    <td>
                      <strong>{trend.skill_name}</strong>
                    </td>
                    <td>{trend.role_name}</td>
                    <td>
                      <Badge tone={trend.importance === 'required' ? 'indigo' : 'slate'}>{trend.importance}</Badge>
                    </td>
                    <td>{trend.required_proficiency}/5</td>
                    <td>{trend.students_with_role}</td>
                    <td>
                      <Badge tone={trend.students_missing ? 'red' : 'green'}>{trend.students_missing}</Badge>
                    </td>
                    <td className="gap-rate-cell">
                      <div className="gap-rate">
                        <ProgressBar
                          value={trend.gap_percent}
                          tone={trend.gap_percent >= 60 ? 'red' : trend.gap_percent >= 30 ? 'amber' : 'green'}
                          size="sm"
                        />
                        <strong>{trend.gap_percent}%</strong>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Card>
        <CardHeader title="Roles represented" description="Students grouped by the target role on their profile." action={<ArrowUpRight size={18} className="card-head-icon" />} />
        {roles.length === 0 ? (
          <p className="muted small">No target roles yet.</p>
        ) : (
          <div className="role-summary-grid">
            {roles.map((item) => (
              <button
                type="button"
                key={item.role_name}
                className={`role-summary-card ${role === item.role_name ? 'active' : ''}`}
                onClick={() => setRole(role === item.role_name ? '' : item.role_name)}
              >
                <span className="role-summary-icon">
                  <Users size={16} />
                </span>
                <span>
                  <strong>{item.role_name}</strong>
                  <small>{item.students} student{item.students === 1 ? '' : 's'}</small>
                </span>
              </button>
            ))}
          </div>
        )}
      </Card>

      <p className="page-footnote">
        <Info size={15} />
        <span>
          Gap counts only include active students with a target role and confirmed skills. Preferred skills never block
          eligibility, so treat them as enrichment rather than mandatory training.
        </span>
      </p>
    </div>
  );
}

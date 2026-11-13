import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  BookOpen,
  Briefcase,
  CheckCircle2,
  GraduationCap,
  Search,
  ShieldCheck,
  UserRound,
  Users,
  UserX,
} from 'lucide-react';
import { api, errorMessage } from '../../api/client.js';
import { useApi, useDebounced } from '../../hooks/useApi.js';
import { useToast } from '../../context/ToastContext.jsx';
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardHeader,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  FormField,
  Input,
  Loader,
  Notice,
  PageHeader,
  Pagination,
  ProgressBar,
  Select,
  StatCard,
} from '../../components/ui.jsx';
import { formatDate, titleCase } from '../../utils/format.js';

export default function AdminStudents() {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounced(search, 350);
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [pendingToggle, setPendingToggle] = useState(null);
  const [toggleBusy, setToggleBusy] = useState(false);

  const query = api.query({ search: debouncedSearch, status, page, limit: 10 });
  const { data, pagination, loading, error, reload } = useApi(`/admin/students${query}`);

  const students = data || [];
  const summary = useMemo(() => {
    const active = students.filter((student) => student.is_active).length;
    const withTarget = students.filter((student) => student.target_role).length;
    const withResume = students.filter((student) => student.resumes_count > 0).length;
    return { active, withTarget, withResume };
  }, [students]);

  const updateFilters = (setter) => (event) => {
    setter(event.target.value);
    setPage(1);
  };

  const toggleStatus = async () => {
    if (!pendingToggle) return;
    setToggleBusy(true);
    try {
      await api.patch(`/admin/students/${pendingToggle.id}/status`, { is_active: !pendingToggle.is_active });
      toast.success(pendingToggle.is_active ? 'Student account deactivated.' : 'Student account activated.');
      setPendingToggle(null);
      await reload({ quiet: true });
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setToggleBusy(false);
    }
  };

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Placement cell"
        title="Students and readiness"
        description="Review student profiles, skills, applications and preparation progress. Deactivating an account blocks sign-in but keeps its records."
        actions={
          <Button variant="secondary" to="/admin" icon={ArrowUpRight}>
            Admin overview
          </Button>
        }
      />

      <Notice tone="info" icon={ShieldCheck}>
        Skills are self-reported by students for preparation planning. They are not verified credentials or test scores.
      </Notice>

      <div className="stats-grid four">
        <StatCard icon={Users} label="Students listed" value={pagination?.total ?? students.length} meta="Matching the current filters" tone="indigo" />
        <StatCard icon={CheckCircle2} label="Active on this page" value={summary.active} meta={`${students.length - summary.active} inactive on this page`} tone="green" />
        <StatCard icon={UserRound} label="With a target role" value={summary.withTarget} meta="Readiness analysis unlocked" tone="violet" />
        <StatCard icon={BookOpen} label="With a resume" value={summary.withResume} meta="At least one extraction record" tone="amber" />
      </div>

      <Card>
        <div className="tracker-toolbar">
          <div className="search-box grow">
            <Search size={18} />
            <Input
              type="search"
              placeholder="Search name, email, college or branch…"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              aria-label="Search students"
            />
          </div>
          <div className="table-filter-row">
            <FormField label="Account status" htmlFor="student-status-filter">
              <Select id="student-status-filter" value={status} onChange={updateFilters(setStatus)}>
                <option value="">All accounts</option>
                <option value="active">Active only</option>
                <option value="inactive">Inactive only</option>
              </Select>
            </FormField>
            {(search || status) && (
              <Button
                variant="ghost"
                onClick={() => {
                  setSearch('');
                  setStatus('');
                  setPage(1);
                }}
              >
                Clear filters
              </Button>
            )}
          </div>
        </div>
      </Card>

      {loading ? (
        <Loader label="Loading student accounts…" />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : students.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No students match those filters"
          description="Try a different name, college or account status. New student registrations appear here automatically."
          action={
            <Button
              variant="secondary"
              onClick={() => {
                setSearch('');
                setStatus('');
              }}
            >
              Clear filters
            </Button>
          }
        />
      ) : (
        <Card className="table-card">
          <CardHeader
            title="Student accounts"
            description={`${pagination?.total ?? students.length} matching accounts · newest registrations first.`}
            action={<Badge tone="slate">{students.length} on this page</Badge>}
          />
          <div className="table-wrap">
            <table className="data-table admin-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Academics</th>
                  <th>Target role</th>
                  <th>Preparation</th>
                  <th>Activity</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.id}>
                    <td>
                      <div className="person-cell">
                        <Avatar name={student.name} size="sm" tone="indigo" />
                        <div>
                          <Link to={`/admin/students/${student.id}`} className="table-link">
                            {student.name}
                          </Link>
                          <span>{student.email}</span>
                          <small>Joined {formatDate(student.created_at)}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <strong>{student.college || 'College not added'}</strong>
                      <div className="cell-sub">
                        {[student.branch, student.graduation_year].filter(Boolean).join(' · ') || 'Branch not added'}
                      </div>
                      <div className="cell-sub">CGPA {student.cgpa ?? '—'}</div>
                    </td>
                    <td>{student.target_role || <span className="muted">Not set</span>}</td>
                    <td>
                      <div className="prep-cell">
                        <div className="prep-cell-head">
                          <strong>{student.preparation_percent}%</strong>
                          <span>{student.topics_completed} topics</span>
                        </div>
                        <ProgressBar
                          value={student.preparation_percent}
                          tone={student.preparation_percent >= 70 ? 'green' : student.preparation_percent >= 40 ? 'amber' : 'red'}
                          size="sm"
                        />
                      </div>
                    </td>
                    <td>
                      <div className="activity-counts">
                        <span>
                          <Briefcase size={13} /> {student.skills_count} skills
                        </span>
                        <span>
                          <GraduationCap size={13} /> {student.applications_count} applications
                        </span>
                        <span>{student.resumes_count} resume records</span>
                      </div>
                    </td>
                    <td>
                      <Badge tone={student.is_active ? 'green' : 'slate'} dot>
                        {student.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td>
                      <div className="table-actions">
                        <Button size="sm" variant="ghost" to={`/admin/students/${student.id}`}>
                          View
                        </Button>
                        <button
                          type="button"
                          className={`icon-btn ${student.is_active ? 'danger' : ''}`}
                          onClick={() => setPendingToggle(student)}
                          title={student.is_active ? 'Deactivate account' : 'Activate account'}
                          aria-label={student.is_active ? `Deactivate ${student.name}` : `Activate ${student.name}`}
                        >
                          {student.is_active ? <UserX size={16} /> : <CheckCircle2 size={16} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination pagination={pagination} onPageChange={setPage} />
        </Card>
      )}

      <ConfirmDialog
        open={Boolean(pendingToggle)}
        onClose={() => setPendingToggle(null)}
        onConfirm={toggleStatus}
        title={pendingToggle?.is_active ? 'Deactivate this student account?' : 'Activate this student account?'}
        description={
          pendingToggle?.is_active
            ? `${pendingToggle?.name} will be signed out and blocked from signing in. Their profile, applications and progress stay stored.`
            : `${pendingToggle?.name} will be able to sign in again with their existing password.`
        }
        confirmLabel={pendingToggle?.is_active ? 'Deactivate account' : 'Activate account'}
        tone={pendingToggle?.is_active ? 'danger' : 'primary'}
        loading={toggleBusy}
      />

      <p className="page-footnote">
        <ShieldCheck size={15} />
        <span>
          Only student accounts are listed here. Administrator accounts are managed separately and cannot be deactivated
          from this screen.
        </span>
      </p>
    </div>
  );
}

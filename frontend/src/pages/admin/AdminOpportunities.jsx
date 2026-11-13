import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  Briefcase,
  CalendarClock,
  CheckCircle2,
  Eye,
  Pencil,
  Plus,
  Search,
  Trash2,
  Users,
} from 'lucide-react';
import { api, errorMessage } from '../../api/client.js';
import { useApi, useDebounced } from '../../hooks/useApi.js';
import { useToast } from '../../context/ToastContext.jsx';
import {
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
  Select,
  StatCard,
} from '../../components/ui.jsx';
import { OPPORTUNITY_TYPES } from '../../utils/constants.js';
import { deadlineLabel, formatDate, titleCase } from '../../utils/format.js';

export default function AdminOpportunities() {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounced(search, 350);
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const [page, setPage] = useState(1);
  const [toDelete, setToDelete] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const query = api.query({ search: debouncedSearch, status, type, page, limit: 10 });
  const { data, pagination, loading, error, reload } = useApi(`/admin/opportunities${query}`);

  const opportunities = data || [];
  const openCount = opportunities.filter((opportunity) => opportunity.is_active && !opportunity.is_expired).length;
  const expiredCount = opportunities.filter((opportunity) => opportunity.is_expired).length;
  const applicationCount = opportunities.reduce((sum, opportunity) => sum + Number(opportunity.application_count || 0), 0);

  const setFilter = (setter) => (event) => {
    setter(event.target.value);
    setPage(1);
  };

  const deleteOpportunity = async () => {
    if (!toDelete) return;
    setDeleteBusy(true);
    try {
      await api.delete(`/admin/opportunities/${toDelete.id}`);
      toast.success('Opportunity deleted.');
      setToDelete(null);
      await reload({ quiet: true });
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Placement cell"
        title="Manage the opportunity catalogue"
        description="Create, edit and retire sample opportunities. Changes recalculate student eligibility immediately because it is evaluated live on every request."
        actions={
          <>
            <Button variant="secondary" to="/admin" icon={Briefcase}>
              Admin overview
            </Button>
            <Button to="/admin/opportunities/new" icon={Plus}>
              New opportunity
            </Button>
          </>
        }
      />

      <Notice tone="warning" icon={AlertTriangle}>
        Seeded opportunities use fictional companies and are clearly labelled sample data. Do not present them as verified live
        openings. Deleting an opportunity also removes its applications and bookmarks.
      </Notice>

      <div className="stats-grid four">
        <StatCard icon={Briefcase} label="Opportunities listed" value={pagination?.total ?? opportunities.length} meta="Matching the current filters" tone="indigo" />
        <StatCard icon={CheckCircle2} label="Open on this page" value={openCount} meta={`${expiredCount} past their deadline`} tone="green" />
        <StatCard icon={Users} label="Applications" value={applicationCount} meta="Across opportunities on this page" tone="blue" />
        <StatCard icon={Eye} label="Hidden roles" value={opportunities.filter((opportunity) => !opportunity.is_active).length} meta="Inactive roles are hidden from students" tone="amber" />
      </div>

      <Card>
        <div className="tracker-toolbar">
          <div className="search-box grow">
            <Search size={18} />
            <Input
              type="search"
              placeholder="Search role title or company…"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              aria-label="Search opportunities"
            />
          </div>
          <div className="table-filter-row">
            <FormField label="Visibility" htmlFor="opp-status-filter">
              <Select id="opp-status-filter" value={status} onChange={setFilter(setStatus)}>
                <option value="">All roles</option>
                <option value="active">Active only</option>
                <option value="inactive">Inactive only</option>
              </Select>
            </FormField>
            <FormField label="Type" htmlFor="opp-type-filter">
              <Select id="opp-type-filter" value={type} onChange={setFilter(setType)}>
                <option value="">All types</option>
                {OPPORTUNITY_TYPES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </FormField>
            {(search || status || type) && (
              <Button
                variant="ghost"
                onClick={() => {
                  setSearch('');
                  setStatus('');
                  setType('');
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
        <Loader label="Loading the opportunity catalogue…" />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : opportunities.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No opportunities match those filters"
          description="Create a new sample opportunity or clear the filters to see the full catalogue."
          action={
            <div className="empty-action-row">
              <Button to="/admin/opportunities/new" icon={Plus}>
                New opportunity
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setSearch('');
                  setStatus('');
                  setType('');
                }}
              >
                Clear filters
              </Button>
            </div>
          }
        />
      ) : (
        <Card className="table-card">
          <CardHeader
            title="Opportunity catalogue"
            description={`${pagination?.total ?? opportunities.length} roles · newest added first.`}
            action={<Badge tone="amber">Sample data</Badge>}
          />
          <div className="table-wrap">
            <table className="data-table admin-table">
              <thead>
                <tr>
                  <th>Role</th>
                  <th>Type</th>
                  <th>Requirements</th>
                  <th>Deadline</th>
                  <th>Applications</th>
                  <th>Visibility</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {opportunities.map((opportunity) => {
                  const applications = Number(opportunity.application_count || 0);
                  return (
                    <tr key={opportunity.id}>
                      <td>
                        <div className="table-title-cell">
                          <Link to={`/admin/opportunities/${opportunity.id}/edit`} className="table-link">
                            {opportunity.title}
                          </Link>
                          <span>{opportunity.company}</span>
                          <div className="opportunity-badges">
                            {opportunity.is_sample && <Badge tone="amber">Sample</Badge>}
                            {opportunity.is_expired && <Badge tone="red">Expired</Badge>}
                          </div>
                        </div>
                      </td>
                      <td>
                        <Badge tone={opportunity.type === 'internship' ? 'indigo' : opportunity.type === 'placement' ? 'violet' : 'blue'}>
                          {titleCase(opportunity.type)}
                        </Badge>
                        <div className="cell-sub">{titleCase(opportunity.work_mode)}</div>
                        <div className="cell-sub">{opportunity.location}</div>
                      </td>
                      <td>
                        <div className="cell-sub">Min CGPA {opportunity.min_cgpa ?? 'Any'}</div>
                        <div className="cell-sub">
                          {opportunity.branches.length ? opportunity.branches.join(', ') : 'All branches'}
                        </div>
                        <div className="cell-sub">{opportunity.skills.length} skill requirements</div>
                      </td>
                      <td>
                        <strong className={opportunity.is_expired ? 'text-danger' : ''}>{formatDate(opportunity.application_deadline)}</strong>
                        <div className="cell-sub">{deadlineLabel(opportunity.application_deadline)}</div>
                      </td>
                      <td>
                        <span className="count-pill">
                          <Users size={13} /> {applications}
                        </span>
                      </td>
                      <td>
                        <Badge tone={opportunity.is_active ? 'green' : 'slate'} dot>
                          {opportunity.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td>
                        <div className="table-actions">
                          <Link to={`/admin/opportunities/${opportunity.id}/edit`} className="icon-btn" aria-label={`Edit ${opportunity.title}`} title="Edit">
                            <Pencil size={16} />
                          </Link>
                          <Link
                            to={`/opportunities/${opportunity.id}`}
                            className="icon-btn"
                            aria-label={`Preview ${opportunity.title}`}
                            title="Preview as it appears to students"
                          >
                            <Eye size={16} />
                          </Link>
                          <button
                            type="button"
                            className="icon-btn danger"
                            onClick={() => setToDelete(opportunity)}
                            aria-label={`Delete ${opportunity.title}`}
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination pagination={pagination} onPageChange={setPage} />
        </Card>
      )}

      <p className="page-footnote">
        <CalendarClock size={15} />
        <span>
          Expired roles stay visible to admins but are hidden from students. Keep deadlines realistic so in-app reminders remain
          useful.
        </span>
      </p>

      <ConfirmDialog
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        onConfirm={deleteOpportunity}
        title="Delete this opportunity?"
        description={
          toDelete
            ? `${toDelete.title} at ${toDelete.company} will be permanently removed, along with its applications, bookmarks and skill requirements. This cannot be undone.`
            : undefined
        }
        confirmLabel="Delete opportunity"
        loading={deleteBusy}
      />
    </div>
  );
}

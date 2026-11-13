import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Briefcase,
  CalendarClock,
  CalendarDays,
  ClipboardList,
  Download,
  ExternalLink,
  Plus,
  Search,
  Trash2,
  Trophy,
  Video,
} from 'lucide-react';
import { api, errorMessage } from '../api/client.js';
import { useApi } from '../hooks/useApi.js';
import { useToast } from '../context/ToastContext.jsx';
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
  Modal,
  Notice,
  PageHeader,
  Select,
  StatCard,
  Textarea,
} from '../components/ui.jsx';
import TrackApplicationModal from '../components/TrackApplicationModal.jsx';
import { APPLICATION_STATUSES, STATUS_LABELS } from '../utils/constants.js';
import { deadlineLabel, formatDate, formatDateTime, timeAgo, titleCase, toDateTimeLocal, todayISO } from '../utils/format.js';

const TONES = Object.fromEntries(APPLICATION_STATUSES.map((status) => [status.value, status.tone]));

const emptyNewForm = {
  opportunity_id: '',
  status: 'interested',
  applied_date: '',
  assessment_date: '',
  interview_date: '',
  notes: '',
};

export default function Applications() {
  const toast = useToast();
  const applications = useApi('/applications');
  const upcoming = useApi('/applications/upcoming');
  const opportunities = useApi('/opportunities?limit=50&sort=deadline_asc');
  const [edit, setEdit] = useState(null);
  const [newOpen, setNewOpen] = useState(false);
  const [newForm, setNewForm] = useState(emptyNewForm);
  const [newSaving, setNewSaving] = useState(false);
  const [newError, setNewError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [updatingId, setUpdatingId] = useState(null);

  const list = applications.data || [];
  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return list;
    return list.filter((application) =>
      [application.opportunity.title, application.opportunity.company, application.notes]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(needle),
    );
  }, [list, search]);

  const columns = useMemo(
    () =>
      APPLICATION_STATUSES.map((status) => ({
        ...status,
        applications: filtered.filter((application) => application.status === status.value),
      })),
    [filtered],
  );

  const counts = useMemo(() => {
    const total = list.length;
    const inProgress = list.filter((application) => ['applied', 'assessment', 'interview'].includes(application.status)).length;
    const interviews = list.filter((application) => application.status === 'interview').length;
    const selected = list.filter((application) => application.status === 'selected').length;
    return { total, inProgress, interviews, selected };
  }, [list]);

  const refreshAll = () => {
    applications.reload({ quiet: true });
    upcoming.reload({ quiet: true });
  };

  const changeStatus = async (application, status) => {
    setUpdatingId(application.id);
    try {
      await api.put(`/applications/${application.id}`, { status });
      toast.success(`Moved to ${STATUS_LABELS[status]}.`);
      refreshAll();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setUpdatingId(null);
    }
  };

  const createApplication = async (event) => {
    event.preventDefault();
    if (!newForm.opportunity_id) {
      setNewError('Choose an opportunity to track.');
      return;
    }
    setNewSaving(true);
    setNewError('');
    try {
      await api.post('/applications', {
        opportunity_id: Number(newForm.opportunity_id),
        status: newForm.status,
        applied_date: newForm.applied_date || null,
        assessment_date: newForm.assessment_date || null,
        interview_date: newForm.interview_date || null,
        notes: newForm.notes.trim(),
      });
      toast.success('Application added to your tracker.');
      setNewOpen(false);
      setNewForm(emptyNewForm);
      refreshAll();
    } catch (err) {
      setNewError(errorMessage(err));
    } finally {
      setNewSaving(false);
    }
  };

  const deleteApplication = async () => {
    if (!confirmDelete) return;
    setDeleteBusy(true);
    try {
      await api.delete(`/applications/${confirmDelete.id}`);
      toast.success('Application removed from your tracker.');
      setConfirmDelete(null);
      refreshAll();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setDeleteBusy(false);
    }
  };

  const exportCsv = () => {
    if (list.length === 0) {
      toast.warning('There is nothing to export yet.');
      return;
    }
    const rows = [
      ['Role', 'Company', 'Status', 'Applied date', 'Assessment', 'Interview', 'Deadline', 'Notes'],
      ...list.map((application) => [
        application.opportunity.title,
        application.opportunity.company,
        STATUS_LABELS[application.status],
        application.applied_date || '',
        application.assessment_date ? formatDateTime(application.assessment_date) : '',
        application.interview_date ? formatDateTime(application.interview_date) : '',
        application.opportunity.application_deadline || '',
        application.notes || '',
      ]),
    ];
    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `application-tracker-${todayISO()}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success('Tracker exported as CSV.');
  };

  if (applications.loading) return <Loader label="Loading your application tracker…" />;
  if (applications.error) return <ErrorState message={applications.error} onRetry={applications.reload} />;

  const events = upcoming.data || [];

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Application tracker"
        title="Every application, every stage, one board"
        description="Track interest, submissions, assessments, interviews and outcomes. Reminders are shown in-app only; email and SMS are not configured."
        actions={
          <>
            <Button variant="secondary" icon={Download} onClick={exportCsv}>
              Export CSV
            </Button>
            <Button icon={Plus} onClick={() => { setNewForm(emptyNewForm); setNewError(''); setNewOpen(true); }}>
              Add application
            </Button>
          </>
        }
      />

      <div className="stats-grid four">
        <StatCard icon={ClipboardList} label="Total applications" value={counts.total} meta="Everything in your tracker" tone="indigo" />
        <StatCard icon={Briefcase} label="In progress" value={counts.inProgress} meta="Applied, assessment or interview" tone="blue" />
        <StatCard icon={Video} label="Interviews" value={counts.interviews} meta="Currently at interview stage" tone="amber" />
        <StatCard icon={Trophy} label="Offers" value={counts.selected} meta="Selected or offered" tone="green" />
      </div>

      <Card>
        <CardHeader
          title="Coming up"
          description="Assessment, interview and saved deadline reminders for the next 30 days."
          action={<Badge tone="slate">{events.length} events</Badge>}
        />
        {events.length === 0 ? (
          <p className="muted small">No assessment, interview or saved deadline in the next 30 days. Add dates to an application to see reminders here.</p>
        ) : (
          <div className="event-strip">
            {events.map((event, index) => (
              <Link to={event.link} key={`${event.title}-${index}`} className={`event-card ${event.event_type}`}>
                <span className="event-card-icon">
                  {event.event_type === 'deadline' ? <CalendarClock size={18} /> : event.event_type === 'interview' ? <Video size={18} /> : <CalendarDays size={18} />}
                </span>
                <div>
                  <strong>{event.title}</strong>
                  <span>{event.company}</span>
                  <small>{formatDateTime(event.event_at)}</small>
                </div>
                <ArrowRight size={15} />
              </Link>
            ))}
          </div>
        )}
        <Notice tone="info" icon={CalendarDays} className="mt-3">
          These are in-app reminders only. No email or SMS provider is configured, so nothing is sent outside this dashboard.
        </Notice>
      </Card>

      <Card className="tracker-toolbar-card">
        <div className="tracker-toolbar">
          <div className="search-box grow">
            <Search size={18} />
            <Input
              type="search"
              placeholder="Search role, company or notes…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Search applications"
            />
          </div>
          <div className="tracker-legend">
            {APPLICATION_STATUSES.map((status) => (
              <span key={status.value} className="legend-item">
                <span className={`legend-dot tone-${status.tone}`} />
                {status.label} <strong>{list.filter((application) => application.status === status.value).length}</strong>
              </span>
            ))}
          </div>
        </div>
      </Card>

      {list.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Your application tracker is empty"
          description="Add an opportunity to start tracking stages, dates and reminders. You can also save interest from any opportunity card."
          action={
            <div className="empty-action-row">
              <Button to="/opportunities" icon={Briefcase}>
                Browse opportunities
              </Button>
              <Button variant="secondary" onClick={() => setNewOpen(true)} icon={Plus}>
                Add manually
              </Button>
            </div>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No applications match your search"
          description="Try a different company, role or note keyword."
          action={<Button variant="secondary" onClick={() => setSearch('')}>Clear search</Button>}
        />
      ) : (
        <div className="kanban">
          {columns.map((column) => (
            <section className="kanban-column" key={column.value}>
              <header className="kanban-head">
                <span className={`kanban-dot tone-${column.tone}`} />
                <strong>{column.label}</strong>
                <Badge tone={column.tone}>{column.applications.length}</Badge>
              </header>
              <div className="kanban-body">
                {column.applications.length === 0 ? (
                  <p className="kanban-empty">{column.hint}</p>
                ) : (
                  column.applications.map((application) => (
                    <article className="application-card" key={application.id}>
                      <div className="application-card-top">
                        <span className="application-logo">{application.opportunity.company.slice(0, 2).toUpperCase()}</span>
                        <div>
                          <Link to={`/opportunities/${application.opportunity.id}`} className="application-title">
                            {application.opportunity.title}
                          </Link>
                          <span>{application.opportunity.company}</span>
                        </div>
                        <button
                          type="button"
                          className="icon-btn danger"
                          aria-label={`Delete application for ${application.opportunity.title}`}
                          onClick={() => setConfirmDelete(application)}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                      <div className="application-meta">
                        <Badge tone="slate">{application.opportunity.type}</Badge>
                        <Badge tone="slate">{application.opportunity.work_mode}</Badge>
                        {application.opportunity.is_sample && <Badge tone="amber">Sample</Badge>}
                      </div>
                      <div className="application-dates">
                        <span>
                          <CalendarClock size={13} /> Deadline {application.opportunity.application_deadline ? deadlineLabel(application.opportunity.application_deadline) : '—'}
                        </span>
                        {application.assessment_date && <span>Assessment {formatDateTime(application.assessment_date)}</span>}
                        {application.interview_date && <span>Interview {formatDateTime(application.interview_date)}</span>}
                      </div>
                      {application.notes && <p className="application-notes">{application.notes}</p>}
                      <div className="application-actions">
                        <Select
                          value={application.status}
                          onChange={(event) => changeStatus(application, event.target.value)}
                          disabled={updatingId === application.id}
                          aria-label={`Status for ${application.opportunity.title}`}
                          className="status-select"
                        >
                          {APPLICATION_STATUSES.map((status) => (
                            <option key={status.value} value={status.value}>
                              {status.label}
                            </option>
                          ))}
                        </Select>
                        <Button variant="ghost" size="sm" onClick={() => setEdit(application)}>
                          Edit details
                        </Button>
                      </div>
                      <span className="application-updated">Updated {timeAgo(application.updated_at)}</span>
                    </article>
                  ))
                )}
              </div>
            </section>
          ))}
        </div>
      )}

      {edit && (
        <TrackApplicationModal
          open={Boolean(edit)}
          onClose={() => setEdit(null)}
          opportunity={edit.opportunity}
          existing={edit}
          onSaved={refreshAll}
        />
      )}

      <Modal
        open={newOpen}
        onClose={() => setNewOpen(false)}
        title="Add an application"
        description="Choose an opportunity from the active sample roles or any role you have already bookmarked."
        footer={
          <>
            <Button variant="ghost" onClick={() => setNewOpen(false)} disabled={newSaving}>
              Cancel
            </Button>
            <Button type="submit" form="new-application-form" loading={newSaving}>
              Add to tracker
            </Button>
          </>
        }
      >
        <form id="new-application-form" className="form-stack" onSubmit={createApplication}>
          {newError && <div className="inline-error">{newError}</div>}
          <FormField label="Opportunity" required hint="Only active opportunities with open deadlines are listed.">
            <Select
              value={newForm.opportunity_id}
              onChange={(event) => setNewForm((current) => ({ ...current, opportunity_id: event.target.value }))}
              required
            >
              <option value="">Choose an opportunity</option>
              {(opportunities.data || []).map((opportunity) => (
                <option key={opportunity.id} value={opportunity.id}>
                  {opportunity.title} · {opportunity.company}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Status" required>
            <Select value={newForm.status} onChange={(event) => setNewForm((current) => ({ ...current, status: event.target.value }))}>
              {APPLICATION_STATUSES.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </Select>
          </FormField>
          <div className="form-grid two">
            <FormField label="Applied on">
              <Input type="date" max={todayISO()} value={newForm.applied_date} onChange={(event) => setNewForm((current) => ({ ...current, applied_date: event.target.value }))} />
            </FormField>
            <FormField label="Assessment date & time">
              <Input type="datetime-local" value={newForm.assessment_date} onChange={(event) => setNewForm((current) => ({ ...current, assessment_date: event.target.value }))} />
            </FormField>
          </div>
          <FormField label="Interview date & time">
            <Input type="datetime-local" value={newForm.interview_date} onChange={(event) => setNewForm((current) => ({ ...current, interview_date: event.target.value }))} />
          </FormField>
          <FormField label="Notes">
            <Textarea rows={3} maxLength={2000} value={newForm.notes} onChange={(event) => setNewForm((current) => ({ ...current, notes: event.target.value }))} />
          </FormField>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
        onConfirm={deleteApplication}
        title="Remove this application?"
        description="The tracker record, dates and notes will be deleted. The opportunity itself is not affected."
        confirmLabel="Remove application"
        loading={deleteBusy}
      />
    </div>
  );
}

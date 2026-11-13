import { useMemo, useState } from 'react';
import {
  BookOpen,
  Code2,
  ExternalLink,
  FileText,
  Info,
  Library,
  Link2,
  Newspaper,
  Pencil,
  Plus,
  Search,
  Trash2,
  Video,
} from 'lucide-react';
import { api, errorMessage } from '../../api/client.js';
import { useApi } from '../../hooks/useApi.js';
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
  Modal,
  Notice,
  PageHeader,
  Select,
  StatCard,
} from '../../components/ui.jsx';
import { titleCase } from '../../utils/format.js';

const RESOURCE_TYPES = [
  { value: 'docs', label: 'Documentation', icon: FileText },
  { value: 'course', label: 'Course', icon: BookOpen },
  { value: 'video', label: 'Video', icon: Video },
  { value: 'practice', label: 'Practice', icon: Code2 },
  { value: 'article', label: 'Article', icon: Newspaper },
];

const TYPE_META = Object.fromEntries(RESOURCE_TYPES.map((type) => [type.value, type]));

function emptyForm() {
  return {
    title: '',
    url: '',
    provider: '',
    resource_type: 'article',
    is_free: true,
    topic_id: '',
  };
}

function formFromResource(resource) {
  return {
    title: resource.title || '',
    url: resource.url || '',
    provider: resource.provider || '',
    resource_type: resource.resource_type || 'article',
    is_free: Boolean(resource.is_free),
    topic_id: resource.topic_id ? String(resource.topic_id) : '',
  };
}

function validate(form) {
  const errors = {};
  if (form.title.trim().length < 3) errors.title = 'Enter a title with at least 3 characters.';
  if (!form.url.trim()) {
    errors.url = 'Enter the resource URL.';
  } else {
    try {
      const parsed = new URL(form.url.trim());
      if (!['http:', 'https:'].includes(parsed.protocol)) errors.url = 'Use an http:// or https:// link.';
    } catch {
      errors.url = 'Enter a valid URL including https://.';
    }
  }
  return errors;
}

export default function AdminResources() {
  const toast = useToast();
  const { data, loading, error, reload } = useApi('/admin/resources');
  const { data: topicData } = useApi('/admin/topics');

  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [topic, setTopic] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const resources = data || [];
  const topics = topicData || [];

  const summary = useMemo(() => {
    const free = resources.filter((resource) => resource.is_free).length;
    const linked = resources.filter((resource) => resource.topic_id).length;
    const typeCount = new Set(resources.map((resource) => resource.resource_type)).size;
    return { free, linked, typeCount };
  }, [resources]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return resources.filter((resource) => {
      if (type && resource.resource_type !== type) return false;
      if (topic && String(resource.topic_id || '') !== topic) return false;
      if (!needle) return true;
      return `${resource.title} ${resource.provider || ''} ${resource.topic_title || ''}`
        .toLowerCase()
        .includes(needle);
    });
  }, [resources, search, type, topic]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setFieldErrors({});
    setFormOpen(true);
  };

  const openEdit = (resource) => {
    setEditing(resource);
    setForm(formFromResource(resource));
    setFieldErrors({});
    setFormOpen(true);
  };

  const closeForm = () => {
    if (saving) return;
    setFormOpen(false);
    setEditing(null);
    setFieldErrors({});
  };

  const update = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => (current[key] ? { ...current, [key]: undefined } : current));
  };

  const submit = async (event) => {
    event.preventDefault();
    const errors = validate(form);
    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      return;
    }
    setSaving(true);
    const payload = {
      title: form.title.trim(),
      url: form.url.trim(),
      provider: form.provider.trim(),
      resource_type: form.resource_type,
      is_free: form.is_free,
      topic_id: form.topic_id ? Number(form.topic_id) : null,
    };
    try {
      if (editing) {
        await api.put(`/admin/resources/${editing.id}`, payload);
        toast.success('Learning resource updated.');
      } else {
        await api.post('/admin/resources', payload);
        toast.success('Learning resource added.');
      }
      setFormOpen(false);
      setEditing(null);
      await reload({ quiet: true });
    } catch (err) {
      const details = err?.details;
      if (Array.isArray(details)) {
        setFieldErrors(Object.fromEntries(details.map((detail) => [detail.field, detail.message])));
      }
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!toDelete) return;
    setDeleteBusy(true);
    try {
      await api.delete(`/admin/resources/${toDelete.id}`);
      toast.success('Learning resource deleted.');
      setToDelete(null);
      await reload({ quiet: true });
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setDeleteBusy(false);
    }
  };

  const clearFilters = () => {
    setSearch('');
    setType('');
    setTopic('');
  };

  const hasFilters = Boolean(search || type || topic);

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Placement cell"
        title="Curated learning resources"
        description="Maintain the external links students see inside preparation topics. Resources open in a new tab and are not hosted by this app."
        actions={
          <>
            <Button variant="secondary" to="/admin/skill-gaps" icon={Library}>
              Skill gap trends
            </Button>
            <Button onClick={openCreate} icon={Plus}>
              Add resource
            </Button>
          </>
        }
      />

      <Notice tone="info" icon={Info}>
        These are curated links for practice and study. Being listed here is not an endorsement, and availability or pricing may
        change on the provider&apos;s site.
      </Notice>

      <div className="stats-grid four">
        <StatCard icon={Library} label="Resources" value={resources.length} meta={`${summary.typeCount} resource types in use`} tone="indigo" />
        <StatCard icon={Link2} label="Linked to topics" value={summary.linked} meta={`${resources.length - summary.linked} unlinked`} tone="blue" />
        <StatCard icon={BookOpen} label="Free resources" value={summary.free} meta={`${resources.length - summary.free} marked paid`} tone="green" />
        <StatCard icon={Search} label="Showing" value={filtered.length} meta={hasFilters ? 'Matching the current filters' : 'All resources'} tone="amber" />
      </div>

      <Card>
        <div className="tracker-toolbar">
          <div className="search-box grow">
            <Search size={18} />
            <Input
              type="search"
              placeholder="Search title, provider or topic…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Search learning resources"
            />
          </div>
          <div className="table-filter-row">
            <FormField label="Type" htmlFor="resource-type-filter">
              <Select id="resource-type-filter" value={type} onChange={(event) => setType(event.target.value)}>
                <option value="">All types</option>
                {RESOURCE_TYPES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Preparation topic" htmlFor="resource-topic-filter">
              <Select id="resource-topic-filter" value={topic} onChange={(event) => setTopic(event.target.value)}>
                <option value="">All topics</option>
                {topics.map((item) => (
                  <option key={item.id} value={String(item.id)}>
                    {item.title}
                  </option>
                ))}
              </Select>
            </FormField>
            {hasFilters && (
              <Button variant="ghost" onClick={clearFilters}>
                Clear filters
              </Button>
            )}
          </div>
        </div>
        {hasFilters && (
          <div className="active-filters">
            <span>Filtered by:</span>
            {search && <span className="filter-chip static">Search: {search}</span>}
            {type && <span className="filter-chip static">{TYPE_META[type]?.label || titleCase(type)}</span>}
            {topic && <span className="filter-chip static">{topics.find((item) => String(item.id) === topic)?.title || 'Topic'}</span>}
            <button type="button" className="clear-all" onClick={clearFilters}>
              Clear all
            </button>
          </div>
        )}
      </Card>

      {loading ? (
        <Loader label="Loading the resource library…" />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : resources.length === 0 ? (
        <EmptyState
          icon={Library}
          title="No learning resources yet"
          description="Add curated documentation, courses, videos or practice links so students have somewhere to start."
          action={
            <Button onClick={openCreate} icon={Plus}>
              Add the first resource
            </Button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No resources match those filters"
          description="Try a different type, topic or search term."
          action={
            <Button variant="secondary" onClick={clearFilters}>
              Clear filters
            </Button>
          }
        />
      ) : (
        <Card className="table-card">
          <CardHeader
            title="Resource library"
            description="Newest resources first. Link a resource to a topic so it appears in the student preparation centre."
            action={<Badge tone="slate">{filtered.length} shown</Badge>}
          />
          <div className="table-wrap">
            <table className="data-table admin-table">
              <thead>
                <tr>
                  <th>Resource</th>
                  <th>Type</th>
                  <th>Preparation topic</th>
                  <th>Access</th>
                  <th>Added</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((resource) => {
                  const meta = TYPE_META[resource.resource_type] || TYPE_META.article;
                  const Icon = meta.icon;
                  return (
                    <tr key={resource.id}>
                      <td>
                        <div className="table-title-cell">
                          <a href={resource.url} target="_blank" rel="noreferrer" className="table-link resource-title-link">
                            {resource.title} <ExternalLink size={13} />
                          </a>
                          <span>{resource.provider || 'Unknown provider'}</span>
                        </div>
                      </td>
                      <td>
                        <span className="resource-type-pill">
                          <Icon size={14} /> {meta.label}
                        </span>
                      </td>
                      <td>
                        {resource.topic_title ? (
                          <span>{resource.topic_title}</span>
                        ) : (
                          <span className="muted small">Not linked</span>
                        )}
                      </td>
                      <td>
                        <Badge tone={resource.is_free ? 'green' : 'amber'}>{resource.is_free ? 'Free' : 'Paid'}</Badge>
                      </td>
                      <td className="nowrap">{new Date(resource.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                      <td>
                        <div className="table-actions">
                          <button
                            type="button"
                            className="icon-btn"
                            onClick={() => openEdit(resource)}
                            aria-label={`Edit ${resource.title}`}
                            title="Edit"
                          >
                            <Pencil size={16} />
                          </button>
                          <a
                            href={resource.url}
                            target="_blank"
                            rel="noreferrer"
                            className="icon-btn"
                            aria-label={`Open ${resource.title}`}
                            title="Open resource"
                          >
                            <ExternalLink size={16} />
                          </a>
                          <button
                            type="button"
                            className="icon-btn danger"
                            onClick={() => setToDelete(resource)}
                            aria-label={`Delete ${resource.title}`}
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
        </Card>
      )}

      <p className="page-footnote">
        <Info size={15} />
        <span>
          Deleting a resource removes it from preparation topics immediately. Topic progress and student notes are not affected.
        </span>
      </p>

      <Modal
        open={formOpen}
        onClose={closeForm}
        title={editing ? 'Edit learning resource' : 'Add learning resource'}
        description="Links are shown inside the linked preparation topic and open in a new browser tab."
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={closeForm} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={submit} loading={saving} icon={editing ? Pencil : Plus}>
              {editing ? 'Save changes' : 'Add resource'}
            </Button>
          </>
        }
      >
        <form className="form-stack" onSubmit={submit} noValidate>
          <FormField label="Title" htmlFor="resource-title" required error={fieldErrors.title}>
            <Input
              id="resource-title"
              value={form.title}
              onChange={(event) => update('title', event.target.value)}
              placeholder="e.g. Big-O notation cheat sheet"
              maxLength={200}
              autoFocus
            />
          </FormField>
          <FormField label="URL" htmlFor="resource-url" required error={fieldErrors.url} hint="Include https:// so the link opens correctly.">
            <Input
              id="resource-url"
              type="url"
              value={form.url}
              onChange={(event) => update('url', event.target.value)}
              placeholder="https://example.com/guide"
              maxLength={500}
            />
          </FormField>
          <div className="form-grid">
            <FormField label="Provider" htmlFor="resource-provider" error={fieldErrors.provider}>
              <Input
                id="resource-provider"
                value={form.provider}
                onChange={(event) => update('provider', event.target.value)}
                placeholder="e.g. MDN Web Docs"
                maxLength={120}
              />
            </FormField>
            <FormField label="Type" htmlFor="resource-type" required error={fieldErrors.resource_type}>
              <Select id="resource-type" value={form.resource_type} onChange={(event) => update('resource_type', event.target.value)}>
                {RESOURCE_TYPES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>
          <FormField label="Preparation topic" htmlFor="resource-topic" error={fieldErrors.topic_id} hint="Optional. Leave blank for a standalone resource.">
            <Select id="resource-topic" value={form.topic_id} onChange={(event) => update('topic_id', event.target.value)}>
              <option value="">Not linked to a topic</option>
              {topics.map((item) => (
                <option key={item.id} value={String(item.id)}>
                  {item.title} · {item.category}
                </option>
              ))}
            </Select>
          </FormField>
          <label className={`checkbox-card ${form.is_free ? 'checked' : ''}`}>
            <input type="checkbox" checked={form.is_free} onChange={(event) => update('is_free', event.target.checked)} />
            <span>
              <strong>Free to access</strong>
              <small>Leave unchecked if the resource requires payment or a subscription.</small>
            </span>
          </label>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        onConfirm={remove}
        title="Delete this resource?"
        description={toDelete ? `“${toDelete.title}” will be removed from the library and any linked topic. This cannot be undone.` : undefined}
        confirmLabel="Delete resource"
        loading={deleteBusy}
      />
    </div>
  );
}

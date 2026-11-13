import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ExternalLink,
  FileText,
  NotebookPen,
  Pencil,
  Plus,
  Target,
  Trash2,
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
  ErrorState,
  FormField,
  Input,
  Loader,
  Modal,
  PageHeader,
  ProgressBar,
  Textarea,
} from '../components/ui.jsx';
import { formatDateTime, titleCase } from '../utils/format.js';

const CATEGORY_TONES = {
  DSA: 'indigo',
  Programming: 'blue',
  'Core CS': 'violet',
  Development: 'green',
  Aptitude: 'amber',
  Interviews: 'rose',
};

function renderInline(text) {
  const parts = String(text).split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) =>
    part.startsWith('**') && part.endsWith('**') ? <strong key={index}>{part.slice(2, -2)}</strong> : part,
  );
}

function MarkdownLite({ text }) {
  const lines = String(text || '').split('\n');
  const blocks = [];
  let list = [];

  const flushList = () => {
    if (list.length) {
      blocks.push(
        <ul key={`list-${blocks.length}`} className="content-list">
          {list.map((item, index) => (
            <li key={index}>{renderInline(item)}</li>
          ))}
        </ul>,
      );
      list = [];
    }
  };

  lines.forEach((raw, index) => {
    const line = raw.trim();
    if (!line) {
      flushList();
      return;
    }
    if (line.startsWith('## ')) {
      flushList();
      blocks.push(<h3 key={index}>{renderInline(line.slice(3))}</h3>);
    } else if (line.startsWith('### ')) {
      flushList();
      blocks.push(<h4 key={index}>{renderInline(line.slice(4))}</h4>);
    } else if (/^[-*]\s+/.test(line)) {
      list.push(line.replace(/^[-*]\s+/, ''));
    } else {
      flushList();
      blocks.push(<p key={index}>{renderInline(line)}</p>);
    }
  });
  flushList();
  return <div className="prose prep-content">{blocks}</div>;
}

export default function PreparationTopic() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { data: topic, loading, error, reload, setData } = useApi(`/preparation/topics/${slug}`);
  const [busyTask, setBusyTask] = useState(null);
  const [topicBusy, setTopicBusy] = useState(false);
  const [noteModal, setNoteModal] = useState(null);
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteError, setNoteError] = useState('');
  const [confirmNote, setConfirmNote] = useState(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [slug]);

  if (loading) return <Loader label="Opening preparation topic…" />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!topic) return null;

  const toggleTask = async (task) => {
    setBusyTask(task.id);
    try {
      const completed = !task.is_completed;
      await api.put(`/preparation/tasks/${task.id}/progress`, { completed });
      setData((current) => {
        const tasks = current.tasks.map((item) => (item.id === task.id ? { ...item, is_completed: completed } : item));
        const tasksCompleted = tasks.filter((item) => item.is_completed).length;
        return {
          ...current,
          tasks,
          progress: {
            tasks_total: tasks.length,
            tasks_completed: tasksCompleted,
            percent: tasks.length ? Math.round((tasksCompleted / tasks.length) * 100) : current.is_completed ? 100 : 0,
          },
        };
      });
      toast.success(completed ? 'Practice task completed.' : 'Practice task marked incomplete.');
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusyTask(null);
    }
  };

  const toggleTopic = async () => {
    setTopicBusy(true);
    try {
      const completed = !topic.is_completed;
      await api.put(`/preparation/topics/${topic.id}/progress`, { completed });
      setData((current) => ({ ...current, is_completed: completed }));
      toast.success(completed ? 'Topic marked as completed.' : 'Topic moved back to in progress.');
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setTopicBusy(false);
    }
  };

  const openNewNote = () => {
    setNoteError('');
    setNoteModal({ item: null, title: '', body: '' });
  };

  const openEditNote = (note) => {
    setNoteError('');
    setNoteModal({ item: note, title: note.title, body: note.body });
  };

  const saveNote = async (event) => {
    event.preventDefault();
    setNoteSaving(true);
    setNoteError('');
    try {
      if (noteModal.item) {
        await api.put(`/preparation/notes/${noteModal.item.id}`, { title: noteModal.title, body: noteModal.body });
        toast.success('Note updated.');
      } else {
        await api.post(`/preparation/topics/${topic.id}/notes`, { title: noteModal.title, body: noteModal.body });
        toast.success('Note saved.');
      }
      setNoteModal(null);
      await reload({ quiet: true });
    } catch (err) {
      setNoteError(errorMessage(err));
    } finally {
      setNoteSaving(false);
    }
  };

  const deleteNote = async () => {
    if (!confirmNote) return;
    setConfirmBusy(true);
    try {
      await api.delete(`/preparation/notes/${confirmNote.id}`);
      toast.success('Note deleted.');
      setConfirmNote(null);
      await reload({ quiet: true });
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setConfirmBusy(false);
    }
  };

  const resourceIcon = (type) => (type === 'video' ? Video : type === 'course' ? BookOpen : FileText);

  return (
    <div className="page-stack">
      <div className="topic-nav">
        <Link to="/preparation" className="back-link">
          <ArrowLeft size={16} /> Preparation centre
        </Link>
        <div className="topic-nav-actions">
          {topic.previous && (
            <Button variant="ghost" size="sm" icon={ChevronLeft} onClick={() => navigate(`/preparation/${topic.previous.slug}`)}>
              {topic.previous.title}
            </Button>
          )}
          {topic.next && (
            <Button variant="ghost" size="sm" onClick={() => navigate(`/preparation/${topic.next.slug}`)}>
              {topic.next.title} <ChevronRight size={15} />
            </Button>
          )}
        </div>
      </div>

      <PageHeader
        eyebrow={topic.category}
        title={topic.title}
        description={topic.description}
        actions={
          <Button
            variant={topic.is_completed ? 'secondary' : 'primary'}
            icon={CheckCircle2}
            onClick={toggleTopic}
            loading={topicBusy}
          >
            {topic.is_completed ? 'Completed — undo' : 'Mark topic complete'}
          </Button>
        }
      >
        <div className="topic-header-meta">
          <Badge tone={CATEGORY_TONES[topic.category] || 'slate'}>{topic.category}</Badge>
          <span>
            <Clock3 size={14} /> {Math.round(topic.estimated_minutes / 60)}h estimated
          </span>
          <span>
            <BookOpen size={14} /> {topic.progress.tasks_completed}/{topic.progress.tasks_total} practice tasks
          </span>
          {topic.is_completed && (
            <Badge tone="green" dot>
              Completed {topic.completed_at ? formatDateTime(topic.completed_at) : ''}
            </Badge>
          )}
        </div>
      </PageHeader>

      <div className="topic-detail-grid">
        <div className="topic-main">
          <Card>
            <CardHeader title="Study notes" description="A practical sequence to follow. Work through it actively, not passively." action={<BookOpen size={18} className="card-head-icon" />} />
            <MarkdownLite text={topic.content} />
          </Card>

          <Card>
            <CardHeader
              title="Practice tasks"
              description="Tick a task only when you can complete it unaided. Tasks drive the practical progress bar."
              action={<Badge tone="indigo">{topic.progress.percent}% done</Badge>}
            />
            <div className="task-list">
              {topic.tasks.map((task) => (
                <label className={`task-row ${task.is_completed ? 'done' : ''}`} key={task.id}>
                  <input
                    type="checkbox"
                    checked={task.is_completed}
                    onChange={() => toggleTask(task)}
                    disabled={busyTask === task.id}
                  />
                  <span className="task-check">{task.is_completed ? <CheckCircle2 size={19} /> : <span className="task-circle" />}</span>
                  <span className="task-copy">
                    <strong>{task.title}</strong>
                    {task.description && <small>{task.description}</small>}
                  </span>
                  {task.completed_at && <span className="task-date">{formatDateTime(task.completed_at)}</span>}
                </label>
              ))}
              {topic.tasks.length === 0 && <p className="muted">No practice tasks configured for this topic yet.</p>}
            </div>
            <div className="task-progress-footer">
              <ProgressBar value={topic.progress.percent} tone={topic.progress.percent === 100 ? 'green' : 'indigo'} label="Practical progress" />
            </div>
          </Card>

          <Card>
            <CardHeader title="Your notes" description="Save what you want to revisit before an interview." action={<Button size="sm" variant="secondary" icon={Plus} onClick={openNewNote}>Add note</Button>} />
            {topic.notes.length === 0 ? (
              <div className="mini-empty">
                <NotebookPen size={22} />
                <p>No notes for this topic yet. Write down the patterns you missed and the questions you want to revisit.</p>
              </div>
            ) : (
              <div className="note-list">
                {topic.notes.map((note) => (
                  <article className="note-card" key={note.id}>
                    <div className="note-head">
                      <strong>{note.title}</strong>
                      <div className="entry-actions">
                        <button type="button" className="icon-btn" onClick={() => openEditNote(note)} aria-label={`Edit ${note.title}`}>
                          <Pencil size={15} />
                        </button>
                        <button type="button" className="icon-btn danger" onClick={() => setConfirmNote(note)} aria-label={`Delete ${note.title}`}>
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                    <p>{note.body}</p>
                    <small>Updated {formatDateTime(note.updated_at)}</small>
                  </article>
                ))}
              </div>
            )}
          </Card>
        </div>

        <aside className="topic-side">
          <Card className="sticky-card">
            <CardHeader title="Topic progress" />
            <div className="topic-ring" style={{ '--topic-progress': `${Math.max(2, topic.progress.percent) * 3.6}deg` }}>
              <div>
                <strong>{topic.progress.percent}%</strong>
                <span>practical</span>
              </div>
            </div>
            <div className="side-facts">
              <div>
                <span>Practice tasks</span>
                <strong>{topic.progress.tasks_completed}/{topic.progress.tasks_total}</strong>
              </div>
              <div>
                <span>Resources</span>
                <strong>{topic.resources.length}</strong>
              </div>
              <div>
                <span>Notes</span>
                <strong>{topic.notes.length}</strong>
              </div>
              <div>
                <span>Estimated effort</span>
                <strong>{Math.round(topic.estimated_minutes / 60)} hours</strong>
              </div>
            </div>
            <Button variant="secondary" className="full-width" icon={Target} onClick={() => navigate('/skill-gap')}>
              See related skill gaps
            </Button>
          </Card>

          <Card>
            <CardHeader title="Learning resources" description="Curated external links. They open in a new tab." />
            {topic.resources.length === 0 ? (
              <p className="muted small">No resources linked yet.</p>
            ) : (
              <div className="resource-list">
                {topic.resources.map((resource) => {
                  const Icon = resourceIcon(resource.resource_type);
                  return (
                    <a key={resource.id} href={resource.url} target="_blank" rel="noreferrer" className="resource-row">
                      <span className="resource-icon">
                        <Icon size={17} />
                      </span>
                      <span>
                        <strong>{resource.title}</strong>
                        <small>
                          {resource.provider || titleCase(resource.resource_type)} · {resource.is_free ? 'Free' : 'Paid'}
                        </small>
                      </span>
                      <ExternalLink size={14} />
                    </a>
                  );
                })}
              </div>
            )}
          </Card>

          <div className="topic-pager">
            {topic.previous ? (
              <Link to={`/preparation/${topic.previous.slug}`} className="pager-link">
                <ChevronLeft size={16} />
                <span>
                  <small>Previous</small>
                  <strong>{topic.previous.title}</strong>
                </span>
              </Link>
            ) : (
              <span />
            )}
            {topic.next && (
              <Link to={`/preparation/${topic.next.slug}`} className="pager-link next">
                <span>
                  <small>Next</small>
                  <strong>{topic.next.title}</strong>
                </span>
                <ArrowRight size={16} />
              </Link>
            )}
          </div>
        </aside>
      </div>

      <Modal
        open={Boolean(noteModal)}
        onClose={() => setNoteModal(null)}
        title={noteModal?.item ? 'Edit note' : 'Add a note'}
        description="Notes are private to your account and appear alongside this topic."
        footer={
          <>
            <Button variant="ghost" onClick={() => setNoteModal(null)} disabled={noteSaving}>
              Cancel
            </Button>
            <Button type="submit" form="note-form" loading={noteSaving}>
              {noteModal?.item ? 'Save note' : 'Add note'}
            </Button>
          </>
        }
      >
        {noteModal && (
          <form id="note-form" className="form-stack" onSubmit={saveNote}>
            {noteError && <div className="inline-error">{noteError}</div>}
            <FormField label="Title" required>
              <Input
                value={noteModal.title}
                onChange={(event) => setNoteModal((current) => ({ ...current, title: event.target.value }))}
                minLength={2}
                maxLength={180}
                required
                placeholder="e.g. Sliding window patterns to revisit"
              />
            </FormField>
            <FormField label="Note" required>
              <Textarea
                rows={7}
                value={noteModal.body}
                onChange={(event) => setNoteModal((current) => ({ ...current, body: event.target.value }))}
                maxLength={5000}
                required
                placeholder="Key idea, mistake to avoid, or a question for your next revision."
              />
            </FormField>
          </form>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(confirmNote)}
        onClose={() => setConfirmNote(null)}
        onConfirm={deleteNote}
        title="Delete this note?"
        description="This note will be removed permanently from your preparation record."
        confirmLabel="Delete note"
        loading={confirmBusy}
      />
    </div>
  );
}

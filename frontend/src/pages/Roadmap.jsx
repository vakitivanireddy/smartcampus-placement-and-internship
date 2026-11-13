import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Circle,
  Clock3,
  ExternalLink,
  ListChecks,
  Map,
  Pencil,
  Plus,
  RefreshCw,
  Sparkles,
  Target,
  Trash2,
} from 'lucide-react';
import { api, errorMessage } from '../api/client.js';
import { useApi } from '../hooks/useApi.js';
import { useAuth } from '../context/AuthContext.jsx';
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
  ProgressBar,
  Select,
  Textarea,
} from '../components/ui.jsx';
import { PRIORITIES, ROLE_OPTIONS } from '../utils/constants.js';
import { daysUntil, formatDate, formatDateTime, todayISO, titleCase } from '../utils/format.js';

const emptyTask = {
  title: '',
  description: '',
  resource_url: '',
  priority: 'medium',
  target_date: todayISO(),
};

function TaskRow({ task, onToggle, onEdit, onDelete, busy }) {
  return (
    <div className={`roadmap-task ${task.is_completed ? 'done' : ''} ${task.is_overdue ? 'overdue' : ''}`}>
      <button
        type="button"
        className="task-check-button"
        onClick={() => onToggle(task)}
        disabled={busy}
        aria-label={task.is_completed ? `Mark ${task.title} incomplete` : `Complete ${task.title}`}
      >
        {task.is_completed ? <CheckCircle2 size={22} /> : <Circle size={22} />}
      </button>
      <div className="roadmap-task-copy">
        <div className="roadmap-task-title">
          <strong>{task.title}</strong>
          {task.is_overdue && <Badge tone="red">Overdue</Badge>}
          {task.is_completed && <Badge tone="green">Done</Badge>}
        </div>
        {task.description && <p>{task.description}</p>}
        <div className="roadmap-task-meta">
          <span>
            <CalendarDays size={13} /> {formatDate(task.target_date)}
          </span>
          {task.skill_name && <Badge tone="slate">{task.skill_name}</Badge>}
          <Badge tone={task.priority === 'high' ? 'red' : task.priority === 'medium' ? 'amber' : 'slate'}>{task.priority}</Badge>
          {task.topic_slug && (
            <Link to={`/preparation/${task.topic_slug}`} className="text-link">
              Prep topic <ArrowRight size={12} />
            </Link>
          )}
          {task.resource_url && (
            <a href={task.resource_url} target="_blank" rel="noreferrer" className="text-link">
              Resource <ExternalLink size={12} />
            </a>
          )}
        </div>
      </div>
      <div className="entry-actions">
        <button type="button" className="icon-btn" onClick={() => onEdit(task)} aria-label={`Edit ${task.title}`}>
          <Pencil size={15} />
        </button>
        <button type="button" className="icon-btn danger" onClick={() => onDelete(task)} aria-label={`Delete ${task.title}`}>
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  );
}

export default function Roadmap() {
  const { user } = useAuth();
  const toast = useToast();
  const { data: plan, meta, loading, error, reload } = useApi('/roadmap');
  const rolesApi = useApi('/skill-gap/roles');
  const [role, setRole] = useState(user?.profile?.target_role || '');
  const [useAi, setUseAi] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState('');
  const [taskModal, setTaskModal] = useState(null);
  const [taskSaving, setTaskSaving] = useState(false);
  const [taskError, setTaskError] = useState('');
  const [confirmTask, setConfirmTask] = useState(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [busyTask, setBusyTask] = useState(null);
  const [showRegenerate, setShowRegenerate] = useState(false);

  const roleOptions = useMemo(() => {
    const names = (rolesApi.data || []).map((item) => item.name).filter(Boolean);
    for (const extra of [user?.profile?.target_role, ...ROLE_OPTIONS]) {
      if (extra && !names.some((name) => name.toLowerCase() === extra.toLowerCase())) names.push(extra);
    }
    return names;
  }, [rolesApi.data, user?.profile?.target_role]);

  const groups = useMemo(() => {
    if (!plan?.tasks) return [];
    const overdue = plan.tasks.filter((task) => task.is_overdue);
    const upcoming = plan.tasks.filter((task) => !task.is_completed && !task.is_overdue);
    const completed = plan.tasks.filter((task) => task.is_completed);
    return [
      { key: 'overdue', title: 'Overdue', tasks: overdue, tone: 'red' },
      { key: 'upcoming', title: 'Upcoming', tasks: upcoming, tone: 'indigo' },
      { key: 'completed', title: 'Completed', tasks: completed, tone: 'green' },
    ].filter((group) => group.tasks.length > 0);
  }, [plan]);

  const generate = async () => {
    if (!role) {
      setGenerateError('Choose a target role before generating a roadmap.');
      return;
    }
    setGenerating(true);
    setGenerateError('');
    try {
      const response = await api.post('/roadmap/generate', { role, use_ai: Boolean(useAi) });
      toast.success(response.message || 'Roadmap generated.');
      setShowRegenerate(false);
      await reload({ quiet: true });
    } catch (err) {
      setGenerateError(errorMessage(err));
    } finally {
      setGenerating(false);
    }
  };

  const openNewTask = () => {
    setTaskError('');
    setTaskModal({ item: null, data: { ...emptyTask, target_date: todayISO() } });
  };

  const openEditTask = (task) => {
    setTaskError('');
    setTaskModal({
      item: task,
      data: {
        title: task.title || '',
        description: task.description || '',
        resource_url: task.resource_url || '',
        priority: task.priority || 'medium',
        target_date: task.target_date || todayISO(),
      },
    });
  };

  const saveTask = async (event) => {
    event.preventDefault();
    setTaskSaving(true);
    setTaskError('');
    const payload = {
      title: taskModal.data.title.trim(),
      description: taskModal.data.description.trim(),
      resource_url: taskModal.data.resource_url.trim(),
      priority: taskModal.data.priority,
      target_date: taskModal.data.target_date,
    };
    try {
      if (taskModal.item) await api.put(`/roadmap/tasks/${taskModal.item.id}`, payload);
      else await api.post('/roadmap/tasks', payload);
      toast.success(taskModal.item ? 'Roadmap task updated.' : 'Roadmap task added.');
      setTaskModal(null);
      await reload({ quiet: true });
    } catch (err) {
      setTaskError(errorMessage(err));
    } finally {
      setTaskSaving(false);
    }
  };

  const toggleTask = async (task) => {
    setBusyTask(task.id);
    try {
      await api.put(`/roadmap/tasks/${task.id}`, { is_completed: !task.is_completed });
      toast.success(task.is_completed ? 'Task reopened.' : 'Task completed. Keep going!');
      await reload({ quiet: true });
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusyTask(null);
    }
  };

  const deleteTask = async () => {
    if (!confirmTask) return;
    setConfirmBusy(true);
    try {
      await api.delete(`/roadmap/tasks/${confirmTask.id}`);
      toast.success('Roadmap task deleted.');
      setConfirmTask(null);
      await reload({ quiet: true });
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setConfirmBusy(false);
    }
  };

  if (loading) return <Loader label="Loading your study roadmap…" />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  const generatorCard = (
    <Card className="generator-card">
      <div className="generator-icon">
        <Sparkles size={28} />
      </div>
      <h2>{plan ? 'Refresh your roadmap' : 'Generate your four-week study roadmap'}</h2>
      <p>
        {plan
          ? 'Generate a new plan from your latest profile and skill gaps. The current plan remains stored, but the newest plan becomes your active roadmap.'
          : 'Turn your target-role gaps into a dated plan with editable tasks and linked preparation topics. The rule-based engine works without any paid AI provider.'}
      </p>
      {meta?.note && <p className="generator-note">{meta.note}</p>}
      <div className="generator-form">
        <FormField label="Target role" htmlFor="roadmap-role">
          <Select id="roadmap-role" value={role} onChange={(event) => setRole(event.target.value)}>
            <option value="">Choose a target role</option>
            {roleOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>
        </FormField>
        <label className={`checkbox-card ${!meta?.ai_configured ? 'disabled' : ''}`}>
          <input type="checkbox" checked={useAi} onChange={(event) => setUseAi(event.target.checked)} disabled={!meta?.ai_configured} />
          <span>
            <strong>AI-assisted plan</strong>
            <small>{meta?.ai_configured ? 'Uses the configured AI provider. Falls back to rules on failure.' : 'Not configured. The rule-based engine will be used.'}</small>
          </span>
        </label>
        <Button size="lg" icon={Sparkles} loading={generating} onClick={generate}>
          {plan ? 'Regenerate roadmap' : 'Generate roadmap'}
        </Button>
        {generateError && <div className="inline-error">{generateError}</div>}
        {!user?.profile?.target_role && (
          <p className="field-hint">
            Tip: <Link to="/profile">set a target role on your profile</Link> so future roadmaps default to the right role.
          </p>
        )}
      </div>
    </Card>
  );

  if (!plan) {
    return (
      <div className="page-stack">
        <PageHeader
          eyebrow="Study roadmap"
          title="A dated plan, built from your actual gaps"
          description="The roadmap prioritises missing required skills, adds practice tasks and links each item to a preparation topic."
          actions={
            <Button variant="secondary" to="/skill-gap" icon={Target}>
              Review skill gaps
            </Button>
          }
        />
        {generatorCard}
        <div className="feature-grid three">
          <Card className="feature-card">
            <span className="feature-icon indigo">
              <Target size={20} />
            </span>
            <h3>Gap-driven priorities</h3>
            <p>Missing mandatory skills come first, followed by weak skills and general interview practice.</p>
          </Card>
          <Card className="feature-card">
            <span className="feature-icon green">
              <CalendarDays size={20} />
            </span>
            <h3>Editable dates</h3>
            <p>Shift tasks to fit exams and deadlines. Add your own tasks at any time.</p>
          </Card>
          <Card className="feature-card">
            <span className="feature-icon amber">
              <Sparkles size={20} />
            </span>
            <h3>Works without AI</h3>
            <p>The default rule engine needs no API key. AI assistance is optional when a provider is configured.</p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Study roadmap"
        title={`Four-week plan for ${plan.target_role}`}
        description={`Generated ${formatDateTime(plan.created_at)} · ${plan.generated_by === 'ai' ? 'AI-assisted' : 'Rule-based'} · dates are editable.`}
        actions={
          <>
            <Button variant="secondary" icon={RefreshCw} onClick={() => setShowRegenerate((value) => !value)}>
              {showRegenerate ? 'Hide generator' : 'Regenerate'}
            </Button>
            <Button icon={Plus} onClick={openNewTask}>
              Add task
            </Button>
          </>
        }
      />

      {showRegenerate && generatorCard}

      <Notice tone="info" icon={AlertTriangle}>
        This roadmap is a preparation recommendation, not a guarantee of placement. Dates are editable and progress is tracked
        from the tasks you complete.
      </Notice>

      <div className="roadmap-summary">
        <Card className="roadmap-progress-card">
          <div className="roadmap-ring" style={{ '--roadmap-progress': `${Math.max(2, plan.progress.percent) * 3.6}deg` }}>
            <div>
              <strong>{plan.progress.percent}%</strong>
              <span>complete</span>
            </div>
          </div>
          <div>
            <Badge tone={plan.progress.overdue ? 'red' : 'green'} dot>
              {plan.progress.overdue ? `${plan.progress.overdue} overdue` : 'On track'}
            </Badge>
            <h3>{plan.progress.completed} of {plan.progress.total} tasks complete</h3>
            <p>{plan.summary}</p>
          </div>
        </Card>
        <Card className="roadmap-stat">
          <span className="gap-stat-icon green">
            <CheckCircle2 size={19} />
          </span>
          <div>
            <small>Completed</small>
            <strong>{plan.progress.completed}</strong>
            <span>tasks done</span>
          </div>
        </Card>
        <Card className="roadmap-stat">
          <span className="gap-stat-icon indigo">
            <ListChecks size={19} />
          </span>
          <div>
            <small>Remaining</small>
            <strong>{plan.progress.total - plan.progress.completed}</strong>
            <span>tasks left</span>
          </div>
        </Card>
        <Card className="roadmap-stat">
          <span className="gap-stat-icon red">
            <Clock3 size={19} />
          </span>
          <div>
            <small>Overdue</small>
            <strong>{plan.progress.overdue}</strong>
            <span>need attention</span>
          </div>
        </Card>
      </div>

      <div className="roadmap-layout">
        <div className="roadmap-main">
          {groups.length === 0 ? (
            <EmptyState
              icon={Map}
              title="This plan has no tasks"
              description="Add a task manually or regenerate the roadmap from your latest skill gaps."
              action={<Button onClick={openNewTask} icon={Plus}>Add task</Button>}
            />
          ) : (
            groups.map((group) => (
              <Card key={group.key} className="roadmap-group">
                <CardHeader
                  title={group.title}
                  description={group.key === 'overdue' ? 'Move these dates forward or complete them first.' : group.key === 'completed' ? 'Completed tasks remain visible for review.' : 'Sorted by target date.'}
                  action={<Badge tone={group.tone}>{group.tasks.length}</Badge>}
                />
                <div className="roadmap-task-list">
                  {group.tasks.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      busy={busyTask === task.id}
                      onToggle={toggleTask}
                      onEdit={openEditTask}
                      onDelete={setConfirmTask}
                    />
                  ))}
                </div>
              </Card>
            ))
          )}
        </div>

        <aside className="roadmap-side">
          <Card>
            <CardHeader title="Plan details" />
            <div className="side-facts">
              <div>
                <span>Target role</span>
                <strong>{plan.target_role}</strong>
              </div>
              <div>
                <span>Generated by</span>
                <strong>{plan.generated_by === 'ai' ? 'Optional AI provider' : 'Built-in rule engine'}</strong>
              </div>
              <div>
                <span>Created</span>
                <strong>{formatDate(plan.created_at)}</strong>
              </div>
              <div>
                <span>Overdue tasks</span>
                <strong>{plan.progress.overdue}</strong>
              </div>
            </div>
            <Button variant="secondary" className="full-width" to="/preparation" icon={ListChecks}>
              Open preparation centre
            </Button>
          </Card>
          <Card>
            <CardHeader title="Weekly rhythm" description="A simple way to use the plan." />
            <ul className="tip-list">
              <li>
                <CalendarDays size={16} />
                <span>Block two focused sessions per week for skill tasks and one for practice.</span>
              </li>
              <li>
                <CheckCircle2 size={16} />
                <span>Mark tasks complete only when you can explain the approach without help.</span>
              </li>
              <li>
                <RefreshCw size={16} />
                <span>Regenerate after a big skill update or when most tasks are complete.</span>
              </li>
            </ul>
          </Card>
        </aside>
      </div>

      <Modal
        open={Boolean(taskModal)}
        onClose={() => setTaskModal(null)}
        title={taskModal?.item ? 'Edit roadmap task' : 'Add a roadmap task'}
        description="Keep tasks specific and finishable. Target dates can be moved later."
        footer={
          <>
            <Button variant="ghost" onClick={() => setTaskModal(null)} disabled={taskSaving}>
              Cancel
            </Button>
            <Button type="submit" form="roadmap-task-form" loading={taskSaving}>
              {taskModal?.item ? 'Save task' : 'Add task'}
            </Button>
          </>
        }
      >
        {taskModal && (
          <form id="roadmap-task-form" className="form-stack" onSubmit={saveTask}>
            {taskError && <div className="inline-error">{taskError}</div>}
            <FormField label="Task title" required>
              <Input
                value={taskModal.data.title}
                onChange={(event) => setTaskModal((current) => ({ ...current, data: { ...current.data, title: event.target.value } }))}
                minLength={3}
                maxLength={220}
                required
              />
            </FormField>
            <FormField label="Description">
              <Textarea
                rows={4}
                value={taskModal.data.description}
                onChange={(event) => setTaskModal((current) => ({ ...current, data: { ...current.data, description: event.target.value } }))}
                maxLength={1200}
              />
            </FormField>
            <div className="form-grid two">
              <FormField label="Target date" required>
                <Input
                  type="date"
                  value={taskModal.data.target_date}
                  onChange={(event) => setTaskModal((current) => ({ ...current, data: { ...current.data, target_date: event.target.value } }))}
                  required
                />
              </FormField>
              <FormField label="Priority">
                <Select
                  value={taskModal.data.priority}
                  onChange={(event) => setTaskModal((current) => ({ ...current, data: { ...current.data, priority: event.target.value } }))}
                >
                  {PRIORITIES.map((priority) => (
                    <option key={priority.value} value={priority.value}>
                      {priority.label}
                    </option>
                  ))}
                </Select>
              </FormField>
            </div>
            <FormField label="Resource URL" hint="Optional. Must include https://.">
              <Input
                type="url"
                value={taskModal.data.resource_url}
                onChange={(event) => setTaskModal((current) => ({ ...current, data: { ...current.data, resource_url: event.target.value } }))}
                placeholder="https://…"
              />
            </FormField>
          </form>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(confirmTask)}
        onClose={() => setConfirmTask(null)}
        onConfirm={deleteTask}
        title="Delete this roadmap task?"
        description="It will be removed from your active plan. This cannot be undone."
        confirmLabel="Delete task"
        loading={confirmBusy}
      />
    </div>
  );
}

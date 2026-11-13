import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  CheckCircle2,
  Circle,
  ClipboardCheck,
  Clock3,
  FileText,
  Map,
  NotebookPen,
  PlayCircle,
  Target,
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
  EmptyState,
  ErrorState,
  Loader,
  PageHeader,
  ProgressBar,
  StatCard,
} from '../components/ui.jsx';
import { PREP_CATEGORIES } from '../utils/constants.js';

const CATEGORY_TONES = {
  DSA: 'indigo',
  Programming: 'blue',
  'Core CS': 'violet',
  Development: 'green',
  Aptitude: 'amber',
  Interviews: 'rose',
};

export default function Preparation() {
  const toast = useToast();
  const { data, loading, error, reload, setData } = useApi('/preparation/topics');
  const [category, setCategory] = useState('All');
  const [busyId, setBusyId] = useState(null);

  const topics = data || [];
  const summary = data?.summary;
  const filtered = useMemo(() => (category === 'All' ? topics : topics.filter((topic) => topic.category === category)), [topics, category]);

  const toggleTopic = async (topic) => {
    setBusyId(topic.id);
    try {
      const completed = !topic.is_completed;
      await api.put(`/preparation/topics/${topic.id}/progress`, { completed });
      setData((current) => {
        if (!current) return current;
        const next = current.map((item) => (item.id === topic.id ? { ...item, is_completed: completed } : item));
        const completedCount = next.filter((item) => item.is_completed).length;
        return {
          ...next,
          summary: {
            ...current.summary,
            topics_completed: completedCount,
            completion_percent: next.length ? Math.round((completedCount / next.length) * 100) : 0,
            categories: current.summary.categories.map((cat) =>
              cat.category === topic.category
                ? { ...cat, completed: next.filter((item) => item.category === cat.category && item.is_completed).length }
                : cat,
            ),
          },
        };
      });
      toast.success(completed ? 'Topic marked as completed.' : 'Topic moved back to in progress.');
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <Loader label="Loading the preparation centre…" />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  const totalHours = summary ? Math.round(summary.total_estimated_minutes / 60) : 0;

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Preparation centre"
        title="Build the fundamentals, one topic at a time"
        description="Structured topics with practice tasks, curated resources and personal notes. Progress here feeds your analytics and roadmap."
        actions={
          <>
            <Button variant="secondary" to="/skill-gap" icon={Target}>
              Skill gap
            </Button>
            <Button variant="secondary" to="/practice" icon={ClipboardCheck}>
              Mock tests
            </Button>
            <Button to="/roadmap" icon={Map}>
              Study roadmap
            </Button>
          </>
        }
      />

      <div className="stats-grid four">
        <StatCard icon={BookOpen} label="Topics completed" value={`${summary?.topics_completed || 0}/${summary?.topics_total || 0}`} meta={`${summary?.completion_percent || 0}% of the preparation library`} tone="indigo" />
        <StatCard icon={CheckCircle2} label="Practice tasks" value={`${summary?.practice_tasks_completed || 0}/${summary?.practice_tasks_total || 0}`} meta={`${summary?.practice_percent || 0}% completed`} tone="green" />
        <StatCard icon={Clock3} label="Estimated effort" value={`${totalHours}h`} meta="Across all preparation topics" tone="amber" />
        <StatCard icon={NotebookPen} label="Notes" value={topics.reduce((sum, topic) => sum + Number(topic.notes_total || 0), 0)} meta="Personal notes saved" tone="violet" />
      </div>

      <Card className="prep-overview">
        <div className="prep-overview-copy">
          <span className="prep-overview-icon">
            <PlayCircle size={22} />
          </span>
          <div>
            <strong>Preparation library progress</strong>
            <p>Mark a topic complete only when you can explain the core ideas and solve a representative problem without help.</p>
          </div>
        </div>
        <div className="prep-overview-progress">
          <div className="progress-label">
            <span>{summary?.topics_completed || 0} of {summary?.topics_total || 0} topics</span>
            <strong>{summary?.completion_percent || 0}%</strong>
          </div>
          <ProgressBar value={summary?.completion_percent || 0} tone="indigo" />
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Topics by category"
          description="Categories follow the seeded preparation library."
          action={<Badge tone="slate">{filtered.length} topics</Badge>}
        />
        <div className="category-pills">
          <button type="button" className={category === 'All' ? 'active' : ''} onClick={() => setCategory('All')}>
            All
            <span>{topics.length}</span>
          </button>
          {PREP_CATEGORIES.map((name) => {
            const info = summary?.categories?.find((cat) => cat.category === name);
            if (!info || info.total === 0) return null;
            return (
              <button type="button" key={name} className={category === name ? 'active' : ''} onClick={() => setCategory(name)}>
                {name}
                <span>{info.completed}/{info.total}</span>
              </button>
            );
          })}
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No topics in this category"
            description="Choose another category to continue preparing."
            action={<Button variant="secondary" size="sm" onClick={() => setCategory('All')}>Show all topics</Button>}
          />
        ) : (
          <div className="topic-grid">
            {filtered.map((topic) => (
              <article className={`topic-card ${topic.is_completed ? 'completed' : ''}`} key={topic.id}>
                <div className="topic-top">
                  <Badge tone={CATEGORY_TONES[topic.category] || 'slate'}>{topic.category}</Badge>
                  {topic.is_completed ? (
                    <span className="topic-status done">
                      <CheckCircle2 size={15} /> Completed
                    </span>
                  ) : (
                    <span className="topic-status">
                      <Circle size={15} /> In progress
                    </span>
                  )}
                </div>
                <Link to={`/preparation/${topic.slug}`} className="topic-title-link">
                  <h3>{topic.title}</h3>
                </Link>
                <p className="topic-description">{topic.description}</p>
                <div className="topic-meta">
                  <span>
                    <Clock3 size={14} /> {Math.round(topic.estimated_minutes / 60)}h
                  </span>
                  <span>
                    <BookOpen size={14} /> {topic.tasks_completed}/{topic.tasks_total} tasks
                  </span>
                  <span>
                    <Video size={14} /> {topic.resources_total} resources
                  </span>
                  <span>
                    <FileText size={14} /> {topic.notes_total} notes
                  </span>
                </div>
                <div className="topic-progress">
                  <div className="progress-label">
                    <span>Practical progress</span>
                    <strong>{topic.progress_percent}%</strong>
                  </div>
                  <ProgressBar value={topic.progress_percent} tone={topic.is_completed ? 'green' : 'indigo'} size="sm" />
                </div>
                <div className="topic-footer">
                  <Link to={`/preparation/${topic.slug}`} className="text-link">
                    Open topic <PlayCircle size={15} />
                  </Link>
                  <Button
                    size="sm"
                    variant={topic.is_completed ? 'ghost' : 'secondary'}
                    loading={busyId === topic.id}
                    onClick={() => toggleTopic(topic)}
                  >
                    {topic.is_completed ? 'Mark incomplete' : 'Mark complete'}
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

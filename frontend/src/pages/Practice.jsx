import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  BrainCircuit,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  FileQuestion,
  ListChecks,
  PlayCircle,
  RotateCcw,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react';
import { useApi } from '../hooks/useApi.js';
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
import { formatDateTime, timeAgo } from '../utils/format.js';

const CATEGORY_ICONS = {
  quantitative: Target,
  logical: BrainCircuit,
  verbal: FileQuestion,
};

const CATEGORY_TONES = {
  quantitative: 'blue',
  logical: 'violet',
  verbal: 'amber',
};

function scoreTone(score) {
  if (score >= 75) return 'green';
  if (score >= 50) return 'amber';
  return 'red';
}

export default function Practice() {
  const { data, loading, error, reload } = useApi('/practice/overview');

  if (loading) return <Loader label="Loading mock tests and aptitude practice…" />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  const stats = data?.stats || {};
  const categories = data?.categories || [];
  const mockTests = data?.mock_tests || [];
  const attempts = data?.recent_attempts || [];

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Mock tests & aptitude"
        title="Practise the way placements actually test you"
        description="Take timed mock tests, drill quantitative, logical and verbal aptitude, then review every answer with a worked explanation."
        actions={
          <>
            <Button variant="secondary" to="/preparation" icon={ListChecks}>
              Preparation topics
            </Button>
            <Button to="/practice/aptitude" icon={BrainCircuit}>
              Start aptitude practice
            </Button>
          </>
        }
      />

      <div className="stats-grid four">
        <StatCard
          icon={ClipboardCheck}
          label="Mock tests taken"
          value={stats.mock_attempts || 0}
          meta={`${stats.attempts_total || 0} total practice attempts`}
          tone="indigo"
        />
        <StatCard
          icon={TrendingUp}
          label="Average score"
          value={`${stats.average_score || 0}%`}
          meta="Across mock tests and aptitude drills"
          tone="amber"
        />
        <StatCard
          icon={Sparkles}
          label="Best score"
          value={`${stats.best_score || 0}%`}
          meta="Your personal best so far"
          tone="green"
        />
        <StatCard
          icon={CheckCircle2}
          label="Questions practised"
          value={stats.questions_answered || 0}
          meta="Answered questions across all attempts"
          tone="violet"
        />
      </div>

      <Card>
        <CardHeader
          title="Timed mock tests"
          description="Full-length papers with a countdown timer and a complete solution review."
          action={<Badge tone="indigo">{mockTests.length} tests available</Badge>}
        />
        {mockTests.length === 0 ? (
          <EmptyState
            icon={ClipboardCheck}
            title="No mock tests available"
            description="The placement cell has not published any mock tests yet."
          />
        ) : (
          <div className="mock-test-grid">
            {mockTests.map((test) => (
              <article className="mock-test-card" key={test.id}>
                <div className="mock-test-top">
                  <span className="mock-test-icon">
                    <ClipboardCheck size={20} />
                  </span>
                  <div className="mock-test-badges">
                    <Badge tone="indigo">{test.question_count} questions</Badge>
                    <Badge tone="slate">
                      <Clock3 size={12} /> {test.duration_minutes} min
                    </Badge>
                  </div>
                </div>
                <h3>{test.title}</h3>
                <p>{test.description}</p>
                <div className="mock-test-meta">
                  <span>
                    <RotateCcw size={14} /> {test.attempts} attempted
                  </span>
                  <span>
                    <BarChart3 size={14} /> Best {test.best_score === null ? '—' : `${test.best_score}%`}
                  </span>
                  {test.last_attempted_at && (
                    <span title={formatDateTime(test.last_attempted_at)}>
                      <Clock3 size={14} /> {timeAgo(test.last_attempted_at)}
                    </span>
                  )}
                </div>
                <div className="mock-test-footer">
                  {test.best_score !== null && (
                    <div className="mock-test-score">
                      <div className="progress-label">
                        <span>Personal best</span>
                        <strong>{test.best_score}%</strong>
                      </div>
                      <ProgressBar value={test.best_score} tone={scoreTone(test.best_score)} size="sm" />
                    </div>
                  )}
                  <Button
                    to={`/practice/mock-tests/${test.slug}`}
                    icon={PlayCircle}
                    variant={test.attempts ? 'secondary' : 'primary'}
                    className={test.best_score === null ? 'full-width' : ''}
                  >
                    {test.attempts ? 'Retake test' : 'Start test'}
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <CardHeader
          title="Aptitude practice"
          description="Short, topic-focused drills. Each round gives you a fresh set of questions from the question bank."
          action={
            <Button size="sm" variant="secondary" to="/practice/aptitude">
              Open practice setup <ArrowRight size={15} />
            </Button>
          }
        />
        <div className="aptitude-grid">
          {categories.map((category) => {
            const Icon = CATEGORY_ICONS[category.key] || Target;
            return (
              <article className={`aptitude-card tone-${CATEGORY_TONES[category.key] || 'slate'}`} key={category.key}>
                <div className="aptitude-card-head">
                  <span className="aptitude-icon">
                    <Icon size={20} />
                  </span>
                  <Badge tone={CATEGORY_TONES[category.key] || 'slate'}>{category.total} questions</Badge>
                </div>
                <h3>{category.label}</h3>
                <p>{category.description}</p>
                <div className="aptitude-facts">
                  <div>
                    <span>Attempted</span>
                    <strong>{category.attempted}</strong>
                  </div>
                  <div>
                    <span>Accuracy</span>
                    <strong>{category.accuracy}%</strong>
                  </div>
                </div>
                <ProgressBar value={category.accuracy} tone={scoreTone(category.accuracy)} size="sm" />
                <Button
                  to={`/practice/aptitude?category=${category.key}`}
                  variant="secondary"
                  icon={PlayCircle}
                  className="full-width"
                >
                  Practise {category.label.split(' ')[0].toLowerCase()}
                </Button>
              </article>
            );
          })}
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Recent attempts"
          description="Open any attempt to review the correct answers and explanations."
          action={<Badge tone="slate">{attempts.length} recent</Badge>}
        />
        {attempts.length === 0 ? (
          <EmptyState
            icon={BarChart3}
            title="No attempts yet"
            description="Start with a short aptitude drill or a full mock test. Your scores and reviews will appear here."
            action={<Button size="sm" to="/practice/aptitude" icon={PlayCircle}>Start practising</Button>}
          />
        ) : (
          <div className="attempt-list">
            {attempts.map((attempt) => (
              <Link to={`/practice/attempts/${attempt.id}`} className="attempt-row" key={attempt.id}>
                <span className={`attempt-mode ${attempt.mode}`}>
                  {attempt.mode === 'mock' ? <ClipboardCheck size={17} /> : <BrainCircuit size={17} />}
                </span>
                <span className="attempt-copy">
                  <strong>{attempt.title}</strong>
                  <small>
                    {attempt.correct_answers}/{attempt.total_questions} correct ·{' '}
                    {Math.max(1, Math.round(attempt.time_spent_seconds / 60))} min · {formatDateTime(attempt.submitted_at)}
                  </small>
                </span>
                <span className={`attempt-score tone-${scoreTone(attempt.score_percent)}`}>
                  {Math.round(attempt.score_percent)}%
                </span>
                <ArrowRight size={16} className="attempt-arrow" />
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

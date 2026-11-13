import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  BrainCircuit,
  CheckCircle2,
  Clock3,
  FileQuestion,
  ListChecks,
  PlayCircle,
  Shuffle,
  Target,
  Timer,
} from 'lucide-react';
import { api, errorMessage } from '../api/client.js';
import { useToast } from '../context/ToastContext.jsx';
import { Badge, Button, Card, CardHeader, FormField, PageHeader, Select } from '../components/ui.jsx';
import QuizRunner from '../components/QuizRunner.jsx';

const CATEGORIES = [
  {
    key: 'quantitative',
    label: 'Quantitative Aptitude',
    description: 'Percentages, ratios, averages, interest, time-speed-distance and time-work.',
    icon: Target,
    tone: 'blue',
  },
  {
    key: 'logical',
    label: 'Logical Reasoning',
    description: 'Series, coding-decoding, blood relations, directions, clocks and syllogisms.',
    icon: BrainCircuit,
    tone: 'violet',
  },
  {
    key: 'verbal',
    label: 'Verbal Ability',
    description: 'Synonyms, antonyms, grammar, prepositions, idioms and sentence completion.',
    icon: FileQuestion,
    tone: 'amber',
  },
  {
    key: 'mixed',
    label: 'Mixed Aptitude',
    description: 'A blend of quantitative, logical and verbal questions, like a real placement round.',
    icon: Shuffle,
    tone: 'indigo',
  },
];

const QUESTION_COUNTS = [5, 10, 15, 20];

const TIPS = [
  'Read every question fully before looking at the options.',
  'Skip a question if it takes more than two minutes; return to it later.',
  'There is no negative marking here, so attempt every question.',
  'Review the explanation after submitting, even for questions you got right.',
];

export default function AptitudePractice() {
  const navigate = useNavigate();
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const requestedCategory = searchParams.get('category');
  const [category, setCategory] = useState(
    CATEGORIES.some((item) => item.key === requestedCategory) ? requestedCategory : 'quantitative',
  );
  const [count, setCount] = useState(10);
  const [questions, setQuestions] = useState(null);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState('');

  const activeCategory = CATEGORIES.find((item) => item.key === category) || CATEGORIES[0];
  const durationMinutes = Math.max(5, Math.round(count * 1.5));

  const start = async () => {
    setStarting(true);
    setStartError('');
    try {
      const result = await api.get(`/practice/aptitude/questions${api.query({ category, limit: count })}`);
      const items = result?.data || [];
      if (!items.length) {
        setStartError('No questions are available for this category yet. Try another category.');
        return;
      }
      setQuestions(items);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      setStartError(errorMessage(error));
    } finally {
      setStarting(false);
    }
  };

  if (questions) {
    return (
      <QuizRunner
        title={`${activeCategory.label} practice`}
        subtitle={`${questions.length} questions · ${durationMinutes} minutes · no negative marking`}
        questions={questions}
        durationMinutes={durationMinutes}
        exitTo="/practice"
        exitLabel="Back to practice"
        submitLabel="Submit practice"
        tips={TIPS}
        onSubmit={async (payload) => {
          const result = await api.post('/practice/aptitude/attempts', {
            ...payload,
            category: category === 'mixed' ? null : category,
          });
          toast.success('Practice submitted. Review your answers below.');
          navigate(`/practice/attempts/${result.data.id}`);
        }}
      />
    );
  }

  return (
    <div className="page-stack">
      <div className="topic-nav">
        <Link to="/practice" className="back-link">
          <ArrowLeft size={16} /> Mock tests & aptitude
        </Link>
      </div>

      <PageHeader
        eyebrow="Aptitude practice"
        title="Build speed and accuracy with short drills"
        description="Choose a topic and a question count. Every round is drawn fresh from the question bank, and each answer is explained after you submit."
        actions={
          <Button to="/practice" variant="secondary" icon={ListChecks}>
            All mock tests
          </Button>
        }
      />

      <div className="practice-setup">
        <Card>
          <CardHeader
            title="1. Choose a topic"
            description="Focus on one area, or mix all three for a placement-style round."
          />
          <div className="aptitude-choice-grid">
            {CATEGORIES.map((item) => {
              const Icon = item.icon;
              const active = category === item.key;
              return (
                <button
                  type="button"
                  key={item.key}
                  className={`aptitude-choice ${active ? 'active' : ''}`}
                  onClick={() => setCategory(item.key)}
                >
                  <span className={`aptitude-choice-icon tone-${item.tone}`}>
                    <Icon size={19} />
                  </span>
                  <span className="aptitude-choice-copy">
                    <strong>{item.label}</strong>
                    <small>{item.description}</small>
                  </span>
                  <span className="aptitude-choice-check">{active && <CheckCircle2 size={18} />}</span>
                </button>
              );
            })}
          </div>
        </Card>

        <div className="practice-setup-side">
          <Card>
            <CardHeader title="2. Set the round" description="Longer rounds are closer to a real aptitude test." />
            <div className="setup-summary">
              <div>
                <span>Topic</span>
                <strong>{activeCategory.label}</strong>
              </div>
              <div>
                <span>Questions</span>
                <strong>{count}</strong>
              </div>
              <div>
                <span>Time limit</span>
                <strong>{durationMinutes} minutes</strong>
              </div>
              <div>
                <span>Marking</span>
                <strong>No negative marking</strong>
              </div>
            </div>
            <FormField label="Number of questions">
              <Select value={count} onChange={(event) => setCount(Number(event.target.value))}>
                {QUESTION_COUNTS.map((value) => (
                  <option value={value} key={value}>{value} questions</option>
                ))}
              </Select>
            </FormField>
            {startError && <div className="inline-error">{startError}</div>}
            <Button icon={PlayCircle} loading={starting} onClick={start} className="full-width">
              Start practice round
            </Button>
            <p className="practice-note">
              <Timer size={14} /> The timer starts when the questions load. You can submit early.
            </p>
          </Card>

          <Card>
            <CardHeader title="How it works" />
            <ul className="content-list">
              <li>Pick a topic and start a timed round.</li>
              <li>Use the question palette to move around and review answers.</li>
              <li>Submit to see your score, correct answers and explanations.</li>
              <li>Attempts are saved so you can track improvement on the mock tests page.</li>
            </ul>
            <div className="practice-badges">
              <Badge tone="indigo"><Clock3 size={12} /> Timed</Badge>
              <Badge tone="green"><CheckCircle2 size={12} /> Explained</Badge>
              <Badge tone="slate"><BrainCircuit size={12} /> Fresh questions</Badge>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Lightbulb,
  MinusCircle,
  RotateCcw,
  Target,
  Trophy,
  XCircle,
} from 'lucide-react';
import { useApi } from '../hooks/useApi.js';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  ErrorState,
  Loader,
  PageHeader,
  ProgressBar,
} from '../components/ui.jsx';
import { formatDateTime } from '../utils/format.js';

const CATEGORY_LABELS = {
  quantitative: 'Quantitative',
  logical: 'Logical reasoning',
  verbal: 'Verbal ability',
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

export default function AttemptReview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, loading, error, reload } = useApi(`/practice/attempts/${id}`);

  if (loading) return <Loader label="Loading your attempt review…" />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return null;

  const answers = data.answers || [];
  const incorrect = answers.filter((answer) => !answer.is_correct && answer.selected_option !== null).length;
  const unanswered = answers.filter((answer) => answer.selected_option === null).length;
  const tone = scoreTone(data.score_percent);
  const retryTo = data.mode === 'mock'
    ? `/practice/mock-tests/${data.mock_slug}`
    : `/practice/aptitude${data.category ? `?category=${data.category}` : ''}`;

  return (
    <div className="page-stack">
      <div className="topic-nav">
        <Link to="/practice" className="back-link">
          <ArrowLeft size={16} /> Mock tests & aptitude
        </Link>
        <Button variant="secondary" icon={RotateCcw} onClick={() => navigate(retryTo)}>
          Try again
        </Button>
      </div>

      <PageHeader
        eyebrow="Attempt review"
        title={data.title}
        description={`Submitted ${formatDateTime(data.submitted_at)} · ${data.total_questions} questions · ${Math.max(1, Math.round(data.time_spent_seconds / 60))} minutes`}
        actions={
          <Button to="/practice" variant="ghost" icon={ArrowLeft}>
            Back to practice
          </Button>
        }
      />

      <Card className={`result-hero tone-${tone}`}>
        <div className="result-score">
          <div className={`result-ring tone-${tone}`} style={{ '--result-progress': `${Math.max(3, data.score_percent) * 3.6}deg` }}>
            <div>
              <strong>{Math.round(data.score_percent)}%</strong>
              <span>score</span>
            </div>
          </div>
          <div className="result-copy">
            <Badge tone={tone} dot>
              {data.score_percent >= 75 ? 'Strong attempt' : data.score_percent >= 50 ? 'Keep going' : 'Needs revision'}
            </Badge>
            <h2>{data.correct_answers} of {data.total_questions} correct</h2>
            <p>
              {data.mode === 'mock'
                ? 'Use the explanations below to turn every mistake into a revision note.'
                : 'Review each explanation, then run another short round to reinforce the pattern.'}
            </p>
            <div className="result-actions">
              <Button icon={RotateCcw} onClick={() => navigate(retryTo)}>Try again</Button>
              <Button variant="secondary" icon={Target} to="/practice/aptitude">Practise another topic</Button>
            </div>
          </div>
        </div>
        <div className="result-stats">
          <div>
            <span><CheckCircle2 size={15} /> Correct</span>
            <strong className="text-green">{data.correct_answers}</strong>
          </div>
          <div>
            <span><XCircle size={15} /> Incorrect</span>
            <strong className="text-red">{incorrect}</strong>
          </div>
          <div>
            <span><MinusCircle size={15} /> Unanswered</span>
            <strong>{unanswered}</strong>
          </div>
          <div>
            <span><Clock3 size={15} /> Time spent</span>
            <strong>{Math.max(1, Math.round(data.time_spent_seconds / 60))} min</strong>
          </div>
          <div>
            <span><Trophy size={15} /> Best possible</span>
            <strong>100%</strong>
          </div>
        </div>
        <ProgressBar value={data.score_percent} tone={tone} label="Overall score" />
      </Card>

      <Card>
        <CardHeader
          title="Answer-by-answer review"
          description="The correct option is highlighted in green. Your selection is marked separately."
          action={<Badge tone="slate">{answers.length} questions</Badge>}
        />
        <div className="review-list">
          {answers.map((answer, index) => (
            <article className="review-card" key={answer.question_id}>
              <div className="review-head">
                <span className={`review-number ${answer.is_correct ? 'correct' : answer.selected_option === null ? 'skipped' : 'incorrect'}`}>
                  {index + 1}
                </span>
                <div className="review-tags">
                  <Badge tone={CATEGORY_TONES[answer.category] || 'slate'}>
                    {CATEGORY_LABELS[answer.category] || answer.category}
                  </Badge>
                  <Badge tone="slate">{answer.difficulty}</Badge>
                </div>
                <span className={`review-status ${answer.is_correct ? 'correct' : answer.selected_option === null ? 'skipped' : 'incorrect'}`}>
                  {answer.is_correct ? <CheckCircle2 size={15} /> : answer.selected_option === null ? <MinusCircle size={15} /> : <XCircle size={15} />}
                  {answer.is_correct ? 'Correct' : answer.selected_option === null ? 'Not answered' : 'Incorrect'}
                </span>
              </div>

              <h3 className="review-prompt">{answer.prompt}</h3>

              <div className="review-options">
                {answer.options.map((option, optionIndex) => {
                  const isCorrect = optionIndex === answer.correct_option;
                  const isSelected = optionIndex === answer.selected_option;
                  return (
                    <div
                      key={`${answer.question_id}-${optionIndex}`}
                      className={`review-option ${isCorrect ? 'correct' : ''} ${isSelected && !isCorrect ? 'chosen-wrong' : ''}`}
                    >
                      <span className="review-option-key">{String.fromCharCode(65 + optionIndex)}</span>
                      <span>{option}</span>
                      <span className="review-option-tags">
                        {isCorrect && <em className="tag-correct">Correct answer</em>}
                        {isSelected && <em className={isCorrect ? 'tag-yours' : 'tag-wrong'}>Your answer</em>}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="review-explanation">
                <Lightbulb size={17} />
                <p><strong>Explanation:</strong> {answer.explanation}</p>
              </div>
            </article>
          ))}
        </div>
      </Card>
    </div>
  );
}

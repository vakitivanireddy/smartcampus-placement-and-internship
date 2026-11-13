import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eraser,
  Send,
  Timer,
} from 'lucide-react';
import { errorMessage } from '../api/client.js';
import { useToast } from '../context/ToastContext.jsx';
import { Badge, Button, Card, CardHeader, ConfirmDialog } from './ui.jsx';

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

function formatClock(totalSeconds) {
  const safe = Math.max(0, Number(totalSeconds) || 0);
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export default function QuizRunner({
  title,
  subtitle,
  questions,
  durationMinutes,
  onSubmit,
  exitTo,
  exitLabel = 'Exit practice',
  submitLabel = 'Submit test',
  tips = [],
}) {
  const toast = useToast();
  const durationSeconds = Math.max(0, Number(durationMinutes || 0) * 60);
  const [answers, setAnswers] = useState({});
  const [current, setCurrent] = useState(0);
  const [remaining, setRemaining] = useState(durationSeconds);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const submittedRef = useRef(false);
  const timeUpHandledRef = useRef(false);

  const answeredCount = useMemo(
    () => questions.filter((question) => answers[question.id] !== undefined && answers[question.id] !== null).length,
    [answers, questions],
  );

  const submit = useCallback(async (automatic = false) => {
    if (submittedRef.current) return;
    if (!automatic && answeredCount === 0) {
      toast.error('Answer at least one question before submitting.');
      return;
    }
    submittedRef.current = true;
    setSubmitting(true);
    setConfirmOpen(false);
    try {
      const payload = {
        answers: questions.map((question) => ({
          question_id: question.id,
          selected_option: answers[question.id] ?? null,
        })),
        time_spent_seconds: durationSeconds
          ? Math.min(durationSeconds, Math.max(elapsed, durationSeconds - remaining))
          : elapsed,
      };
      await onSubmit(payload);
    } catch (error) {
      submittedRef.current = false;
      toast.error(errorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }, [answeredCount, answers, durationSeconds, elapsed, onSubmit, questions, remaining, toast]);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed((value) => value + 1);
      if (durationSeconds) setRemaining((value) => Math.max(0, value - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [durationSeconds]);

  useEffect(() => {
    if (durationSeconds && remaining === 0 && !timeUpHandledRef.current) {
      timeUpHandledRef.current = true;
      toast.info('Time is up. Submitting your answers.');
      submit(true);
    }
  }, [durationSeconds, remaining, submit, toast]);

  const question = questions[current];
  if (!question) return null;

  const selected = answers[question.id];
  const isLast = current === questions.length - 1;
  const progress = Math.round(((current + 1) / questions.length) * 100);

  const choose = (index) => {
    setAnswers((currentAnswers) => ({ ...currentAnswers, [question.id]: index }));
  };

  const clear = () => {
    setAnswers((currentAnswers) => {
      const next = { ...currentAnswers };
      delete next[question.id];
      return next;
    });
  };

  return (
    <div className="page-stack quiz-page">
      <div className="quiz-topline">
        <Link to={exitTo} className="back-link">
          <ArrowLeft size={16} /> {exitLabel}
        </Link>
        <div className={`quiz-timer ${durationSeconds && remaining <= 60 ? 'urgent' : ''}`}>
          <Timer size={16} />
          <span>{durationSeconds ? formatClock(remaining) : formatClock(elapsed)}</span>
          <small>{durationSeconds ? 'remaining' : 'elapsed'}</small>
        </div>
      </div>

      <div className="quiz-heading">
        <div>
          <span className="eyebrow">Practice in progress</span>
          <h1>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
        <div className="quiz-heading-stats">
          <Badge tone="indigo">{questions.length} questions</Badge>
          <Badge tone={answeredCount === questions.length ? 'green' : 'slate'}>
            {answeredCount} answered
          </Badge>
        </div>
      </div>

      <div className="quiz-progress">
        <div className="progress-label">
          <span>Question {current + 1} of {questions.length}</span>
          <strong>{progress}%</strong>
        </div>
        <div className="progress progress-sm" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
          <span className="progress-fill tone-indigo" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="quiz-layout">
        <section className="quiz-main">
          <Card className="quiz-question-card">
            <div className="quiz-question-head">
              <span className="quiz-question-number">Q{current + 1}</span>
              <div className="quiz-question-badges">
                <Badge tone={CATEGORY_TONES[question.category] || 'slate'}>
                  {CATEGORY_LABELS[question.category] || question.category}
                </Badge>
                <Badge tone="slate">{question.difficulty}</Badge>
              </div>
            </div>

            <h2 className="quiz-prompt">{question.prompt}</h2>

            <div className="quiz-options" role="radiogroup" aria-label="Answer options">
              {question.options.map((option, index) => {
                const active = selected === index;
                return (
                  <button
                    type="button"
                    key={`${question.id}-${index}`}
                    className={`quiz-option ${active ? 'selected' : ''}`}
                    onClick={() => choose(index)}
                    role="radio"
                    aria-checked={active}
                  >
                    <span className="quiz-option-key">{String.fromCharCode(65 + index)}</span>
                    <span className="quiz-option-text">{option}</span>
                    {active && <CheckCircle2 size={18} className="quiz-option-check" />}
                  </button>
                );
              })}
            </div>

            <div className="quiz-actions">
              <Button variant="ghost" icon={ChevronLeft} disabled={current === 0} onClick={() => setCurrent((value) => value - 1)}>
                Previous
              </Button>
              <div className="quiz-actions-right">
                <Button variant="ghost" icon={Eraser} onClick={clear} disabled={selected === undefined}>
                  Clear
                </Button>
                {isLast ? (
                  <Button icon={Send} onClick={() => setConfirmOpen(true)} loading={submitting}>
                    {submitLabel}
                  </Button>
                ) : (
                  <Button onClick={() => setCurrent((value) => value + 1)}>
                    Next <ChevronRight size={16} />
                  </Button>
                )}
              </div>
            </div>
          </Card>
        </section>

        <aside className="quiz-side">
          <Card className="sticky-card">
            <CardHeader title="Question palette" description="Jump to any question. Orange means unanswered." />
            <div className="quiz-palette" aria-label="Question palette">
              {questions.map((item, index) => {
                const answered = answers[item.id] !== undefined && answers[item.id] !== null;
                return (
                  <button
                    type="button"
                    key={item.id}
                    className={`quiz-palette-btn ${index === current ? 'current' : ''} ${answered ? 'answered' : ''}`}
                    onClick={() => setCurrent(index)}
                    aria-label={`Question ${index + 1}${answered ? ', answered' : ', unanswered'}`}
                  >
                    {index + 1}
                  </button>
                );
              })}
            </div>
            <div className="quiz-legend">
              <span><i className="legend-dot answered" /> Answered ({answeredCount})</span>
              <span><i className="legend-dot" /> Unanswered ({questions.length - answeredCount})</span>
            </div>
            <Button className="full-width" icon={Send} onClick={() => setConfirmOpen(true)} loading={submitting}>
              {submitLabel}
            </Button>
            <Button variant="ghost" className="full-width" to={exitTo}>
              {exitLabel}
            </Button>
          </Card>

          <Card className="quiz-tips">
            <CardHeader title="Attempt strategy" action={<Clock3 size={18} className="card-head-icon" />} />
            {tips.length ? (
              <ul className="content-list">
                {tips.map((tip) => <li key={tip}>{tip}</li>)}
              </ul>
            ) : (
              <ul className="content-list">
                <li>Answer the questions you are confident about first, then come back.</li>
                <li>Use elimination when you are unsure. There is no negative marking.</li>
                <li>Keep an eye on the timer, but do not rush the easy questions.</li>
              </ul>
            )}
          </Card>
        </aside>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => submit(false)}
        title="Submit this attempt?"
        description={
          answeredCount === questions.length
            ? 'All questions are answered. You will see the full solution review after submitting.'
            : `${questions.length - answeredCount} question(s) are still unanswered. Unanswered questions are marked incorrect.`
        }
        confirmLabel={submitLabel}
        tone="primary"
        loading={submitting}
      />
    </div>
  );
}

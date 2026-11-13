import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { useApi } from '../hooks/useApi.js';
import { useToast } from '../context/ToastContext.jsx';
import { ErrorState, Loader } from '../components/ui.jsx';
import QuizRunner from '../components/QuizRunner.jsx';

const TIPS = [
  'The timer runs continuously once the test loads, so keep an eye on it.',
  'Attempt the questions you find easiest first, then return to the harder ones.',
  'There is no negative marking. Never leave a question blank if you can eliminate options.',
  'After submitting, read the explanation for every incorrect answer.',
];

export default function MockTest() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { data, loading, error, reload } = useApi(`/practice/mock-tests/${slug}`);

  if (loading) return <Loader label="Preparing your mock test…" />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return null;

  return (
    <QuizRunner
      title={data.title}
      subtitle={`${data.questions.length} questions · ${data.duration_minutes} minutes · no negative marking`}
      questions={data.questions}
      durationMinutes={data.duration_minutes}
      exitTo="/practice"
      exitLabel="Back to mock tests"
      submitLabel="Submit mock test"
      tips={TIPS}
      onSubmit={async (payload) => {
        const result = await api.post(`/practice/mock-tests/${data.slug}/attempts`, payload);
        toast.success('Mock test submitted. Here is your detailed review.');
        navigate(`/practice/attempts/${result.data.id}`);
      }}
    />
  );
}

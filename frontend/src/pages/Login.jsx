import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LogIn, Mail, LockKeyhole, AlertCircle } from 'lucide-react';
import AuthLayout from '../components/AuthLayout.jsx';
import { Button, Input, FormField, Notice } from '../components/ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { errorMessage } from '../api/client.js';

const DEMOS = [
  { label: 'Student demo', email: 'demo.student@example.com', password: 'Student@123', tone: 'student' },
  { label: 'Admin demo', email: 'placement.cell@example.com', password: 'Admin@123', tone: 'admin' },
];

export default function Login() {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const user = await login(form.email.trim(), form.password);
      toast.success(`Welcome back, ${user.name.split(' ')[0]}!`);
      const fallback = user.role === 'admin' ? '/admin' : '/dashboard';
      const from = location.state?.from;
      const safeFrom = typeof from === 'string' && from.startsWith('/') ? from : fallback;
      navigate(safeFrom, { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const fillDemo = (demo) => {
    setForm({ email: demo.email, password: demo.password });
    setError('');
    toast.info(`Demo credentials for the ${demo.label.toLowerCase()} filled in.`);
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to continue your placement preparation."
      footer={
        <p>
          New here? <Link to="/register">Create a student account</Link>
        </p>
      }
    >
      {error && (
        <Notice tone="danger" icon={AlertCircle} className="auth-alert">
          {error}
        </Notice>
      )}

      <form className="auth-form" onSubmit={submit}>
        <FormField label="Email address" htmlFor="email" required>
          <div className="input-with-icon">
            <Mail size={17} />
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@college.edu"
              value={form.email}
              onChange={update('email')}
              required
            />
          </div>
        </FormField>

        <FormField label="Password" htmlFor="password" required>
          <div className="input-with-icon">
            <LockKeyhole size={17} />
            <Input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Enter your password"
              value={form.password}
              onChange={update('password')}
              required
            />
            <button
              type="button"
              className="input-action"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
        </FormField>

        <Button type="submit" size="lg" loading={submitting} icon={LogIn} className="auth-submit">
          Sign in
        </Button>
      </form>

      <div className="demo-block">
        <span className="demo-block-label">Try the demo accounts</span>
        <div className="demo-buttons">
          {DEMOS.map((demo) => (
            <button key={demo.email} type="button" className="demo-button" onClick={() => fillDemo(demo)}>
              <span className={`demo-dot ${demo.tone}`} />
              <span>
                <strong>{demo.label}</strong>
                <small>{demo.email}</small>
              </span>
            </button>
          ))}
        </div>
        <p className="demo-hint">Click one to fill the form, then sign in. Demo data is for demonstration only.</p>
      </div>
    </AuthLayout>
  );
}

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, UserPlus, AlertCircle, CheckCircle2 } from 'lucide-react';
import AuthLayout from '../components/AuthLayout.jsx';
import { Button, Input, Select, FormField, Notice } from '../components/ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { errorMessage } from '../api/client.js';
import { ROLE_OPTIONS } from '../utils/constants.js';

const initial = {
  name: '',
  email: '',
  password: '',
  college: '',
  branch: '',
  graduationYear: '',
  cgpa: '',
  targetRole: '',
};

const BRANCHES = ['CSE', 'IT', 'ECE', 'EEE', 'Mechanical', 'Civil', 'Chemical', 'AIML', 'Data Science', 'Other'];

export default function Register() {
  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState(initial);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await register({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        college: form.college.trim(),
        branch: form.branch,
        graduationYear: form.graduationYear ? Number(form.graduationYear) : null,
        cgpa: form.cgpa ? Number(form.cgpa) : null,
        targetRole: form.targetRole,
      });
      toast.success('Account created. Welcome to SmartPlacement!');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Create your student account"
      subtitle="Start with the basics. You can add skills, projects and a resume next."
      footer={
        <p>
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      }
    >
      {error && (
        <Notice tone="danger" icon={AlertCircle} className="auth-alert">
          {error}
        </Notice>
      )}

      <form className="auth-form" onSubmit={submit}>
        <FormField label="Full name" htmlFor="name" required>
          <Input id="name" name="name" autoComplete="name" placeholder="e.g. Aarav Sharma" value={form.name} onChange={update('name')} required />
        </FormField>

        <FormField label="Email address" htmlFor="email" required>
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
        </FormField>

        <FormField
          label="Password"
          htmlFor="password"
          required
          hint="At least 8 characters with one uppercase letter, one lowercase letter and one number."
        >
          <div className="input-with-icon">
            <Input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Create a strong password"
              value={form.password}
              onChange={update('password')}
              required
              minLength={8}
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

        <div className="form-grid two">
          <FormField label="College" htmlFor="college">
            <Input id="college" name="college" placeholder="Your college" value={form.college} onChange={update('college')} />
          </FormField>
          <FormField label="Branch" htmlFor="branch">
            <Select id="branch" name="branch" value={form.branch} onChange={update('branch')}>
              <option value="">Select branch</option>
              {BRANCHES.map((branch) => (
                <option key={branch} value={branch}>
                  {branch}
                </option>
              ))}
            </Select>
          </FormField>
        </div>

        <div className="form-grid three">
          <FormField label="Graduation year" htmlFor="graduationYear">
            <Input
              id="graduationYear"
              name="graduationYear"
              type="number"
              min="2000"
              max="2100"
              placeholder="2027"
              value={form.graduationYear}
              onChange={update('graduationYear')}
            />
          </FormField>
          <FormField label="CGPA" htmlFor="cgpa">
            <Input
              id="cgpa"
              name="cgpa"
              type="number"
              min="0"
              max="10"
              step="0.01"
              placeholder="7.8"
              value={form.cgpa}
              onChange={update('cgpa')}
            />
          </FormField>
          <FormField label="Target role" htmlFor="targetRole">
            <Select id="targetRole" name="targetRole" value={form.targetRole} onChange={update('targetRole')}>
              <option value="">Choose later</option>
              {ROLE_OPTIONS.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </Select>
          </FormField>
        </div>

        <Button type="submit" size="lg" loading={submitting} icon={UserPlus} className="auth-submit">
          Create account
        </Button>
      </form>

      <div className="auth-assurance">
        <CheckCircle2 size={16} />
        <span>Your resume PDF is processed in memory and is never stored on the server.</span>
      </div>
    </AuthLayout>
  );
}

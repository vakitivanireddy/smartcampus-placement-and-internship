import { Link } from 'react-router-dom';
import { GraduationCap, ShieldCheck, Sparkles, TrendingUp, Target } from 'lucide-react';

const POINTS = [
  { icon: Target, title: 'Eligibility you can trust', text: 'Every opportunity is checked against your live profile and skills.' },
  { icon: TrendingUp, title: 'Progress you can see', text: 'Skill gaps, preparation tasks and application stages in one view.' },
  { icon: ShieldCheck, title: 'Private by design', text: 'Resume PDFs are processed in memory and never stored on the server.' },
];

export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="auth-shell">
      <section className="auth-hero">
        <div className="auth-hero-inner">
          <Link to="/login" className="auth-brand">
            <span className="brand-logo large">
              <GraduationCap size={28} />
            </span>
            <span>
              <strong>SmartPlacement</strong>
              <small>Career readiness workspace</small>
            </span>
          </Link>

          <div className="auth-hero-copy">
            <span className="auth-kicker">
              <Sparkles size={15} /> Plan. Prepare. Place.
            </span>
            <h1>From eligibility to offer, keep every step in one place.</h1>
            <p>
              A practical placement dashboard for students and placement cells. Check what you qualify for, close skill gaps
              with a dated roadmap, and track every application without spreadsheets.
            </p>
          </div>

          <div className="auth-points">
            {POINTS.map((point) => (
              <div className="auth-point" key={point.title}>
                <span>
                  <point.icon size={18} />
                </span>
                <div>
                  <strong>{point.title}</strong>
                  <p>{point.text}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="auth-demo-note">
            <strong>Demo workspace</strong>
            <p>All seeded opportunities are clearly labelled sample data, not verified live openings.</p>
          </div>
        </div>
      </section>

      <section className="auth-panel">
        <div className="auth-card">
          <div className="auth-card-head">
            <h2>{title}</h2>
            <p>{subtitle}</p>
          </div>
          {children}
          {footer && <div className="auth-card-footer">{footer}</div>}
        </div>
      </section>
    </div>
  );
}

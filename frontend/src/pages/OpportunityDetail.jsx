import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Bookmark,
  BookmarkCheck,
  Briefcase,
  Building2,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Clock3,
  ExternalLink,
  GraduationCap,
  Layers,
  MapPin,
  Sparkles,
  Target,
  Users,
  XCircle,
} from 'lucide-react';
import { api, errorMessage } from '../api/client.js';
import { useApi } from '../hooks/useApi.js';
import { useToast } from '../context/ToastContext.jsx';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  ErrorState,
  Loader,
  Notice,
  PageHeader,
  ProgressBar,
} from '../components/ui.jsx';
import TrackApplicationModal from '../components/TrackApplicationModal.jsx';
import { ELIGIBILITY } from '../utils/constants.js';
import { daysUntil, deadlineLabel, formatDate, formatDateTime, initials, titleCase } from '../utils/format.js';

const CHECK_ICONS = {
  pass: { icon: CheckCircle2, className: 'pass' },
  fail: { icon: XCircle, className: 'fail' },
  unknown: { icon: AlertCircle, className: 'unknown' },
};

export default function OpportunityDetail() {
  const { id } = useParams();
  const toast = useToast();
  const detail = useApi(`/opportunities/${id}`);
  const applications = useApi('/applications');
  const [busy, setBusy] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const opportunity = detail.data;
  const existingApplication = useMemo(
    () => (applications.data || []).find((app) => app.opportunity?.id === Number(id)),
    [applications.data, id],
  );

  if (detail.loading) return <Loader label="Loading opportunity details…" />;
  if (detail.error) return <ErrorState message={detail.error} onRetry={detail.reload} />;
  if (!opportunity) return null;

  const eligibility = ELIGIBILITY[opportunity.eligibility.status] || ELIGIBILITY.needs_info;
  const days = daysUntil(opportunity.application_deadline);
  const requiredSkills = opportunity.skills.filter((skill) => skill.importance === 'required');
  const preferredSkills = opportunity.skills.filter((skill) => skill.importance === 'preferred');
  const matched = new Map(opportunity.eligibility.matchedSkills.map((skill) => [skill.name, skill]));
  const missing = new Map(opportunity.eligibility.missingSkills.map((skill) => [skill.name, skill]));

  const toggleBookmark = async () => {
    setBusy(true);
    try {
      const result = await api.post(`/opportunities/${opportunity.id}/bookmark`);
      detail.setData((current) => ({ ...current, is_bookmarked: result.data.bookmarked }));
      toast.success(result.message);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const afterSaved = () => {
    detail.reload({ quiet: true });
    applications.reload({ quiet: true });
  };

  return (
    <div className="page-stack">
      <Link to="/opportunities" className="back-link">
        <ArrowLeft size={16} /> Back to opportunities
      </Link>

      <Card className="detail-hero">
        <div className="detail-hero-main">
          <div className="company-logo xl">{initials(opportunity.company)}</div>
          <div className="detail-title">
            <div className="opportunity-badges">
              <Badge tone={opportunity.type === 'internship' ? 'indigo' : 'violet'}>{opportunity.type}</Badge>
              <Badge tone="slate">{opportunity.work_mode}</Badge>
              {opportunity.is_sample && <Badge tone="amber">Sample data — not a verified live opening</Badge>}
            </div>
            <h1>{opportunity.title}</h1>
            <p className="detail-company">
              <Building2 size={16} /> {opportunity.company}
              <span>·</span>
              <MapPin size={16} /> {opportunity.location}
            </p>
          </div>
        </div>
        <div className="detail-hero-actions">
          <Button
            variant="secondary"
            icon={opportunity.is_bookmarked ? BookmarkCheck : Bookmark}
            onClick={toggleBookmark}
            loading={busy}
          >
            {opportunity.is_bookmarked ? 'Bookmarked' : 'Bookmark'}
          </Button>
          <Button
            icon={existingApplication ? ClipboardList : Clock3}
            onClick={() => setModalOpen(true)}
          >
            {existingApplication ? 'Update application' : 'Track application'}
          </Button>
        </div>
      </Card>

      <div className="detail-grid">
        <div className="detail-main">
          <Card>
            <CardHeader
              title="Eligibility analysis"
              description="Recalculated from your current profile and confirmed skills."
              action={<Badge tone={eligibility.tone} dot>{eligibility.label}</Badge>}
            />
            <div className={`eligibility-banner ${eligibility.tone}`}>
              <span className="eligibility-banner-icon">
                {opportunity.eligibility.status === 'eligible' ? <CheckCircle2 size={22} /> : opportunity.eligibility.status === 'not_eligible' ? <XCircle size={22} /> : <AlertCircle size={22} />}
              </span>
              <div>
                <strong>{opportunity.eligibility.summary}</strong>
                <p>Preferred skills never block eligibility. Missing profile information produces “needs info”, not an automatic rejection.</p>
              </div>
              <Button size="sm" variant="secondary" to="/profile">
                Edit profile
              </Button>
            </div>

            <div className="check-list">
              {opportunity.eligibility.checks.map((check) => {
                const meta = CHECK_ICONS[check.status] || CHECK_ICONS.unknown;
                const Icon = meta.icon;
                return (
                  <div key={check.key} className={`check-item ${meta.className}`}>
                    <Icon size={19} />
                    <div>
                      <strong>{check.label}</strong>
                      <p>{check.detail}</p>
                    </div>
                    <Badge tone={check.status === 'pass' ? 'green' : check.status === 'fail' ? 'red' : 'amber'}>
                      {check.status === 'pass' ? 'Met' : check.status === 'fail' ? 'Blocked' : 'Needs info'}
                    </Badge>
                  </div>
                );
              })}
            </div>

            {opportunity.eligibility.reasons.some((reason) => reason.severity !== 'info') && (
              <div className="reason-list">
                {opportunity.eligibility.reasons
                  .filter((reason) => reason.severity !== 'info')
                  .map((reason, index) => (
                    <p key={index} className="reason error">
                      {reason.message}
                    </p>
                  ))}
              </div>
            )}
          </Card>

          <Card>
            <CardHeader title="Role overview" description="Sample role description provided for demonstration." />
            <div className="prose">
              {opportunity.description.split('\n').map((line, index) =>
                line.trim() ? <p key={index}>{line}</p> : null,
              )}
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Skill requirements"
              description="Required skills are mandatory for eligibility. Preferred skills strengthen an application but never block it."
              action={<Target size={18} className="card-head-icon" />}
            />
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Skill</th>
                    <th>Importance</th>
                    <th>Expected level</th>
                    <th>Your level</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {opportunity.skills.map((skill) => {
                    const own = matched.get(skill.name);
                    const gap = missing.get(skill.name);
                    return (
                      <tr key={skill.skill_id}>
                        <td>
                          <strong>{skill.name}</strong>
                          <div className="cell-sub">{titleCase(skill.category)}</div>
                        </td>
                        <td>
                          <Badge tone={skill.importance === 'required' ? 'indigo' : 'slate'}>{skill.importance}</Badge>
                        </td>
                        <td>{skill.min_proficiency}/5</td>
                        <td>{own ? `${own.proficiency}/5` : gap?.current_proficiency ? `${gap.current_proficiency}/5` : 'Not added'}</td>
                        <td>
                          <Badge tone={own ? 'green' : gap ? 'red' : 'slate'}>
                            {own ? 'Met' : gap ? 'Gap' : 'Optional'}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                  {opportunity.skills.length === 0 && (
                    <tr>
                      <td colSpan={5} className="muted">No skill requirements are configured for this role.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {(requiredSkills.some((skill) => missing.has(skill.name)) || preferredSkills.length > 0) && (
              <Notice tone="info" icon={Sparkles} className="mt-3">
                {missing.size > 0 && (
                  <p>
                    <strong>{missing.size} required {missing.size === 1 ? 'skill is' : 'skills are'} missing or below the expected level.</strong>{' '}
                    <Link to={`/skill-gap?opportunity_id=${opportunity.id}`}>Analyse this role’s gap</Link> and add it to your roadmap.
                  </p>
                )}
                {preferredSkills.length > 0 && (
                  <p>
                    Preferred skills to strengthen: {preferredSkills.map((skill) => skill.name).join(', ')}. These are optional and
                    do not affect eligibility.
                  </p>
                )}
              </Notice>
            )}
          </Card>

          <Card>
            <CardHeader title="Academic and eligibility criteria" description="Configured by the placement cell for this sample role." />
            <div className="criteria-grid">
              <div className="criteria-card">
                <span className="criteria-icon">
                  <GraduationCap size={18} />
                </span>
                <div>
                  <small>Eligible branches</small>
                  <strong>{opportunity.branches.length ? opportunity.branches.join(', ') : 'All branches'}</strong>
                </div>
              </div>
              <div className="criteria-card">
                <span className="criteria-icon">
                  <CalendarClock size={18} />
                </span>
                <div>
                  <small>Graduation batches</small>
                  <strong>{opportunity.batches.length ? opportunity.batches.join(', ') : 'No batch restriction'}</strong>
                </div>
              </div>
              <div className="criteria-card">
                <span className="criteria-icon">
                  <Target size={18} />
                </span>
                <div>
                  <small>Minimum CGPA</small>
                  <strong>{opportunity.min_cgpa ?? 'No minimum'}</strong>
                </div>
              </div>
              <div className="criteria-card">
                <span className="criteria-icon">
                  <Users size={18} />
                </span>
                <div>
                  <small>Openings</small>
                  <strong>{opportunity.openings ?? 'Not specified'}</strong>
                </div>
              </div>
              {opportunity.requirements.map((requirement) => (
                <div className="criteria-card" key={`${requirement.type}-${requirement.value}`}>
                  <span className="criteria-icon">
                    <CheckCircle2 size={18} />
                  </span>
                  <div>
                    <small>{requirement.label || titleCase(requirement.type)}</small>
                    <strong>{requirement.type === 'max_backlogs' ? `At most ${requirement.value}` : `At least ${requirement.value}%`}</strong>
                  </div>
                </div>
              ))}
            </div>
            {opportunity.other_requirements && <p className="muted-copy mt-3">{opportunity.other_requirements}</p>}
          </Card>
        </div>

        <aside className="detail-side">
          <Card className="sticky-card">
            <div className={`deadline-hero ${days !== null && days <= 3 ? 'urgent' : ''}`}>
              <span className="deadline-hero-label">Application deadline</span>
              <strong>{formatDate(opportunity.application_deadline)}</strong>
              <span>{deadlineLabel(opportunity.application_deadline)}</span>
              {days !== null && days >= 0 && (
                <ProgressBar value={Math.max(4, Math.min(100, ((14 - Math.min(days, 14)) / 14) * 100))} tone={days <= 3 ? 'red' : days <= 7 ? 'amber' : 'green'} />
              )}
            </div>
            <div className="side-facts">
              <div>
                <span>Type</span>
                <strong>{titleCase(opportunity.type)}</strong>
              </div>
              <div>
                <span>Work mode</span>
                <strong>{titleCase(opportunity.work_mode)}</strong>
              </div>
              <div>
                <span>Location</span>
                <strong>{opportunity.location}</strong>
              </div>
              <div>
                <span>Stipend / salary</span>
                <strong>{opportunity.salary_stipend || 'Not disclosed'}</strong>
              </div>
              <div>
                <span>Minimum CGPA</span>
                <strong>{opportunity.min_cgpa ?? 'Any'}</strong>
              </div>
              <div>
                <span>Openings</span>
                <strong>{opportunity.openings ?? 'Not specified'}</strong>
              </div>
            </div>
            {existingApplication && (
              <div className="tracked-panel">
                <Badge tone="green" dot>
                  Tracked
                </Badge>
                <div>
                  <strong>{titleCase(existingApplication.status)}</strong>
                  <span>Updated {formatDate(existingApplication.updated_at)}</span>
                </div>
                <Link to="/applications" className="text-link">
                  Open tracker <ArrowRight size={14} />
                </Link>
              </div>
            )}
            <Button
              className="full-width"
              icon={existingApplication ? ClipboardList : Clock3}
              onClick={() => setModalOpen(true)}
            >
              {existingApplication ? 'Update application' : 'Track this opportunity'}
            </Button>
            <Button
              className="full-width"
              variant="secondary"
              icon={Target}
              to={`/skill-gap?opportunity_id=${opportunity.id}`}
            >
              Analyse skill gap
            </Button>
            <p className="side-disclaimer">
              <AlertCircle size={14} /> This is seeded sample data, not a verified live job. Do not treat it as a real application.
            </p>
          </Card>

          <Card>
            <CardHeader title="Key dates" description="Tracked in local time." />
            <div className="timeline">
              <div className="timeline-item active">
                <span className="timeline-dot" />
                <div>
                  <strong>Applications close</strong>
                  <span>{formatDateTime(`${opportunity.application_deadline}T23:59:00`)}</span>
                </div>
              </div>
              <div className="timeline-item">
                <span className="timeline-dot" />
                <div>
                  <strong>Added to portal</strong>
                  <span>{formatDate(opportunity.created_at)}</span>
                </div>
              </div>
              <div className="timeline-item">
                <span className="timeline-dot" />
                <div>
                  <strong>Last updated</strong>
                  <span>{formatDate(opportunity.updated_at)}</span>
                </div>
              </div>
            </div>
          </Card>

          <div className="side-note">
            <Briefcase size={17} />
            <p>
              <strong>Eligibility is guidance, not a guarantee.</strong>
              Always verify criteria with your placement cell before applying.
            </p>
          </div>
        </aside>
      </div>

      <TrackApplicationModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        opportunity={opportunity}
        existing={existingApplication}
        onSaved={afterSaved}
      />
    </div>
  );
}

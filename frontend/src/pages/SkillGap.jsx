import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  Info,
  Map,
  Plus,
  Sparkles,
  Target,
  TrendingUp,
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
  EmptyState,
  ErrorState,
  Loader,
  Notice,
  PageHeader,
  ProgressBar,
  Select,
} from '../components/ui.jsx';
import { titleCase } from '../utils/format.js';

const FILTERS = [
  { value: 'all', label: 'All skills' },
  { value: 'required', label: 'Required' },
  { value: 'preferred', label: 'Preferred' },
  { value: 'gaps', label: 'Gaps only' },
  { value: 'strong', label: 'Strengths' },
];

export default function SkillGap() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const opportunityId = searchParams.get('opportunity_id');
  const roleParam = searchParams.get('role') || '';
  const roles = useApi('/skill-gap/roles');
  const path = opportunityId ? `/skill-gap?opportunity_id=${opportunityId}` : `/skill-gap${roleParam ? `?role=${encodeURIComponent(roleParam)}` : ''}`;
  const gapApi = useApi(path);
  const [filter, setFilter] = useState('all');
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!opportunityId && !roleParam && gapApi.data?.role && roles.data) {
      const next = new URLSearchParams(searchParams);
      next.set('role', gapApi.data.role);
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gapApi.data?.role, opportunityId, roleParam]);

  const gap = gapApi.data;
  const items = useMemo(() => {
    if (!gap) return [];
    if (filter === 'required') return gap.items.filter((item) => item.importance === 'required');
    if (filter === 'preferred') return gap.items.filter((item) => item.importance === 'preferred');
    if (filter === 'gaps') return gap.items.filter((item) => item.status !== 'strong');
    if (filter === 'strong') return gap.items.filter((item) => item.status === 'strong');
    return gap.items;
  }, [gap, filter]);

  const selectRole = (role) => {
    if (!role) return;
    setFilter('all');
    setSearchParams({ role });
  };

  const generateRoadmap = async () => {
    setGenerating(true);
    try {
      const response = await api.post('/roadmap/generate', {
        ...(gap.mode === 'role' ? { role: gap.role } : {}),
        use_ai: false,
      });
      toast.success(response.message || 'Roadmap generated.');
      navigate('/roadmap');
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setGenerating(false);
    }
  };

  if (gapApi.loading) return <Loader label="Comparing your skills with the target role…" />;
  if (gapApi.error) return <ErrorState message={gapApi.error} onRetry={gapApi.reload} />;
  if (!gap) return null;

  const requiredGaps = gap.gaps.filter((item) => item.importance === 'required');
  const readinessTone = gap.readiness >= 70 ? 'green' : gap.readiness >= 40 ? 'amber' : 'red';

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Skill-gap analysis"
        title={gap.mode === 'opportunity' ? `Gap for ${gap.target_label}` : `Readiness for ${gap.role}`}
        description="Compare your self-reported skills with the requirements configured for this role. Missing preferred skills never block eligibility."
        actions={
          <>
            <Button variant="secondary" to="/profile" icon={Plus}>
              Update skills
            </Button>
            <Button icon={Sparkles} onClick={generateRoadmap} loading={generating}>
              Generate roadmap
            </Button>
          </>
        }
      />

      {gap.mode === 'opportunity' && (
        <Notice tone="info" icon={Info}>
          This analysis is scoped to a specific opportunity. Prefer a role-wide view?{' '}
          <Link to="/skill-gap">Switch to your target role</Link>.
        </Notice>
      )}

      <Notice tone="warning" icon={Info}>
        {gap.caveat} Levels are self-reported for preparation planning and are not test scores or verified credentials.
      </Notice>

      <Card className="role-selector-card">
        <div className="role-selector-copy">
          <span className="role-selector-icon">
            <Target size={20} />
          </span>
          <div>
            <strong>Compare another role</strong>
            <p>See how ready you are for a different target, using the same confirmed skills.</p>
          </div>
        </div>
        <Select value={opportunityId ? '' : gap.role} onChange={(event) => selectRole(event.target.value)} aria-label="Choose a role to compare">
          {opportunityId && <option value="">Opportunity-specific view</option>}
          {(roles.data || [])
            .filter((role) => role.name)
            .map((role) => (
              <option key={role.name} value={role.name}>
                {role.name}
                {role.is_current ? ' (profile target)' : ''}
              </option>
            ))}
          {!roles.data?.some((role) => role.name?.toLowerCase() === gap.role?.toLowerCase()) && <option value={gap.role}>{gap.role}</option>}
        </Select>
      </Card>

      <div className="gap-summary-grid">
        <Card className="readiness-card">
          <div className="readiness-ring-wrap">
            <div className="readiness-ring" style={{ '--readiness': `${Math.max(2, gap.readiness) * 3.6}deg` }}>
              <div>
                <strong>{gap.readiness}%</strong>
                <span>required met</span>
              </div>
            </div>
          </div>
          <div className="readiness-copy">
            <Badge tone={readinessTone} dot>
              {gap.readiness >= 70 ? 'Strong readiness' : gap.readiness >= 40 ? 'Building readiness' : 'Early stage'}
            </Badge>
            <h3>{gap.summary.required_met} of {gap.summary.required_total} required skills at level</h3>
            <p>
              {gap.summary.high_priority} high-priority gap{gap.summary.high_priority === 1 ? '' : 's'} · {gap.summary.missing} missing ·{' '}
              {gap.summary.weak} below target
            </p>
          </div>
        </Card>
        <Card className="gap-stat-card">
          <span className="gap-stat-icon indigo">
            <CheckCircle2 size={19} />
          </span>
          <div>
            <small>Skills at or above target</small>
            <strong>{gap.summary.strong}</strong>
            <span>of {gap.summary.total} compared</span>
          </div>
        </Card>
        <Card className="gap-stat-card">
          <span className="gap-stat-icon amber">
            <TrendingUp size={19} />
          </span>
          <div>
            <small>Preferred skills met</small>
            <strong>{gap.summary.preferred_met}/{gap.summary.preferred_total}</strong>
            <span>Optional, never blocking</span>
          </div>
        </Card>
        <Card className="gap-stat-card">
          <span className="gap-stat-icon red">
            <XCircle size={19} />
          </span>
          <div>
            <small>Required gaps</small>
            <strong>{requiredGaps.length}</strong>
            <span>Priority for your roadmap</span>
          </div>
        </Card>
      </div>

      {gap.recommendations.length > 0 && (
        <Card>
          <CardHeader
            title="Recommended next actions"
            description="Ordered by priority. Start with missing required skills, then strengthen weak ones."
            action={<Badge tone="indigo">{gap.recommendations.length} actions</Badge>}
          />
          <div className="recommendation-grid">
            {gap.recommendations.map((recommendation) => (
              <div className="recommendation-card" key={recommendation.skill}>
                <div className="recommendation-head">
                  <strong>{recommendation.skill}</strong>
                  <Badge tone={recommendation.priority === 'high' ? 'red' : recommendation.priority === 'medium' ? 'amber' : 'slate'}>
                    {recommendation.priority}
                  </Badge>
                </div>
                <p>{recommendation.action}</p>
                <div className="recommendation-links">
                  <Link to={`/preparation/${recommendation.topic_slug}`} className="text-link">
                    Open prep topic <ArrowRight size={14} />
                  </Link>
                  {recommendation.resource_url && (
                    <a href={recommendation.resource_url} target="_blank" rel="noreferrer" className="text-link">
                      Learning resource <ExternalLink size={13} />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <CardHeader
          title="Skill-by-skill comparison"
          description="Your level is compared with the expected level for this role or opportunity."
          action={
            <div className="segmented">
              {FILTERS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={filter === option.value ? 'active' : ''}
                  onClick={() => setFilter(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          }
        />
        {items.length === 0 ? (
          <EmptyState
            icon={Target}
            title="No skills match this filter"
            description={filter === 'gaps' ? 'You currently meet every compared skill requirement. Keep them fresh with practice.' : 'Try another filter to see the full comparison.'}
            action={<Button variant="secondary" size="sm" onClick={() => setFilter('all')}>Show all skills</Button>}
          />
        ) : (
          <div className="table-wrap">
            <table className="data-table skill-gap-table">
              <thead>
                <tr>
                  <th>Skill</th>
                  <th>Importance</th>
                  <th>Your level</th>
                  <th>Expected</th>
                  <th>Gap</th>
                  <th>Priority</th>
                  <th>Preparation</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.name}>
                    <td>
                      <strong>{item.name}</strong>
                      <div className="cell-sub">{titleCase(item.category)}</div>
                      <p className="cell-note">{item.why}</p>
                    </td>
                    <td>
                      <Badge tone={item.importance === 'required' ? 'indigo' : 'slate'}>{item.importance}</Badge>
                    </td>
                    <td className="nowrap">
                      {item.current_proficiency ? `${item.current_proficiency}/5` : <span className="text-danger">Not added</span>}
                    </td>
                    <td className="nowrap">{item.required_proficiency}/5</td>
                    <td>
                      <div className="gap-cell">
                        <strong>{item.gap > 0 ? `−${item.gap}` : 'Met'}</strong>
                        <ProgressBar
                          value={item.progress}
                          tone={item.status === 'strong' ? 'green' : item.priority === 'high' ? 'red' : 'amber'}
                          size="sm"
                        />
                      </div>
                    </td>
                    <td>
                      <Badge tone={item.priority === 'high' ? 'red' : item.priority === 'medium' ? 'amber' : 'slate'}>{item.priority}</Badge>
                    </td>
                    <td>
                      <div className="table-actions">
                        <Link to={`/preparation/${item.topic_slug}`} className="text-link">
                          {item.topic_title || 'Study topic'}
                        </Link>
                        {item.resource_url && (
                          <a href={item.resource_url} target="_blank" rel="noreferrer" className="icon-link" aria-label={`Open resource for ${item.name}`}>
                            <ExternalLink size={15} />
                          </a>
                        )}
                        {!item.current_proficiency && (
                          <Link to="/profile#skills" className="icon-link" aria-label={`Add ${item.name} to profile`}>
                            <Plus size={15} />
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="cta-band">
        <div className="cta-band-icon">
          <Map size={24} />
        </div>
        <div>
          <strong>Ready to turn these gaps into a dated plan?</strong>
          <p>Generate a four-week roadmap from your current gaps. Dates are editable and the plan never calls external AI unless enabled.</p>
        </div>
        <Button variant="white" icon={Sparkles} onClick={generateRoadmap} loading={generating}>
          Build my roadmap
        </Button>
      </div>
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  Bookmark,
  BookmarkCheck,
  Briefcase,
  Building2,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Filter,
  Layers,
  MapPin,
  Search,
  SlidersHorizontal,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { api, errorMessage } from '../api/client.js';
import { useApi, useDebounced } from '../hooks/useApi.js';
import { useToast } from '../context/ToastContext.jsx';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  FormField,
  Input,
  Loader,
  Notice,
  PageHeader,
  Pagination,
  Select,
} from '../components/ui.jsx';
import { ELIGIBILITY, OPPORTUNITY_TYPES, WORK_MODES } from '../utils/constants.js';
import { daysUntil, deadlineLabel, formatShortDate, initials } from '../utils/format.js';

const SORTS = [
  { value: 'deadline_asc', label: 'Deadline: soonest' },
  { value: 'deadline_desc', label: 'Deadline: latest' },
  { value: 'eligibility', label: 'Best eligibility match' },
  { value: 'newest', label: 'Newest added' },
  { value: 'company_asc', label: 'Company A–Z' },
  { value: 'cgpa_desc', label: 'Highest CGPA cutoff' },
];

export default function Opportunities() {
  const [searchParams, setSearchParams] = useSearchParams();
  const toast = useToast();
  const meta = useApi('/opportunities/meta/filters');
  const [searchText, setSearchText] = useState(searchParams.get('search') || '');
  const debouncedSearch = useDebounced(searchText, 400);
  const [busyId, setBusyId] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  const params = useMemo(() => Object.fromEntries(searchParams.entries()), [searchParams]);
  const query = { ...params, limit: 9 };
  const { data: opportunities, loading, error, pagination, reload, setData } = useApi(`/opportunities${api.query(query)}`);

  useEffect(() => {
    const current = searchParams.get('search') || '';
    if (debouncedSearch === current) return;
    const next = new URLSearchParams(searchParams);
    if (debouncedSearch.trim()) next.set('search', debouncedSearch.trim());
    else next.delete('search');
    next.delete('page');
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const setParam = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value === '' || value === null || value === undefined || value === false) next.delete(key);
    else next.set(key, value);
    if (key !== 'page') next.delete('page');
    setSearchParams(next);
  };

  const resetFilters = () => {
    setSearchText('');
    setSearchParams({});
  };

  const activeFilters = [
    params.search && { key: 'search', label: `Search: ${params.search}` },
    params.type && { key: 'type', label: OPPORTUNITY_TYPES.find((item) => item.value === params.type)?.label || params.type },
    params.work_mode && { key: 'work_mode', label: WORK_MODES.find((item) => item.value === params.work_mode)?.label || params.work_mode },
    params.location && { key: 'location', label: params.location },
    params.eligibility && { key: 'eligibility', label: ELIGIBILITY[params.eligibility]?.label || params.eligibility },
    params.bookmarked === 'true' && { key: 'bookmarked', label: 'Bookmarked only' },
  ].filter(Boolean);

  const toggleBookmark = async (opportunity) => {
    setBusyId(opportunity.id);
    try {
      const result = await api.post(`/opportunities/${opportunity.id}/bookmark`);
      setData((current) =>
        (current || []).map((item) =>
          item.id === opportunity.id ? { ...item, is_bookmarked: result.data.bookmarked } : item,
        ),
      );
      toast.success(result.message);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const trackApplication = async (opportunity) => {
    setBusyId(opportunity.id);
    try {
      const result = await api.post('/applications', { opportunity_id: opportunity.id, status: 'interested' });
      setData((current) =>
        (current || []).map((item) =>
          item.id === opportunity.id ? { ...item, application_status: result.data.status } : item,
        ),
      );
      toast.success('Saved to your application tracker as interested.');
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Opportunity explorer"
        title="Find roles you can actually apply for"
        description="Search sample internships, placements and jobs. Eligibility is calculated live from your profile, so keep it up to date."
        actions={
          <Button variant="secondary" icon={SlidersHorizontal} onClick={() => setShowFilters((value) => !value)}>
            {showFilters ? 'Hide filters' : 'Show filters'}
          </Button>
        }
      />

      <Notice tone="info" icon={Sparkles}>
        <strong>All opportunities on this page are sample data.</strong> They use fictional companies and are not verified live
        openings. Use them to explore eligibility and tracking workflows.
      </Notice>

      <Card className="filter-card">
        <div className="filter-top">
          <div className="search-box">
            <Search size={18} />
            <Input
              type="search"
              placeholder="Search role, company, location or skill…"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              aria-label="Search opportunities"
            />
            {searchText && (
              <button type="button" className="search-clear" onClick={() => setSearchText('')} aria-label="Clear search">
                <X size={15} />
              </button>
            )}
          </div>
          <div className="filter-top-actions">
            <Select value={params.sort || 'deadline_asc'} onChange={(event) => setParam('sort', event.target.value)} aria-label="Sort opportunities">
              {SORTS.map((sort) => (
                <option key={sort.value} value={sort.value}>
                  {sort.label}
                </option>
              ))}
            </Select>
            <Button
              variant={params.bookmarked === 'true' ? 'primary' : 'secondary'}
              icon={params.bookmarked === 'true' ? BookmarkCheck : Bookmark}
              onClick={() => setParam('bookmarked', params.bookmarked === 'true' ? '' : 'true')}
            >
              Bookmarked
            </Button>
          </div>
        </div>

        <div className={`filter-grid ${showFilters ? '' : 'filter-grid-compact'}`}>
          <FormField label="Opportunity type" htmlFor="filter-type">
            <Select id="filter-type" value={params.type || ''} onChange={(event) => setParam('type', event.target.value)}>
              <option value="">All types</option>
              {OPPORTUNITY_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Work mode" htmlFor="filter-mode">
            <Select id="filter-mode" value={params.work_mode || ''} onChange={(event) => setParam('work_mode', event.target.value)}>
              <option value="">All modes</option>
              {WORK_MODES.map((mode) => (
                <option key={mode.value} value={mode.value}>
                  {mode.label}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Eligibility" htmlFor="filter-eligibility">
            <Select id="filter-eligibility" value={params.eligibility || ''} onChange={(event) => setParam('eligibility', event.target.value)}>
              <option value="">Any eligibility</option>
              <option value="eligible">Eligible</option>
              <option value="needs_info">Needs information</option>
              <option value="not_eligible">Not eligible</option>
            </Select>
          </FormField>
          {showFilters && (
            <FormField label="Location" htmlFor="filter-location">
              <Select id="filter-location" value={params.location || ''} onChange={(event) => setParam('location', event.target.value)}>
                <option value="">All locations</option>
                {(meta.data?.locations || []).map((location) => (
                  <option key={location} value={location}>
                    {location}
                  </option>
                ))}
              </Select>
            </FormField>
          )}
          {showFilters && (
            <FormField label="Branch" htmlFor="filter-branch" hint="Branches are shown on each role; eligibility uses your profile branch.">
              <Select id="filter-branch" disabled value={params.branch || ''}>
                <option value="">All branches (see role cards)</option>
                {(meta.data?.branches || []).map((branch) => (
                  <option key={branch} value={branch}>
                    {branch}
                  </option>
                ))}
              </Select>
            </FormField>
          )}
        </div>

        {activeFilters.length > 0 && (
          <div className="active-filters">
            <span>Active:</span>
            {activeFilters.map((filter) => (
              <button type="button" className="filter-chip" key={filter.key} onClick={() => setParam(filter.key, '')}>
                {filter.label} <X size={13} />
              </button>
            ))}
            <button type="button" className="clear-all" onClick={resetFilters}>
              Clear all
            </button>
          </div>
        )}
      </Card>

      <div className="results-bar">
        <div>
          <strong>{pagination?.total ?? 0}</strong> <span>{pagination?.total === 1 ? 'opportunity' : 'opportunities'}</span>
          {params.eligibility && <Badge tone={ELIGIBILITY[params.eligibility]?.tone}>{ELIGIBILITY[params.eligibility]?.label}</Badge>}
        </div>
        <span className="results-meta">Eligibility refreshed just now</span>
      </div>

      {loading ? (
        <Loader label="Checking your eligibility…" />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : !opportunities?.length ? (
        <EmptyState
          icon={Briefcase}
          title="No opportunities match those filters"
          description="Try removing a filter or widening your search. New sample roles are added by the placement cell."
          action={
            <Button variant="secondary" onClick={resetFilters}>
              Clear filters
            </Button>
          }
        />
      ) : (
        <div className="opportunity-grid">
          {opportunities.map((opportunity) => {
            const eligibility = ELIGIBILITY[opportunity.eligibility.status] || ELIGIBILITY.needs_info;
            const days = daysUntil(opportunity.application_deadline);
            return (
              <Card key={opportunity.id} className="opportunity-card">
                <div className="opportunity-top">
                  <div className={`company-logo tone-${companyTone(opportunity.company)}`}>{initials(opportunity.company)}</div>
                  <div className="opportunity-title">
                    <div className="opportunity-badges">
                      <Badge tone={opportunity.type === 'internship' ? 'indigo' : opportunity.type === 'placement' ? 'violet' : 'blue'}>
                        {opportunity.type}
                      </Badge>
                      {opportunity.is_sample && <Badge tone="slate">Sample</Badge>}
                    </div>
                    <Link to={`/opportunities/${opportunity.id}`}>
                      <h3>{opportunity.title}</h3>
                    </Link>
                    <p>
                      <Building2 size={14} /> {opportunity.company}
                    </p>
                  </div>
                  <button
                    type="button"
                    className={`bookmark-btn ${opportunity.is_bookmarked ? 'saved' : ''}`}
                    onClick={() => toggleBookmark(opportunity)}
                    disabled={busyId === opportunity.id}
                    aria-label={opportunity.is_bookmarked ? 'Remove bookmark' : 'Bookmark opportunity'}
                    title={opportunity.is_bookmarked ? 'Remove bookmark' : 'Bookmark opportunity'}
                  >
                    {opportunity.is_bookmarked ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
                  </button>
                </div>

                <div className="opportunity-meta-grid">
                  <span>
                    <MapPin size={14} /> {opportunity.location}
                  </span>
                  <span>
                    <Layers size={14} /> {opportunity.work_mode}
                  </span>
                  <span>
                    <CalendarClock size={14} /> {formatShortDate(opportunity.application_deadline)}
                  </span>
                  <span>
                    <Users size={14} /> {opportunity.openings ?? '—'} openings
                  </span>
                </div>

                <div className={`eligibility-panel ${eligibility.tone}`}>
                  <Badge tone={eligibility.tone} dot>
                    {eligibility.label}
                  </Badge>
                  <p>{opportunity.eligibility.summary}</p>
                </div>

                <div className="opportunity-details">
                  <div className="detail-pairs">
                    <span>
                      <small>Min CGPA</small>
                      <strong>{opportunity.min_cgpa ?? 'Any'}</strong>
                    </span>
                    <span>
                      <small>Deadline</small>
                      <strong className={days !== null && days <= 3 ? 'text-danger' : ''}>{deadlineLabel(opportunity.application_deadline)}</strong>
                    </span>
                    <span>
                      <small>Stipend / salary</small>
                      <strong>{opportunity.salary_stipend || 'Not disclosed'}</strong>
                    </span>
                  </div>
                  <div className="skill-chips">
                    {opportunity.skills.slice(0, 4).map((skill) => (
                      <span key={skill.skill_id} className={`skill-chip ${skill.importance}`}>
                        {skill.name}
                        {skill.importance === 'required' ? ` · ${skill.min_proficiency}/5` : ''}
                      </span>
                    ))}
                    {opportunity.skills.length > 4 && <span className="skill-chip more">+{opportunity.skills.length - 4}</span>}
                    {opportunity.skills.length === 0 && <span className="muted small">No skill requirements configured</span>}
                  </div>
                </div>

                <div className="opportunity-footer">
                  <Link to={`/opportunities/${opportunity.id}`} className="text-link">
                    View details <ArrowRight size={15} />
                  </Link>
                  {opportunity.application_status ? (
                    <Link to="/applications" className="tracked-tag">
                      <CheckCircle2 size={15} /> Tracked · {opportunity.application_status}
                    </Link>
                  ) : (
                    <Button
                      size="sm"
                      variant="secondary"
                      icon={Clock3}
                      loading={busyId === opportunity.id}
                      onClick={() => trackApplication(opportunity)}
                    >
                      Track interest
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Pagination pagination={pagination} onPageChange={(page) => setParam('page', page)} />

      <div className="page-footnote">
        <Filter size={15} />
        <span>
          Eligibility considers branch, batch, CGPA, extra academic requirements and mandatory skills. Preferred skills never
          block eligibility.
        </span>
      </div>
    </div>
  );
}

function companyTone(company = '') {
  const tones = ['indigo', 'violet', 'blue', 'green', 'amber', 'rose'];
  const index = [...company].reduce((sum, char) => sum + char.charCodeAt(0), 0) % tones.length;
  return tones[index];
}

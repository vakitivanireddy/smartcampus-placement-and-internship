import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Eye,
  FileText,
  Info,
  Lock,
  RefreshCw,
  Sparkles,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react';
import { api, errorMessage } from '../api/client.js';
import { useApi } from '../hooks/useApi.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  FormField,
  Loader,
  Modal,
  Notice,
  PageHeader,
  Select,
} from '../components/ui.jsx';
import { SKILL_LEVELS } from '../utils/constants.js';
import { formatDate, formatDateTime, timeAgo, titleCase } from '../utils/format.js';

export default function Resume() {
  const { refresh } = useAuth();
  const toast = useToast();
  const resumes = useApi('/resume');
  const fileInputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [result, setResult] = useState(null);
  const [selection, setSelection] = useState([]);
  const [importing, setImporting] = useState(false);
  const [lastImport, setLastImport] = useState(null);
  const [viewResume, setViewResume] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  const handleFiles = (files) => {
    const file = files?.[0];
    if (!file) return;
    setUploadError('');
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setUploadError('Only PDF resumes are accepted.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Resume must be smaller than 5 MB.');
      return;
    }
    upload(file);
  };

  const upload = async (file) => {
    setUploading(true);
    setUploadError('');
    setLastImport(null);
    try {
      const formData = new FormData();
      formData.append('resume', file);
      const response = await api.upload('/resume/upload', formData);
      setResult(response.data);
      setSelection(
        (response.data.suggestions || []).map((suggestion) => ({
          ...suggestion,
          checked: true,
          proficiency: suggestion.proficiency || 3,
        })),
      );
      await resumes.reload({ quiet: true });
      toast.success('Resume processed. Review the extracted details before importing.');
    } catch (err) {
      setUploadError(errorMessage(err));
      await resumes.reload({ quiet: true });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const importSkills = async () => {
    const chosen = selection.filter((item) => item.checked);
    if (chosen.length === 0) {
      toast.warning('Select at least one skill to import.');
      return;
    }
    setImporting(true);
    try {
      const response = await api.post(`/resume/${result.resume.id}/import-skills`, {
        skills: chosen.map((item) => ({
          ...(item.skill_id ? { skill_id: item.skill_id } : {}),
          name: item.name,
          proficiency: Number(item.proficiency),
        })),
      });
      setLastImport({ count: response.meta?.imported || chosen.length, resume: result.resume });
      setResult(null);
      setSelection([]);
      await refresh();
      toast.success(response.message);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setImporting(false);
    }
  };

  const openResume = async (resume) => {
    setViewResume(resume);
    if (!resume.extracted_text) {
      setViewLoading(true);
      try {
        const response = await api.get(`/resume/${resume.id}`);
        setViewResume(response.data);
      } catch (err) {
        toast.error(errorMessage(err));
      } finally {
        setViewLoading(false);
      }
    }
  };

  const deleteResume = async () => {
    if (!confirm) return;
    setConfirmBusy(true);
    try {
      await api.delete(`/resume/${confirm.id}`);
      toast.success('Resume record deleted. Your imported skills are unchanged.');
      setConfirm(null);
      await resumes.reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setConfirmBusy(false);
    }
  };

  if (resumes.loading) return <Loader label="Loading resume history…" />;
  if (resumes.error) return <ErrorState message={resumes.error} onRetry={resumes.reload} />;

  const list = resumes.data || [];
  const extracted = result?.resume?.extracted_data;

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Resume intelligence"
        title="Upload once, review carefully, import what is true"
        description="Extract text from a text-based PDF, review detected skills and details, then confirm what belongs on your profile. Pattern matching is not guaranteed to be complete or accurate."
        actions={
          <Button variant="secondary" to="/profile" icon={FileText}>
            Open profile
          </Button>
        }
      />

      <Notice tone="info" icon={Lock}>
        PDF files are processed in memory and are not stored on the server. Only the extracted text, metadata and skills you
        confirm are saved. Scanned or image-only PDFs cannot be read.
      </Notice>

      {lastImport && (
        <Notice tone="success" icon={CheckCircle2}>
          <strong>{lastImport.count} skill{lastImport.count === 1 ? '' : 's'} imported.</strong> Adjust proficiency levels on your{' '}
          <Link to="/profile#skills">profile</Link>, then review your <Link to="/skill-gap">skill gaps</Link>.
        </Notice>
      )}

      <div className="resume-layout">
        <div className="resume-main">
          <Card className="upload-card">
            <CardHeader title="Upload a resume" description="PDF only · maximum 5 MB · must contain selectable text." />
            <div
              className={`dropzone ${dragging ? 'dragging' : ''} ${uploading ? 'busy' : ''}`}
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                handleFiles(event.dataTransfer.files);
              }}
              onClick={() => !uploading && fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if ((event.key === 'Enter' || event.key === ' ') && !uploading) fileInputRef.current?.click();
              }}
              aria-label="Upload a PDF resume"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,.pdf"
                hidden
                onChange={(event) => handleFiles(event.target.files)}
              />
              <span className="dropzone-icon">{uploading ? <RefreshCw size={26} className="spin" /> : <UploadCloud size={26} />}</span>
              <strong>{uploading ? 'Reading your PDF…' : 'Drop your PDF here or click to browse'}</strong>
              <p>We extract text, contact details, skills, projects and certifications. You review everything before it is imported.</p>
              <Button variant="secondary" size="sm" disabled={uploading}>
                {uploading ? 'Processing…' : 'Choose PDF'}
              </Button>
            </div>
            {uploadError && (
              <div className="inline-error mt-3">
                <AlertTriangle size={15} /> {uploadError}
              </div>
            )}
          </Card>

          {result && (
            <Card className="review-card">
              <CardHeader
                title="Review extraction results"
                description={`${result.resume.original_filename} · ${formatDate(result.resume.created_at)}`}
                action={
                  <Button variant="ghost" size="sm" icon={X} onClick={() => { setResult(null); setSelection([]); }}>
                    Discard
                  </Button>
                }
              />
              {extracted?.warnings?.length > 0 && (
                <div className="warning-list">
                  {extracted.warnings.map((warning, index) => (
                    <p key={index}>
                      <AlertTriangle size={14} /> {warning}
                    </p>
                  ))}
                </div>
              )}

              <div className="extraction-grid">
                <div className="extraction-block">
                  <h4>Detected contact and education</h4>
                  <dl className="extraction-details">
                    <div>
                      <dt>Name</dt>
                      <dd>{extracted?.name || 'Not detected'}</dd>
                    </div>
                    <div>
                      <dt>Email</dt>
                      <dd>{extracted?.email || 'Not detected'}</dd>
                    </div>
                    <div>
                      <dt>Phone</dt>
                      <dd>{extracted?.phone || 'Not detected'}</dd>
                    </div>
                    <div>
                      <dt>Education</dt>
                      <dd>{extracted?.education?.length ? extracted.education.join(' · ') : 'Not detected'}</dd>
                    </div>
                  </dl>
                </div>
                <div className="extraction-block">
                  <h4>Detected projects</h4>
                  {extracted?.projects?.length ? (
                    <ul className="plain-list">
                      {extracted.projects.map((project, index) => (
                        <li key={index}>
                          <strong>{project.title}</strong>
                          {project.description && <span>{project.description}</span>}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="muted small">No projects detected. Add them manually on your profile.</p>
                  )}
                </div>
                <div className="extraction-block">
                  <h4>Detected certifications</h4>
                  {extracted?.certifications?.length ? (
                    <ul className="plain-list">
                      {extracted.certifications.map((certification, index) => (
                        <li key={index}>
                          <span>{typeof certification === 'string' ? certification : certification.title}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="muted small">No certifications detected.</p>
                  )}
                </div>
              </div>

              <div className="import-skills">
                <div className="import-skills-head">
                  <div>
                    <h4>Skills to import</h4>
                    <p>Uncheck anything that is not genuinely part of your experience, and set an honest level.</p>
                  </div>
                  <Badge tone="indigo">{selection.filter((item) => item.checked).length} selected</Badge>
                </div>
                {selection.length === 0 ? (
                  <p className="muted">No known skills were detected. Add them manually from your profile.</p>
                ) : (
                  <div className="skill-import-list">
                    {selection.map((item, index) => (
                      <label className={`skill-import-row ${item.checked ? 'checked' : ''}`} key={`${item.name}-${index}`}>
                        <input
                          type="checkbox"
                          checked={item.checked}
                          onChange={(event) =>
                            setSelection((current) =>
                              current.map((entry, entryIndex) =>
                                entryIndex === index ? { ...entry, checked: event.target.checked } : entry,
                              ),
                            )
                          }
                        />
                        <span className="skill-import-name">
                          <strong>{item.name}</strong>
                          <small>{titleCase(item.category)}</small>
                        </span>
                        <Select
                          value={item.proficiency}
                          onClick={(event) => event.preventDefault()}
                          onChange={(event) =>
                            setSelection((current) =>
                              current.map((entry, entryIndex) =>
                                entryIndex === index ? { ...entry, proficiency: Number(event.target.value) } : entry,
                              ),
                            )
                          }
                          aria-label={`Level for ${item.name}`}
                        >
                          {SKILL_LEVELS.map((level) => (
                            <option key={level.value} value={level.value}>
                              Level {level.value}
                            </option>
                          ))}
                        </Select>
                      </label>
                    ))}
                  </div>
                )}
                <div className="form-actions">
                  <Button onClick={importSkills} loading={importing} icon={Sparkles} disabled={selection.length === 0}>
                    Import selected skills
                  </Button>
                  <Link to="/profile" className="text-link">
                    Add skills manually instead
                  </Link>
                </div>
              </div>

              <details className="raw-text">
                <summary>View extracted text</summary>
                <pre>{result.resume.extracted_text}</pre>
              </details>
            </Card>
          )}

          <Card>
            <CardHeader
              title="Resume history"
              description="Extraction records are kept so you can review them. Original PDFs are not stored."
              action={<Badge tone="slate">{list.length} records</Badge>}
            />
            {list.length === 0 ? (
              <EmptyState
                icon={UploadCloud}
                title="No resumes uploaded yet"
                description="Upload a text-based PDF to extract skills and speed up profile setup."
                action={<Button variant="secondary" onClick={() => fileInputRef.current?.click()}>Choose a PDF</Button>}
              />
            ) : (
              <div className="resume-list">
                {list.map((resume) => (
                  <div className="resume-row" key={resume.id}>
                    <span className={`resume-icon ${resume.status}`}>
                      <FileText size={19} />
                    </span>
                    <div className="resume-copy">
                      <strong>{resume.original_filename}</strong>
                      <span>
                        {formatDateTime(resume.created_at)} · {(resume.file_size / 1024).toFixed(0)} KB · {resume.mime_type}
                      </span>
                      {resume.error_message && <small className="text-danger">{resume.error_message}</small>}
                      <div className="resume-tags">
                        <Badge tone={resume.status === 'processed' ? 'green' : 'red'}>{resume.status}</Badge>
                        {resume.extracted_data?.skills?.length > 0 && (
                          <Badge tone="slate">{resume.extracted_data.skills.length} skills detected</Badge>
                        )}
                        {resume.extracted_data?.page_count && <Badge tone="slate">{resume.extracted_data.page_count} pages</Badge>}
                      </div>
                    </div>
                    <div className="resume-actions">
                      <Button variant="ghost" size="sm" icon={Eye} onClick={() => openResume(resume)}>
                        View
                      </Button>
                      <button
                        type="button"
                        className="icon-btn danger"
                        aria-label={`Delete ${resume.original_filename}`}
                        onClick={() => setConfirm(resume)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <aside className="resume-side">
          <Card>
            <CardHeader title="How extraction works" description="Transparent, rule-based parsing." />
            <ol className="step-list">
              <li>
                <span>1</span>
                <div>
                  <strong>PDF text extraction</strong>
                  <p>Selectable text is read from the PDF in memory. Scanned images are rejected.</p>
                </div>
              </li>
              <li>
                <span>2</span>
                <div>
                  <strong>Pattern matching</strong>
                  <p>Known skill names and aliases are matched with word boundaries. Section headers guide project and education extraction.</p>
                </div>
              </li>
              <li>
                <span>3</span>
                <div>
                  <strong>Human review</strong>
                  <p>Nothing is imported until you select it. You control proficiency levels and can edit everything later.</p>
                </div>
              </li>
            </ol>
          </Card>

          <Card>
            <CardHeader title="Supported format" />
            <ul className="tip-list">
              <li>
                <CheckCircle2 size={16} />
                <span>Text-based PDF exported from a word processor or design tool.</span>
              </li>
              <li>
                <CheckCircle2 size={16} />
                <span>Standard section headers such as Skills, Projects and Education improve results.</span>
              </li>
              <li>
                <AlertTriangle size={16} />
                <span>Scanned documents and image-only pages cannot be parsed.</span>
              </li>
              <li>
                <Info size={16} />
                <span>Extraction is a convenience, not a verification service. Always review suggestions.</span>
              </li>
            </ul>
          </Card>

          <Card className="side-cta">
            <Download size={20} />
            <h3>No resume PDF handy?</h3>
            <p>You can add every skill, project and certification manually from your profile.</p>
            <Button variant="secondary" size="sm" to="/profile">
              Edit profile
            </Button>
          </Card>
        </aside>
      </div>

      <Modal
        open={Boolean(viewResume)}
        onClose={() => setViewResume(null)}
        title={viewResume?.original_filename || 'Resume record'}
        description={viewResume ? `${formatDateTime(viewResume.created_at)} · processed in memory, PDF not stored` : undefined}
        size="lg"
        footer={
          <Button variant="secondary" onClick={() => setViewResume(null)}>
            Close
          </Button>
        }
      >
        {viewLoading ? (
          <Loader label="Loading extracted resume…" />
        ) : viewResume ? (
          <div className="view-resume">
            {viewResume.extracted_data && (
              <div className="view-summary-grid">
                <div>
                  <span>Name</span>
                  <strong>{viewResume.extracted_data.name || '—'}</strong>
                </div>
                <div>
                  <span>Email</span>
                  <strong>{viewResume.extracted_data.email || '—'}</strong>
                </div>
                <div>
                  <span>Phone</span>
                  <strong>{viewResume.extracted_data.phone || '—'}</strong>
                </div>
                <div>
                  <span>Pages</span>
                  <strong>{viewResume.extracted_data.page_count || '—'}</strong>
                </div>
              </div>
            )}
            {viewResume.extracted_data?.skills?.length > 0 && (
              <div className="view-section">
                <h4>Detected skills</h4>
                <div className="chip-row">
                  {viewResume.extracted_data.skills.map((skill) => (
                    <Badge key={skill} tone="indigo">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {viewResume.extracted_data?.projects?.length > 0 && (
              <div className="view-section">
                <h4>Detected projects</h4>
                <ul className="plain-list">
                  {viewResume.extracted_data.projects.map((project, index) => (
                    <li key={index}>
                      <strong>{project.title}</strong>
                      {project.description && <span>{project.description}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {viewResume.extracted_text && (
              <div className="view-section">
                <h4>Extracted text</h4>
                <pre className="text-preview">{viewResume.extracted_text}</pre>
              </div>
            )}
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        onConfirm={deleteResume}
        title="Delete this resume record?"
        description="The extraction record and extracted text will be deleted. Skills already imported to your profile stay in place."
        confirmLabel="Delete record"
        loading={confirmBusy}
      />
    </div>
  );
}

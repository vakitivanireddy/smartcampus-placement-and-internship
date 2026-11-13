import { useEffect, useState } from 'react';
import { api, errorMessage } from '../api/client.js';
import { useToast } from '../context/ToastContext.jsx';
import { Button, FormField, Input, Modal, Select, Textarea } from './ui.jsx';
import { APPLICATION_STATUSES } from '../utils/constants.js';
import { toDateTimeLocal, todayISO } from '../utils/format.js';

const emptyForm = {
  status: 'interested',
  applied_date: '',
  assessment_date: '',
  interview_date: '',
  notes: '',
};

export default function TrackApplicationModal({ open, onClose, opportunity, existing, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setError('');
    if (existing) {
      setForm({
        status: existing.status || 'interested',
        applied_date: existing.applied_date || '',
        assessment_date: toDateTimeLocal(existing.assessment_date),
        interview_date: toDateTimeLocal(existing.interview_date),
        notes: existing.notes || '',
      });
    } else {
      setForm({ ...emptyForm, status: 'interested' });
    }
  }, [open, existing]);

  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    const payload = {
      status: form.status,
      applied_date: form.applied_date || null,
      assessment_date: form.assessment_date || null,
      interview_date: form.interview_date || null,
      notes: form.notes.trim(),
    };
    try {
      if (existing) {
        await api.put(`/applications/${existing.id}`, payload);
        toast.success('Application updated.');
      } else {
        await api.post('/applications', { ...payload, opportunity_id: opportunity.id });
        toast.success('Application added to your tracker.');
      }
      onSaved?.();
      onClose?.();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={existing ? 'Update application' : 'Track this opportunity'}
      description={opportunity ? `${opportunity.title} · ${opportunity.company}` : undefined}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={submit} loading={saving} type="submit" form="track-application-form">
            {existing ? 'Save changes' : 'Add to tracker'}
          </Button>
        </>
      }
    >
      <form id="track-application-form" className="form-stack" onSubmit={submit}>
        {error && <div className="inline-error">{error}</div>}
        <FormField label="Status" htmlFor="track-status" required hint={APPLICATION_STATUSES.find((s) => s.value === form.status)?.hint}>
          <Select id="track-status" value={form.status} onChange={update('status')}>
            {APPLICATION_STATUSES.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </Select>
        </FormField>
        <div className="form-grid two">
          <FormField label="Applied on" htmlFor="track-applied" hint="Set automatically when you mark the status as applied.">
            <Input id="track-applied" type="date" max={todayISO()} value={form.applied_date} onChange={update('applied_date')} />
          </FormField>
          <FormField label="Assessment date & time" htmlFor="track-assessment">
            <Input id="track-assessment" type="datetime-local" value={form.assessment_date} onChange={update('assessment_date')} />
          </FormField>
        </div>
        <FormField label="Interview date & time" htmlFor="track-interview">
          <Input id="track-interview" type="datetime-local" value={form.interview_date} onChange={update('interview_date')} />
        </FormField>
        <FormField label="Notes" htmlFor="track-notes" hint="Keep this factual: contacts, rounds, preparation reminders. Maximum 2,000 characters.">
          <Textarea id="track-notes" rows={4} maxLength={2000} value={form.notes} onChange={update('notes')} placeholder="e.g. Applied through the portal. Online assessment expected next week." />
        </FormField>
        <p className="field-hint">Reminders are shown in-app only. Email and SMS delivery is not configured.</p>
      </form>
    </Modal>
  );
}

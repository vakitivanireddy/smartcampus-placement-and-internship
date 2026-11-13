import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell,
  CalendarClock,
  CheckCheck,
  ClipboardList,
  FileText,
  Info,
  Map,
  Sparkles,
  Trash2,
  Video,
} from 'lucide-react';
import { api, errorMessage } from '../api/client.js';
import { useApi } from '../hooks/useApi.js';
import { useToast } from '../context/ToastContext.jsx';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Loader,
  Notice,
  PageHeader,
} from '../components/ui.jsx';
import { formatDateTime, timeAgo } from '../utils/format.js';

const TYPE_META = {
  deadline: { icon: CalendarClock, tone: 'amber', label: 'Deadline' },
  assessment: { icon: FileText, tone: 'violet', label: 'Assessment' },
  interview: { icon: Video, tone: 'blue', label: 'Interview' },
  system: { icon: Sparkles, tone: 'indigo', label: 'System' },
  roadmap: { icon: Map, tone: 'green', label: 'Roadmap' },
  application: { icon: ClipboardList, tone: 'slate', label: 'Application' },
};

export default function Notifications() {
  const toast = useToast();
  const { data, meta, loading, error, reload } = useApi('/notifications');
  const [filter, setFilter] = useState('all');
  const [busyId, setBusyId] = useState(null);
  const [markingAll, setMarkingAll] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const notifications = data || [];
  const unread = Number(meta?.unread || 0);
  const filtered = useMemo(
    () => (filter === 'unread' ? notifications.filter((notification) => !notification.is_read) : notifications),
    [notifications, filter],
  );

  const announce = () => window.dispatchEvent(new Event('notifications:changed'));

  const markRead = async (notification) => {
    if (notification.is_read) return;
    setBusyId(notification.id);
    try {
      await api.patch(`/notifications/${notification.id}/read`);
      await reload({ quiet: true });
      announce();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const markAll = async () => {
    setMarkingAll(true);
    try {
      await api.patch('/notifications/read-all');
      toast.success('All notifications marked as read.');
      await reload({ quiet: true });
      announce();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setMarkingAll(false);
    }
  };

  const deleteNotification = async () => {
    if (!confirmDelete) return;
    setDeleteBusy(true);
    try {
      await api.delete(`/notifications/${confirmDelete.id}`);
      toast.success('Notification removed.');
      setConfirmDelete(null);
      await reload({ quiet: true });
      announce();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setDeleteBusy(false);
    }
  };

  if (loading) return <Loader label="Loading notifications…" />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Notifications"
        title="Reminders, without the noise"
        description="Deadlines, assessments and interviews are surfaced here from the opportunities you saved and the applications you track."
        actions={
          <Button variant="secondary" icon={CheckCheck} onClick={markAll} loading={markingAll} disabled={unread === 0}>
            Mark all read
          </Button>
        }
      />

      <Notice tone="info" icon={Info}>
        This workspace sends <strong>in-app reminders only</strong>. No email or SMS provider is configured, so nothing is
        delivered outside the dashboard. Deadline reminders are generated from bookmarks and tracked applications.
      </Notice>

      <Card className="notification-summary">
        <div>
          <span className="notification-bell">
            <Bell size={22} />
          </span>
          <div>
            <strong>{unread} unread notification{unread === 1 ? '' : 's'}</strong>
            <p>Reminders are regenerated when you open this page, so resolved items may disappear from the unread list.</p>
          </div>
        </div>
        <div className="segmented">
          <button type="button" className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>
            All <span>{notifications.length}</span>
          </button>
          <button type="button" className={filter === 'unread' ? 'active' : ''} onClick={() => setFilter('unread')}>
            Unread <span>{unread}</span>
          </button>
        </div>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Bell}
          title={filter === 'unread' ? 'You are all caught up' : 'No notifications yet'}
          description={
            filter === 'unread'
              ? 'Every reminder has been read. New reminders will appear as deadlines or interview dates approach.'
              : 'Save or track an opportunity to receive in-app deadline and interview reminders.'
          }
          action={
            filter === 'unread' ? (
              <Button variant="secondary" onClick={() => setFilter('all')}>
                View all notifications
              </Button>
            ) : (
              <Button to="/opportunities" variant="secondary">
                Browse opportunities
              </Button>
            )
          }
        />
      ) : (
        <Card className="notification-list-card">
          <CardHeader title={filter === 'unread' ? 'Unread notifications' : 'All notifications'} description="Sorted by unread first, then newest." />
          <div className="notification-list">
            {filtered.map((notification) => {
              const typeMeta = TYPE_META[notification.type] || TYPE_META.system;
              const Icon = typeMeta.icon;
              return (
                <article className={`notification-row ${notification.is_read ? 'read' : 'unread'}`} key={notification.id}>
                  <span className={`notification-icon tone-${typeMeta.tone}`}>
                    <Icon size={18} />
                  </span>
                  <div className="notification-copy">
                    <div className="notification-title">
                      <strong>{notification.title}</strong>
                      <Badge tone={typeMeta.tone}>{typeMeta.label}</Badge>
                      {!notification.is_read && <span className="unread-dot" aria-label="Unread" />}
                    </div>
                    <p>{notification.message}</p>
                    <div className="notification-meta">
                      {notification.due_at && <span>Due {formatDateTime(notification.due_at)}</span>}
                      <span>Created {timeAgo(notification.created_at)}</span>
                    </div>
                  </div>
                  <div className="notification-actions">
                    {notification.link && (
                      <Link
                        to={notification.link}
                        className="btn btn-secondary btn-sm"
                        onClick={() => markRead(notification)}
                      >
                        Open
                      </Link>
                    )}
                    {!notification.is_read && (
                      <Button variant="ghost" size="sm" onClick={() => markRead(notification)} loading={busyId === notification.id}>
                        Mark read
                      </Button>
                    )}
                    <button
                      type="button"
                      className="icon-btn danger"
                      aria-label={`Delete notification: ${notification.title}`}
                      onClick={() => setConfirmDelete(notification)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </Card>
      )}

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
        onConfirm={deleteNotification}
        title="Delete this notification?"
        description="It will be removed permanently. A future deadline sync may create a new reminder if the deadline is still relevant."
        confirmLabel="Delete notification"
        loading={deleteBusy}
      />
    </div>
  );
}

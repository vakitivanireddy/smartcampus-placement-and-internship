const { query } = require('../db/pool');
const { listNotifications } = require('../services/notificationService');
const { notFound } = require('../utils/httpError');
const asyncHandler = require('../utils/asyncHandler');

const list = asyncHandler(async (req, res) => {
  const result = await listNotifications(req.user.id);
  res.json({
    data: result.notifications,
    meta: {
      unread: result.unread,
      channel: 'in-app only',
      note: 'Email and SMS reminders are not configured. These reminders appear inside the dashboard.',
    },
  });
});

const markRead = asyncHandler(async (req, res) => {
  const rows = await query('SELECT id FROM notifications WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  if (!rows[0]) throw notFound('Notification not found.');
  await query('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  res.json({ message: 'Notification marked as read.' });
});

const markAllRead = asyncHandler(async (req, res) => {
  await query('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [req.user.id]);
  res.json({ message: 'All notifications marked as read.' });
});

const remove = asyncHandler(async (req, res) => {
  await query('DELETE FROM notifications WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  res.json({ message: 'Notification removed.' });
});

module.exports = { list, markRead, markAllRead, remove };

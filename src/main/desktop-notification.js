'use strict';

function showDesktopNotification(Notification, { title, body }) {
  if (!Notification.isSupported()) {
    return { ok: false, error: 'Desktop notifications are not supported.' };
  }
  if (!String(title || '').trim() || !String(body || '').trim()) {
    return { ok: false, error: 'A notification needs a title and body.' };
  }
  new Notification({
    title: String(title).trim().slice(0, 100),
    body: String(body).trim().slice(0, 500),
  }).show();
  return { ok: true };
}

module.exports = { showDesktopNotification };

import React from 'react';
import { Alert, Button } from 'antd';

const KEY = 'supportSession';

export const readSupportSession = () => {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    // Only valid while the browser is still using the support token.
    if (!s || s.supportToken !== localStorage.getItem('token')) return null;
    return s;
  } catch (e) {
    return null;
  }
};

export const startSupportSession = ({ token, user, reason }) => {
  const session = {
    originalToken: localStorage.getItem('token'),
    originalUser: localStorage.getItem('user'),
    supportToken: token,
    targetName: user.fullName,
    targetEmail: user.email,
    reason,
    startedAt: Date.now()
  };
  sessionStorage.setItem(KEY, JSON.stringify(session));
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
  window.location.assign('/dashboard');
};

export const endSupportSession = () => {
  const s = readSupportSession();
  if (s) {
    localStorage.setItem('token', s.originalToken);
    if (s.originalUser) localStorage.setItem('user', s.originalUser);
  }
  sessionStorage.removeItem(KEY);
  window.location.assign('/it/user-accounts');
};

/** Shown on every page while an IT user is in a read-only "view as user" session. */
const SupportSessionBanner = () => {
  const session = readSupportSession();
  if (!session) return null;

  return (
    <Alert
      type="warning"
      banner
      showIcon
      message={
        <span>
          <strong>Support session (read-only):</strong> you are viewing the ERP as {session.targetName} ({session.targetEmail}).
          Nothing can be changed. The session ends automatically after 30 minutes.
        </span>
      }
      action={
        <Button size="small" danger onClick={endSupportSession}>
          Exit support session
        </Button>
      }
    />
  );
};

export default SupportSessionBanner;

import React, { useEffect, useState } from 'react';
import { Alert, Space, Button, message } from 'antd';
import { Link } from 'react-router-dom';
import api from '../services/api';

const fmt = (d) => (d ? new Date(d).toLocaleDateString() : null);

/**
 * Shows, at the top of the dashboard, who the user has delegated to and whose approvals
 * they are currently covering (the simple "Delegate My Approvals" feature).
 */
const DelegationBanner = () => {
  const [mine, setMine] = useState(null);
  const [covering, setCovering] = useState([]);
  const actingName = localStorage.getItem('actingAsName');

  const startActing = async (c) => {
    try {
      const res = await api.get(`/delegation/acting-profile/${c.userId}`);
      const profile = res.data.data;
      localStorage.setItem('realUser', localStorage.getItem('realUser') || localStorage.getItem('user') || '');
      localStorage.setItem('user', JSON.stringify(profile));
      localStorage.setItem('actingAsEmail', profile.email);
      localStorage.setItem('actingAsName', profile.fullName);
      window.location = '/dashboard';
    } catch (e) {
      message.error(e.response?.data?.message || 'Could not switch to acting mode');
    }
  };

  const stopActing = () => {
    const real = localStorage.getItem('realUser');
    if (real) localStorage.setItem('user', real);
    localStorage.removeItem('realUser');
    localStorage.removeItem('actingAsEmail');
    localStorage.removeItem('actingAsName');
    window.location = '/dashboard';
  };

  useEffect(() => {
    if (actingName) return undefined;
    let live = true;
    Promise.all([
      api.get('/delegation/me').catch(() => null),
      api.get('/delegation/delegators').catch(() => null)
    ]).then(([m, d]) => {
      if (!live) return;
      const md = m?.data?.data;
      setMine(md?.isActive ? md.delegation : null);
      setCovering(d?.data?.data || []);
    });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (actingName) {
    return (
      <Alert
        style={{ marginBottom: 16 }}
        type="error"
        showIcon
        message={`You are acting as ${actingName}`}
        description="Everything you do is done in their name and goes through their approval lines. Your own identity is recorded in the audit trail."
        action={<Button size="small" danger onClick={stopActing}>Exit acting mode</Button>}
      />
    );
  }

  if (!mine && covering.length === 0) return null;

  return (
    <Space direction="vertical" style={{ width: '100%', marginBottom: 16 }}>
      {covering.map((c) => (
        <Alert
          key={c.userId}
          type="warning"
          showIcon
          message={`You are covering approvals for ${c.fullName}`}
          description={`${c.position ? `${c.position}, ` : ''}${c.department || ''}. ${c.fromDate ? `From ${fmt(c.fromDate)}` : ''}${c.untilDate ? ` until ${fmt(c.untilDate)}` : ' with no end date'}${c.reason ? `. Reason: ${c.reason}` : ''}. Use “Act as” to work in their name; otherwise anything you approve is recorded under your own name.`}
          action={
            <Space>
              <Button size="small" type="primary" onClick={() => startActing(c)}>Act as {c.fullName.split(' ')[0]}</Button>
              <Link to="/delegation"><Button size="small">Details</Button></Link>
            </Space>
          }
        />
      ))}
      {mine && (
        <Alert
          type="info"
          showIcon
          message={`Your approvals are delegated to ${mine.delegateName}`}
          description={`${mine.untilDate ? `Until ${fmt(mine.untilDate)}` : 'No end date'}${mine.reason ? `. Reason: ${mine.reason}` : ''}.`}
          action={<Link to="/delegation"><Button size="small">Manage</Button></Link>}
        />
      )}
    </Space>
  );
};

export default DelegationBanner;

import React, { useCallback, useEffect, useState } from 'react';
import {
  Card, Row, Col, Statistic, Tabs, Table, Tag, Typography, Button, Space, Select, Input,
  Progress, Alert, Spin, message
} from 'antd';
import {
  DashboardOutlined, ReloadOutlined, DatabaseOutlined, TeamOutlined, BugOutlined,
  ClockCircleOutlined, SearchOutlined
} from '@ant-design/icons';
import api from '../../services/api';

const { Title, Text } = Typography;

const fmtUptime = (s) => {
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${d ? d + 'd ' : ''}${h}h ${m}m`;
};

const ITSystemMonitoring = () => {
  const [overview, setOverview] = useState(null);
  const [loadingOverview, setLoadingOverview] = useState(false);

  const [errors, setErrors] = useState({ data: [], total: 0, page: 1 });
  const [errorFilters, setErrorFilters] = useState({ hours: 24, status: undefined, search: '' });
  const [loadingErrors, setLoadingErrors] = useState(false);

  const [activity, setActivity] = useState({ data: [], total: 0, page: 1 });
  const [loadingActivity, setLoadingActivity] = useState(false);

  const [logins, setLogins] = useState([]);
  const [loadingLogins, setLoadingLogins] = useState(false);

  const loadOverview = useCallback(async () => {
    setLoadingOverview(true);
    try {
      const res = await api.get('/it-admin/overview');
      setOverview(res.data.data);
    } catch (e) {
      message.error(e?.response?.data?.message || 'Failed to load system overview');
    } finally {
      setLoadingOverview(false);
    }
  }, []);

  const loadErrors = useCallback(async (page = 1, f = errorFilters) => {
    setLoadingErrors(true);
    try {
      const res = await api.get('/it-admin/logs/errors', {
        params: { page, limit: 50, hours: f.hours || undefined, status: f.status, search: f.search || undefined }
      });
      setErrors({ data: res.data.data, total: res.data.pagination.total, page });
    } catch (e) {
      message.error(e?.response?.data?.message || 'Failed to load error log');
    } finally {
      setLoadingErrors(false);
    }
  }, [errorFilters]);

  const loadActivity = useCallback(async (page = 1) => {
    setLoadingActivity(true);
    try {
      const res = await api.get('/it-admin/logs/activity', { params: { page, limit: 50 } });
      setActivity({ data: res.data.data, total: res.data.pagination.total, page });
    } catch (e) {
      message.error(e?.response?.data?.message || 'Failed to load activity log');
    } finally {
      setLoadingActivity(false);
    }
  }, []);

  const loadLogins = useCallback(async () => {
    setLoadingLogins(true);
    try {
      const res = await api.get('/it-admin/logs/logins', { params: { limit: 100 } });
      setLogins(res.data.data);
    } catch (e) {
      message.error(e?.response?.data?.message || 'Failed to load login history');
    } finally {
      setLoadingLogins(false);
    }
  }, []);

  useEffect(() => { loadOverview(); loadErrors(1); loadActivity(1); loadLogins(); /* eslint-disable-next-line */ }, []);

  const refreshAll = () => { loadOverview(); loadErrors(1); loadActivity(1); loadLogins(); };

  const o = overview;

  const overviewTab = !o ? <Spin /> : (
    <>
      {o.server.database !== 'connected' && (
        <Alert type="error" showIcon style={{ marginBottom: 16 }} message={`Database is ${o.server.database}`} />
      )}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card><Statistic title="Database" value={o.server.database} prefix={<DatabaseOutlined />}
            valueStyle={{ color: o.server.database === 'connected' ? '#52c41a' : '#f5222d' }} /></Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card><Statistic title="Server uptime" value={fmtUptime(o.server.uptimeSeconds)} prefix={<ClockCircleOutlined />} /></Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card><Statistic title="Errors (24h)" value={o.errors.last24h} prefix={<BugOutlined />}
            valueStyle={{ color: o.errors.last24h > 0 ? '#faad14' : '#52c41a' }} /></Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card><Statistic title="Active users" value={`${o.users.active} / ${o.users.total}`} prefix={<TeamOutlined />} /></Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card title="Server">
            <p><Text type="secondary">Node</Text> {o.server.nodeVersion} &nbsp; <Text type="secondary">Environment</Text> {o.server.environment}</p>
            <p>Memory (RSS) {o.server.memoryMb.rss} MB</p>
            <Progress percent={Math.min(100, Math.round((o.server.memoryMb.heapUsed / Math.max(o.server.memoryMb.rss, 1)) * 100))}
              format={() => `heap ${o.server.memoryMb.heapUsed} MB`} />
            <p style={{ marginTop: 12 }}>
              <Text type="secondary">Logged in last 24h:</Text> {o.users.loggedInLast24h} &nbsp;
              <Text type="secondary">IT actions last 24h:</Text> {o.itActionsLast24h}
            </p>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Most frequent failures (24h)">
            <Table
              size="small"
              rowKey={(r) => `${r.method}${r.url}${r.status}`}
              pagination={false}
              dataSource={o.errors.topFailing}
              locale={{ emptyText: 'No server errors in the last 24 hours' }}
              columns={[
                { title: 'Endpoint', render: (_, r) => <span><Tag>{r.method}</Tag><Text code>{r.url}</Text></span>, ellipsis: true },
                { title: 'Status', dataIndex: 'status', width: 70 },
                { title: 'Count', dataIndex: 'count', width: 70 }
              ]}
            />
          </Card>
        </Col>
      </Row>

      <Card title="Users by role" style={{ marginTop: 16 }}>
        <Space wrap>
          {o.users.byRole.map((r) => <Tag key={r.role}>{r.role}: {r.count}</Tag>)}
        </Space>
      </Card>
    </>
  );

  const errorsTab = (
    <>
      <Space wrap style={{ marginBottom: 12 }}>
        <Select
          value={errorFilters.hours}
          style={{ width: 150 }}
          onChange={(v) => setErrorFilters({ ...errorFilters, hours: v })}
          options={[{ value: 1, label: 'Last hour' }, { value: 24, label: 'Last 24 hours' }, { value: 168, label: 'Last 7 days' }, { value: 0, label: 'All (30 days)' }]}
        />
        <Select
          allowClear placeholder="Status" style={{ width: 120 }}
          value={errorFilters.status}
          onChange={(v) => setErrorFilters({ ...errorFilters, status: v })}
          options={[500, 501, 502, 503, 504].map((s) => ({ value: s, label: s }))}
        />
        <Input
          allowClear prefix={<SearchOutlined />} placeholder="URL contains…" style={{ width: 240 }}
          value={errorFilters.search}
          onChange={(e) => setErrorFilters({ ...errorFilters, search: e.target.value })}
          onPressEnter={() => loadErrors(1, errorFilters)}
        />
        <Button type="primary" onClick={() => loadErrors(1, errorFilters)}>Apply</Button>
      </Space>
      <Table
        rowKey="_id"
        size="small"
        loading={loadingErrors}
        dataSource={errors.data}
        scroll={{ x: 900 }}
        pagination={{ current: errors.page, total: errors.total, pageSize: 50, onChange: (p) => loadErrors(p) }}
        columns={[
          { title: 'Time', dataIndex: 'createdAt', width: 170, render: (d) => new Date(d).toLocaleString() },
          { title: 'Request', render: (_, r) => <span><Tag>{r.method}</Tag><Text code>{r.url}</Text></span>, ellipsis: true },
          { title: 'Status', dataIndex: 'status', width: 80, render: (s) => <Tag color="red">{s}</Tag> },
          { title: 'Message', dataIndex: 'message', ellipsis: true },
          { title: 'User', render: (_, r) => r.userEmail ? `${r.userEmail} (${r.userRole})` : <Text type="secondary">—</Text>, width: 220, ellipsis: true },
          { title: 'ms', dataIndex: 'durationMs', width: 70 }
        ]}
      />
    </>
  );

  const activityTab = (
    <Table
      rowKey="_id"
      size="small"
      loading={loadingActivity}
      dataSource={activity.data}
      scroll={{ x: 900 }}
      pagination={{ current: activity.page, total: activity.total, pageSize: 50, onChange: (p) => loadActivity(p) }}
      columns={[
        { title: 'Time', dataIndex: 'createdAt', width: 170, render: (d) => new Date(d).toLocaleString() },
        { title: 'Action', dataIndex: 'action', width: 200, render: (a) => <Tag color="blue">{a}</Tag> },
        { title: 'By', render: (_, r) => `${r.performedByName || ''} (${r.performedByRole || ''})`, width: 200 },
        { title: 'Target', dataIndex: 'targetName', width: 180 },
        { title: 'Details', dataIndex: 'description', ellipsis: true },
        { title: 'IP', dataIndex: 'ip', width: 130 }
      ]}
    />
  );

  const loginsTab = (
    <Table
      rowKey="_id"
      size="small"
      loading={loadingLogins}
      dataSource={logins}
      pagination={{ pageSize: 25 }}
      columns={[
        { title: 'Last login', dataIndex: 'lastLogin', width: 180, render: (d) => new Date(d).toLocaleString() },
        { title: 'User', dataIndex: 'fullName' },
        { title: 'Email', dataIndex: 'email' },
        { title: 'Role', dataIndex: 'role', width: 120, render: (r) => <Tag>{r}</Tag> },
        { title: 'Department', dataIndex: 'department', ellipsis: true },
        { title: 'Status', dataIndex: 'isActive', width: 90, render: (a) => (a ? <Tag color="green">Active</Tag> : <Tag color="red">Inactive</Tag>) }
      ]}
    />
  );

  return (
    <div>
      <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
        <Space>
          <DashboardOutlined style={{ fontSize: 24 }} />
          <Title level={3} style={{ margin: 0 }}>System Monitoring</Title>
        </Space>
        <Button icon={<ReloadOutlined />} onClick={refreshAll} loading={loadingOverview}>Refresh</Button>
      </Space>

      <Card>
        <Tabs
          items={[
            { key: 'overview', label: 'Overview', children: overviewTab },
            { key: 'errors', label: `Server errors${errors.total ? ` (${errors.total})` : ''}`, children: errorsTab },
            { key: 'activity', label: 'IT activity log', children: activityTab },
            { key: 'logins', label: 'Recent logins', children: loginsTab }
          ]}
        />
      </Card>
    </div>
  );
};

export default ITSystemMonitoring;

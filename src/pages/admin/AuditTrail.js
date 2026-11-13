import React, { useCallback, useEffect, useState } from 'react';
import { Card, Table, Select, Input, DatePicker, Space, Tag, Typography, Button, message, Alert } from 'antd';
import { AuditOutlined, ReloadOutlined } from '@ant-design/icons';
import api from '../../services/api';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const ACTION_COLOR = { create: 'green', update: 'blue', delete: 'red', export: 'purple' };
const show = (v) => (v === null || v === undefined || v === '' ? <Text type="secondary">empty</Text> : <code style={{ wordBreak: 'break-all' }}>{String(v)}</code>);

const AuditTrail = () => {
  const [rows, setRows] = useState([]);
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({});

  const load = useCallback(async (pg = 1, f = filters) => {
    setLoading(true);
    try {
      const params = { page: pg, limit: 50, model: f.model, action: f.action, q: f.q || undefined };
      if (f.range?.[0]) { params.from = f.range[0].startOf('day').toISOString(); params.to = f.range[1].endOf('day').toISOString(); }
      const res = await api.get('/audit-trail/changes', { params });
      setRows(res.data.data || []); setTotal(res.data.total || 0); setPage(pg);
    } catch (e) {
      message.error(e?.response?.data?.message || 'Failed to load the audit trail');
    } finally { setLoading(false); }
  }, [filters]);

  useEffect(() => {
    api.get('/audit-trail/models').then((r) => setModels(r.data.data || [])).catch(() => {});
    load(1, {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = (patch) => { const f = { ...filters, ...patch }; setFilters(f); load(1, f); };

  const columns = [
    { title: 'When', dataIndex: 'at', width: 170, render: (v) => new Date(v).toLocaleString() },
    { title: 'Who', key: 'who', width: 200, render: (_, r) => r.actor?.system ? <Tag>system</Tag> : (<div>{r.actor?.name || r.actor?.email || '-'}<br /><Text type="secondary" style={{ fontSize: 12 }}>{r.actor?.role}{r.actor?.impersonatedBy ? ' (support session)' : ''}</Text></div>) },
    { title: 'Action', dataIndex: 'action', width: 90, render: (a) => <Tag color={ACTION_COLOR[a]}>{a}</Tag> },
    { title: 'Record', key: 'rec', render: (_, r) => (<div>{r.model}<br /><Text type="secondary" style={{ fontSize: 12 }}>{r.recordLabel}</Text></div>) },
    { title: 'Fields', key: 'f', width: 90, align: 'center', render: (_, r) => r.changes?.length || 0 }
  ];

  return (
    <div>
      <Space align="center" style={{ marginBottom: 16 }}>
        <AuditOutlined style={{ fontSize: 24 }} />
        <Title level={3} style={{ margin: 0 }}>Audit Trail</Title>
      </Space>
      <Alert type="info" showIcon style={{ marginBottom: 16 }} message="Every change to key records (users, suppliers, invoices, cash requests, requisitions, purchase orders, accounts...) is recorded with who made it, when, and the old and new value. Passwords and tokens are never stored. You only see record types your role is responsible for." />
      <Card>
        <Space wrap style={{ marginBottom: 16 }}>
          <Select allowClear placeholder="Record type" style={{ width: 200 }} options={models.map((m) => ({ value: m, label: m }))} onChange={(v) => set({ model: v })} />
          <Select allowClear placeholder="Action" style={{ width: 130 }} onChange={(v) => set({ action: v })}
            options={['create', 'update', 'delete', 'export'].map((a) => ({ value: a, label: a }))} />
          <RangePicker onChange={(v) => set({ range: v })} />
          <Input.Search allowClear placeholder="Record, person or field" style={{ width: 240 }} onSearch={(v) => set({ q: v })} />
          <Button icon={<ReloadOutlined />} onClick={() => load(page)}>Refresh</Button>
        </Space>
        <Table
          rowKey="_id" size="middle" loading={loading} columns={columns} dataSource={rows}
          pagination={{ current: page, pageSize: 50, total, showSizeChanger: false, onChange: (p) => load(p) }}
          expandable={{
            rowExpandable: (r) => r.changes?.length > 0,
            expandedRowRender: (r) => (
              <Table size="small" pagination={false} rowKey="field" dataSource={r.changes}
                columns={[
                  { title: 'Field', dataIndex: 'field', width: 220 },
                  { title: 'Before', dataIndex: 'old', render: (v, c) => c.masked ? <Text type="secondary">hidden</Text> : show(v) },
                  { title: 'After', dataIndex: 'new', render: (v, c) => c.masked ? <Text type="secondary">changed (hidden)</Text> : show(v) }
                ]} />
            )
          }}
        />
      </Card>
    </div>
  );
};

export default AuditTrail;

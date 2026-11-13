import React, { useCallback, useEffect, useState } from 'react';
import {
  Tabs, Card, Button, Space, Tag, Table, Modal, Form, Input, InputNumber, Select, Typography, message, Popconfirm,
  Drawer, Alert, Row, Col, Statistic, Timeline, Divider, Radio, Upload, List, Badge
} from 'antd';
import { PlusOutlined, EditOutlined, CheckOutlined, CloseOutlined, DeleteOutlined, SendOutlined, UploadOutlined, PaperClipOutlined, DollarOutlined } from '@ant-design/icons';
import { useSelector } from 'react-redux';
import api from '../../services/api';

const { Title, Text } = Typography;
const STATUS_COLOR = { draft: 'default', pending_manager: 'gold', pending_finance: 'orange', approved: 'cyan', rejected: 'red', settled: 'green' };
const STATUS_LABEL = { draft: 'Draft', pending_manager: 'Awaiting manager', pending_finance: 'Awaiting finance', approved: 'Approved', rejected: 'Rejected', settled: 'Settled' };
const CATEGORIES = [
  ['transport', 'Transport'], ['accommodation', 'Accommodation'], ['meals', 'Meals'], ['per_diem', 'Per diem'], ['fuel', 'Fuel'],
  ['communication', 'Communication'], ['supplies', 'Supplies'], ['training', 'Training'], ['other', 'Other']
];
const money = (v) => `${Math.round(Number(v) || 0).toLocaleString()} XAF`;
const errMsg = (e, fb) => e?.response?.data?.message || fb;
const d10 = (d) => (d ? String(d).slice(0, 10) : '');
const FINANCE = ['finance', 'admin'];

// ───────────────────────────── Claim form ─────────────────────────────
const ItemsEditor = ({ value = [], onChange }) => (
  <Space direction="vertical" style={{ width: '100%' }}>
    {value.map((it, i) => {
      const set = (patch) => onChange(value.map((x, j) => (j === i ? { ...x, ...patch } : x)));
      const pd = it.category === 'per_diem';
      return (
        <Space key={i} wrap align="center" style={{ background: '#fafafa', padding: 8, borderRadius: 6 }}>
          <Input type="date" value={d10(it.date)} onChange={(e) => set({ date: e.target.value })} style={{ width: 150 }} />
          <Select value={it.category} onChange={(v) => set({ category: v })} style={{ width: 140 }} options={CATEGORIES.map(([v, l]) => ({ value: v, label: l }))} />
          <Input placeholder="Description" value={it.description} onChange={(e) => set({ description: e.target.value })} style={{ width: 200 }} />
          {pd ? (
            <>
              <InputNumber min={0} placeholder="Days" value={it.days} onChange={(v) => set({ days: v })} style={{ width: 80 }} />
              <InputNumber min={0} placeholder="Rate/day" value={it.rate} onChange={(v) => set({ rate: v })} style={{ width: 120 }} />
              <Text type="secondary">= {money((it.days || 0) * (it.rate || 0))}</Text>
            </>
          ) : (
            <InputNumber min={0} placeholder="Amount" value={it.amount} onChange={(v) => set({ amount: v })} style={{ width: 140 }} />
          )}
          <Button icon={<DeleteOutlined />} onClick={() => onChange(value.filter((_, j) => j !== i))} />
        </Space>
      );
    })}
    <Button icon={<PlusOutlined />} onClick={() => onChange([...value, { date: new Date().toISOString().slice(0, 10), category: 'transport', description: '', amount: 0 }])}>Add line</Button>
  </Space>
);

const ClaimForm = ({ claim, open, onClose, onSaved }) => {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const type = Form.useWatch('type', form);
  useEffect(() => {
    if (!open) return;
    form.resetFields();
    form.setFieldsValue(claim ? {
      title: claim.title, type: claim.type, items: claim.items,
      destination: claim.mission?.destination, purpose: claim.mission?.purpose,
      startDate: d10(claim.mission?.startDate), endDate: d10(claim.mission?.endDate),
      advRef: claim.advance?.reference, advAmount: claim.advance?.amount
    } : { type: 'expense', items: [], advAmount: 0 });
  }, [open, claim, form]);

  const save = async () => {
    try {
      const v = await form.validateFields();
      setSaving(true);
      const body = {
        title: v.title, type: v.type, items: v.items || [],
        mission: v.type === 'mission' ? { destination: v.destination, purpose: v.purpose, startDate: v.startDate, endDate: v.endDate } : undefined,
        advance: { reference: v.advRef, amount: v.advAmount || 0 }
      };
      const r = claim ? await api.put(`/expenses/claims/${claim._id}`, body) : await api.post('/expenses/claims', body);
      message.success('Saved');
      onSaved(r.data.data);
    } catch (e) { if (e?.response) message.error(errMsg(e, 'Could not save')); } finally { setSaving(false); }
  };

  return (
    <Modal open={open} width={820} title={claim ? `Edit ${claim.claimNumber}` : 'New expense claim'} onCancel={onClose} onOk={save} confirmLoading={saving} okText="Save draft" destroyOnClose>
      <Form form={form} layout="vertical">
        <Row gutter={12}>
          <Col span={16}><Form.Item name="title" label="Title" rules={[{ required: true }]}><Input placeholder="e.g. Site visit Douala, October" /></Form.Item></Col>
          <Col span={8}><Form.Item name="type" label="Type"><Radio.Group optionType="button" options={[{ value: 'expense', label: 'Expense' }, { value: 'mission', label: 'Mission' }]} /></Form.Item></Col>
        </Row>
        {type === 'mission' && (
          <Row gutter={12}>
            <Col span={8}><Form.Item name="destination" label="Destination"><Input /></Form.Item></Col>
            <Col span={8}><Form.Item name="startDate" label="From"><Input type="date" /></Form.Item></Col>
            <Col span={8}><Form.Item name="endDate" label="To"><Input type="date" /></Form.Item></Col>
            <Col span={24}><Form.Item name="purpose" label="Purpose"><Input.TextArea rows={2} /></Form.Item></Col>
          </Row>
        )}
        <Form.Item name="items" label="Expense lines (per diem: enter days and the daily rate)"><ItemsEditor /></Form.Item>
        <Divider orientation="left" plain>Advance already received (optional)</Divider>
        <Row gutter={12}>
          <Col span={12}><Form.Item name="advRef" label="Reference (cash request no.)"><Input /></Form.Item></Col>
          <Col span={12}><Form.Item name="advAmount" label="Amount received"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
        </Row>
      </Form>
    </Modal>
  );
};

// ───────────────────────────── Detail ─────────────────────────────
const ClaimDrawer = ({ id, open, onClose, role, email, myId, onChanged }) => {
  const [claim, setClaim] = useState(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [edit, setEdit] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [payOpen, setPayOpen] = useState(null);
  const [acc, setAcc] = useState('521');

  const load = useCallback(() => {
    if (!id) return;
    setLoading(true);
    api.get(`/expenses/claims/${id}`).then((r) => setClaim(r.data.data)).catch((e) => message.error(errMsg(e, 'Could not load'))).finally(() => setLoading(false));
  }, [id]);
  useEffect(() => { if (open) load(); }, [open, load]);

  const act = async (path, body, ok) => {
    setBusy(true);
    try { const r = await api.post(`/expenses/claims/${id}/${path}`, body || {}); setClaim(r.data.data); message.success(ok); onChanged(); return true; }
    catch (e) { message.error(errMsg(e, 'Action failed')); return false; } finally { setBusy(false); }
  };
  const upload = async ({ file, onSuccess, onError }) => {
    const fd = new FormData(); fd.append('receipts', file);
    try { const r = await api.post(`/expenses/claims/${id}/receipts`, fd, { headers: { 'Content-Type': 'multipart/form-data' } }); setClaim(r.data.data); onSuccess('ok'); }
    catch (e) { message.error(errMsg(e, 'Upload failed')); onError(e); }
  };
  const delReceipt = async (i) => {
    try { const r = await api.delete(`/expenses/claims/${id}/receipts/${i}`); setClaim(r.data.data); } catch (e) { message.error(errMsg(e, 'Could not remove')); }
  };

  if (!open) return null;
  const c = claim;
  const mine = c && String(c.employee) === String(myId);
  const editable = mine && c && ['draft', 'rejected'].includes(c.status);
  const isMgr = c && c.manager?.email && c.manager.email === String(email || '').toLowerCase();
  const canMgr = c && c.status === 'pending_manager' && (isMgr || role === 'admin') && !mine;
  const canFin = c && c.status === 'pending_finance' && FINANCE.includes(role) && !mine;

  return (
    <Drawer open={open} onClose={onClose} width={Math.min(860, window.innerWidth)} title={c ? `${c.claimNumber}: ${c.title}` : 'Claim'} destroyOnClose>
      {loading && !c ? null : c && (
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Space wrap>
            <Tag color={STATUS_COLOR[c.status]}>{STATUS_LABEL[c.status]}</Tag>
            <Tag>{c.type === 'mission' ? 'Mission' : 'Expense'}</Tag>
            <Text type="secondary">{c.employeeName} ({c.department || '-'})</Text>
            {c.manager?.name && <Text type="secondary">Manager: {c.manager.name}</Text>}
          </Space>
          {c.status === 'rejected' && <Alert type="error" showIcon message="Rejected" description={c.rejectionReason} />}
          {c.type === 'mission' && c.mission && <Alert type="info" message={`${c.mission.destination || ''}, ${d10(c.mission.startDate)} to ${d10(c.mission.endDate)}`} description={c.mission.purpose} />}
          <Row gutter={[12, 12]}>
            <Col xs={12} md={6}><Card size="small"><Statistic title="Total claimed" value={c.total} formatter={(v) => money(v)} /></Card></Col>
            <Col xs={12} md={6}><Card size="small"><Statistic title="Advance received" value={c.advance?.amount || 0} formatter={(v) => money(v)} /></Card></Col>
            <Col xs={12} md={6}><Card size="small"><Statistic title="Owed to employee" value={c.reimbursementDue} formatter={(v) => money(v)} valueStyle={{ color: c.reimbursementDue ? '#389e0d' : undefined }} /></Card></Col>
            <Col xs={12} md={6}><Card size="small"><Statistic title="Owed to company" value={c.surplusDue} formatter={(v) => money(v)} valueStyle={{ color: c.surplusDue ? '#cf1322' : undefined }} /></Card></Col>
          </Row>
          <Space wrap>
            {editable && <Button icon={<EditOutlined />} onClick={() => setEdit(true)}>Edit</Button>}
            {editable && <Button type="primary" icon={<SendOutlined />} loading={busy} onClick={() => act('submit', {}, 'Submitted')}>Submit for approval</Button>}
            {canMgr && <Button type="primary" icon={<CheckOutlined />} loading={busy} onClick={() => act('manager-approve', {}, 'Approved, sent to finance')}>Approve (manager)</Button>}
            {canFin && (
              <Popconfirm title="Approving posts this claim to accounting. Continue?" onConfirm={() => act('finance-approve', {}, 'Approved and posted')}>
                <Button type="primary" icon={<CheckOutlined />} loading={busy}>Approve (finance) and post</Button>
              </Popconfirm>
            )}
            {(canMgr || canFin) && <Button danger icon={<CloseOutlined />} onClick={() => setRejectOpen(true)}>Reject</Button>}
            {c.status === 'approved' && FINANCE.includes(role) && c.reimbursementDue > 0 && !c.reimbursementPaid && <Button icon={<DollarOutlined />} onClick={() => setPayOpen('pay')}>Pay reimbursement</Button>}
            {c.status === 'approved' && FINANCE.includes(role) && c.surplusDue > 0 && !c.surplusReturned && <Button icon={<DollarOutlined />} onClick={() => setPayOpen('return-surplus')}>Record advance returned</Button>}
          </Space>
          <Table size="small" rowKey="_id" pagination={false} dataSource={c.items}
            columns={[
              { title: 'Date', dataIndex: 'date', render: d10, width: 100 },
              { title: 'Category', dataIndex: 'category', render: (v) => (CATEGORIES.find((x) => x[0] === v) || [v, v])[1] },
              { title: 'Description', dataIndex: 'description', render: (v, r) => (r.category === 'per_diem' ? `${v} (${r.days} d x ${Math.round(r.rate).toLocaleString()})` : v) },
              { title: 'Amount', dataIndex: 'amount', align: 'right', render: money }
            ]} />
          <Divider orientation="left" plain>Receipts</Divider>
          <List size="small" dataSource={c.receipts} locale={{ emptyText: 'No receipts attached' }}
            renderItem={(r, i) => (
              <List.Item actions={editable ? [<Button size="small" danger icon={<DeleteOutlined />} onClick={() => delReceipt(i)} />] : []}>
                <a href={r.url} target="_blank" rel="noreferrer"><PaperClipOutlined /> {r.name}</a>
              </List.Item>
            )} />
          {editable && <Upload customRequest={upload} showUploadList={false} multiple accept="image/*,application/pdf"><Button icon={<UploadOutlined />}>Add receipt (image or PDF)</Button></Upload>}
          <Divider orientation="left" plain>History</Divider>
          <Timeline items={(c.history || []).map((h) => ({ children: `${h.action.replace(/_/g, ' ')} - ${h.byName || ''} - ${new Date(h.at).toLocaleString()}${h.comment ? ` (${h.comment})` : ''}` }))} />
        </Space>
      )}
      <ClaimForm claim={c} open={edit} onClose={() => setEdit(false)} onSaved={(nc) => { setClaim(nc); setEdit(false); onChanged(); }} />
      <Modal open={rejectOpen} title="Reject claim" okText="Reject" okButtonProps={{ danger: true, disabled: !reason.trim() }} onCancel={() => setRejectOpen(false)}
        onOk={async () => { if (await act('reject', { reason }, 'Claim rejected')) { setRejectOpen(false); setReason(''); } }}>
        <Input.TextArea rows={3} placeholder="Reason (required)" value={reason} onChange={(e) => setReason(e.target.value)} />
      </Modal>
      <Modal open={!!payOpen} title={payOpen === 'pay' ? 'Pay reimbursement' : 'Record advance returned'} okText="Post" onCancel={() => setPayOpen(null)}
        onOk={async () => { if (await act(payOpen, { accountCode: acc }, 'Posted')) setPayOpen(null); }}>
        <p>{payOpen === 'pay' ? `Pay ${money(c?.reimbursementDue)} to ${c?.employeeName}.` : `${c?.employeeName} returns ${money(c?.surplusDue)}.`}</p>
        <Select value={acc} onChange={setAcc} style={{ width: 240 }} options={[{ value: '521', label: '521 Bank' }, { value: '571', label: '571 Cash' }]} />
      </Modal>
    </Drawer>
  );
};

// ───────────────────────────── Lists ─────────────────────────────
const ClaimsTable = ({ scope, status, onOpen, refreshKey, extra }) => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState(status);
  useEffect(() => {
    setLoading(true);
    api.get('/expenses/claims', { params: { scope, status: filter || undefined } }).then((r) => setRows(r.data.data))
      .catch((e) => message.error(errMsg(e, 'Could not load claims'))).finally(() => setLoading(false));
  }, [scope, filter, refreshKey]);
  return (
    <>
      <Space style={{ marginBottom: 12 }} wrap>
        {extra}
        {scope === 'all' && (
          <Select allowClear placeholder="All statuses" style={{ width: 200 }} value={filter} onChange={setFilter}
            options={Object.entries(STATUS_LABEL).map(([v, l]) => ({ value: v, label: l }))} />
        )}
      </Space>
      <Table rowKey="_id" loading={loading} dataSource={rows} pagination={{ pageSize: 12 }} scroll={{ x: 700 }}
        columns={[
          { title: 'Claim', dataIndex: 'claimNumber', width: 150 },
          { title: 'Title', dataIndex: 'title', render: (v, r) => <div>{v}<br /><Text type="secondary" style={{ fontSize: 12 }}>{r.employeeName}</Text></div> },
          { title: 'Type', dataIndex: 'type', render: (v) => <Tag>{v}</Tag> },
          { title: 'Total', dataIndex: 'total', align: 'right', render: money },
          { title: 'Status', dataIndex: 'status', render: (s) => <Tag color={STATUS_COLOR[s]}>{STATUS_LABEL[s]}</Tag> },
          { title: '', render: (_, r) => <Button size="small" onClick={() => onOpen(r._id)}>Open</Button> }
        ]} />
    </>
  );
};

const Expenses = () => {
  const { user } = useSelector((s) => s.auth);
  const role = user?.role;
  const [openId, setOpenId] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [key, setKey] = useState(0);
  const [pending, setPending] = useState(0);
  const bump = () => setKey((k) => k + 1);

  useEffect(() => { api.get('/expenses/summary').then((r) => setPending(r.data.data.toApprove || 0)).catch(() => {}); }, [key]);

  const items = [
    {
      key: 'mine', label: 'My claims',
      children: <ClaimsTable scope="mine" refreshKey={key} onOpen={setOpenId}
        extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => setFormOpen(true)}>New claim</Button>} />
    },
    { key: 'approve', label: <Badge count={pending} offset={[10, 0]}>To approve</Badge>, children: <ClaimsTable scope="manager" refreshKey={key} onOpen={setOpenId} /> },
    ...(['finance', 'admin', 'ceo'].includes(role) ? [{ key: 'all', label: 'All claims', children: <ClaimsTable scope="all" status="pending_finance" refreshKey={key} onOpen={setOpenId} /> }] : [])
  ];

  return (
    <div style={{ padding: 16 }}>
      <Title level={3} style={{ marginTop: 0 }}>Expenses</Title>
      <Card><Tabs items={items} destroyInactiveTabPane /></Card>
      <ClaimForm claim={null} open={formOpen} onClose={() => setFormOpen(false)} onSaved={(c) => { setFormOpen(false); bump(); setOpenId(c._id); }} />
      <ClaimDrawer id={openId} open={!!openId} onClose={() => setOpenId(null)} role={role} email={user?.email} myId={user?.userId || user?._id || user?.id} onChanged={bump} />
    </div>
  );
};

export default Expenses;

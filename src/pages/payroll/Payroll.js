import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Tabs, Card, Button, Space, Tag, Table, Modal, Form, Input, InputNumber, Select, Typography, message, Popconfirm,
  Drawer, Alert, Descriptions, Row, Col, Statistic, Switch, Timeline, Divider, Spin
} from 'antd';
import { PlusOutlined, EditOutlined, FilePdfOutlined, CheckOutlined, CloseOutlined, ReloadOutlined, DeleteOutlined, SendOutlined, DollarOutlined } from '@ant-design/icons';
import { useSelector } from 'react-redux';
import api from '../../services/api';

const { Title, Text } = Typography;
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const STATUS_COLOR = { draft: 'default', pending_finance: 'gold', pending_ceo: 'orange', approved: 'green', rejected: 'red', paid: 'blue' };
const STATUS_LABEL = { draft: 'Draft', pending_finance: 'Awaiting finance', pending_ceo: 'Awaiting CEO', approved: 'Approved and posted', rejected: 'Rejected', paid: 'Paid' };
const money = (v) => `${Math.round(Number(v) || 0).toLocaleString()} XAF`;
const errMsg = (e, fb) => e?.response?.data?.message || fb;

async function openPdf(url, filename) {
  try {
    const r = await api.get(url, { responseType: 'blob' });
    const href = window.URL.createObjectURL(new Blob([r.data], { type: 'application/pdf' }));
    const a = document.createElement('a'); a.href = href; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
    window.URL.revokeObjectURL(href);
  } catch (e) { message.error('Could not load the payslip'); }
}

// ───────────────────────────── My payslips ─────────────────────────────
const MyPayslips = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    setLoading(true);
    api.get('/payroll/my-payslips').then((r) => setRows(r.data.data)).catch((e) => message.error(errMsg(e, 'Could not load payslips'))).finally(() => setLoading(false));
  }, []);
  return (
    <Table rowKey="lineId" loading={loading} dataSource={rows} pagination={{ pageSize: 12 }}
      locale={{ emptyText: 'No payslips yet. They appear here once a payroll run is approved.' }}
      columns={[
        { title: 'Period', render: (_, r) => `${MONTHS[r.period.month - 1]} ${r.period.year}` },
        { title: 'Gross', dataIndex: 'gross', render: money, align: 'right' },
        { title: 'Net pay', dataIndex: 'netPay', render: money, align: 'right' },
        { title: '', render: (_, r) => <Button icon={<FilePdfOutlined />} onClick={() => openPdf(`/payroll/runs/${r.runId}/payslip/${r.lineId}`, `payslip-${r.period.year}-${r.period.month}.pdf`)}>Payslip</Button> }
      ]} />
  );
};

// ───────────────────────────── Run detail ─────────────────────────────
const RunDrawer = ({ runId, open, onClose, role, onChanged }) => {
  const [data, setData] = useState(null);
  const [legacy, setLegacy] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [adjLine, setAdjLine] = useState(null);
  const [adjList, setAdjList] = useState([]);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [payOpen, setPayOpen] = useState(false);
  const [payAcc, setPayAcc] = useState('521');

  const load = useCallback(() => {
    if (!runId) return;
    setLoading(true);
    api.get(`/payroll/runs/${runId}`).then((r) => { setData(r.data.data); setLegacy(r.data.legacyPayments || []); })
      .catch((e) => message.error(errMsg(e, 'Could not load the run'))).finally(() => setLoading(false));
  }, [runId]);
  useEffect(() => { if (open) load(); }, [open, load]);

  const act = async (path, body, okMsg) => {
    setBusy(true);
    try {
      const r = await api.post(`/payroll/runs/${runId}/${path}`, body || {});
      setData((d) => ({ ...r.data.data, preparedBy: d.preparedBy }));
      message.success(okMsg);
      onChanged();
      return true;
    } catch (e) { message.error(errMsg(e, 'Action failed')); return false; } finally { setBusy(false); }
  };

  const saveAdj = async () => {
    setBusy(true);
    try {
      const r = await api.put(`/payroll/runs/${runId}/lines/${adjLine._id}/adjustments`, { adjustments: adjList });
      setData((d) => ({ ...r.data.data, preparedBy: d.preparedBy }));
      setAdjLine(null); onChanged();
    } catch (e) { message.error(errMsg(e, 'Could not save')); } finally { setBusy(false); }
  };

  if (!open) return null;
  const run = data;
  const isHr = ['hr', 'admin'].includes(role);
  const isFin = ['finance', 'admin'].includes(role);
  const isCeo = ['ceo', 'admin'].includes(role);
  const t = run?.totals || {};

  const columns = [
    { title: 'Employee', render: (_, l) => <div>{l.name}<br /><Text type="secondary" style={{ fontSize: 12 }}>{l.department}</Text></div> },
    { title: 'Gross', render: (_, l) => money(l.result?.gross), align: 'right' },
    { title: 'CNPS', render: (_, l) => money(l.result?.cnpsEmployee), align: 'right' },
    { title: 'IRPP+CAC', render: (_, l) => money((l.result?.irpp || 0) + (l.result?.cac || 0)), align: 'right' },
    { title: 'CFC', render: (_, l) => money(l.result?.cfcEmployee), align: 'right' },
    { title: 'Other', render: (_, l) => money(l.result?.recoveryTotal), align: 'right' },
    { title: 'Net pay', render: (_, l) => <b>{money(l.result?.netPay)}</b>, align: 'right' },
    {
      title: '', render: (_, l) => (
        <Space>
          {run.status === 'draft' && isHr && <Button size="small" icon={<EditOutlined />} onClick={() => { setAdjLine(l); setAdjList((l.adjustments || []).map((a) => ({ ...a }))); }}>Adjust</Button>}
          <Button size="small" icon={<FilePdfOutlined />} onClick={() => openPdf(`/payroll/runs/${run._id}/payslip/${l._id}`, `payslip-${l.name}.pdf`)} />
        </Space>
      )
    }
  ];

  return (
    <Drawer open={open} onClose={onClose} width={Math.min(1100, window.innerWidth)} title={run ? `${run.title} (${run.runNumber})` : 'Payroll run'} destroyOnClose>
      {loading && !run ? <Spin /> : run && (
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Space wrap>
            <Tag color={STATUS_COLOR[run.status]}>{STATUS_LABEL[run.status]}</Tag>
            <Text type="secondary">Prepared by {run.preparedBy?.fullName || '-'}</Text>
          </Space>
          {run.status === 'rejected' && <Alert type="error" showIcon message="Rejected" description={run.rejectionReason} />}
          {legacy.length > 0 && <Alert type="info" showIcon message={`${legacy.length} earlier salary payment record(s) exist for this month`} description={legacy.map((p) => `${money(p.totalAmount)} (${p.status})`).join(', ')} />}
          <Row gutter={[12, 12]}>
            <Col xs={12} md={6}><Card size="small"><Statistic title="Gross" value={t.gross} formatter={(v) => money(v)} /></Card></Col>
            <Col xs={12} md={6}><Card size="small"><Statistic title="Net pay" value={t.net} formatter={(v) => money(v)} /></Card></Col>
            <Col xs={12} md={6}><Card size="small"><Statistic title="Employer charges" value={t.employerTotal} formatter={(v) => money(v)} /></Card></Col>
            <Col xs={12} md={6}><Card size="small"><Statistic title="Total cost" value={t.employerCost} formatter={(v) => money(v)} /></Card></Col>
          </Row>
          <Space wrap>
            {['draft', 'rejected'].includes(run.status) && isHr && (
              <Button type="primary" icon={<SendOutlined />} loading={busy} onClick={() => act('submit', {}, 'Submitted to finance')}>Submit for approval</Button>
            )}
            {run.status === 'draft' && isHr && (
              <Popconfirm title="Reload salaries and rates from current profiles? Adjustments are kept." onConfirm={() => act('recalculate', {}, 'Recalculated')}>
                <Button icon={<ReloadOutlined />}>Recalculate</Button>
              </Popconfirm>
            )}
            {run.status === 'pending_finance' && isFin && <Button type="primary" icon={<CheckOutlined />} loading={busy} onClick={() => act('finance-approve', {}, 'Approved, sent to CEO')}>Approve (finance)</Button>}
            {run.status === 'pending_ceo' && isCeo && (
              <Popconfirm title="Approving posts the payroll to accounting. Continue?" onConfirm={() => act('ceo-approve', {}, 'Approved and posted to accounting')}>
                <Button type="primary" icon={<CheckOutlined />} loading={busy}>Approve (CEO) and post</Button>
              </Popconfirm>
            )}
            {((run.status === 'pending_finance' && isFin) || (run.status === 'pending_ceo' && isCeo)) && (
              <Button danger icon={<CloseOutlined />} onClick={() => setRejectOpen(true)}>Reject</Button>
            )}
            {run.status === 'approved' && isFin && <Button type="primary" icon={<DollarOutlined />} onClick={() => setPayOpen(true)}>Record payment</Button>}
          </Space>
          <Table size="small" rowKey="_id" dataSource={run.lines} columns={columns} pagination={{ pageSize: 15 }} scroll={{ x: 900 }}
            summary={() => (
              <Table.Summary.Row>
                <Table.Summary.Cell>Total</Table.Summary.Cell>
                <Table.Summary.Cell align="right">{money(t.gross)}</Table.Summary.Cell>
                <Table.Summary.Cell align="right">{money(t.cnpsEmployee)}</Table.Summary.Cell>
                <Table.Summary.Cell align="right">{money((t.irpp || 0) + (t.cac || 0))}</Table.Summary.Cell>
                <Table.Summary.Cell align="right">{money(t.cfcEmployee)}</Table.Summary.Cell>
                <Table.Summary.Cell align="right">{money(t.recoveryTotal)}</Table.Summary.Cell>
                <Table.Summary.Cell align="right"><b>{money(t.net)}</b></Table.Summary.Cell>
                <Table.Summary.Cell />
              </Table.Summary.Row>
            )} />
          <Divider orientation="left">History</Divider>
          <Timeline items={(run.history || []).map((h) => ({ children: `${h.action.replace(/_/g, ' ')} - ${h.byName || ''} - ${new Date(h.at).toLocaleString()}${h.comment ? ` (${h.comment})` : ''}` }))} />
        </Space>
      )}

      <Modal open={!!adjLine} title={`Adjustments: ${adjLine?.name || ''}`} onCancel={() => setAdjLine(null)} onOk={saveAdj} confirmLoading={busy} okText="Save">
        <Space direction="vertical" style={{ width: '100%' }}>
          {adjList.map((a, i) => (
            <Space key={i} align="start" wrap>
              <Input placeholder="Label (bonus, overtime...)" value={a.label} onChange={(e) => setAdjList((l) => l.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} style={{ width: 180 }} />
              <Select value={a.type} style={{ width: 120 }} onChange={(v) => setAdjList((l) => l.map((x, j) => (j === i ? { ...x, type: v } : x)))}
                options={[{ value: 'earning', label: 'Earning' }, { value: 'deduction', label: 'Deduction' }]} />
              <InputNumber min={0} value={a.amount} onChange={(v) => setAdjList((l) => l.map((x, j) => (j === i ? { ...x, amount: v } : x)))} style={{ width: 130 }} />
              <Button icon={<DeleteOutlined />} onClick={() => setAdjList((l) => l.filter((_, j) => j !== i))} />
            </Space>
          ))}
          <Button icon={<PlusOutlined />} onClick={() => setAdjList((l) => [...l, { label: '', type: 'earning', amount: 0 }])}>Add adjustment</Button>
          <Text type="secondary">Earnings are taxed and count toward CNPS. Deductions are recovered from net pay.</Text>
        </Space>
      </Modal>

      <Modal open={rejectOpen} title="Reject payroll run" onCancel={() => setRejectOpen(false)} okText="Reject" okButtonProps={{ danger: true, disabled: !reason.trim() }}
        onOk={async () => { if (await act('reject', { reason }, 'Run rejected')) { setRejectOpen(false); setReason(''); } }}>
        <Input.TextArea rows={3} placeholder="Reason (required)" value={reason} onChange={(e) => setReason(e.target.value)} />
      </Modal>

      <Modal open={payOpen} title="Record payment" onCancel={() => setPayOpen(false)} okText="Post payment"
        onOk={async () => { if (await act('pay', { accountCode: payAcc }, 'Payment recorded')) setPayOpen(false); }}>
        <p>Net pay of <b>{money(t.net)}</b> will be posted against staff salaries payable.</p>
        <Select value={payAcc} onChange={setPayAcc} style={{ width: 260 }} options={[{ value: '521', label: '521 Bank' }, { value: '571', label: '571 Cash' }]} />
      </Modal>
    </Drawer>
  );
};

// ───────────────────────────── Runs ─────────────────────────────
const RunsTab = ({ role }) => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [form] = Form.useForm();
  const now = new Date();

  const load = useCallback(() => {
    setLoading(true);
    api.get('/payroll/runs').then((r) => setRows(r.data.data)).catch((e) => message.error(errMsg(e, 'Could not load runs'))).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const create = async () => {
    try {
      const v = await form.validateFields();
      const r = await api.post('/payroll/runs', v);
      message.success('Payroll run created');
      setCreateOpen(false); load(); setOpen(r.data.data._id);
    } catch (e) { if (e?.response) message.error(errMsg(e, 'Could not create the run')); }
  };
  const del = async (id) => {
    try { await api.delete(`/payroll/runs/${id}`); load(); } catch (e) { message.error(errMsg(e, 'Could not delete')); }
  };

  return (
    <>
      <Space style={{ marginBottom: 12 }}>
        {['hr', 'admin'].includes(role) && <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.setFieldsValue({ month: now.getMonth() + 1, year: now.getFullYear() }); setCreateOpen(true); }}>New payroll run</Button>}
        <Button icon={<ReloadOutlined />} onClick={load} />
      </Space>
      <Table rowKey="_id" loading={loading} dataSource={rows} pagination={{ pageSize: 12 }}
        columns={[
          { title: 'Run', dataIndex: 'runNumber' },
          { title: 'Period', render: (_, r) => `${MONTHS[r.period.month - 1]} ${r.period.year}` },
          { title: 'Status', dataIndex: 'status', render: (s) => <Tag color={STATUS_COLOR[s]}>{STATUS_LABEL[s]}</Tag> },
          { title: 'Net pay', render: (_, r) => money(r.totals?.net), align: 'right' },
          { title: 'Total cost', render: (_, r) => money(r.totals?.employerCost), align: 'right' },
          { title: 'Prepared by', render: (_, r) => r.preparedBy?.fullName },
          {
            title: '', render: (_, r) => (
              <Space>
                <Button size="small" onClick={() => setOpen(r._id)}>Open</Button>
                {['draft', 'rejected'].includes(r.status) && ['hr', 'admin'].includes(role) && (
                  <Popconfirm title="Delete this run?" onConfirm={() => del(r._id)}><Button size="small" danger icon={<DeleteOutlined />} /></Popconfirm>
                )}
              </Space>
            )
          }
        ]} />
      <Modal open={createOpen} title="New payroll run" onCancel={() => setCreateOpen(false)} onOk={create} okText="Create">
        <Form form={form} layout="vertical">
          <Form.Item name="month" label="Month" rules={[{ required: true }]}><Select options={MONTHS.map((m, i) => ({ value: i + 1, label: m }))} /></Form.Item>
          <Form.Item name="year" label="Year" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} min={2000} max={2100} /></Form.Item>
          <Text type="secondary">All active salary profiles are included. You can adjust individual lines before submitting.</Text>
        </Form>
      </Modal>
      <RunDrawer runId={open} open={!!open} onClose={() => setOpen(null)} role={role} onChanged={load} />
    </>
  );
};

// ───────────────────────────── Salary profiles ─────────────────────────────
const ListEditor = ({ value = [], onChange, withFlags, label }) => (
  <Space direction="vertical" style={{ width: '100%' }}>
    {value.map((a, i) => (
      <Space key={i} wrap align="center">
        <Input placeholder="Name" value={a.name} style={{ width: 160 }} onChange={(e) => onChange(value.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
        <InputNumber min={0} value={a.amount} style={{ width: 120 }} onChange={(v) => onChange(value.map((x, j) => (j === i ? { ...x, amount: v } : x)))} />
        {withFlags && <><Switch size="small" checked={a.taxable !== false} onChange={(v) => onChange(value.map((x, j) => (j === i ? { ...x, taxable: v } : x)))} /><Text type="secondary">taxable</Text>
          <Switch size="small" checked={a.cnpsable !== false} onChange={(v) => onChange(value.map((x, j) => (j === i ? { ...x, cnpsable: v } : x)))} /><Text type="secondary">CNPS</Text></>}
        <Button size="small" icon={<DeleteOutlined />} onClick={() => onChange(value.filter((_, j) => j !== i))} />
      </Space>
    ))}
    <Button size="small" icon={<PlusOutlined />} onClick={() => onChange([...value, withFlags ? { name: '', amount: 0, taxable: true, cnpsable: true } : { name: '', amount: 0 }])}>{label}</Button>
  </Space>
);

const ProfilesTab = ({ role }) => {
  const [rows, setRows] = useState([]);
  const [emps, setEmps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [edit, setEdit] = useState(null);
  const [form] = Form.useForm();
  const canEdit = ['hr', 'admin'].includes(role);

  const load = useCallback(() => {
    setLoading(true);
    const reqs = [api.get('/payroll/profiles')];
    if (canEdit) reqs.push(api.get('/payroll/employees'));
    Promise.all(reqs).then(([p, e]) => { setRows(p.data.data); if (e) setEmps(e.data.data); })
      .catch((e) => message.error(errMsg(e, 'Could not load salary profiles'))).finally(() => setLoading(false));
  }, [canEdit]);
  useEffect(() => { load(); }, [load]);

  const openEdit = (employee, profile) => {
    setEdit({ employee });
    form.resetFields();
    form.setFieldsValue(profile ? { ...profile, hireDate: profile.hireDate ? String(profile.hireDate).slice(0, 10) : undefined } : { paymentMethod: 'bank', status: 'active', allowances: [], fixedDeductions: [] });
  };
  const save = async () => {
    try {
      const v = await form.validateFields();
      await api.put(`/payroll/profiles/${edit.employee._id}`, v);
      message.success('Saved'); setEdit(null); load();
    } catch (e) { if (e?.response) message.error(errMsg(e, 'Could not save')); }
  };
  const without = useMemo(() => emps.filter((e) => !e.profileStatus), [emps]);

  return (
    <>
      {canEdit && (
        <Space style={{ marginBottom: 12 }} wrap>
          <Select showSearch style={{ width: 280 }} placeholder={`Add salary for an employee (${without.length} without)`} optionFilterProp="label"
            value={null} onChange={(id) => openEdit(emps.find((e) => e._id === id))}
            options={without.map((e) => ({ value: e._id, label: `${e.fullName} (${e.department || '-'})` }))} />
        </Space>
      )}
      <Table rowKey="_id" loading={loading} dataSource={rows} size="small" pagination={{ pageSize: 15 }} scroll={{ x: 800 }}
        columns={[
          { title: 'Employee', render: (_, r) => <div>{r.employee?.fullName}<br /><Text type="secondary" style={{ fontSize: 12 }}>{r.employee?.department} / {r.employee?.position}</Text></div> },
          { title: 'Base', dataIndex: 'baseSalary', render: money, align: 'right' },
          { title: 'Gross', render: (_, r) => money(r.preview?.gross), align: 'right' },
          { title: 'Net (est.)', render: (_, r) => money(r.preview?.netPay), align: 'right' },
          { title: 'Status', dataIndex: 'status', render: (s) => <Tag color={s === 'active' ? 'green' : 'default'}>{s}</Tag> },
          { title: '', render: (_, r) => canEdit && <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r.employee, r)}>Edit</Button> }
        ]} />
      <Modal open={!!edit} width={680} title={`Salary: ${edit?.employee?.fullName || ''}`} onCancel={() => setEdit(null)} onOk={save} okText="Save" destroyOnClose>
        <Form form={form} layout="vertical">
          <Row gutter={12}>
            <Col span={12}><Form.Item name="baseSalary" label="Monthly base salary (XAF)" rules={[{ required: true }]}><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={12}><Form.Item name="status" label="Status"><Select options={['active', 'suspended', 'terminated'].map((s) => ({ value: s, label: s }))} /></Form.Item></Col>
          </Row>
          <Form.Item name="allowances" label="Allowances"><ListEditor withFlags label="Add allowance" /></Form.Item>
          <Form.Item name="fixedDeductions" label="Fixed monthly recoveries (loans, advances)"><ListEditor label="Add recovery" /></Form.Item>
          <Row gutter={12}>
            <Col span={12}><Form.Item name="exemptCnps" label="Exempt from CNPS" valuePropName="checked"><Switch /></Form.Item></Col>
            <Col span={12}><Form.Item name="exemptTax" label="Exempt from IRPP" valuePropName="checked"><Switch /></Form.Item></Col>
            <Col span={12}><Form.Item name="cnpsNumber" label="CNPS number"><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="taxPayerNumber" label="Taxpayer number"><Input /></Form.Item></Col>
            <Col span={8}><Form.Item name="paymentMethod" label="Payment"><Select options={[{ value: 'bank', label: 'Bank' }, { value: 'cash', label: 'Cash' }, { value: 'mobile_money', label: 'Mobile money' }]} /></Form.Item></Col>
            <Col span={8}><Form.Item name="bankName" label="Bank"><Input /></Form.Item></Col>
            <Col span={8}><Form.Item name="bankAccount" label="Account no."><Input /></Form.Item></Col>
          </Row>
        </Form>
      </Modal>
    </>
  );
};

// ───────────────────────────── Rates ─────────────────────────────
const RATE_FIELDS = [
  ['cnpsCeiling', 'CNPS monthly ceiling (XAF)'], ['employeePensionRate', 'Employee pension %'], ['employerPensionRate', 'Employer pension %'],
  ['familyAllowanceRate', 'Family allowance % (employer)'], ['workAccidentRate', 'Work accident % (employer)'],
  ['cfcEmployeeRate', 'CFC % (employee)'], ['cfcEmployerRate', 'CFC % (employer)'], ['fneEmployerRate', 'FNE % (employer)'],
  ['cacRate', 'CAC % of IRPP'], ['professionalAbatementRate', 'Professional abatement %'], ['annualFixedAbatement', 'Annual fixed abatement (XAF)']
];

const RatesTab = ({ role }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const canEdit = ['finance', 'admin'].includes(role);
  useEffect(() => {
    setLoading(true);
    api.get('/payroll/rates').then((r) => form.setFieldsValue(r.data.data)).catch((e) => message.error(errMsg(e, 'Could not load rates'))).finally(() => setLoading(false));
  }, [form]);
  const save = async () => {
    try {
      const v = await form.validateFields();
      await api.put('/payroll/rates', v);
      message.success('Rates saved. They apply to new and recalculated runs.');
    } catch (e) { if (e?.response) message.error(errMsg(e, 'Could not save')); }
  };
  return (
    <Spin spinning={loading}>
      <Alert type="warning" showIcon style={{ marginBottom: 12 }} message="Check these rates with your accountant"
        description="They start from the commonly published Cameroon rates and are fully editable. Approved runs keep the rates they were calculated with." />
      <Form form={form} layout="vertical" disabled={!canEdit}>
        <Row gutter={12}>
          {RATE_FIELDS.map(([k, l]) => <Col xs={24} md={8} key={k}><Form.Item name={k} label={l}><InputNumber style={{ width: '100%' }} min={0} /></Form.Item></Col>)}
        </Row>
        <Divider orientation="left">IRPP annual brackets (leave the last "up to" empty)</Divider>
        <Form.List name="irppBrackets">
          {(fields, { add, remove }) => (
            <>
              {fields.map((f) => (
                <Space key={f.key} align="baseline">
                  <Form.Item name={[f.name, 'upTo']} label="Up to (XAF)"><InputNumber min={0} style={{ width: 160 }} /></Form.Item>
                  <Form.Item name={[f.name, 'rate']} label="Rate %" rules={[{ required: true }]}><InputNumber min={0} max={100} style={{ width: 100 }} /></Form.Item>
                  {canEdit && <Button icon={<DeleteOutlined />} onClick={() => remove(f.name)} />}
                </Space>
              ))}
              {canEdit && <Button icon={<PlusOutlined />} onClick={() => add({ upTo: null, rate: 0 })}>Add bracket</Button>}
            </>
          )}
        </Form.List>
        {canEdit && <div style={{ marginTop: 16 }}><Button type="primary" onClick={save}>Save rates</Button></div>}
      </Form>
    </Spin>
  );
};

// ───────────────────────────── Page ─────────────────────────────
const Payroll = () => {
  const { user } = useSelector((s) => s.auth);
  const role = user?.role;
  const staff = ['hr', 'finance', 'admin', 'ceo'].includes(role);
  const items = [
    ...(staff ? [
      { key: 'runs', label: 'Payroll runs', children: <RunsTab role={role} /> },
      { key: 'profiles', label: 'Salary profiles', children: <ProfilesTab role={role} /> },
      { key: 'rates', label: 'Statutory rates', children: <RatesTab role={role} /> }
    ] : []),
    { key: 'mine', label: 'My payslips', children: <MyPayslips /> }
  ];
  return (
    <div style={{ padding: 16 }}>
      <Title level={3} style={{ marginTop: 0 }}>Payroll</Title>
      <Card><Tabs items={items} destroyInactiveTabPane /></Card>
    </div>
  );
};

export default Payroll;

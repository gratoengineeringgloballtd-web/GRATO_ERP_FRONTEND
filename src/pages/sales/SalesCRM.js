import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Tabs, Card, Row, Col, Statistic, Button, Space, Tag, Table, Modal, Form, Input, InputNumber, Select, Typography,
  message, Popconfirm, Empty, Spin, Drawer, List, Alert, Divider, Tooltip, Badge
} from 'antd';
import {
  PlusOutlined, EditOutlined, MailOutlined, FilePdfOutlined, CheckOutlined, CloseOutlined, ReloadOutlined,
  PhoneOutlined, TeamOutlined, FileTextOutlined, ClockCircleOutlined, DeleteOutlined, EyeOutlined, DollarOutlined
} from '@ant-design/icons';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip, CartesianGrid } from 'recharts';
import { useSelector } from 'react-redux';
import api from '../../services/api';

const { Title, Text } = Typography;

const STAGES = ['new', 'qualified', 'proposal', 'negotiation', 'won', 'lost'];
const STAGE_COLOR = { new: 'default', qualified: 'blue', proposal: 'purple', negotiation: 'orange', won: 'green', lost: 'red' };
const QUOTE_COLOR = { draft: 'default', sent: 'blue', accepted: 'green', rejected: 'red', expired: 'orange', invoiced: 'purple' };
const SOURCES = ['referral', 'website', 'tender', 'cold_call', 'event', 'existing_customer', 'other'];
const ACTIVITY_TYPES = ['call', 'meeting', 'email', 'note', 'task'];

const money = (v) => `${Number(v || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })} XAF`;
const day = (d) => (d ? new Date(d).toLocaleDateString() : '-');
const iso = (d) => (d ? new Date(d).toISOString().slice(0, 10) : undefined);
const errMsg = (e, fb) => e?.response?.data?.message || fb;

// ───────────────────────────── Dashboard ─────────────────────────────
const DashboardTab = ({ refreshKey }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true); setError(null);
    api.get('/sales/dashboard').then((r) => setData(r.data.data)).catch((e) => setError(errMsg(e, 'Could not load the sales dashboard'))).finally(() => setLoading(false));
  }, [refreshKey]);

  if (loading) return <Spin />;
  if (error) return <Alert type="error" showIcon message={error} />;
  if (!data) return null;
  const quote = (s) => data.quotes.find((q) => q.status === s) || { count: 0, value: 0 };

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <Row gutter={[12, 12]}>
        <Col xs={12} md={6}><Card><Statistic title="Open pipeline" value={data.openValue} formatter={(v) => money(v)} suffix={<Text type="secondary" style={{ fontSize: 12 }}>{data.openCount} leads</Text>} /></Card></Col>
        <Col xs={12} md={6}><Card><Statistic title="Weighted forecast" value={data.weightedValue} formatter={(v) => money(v)} /></Card></Col>
        <Col xs={12} md={6}><Card><Statistic title="Won (12 months)" value={data.wonLast12Months.value} formatter={(v) => money(v)} suffix={<Text type="secondary" style={{ fontSize: 12 }}>{data.wonLast12Months.count} deals</Text>} /></Card></Col>
        <Col xs={12} md={6}><Card><Statistic title="Win rate" value={data.winRate ?? '-'} suffix={data.winRate !== null ? '%' : ''} /></Card></Col>
      </Row>
      <Row gutter={[12, 12]}>
        <Col xs={24} md={12}>
          <Card title="Pipeline by stage (XAF)" size="small">
            <div style={{ height: 240 }}>
              <ResponsiveContainer>
                <BarChart data={data.pipeline.filter((p) => p.stage !== 'lost')}>
                  <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="stage" /><YAxis tickFormatter={(v) => `${Math.round(v / 1e6)}M`} />
                  <RTooltip formatter={(v) => money(v)} /><Bar dataKey="value" name="Value" fill="#1890ff" /><Bar dataKey="weighted" name="Weighted" fill="#95de64" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="Won per month (XAF)" size="small">
            {data.monthlyWon.length === 0 ? <Empty description="No won deals yet" /> : (
              <div style={{ height: 240 }}>
                <ResponsiveContainer>
                  <BarChart data={data.monthlyWon}>
                    <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" /><YAxis tickFormatter={(v) => `${Math.round(v / 1e6)}M`} />
                    <RTooltip formatter={(v) => money(v)} /><Bar dataKey="value" name="Won" fill="#52c41a" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
        </Col>
      </Row>
      <Row gutter={[12, 12]}>
        <Col xs={24} md={8}>
          <Card title="Quotations" size="small">
            {['draft', 'sent', 'accepted', 'rejected', 'expired', 'invoiced'].map((s) => (
              <div key={s} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                <Tag color={QUOTE_COLOR[s]}>{s}</Tag><span>{quote(s).count} · {money(quote(s).value)}</span>
              </div>
            ))}
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card title="Next follow-ups" size="small" extra={data.overdueActivities > 0 && <Badge count={`${data.overdueActivities} overdue`} />}>
            {data.upcomingFollowUps.length === 0 ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Nothing scheduled" /> : (
              <List size="small" dataSource={data.upcomingFollowUps} renderItem={(l) => (
                <List.Item><div><Text strong>{l.company}</Text><br /><Text type="secondary" style={{ fontSize: 12 }}>{l.leadNumber} · {l.stage}</Text></div>
                  <Tag color={new Date(l.nextFollowUp) < new Date() ? 'red' : 'blue'}>{day(l.nextFollowUp)}</Tag></List.Item>
              )} />
            )}
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card title="Won by salesperson (12 months)" size="small">
            {data.byOwner.length === 0 ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No data yet" /> : (
              <List size="small" dataSource={data.byOwner} renderItem={(o) => (<List.Item><span>{o.owner}</span><span>{o.won} · {money(o.value)}</span></List.Item>)} />
            )}
          </Card>
        </Col>
      </Row>
    </Space>
  );
};

// ───────────────────────────── Pipeline ─────────────────────────────
const LeadModal = ({ open, lead, onClose, onSaved, canAssign, owners }) => {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!open) return;
    form.resetFields();
    form.setFieldsValue(lead ? { ...lead, owner: lead.owner?._id || lead.owner, expectedCloseDate: iso(lead.expectedCloseDate), nextFollowUp: iso(lead.nextFollowUp) } : { source: 'other', estimatedValue: 0 });
  }, [open, lead, form]);

  const save = async () => {
    try {
      const v = await form.validateFields();
      setSaving(true);
      if (lead) await api.put(`/sales/leads/${lead._id}`, v); else await api.post('/sales/leads', v);
      message.success(lead ? 'Lead updated' : 'Lead created');
      onSaved();
    } catch (e) { if (!e?.errorFields) message.error(errMsg(e, 'Failed to save the lead')); } finally { setSaving(false); }
  };

  return (
    <Modal open={open} title={lead ? `Edit ${lead.company}` : 'New lead'} onCancel={onClose} onOk={save} confirmLoading={saving} okText="Save" destroyOnClose width={640}>
      <Form form={form} layout="vertical">
        <Row gutter={12}>
          <Col span={12}><Form.Item name="company" label="Company" rules={[{ required: true }]}><Input /></Form.Item></Col>
          <Col span={12}><Form.Item name="contactName" label="Contact person"><Input /></Form.Item></Col>
          <Col span={12}><Form.Item name="email" label="Email" rules={[{ type: 'email' }]}><Input /></Form.Item></Col>
          <Col span={12}><Form.Item name="phone" label="Phone"><Input /></Form.Item></Col>
          <Col span={12}><Form.Item name="source" label="Source"><Select options={SOURCES.map((s) => ({ value: s, label: s.replace('_', ' ') }))} /></Form.Item></Col>
          <Col span={12}><Form.Item name="estimatedValue" label="Estimated value (XAF)"><InputNumber min={0} style={{ width: '100%' }} formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={(v) => v.replace(/,/g, '')} /></Form.Item></Col>
          <Col span={12}><Form.Item name="expectedCloseDate" label="Expected close"><Input type="date" /></Form.Item></Col>
          <Col span={12}><Form.Item name="nextFollowUp" label="Next follow-up"><Input type="date" /></Form.Item></Col>
          {canAssign && <Col span={12}><Form.Item name="owner" label="Owner"><Select allowClear options={owners.map((o) => ({ value: o._id, label: o.fullName }))} /></Form.Item></Col>}
          <Col span={24}><Form.Item name="description" label="Notes"><Input.TextArea rows={3} /></Form.Item></Col>
        </Row>
      </Form>
    </Modal>
  );
};

const LeadDrawer = ({ leadId, onClose, onChanged, canWrite, onQuote }) => {
  const [lead, setLead] = useState(null);
  const [form] = Form.useForm();
  const load = useCallback(() => { if (leadId) api.get(`/sales/leads/${leadId}`).then((r) => setLead(r.data.data)).catch(() => message.error('Failed to load the lead')); }, [leadId]);
  useEffect(() => { setLead(null); load(); }, [load]);

  const addActivity = async () => {
    try {
      const v = await form.validateFields();
      await api.post('/sales/activities', { ...v, lead: leadId });
      form.resetFields(); load(); onChanged();
    } catch (e) { if (!e?.errorFields) message.error(errMsg(e, 'Failed to add the activity')); }
  };
  const toggle = async (a) => { await api.patch(`/sales/activities/${a._id}/done`, { done: !a.done }); load(); onChanged(); };

  return (
    <Drawer open={!!leadId} onClose={onClose} width={520} title={lead ? `${lead.company} · ${lead.leadNumber}` : 'Lead'} destroyOnClose>
      {!lead ? <Spin /> : (
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Space wrap>
            <Tag color={STAGE_COLOR[lead.stage]}>{lead.stage}</Tag><Tag>{lead.probability}%</Tag><Text strong>{money(lead.estimatedValue)}</Text>
            {lead.owner?.fullName && <Text type="secondary">Owner: {lead.owner.fullName}</Text>}
          </Space>
          <div>
            {lead.contactName && <div><TeamOutlined /> {lead.contactName}</div>}
            {lead.email && <div><MailOutlined /> {lead.email}</div>}
            {lead.phone && <div><PhoneOutlined /> {lead.phone}</div>}
            <div><ClockCircleOutlined /> Follow-up: {day(lead.nextFollowUp)} · Expected close: {day(lead.expectedCloseDate)}</div>
            {lead.lostReason && <Alert style={{ marginTop: 8 }} type="error" message={`Lost: ${lead.lostReason}`} />}
            {lead.description && <p style={{ marginTop: 8 }}>{lead.description}</p>}
          </div>
          <Divider orientation="left" plain>Quotations</Divider>
          {canWrite && <Button size="small" icon={<FileTextOutlined />} onClick={() => onQuote(lead)}>New quotation</Button>}
          <List size="small" dataSource={lead.quotations} locale={{ emptyText: 'No quotations yet' }} renderItem={(q) => (
            <List.Item><span>{q.quoteNumber} · {q.subject}</span><span><Tag color={QUOTE_COLOR[q.status]}>{q.status}</Tag>{money(q.total)}</span></List.Item>
          )} />
          <Divider orientation="left" plain>Activity</Divider>
          {canWrite && (
            <Form form={form} layout="vertical" initialValues={{ type: 'call' }}>
              <Row gutter={8}>
                <Col span={8}><Form.Item name="type" noStyle><Select options={ACTIVITY_TYPES.map((t) => ({ value: t, label: t }))} /></Form.Item></Col>
                <Col span={16}><Form.Item name="subject" noStyle rules={[{ required: true }]}><Input placeholder="What happened or what is next?" /></Form.Item></Col>
                <Col span={16} style={{ marginTop: 8 }}><Form.Item name="dueDate" noStyle><Input type="date" /></Form.Item></Col>
                <Col span={8} style={{ marginTop: 8 }}><Button type="primary" block icon={<PlusOutlined />} onClick={addActivity}>Add</Button></Col>
              </Row>
              <Text type="secondary" style={{ fontSize: 12 }}>Set a date to make it a follow-up task.</Text>
            </Form>
          )}
          <List size="small" dataSource={lead.activities} locale={{ emptyText: 'No activity yet' }} renderItem={(a) => (
            <List.Item actions={canWrite && a.dueDate ? [<Button key="d" size="small" onClick={() => toggle(a)}>{a.done ? 'Reopen' : 'Done'}</Button>] : []}>
              <div style={{ opacity: a.done && a.dueDate ? 0.55 : 1 }}>
                <Tag>{a.type}</Tag>{a.subject}<br />
                <Text type="secondary" style={{ fontSize: 12 }}>{day(a.activityDate)}{a.dueDate ? ` · due ${day(a.dueDate)}` : ''}</Text>
              </div>
            </List.Item>
          )} />
        </Space>
      )}
    </Drawer>
  );
};

const PipelineTab = ({ canWrite, canAssign, owners, refreshKey, bump, onQuote }) => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');
  const [modal, setModal] = useState({ open: false, lead: null });
  const [drawerId, setDrawerId] = useState(null);
  const [lostFor, setLostFor] = useState(null);
  const [lostReason, setLostReason] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await api.get('/sales/leads', { params: { q: q || undefined, limit: 500 } }); setLeads(r.data.data || []); }
    catch (e) { message.error(errMsg(e, 'Failed to load leads')); } finally { setLoading(false); }
  }, [q]);
  useEffect(() => { load(); }, [load, refreshKey]);

  const move = async (lead, stage, reason) => {
    if (stage === 'lost' && !reason) { setLostFor(lead); setLostReason(''); return; }
    try { await api.patch(`/sales/leads/${lead._id}/stage`, { stage, lostReason: reason }); load(); bump(); }
    catch (e) { message.error(errMsg(e, 'Failed to move the lead')); }
  };

  const byStage = useMemo(() => Object.fromEntries(STAGES.map((s) => [s, leads.filter((l) => l.stage === s)])), [leads]);

  return (
    <>
      <Space style={{ marginBottom: 12 }} wrap>
        <Input.Search allowClear placeholder="Search company, contact, email" onSearch={setQ} style={{ width: 280 }} />
        {canWrite && <Button type="primary" icon={<PlusOutlined />} onClick={() => setModal({ open: true, lead: null })}>New lead</Button>}
        <Button icon={<ReloadOutlined />} onClick={load}>Refresh</Button>
      </Space>
      {loading && leads.length === 0 ? <Spin /> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(210px, 1fr))', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
          {STAGES.map((s) => (
            <div key={s} style={{ background: '#fafafa', borderRadius: 8, padding: 8, minHeight: 200 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <Tag color={STAGE_COLOR[s]} style={{ textTransform: 'capitalize' }}>{s}</Tag>
                <Text type="secondary" style={{ fontSize: 12 }}>{byStage[s].length} · {money(byStage[s].reduce((t, l) => t + (l.estimatedValue || 0), 0))}</Text>
              </div>
              {byStage[s].map((l) => (
                <Card key={l._id} size="small" style={{ marginBottom: 8 }} bodyStyle={{ padding: 10 }}>
                  <div style={{ fontWeight: 600, cursor: 'pointer' }} onClick={() => setDrawerId(l._id)}>{l.company}</div>
                  <div style={{ fontSize: 12, color: '#888' }}>{l.contactName || l.leadNumber}</div>
                  <div style={{ margin: '4px 0' }}>{money(l.estimatedValue)}</div>
                  {l.nextFollowUp && <Tag color={new Date(l.nextFollowUp) < new Date() && !['won', 'lost'].includes(l.stage) ? 'red' : 'default'} style={{ fontSize: 11 }}>follow-up {day(l.nextFollowUp)}</Tag>}
                  <div style={{ marginTop: 6, display: 'flex', gap: 4 }}>
                    <Tooltip title="Details & activity"><Button size="small" icon={<EyeOutlined />} onClick={() => setDrawerId(l._id)} /></Tooltip>
                    {canWrite && <Tooltip title="Edit"><Button size="small" icon={<EditOutlined />} onClick={() => setModal({ open: true, lead: l })} /></Tooltip>}
                    {canWrite && <Select size="small" value={l.stage} style={{ flex: 1 }} onChange={(v) => move(l, v)} options={STAGES.map((x) => ({ value: x, label: x }))} />}
                  </div>
                </Card>
              ))}
            </div>
          ))}
        </div>
      )}
      <LeadModal open={modal.open} lead={modal.lead} canAssign={canAssign} owners={owners} onClose={() => setModal({ open: false, lead: null })} onSaved={() => { setModal({ open: false, lead: null }); load(); bump(); }} />
      <LeadDrawer leadId={drawerId} canWrite={canWrite} onClose={() => setDrawerId(null)} onChanged={() => { load(); bump(); }} onQuote={(lead) => { setDrawerId(null); onQuote(lead); }} />
      <Modal open={!!lostFor} title={`Why was ${lostFor?.company} lost?`} onCancel={() => setLostFor(null)} okText="Mark as lost" okButtonProps={{ danger: true, disabled: !lostReason.trim() }}
        onOk={() => { const l = lostFor; setLostFor(null); move(l, 'lost', lostReason.trim()); }}>
        <Input.TextArea rows={3} value={lostReason} onChange={(e) => setLostReason(e.target.value)} placeholder="Price, timing, competitor, no budget..." />
      </Modal>
    </>
  );
};

// ───────────────────────────── Quotations ─────────────────────────────
const QuoteModal = ({ open, quote, presetLead, onClose, onSaved }) => {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [customers, setCustomers] = useState([]);
  const items = Form.useWatch('items', form) || [];

  useEffect(() => {
    if (!open) return;
    form.resetFields();
    const d = new Date(); d.setDate(d.getDate() + 30);
    if (quote) form.setFieldsValue({ ...quote, validUntil: iso(quote.validUntil) });
    else form.setFieldsValue({
      validUntil: iso(d), items: [{ description: '', quantity: 1, unitPrice: 0, taxRate: 19.25 }],
      ...(presetLead ? { lead: presetLead._id, customerName: presetLead.company, customerEmail: presetLead.email, subject: `Proposal for ${presetLead.company}` } : {})
    });
  }, [open, quote, presetLead, form]);

  const searchCustomers = async (q) => {
    try { const r = await api.get('/sales/customers-lookup', { params: { q } }); setCustomers(r.data.data || []); } catch (e) { /* ignore */ }
  };
  const pickCustomer = (id) => {
    const c = customers.find((x) => x._id === id);
    if (c) form.setFieldsValue({ customerName: c.companyName, customerEmail: c.email, customerAddress: c.address, customer: c._id });
  };

  const totals = items.reduce((t, i) => {
    const line = (Number(i?.quantity) || 0) * (Number(i?.unitPrice) || 0);
    return { sub: t.sub + line, tax: t.tax + line * (Number(i?.taxRate ?? 19.25) || 0) / 100 };
  }, { sub: 0, tax: 0 });

  const save = async () => {
    try {
      const v = await form.validateFields();
      setSaving(true);
      if (quote) await api.put(`/sales/quotations/${quote._id}`, v); else await api.post('/sales/quotations', v);
      message.success(quote ? 'Quotation updated' : 'Quotation created');
      onSaved();
    } catch (e) { if (!e?.errorFields) message.error(errMsg(e, 'Failed to save the quotation')); } finally { setSaving(false); }
  };

  return (
    <Modal open={open} title={quote ? `Edit ${quote.quoteNumber}` : 'New quotation'} onCancel={onClose} onOk={save} confirmLoading={saving} okText="Save" width={820} destroyOnClose>
      <Form form={form} layout="vertical">
        <Form.Item name="lead" hidden><Input /></Form.Item>
        <Form.Item name="customer" hidden><Input /></Form.Item>
        <Row gutter={12}>
          <Col span={24}>
            <Form.Item label="Pick an existing customer (optional)">
              <Select showSearch allowClear filterOption={false} placeholder="Type to search customers" onSearch={searchCustomers} onFocus={() => searchCustomers('')} onChange={pickCustomer}
                options={customers.map((c) => ({ value: c._id, label: c.companyName }))} />
            </Form.Item>
          </Col>
          <Col span={12}><Form.Item name="customerName" label="Customer name" rules={[{ required: true }]}><Input /></Form.Item></Col>
          <Col span={12}><Form.Item name="customerEmail" label="Customer email" rules={[{ type: 'email' }]}><Input /></Form.Item></Col>
          <Col span={24}><Form.Item name="customerAddress" label="Address"><Input /></Form.Item></Col>
          <Col span={16}><Form.Item name="subject" label="Subject" rules={[{ required: true }]}><Input /></Form.Item></Col>
          <Col span={8}><Form.Item name="validUntil" label="Valid until" rules={[{ required: true }]}><Input type="date" /></Form.Item></Col>
        </Row>
        <Form.List name="items">
          {(fields, { add, remove }) => (
            <>
              {fields.map(({ key, name }) => (
                <Row gutter={8} key={key} align="middle">
                  <Col span={11}><Form.Item name={[name, 'description']} rules={[{ required: true, message: 'Description' }]}><Input placeholder="Description" /></Form.Item></Col>
                  <Col span={3}><Form.Item name={[name, 'quantity']} rules={[{ required: true }]}><InputNumber min={0.0001} placeholder="Qty" style={{ width: '100%' }} /></Form.Item></Col>
                  <Col span={5}><Form.Item name={[name, 'unitPrice']} rules={[{ required: true }]}><InputNumber min={0} placeholder="Unit price" style={{ width: '100%' }} /></Form.Item></Col>
                  <Col span={3}><Form.Item name={[name, 'taxRate']}><InputNumber min={0} max={100} placeholder="VAT %" style={{ width: '100%' }} /></Form.Item></Col>
                  <Col span={2}>{fields.length > 1 && <Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(name)} />}</Col>
                </Row>
              ))}
              <Button type="dashed" icon={<PlusOutlined />} onClick={() => add({ quantity: 1, unitPrice: 0, taxRate: 19.25 })}>Add line</Button>
            </>
          )}
        </Form.List>
        <div style={{ textAlign: 'right', marginTop: 12 }}>
          <div>Subtotal: <b>{money(totals.sub)}</b></div><div>VAT: <b>{money(totals.tax)}</b></div><div style={{ fontSize: 16 }}>Total: <b>{money(totals.sub + totals.tax)}</b></div>
        </div>
        <Form.Item name="terms" label="Terms"><Input.TextArea rows={2} placeholder="Defaults to 30-day payment terms" /></Form.Item>
        <Form.Item name="notes" label="Notes"><Input.TextArea rows={2} /></Form.Item>
      </Form>
    </Modal>
  );
};

const QuotationsTab = ({ canWrite, refreshKey, bump, presetLead, clearPreset }) => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(undefined);
  const [modal, setModal] = useState({ open: false, quote: null });
  const [invoiceFor, setInvoiceFor] = useState(null);
  const [invoiceRef, setInvoiceRef] = useState('');
  const [busy, setBusy] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await api.get('/sales/quotations', { params: { status } }); setRows(r.data.data || []); }
    catch (e) { message.error(errMsg(e, 'Failed to load quotations')); } finally { setLoading(false); }
  }, [status]);
  useEffect(() => { load(); }, [load, refreshKey]);
  useEffect(() => { if (presetLead) setModal({ open: true, quote: null }); }, [presetLead]);

  const act = async (id, path, body, ok) => {
    setBusy(id + path);
    try { await api.post(`/sales/quotations/${id}/${path}`, body || {}); message.success(ok); load(); bump(); }
    catch (e) { message.error(errMsg(e, 'Action failed')); } finally { setBusy(null); }
  };
  const pdf = async (q) => {
    try {
      const r = await api.get(`/sales/quotations/${q._id}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([r.data], { type: 'application/pdf' }));
      const a = document.createElement('a'); a.href = url; a.download = `${q.quoteNumber}.pdf`; document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(url);
    } catch (e) { message.error('Could not generate the PDF'); }
  };

  const columns = [
    { title: 'Number', dataIndex: 'quoteNumber', width: 130 },
    { title: 'Customer', key: 'c', render: (_, q) => (<div>{q.customerName}<br /><Text type="secondary" style={{ fontSize: 12 }}>{q.subject}</Text></div>) },
    { title: 'Total', dataIndex: 'total', align: 'right', width: 150, render: money },
    { title: 'Valid until', dataIndex: 'validUntil', width: 110, render: day },
    { title: 'Status', dataIndex: 'status', width: 110, render: (s, q) => (<><Tag color={QUOTE_COLOR[s]}>{s}</Tag>{q.invoiceReference && <div style={{ fontSize: 11 }}>{q.invoiceReference}</div>}</>) },
    { title: 'Owner', key: 'o', width: 130, render: (_, q) => q.owner?.fullName || '-' },
    {
      title: '', key: 'a', width: 270, fixed: 'right',
      render: (_, q) => (
        <Space size={4} wrap>
          <Tooltip title="Download PDF"><Button size="small" icon={<FilePdfOutlined />} onClick={() => pdf(q)} /></Tooltip>
          {canWrite && ['draft', 'sent'].includes(q.status) && <Tooltip title="Edit"><Button size="small" icon={<EditOutlined />} onClick={() => setModal({ open: true, quote: q })} /></Tooltip>}
          {canWrite && ['draft', 'sent', 'expired'].includes(q.status) && <Popconfirm title={`Email ${q.quoteNumber} to ${q.customerEmail || 'the customer'}?`} onConfirm={() => act(q._id, 'send', {}, 'Quotation sent')}><Button size="small" icon={<MailOutlined />} loading={busy === q._id + 'send'}>{q.status === 'draft' ? 'Send' : 'Resend'}</Button></Popconfirm>}
          {canWrite && ['draft', 'sent'].includes(q.status) && <Popconfirm title="Customer accepted this quotation?" onConfirm={() => act(q._id, 'accept', {}, 'Accepted; the lead is marked as won')}><Button size="small" type="primary" icon={<CheckOutlined />}>Accepted</Button></Popconfirm>}
          {canWrite && ['draft', 'sent'].includes(q.status) && <Popconfirm title="Mark as rejected?" onConfirm={() => act(q._id, 'reject', {}, 'Marked as rejected')}><Button size="small" danger icon={<CloseOutlined />} /></Popconfirm>}
          {canWrite && q.status === 'accepted' && <Button size="small" icon={<DollarOutlined />} onClick={() => { setInvoiceFor(q); setInvoiceRef(''); }}>Invoiced</Button>}
        </Space>
      )
    }
  ];

  return (
    <>
      <Space style={{ marginBottom: 12 }} wrap>
        <Select allowClear placeholder="Status" style={{ width: 160 }} value={status} onChange={setStatus} options={Object.keys(QUOTE_COLOR).map((s) => ({ value: s, label: s }))} />
        {canWrite && <Button type="primary" icon={<PlusOutlined />} onClick={() => setModal({ open: true, quote: null })}>New quotation</Button>}
        <Button icon={<ReloadOutlined />} onClick={load}>Refresh</Button>
      </Space>
      <Table rowKey="_id" size="middle" loading={loading} columns={columns} dataSource={rows} scroll={{ x: 1000 }} pagination={{ pageSize: 20 }} />
      <QuoteModal open={modal.open} quote={modal.quote} presetLead={modal.quote ? null : presetLead} onClose={() => { setModal({ open: false, quote: null }); clearPreset(); }}
        onSaved={() => { setModal({ open: false, quote: null }); clearPreset(); load(); bump(); }} />
      <Modal open={!!invoiceFor} title={`Mark ${invoiceFor?.quoteNumber} as invoiced`} onCancel={() => setInvoiceFor(null)} okButtonProps={{ disabled: !invoiceRef.trim() }}
        onOk={() => { const q = invoiceFor; setInvoiceFor(null); act(q._id, 'invoiced', { invoiceReference: invoiceRef }, 'Marked as invoiced'); }}>
        <p>Finance raises the customer invoice in the Invoices module. Enter its number here to link it to this quotation.</p>
        <Input value={invoiceRef} onChange={(e) => setInvoiceRef(e.target.value)} placeholder="Invoice number" />
      </Modal>
    </>
  );
};

// ───────────────────────────── Activities ─────────────────────────────
const ActivitiesTab = ({ canWrite, refreshKey, bump }) => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openOnly, setOpenOnly] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await api.get('/sales/activities', { params: { open: openOnly ? 'true' : undefined } }); setRows(r.data.data || []); }
    catch (e) { message.error(errMsg(e, 'Failed to load activities')); } finally { setLoading(false); }
  }, [openOnly]);
  useEffect(() => { load(); }, [load, refreshKey]);

  const toggle = async (a) => { await api.patch(`/sales/activities/${a._id}/done`, { done: !a.done }); load(); bump(); };
  const del = async (a) => { await api.delete(`/sales/activities/${a._id}`); load(); bump(); };

  return (
    <>
      <Space style={{ marginBottom: 12 }}>
        <Select value={openOnly ? 'open' : 'all'} onChange={(v) => setOpenOnly(v === 'open')} style={{ width: 180 }} options={[{ value: 'open', label: 'Open tasks & follow-ups' }, { value: 'all', label: 'All activity' }]} />
        <Button icon={<ReloadOutlined />} onClick={load}>Refresh</Button>
      </Space>
      <Table rowKey="_id" size="middle" loading={loading} dataSource={rows} pagination={{ pageSize: 20 }}
        columns={[
          { title: 'Type', dataIndex: 'type', width: 90, render: (t) => <Tag>{t}</Tag> },
          { title: 'Subject', dataIndex: 'subject' },
          { title: 'Lead', key: 'l', render: (_, a) => a.lead ? `${a.lead.company}` : '-' },
          { title: 'Due', dataIndex: 'dueDate', width: 110, render: (d, a) => d ? <Tag color={!a.done && new Date(d) < new Date() ? 'red' : 'default'}>{day(d)}</Tag> : '-' },
          { title: 'Status', dataIndex: 'done', width: 90, render: (d, a) => (a.dueDate ? (d ? <Tag color="green">done</Tag> : <Tag color="gold">open</Tag>) : <Text type="secondary">logged</Text>) },
          { title: '', key: 'x', width: 150, render: (_, a) => canWrite && (<Space>{a.dueDate && <Button size="small" onClick={() => toggle(a)}>{a.done ? 'Reopen' : 'Done'}</Button>}<Popconfirm title="Delete?" onConfirm={() => del(a)}><Button size="small" danger icon={<DeleteOutlined />} /></Popconfirm></Space>) }
        ]} />
    </>
  );
};

// ───────────────────────────── Page ─────────────────────────────
const SalesCRM = () => {
  const { user } = useSelector((s) => s.auth);
  const canWrite = ['sales', 'admin'].includes(user?.role);
  const canAssign = user?.role === 'admin';
  const [tab, setTab] = useState('dashboard');
  const [refreshKey, setRefreshKey] = useState(0);
  const [owners, setOwners] = useState([]);
  const [presetLead, setPresetLead] = useState(null);
  const bump = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => { if (canAssign) api.get('/sales/owners').then((r) => setOwners(r.data.data || [])).catch(() => {}); }, [canAssign]);

  return (
    <div>
      <Space align="center" style={{ marginBottom: 12 }}>
        <DollarOutlined style={{ fontSize: 24 }} />
        <Title level={3} style={{ margin: 0 }}>Sales & CRM</Title>
      </Space>
      {!canWrite && <Alert type="info" showIcon style={{ marginBottom: 12 }} message="You have read-only access. Salespeople manage their own leads and quotations." />}
      <Tabs activeKey={tab} onChange={setTab} destroyInactiveTabPane items={[
        { key: 'dashboard', label: 'Dashboard', children: <DashboardTab refreshKey={refreshKey} /> },
        { key: 'pipeline', label: 'Pipeline', children: <PipelineTab canWrite={canWrite} canAssign={canAssign} owners={owners} refreshKey={refreshKey} bump={bump} onQuote={(lead) => { setPresetLead(lead); setTab('quotations'); }} /> },
        { key: 'quotations', label: 'Quotations', children: <QuotationsTab canWrite={canWrite} refreshKey={refreshKey} bump={bump} presetLead={presetLead} clearPreset={() => setPresetLead(null)} /> },
        { key: 'activities', label: 'Activities', children: <ActivitiesTab canWrite={canWrite} refreshKey={refreshKey} bump={bump} /> }
      ]} />
    </div>
  );
};

export default SalesCRM;

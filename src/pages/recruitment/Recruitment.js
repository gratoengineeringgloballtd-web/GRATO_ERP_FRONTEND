import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Tabs, Card, Button, Space, Tag, Table, Modal, Form, Input, InputNumber, Select, Typography, message, Popconfirm,
  Drawer, Alert, Row, Col, Statistic, Timeline, Divider, Upload, List, Rate, Empty, Descriptions
} from 'antd';
import { PlusOutlined, EditOutlined, CheckOutlined, CloseOutlined, DeleteOutlined, SendOutlined, UploadOutlined, PaperClipOutlined, CalendarOutlined } from '@ant-design/icons';
import { useSelector } from 'react-redux';
import api from '../../services/api';

const { Title, Text } = Typography;
const OPEN_COLOR = { draft: 'default', pending_approval: 'gold', open: 'green', on_hold: 'orange', filled: 'blue', closed: 'default', rejected: 'red' };
const OPEN_LABEL = { draft: 'Draft', pending_approval: 'Awaiting CEO', open: 'Open', on_hold: 'On hold', filled: 'Filled', closed: 'Closed', rejected: 'Rejected' };
const STAGES = ['applied', 'screening', 'interview', 'offer', 'hired'];
const STAGE_COLOR = { applied: 'default', screening: 'blue', interview: 'purple', offer: 'orange', hired: 'green', rejected: 'red', withdrawn: 'default' };
const REC = { strong_yes: 'Strong yes', yes: 'Yes', no: 'No', strong_no: 'Strong no' };
const money = (v) => `${Math.round(Number(v) || 0).toLocaleString()} XAF`;
const errMsg = (e, fb) => e?.response?.data?.message || fb;
const d10 = (d) => (d ? String(d).slice(0, 10) : '');
const dt = (d) => (d ? new Date(d).toLocaleString() : '-');
const HR = ['hr', 'admin'];

// ───────────────────────────── Opening form ─────────────────────────────
const OpeningForm = ({ opening, open, onClose, onSaved }) => {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!open) return;
    form.resetFields();
    form.setFieldsValue(opening ? { ...opening, closingDate: d10(opening.closingDate) } : { headcount: 1, employmentType: 'permanent' });
  }, [open, opening, form]);
  const save = async () => {
    try {
      const v = await form.validateFields();
      setSaving(true);
      const r = opening ? await api.put(`/recruitment/openings/${opening._id}`, v) : await api.post('/recruitment/openings', v);
      message.success('Saved'); onSaved(r.data.data);
    } catch (e) { if (e?.response) message.error(errMsg(e, 'Could not save')); } finally { setSaving(false); }
  };
  return (
    <Modal open={open} width={720} title={opening ? `Edit ${opening.reference}` : 'New job opening'} onCancel={onClose} onOk={save} confirmLoading={saving} okText="Save draft" destroyOnClose>
      <Form form={form} layout="vertical">
        <Row gutter={12}>
          <Col span={16}><Form.Item name="title" label="Job title" rules={[{ required: true }]}><Input /></Form.Item></Col>
          <Col span={8}><Form.Item name="headcount" label="Positions"><InputNumber min={1} style={{ width: '100%' }} /></Form.Item></Col>
          <Col span={12}><Form.Item name="department" label="Department" rules={[{ required: true }]}><Input /></Form.Item></Col>
          <Col span={12}><Form.Item name="location" label="Location"><Input /></Form.Item></Col>
          <Col span={8}><Form.Item name="employmentType" label="Contract"><Select options={['permanent', 'fixed_term', 'internship', 'consultant'].map((v) => ({ value: v, label: v.replace('_', ' ') }))} /></Form.Item></Col>
          <Col span={8}><Form.Item name="salaryMin" label="Monthly salary from (XAF)"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
          <Col span={8}><Form.Item name="salaryMax" label="Monthly salary to (XAF)"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
          <Col span={24}><Form.Item name="justification" label="Why is this post needed? (required to submit)"><Input.TextArea rows={2} /></Form.Item></Col>
          <Col span={24}><Form.Item name="description" label="Role description (required to submit)"><Input.TextArea rows={3} /></Form.Item></Col>
          <Col span={24}><Form.Item name="requirements" label="Requirements"><Input.TextArea rows={3} /></Form.Item></Col>
          <Col span={12}><Form.Item name="closingDate" label="Closing date"><Input type="date" /></Form.Item></Col>
        </Row>
      </Form>
    </Modal>
  );
};

// ───────────────────────────── Openings tab ─────────────────────────────
const OpeningsTab = ({ role, onViewPipeline }) => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ open: false, opening: null });
  const [reject, setReject] = useState(null);
  const [reason, setReason] = useState('');
  const load = useCallback(() => {
    setLoading(true);
    api.get('/recruitment/openings').then((r) => setRows(r.data.data)).catch((e) => message.error(errMsg(e, 'Could not load openings'))).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);
  const act = async (id, path, body, ok) => {
    try { await api.post(`/recruitment/openings/${id}/${path}`, body || {}); message.success(ok); load(); return true; }
    catch (e) { message.error(errMsg(e, 'Action failed')); return false; }
  };
  const isHr = HR.includes(role);
  const isCeo = ['ceo', 'admin'].includes(role);
  return (
    <>
      {isHr && <Button type="primary" icon={<PlusOutlined />} style={{ marginBottom: 12 }} onClick={() => setForm({ open: true, opening: null })}>New opening</Button>}
      <Table rowKey="_id" loading={loading} dataSource={rows} pagination={{ pageSize: 12 }} scroll={{ x: 800 }}
        columns={[
          { title: 'Ref', dataIndex: 'reference', width: 110 },
          { title: 'Position', render: (_, r) => <div>{r.title}<br /><Text type="secondary" style={{ fontSize: 12 }}>{r.department}{r.location ? `, ${r.location}` : ''}</Text></div> },
          { title: 'Filled', render: (_, r) => `${r.filled}/${r.headcount}`, width: 70 },
          { title: 'Active candidates', dataIndex: 'activeCandidates', width: 130 },
          { title: 'Status', dataIndex: 'status', render: (s) => <Tag color={OPEN_COLOR[s]}>{OPEN_LABEL[s]}</Tag> },
          {
            title: '', render: (_, r) => (
              <Space wrap>
                {['open', 'on_hold', 'filled', 'closed'].includes(r.status) && <Button size="small" onClick={() => onViewPipeline(r._id)}>Candidates</Button>}
                {isHr && ['draft', 'rejected'].includes(r.status) && <Button size="small" icon={<EditOutlined />} onClick={() => setForm({ open: true, opening: r })} />}
                {isHr && ['draft', 'rejected'].includes(r.status) && <Button size="small" type="primary" icon={<SendOutlined />} onClick={() => act(r._id, 'submit', {}, 'Submitted to the CEO')}>Submit</Button>}
                {isCeo && r.status === 'pending_approval' && <Button size="small" type="primary" icon={<CheckOutlined />} onClick={() => act(r._id, 'approve', {}, 'Opening approved')}>Approve</Button>}
                {isCeo && r.status === 'pending_approval' && <Button size="small" danger icon={<CloseOutlined />} onClick={() => setReject(r)}>Reject</Button>}
                {isHr && r.status === 'open' && <Button size="small" onClick={() => act(r._id, 'status', { status: 'on_hold' }, 'On hold')}>Hold</Button>}
                {isHr && ['on_hold', 'closed', 'filled'].includes(r.status) && <Button size="small" onClick={() => act(r._id, 'status', { status: 'open' }, 'Reopened')}>Reopen</Button>}
                {isHr && ['open', 'on_hold'].includes(r.status) && <Popconfirm title="Close this opening?" onConfirm={() => act(r._id, 'status', { status: 'closed' }, 'Closed')}><Button size="small">Close</Button></Popconfirm>}
              </Space>
            )
          }
        ]}
        expandable={{ expandedRowRender: (r) => (<div><p>{r.description}</p>{r.justification && <p><b>Justification:</b> {r.justification}</p>}{r.rejectionReason && <Alert type="error" message={`Rejected: ${r.rejectionReason}`} />}</div>) }} />
      <OpeningForm opening={form.opening} open={form.open} onClose={() => setForm({ open: false, opening: null })} onSaved={() => { setForm({ open: false, opening: null }); load(); }} />
      <Modal open={!!reject} title="Reject opening" okText="Reject" okButtonProps={{ danger: true, disabled: !reason.trim() }} onCancel={() => setReject(null)}
        onOk={async () => { if (await act(reject._id, 'reject', { reason }, 'Rejected')) { setReject(null); setReason(''); } }}>
        <Input.TextArea rows={3} placeholder="Reason (required)" value={reason} onChange={(e) => setReason(e.target.value)} />
      </Modal>
    </>
  );
};

// ───────────────────────────── Candidate drawer ─────────────────────────────
const UserSelect = ({ value, onChange, multiple }) => {
  const [opts, setOpts] = useState([]);
  const search = (q) => api.get('/recruitment/users-lookup', { params: { q } }).then((r) => setOpts(r.data.data.map((u) => ({ value: u._id, label: `${u.fullName} (${u.department || '-'})` })))).catch(() => {});
  useEffect(() => { search(''); }, []);
  return <Select showSearch filterOption={false} onSearch={search} mode={multiple ? 'multiple' : undefined} value={value} onChange={onChange} options={opts} style={{ width: '100%' }} placeholder="Search by name or email" />;
};

const CandidateDrawer = ({ id, open, onClose, role, onChanged }) => {
  const [c, setC] = useState(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [ivOpen, setIvOpen] = useState(false);
  const [ivForm] = Form.useForm();
  const [offerForm] = Form.useForm();
  const [offerOpen, setOfferOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUser, setLinkUser] = useState(null);
  const isHr = HR.includes(role);

  const load = useCallback(() => { if (id) api.get(`/recruitment/candidates/${id}`).then((r) => setC(r.data.data)).catch((e) => message.error(errMsg(e, 'Could not load candidate'))); }, [id]);
  useEffect(() => { if (open) load(); }, [open, load]);

  const call = async (fn, ok) => {
    setBusy(true);
    try { const r = await fn(); if (ok) message.success(r?.data?.message || ok); await load(); onChanged(); return true; }
    catch (e) { message.error(errMsg(e, 'Action failed')); return false; } finally { setBusy(false); }
  };
  const post = (p, b) => api.post(`/recruitment/candidates/${id}/${p}`, b || {});

  if (!open) return null;
  const closed = c && ['rejected', 'withdrawn', 'hired'].includes(c.stage);

  return (
    <Drawer open={open} onClose={onClose} width={Math.min(820, window.innerWidth)} title={c ? c.name : 'Candidate'} destroyOnClose>
      {c && (
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Space wrap>
            <Tag color={STAGE_COLOR[c.stage]}>{c.stage}</Tag>
            <Text type="secondary">{c.opening?.title} ({c.opening?.reference})</Text>
            {c.avgScore && <Rate disabled allowHalf value={c.avgScore} />}
          </Space>
          {c.stage === 'rejected' && <Alert type="error" showIcon message={`Rejected: ${c.rejectionReason}`} />}
          <Descriptions size="small" column={2} bordered>
            <Descriptions.Item label="Email">{c.email || '-'}</Descriptions.Item>
            <Descriptions.Item label="Phone">{c.phone || '-'}</Descriptions.Item>
            <Descriptions.Item label="Source">{c.source}</Descriptions.Item>
            <Descriptions.Item label="Expected salary">{c.expectedSalary ? money(c.expectedSalary) : '-'}</Descriptions.Item>
            <Descriptions.Item label="Current employer">{c.currentEmployer || '-'}</Descriptions.Item>
            <Descriptions.Item label="CV">{c.cv?.url ? <a href={c.cv.url} target="_blank" rel="noreferrer"><PaperClipOutlined /> {c.cv.name}</a> : '-'}</Descriptions.Item>
          </Descriptions>

          {isHr && !closed && (
            <Space wrap>
              {c.stage === 'applied' && <Button onClick={() => call(() => api.patch(`/recruitment/candidates/${id}/stage`, { stage: 'screening' }), 'Moved to screening')}>Start screening</Button>}
              <Button icon={<CalendarOutlined />} onClick={() => { ivForm.resetFields(); ivForm.setFieldsValue({ mode: 'in_person' }); setIvOpen(true); }}>Schedule interview</Button>
              <Button onClick={() => { offerForm.resetFields(); offerForm.setFieldsValue({ position: c.opening?.title, ...(c.offer?.salary ? { salary: c.offer.salary, startDate: d10(c.offer.startDate), notes: c.offer.notes } : {}) }); setOfferOpen(true); }}>
                {c.offer?.status && c.offer.status !== 'none' ? 'Edit offer' : 'Prepare offer'}
              </Button>
              <Button danger onClick={() => setRejectOpen(true)}>Reject candidate</Button>
            </Space>
          )}

          <Divider orientation="left" plain>Interviews</Divider>
          {c.interviews?.length ? c.interviews.map((i) => (
            <Card size="small" key={i._id} title={`Round ${i.round}: ${dt(i.scheduledAt)}`} extra={<Tag color={i.status === 'cancelled' ? 'red' : i.status === 'done' ? 'green' : 'blue'}>{i.status}</Tag>}>
              <p style={{ margin: 0 }}>{i.mode.replace('_', ' ')}{i.location ? `, ${i.location}` : ''} | Panel: {(i.panel || []).map((p) => p.fullName).join(', ')}</p>
              {(i.feedback || []).map((f) => (
                <div key={f._id} style={{ marginTop: 6 }}><Rate disabled value={f.score} style={{ fontSize: 12 }} /> <Tag>{REC[f.recommendation]}</Tag> <Text type="secondary">{f.byName}</Text><br />{f.comments}</div>
              ))}
              {isHr && i.status === 'scheduled' && <Popconfirm title="Cancel this interview?" onConfirm={() => call(() => post(`interviews/${i._id}/cancel`), 'Cancelled')}><Button size="small" style={{ marginTop: 6 }}>Cancel</Button></Popconfirm>}
            </Card>
          )) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No interviews yet" />}

          {c.offer?.status && c.offer.status !== 'none' && (
            <>
              <Divider orientation="left" plain>Offer</Divider>
              <Descriptions size="small" column={2} bordered>
                <Descriptions.Item label="Position">{c.offer.position}</Descriptions.Item>
                <Descriptions.Item label="Monthly gross">{money(c.offer.salary)}</Descriptions.Item>
                <Descriptions.Item label="Start date">{d10(c.offer.startDate) || '-'}</Descriptions.Item>
                <Descriptions.Item label="Status"><Tag color={c.offer.status === 'accepted' ? 'green' : c.offer.status === 'declined' ? 'red' : 'blue'}>{c.offer.status}</Tag></Descriptions.Item>
              </Descriptions>
              {c.offer.aboveBand && <Alert type="warning" showIcon message="Above the approved salary band. Only the CEO or an admin can send it." />}
              {isHr && (
                <Space wrap>
                  {c.offer.status === 'draft' && <Button type="primary" loading={busy} onClick={() => call(() => post('offer/send'), 'Offer sent')}>Send offer</Button>}
                  {c.offer.status === 'sent' && <Button type="primary" loading={busy} onClick={() => call(() => post('offer/respond', { accepted: true }), 'Offer accepted')}>Mark accepted</Button>}
                  {c.offer.status === 'sent' && <Button danger loading={busy} onClick={() => call(() => post('offer/respond', { accepted: false }), 'Offer declined')}>Mark declined</Button>}
                  {c.offer.status === 'accepted' && c.stage !== 'hired' && (
                    <Popconfirm title="Confirm the hire? This fills one position on the opening." onConfirm={() => call(() => post('hire'), 'Hired')}>
                      <Button type="primary" loading={busy}>Confirm hire</Button>
                    </Popconfirm>
                  )}
                </Space>
              )}
            </>
          )}

          {c.stage === 'hired' && (
            <>
              <Divider orientation="left" plain>Onboarding</Divider>
              <Space direction="vertical">
                <Text>1. Ask IT to create the account: {c.onboarding?.itRequestedAt ? <Tag color="green">requested {dt(c.onboarding.itRequestedAt)}</Tag> : <Tag>not yet</Tag>}</Text>
                <Text>2. Link the account and create the salary profile: {c.onboarding?.hiredUser ? <Tag color="green">linked{c.onboarding.salaryProfileCreated ? ', profile created' : ''}</Tag> : <Tag>not yet</Tag>}</Text>
                {isHr && (
                  <Space wrap>
                    <Button loading={busy} onClick={() => call(() => post('request-account'), 'IT notified')}>{c.onboarding?.itRequestedAt ? 'Notify IT again' : 'Request account from IT'}</Button>
                    {!c.onboarding?.hiredUser && <Button type="primary" onClick={() => { setLinkUser(null); setLinkOpen(true); }}>Link account</Button>}
                  </Space>
                )}
              </Space>
            </>
          )}

          <Divider orientation="left" plain>Notes</Divider>
          <List size="small" dataSource={c.notes} locale={{ emptyText: 'No notes' }}
            renderItem={(n) => <List.Item><div><Text type="secondary">{n.byName} - {dt(n.at)}</Text><br />{n.text}</div></List.Item>} />
          {isHr && (
            <Space.Compact style={{ width: '100%' }}>
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note" />
              <Button disabled={!note.trim()} onClick={async () => { if (await call(() => post('notes', { text: note }))) setNote(''); }}>Add</Button>
            </Space.Compact>
          )}
          <Divider orientation="left" plain>History</Divider>
          <Timeline items={(c.stageHistory || []).map((h) => ({ children: `${h.stage} - ${dt(h.at)}` }))} />
        </Space>
      )}

      <Modal open={rejectOpen} title="Reject candidate" okText="Reject" okButtonProps={{ danger: true, disabled: !reason.trim() }} onCancel={() => setRejectOpen(false)}
        onOk={async () => { if (await call(() => api.patch(`/recruitment/candidates/${id}/stage`, { stage: 'rejected', reason }), 'Rejected')) { setRejectOpen(false); setReason(''); } }}>
        <Input.TextArea rows={3} placeholder="Reason (required)" value={reason} onChange={(e) => setReason(e.target.value)} />
      </Modal>

      <Modal open={ivOpen} title="Schedule interview" okText="Schedule" onCancel={() => setIvOpen(false)} destroyOnClose
        onOk={async () => {
          const v = await ivForm.validateFields();
          if (await call(() => post('interviews', { ...v, scheduledAt: new Date(v.scheduledAt).toISOString() }), 'Interview scheduled')) setIvOpen(false);
        }}>
        <Form form={ivForm} layout="vertical">
          <Row gutter={12}>
            <Col span={12}><Form.Item name="scheduledAt" label="Date and time" rules={[{ required: true }]}><Input type="datetime-local" /></Form.Item></Col>
            <Col span={12}><Form.Item name="mode" label="Mode"><Select options={[{ value: 'in_person', label: 'In person' }, { value: 'phone', label: 'Phone' }, { value: 'video', label: 'Video' }]} /></Form.Item></Col>
            <Col span={24}><Form.Item name="location" label="Room or meeting link"><Input /></Form.Item></Col>
            <Col span={24}><Form.Item name="panel" label="Interview panel" rules={[{ required: true, message: 'Choose at least one interviewer' }]}><UserSelect multiple /></Form.Item></Col>
          </Row>
        </Form>
      </Modal>

      <Modal open={offerOpen} title="Offer" okText="Save offer" onCancel={() => setOfferOpen(false)} destroyOnClose
        onOk={async () => { const v = await offerForm.validateFields(); if (await call(() => api.put(`/recruitment/candidates/${id}/offer`, v), 'Offer saved')) setOfferOpen(false); }}>
        <Form form={offerForm} layout="vertical">
          <Form.Item name="position" label="Position"><Input /></Form.Item>
          <Form.Item name="salary" label="Monthly gross salary (XAF)" rules={[{ required: true }]}><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="startDate" label="Start date"><Input type="date" /></Form.Item>
          <Form.Item name="notes" label="Notes"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>

      <Modal open={linkOpen} title="Link the new account" okText="Link" okButtonProps={{ disabled: !linkUser }} onCancel={() => setLinkOpen(false)}
        onOk={async () => { if (await call(() => post('link-user', { userId: linkUser }), 'Linked')) setLinkOpen(false); }}>
        <p>Pick the account IT created. A salary profile is created from the accepted offer (base salary only, add allowances in Payroll).</p>
        <UserSelect value={linkUser} onChange={setLinkUser} />
      </Modal>
    </Drawer>
  );
};

// ───────────────────────────── Pipeline tab ─────────────────────────────
const PipelineTab = ({ role, openingId, setOpeningId }) => {
  const [openings, setOpenings] = useState([]);
  const [cands, setCands] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openCand, setOpenCand] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [form] = Form.useForm();
  const [file, setFile] = useState(null);
  const isHr = HR.includes(role);

  useEffect(() => { api.get('/recruitment/openings').then((r) => setOpenings(r.data.data.filter((o) => ['open', 'on_hold', 'filled', 'closed'].includes(o.status)))).catch(() => {}); }, []);
  const load = useCallback(() => {
    if (!openingId) { setCands([]); return; }
    setLoading(true);
    api.get('/recruitment/candidates', { params: { opening: openingId } }).then((r) => setCands(r.data.data)).catch((e) => message.error(errMsg(e, 'Could not load candidates'))).finally(() => setLoading(false));
  }, [openingId]);
  useEffect(() => { load(); }, [load]);

  const add = async () => {
    try {
      const v = await form.validateFields();
      const fd = new FormData();
      Object.entries({ ...v, opening: openingId }).forEach(([k, val]) => { if (val !== undefined && val !== null && val !== '') fd.append(k, val); });
      if (file) fd.append('cv', file);
      await api.post('/recruitment/candidates', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      message.success('Candidate added'); setAddOpen(false); setFile(null); load();
    } catch (e) { if (e?.response) message.error(errMsg(e, 'Could not add')); }
  };

  const byStage = useMemo(() => {
    const m = Object.fromEntries(STAGES.map((s) => [s, []]));
    cands.forEach((c) => { if (m[c.stage]) m[c.stage].push(c); });
    return m;
  }, [cands]);
  const out = cands.filter((c) => ['rejected', 'withdrawn'].includes(c.stage));

  return (
    <>
      <Space style={{ marginBottom: 12 }} wrap>
        <Select showSearch optionFilterProp="label" placeholder="Choose an opening" style={{ width: 320 }} value={openingId} onChange={setOpeningId}
          options={openings.map((o) => ({ value: o._id, label: `${o.reference} - ${o.title}` }))} />
        {isHr && openingId && <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setAddOpen(true); }}>Add candidate</Button>}
      </Space>
      {!openingId ? <Empty description="Choose an opening to see its candidates" /> : (
        <>
          <Row gutter={[8, 8]}>
            {STAGES.map((s) => (
              <Col key={s} xs={24} md={Math.floor(24 / STAGES.length) || 4} style={{ minWidth: 170 }}>
                <Card size="small" loading={loading} title={<Space><Tag color={STAGE_COLOR[s]}>{s}</Tag>{byStage[s].length}</Space>} bodyStyle={{ padding: 8, minHeight: 80 }}>
                  {byStage[s].map((c) => (
                    <Card key={c._id} size="small" hoverable style={{ marginBottom: 6 }} onClick={() => setOpenCand(c._id)}>
                      <b>{c.name}</b>
                      {c.avgScore && <div><Rate disabled allowHalf value={c.avgScore} style={{ fontSize: 11 }} /></div>}
                      {c.interviews?.some((i) => i.status === 'scheduled') && <Tag color="purple" style={{ marginTop: 4 }}>interview scheduled</Tag>}
                    </Card>
                  ))}
                </Card>
              </Col>
            ))}
          </Row>
          {out.length > 0 && (
            <>
              <Divider orientation="left" plain>Rejected or withdrawn ({out.length})</Divider>
              <Space wrap>{out.map((c) => <Tag key={c._id} style={{ cursor: 'pointer' }} onClick={() => setOpenCand(c._id)}>{c.name}</Tag>)}</Space>
            </>
          )}
        </>
      )}
      <Modal open={addOpen} title="Add candidate" okText="Add" onCancel={() => setAddOpen(false)} onOk={add} destroyOnClose>
        <Form form={form} layout="vertical" initialValues={{ source: 'other' }}>
          <Form.Item name="name" label="Full name" rules={[{ required: true }]}><Input /></Form.Item>
          <Row gutter={12}>
            <Col span={12}><Form.Item name="email" label="Email"><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="phone" label="Phone"><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="source" label="Source"><Select options={['website', 'referral', 'linkedin', 'agency', 'walk_in', 'other'].map((v) => ({ value: v, label: v.replace('_', ' ') }))} /></Form.Item></Col>
            <Col span={12}><Form.Item name="expectedSalary" label="Expected salary (XAF)"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
          </Row>
          <Form.Item name="currentEmployer" label="Current employer"><Input /></Form.Item>
          <Upload beforeUpload={(f) => { setFile(f); return false; }} onRemove={() => setFile(null)} maxCount={1} fileList={file ? [file] : []}>
            <Button icon={<UploadOutlined />}>Attach CV</Button>
          </Upload>
        </Form>
      </Modal>
      <CandidateDrawer id={openCand} open={!!openCand} onClose={() => setOpenCand(null)} role={role} onChanged={load} />
    </>
  );
};

// ───────────────────────────── My interviews ─────────────────────────────
const MyInterviews = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fb, setFb] = useState(null);
  const [form] = Form.useForm();
  const load = useCallback(() => {
    setLoading(true);
    api.get('/recruitment/my-interviews').then((r) => setRows(r.data.data)).catch((e) => message.error(errMsg(e, 'Could not load interviews'))).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);
  const submit = async () => {
    try {
      const v = await form.validateFields();
      await api.post(`/recruitment/candidates/${fb.candidateId}/interviews/${fb.interviewId}/feedback`, v);
      message.success('Feedback submitted'); setFb(null); load();
    } catch (e) { if (e?.response) message.error(errMsg(e, 'Could not submit')); }
  };
  return (
    <>
      <Table rowKey="interviewId" loading={loading} dataSource={rows} pagination={false} locale={{ emptyText: 'You are not on any interview panel' }}
        columns={[
          { title: 'When', dataIndex: 'scheduledAt', render: dt },
          { title: 'Candidate', dataIndex: 'candidate' },
          { title: 'Role', dataIndex: 'opening' },
          { title: 'Where', render: (_, r) => `${r.mode.replace('_', ' ')}${r.location ? `, ${r.location}` : ''}` },
          { title: '', render: (_, r) => (r.submitted ? <Tag color="green">Feedback sent</Tag> : <Button size="small" type="primary" onClick={() => { form.resetFields(); setFb(r); }}>Give feedback</Button>) }
        ]} />
      <Modal open={!!fb} title={`Feedback: ${fb?.candidate || ''}`} okText="Submit" onCancel={() => setFb(null)} onOk={submit} destroyOnClose>
        <Form form={form} layout="vertical">
          <Form.Item name="score" label="Overall score" rules={[{ required: true }]}><Rate /></Form.Item>
          <Form.Item name="recommendation" label="Recommendation" rules={[{ required: true }]}><Select options={Object.entries(REC).map(([value, label]) => ({ value, label }))} /></Form.Item>
          <Form.Item name="comments" label="Comments"><Input.TextArea rows={4} /></Form.Item>
        </Form>
      </Modal>
    </>
  );
};

// ───────────────────────────── Page ─────────────────────────────
const Recruitment = () => {
  const { user } = useSelector((s) => s.auth);
  const role = user?.role;
  const staff = ['hr', 'admin', 'ceo'].includes(role);
  const [tab, setTab] = useState(staff ? 'openings' : 'mine');
  const [openingId, setOpeningId] = useState(null);
  const items = [
    ...(staff ? [
      { key: 'openings', label: 'Job openings', children: <OpeningsTab role={role} onViewPipeline={(id) => { setOpeningId(id); setTab('pipeline'); }} /> },
      { key: 'pipeline', label: 'Candidates', children: <PipelineTab role={role} openingId={openingId} setOpeningId={setOpeningId} /> }
    ] : []),
    { key: 'mine', label: 'My interviews', children: <MyInterviews /> }
  ];
  return (
    <div style={{ padding: 16 }}>
      <Title level={3} style={{ marginTop: 0 }}>Recruitment</Title>
      <Card><Tabs items={items} activeKey={tab} onChange={setTab} destroyInactiveTabPane /></Card>
    </div>
  );
};

export default Recruitment;

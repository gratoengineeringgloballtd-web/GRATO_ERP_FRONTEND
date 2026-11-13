import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Tabs, Card, Button, Space, Tag, Table, Modal, Form, Input, InputNumber, Select, Typography, message, Popconfirm,
  Drawer, Alert, Row, Col, Statistic, Upload, List, Empty, Switch, Descriptions, Divider
} from 'antd';
import { PlusOutlined, UploadOutlined, SearchOutlined, DeleteOutlined, EditOutlined, FileTextOutlined, DownloadOutlined, InboxOutlined } from '@ant-design/icons';
import { useSelector } from 'react-redux';
import api from '../../services/api';

const { Title, Text } = Typography;
const CATEGORIES = ['contract', 'certificate', 'licence', 'insurance', 'invoice', 'report', 'letter', 'policy', 'id_document', 'medical', 'disciplinary', 'payslip', 'other'];
const catOpts = CATEGORIES.map((c) => ({ value: c, label: c.replace('_', ' ') }));
const errMsg = (e, fb) => e?.response?.data?.message || fb;
const d10 = (d) => (d ? String(d).slice(0, 10) : '');
const dt = (d) => (d ? new Date(d).toLocaleDateString() : '-');
const HR = ['hr', 'admin'];
const SRC_COLOR = { Document: 'blue', Folders: 'cyan', Compliance: 'purple', Contract: 'geekblue', Signatures: 'orange', Policy: 'green' };

const daysTag = (n) => (n < 0 ? <Tag color="red">expired {-n}d ago</Tag> : n <= 7 ? <Tag color="red">{n}d left</Tag> : n <= 30 ? <Tag color="orange">{n}d left</Tag> : <Tag color="gold">{n}d left</Tag>);

// ───────────────────────────── Overview ─────────────────────────────
const Overview = ({ refreshKey }) => {
  const [d, setD] = useState(null);
  useEffect(() => { api.get('/documents/dashboard').then((r) => setD(r.data.data)).catch(() => {}); }, [refreshKey]);
  if (!d) return null;
  const tile = (title, value, color) => (value === undefined ? null : <Col xs={12} md={6} lg={4} key={title}><Card size="small"><Statistic title={title} value={value} valueStyle={{ color: value ? color : undefined }} /></Card></Col>);
  return (
    <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
      {tile('Expired', d.expired, '#cf1322')}
      {tile('Expiring in 30 days', d.expiring30, '#d46b08')}
      {tile('Expiring in 31-90 days', d.expiring90, '#d4b106')}
      {tile('Awaiting your signature', d.awaitingMySignature, '#1677ff')}
      {tile('Policies to acknowledge', d.policiesToAcknowledge, '#1677ff')}
      {tile('Retention review due', d.retentionDue, '#d46b08')}
      {tile('Pending signatures (all)', d.pendingSignatures, '#1677ff')}
    </Row>
  );
};

// ───────────────────────────── Search ─────────────────────────────
const SearchTab = () => {
  const [q, setQ] = useState('');
  const [rows, setRows] = useState(null);
  const [loading, setLoading] = useState(false);
  const go = async (value) => {
    const term = (value ?? q).trim();
    if (term.length < 2) { message.info('Type at least 2 characters'); return; }
    setLoading(true);
    try { const r = await api.get('/documents/search', { params: { q: term } }); setRows(r.data.data); }
    catch (e) { message.error(errMsg(e, 'Search failed')); } finally { setLoading(false); }
  };
  return (
    <>
      <Input.Search size="large" allowClear enterButton={<SearchOutlined />} placeholder="Search documents, folders, contracts, policies, compliance and signatures"
        value={q} onChange={(e) => setQ(e.target.value)} onSearch={go} loading={loading} style={{ maxWidth: 720 }} />
      <div style={{ marginTop: 16 }}>
        {rows === null ? <Text type="secondary">Results only include what you have access to.</Text> : (
          <List dataSource={rows} locale={{ emptyText: <Empty description="Nothing found" /> }}
            renderItem={(r) => (
              <List.Item actions={[r.url ? <a key="o" href={r.url} target="_blank" rel="noreferrer"><DownloadOutlined /> Open file</a> : r.route ? <a key="r" href={r.route}>Open module</a> : null].filter(Boolean)}>
                <List.Item.Meta avatar={<Tag color={SRC_COLOR[r.source]}>{r.source}</Tag>} title={r.title} description={`${r.subtitle || ''}${r.date ? ` | ${dt(r.date)}` : ''}`} />
              </List.Item>
            )} />
        )}
      </div>
    </>
  );
};

// ───────────────────────────── Upload modal ─────────────────────────────
const LinkPicker = ({ value, onChange }) => {
  const [models, setModels] = useState([]);
  const [model, setModel] = useState(value?.model);
  const [opts, setOpts] = useState([]);
  useEffect(() => { api.get('/documents/link-models').then((r) => setModels(r.data.data)).catch(() => {}); }, []);
  const search = useCallback((q) => {
    if (!model || model === 'Other') return;
    api.get('/documents/link-targets', { params: { model, q } }).then((r) => setOpts(r.data.data.map((o) => ({ value: o.id, label: o.label })))).catch(() => {});
  }, [model]);
  useEffect(() => { search(''); }, [search]);
  return (
    <Space.Compact style={{ width: '100%' }}>
      <Select style={{ width: 150 }} placeholder="Record type" value={model} onChange={(m) => { setModel(m); onChange({ model: m }); }} options={models.map((m) => ({ value: m, label: m }))} />
      {model === 'Other' || !model ? (
        <Input placeholder="Reference or name" onChange={(e) => onChange({ model: model || 'Other', label: e.target.value })} />
      ) : (
        <Select showSearch filterOption={false} onSearch={search} style={{ flex: 1 }} placeholder="Search the record" options={opts}
          onChange={(id, o) => onChange({ model, id, label: o.label })} />
      )}
    </Space.Compact>
  );
};

const UploadModal = ({ open, onClose, onDone, scope, employee, role }) => {
  const [form] = Form.useForm();
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (open) { form.resetFields(); setFile(null); form.setFieldsValue({ category: 'other', visibility: 'department', reminderDays: '60,30,7' }); } }, [open, form]);
  const save = async () => {
    try {
      const v = await form.validateFields();
      if (!file) { message.error('Attach a file'); return; }
      setSaving(true);
      const fd = new FormData();
      const link = v.link || {};
      const body = {
        title: v.title, description: v.description, category: v.category, reference: v.reference, tags: v.tags, documentDate: v.documentDate,
        expiryDate: v.expiryDate, reminderDays: v.reminderDays, visibility: v.visibility, retentionYears: v.retentionYears,
        scope, employee: employee?._id, employeeCanView: v.employeeCanView,
        linkedModel: link.model, linkedId: link.id, linkedLabel: link.label
      };
      Object.entries(body).forEach(([k, val]) => { if (val !== undefined && val !== null && val !== '') fd.append(k, val); });
      fd.append('file', file);
      await api.post('/documents/library', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      message.success('Uploaded'); onDone();
    } catch (e) { if (e?.response) message.error(errMsg(e, 'Upload failed')); } finally { setSaving(false); }
  };
  const title = scope === 'employee' ? `Add to ${employee?.fullName || 'employee'} file` : scope === 'linked' ? 'Attach document to a record' : 'Upload document';
  return (
    <Modal open={open} width={720} title={title} onCancel={onClose} onOk={save} confirmLoading={saving} okText="Upload" destroyOnClose>
      <Form form={form} layout="vertical">
        <Row gutter={12}>
          <Col span={16}><Form.Item name="title" label="Title" rules={[{ required: true }]}><Input /></Form.Item></Col>
          <Col span={8}><Form.Item name="category" label="Category"><Select options={catOpts} /></Form.Item></Col>
          {scope === 'linked' && <Col span={24}><Form.Item name="link" label="Belongs to" rules={[{ required: true, message: 'Choose the record' }]}><LinkPicker /></Form.Item></Col>}
          <Col span={8}><Form.Item name="reference" label="Reference no."><Input /></Form.Item></Col>
          <Col span={8}><Form.Item name="documentDate" label="Document date"><Input type="date" /></Form.Item></Col>
          <Col span={8}><Form.Item name="expiryDate" label="Expires on"><Input type="date" /></Form.Item></Col>
          <Col span={12}><Form.Item name="reminderDays" label="Remind (days before expiry)"><Input placeholder="60,30,7" /></Form.Item></Col>
          <Col span={12}><Form.Item name="tags" label="Tags (comma separated)"><Input /></Form.Item></Col>
          {scope !== 'employee' ? (
            <Col span={12}><Form.Item name="visibility" label="Who can see it"><Select options={[{ value: 'company', label: 'Everyone' }, { value: 'department', label: 'My department' }, { value: 'private', label: 'Only me and admins' }]} /></Form.Item></Col>
          ) : (
            <Col span={12}><Form.Item name="employeeCanView" label="Employee can see this document" valuePropName="checked"><Switch /></Form.Item></Col>
          )}
          {role === 'admin' && <Col span={12}><Form.Item name="retentionYears" label="Keep for (years, overrides default)"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>}
          <Col span={24}><Form.Item name="description" label="Description"><Input.TextArea rows={2} /></Form.Item></Col>
        </Row>
        <Upload.Dragger beforeUpload={(f) => { setFile(f); return false; }} onRemove={() => setFile(null)} maxCount={1} fileList={file ? [file] : []}>
          <p className="ant-upload-drag-icon"><InboxOutlined /></p>
          <p>Click or drag a file here (up to 10 MB)</p>
        </Upload.Dragger>
      </Form>
    </Modal>
  );
};

// ───────────────────────────── Detail drawer ─────────────────────────────
const DocDrawer = ({ id, open, onClose, onChanged }) => {
  const [d, setD] = useState(null);
  const [busy, setBusy] = useState(false);
  const [edit, setEdit] = useState(false);
  const [form] = Form.useForm();
  const load = useCallback(() => { if (id) api.get(`/documents/library/${id}`).then((r) => setD(r.data.data)).catch((e) => message.error(errMsg(e, 'Could not load'))); }, [id]);
  useEffect(() => { if (open) load(); }, [open, load]);
  if (!open) return null;

  const newVersion = async ({ file, onSuccess, onError }) => {
    const fd = new FormData(); fd.append('file', file);
    try { await api.post(`/documents/library/${id}/version`, fd, { headers: { 'Content-Type': 'multipart/form-data' } }); message.success('New version uploaded'); load(); onChanged(); onSuccess('ok'); }
    catch (e) { message.error(errMsg(e, 'Upload failed')); onError(e); }
  };
  const saveEdit = async () => {
    try {
      const v = await form.validateFields();
      setBusy(true);
      await api.put(`/documents/library/${id}`, v);
      message.success('Saved'); setEdit(false); load(); onChanged();
    } catch (e) { if (e?.response) message.error(errMsg(e, 'Could not save')); } finally { setBusy(false); }
  };
  const archive = async () => { try { await api.post(`/documents/library/${id}/archive`); message.success('Archived'); onChanged(); onClose(); } catch (e) { message.error(errMsg(e, 'Could not archive')); } };
  const remove = async () => { try { await api.delete(`/documents/library/${id}`); message.success('Deleted'); onChanged(); onClose(); } catch (e) { message.error(errMsg(e, 'Could not delete')); } };

  return (
    <Drawer open={open} onClose={onClose} width={Math.min(640, window.innerWidth)} title={d?.title || 'Document'} destroyOnClose>
      {d && (
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Space wrap>
            <Tag>{d.category}</Tag>
            <Tag color={d.scope === 'employee' ? 'purple' : d.scope === 'linked' ? 'blue' : 'default'}>{d.scope}</Tag>
            {d.retentionStatus !== 'active' && <Tag color={d.retentionStatus === 'due' ? 'orange' : 'default'}>{d.retentionStatus === 'due' ? 'retention review due' : d.retentionStatus}</Tag>}
            {d.expiryDate && daysTag(Math.ceil((new Date(d.expiryDate) - Date.now()) / 86400000))}
          </Space>
          <Descriptions size="small" column={1} bordered>
            {d.reference && <Descriptions.Item label="Reference">{d.reference}</Descriptions.Item>}
            {d.linkedTo?.label && <Descriptions.Item label="Belongs to">{d.linkedTo.model}: {d.linkedTo.label}</Descriptions.Item>}
            {d.employee && <Descriptions.Item label="Employee">{d.employee.fullName}{d.employeeCanView ? ' (employee can see)' : ''}</Descriptions.Item>}
            <Descriptions.Item label="Document date">{dt(d.documentDate)}</Descriptions.Item>
            <Descriptions.Item label="Expires">{dt(d.expiryDate)}</Descriptions.Item>
            <Descriptions.Item label="Keep until">{d.retainUntil ? dt(d.retainUntil) : 'No limit set'}</Descriptions.Item>
            <Descriptions.Item label="Uploaded by">{d.uploadedBy?.fullName} on {dt(d.createdAt)}</Descriptions.Item>
            {d.tags?.length > 0 && <Descriptions.Item label="Tags">{d.tags.map((t) => <Tag key={t}>{t}</Tag>)}</Descriptions.Item>}
            {d.description && <Descriptions.Item label="Description">{d.description}</Descriptions.Item>}
          </Descriptions>
          {d.file && <Button type="primary" icon={<DownloadOutlined />} href={d.file.url} target="_blank">Open {d.file.name}</Button>}
          {d.versions?.length > 0 && (
            <>
              <Divider orientation="left" plain>Earlier versions</Divider>
              <List size="small" dataSource={[...d.versions].reverse()} renderItem={(v, i) => <List.Item><a href={v.url} target="_blank" rel="noreferrer">v{d.versions.length - i}: {v.name}</a> <Text type="secondary">{dt(v.uploadedAt)}</Text></List.Item>} />
            </>
          )}
          {d.canEdit && (
            <Space wrap>
              <Button icon={<EditOutlined />} onClick={() => { form.setFieldsValue({ title: d.title, description: d.description, category: d.category, reference: d.reference, expiryDate: d10(d.expiryDate), documentDate: d10(d.documentDate), tags: (d.tags || []).join(',') }); setEdit(true); }}>Edit details</Button>
              <Upload customRequest={newVersion} showUploadList={false}><Button icon={<UploadOutlined />}>Upload new version</Button></Upload>
              {d.retentionStatus !== 'archived' && <Popconfirm title="Archive this document? It stays stored but leaves the main list." onConfirm={archive}><Button>Archive</Button></Popconfirm>}
              <Popconfirm title="Delete permanently? Only possible after the retention period." onConfirm={remove}><Button danger icon={<DeleteOutlined />}>Delete (admin)</Button></Popconfirm>
            </Space>
          )}
        </Space>
      )}
      <Modal open={edit} title="Edit details" onCancel={() => setEdit(false)} onOk={saveEdit} confirmLoading={busy} destroyOnClose>
        <Form form={form} layout="vertical">
          <Form.Item name="title" label="Title" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="category" label="Category"><Select options={catOpts} /></Form.Item>
          <Form.Item name="reference" label="Reference"><Input /></Form.Item>
          <Row gutter={12}>
            <Col span={12}><Form.Item name="documentDate" label="Document date"><Input type="date" /></Form.Item></Col>
            <Col span={12}><Form.Item name="expiryDate" label="Expires on"><Input type="date" /></Form.Item></Col>
          </Row>
          <Form.Item name="tags" label="Tags"><Input /></Form.Item>
          <Form.Item name="description" label="Description"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>
    </Drawer>
  );
};

const docColumns = (onOpen) => [
  { title: 'Title', dataIndex: 'title', render: (v, r) => <a onClick={() => onOpen(r._id)}>{v}</a> },
  { title: 'Category', dataIndex: 'category', width: 120, render: (v) => <Tag>{v.replace('_', ' ')}</Tag> },
  { title: 'Belongs to', render: (_, r) => r.employee?.fullName || r.linkedTo?.label || '-' },
  { title: 'Expires', dataIndex: 'expiryDate', width: 130, render: (v) => (v ? <span>{dt(v)} {daysTag(Math.ceil((new Date(v) - Date.now()) / 86400000))}</span> : '-') },
  { title: 'Uploaded', dataIndex: 'createdAt', width: 110, render: dt }
];

// ───────────────────────────── Library ─────────────────────────────
const LibraryTab = ({ role, onChanged }) => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [scope, setScope] = useState('general');
  const [cat, setCat] = useState();
  const [q, setQ] = useState('');
  const [up, setUp] = useState(null);
  const [open, setOpen] = useState(null);
  const [key, setKey] = useState(0);
  useEffect(() => {
    setLoading(true);
    api.get('/documents/library', { params: { scope: scope === 'all' ? undefined : scope, category: cat, q: q || undefined } })
      .then((r) => setRows(r.data.data.filter((d) => d.scope !== 'employee'))).catch((e) => message.error(errMsg(e, 'Could not load'))).finally(() => setLoading(false));
  }, [scope, cat, q, key]);
  const refresh = () => { setKey((k) => k + 1); onChanged(); };
  return (
    <>
      <Space wrap style={{ marginBottom: 12 }}>
        <Select value={scope} onChange={setScope} style={{ width: 180 }} options={[{ value: 'general', label: 'Company library' }, { value: 'linked', label: 'Attached to records' }, { value: 'all', label: 'All' }]} />
        <Select allowClear placeholder="Category" value={cat} onChange={setCat} style={{ width: 160 }} options={catOpts} />
        <Input.Search allowClear placeholder="Filter" style={{ width: 220 }} onSearch={setQ} />
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setUp('general')}>Upload</Button>
        <Button icon={<PlusOutlined />} onClick={() => setUp('linked')}>Attach to a record</Button>
      </Space>
      <Table rowKey="_id" size="small" loading={loading} dataSource={rows} columns={docColumns(setOpen)} pagination={{ pageSize: 15 }} scroll={{ x: 700 }} />
      <UploadModal open={!!up} scope={up} role={role} onClose={() => setUp(null)} onDone={() => { setUp(null); refresh(); }} />
      <DocDrawer id={open} open={!!open} onClose={() => setOpen(null)} onChanged={refresh} />
    </>
  );
};

// ───────────────────────────── Expiring ─────────────────────────────
const ExpiringTab = ({ role }) => {
  const [rows, setRows] = useState([]);
  const [days, setDays] = useState(90);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    setLoading(true);
    api.get('/documents/expiring', { params: { days } }).then((r) => setRows(r.data.data)).catch((e) => message.error(errMsg(e, 'Could not load'))).finally(() => setLoading(false));
  }, [days]);
  const run = async () => { try { const r = await api.post('/documents/run-reminders'); message.success(`${r.data.data.sent} reminder email(s) sent`); } catch (e) { message.error(errMsg(e, 'Failed')); } };
  return (
    <>
      <Space style={{ marginBottom: 12 }} wrap>
        <Select value={days} onChange={setDays} style={{ width: 200 }} options={[30, 60, 90, 180, 365].map((n) => ({ value: n, label: `Next ${n} days` }))} />
        {role === 'admin' && <Popconfirm title="Send reminder emails now?" onConfirm={run}><Button>Send reminders now</Button></Popconfirm>}
      </Space>
      <Table rowKey={(r) => `${r.source}-${r.id}`} size="small" loading={loading} dataSource={rows} pagination={{ pageSize: 15 }}
        columns={[
          { title: 'Source', dataIndex: 'source', width: 110, render: (v) => <Tag color={SRC_COLOR[v]}>{v}</Tag> },
          { title: 'Document', dataIndex: 'title', render: (v, r) => <div>{v}<br /><Text type="secondary" style={{ fontSize: 12 }}>{r.subtitle}</Text></div> },
          { title: 'Expires', dataIndex: 'expiryDate', render: dt, width: 110 },
          { title: '', dataIndex: 'daysLeft', width: 140, render: daysTag },
          { title: '', render: (_, r) => r.url && <a href={r.url} target="_blank" rel="noreferrer">Open</a>, width: 70 }
        ]} />
      <Text type="secondary">Reminder emails go out daily at 07:00: to the uploader and chosen contacts for documents, and to HR and admins for compliance documents and contracts.</Text>
    </>
  );
};

// ───────────────────────────── Employee files ─────────────────────────────
const EmployeeFilesTab = ({ role, onChanged }) => {
  const [emps, setEmps] = useState([]);
  const [emp, setEmp] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [up, setUp] = useState(false);
  const [open, setOpen] = useState(null);
  const [key, setKey] = useState(0);
  const search = useCallback((q) => api.get('/documents/employees-lookup', { params: { q } }).then((r) => setEmps(r.data.data)).catch(() => {}), []);
  useEffect(() => { search(''); }, [search]);
  useEffect(() => {
    if (!emp) { setRows([]); return; }
    setLoading(true);
    api.get(`/documents/employee-file/${emp._id}`).then((r) => setRows(r.data.data)).catch((e) => message.error(errMsg(e, 'Could not load'))).finally(() => setLoading(false));
  }, [emp, key]);
  const refresh = () => { setKey((k) => k + 1); onChanged(); };
  return (
    <>
      <Alert type="info" showIcon style={{ marginBottom: 12 }} message="Employee files are private to HR, admins and the CEO. An employee only sees a document if you switch that on when uploading." />
      <Space wrap style={{ marginBottom: 12 }}>
        <Select showSearch filterOption={false} onSearch={search} style={{ width: 320 }} placeholder="Choose an employee" value={emp?._id}
          onChange={(id) => setEmp(emps.find((e) => e._id === id))} options={emps.map((e) => ({ value: e._id, label: `${e.fullName} (${e.department || '-'})` }))} />
        {emp && HR.includes(role) && <Button type="primary" icon={<PlusOutlined />} onClick={() => setUp(true)}>Add document</Button>}
      </Space>
      {emp ? <Table rowKey="_id" size="small" loading={loading} dataSource={rows} columns={docColumns(setOpen)} pagination={{ pageSize: 15 }} locale={{ emptyText: 'No documents in this file yet' }} /> : <Empty description="Choose an employee" />}
      <UploadModal open={up} scope="employee" employee={emp} role={role} onClose={() => setUp(false)} onDone={() => { setUp(false); refresh(); }} />
      <DocDrawer id={open} open={!!open} onClose={() => setOpen(null)} onChanged={refresh} />
    </>
  );
};

const MyFileTab = () => {
  const [rows, setRows] = useState([]);
  useEffect(() => { api.get('/documents/my-file').then((r) => setRows(r.data.data)).catch(() => {}); }, []);
  return (
    <List dataSource={rows} locale={{ emptyText: 'No documents have been shared with you from your HR file' }}
      renderItem={(d) => <List.Item actions={[<a key="o" href={d.file?.url} target="_blank" rel="noreferrer">Open</a>]}><List.Item.Meta avatar={<FileTextOutlined />} title={d.title} description={`${d.category.replace('_', ' ')} | ${dt(d.createdAt)}`} /></List.Item>} />
  );
};

// ───────────────────────────── Templates ─────────────────────────────
const TemplatesTab = ({ role, onChanged }) => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [edit, setEdit] = useState(null);
  const [gen, setGen] = useState(null);
  const [form] = Form.useForm();
  const [genForm] = Form.useForm();
  const [ctxType, setCtxType] = useState('employee');
  const [ctxId, setCtxId] = useState(null);
  const [people, setPeople] = useState([]);
  const [cands, setCands] = useState([]);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const canEditTpl = HR.includes(role);
  const load = useCallback(() => {
    setLoading(true);
    api.get('/documents/templates', { params: { all: canEditTpl ? 1 : undefined } }).then((r) => setRows(r.data.data)).catch((e) => message.error(errMsg(e, 'Could not load templates'))).finally(() => setLoading(false));
  }, [canEditTpl]);
  useEffect(() => { load(); }, [load]);

  const saveTpl = async () => {
    try {
      const v = await form.validateFields();
      if (edit._id) await api.put(`/documents/templates/${edit._id}`, v); else await api.post('/documents/templates', v);
      message.success('Saved'); setEdit(null); load();
    } catch (e) { if (e?.response) message.error(errMsg(e, 'Could not save')); }
  };
  const openGen = (t) => {
    setGen(t); setPreview(null); setCtxId(null); genForm.resetFields();
    api.get('/documents/employees-lookup', { params: { q: '' } }).then((r) => setPeople(r.data.data)).catch(() => {});
    api.get('/recruitment/candidates').then((r) => setCands(r.data.data)).catch(() => setCands([]));
  };
  const body = () => ({ values: genForm.getFieldsValue(), context: ctxId ? { type: ctxType, id: ctxId } : undefined });
  const doPreview = async () => {
    try { const r = await api.post(`/documents/templates/${gen._id}/preview`, body()); setPreview(r.data.data); genForm.setFieldsValue(Object.fromEntries(Object.entries(r.data.data.values).filter(([k]) => gen.placeholders.includes(k)))); }
    catch (e) { message.error(errMsg(e, 'Preview failed')); }
  };
  const doGenerate = async (allowBlanks) => {
    setBusy(true);
    try { await api.post(`/documents/templates/${gen._id}/generate`, { ...body(), allowBlanks }); message.success('Document generated and filed'); setGen(null); onChanged(); }
    catch (e) { message.error(errMsg(e, 'Could not generate')); } finally { setBusy(false); }
  };

  return (
    <>
      {canEditTpl && <Button type="primary" icon={<PlusOutlined />} style={{ marginBottom: 12 }} onClick={() => { form.resetFields(); form.setFieldsValue({ category: 'letter', body: 'Dear {{employee_name}},\n\n...\n\nKind regards,\n{{company_name}}' }); setEdit({}); }}>New template</Button>}
      <Table rowKey="_id" size="small" loading={loading} dataSource={rows} pagination={false}
        columns={[
          { title: 'Template', dataIndex: 'name', render: (v, r) => <div>{v}{!r.active && <Tag style={{ marginLeft: 8 }}>inactive</Tag>}<br /><Text type="secondary" style={{ fontSize: 12 }}>{r.description}</Text></div> },
          { title: 'Fields', dataIndex: 'placeholders', render: (p) => p.map((x) => <Tag key={x}>{x}</Tag>) },
          {
            title: '', render: (_, r) => (
              <Space>
                {canEditTpl && r.active && <Button size="small" type="primary" onClick={() => openGen(r)}>Generate</Button>}
                {canEditTpl && <Button size="small" icon={<EditOutlined />} onClick={() => { form.setFieldsValue(r); setEdit(r); }} />}
              </Space>
            )
          }
        ]} />
      <Modal open={!!edit} width={720} title={edit?._id ? 'Edit template' : 'New template'} onCancel={() => setEdit(null)} onOk={saveTpl} destroyOnClose>
        <Form form={form} layout="vertical">
          <Row gutter={12}>
            <Col span={16}><Form.Item name="name" label="Name" rules={[{ required: true }]}><Input /></Form.Item></Col>
            <Col span={8}><Form.Item name="category" label="Filed as"><Select options={catOpts} /></Form.Item></Col>
          </Row>
          <Form.Item name="subject" label="Document title (can use {{fields}})"><Input placeholder="Offer letter - {{candidate_name}}" /></Form.Item>
          <Form.Item name="body" label="Text" rules={[{ required: true }]} extra="Use {{field_name}} for values. Filled automatically when you pick a person: employee_name, employee_email, position, department, candidate_name, candidate_email, salary, start_date, company_name, today."><Input.TextArea rows={12} /></Form.Item>
          <Form.Item name="description" label="Note"><Input /></Form.Item>
          {edit?._id && <Form.Item name="active" label="Active" valuePropName="checked"><Switch /></Form.Item>}
        </Form>
      </Modal>
      <Modal open={!!gen} width={760} title={`Generate: ${gen?.name || ''}`} onCancel={() => setGen(null)} destroyOnClose
        footer={[<Button key="p" onClick={doPreview}>Preview</Button>, <Button key="g" type="primary" loading={busy} onClick={() => doGenerate(false)}>Generate and file as PDF</Button>]}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Space.Compact style={{ width: '100%' }}>
            <Select value={ctxType} onChange={(t) => { setCtxType(t); setCtxId(null); }} style={{ width: 140 }} options={[{ value: 'employee', label: 'Employee' }, { value: 'candidate', label: 'Candidate' }]} />
            <Select showSearch optionFilterProp="label" style={{ flex: 1 }} placeholder="Fill from a person (optional)" value={ctxId} allowClear onChange={setCtxId}
              options={(ctxType === 'employee' ? people.map((p) => ({ value: p._id, label: p.fullName })) : cands.map((c) => ({ value: c._id, label: `${c.name}` })))} />
          </Space.Compact>
          <Form form={genForm} layout="vertical">
            <Row gutter={12}>{(gen?.placeholders || []).map((p) => <Col span={12} key={p}><Form.Item name={p} label={p}><Input /></Form.Item></Col>)}</Row>
          </Form>
          {preview && <Card size="small" title={preview.title}><div style={{ whiteSpace: 'pre-wrap' }}>{preview.text}</div>{/\[[a-zA-Z0-9_]+\]/.test(preview.text) && <Alert type="warning" showIcon style={{ marginTop: 8 }} message="Fields shown in [brackets] are still empty" action={<Button size="small" onClick={() => doGenerate(true)}>Generate anyway</Button>} />}</Card>}
        </Space>
      </Modal>
    </>
  );
};

// ───────────────────────────── Retention ─────────────────────────────
const RetentionTab = ({ role, onChanged }) => {
  const [rules, setRules] = useState([]);
  const [due, setDue] = useState([]);
  const [key, setKey] = useState(0);
  const [ext, setExt] = useState(null);
  const [years, setYears] = useState(1);
  const canDue = ['admin', 'hr'].includes(role);
  useEffect(() => {
    api.get('/documents/retention/rules').then((r) => setRules(r.data.data)).catch(() => {});
    if (canDue) api.get('/documents/retention/due').then((r) => setDue(r.data.data)).catch(() => {});
  }, [key, canDue]);
  const setRule = async (category, y) => { try { await api.put(`/documents/retention/rules/${category}`, { years: y }); message.success('Saved'); setKey((k) => k + 1); } catch (e) { message.error(errMsg(e, 'Could not save')); } };
  const act = async (id, action, body) => { try { await api.post(`/documents/retention/${id}/${action}`, body || {}); setKey((k) => k + 1); onChanged(); return true; } catch (e) { message.error(errMsg(e, 'Failed')); return false; } };
  return (
    <>
      <Alert type="warning" showIcon style={{ marginBottom: 12 }} message="Confirm these periods with your accountant or lawyer"
        description="The starting periods are common defaults, not legal advice. Documents past their period are only flagged for review. Nothing is deleted automatically, and the files stay stored when archived." />
      {canDue && (
        <>
          <Title level={5}>Due for review ({due.length})</Title>
          <Table rowKey="_id" size="small" dataSource={due} pagination={{ pageSize: 8 }} locale={{ emptyText: 'Nothing is due for review' }}
            columns={[
              { title: 'Document', dataIndex: 'title' },
              { title: 'Category', dataIndex: 'category', render: (v) => <Tag>{v.replace('_', ' ')}</Tag> },
              { title: 'Kept until', dataIndex: 'retainUntil', render: dt },
              { title: '', render: (_, r) => (<Space><Button size="small" onClick={() => { setExt(r); setYears(1); }}>Extend</Button><Popconfirm title="Archive this document?" onConfirm={() => act(r._id, 'archive')}><Button size="small">Archive</Button></Popconfirm></Space>) }
            ]} />
        </>
      )}
      <Divider orientation="left">Retention periods</Divider>
      <Table rowKey="category" size="small" dataSource={rules} pagination={false}
        columns={[
          { title: 'Category', dataIndex: 'category', render: (v) => v.replace('_', ' ') },
          { title: 'Keep for (years, 0 = no limit)', dataIndex: 'years', render: (v, r) => (role === 'admin' ? <InputNumber min={0} defaultValue={v} onBlur={(e) => { const n = Number(e.target.value); if (n !== v && !Number.isNaN(n)) setRule(r.category, n); }} /> : v) },
          { title: 'Note', dataIndex: 'note' }
        ]} />
      <Modal open={!!ext} title="Extend retention" onCancel={() => setExt(null)} onOk={async () => { if (await act(ext._id, 'extend', { years })) setExt(null); }}>
        <p>Keep <b>{ext?.title}</b> for further years:</p><InputNumber min={1} value={years} onChange={setYears} />
      </Modal>
    </>
  );
};

// ───────────────────────────── Page ─────────────────────────────
const DocumentHub = () => {
  const { user } = useSelector((s) => s.auth);
  const role = user?.role;
  const [key, setKey] = useState(0);
  const bump = () => setKey((k) => k + 1);
  const items = [
    { key: 'search', label: 'Search', children: <SearchTab /> },
    { key: 'library', label: 'Library', children: <LibraryTab role={role} onChanged={bump} /> },
    { key: 'expiring', label: 'Expiring', children: <ExpiringTab role={role} /> },
    ...(['hr', 'admin', 'ceo'].includes(role) ? [{ key: 'employees', label: 'Employee files', children: <EmployeeFilesTab role={role} onChanged={bump} /> }] : []),
    { key: 'mine', label: 'My HR file', children: <MyFileTab /> },
    ...(['hr', 'admin', 'ceo', 'finance'].includes(role) ? [{ key: 'templates', label: 'Templates', children: <TemplatesTab role={role} onChanged={bump} /> }] : []),
    ...(['hr', 'admin', 'ceo', 'finance'].includes(role) ? [{ key: 'retention', label: 'Retention', children: <RetentionTab role={role} onChanged={bump} /> }] : [])
  ];
  return (
    <div style={{ padding: 16 }}>
      <Title level={3} style={{ marginTop: 0 }}>Documents</Title>
      <Overview refreshKey={key} />
      <Card><Tabs items={items} destroyInactiveTabPane /></Card>
    </div>
  );
};

export default DocumentHub;

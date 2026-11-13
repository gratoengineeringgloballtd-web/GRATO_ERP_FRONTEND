import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Card, Table, Input, Select, Button, Space, Tag, Modal, Form, Typography, message,
  Popconfirm, Tooltip, Alert, Row, Col, InputNumber, Steps, Empty, Spin
} from 'antd';
import {
  ApartmentOutlined, PlusOutlined, EditOutlined, BranchesOutlined, UndoOutlined,
  DeleteOutlined, SearchOutlined, ReloadOutlined
} from '@ant-design/icons';
import api from '../../services/api';

const { Title, Text } = Typography;

const AUTHORITIES = ['staff', 'supervisor', 'coordinator', 'head', 'manager'];
const CHAIN_TYPES = [
  { value: 'requisition', label: 'Purchase requisition', amount: true },
  { value: 'cash', label: 'Cash request', amount: true },
  { value: 'it_support', label: 'IT support request' },
  { value: 'invoice', label: 'Invoice', amount: true },
  { value: 'leave', label: 'Leave request' },
  { value: 'department', label: 'Reporting line only' }
];

const errMsg = (e, fallback) => e?.response?.data?.message || fallback;

const ITOrgStructure = () => {
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState(undefined);

  const [editing, setEditing] = useState(null); // person | 'new'
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const [previewFor, setPreviewFor] = useState(null);
  const [previewType, setPreviewType] = useState('requisition');
  const [previewAmount, setPreviewAmount] = useState(null);
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/it-admin/structure/people');
      setPeople(res.data.data || []);
    } catch (e) {
      message.error(errMsg(e, 'Failed to load the org structure'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const byEmail = useMemo(() => Object.fromEntries(people.map((p) => [p.email, p])), [people]);
  const departments = useMemo(() => [...new Set(people.map((p) => p.department).filter(Boolean))].sort(), [people]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return people.filter((p) =>
      (!deptFilter || p.department === deptFilter) &&
      (!q || [p.name, p.email, p.position].some((v) => String(v || '').toLowerCase().includes(q)))
    );
  }, [people, search, deptFilter]);

  const openEdit = (p) => {
    setEditing(p);
    form.resetFields();
    form.setFieldsValue(p === 'new'
      ? { approvalAuthority: 'staff', hierarchyLevel: 1 }
      : {
          email: p.email, name: p.name, department: p.department, position: p.position,
          reportsTo: p.reportsTo || undefined, hierarchyLevel: p.hierarchyLevel, approvalAuthority: p.approvalAuthority || 'staff'
        });
  };

  const save = async () => {
    try {
      const v = await form.validateFields();
      setSaving(true);
      if (editing === 'new') {
        await api.post('/it-admin/structure/people', v);
        message.success('Person added to the structure');
      } else {
        await api.put(`/it-admin/structure/people/${encodeURIComponent(editing.email)}`, v);
        message.success('Structure updated');
      }
      setEditing(null);
      load();
    } catch (e) {
      if (e?.errorFields) return;
      message.error(errMsg(e, 'Failed to save'));
    } finally {
      setSaving(false);
    }
  };

  const reset = async (p) => {
    try {
      const res = await api.delete(`/it-admin/structure/people/${encodeURIComponent(p.email)}`);
      message.success(res.data.message);
      load();
    } catch (e) {
      message.error(errMsg(e, 'Failed'));
    }
  };

  const loadPreview = async (p = previewFor, type = previewType, amount = previewAmount) => {
    if (!p) return;
    setPreviewLoading(true);
    try {
      const res = await api.get('/it-admin/structure/preview', { params: { email: p.email, type, amount: amount ?? undefined } });
      setPreview(res.data.data);
    } catch (e) {
      setPreview(null);
      message.error(errMsg(e, 'Failed to build the approval line'));
    } finally {
      setPreviewLoading(false);
    }
  };

  const openPreview = (p) => { setPreviewFor(p); setPreview(null); loadPreview(p); };

  const columns = [
    {
      title: 'Person', key: 'person',
      render: (_, p) => (<div><Text strong>{p.name}</Text><br /><Text type="secondary" style={{ fontSize: 12 }}>{p.email}</Text></div>)
    },
    { title: 'Department', dataIndex: 'department', ellipsis: true },
    { title: 'Position', dataIndex: 'position', ellipsis: true },
    {
      title: 'Reports to', key: 'reportsTo',
      render: (_, p) => p.reportsTo
        ? <span>{byEmail[p.reportsTo]?.name || p.reportsTo}</span>
        : <Text type="secondary">nobody</Text>
    },
    { title: 'Level', dataIndex: 'hierarchyLevel', width: 70, align: 'center' },
    { title: 'Authority', dataIndex: 'approvalAuthority', width: 110, render: (a) => a || <Text type="secondary">-</Text> },
    {
      title: 'Source', key: 'source', width: 110,
      render: (_, p) => p.source === 'runtime' ? <Tag color="blue">added</Tag> : p.edited ? <Tag color="orange">edited</Tag> : <Tag>file</Tag>
    },
    {
      title: 'Actions', key: 'actions', width: 150, fixed: 'right',
      render: (_, p) => (
        <Space size="small">
          <Tooltip title="Edit"><Button size="small" icon={<EditOutlined />} onClick={() => openEdit(p)} /></Tooltip>
          <Tooltip title="Preview approval line"><Button size="small" icon={<BranchesOutlined />} onClick={() => openPreview(p)} /></Tooltip>
          {(p.edited || p.source === 'runtime') && (
            <Popconfirm
              title={p.source === 'runtime' ? `Remove ${p.name} from the structure?` : `Reset ${p.name} to the file values?`}
              onConfirm={() => reset(p)}
            >
              <Tooltip title={p.source === 'runtime' ? 'Remove' : 'Reset to file'}>
                <Button size="small" danger icon={p.source === 'runtime' ? <DeleteOutlined /> : <UndoOutlined />} />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      )
    }
  ];

  const supervisorOptions = people
    .filter((p) => editing === 'new' || p.email !== editing?.email)
    .map((p) => ({ value: p.email, label: `${p.name} - ${p.position} (${p.department})` }));

  return (
    <div>
      <Space style={{ marginBottom: 16 }} align="center">
        <ApartmentOutlined style={{ fontSize: 24 }} />
        <Title level={3} style={{ margin: 0 }}>Org Structure</Title>
        <Button type="primary" icon={<PlusOutlined />} style={{ marginLeft: 16 }} onClick={() => openEdit('new')}>Add person</Button>
      </Space>

      <Alert
        type="info" showIcon style={{ marginBottom: 16 }}
        message="This is who approves whose requests."
        description="People tagged 'file' come from the built-in structure file. Editing one saves an override here and every approval chain uses it straight away; 'Reset to file' undoes it. Changes are recorded in the IT activity log and only affect new requests - requests already in flight keep the chain they were created with."
      />

      <Card>
        <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
          <Col xs={24} md={10}>
            <Input allowClear prefix={<SearchOutlined />} placeholder="Search name, email or position" value={search} onChange={(e) => setSearch(e.target.value)} />
          </Col>
          <Col xs={12} md={8}>
            <Select allowClear placeholder="Department" style={{ width: '100%' }} value={deptFilter} onChange={setDeptFilter}
              options={departments.map((d) => ({ value: d, label: d }))} />
          </Col>
          <Col xs={12} md={4}><Button icon={<ReloadOutlined />} onClick={load}>Refresh</Button></Col>
        </Row>
        <Table
          rowKey="email" size="middle" loading={loading} columns={columns} dataSource={rows}
          scroll={{ x: 1000 }} pagination={{ pageSize: 25, showTotal: (t) => `${t} people` }}
        />
      </Card>

      <Modal
        open={!!editing}
        title={editing === 'new' ? 'Add person to the structure' : `Edit ${editing?.name || ''}`}
        onCancel={() => setEditing(null)}
        onOk={save}
        confirmLoading={saving}
        okText="Save"
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
            <Input disabled={editing !== 'new'} />
          </Form.Item>
          <Form.Item name="name" label="Full name" rules={[{ required: true }]}><Input /></Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="department" label="Department" rules={[{ required: true }]}>
                <Select showSearch allowClear options={departments.map((d) => ({ value: d, label: d }))} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="position" label="Position" rules={[{ required: true }]}><Input /></Form.Item>
            </Col>
          </Row>
          <Form.Item name="reportsTo" label="Reports to" extra="Their supervisor is the first approver on their requests.">
            <Select showSearch allowClear optionFilterProp="label" options={supervisorOptions} placeholder="Choose a supervisor" />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="hierarchyLevel" label="Hierarchy level (1-6)">
                <InputNumber min={1} max={6} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="approvalAuthority" label="Approval authority">
                <Select options={AUTHORITIES.map((a) => ({ value: a, label: a }))} />
              </Form.Item>
            </Col>
          </Row>
          {editing && editing !== 'new' && editing.original && (
            <Alert type="warning" showIcon message={`File value: reports to ${byEmail[editing.original.reportsTo]?.name || editing.original.reportsTo || 'nobody'}, level ${editing.original.hierarchyLevel}`} />
          )}
        </Form>
      </Modal>

      <Modal
        open={!!previewFor}
        title={`Approval line: ${previewFor?.name || ''}`}
        onCancel={() => setPreviewFor(null)}
        footer={<Button onClick={() => setPreviewFor(null)}>Close</Button>}
        width={600}
        destroyOnClose
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Row gutter={12}>
            <Col span={12}>
              <Select style={{ width: '100%' }} value={previewType}
                options={CHAIN_TYPES.map((t) => ({ value: t.value, label: t.label }))}
                onChange={(v) => { setPreviewType(v); loadPreview(previewFor, v, previewAmount); }} />
            </Col>
            {CHAIN_TYPES.find((t) => t.value === previewType)?.amount && (
              <Col span={12}>
                <InputNumber style={{ width: '100%' }} min={0} placeholder="Amount (XAF)" value={previewAmount}
                  onChange={setPreviewAmount} onBlur={() => loadPreview()} onPressEnter={() => loadPreview()} />
              </Col>
            )}
          </Row>
          {previewLoading ? <div style={{ textAlign: 'center', padding: 24 }}><Spin /></div>
            : !preview ? <Empty />
            : (
              <>
                {preview.notes.map((n, i) => <Alert key={i} type="warning" showIcon message={n} />)}
                <Steps
                  direction="vertical" size="small" current={-1}
                  items={[
                    { title: previewFor?.name, description: 'Requester', status: 'finish' },
                    ...preview.steps.map((st) => ({
                      title: `${st.level}. ${st.name}`,
                      description: (<span>{st.role}{st.department ? ` - ${st.department}` : ''}{st.email && <><br /><Text type="secondary" style={{ fontSize: 12 }}>{st.email}</Text></>}</span>),
                      status: 'wait'
                    }))
                  ]}
                />
              </>
            )}
        </Space>
      </Modal>
    </div>
  );
};

export default ITOrgStructure;

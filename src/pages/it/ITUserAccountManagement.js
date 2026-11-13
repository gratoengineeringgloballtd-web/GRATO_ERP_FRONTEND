import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Card, Table, Input, Select, Button, Space, Tag, Modal, Form, Typography, message,
  Popconfirm, Tooltip, Alert, Row, Col, Switch, InputNumber, Steps, Empty, Spin
} from 'antd';
import {
  UserOutlined, ReloadOutlined, EditOutlined, KeyOutlined, SwapOutlined,
  StopOutlined, CheckCircleOutlined, EyeOutlined, SearchOutlined, CopyOutlined, UserAddOutlined, ApartmentOutlined, BranchesOutlined
} from '@ant-design/icons';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { startSupportSession } from '../../components/SupportSessionBanner';

const { Title, Text } = Typography;

const ALL_ROLES = ['employee', 'finance', 'admin', 'buyer', 'hr', 'supply_chain', 'technical', 'hse', 'supplier', 'it', 'project', 'ceo', 'sales'];
// Mirrors the backend policy: IT can only move people between these roles.
const IT_ASSIGNABLE = ['employee', 'buyer', 'supply_chain', 'technical', 'hse', 'project', 'it'];
const CHAIN_TYPES = [
  { value: 'requisition', label: 'Purchase requisition', amount: true },
  { value: 'cash', label: 'Cash request', amount: true, requestType: true },
  { value: 'it_support', label: 'IT support request' },
  { value: 'invoice', label: 'Invoice', amount: true },
  { value: 'leave', label: 'Leave request' },
  { value: 'department', label: 'Reporting line only' }
];
const AUTHORITIES = ['staff', 'supervisor', 'coordinator', 'head', 'manager'];
const DEPARTMENT_ROLES = ['head', 'supervisor', 'coordinator', 'staff', 'buyer', 'hr', 'it', 'supply_chain'];

const roleColor = {
  admin: 'red', ceo: 'volcano', finance: 'gold', hr: 'magenta', it: 'blue',
  buyer: 'cyan', supply_chain: 'orange', technical: 'geekblue', hse: 'green',
  project: 'purple', supplier: 'default', employee: 'default', sales: 'volcano'
};

const errMsg = (e, fallback) => e?.response?.data?.message || fallback;

const ITUserAccountManagement = () => {
  const { user: me } = useSelector((s) => s.auth);
  const navigate = useNavigate();
  const isFullAdmin = ['admin', 'ceo'].includes(me?.role);

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 25, total: 0 });
  const [filters, setFilters] = useState({ search: '', role: undefined, status: undefined });

  const [editing, setEditing] = useState(null);
  const [roleTarget, setRoleTarget] = useState(null);
  const [viewAsTarget, setViewAsTarget] = useState(null);
  const [tempPassword, setTempPassword] = useState(null);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createdInfo, setCreatedInfo] = useState(null);
  const [structTarget, setStructTarget] = useState(null);
  const [structInfo, setStructInfo] = useState(null);

  const [editForm] = Form.useForm();
  const [roleForm] = Form.useForm();
  const [viewAsForm] = Form.useForm();
  const [createForm] = Form.useForm();
  const [structForm] = Form.useForm();
  const [chainOpen, setChainOpen] = useState(false);
  const [chainUser, setChainUser] = useState(null);
  const [chainType, setChainType] = useState('requisition');
  const [chainAmount, setChainAmount] = useState(null);
  const [chainReqType, setChainReqType] = useState('expense');
  const [chainData, setChainData] = useState(null);
  const [chainLoading, setChainLoading] = useState(false);
  const [userOptions, setUserOptions] = useState([]);

  const assignableRoles = isFullAdmin ? ALL_ROLES : IT_ASSIGNABLE;

  const load = useCallback(async (page = 1, pageSize = 25, f = filters) => {
    setLoading(true);
    try {
      const res = await api.get('/it-admin/users', {
        params: { page, limit: pageSize, search: f.search || undefined, role: f.role, status: f.status }
      });
      setUsers(res.data.data || []);
      setPagination({ current: page, pageSize, total: res.data.pagination?.total || 0 });
    } catch (e) {
      message.error(errMsg(e, 'Failed to load users'));
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { load(1, pagination.pageSize); /* eslint-disable-next-line */ }, []);

  const applyFilters = () => load(1, pagination.pageSize, filters);

  // ---- actions -----------------------------------------------------------
  const openEdit = (u) => {
    setEditing(u);
    editForm.setFieldsValue({
      fullName: u.fullName, email: u.email, phone: u.phone,
      department: u.department, position: u.position, departmentRole: u.departmentRole,
      supervisorEmail: u.supervisor?.email
    });
  };

  const saveEdit = async () => {
    try {
      const values = await editForm.validateFields();
      setSaving(true);
      const body = {
        fullName: values.fullName, email: values.email, phone: values.phone,
        department: values.department, position: values.position, departmentRole: values.departmentRole
      };

      // Supervisor is picked by email so IT does not need to know ids.
      if (values.supervisorEmail !== (editing.supervisor?.email || undefined)) {
        if (values.supervisorEmail) {
          const lookup = await api.get('/it-admin/users', { params: { search: values.supervisorEmail, limit: 5 } });
          const match = (lookup.data.data || []).find(
            (x) => x.email.toLowerCase() === values.supervisorEmail.toLowerCase().trim()
          );
          if (!match) { message.error('No user found with that supervisor email'); setSaving(false); return; }
          body.supervisor = match._id;
        } else {
          body.supervisor = null;
        }
      }

      await api.put(`/it-admin/users/${editing._id}`, body);
      message.success('User updated');
      setEditing(null);
      load(pagination.current, pagination.pageSize);
    } catch (e) {
      if (e?.errorFields) return;
      message.error(errMsg(e, 'Failed to update user'));
    } finally {
      setSaving(false);
    }
  };

  const createUser = async () => {
    try {
      const values = await createForm.validateFields();
      setSaving(true);
      const res = await api.post('/it-admin/users', values);
      setCreating(false);
      createForm.resetFields();
      setCreatedInfo({
        name: res.data.data?.fullName,
        email: res.data.data?.email,
        emailSent: res.data.emailSent,
        password: res.data.temporaryPassword,
        warning: res.data.warning,
        structureRegistered: res.data.structureRegistered,
        structureWarning: res.data.structureWarning
      });
      load(1, pagination.pageSize);
    } catch (e) {
      if (e?.errorFields) return;
      message.error(errMsg(e, 'Failed to create user'));
    } finally {
      setSaving(false);
    }
  };

  const loadChain = async (u = chainUser, type = chainType, amount = chainAmount, reqType = chainReqType) => {
    if (!u) { setChainData(null); return; }
    setChainLoading(true);
    try {
      const res = await api.get(`/it-admin/users/${u._id}/approval-chain`, {
        params: { type, amount: amount ?? undefined, requestType: reqType }
      });
      setChainData(res.data.data);
    } catch (e) {
      setChainData(null);
      message.error(errMsg(e, 'Failed to build approval chain'));
    } finally {
      setChainLoading(false);
    }
  };

  const openChain = (u) => {
    setChainOpen(true);
    setChainUser(u || null);
    setChainData(null);
    if (u) { setUserOptions([u]); loadChain(u); }
  };

  const searchUsers = async (q) => {
    if (!q || q.length < 2) return;
    try {
      const res = await api.get('/it-admin/users', { params: { search: q, limit: 15 } });
      setUserOptions(res.data.data || []);
    } catch (e) { /* ignore */ }
  };

  const openStructure = async (u) => {
    setStructTarget(u);
    setStructInfo(null);
    structForm.resetFields();
    try {
      const res = await api.get(`/it-admin/users/${u._id}/structure`);
      setStructInfo(res.data.data);
      structForm.setFieldsValue({
        reportsTo: res.data.data.reportsTo || u.supervisor?.email,
        hierarchyLevel: res.data.data.hierarchyLevel,
        approvalAuthority: res.data.data.approvalAuthority || 'staff'
      });
    } catch (e) {
      setStructInfo({ registered: false });
      structForm.setFieldsValue({ reportsTo: u.supervisor?.email, approvalAuthority: 'staff' });
    }
  };

  const saveStructure = async () => {
    try {
      const values = await structForm.validateFields();
      setSaving(true);
      const res = await api.post(`/it-admin/users/${structTarget._id}/structure`, values);
      message.success(res.data.message);
      if (res.data.warning) message.warning(res.data.warning, 8);
      setStructTarget(null);
    } catch (e) {
      if (e?.errorFields) return;
      message.error(errMsg(e, 'Failed to update structure'));
    } finally {
      setSaving(false);
    }
  };

  const removeStructure = async () => {
    try {
      const res = await api.delete(`/it-admin/users/${structTarget._id}/structure`);
      message.success(res.data.message);
      setStructTarget(null);
    } catch (e) {
      message.error(errMsg(e, 'Failed to remove from structure'));
    }
  };

  const saveRole = async () => {
    try {
      const { role } = await roleForm.validateFields();
      setSaving(true);
      await api.put(`/it-admin/users/${roleTarget._id}/role`, { role });
      message.success(`Role changed to ${role}`);
      setRoleTarget(null);
      load(pagination.current, pagination.pageSize);
    } catch (e) {
      if (e?.errorFields) return;
      message.error(errMsg(e, 'Failed to change role'));
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (u) => {
    try {
      await api.patch(`/it-admin/users/${u._id}/status`, { isActive: !u.isActive });
      message.success(`${u.fullName} ${u.isActive ? 'deactivated' : 'activated'}`);
      load(pagination.current, pagination.pageSize);
    } catch (e) {
      message.error(errMsg(e, 'Failed to update status'));
    }
  };

  const resetPassword = async (u) => {
    try {
      const res = await api.post(`/it-admin/users/${u._id}/reset-password`);
      if (res.data.temporaryPassword) {
        setTempPassword({ user: u, password: res.data.temporaryPassword, emailSent: res.data.emailSent });
      } else {
        message.success(res.data.message);
      }
    } catch (e) {
      message.error(errMsg(e, 'Failed to reset password'));
    }
  };

  const startViewAs = async () => {
    try {
      const { reason } = await viewAsForm.validateFields();
      setSaving(true);
      const res = await api.post(`/it-admin/users/${viewAsTarget._id}/view-as`, { reason });
      startSupportSession({ token: res.data.data.token, user: res.data.data.user, reason });
    } catch (e) {
      if (e?.errorFields) return;
      message.error(errMsg(e, 'Failed to start support session'));
      setSaving(false);
    }
  };

  // ---- table -------------------------------------------------------------
  const columns = useMemo(() => [
    {
      title: 'User',
      key: 'user',
      render: (_, u) => (
        <div>
          <Text strong>{u.fullName}</Text><br />
          <Text type="secondary" style={{ fontSize: 12 }}>{u.email}</Text>
        </div>
      )
    },
    { title: 'Role', dataIndex: 'role', render: (r) => <Tag color={roleColor[r]}>{r}</Tag>, width: 120 },
    { title: 'Department', dataIndex: 'department', ellipsis: true },
    { title: 'Position', dataIndex: 'position', ellipsis: true },
    { title: 'Supervisor', key: 'sup', render: (_, u) => u.supervisor?.fullName || <Text type="secondary">—</Text> },
    {
      title: 'Last login',
      dataIndex: 'lastLogin',
      width: 150,
      render: (d) => (d ? new Date(d).toLocaleString() : <Text type="secondary">never</Text>)
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      width: 90,
      render: (a) => (a ? <Tag color="green">Active</Tag> : <Tag color="red">Inactive</Tag>)
    },
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right',
      width: 310,
      render: (_, u) => {
        if (!u.canManage) return <Text type="secondary">Admin/CEO only</Text>;
        return (
          <Space size="small" wrap>
            <Tooltip title="Edit profile / supervisor">
              <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(u)} />
            </Tooltip>
            <Tooltip title="Preview approval line">
              <Button size="small" icon={<BranchesOutlined />} onClick={() => openChain(u)} />
            </Tooltip>
            <Tooltip title="Approval structure (who approves this person's requests)">
              <Button size="small" icon={<ApartmentOutlined />} onClick={() => openStructure(u)} />
            </Tooltip>
            <Tooltip title="Change role">
              <Button
                size="small"
                icon={<SwapOutlined />}
                disabled={u._id === me?._id || u._id === me?.id}
                onClick={() => { setRoleTarget(u); roleForm.setFieldsValue({ role: u.role }); }}
              />
            </Tooltip>
            <Popconfirm
              title={`Reset password for ${u.fullName}?`}
              description="A new temporary password will be generated."
              onConfirm={() => resetPassword(u)}
            >
              <Tooltip title="Reset password"><Button size="small" icon={<KeyOutlined />} /></Tooltip>
            </Popconfirm>
            <Popconfirm
              title={`${u.isActive ? 'Deactivate' : 'Activate'} ${u.fullName}?`}
              onConfirm={() => toggleStatus(u)}
            >
              <Tooltip title={u.isActive ? 'Deactivate' : 'Activate'}>
                <Button
                  size="small"
                  danger={u.isActive}
                  icon={u.isActive ? <StopOutlined /> : <CheckCircleOutlined />}
                  disabled={u._id === me?._id || u._id === me?.id}
                />
              </Tooltip>
            </Popconfirm>
            <Tooltip title={u.canViewAs ? 'Read-only support session' : 'Not available for this account'}>
              <Button
                size="small"
                icon={<EyeOutlined />}
                disabled={!u.canViewAs}
                onClick={() => { setViewAsTarget(u); viewAsForm.resetFields(); }}
              />
            </Tooltip>
          </Space>
        );
      }
    }
  ], [me, roleForm, viewAsForm]); // eslint-disable-line

  return (
    <div>
      <Space style={{ marginBottom: 16 }} align="center">
        <UserOutlined style={{ fontSize: 24 }} />
        <Title level={3} style={{ margin: 0 }}>User Accounts</Title>
        <Button
          type="primary"
          icon={<UserAddOutlined />}
          style={{ marginLeft: 16 }}
          onClick={() => { createForm.resetFields(); createForm.setFieldsValue({ role: 'employee', departmentRole: 'staff', addToStructure: true, approvalAuthority: 'staff' }); setCreating(true); }}
        >
          Create User
        </Button>
        <Button icon={<BranchesOutlined />} onClick={() => openChain(null)}>Preview Approval Line</Button>
        <Button icon={<ApartmentOutlined />} onClick={() => navigate('/it/org-structure')}>Org Structure</Button>
      </Space>

      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="Every action on this page is recorded in the IT activity log."
        description={
          isFullAdmin
            ? 'You can manage every account.'
            : 'Admin and CEO accounts are managed by an admin. Finance/HR password resets are emailed straight to the user. Support sessions are read-only and not available for finance, HR, admin, CEO or supplier accounts.'
        }
      />

      <Card>
        <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
          <Col xs={24} md={10}>
            <Input
              allowClear
              prefix={<SearchOutlined />}
              placeholder="Search name, email or position"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              onPressEnter={applyFilters}
            />
          </Col>
          <Col xs={12} md={5}>
            <Select
              allowClear
              placeholder="Role"
              style={{ width: '100%' }}
              value={filters.role}
              onChange={(v) => setFilters({ ...filters, role: v })}
              options={ALL_ROLES.map((r) => ({ value: r, label: r }))}
            />
          </Col>
          <Col xs={12} md={5}>
            <Select
              allowClear
              placeholder="Status"
              style={{ width: '100%' }}
              value={filters.status}
              onChange={(v) => setFilters({ ...filters, status: v })}
              options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]}
            />
          </Col>
          <Col xs={24} md={4}>
            <Space>
              <Button type="primary" onClick={applyFilters}>Search</Button>
              <Button icon={<ReloadOutlined />} onClick={() => load(pagination.current, pagination.pageSize)} />
            </Space>
          </Col>
        </Row>

        <Table
          rowKey="_id"
          size="middle"
          loading={loading}
          columns={columns}
          dataSource={users}
          scroll={{ x: 1100 }}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showTotal: (t) => `${t} users`,
            onChange: (p, ps) => load(p, ps)
          }}
        />
      </Card>

      {/* Create user */}
      <Modal
        open={creating}
        title="Create new user account"
        onCancel={() => setCreating(false)}
        onOk={createUser}
        confirmLoading={saving}
        okText="Create account"
        destroyOnClose
      >
        <Form form={createForm} layout="vertical">
          <Form.Item name="fullName" label="Full name" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="email" label="Work email" rules={[{ required: true, type: 'email' }]}><Input /></Form.Item>
          <Form.Item name="phone" label="Phone"><Input /></Form.Item>
          <Form.Item name="department" label="Department" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="position" label="Position" rules={[{ required: true }]}><Input /></Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="role" label="Role" rules={[{ required: true }]}>
                <Select options={assignableRoles.filter((r) => r !== 'supplier').map((r) => ({ value: r, label: r }))} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="departmentRole" label="Department role">
                <Select options={DEPARTMENT_ROLES.map((r) => ({ value: r, label: r }))} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="supervisorEmail" label="Supervisor (email)" extra="Sets the reporting line used for approval chains.">
            <Input allowClear placeholder="supervisor@company.com" />
          </Form.Item>
          <Row gutter={12}>
            <Col span={14}>
              <Form.Item name="addToStructure" label="Add to approval structure" valuePropName="checked"
                extra="Lets requisitions and other requests from this person build a proper approval chain.">
                <Switch />
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item name="approvalAuthority" label="Approval authority">
                <Select options={AUTHORITIES.map((r) => ({ value: r, label: r }))} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
        {!isFullAdmin && (
          <Alert type="info" showIcon message="Finance, HR, admin and CEO accounts can only be created by an admin. A temporary password is emailed to the new user." />
        )}
      </Modal>

      {/* Account created */}
      <Modal
        open={!!createdInfo}
        title="Account created"
        onCancel={() => setCreatedInfo(null)}
        footer={<Button type="primary" onClick={() => setCreatedInfo(null)}>Done</Button>}
      >
        <p>
          Account for <strong>{createdInfo?.name}</strong> ({createdInfo?.email}) was created.{' '}
          {createdInfo?.emailSent ? 'Login details were emailed to them.' : 'The login email could not be sent.'}
        </p>
        {createdInfo?.warning && <Alert type="warning" showIcon style={{ marginBottom: 12 }} message={createdInfo.warning} />}
        {createdInfo?.structureRegistered && !createdInfo?.structureWarning && (
          <Alert type="success" showIcon style={{ marginBottom: 12 }} message="Added to the approval structure." />
        )}
        {createdInfo?.structureWarning && (
          <Alert type="warning" showIcon style={{ marginBottom: 12 }} message="Approval structure" description={createdInfo.structureWarning} />
        )}
        {createdInfo?.password && (
          <>
            <Text>Temporary password (shown once):</Text>
            <Input.Group compact style={{ marginTop: 8 }}>
              <Input readOnly style={{ width: 'calc(100% - 40px)', fontFamily: 'monospace' }} value={createdInfo.password} />
              <Tooltip title="Copy">
                <Button icon={<CopyOutlined />} onClick={() => { navigator.clipboard?.writeText(createdInfo.password); message.success('Copied'); }} />
              </Tooltip>
            </Input.Group>
          </>
        )}
      </Modal>

      {/* Approval line preview */}
      <Modal
        open={chainOpen}
        title="Approval line preview"
        onCancel={() => setChainOpen(false)}
        footer={<Button onClick={() => setChainOpen(false)}>Close</Button>}
        width={640}
        destroyOnClose
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Select
            showSearch
            filterOption={false}
            style={{ width: '100%' }}
            placeholder="Search an employee by name or email"
            value={chainUser?._id}
            onSearch={searchUsers}
            onChange={(id) => {
              const u = userOptions.find((x) => x._id === id);
              setChainUser(u); loadChain(u);
            }}
            options={userOptions.map((u) => ({ value: u._id, label: `${u.fullName} - ${u.email}` }))}
            notFoundContent="Type at least 2 letters"
          />
          <Row gutter={12}>
            <Col span={10}>
              <Select
                style={{ width: '100%' }}
                value={chainType}
                options={CHAIN_TYPES.map((t) => ({ value: t.value, label: t.label }))}
                onChange={(v) => { setChainType(v); loadChain(chainUser, v, chainAmount, chainReqType); }}
              />
            </Col>
            {CHAIN_TYPES.find((t) => t.value === chainType)?.amount && (
              <Col span={8}>
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  placeholder="Amount (XAF)"
                  value={chainAmount}
                  onChange={setChainAmount}
                  onBlur={() => loadChain()}
                  onPressEnter={() => loadChain()}
                />
              </Col>
            )}
            {CHAIN_TYPES.find((t) => t.value === chainType)?.requestType && (
              <Col span={6}>
                <Select
                  style={{ width: '100%' }}
                  value={chainReqType}
                  options={['expense', 'travel', 'accommodation', 'perdiem', 'mission'].map((v) => ({ value: v, label: v }))}
                  onChange={(v) => { setChainReqType(v); loadChain(chainUser, chainType, chainAmount, v); }}
                />
              </Col>
            )}
          </Row>

          {chainLoading ? (
            <div style={{ textAlign: 'center', padding: 24 }}><Spin /></div>
          ) : !chainData ? (
            <Empty description="Pick an employee to see their approval line" />
          ) : (
            <>
              <div>
                <Text strong>{chainData.user.fullName}</Text>{' '}
                <Text type="secondary">{chainData.user.position} - {chainData.user.department}</Text>{' '}
                <Tag color={chainData.source === 'none' ? 'red' : chainData.source === 'runtime' ? 'blue' : 'green'}>
                  {chainData.source === 'none' ? 'not in structure' : `${chainData.source} structure`}
                </Tag>
              </div>
              {chainData.notes.map((n, i) => <Alert key={i} type="warning" showIcon message={n} />)}
              {chainData.steps.length > 0 && (
                <Steps
                  direction="vertical"
                  size="small"
                  current={-1}
                  items={[
                    { title: chainData.user.fullName, description: 'Requester', status: 'finish' },
                    ...chainData.steps.map((st) => ({
                      title: `${st.level}. ${st.name}`,
                      description: (
                        <span>
                          {st.role}{st.department ? ` - ${st.department}` : ''}
                          {st.email && <><br /><Text type="secondary" style={{ fontSize: 12 }}>{st.email}</Text></>}
                        </span>
                      ),
                      status: 'wait'
                    }))
                  ]}
                />
              )}
            </>
          )}
        </Space>
      </Modal>

      {/* Approval structure */}
      <Modal
        open={!!structTarget}
        title={`Approval structure: ${structTarget?.fullName || ''}`}
        onCancel={() => setStructTarget(null)}
        onOk={saveStructure}
        confirmLoading={saving}
        okText={structInfo?.source === 'base' ? 'Close' : 'Save'}
        okButtonProps={{ disabled: structInfo?.source === 'base' }}
        destroyOnClose
      >
        {structInfo?.source === 'base' ? (
          <Alert type="info" showIcon message="This person is listed in the base department structure file and reports to" description={structInfo.reportsTo || 'nobody'} />
        ) : (
          <>
            <Alert
              type={structInfo?.registered ? 'success' : 'warning'}
              showIcon
              style={{ marginBottom: 12 }}
              message={structInfo?.registered ? 'Registered in the approval structure' : 'Not in the approval structure yet - their requests will get a default approval chain.'}
            />
            <Form form={structForm} layout="vertical">
              <Form.Item name="reportsTo" label="Reports to (supervisor email)" rules={[{ required: true, type: 'email' }]}>
                <Input placeholder="supervisor@company.com" />
              </Form.Item>
              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item name="hierarchyLevel" label="Hierarchy level (1-6)">
                    <InputNumber min={1} max={6} style={{ width: '100%' }} placeholder="auto" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="approvalAuthority" label="Approval authority">
                    <Select options={AUTHORITIES.map((r) => ({ value: r, label: r }))} />
                  </Form.Item>
                </Col>
              </Row>
            </Form>
            {structInfo?.registered && <Button danger onClick={removeStructure}>Remove from structure</Button>}
          </>
        )}
      </Modal>

      {/* Edit profile */}
      <Modal
        open={!!editing}
        title={`Edit ${editing?.fullName || ''}`}
        onCancel={() => setEditing(null)}
        onOk={saveEdit}
        confirmLoading={saving}
        okText="Save"
        destroyOnClose
      >
        <Form form={editForm} layout="vertical">
          <Form.Item name="fullName" label="Full name" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}><Input /></Form.Item>
          <Form.Item name="phone" label="Phone"><Input /></Form.Item>
          <Form.Item name="department" label="Department"><Input /></Form.Item>
          <Form.Item name="position" label="Position"><Input /></Form.Item>
          <Form.Item name="departmentRole" label="Department role">
            <Select allowClear options={DEPARTMENT_ROLES.map((r) => ({ value: r, label: r }))} />
          </Form.Item>
          <Form.Item
            name="supervisorEmail"
            label="Supervisor (email)"
            extra="Changing the supervisor also updates the approval chain for this user's future requests."
          >
            <Input allowClear placeholder="supervisor@company.com" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Change role */}
      <Modal
        open={!!roleTarget}
        title={`Change role: ${roleTarget?.fullName || ''}`}
        onCancel={() => setRoleTarget(null)}
        onOk={saveRole}
        confirmLoading={saving}
        okText="Change role"
        destroyOnClose
      >
        <Form form={roleForm} layout="vertical">
          <Form.Item name="role" label="New role" rules={[{ required: true }]}>
            <Select options={assignableRoles.map((r) => ({ value: r, label: r }))} />
          </Form.Item>
        </Form>
        {!isFullAdmin && (
          <Alert type="warning" showIcon message="Roles such as finance, hr, admin and ceo can only be changed by an admin." />
        )}
      </Modal>

      {/* View as */}
      <Modal
        open={!!viewAsTarget}
        title={`Support session: ${viewAsTarget?.fullName || ''}`}
        onCancel={() => setViewAsTarget(null)}
        onOk={startViewAs}
        confirmLoading={saving}
        okText="Start read-only session"
        destroyOnClose
      >
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 12 }}
          message="You will see the ERP exactly as this user does. You cannot change anything, the session lasts 30 minutes, and it is logged."
        />
        <Form form={viewAsForm} layout="vertical">
          <Form.Item
            name="reason"
            label="Reason (ticket / issue being investigated)"
            rules={[{ required: true, min: 5, message: 'Please give a short reason' }]}
          >
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Temp password */}
      <Modal
        open={!!tempPassword}
        title="Password reset"
        onCancel={() => setTempPassword(null)}
        footer={<Button type="primary" onClick={() => setTempPassword(null)}>Done</Button>}
      >
        <p>
          Temporary password for <strong>{tempPassword?.user?.fullName}</strong>
          {tempPassword?.emailSent ? ' (also emailed to them)' : ' (the email could not be sent — give it to them securely)'}:
        </p>
        <Input.Group compact>
          <Input readOnly style={{ width: 'calc(100% - 40px)', fontFamily: 'monospace' }} value={tempPassword?.password} />
          <Tooltip title="Copy">
            <Button
              icon={<CopyOutlined />}
              onClick={() => { navigator.clipboard?.writeText(tempPassword.password); message.success('Copied'); }}
            />
          </Tooltip>
        </Input.Group>
        <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
          This is shown once. Ask the user to change it after logging in.
        </Text>
      </Modal>
    </div>
  );
};

export default ITUserAccountManagement;

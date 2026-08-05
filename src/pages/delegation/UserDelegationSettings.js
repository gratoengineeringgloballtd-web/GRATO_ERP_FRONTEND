// ═══════════════════════════════════════════════════════════════════════════
// FILE: src/pages/delegation/UserDelegationSettings.jsx  (NEW FILE)
//
// Route: /delegation/settings  (accessible to every authenticated user)
//
// Two tabs:
//   "My Delegations"   — outgoing: delegations the user has set up
//   "Delegated to Me"  — incoming: delegations others have set up for them
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import {
  Card, Tabs, Button, Table, Tag, Space, Modal, Form, Select,
  DatePicker, Input, Switch, Alert, Typography, Divider, Tooltip,
  Popconfirm, Badge, Row, Col, Checkbox, message, Spin, Empty,
  Timeline, Collapse,
} from 'antd';
import {
  SwapOutlined, PlusOutlined, DeleteOutlined, EditOutlined,
  UserOutlined, CheckCircleOutlined, ClockCircleOutlined,
  InfoCircleOutlined, CrownOutlined, WarningOutlined,
  HistoryOutlined, PauseCircleOutlined, PlayCircleOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import moment from 'moment';
import api from '../../services/api';
import { useUserDelegation } from '../../contexts/UserDelegationContext';

const { Title, Text, Paragraph } = Typography;
const { Option }                  = Select;

// ─────────────────────────────────────────────────────────────────────────────
// STATUS TAG COLOURS
// ─────────────────────────────────────────────────────────────────────────────
const STATUS_COLORS = {
  active:  'success',
  paused:  'warning',
  revoked: 'error',
  expired: 'default',
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const UserDelegationSettings = () => {
  const { user }                                  = useSelector((s) => s.auth);
  const { outgoing, incoming, refresh, loading }  = useUserDelegation();
  const [form]                                    = Form.useForm();

  // Modal state
  const [modalOpen,    setModalOpen]    = useState(false);
  const [editTarget,   setEditTarget]   = useState(null);   // delegation doc being edited
  const [modalLoading, setModalLoading] = useState(false);

  // Supporting data
  const [allUsers,      setAllUsers]      = useState([]);
  const [processTypes,  setProcessTypes]  = useState({ byCategory: [], flat: [] });
  const [activeTab,     setActiveTab]     = useState('outgoing');
  const [scopeAll,      setScopeAll]      = useState(false);

  // Detail drawer state
  const [detailId, setDetailId] = useState(null);
  const [detail,   setDetail]   = useState(null);

  // ── Load supporting data ──────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const [usersRes, typesRes] = await Promise.allSettled([
          api.get('/auth/users?limit=200&isActive=true'),
          api.get('/delegations/process-types'),
        ]);
        if (usersRes.status === 'fulfilled') {
          const users = usersRes.value.data.data?.users || [];
          setAllUsers(users.filter((u) => u.email !== user?.email));
        }
        if (typesRes.status === 'fulfilled') {
          setProcessTypes(typesRes.value.data.data || { byCategory: [], flat: [] });
        }
      } catch { /* silent */ }
    };
    load();
  }, [user]);

  // ── Load delegation detail ─────────────────────────────────────────────
  useEffect(() => {
    if (!detailId) { setDetail(null); return; }
    api.get(`/delegations/${detailId}`)
      .then((r) => setDetail(r.data.data))
      .catch(() => setDetail(null));
  }, [detailId]);

  // ── Open modal for new delegation ────────────────────────────────────────
  const openCreate = () => {
    setEditTarget(null);
    setScopeAll(false);
    form.resetFields();
    setModalOpen(true);
  };

  // ── Open modal for edit ──────────────────────────────────────────────────
  const openEdit = (delegation) => {
    setEditTarget(delegation);
    const isAll = delegation.scope === 'all';
    setScopeAll(isAll);
    form.setFieldsValue({
      delegateEmail: delegation.delegateEmail,
      scope:         delegation.scope,
      processTypes:  delegation.processTypes || [],
      endDate:       delegation.endDate ? moment(delegation.endDate) : null,
      reason:        delegation.reason  || '',
    });
    setModalOpen(true);
  };

  // ── Submit modal ─────────────────────────────────────────────────────────
  const handleModalSubmit = async (values) => {
    setModalLoading(true);
    try {
      const payload = {
        delegateEmail: values.delegateEmail,
        scope:         scopeAll ? 'all' : 'selective',
        processTypes:  scopeAll ? [] : (values.processTypes || []),
        endDate:       values.endDate ? values.endDate.toISOString() : null,
        reason:        values.reason  || '',
      };

      if (editTarget) {
        await api.put(`/delegations/${editTarget._id}`, payload);
        message.success('Delegation updated');
      } else {
        await api.post('/delegations', payload);
        message.success('Delegation created — in-flight approvals transferred');
      }

      setModalOpen(false);
      refresh();
    } catch (err) {
      message.error(err.response?.data?.message || 'Failed to save delegation');
    } finally {
      setModalLoading(false);
    }
  };

  // ── Revoke ───────────────────────────────────────────────────────────────
  const handleRevoke = async (delegation) => {
    try {
      const res = await api.delete(`/delegations/${delegation._id}`);
      message.success(res.data.message);
      refresh();
    } catch (err) {
      message.error(err.response?.data?.message || 'Failed to revoke');
    }
  };

  // ── Pause / Resume ────────────────────────────────────────────────────────
  const handlePause = async (delegation) => {
    try {
      const endpoint = delegation.status === 'active'
        ? `/delegations/${delegation._id}/pause`
        : `/delegations/${delegation._id}/resume`;
      const res = await api.post(endpoint);
      message.success(res.data.message);
      refresh();
    } catch (err) {
      message.error(err.response?.data?.message || 'Failed');
    }
  };

  // ── Outgoing columns ─────────────────────────────────────────────────────
  const outgoingColumns = [
    {
      title:     'Delegate',
      dataIndex: 'delegateName',
      render:    (name, row) => (
        <Space direction="vertical" size={0}>
          <Text strong>{name}</Text>
          <Text type="secondary" style={{ fontSize: '12px' }}>{row.delegateEmail}</Text>
        </Space>
      ),
    },
    {
      title:  'Scope / Types',
      key:    'scope',
      width:  280,
      render: (_, row) =>
        row.scope === 'all' ? (
          <Tag color="blue">All Processes</Tag>
        ) : (
          <Space wrap size={4}>
            {(row.processTypes || []).slice(0, 3).map((t) => (
              <Tag key={t} style={{ fontSize: '11px' }}>
                {processTypes.flat.find((p) => p.key === t)?.label || t}
              </Tag>
            ))}
            {(row.processTypes || []).length > 3 && (
              <Tag style={{ fontSize: '11px' }}>
                +{(row.processTypes || []).length - 3} more
              </Tag>
            )}
          </Space>
        ),
    },
    {
      title:  'Status',
      key:    'status',
      width:  100,
      render: (_, row) => (
        <Tag color={STATUS_COLORS[row.status] || 'default'}>
          {row.status.toUpperCase()}
        </Tag>
      ),
    },
    {
      title:  'Period',
      key:    'period',
      width:  180,
      render: (_, row) => (
        <Space direction="vertical" size={0}>
          <Text style={{ fontSize: '12px' }}>
            From: {moment(row.startDate).format('DD MMM YYYY')}
          </Text>
          <Text style={{ fontSize: '12px' }} type="secondary">
            Until: {row.endDate ? moment(row.endDate).format('DD MMM YYYY') : 'Indefinite'}
          </Text>
        </Space>
      ),
    },
    {
      title:  'Transferred',
      key:    'transferred',
      width:  100,
      render: (_, row) => (
        <Badge
          count={row.transferSummary?.totalTransferred || 0}
          style={{ backgroundColor: '#1890ff' }}
          showZero
        />
      ),
    },
    {
      title:  'Actions',
      key:    'actions',
      width:  160,
      render: (_, row) => (
        <Space size="small">
          <Tooltip title="View details">
            <Button
              size="small"
              icon={<EyeOutlined />}
              onClick={() => setDetailId(row._id)}
            />
          </Tooltip>
          {row.status === 'active' && (
            <Tooltip title="Edit">
              <Button
                size="small"
                icon={<EditOutlined />}
                onClick={() => openEdit(row)}
              />
            </Tooltip>
          )}
          {['active', 'paused'].includes(row.status) && (
            <Tooltip title={row.status === 'active' ? 'Pause' : 'Resume'}>
              <Button
                size="small"
                icon={row.status === 'active'
                  ? <PauseCircleOutlined />
                  : <PlayCircleOutlined />}
                onClick={() => handlePause(row)}
              />
            </Tooltip>
          )}
          {['active', 'paused'].includes(row.status) && (
            <Popconfirm
              title="Revoke this delegation?"
              description="Pending approval steps will be returned to you immediately."
              onConfirm={() => handleRevoke(row)}
              okText="Revoke"
              cancelText="Cancel"
              okButtonProps={{ danger: true }}
            >
              <Tooltip title="Revoke">
                <Button size="small" danger icon={<DeleteOutlined />} />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  // ── Incoming columns ──────────────────────────────────────────────────────
  const incomingColumns = [
    {
      title:     'Delegated By',
      dataIndex: 'delegatorName',
      render:    (name, row) => (
        <Space direction="vertical" size={0}>
          <Text strong>{name}</Text>
          <Text type="secondary" style={{ fontSize: '12px' }}>{row.delegatorEmail}</Text>
        </Space>
      ),
    },
    {
      title:  'What They Delegated',
      key:    'scope',
      width:  280,
      render: (_, row) =>
        row.scope === 'all' ? (
          <Tag color="blue">All Processes</Tag>
        ) : (
          <Space wrap size={4}>
            {(row.processTypes || []).slice(0, 4).map((t) => (
              <Tag key={t} color="geekblue" style={{ fontSize: '11px' }}>
                {processTypes.flat.find((p) => p.key === t)?.label || t}
              </Tag>
            ))}
            {(row.processTypes || []).length > 4 && (
              <Tag style={{ fontSize: '11px' }}>
                +{(row.processTypes || []).length - 4} more
              </Tag>
            )}
          </Space>
        ),
    },
    {
      title:  'Status',
      key:    'status',
      width:  100,
      render: (_, row) => (
        <Tag color={STATUS_COLORS[row.status] || 'default'}>
          {row.status.toUpperCase()}
        </Tag>
      ),
    },
    {
      title:  'Since',
      key:    'since',
      width:  120,
      render: (_, row) => (
        <Text style={{ fontSize: '12px' }}>
          {moment(row.startDate).format('DD MMM YYYY')}
        </Text>
      ),
    },
    {
      title:  'Reason',
      dataIndex: 'reason',
      render: (r) => <Text type="secondary" style={{ fontSize: '12px' }}>{r || '—'}</Text>,
    },
    {
      title:  '',
      key:    'view',
      width:  60,
      render: (_, row) => (
        <Button
          size="small"
          icon={<EyeOutlined />}
          onClick={() => setDetailId(row._id)}
        />
      ),
    },
  ];

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '24px', maxWidth: '1100px', margin: '0 auto' }}>

      {/* ── HEADER ────────────────────────────────────────────────────── */}
      <Card
        style={{
          marginBottom:  '24px',
          background:    'linear-gradient(135deg, #1a1a2e, #16213e)',
          borderRadius:  '16px',
        }}
        bodyStyle={{ padding: '28px 32px' }}
      >
        <Space>
          <SwapOutlined style={{ fontSize: '36px', color: '#1890ff' }} />
          <div>
            <Title level={3} style={{ margin: 0, color: '#fff' }}>
              Delegation Settings
            </Title>
            <Text style={{ color: 'rgba(255,255,255,0.6)' }}>
              Delegate your processes to colleagues — they act on your behalf
              while you retain read-only visibility
            </Text>
          </div>
        </Space>
      </Card>

      {/* ── LOCKED PROCESSES ALERT ──────────────────────────────────── */}
      {outgoing.filter((d) => d.status === 'active').length > 0 && (
        <Alert
          type="warning"
          showIcon
          icon={<WarningOutlined />}
          style={{ marginBottom: '24px', borderRadius: '12px' }}
          message={
            <Text strong>
              You have {outgoing.filter((d) => d.status === 'active').length} active outgoing delegation(s)
            </Text>
          }
          description={
            <>
              For the delegated process types you are in <strong>read-only mode</strong> —
              you cannot submit or approve directly. Your delegate acts on your behalf.
              You will still receive copies of all notifications.
            </>
          }
        />
      )}

      {/* ── INCOMING DELEGATION BANNER ──────────────────────────────── */}
      {incoming.filter((d) => d.status === 'active').length > 0 && (
        <Alert
          type="info"
          showIcon
          icon={<CrownOutlined />}
          style={{ marginBottom: '24px', borderRadius: '12px' }}
          message={
            <Text strong>
              {incoming.filter((d) => d.status === 'active').length} user(s) have delegated processes to you
            </Text>
          }
          description={
            <>
              You can submit requests and approve on their behalf. When submitting,
              use the <Text code>Submit on behalf of</Text> dropdown on each form.
              Delegated approval steps appear in your normal queues with a
              <Tag color="blue" style={{ marginLeft: '6px', fontSize: '11px' }}>DELEGATED</Tag>
              badge.
            </>
          }
        />
      )}

      {/* ── MAIN TABS ─────────────────────────────────────────────────── */}
      <Card style={{ borderRadius: '12px' }}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          tabBarExtraContent={
            activeTab === 'outgoing' && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={openCreate}
              >
                New Delegation
              </Button>
            )
          }
          items={[
            {
              key:   'outgoing',
              label: (
                <Space>
                  <SwapOutlined />
                  My Delegations
                  {outgoing.filter((d) => d.status === 'active').length > 0 && (
                    <Badge
                      count={outgoing.filter((d) => d.status === 'active').length}
                      style={{ backgroundColor: '#faad14' }}
                    />
                  )}
                </Space>
              ),
              children: (
                <>
                  <Paragraph type="secondary" style={{ marginBottom: '16px' }}>
                    Delegations you have set up. Your delegates can submit requests
                    as you and approve at your steps. While a delegation is active,
                    you are read-only for those process types.
                  </Paragraph>
                  <Table
                    dataSource={outgoing}
                    columns={outgoingColumns}
                    rowKey="_id"
                    loading={loading}
                    pagination={{ pageSize: 10 }}
                    locale={{
                      emptyText: (
                        <Empty
                          description="No delegations set up yet"
                          image={Empty.PRESENTED_IMAGE_SIMPLE}
                        >
                          <Button type="primary" onClick={openCreate}>
                            Create your first delegation
                          </Button>
                        </Empty>
                      ),
                    }}
                  />
                </>
              ),
            },
            {
              key:   'incoming',
              label: (
                <Space>
                  <UserOutlined />
                  Delegated to Me
                  {incoming.filter((d) => d.status === 'active').length > 0 && (
                    <Badge
                      count={incoming.filter((d) => d.status === 'active').length}
                      style={{ backgroundColor: '#1890ff' }}
                    />
                  )}
                </Space>
              ),
              children: (
                <>
                  <Paragraph type="secondary" style={{ marginBottom: '16px' }}>
                    Other users have delegated their processes to you. You can act
                    on their behalf for the listed process types.
                  </Paragraph>
                  <Table
                    dataSource={incoming}
                    columns={incomingColumns}
                    rowKey="_id"
                    loading={loading}
                    pagination={{ pageSize: 10 }}
                    locale={{
                      emptyText: (
                        <Empty
                          description="Nobody has delegated to you yet"
                          image={Empty.PRESENTED_IMAGE_SIMPLE}
                        />
                      ),
                    }}
                  />
                </>
              ),
            },
          ]}
        />
      </Card>

      {/* ── CREATE / EDIT MODAL ──────────────────────────────────────── */}
      <Modal
        title={editTarget ? 'Edit Delegation' : 'Create New Delegation'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        width={680}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleModalSubmit}>

          {/* Delegate selector */}
          <Form.Item
            name="delegateEmail"
            label="Delegate (who will act on your behalf)"
            rules={[{ required: true, message: 'Please select a delegate' }]}
          >
            <Select
              showSearch
              placeholder="Search by name or email"
              optionFilterProp="children"
              disabled={!!editTarget}   // can't change delegate on edit — create a new one
            >
              {allUsers.map((u) => (
                <Option key={u.email} value={u.email}>
                  <Space>
                    <UserOutlined />
                    <span>{u.fullName}</span>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      — {u.position || u.role}
                    </Text>
                  </Space>
                </Option>
              ))}
            </Select>
          </Form.Item>

          {/* Scope toggle */}
          <Form.Item label="Delegation scope">
            <Space align="center">
              <Switch
                checked={scopeAll}
                onChange={setScopeAll}
                checkedChildren="All processes"
                unCheckedChildren="Selective"
              />
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {scopeAll
                  ? 'Every process type is delegated'
                  : 'Choose specific process types below'}
              </Text>
            </Space>
          </Form.Item>

          {/* Process type checkboxes — only shown when selective */}
          {!scopeAll && (
            <Form.Item
              name="processTypes"
              label="Process types to delegate"
              rules={[{
                required: true,
                message:  'Select at least one process type',
                validator: (_, value) =>
                  value && value.length > 0
                    ? Promise.resolve()
                    : Promise.reject('Select at least one'),
              }]}
            >
              <Checkbox.Group style={{ width: '100%' }}>
                {processTypes.byCategory.map(({ category, types }) => (
                  <div key={category} style={{ marginBottom: '16px' }}>
                    <Text
                      strong
                      style={{
                        display:     'block',
                        marginBottom: '8px',
                        color:        '#1890ff',
                        fontSize:     '13px',
                      }}
                    >
                      {category}
                    </Text>
                    <Row gutter={[8, 8]}>
                      {types.map((t) => (
                        <Col span={12} key={t.key}>
                          <Checkbox value={t.key}>
                            <Space direction="vertical" size={0}>
                              <Text style={{ fontSize: '13px' }}>{t.label}</Text>
                              <Text type="secondary" style={{ fontSize: '11px' }}>
                                {t.description}
                              </Text>
                            </Space>
                          </Checkbox>
                        </Col>
                      ))}
                    </Row>
                  </div>
                ))}
              </Checkbox.Group>
            </Form.Item>
          )}

          <Divider />

          {/* Date range */}
          <Form.Item
            name="endDate"
            label={
              <Space>
                End date (optional)
                <Tooltip title="Leave blank to delegate indefinitely until you manually revoke">
                  <InfoCircleOutlined style={{ color: '#888' }} />
                </Tooltip>
              </Space>
            }
          >
            <DatePicker
              style={{ width: '100%' }}
              placeholder="Leave blank for indefinite"
              disabledDate={(d) => d && d.isBefore(moment(), 'day')}
            />
          </Form.Item>

          {/* Reason */}
          <Form.Item name="reason" label="Reason (shown to your delegate)">
            <Input.TextArea
              rows={2}
              placeholder="e.g. Annual leave, Training programme, Extended project..."
            />
          </Form.Item>

          {/* Info callout */}
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: '16px' }}
            message="What happens when you save"
            description={
              <ul style={{ margin: '4px 0', paddingLeft: '18px', fontSize: '13px' }}>
                <li>Your delegate is notified immediately.</li>
                <li>All pending approval steps currently at your level are transferred to your delegate.</li>
                <li>You become <strong>read-only</strong> for the delegated process types.</li>
                <li>Your delegate can submit on your behalf using the "on behalf of" option on forms.</li>
              </ul>
            }
          />

          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={modalLoading}>
              {editTarget ? 'Update Delegation' : 'Create & Transfer'}
            </Button>
          </Space>
        </Form>
      </Modal>

      {/* ── DETAIL DRAWER (delegation log) ──────────────────────────── */}
      <Modal
        title={
          <Space>
            <HistoryOutlined />
            Delegation Detail &amp; Action Log
          </Space>
        }
        open={!!detailId}
        onCancel={() => { setDetailId(null); setDetail(null); }}
        footer={<Button onClick={() => { setDetailId(null); setDetail(null); }}>Close</Button>}
        width={700}
      >
        {!detail ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <Spin />
          </div>
        ) : (
          <>
            <Row gutter={[16, 12]} style={{ marginBottom: '20px' }}>
              <Col span={12}>
                <Text type="secondary">Delegator</Text>
                <br />
                <Text strong>{detail.delegatorName}</Text>
              </Col>
              <Col span={12}>
                <Text type="secondary">Delegate</Text>
                <br />
                <Text strong>{detail.delegateName}</Text>
              </Col>
              <Col span={12}>
                <Text type="secondary">Status</Text>
                <br />
                <Tag color={STATUS_COLORS[detail.status] || 'default'}>
                  {detail.status?.toUpperCase()}
                </Tag>
              </Col>
              <Col span={12}>
                <Text type="secondary">Scope</Text>
                <br />
                {detail.scope === 'all' ? (
                  <Tag color="blue">All Processes</Tag>
                ) : (
                  <Space wrap size={4}>
                    {(detail.processTypes || []).map((t) => (
                      <Tag key={t} style={{ fontSize: '11px' }}>
                        {processTypes.flat.find((p) => p.key === t)?.label || t}
                      </Tag>
                    ))}
                  </Space>
                )}
              </Col>
              <Col span={12}>
                <Text type="secondary">Started</Text>
                <br />
                <Text>{moment(detail.startDate).format('DD MMM YYYY')}</Text>
              </Col>
              <Col span={12}>
                <Text type="secondary">Ends</Text>
                <br />
                <Text>{detail.endDate ? moment(detail.endDate).format('DD MMM YYYY') : 'Indefinite'}</Text>
              </Col>
              {detail.transferSummary?.totalTransferred > 0 && (
                <Col span={24}>
                  <Alert
                    type="info"
                    message={`${detail.transferSummary.totalTransferred} approval step(s) were transferred when this delegation was activated`}
                    style={{ fontSize: '12px' }}
                  />
                </Col>
              )}
            </Row>

            <Divider>Action Log ({(detail.actionLog || []).length} entries)</Divider>

            {(detail.actionLog || []).length === 0 ? (
              <Empty description="No actions recorded yet" />
            ) : (
              <Timeline
                style={{ maxHeight: '300px', overflowY: 'auto', padding: '8px 0' }}
                items={(detail.actionLog || [])
                  .slice()
                  .reverse()
                  .map((entry, i) => ({
                    color: entry.action === 'approved'  ? 'green'
                         : entry.action === 'rejected'  ? 'red'
                         : entry.action === 'submitted' ? 'blue'
                         : 'gray',
                    children: (
                      <div key={i}>
                        <Space>
                          <Tag style={{ fontSize: '11px' }}>
                            {entry.action?.toUpperCase()}
                          </Tag>
                          <Text strong style={{ fontSize: '12px' }}>
                            {entry.requestDisplayId || entry.requestId?.toString()?.slice(-8)}
                          </Text>
                          <Text type="secondary" style={{ fontSize: '11px' }}>
                            {entry.processType?.replace(/_/g, ' ')}
                          </Text>
                        </Space>
                        <br />
                        <Text type="secondary" style={{ fontSize: '11px' }}>
                          {moment(entry.timestamp).format('DD MMM YYYY, HH:mm')}
                          {' · '}
                          {entry.performedByName} on behalf of {entry.onBehalfOfName}
                        </Text>
                      </div>
                    ),
                  }))}
              />
            )}
          </>
        )}
      </Modal>

    </div>
  );
};

export default UserDelegationSettings;
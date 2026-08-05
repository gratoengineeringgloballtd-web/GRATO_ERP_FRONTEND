// ═══════════════════════════════════════════════════════════════════════════
// FILE: src/pages/ceo/CEOAvailabilitySettings.jsx
// VERSION: 2.0 — Per-type delegation card added
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import {
  Card, Row, Col, Switch, Form, Select, DatePicker, Input, Button,
  Alert, Divider, Typography, Table, Tag, Space, Timeline,
  InputNumber, message, Spin, Tooltip, Badge, Popconfirm,
} from 'antd';
import {
  CrownOutlined, UserOutlined, ClockCircleOutlined, CheckCircleOutlined,
  WarningOutlined, InfoCircleOutlined, HistoryOutlined,
  DollarOutlined, SettingOutlined, SwapOutlined, DeleteOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import api from '../../services/api';
import moment from 'moment';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const CEOAvailabilitySettings = () => {
  const { user }  = useSelector(state => state.auth);
  const [form]    = Form.useForm();
  const [loading, setLoading]   = useState(true);
  const [saving,  setSaving]    = useState(false);
  const [savingTypes, setSavingTypes] = useState(false);

  // Global availability state
  const [availability, setAvailability] = useState(null);
  const [thresholds,   setThresholds]   = useState(null);
  const [delegates,    setDelegates]    = useState([]);

  // Per-type delegation state
  // Shape: { [requestType]: { delegateEmail: string|null, dirty: boolean } }
  const [typeSettings,    setTypeSettings]    = useState({});
  const [eligibleTypes,   setEligibleTypes]   = useState([]);
  const [typesDirty,      setTypesDirty]      = useState(false);
  const [clearingType,    setClearingType]    = useState(null);   // requestType being cleared
  const [transferResult,  setTransferResult]  = useState(null);  // { summary, totalTransferred }

  // ── Data loading ──────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [avRes, thrRes, usersRes, typeRes] = await Promise.allSettled([
        api.get('/ceo/availability'),
        api.get('/ceo/thresholds'),
        api.get('/auth/users?limit=100&isActive=true'),
        api.get('/ceo/type-delegations'),
      ]);

      if (avRes.status === 'fulfilled') setAvailability(avRes.value.data.data);
      if (thrRes.status === 'fulfilled') setThresholds(thrRes.value.data.data);

      if (usersRes.status === 'fulfilled') {
        const users = usersRes.value.data.data?.users || [];
        setDelegates(users.filter(u => u.email !== user?.email));
      }

      if (typeRes.status === 'fulfilled') {
        const { eligibleTypes: et } = typeRes.value.data.data;
        setEligibleTypes(et || []);

        // Initialise typeSettings from the fetched eligible types
        const initial = {};
        (et || []).forEach(t => {
          initial[t.requestType] = {
            delegateEmail: t.activeDelegation?.delegateEmail || null,
          };
        });
        setTypeSettings(initial);
      }

      // Populate global availability form
      if (avRes.status === 'fulfilled') {
        const av = avRes.value.data.data;
        form.setFieldsValue({
          isUnavailable:        av.isUnavailable,
          unavailabilityReason: av.unavailabilityReason,
          delegateEmail:        av.delegateEmail,
          unavailableUntil:     av.unavailableUntil ? moment(av.unavailableUntil) : null,
          keepTomInformed:      av.keepTomInformed,
          reminderAfterDays:    av.autoEscalation?.reminderAfterDays     || 2,
          autoDelegateAfterDays: av.autoEscalation?.autoDelegateAfterDays || 5,
        });
      }
    } catch (e) {
      message.error('Failed to load availability settings');
    } finally {
      setLoading(false);
    }
  }, [form, user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Global availability save ──────────────────────────────────────────────
  const handleSaveGlobal = async (values) => {
    setSaving(true);
    try {
      await api.put('/ceo/availability', {
        isUnavailable:        values.isUnavailable,
        unavailabilityReason: values.unavailabilityReason,
        delegateEmail:        values.delegateEmail,
        unavailableUntil:     values.unavailableUntil?.toISOString() || null,
        keepTomInformed:      values.keepTomInformed,
      });

      await api.put('/ceo/availability/auto-escalation', {
        enabled:               true,
        reminderAfterDays:     values.reminderAfterDays,
        autoDelegateAfterDays: values.autoDelegateAfterDays,
      });

      message.success('Global availability settings saved');
      fetchData();
    } catch (e) {
      message.error('Failed to save global settings');
    } finally {
      setSaving(false);
    }
  };

  // ── Per-type delegation save ───────────────────────────────────────────────
  const handleSaveTypeDelegations = async () => {
    setSavingTypes(true);
    setTransferResult(null);
    try {
      // Build the payload — only include types that have a delegate selected
      const delegations = Object.entries(typeSettings)
        .filter(([, cfg]) => cfg.delegateEmail)
        .map(([requestType, cfg]) => ({
          requestType,
          delegateEmail: cfg.delegateEmail,
        }));

      const res = await api.put('/ceo/type-delegations', { delegations });
      const { totalTransferred, transferSummary } = res.data.data;

      message.success(
        `Per-type delegation saved. ${totalTransferred} in-flight request(s) transferred.`
      );
      setTypesDirty(false);
      setTransferResult({ summary: transferSummary, totalTransferred });
      fetchData();
    } catch (e) {
      message.error(e.response?.data?.message || 'Failed to save type delegations');
    } finally {
      setSavingTypes(false);
    }
  };

  // ── Clear a single type delegation ────────────────────────────────────────
  const handleClearTypeDelegate = async (requestType) => {
    setClearingType(requestType);
    try {
      const res = await api.delete(`/ceo/type-delegations/${requestType}`);
      const { requestsReturned } = res.data.data;
      message.success(
        `Delegation cleared. ${requestsReturned} request(s) returned to Tom.`
      );
      setTypeSettings(prev => ({
        ...prev,
        [requestType]: { delegateEmail: null },
      }));
      fetchData();
    } catch (e) {
      message.error(e.response?.data?.message || 'Failed to clear delegation');
    } finally {
      setClearingType(null);
    }
  };

  // ── Threshold table columns ───────────────────────────────────────────────
  const thresholdColumns = [
    {
      title:     'Request Type',
      dataIndex: 'type',
      render:    t => (
        <Text strong style={{ textTransform: 'capitalize' }}>
          {t.replace(/_/g, ' ')}
        </Text>
      ),
    },
    {
      title:     'Description',
      dataIndex: 'description',
      width:     260,
    },
    {
      title:  'CEO Approval Required?',
      dataIndex: 'rule',
      render: (_, row) => {
        if (row.alwaysEscalate) return <Tag color="red">Always (Strategic)</Tag>;
        if (row.neverEscalate)  return <Tag color="default">Never</Tag>;
        return (
          <Tag color="orange">
            ≥ {Number(row.minAmountForCEO).toLocaleString()} XAF
          </Tag>
        );
      },
    },
  ];

  const thresholdData = thresholds
    ? Object.entries(thresholds.thresholds).map(([type, cfg]) => ({
        key:             type,
        type,
        description:     cfg.description,
        alwaysEscalate:  cfg.alwaysEscalate,
        neverEscalate:   cfg.neverEscalate,
        minAmountForCEO: cfg.minAmountForCEO,
      }))
    : [];

  // ── Per-type delegation table columns ────────────────────────────────────
  const typeDelegationColumns = [
    {
      title:  'Request Type',
      key:    'requestType',
      width:  180,
      render: (_, row) => (
        <Space direction="vertical" size={0}>
          <Text strong style={{ textTransform: 'capitalize' }}>
            {row.label}
          </Text>
          {(row.alwaysEscalate) && (
            <Tag color="red" style={{ fontSize: '11px', marginTop: 2 }}>
              Always reaches CEO
            </Tag>
          )}
          {row.minAmountForCEO && (
            <Tag color="orange" style={{ fontSize: '11px', marginTop: 2 }}>
              ≥ {Number(row.minAmountForCEO).toLocaleString()} XAF
            </Tag>
          )}
        </Space>
      ),
    },
    {
      title:     'Description',
      dataIndex: 'description',
      width:     200,
      render:    d => <Text type="secondary" style={{ fontSize: '12px' }}>{d}</Text>,
    },
    {
      title:  'Delegate (leave blank = Tom approves)',
      key:    'delegate',
      render: (_, row) => {
        const current = typeSettings[row.requestType]?.delegateEmail || undefined;
        return (
          <Select
            placeholder="Tom approves this type himself"
            allowClear
            showSearch
            optionFilterProp="children"
            style={{ width: '100%', minWidth: 240 }}
            value={current || undefined}
            onChange={val => {
              setTypeSettings(prev => ({
                ...prev,
                [row.requestType]: { delegateEmail: val || null },
              }));
              setTypesDirty(true);
            }}
          >
            {delegates.map(d => (
              <Option key={d.email} value={d.email}>
                {d.fullName} — <Text type="secondary">{d.position}</Text>
              </Option>
            ))}
          </Select>
        );
      },
    },
    {
      title:  'Status',
      key:    'status',
      width:  140,
      render: (_, row) => {
        const isActive = Boolean(typeSettings[row.requestType]?.delegateEmail);
        if (!isActive) {
          return (
            <Badge
              status="success"
              text={<Text style={{ fontSize: '12px' }}>Tom handles</Text>}
            />
          );
        }
        const delegateName = delegates.find(
          d => d.email === typeSettings[row.requestType]?.delegateEmail
        )?.fullName || 'Delegate';
        return (
          <Badge
            status="warning"
            text={<Text style={{ fontSize: '12px' }}>→ {delegateName.split(' ').slice(-1)[0]}</Text>}
          />
        );
      },
    },
    {
      title:  '',
      key:    'actions',
      width:  60,
      render: (_, row) => {
        const hasActive = Boolean(
          eligibleTypes.find(t => t.requestType === row.requestType)?.activeDelegation
        );
        if (!hasActive) return null;

        return (
          <Popconfirm
            title="Clear this delegation?"
            description="In-flight requests will be returned to Tom."
            onConfirm={() => handleClearTypeDelegate(row.requestType)}
            okText="Clear"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="Clear delegation & return requests to Tom">
              <Button
                size="small"
                danger
                icon={<DeleteOutlined />}
                loading={clearingType === row.requestType}
              />
            </Tooltip>
          </Popconfirm>
        );
      },
    },
  ];

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '80px' }}><Spin size="large" /></div>;
  }

  // ── Count active type delegations for the badge ───────────────────────────
  const activeTypeDelegationCount = Object.values(typeSettings).filter(
    s => s.delegateEmail
  ).length;

  return (
    <div style={{ padding: '24px', maxWidth: '1080px', margin: '0 auto' }}>

      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <Card
        style={{
          marginBottom:     '24px',
          background:       'linear-gradient(135deg, #0a0a1a, #1a1a3e)',
          borderRadius:     '16px',
        }}
        bodyStyle={{ padding: '28px 32px' }}
      >
        <Space>
          <CrownOutlined style={{ fontSize: '36px', color: '#faad14' }} />
          <div>
            <Title level={3} style={{ margin: 0, color: '#fff' }}>
              CEO Availability &amp; Delegation
            </Title>
            <Text style={{ color: 'rgba(255,255,255,0.6)' }}>
              Manage your approval authority — globally or per request type
            </Text>
          </div>
        </Space>
      </Card>

      {/* ── STATUS BANNER ───────────────────────────────────────────────── */}
      {availability?.isUnavailable ? (
        <Alert
          type="warning"
          showIcon
          icon={<WarningOutlined />}
          message={<Text strong>You are currently marked as GLOBALLY UNAVAILABLE</Text>}
          description={
            <>
              All CEO-level approvals are being routed to{' '}
              <Text strong>{availability.delegateName}</Text>.
              {availability.unavailableUntil && (
                <> Expected return:{' '}
                  <Text strong>{moment(availability.unavailableUntil).format('MMM DD, YYYY')}</Text>
                </>
              )}
            </>
          }
          style={{ marginBottom: '16px', borderRadius: '12px' }}
        />
      ) : (
        <Alert
          type="success"
          showIcon
          icon={<CheckCircleOutlined />}
          message={
            <Space>
              <span>You are AVAILABLE</span>
              {activeTypeDelegationCount > 0 && (
                <Tag color="orange" icon={<SwapOutlined />}>
                  {activeTypeDelegationCount} type{activeTypeDelegationCount > 1 ? 's' : ''} delegated
                </Tag>
              )}
            </Space>
          }
          description={
            activeTypeDelegationCount > 0
              ? `You are personally approving most request types. ${activeTypeDelegationCount} specific type(s) are delegated to others.`
              : 'All CEO-level approvals are routing directly to you.'
          }
          style={{ marginBottom: '16px', borderRadius: '12px' }}
        />
      )}

      {/* ── TRANSFER RESULT BANNER (shown after saving type delegations) ── */}
      {transferResult && (
        <Alert
          type="info"
          closable
          onClose={() => setTransferResult(null)}
          icon={<ThunderboltOutlined />}
          showIcon
          message={`${transferResult.totalTransferred} in-flight request(s) transferred to delegate(s)`}
          description={
            transferResult.summary.filter(s => s.transferred > 0).length > 0 ? (
              <ul style={{ margin: '6px 0 0', paddingLeft: '18px' }}>
                {transferResult.summary
                  .filter(s => s.transferred > 0)
                  .map(s => (
                    <li key={s.requestType}>
                      <Text strong>{s.label}</Text>: {s.transferred} request(s) transferred
                    </li>
                  ))}
              </ul>
            ) : 'No requests were currently sitting at Tom\'s approval step.'
          }
          style={{ marginBottom: '16px', borderRadius: '12px' }}
        />
      )}

      {/* ── SECTION 1: GLOBAL AVAILABILITY FORM ─────────────────────────── */}
      <Card
        title={
          <Space>
            <SettingOutlined />
            <span>Global Availability</span>
            <Tooltip title="When toggled on, Tom is completely away — all CEO approvals go to one delegate.">
              <InfoCircleOutlined style={{ color: '#888', fontSize: '13px' }} />
            </Tooltip>
          </Space>
        }
        style={{ borderRadius: '12px', marginBottom: '24px' }}
      >
        <Form form={form} layout="vertical" onFinish={handleSaveGlobal}>
          <Row gutter={24}>
            <Col xs={24} md={12}>
              <Form.Item
                name="isUnavailable"
                label="Mark yourself as fully unavailable?"
                valuePropName="checked"
              >
                <Switch checkedChildren="Unavailable (all delegated)" unCheckedChildren="Available" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="keepTomInformed"
                label="Receive read-only copies while delegated?"
                valuePropName="checked"
              >
                <Switch checkedChildren="Yes" unCheckedChildren="No" defaultChecked />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item name="delegateEmail" label="Global delegate (handles everything when you are away)">
                <Select placeholder="Select delegate" showSearch optionFilterProp="children" allowClear>
                  {delegates.map(d => (
                    <Option key={d.email} value={d.email}>
                      {d.fullName} — {d.position}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="unavailableUntil" label="Return date (optional)">
                <DatePicker style={{ width: '100%' }} placeholder="When will you be back?" />
              </Form.Item>
            </Col>

            <Col xs={24}>
              <Form.Item name="unavailabilityReason" label="Reason (shown to your delegate)">
                <Input.TextArea rows={2} placeholder="e.g. International travel, Medical leave…" />
              </Form.Item>
            </Col>
          </Row>

          <Divider>Auto-Escalation Timeouts</Divider>
          <Paragraph type="secondary" style={{ marginBottom: '16px' }}>
            If a request sits at your approval step without action, the system will first send
            you a reminder, then automatically delegate to your chosen delegate.
          </Paragraph>

          <Row gutter={24}>
            <Col xs={24} md={12}>
              <Form.Item
                name="reminderAfterDays"
                label={
                  <Space>
                    Send me a reminder after
                    <Tooltip title="Days after a request arrives at your step before you get an email nudge">
                      <InfoCircleOutlined style={{ color: '#888' }} />
                    </Tooltip>
                  </Space>
                }
              >
                <InputNumber min={1} max={30} addonAfter="days" style={{ width: '160px' }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="autoDelegateAfterDays"
                label={
                  <Space>
                    Auto-delegate after
                    <Tooltip title="Days before the system auto-routes to your global delegate">
                      <InfoCircleOutlined style={{ color: '#888' }} />
                    </Tooltip>
                  </Space>
                }
              >
                <InputNumber min={1} max={60} addonAfter="days" style={{ width: '160px' }} />
              </Form.Item>
            </Col>
          </Row>

          <Button
            type="primary"
            htmlType="submit"
            loading={saving}
            icon={<CheckCircleOutlined />}
            size="large"
          >
            Save Global Settings
          </Button>
        </Form>
      </Card>

      {/* ── SECTION 2: PER-TYPE DELEGATION ──────────────────────────────── */}
      <Card
        title={
          <Space>
            <SwapOutlined />
            <span>Per-Type Delegation</span>
            {activeTypeDelegationCount > 0 && (
              <Badge count={activeTypeDelegationCount} style={{ backgroundColor: '#faad14' }} />
            )}
          </Space>
        }
        extra={
          typesDirty && (
            <Text type="warning" style={{ fontSize: '12px' }}>
              ● Unsaved changes
            </Text>
          )
        }
        style={{ borderRadius: '12px', marginBottom: '24px' }}
      >
        <Paragraph type="secondary" style={{ marginBottom: '16px' }}>
          You can delegate specific request types to different people while personally approving
          the rest. For example: route all <strong>Cash Requests</strong> to Kelvin while you
          continue approving <strong>Invoices</strong> yourself.
          <br />
          When you save, any requests of the delegated type that are currently waiting for your
          approval will be <strong>immediately transferred</strong> to the new delegate's queue.
        </Paragraph>

        <Table
          dataSource={eligibleTypes}
          columns={typeDelegationColumns}
          rowKey="requestType"
          pagination={false}
          size="middle"
          rowClassName={row =>
            typeSettings[row.requestType]?.delegateEmail ? 'delegated-row' : ''
          }
          style={{ marginBottom: '16px' }}
        />

        <Space>
          <Button
            type="primary"
            icon={<SwapOutlined />}
            size="large"
            loading={savingTypes}
            disabled={!typesDirty}
            onClick={handleSaveTypeDelegations}
          >
            Save &amp; Transfer In-Flight Requests
          </Button>
          {typesDirty && (
            <Button
              size="large"
              onClick={() => {
                // Reset to what was fetched
                const reset = {};
                eligibleTypes.forEach(t => {
                  reset[t.requestType] = {
                    delegateEmail: t.activeDelegation?.delegateEmail || null,
                  };
                });
                setTypeSettings(reset);
                setTypesDirty(false);
              }}
            >
              Discard Changes
            </Button>
          )}
        </Space>

        {/* Inline style for highlighted rows */}
        <style>{`
          .delegated-row { background: #fffbe6 !important; }
          .delegated-row:hover > td { background: #fff3cc !important; }
        `}</style>
      </Card>

      {/* ── SECTION 3: THRESHOLD TABLE ──────────────────────────────────── */}
      <Card
        title={<><DollarOutlined /> Approval Threshold Rules</>}
        extra={
          <Text type="secondary" style={{ fontSize: '12px' }}>
            To change thresholds, edit config/ceoApprovalConfig.js
          </Text>
        }
        style={{ borderRadius: '12px', marginBottom: '24px' }}
      >
        <Table
          dataSource={thresholdData}
          columns={thresholdColumns}
          pagination={false}
          size="small"
        />
      </Card>

      {/* ── SECTION 4: DELEGATION HISTORY ───────────────────────────────── */}
      {availability?.delegationHistory?.length > 0 && (
        <Card
          title={<><HistoryOutlined /> Global Delegation History</>}
          style={{ borderRadius: '12px' }}
        >
          <Timeline
            items={availability.delegationHistory
              .slice()
              .reverse()
              .map((h, i) => ({
                color:    h.clearedAt ? 'green' : 'orange',
                children: (
                  <div key={i}>
                    <Text strong>{h.delegateName}</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      {moment(h.from).format('MMM DD, YYYY')}
                      {h.until
                        ? ` → ${moment(h.until).format('MMM DD, YYYY')}`
                        : ' → ongoing'}
                      {h.reason ? ` · ${h.reason}` : ''}
                    </Text>
                    {h.clearedAt && (
                      <>
                        <br />
                        <Tag color="success" style={{ fontSize: '11px' }}>
                          Cleared {moment(h.clearedAt).format('MMM DD, YYYY')}
                        </Tag>
                      </>
                    )}
                  </div>
                ),
              }))}
          />
        </Card>
      )}

    </div>
  );
};

export default CEOAvailabilitySettings;











// // ═══════════════════════════════════════════════════════════════════════════
// // FILE: src/pages/ceo/CEOAvailabilitySettings.jsx  (NEW FILE)
// // PURPOSE: A settings panel where Tom can:
// //   - Toggle his availability on/off
// //   - Set a return date
// //   - Pick a delegate
// //   - View threshold rules
// //   - View delegation history
// //
// // Add a link to this page from the CEO quick-links section in Dashboard.jsx
// // and as a route in App.jsx under /ceo/availability-settings
// // ═══════════════════════════════════════════════════════════════════════════

// import React, { useState, useEffect } from 'react';
// import { useSelector } from 'react-redux';
// import {
//   Card, Row, Col, Switch, Form, Select, DatePicker, Input, Button,
//   Alert, Divider, Typography, Table, Tag, Space, Statistic, Timeline,
//   InputNumber, message, Spin, Tooltip
// } from 'antd';
// import {
//   CrownOutlined, UserOutlined, ClockCircleOutlined, CheckCircleOutlined,
//   WarningOutlined, InfoCircleOutlined, ThunderboltOutlined, HistoryOutlined,
//   DollarOutlined, SettingOutlined
// } from '@ant-design/icons';
// import api from '../../services/api';
// import moment from 'moment';

// const { Title, Text, Paragraph } = Typography;
// const { Option } = Select;

// const CEOAvailabilitySettings = () => {
//   const { user } = useSelector(state => state.auth);
//   const [form] = Form.useForm();
//   const [loading, setLoading]       = useState(true);
//   const [saving, setSaving]         = useState(false);
//   const [availability, setAvailability] = useState(null);
//   const [thresholds, setThresholds] = useState(null);
//   const [delegates, setDelegates]   = useState([]);

//   useEffect(() => {
//     fetchData();
//   }, []);

//   const fetchData = async () => {
//     setLoading(true);
//     try {
//       const [avRes, thrRes, usersRes] = await Promise.allSettled([
//         api.get('/ceo/availability'),
//         api.get('/ceo/thresholds'),
//         api.get('/auth/users?limit=100&isActive=true'), 
//       ]);

//       if (avRes.status  === 'fulfilled') setAvailability(avRes.value.data.data);
//       if (thrRes.status === 'fulfilled') setThresholds(thrRes.value.data.data);
//       if (usersRes.status === 'fulfilled') {
//         // auth/users returns data.data.users (nested)
//         const users = usersRes.value.data.data?.users || [];
//         setDelegates(users.filter(u => u.email !== user?.email));
//       }

//       if (avRes.status === 'fulfilled') {
//         const av = avRes.value.data.data;
//         form.setFieldsValue({
//           isUnavailable:        av.isUnavailable,
//           unavailabilityReason: av.unavailabilityReason,
//           delegateEmail:        av.delegateEmail,
//           unavailableUntil:     av.unavailableUntil ? moment(av.unavailableUntil) : null,
//           keepTomInformed:      av.keepTomInformed,
//           reminderAfterDays:    av.autoEscalation?.reminderAfterDays  || 2,
//           autoDelegateAfterDays: av.autoEscalation?.autoDelegateAfterDays || 5,
//         });
//       }
//     } catch (e) {
//       message.error('Failed to load availability settings');
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleSave = async (values) => {
//     setSaving(true);
//     try {
//       await api.put('/ceo/availability', {
//         isUnavailable:        values.isUnavailable,
//         unavailabilityReason: values.unavailabilityReason,
//         delegateEmail:        values.delegateEmail,
//         unavailableUntil:     values.unavailableUntil?.toISOString() || null,
//         keepTomInformed:      values.keepTomInformed,
//       });

//       await api.put('/ceo/availability/auto-escalation', {
//         enabled:               true,
//         reminderAfterDays:     values.reminderAfterDays,
//         autoDelegateAfterDays: values.autoDelegateAfterDays,
//       });

//       message.success('Availability settings saved successfully');
//       fetchData();
//     } catch (e) {
//       message.error('Failed to save settings');
//     } finally {
//       setSaving(false);
//     }
//   };

//   // ── Threshold table columns ────────────────────────────────────────────
//   const thresholdColumns = [
//     {
//       title: 'Request Type',
//       dataIndex: 'type',
//       render: t => <Text strong style={{ textTransform: 'capitalize' }}>{t.replace(/_/g, ' ')}</Text>,
//     },
//     {
//       title: 'Description',
//       dataIndex: 'description',
//       width: 260,
//     },
//     {
//       title: 'CEO Approval Required?',
//       dataIndex: 'rule',
//       render: (_, row) => {
//         if (row.alwaysEscalate)  return <Tag color="red">Always (Strategic)</Tag>;
//         if (row.neverEscalate)   return <Tag color="default">Never</Tag>;
//         return (
//           <Tag color="orange">
//             ≥ {Number(row.minAmountForCEO).toLocaleString()} XAF
//           </Tag>
//         );
//       },
//     },
//   ];

//   const thresholdData = thresholds
//     ? Object.entries(thresholds.thresholds).map(([type, cfg]) => ({
//         key:              type,
//         type,
//         description:      cfg.description,
//         alwaysEscalate:   cfg.alwaysEscalate,
//         neverEscalate:    cfg.neverEscalate,
//         minAmountForCEO:  cfg.minAmountForCEO,
//       }))
//     : [];

//   if (loading) return <div style={{ textAlign: 'center', padding: '80px' }}><Spin size="large" /></div>;

//   return (
//     <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>

//       {/* ── HEADER ─────────────────────────────────────────────────────── */}
//       <Card
//         style={{ marginBottom: '24px', background: 'linear-gradient(135deg, #0a0a1a, #1a1a3e)', borderRadius: '16px' }}
//         bodyStyle={{ padding: '28px 32px' }}
//       >
//         <Space>
//           <CrownOutlined style={{ fontSize: '36px', color: '#faad14' }} />
//           <div>
//             <Title level={3} style={{ margin: 0, color: '#fff' }}>CEO Availability & Delegation</Title>
//             <Text style={{ color: 'rgba(255,255,255,0.6)' }}>
//               Manage your approval authority, set a delegate, and configure auto-escalation
//             </Text>
//           </div>
//         </Space>
//       </Card>

//       {/* ── STATUS BANNER ──────────────────────────────────────────────── */}
//       {availability?.isUnavailable ? (
//         <Alert
//           type="warning"
//           showIcon
//           icon={<WarningOutlined />}
//           message={<Text strong>You are currently marked as UNAVAILABLE</Text>}
//           description={
//             <>
//               All CEO-level approvals are being routed to{' '}
//               <Text strong>{availability.delegateName}</Text>.
//               {availability.unavailableUntil && (
//                 <> Expected return: <Text strong>{moment(availability.unavailableUntil).format('MMM DD, YYYY')}</Text></>
//               )}
//             </>
//           }
//           style={{ marginBottom: '24px', borderRadius: '12px' }}
//         />
//       ) : (
//         <Alert
//           type="success"
//           showIcon
//           icon={<CheckCircleOutlined />}
//           message="You are currently AVAILABLE — all CEO approvals are routing to you"
//           style={{ marginBottom: '24px', borderRadius: '12px' }}
//         />
//       )}

//       {/* ── MAIN FORM ──────────────────────────────────────────────────── */}
//       <Card title={<><SettingOutlined /> Availability Settings</>} style={{ borderRadius: '12px', marginBottom: '24px' }}>
//         <Form form={form} layout="vertical" onFinish={handleSave}>
//           <Row gutter={24}>
//             <Col xs={24} md={12}>
//               <Form.Item name="isUnavailable" label="Mark yourself as unavailable?" valuePropName="checked">
//                 <Switch
//                   checkedChildren="Unavailable"
//                   unCheckedChildren="Available"
//                   style={{ '--antd-wave-shadow-color': '#ff4d4f' }}
//                 />
//               </Form.Item>
//             </Col>
//             <Col xs={24} md={12}>
//               <Form.Item name="keepTomInformed" label="Receive read-only copies while delegated?" valuePropName="checked">
//                 <Switch checkedChildren="Yes" unCheckedChildren="No" defaultChecked />
//               </Form.Item>
//             </Col>

//             <Col xs={24} md={12}>
//               <Form.Item name="delegateEmail" label="Delegate (acts on your behalf)">
//                 <Select placeholder="Select delegate" showSearch optionFilterProp="children">
//                   {delegates.map(d => (
//                     <Option key={d.email} value={d.email}>
//                       {d.fullName} — {d.position}
//                     </Option>
//                   ))}
//                 </Select>
//               </Form.Item>
//             </Col>
//             <Col xs={24} md={12}>
//               <Form.Item name="unavailableUntil" label="Return date (optional)">
//                 <DatePicker style={{ width: '100%' }} placeholder="When will you be back?" />
//               </Form.Item>
//             </Col>

//             <Col xs={24}>
//               <Form.Item name="unavailabilityReason" label="Reason (shown to your delegate)">
//                 <Input.TextArea rows={2} placeholder="e.g. International travel, Medical leave..." />
//               </Form.Item>
//             </Col>
//           </Row>

//           <Divider>Auto-Escalation Timeouts</Divider>
//           <Paragraph type="secondary" style={{ marginBottom: '16px' }}>
//             If a request sits at your approval step without action for too long, the system
//             will first remind you, then automatically delegate it to your chosen delegate.
//           </Paragraph>

//           <Row gutter={24}>
//             <Col xs={24} md={12}>
//               <Form.Item
//                 name="reminderAfterDays"
//                 label={
//                   <Space>
//                     Send me a reminder after
//                     <Tooltip title="Days after a request arrives at your step before you get an email nudge">
//                       <InfoCircleOutlined style={{ color: '#888' }} />
//                     </Tooltip>
//                   </Space>
//                 }
//               >
//                 <InputNumber min={1} max={30} addonAfter="days" style={{ width: '160px' }} />
//               </Form.Item>
//             </Col>
//             <Col xs={24} md={12}>
//               <Form.Item
//                 name="autoDelegateAfterDays"
//                 label={
//                   <Space>
//                     Auto-delegate to Kelvin after
//                     <Tooltip title="Days after a request arrives at your step before it is automatically routed to your delegate">
//                       <InfoCircleOutlined style={{ color: '#888' }} />
//                     </Tooltip>
//                   </Space>
//                 }
//               >
//                 <InputNumber min={1} max={60} addonAfter="days" style={{ width: '160px' }} />
//               </Form.Item>
//             </Col>
//           </Row>

//           <Button type="primary" htmlType="submit" loading={saving} icon={<CheckCircleOutlined />} size="large">
//             Save Settings
//           </Button>
//         </Form>
//       </Card>

//       {/* ── THRESHOLD TABLE ────────────────────────────────────────────── */}
//       <Card
//         title={<><DollarOutlined /> Approval Threshold Rules</>}
//         extra={<Text type="secondary" style={{ fontSize: '12px' }}>To change thresholds, edit config/ceoApprovalConfig.js</Text>}
//         style={{ borderRadius: '12px', marginBottom: '24px' }}
//       >
//         <Table
//           dataSource={thresholdData}
//           columns={thresholdColumns}
//           pagination={false}
//           size="small"
//         />
//       </Card>

//       {/* ── DELEGATION HISTORY ─────────────────────────────────────────── */}
//       {availability?.delegationHistory?.length > 0 && (
//         <Card title={<><HistoryOutlined /> Delegation History</>} style={{ borderRadius: '12px' }}>
//           <Timeline
//             items={availability.delegationHistory.slice().reverse().map((h, i) => ({
//               color: h.clearedAt ? 'green' : 'orange',
//               children: (
//                 <div key={i}>
//                   <Text strong>{h.delegateName}</Text>
//                   <br />
//                   <Text type="secondary" style={{ fontSize: '12px' }}>
//                     {moment(h.from).format('MMM DD, YYYY')}
//                     {h.until ? ` → ${moment(h.until).format('MMM DD, YYYY')}` : ' → ongoing'}
//                     {h.reason ? ` · ${h.reason}` : ''}
//                   </Text>
//                   {h.clearedAt && (
//                     <>
//                       <br />
//                       <Tag color="success" style={{ fontSize: '11px' }}>
//                         Cleared {moment(h.clearedAt).format('MMM DD, YYYY')}
//                       </Tag>
//                     </>
//                   )}
//                 </div>
//               ),
//             }))}
//           />
//         </Card>
//       )}

//     </div>
//   );
// };

// export default CEOAvailabilitySettings;
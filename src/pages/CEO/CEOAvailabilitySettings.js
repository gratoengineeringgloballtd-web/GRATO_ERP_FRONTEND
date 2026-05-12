// ═══════════════════════════════════════════════════════════════════════════
// FILE: src/pages/ceo/CEOAvailabilitySettings.jsx  (NEW FILE)
// PURPOSE: A settings panel where Tom can:
//   - Toggle his availability on/off
//   - Set a return date
//   - Pick a delegate
//   - View threshold rules
//   - View delegation history
//
// Add a link to this page from the CEO quick-links section in Dashboard.jsx
// and as a route in App.jsx under /ceo/availability-settings
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import {
  Card, Row, Col, Switch, Form, Select, DatePicker, Input, Button,
  Alert, Divider, Typography, Table, Tag, Space, Statistic, Timeline,
  InputNumber, message, Spin, Tooltip
} from 'antd';
import {
  CrownOutlined, UserOutlined, ClockCircleOutlined, CheckCircleOutlined,
  WarningOutlined, InfoCircleOutlined, ThunderboltOutlined, HistoryOutlined,
  DollarOutlined, SettingOutlined
} from '@ant-design/icons';
import api from '../../services/api';
import moment from 'moment';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

const CEOAvailabilitySettings = () => {
  const { user } = useSelector(state => state.auth);
  const [form] = Form.useForm();
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [availability, setAvailability] = useState(null);
  const [thresholds, setThresholds] = useState(null);
  const [delegates, setDelegates]   = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [avRes, thrRes, usersRes] = await Promise.allSettled([
        api.get('/ceo/availability'),
        api.get('/ceo/thresholds'),
        api.get('/auth/users?limit=100&isActive=true'), 
      ]);

      if (avRes.status  === 'fulfilled') setAvailability(avRes.value.data.data);
      if (thrRes.status === 'fulfilled') setThresholds(thrRes.value.data.data);
      if (usersRes.status === 'fulfilled') {
        // auth/users returns data.data.users (nested)
        const users = usersRes.value.data.data?.users || [];
        setDelegates(users.filter(u => u.email !== user?.email));
      }

      if (avRes.status === 'fulfilled') {
        const av = avRes.value.data.data;
        form.setFieldsValue({
          isUnavailable:        av.isUnavailable,
          unavailabilityReason: av.unavailabilityReason,
          delegateEmail:        av.delegateEmail,
          unavailableUntil:     av.unavailableUntil ? moment(av.unavailableUntil) : null,
          keepTomInformed:      av.keepTomInformed,
          reminderAfterDays:    av.autoEscalation?.reminderAfterDays  || 2,
          autoDelegateAfterDays: av.autoEscalation?.autoDelegateAfterDays || 5,
        });
      }
    } catch (e) {
      message.error('Failed to load availability settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (values) => {
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

      message.success('Availability settings saved successfully');
      fetchData();
    } catch (e) {
      message.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  // ── Threshold table columns ────────────────────────────────────────────
  const thresholdColumns = [
    {
      title: 'Request Type',
      dataIndex: 'type',
      render: t => <Text strong style={{ textTransform: 'capitalize' }}>{t.replace(/_/g, ' ')}</Text>,
    },
    {
      title: 'Description',
      dataIndex: 'description',
      width: 260,
    },
    {
      title: 'CEO Approval Required?',
      dataIndex: 'rule',
      render: (_, row) => {
        if (row.alwaysEscalate)  return <Tag color="red">Always (Strategic)</Tag>;
        if (row.neverEscalate)   return <Tag color="default">Never</Tag>;
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
        key:              type,
        type,
        description:      cfg.description,
        alwaysEscalate:   cfg.alwaysEscalate,
        neverEscalate:    cfg.neverEscalate,
        minAmountForCEO:  cfg.minAmountForCEO,
      }))
    : [];

  if (loading) return <div style={{ textAlign: 'center', padding: '80px' }}><Spin size="large" /></div>;

  return (
    <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>

      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <Card
        style={{ marginBottom: '24px', background: 'linear-gradient(135deg, #0a0a1a, #1a1a3e)', borderRadius: '16px' }}
        bodyStyle={{ padding: '28px 32px' }}
      >
        <Space>
          <CrownOutlined style={{ fontSize: '36px', color: '#faad14' }} />
          <div>
            <Title level={3} style={{ margin: 0, color: '#fff' }}>CEO Availability & Delegation</Title>
            <Text style={{ color: 'rgba(255,255,255,0.6)' }}>
              Manage your approval authority, set a delegate, and configure auto-escalation
            </Text>
          </div>
        </Space>
      </Card>

      {/* ── STATUS BANNER ──────────────────────────────────────────────── */}
      {availability?.isUnavailable ? (
        <Alert
          type="warning"
          showIcon
          icon={<WarningOutlined />}
          message={<Text strong>You are currently marked as UNAVAILABLE</Text>}
          description={
            <>
              All CEO-level approvals are being routed to{' '}
              <Text strong>{availability.delegateName}</Text>.
              {availability.unavailableUntil && (
                <> Expected return: <Text strong>{moment(availability.unavailableUntil).format('MMM DD, YYYY')}</Text></>
              )}
            </>
          }
          style={{ marginBottom: '24px', borderRadius: '12px' }}
        />
      ) : (
        <Alert
          type="success"
          showIcon
          icon={<CheckCircleOutlined />}
          message="You are currently AVAILABLE — all CEO approvals are routing to you"
          style={{ marginBottom: '24px', borderRadius: '12px' }}
        />
      )}

      {/* ── MAIN FORM ──────────────────────────────────────────────────── */}
      <Card title={<><SettingOutlined /> Availability Settings</>} style={{ borderRadius: '12px', marginBottom: '24px' }}>
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Row gutter={24}>
            <Col xs={24} md={12}>
              <Form.Item name="isUnavailable" label="Mark yourself as unavailable?" valuePropName="checked">
                <Switch
                  checkedChildren="Unavailable"
                  unCheckedChildren="Available"
                  style={{ '--antd-wave-shadow-color': '#ff4d4f' }}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="keepTomInformed" label="Receive read-only copies while delegated?" valuePropName="checked">
                <Switch checkedChildren="Yes" unCheckedChildren="No" defaultChecked />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item name="delegateEmail" label="Delegate (acts on your behalf)">
                <Select placeholder="Select delegate" showSearch optionFilterProp="children">
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
                <Input.TextArea rows={2} placeholder="e.g. International travel, Medical leave..." />
              </Form.Item>
            </Col>
          </Row>

          <Divider>Auto-Escalation Timeouts</Divider>
          <Paragraph type="secondary" style={{ marginBottom: '16px' }}>
            If a request sits at your approval step without action for too long, the system
            will first remind you, then automatically delegate it to your chosen delegate.
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
                    Auto-delegate to Kelvin after
                    <Tooltip title="Days after a request arrives at your step before it is automatically routed to your delegate">
                      <InfoCircleOutlined style={{ color: '#888' }} />
                    </Tooltip>
                  </Space>
                }
              >
                <InputNumber min={1} max={60} addonAfter="days" style={{ width: '160px' }} />
              </Form.Item>
            </Col>
          </Row>

          <Button type="primary" htmlType="submit" loading={saving} icon={<CheckCircleOutlined />} size="large">
            Save Settings
          </Button>
        </Form>
      </Card>

      {/* ── THRESHOLD TABLE ────────────────────────────────────────────── */}
      <Card
        title={<><DollarOutlined /> Approval Threshold Rules</>}
        extra={<Text type="secondary" style={{ fontSize: '12px' }}>To change thresholds, edit config/ceoApprovalConfig.js</Text>}
        style={{ borderRadius: '12px', marginBottom: '24px' }}
      >
        <Table
          dataSource={thresholdData}
          columns={thresholdColumns}
          pagination={false}
          size="small"
        />
      </Card>

      {/* ── DELEGATION HISTORY ─────────────────────────────────────────── */}
      {availability?.delegationHistory?.length > 0 && (
        <Card title={<><HistoryOutlined /> Delegation History</>} style={{ borderRadius: '12px' }}>
          <Timeline
            items={availability.delegationHistory.slice().reverse().map((h, i) => ({
              color: h.clearedAt ? 'green' : 'orange',
              children: (
                <div key={i}>
                  <Text strong>{h.delegateName}</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    {moment(h.from).format('MMM DD, YYYY')}
                    {h.until ? ` → ${moment(h.until).format('MMM DD, YYYY')}` : ' → ongoing'}
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
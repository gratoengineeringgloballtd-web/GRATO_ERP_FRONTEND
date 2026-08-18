import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Row, Col, Typography, Button, Space, Form, Select, DatePicker,
  Input, Checkbox, Alert, Tag, List, Avatar, Spin, message, Empty, Popconfirm
} from 'antd';
import {
  UserSwitchOutlined, UserOutlined, TeamOutlined, DeleteOutlined,
  ClockCircleOutlined, InfoCircleOutlined
} from '@ant-design/icons';
import moment from 'moment';
import delegationAPI from '../services/delegationAPI';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

const MyDelegation = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [delegation, setDelegation] = useState(null);
  const [isActive, setIsActive] = useState(false);
  const [delegators, setDelegators] = useState([]);

  const [candidates, setCandidates] = useState([]);
  const [searchingCandidates, setSearchingCandidates] = useState(false);

  const [form] = Form.useForm();

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const [delegationRes, delegatorsRes] = await Promise.all([
        delegationAPI.getMyDelegation(),
        delegationAPI.getMyDelegators()
      ]);
      setDelegation(delegationRes.data.data.delegation);
      setIsActive(delegationRes.data.data.isActive);
      setDelegators(delegatorsRes.data.data || []);
    } catch (error) {
      message.error('Failed to load delegation status');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleSearchCandidates = async (query) => {
    if (!query || query.trim().length < 2) {
      setCandidates([]);
      return;
    }
    try {
      setSearchingCandidates(true);
      const res = await delegationAPI.searchCandidates(query);
      setCandidates(res.data.data || []);
    } catch (error) {
      // silent - just leave the list as-is
    } finally {
      setSearchingCandidates(false);
    }
  };

  const handleSetDelegation = async (values) => {
    try {
      setSaving(true);
      await delegationAPI.setDelegation({
        delegateId: values.delegateId,
        reason: values.reason,
        fromDate: values.dateRange?.[0]?.toISOString(),
        untilDate: values.dateRange?.[1]?.toISOString(),
        notifyDelegate: values.notifyDelegate !== false,
        keepInformed: values.keepInformed !== false
      });
      message.success('Delegation set up successfully');
      form.resetFields();
      await fetchAll();
    } catch (error) {
      message.error(error.response?.data?.message || 'Failed to set delegation');
    } finally {
      setSaving(false);
    }
  };

  const handleClearDelegation = async () => {
    try {
      setSaving(true);
      await delegationAPI.clearDelegation();
      message.success('Delegation cleared');
      await fetchAll();
    } catch (error) {
      message.error(error.response?.data?.message || 'Failed to clear delegation');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 48, textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
      <Title level={2}>
        <UserSwitchOutlined style={{ marginRight: 8, color: '#1890ff' }} />
        Delegate My Approvals
      </Title>
      <Paragraph type="secondary">
        While you're away, hand off your pending approvals and requests to a colleague.
        They'll be able to act on anything currently waiting on you, and everything they
        approve is recorded under their own name for accountability.
      </Paragraph>

      <Row gutter={24}>
        <Col xs={24} lg={14}>
          <Card title="Your Delegation" style={{ marginBottom: 24 }}>
            {isActive && delegation ? (
              <>
                <Alert
                  type="success"
                  showIcon
                  message={`Currently delegated to ${delegation.delegateName}`}
                  description={
                    <div>
                      {delegation.reason && <div>Reason: {delegation.reason}</div>}
                      <div>
                        From {delegation.fromDate ? moment(delegation.fromDate).format('DD MMM YYYY') : '—'}
                        {' '}
                        {delegation.untilDate
                          ? `until ${moment(delegation.untilDate).format('DD MMM YYYY')}`
                          : '(no end date set)'}
                      </div>
                    </div>
                  }
                  style={{ marginBottom: 16 }}
                />
                <Popconfirm
                  title="Clear this delegation?"
                  description="You'll resume acting on your own approvals immediately."
                  onConfirm={handleClearDelegation}
                  okText="Clear Delegation"
                  okButtonProps={{ danger: true }}
                >
                  <Button danger icon={<DeleteOutlined />} loading={saving}>
                    Clear Delegation
                  </Button>
                </Popconfirm>
              </>
            ) : (
              <>
                <Alert
                  type="info"
                  showIcon
                  icon={<InfoCircleOutlined />}
                  message="No active delegation"
                  description="You are currently acting on your own approvals and requests."
                  style={{ marginBottom: 20 }}
                />
                <Form form={form} layout="vertical" onFinish={handleSetDelegation}>
                  <Form.Item
                    name="delegateId"
                    label="Delegate to"
                    rules={[{ required: true, message: 'Please select a colleague' }]}
                  >
                    <Select
                      showSearch
                      placeholder="Search by name or email..."
                      filterOption={false}
                      onSearch={handleSearchCandidates}
                      loading={searchingCandidates}
                      notFoundContent={searchingCandidates ? <Spin size="small" /> : 'Type to search'}
                    >
                      {candidates.map(c => (
                        <Option key={c._id} value={c._id}>
                          {c.fullName} — {c.email}{c.department ? ` (${c.department})` : ''}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>

                  <Form.Item name="dateRange" label="Period (optional — leave blank for an open-ended delegation)">
                    <DatePicker.RangePicker style={{ width: '100%' }} />
                  </Form.Item>

                  <Form.Item name="reason" label="Reason (optional)">
                    <Input placeholder="e.g. Annual leave" />
                  </Form.Item>

                  <Form.Item name="notifyDelegate" valuePropName="checked" initialValue={true}>
                    <Checkbox>Notify my delegate by email</Checkbox>
                  </Form.Item>
                  <Form.Item name="keepInformed" valuePropName="checked" initialValue={true}>
                    <Checkbox>Keep me informed with a copy of notifications</Checkbox>
                  </Form.Item>

                  <Form.Item style={{ marginBottom: 0 }}>
                    <Button type="primary" htmlType="submit" loading={saving} icon={<UserSwitchOutlined />}>
                      Set Up Delegation
                    </Button>
                  </Form.Item>
                </Form>
              </>
            )}
          </Card>
        </Col>

        <Col xs={24} lg={10}>
          <Card
            title={
              <Space>
                <TeamOutlined />
                Covering For
              </Space>
            }
          >
            {delegators.length === 0 ? (
              <Empty
                description="Nobody has delegated their approvals to you right now"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            ) : (
              <List
                dataSource={delegators}
                renderItem={(d) => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={<Avatar icon={<UserOutlined />} />}
                      title={d.fullName}
                      description={
                        <Space direction="vertical" size={2}>
                          <Text type="secondary" style={{ fontSize: 12 }}>{d.email}</Text>
                          {d.reason && <Tag color="blue">{d.reason}</Tag>}
                          {d.untilDate && (
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              <ClockCircleOutlined /> Until {moment(d.untilDate).format('DD MMM YYYY')}
                            </Text>
                          )}
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default MyDelegation;

import React, { useState } from 'react';
import {
  Card, Button, Table, Tag, Space, Typography,
  Alert, Descriptions, Divider, Badge, Modal, message
} from 'antd';
import {
  CheckCircleOutlined, ClockCircleOutlined,
  FilePdfOutlined, UserOutlined, BoxPlotOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { generateDischargePDF } from './ITDispatchSection';

const { Text } = Typography;

// ─────────────────────────────────────────────
// Employee Acknowledgment Card
// shown when status = 'pending_acknowledgment' or 'discharge_complete'
// ─────────────────────────────────────────────
export const EmployeeAcknowledgmentCard = ({ request, currentUser, onSuccess }) => {
  const [confirming, setConfirming] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  const isPending = request.status === 'pending_acknowledgment';
  const isComplete = request.status === 'discharge_complete';
  const dispatched = request.dischargedItems || [];
  const itStaffName = request.dischargeSignature?.name || 'IT Staff';

  const itemColumns = [
    { title: 'Item Name', dataIndex: 'name', key: 'name', render: v => <Text strong>{v || '—'}</Text> },
    { title: 'Brand', dataIndex: 'brand', key: 'brand', render: v => v || '—' },
    { title: 'Model', dataIndex: 'model', key: 'model', render: v => v || '—' },
    { title: 'Serial No.', dataIndex: 'serialNumber', key: 'serialNumber', render: v => v ? <Text code style={{ fontSize: 11 }}>{v}</Text> : '—' },
    { title: 'Qty', dataIndex: 'quantity', key: 'quantity', width: 60, align: 'center' },
    { title: 'Asset Tag', dataIndex: 'assetTag', key: 'assetTag', render: v => v || '—' },
    { title: 'Condition', dataIndex: 'condition', key: 'condition', render: v => v ? <Tag color="blue">{v}</Tag> : '—' },
  ];

  const handleAcknowledge = async () => {
    try {
      setConfirming(true);
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/it-support/${request._id}/acknowledge`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({})
        }
      );
      const data = await response.json();
      if (data.success) {
        message.success('Receipt acknowledged successfully. The discharge is now complete.');
        setModalVisible(false);
        onSuccess?.();
      } else {
        throw new Error(data.message);
      }
    } catch (err) {
      message.error(err.message || 'Failed to acknowledge receipt');
    } finally {
      setConfirming(false);
    }
  };

  if (!isPending && !isComplete) return null;

  return (
    <>
      <Card
        style={{
          marginBottom: 16,
          border: `2px solid ${isComplete ? '#52c41a' : '#1890ff'}`,
          borderRadius: 10
        }}
        title={
          <Space>
            {isComplete
              ? <CheckCircleOutlined style={{ color: '#52c41a' }} />
              : <BoxPlotOutlined style={{ color: '#1890ff' }} />
            }
            <Text strong style={{ color: isComplete ? '#52c41a' : '#1890ff', fontSize: 15 }}>
              {isComplete ? 'Items Received & Acknowledged' : 'Items Ready for Collection — Action Required'}
            </Text>
          </Space>
        }
        extra={
          isComplete && (
            <Button
              icon={<FilePdfOutlined />}
              type="primary"
              onClick={() => generateDischargePDF(request, dispatched, itStaffName)}
            >
              Download PDF
            </Button>
          )
        }
      >
        {isPending && (
          <Alert
            message="IT has dispatched items for your request"
            description="Please review the items below and confirm you have received them. Your acknowledgment is required to complete this request."
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        {isComplete && (
          <Alert
            message="You have acknowledged receipt of these items"
            description={
              <Space direction="vertical" size={2}>
                <Text>Acknowledged on: <Text strong>{request.acknowledgmentSignature?.signedAt ? dayjs(request.acknowledgmentSignature.signedAt).format('MMM DD, YYYY [at] HH:mm') : '—'}</Text></Text>
                <Text>This discharge is now complete. Download the PDF for your records.</Text>
              </Space>
            }
            type="success"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        <Descriptions size="small" column={2} style={{ marginBottom: 16 }}>
          <Descriptions.Item label="Dispatched By">
            <Space><UserOutlined />{itStaffName}</Space>
          </Descriptions.Item>
          <Descriptions.Item label="Dispatch Date">
            {request.dischargeSignature?.signedAt
              ? dayjs(request.dischargeSignature.signedAt).format('MMM DD, YYYY HH:mm')
              : '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Items Count">
            <Badge count={dispatched.length} style={{ backgroundColor: '#1890ff' }} />
          </Descriptions.Item>
          <Descriptions.Item label="Status">
            {isComplete
              ? <Tag color="success" icon={<CheckCircleOutlined />}>Acknowledged</Tag>
              : <Tag color="processing" icon={<ClockCircleOutlined />}>Awaiting Your Confirmation</Tag>
            }
          </Descriptions.Item>
        </Descriptions>

        {dispatched.length > 0 && (
          <>
            <Divider orientation="left" style={{ fontSize: 12, color: '#888' }}>
              Items Dispatched to You
            </Divider>
            <Table
              columns={itemColumns}
              dataSource={dispatched.map((d, i) => ({ ...d, key: i }))}
              size="small"
              pagination={false}
              scroll={{ x: 'max-content' }}
              style={{ marginBottom: 16 }}
            />
          </>
        )}

        {isPending && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
            <Button
              type="primary"
              icon={<CheckCircleOutlined />}
              size="large"
              onClick={() => setModalVisible(true)}
              style={{ minWidth: 220, background: '#52c41a', borderColor: '#52c41a' }}
            >
              Confirm Receipt of Items
            </Button>
          </div>
        )}
      </Card>

      {/* Confirmation Modal */}
      <Modal
        title={
          <Space>
            <CheckCircleOutlined style={{ color: '#52c41a' }} />
            <Text strong>Confirm Receipt of Items</Text>
          </Space>
        }
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={500}
      >
        <Alert
          message="Please confirm you have received all items listed above"
          description="By confirming, you acknowledge that the IT department has delivered the dispatched items to you. This action cannot be undone."
          type="warning"
          showIcon
          style={{ marginBottom: 20 }}
        />

        {dispatched.length > 0 && (
          <div style={{ background: '#fafafa', borderRadius: 8, padding: 16, marginBottom: 20 }}>
            <Text strong style={{ display: 'block', marginBottom: 8, fontSize: 13 }}>
              Items you are acknowledging:
            </Text>
            {dispatched.map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: i < dispatched.length - 1 ? '1px solid #eee' : 'none' }}>
                <Text>{item.name}</Text>
                <Space>
                  {item.brand && <Text type="secondary">{item.brand}</Text>}
                  <Tag>{item.quantity} unit{item.quantity > 1 ? 's' : ''}</Tag>
                </Space>
              </div>
            ))}
          </div>
        )}

        <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
          <Button onClick={() => setModalVisible(false)}>Cancel</Button>
          <Button
            type="primary"
            icon={<CheckCircleOutlined />}
            loading={confirming}
            onClick={handleAcknowledge}
            style={{ background: '#52c41a', borderColor: '#52c41a', minWidth: 140 }}
          >
            Yes, I Confirm Receipt
          </Button>
        </Space>
      </Modal>
    </>
  );
};
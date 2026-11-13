import React, { useState, useEffect, useCallback } from 'react';
import { Card, List, Tag, Typography, Modal, Space, Spin, Empty, message, Badge } from 'antd';
import moment from 'moment';
import communicationAPI from '../../services/communicationAPI';

const { Title, Text } = Typography;

const priorityColor = { urgent: 'red', important: 'orange', normal: 'default' };

// Strip HTML for the one-line preview
const preview = (html = '') =>
  html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 140);

const MyCommunications = () => {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [open, setOpen] = useState(null);
  const [readIds, setReadIds] = useState(() => new Set());

  const load = useCallback(async (page = 1, pageSize = 10) => {
    try {
      setLoading(true);
      const res = await communicationAPI.getEmployeeCommunications({ page, limit: pageSize });
      setItems(res.data.data || []);
      setPagination({ current: page, pageSize, total: res.data.pagination?.total || 0 });
    } catch (e) {
      message.error('Failed to load your messages');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openMessage = async (item) => {
    try {
      const res = await communicationAPI.viewCommunication(item._id);
      setOpen(res.data.data);
      if (!readIds.has(item._id)) {
        communicationAPI.markAsRead(item._id).catch(() => {});
        setReadIds((prev) => new Set(prev).add(item._id));
      }
    } catch (e) {
      message.error('Could not open this message');
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
      <Title level={3}>My Messages</Title>
      <Text type="secondary">Official communications sent to you.</Text>
      <Card style={{ marginTop: 16 }}>
        <Spin spinning={loading}>
          {items.length === 0 && !loading ? (
            <Empty description="No messages yet" />
          ) : (
            <List
              itemLayout="vertical"
              dataSource={items}
              pagination={{
                ...pagination,
                hideOnSinglePage: true,
                onChange: (page, size) => load(page, size)
              }}
              renderItem={(item) => (
                <List.Item key={item._id} onClick={() => openMessage(item)} style={{ cursor: 'pointer' }}>
                  <Space wrap>
                    <Badge status={readIds.has(item._id) ? 'default' : 'processing'} />
                    <Text strong>{item.title}</Text>
                    {item.priority !== 'normal' && <Tag color={priorityColor[item.priority]}>{item.priority}</Tag>}
                    <Tag>{item.messageType}</Tag>
                  </Space>
                  <div><Text type="secondary" style={{ fontSize: 12 }}>
                    {item.sender?.fullName} · {item.sentAt ? moment(item.sentAt).format('DD MMM YYYY, h:mm A') : ''}
                  </Text></div>
                  <div style={{ marginTop: 4 }}>{preview(item.content)}</div>
                </List.Item>
              )}
            />
          )}
        </Spin>
      </Card>

      <Modal
        open={!!open}
        title={open?.title}
        footer={null}
        width={720}
        onCancel={() => setOpen(null)}
      >
        {open && (
          <>
            <Text type="secondary" style={{ fontSize: 12 }}>
              From {open.sender?.fullName} · {open.sentAt ? moment(open.sentAt).format('DD MMM YYYY, h:mm A') : ''}
            </Text>
            <div style={{ marginTop: 16 }} dangerouslySetInnerHTML={{ __html: open.content }} />
          </>
        )}
      </Modal>
    </div>
  );
};

export default MyCommunications;

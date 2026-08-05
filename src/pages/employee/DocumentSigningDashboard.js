import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Card, Table, Tag, Button, Space, Typography, Tabs, Empty, message,
  Tooltip, Modal, Input, Avatar, Badge, Steps
} from 'antd';
import {
  FilePdfOutlined, PlusOutlined, EyeOutlined, DownloadOutlined,
  RedoOutlined, StopOutlined, CrownOutlined, UserOutlined,
  CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined,
  SwapOutlined, ForwardOutlined, EditOutlined
} from '@ant-design/icons';
import documentSigningAPI from '../../services/documentSigningAPI';

const { Title, Text } = Typography;

const STATUS_META = {
  draft:               { color: 'default', icon: <ClockCircleOutlined />, label: 'Draft' },
  pending_signatures:  { color: 'processing', icon: <ClockCircleOutlined />, label: 'Awaiting signatures' },
  completed:           { color: 'success', icon: <CheckCircleOutlined />, label: 'Completed' },
  rejected:            { color: 'error', icon: <CloseCircleOutlined />, label: 'Rejected' },
  cancelled:           { color: 'default', icon: <StopOutlined />, label: 'Cancelled' }
};

const OVERRIDE_ROLES = ['admin', 'it', 'ceo'];

const DocumentSigningDashboard = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const isOverrideRole = OVERRIDE_ROLES.includes(user?.role);

  const [activeTab, setActiveTab] = useState('initiated');
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rejectReasonModal, setRejectReasonModal] = useState(null);
  const [reassignModal, setReassignModal] = useState(null);

  useEffect(() => { fetchDocuments(); }, [activeTab]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const res = await documentSigningAPI.getMyDocuments({ role: activeTab });
      setDocuments(res.data.data || []);
    } catch (err) {
      message.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = (doc) => {
    Modal.confirm({
      title: 'Cancel this document?',
      content: 'Signers who have already been notified will no longer be able to sign it.',
      okText: 'Cancel document', okType: 'danger',
      onOk: async () => {
        try {
          await documentSigningAPI.cancelDocument(doc._id);
          message.success('Document cancelled');
          fetchDocuments();
        } catch (err) { message.error(err.response?.data?.message || 'Failed to cancel'); }
      }
    });
  };

  const handleResubmit = async (doc) => {
    try {
      const res = await documentSigningAPI.resubmitDocument(doc._id);
      message.success('New draft created from the rejected document');
      navigate(`/employee/documents/sign/${res.data.data._id}/fields`);
    } catch (err) { message.error(err.response?.data?.message || 'Failed to resubmit'); }
  };

  const handleForceAdvance = (doc) => {
    Modal.confirm({
      title: 'Force-advance the current signer?',
      content: 'This marks the current pending signer as signed and moves the chain forward without their action. Use this only when a signer is unavailable.',
      okText: 'Force advance', okType: 'danger',
      onOk: async () => {
        try {
          await documentSigningAPI.forceAdvance(doc._id, 'Manually advanced by administrator');
          message.success('Signer force-advanced');
          fetchDocuments();
        } catch (err) { message.error(err.response?.data?.message || 'Failed to force-advance'); }
      }
    });
  };

  const handleDownload = async (doc) => {
    try {
      await documentSigningAPI.openFinalDownload(doc._id, `SIGNED_${doc.title}.pdf`);
    } catch { message.error('Download failed'); }
  };

  const handleSignNow = async (doc) => {
    try {
      const res = await documentSigningAPI.getMySigningLink(doc._id);
      const { isYourTurn, currentLevel, yourLevel, signingUrl } = res.data.data;
      if (!isYourTurn) {
        return message.info(`Not your turn yet — currently waiting on signer ${currentLevel} of the chain (you're signer ${yourLevel}).`);
      }
      // Open the same no-login public signing page this document's email
      // would have linked to. Opens in a new tab since it's designed as a
      // standalone, unauthenticated flow.
      window.open(signingUrl, '_blank');
    } catch (err) {
      message.error(err.response?.data?.message || 'Could not open the signing page');
    }
  };

  const columns = [
    {
      title: 'Document', dataIndex: 'title', key: 'title',
      render: (title, doc) => (
        <Space>
          <FilePdfOutlined style={{ color: '#f5222d', fontSize: 18 }} />
          <div>
            <Text strong>{title}</Text>
            <div><Text type="secondary" style={{ fontSize: 12 }}>by {doc.initiator?.fullName}</Text></div>
          </div>
        </Space>
      )
    },
    {
      title: 'Status', dataIndex: 'status', key: 'status', width: 180,
      render: (status, doc) => {
        const meta = STATUS_META[status] || STATUS_META.draft;
        return (
          <Space direction="vertical" size={2}>
            <Tag color={meta.color} icon={meta.icon}>{meta.label}</Tag>
            {status === 'pending_signatures' && (
              <Text type="secondary" style={{ fontSize: 11 }}>
                Level {doc.currentLevel} of {doc.signers?.length || 0}
              </Text>
            )}
          </Space>
        );
      }
    },
    {
      title: 'Progress', key: 'progress', width: 200,
      render: (_, doc) => {
        if (!doc.signers?.length) return '—';
        return (
          <Steps
            size="small"
            current={doc.status === 'completed' ? doc.signers.length : doc.currentLevel - 1}
            status={doc.status === 'rejected' ? 'error' : doc.status === 'completed' ? 'finish' : 'process'}
            items={doc.signers.map(s => ({ title: '', icon: <Tooltip title={`${s.name} — ${s.status}`}><Avatar size={20} icon={<UserOutlined />} style={{ backgroundColor: s.status === 'signed' ? '#52c41a' : s.status === 'rejected' ? '#f5222d' : '#d9d9d9' }} /></Tooltip> }))}
          />
        );
      }
    },
    {
      title: 'Date', dataIndex: 'createdAt', key: 'createdAt', width: 110,
      render: (d) => d ? new Date(d).toLocaleDateString() : '—'
    },
    {
      title: 'Actions', key: 'actions', width: 240,
      render: (_, doc) => {
        const isInitiator = doc.initiator?._id === user?._id || doc.initiator === user?._id;
        const isPendingSigner = activeTab === 'to_sign' && doc.status === 'pending_signatures';
        return (
          <Space size="small">
            <Tooltip title="View details">
              <Button size="small" icon={<EyeOutlined />} onClick={() => navigate(`/employee/documents/sign/${doc._id}`)} />
            </Tooltip>
            {isPendingSigner && (
              <Tooltip title="Opens your secure signing page in a new tab">
                <Button size="small" type="primary" icon={<EditOutlined />} onClick={() => handleSignNow(doc)}>
                  Sign now
                </Button>
              </Tooltip>
            )}
            {doc.status === 'draft' && isInitiator && (
              <Tooltip title="Continue setup">
                <Button size="small" type="primary" onClick={() => navigate(`/employee/documents/sign/${doc._id}/fields`)}>Continue</Button>
              </Tooltip>
            )}
            {doc.status === 'completed' && (
              <Tooltip title="Download signed PDF">
                <Button size="small" icon={<DownloadOutlined />} onClick={() => handleDownload(doc)} />
              </Tooltip>
            )}
            {doc.status === 'rejected' && isInitiator && (
              <Tooltip title="Fix and resubmit">
                <Button size="small" icon={<RedoOutlined />} onClick={() => handleResubmit(doc)}>Resubmit</Button>
              </Tooltip>
            )}
            {['draft', 'pending_signatures'].includes(doc.status) && (isInitiator || isOverrideRole) && (
              <Tooltip title="Cancel document">
                <Button size="small" danger icon={<StopOutlined />} onClick={() => handleCancel(doc)} />
              </Tooltip>
            )}
            {doc.status === 'pending_signatures' && isOverrideRole && (
              <>
                <Tooltip title="Force-advance current signer (admin override)">
                  <Button size="small" icon={<ForwardOutlined />} onClick={() => handleForceAdvance(doc)} style={{ color: '#fa8c16' }} />
                </Tooltip>
              </>
            )}
          </Space>
        );
      }
    }
  ];

  return (
    <div style={{ padding: 24 }}>
      <Card style={{ marginBottom: 16 }}>
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <div>
            <Title level={3} style={{ margin: 0 }}><FilePdfOutlined style={{ marginRight: 8 }} />E-Signature Documents</Title>
            <Text type="secondary">Send PDFs for signature and track where each one stands in its approval chain.</Text>
          </div>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/employee/documents/sign/new')}>
            New document
          </Button>
        </Space>
      </Card>

      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            { key: 'initiated', label: 'Sent by me' },
            { key: 'to_sign', label: 'Awaiting my signature' },
            ...(isOverrideRole ? [{ key: 'all', label: <Space><CrownOutlined />All documents</Space> }] : [])
          ]}
        />
        <Table
          columns={columns}
          dataSource={documents.map(d => ({ ...d, key: d._id }))}
          loading={loading}
          locale={{ emptyText: <Empty description="No documents here yet" /> }}
          pagination={{ pageSize: 10 }}
        />
      </Card>
    </div>
  );
};

export default DocumentSigningDashboard;
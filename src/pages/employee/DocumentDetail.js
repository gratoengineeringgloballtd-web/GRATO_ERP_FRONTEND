import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Card, Steps, Tag, Typography, Space, Button, Descriptions, Timeline,
  Empty, Spin, message, Modal, Avatar, Tooltip, Divider, Alert, Badge
} from 'antd';
import {
  FilePdfOutlined, CheckCircleOutlined, CloseCircleOutlined,
  ClockCircleOutlined, StopOutlined, UserOutlined, DownloadOutlined,
  RedoOutlined, ForwardOutlined, SwapOutlined, CrownOutlined,
  ArrowLeftOutlined, HistoryOutlined, FileTextOutlined, EditOutlined
} from '@ant-design/icons';
import documentSigningAPI from '../../services/documentSigningAPI';

const { Title, Text, Paragraph } = Typography;

const OVERRIDE_ROLES = ['admin', 'it', 'ceo'];

const STATUS_META = {
  draft:               { color: 'default',    icon: <ClockCircleOutlined />,  label: 'Draft' },
  pending_signatures:  { color: 'processing', icon: <ClockCircleOutlined />,  label: 'Awaiting signatures' },
  completed:           { color: 'success',    icon: <CheckCircleOutlined />,  label: 'Completed' },
  rejected:            { color: 'error',       icon: <CloseCircleOutlined />,  label: 'Rejected' },
  cancelled:           { color: 'default',    icon: <StopOutlined />,         label: 'Cancelled' }
};

const SIGNER_STATUS_META = {
  pending:  { color: 'default',  icon: <ClockCircleOutlined /> },
  signed:   { color: 'success',  icon: <CheckCircleOutlined /> },
  rejected: { color: 'error',    icon: <CloseCircleOutlined /> },
  skipped:  { color: 'default',  icon: <StopOutlined /> }
};

const AUDIT_ACTION_LABELS = {
  created: 'Document created',
  field_added: 'Signature fields updated',
  chain_built: 'Signing chain configured',
  submitted: 'Submitted for signing',
  signer_notified: 'Signer notified',
  reminder_sent: 'Reminder sent',
  signed: 'Signed',
  rejected: 'Rejected',
  completed: 'Fully completed',
  cancelled: 'Cancelled',
  forced_sign: 'Force-advanced by administrator',
  reassigned: 'Signer reassigned',
  viewed: 'Viewed',
  downloaded: 'Downloaded',
  resubmitted_from: 'Resubmitted as a new document',
  resubmitted_as: 'Superseded by resubmission'
};

const DocumentDetail = () => {
  const { documentId } = useParams();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const isOverrideRole = OVERRIDE_ROLES.includes(user?.role);

  const [loading, setLoading] = useState(true);
  const [doc, setDoc] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => { fetchDetails(); }, [documentId]);

  const fetchDetails = async () => {
    try {
      setLoading(true);
      const res = await documentSigningAPI.getDocumentDetails(documentId);
      setDoc(res.data.data);
    } catch (err) {
      message.error(err.response?.data?.message || 'Failed to load document');
    } finally {
      setLoading(false);
    }
  };

  const isInitiator = doc && (doc.initiator?._id === user?._id || doc.initiator === user?._id);
  const mySignerEntry = doc?.signers?.find(s => (s.user?._id || s.user) === user?._id);
  const isMyTurnToSign = doc?.status === 'pending_signatures' && mySignerEntry && doc.currentLevel === mySignerEntry.level;

  const handleSignNow = async () => {
    try {
      const res = await documentSigningAPI.getMySigningLink(doc._id);
      window.open(res.data.data.signingUrl, '_blank');
    } catch (err) {
      message.error(err.response?.data?.message || 'Could not open the signing page');
    }
  };

  const handleDownload = async () => {
    try {
      await documentSigningAPI.openFinalDownload(doc._id, `SIGNED_${doc.title}.pdf`);
    } catch { message.error('Download failed'); }
  };

  const handleResubmit = async () => {
    try {
      setActionLoading(true);
      const res = await documentSigningAPI.resubmitDocument(doc._id);
      message.success('New draft created from the rejected document');
      navigate(`/employee/documents/sign/${res.data.data._id}/fields`);
    } catch (err) {
      message.error(err.response?.data?.message || 'Failed to resubmit');
    } finally { setActionLoading(false); }
  };

  const handleCancel = () => {
    Modal.confirm({
      title: 'Cancel this document?',
      content: 'Signers who have already been notified will no longer be able to sign it.',
      okText: 'Cancel document', okType: 'danger',
      onOk: async () => {
        try {
          setActionLoading(true);
          await documentSigningAPI.cancelDocument(doc._id);
          message.success('Document cancelled');
          fetchDetails();
        } catch (err) { message.error(err.response?.data?.message || 'Failed to cancel'); }
        finally { setActionLoading(false); }
      }
    });
  };

  const handleForceAdvance = () => {
    Modal.confirm({
      title: 'Force-advance the current signer?',
      content: 'This marks the current pending signer as signed and moves the chain forward without their action. Use this only when a signer is unavailable.',
      okText: 'Force advance', okType: 'danger',
      onOk: async () => {
        try {
          setActionLoading(true);
          await documentSigningAPI.forceAdvance(doc._id, 'Manually advanced by administrator');
          message.success('Signer force-advanced');
          fetchDetails();
        } catch (err) { message.error(err.response?.data?.message || 'Failed to force-advance'); }
        finally { setActionLoading(false); }
      }
    });
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>;
  }
  if (!doc) {
    return (
      <div style={{ padding: 24 }}>
        <Empty description="Document not found, or you don't have access to it" style={{ marginTop: 60 }} />
      </div>
    );
  }

  const statusMeta = STATUS_META[doc.status] || STATUS_META.draft;
  const currentSignerIndex = doc.status === 'pending_signatures' ? doc.currentLevel - 1 : -1;
  const stepsStatus = doc.status === 'rejected' ? 'error' : doc.status === 'completed' ? 'finish' : 'process';

  return (
    <div style={{ padding: 24, maxWidth: 1000, margin: '0 auto' }}>
      <Button icon={<ArrowLeftOutlined />} style={{ marginBottom: 16 }} onClick={() => navigate('/employee/documents/sign')}>
        Back to documents
      </Button>

      <Card style={{ marginBottom: 16 }}>
        <Space style={{ width: '100%', justifyContent: 'space-between', flexWrap: 'wrap' }} align="start">
          <Space direction="vertical" size={4}>
            <Title level={3} style={{ margin: 0 }}>
              <FilePdfOutlined style={{ color: '#f5222d', marginRight: 8 }} />{doc.title}
            </Title>
            <Tag color={statusMeta.color} icon={statusMeta.icon} style={{ fontSize: 13 }}>{statusMeta.label}</Tag>
            {doc.description && <Paragraph type="secondary" style={{ margin: 0, maxWidth: 500 }}>{doc.description}</Paragraph>}
          </Space>

          <Space wrap>
            {isMyTurnToSign && (
              <Tooltip title="Opens your secure signing page in a new tab">
                <Button type="primary" icon={<EditOutlined />} onClick={handleSignNow}>
                  Sign now
                </Button>
              </Tooltip>
            )}
            {doc.status === 'draft' && isInitiator && (
              <Button type="primary" onClick={() => navigate(`/employee/documents/sign/${doc._id}/fields`)}>
                Continue setup
              </Button>
            )}
            {doc.status === 'completed' && (
              <Button type="primary" icon={<DownloadOutlined />} onClick={handleDownload}>
                Download signed PDF
              </Button>
            )}
            {doc.status === 'rejected' && isInitiator && (
              <Button icon={<RedoOutlined />} loading={actionLoading} onClick={handleResubmit}>
                Fix &amp; resubmit
              </Button>
            )}
            {['draft', 'pending_signatures'].includes(doc.status) && (isInitiator || isOverrideRole) && (
              <Button danger icon={<StopOutlined />} loading={actionLoading} onClick={handleCancel}>
                Cancel
              </Button>
            )}
            {doc.status === 'pending_signatures' && isOverrideRole && (
              <Tooltip title="Admin override: mark the current signer as signed and move on">
                <Button icon={<ForwardOutlined />} loading={actionLoading} onClick={handleForceAdvance} style={{ color: '#fa8c16', borderColor: '#fa8c16' }}>
                  Force-advance
                </Button>
              </Tooltip>
            )}
          </Space>
        </Space>
      </Card>

      {doc.status === 'rejected' && (
        <Alert
          style={{ marginBottom: 16 }}
          type="error"
          showIcon
          message={`Rejected${doc.signers?.find(s => s.status === 'rejected') ? ` by ${doc.signers.find(s => s.status === 'rejected').name}` : ''}`}
          description={doc.rejectionReason || 'No reason was provided.'}
        />
      )}

      {doc.status === 'cancelled' && (
        <Alert style={{ marginBottom: 16 }} type="warning" showIcon message="This document was cancelled and is no longer active." />
      )}

      <Card title="Signing chain" style={{ marginBottom: 16 }}>
        {doc.signers?.length > 0 ? (
          <>
            <Steps
              current={doc.status === 'completed' ? doc.signers.length : currentSignerIndex}
              status={stepsStatus}
              direction="horizontal"
              items={doc.signers.map((s) => ({
                title: s.name,
                description: (
                  <Space direction="vertical" size={0}>
                    <Tag color={SIGNER_STATUS_META[s.status]?.color} icon={SIGNER_STATUS_META[s.status]?.icon} style={{ marginTop: 4 }}>
                      {s.status === 'pending' && doc.status === 'pending_signatures' && doc.currentLevel === s.level
                        ? 'Currently signing' : s.status}
                    </Tag>
                    {s.isExtra && <Tag color="purple" style={{ fontSize: 10 }}>added by initiator</Tag>}
                  </Space>
                )
              }))}
            />
            <Divider />
            <Descriptions column={2} size="small" bordered>
              {doc.signers.map((s, i) => (
                <Descriptions.Item
                  key={s._id || i}
                  label={<Space><Avatar size={20} icon={<UserOutlined />} style={{ backgroundColor: SIGNER_STATUS_META[s.status]?.color === 'success' ? '#52c41a' : SIGNER_STATUS_META[s.status]?.color === 'error' ? '#f5222d' : '#d9d9d9' }} />Level {s.level}</Space>}
                >
                  <Space direction="vertical" size={0}>
                    <Text strong>{s.name}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>{s.email}{s.role ? ` · ${s.role}` : ''}</Text>
                    {s.status === 'signed' && s.signedAt && (
                      <Text type="secondary" style={{ fontSize: 11 }}>Signed {new Date(s.signedAt).toLocaleString()}</Text>
                    )}
                    {s.status === 'rejected' && s.rejectedAt && (
                      <Text type="danger" style={{ fontSize: 11 }}>Rejected {new Date(s.rejectedAt).toLocaleString()}</Text>
                    )}
                    {s.forcedBy && (
                      <Tag color="orange" style={{ fontSize: 10, width: 'fit-content' }}>force-advanced by admin</Tag>
                    )}
                  </Space>
                </Descriptions.Item>
              ))}
            </Descriptions>
          </>
        ) : (
          <Empty description="No signing chain configured yet" />
        )}
      </Card>

      <Card title={<Space><FileTextOutlined />Document info</Space>} style={{ marginBottom: 16 }}>
        <Descriptions column={2} size="small">
          <Descriptions.Item label="Initiated by">{doc.initiator?.fullName}</Descriptions.Item>
          <Descriptions.Item label="Department">{doc.initiator?.department || '—'}</Descriptions.Item>
          <Descriptions.Item label="Chain mode">
            <Tag>{doc.chainMode === 'custom' ? 'Fully custom order' : 'Default hierarchy'}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Fields placed">{doc.fields?.length || 0}</Descriptions.Item>
          <Descriptions.Item label="Submitted">{doc.submittedAt ? new Date(doc.submittedAt).toLocaleString() : '—'}</Descriptions.Item>
          <Descriptions.Item label="Completed">{doc.completedAt ? new Date(doc.completedAt).toLocaleString() : '—'}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title={<Space><HistoryOutlined />Audit trail</Space>}>
        {doc.auditTrail?.length > 0 ? (
          <Timeline
            items={[...doc.auditTrail].reverse().map((entry, i) => ({
              key: i,
              color: entry.action === 'rejected' ? 'red' : entry.action === 'completed' ? 'green' : 'blue',
              children: (
                <Space direction="vertical" size={0}>
                  <Text strong>{AUDIT_ACTION_LABELS[entry.action] || entry.action}</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {entry.byUser?.fullName || entry.byEmail || 'System'} · {new Date(entry.timestamp).toLocaleString()}
                  </Text>
                  {entry.meta && Object.keys(entry.meta).length > 0 && (
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      {Object.entries(entry.meta).filter(([k]) => k !== 'flattenError').map(([k, v]) => `${k}: ${v}`).join(' · ')}
                    </Text>
                  )}
                </Space>
              )
            }))}
          />
        ) : (
          <Empty description="No activity recorded yet" />
        )}
      </Card>
    </div>
  );
};

export default DocumentDetail;
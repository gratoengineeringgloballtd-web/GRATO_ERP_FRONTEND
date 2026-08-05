import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import {
  Card,
  Table,
  Button,
  Space,
  Typography,
  Tag,
  Alert,
  Row,
  Col,
  Statistic,
  Modal,
  Descriptions,
  Timeline,
  Input,
  Select,
  Tabs,
  Badge,
  Drawer,
  message,
  List,
  Tooltip,
  Spin
} from 'antd';
import {
  ShoppingCartOutlined,
  EyeOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
  FileTextOutlined,
  SendOutlined,
  UserOutlined,
  DollarOutlined,
  CalendarOutlined,
  ExportOutlined,
  DownloadOutlined,
  FilePdfOutlined,
  FileImageOutlined,
  FileWordOutlined,
  FileExcelOutlined,
  FileUnknownOutlined,
  PaperClipOutlined,
  StopOutlined,
  CrownOutlined,
  BankOutlined,
  AuditOutlined,
  SafetyCertificateOutlined
} from '@ant-design/icons';
import { purchaseRequisitionAPI } from '../../services/purchaseRequisitionAPI';
import AttachmentDisplay from '../../components/AttachmentDisplay';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;
const { TabPane } = Tabs;

// ── Status config — covers every value in the PurchaseRequisition model ──────
const STATUS_MAP = {
  draft:                              { color: 'default',  text: 'Draft',                       icon: <FileTextOutlined /> },
  pending_supervisor:                 { color: 'orange',   text: 'Pending Your Approval',        icon: <ClockCircleOutlined /> },
  pending_finance_verification:       { color: 'gold',     text: 'Finance Verification',         icon: <BankOutlined /> },
  pending_supply_chain_review:        { color: 'blue',     text: 'Supply Chain Review',          icon: <ShoppingCartOutlined /> },
  pending_buyer_assignment:           { color: 'geekblue', text: 'Buyer Assignment',             icon: <UserOutlined /> },
  pending_head_approval:              { color: 'purple',   text: 'Head Approval',                icon: <CrownOutlined /> },
  pending_ceo:                        { color: 'magenta',  text: 'CEO Approval',                 icon: <CrownOutlined /> },
  pending_ceo_approval:               { color: 'magenta',  text: 'CEO Approval',                 icon: <CrownOutlined /> },
  approved:                           { color: 'green',    text: 'Approved',                     icon: <CheckCircleOutlined /> },
  partially_disbursed:                { color: 'cyan',     text: 'Partially Disbursed',          icon: <DollarOutlined /> },
  fully_disbursed:                    { color: 'green',    text: 'Fully Disbursed',              icon: <DollarOutlined /> },
  rejected:                           { color: 'red',      text: 'Rejected',                     icon: <CloseCircleOutlined /> },
  supply_chain_approved:              { color: 'purple',   text: 'Supply Chain Approved',        icon: <CheckCircleOutlined /> },
  supply_chain_rejected:              { color: 'red',      text: 'Supply Chain Rejected',        icon: <CloseCircleOutlined /> },
  in_procurement:                     { color: 'cyan',     text: 'In Procurement',               icon: <ShoppingCartOutlined /> },
  procurement_complete:               { color: 'teal',     text: 'Procurement Complete',         icon: <CheckCircleOutlined /> },
  delivered:                          { color: 'green',    text: 'Delivered',                    icon: <CheckCircleOutlined /> },
  justification_pending_supervisor:   { color: 'orange',   text: 'Justification — Supervisor',   icon: <ClockCircleOutlined /> },
  justification_pending_finance:      { color: 'gold',     text: 'Justification — Finance',      icon: <BankOutlined /> },
  justification_pending_supply_chain: { color: 'blue',     text: 'Justification — SC',           icon: <ShoppingCartOutlined /> },
  justification_pending_head:         { color: 'purple',   text: 'Justification — Head',         icon: <CrownOutlined /> },
  justification_pending_ceo:          { color: 'magenta',  text: 'Justification — CEO',          icon: <CrownOutlined /> },
  justification_rejected:             { color: 'red',      text: 'Justification Rejected',       icon: <CloseCircleOutlined /> },
  justification_rejected_supervisor:  { color: 'red',      text: 'Just. Rejected — Supervisor',  icon: <CloseCircleOutlined /> },
  justification_rejected_finance:     { color: 'red',      text: 'Just. Rejected — Finance',     icon: <CloseCircleOutlined /> },
  justification_rejected_supply_chain:{ color: 'red',      text: 'Just. Rejected — SC',          icon: <CloseCircleOutlined /> },
  justification_rejected_head:        { color: 'red',      text: 'Just. Rejected — Head',        icon: <CloseCircleOutlined /> },
  justification_rejected_ceo:         { color: 'red',      text: 'Just. Rejected — CEO',         icon: <CloseCircleOutlined /> },
  justification_approved:             { color: 'green',    text: 'Justification Approved',       icon: <CheckCircleOutlined /> },
  completed:                          { color: 'green',    text: 'Completed',                    icon: <SafetyCertificateOutlined /> },
  pending_clarification:              { color: 'lime',     text: 'Pending Clarification',        icon: <ClockCircleOutlined /> },
  pending_cancellation:               { color: 'volcano',  text: 'Cancellation Pending',         icon: <StopOutlined /> },
  cancelled:                          { color: 'error',    text: 'Cancelled',                    icon: <CloseCircleOutlined /> },
};

// Statuses that count as "approved / progressed past supervisor"
const APPROVED_STATUSES = [
  'pending_finance_verification',
  'pending_supply_chain_review',
  'pending_buyer_assignment',
  'pending_head_approval',
  'pending_ceo',
  'pending_ceo_approval',
  'supply_chain_approved',
  'approved',
  'partially_disbursed',
  'fully_disbursed',
  'in_procurement',
  'procurement_complete',
  'delivered',
  'justification_pending_supervisor',
  'justification_pending_finance',
  'justification_pending_supply_chain',
  'justification_pending_head',
  'justification_pending_ceo',
  'justification_approved',
  'completed',
];

// Statuses that mean the requisition is pending THIS user's action
const CEO_PENDING_STATUSES = ['pending_ceo', 'pending_ceo_approval'];

const SupervisorPurchaseRequisitions = () => {
  const { user } = useSelector((state) => state.auth);
  const [requisitions, setRequisitions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRequisition, setSelectedRequisition] = useState(null);
  const [detailDrawerVisible, setDetailDrawerVisible] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('pending');
  const [decision, setDecision] = useState('');
  const [comments, setComments] = useState('');
  const [downloadingAttachment, setDownloadingAttachment] = useState(null);
  const [cancellationRequests, setCancellationRequests] = useState([]);
  const [cancellationLoading, setCancellationLoading] = useState(false);
  const [cancellationComments, setCancellationComments] = useState('');
  const [cancellationActionLoading, setCancellationActionLoading] = useState(false);
  const [justifications, setJustifications] = useState([]);
  const [justificationDrawerVisible, setJustificationDrawerVisible] = useState(false);
  const [selectedJustification, setSelectedJustification] = useState(null);
  const [justDecision, setJustDecision] = useState('');
  const [justComments, setJustComments] = useState('');
  const [justActionLoading, setJustActionLoading] = useState(false);

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  // Detect if current user is CEO
  const isCEO = user?.role === 'ceo' || user?.email === 'tom@gratoengineering.com';

  useEffect(() => {
    fetchRequisitions();
    fetchCancellationRequests();
    fetchJustifications();
  }, []);

  const fetchRequisitions = async () => {
    setLoading(true);
    try {
      const response = await purchaseRequisitionAPI.getSupervisorRequisitions();
      if (response.success) {
        setRequisitions(response.data);
      } else {
        message.error('Failed to fetch requisitions');
        setRequisitions([]);
      }
    } catch (error) {
      console.error('Error fetching requisitions:', error);
      message.error('Failed to fetch requisitions: ' + (error.response?.data?.message || error.message));
      setRequisitions([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchJustifications = async () => {
    try {
      // Reuse the same supervisor endpoint — justification-status requisitions
      // come through because the backend includes them in the query
      const response = await purchaseRequisitionAPI.getSupervisorRequisitions();
      if (response.success) {
        const JUST_STATUSES = [
          'justification_pending_supervisor',
          'justification_pending_finance',
          'justification_pending_supply_chain',
          'justification_pending_head',
          'justification_pending_ceo',
          'justification_rejected_supervisor',
          'justification_rejected_finance',
          'justification_rejected_supply_chain',
          'justification_rejected_head',
          'justification_rejected_ceo',
        ];
        setJustifications((response.data || []).filter(r => JUST_STATUSES.includes(r.status)));
      }
    } catch (error) {
      console.error('Error fetching justifications:', error);
    }
  };

  const fetchCancellationRequests = async () => {
    setCancellationLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/purchase-requisitions/cancellation-requests`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setCancellationRequests(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching cancellation requests:', error);
    } finally {
      setCancellationLoading(false);
    }
  };

  // ── Helpers ────────────────────────────────────────────────────────────────
  const getStatusTag = (status) => {
    const info = STATUS_MAP[status] || { color: 'default', text: status || 'Unknown', icon: null };
    return (
      <Tag color={info.color} icon={info.icon}>
        {info.text}
      </Tag>
    );
  };

  const getUrgencyTag = (urgency) => {
    const map = { Low: 'green', Medium: 'orange', High: 'red' };
    return <Tag color={map[urgency] || 'default'}>{urgency}</Tag>;
  };

  const getFileIcon = (mimetype) => {
    if (!mimetype) return <FileUnknownOutlined />;
    if (mimetype.includes('pdf'))   return <FilePdfOutlined   style={{ color: '#ff4d4f' }} />;
    if (mimetype.includes('image')) return <FileImageOutlined style={{ color: '#52c41a' }} />;
    if (mimetype.includes('word') || mimetype.includes('document'))
                                    return <FileWordOutlined  style={{ color: '#1890ff' }} />;
    if (mimetype.includes('excel') || mimetype.includes('spreadsheet'))
                                    return <FileExcelOutlined style={{ color: '#52c41a' }} />;
    return <FileUnknownOutlined />;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024)              return bytes + ' B';
    if (bytes < 1024 * 1024)      return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const canPreviewFile = (mimetype) =>
    !!mimetype && (mimetype.includes('pdf') || mimetype.includes('image'));

  const resetForm = () => {
    setDecision('');
    setComments('');
    setCancellationComments('');
  };

  // ── Check if a requisition is pending the current user's action ────────────
  const isPendingMyAction = (requisition) => {
    if (!requisition || !user) return false;

    // CEO: pending_ceo / pending_ceo_approval statuses are their queue
    if (isCEO && CEO_PENDING_STATUSES.includes(requisition.status)) {
      return true;
    }

    // Regular supervisor: must have a matching pending step in the approval chain
    if (requisition.status === 'pending_supervisor') {
      return requisition.approvalChain?.some(
        s => s.approver?.email?.toLowerCase() === user?.email?.toLowerCase() && s.status === 'pending'
      );
    }

    return false;
  };

  // ── Data filtering ─────────────────────────────────────────────────────────
  const getFilteredRequisitions = () => {
    switch (activeTab) {
      case 'pending':
        return requisitions.filter(r =>
          r.status === 'pending_supervisor' ||
          CEO_PENDING_STATUSES.includes(r.status)
        );
      case 'approved':
        return requisitions.filter(r => APPROVED_STATUSES.includes(r.status));
      case 'rejected':
        return requisitions.filter(r =>
          r.status === 'rejected' ||
          r.status === 'supply_chain_rejected' ||
          (r.status || '').startsWith('justification_rejected')
        );
      default:
        return requisitions;
    }
  };

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = {
    pending: requisitions.filter(r =>
      r.status === 'pending_supervisor' || CEO_PENDING_STATUSES.includes(r.status)
    ).length,
    approved:      requisitions.filter(r => APPROVED_STATUSES.includes(r.status)).length,
    rejected:      requisitions.filter(r =>
                     r.status === 'rejected' ||
                     r.status === 'supply_chain_rejected' ||
                     (r.status || '').startsWith('justification_rejected')
                   ).length,
    total:         requisitions.length,
    cancellations: cancellationRequests.length,
  };

  // ── Actions ────────────────────────────────────────────────────────────────

  /**
   * Submit the approval/rejection decision.
   * CEO requisitions (pending_ceo / pending_ceo_approval) are routed to the
   * head-approval endpoint; all others use the standard supervisor endpoint.
   */
  const handleRequisitionAction = async (requisitionId, action) => {
    setActionLoading(true);
    try {
      let response;

      const isCEOStep = selectedRequisition &&
        CEO_PENDING_STATUSES.includes(selectedRequisition.status);

      if (isCEOStep) {
        // CEO decision → head-approval endpoint
        const token = localStorage.getItem('token');
        const res = await fetch(
          `${API_BASE_URL}/head-approval/requisitions/${requisitionId}/approve`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ decision: action, comments })
          }
        );
        response = await res.json();
      } else {
        // Regular supervisor decision
        response = await purchaseRequisitionAPI.processSupervisorDecision(
          requisitionId, action, comments
        );
      }

      if (response.success) {
        message.success(
          `Purchase requisition ${action === 'approved' ? 'approved' : 'rejected'} successfully!`
        );
        setDetailDrawerVisible(false);
        resetForm();
        await fetchRequisitions();
      } else {
        message.error(response.message || `Failed to ${action} requisition`);
      }
    } catch (error) {
      console.error(`Error ${action}ing requisition:`, error);
      message.error(`Failed to ${action} requisition: ` + (error.response?.data?.message || error.message));
    } finally {
      setActionLoading(false);
    }
  };

  const handleJustificationDecision = async () => {
    if (!justDecision) { message.error('Please select a decision'); return; }
    if (!justComments || justComments.trim().length < 10) {
      message.error('Please provide comments (at least 10 characters)');
      return;
    }
    Modal.confirm({
      title: `Confirm ${justDecision === 'approved' ? 'Approval' : 'Rejection'}`,
      content: `Are you sure you want to ${justDecision} this justification?`,
      onOk: async () => {
        setJustActionLoading(true);
        try {
          const response = await purchaseRequisitionAPI.processJustificationDecision(
            selectedJustification._id,
            { decision: justDecision, comments: justComments }
          );
          if (response.success) {
            message.success(`Justification ${justDecision === 'approved' ? 'approved' : 'rejected'} successfully`);
            setJustificationDrawerVisible(false);
            setSelectedJustification(null);
            setJustDecision('');
            setJustComments('');
            await fetchRequisitions();
            await fetchJustifications();
          } else {
            message.error(response.message || 'Failed to process decision');
          }
        } catch (error) {
          message.error(error.message || 'Failed to process decision');
        } finally {
          setJustActionLoading(false);
        }
      }
    });
  };

  const handleViewDetails = async (requisition) => {
    try {
      const response = await purchaseRequisitionAPI.getRequisition(requisition._id);
      if (response.success) {
        setSelectedRequisition(response.data);
        setDetailDrawerVisible(true);
        resetForm();
      } else {
        message.error('Failed to load requisition details');
      }
    } catch (error) {
      console.error('Error fetching requisition details:', error);
      message.error('Failed to load requisition details');
    }
  };

  const handleSubmitDecision = () => {
    if (!decision) {
      message.error('Please select your decision');
      return;
    }
    if (!comments || comments.trim().length < 10) {
      message.error('Please provide meaningful comments (at least 10 characters)');
      return;
    }

    const isCEOStep = selectedRequisition &&
      CEO_PENDING_STATUSES.includes(selectedRequisition.status);

    Modal.confirm({
      title: `Confirm ${decision === 'approved' ? 'Approval' : 'Rejection'}`,
      content: `Are you sure you want to ${decision === 'approved' ? 'approve' : 'reject'} this purchase requisition?${isCEOStep ? ' This is the final approval.' : ''}`,
      onOk: () => handleRequisitionAction(selectedRequisition._id, decision),
    });
  };

  const handleCancellationDecision = async (decisionValue) => {
    if (!cancellationComments || cancellationComments.trim().length < 5) {
      message.error('Please provide a comment (minimum 5 characters)');
      return;
    }
    Modal.confirm({
      title: `Confirm Cancellation ${decisionValue === 'approved' ? 'Approval' : 'Rejection'}`,
      content: decisionValue === 'approved'
        ? 'Approving will forward the cancellation to the next approver in the chain.'
        : 'Rejecting will immediately restore the PR to its previous active status.',
      onOk: async () => {
        setCancellationActionLoading(true);
        try {
          const token = localStorage.getItem('token');
          const response = await fetch(
            `${API_BASE_URL}/purchase-requisitions/${selectedRequisition._id}/process-cancellation`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ decision: decisionValue, comments: cancellationComments.trim() })
            }
          );
          const data = await response.json();
          if (data.success) {
            message.success(data.message);
            setDetailDrawerVisible(false);
            setSelectedRequisition(null);
            resetForm();
            await fetchRequisitions();
            await fetchCancellationRequests();
          } else {
            message.error(data.message || 'Failed to process cancellation');
          }
        } catch (error) {
          message.error('Failed to process cancellation');
        } finally {
          setCancellationActionLoading(false);
        }
      }
    });
  };

  // ── Attachment handlers ────────────────────────────────────────────────────
  const handleDownloadAttachment = async (attachment) => {
    if (!selectedRequisition?._id || !attachment._id) {
      message.error('Invalid attachment information');
      return;
    }
    setDownloadingAttachment(attachment._id);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${API_BASE_URL}/purchase-requisitions/${selectedRequisition._id}/attachments/${attachment._id}/download`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Failed to download file');
      }
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = attachment.name || 'attachment';
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?(.+)"?/i);
        if (match) filename = match[1];
      }
      const blob = await response.blob();
      const url  = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href     = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      message.success(`Downloaded: ${filename}`);
    } catch (error) {
      console.error('Download error:', error);
      message.error(error.message || 'Failed to download attachment');
    } finally {
      setDownloadingAttachment(null);
    }
  };

  const handlePreviewAttachment = (attachment) => {
    if (!selectedRequisition?._id || !attachment._id) {
      message.error('Invalid attachment information');
      return;
    }
    if (!canPreviewFile(attachment.mimetype)) {
      message.info('This file type cannot be previewed. Downloading instead...');
      handleDownloadAttachment(attachment);
      return;
    }
    const token = localStorage.getItem('token');
    window.open(
      `${API_BASE_URL}/purchase-requisitions/${selectedRequisition._id}/attachments/${attachment._id}/preview?token=${token}`,
      '_blank'
    );
  };

  // ── Render helpers ─────────────────────────────────────────────────────────
  const renderAttachments = () => {
    if (!selectedRequisition?.attachments?.length) return null;
    return (
      <Card
        size="small"
        title={<Space><PaperClipOutlined />Attachments ({selectedRequisition.attachments.length})</Space>}
        style={{ marginBottom: '16px' }}
      >
        <List
          dataSource={selectedRequisition.attachments}
          renderItem={(attachment) => (
            <List.Item
              key={attachment._id}
              actions={[
                canPreviewFile(attachment.mimetype) && (
                  <Tooltip title="Preview" key="preview">
                    <Button size="small" type="link" icon={<EyeOutlined />}
                      onClick={() => handlePreviewAttachment(attachment)}>
                      Preview
                    </Button>
                  </Tooltip>
                ),
                <Tooltip title="Download" key="download">
                  <Button size="small" type="link" icon={<DownloadOutlined />}
                    loading={downloadingAttachment === attachment._id}
                    onClick={() => handleDownloadAttachment(attachment)}>
                    Download
                  </Button>
                </Tooltip>
              ].filter(Boolean)}
            >
              <List.Item.Meta
                avatar={getFileIcon(attachment.mimetype)}
                title={
                  <Space>
                    <Text strong>{attachment.name}</Text>
                    {canPreviewFile(attachment.mimetype) && <Tag color="blue" size="small">Can Preview</Tag>}
                  </Space>
                }
                description={
                  <Space split="|">
                    <Text type="secondary">{formatFileSize(attachment.size)}</Text>
                    <Text type="secondary">{new Date(attachment.uploadedAt).toLocaleDateString('en-GB')}</Text>
                  </Space>
                }
              />
            </List.Item>
          )}
        />
      </Card>
    );
  };

  const renderApprovalChain = (approvalChain) => {
    if (!approvalChain?.length) return <Text type="secondary">No approval chain available</Text>;
    return (
      <Timeline>
        {approvalChain.map((step, index) => {
          const color = step.status === 'approved' ? 'green' : step.status === 'rejected' ? 'red' : 'blue';
          const dot   = step.status === 'approved'
            ? <CheckCircleOutlined />
            : step.status === 'rejected'
            ? <CloseCircleOutlined />
            : <ClockCircleOutlined />;
          return (
            <Timeline.Item key={index} color={color} dot={dot}>
              <Text strong>Level {step.level}: {step.approver?.name}</Text><br />
              <Text type="secondary">{step.approver?.role} — {step.approver?.department}</Text><br />
              {step.status === 'pending'   && <Tag color="orange">Currently Reviewing</Tag>}
              {step.status === 'approved'  && (
                <>
                  <Tag color="green">Approved</Tag>
                  {step.actionDate && <Text type="secondary"> on {new Date(step.actionDate).toLocaleDateString('en-GB')}</Text>}
                </>
              )}
              {step.status === 'rejected'  && (
                <>
                  <Tag color="red">Rejected</Tag>
                  {step.actionDate && <Text type="secondary"> on {new Date(step.actionDate).toLocaleDateString('en-GB')}</Text>}
                </>
              )}
              {step.comments && <div style={{ marginTop: 4 }}><Text italic>"{step.comments}"</Text></div>}
            </Timeline.Item>
          );
        })}
      </Timeline>
    );
  };

  const renderCancellationCard = () => {
    if (selectedRequisition?.status !== 'pending_cancellation') return null;
    const cr = selectedRequisition.cancellationRequest;
    if (!cr) return null;
    return (
      <Card
        size="small"
        title={<Space><StopOutlined style={{ color: '#ff4d4f' }} /><Text strong style={{ color: '#ff4d4f' }}>Cancellation Request</Text></Space>}
        style={{ marginBottom: '16px', borderColor: '#ff4d4f' }}
        headStyle={{ backgroundColor: '#fff2f0' }}
      >
        <Descriptions column={2} size="small" style={{ marginBottom: '12px' }}>
          <Descriptions.Item label="Requested On">
            {new Date(cr.requestedAt).toLocaleString('en-GB')}
          </Descriptions.Item>
          <Descriptions.Item label="Previous Status">
            <Tag>{cr.previousStatus?.replace(/_/g, ' ')}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Reason" span={2}>
            <Text italic>"{cr.reason}"</Text>
          </Descriptions.Item>
        </Descriptions>
        <Text strong style={{ fontSize: '12px', color: '#666' }}>Approval Progress</Text>
        <Timeline style={{ marginTop: '12px', marginBottom: 0 }}>
          {cr.approvalChain?.map((step, i) => (
            <Timeline.Item
              key={i}
              color={step.status === 'approved' ? 'green' : step.status === 'rejected' ? 'red' : 'gray'}
              dot={
                step.status === 'approved' ? <CheckCircleOutlined /> :
                step.status === 'rejected' ? <CloseCircleOutlined /> :
                <ClockCircleOutlined />
              }
            >
              <Text strong>Level {step.level}: {step.approver.name}</Text>
              &nbsp;<Text type="secondary" style={{ fontSize: '12px' }}>({step.approver.role})</Text><br />
              <Tag color={step.status === 'approved' ? 'green' : step.status === 'rejected' ? 'red' : 'default'}>
                {step.status.toUpperCase()}
              </Tag>
              {step.comments && <Text type="secondary" italic style={{ marginLeft: 8 }}>"{step.comments}"</Text>}
              {step.actionDate && (
                <Text type="secondary" style={{ fontSize: '11px', display: 'block' }}>
                  {new Date(step.actionDate).toLocaleDateString('en-GB')}
                </Text>
              )}
            </Timeline.Item>
          ))}
        </Timeline>
      </Card>
    );
  };

  const renderCancellationActionCard = () => {
    if (selectedRequisition?.status !== 'pending_cancellation') return null;
    const cr = selectedRequisition.cancellationRequest;
    if (!cr) return null;

    const myStep = cr.approvalChain?.find(
      s => s.approver.email?.toLowerCase() === user?.email?.toLowerCase() && s.status === 'pending'
    );
    if (!myStep) return null;

    const myIndex     = cr.approvalChain.indexOf(myStep);
    const priorApproved = cr.approvalChain
      .slice(0, myIndex)
      .every(s => s.status === 'approved');
    if (!priorApproved) return null;

    return (
      <Card
        size="small"
        title={<Space><StopOutlined style={{ color: '#ff4d4f' }} /><Text strong>Cancellation Decision — Your Action Required</Text></Space>}
        style={{ marginBottom: '16px', borderColor: '#ff4d4f' }}
        headStyle={{ backgroundColor: '#fff2f0' }}
      >
        <Alert
          message="This employee has requested to cancel their PR"
          description={`Reason: "${cr.reason}"`}
          type="warning"
          showIcon
          style={{ marginBottom: '16px' }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <Text strong style={{ display: 'block', marginBottom: '8px' }}>Your Comments *</Text>
            <TextArea
              rows={3}
              placeholder="Provide a reason for your decision..."
              value={cancellationComments}
              onChange={e => setCancellationComments(e.target.value)}
              showCount
              maxLength={300}
            />
          </div>
          <Space>
            <Button
              type="primary"
              icon={<CheckCircleOutlined />}
              loading={cancellationActionLoading}
              onClick={() => handleCancellationDecision('approved')}
              style={{ backgroundColor: '#ff4d4f', borderColor: '#ff4d4f' }}
            >
              Approve Cancellation
            </Button>
            <Button
              icon={<CloseCircleOutlined />}
              loading={cancellationActionLoading}
              onClick={() => handleCancellationDecision('rejected')}
            >
              Reject — Keep PR Active
            </Button>
          </Space>
        </div>
      </Card>
    );
  };

  /**
   * Renders the decision card for:
   *   - Regular supervisors when status === 'pending_supervisor'
   *   - CEO when status === 'pending_ceo' or 'pending_ceo_approval'
   */
  const renderDecisionCard = () => {
    if (!selectedRequisition) return null;

    const isCEOStep = CEO_PENDING_STATUSES.includes(selectedRequisition.status);
    const isSupervisorStep = selectedRequisition.status === 'pending_supervisor';

    if (!isCEOStep && !isSupervisorStep) return null;

    if (isCEOStep) {
      // CEO: no need to match approval chain — their role / status is the gate
      if (!isCEO) {
        return (
          <Alert
            message="CEO Approval Required"
            description="This requisition is awaiting final CEO sign-off and cannot be actioned from this view."
            type="info"
            showIcon
            style={{ marginBottom: '16px' }}
          />
        );
      }

      return (
        <Card
          size="small"
          title={
            <Space>
              <CrownOutlined style={{ color: '#faad14' }} />
              <Text strong style={{ color: '#faad14' }}>CEO Final Approval</Text>
            </Space>
          }
          style={{ marginBottom: '16px', borderColor: '#faad14' }}
          headStyle={{ backgroundColor: '#fff7e6' }}
        >
          <Alert
            message="This requisition requires your final CEO approval"
            description="All prior approval stages have been completed. Your decision is final."
            type="warning"
            showIcon
            style={{ marginBottom: '16px' }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <Text strong style={{ display: 'block', marginBottom: '8px' }}>Decision *</Text>
              <Select
                placeholder="Select your decision"
                style={{ width: '100%' }}
                value={decision}
                onChange={setDecision}
              >
                <Option value="approved">
                  <CheckCircleOutlined style={{ color: '#52c41a' }} /> Approve — Final Sign-off
                </Option>
                <Option value="rejected">
                  <CloseCircleOutlined style={{ color: '#ff4d4f' }} /> Reject Requisition
                </Option>
              </Select>
            </div>
            <div>
              <Text strong style={{ display: 'block', marginBottom: '8px' }}>Comments *</Text>
              <TextArea
                rows={3}
                placeholder="Enter your comments... (minimum 10 characters)"
                showCount
                maxLength={500}
                value={comments}
                onChange={e => setComments(e.target.value)}
              />
            </div>
            <Space>
              <Button
                type="primary"
                loading={actionLoading}
                icon={<SendOutlined />}
                onClick={handleSubmitDecision}
                style={{ backgroundColor: '#faad14', borderColor: '#faad14' }}
              >
                Submit CEO Decision
              </Button>
              <Button onClick={resetForm}>Clear Form</Button>
            </Space>
          </div>
        </Card>
      );
    }

    // Regular supervisor step
    const myStep = selectedRequisition.approvalChain?.find(
      s => s.approver?.email?.toLowerCase() === user?.email?.toLowerCase() && s.status === 'pending'
    );

    if (!myStep) {
      return (
        <Alert
          message="Awaiting a different approver"
          description="This requisition is in the approval chain but is not currently at your step."
          type="info"
          showIcon
          style={{ marginBottom: '16px' }}
        />
      );
    }

    return (
      <Card size="small" title="Supervisor Decision" style={{ marginBottom: '16px' }}>
        <Alert
          message="This requisition requires your approval"
          description="Please review all items and justification before submitting your decision."
          type="warning"
          showIcon
          style={{ marginBottom: '16px' }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <Text strong style={{ display: 'block', marginBottom: '8px' }}>Decision *</Text>
            <Select
              placeholder="Select your decision"
              style={{ width: '100%' }}
              value={decision}
              onChange={setDecision}
            >
              <Option value="approved">
                <CheckCircleOutlined style={{ color: '#52c41a' }} /> Approve Requisition
              </Option>
              <Option value="rejected">
                <CloseCircleOutlined style={{ color: '#ff4d4f' }} /> Reject Requisition
              </Option>
            </Select>
          </div>
          <div>
            <Text strong style={{ display: 'block', marginBottom: '8px' }}>Comments *</Text>
            <TextArea
              rows={3}
              placeholder="Enter your comments... (minimum 10 characters)"
              showCount
              maxLength={500}
              value={comments}
              onChange={e => setComments(e.target.value)}
            />
          </div>
          <Space>
            <Button
              type="primary"
              loading={actionLoading}
              icon={<SendOutlined />}
              onClick={handleSubmitDecision}
            >
              Submit Decision
            </Button>
            <Button onClick={resetForm}>Clear Form</Button>
          </Space>
        </div>
      </Card>
    );
  };

  // ── Columns ────────────────────────────────────────────────────────────────
  const columns = [
    {
      title: 'Req. Number',
      dataIndex: 'requisitionNumber',
      key: 'requisitionNumber',
      render: (n) => <Text code>{n}</Text>,
      width: 140
    },
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
      width: 180
    },
    {
      title: 'Requester',
      key: 'requester',
      render: (_, r) => (
        <div>
          <Text strong>{r.employee?.fullName}</Text><br />
          <Text type="secondary" style={{ fontSize: '12px' }}>{r.department}</Text>
        </div>
      ),
      width: 150
    },
    {
      title: 'Category',
      dataIndex: 'itemCategory',
      key: 'itemCategory',
      render: (c) => <Tag color="blue">{c}</Tag>,
      width: 130
    },
    {
      title: 'Assigned Buyer',
      key: 'assignedBuyer',
      render: (_, r) => {
        const buyer = r.supplyChainReview?.assignedBuyer || r.assignedBuyer;
        return buyer
          ? <div><Text strong>{buyer.fullName || buyer.name}</Text><br /><Text type="secondary" style={{ fontSize: '12px' }}>{buyer.email}</Text></div>
          : <Text type="secondary">Not assigned</Text>;
      },
      width: 150
    },
    {
      title: 'Payment',
      dataIndex: 'paymentMethod',
      key: 'paymentMethod',
      render: (v) => v ? <Tag color="gold">{v}</Tag> : <Text type="secondary">N/A</Text>,
      width: 100
    },
    {
      title: 'Budget Code',
      key: 'budgetCode',
      render: (_, r) => {
        const code = r.financeVerification?.budgetCodeVerified
          || r.budgetCodeInfo?.code
          || null;
        return code ? <Tag color="purple">{code}</Tag> : <Text type="secondary">N/A</Text>;
      },
      width: 120
    },
    {
      title: 'Items',
      key: 'itemCount',
      render: (_, r) => r.items?.length || 0,
      align: 'center',
      width: 60
    },
    {
      title: 'Budget (XAF)',
      dataIndex: 'budgetXAF',
      key: 'budgetXAF',
      render: (v) => v ? Number(v).toLocaleString() : 'N/A',
      align: 'right',
      width: 120
    },
    {
      title: 'Urgency',
      dataIndex: 'urgency',
      key: 'urgency',
      render: (u) => getUrgencyTag(u),
      width: 90
    },
    {
      title: 'Submitted',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (d) => new Date(d).toLocaleDateString('en-GB'),
      width: 100
    },
    {
      title: 'Expected',
      dataIndex: 'expectedDate',
      key: 'expectedDate',
      render: (d) => new Date(d).toLocaleDateString('en-GB'),
      width: 100
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (s) => getStatusTag(s),
      width: 200
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, r) => (
        <Button size="small" icon={<EyeOutlined />} onClick={() => handleViewDetails(r)}>
          Review
        </Button>
      ),
      width: 90
    }
  ];

  // Cancellation table uses a simpler column set
  const cancellationColumns = [
    ...columns.slice(0, 3),
    {
      title: 'Cancellation Reason',
      key: 'cancellationReason',
      render: (_, r) => (
        <Text type="secondary" ellipsis style={{ maxWidth: 200 }}>
          {r.cancellationRequest?.reason || '—'}
        </Text>
      ),
      width: 200
    },
    {
      title: 'Requested On',
      key: 'requestedOn',
      render: (_, r) => r.cancellationRequest?.requestedAt
        ? new Date(r.cancellationRequest.requestedAt).toLocaleDateString('en-GB')
        : '—',
      width: 110
    },
    columns[columns.length - 1]
  ];

  const filteredData = getFilteredRequisitions();

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <Title level={2} style={{ margin: 0 }}>
            <ShoppingCartOutlined /> Purchase Requisition Approvals
            {isCEO && (
              <Tag color="magenta" style={{ marginLeft: 12, verticalAlign: 'middle' }}>
                <CrownOutlined /> CEO View
              </Tag>
            )}
          </Title>
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => { fetchRequisitions(); fetchCancellationRequests(); }}
              loading={loading}
            >
              Refresh
            </Button>
          </Space>
        </div>

        <Row gutter={16} style={{ marginBottom: '24px' }}>
          <Col span={5}>
            <Statistic
              title={isCEO ? 'Pending CEO Approval' : 'Pending Approval'}
              value={stats.pending}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Col>
          <Col span={5}>
            <Statistic
              title="Approved by You"
              value={stats.approved}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Col>
          <Col span={5}>
            <Statistic
              title="Rejected"
              value={stats.rejected}
              prefix={<CloseCircleOutlined />}
              valueStyle={{ color: '#f5222d' }}
            />
          </Col>
          <Col span={5}>
            <Statistic
              title="Total Reviewed"
              value={stats.total}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Col>
          <Col span={4}>
            <Statistic
              title="Cancellations"
              value={stats.cancellations}
              prefix={<StopOutlined />}
              valueStyle={{ color: '#fa541c' }}
            />
          </Col>
        </Row>

        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane
            tab={
              <Badge count={stats.pending} size="small">
                <span><ClockCircleOutlined /> Pending ({stats.pending})</span>
              </Badge>
            }
            key="pending"
          >
            {filteredData.length === 0 ? (
              <Alert
                message="No Pending Approvals"
                description={
                  isCEO
                    ? 'No purchase requisitions awaiting your CEO approval.'
                    : 'No purchase requisitions awaiting your approval.'
                }
                type="info"
                showIcon
              />
            ) : (
              <Table
                columns={columns}
                dataSource={filteredData}
                rowKey="_id"
                loading={loading}
                pagination={{ pageSize: 10, showTotal: (t, r) => `${r[0]}-${r[1]} of ${t}` }}
                scroll={{ x: 'max-content' }}
              />
            )}
          </TabPane>

          <TabPane
            tab={<span><CheckCircleOutlined /> Approved ({stats.approved})</span>}
            key="approved"
          >
            <Table
              columns={columns}
              dataSource={filteredData}
              rowKey="_id"
              loading={loading}
              pagination={{ pageSize: 10, showTotal: (t, r) => `${r[0]}-${r[1]} of ${t}` }}
              scroll={{ x: 'max-content' }}
            />
          </TabPane>

          <TabPane
            tab={<span><CloseCircleOutlined /> Rejected ({stats.rejected})</span>}
            key="rejected"
          >
            <Table
              columns={columns}
              dataSource={filteredData}
              rowKey="_id"
              loading={loading}
              pagination={{ pageSize: 10, showTotal: (t, r) => `${r[0]}-${r[1]} of ${t}` }}
              scroll={{ x: 'max-content' }}
            />
          </TabPane>

          <TabPane
            tab={
              <Badge count={stats.cancellations} size="small">
                <span><StopOutlined /> Cancellations ({stats.cancellations})</span>
              </Badge>
            }
            key="cancellations"
          >
            {cancellationLoading ? (
              <div style={{ textAlign: 'center', padding: '40px' }}><Spin /></div>
            ) : cancellationRequests.length === 0 ? (
              <Alert
                message="No Cancellation Requests"
                description="No cancellation requests awaiting your decision."
                type="info"
                showIcon
              />
            ) : (
              <Table
                columns={cancellationColumns}
                dataSource={cancellationRequests}
                rowKey="_id"
                loading={cancellationLoading}
                pagination={{ pageSize: 10 }}
                scroll={{ x: 'max-content' }}
              />
            )}
          </TabPane>
          <TabPane
            tab={
              <Badge count={justifications.filter(j =>
                (isCEO && j.status === 'justification_pending_ceo') ||
                (!isCEO && j.status === 'justification_pending_supervisor' &&
                  j.approvalChain?.some(s =>
                    s.approver?.email?.toLowerCase() === user?.email?.toLowerCase() &&
                    s.status === 'approved'
                  ))
              ).length} size="small">
                <span><FileTextOutlined /> Justification Reviews ({justifications.length})</span>
              </Badge>
            }
            key="justifications"
          >
            {justifications.length === 0 ? (
              <Alert
                message="No Justification Reviews"
                description="No justifications are awaiting your review."
                type="info"
                showIcon
              />
            ) : (
              <Table
                columns={[
                  {
                    title: 'Requester',
                    key: 'employee',
                    render: (_, r) => (
                      <div>
                        <Text strong>{r.employee?.fullName || 'N/A'}</Text><br />
                        <Text type="secondary" style={{ fontSize: '12px' }}>{r.department}</Text>
                      </div>
                    ),
                    width: 160
                  },
                  {
                    title: 'Requisition',
                    key: 'req',
                    render: (_, r) => <Text code>{r.requisitionNumber}</Text>,
                    width: 140
                  },
                  {
                    title: 'Amount',
                    key: 'amount',
                    render: (_, r) => (
                      <Text strong style={{ color: '#1890ff' }}>
                        XAF {(r.budgetXAF || 0).toLocaleString()}
                      </Text>
                    ),
                    width: 130
                  },
                  {
                    title: 'Justification Status',
                    key: 'status',
                    render: (_, r) => getStatusTag(r.status, r),
                    width: 220
                  },
                  {
                    title: 'Submitted',
                    key: 'submitted',
                    render: (_, r) => r.justification?.submittedDate
                      ? new Date(r.justification.submittedDate).toLocaleDateString('en-GB')
                      : '—',
                    width: 110
                  },
                  {
                    title: 'Actions',
                    key: 'actions',
                    render: (_, r) => {
                      const canAct =
                        (isCEO && r.status === 'justification_pending_ceo') ||
                        (!isCEO && r.status === 'justification_pending_supervisor');
                      return (
                        <Space size="small">
                          <Button
                            size="small"
                            icon={<EyeOutlined />}
                            onClick={async () => {
                              try {
                                const resp = await purchaseRequisitionAPI.getRequisition(r._id);
                                if (resp.success) {
                                  setSelectedJustification(resp.data);
                                  setJustificationDrawerVisible(true);
                                  setJustDecision('');
                                  setJustComments('');
                                }
                              } catch { message.error('Failed to load details'); }
                            }}
                          >
                            View
                          </Button>
                          {canAct && (
                            <Button
                              size="small"
                              type="primary"
                              icon={<AuditOutlined />}
                              onClick={async () => {
                                try {
                                  const resp = await purchaseRequisitionAPI.getRequisition(r._id);
                                  if (resp.success) {
                                    setSelectedJustification(resp.data);
                                    setJustificationDrawerVisible(true);
                                    setJustDecision('');
                                    setJustComments('');
                                  }
                                } catch { message.error('Failed to load details'); }
                              }}
                            >
                              Review
                            </Button>
                          )}
                        </Space>
                      );
                    },
                    width: 130
                  }
                ]}
                dataSource={justifications}
                rowKey="_id"
                loading={loading}
                pagination={{ pageSize: 10, showTotal: (t, r) => `${r[0]}-${r[1]} of ${t}` }}
                scroll={{ x: 'max-content' }}
              />
            )}
          </TabPane>
        </Tabs>
      </Card>

      {/* Detail Drawer */}
      <Drawer
        title={<Space><FileTextOutlined />Purchase Requisition Review</Space>}
        placement="right"
        width={900}
        open={detailDrawerVisible}
        onClose={() => {
          setDetailDrawerVisible(false);
          setSelectedRequisition(null);
          resetForm();
        }}
      >
        {selectedRequisition && (
          <div>
            {/* Requisition Info */}
            <Card size="small" title="Requisition Information" style={{ marginBottom: '16px' }}>
              <Descriptions column={2} size="small">
                <Descriptions.Item label="Requisition Number">
                  <Text code>{selectedRequisition.requisitionNumber}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Status">
                  {getStatusTag(selectedRequisition.status)}
                </Descriptions.Item>
                <Descriptions.Item label="Title">{selectedRequisition.title}</Descriptions.Item>
                <Descriptions.Item label="Urgency">{getUrgencyTag(selectedRequisition.urgency)}</Descriptions.Item>
                <Descriptions.Item label="Requester">
                  <div>
                    <UserOutlined /> {selectedRequisition.employee?.fullName}<br />
                    <Text type="secondary">{selectedRequisition.employee?.email}</Text><br />
                    <Text type="secondary">{selectedRequisition.department}</Text>
                  </div>
                </Descriptions.Item>
                <Descriptions.Item label="Category">
                  <Tag color="blue">{selectedRequisition.itemCategory}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Budget (XAF)">
                  <DollarOutlined /> {selectedRequisition.budgetXAF
                    ? Number(selectedRequisition.budgetXAF).toLocaleString()
                    : 'N/A'}
                </Descriptions.Item>
                <Descriptions.Item label="Expected Date">
                  <CalendarOutlined /> {new Date(selectedRequisition.expectedDate).toLocaleDateString('en-GB')}
                </Descriptions.Item>
                <Descriptions.Item label="Delivery Location" span={2}>
                  {selectedRequisition.deliveryLocation}
                </Descriptions.Item>
                {selectedRequisition.budgetCodeInfo && (
                  <Descriptions.Item label="Budget Code" span={2}>
                    <Tag color="purple">{selectedRequisition.budgetCodeInfo.code}</Tag>
                    {' '}{selectedRequisition.budgetCodeInfo.name}
                    {' — '}
                    <Text type="secondary">
                      XAF {Number(selectedRequisition.budgetCodeInfo.availableAtSubmission).toLocaleString()} available at submission
                    </Text>
                  </Descriptions.Item>
                )}
              </Descriptions>
            </Card>

            {/* Items */}
            <Card
              size="small"
              title={`Items Requested (${selectedRequisition.items?.length || 0})`}
              style={{ marginBottom: '16px' }}
            >
              <Table
                columns={[
                  { title: 'Code',        dataIndex: 'code',          key: 'code',          width: 90 },
                  { title: 'Description', dataIndex: 'description',   key: 'description' },
                  { title: 'Qty',         dataIndex: 'quantity',      key: 'quantity',      width: 60,  align: 'center' },
                  { title: 'Unit',        dataIndex: 'measuringUnit', key: 'measuringUnit', width: 80,  align: 'center' },
                  {
                    title: 'Est. Price',
                    key: 'price',
                    width: 110,
                    align: 'right',
                    render: (_, r) => r.estimatedPrice
                      ? `XAF ${Number(r.estimatedPrice).toLocaleString()}`
                      : '—'
                  }
                ]}
                dataSource={selectedRequisition.items || []}
                pagination={false}
                size="small"
                rowKey={(_, i) => i}
              />
            </Card>

            {/* Attachments */}
            {renderAttachments()}

            {/* Cancellation info */}
            {renderCancellationCard()}

            {/* Business Justification */}
            <Card size="small" title="Business Justification" style={{ marginBottom: '16px' }}>
              <div style={{ marginBottom: '12px' }}>
                <Text strong>Purchase Justification:</Text><br />
                <Text>
                  {selectedRequisition.justificationOfPurchase || (
                    <Text type="secondary">Not provided yet</Text>
                  )}
                </Text>
              </div>
              {selectedRequisition.justificationOfPreferredSupplier && (
                <div>
                  <Text strong>Preferred Supplier Justification:</Text><br />
                  <Text>{selectedRequisition.justificationOfPreferredSupplier}</Text>
                </div>
              )}
            </Card>

            {/* Approval Progress */}
            <Card size="small" title="Approval Progress" style={{ marginBottom: '16px' }}>
              {renderApprovalChain(selectedRequisition.approvalChain)}
            </Card>

            {/* Decision card — handles both supervisor and CEO flows */}
            {renderDecisionCard()}

            {/* Cancellation action */}
            {renderCancellationActionCard()}
          </div>
        )}
      </Drawer>
      
      <Drawer
        title={<Space><FileTextOutlined />Justification Review</Space>}
        placement="right"
        width={860}
        open={justificationDrawerVisible}
        onClose={() => {
          setJustificationDrawerVisible(false);
          setSelectedJustification(null);
          setJustDecision('');
          setJustComments('');
        }}
      >
        {selectedJustification && (() => {
          const j = selectedJustification.justification || {};
          const totalBudget   = selectedJustification.budgetXAF || 0;
          const totalDisbursed = selectedJustification.totalDisbursed || 0;
          const spent    = j.totalSpent || 0;
          const returned = j.changeReturned || 0;
          const balanced = Math.abs((spent + returned) - totalDisbursed) < 1;

          const canAct =
            (isCEO && selectedJustification.status === 'justification_pending_ceo') ||
            (!isCEO && selectedJustification.status === 'justification_pending_supervisor');

          return (
            <div>
              {/* Status banner */}
              <Alert
                message={`Justification at: ${selectedJustification.status.replace(/_/g, ' ').replace('justification pending ', '').toUpperCase()}`}
                type={selectedJustification.status.includes('rejected') ? 'error' : 'warning'}
                showIcon
                style={{ marginBottom: '16px' }}
              />

              {/* Requisition summary */}
              <Card size="small" title="Requisition Summary" style={{ marginBottom: '16px' }}>
                <Descriptions column={2} size="small">
                  <Descriptions.Item label="Number"><Text code>{selectedJustification.requisitionNumber}</Text></Descriptions.Item>
                  <Descriptions.Item label="Employee"><Text strong>{selectedJustification.employee?.fullName}</Text></Descriptions.Item>
                  <Descriptions.Item label="Title">{selectedJustification.title}</Descriptions.Item>
                  <Descriptions.Item label="Department"><Tag color="blue">{selectedJustification.department}</Tag></Descriptions.Item>
                  <Descriptions.Item label="Approved Budget">
                    <Text strong style={{ color: '#1890ff' }}>XAF {totalBudget.toLocaleString()}</Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="Total Disbursed">
                    <Text strong style={{ color: '#52c41a' }}>XAF {totalDisbursed.toLocaleString()}</Text>
                  </Descriptions.Item>
                </Descriptions>
              </Card>

              {/* Financial reconciliation */}
              <Card size="small" title="Financial Reconciliation" style={{ marginBottom: '16px' }}>
                <Row gutter={16} style={{ marginBottom: '12px' }}>
                  <Col span={8}>
                    <Statistic title="Amount Spent" value={spent}
                      prefix="XAF " valueStyle={{ color: '#f5222d', fontSize: '16px' }} />
                  </Col>
                  <Col span={8}>
                    <Statistic title="Change Returned" value={returned}
                      prefix="XAF " valueStyle={{ color: '#52c41a', fontSize: '16px' }} />
                  </Col>
                  <Col span={8}>
                    <Statistic title="Disbursed" value={totalDisbursed}
                      prefix="XAF " valueStyle={{ color: '#1890ff', fontSize: '16px' }} />
                  </Col>
                </Row>
                {!balanced && (
                  <Alert
                    message={`Discrepancy: spent (${spent.toLocaleString()}) + returned (${returned.toLocaleString()}) ≠ disbursed (${totalDisbursed.toLocaleString()})`}
                    type="warning" showIcon
                  />
                )}
                {balanced && (
                  <Alert message="Accounts balance — total reconciled correctly." type="success" showIcon />
                )}
              </Card>

              {/* Expense items */}
              {j.actualExpenses?.length > 0 && (
                <Card size="small" title={`Actual Expenses (${j.actualExpenses.length})`} style={{ marginBottom: '16px' }}>
                  <Table
                    dataSource={j.actualExpenses}
                    size="small"
                    pagination={false}
                    rowKey={(_, i) => i}
                    columns={[
                      { title: 'Description', dataIndex: 'description', key: 'description' },
                      { title: 'Category', dataIndex: 'category', key: 'category',
                        render: c => <Tag>{c}</Tag> },
                      { title: 'Date', dataIndex: 'date', key: 'date',
                        render: d => d ? new Date(d).toLocaleDateString('en-GB') : '—', width: 100 },
                      { title: 'Amount', dataIndex: 'amount', key: 'amount',
                        render: a => <Text strong>XAF {Number(a||0).toLocaleString()}</Text>, width: 130 }
                    ]}
                    summary={rows => (
                      <Table.Summary.Row>
                        <Table.Summary.Cell index={0} colSpan={3}><Text strong>Total</Text></Table.Summary.Cell>
                        <Table.Summary.Cell index={1}>
                          <Text strong style={{ color: '#1890ff' }}>
                            XAF {rows.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0).toLocaleString()}
                          </Text>
                        </Table.Summary.Cell>
                      </Table.Summary.Row>
                    )}
                  />
                </Card>
              )}

              {/* Summary text */}
              {j.justificationSummary && (
                <Card size="small" title="Justification Summary" style={{ marginBottom: '16px' }}>
                  <Text>{j.justificationSummary}</Text>
                </Card>
              )}

              {/* Receipts */}
              {j.receipts?.length > 0 && (
                <Card size="small" title={`Receipts (${j.receipts.length})`} style={{ marginBottom: '16px' }}>
                  <Space wrap>
                    {j.receipts.map((r, i) => (
                      <Button key={i} size="small" icon={<FileTextOutlined />}
                        onClick={() => window.open(r.url, '_blank')}>
                        {r.name || `Receipt ${i + 1}`}
                      </Button>
                    ))}
                  </Space>
                </Card>
              )}

              {/* Prior reviews */}
              {(j.supervisorReview || j.financeReview || j.supplyChainReview || j.headReview) && (
                <Card size="small" title="Prior Decisions" style={{ marginBottom: '16px' }}>
                  <Timeline>
                    {j.supervisorReview && (
                      <Timeline.Item color={j.supervisorReview.decision === 'approved' ? 'green' : 'red'}>
                        <Text strong>Supervisor: </Text>
                        <Tag color={j.supervisorReview.decision === 'approved' ? 'green' : 'red'}>
                          {j.supervisorReview.decision}
                        </Tag>
                        {j.supervisorReview.comments && <Text italic> — "{j.supervisorReview.comments}"</Text>}
                        <br />
                        <Text type="secondary" style={{ fontSize: '11px' }}>
                          {j.supervisorReview.reviewedDate ? new Date(j.supervisorReview.reviewedDate).toLocaleString('en-GB') : ''}
                        </Text>
                      </Timeline.Item>
                    )}
                    {j.financeReview && (
                      <Timeline.Item color={j.financeReview.decision === 'approved' ? 'green' : 'red'}>
                        <Text strong>Finance: </Text>
                        <Tag color={j.financeReview.decision === 'approved' ? 'green' : 'red'}>
                          {j.financeReview.decision}
                        </Tag>
                        {j.financeReview.comments && <Text italic> — "{j.financeReview.comments}"</Text>}
                      </Timeline.Item>
                    )}
                    {j.supplyChainReview && (
                      <Timeline.Item color={j.supplyChainReview.decision === 'approved' ? 'green' : 'red'}>
                        <Text strong>Supply Chain: </Text>
                        <Tag color={j.supplyChainReview.decision === 'approved' ? 'green' : 'red'}>
                          {j.supplyChainReview.decision}
                        </Tag>
                        {j.supplyChainReview.comments && <Text italic> — "{j.supplyChainReview.comments}"</Text>}
                      </Timeline.Item>
                    )}
                    {j.headReview && (
                      <Timeline.Item color={j.headReview.decision === 'approved' ? 'green' : 'red'}>
                        <Text strong>Head of Business: </Text>
                        <Tag color={j.headReview.decision === 'approved' ? 'green' : 'red'}>
                          {j.headReview.decision}
                        </Tag>
                        {j.headReview.comments && <Text italic> — "{j.headReview.comments}"</Text>}
                      </Timeline.Item>
                    )}
                  </Timeline>
                </Card>
              )}

              {/* Decision form — only shown when it's this user's turn */}
              {canAct && (
                <Card
                  size="small"
                  title={
                    <Space>
                      <AuditOutlined />
                      <Text strong style={{ color: isCEO ? '#faad14' : '#1890ff' }}>
                        {isCEO ? 'CEO Final Decision' : 'Your Decision'}
                      </Text>
                    </Space>
                  }
                  style={{ borderColor: isCEO ? '#faad14' : '#1890ff' }}
                  headStyle={{ backgroundColor: isCEO ? '#fff7e6' : '#e6f7ff' }}
                >
                  <Alert
                    message={isCEO ? 'This is the final CEO approval on the justification.' : 'Review the financial reconciliation above before deciding.'}
                    type={isCEO ? 'warning' : 'info'}
                    showIcon
                    style={{ marginBottom: '16px' }}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                      <Text strong style={{ display: 'block', marginBottom: '8px' }}>Decision *</Text>
                      <Select
                        placeholder="Select your decision"
                        style={{ width: '100%' }}
                        value={justDecision || undefined}
                        onChange={setJustDecision}
                      >
                        <Select.Option value="approved">
                          <CheckCircleOutlined style={{ color: '#52c41a' }} /> Approve Justification
                        </Select.Option>
                        <Select.Option value="rejected">
                          <CloseCircleOutlined style={{ color: '#ff4d4f' }} /> Return for Revision
                        </Select.Option>
                      </Select>
                    </div>
                    <div>
                      <Text strong style={{ display: 'block', marginBottom: '8px' }}>Comments * (min 10 chars)</Text>
                      <TextArea
                        rows={3}
                        placeholder="Explain your decision…"
                        value={justComments}
                        onChange={e => setJustComments(e.target.value)}
                        showCount
                        maxLength={500}
                      />
                    </div>
                    <Space>
                      <Button
                        type="primary"
                        loading={justActionLoading}
                        icon={<SendOutlined />}
                        onClick={handleJustificationDecision}
                        style={isCEO ? { backgroundColor: '#faad14', borderColor: '#faad14' } : {}}
                      >
                        Submit Decision
                      </Button>
                      <Button onClick={() => { setJustDecision(''); setJustComments(''); }}>
                        Clear
                      </Button>
                    </Space>
                  </div>
                </Card>
              )}

              {/* Read-only notice if not their turn */}
              {!canAct && !selectedJustification.status.includes('rejected') && !selectedJustification.status.includes('approved') && (
                <Alert
                  message="Not yet at your approval level"
                  description={`This justification is currently at: ${selectedJustification.status.replace(/_/g, ' ')}`}
                  type="info"
                  showIcon
                />
              )}
            </div>
          );
        })()}
      </Drawer>
    </div>
  );
};

export default SupervisorPurchaseRequisitions;















// import React, { useState, useEffect } from 'react';
// import { useSelector } from 'react-redux';
// import {
//   Card,
//   Table,
//   Button,
//   Space,
//   Typography,
//   Tag,
//   Alert,
//   Row,
//   Col,
//   Statistic,
//   Modal,
//   Descriptions,
//   Timeline,
//   Input,
//   Select,
//   Tabs,
//   Badge,
//   Drawer,
//   message,
//   List,
//   Tooltip,
//   Spin
// } from 'antd';
// import {
//   ShoppingCartOutlined,
//   EyeOutlined,
//   ClockCircleOutlined,
//   CheckCircleOutlined,
//   CloseCircleOutlined,
//   ReloadOutlined,
//   FileTextOutlined,
//   SendOutlined,
//   UserOutlined,
//   DollarOutlined,
//   CalendarOutlined,
//   ExportOutlined,
//   DownloadOutlined,
//   FilePdfOutlined,
//   FileImageOutlined,
//   FileWordOutlined,
//   FileExcelOutlined,
//   FileUnknownOutlined,
//   PaperClipOutlined,
//   StopOutlined,
//   CrownOutlined,
//   BankOutlined,
//   SafetyCertificateOutlined
// } from '@ant-design/icons';
// import { purchaseRequisitionAPI } from '../../services/purchaseRequisitionAPI';
// import AttachmentDisplay from '../../components/AttachmentDisplay';

// const { Title, Text } = Typography;
// const { TextArea } = Input;
// const { Option } = Select;
// const { TabPane } = Tabs;

// // ── Status config — covers every value in the PurchaseRequisition model ──────
// const STATUS_MAP = {
//   draft:                              { color: 'default',  text: 'Draft',                       icon: <FileTextOutlined /> },
//   pending_supervisor:                 { color: 'orange',   text: 'Pending Your Approval',        icon: <ClockCircleOutlined /> },
//   pending_finance_verification:       { color: 'gold',     text: 'Finance Verification',         icon: <BankOutlined /> },
//   pending_supply_chain_review:        { color: 'blue',     text: 'Supply Chain Review',          icon: <ShoppingCartOutlined /> },
//   pending_buyer_assignment:           { color: 'geekblue', text: 'Buyer Assignment',             icon: <UserOutlined /> },
//   pending_head_approval:              { color: 'purple',   text: 'Head Approval',                icon: <CrownOutlined /> },
//   pending_ceo_approval:               { color: 'magenta',  text: 'CEO Approval',                 icon: <CrownOutlined /> },
//   approved:                           { color: 'green',    text: 'Approved',                     icon: <CheckCircleOutlined /> },
//   partially_disbursed:                { color: 'cyan',     text: 'Partially Disbursed',          icon: <DollarOutlined /> },
//   fully_disbursed:                    { color: 'green',    text: 'Fully Disbursed',              icon: <DollarOutlined /> },
//   rejected:                           { color: 'red',      text: 'Rejected',                     icon: <CloseCircleOutlined /> },
//   supply_chain_approved:              { color: 'purple',   text: 'Supply Chain Approved',        icon: <CheckCircleOutlined /> },
//   supply_chain_rejected:              { color: 'red',      text: 'Supply Chain Rejected',        icon: <CloseCircleOutlined /> },
//   in_procurement:                     { color: 'cyan',     text: 'In Procurement',               icon: <ShoppingCartOutlined /> },
//   procurement_complete:               { color: 'teal',     text: 'Procurement Complete',         icon: <CheckCircleOutlined /> },
//   delivered:                          { color: 'green',    text: 'Delivered',                    icon: <CheckCircleOutlined /> },
//   justification_pending_supervisor:   { color: 'orange',   text: 'Justification — Supervisor',   icon: <ClockCircleOutlined /> },
//   justification_pending_finance:      { color: 'gold',     text: 'Justification — Finance',      icon: <BankOutlined /> },
//   justification_pending_supply_chain: { color: 'blue',     text: 'Justification — SC',           icon: <ShoppingCartOutlined /> },
//   justification_pending_head:         { color: 'purple',   text: 'Justification — Head',         icon: <CrownOutlined /> },
//   justification_pending_ceo:          { color: 'magenta',  text: 'Justification — CEO',          icon: <CrownOutlined /> },
//   justification_rejected:             { color: 'red',      text: 'Justification Rejected',       icon: <CloseCircleOutlined /> },
//   justification_rejected_supervisor:  { color: 'red',      text: 'Just. Rejected — Supervisor',  icon: <CloseCircleOutlined /> },
//   justification_rejected_finance:     { color: 'red',      text: 'Just. Rejected — Finance',     icon: <CloseCircleOutlined /> },
//   justification_rejected_supply_chain:{ color: 'red',      text: 'Just. Rejected — SC',          icon: <CloseCircleOutlined /> },
//   justification_rejected_head:        { color: 'red',      text: 'Just. Rejected — Head',        icon: <CloseCircleOutlined /> },
//   justification_rejected_ceo:         { color: 'red',      text: 'Just. Rejected — CEO',         icon: <CloseCircleOutlined /> },
//   justification_approved:             { color: 'green',    text: 'Justification Approved',       icon: <CheckCircleOutlined /> },
//   completed:                          { color: 'green',    text: 'Completed',                    icon: <SafetyCertificateOutlined /> },
//   pending_clarification:              { color: 'lime',     text: 'Pending Clarification',        icon: <ClockCircleOutlined /> },
//   pending_cancellation:               { color: 'volcano',  text: 'Cancellation Pending',         icon: <StopOutlined /> },
//   cancelled:                          { color: 'error',    text: 'Cancelled',                    icon: <CloseCircleOutlined /> },
// };

// // Statuses that count as "approved / progressed past supervisor"
// const APPROVED_STATUSES = [
//   'pending_finance_verification',
//   'pending_supply_chain_review',
//   'pending_buyer_assignment',
//   'pending_head_approval',
//   'pending_ceo_approval',
//   'supply_chain_approved',
//   'approved',
//   'partially_disbursed',
//   'fully_disbursed',
//   'in_procurement',
//   'procurement_complete',
//   'delivered',
//   'justification_pending_supervisor',
//   'justification_pending_finance',
//   'justification_pending_supply_chain',
//   'justification_pending_head',
//   'justification_pending_ceo',
//   'justification_approved',
//   'completed',
// ];

// const SupervisorPurchaseRequisitions = () => {
//   const { user } = useSelector((state) => state.auth);
//   const [requisitions, setRequisitions] = useState([]);
//   const [loading, setLoading] = useState(false);
//   const [selectedRequisition, setSelectedRequisition] = useState(null);
//   const [detailDrawerVisible, setDetailDrawerVisible] = useState(false);
//   const [actionLoading, setActionLoading] = useState(false);
//   const [activeTab, setActiveTab] = useState('pending');
//   const [decision, setDecision] = useState('');
//   const [comments, setComments] = useState('');
//   const [downloadingAttachment, setDownloadingAttachment] = useState(null);
//   const [cancellationRequests, setCancellationRequests] = useState([]);
//   const [cancellationLoading, setCancellationLoading] = useState(false);
//   const [cancellationComments, setCancellationComments] = useState('');
//   const [cancellationActionLoading, setCancellationActionLoading] = useState(false);

//   const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

//   useEffect(() => {
//     fetchRequisitions();
//     fetchCancellationRequests();
//   }, []);

//   const fetchRequisitions = async () => {
//     setLoading(true);
//     try {
//       const response = await purchaseRequisitionAPI.getSupervisorRequisitions();
//       if (response.success) {
//         setRequisitions(response.data);
//       } else {
//         message.error('Failed to fetch requisitions');
//         setRequisitions([]);
//       }
//     } catch (error) {
//       console.error('Error fetching requisitions:', error);
//       message.error('Failed to fetch requisitions: ' + (error.response?.data?.message || error.message));
//       setRequisitions([]);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const fetchCancellationRequests = async () => {
//     setCancellationLoading(true);
//     try {
//       const token = localStorage.getItem('token');
//       const response = await fetch(`${API_BASE_URL}/purchase-requisitions/cancellation-requests`, {
//         headers: { Authorization: `Bearer ${token}` }
//       });
//       const data = await response.json();
//       if (data.success) {
//         setCancellationRequests(data.data || []);
//       }
//     } catch (error) {
//       console.error('Error fetching cancellation requests:', error);
//     } finally {
//       setCancellationLoading(false);
//     }
//   };

//   // ── Helpers ────────────────────────────────────────────────────────────────
//   const getStatusTag = (status) => {
//     const info = STATUS_MAP[status] || { color: 'default', text: status || 'Unknown', icon: null };
//     return (
//       <Tag color={info.color} icon={info.icon}>
//         {info.text}
//       </Tag>
//     );
//   };

//   const getUrgencyTag = (urgency) => {
//     const map = { Low: 'green', Medium: 'orange', High: 'red' };
//     return <Tag color={map[urgency] || 'default'}>{urgency}</Tag>;
//   };

//   const getFileIcon = (mimetype) => {
//     if (!mimetype) return <FileUnknownOutlined />;
//     if (mimetype.includes('pdf'))   return <FilePdfOutlined   style={{ color: '#ff4d4f' }} />;
//     if (mimetype.includes('image')) return <FileImageOutlined style={{ color: '#52c41a' }} />;
//     if (mimetype.includes('word') || mimetype.includes('document'))
//                                     return <FileWordOutlined  style={{ color: '#1890ff' }} />;
//     if (mimetype.includes('excel') || mimetype.includes('spreadsheet'))
//                                     return <FileExcelOutlined style={{ color: '#52c41a' }} />;
//     return <FileUnknownOutlined />;
//   };

//   const formatFileSize = (bytes) => {
//     if (!bytes) return 'Unknown size';
//     if (bytes < 1024)              return bytes + ' B';
//     if (bytes < 1024 * 1024)      return (bytes / 1024).toFixed(1) + ' KB';
//     return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
//   };

//   const canPreviewFile = (mimetype) =>
//     !!mimetype && (mimetype.includes('pdf') || mimetype.includes('image'));

//   const resetForm = () => {
//     setDecision('');
//     setComments('');
//     setCancellationComments('');
//   };

//   // ── Data filtering ─────────────────────────────────────────────────────────
//   const getFilteredRequisitions = () => {
//     switch (activeTab) {
//       case 'pending':
//         return requisitions.filter(r => r.status === 'pending_supervisor');
//       case 'approved':
//         return requisitions.filter(r => APPROVED_STATUSES.includes(r.status));
//       case 'rejected':
//         return requisitions.filter(r =>
//           r.status === 'rejected' ||
//           r.status === 'supply_chain_rejected' ||
//           r.status.startsWith('justification_rejected')
//         );
//       default:
//         return requisitions;
//     }
//   };

//   // ── Stats ──────────────────────────────────────────────────────────────────
//   const stats = {
//     pending:       requisitions.filter(r => r.status === 'pending_supervisor').length,
//     approved:      requisitions.filter(r => APPROVED_STATUSES.includes(r.status)).length,
//     rejected:      requisitions.filter(r =>
//                      r.status === 'rejected' ||
//                      r.status === 'supply_chain_rejected' ||
//                      (r.status || '').startsWith('justification_rejected')
//                    ).length,
//     total:         requisitions.length,
//     cancellations: cancellationRequests.length,
//   };

//   // ── Actions ────────────────────────────────────────────────────────────────
//   const handleRequisitionAction = async (requisitionId, action) => {
//     setActionLoading(true);
//     try {
//       const response = await purchaseRequisitionAPI.processSupervisorDecision(
//         requisitionId, action, comments
//       );
//       if (response.success) {
//         message.success(`Purchase requisition ${action === 'approved' ? 'approved' : 'rejected'} successfully!`);
//         setDetailDrawerVisible(false);
//         resetForm();
//         await fetchRequisitions();
//       } else {
//         message.error(response.message || `Failed to ${action} requisition`);
//       }
//     } catch (error) {
//       console.error(`Error ${action}ing requisition:`, error);
//       message.error(`Failed to ${action} requisition: ` + (error.response?.data?.message || error.message));
//     } finally {
//       setActionLoading(false);
//     }
//   };

//   const handleViewDetails = async (requisition) => {
//     try {
//       const response = await purchaseRequisitionAPI.getRequisition(requisition._id);
//       if (response.success) {
//         setSelectedRequisition(response.data);
//         setDetailDrawerVisible(true);
//         resetForm();
//       } else {
//         message.error('Failed to load requisition details');
//       }
//     } catch (error) {
//       console.error('Error fetching requisition details:', error);
//       message.error('Failed to load requisition details');
//     }
//   };

//   const handleSubmitDecision = () => {
//     if (!decision) {
//       message.error('Please select your decision');
//       return;
//     }
//     if (!comments || comments.trim().length < 10) {
//       message.error('Please provide meaningful comments (at least 10 characters)');
//       return;
//     }
//     Modal.confirm({
//       title: `Confirm ${decision === 'approved' ? 'Approval' : 'Rejection'}`,
//       content: `Are you sure you want to ${decision === 'approved' ? 'approve' : 'reject'} this purchase requisition?`,
//       onOk: () => handleRequisitionAction(selectedRequisition._id, decision),
//     });
//   };

//   const handleCancellationDecision = async (decisionValue) => {
//     if (!cancellationComments || cancellationComments.trim().length < 5) {
//       message.error('Please provide a comment (minimum 5 characters)');
//       return;
//     }
//     Modal.confirm({
//       title: `Confirm Cancellation ${decisionValue === 'approved' ? 'Approval' : 'Rejection'}`,
//       content: decisionValue === 'approved'
//         ? 'Approving will forward the cancellation to the next approver in the chain.'
//         : 'Rejecting will immediately restore the PR to its previous active status.',
//       onOk: async () => {
//         setCancellationActionLoading(true);
//         try {
//           const token = localStorage.getItem('token');
//           const response = await fetch(
//             `${API_BASE_URL}/purchase-requisitions/${selectedRequisition._id}/process-cancellation`,
//             {
//               method: 'POST',
//               headers: {
//                 Authorization: `Bearer ${token}`,
//                 'Content-Type': 'application/json'
//               },
//               body: JSON.stringify({ decision: decisionValue, comments: cancellationComments.trim() })
//             }
//           );
//           const data = await response.json();
//           if (data.success) {
//             message.success(data.message);
//             setDetailDrawerVisible(false);
//             setSelectedRequisition(null);
//             resetForm();
//             await fetchRequisitions();
//             await fetchCancellationRequests();
//           } else {
//             message.error(data.message || 'Failed to process cancellation');
//           }
//         } catch (error) {
//           message.error('Failed to process cancellation');
//         } finally {
//           setCancellationActionLoading(false);
//         }
//       }
//     });
//   };

//   // ── Attachment handlers ────────────────────────────────────────────────────
//   const handleDownloadAttachment = async (attachment) => {
//     if (!selectedRequisition?._id || !attachment._id) {
//       message.error('Invalid attachment information');
//       return;
//     }
//     setDownloadingAttachment(attachment._id);
//     try {
//       const token = localStorage.getItem('token');
//       const response = await fetch(
//         `${API_BASE_URL}/purchase-requisitions/${selectedRequisition._id}/attachments/${attachment._id}/download`,
//         { headers: { Authorization: `Bearer ${token}` } }
//       );
//       if (!response.ok) {
//         const err = await response.json();
//         throw new Error(err.message || 'Failed to download file');
//       }
//       const contentDisposition = response.headers.get('Content-Disposition');
//       let filename = attachment.name || 'attachment';
//       if (contentDisposition) {
//         const match = contentDisposition.match(/filename="?(.+)"?/i);
//         if (match) filename = match[1];
//       }
//       const blob = await response.blob();
//       const url  = window.URL.createObjectURL(blob);
//       const link = document.createElement('a');
//       link.href     = url;
//       link.download = filename;
//       document.body.appendChild(link);
//       link.click();
//       document.body.removeChild(link);
//       window.URL.revokeObjectURL(url);
//       message.success(`Downloaded: ${filename}`);
//     } catch (error) {
//       console.error('Download error:', error);
//       message.error(error.message || 'Failed to download attachment');
//     } finally {
//       setDownloadingAttachment(null);
//     }
//   };

//   const handlePreviewAttachment = (attachment) => {
//     if (!selectedRequisition?._id || !attachment._id) {
//       message.error('Invalid attachment information');
//       return;
//     }
//     if (!canPreviewFile(attachment.mimetype)) {
//       message.info('This file type cannot be previewed. Downloading instead...');
//       handleDownloadAttachment(attachment);
//       return;
//     }
//     const token = localStorage.getItem('token');
//     window.open(
//       `${API_BASE_URL}/purchase-requisitions/${selectedRequisition._id}/attachments/${attachment._id}/preview?token=${token}`,
//       '_blank'
//     );
//   };

//   // ── Render helpers ─────────────────────────────────────────────────────────
//   const renderAttachments = () => {
//     if (!selectedRequisition?.attachments?.length) return null;
//     return (
//       <Card
//         size="small"
//         title={<Space><PaperClipOutlined />Attachments ({selectedRequisition.attachments.length})</Space>}
//         style={{ marginBottom: '16px' }}
//       >
//         <List
//           dataSource={selectedRequisition.attachments}
//           renderItem={(attachment) => (
//             <List.Item
//               key={attachment._id}
//               actions={[
//                 canPreviewFile(attachment.mimetype) && (
//                   <Tooltip title="Preview" key="preview">
//                     <Button size="small" type="link" icon={<EyeOutlined />}
//                       onClick={() => handlePreviewAttachment(attachment)}>
//                       Preview
//                     </Button>
//                   </Tooltip>
//                 ),
//                 <Tooltip title="Download" key="download">
//                   <Button size="small" type="link" icon={<DownloadOutlined />}
//                     loading={downloadingAttachment === attachment._id}
//                     onClick={() => handleDownloadAttachment(attachment)}>
//                     Download
//                   </Button>
//                 </Tooltip>
//               ].filter(Boolean)}
//             >
//               <List.Item.Meta
//                 avatar={getFileIcon(attachment.mimetype)}
//                 title={
//                   <Space>
//                     <Text strong>{attachment.name}</Text>
//                     {canPreviewFile(attachment.mimetype) && <Tag color="blue" size="small">Can Preview</Tag>}
//                   </Space>
//                 }
//                 description={
//                   <Space split="|">
//                     <Text type="secondary">{formatFileSize(attachment.size)}</Text>
//                     <Text type="secondary">{new Date(attachment.uploadedAt).toLocaleDateString('en-GB')}</Text>
//                   </Space>
//                 }
//               />
//             </List.Item>
//           )}
//         />
//       </Card>
//     );
//   };

//   const renderApprovalChain = (approvalChain) => {
//     if (!approvalChain?.length) return <Text type="secondary">No approval chain available</Text>;
//     return (
//       <Timeline>
//         {approvalChain.map((step, index) => {
//           const color = step.status === 'approved' ? 'green' : step.status === 'rejected' ? 'red' : 'blue';
//           const dot   = step.status === 'approved'
//             ? <CheckCircleOutlined />
//             : step.status === 'rejected'
//             ? <CloseCircleOutlined />
//             : <ClockCircleOutlined />;
//           return (
//             <Timeline.Item key={index} color={color} dot={dot}>
//               <Text strong>Level {step.level}: {step.approver?.name}</Text><br />
//               <Text type="secondary">{step.approver?.role} — {step.approver?.department}</Text><br />
//               {step.status === 'pending'   && <Tag color="orange">Currently Reviewing</Tag>}
//               {step.status === 'approved'  && (
//                 <>
//                   <Tag color="green">Approved</Tag>
//                   {step.actionDate && <Text type="secondary"> on {new Date(step.actionDate).toLocaleDateString('en-GB')}</Text>}
//                 </>
//               )}
//               {step.status === 'rejected'  && (
//                 <>
//                   <Tag color="red">Rejected</Tag>
//                   {step.actionDate && <Text type="secondary"> on {new Date(step.actionDate).toLocaleDateString('en-GB')}</Text>}
//                 </>
//               )}
//               {step.comments && <div style={{ marginTop: 4 }}><Text italic>"{step.comments}"</Text></div>}
//             </Timeline.Item>
//           );
//         })}
//       </Timeline>
//     );
//   };

//   const renderCancellationCard = () => {
//     if (selectedRequisition?.status !== 'pending_cancellation') return null;
//     const cr = selectedRequisition.cancellationRequest;
//     if (!cr) return null;
//     return (
//       <Card
//         size="small"
//         title={<Space><StopOutlined style={{ color: '#ff4d4f' }} /><Text strong style={{ color: '#ff4d4f' }}>Cancellation Request</Text></Space>}
//         style={{ marginBottom: '16px', borderColor: '#ff4d4f' }}
//         headStyle={{ backgroundColor: '#fff2f0' }}
//       >
//         <Descriptions column={2} size="small" style={{ marginBottom: '12px' }}>
//           <Descriptions.Item label="Requested On">
//             {new Date(cr.requestedAt).toLocaleString('en-GB')}
//           </Descriptions.Item>
//           <Descriptions.Item label="Previous Status">
//             <Tag>{cr.previousStatus?.replace(/_/g, ' ')}</Tag>
//           </Descriptions.Item>
//           <Descriptions.Item label="Reason" span={2}>
//             <Text italic>"{cr.reason}"</Text>
//           </Descriptions.Item>
//         </Descriptions>
//         <Text strong style={{ fontSize: '12px', color: '#666' }}>Approval Progress</Text>
//         <Timeline style={{ marginTop: '12px', marginBottom: 0 }}>
//           {cr.approvalChain?.map((step, i) => (
//             <Timeline.Item
//               key={i}
//               color={step.status === 'approved' ? 'green' : step.status === 'rejected' ? 'red' : 'gray'}
//               dot={
//                 step.status === 'approved' ? <CheckCircleOutlined /> :
//                 step.status === 'rejected' ? <CloseCircleOutlined /> :
//                 <ClockCircleOutlined />
//               }
//             >
//               <Text strong>Level {step.level}: {step.approver.name}</Text>
//               &nbsp;<Text type="secondary" style={{ fontSize: '12px' }}>({step.approver.role})</Text><br />
//               <Tag color={step.status === 'approved' ? 'green' : step.status === 'rejected' ? 'red' : 'default'}>
//                 {step.status.toUpperCase()}
//               </Tag>
//               {step.comments && <Text type="secondary" italic style={{ marginLeft: 8 }}>"{step.comments}"</Text>}
//               {step.actionDate && (
//                 <Text type="secondary" style={{ fontSize: '11px', display: 'block' }}>
//                   {new Date(step.actionDate).toLocaleDateString('en-GB')}
//                 </Text>
//               )}
//             </Timeline.Item>
//           ))}
//         </Timeline>
//       </Card>
//     );
//   };

//   const renderCancellationActionCard = () => {
//     if (selectedRequisition?.status !== 'pending_cancellation') return null;
//     const cr = selectedRequisition.cancellationRequest;
//     if (!cr) return null;

//     const myStep = cr.approvalChain?.find(
//       s => s.approver.email?.toLowerCase() === user?.email?.toLowerCase() && s.status === 'pending'
//     );
//     if (!myStep) return null;

//     const myIndex     = cr.approvalChain.indexOf(myStep);
//     const priorApproved = cr.approvalChain
//       .slice(0, myIndex)
//       .every(s => s.status === 'approved');
//     if (!priorApproved) return null;

//     return (
//       <Card
//         size="small"
//         title={<Space><StopOutlined style={{ color: '#ff4d4f' }} /><Text strong>Cancellation Decision — Your Action Required</Text></Space>}
//         style={{ marginBottom: '16px', borderColor: '#ff4d4f' }}
//         headStyle={{ backgroundColor: '#fff2f0' }}
//       >
//         <Alert
//           message="This employee has requested to cancel their PR"
//           description={`Reason: "${cr.reason}"`}
//           type="warning"
//           showIcon
//           style={{ marginBottom: '16px' }}
//         />
//         <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
//           <div>
//             <Text strong style={{ display: 'block', marginBottom: '8px' }}>Your Comments *</Text>
//             <TextArea
//               rows={3}
//               placeholder="Provide a reason for your decision..."
//               value={cancellationComments}
//               onChange={e => setCancellationComments(e.target.value)}
//               showCount
//               maxLength={300}
//             />
//           </div>
//           <Space>
//             <Button
//               type="primary"
//               icon={<CheckCircleOutlined />}
//               loading={cancellationActionLoading}
//               onClick={() => handleCancellationDecision('approved')}
//               style={{ backgroundColor: '#ff4d4f', borderColor: '#ff4d4f' }}
//             >
//               Approve Cancellation
//             </Button>
//             <Button
//               icon={<CloseCircleOutlined />}
//               loading={cancellationActionLoading}
//               onClick={() => handleCancellationDecision('rejected')}
//             >
//               Reject — Keep PR Active
//             </Button>
//           </Space>
//         </div>
//       </Card>
//     );
//   };

//   // ── Columns ────────────────────────────────────────────────────────────────
//   const columns = [
//     {
//       title: 'Req. Number',
//       dataIndex: 'requisitionNumber',
//       key: 'requisitionNumber',
//       render: (n) => <Text code>{n}</Text>,
//       width: 140
//     },
//     {
//       title: 'Title',
//       dataIndex: 'title',
//       key: 'title',
//       ellipsis: true,
//       width: 180
//     },
//     {
//       title: 'Requester',
//       key: 'requester',
//       render: (_, r) => (
//         <div>
//           <Text strong>{r.employee?.fullName}</Text><br />
//           <Text type="secondary" style={{ fontSize: '12px' }}>{r.department}</Text>
//         </div>
//       ),
//       width: 150
//     },
//     {
//       title: 'Category',
//       dataIndex: 'itemCategory',
//       key: 'itemCategory',
//       render: (c) => <Tag color="blue">{c}</Tag>,
//       width: 130
//     },
//     {
//       title: 'Assigned Buyer',
//       key: 'assignedBuyer',
//       render: (_, r) => {
//         // buyer may be under supplyChainReview.assignedBuyer (populated) or a top-level field
//         const buyer = r.supplyChainReview?.assignedBuyer || r.assignedBuyer;
//         return buyer
//           ? <div><Text strong>{buyer.fullName || buyer.name}</Text><br /><Text type="secondary" style={{ fontSize: '12px' }}>{buyer.email}</Text></div>
//           : <Text type="secondary">Not assigned</Text>;
//       },
//       width: 150
//     },
//     {
//       title: 'Payment',
//       dataIndex: 'paymentMethod',
//       key: 'paymentMethod',
//       render: (v) => v ? <Tag color="gold">{v}</Tag> : <Text type="secondary">N/A</Text>,
//       width: 100
//     },
//     {
//       title: 'Budget Code',
//       key: 'budgetCode',
//       render: (_, r) => {
//         const code = r.financeVerification?.budgetCodeVerified
//           || r.budgetCodeInfo?.code
//           || null;
//         return code ? <Tag color="purple">{code}</Tag> : <Text type="secondary">N/A</Text>;
//       },
//       width: 120
//     },
//     {
//       title: 'Items',
//       key: 'itemCount',
//       render: (_, r) => r.items?.length || 0,
//       align: 'center',
//       width: 60
//     },
//     {
//       title: 'Budget (XAF)',
//       dataIndex: 'budgetXAF',
//       key: 'budgetXAF',
//       render: (v) => v ? Number(v).toLocaleString() : 'N/A',
//       align: 'right',
//       width: 120
//     },
//     {
//       title: 'Urgency',
//       dataIndex: 'urgency',
//       key: 'urgency',
//       render: (u) => getUrgencyTag(u),
//       width: 90
//     },
//     {
//       title: 'Submitted',
//       dataIndex: 'createdAt',
//       key: 'createdAt',
//       render: (d) => new Date(d).toLocaleDateString('en-GB'),
//       width: 100
//     },
//     {
//       title: 'Expected',
//       dataIndex: 'expectedDate',
//       key: 'expectedDate',
//       render: (d) => new Date(d).toLocaleDateString('en-GB'),
//       width: 100
//     },
//     {
//       title: 'Status',
//       dataIndex: 'status',
//       key: 'status',
//       render: (s) => getStatusTag(s),
//       width: 200
//     },
//     {
//       title: 'Actions',
//       key: 'actions',
//       render: (_, r) => (
//         <Button size="small" icon={<EyeOutlined />} onClick={() => handleViewDetails(r)}>
//           Review
//         </Button>
//       ),
//       width: 90
//     }
//   ];

//   // Cancellation table uses a simpler column set
//   const cancellationColumns = [
//     ...columns.slice(0, 3),   // Req Number, Title, Requester
//     {
//       title: 'Cancellation Reason',
//       key: 'cancellationReason',
//       render: (_, r) => (
//         <Text type="secondary" ellipsis style={{ maxWidth: 200 }}>
//           {r.cancellationRequest?.reason || '—'}
//         </Text>
//       ),
//       width: 200
//     },
//     {
//       title: 'Requested On',
//       key: 'requestedOn',
//       render: (_, r) => r.cancellationRequest?.requestedAt
//         ? new Date(r.cancellationRequest.requestedAt).toLocaleDateString('en-GB')
//         : '—',
//       width: 110
//     },
//     columns[columns.length - 1]  // Actions
//   ];

//   const filteredData = getFilteredRequisitions();

//   // ── Render ─────────────────────────────────────────────────────────────────
//   return (
//     <div style={{ padding: '24px' }}>
//       <Card>
//         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
//           <Title level={2} style={{ margin: 0 }}>
//             <ShoppingCartOutlined /> Purchase Requisition Approvals
//           </Title>
//           <Space>
//             <Button icon={<ReloadOutlined />} onClick={() => { fetchRequisitions(); fetchCancellationRequests(); }} loading={loading}>
//               Refresh
//             </Button>
//           </Space>
//         </div>

//         <Row gutter={16} style={{ marginBottom: '24px' }}>
//           <Col span={5}>
//             <Statistic title="Pending Approval"  value={stats.pending}       prefix={<ClockCircleOutlined />}   valueStyle={{ color: '#faad14' }} />
//           </Col>
//           <Col span={5}>
//             <Statistic title="Approved by You"   value={stats.approved}      prefix={<CheckCircleOutlined />}   valueStyle={{ color: '#52c41a' }} />
//           </Col>
//           <Col span={5}>
//             <Statistic title="Rejected"           value={stats.rejected}      prefix={<CloseCircleOutlined />}   valueStyle={{ color: '#f5222d' }} />
//           </Col>
//           <Col span={5}>
//             <Statistic title="Total Reviewed"     value={stats.total}         prefix={<FileTextOutlined />}      valueStyle={{ color: '#1890ff' }} />
//           </Col>
//           <Col span={4}>
//             <Statistic title="Cancellations"      value={stats.cancellations} prefix={<StopOutlined />}          valueStyle={{ color: '#fa541c' }} />
//           </Col>
//         </Row>

//         <Tabs activeKey={activeTab} onChange={setActiveTab}>
//           <TabPane
//             tab={<Badge count={stats.pending} size="small"><span><ClockCircleOutlined /> Pending ({stats.pending})</span></Badge>}
//             key="pending"
//           >
//             {filteredData.length === 0 ? (
//               <Alert message="No Pending Approvals" description="No purchase requisitions awaiting your approval." type="info" showIcon />
//             ) : (
//               <Table columns={columns} dataSource={filteredData} rowKey="_id" loading={loading}
//                 pagination={{ pageSize: 10, showTotal: (t, r) => `${r[0]}-${r[1]} of ${t}` }}
//                 scroll={{ x: 'max-content' }} />
//             )}
//           </TabPane>

//           <TabPane tab={<span><CheckCircleOutlined /> Approved ({stats.approved})</span>} key="approved">
//             <Table columns={columns} dataSource={filteredData} rowKey="_id" loading={loading}
//               pagination={{ pageSize: 10, showTotal: (t, r) => `${r[0]}-${r[1]} of ${t}` }}
//               scroll={{ x: 'max-content' }} />
//           </TabPane>

//           <TabPane tab={<span><CloseCircleOutlined /> Rejected ({stats.rejected})</span>} key="rejected">
//             <Table columns={columns} dataSource={filteredData} rowKey="_id" loading={loading}
//               pagination={{ pageSize: 10, showTotal: (t, r) => `${r[0]}-${r[1]} of ${t}` }}
//               scroll={{ x: 'max-content' }} />
//           </TabPane>

//           <TabPane
//             tab={<Badge count={stats.cancellations} size="small"><span><StopOutlined /> Cancellations ({stats.cancellations})</span></Badge>}
//             key="cancellations"
//           >
//             {cancellationLoading ? (
//               <div style={{ textAlign: 'center', padding: '40px' }}><Spin /></div>
//             ) : cancellationRequests.length === 0 ? (
//               <Alert message="No Cancellation Requests" description="No cancellation requests awaiting your decision." type="info" showIcon />
//             ) : (
//               <Table columns={cancellationColumns} dataSource={cancellationRequests} rowKey="_id"
//                 loading={cancellationLoading}
//                 pagination={{ pageSize: 10 }} scroll={{ x: 'max-content' }} />
//             )}
//           </TabPane>
//         </Tabs>
//       </Card>

//       {/* Detail Drawer */}
//       <Drawer
//         title={<Space><FileTextOutlined />Purchase Requisition Review</Space>}
//         placement="right"
//         width={900}
//         open={detailDrawerVisible}
//         onClose={() => { setDetailDrawerVisible(false); setSelectedRequisition(null); resetForm(); }}
//       >
//         {selectedRequisition && (
//           <div>
//             {/* Requisition Info */}
//             <Card size="small" title="Requisition Information" style={{ marginBottom: '16px' }}>
//               <Descriptions column={2} size="small">
//                 <Descriptions.Item label="Requisition Number"><Text code>{selectedRequisition.requisitionNumber}</Text></Descriptions.Item>
//                 <Descriptions.Item label="Status">{getStatusTag(selectedRequisition.status)}</Descriptions.Item>
//                 <Descriptions.Item label="Title">{selectedRequisition.title}</Descriptions.Item>
//                 <Descriptions.Item label="Urgency">{getUrgencyTag(selectedRequisition.urgency)}</Descriptions.Item>
//                 <Descriptions.Item label="Requester">
//                   <div>
//                     <UserOutlined /> {selectedRequisition.employee?.fullName}<br />
//                     <Text type="secondary">{selectedRequisition.employee?.email}</Text><br />
//                     <Text type="secondary">{selectedRequisition.department}</Text>
//                   </div>
//                 </Descriptions.Item>
//                 <Descriptions.Item label="Category"><Tag color="blue">{selectedRequisition.itemCategory}</Tag></Descriptions.Item>
//                 <Descriptions.Item label="Budget (XAF)">
//                   <DollarOutlined /> {selectedRequisition.budgetXAF ? Number(selectedRequisition.budgetXAF).toLocaleString() : 'N/A'}
//                 </Descriptions.Item>
//                 <Descriptions.Item label="Expected Date">
//                   <CalendarOutlined /> {new Date(selectedRequisition.expectedDate).toLocaleDateString('en-GB')}
//                 </Descriptions.Item>
//                 <Descriptions.Item label="Delivery Location" span={2}>
//                   {selectedRequisition.deliveryLocation}
//                 </Descriptions.Item>
//                 {selectedRequisition.budgetCodeInfo && (
//                   <Descriptions.Item label="Budget Code" span={2}>
//                     <Tag color="purple">{selectedRequisition.budgetCodeInfo.code}</Tag>
//                     {' '}{selectedRequisition.budgetCodeInfo.name}
//                     {' — '}
//                     <Text type="secondary">
//                       XAF {Number(selectedRequisition.budgetCodeInfo.availableAtSubmission).toLocaleString()} available at submission
//                     </Text>
//                   </Descriptions.Item>
//                 )}
//               </Descriptions>
//             </Card>

//             {/* Items */}
//             <Card size="small" title={`Items Requested (${selectedRequisition.items?.length || 0})`} style={{ marginBottom: '16px' }}>
//               <Table
//                 columns={[
//                   { title: 'Code',        dataIndex: 'code',           key: 'code',           width: 90 },
//                   { title: 'Description', dataIndex: 'description',    key: 'description' },
//                   { title: 'Qty',         dataIndex: 'quantity',       key: 'quantity',       width: 60,  align: 'center' },
//                   { title: 'Unit',        dataIndex: 'measuringUnit',  key: 'measuringUnit',  width: 80,  align: 'center' },
//                   {
//                     title: 'Est. Price',
//                     key: 'price',
//                     width: 110,
//                     align: 'right',
//                     render: (_, r) => r.estimatedPrice ? `XAF ${Number(r.estimatedPrice).toLocaleString()}` : '—'
//                   }
//                 ]}
//                 dataSource={selectedRequisition.items || []}
//                 pagination={false}
//                 size="small"
//                 rowKey={(_, i) => i}
//               />
//             </Card>

//             {/* Attachments */}
//             {renderAttachments()}

//             {/* Cancellation info */}
//             {renderCancellationCard()}

//             {/* Business Justification */}
//             <Card size="small" title="Business Justification" style={{ marginBottom: '16px' }}>
//               <div style={{ marginBottom: '12px' }}>
//                 <Text strong>Purchase Justification:</Text><br />
//                 <Text>{selectedRequisition.justificationOfPurchase || <Text type="secondary">Not provided yet</Text>}</Text>
//               </div>
//               {selectedRequisition.justificationOfPreferredSupplier && (
//                 <div>
//                   <Text strong>Preferred Supplier Justification:</Text><br />
//                   <Text>{selectedRequisition.justificationOfPreferredSupplier}</Text>
//                 </div>
//               )}
//             </Card>

//             {/* Approval Progress */}
//             <Card size="small" title="Approval Progress" style={{ marginBottom: '16px' }}>
//               {renderApprovalChain(selectedRequisition.approvalChain)}
//             </Card>

//             {/* Supervisor decision — only when it's this user's turn */}
//             {selectedRequisition.status === 'pending_supervisor' && (() => {
//               const myStep = selectedRequisition.approvalChain?.find(
//                 s => s.approver?.email?.toLowerCase() === user?.email?.toLowerCase() && s.status === 'pending'
//               );
//               if (!myStep) return (
//                 <Alert
//                   message="Awaiting a different approver"
//                   description="This requisition is in the approval chain but is not currently at your step."
//                   type="info" showIcon style={{ marginBottom: '16px' }}
//                 />
//               );
//               return (
//                 <Card size="small" title="Supervisor Decision" style={{ marginBottom: '16px' }}>
//                   <Alert
//                     message="This requisition requires your approval"
//                     description="Please review all items and justification before submitting your decision."
//                     type="warning" showIcon style={{ marginBottom: '16px' }}
//                   />
//                   <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
//                     <div>
//                       <Text strong style={{ display: 'block', marginBottom: '8px' }}>Decision *</Text>
//                       <Select placeholder="Select your decision" style={{ width: '100%' }} value={decision} onChange={setDecision}>
//                         <Option value="approved"><CheckCircleOutlined style={{ color: '#52c41a' }} /> Approve Requisition</Option>
//                         <Option value="rejected"><CloseCircleOutlined style={{ color: '#ff4d4f' }} /> Reject Requisition</Option>
//                       </Select>
//                     </div>
//                     <div>
//                       <Text strong style={{ display: 'block', marginBottom: '8px' }}>Comments *</Text>
//                       <TextArea rows={3} placeholder="Enter your comments... (minimum 10 characters)"
//                         showCount maxLength={500} value={comments} onChange={e => setComments(e.target.value)} />
//                     </div>
//                     <Space>
//                       <Button type="primary" loading={actionLoading} icon={<SendOutlined />} onClick={handleSubmitDecision}>
//                         Submit Decision
//                       </Button>
//                       <Button onClick={resetForm}>Clear Form</Button>
//                     </Space>
//                   </div>
//                 </Card>
//               );
//             })()}

//             {/* Cancellation action */}
//             {renderCancellationActionCard()}
//           </div>
//         )}
//       </Drawer>
//     </div>
//   );
// };

// export default SupervisorPurchaseRequisitions;











// import React, { useState, useEffect } from 'react';
// import { useSelector } from 'react-redux';
// import {
//   Card,
//   Table,
//   Button,
//   Space,
//   Typography,
//   Tag,
//   Alert,
//   Row,
//   Col,
//   Statistic,
//   Modal,
//   Descriptions,
//   Timeline,
//   Input,
//   Select,
//   Tabs,
//   Badge,
//   Drawer,
//   message,
//   List,
//   Tooltip,
//   Spin
// } from 'antd';
// import {
//   ShoppingCartOutlined,
//   EyeOutlined,
//   ClockCircleOutlined,
//   CheckCircleOutlined,
//   CloseCircleOutlined,
//   ReloadOutlined,
//   FileTextOutlined,
//   SendOutlined,
//   UserOutlined,
//   DollarOutlined,
//   CalendarOutlined,
//   ExportOutlined,
//   TeamOutlined,
//   DownloadOutlined,
//   FilePdfOutlined,
//   FileImageOutlined,
//   FileWordOutlined,
//   FileExcelOutlined,
//   FileUnknownOutlined,
//   PaperClipOutlined,
//   StopOutlined
// } from '@ant-design/icons';
// import { purchaseRequisitionAPI } from '../../services/purchaseRequisitionAPI'; 
// import AttachmentDisplay from '../../components/AttachmentDisplay';

// const { Title, Text } = Typography;
// const { TextArea } = Input;
// const { Option } = Select;
// const { TabPane } = Tabs;

// const SupervisorPurchaseRequisitions = () => {
//   const { user } = useSelector((state) => state.auth);
//   const [requisitions, setRequisitions] = useState([]);
//   const [loading, setLoading] = useState(false);
//   const [selectedRequisition, setSelectedRequisition] = useState(null);
//   const [detailDrawerVisible, setDetailDrawerVisible] = useState(false);
//   const [actionLoading, setActionLoading] = useState(false);
//   const [activeTab, setActiveTab] = useState('pending');
//   const [decision, setDecision] = useState('');
//   const [comments, setComments] = useState('');
//   const [downloadingAttachment, setDownloadingAttachment] = useState(null);
//   const [cancellationRequests, setCancellationRequests] = useState([]);
//   const [cancellationLoading, setCancellationLoading] = useState(false);
//   const [cancellationDecision, setCancellationDecision] = useState('');
//   const [cancellationComments, setCancellationComments] = useState('');
//   const [cancellationActionLoading, setCancellationActionLoading] = useState(false);

//   useEffect(() => {
//     fetchRequisitions();
//     fetchCancellationRequests();
//   }, []);

//   const fetchRequisitions = async () => {
//     setLoading(true);
//     try {
//       console.log('Fetching supervisor requisitions...');
//       const response = await purchaseRequisitionAPI.getSupervisorRequisitions();
      
//       if (response.success) {
//         console.log('Fetched requisitions:', response.data);
//         setRequisitions(response.data);
//       } else {
//         message.error('Failed to fetch requisitions');
//         setRequisitions([]);
//       }
//     } catch (error) {
//       console.error('Error fetching requisitions:', error);
//       message.error('Failed to fetch requisitions: ' + (error.response?.data?.message || error.message));
//       setRequisitions([]);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const fetchCancellationRequests = async () => {
//   setCancellationLoading(true);
//   try {
//     const token = localStorage.getItem('token');
//     const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
//     const response = await fetch(`${API_BASE_URL}/purchase-requisitions/cancellation-requests`, {
//       headers: { 'Authorization': `Bearer ${token}` }
//     });
//     const data = await response.json();
//     if (data.success) {
//       setCancellationRequests(data.data || []);
//     }
//   } catch (error) {
//     console.error('Error fetching cancellation requests:', error);
//   } finally {
//     setCancellationLoading(false);
//   }
// };

//   const getStatusTag = (status) => {
//     const statusMap = {
//       'pending_supervisor': { color: 'orange', text: 'Pending Your Approval', icon: <ClockCircleOutlined /> },
//       'pending_supply_chain_review': { color: 'blue', text: 'Supply Chain Review', icon: <ShoppingCartOutlined /> },
//       'supply_chain_approved': { color: 'purple', text: 'Supply Chain Approved', icon: <CheckCircleOutlined /> },
//       'pending_finance': { color: 'gold', text: 'Finance Review', icon: <DollarOutlined /> },
//       'approved': { color: 'green', text: 'Approved', icon: <CheckCircleOutlined /> },
//       'rejected': { color: 'red', text: 'Rejected', icon: <CloseCircleOutlined /> },
//       'in_procurement': { color: 'cyan', text: 'In Procurement', icon: <ShoppingCartOutlined /> },
//       'delivered': { color: 'green', text: 'Delivered', icon: <CheckCircleOutlined /> },
//       'pending_cancellation': { color: 'volcano', text: 'Cancellation Pending', icon: <StopOutlined /> },
//       'cancelled': { color: 'error', text: 'Cancelled', icon: <CloseCircleOutlined /> },
//     };

//     const statusInfo = statusMap[status] || { color: 'default', text: status };
//     return (
//       <Tag color={statusInfo.color} icon={statusInfo.icon}>
//         {statusInfo.text}
//       </Tag>
//     );
//   };

//   const getUrgencyTag = (urgency) => {
//     const urgencyMap = {
//       'Low': 'green',
//       'Medium': 'orange',
//       'High': 'red'
//     };
//     return <Tag color={urgencyMap[urgency] || 'default'}>{urgency}</Tag>;
//   };

//   const resetForm = () => {
//     setDecision('');
//     setComments('');
//   };

//   const handleRequisitionAction = async (requisitionId, action) => {
//     setActionLoading(true);
//     try {
//       console.log(`Processing ${action} for requisition:`, requisitionId);
      
//       const response = await purchaseRequisitionAPI.processSupervisorDecision(
//         requisitionId, 
//         action, 
//         comments
//       );
      
//       if (response.success) {
//         const actionText = action === 'approved' ? 'approved' : 'rejected';
//         message.success(`Purchase requisition ${actionText} successfully!`);
        
//         setDetailDrawerVisible(false);
//         resetForm();
//         await fetchRequisitions(); // Refresh the list
//       } else {
//         message.error(response.message || `Failed to ${action} requisition`);
//       }
//     } catch (error) {
//       console.error(`Error ${action}ing requisition:`, error);
//       message.error(`Failed to ${action} requisition: ` + (error.response?.data?.message || error.message));
//     } finally {
//       setActionLoading(false);
//     }
//   };

//   const handleViewDetails = async (requisition) => {
//     try {
//       // Fetch full details of the requisition
//       const response = await purchaseRequisitionAPI.getRequisition(requisition._id);
//       if (response.success) {
//         console.log('📎 Fetched requisition with attachments:', response.data.attachments);
//         setSelectedRequisition(response.data);
//         setDetailDrawerVisible(true);
//         resetForm();
//       } else {
//         message.error('Failed to load requisition details');
//       }
//     } catch (error) {
//       console.error('Error fetching requisition details:', error);
//       message.error('Failed to load requisition details');
//     }
//   };

//   // ✅ NEW: Get file icon based on mimetype
//   const getFileIcon = (mimetype) => {
//     if (!mimetype) return <FileUnknownOutlined />;
    
//     if (mimetype.includes('pdf')) return <FilePdfOutlined style={{ color: '#ff4d4f' }} />;
//     if (mimetype.includes('image')) return <FileImageOutlined style={{ color: '#52c41a' }} />;
//     if (mimetype.includes('word') || mimetype.includes('document')) return <FileWordOutlined style={{ color: '#1890ff' }} />;
//     if (mimetype.includes('excel') || mimetype.includes('spreadsheet')) return <FileExcelOutlined style={{ color: '#52c41a' }} />;
    
//     return <FileUnknownOutlined />;
//   };

//   // ✅ NEW: Format file size
//   const formatFileSize = (bytes) => {
//     if (!bytes) return 'Unknown size';
//     if (bytes < 1024) return bytes + ' B';
//     if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
//     return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
//   };

//   // ✅ NEW: Check if file can be previewed
//   const canPreviewFile = (mimetype) => {
//     if (!mimetype) return false;
//     return mimetype.includes('pdf') || mimetype.includes('image');
//   };

//   // ✅ NEW: Handle attachment download
//   const handleDownloadAttachment = async (attachment) => {
//     if (!selectedRequisition?._id || !attachment._id) {
//       message.error('Invalid attachment information');
//       return;
//     }

//     setDownloadingAttachment(attachment._id);

//     try {
//       const token = localStorage.getItem('token');
//       const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

//       console.log('📥 Downloading attachment:', {
//         requisitionId: selectedRequisition._id,
//         attachmentId: attachment._id,
//         name: attachment.name
//       });

//       const response = await fetch(
//         `${API_BASE_URL}/purchase-requisitions/${selectedRequisition._id}/attachments/${attachment._id}/download`,
//         {
//           method: 'GET',
//           headers: {
//             'Authorization': `Bearer ${token}`
//           }
//         }
//       );

//       if (!response.ok) {
//         const error = await response.json();
//         throw new Error(error.message || 'Failed to download file');
//       }

//       // Get filename from Content-Disposition header or use attachment name
//       const contentDisposition = response.headers.get('Content-Disposition');
//       let filename = attachment.name || 'attachment';
      
//       if (contentDisposition) {
//         const filenameMatch = contentDisposition.match(/filename="?(.+)"?/i);
//         if (filenameMatch) {
//           filename = filenameMatch[1];
//         }
//       }

//       // Get the blob
//       const blob = await response.blob();

//       // Create download link
//       const url = window.URL.createObjectURL(blob);
//       const link = document.createElement('a');
//       link.href = url;
//       link.download = filename;
//       document.body.appendChild(link);
//       link.click();
//       document.body.removeChild(link);
      
//       // Clean up
//       window.URL.revokeObjectURL(url);

//       message.success(`Downloaded: ${filename}`);
//     } catch (error) {
//       console.error('❌ Download error:', error);
//       message.error(error.message || 'Failed to download attachment');
//     } finally {
//       setDownloadingAttachment(null);
//     }
//   };

//   // ✅ NEW: Handle attachment preview
//   const handlePreviewAttachment = async (attachment) => {
//     if (!selectedRequisition?._id || !attachment._id) {
//       message.error('Invalid attachment information');
//       return;
//     }

//     if (!canPreviewFile(attachment.mimetype)) {
//       message.info('This file type cannot be previewed. Downloading instead...');
//       handleDownloadAttachment(attachment);
//       return;
//     }

//     try {
//       const token = localStorage.getItem('token');
//       const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

//       console.log('👁️ Previewing attachment:', {
//         requisitionId: selectedRequisition._id,
//         attachmentId: attachment._id,
//         name: attachment.name
//       });

//       // Open in new tab with token
//       window.open(
//         `${API_BASE_URL}/purchase-requisitions/${selectedRequisition._id}/attachments/${attachment._id}/preview?token=${token}`,
//         '_blank'
//       );
//     } catch (error) {
//       console.error('❌ Preview error:', error);
//       message.error('Failed to preview attachment');
//     }
//   };

//   // ✅ NEW: Render attachments section
//   const renderAttachments = () => {
//     if (!selectedRequisition?.attachments || selectedRequisition.attachments.length === 0) {
//       return null;
//     }

//     return (
//       <Card 
//         size="small" 
//         title={
//           <Space>
//             <PaperClipOutlined />
//             Attachments ({selectedRequisition.attachments.length})
//           </Space>
//         } 
//         style={{ marginBottom: '16px' }}
//       >
//         <List
//           dataSource={selectedRequisition.attachments}
//           renderItem={(attachment) => (
//             <List.Item
//               key={attachment._id}
//               actions={[
//                 canPreviewFile(attachment.mimetype) && (
//                   <Tooltip title="Preview">
//                     <Button
//                       size="small"
//                       type="link"
//                       icon={<EyeOutlined />}
//                       onClick={() => handlePreviewAttachment(attachment)}
//                     >
//                       Preview
//                     </Button>
//                   </Tooltip>
//                 ),
//                 <Tooltip title="Download">
//                   <Button
//                     size="small"
//                     type="link"
//                     icon={<DownloadOutlined />}
//                     loading={downloadingAttachment === attachment._id}
//                     onClick={() => handleDownloadAttachment(attachment)}
//                   >
//                     Download
//                   </Button>
//                 </Tooltip>
//               ].filter(Boolean)}
//             >
//               <List.Item.Meta
//                 avatar={getFileIcon(attachment.mimetype)}
//                 title={
//                   <Space>
//                     <Text strong>{attachment.name}</Text>
//                     {canPreviewFile(attachment.mimetype) && (
//                       <Tag color="blue" size="small">Can Preview</Tag>
//                     )}
//                   </Space>
//                 }
//                 description={
//                   <Space split="|">
//                     <Text type="secondary">{formatFileSize(attachment.size)}</Text>
//                     <Text type="secondary">
//                       {new Date(attachment.uploadedAt).toLocaleDateString('en-GB')}
//                     </Text>
//                   </Space>
//                 }
//               />
//             </List.Item>
//           )}
//         />
//       </Card>
//     );
//   };

//   const getFilteredRequisitions = () => {
//     switch (activeTab) {
//       case 'pending':
//         return requisitions.filter(r => r.status === 'pending_supervisor');
//       case 'approved':
//         return requisitions.filter(r => 
//           ['pending_supply_chain_review', 'supply_chain_approved', 'pending_finance', 'approved', 'in_procurement', 'delivered'].includes(r.status)
//         );
//       case 'rejected':
//         return requisitions.filter(r => r.status === 'rejected');
//       default:
//         return requisitions;
//     }
//   };

//   const handleSubmitDecision = () => {
//     if (!decision) {
//       message.error('Please select your decision');
//       return;
//     }
//     if (!comments || comments.trim().length < 10) {
//       message.error('Please provide meaningful comments (at least 10 characters)');
//       return;
//     }

//     Modal.confirm({
//       title: `Confirm ${decision === 'approved' ? 'Approval' : 'Rejection'}`,
//       content: `Are you sure you want to ${decision === 'approved' ? 'approve' : 'reject'} this purchase requisition?`,
//       onOk: () => handleRequisitionAction(selectedRequisition._id, decision),
//     });
//   };

//   const handleCancellationDecision = async (decision) => {
//   if (!cancellationComments || cancellationComments.trim().length < 5) {
//     message.error('Please provide a comment (minimum 5 characters)');
//     return;
//   }

//   Modal.confirm({
//     title: `Confirm Cancellation ${decision === 'approved' ? 'Approval' : 'Rejection'}`,
//     content: decision === 'approved'
//       ? 'Approving will forward the cancellation to the next approver in the chain.'
//       : 'Rejecting will immediately restore the PR to its previous active status.',
//     onOk: async () => {
//       setCancellationActionLoading(true);
//       try {
//         const token = localStorage.getItem('token');
//         const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
//         const response = await fetch(
//           `${API_BASE_URL}/purchase-requisitions/${selectedRequisition._id}/process-cancellation`,
//           {
//             method: 'POST',
//             headers: {
//               'Authorization': `Bearer ${token}`,
//               'Content-Type': 'application/json'
//             },
//             body: JSON.stringify({ decision, comments: cancellationComments.trim() })
//           }
//         );
//         const data = await response.json();
//         if (data.success) {
//           message.success(data.message);
//           setDetailDrawerVisible(false);
//           setSelectedRequisition(null);
//           setCancellationDecision('');
//           setCancellationComments('');
//           await fetchRequisitions();
//           await fetchCancellationRequests();
//         } else {
//           message.error(data.message || 'Failed to process cancellation');
//         }
//       } catch (error) {
//         message.error('Failed to process cancellation');
//       } finally {
//         setCancellationActionLoading(false);
//       }
//     }
//   });
// };


//   const columns = [
//     {
//       title: 'Requisition Number',
//       dataIndex: 'requisitionNumber',
//       key: 'requisitionNumber',
//       render: (number) => <Text code>{number}</Text>,
//       width: 150
//     },
//     {
//       title: 'Title',
//       dataIndex: 'title',
//       key: 'title',
//       ellipsis: true,
//       width: 200
//     },
//     {
//       title: 'Requester',
//       key: 'requester',
//       render: (_, record) => (
//         <div>
//           <Text strong>{record.employee?.fullName}</Text>
//           <br />
//           <Text type="secondary" style={{ fontSize: '12px' }}>{record.department}</Text>
//         </div>
//       ),
//       width: 150
//     },
//     {
//       title: 'Category',
//       dataIndex: 'itemCategory',
//       key: 'itemCategory',
//       render: (category) => <Tag color="blue">{category}</Tag>,
//       width: 130
//     },
//     {
//       title: 'Assigned Buyer',
//       key: 'assignedBuyer',
//       render: (_, record) => (
//         record.assignedBuyer ? (
//           <span>
//             <Text strong>{record.assignedBuyer.name}</Text>
//             <br />
//             <Text type="secondary" style={{ fontSize: '12px' }}>{record.assignedBuyer.email}</Text>
//           </span>
//         ) : <Text type="secondary">Not assigned</Text>
//       ),
//       width: 150
//     },
//     {
//       title: 'Payment Method',
//       key: 'paymentMethod',
//       render: (_, record) => (
//         record.paymentMethod ? <Tag color="gold">{record.paymentMethod}</Tag> : <Text type="secondary">N/A</Text>
//       ),
//       width: 120
//     },
//     {
//       title: 'Budget Code',
//       key: 'budgetCode',
//       render: (_, record) => (
//         record.financeVerification?.budgetCode ? <Tag color="purple">{record.financeVerification.budgetCode}</Tag> : <Text type="secondary">N/A</Text>
//       ),
//       width: 120
//     },
//     {
//       title: 'Items',
//       key: 'itemCount',
//       render: (_, record) => record.items?.length || 0,
//       align: 'center',
//       width: 70
//     },
//     {
//       title: 'Budget (XAF)',
//       dataIndex: 'budgetXAF',
//       key: 'budgetXAF',
//       render: (amount) => amount ? Number(amount).toLocaleString() : 'N/A',
//       align: 'right',
//       width: 120
//     },
//     {
//       title: 'Urgency',
//       dataIndex: 'urgency',
//       key: 'urgency',
//       render: (urgency) => getUrgencyTag(urgency),
//       width: 100
//     },
//     {
//       title: 'Submitted',
//       dataIndex: 'createdAt',
//       key: 'createdAt',
//       render: (date) => new Date(date).toLocaleDateString('en-GB'),
//       width: 100
//     },
//     {
//       title: 'Expected',
//       dataIndex: 'expectedDate',
//       key: 'expectedDate',
//       render: (date) => new Date(date).toLocaleDateString('en-GB'),
//       width: 100
//     },
//     {
//       title: 'Status',
//       dataIndex: 'status',
//       key: 'status',
//       render: (status) => getStatusTag(status),
//       width: 180
//     },
//     {
//       title: 'Actions',
//       key: 'actions',
//       render: (_, record) => (
//         <Button 
//           size="small" 
//           icon={<EyeOutlined />}
//           onClick={() => handleViewDetails(record)}
//         >
//           Review
//         </Button>
//       ),
//       width: 100
//     }
//   ];

//   const filteredData = getFilteredRequisitions();
//   const stats = {
//     pending: requisitions.filter(r => r.status === 'pending_supervisor').length,
//     approved: requisitions.filter(r =>
//       ['pending_supply_chain_review', 'supply_chain_approved', 'pending_finance', 'approved', 'in_procurement', 'delivered'].includes(r.status)
//     ).length,
//     rejected: requisitions.filter(r => r.status === 'rejected').length,
//     total: requisitions.length,
//     cancellations: cancellationRequests.length,   // ← NEW
//   };

//   const renderApprovalChain = (approvalChain) => {
//     if (!approvalChain || approvalChain.length === 0) {
//       return <Text type="secondary">No approval chain available</Text>;
//     }

//     return (
//       <Timeline>
//         {approvalChain.map((step, index) => {
//           let color = 'gray';
//           let icon = <ClockCircleOutlined />;

//           if (step.status === 'approved') {
//             color = 'green';
//             icon = <CheckCircleOutlined />;
//           } else if (step.status === 'rejected') {
//             color = 'red';
//             icon = <CloseCircleOutlined />;
//           } else if (step.status === 'pending') {
//             color = 'blue';
//             icon = <ClockCircleOutlined />;
//           }

//           return (
//             <Timeline.Item key={index} color={color} dot={icon}>
//               <div>
//                 <Text strong>Level {step.level}: {step.approver?.name}</Text>
//                 <br />
//                 <Text type="secondary">{step.approver?.role} - {step.approver?.department}</Text>
//                 <br />
//                 {step.status === 'pending' && (
//                   <Tag color="orange">Currently Reviewing</Tag>
//                 )}
//                 {step.status === 'approved' && (
//                   <>
//                     <Tag color="green">Approved</Tag>
//                     {step.actionDate && (
//                       <Text type="secondary"> on {new Date(step.actionDate).toLocaleDateString('en-GB')}</Text>
//                     )}
//                   </>
//                 )}
//                 {step.status === 'rejected' && (
//                   <>
//                     <Tag color="red">Rejected</Tag>
//                     {step.actionDate && (
//                       <Text type="secondary"> on {new Date(step.actionDate).toLocaleDateString('en-GB')}</Text>
//                     )}
//                   </>
//                 )}
//                 {step.comments && (
//                   <div style={{ marginTop: 4 }}>
//                     <Text italic>"{step.comments}"</Text>
//                   </div>
//                 )}
//               </div>
//             </Timeline.Item>
//           );
//         })}
//       </Timeline>
//     );
//   };

//   return (
//     <div style={{ padding: '24px' }}>
//       <Card>
//         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
//           <Title level={2} style={{ margin: 0 }}>
//             <ShoppingCartOutlined /> Purchase Requisition Approvals
//           </Title>
//           <Space>
//             <Button 
//               icon={<ReloadOutlined />}
//               onClick={fetchRequisitions}
//               loading={loading}
//             >
//               Refresh
//             </Button>
//             <Button icon={<ExportOutlined />}>
//               Export
//             </Button>
//           </Space>
//         </div>

//         {/* Statistics */}
//         <Row gutter={16} style={{ marginBottom: '24px' }}>
//           <Col span={6}>
//             <Statistic
//               title="Pending Approval"
//               value={stats.pending}
//               prefix={<ClockCircleOutlined />}
//               valueStyle={{ color: '#faad14' }}
//             />
//           </Col>
//           <Col span={6}>
//             <Statistic
//               title="Approved by You"
//               value={stats.approved}
//               prefix={<CheckCircleOutlined />}
//               valueStyle={{ color: '#52c41a' }}
//             />
//           </Col>
//           <Col span={6}>
//             <Statistic
//               title="Rejected"
//               value={stats.rejected}
//               prefix={<CloseCircleOutlined />}
//               valueStyle={{ color: '#f5222d' }}
//             />
//           </Col>
//           <Col span={6}>
//             <Statistic
//               title="Total Reviewed"
//               value={stats.total}
//               prefix={<FileTextOutlined />}
//               valueStyle={{ color: '#1890ff' }}
//             />
//           </Col>
//         </Row>

//         <Tabs activeKey={activeTab} onChange={setActiveTab}>
//           <TabPane 
//             tab={
//               <Badge count={stats.pending} size="small">
//                 <span><ClockCircleOutlined /> Pending Approval ({stats.pending})</span>
//               </Badge>
//             } 
//             key="pending"
//           >
//             {filteredData.length === 0 ? (
//               <Alert
//                 message="No Pending Approvals"
//                 description="There are no purchase requisitions waiting for your approval at the moment."
//                 type="info"
//                 showIcon
//               />
//             ) : (
//               <Table
//                 columns={columns}
//                 dataSource={filteredData}
//                 rowKey="_id"
//                 loading={loading}
//                 pagination={{
//                   pageSize: 10,
//                   showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} requisitions`
//                 }}
//                 scroll={{ x: 'max-content' }}
//               />
//             )}
//           </TabPane>

//           <TabPane 
//             tab={
//               <span><CheckCircleOutlined /> Approved ({stats.approved})</span>
//             } 
//             key="approved"
//           >
//             <Table
//               columns={columns}
//               dataSource={filteredData}
//               rowKey="_id"
//               loading={loading}
//               pagination={{
//                 pageSize: 10,
//                 showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} requisitions`
//               }}
//               scroll={{ x: 'max-content' }}
//             />
//           </TabPane>

//           <TabPane 
//             tab={
//               <span><CloseCircleOutlined /> Rejected ({stats.rejected})</span>
//             } 
//             key="rejected"
//           >
//             <Table
//               columns={columns}
//               dataSource={filteredData}
//               rowKey="_id"
//               loading={loading}
//               pagination={{
//                 pageSize: 10,
//                 showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} requisitions`
//               }}
//               scroll={{ x: 'max-content' }}
//             />
//           </TabPane>
//           <TabPane
//             tab={
//               <Badge count={stats.cancellations} size="small">
//                 <span><StopOutlined /> Cancellation Requests ({stats.cancellations})</span>
//               </Badge>
//             }
//             key="cancellations"
//           >
//             {cancellationLoading ? (
//               <div style={{ textAlign: 'center', padding: '40px' }}>
//                 <Spin />
//               </div>
//             ) : cancellationRequests.length === 0 ? (
//               <Alert
//                 message="No Cancellation Requests"
//                 description="There are no cancellation requests awaiting your decision."
//                 type="info"
//                 showIcon
//               />
//             ) : (
//               <Table
//                 columns={columns}
//                 dataSource={cancellationRequests}
//                 rowKey="_id"
//                 loading={cancellationLoading}
//                 pagination={{ pageSize: 10 }}
//                 scroll={{ x: 'max-content' }}
//               />
//             )}
//           </TabPane>
//         </Tabs>
//       </Card>

//       {/* Detail Drawer */}
//       <Drawer
//         title={
//           <Space>
//             <FileTextOutlined />
//             Purchase Requisition Review
//           </Space>
//         }
//         placement="right"
//         width={900}
//         open={detailDrawerVisible}
//         onClose={() => {
//           setDetailDrawerVisible(false);
//           setSelectedRequisition(null);
//           resetForm();
//         }}
//       >
//         {selectedRequisition && (
//           <div>
//             {/* Requisition Information */}
//             <Card size="small" title="Requisition Information" style={{ marginBottom: '16px' }}>
//               <Descriptions column={2} size="small">
//                 <Descriptions.Item label="Requisition Number">
//                   <Text code>{selectedRequisition.requisitionNumber}</Text>
//                 </Descriptions.Item>
//                 <Descriptions.Item label="Status">
//                   {getStatusTag(selectedRequisition.status)}
//                 </Descriptions.Item>
//                 <Descriptions.Item label="Title">
//                   {selectedRequisition.title}
//                 </Descriptions.Item>
//                 <Descriptions.Item label="Urgency">
//                   {getUrgencyTag(selectedRequisition.urgency)}
//                 </Descriptions.Item>
//                 <Descriptions.Item label="Requester">
//                   <div>
//                     <UserOutlined /> {selectedRequisition.employee?.fullName}
//                     <br />
//                     <Text type="secondary">{selectedRequisition.employee?.email}</Text>
//                     <br />
//                     <Text type="secondary">{selectedRequisition.department}</Text>
//                   </div>
//                 </Descriptions.Item>
//                 <Descriptions.Item label="Category">
//                   <Tag color="blue">{selectedRequisition.itemCategory}</Tag>
//                 </Descriptions.Item>
//                 <Descriptions.Item label="Budget (XAF)">
//                   <DollarOutlined /> {selectedRequisition.budgetXAF ? Number(selectedRequisition.budgetXAF).toLocaleString() : 'N/A'}
//                 </Descriptions.Item>
//                 <Descriptions.Item label="Expected Date">
//                   <CalendarOutlined /> {new Date(selectedRequisition.expectedDate).toLocaleDateString('en-GB')}
//                 </Descriptions.Item>
//                 <Descriptions.Item label="Delivery Location" span={2}>
//                   {selectedRequisition.deliveryLocation}
//                 </Descriptions.Item>
//               </Descriptions>
//             </Card>

//             {/* Items List */}
//             <Card size="small" title={`Items Requested (${selectedRequisition.items?.length || 0})`} style={{ marginBottom: '16px' }}>
//               <Table
//                 columns={[
//                   { title: 'Description', dataIndex: 'description', key: 'description' },
//                   { title: 'Quantity', dataIndex: 'quantity', key: 'quantity', width: 80, align: 'center' },
//                   { title: 'Unit', dataIndex: 'measuringUnit', key: 'measuringUnit', width: 80, align: 'center' }
//                 ]}
//                 dataSource={selectedRequisition.items || []}
//                 pagination={false}
//                 size="small"
//                 rowKey={(record, index) => index}
//               />
//             </Card>

//             {/* ✅ NEW: Attachments Section */}
//             {renderAttachments()}

//             {selectedRequisition.status === 'pending_cancellation' && selectedRequisition.cancellationRequest && (
//   <Card
//     size="small"
//     title={
//       <Space>
//         <StopOutlined style={{ color: '#ff4d4f' }} />
//         <Text strong style={{ color: '#ff4d4f' }}>Cancellation Request</Text>
//       </Space>
//     }
//     style={{ marginBottom: '16px', borderColor: '#ff4d4f' }}
//     headStyle={{ backgroundColor: '#fff2f0' }}
//   >
//     <Descriptions column={2} size="small" style={{ marginBottom: '12px' }}>
//       <Descriptions.Item label="Requested On">
//         {new Date(selectedRequisition.cancellationRequest.requestedAt).toLocaleString('en-GB')}
//       </Descriptions.Item>
//       <Descriptions.Item label="Previous Status">
//         <Tag>{selectedRequisition.cancellationRequest.previousStatus?.replace(/_/g, ' ')}</Tag>
//       </Descriptions.Item>
//       <Descriptions.Item label="Reason" span={2}>
//         <Text italic>"{selectedRequisition.cancellationRequest.reason}"</Text>
//       </Descriptions.Item>
//     </Descriptions>

//     {/* Chain progress */}
//     <Text strong style={{ fontSize: '12px', color: '#666' }}>Approval Progress</Text>
//     <Timeline style={{ marginTop: '12px', marginBottom: 0 }}>
//       {selectedRequisition.cancellationRequest.approvalChain?.map((step, i) => (
//         <Timeline.Item
//           key={i}
//           color={step.status === 'approved' ? 'green' : step.status === 'rejected' ? 'red' : 'gray'}
//           dot={
//             step.status === 'approved' ? <CheckCircleOutlined /> :
//             step.status === 'rejected' ? <CloseCircleOutlined /> :
//             <ClockCircleOutlined />
//           }
//         >
//           <Text strong>Level {step.level}: {step.approver.name}</Text>
//           &nbsp;<Text type="secondary" style={{ fontSize: '12px' }}>({step.approver.role})</Text>
//           <br />
//           <Tag
//             color={step.status === 'approved' ? 'green' : step.status === 'rejected' ? 'red' : 'default'}
//           >
//             {step.status.toUpperCase()}
//           </Tag>
//           {step.comments && (
//             <Text type="secondary" italic style={{ marginLeft: 8 }}>"{step.comments}"</Text>
//           )}
//           {step.actionDate && (
//             <Text type="secondary" style={{ fontSize: '11px', display: 'block' }}>
//               {new Date(step.actionDate).toLocaleDateString('en-GB')}
//             </Text>
//           )}
//         </Timeline.Item>
//       ))}
//     </Timeline>
//   </Card>
// )}


//             {/* Business Justification */}
//             <Card size="small" title="Business Justification" style={{ marginBottom: '16px' }}>
//               <div style={{ marginBottom: '12px' }}>
//                 <Text strong>Purchase Justification:</Text>
//                 <br />
//                 <Text>{selectedRequisition.justificationOfPurchase}</Text>
//               </div>
//               {selectedRequisition.justificationOfPreferredSupplier && (
//                 <div>
//                   <Text strong>Preferred Supplier Justification:</Text>
//                   <br />
//                   <Text>{selectedRequisition.justificationOfPreferredSupplier}</Text>
//                 </div>
//               )}
//             </Card>

//             {/* Approval Progress */}
//             <Card size="small" title="Approval Progress" style={{ marginBottom: '16px' }}>
//               {renderApprovalChain(selectedRequisition.approvalChain)}
//             </Card>

//             {/* Action Section - Only show if user can take action */}
//             {selectedRequisition.status === 'pending_supervisor' && (
//               <Card size="small" title="Supervisor Decision" style={{ marginBottom: '16px' }}>
//                 <Alert
//                   message="This requisition requires your approval"
//                   description="Please review all items and justification before approving or rejecting this requisition."
//                   type="warning"
//                   showIcon
//                   style={{ marginBottom: '16px' }}
//                 />

//                 <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
//                   <div>
//                     <Text strong style={{ display: 'block', marginBottom: '8px' }}>Decision *</Text>
//                     <Select 
//                       placeholder="Select your decision" 
//                       style={{ width: '100%' }}
//                       value={decision}
//                       onChange={setDecision}
//                     >
//                       <Option value="approved">
//                         <CheckCircleOutlined style={{ color: '#52c41a' }} /> Approve Requisition
//                       </Option>
//                       <Option value="rejected">
//                         <CloseCircleOutlined style={{ color: '#ff4d4f' }} /> Reject Requisition
//                       </Option>
//                     </Select>
//                   </div>

//                   <div>
//                     <Text strong style={{ display: 'block', marginBottom: '8px' }}>Comments *</Text>
//                     <TextArea 
//                       rows={3} 
//                       placeholder="Enter your approval/rejection comments... (minimum 10 characters)"
//                       showCount
//                       maxLength={500}
//                       value={comments}
//                       onChange={(e) => setComments(e.target.value)}
//                     />
//                   </div>

//                   <Space>
//                     <Button 
//                       type="primary" 
//                       loading={actionLoading}
//                       icon={<SendOutlined />}
//                       onClick={handleSubmitDecision}
//                     >
//                       Submit Decision
//                     </Button>
//                     <Button onClick={resetForm}>
//                       Clear Form
//                     </Button>
//                   </Space>
//                 </div>
//               </Card>
//             )}
//             {selectedRequisition.status === 'pending_cancellation' && (() => {
//   const myStep = selectedRequisition.cancellationRequest?.approvalChain?.find(
//     s => s.approver.email.toLowerCase() === user?.email?.toLowerCase() && s.status === 'pending'
//   );
//   const priorApproved = myStep
//     ? selectedRequisition.cancellationRequest.approvalChain
//         .slice(0, selectedRequisition.cancellationRequest.approvalChain.indexOf(myStep))
//         .every(s => s.status === 'approved')
//     : false;

//   if (!myStep || !priorApproved) return null;

//   return (
//     <Card
//       size="small"
//       title={
//         <Space>
//           <StopOutlined style={{ color: '#ff4d4f' }} />
//           <Text strong>Cancellation Decision — Your Action Required</Text>
//         </Space>
//       }
//       style={{ marginBottom: '16px', borderColor: '#ff4d4f' }}
//       headStyle={{ backgroundColor: '#fff2f0' }}
//     >
//       <Alert
//         message="This employee has requested to cancel their PR"
//         description={`Reason: "${selectedRequisition.cancellationRequest?.reason}"`}
//         type="warning"
//         showIcon
//         style={{ marginBottom: '16px' }}
//       />

//       <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
//         <div>
//           <Text strong style={{ display: 'block', marginBottom: '8px' }}>Your Comments *</Text>
//           <TextArea
//             rows={3}
//             placeholder="Provide a reason for your decision..."
//             value={cancellationComments}
//             onChange={e => setCancellationComments(e.target.value)}
//             showCount
//             maxLength={300}
//           />
//         </div>
//         <Space>
//           <Button
//             type="primary"
//             icon={<CheckCircleOutlined />}
//             loading={cancellationActionLoading}
//             onClick={() => handleCancellationDecision('approved')}
//             style={{ backgroundColor: '#ff4d4f', borderColor: '#ff4d4f' }}
//           >
//             Approve Cancellation
//           </Button>
//           <Button
//             icon={<CloseCircleOutlined />}
//             loading={cancellationActionLoading}
//             onClick={() => handleCancellationDecision('rejected')}
//           >
//             Reject — Keep PR Active
//           </Button>
//         </Space>
//       </div>
//     </Card>
//   );
// })()}
//           </div>
//         )}
//       </Drawer>
//     </div>
//   );
// };

// export default SupervisorPurchaseRequisitions;



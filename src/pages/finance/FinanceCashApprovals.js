import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Card,
  Table,
  Tag,
  Space,
  Typography,
  Button,
  Alert,
  Spin,
  message,
  Badge,
  Tooltip,
  Tabs,
  Progress,
  Statistic,
  Row,
  Col
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  CalendarOutlined,
  BankOutlined,
  EyeOutlined,
  ReloadOutlined,
  ExclamationCircleOutlined,
  SendOutlined,
  FileTextOutlined,
  AuditOutlined,
  DownloadOutlined,
  SyncOutlined,
  HourglassOutlined,
  CrownOutlined,
  MedicineBoxOutlined
} from '@ant-design/icons';
import { cashRequestAPI } from '../../services/cashRequestAPI';
import CashRequestExportModal from './CashRequestExport';
import DisbursementModal from './DisbursementModal';
import JustificationApprovalModal from './JustificationApprovalModal';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

// ── Complete status config ────────────────────────────────────────────────────
const CASH_STATUS_CONFIG = {
  pending_supervisor:              { color: 'orange',  text: 'Pending Supervisor',          icon: <ClockCircleOutlined /> },
  pending_departmental_head:       { color: 'orange',  text: 'Pending Dept. Head',           icon: <ClockCircleOutlined /> },
  pending_hr:                      { color: 'cyan',    text: 'Pending HR',                   icon: <MedicineBoxOutlined /> },
  pending_finance:                 { color: 'orange',  text: 'Finance Approval Required',    icon: <ClockCircleOutlined /> },
  pending_head_of_business:        { color: 'purple',  text: 'Awaiting HOB Final Approval',  icon: <HourglassOutlined /> },
  pending_ceo:                     { color: 'magenta', text: 'Awaiting CEO Final Approval',  icon: <CrownOutlined /> },
  approved:                        { color: 'green',   text: 'Approved — Ready to Disburse', icon: <CheckCircleOutlined /> },
  disbursed:                       { color: 'processing', text: 'Disbursed',                icon: <SyncOutlined spin /> },
  partially_disbursed:             { color: 'processing', text: 'Partially Disbursed',       icon: <SyncOutlined spin /> },
  fully_disbursed:                 { color: 'cyan',    text: 'Fully Disbursed',              icon: <DollarOutlined /> },
  completed:                       { color: 'green',   text: 'Completed',                   icon: <CheckCircleOutlined /> },
  denied:                          { color: 'red',     text: 'Rejected',                     icon: <CloseCircleOutlined /> },
  rejected:                        { color: 'red',     text: 'Rejected',                     icon: <CloseCircleOutlined /> },
  // Justification statuses
  justification_pending_supervisor:        { color: 'orange',  text: 'Justification — Supervisor',    icon: <ClockCircleOutlined /> },
  justification_pending_departmental_head: { color: 'orange',  text: 'Justification — Dept. Head',    icon: <ClockCircleOutlined /> },
  justification_pending_hr:               { color: 'cyan',    text: 'Justification — HR',            icon: <MedicineBoxOutlined /> },
  justification_pending_finance:          { color: 'blue',    text: 'Justification — Finance',       icon: <BankOutlined /> },
  justification_pending_head_of_business: { color: 'purple',  text: 'Justification — HOB',           icon: <HourglassOutlined /> },
  justification_pending_ceo:              { color: 'magenta', text: 'Justification — CEO',           icon: <CrownOutlined /> },
  justification_rejected_supervisor:        { color: 'gold',    text: 'Just. Rejected — Supervisor',  icon: <ExclamationCircleOutlined /> },
  justification_rejected_departmental_head: { color: 'gold',    text: 'Just. Rejected — Dept. Head',  icon: <ExclamationCircleOutlined /> },
  justification_rejected_hr:               { color: 'gold',    text: 'Just. Rejected — HR',          icon: <ExclamationCircleOutlined /> },
  justification_rejected_finance:          { color: 'gold',    text: 'Just. Rejected — Finance',     icon: <ExclamationCircleOutlined /> },
  justification_rejected_head_of_business: { color: 'gold',    text: 'Just. Rejected — HOB',         icon: <ExclamationCircleOutlined /> },
  justification_rejected_ceo:              { color: 'gold',    text: 'Just. Rejected — CEO',         icon: <ExclamationCircleOutlined /> },
};

// All statuses that belong to the justification workflow
const JUSTIFICATION_STATUS_SET = new Set([
  'justification_pending_supervisor',
  'justification_pending_departmental_head',
  'justification_pending_hr',
  'justification_pending_finance',
  'justification_pending_head_of_business',
  'justification_pending_ceo',
  'justification_rejected_supervisor',
  'justification_rejected_departmental_head',
  'justification_rejected_hr',
  'justification_rejected_finance',
  'justification_rejected_head_of_business',
  'justification_rejected_ceo',
  'completed',
]);

// Justification status → numeric level (max 6)
const JUSTIFICATION_LEVEL_MAP = {
  justification_pending_supervisor:         1,
  justification_pending_departmental_head:  2,
  justification_pending_hr:                 3,
  justification_pending_finance:            4,
  justification_pending_head_of_business:   5,
  justification_pending_ceo:                6,
  justification_rejected_supervisor:        1,
  justification_rejected_departmental_head: 2,
  justification_rejected_hr:               3,
  justification_rejected_finance:           4,
  justification_rejected_head_of_business:  5,
  justification_rejected_ceo:               6,
};

const LEVEL_NAMES = {
  1: 'Supervisor',
  2: 'Departmental Head',
  3: 'HR Head',
  4: 'Finance Officer',
  5: 'Head of Business',
  6: 'CEO',
};

// Cash request statuses that belong in the finance view (not justification)
const FINANCE_RELEVANT_STATUSES = new Set([
  'pending_finance',
  'pending_head_of_business',
  'pending_ceo',           // ← high-value requests above CEO threshold
  'approved',
  'disbursed',
  'partially_disbursed',
  'fully_disbursed',
  'denied',
  'rejected',
]);

// ── Pure helpers ──────────────────────────────────────────────────────────────
const isJustificationStatus = (status) => JUSTIFICATION_STATUS_SET.has(status);

const extractJustificationLevel = (status) => JUSTIFICATION_LEVEL_MAP[status] ?? null;

// Roles / emails identifying each approver type
const FINANCE_EMAILS   = new Set(['ranibellmambo@gratoengineering.com']);
const FINANCE_ROLES    = new Set(['Finance Officer']);
const HOB_EMAILS       = new Set(['kelvin.eyong@gratoglobal.com']);
const HOB_ROLES        = new Set(['Head of Business']);
const CEO_EMAILS       = new Set(['tom@gratoengineering.com']);
const CEO_ROLES        = new Set(['CEO - Final Authority']);

const isFinanceStep = (step) =>
  FINANCE_EMAILS.has(step?.approver?.email?.toLowerCase()) ||
  FINANCE_ROLES.has(step?.approver?.role);

const isHOBStep = (step) =>
  HOB_EMAILS.has(step?.approver?.email?.toLowerCase()) ||
  HOB_ROLES.has(step?.approver?.role);

const isCEOStep = (step) =>
  CEO_EMAILS.has(step?.approver?.email?.toLowerCase()) ||
  CEO_ROLES.has(step?.approver?.role);

// Derive the true workflow status by reading the approval chain directly
const deriveTrueStatus = (request) => {
  if (!request?.approvalChain?.length) return request?.status;

  const chain = request.approvalChain;

  // If a step is pending, the status is determined by THAT step's role
  const pendingStep = chain.find(s => s.status === 'pending');
  if (pendingStep) {
    // Verify all previous steps are approved
    const prevApproved = chain
      .filter(s => s.level < pendingStep.level)
      .every(s => s.status === 'approved');

    if (prevApproved) {
      if (isFinanceStep(pendingStep)) return 'pending_finance';
      if (isHOBStep(pendingStep))     return 'pending_head_of_business';
      if (isCEOStep(pendingStep))     return 'pending_ceo';
      // Supervisor / Dept Head / HR — return DB status
      return request.status;
    }
  }

  // All approved → return the disbursement/completion status from DB
  return request.status;
};

// Get disbursement totals (handles V1 and V2 schemas)
const getDisbursementSummary = (req) => {
  const amountApproved   = req.amountApproved   ?? req.amountRequested ?? 0;
  const totalDisbursed   = req.totalDisbursed   ?? req.disbursementDetails?.amount ?? 0;
  const remainingBalance = req.remainingBalance ??
    (amountApproved > 0 ? Math.max(amountApproved - totalDisbursed, 0) : 0);
  return { amountApproved, totalDisbursed, remainingBalance, disbursements: req.disbursements ?? [] };
};

// ─────────────────────────────────────────────────────────────────────────────
const FinanceCashApprovals = () => {
  const navigate = useNavigate();
  const { user } = useSelector(s => s.auth);

  const [requests,      setRequests]      = useState([]);
  const [justifications,setJustifications]= useState([]);
  const [loading,       setLoading]       = useState(true);
  const [activeTab,     setActiveTab]     = useState('pending');
  const [exportModalVisible,       setExportModalVisible]       = useState(false);
  const [disbursementModalVisible, setDisbursementModalVisible] = useState(false);
  const [selectedDisbursementRequest, setSelectedDisbursementRequest] = useState(null);
  const [justificationModalVisible, setJustificationModalVisible] = useState(false);
  const [selectedJustificationRequest, setSelectedJustificationRequest] = useState(null);

  const [stats, setStats] = useState({
    pendingFinance: 0,
    pendingHOB: 0,
    pendingCEO: 0,
    approved: 0,
    partiallyDisbursed: 0,
    fullyDisbursed: 0,
    completed: 0,
    rejected: 0,
    justificationsPending: 0,
  });

  // ── Permission helpers ──────────────────────────────────────────────────────
  const canFinanceApprove = useCallback((request) => {
    if (!request?.approvalChain?.length || !user?.email) return false;
    if (isJustificationStatus(request.status)) return false;

    const financeStep = request.approvalChain.find(s => isFinanceStep(s));
    if (!financeStep || financeStep.status !== 'pending') return false;

    // Must be this finance user's step (by email) or the generic finance role
    const isMyStep = financeStep.approver?.email?.toLowerCase() === user.email.toLowerCase()
      || FINANCE_EMAILS.has(user.email.toLowerCase());
    if (!isMyStep) return false;

    // All previous levels must be approved
    return request.approvalChain
      .filter(s => s.level < financeStep.level)
      .every(s => s.status === 'approved');
  }, [user?.email]);

  const canFinanceDisburse = useCallback((request) => {
    if (!request) return false;
    const trueStatus = deriveTrueStatus(request);
    if (!['approved', 'partially_disbursed', 'disbursed'].includes(trueStatus)) return false;
    const { remainingBalance, amountApproved } = getDisbursementSummary(request);
    // Can disburse if there is remaining balance or if amount approved and nothing disbursed yet
    return remainingBalance > 0 || (amountApproved > 0 && (request.totalDisbursed ?? 0) === 0);
  }, []);

  const canUserApproveJustification = useCallback((request) => {
    if (!request?.justificationApprovalChain?.length || !user?.email) return false;
    if (!isJustificationStatus(request.status)) return false;

    const currentLevel = extractJustificationLevel(request.status);
    if (!currentLevel) return false;

    return request.justificationApprovalChain.some(s =>
      s.approver?.email?.toLowerCase() === user.email.toLowerCase() &&
      s.status === 'pending' &&
      s.level === currentLevel
    );
  }, [user?.email]);

  const isAwaitingHOB = (request) => deriveTrueStatus(request) === 'pending_head_of_business';
  const isAwaitingCEO = (request) => deriveTrueStatus(request) === 'pending_ceo';

  // ── Status tags ─────────────────────────────────────────────────────────────
  const getStatusTag = (request) => {
    const trueStatus = deriveTrueStatus(request);

    if (isJustificationStatus(trueStatus)) {
      const level    = extractJustificationLevel(trueStatus);
      const roleName = LEVEL_NAMES[level] || `Level ${level}`;
      const desc     = trueStatus.includes('rejected')
        ? `Revision required — returned to ${roleName}`
        : `Awaiting approval from ${roleName}`;
      const cfg = CASH_STATUS_CONFIG[trueStatus] || { color:'default', text: trueStatus, icon: null };
      return (
        <Tooltip title={desc}>
          <Tag color={cfg.color} icon={cfg.icon}>{cfg.text}</Tag>
        </Tooltip>
      );
    }

    const cfg = CASH_STATUS_CONFIG[trueStatus]
      || { color:'default', text: (trueStatus||'Unknown').replace(/_/g,' '), icon: null };
    return <Tag color={cfg.color} icon={cfg.icon}>{cfg.text}</Tag>;
  };

  const getJustificationStatusTag = (request) => {
    const status = request.status;
    const level  = extractJustificationLevel(status);
    const cfg    = CASH_STATUS_CONFIG[status] || { color:'default', text: status, icon: null };
    const desc   = level
      ? (status.includes('rejected')
          ? `Revision required at Level ${level} — ${LEVEL_NAMES[level]}`
          : `Awaiting Level ${level} — ${LEVEL_NAMES[level]}`)
      : '';
    return (
      <Tooltip title={desc}>
        <Tag color={cfg.color} icon={cfg.icon}>{cfg.text}</Tag>
      </Tooltip>
    );
  };

  const getUrgencyTag = (urgency) => {
    const map = { urgent:{ color:'red', text:'Urgent' }, high:{ color:'red', text:'High' },
                  medium:{ color:'orange', text:'Medium' }, low:{ color:'green', text:'Low' } };
    const cfg = map[(urgency||'').toLowerCase()] || { color:'default', text: urgency||'—' };
    return <Tag color={cfg.color}>{cfg.text}</Tag>;
  };

  // ── Filtering ───────────────────────────────────────────────────────────────
  const getFilteredRequests = () => {
    switch (activeTab) {
      case 'pending':
        return requests.filter(r => canFinanceApprove(r));
      case 'awaiting_hob':
        return requests.filter(r => isAwaitingHOB(r));
      case 'awaiting_ceo':
        return requests.filter(r => isAwaitingCEO(r));
      case 'approved':
        return requests.filter(r => deriveTrueStatus(r) === 'approved');
      case 'partially_disbursed':
        return requests.filter(r => {
          const s = deriveTrueStatus(r);
          return s === 'partially_disbursed' || (s === 'disbursed' && getDisbursementSummary(r).remainingBalance > 0);
        });
      case 'fully_disbursed':
        return requests.filter(r => {
          const s = deriveTrueStatus(r);
          return s === 'fully_disbursed' || (s === 'disbursed' && getDisbursementSummary(r).remainingBalance === 0);
        });
      case 'completed':
        return requests.filter(r => deriveTrueStatus(r) === 'completed');
      case 'rejected':
        return requests.filter(r => ['denied','rejected'].includes(deriveTrueStatus(r)));
      default:
        return requests;
    }
  };

  // ── Data fetching ───────────────────────────────────────────────────────────
  const fetchAllData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await cashRequestAPI.getFinanceRequests();
      if (!response?.success) throw new Error('Failed to fetch data');

      const allData = response.data || [];

      // Enrich each record with its derived true status
      const processed = allData.map(req => ({ ...req, trueStatus: deriveTrueStatus(req) }));

      // Split into cash requests (finance-relevant) and justifications
      const cashOnly = processed.filter(r =>
        !isJustificationStatus(r.trueStatus) && FINANCE_RELEVANT_STATUSES.has(r.trueStatus)
      );
      const justOnly = processed.filter(r => isJustificationStatus(r.trueStatus));

      setRequests(cashOnly);
      setJustifications(justOnly);

      const pendingJust = justOnly.filter(j => canUserApproveJustification(j)).length;

      setStats({
        pendingFinance:     cashOnly.filter(r => canFinanceApprove(r)).length,
        pendingHOB:         cashOnly.filter(r => isAwaitingHOB(r)).length,
        pendingCEO:         cashOnly.filter(r => isAwaitingCEO(r)).length,
        approved:           cashOnly.filter(r => r.trueStatus === 'approved').length,
        partiallyDisbursed: cashOnly.filter(r => {
          const s = r.trueStatus;
          return s === 'partially_disbursed' || (s === 'disbursed' && getDisbursementSummary(r).remainingBalance > 0);
        }).length,
        fullyDisbursed: cashOnly.filter(r => {
          const s = r.trueStatus;
          return s === 'fully_disbursed' || (s === 'disbursed' && getDisbursementSummary(r).remainingBalance === 0);
        }).length,
        completed:          processed.filter(r => r.trueStatus === 'completed').length,
        rejected:           cashOnly.filter(r => ['denied','rejected'].includes(r.trueStatus)).length,
        justificationsPending: pendingJust,
      });
    } catch (error) {
      console.error('Error fetching data:', error);
      message.error(error.response?.data?.message || 'Failed to load finance approvals');
      setRequests([]);
      setJustifications([]);
    } finally {
      setLoading(false);
    }
  }, [canFinanceApprove, canUserApproveJustification]);

  useEffect(() => {
    if (user?.email) fetchAllData();
  }, [fetchAllData, user?.email]);

  const handleRefresh = async () => {
    await fetchAllData();
    message.success('Data refreshed');
  };

  // ── Disbursement handlers ───────────────────────────────────────────────────
  const handleOpenDisbursementModal  = (r) => { setSelectedDisbursementRequest(r); setDisbursementModalVisible(true); };
  const handleDisbursementSubmit     = async ({ requestId, amount, notes }) => {
    try {
      const resp = await cashRequestAPI.processDisbursement(requestId, { amount, notes });
      if (resp.success) {
        message.success(resp.message || 'Disbursement processed');
        setDisbursementModalVisible(false);
        setSelectedDisbursementRequest(null);
        await fetchAllData();
      } else throw new Error(resp.message);
    } catch (e) { message.error(e.response?.data?.message || 'Failed to process disbursement'); }
  };

  // ── Justification handlers ──────────────────────────────────────────────────
  const handleOpenJustificationModal = (r) => { setSelectedJustificationRequest(r); setJustificationModalVisible(true); };
  const handleJustificationSubmit    = async ({ requestId, decision, comments }) => {
    try {
      const resp = await cashRequestAPI.processJustificationDecision(requestId, { decision, comments });
      if (resp.success) {
        message.success(resp.message || `Justification ${decision}`);
        setJustificationModalVisible(false);
        setSelectedJustificationRequest(null);
        await fetchAllData();
      } else throw new Error(resp.message);
    } catch (e) { message.error(e.response?.data?.message || 'Failed to process justification'); }
  };
  const handleReviewJustification = (id) => navigate(`/finance/justification/${id}`);

  // ── Table columns ────────────────────────────────────────────────────────────
  const requestColumns = [
    {
      title: 'Request ID',
      dataIndex: '_id',
      key: 'id',
      width: 120,
      render: id => <Tag color="blue">REQ-{id.toString().slice(-6).toUpperCase()}</Tag>
    },
    {
      title: 'Employee',
      key: 'employee',
      width: 180,
      render: (_, r) => (
        <div>
          <Text strong>{r.employee?.fullName || 'N/A'}</Text><br />
          <Text type="secondary" style={{ fontSize:'12px' }}>{r.employee?.position || 'N/A'}</Text><br />
          <Tag color="blue" size="small">{r.employee?.department || 'N/A'}</Tag>
        </div>
      )
    },
    {
      title: 'Request Details',
      key: 'requestDetails',
      width: 210,
      render: (_, r) => (
        <div>
          <Text strong style={{ color:'#1890ff' }}>XAF {Number(r.amountRequested||0).toLocaleString()}</Text><br />
          {r.amountApproved && r.amountApproved !== r.amountRequested && (
            <><Text type="secondary" style={{ fontSize:'11px' }}>Approved: XAF {r.amountApproved.toLocaleString()}</Text><br /></>
          )}
          <Text type="secondary" style={{ fontSize:'12px' }}>
            {r.requestType?.replace(/-/g,' ').replace(/\b\w/g, l=>l.toUpperCase()) || 'N/A'}
          </Text><br />
          {r.itemizedBreakdown?.length > 0 && (
            <Tag color="cyan" size="small">{r.itemizedBreakdown.length} items</Tag>
          )}
          <Tooltip title={r.purpose}>
            <Text ellipsis style={{ maxWidth:200, fontSize:'11px', color:'#666' }}>
              {r.purpose?.length > 40 ? `${r.purpose.substring(0,40)}…` : r.purpose || 'No purpose'}
            </Text>
          </Tooltip>
        </div>
      )
    },
    {
      title: 'Priority & Dates',
      key: 'priorityDate',
      width: 140,
      sorter: (a,b) => new Date(a.createdAt||0) - new Date(b.createdAt||0),
      render: (_, r) => (
        <div>
          {getUrgencyTag(r.urgency)}<br />
          <Text type="secondary" style={{ fontSize:'11px' }}>
            <CalendarOutlined /> Expected: {r.requiredDate ? new Date(r.requiredDate).toLocaleDateString('en-GB') : 'N/A'}
          </Text><br />
          <Text type="secondary" style={{ fontSize:'11px' }}>
            Submitted: {r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-GB') : 'N/A'}
          </Text>
        </div>
      )
    },
    {
      title: 'Disbursement',
      key: 'disbursementStatus',
      width: 180,
      render: (_, r) => {
        const trueStatus = deriveTrueStatus(r);
        const { amountApproved, totalDisbursed, remainingBalance } = getDisbursementSummary(r);
        const progress = amountApproved > 0 ? Math.round((totalDisbursed/amountApproved)*100) : 0;

        if (trueStatus === 'pending_finance') {
          return <Text type="secondary" style={{ fontSize:'11px' }}>Awaiting finance approval</Text>;
        }
        if (trueStatus === 'pending_head_of_business') {
          return (
            <div>
              <Tag color="purple" size="small"><HourglassOutlined /> Awaiting HOB</Tag><br />
              <Text type="secondary" style={{ fontSize:'10px' }}>Budget Reserved: XAF {amountApproved.toLocaleString()}</Text>
            </div>
          );
        }
        if (trueStatus === 'pending_ceo') {
          return (
            <div>
              <Tag color="magenta" size="small"><CrownOutlined /> Awaiting CEO</Tag><br />
              <Text type="secondary" style={{ fontSize:'10px' }}>Budget Reserved: XAF {amountApproved.toLocaleString()}</Text>
            </div>
          );
        }
        if (trueStatus === 'approved') {
          return (
            <div>
              <Tag color="green" size="small"><CheckCircleOutlined /> Ready</Tag><br />
              <Text type="secondary" style={{ fontSize:'10px' }}>XAF {amountApproved.toLocaleString()} approved</Text>
            </div>
          );
        }
        if (['partially_disbursed','fully_disbursed','disbursed'].includes(trueStatus)) {
          return (
            <div>
              <Progress percent={progress} size="small" status={progress===100 ? 'success' : 'active'} style={{ marginBottom:'4px' }} />
              <Text style={{ fontSize:'11px', display:'block' }}>
                <Text strong style={{ color: progress===100 ? '#52c41a' : '#1890ff' }}>{totalDisbursed.toLocaleString()}</Text>
                {' / '}<Text type="secondary">{amountApproved.toLocaleString()}</Text>
              </Text>
              {remainingBalance > 0 && (
                <Text type="secondary" style={{ fontSize:'10px', display:'block' }}>Remaining: {remainingBalance.toLocaleString()}</Text>
              )}
              <Text type="secondary" style={{ fontSize:'10px' }}>{r.disbursements?.length || 1} payment(s)</Text>
            </div>
          );
        }
        return <Text type="secondary" style={{ fontSize:'11px' }}>Not disbursed</Text>;
      }
    },
    {
      title: 'Status',
      key: 'status',
      width: 230,
      render: (_, r) => getStatusTag(r)
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 200,
      render: (_, r) => {
        const trueStatus = deriveTrueStatus(r);
        return (
          <Space direction="vertical" size="small">
            <Button type="link" icon={<EyeOutlined />} size="small"
              onClick={() => navigate(`/finance/cash-request/${r._id}`)}>
              View Details
            </Button>

            {canFinanceApprove(r) && (
              <Button type="primary" size="small" icon={<CheckCircleOutlined />}
                onClick={() => navigate(`/finance/cash-request/${r._id}`)}>
                Approve &amp; Allocate Budget
              </Button>
            )}

            {trueStatus === 'pending_head_of_business' && (
              <Tooltip title="Awaiting Head of Business final approval">
                <Button size="small" icon={<HourglassOutlined />} disabled
                  style={{ color:'#9254de', borderColor:'#9254de' }}>
                  Awaiting HOB
                </Button>
              </Tooltip>
            )}

            {trueStatus === 'pending_ceo' && (
              <Tooltip title="Awaiting CEO final approval before disbursement">
                <Button size="small" icon={<CrownOutlined />} disabled
                  style={{ color:'#c41d7f', borderColor:'#c41d7f' }}>
                  Awaiting CEO
                </Button>
              </Tooltip>
            )}

            {canFinanceDisburse(r) && (
              <Button type="default" size="small" icon={<SendOutlined />}
                onClick={() => handleOpenDisbursementModal(r)}
                style={{ color:'#52c41a', borderColor:'#52c41a' }}>
                {trueStatus === 'partially_disbursed' ? 'Continue Disbursement' : 'Disburse'}
              </Button>
            )}
          </Space>
        );
      }
    }
  ];

  const justificationColumns = [
    {
      title: 'Request ID',
      dataIndex: '_id',
      key: 'id',
      width: 130,
      render: id => <Tag color="blue">REQ-{id.toString().slice(-6).toUpperCase()}</Tag>
    },
    {
      title: 'Employee',
      key: 'employee',
      width: 180,
      render: (_, r) => (
        <div>
          <Text strong>{r.employee?.fullName || 'N/A'}</Text><br />
          <Tag color="blue" size="small">{r.employee?.department || 'N/A'}</Tag>
        </div>
      )
    },
    {
      title: 'Financial Summary',
      key: 'financial',
      width: 190,
      render: (_, r) => {
        const { totalDisbursed } = getDisbursementSummary(r);
        const spent    = r.justification?.amountSpent    || 0;
        const returned = r.justification?.balanceReturned || 0;
        const balanced = Math.abs((spent+returned) - totalDisbursed) < 1;
        return (
          <div>
            <Text type="secondary" style={{ fontSize:'11px' }}>Disbursed: XAF {totalDisbursed.toLocaleString()}</Text><br />
            <Text type="secondary" style={{ fontSize:'11px' }}>Spent: XAF {spent.toLocaleString()}</Text><br />
            <Text type="secondary" style={{ fontSize:'11px' }}>Returned: XAF {returned.toLocaleString()}</Text><br />
            {!balanced && <Tag color="warning" size="small">Unbalanced</Tag>}
          </div>
        );
      }
    },
    {
      title: 'Submitted',
      key: 'date',
      width: 110,
      render: (_, r) => (
        <Text type="secondary">
          {r.justification?.justificationDate
            ? new Date(r.justification.justificationDate).toLocaleDateString('en-GB')
            : 'N/A'}
        </Text>
      )
    },
    {
      title: 'Approval Progress',
      key: 'progress',
      width: 130,
      render: (_, r) => {
        if (!r.justificationApprovalChain?.length) return <Text type="secondary">No chain</Text>;
        const total    = r.justificationApprovalChain.length;
        const approved = r.justificationApprovalChain.filter(s => s.status === 'approved').length;
        const level    = extractJustificationLevel(r.status);
        return (
          <div>
            <Progress percent={Math.round((approved/total)*100)} size="small"
              status={r.status === 'completed' ? 'success' : 'active'} showInfo={false} />
            <Text style={{ fontSize:'11px' }}>Level {level ?? approved+1}/{total}</Text>
          </div>
        );
      }
    },
    {
      title: 'Status',
      key: 'justStatus',
      width: 220,
      render: (_, r) => (
        <div>
          {getJustificationStatusTag(r)}
          {canUserApproveJustification(r) && <div style={{ marginTop:4 }}><Tag color="gold" size="small">Your Turn</Tag></div>}
        </div>
      )
    },
    {
      title: 'Docs',
      key: 'docs',
      width: 70,
      render: (_, r) => (
        <Badge count={r.justification?.documents?.length||0} showZero style={{ backgroundColor:'#52c41a' }}>
          <FileTextOutlined style={{ fontSize:'16px' }} />
        </Badge>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 180,
      render: (_, r) => (
        <Space direction="vertical" size="small">
          <Button size="small" icon={<EyeOutlined />} block onClick={() => handleReviewJustification(r._id)}>
            View Details
          </Button>
          {canUserApproveJustification(r) && (
            <Button size="small" type="primary" icon={<AuditOutlined />} block
              onClick={() => handleOpenJustificationModal(r)}>
              Approve / Reject
            </Button>
          )}
        </Space>
      )
    }
  ];

  // ── Derived counts for alert ──────────────────────────────────────────────────
  const readyForDisbursement = stats.approved + stats.partiallyDisbursed;

  if (loading && !requests.length && !justifications.length) {
    return (
      <div style={{ padding:'24px', textAlign:'center' }}>
        <Spin size="large" />
        <div style={{ marginTop:'16px' }}>Loading finance cash approvals…</div>
      </div>
    );
  }

  return (
    <div style={{ padding:'24px' }}>
      {/* Stats Row */}
      <Row gutter={16} style={{ marginBottom:'24px' }}>
        <Col span={4}>
          <Card size="small">
            <Statistic title="Your Approvals"    value={stats.pendingFinance}     prefix={<ClockCircleOutlined />}  valueStyle={{ color:'#faad14' }} />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic title="Awaiting HOB"      value={stats.pendingHOB}         prefix={<HourglassOutlined />}    valueStyle={{ color:'#9254de' }} />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic title="Awaiting CEO"      value={stats.pendingCEO}         prefix={<CrownOutlined />}        valueStyle={{ color:'#c41d7f' }} />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic title="Ready to Disburse" value={stats.approved}           prefix={<CheckCircleOutlined />}  valueStyle={{ color:'#52c41a' }} />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic title="Justifications"    value={stats.justificationsPending} prefix={<FileTextOutlined />}  valueStyle={{ color:'#722ed1' }} />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic title="Completed"         value={stats.completed}          prefix={<CheckCircleOutlined />}  valueStyle={{ color:'#52c41a' }} />
          </Card>
        </Col>
      </Row>

      <Card>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'24px' }}>
          <Title level={2} style={{ margin:0 }}><BankOutlined /> Finance Cash Approvals</Title>
          <Space>
            <Button icon={<ReloadOutlined />} loading={loading} onClick={handleRefresh}>Refresh</Button>
            <Button type="primary" icon={<DownloadOutlined />} onClick={() => setExportModalVisible(true)}>Export Data</Button>
          </Space>
        </div>

        {(stats.pendingFinance > 0 || stats.pendingHOB > 0 || stats.pendingCEO > 0 ||
          readyForDisbursement > 0 || stats.justificationsPending > 0) && (
          <Alert
            type="warning" showIcon style={{ marginBottom:'16px' }}
            message={
              <div>
                {stats.pendingFinance > 0      && <div>🔔 {stats.pendingFinance} cash request(s) waiting for your Finance approval</div>}
                {stats.pendingHOB > 0          && <div>⏳ {stats.pendingHOB} request(s) awaiting Head of Business final approval</div>}
                {stats.pendingCEO > 0          && <div>👑 {stats.pendingCEO} request(s) awaiting CEO final approval</div>}
                {readyForDisbursement > 0      && <div>💰 {readyForDisbursement} request(s) ready for disbursement</div>}
                {stats.justificationsPending > 0 && <div>📄 {stats.justificationsPending} justification(s) require your review</div>}
              </div>
            }
          />
        )}

        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane tab={<Badge count={stats.pendingFinance} offset={[10,0]} color="#faad14"><span><ExclamationCircleOutlined /> Your Approvals ({stats.pendingFinance})</span></Badge>} key="pending">
            <Table columns={requestColumns} dataSource={getFilteredRequests()} loading={loading} rowKey="_id"
              pagination={{ pageSize:10, showSizeChanger:true, showTotal:(t,r)=>`${r[0]}-${r[1]} of ${t}` }}
              scroll={{ x:'max-content' }}
              rowClassName={r => canFinanceApprove(r) ? 'highlight-row-urgent' : ''} />
          </TabPane>

          <TabPane tab={<Badge count={stats.pendingHOB} offset={[10,0]} color="#9254de"><span><HourglassOutlined /> Awaiting HOB ({stats.pendingHOB})</span></Badge>} key="awaiting_hob">
            <Table columns={requestColumns} dataSource={getFilteredRequests()} loading={loading} rowKey="_id"
              pagination={{ pageSize:10, showSizeChanger:true, showTotal:(t,r)=>`${r[0]}-${r[1]} of ${t}` }}
              scroll={{ x:'max-content' }} rowClassName={() => 'highlight-row-awaiting-hob'} />
          </TabPane>

          <TabPane tab={<Badge count={stats.pendingCEO} offset={[10,0]} color="#c41d7f"><span><CrownOutlined /> Awaiting CEO ({stats.pendingCEO})</span></Badge>} key="awaiting_ceo">
            <Table columns={requestColumns} dataSource={getFilteredRequests()} loading={loading} rowKey="_id"
              pagination={{ pageSize:10, showSizeChanger:true, showTotal:(t,r)=>`${r[0]}-${r[1]} of ${t}` }}
              scroll={{ x:'max-content' }} rowClassName={() => 'highlight-row-awaiting-ceo'} />
          </TabPane>

          <TabPane tab={<Badge count={stats.justificationsPending} offset={[10,0]} color="#722ed1"><span><FileTextOutlined /> Justifications ({stats.justificationsPending})</span></Badge>} key="justifications">
            {activeTab === 'justifications' && (
              <Table columns={justificationColumns} dataSource={justifications} loading={loading} rowKey="_id"
                pagination={{ pageSize:10, showSizeChanger:true, showTotal:(t,r)=>`${r[0]}-${r[1]} of ${t}` }}
                scroll={{ x:1200 }} size="small"
                rowClassName={r => `cash-request-row${canUserApproveJustification(r) ? ' pending-approval-row' : ''}`} />
            )}
          </TabPane>

          <TabPane tab={<Badge count={stats.approved} offset={[10,0]} color="#52c41a"><span><CheckCircleOutlined /> Ready to Disburse ({stats.approved})</span></Badge>} key="approved">
            <Table columns={requestColumns} dataSource={getFilteredRequests()} loading={loading} rowKey="_id"
              pagination={{ pageSize:10, showSizeChanger:true, showTotal:(t,r)=>`${r[0]}-${r[1]} of ${t}` }}
              scroll={{ x:'max-content' }} rowClassName={() => 'highlight-row-ready'} />
          </TabPane>

          <TabPane tab={<Badge count={stats.partiallyDisbursed} offset={[10,0]} color="#1890ff"><span><SyncOutlined /> Partially Disbursed ({stats.partiallyDisbursed})</span></Badge>} key="partially_disbursed">
            <Table columns={requestColumns} dataSource={getFilteredRequests()} loading={loading} rowKey="_id"
              pagination={{ pageSize:10, showSizeChanger:true, showTotal:(t,r)=>`${r[0]}-${r[1]} of ${t}` }}
              scroll={{ x:'max-content' }} rowClassName={() => 'highlight-row-partial'} />
          </TabPane>

          <TabPane tab={<Badge count={stats.fullyDisbursed} offset={[10,0]} color="#13c2c2"><span><DollarOutlined /> Fully Disbursed ({stats.fullyDisbursed})</span></Badge>} key="fully_disbursed">
            <Table columns={requestColumns} dataSource={getFilteredRequests()} loading={loading} rowKey="_id"
              pagination={{ pageSize:10, showSizeChanger:true, showTotal:(t,r)=>`${r[0]}-${r[1]} of ${t}` }}
              scroll={{ x:'max-content' }} />
          </TabPane>

          <TabPane tab={<span><CheckCircleOutlined /> Completed ({stats.completed})</span>} key="completed">
            <Table columns={requestColumns} dataSource={getFilteredRequests()} loading={loading} rowKey="_id"
              pagination={{ pageSize:10, showSizeChanger:true, showTotal:(t,r)=>`${r[0]}-${r[1]} of ${t}` }}
              scroll={{ x:'max-content' }} />
          </TabPane>

          <TabPane tab={<span><CloseCircleOutlined /> Rejected ({stats.rejected})</span>} key="rejected">
            <Table columns={requestColumns} dataSource={getFilteredRequests()} loading={loading} rowKey="_id"
              pagination={{ pageSize:10, showSizeChanger:true, showTotal:(t,r)=>`${r[0]}-${r[1]} of ${t}` }}
              scroll={{ x:'max-content' }} />
          </TabPane>
        </Tabs>
      </Card>

      {/* Modals */}
      <DisbursementModal
        visible={disbursementModalVisible}
        request={selectedDisbursementRequest}
        onSubmit={handleDisbursementSubmit}
        onCancel={() => { setDisbursementModalVisible(false); setSelectedDisbursementRequest(null); }}
      />
      <JustificationApprovalModal
        visible={justificationModalVisible}
        request={selectedJustificationRequest}
        onSubmit={handleJustificationSubmit}
        onCancel={() => { setJustificationModalVisible(false); setSelectedJustificationRequest(null); }}
      />
      <CashRequestExportModal
        visible={exportModalVisible}
        onCancel={() => setExportModalVisible(false)}
      />

      <style>{`
        .highlight-row-urgent { background-color:#fff7e6 !important; border-left:4px solid #faad14 !important; }
        .highlight-row-urgent:hover { background-color:#fff1d6 !important; }
        .highlight-row-awaiting-hob { background-color:#f9f0ff !important; border-left:4px solid #9254de !important; }
        .highlight-row-awaiting-hob:hover { background-color:#efdbff !important; }
        .highlight-row-awaiting-ceo { background-color:#fff0f6 !important; border-left:4px solid #c41d7f !important; }
        .highlight-row-awaiting-ceo:hover { background-color:#ffd6e7 !important; }
        .highlight-row-ready { background-color:#f6ffed !important; border-left:4px solid #52c41a !important; }
        .highlight-row-ready:hover { background-color:#d9f7be !important; }
        .highlight-row-partial { background-color:#e6f7ff !important; border-left:4px solid #1890ff !important; }
        .highlight-row-partial:hover { background-color:#bae7ff !important; }
        .cash-request-row { background-color:#fafafa; }
        .cash-request-row:hover { background-color:#f0f0f0 !important; }
        .pending-approval-row { border-left:3px solid #faad14; background-color:#fff7e6; }
        .pending-approval-row:hover { background-color:#fff1d6 !important; }
      `}</style>
    </div>
  );
};

export default FinanceCashApprovals;










// import React, { useState, useEffect, useCallback } from 'react';
// import { useNavigate } from 'react-router-dom';
// import { useSelector } from 'react-redux';
// import {
//   Card,
//   Table,
//   Tag,
//   Space,
//   Typography,
//   Button,
//   Alert,
//   Spin,
//   message,
//   Badge,
//   Tooltip,
//   Tabs,
//   Progress,
//   Statistic,
//   Row,
//   Col
// } from 'antd';
// import {
//   CheckCircleOutlined,
//   CloseCircleOutlined,
//   ClockCircleOutlined,
//   DollarOutlined,
//   CalendarOutlined,
//   BankOutlined,
//   EyeOutlined,
//   ReloadOutlined,
//   ExclamationCircleOutlined,
//   SendOutlined,
//   FileTextOutlined,
//   AuditOutlined,
//   DownloadOutlined,
//   SyncOutlined,
//   HourglassOutlined
// } from '@ant-design/icons';
// import { cashRequestAPI } from '../../services/cashRequestAPI';
// import CashRequestExportModal from './CashRequestExport';
// import DisbursementModal from './DisbursementModal';
// import JustificationApprovalModal from './JustificationApprovalModal';

// const { Title, Text } = Typography;
// const { TabPane } = Tabs;

// const FinanceCashApprovals = () => {
//   const navigate = useNavigate();
//   const { user } = useSelector((state) => state.auth);
  
//   const [requests, setRequests] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [activeTab, setActiveTab] = useState('pending');
//   const [exportModalVisible, setExportModalVisible] = useState(false);
  
//   const [disbursementModalVisible, setDisbursementModalVisible] = useState(false);
//   const [selectedDisbursementRequest, setSelectedDisbursementRequest] = useState(null);
  
//   const [justificationModalVisible, setJustificationModalVisible] = useState(false);
//   const [selectedJustificationRequest, setSelectedJustificationRequest] = useState(null);
  
//   const [stats, setStats] = useState({
//     pendingFinance: 0,
//     pendingHeadOfBusiness: 0,
//     approved: 0,
//     partiallyDisbursed: 0,
//     fullyDisbursed: 0,
//     completed: 0,
//     rejected: 0,
//     justificationsPending: 0
//   });
//   const [justifications, setJustifications] = useState([]);

//   // ============ ✅ FLEXIBLE: Support both V1 and V2 flows ============

//   /**
//    * ✅ IMPROVED: Get true status (handles both V1 and V2 flows)
//    */
//   const getTrueStatus = useCallback((request) => {
//     if (!request || !request.approvalChain) return request.status;

//     const approvalChain = request.approvalChain;
    
//     // If backend status is pending_finance, trust it
//     if (request.status === 'pending_finance') {
//       return 'pending_finance';
//     }
    
//     // ✅ NEW: Check if Finance step is pending (by role, not level)
//     const financeStep = approvalChain.find(step => 
//       step.approver?.role === 'Finance Officer' ||
//       step.approver?.email?.toLowerCase() === 'ranibellmambo@gratoengineering.com'
//     );
    
//     // If Finance step exists and is pending, this is pending_finance
//     if (financeStep && financeStep.status === 'pending') {
//       // Check if all previous steps are approved
//       const previousSteps = approvalChain.filter(s => s.level < financeStep.level);
//       const allPreviousApproved = previousSteps.every(s => s.status === 'approved');
      
//       if (allPreviousApproved) {
//         console.log(`✅ OVERRIDE: Request ${request._id.slice(-6)} - Finance step is pending`);
//         return 'pending_finance';
//       }
//     }
    
//     // Find Head of Business step
//     const hobStep = approvalChain.find(step => 
//       step.approver?.role === 'Head of Business' ||
//       step.approver?.email?.toLowerCase() === 'kelvin.eyong@gratoglobal.com'
//     );

//     // Check if Finance approved but HOB pending
//     if (hobStep && hobStep.status === 'pending' && financeStep && financeStep.status === 'approved') {
//       console.log(`✅ OVERRIDE: Request ${request._id.slice(-6)} - Finance approved, awaiting HOB`);
//       return 'pending_head_of_business';
//     }

//     // If all approved
//     const allApproved = approvalChain.every(step => step.status === 'approved');
//     if (allApproved && request.status === 'approved') {
//       return 'approved';
//     }

//     return request.status;
//   }, []);

//   /**
//    * ✅ FLEXIBLE: Check if Finance can APPROVE (works with both V1 and V2)
//    */
//   const canFinanceApprove = useCallback((request) => {
//     if (!request || !user?.email) return false;
    
//     // Find Finance's step by email/role
//     const financeStep = request.approvalChain?.find(step =>
//       (step.approver?.email?.toLowerCase() === user.email.toLowerCase() ||
//        step.approver?.email?.toLowerCase() === 'ranibellmambo@gratoengineering.com') &&
//       (step.approver?.role === 'Finance Officer' || 
//        step.approver?.department === 'Finance')
//     );
    
//     if (!financeStep) {
//       console.log(`❌ No Finance step found for request ${request._id.slice(-6)}`);
//       return false;
//     }
    
//     // Must be pending
//     if (financeStep.status !== 'pending') {
//       console.log(`❌ Finance step not pending for request ${request._id.slice(-6)}: ${financeStep.status}`);
//       return false;
//     }
    
//     // Check if all previous levels are approved
//     const previousLevels = request.approvalChain.filter(s => s.level < financeStep.level);
//     const allPreviousApproved = previousLevels.every(s => s.status === 'approved');
    
//     if (!allPreviousApproved) {
//       console.log(`❌ Previous levels not all approved for request ${request._id.slice(-6)}`);
//       return false;
//     }
    
//     console.log(`✅ Finance can approve request ${request._id.slice(-6)}`);
//     return true;
//   }, [user?.email]);

//   /**
//    * Check if Finance can DISBURSE
//    */
//   const canFinanceDisburse = useCallback((request) => {
//     if (!request) return false;
    
//     const trueStatus = getTrueStatus(request);
//     const validStatuses = ['approved', 'partially_disbursed'];
    
//     if (!validStatuses.includes(trueStatus)) {
//       return false;
//     }
    
//     const remainingBalance = request.remainingBalance || 0;
//     return remainingBalance > 0;
//   }, [getTrueStatus]);

//   /**
//    * Check if awaiting HOB
//    */
//   const isAwaitingHeadOfBusiness = useCallback((request) => {
//     const trueStatus = getTrueStatus(request);
//     return trueStatus === 'pending_head_of_business';
//   }, [getTrueStatus]);

//   // ============ EXISTING HELPER FUNCTIONS ============

//   const isJustificationStatus = (status) => {
//     return status && (
//       status.includes('justification_pending') || 
//       status.includes('justification_rejected') ||
//       status === 'completed'
//     );
//   };

//   const extractJustificationLevel = (status) => {
//     if (!status || !status.includes('justification_')) return null;
    
//     const levelMap = {
//       'justification_pending_supervisor': 1,
//       'justification_pending_departmental_head': 2,
//       'justification_pending_hr': 3,
//       'justification_pending_finance': 4,
//       'justification_rejected_supervisor': 1,
//       'justification_rejected_departmental_head': 2,
//       'justification_rejected_hr': 3,
//       'justification_rejected_finance': 4
//     };
    
//     return levelMap[status] || null;
//   };

//   const getJustificationStatusInfo = (status, level = null) => {
//     const statusLevel = level || extractJustificationLevel(status);
    
//     const levelNames = {
//       1: 'Supervisor',
//       2: 'Departmental Head',
//       3: 'HR Head',
//       4: 'Finance'
//     };
    
//     if (status === 'completed') {
//       return {
//         text: 'Completed',
//         color: 'cyan',
//         icon: <CheckCircleOutlined />,
//         description: 'All approvals completed'
//       };
//     }
    
//     if (status?.includes('justification_rejected')) {
//       return {
//         text: `Revision Required (${levelNames[statusLevel]})`,
//         color: 'gold',
//         icon: <ExclamationCircleOutlined />,
//         description: `Rejected at Level ${statusLevel} - ${levelNames[statusLevel]}`
//       };
//     }
    
//     if (status?.includes('justification_pending')) {
//       return {
//         text: `Level ${statusLevel}/4: Pending ${levelNames[statusLevel]}`,
//         color: 'orange',
//         icon: <ClockCircleOutlined />,
//         description: `Awaiting approval from ${levelNames[statusLevel]}`
//       };
//     }
    
//     return {
//       text: status?.replace(/_/g, ' ') || 'Unknown',
//       color: 'default',
//       icon: null,
//       description: ''
//     };
//   };

//   const canUserApproveJustification = useCallback((request) => {
//     if (!request.justificationApprovalChain || !user?.email) {
//       return false;
//     }

//     if (!isJustificationStatus(request.status)) {
//       return false;
//     }

//     const currentStatusLevel = extractJustificationLevel(request.status);
    
//     if (!currentStatusLevel) {
//       return false;
//     }

//     const userPendingSteps = request.justificationApprovalChain.filter(step => {
//       const emailMatch = step.approver?.email?.toLowerCase() === user.email.toLowerCase();
//       const isPending = step.status === 'pending';
      
//       return emailMatch && isPending;
//     });

//     if (userPendingSteps.length === 0) {
//       return false;
//     }

//     const canApprove = userPendingSteps.some(step => step.level === currentStatusLevel);

//     return canApprove;
//   }, [user?.email]);

//   // ============ DATA FETCHING ============

//   const fetchAllData = useCallback(async () => {
//     try {
//       setLoading(true);
//       console.log('🔄 Fetching all cash requests and justifications...');

//       const response = await cashRequestAPI.getFinanceRequests();

//       if (response && response.success) {
//         const allData = response.data || [];
        
//         console.log(`📊 Total records fetched: ${allData.length}`);
        
//         // Process each request
//         const processedData = allData.map(req => {
//           const trueStatus = getTrueStatus(req);
//           const canApprove = canFinanceApprove(req);
          
//           console.log(`Request ${req._id.slice(-6)}:`, {
//             backendStatus: req.status,
//             trueStatus,
//             canFinanceApprove: canApprove,
//             financeStep: req.approvalChain?.find(s => 
//               s.approver?.role === 'Finance Officer'
//             )
//           });
          
//           return {
//             ...req,
//             trueStatus
//           };
//         });
        
//         // Separate cash requests and justifications
//         const cashRequestsOnly = processedData.filter(req =>
//           !isJustificationStatus(req.trueStatus) &&
//           [
//             'pending_finance',
//             'pending_head_of_business',
//             'approved',
//             'disbursed', 
//             'partially_disbursed', 
//             'fully_disbursed', 
//             'denied'
//           ].includes(req.trueStatus)
//         );
//         const justificationsOnly = processedData.filter(req => isJustificationStatus(req.trueStatus));
        
//         console.log(`💼 Cash requests: ${cashRequestsOnly.length}`);
//         console.log(`📄 Justifications: ${justificationsOnly.length}`);
        
//         setRequests(cashRequestsOnly);
//         setJustifications(justificationsOnly);

//         const pendingJustifications = justificationsOnly.filter(j => 
//           canUserApproveJustification(j)
//         ).length;

//         // Calculate stats
//         const calculatedStats = {
//           pendingFinance: cashRequestsOnly.filter(req => canFinanceApprove(req)).length,
//           pendingHeadOfBusiness: cashRequestsOnly.filter(req => isAwaitingHeadOfBusiness(req)).length,
//           approved: cashRequestsOnly.filter(req => req.trueStatus === 'approved').length,
//           partiallyDisbursed: cashRequestsOnly.filter(req => 
//             req.trueStatus === 'partially_disbursed' || 
//             (req.trueStatus === 'disbursed' && (req.remainingBalance || 0) > 0)
//           ).length,
//           fullyDisbursed: cashRequestsOnly.filter(req => 
//             req.trueStatus === 'fully_disbursed' || 
//             (req.trueStatus === 'disbursed' && (req.remainingBalance || 0) === 0)
//           ).length,
//           completed: processedData.filter(req => req.trueStatus === 'completed').length,
//           rejected: cashRequestsOnly.filter(req => req.trueStatus === 'denied').length,
//           justificationsPending: pendingJustifications
//         };

//         console.log('✅ Calculated stats:', calculatedStats);
//         setStats(calculatedStats);
//       } else {
//         throw new Error('Failed to fetch data');
//       }
//     } catch (error) {
//       console.error('❌ Error fetching data:', error);
//       message.error(error.response?.data?.message || 'Failed to load finance approvals');
//       setRequests([]);
//       setJustifications([]);
//     } finally {
//       setLoading(false);
//     }
//   }, [canUserApproveJustification, canFinanceApprove, getTrueStatus, isAwaitingHeadOfBusiness]);

//   useEffect(() => {
//     if (user?.email) {
//       fetchAllData();
//     }
//   }, [fetchAllData, user?.email]);

//   const handleRefresh = async () => {
//     await fetchAllData();
//     message.success('Data refreshed successfully');
//   };

//   // ============ DISBURSEMENT HANDLERS ============

//   const handleOpenDisbursementModal = (request) => {
//     setSelectedDisbursementRequest(request);
//     setDisbursementModalVisible(true);
//   };

//   const handleDisbursementSubmit = async ({ requestId, amount, notes }) => {
//     try {
//       console.log('Processing disbursement:', { requestId, amount, notes });
      
//       const response = await cashRequestAPI.processDisbursement(requestId, {
//         amount,
//         notes
//       });

//       if (response.success) {
//         message.success(response.message || 'Disbursement processed successfully');
//         setDisbursementModalVisible(false);
//         setSelectedDisbursementRequest(null);
//         await fetchAllData();
//       } else {
//         throw new Error(response.message || 'Failed to process disbursement');
//       }
//     } catch (error) {
//       console.error('Disbursement error:', error);
//       message.error(error.response?.data?.message || 'Failed to process disbursement');
//     }
//   };

//   // ============ JUSTIFICATION HANDLERS ============

//   const handleOpenJustificationModal = (request) => {
//     setSelectedJustificationRequest(request);
//     setJustificationModalVisible(true);
//   };

//   const handleJustificationSubmit = async ({ requestId, decision, comments }) => {
//     try {
//       console.log('Processing justification decision:', { requestId, decision, comments });
      
//       const response = await cashRequestAPI.processJustificationDecision(requestId, {
//         decision,
//         comments
//       });

//       if (response.success) {
//         message.success(response.message || `Justification ${decision} successfully`);
//         setJustificationModalVisible(false);
//         setSelectedJustificationRequest(null);
//         await fetchAllData();
//       } else {
//         throw new Error(response.message || 'Failed to process justification');
//       }
//     } catch (error) {
//       console.error('Justification decision error:', error);
//       message.error(error.response?.data?.message || 'Failed to process justification');
//     }
//   };

//   const handleReviewJustification = (requestId) => {
//     navigate(`/finance/justification/${requestId}`);
//   };

//   // ============ ✅ UPDATED: Status Tag using TRUE status ============
  
//   const getStatusTag = (request) => {
//     const trueStatus = getTrueStatus(request);
    
//     if (isJustificationStatus(trueStatus)) {
//       const statusInfo = getJustificationStatusInfo(trueStatus);
//       return (
//         <Tooltip title={statusInfo.description}>
//           <Tag color={statusInfo.color} icon={statusInfo.icon}>
//             {statusInfo.text}
//           </Tag>
//         </Tooltip>
//       );
//     }

//     const statusMap = {
//       'pending_finance': { 
//         color: 'orange', 
//         icon: <ClockCircleOutlined />, 
//         text: 'Finance Approval Required' 
//       },
//       'pending_head_of_business': {
//         color: 'purple',
//         icon: <HourglassOutlined />,
//         text: 'Awaiting HOB Final Approval'
//       },
//       'approved': { 
//         color: 'green', 
//         icon: <CheckCircleOutlined />, 
//         text: 'Approved - Ready for Disbursement' 
//       },
//       'disbursed': {
//         color: 'processing',
//         icon: <SyncOutlined spin />,
//         text: 'Disbursed'
//       },
//       'partially_disbursed': { 
//         color: 'processing', 
//         icon: <SyncOutlined spin />, 
//         text: 'Partially Disbursed' 
//       },
//       'fully_disbursed': { 
//         color: 'cyan', 
//         icon: <DollarOutlined />, 
//         text: 'Fully Disbursed - Awaiting Justification' 
//       },
//       'completed': { 
//         color: 'green', 
//         icon: <CheckCircleOutlined />, 
//         text: 'Completed' 
//       },
//       'denied': { 
//         color: 'red', 
//         icon: <CloseCircleOutlined />, 
//         text: 'Rejected' 
//       }
//     };

//     const statusInfo = statusMap[trueStatus] || { 
//       color: 'default', 
//       text: trueStatus?.replace('_', ' ') || 'Unknown' 
//     };

//     return (
//       <Tag color={statusInfo.color} icon={statusInfo.icon}>
//         {statusInfo.text}
//       </Tag>
//     );
//   };

//   const getUrgencyTag = (urgency) => {
//     const urgencyMap = {
//       'urgent': { color: 'red', text: 'Urgent' },
//       'high': { color: 'red', text: 'High' },
//       'medium': { color: 'orange', text: 'Medium' },
//       'low': { color: 'green', text: 'Low' }
//     };
//     const urgencyInfo = urgencyMap[urgency] || { color: 'default', text: urgency };

//     return (
//       <Tag color={urgencyInfo.color}>
//         {urgencyInfo.text}
//       </Tag>
//     );
//   };

//   // ✅ UPDATED: Filter requests using TRUE status
//   const getFilteredRequests = () => {
//     switch (activeTab) {
//       case 'pending':
//         return requests.filter(req => getTrueStatus(req) === 'pending_finance');
//       case 'awaiting_ceo':
//         return requests.filter(req => getTrueStatus(req) === 'pending_head_of_business');
//       case 'approved':
//         return requests.filter(req => getTrueStatus(req) === 'approved');
//       case 'partially_disbursed':
//         return requests.filter(req => {
//           const trueStatus = getTrueStatus(req);
//           return trueStatus === 'partially_disbursed' ||
//             (trueStatus === 'disbursed' && (req.remainingBalance || 0) > 0);
//         });
//       case 'fully_disbursed':
//         return requests.filter(req => {
//           const trueStatus = getTrueStatus(req);
//           return trueStatus === 'fully_disbursed' ||
//             (trueStatus === 'disbursed' && (req.remainingBalance || 0) === 0);
//         });
//       case 'completed':
//         return requests.filter(req => getTrueStatus(req) === 'completed');
//       case 'rejected':
//         return requests.filter(req => getTrueStatus(req) === 'denied');
//       default:
//         return requests;
//     }
//   };

//   // ============ TABLE COLUMNS (keeping existing columns - too long to repeat) ============
  
//   const requestColumns = [
//     {
//       title: 'Request ID',
//       dataIndex: '_id',
//       key: 'id',
//       render: (id) => (
//         <Tag color="blue">
//           REQ-{id.toString().slice(-6).toUpperCase()}
//         </Tag>
//       ),
//       width: 120
//     },
//     {
//       title: 'Employee',
//       key: 'employee',
//       render: (_, record) => (
//         <div>
//           <Text strong>{record.employee?.fullName || 'N/A'}</Text>
//           <br />
//           <Text type="secondary" style={{ fontSize: '12px' }}>
//             {record.employee?.position || 'N/A'}
//           </Text>
//           <br />
//           <Tag color="blue" size="small">{record.employee?.department || 'N/A'}</Tag>
//         </div>
//       ),
//       width: 180
//     },
//     {
//       title: 'Request Details',
//       key: 'requestDetails',
//       render: (_, record) => (
//         <div>
//           <Text strong style={{ color: '#1890ff' }}>
//             XAF {Number(record.amountRequested || 0).toLocaleString()}
//           </Text>
//           <br />
//           <Text type="secondary" style={{ fontSize: '12px' }}>
//             Type: {record.requestType?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'N/A'}
//           </Text>
//           <br />
//           <Tooltip title={record.purpose}>
//             <Text ellipsis style={{ maxWidth: 200, fontSize: '11px', color: '#666' }}>
//               {record.purpose && record.purpose.length > 40 
//                 ? `${record.purpose.substring(0, 40)}...` 
//                 : record.purpose || 'No purpose specified'
//               }
//             </Text>
//           </Tooltip>
//         </div>
//       ),
//       width: 200
//     },
//     {
//       title: 'Priority & Dates',
//       key: 'priorityDate',
//       render: (_, record) => (
//         <div>
//           {getUrgencyTag(record.urgency)}
//           <br />
//           <Text type="secondary" style={{ fontSize: '11px' }}>
//             <CalendarOutlined /> Expected: {record.requiredDate ? new Date(record.requiredDate).toLocaleDateString('en-GB') : 'N/A'}
//           </Text>
//           <br />
//           <Text type="secondary" style={{ fontSize: '11px' }}>
//             Submitted: {record.createdAt ? new Date(record.createdAt).toLocaleDateString('en-GB') : 'N/A'}
//           </Text>
//         </div>
//       ),
//       sorter: (a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0),
//       width: 140
//     },
//     {
//       title: 'Disbursement Status',
//       key: 'disbursementStatus',
//       render: (_, record) => {
//         const trueStatus = getTrueStatus(record);
//         const amountRequested = record.amountRequested || 0;
//         const totalDisbursed = record.totalDisbursed || 0;
//         const remainingBalance = record.remainingBalance || 0;
        
//         const progress = amountRequested > 0 
//           ? Math.round((totalDisbursed / amountRequested) * 100) 
//           : 0;

//         if (trueStatus === 'approved') {
//           return (
//             <div>
//               <Tag color="green" size="small">
//                 <CheckCircleOutlined /> Ready
//               </Tag>
//               <br />
//               <Text type="secondary" style={{ fontSize: '10px' }}>
//                 0 / {amountRequested.toLocaleString()}
//               </Text>
//             </div>
//           );
//         }

//         if (trueStatus === 'pending_head_of_business') {
//           return (
//             <div>
//               <Tag color="purple" size="small">
//                 <HourglassOutlined /> Awaiting HOB
//               </Tag>
//               <br />
//               <Text type="secondary" style={{ fontSize: '10px' }}>
//                 Budget Reserved
//               </Text>
//             </div>
//           );
//         }

//         if (['partially_disbursed', 'fully_disbursed', 'disbursed'].includes(trueStatus)) {
//           return (
//             <div>
//               <Progress 
//                 percent={progress} 
//                 size="small" 
//                 status={progress === 100 ? 'success' : 'active'}
//                 style={{ marginBottom: '4px' }}
//               />
//               <Text style={{ fontSize: '11px', display: 'block' }}>
//                 <Text strong style={{ color: progress === 100 ? '#52c41a' : '#1890ff' }}>
//                   {totalDisbursed.toLocaleString()}
//                 </Text>
//                 {' / '}
//                 <Text type="secondary">{amountRequested.toLocaleString()}</Text>
//               </Text>
//               {remainingBalance > 0 && (
//                 <Text type="secondary" style={{ fontSize: '10px', display: 'block' }}>
//                   Remaining: {remainingBalance.toLocaleString()}
//                 </Text>
//               )}
//               <Text type="secondary" style={{ fontSize: '10px' }}>
//                 {record.disbursements?.length || 0} payment(s)
//               </Text>
//             </div>
//           );
//         }

//         return <Text type="secondary" style={{ fontSize: '11px' }}>Not disbursed</Text>;
//       },
//       width: 180
//     },
//     {
//       title: 'Status',
//       key: 'status',
//       render: (_, record) => getStatusTag(record),
//       width: 220
//     },
//     {
//       title: 'Actions',
//       key: 'actions',
//       render: (_, record) => (
//         <Space direction="vertical" size="small">
//           <Button 
//             type="link" 
//             icon={<EyeOutlined />}
//             onClick={() => navigate(`/finance/cash-request/${record._id}`)}
//             size="small"
//           >
//             View Details
//           </Button>
          
//           {canFinanceApprove(record) && (
//             <Button 
//               type="primary"
//               size="small"
//               icon={<CheckCircleOutlined />}
//               onClick={() => navigate(`/finance/cash-request/${record._id}`)}
//             >
//               Approve & Allocate Budget
//             </Button>
//           )}
          
//           {isAwaitingHeadOfBusiness(record) && (
//             <Tooltip title="Awaiting Head of Business final approval before disbursement">
//               <Button 
//                 size="small"
//                 icon={<HourglassOutlined />}
//                 disabled
//                 style={{ color: '#9254de', borderColor: '#9254de' }}
//               >
//                 Awaiting HOB Approval
//               </Button>
//             </Tooltip>
//           )}
          
//           {canFinanceDisburse(record) && (
//             <Button 
//               type="default"
//               size="small"
//               icon={<SendOutlined />}
//               onClick={() => handleOpenDisbursementModal(record)}
//               style={{ color: '#52c41a', borderColor: '#52c41a' }}
//             >
//               {getTrueStatus(record) === 'partially_disbursed' ? 'Continue Disbursement' : 'Disburse'}
//             </Button>
//           )}
//         </Space>
//       ),
//       width: 200
//     }
//   ];

//   // Keep justificationColumns same as before...
//   // const justificationColumns = [
//   //   // ... (same as your existing code)
//   // ];


//   const justificationColumns = [
//   {
//     title: 'Request ID',
//     dataIndex: '_id',
//     key: 'id',
//     width: 140,
//     render: (id) => <Tag color="blue">REQ-{id.toString().slice(-6).toUpperCase()}</Tag>
//   },
//   {
//     title: 'Employee',
//     key: 'employee',
//     render: (_, record) => (
//       <div>
//         <Text strong>{record.employee?.fullName || 'N/A'}</Text>
//         <br />
//         <Tag color="blue" size="small">
//           {record.employee?.department || 'N/A'}
//         </Tag>
//       </div>
//     ),
//     width: 180
//   },
//   {
//     title: 'Financial Summary',
//     key: 'financial',
//     render: (_, record) => {
//       const disbursed = record.disbursementDetails?.amount || record.totalDisbursed || 0;
//       const spent = record.justification?.amountSpent || 0;
//       const returned = record.justification?.balanceReturned || 0;
//       const isBalanced = Math.abs((spent + returned) - disbursed) < 0.01;

//       return (
//         <div>
//           <Text type="secondary" style={{ fontSize: '11px' }}>
//             Disbursed: XAF {disbursed.toLocaleString()}
//           </Text>
//           <br />
//           <Text type="secondary" style={{ fontSize: '11px' }}>
//             Spent: XAF {spent.toLocaleString()}
//           </Text>
//           <br />
//           <Text type="secondary" style={{ fontSize: '11px' }}>
//             Returned: XAF {returned.toLocaleString()}
//           </Text>
//           <br />
//           {!isBalanced && (
//             <Tag color="warning" size="small">Unbalanced</Tag>
//           )}
//         </div>
//       );
//     },
//     width: 180
//   },
//   {
//     title: 'Submitted Date',
//     key: 'date',
//     render: (_, record) => (
//       <Text type="secondary">
//         {record.justification?.justificationDate 
//           ? new Date(record.justification.justificationDate).toLocaleDateString('en-GB')
//           : 'N/A'
//         }
//       </Text>
//     ),
//     width: 120
//   },
//   {
//     title: 'Approval Progress',
//     key: 'progress',
//     render: (_, record) => {
//       if (!record.justificationApprovalChain) return <Text type="secondary">No chain</Text>;
      
//       const currentLevel = extractJustificationLevel(record.status);
//       const totalLevels = record.justificationApprovalChain.length;
//       const approvedCount = record.justificationApprovalChain.filter(s => s.status === 'approved').length;
      
//       return (
//         <div>
//           <Progress 
//             percent={Math.round((approvedCount / totalLevels) * 100)} 
//             size="small"
//             status={record.status === 'completed' ? 'success' : 'active'}
//             showInfo={false}
//           />
//           <Text style={{ fontSize: '11px' }}>
//             Level {currentLevel || approvedCount + 1}/{totalLevels}
//           </Text>
//         </div>
//       );
//     },
//     width: 120
//   },
//   {
//     title: 'Status',
//     key: 'justificationStatus',
//     render: (_, record) => (
//       <div>
//         {getStatusTag(record)}
//         {canUserApproveJustification(record) && (
//           <div style={{ marginTop: 4 }}>
//             <Tag color="gold" size="small">Your Turn</Tag>
//           </div>
//         )}
//       </div>
//     ),
//     width: 200
//   },
//   {
//     title: 'Documents',
//     key: 'documents',
//     render: (_, record) => (
//       <Badge 
//         count={record.justification?.documents?.length || 0} 
//         showZero
//         style={{ backgroundColor: '#52c41a' }}
//       >
//         <FileTextOutlined style={{ fontSize: '16px' }} />
//       </Badge>
//     ),
//     width: 100
//   },
//   {
//     title: 'Action',
//     key: 'action',
//     width: 180,
//     render: (_, record) => (
//       <Space size="small" direction="vertical">
//         <Button
//           size="small"
//           icon={<EyeOutlined />}
//           onClick={() => handleReviewJustification(record._id)}
//           block
//         >
//           View Details
//         </Button>
//         {canUserApproveJustification(record) && (
//           <Button
//             size="small"
//             type="primary"
//             icon={<AuditOutlined />}
//             onClick={() => handleOpenJustificationModal(record)}
//             block
//           >
//             Approve/Reject
//           </Button>
//         )}
//       </Space>
//     )
//   }
// ];

//   const pendingForMe = requests.filter(req => canFinanceApprove(req)).length;
//   const readyForDisbursement = stats.approved + stats.partiallyDisbursed;

//   if (loading && requests.length === 0 && justifications.length === 0) {
//     return (
//       <div style={{ padding: '24px', textAlign: 'center' }}>
//         <Spin size="large" />
//         <div style={{ marginTop: '16px' }}>Loading finance cash approvals...</div>
//       </div>
//     );
//   }

//   return (
//     <div style={{ padding: '24px' }}>
//       {/* Stats Cards */}
//       <Row gutter={16} style={{ marginBottom: '24px' }}>
//         <Col span={4}>
//           <Card size="small">
//             <Statistic
//               title="Your Approvals"
//               value={pendingForMe}
//               prefix={<ClockCircleOutlined />}
//               valueStyle={{ color: '#faad14' }}
//             />
//           </Card>
//         </Col>
//         <Col span={4}>
//           <Card size="small">
//             <Statistic
//               title="Awaiting HOB"
//               value={stats.pendingHeadOfBusiness}
//               prefix={<HourglassOutlined />}
//               valueStyle={{ color: '#9254de' }}
//             />
//           </Card>
//         </Col>
//         <Col span={4}>
//           <Card size="small">
//             <Statistic
//               title="Ready to Disburse"
//               value={stats.approved}
//               prefix={<CheckCircleOutlined />}
//               valueStyle={{ color: '#52c41a' }}
//             />
//           </Card>
//         </Col>
//         <Col span={4}>
//           <Card size="small">
//             <Statistic
//               title="Partial Disbursed"
//               value={stats.partiallyDisbursed}
//               prefix={<SyncOutlined />}
//               valueStyle={{ color: '#1890ff' }}
//             />
//           </Card>
//         </Col>
//         <Col span={4}>
//           <Card size="small">
//             <Statistic
//               title="Justifications"
//               value={stats.justificationsPending}
//               prefix={<FileTextOutlined />}
//               valueStyle={{ color: '#722ed1' }}
//             />
//           </Card>
//         </Col>
//         <Col span={4}>
//           <Card size="small">
//             <Statistic
//               title="Completed"
//               value={stats.completed}
//               prefix={<CheckCircleOutlined />}
//               valueStyle={{ color: '#52c41a' }}
//             />
//           </Card>
//         </Col>
//       </Row>

//       {/* Main Content */}
//       <Card>
//         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
//           <Title level={2} style={{ margin: 0 }}>
//             <BankOutlined /> Finance Cash Approvals
//           </Title>
//           <Space>
//             <Button 
//               icon={<ReloadOutlined />}
//               onClick={handleRefresh}
//               loading={loading}
//             >
//               Refresh
//             </Button>
//             <Button 
//               type="primary"
//               icon={<DownloadOutlined />}
//               onClick={() => setExportModalVisible(true)}
//             >
//               Export Data
//             </Button>
//           </Space>
//         </div>

//         {/* Alert Messages */}
//         {(pendingForMe > 0 || stats.pendingHeadOfBusiness > 0 || readyForDisbursement > 0 || stats.justificationsPending > 0) && (
//           <Alert
//             message={
//               <div>
//                 {pendingForMe > 0 && (
//                   <div>🔔 You have {pendingForMe} cash request(s) waiting for your approval (Finance Level)</div>
//                 )}
//                 {stats.pendingHeadOfBusiness > 0 && (
//                   <div>⏳ {stats.pendingHeadOfBusiness} request(s) are awaiting Head of Business final approval</div>
//                 )}
//                 {readyForDisbursement > 0 && (
//                   <div>💰 {readyForDisbursement} request(s) are ready for disbursement (HOB Approved)</div>
//                 )}
//                 {stats.justificationsPending > 0 && (
//                   <div>📄 {stats.justificationsPending} justification(s) require your review</div>
//                 )}
//               </div>
//             }
//             type="warning"
//             showIcon
//             style={{ marginBottom: '16px' }}
//           />
//         )}

//         {/* Tabs */}
//         <Tabs activeKey={activeTab} onChange={setActiveTab}>
//           <TabPane 
//             tab={
//               <Badge count={stats.pendingFinance} offset={[10, 0]} color="#faad14">
//                 <span>
//                   <ExclamationCircleOutlined />
//                   Your Approvals ({stats.pendingFinance})
//                 </span>
//               </Badge>
//             } 
//             key="pending"
//           >
//             <Table 
//               columns={requestColumns} 
//               dataSource={getFilteredRequests()} 
//               loading={loading}
//               rowKey="_id"
//               pagination={{ 
//                 pageSize: 10,
//                 showSizeChanger: true,
//                 showQuickJumper: true,
//                 showTotal: (total, range) => 
//                   `${range[0]}-${range[1]} of ${total} requests`
//               }}
//               scroll={{ x: 'max-content' }}
//               rowClassName={(record) => {
//                 if (canFinanceApprove(record)) {
//                   return 'highlight-row-urgent'; 
//                 }
//                 return '';
//               }}
//             />
//           </TabPane>

//           {/* NEW TAB: Awaiting HOB */}
//           <TabPane 
//             tab={
//               <Badge count={stats.pendingHeadOfBusiness} offset={[10, 0]} color="#9254de">
//                 <span>
//                   <HourglassOutlined />
//                   Awaiting HOB ({stats.pendingHeadOfBusiness})
//                 </span>
//               </Badge>
//             } 
//             key="awaiting_ceo"
//           >
//             <Table 
//               columns={requestColumns} 
//               dataSource={getFilteredRequests()} 
//               loading={loading}
//               rowKey="_id"
//               pagination={{ 
//                 pageSize: 10,
//                 showSizeChanger: true,
//                 showQuickJumper: true,
//                 showTotal: (total, range) => 
//                   `${range[0]}-${range[1]} of ${total} requests`
//               }}
//               scroll={{ x: 'max-content' }}
//               rowClassName={() => 'highlight-row-awaiting-ceo'}
//             />
//           </TabPane>

//           <TabPane
//             tab={
//               <Badge count={stats.justificationsPending} offset={[10, 0]} color="#722ed1">
//                 <span>
//                   <FileTextOutlined />
//                   Justifications ({stats.justificationsPending})
//                 </span>
//               </Badge>
//             }
//             key="justifications"
//           >
//             {activeTab === 'justifications' && (
//               <Table
//                 columns={justificationColumns}
//                 dataSource={justifications}
//                 loading={loading}
//                 rowKey="_id"
//                 pagination={{ 
//                   pageSize: 10, 
//                   showSizeChanger: true,
//                   showQuickJumper: true,
//                   showTotal: (total, range) => 
//                     `${range[0]}-${range[1]} of ${total} justifications`
//                 }}
//                 scroll={{ x: 1200 }}
//                 size="small"
//                 rowClassName={(record) => {
//                   let className = 'cash-request-row';
//                   if (canUserApproveJustification(record)) {
//                     className += ' pending-approval-row';
//                   }
//                   return className;
//                 }}
//               />
//             )}
//           </TabPane>

//           <TabPane 
//             tab={
//               <Badge count={stats.approved} offset={[10, 0]} color="#52c41a">
//                 <span>
//                   <CheckCircleOutlined />
//                   Ready to Disburse ({stats.approved})
//                 </span>
//               </Badge>
//             } 
//             key="approved"
//           >
//             <Table 
//               columns={requestColumns} 
//               dataSource={getFilteredRequests()} 
//               loading={loading}
//               rowKey="_id"
//               pagination={{ 
//                 pageSize: 10,
//                 showSizeChanger: true,
//                 showQuickJumper: true,
//                 showTotal: (total, range) => 
//                   `${range[0]}-${range[1]} of ${total} requests`
//               }}
//               scroll={{ x: 'max-content' }}
//               rowClassName={() => 'highlight-row-ready'}
//             />
//           </TabPane>

//           <TabPane 
//             tab={
//               <Badge count={stats.partiallyDisbursed} offset={[10, 0]} color="#1890ff">
//                 <span>
//                   <SyncOutlined />
//                   Partially Disbursed ({stats.partiallyDisbursed})
//                 </span>
//               </Badge>
//             } 
//             key="partially_disbursed"
//           >
//             <Table 
//               columns={requestColumns} 
//               dataSource={getFilteredRequests()} 
//               loading={loading}
//               rowKey="_id"
//               pagination={{ 
//                 pageSize: 10,
//                 showSizeChanger: true,
//                 showQuickJumper: true,
//                 showTotal: (total, range) => 
//                   `${range[0]}-${range[1]} of ${total} requests`
//               }}
//               scroll={{ x: 'max-content' }}
//               rowClassName={() => 'highlight-row-partial'}
//             />
//           </TabPane>

//           <TabPane 
//             tab={
//               <Badge count={stats.fullyDisbursed} offset={[10, 0]} color="#13c2c2">
//                 <span>
//                   <DollarOutlined />
//                   Fully Disbursed ({stats.fullyDisbursed})
//                 </span>
//               </Badge>
//             } 
//             key="fully_disbursed"
//           >
//             <Table 
//               columns={requestColumns} 
//               dataSource={getFilteredRequests()} 
//               loading={loading}
//               rowKey="_id"
//               pagination={{ 
//                 pageSize: 10,
//                 showSizeChanger: true,
//                 showQuickJumper: true,
//                 showTotal: (total, range) => 
//                   `${range[0]}-${range[1]} of ${total} requests`
//               }}
//               scroll={{ x: 'max-content' }}
//             />
//           </TabPane>

//           <TabPane 
//             tab={
//               <span>
//                 <CheckCircleOutlined />
//                 Completed ({stats.completed})
//               </span>
//             } 
//             key="completed"
//           >
//             <Table 
//               columns={requestColumns} 
//               dataSource={getFilteredRequests()} 
//               loading={loading}
//               rowKey="_id"
//               pagination={{ 
//                 pageSize: 10,
//                 showSizeChanger: true,
//                 showQuickJumper: true,
//                 showTotal: (total, range) => 
//                   `${range[0]}-${range[1]} of ${total} requests`
//               }}
//               scroll={{ x: 'max-content' }}
//             />
//           </TabPane>

//           <TabPane 
//             tab={
//               <span>
//                 <CloseCircleOutlined />
//                 Rejected ({stats.rejected})
//               </span>
//             } 
//             key="rejected"
//           >
//             <Table 
//               columns={requestColumns} 
//               dataSource={getFilteredRequests()} 
//               loading={loading}
//               rowKey="_id"
//               pagination={{ 
//                 pageSize: 10,
//                 showSizeChanger: true,
//                 showQuickJumper: true,
//                 showTotal: (total, range) => 
//                   `${range[0]}-${range[1]} of ${total} requests`
//               }}
//               scroll={{ x: 'max-content' }}
//             />
//           </TabPane>
//         </Tabs>
//       </Card>

//       {/* Modals */}
//       <DisbursementModal
//         visible={disbursementModalVisible}
//         request={selectedDisbursementRequest}
//         onSubmit={handleDisbursementSubmit}
//         onCancel={() => {
//           setDisbursementModalVisible(false);
//           setSelectedDisbursementRequest(null);
//         }}
//       />

//       <JustificationApprovalModal
//         visible={justificationModalVisible}
//         request={selectedJustificationRequest}
//         onSubmit={handleJustificationSubmit}
//         onCancel={() => {
//           setJustificationModalVisible(false);
//           setSelectedJustificationRequest(null);
//         }}
//       />

//       <CashRequestExportModal
//         visible={exportModalVisible}
//         onCancel={() => setExportModalVisible(false)}
//       />

//       {/* Styles */}
//       <style>{`
//         .highlight-row-urgent {
//           background-color: #fff7e6 !important;
//           border-left: 4px solid #faad14 !important;
//         }
//         .highlight-row-urgent:hover {
//           background-color: #fff1d6 !important;
//         }
//         .highlight-row-awaiting-ceo {
//           background-color: #f9f0ff !important;
//           border-left: 4px solid #9254de !important;
//         }
//         .highlight-row-awaiting-ceo:hover {
//           background-color: #efdbff !important;
//         }
//         .highlight-row-ready {
//           background-color: #f6ffed !important;
//           border-left: 4px solid #52c41a !important;
//         }
//         .highlight-row-ready:hover {
//           background-color: #d9f7be !important;
//         }
//         .highlight-row-partial {
//           background-color: #e6f7ff !important;
//           border-left: 4px solid #1890ff !important;
//         }
//         .highlight-row-partial:hover {
//           background-color: #bae7ff !important;
//         }
//         .cash-request-row {
//           background-color: #fafafa;
//         }
//         .cash-request-row:hover {
//           background-color: #f0f0f0 !important;
//         }
//         .pending-approval-row {
//           border-left: 3px solid #faad14;
//           background-color: #fff7e6;
//         }
//         .pending-approval-row:hover {
//           background-color: #fff1d6 !important;
//         }
//       `}</style>
//     </div>
//   );
// };

// export default FinanceCashApprovals;












// import React, { useState, useEffect, useCallback } from 'react';
// import { useNavigate } from 'react-router-dom';
// import { useSelector } from 'react-redux';
// import {
//   Card,
//   Table,
//   Tag,
//   Space,
//   Typography,
//   Button,
//   Alert,
//   Spin,
//   message,
//   Badge,
//   Tooltip,
//   Tabs,
//   Progress,
//   Statistic,
//   Row,
//   Col
// } from 'antd';
// import {
//   CheckCircleOutlined,
//   CloseCircleOutlined,
//   ClockCircleOutlined,
//   DollarOutlined,
//   CalendarOutlined,
//   BankOutlined,
//   EyeOutlined,
//   ReloadOutlined,
//   ExclamationCircleOutlined,
//   SendOutlined,
//   FileTextOutlined,
//   AuditOutlined,
//   DownloadOutlined,
//   SyncOutlined,
//   HourglassOutlined
// } from '@ant-design/icons';
// import { cashRequestAPI } from '../../services/cashRequestAPI';
// import CashRequestExportModal from './CashRequestExport';
// import DisbursementModal from './DisbursementModal';
// import JustificationApprovalModal from './JustificationApprovalModal';

// const { Title, Text } = Typography;
// const { TabPane } = Tabs;

// const FinanceCashApprovals = () => {
//   const navigate = useNavigate();
//   const { user } = useSelector((state) => state.auth);
  
//   const [requests, setRequests] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [activeTab, setActiveTab] = useState('pending');
//   const [exportModalVisible, setExportModalVisible] = useState(false);
  
//   // Disbursement modal state
//   const [disbursementModalVisible, setDisbursementModalVisible] = useState(false);
//   const [selectedDisbursementRequest, setSelectedDisbursementRequest] = useState(null);
  
//   // Justification modal state
//   const [justificationModalVisible, setJustificationModalVisible] = useState(false);
//   const [selectedJustificationRequest, setSelectedJustificationRequest] = useState(null);
  
//   const [stats, setStats] = useState({
//     pendingFinance: 0,
//     pendingHeadOfBusiness: 0,
//     approved: 0,
//     partiallyDisbursed: 0,
//     fullyDisbursed: 0,
//     completed: 0,
//     rejected: 0,
//     justificationsPending: 0
//   });
//   const [justifications, setJustifications] = useState([]);

//   // ============ ✅ CRITICAL FIX: Check actual approval chain status ============

//   /**
//    * ✅ FIX: Determine TRUE status based on approval chain
//    * Backend may return "approved" even when CEO hasn't approved yet
//    */
//   const getTrueStatus = useCallback((request) => {
//     if (!request || !request.approvalChain) return request.status;

//     const approvalChain = request.approvalChain;
    
//     // Find Head of Business step (should be last level)
//     const hobStep = approvalChain.find(step => 
//       step.approver?.role === 'Head of Business' ||
//       step.approver?.email?.toLowerCase() === 'kelvin.eyong@gratoglobal.com'
//     );

//     // If HOB step exists and is pending, override status
//     if (hobStep && hobStep.status === 'pending') {
//       console.log(`✅ OVERRIDE: Request ${request._id} - Backend says "${request.status}" but HOB is pending`);
//       return 'pending_head_of_business';
//     }

//     // If all approval steps are approved, it's truly approved
//     const allApproved = approvalChain.every(step => step.status === 'approved');
//     if (allApproved && request.status === 'approved') {
//       return 'approved'; // Truly ready for disbursement
//     }

//     // Otherwise, return backend status
//     return request.status;
//   }, []);

//   /**
//    * Check if Finance can APPROVE this request (at Finance level)
//    */
//   const canFinanceApprove = useCallback((request) => {
//     if (!request || !user?.email) return false;
    
//     // Must be at pending_finance status
//     if (request.status !== 'pending_finance') return false;
    
//     // Find Finance's pending step
//     const financeStep = request.approvalChain?.find(step =>
//       step.approver?.email?.toLowerCase() === user.email.toLowerCase() &&
//       step.approver?.role === 'Finance Officer' &&
//       step.status === 'pending'
//     );
    
//     if (!financeStep) return false;
    
//     // Check if all previous levels are approved
//     const previousLevels = request.approvalChain.filter(s => s.level < financeStep.level);
//     const allPreviousApproved = previousLevels.every(s => s.status === 'approved');
    
//     return allPreviousApproved;
//   }, [user?.email]);

//   /**
//    * ✅ UPDATED: Check if Finance can DISBURSE (using TRUE status)
//    */
//   const canFinanceDisburse = useCallback((request) => {
//     if (!request) return false;
    
//     // ✅ Get true status from approval chain
//     const trueStatus = getTrueStatus(request);
    
//     // Can only disburse AFTER all approvals including HOB
//     const validStatuses = ['approved', 'partially_disbursed'];
    
//     if (!validStatuses.includes(trueStatus)) {
//       return false;
//     }
    
//     // Check if remaining balance exists
//     const remainingBalance = request.remainingBalance || 0;
    
//     return remainingBalance > 0;
//   }, [getTrueStatus]);

//   /**
//    * ✅ UPDATED: Check if awaiting HOB (using TRUE status)
//    */
//   const isAwaitingHeadOfBusiness = useCallback((request) => {
//     const trueStatus = getTrueStatus(request);
//     return trueStatus === 'pending_head_of_business';
//   }, [getTrueStatus]);

//   // ============ EXISTING HELPER FUNCTIONS ============

//   const isJustificationStatus = (status) => {
//     return status && (
//       status.includes('justification_pending') || 
//       status.includes('justification_rejected') ||
//       status === 'completed'
//     );
//   };

//   const extractJustificationLevel = (status) => {
//     if (!status || !status.includes('justification_')) return null;
    
//     const levelMap = {
//       'justification_pending_supervisor': 1,
//       'justification_pending_departmental_head': 2,
//       'justification_pending_hr': 3,
//       'justification_pending_finance': 4,
//       'justification_rejected_supervisor': 1,
//       'justification_rejected_departmental_head': 2,
//       'justification_rejected_hr': 3,
//       'justification_rejected_finance': 4
//     };
    
//     return levelMap[status] || null;
//   };

//   const getJustificationStatusInfo = (status, level = null) => {
//     const statusLevel = level || extractJustificationLevel(status);
    
//     const levelNames = {
//       1: 'Supervisor',
//       2: 'Departmental Head',
//       3: 'HR Head',
//       4: 'Finance'
//     };
    
//     if (status === 'completed') {
//       return {
//         text: 'Completed',
//         color: 'cyan',
//         icon: <CheckCircleOutlined />,
//         description: 'All approvals completed'
//       };
//     }
    
//     if (status?.includes('justification_rejected')) {
//       return {
//         text: `Revision Required (${levelNames[statusLevel]})`,
//         color: 'gold',
//         icon: <ExclamationCircleOutlined />,
//         description: `Rejected at Level ${statusLevel} - ${levelNames[statusLevel]}`
//       };
//     }
    
//     if (status?.includes('justification_pending')) {
//       return {
//         text: `Level ${statusLevel}/4: Pending ${levelNames[statusLevel]}`,
//         color: 'orange',
//         icon: <ClockCircleOutlined />,
//         description: `Awaiting approval from ${levelNames[statusLevel]}`
//       };
//     }
    
//     return {
//       text: status?.replace(/_/g, ' ') || 'Unknown',
//       color: 'default',
//       icon: null,
//       description: ''
//     };
//   };

//   const canUserApproveJustification = useCallback((request) => {
//     if (!request.justificationApprovalChain || !user?.email) {
//       return false;
//     }

//     if (!isJustificationStatus(request.status)) {
//       return false;
//     }

//     const currentStatusLevel = extractJustificationLevel(request.status);
    
//     if (!currentStatusLevel) {
//       return false;
//     }

//     const userPendingSteps = request.justificationApprovalChain.filter(step => {
//       const emailMatch = step.approver?.email?.toLowerCase() === user.email.toLowerCase();
//       const isPending = step.status === 'pending';
      
//       return emailMatch && isPending;
//     });

//     if (userPendingSteps.length === 0) {
//       return false;
//     }

//     const canApprove = userPendingSteps.some(step => step.level === currentStatusLevel);

//     return canApprove;
//   }, [user?.email]);

//   // ============ DATA FETCHING ============

//   const fetchAllData = useCallback(async () => {
//     try {
//       setLoading(true);
//       console.log('Fetching all cash requests and justifications...');

//       const response = await cashRequestAPI.getFinanceRequests();

//       if (response && response.success) {
//         const allData = response.data || [];
        
//         console.log('Total records fetched:', allData.length);
        
//         // ✅ FIX: Process each request to get TRUE status
//         const processedData = allData.map(req => ({
//           ...req,
//           trueStatus: getTrueStatus(req) // Add computed true status
//         }));

//         console.log('✅ Processed data with true statuses:', processedData.map(r => ({
//           id: r._id.slice(-6),
//           backendStatus: r.status,
//           trueStatus: r.trueStatus
//         })));
        
//         // Improved: More precise separation using TRUE status
//         const cashRequestsOnly = processedData.filter(req =>
//           !isJustificationStatus(req.trueStatus) &&
//           [
//             'pending_finance',
//             'pending_head_of_business',
//             'approved',
//             'disbursed', 
//             'partially_disbursed', 
//             'fully_disbursed', 
//             'denied'
//           ].includes(req.trueStatus)
//         );
//         const justificationsOnly = processedData.filter(req => isJustificationStatus(req.trueStatus));
        
//         console.log('Cash requests:', cashRequestsOnly.length);
//         console.log('Justifications:', justificationsOnly.length);
        
//         setRequests(cashRequestsOnly);
//         setJustifications(justificationsOnly);

//         const pendingJustifications = justificationsOnly.filter(j => 
//           canUserApproveJustification(j)
//         ).length;

//         console.log('Pending justifications for user:', pendingJustifications);

//         // ✅ UPDATED: Calculate stats using TRUE status
//         const calculatedStats = {
//           pendingFinance: cashRequestsOnly.filter(req => canFinanceApprove(req)).length,
//           pendingHeadOfBusiness: cashRequestsOnly.filter(req => isAwaitingHeadOfBusiness(req)).length,
//           approved: cashRequestsOnly.filter(req => req.trueStatus === 'approved').length,
//           partiallyDisbursed: cashRequestsOnly.filter(req => 
//             req.trueStatus === 'partially_disbursed' || 
//             (req.trueStatus === 'disbursed' && (req.remainingBalance || 0) > 0)
//           ).length,
//           fullyDisbursed: cashRequestsOnly.filter(req => 
//             req.trueStatus === 'fully_disbursed' || 
//             (req.trueStatus === 'disbursed' && (req.remainingBalance || 0) === 0)
//           ).length,
//           completed: processedData.filter(req => req.trueStatus === 'completed').length,
//           rejected: cashRequestsOnly.filter(req => req.trueStatus === 'denied').length,
//           justificationsPending: pendingJustifications
//         };

//         console.log('✅ V2 Calculated stats (with true status):', calculatedStats);
//         setStats(calculatedStats);
//       } else {
//         throw new Error('Failed to fetch data');
//       }
//     } catch (error) {
//       console.error('Error fetching data:', error);
//       message.error(error.response?.data?.message || 'Failed to load finance approvals');
//       setRequests([]);
//       setJustifications([]);
//     } finally {
//       setLoading(false);
//     }
//   }, [canUserApproveJustification, canFinanceApprove, getTrueStatus, isAwaitingHeadOfBusiness]);

//   useEffect(() => {
//     if (user?.email) {
//       fetchAllData();
//     }
//   }, [fetchAllData, user?.email]);

//   const handleRefresh = async () => {
//     await fetchAllData();
//     message.success('Data refreshed successfully');
//   };

//   // ============ DISBURSEMENT HANDLERS ============

//   const handleOpenDisbursementModal = (request) => {
//     setSelectedDisbursementRequest(request);
//     setDisbursementModalVisible(true);
//   };

//   const handleDisbursementSubmit = async ({ requestId, amount, notes }) => {
//     try {
//       console.log('Processing disbursement:', { requestId, amount, notes });
      
//       const response = await cashRequestAPI.processDisbursement(requestId, {
//         amount,
//         notes
//       });

//       if (response.success) {
//         message.success(response.message || 'Disbursement processed successfully');
//         setDisbursementModalVisible(false);
//         setSelectedDisbursementRequest(null);
//         await fetchAllData();
//       } else {
//         throw new Error(response.message || 'Failed to process disbursement');
//       }
//     } catch (error) {
//       console.error('Disbursement error:', error);
//       message.error(error.response?.data?.message || 'Failed to process disbursement');
//     }
//   };

//   // ============ JUSTIFICATION HANDLERS ============

//   const handleOpenJustificationModal = (request) => {
//     setSelectedJustificationRequest(request);
//     setJustificationModalVisible(true);
//   };

//   const handleJustificationSubmit = async ({ requestId, decision, comments }) => {
//     try {
//       console.log('Processing justification decision:', { requestId, decision, comments });
      
//       const response = await cashRequestAPI.processJustificationDecision(requestId, {
//         decision,
//         comments
//       });

//       if (response.success) {
//         message.success(response.message || `Justification ${decision} successfully`);
//         setJustificationModalVisible(false);
//         setSelectedJustificationRequest(null);
//         await fetchAllData();
//       } else {
//         throw new Error(response.message || 'Failed to process justification');
//       }
//     } catch (error) {
//       console.error('Justification decision error:', error);
//       message.error(error.response?.data?.message || 'Failed to process justification');
//     }
//   };

//   const handleReviewJustification = (requestId) => {
//     navigate(`/finance/justification/${requestId}`);
//   };

//   // ============ ✅ UPDATED: Status Tag using TRUE status ============
  
//   const getStatusTag = (request) => {
//     const trueStatus = getTrueStatus(request);
    
//     if (isJustificationStatus(trueStatus)) {
//       const statusInfo = getJustificationStatusInfo(trueStatus);
//       return (
//         <Tooltip title={statusInfo.description}>
//           <Tag color={statusInfo.color} icon={statusInfo.icon}>
//             {statusInfo.text}
//           </Tag>
//         </Tooltip>
//       );
//     }

//     const statusMap = {
//       'pending_finance': { 
//         color: 'orange', 
//         icon: <ClockCircleOutlined />, 
//         text: 'Finance Approval Required' 
//       },
//       'pending_head_of_business': {
//         color: 'purple',
//         icon: <HourglassOutlined />,
//         text: 'Awaiting HOB Final Approval'
//       },
//       'approved': { 
//         color: 'green', 
//         icon: <CheckCircleOutlined />, 
//         text: 'Approved - Ready for Disbursement' 
//       },
//       'disbursed': {
//         color: 'processing',
//         icon: <SyncOutlined spin />,
//         text: 'Disbursed'
//       },
//       'partially_disbursed': { 
//         color: 'processing', 
//         icon: <SyncOutlined spin />, 
//         text: 'Partially Disbursed' 
//       },
//       'fully_disbursed': { 
//         color: 'cyan', 
//         icon: <DollarOutlined />, 
//         text: 'Fully Disbursed - Awaiting Justification' 
//       },
//       'completed': { 
//         color: 'green', 
//         icon: <CheckCircleOutlined />, 
//         text: 'Completed' 
//       },
//       'denied': { 
//         color: 'red', 
//         icon: <CloseCircleOutlined />, 
//         text: 'Rejected' 
//       }
//     };

//     const statusInfo = statusMap[trueStatus] || { 
//       color: 'default', 
//       text: trueStatus?.replace('_', ' ') || 'Unknown' 
//     };

//     return (
//       <Tag color={statusInfo.color} icon={statusInfo.icon}>
//         {statusInfo.text}
//       </Tag>
//     );
//   };

//   const getUrgencyTag = (urgency) => {
//     const urgencyMap = {
//       'urgent': { color: 'red', text: 'Urgent' },
//       'high': { color: 'red', text: 'High' },
//       'medium': { color: 'orange', text: 'Medium' },
//       'low': { color: 'green', text: 'Low' }
//     };
//     const urgencyInfo = urgencyMap[urgency] || { color: 'default', text: urgency };

//     return (
//       <Tag color={urgencyInfo.color}>
//         {urgencyInfo.text}
//       </Tag>
//     );
//   };

//   // ✅ UPDATED: Filter requests using TRUE status
//   const getFilteredRequests = () => {
//     switch (activeTab) {
//       case 'pending':
//         return requests.filter(req => getTrueStatus(req) === 'pending_finance');
//       case 'awaiting_ceo':
//         return requests.filter(req => getTrueStatus(req) === 'pending_head_of_business');
//       case 'approved':
//         return requests.filter(req => getTrueStatus(req) === 'approved');
//       case 'partially_disbursed':
//         return requests.filter(req => {
//           const trueStatus = getTrueStatus(req);
//           return trueStatus === 'partially_disbursed' ||
//             (trueStatus === 'disbursed' && (req.remainingBalance || 0) > 0);
//         });
//       case 'fully_disbursed':
//         return requests.filter(req => {
//           const trueStatus = getTrueStatus(req);
//           return trueStatus === 'fully_disbursed' ||
//             (trueStatus === 'disbursed' && (req.remainingBalance || 0) === 0);
//         });
//       case 'completed':
//         return requests.filter(req => getTrueStatus(req) === 'completed');
//       case 'rejected':
//         return requests.filter(req => getTrueStatus(req) === 'denied');
//       default:
//         return requests;
//     }
//   };

//   // ============ TABLE COLUMNS ============
  
//   const requestColumns = [
//     {
//       title: 'Request ID',
//       dataIndex: '_id',
//       key: 'id',
//       render: (id) => (
//         <Tag color="blue">
//           REQ-{id.toString().slice(-6).toUpperCase()}
//         </Tag>
//       ),
//       width: 120
//     },
//     {
//       title: 'Employee',
//       key: 'employee',
//       render: (_, record) => (
//         <div>
//           <Text strong>{record.employee?.fullName || 'N/A'}</Text>
//           <br />
//           <Text type="secondary" style={{ fontSize: '12px' }}>
//             {record.employee?.position || 'N/A'}
//           </Text>
//           <br />
//           <Tag color="blue" size="small">{record.employee?.department || 'N/A'}</Tag>
//         </div>
//       ),
//       width: 180
//     },
//     {
//       title: 'Request Details',
//       key: 'requestDetails',
//       render: (_, record) => (
//         <div>
//           <Text strong style={{ color: '#1890ff' }}>
//             XAF {Number(record.amountRequested || 0).toLocaleString()}
//           </Text>
//           <br />
//           <Text type="secondary" style={{ fontSize: '12px' }}>
//             Type: {record.requestType?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'N/A'}
//           </Text>
//           <br />
//           <Tooltip title={record.purpose}>
//             <Text ellipsis style={{ maxWidth: 200, fontSize: '11px', color: '#666' }}>
//               {record.purpose && record.purpose.length > 40 
//                 ? `${record.purpose.substring(0, 40)}...` 
//                 : record.purpose || 'No purpose specified'
//               }
//             </Text>
//           </Tooltip>
//         </div>
//       ),
//       width: 200
//     },
//     {
//       title: 'Priority & Dates',
//       key: 'priorityDate',
//       render: (_, record) => (
//         <div>
//           {getUrgencyTag(record.urgency)}
//           <br />
//           <Text type="secondary" style={{ fontSize: '11px' }}>
//             <CalendarOutlined /> Expected: {record.requiredDate ? new Date(record.requiredDate).toLocaleDateString('en-GB') : 'N/A'}
//           </Text>
//           <br />
//           <Text type="secondary" style={{ fontSize: '11px' }}>
//             Submitted: {record.createdAt ? new Date(record.createdAt).toLocaleDateString('en-GB') : 'N/A'}
//           </Text>
//         </div>
//       ),
//       sorter: (a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0),
//       width: 140
//     },
//     {
//       title: 'Disbursement Status',
//       key: 'disbursementStatus',
//       render: (_, record) => {
//         const trueStatus = getTrueStatus(record);
//         const amountRequested = record.amountRequested || 0;
//         const totalDisbursed = record.totalDisbursed || 0;
//         const remainingBalance = record.remainingBalance || 0;
        
//         const progress = amountRequested > 0 
//           ? Math.round((totalDisbursed / amountRequested) * 100) 
//           : 0;

//         if (trueStatus === 'approved') {
//           return (
//             <div>
//               <Tag color="green" size="small">
//                 <CheckCircleOutlined /> Ready
//               </Tag>
//               <br />
//               <Text type="secondary" style={{ fontSize: '10px' }}>
//                 0 / {amountRequested.toLocaleString()}
//               </Text>
//             </div>
//           );
//         }

//         if (trueStatus === 'pending_head_of_business') {
//           return (
//             <div>
//               <Tag color="purple" size="small">
//                 <HourglassOutlined /> Awaiting HOB
//               </Tag>
//               <br />
//               <Text type="secondary" style={{ fontSize: '10px' }}>
//                 Budget Reserved
//               </Text>
//             </div>
//           );
//         }

//         if (['partially_disbursed', 'fully_disbursed', 'disbursed'].includes(trueStatus)) {
//           return (
//             <div>
//               <Progress 
//                 percent={progress} 
//                 size="small" 
//                 status={progress === 100 ? 'success' : 'active'}
//                 style={{ marginBottom: '4px' }}
//               />
//               <Text style={{ fontSize: '11px', display: 'block' }}>
//                 <Text strong style={{ color: progress === 100 ? '#52c41a' : '#1890ff' }}>
//                   {totalDisbursed.toLocaleString()}
//                 </Text>
//                 {' / '}
//                 <Text type="secondary">{amountRequested.toLocaleString()}</Text>
//               </Text>
//               {remainingBalance > 0 && (
//                 <Text type="secondary" style={{ fontSize: '10px', display: 'block' }}>
//                   Remaining: {remainingBalance.toLocaleString()}
//                 </Text>
//               )}
//               <Text type="secondary" style={{ fontSize: '10px' }}>
//                 {record.disbursements?.length || 0} payment(s)
//               </Text>
//             </div>
//           );
//         }

//         return <Text type="secondary" style={{ fontSize: '11px' }}>Not disbursed</Text>;
//       },
//       width: 180
//     },
//     {
//       title: 'Status',
//       key: 'status',
//       render: (_, record) => getStatusTag(record),
//       width: 220
//     },
//     {
//       title: 'Actions',
//       key: 'actions',
//       render: (_, record) => (
//         <Space direction="vertical" size="small">
//           <Button 
//             type="link" 
//             icon={<EyeOutlined />}
//             onClick={() => navigate(`/finance/cash-request/${record._id}`)}
//             size="small"
//           >
//             View Details
//           </Button>
          
//           {canFinanceApprove(record) && (
//             <Button 
//               type="primary"
//               size="small"
//               icon={<CheckCircleOutlined />}
//               onClick={() => navigate(`/finance/cash-request/${record._id}`)}
//             >
//               Approve & Allocate Budget
//             </Button>
//           )}
          
//           {isAwaitingHeadOfBusiness(record) && (
//             <Tooltip title="Awaiting Head of Business final approval before disbursement">
//               <Button 
//                 size="small"
//                 icon={<HourglassOutlined />}
//                 disabled
//                 style={{ color: '#9254de', borderColor: '#9254de' }}
//               >
//                 Awaiting HOB Approval
//               </Button>
//             </Tooltip>
//           )}
          
//           {canFinanceDisburse(record) && (
//             <Button 
//               type="default"
//               size="small"
//               icon={<SendOutlined />}
//               onClick={() => handleOpenDisbursementModal(record)}
//               style={{ color: '#52c41a', borderColor: '#52c41a' }}
//             >
//               {getTrueStatus(record) === 'partially_disbursed' ? 'Continue Disbursement' : 'Disburse'}
//             </Button>
//           )}
//         </Space>
//       ),
//       width: 200
//     }
//   ];

//   const justificationColumns = [
//     {
//       title: 'Request ID',
//       dataIndex: '_id',
//       key: 'id',
//       width: 140,
//       render: (id) => <Tag color="blue">REQ-{id.toString().slice(-6).toUpperCase()}</Tag>
//     },
//     {
//       title: 'Employee',
//       key: 'employee',
//       render: (_, record) => (
//         <div>
//           <Text strong>{record.employee?.fullName || 'N/A'}</Text>
//           <br />
//           <Tag color="blue" size="small">
//             {record.employee?.department || 'N/A'}
//           </Tag>
//         </div>
//       ),
//       width: 180
//     },
//     {
//       title: 'Financial Summary',
//       key: 'financial',
//       render: (_, record) => {
//         const disbursed = record.disbursementDetails?.amount || record.totalDisbursed || 0;
//         const spent = record.justification?.amountSpent || 0;
//         const returned = record.justification?.balanceReturned || 0;
//         const isBalanced = Math.abs((spent + returned) - disbursed) < 0.01;

//         return (
//           <div>
//             <Text type="secondary" style={{ fontSize: '11px' }}>
//               Disbursed: XAF {disbursed.toLocaleString()}
//             </Text>
//             <br />
//             <Text type="secondary" style={{ fontSize: '11px' }}>
//               Spent: XAF {spent.toLocaleString()}
//             </Text>
//             <br />
//             <Text type="secondary" style={{ fontSize: '11px' }}>
//               Returned: XAF {returned.toLocaleString()}
//             </Text>
//             <br />
//             {!isBalanced && (
//               <Tag color="warning" size="small">Unbalanced</Tag>
//             )}
//           </div>
//         );
//       },
//       width: 180
//     },
//     {
//       title: 'Submitted Date',
//       key: 'date',
//       render: (_, record) => (
//         <Text type="secondary">
//           {record.justification?.justificationDate 
//             ? new Date(record.justification.justificationDate).toLocaleDateString('en-GB')
//             : 'N/A'
//           }
//         </Text>
//       ),
//       width: 120
//     },
//     {
//       title: 'Approval Progress',
//       key: 'progress',
//       render: (_, record) => {
//         if (!record.justificationApprovalChain) return <Text type="secondary">No chain</Text>;
        
//         const currentLevel = extractJustificationLevel(record.status);
//         const totalLevels = record.justificationApprovalChain.length;
//         const approvedCount = record.justificationApprovalChain.filter(s => s.status === 'approved').length;
        
//         return (
//           <div>
//             <Progress 
//               percent={Math.round((approvedCount / totalLevels) * 100)} 
//               size="small"
//               status={record.status === 'completed' ? 'success' : 'active'}
//               showInfo={false}
//             />
//             <Text style={{ fontSize: '11px' }}>
//               Level {currentLevel || approvedCount + 1}/{totalLevels}
//             </Text>
//           </div>
//         );
//       },
//       width: 120
//     },
//     {
//       title: 'Status',
//       key: 'justificationStatus',
//       render: (_, record) => (<div>
//           {getStatusTag(record)}
//           {canUserApproveJustification(record) && (
//             <div style={{ marginTop: 4 }}>
//               <Tag color="gold" size="small">Your Turn</Tag>
//             </div>
//           )}
//         </div>
//       ),
//       width: 200
//     },
//     {
//       title: 'Documents',
//       key: 'documents',
//       render: (_, record) => (
//         <Badge 
//           count={record.justification?.documents?.length || 0} 
//           showZero
//           style={{ backgroundColor: '#52c41a' }}
//         >
//           <FileTextOutlined style={{ fontSize: '16px' }} />
//         </Badge>
//       ),
//       width: 100
//     },
//     {
//       title: 'Action',
//       key: 'action',
//       width: 180,
//       render: (_, record) => (
//         <Space size="small" direction="vertical">
//           <Button
//             size="small"
//             icon={<EyeOutlined />}
//             onClick={() => handleReviewJustification(record._id)}
//             block
//           >
//             View Details
//           </Button>
//           {canUserApproveJustification(record) && (
//             <Button
//               size="small"
//               type="primary"
//               icon={<AuditOutlined />}
//               onClick={() => handleOpenJustificationModal(record)}
//               block
//             >
//               Approve/Reject
//             </Button>
//           )}
//         </Space>
//       )
//     }
//   ];

//   const pendingForMe = requests.filter(req => canFinanceApprove(req)).length;
//   const readyForDisbursement = stats.approved + stats.partiallyDisbursed;

//   if (loading && requests.length === 0 && justifications.length === 0) {
//     return (
//       <div style={{ padding: '24px', textAlign: 'center' }}>
//         <Spin size="large" />
//         <div style={{ marginTop: '16px' }}>Loading finance cash approvals...</div>
//       </div>
//     );
//   }

//   return (
//     <div style={{ padding: '24px' }}>
//       {/* Stats Cards */}
//       <Row gutter={16} style={{ marginBottom: '24px' }}>
//         <Col span={4}>
//           <Card size="small">
//             <Statistic
//               title="Your Approvals"
//               value={pendingForMe}
//               prefix={<ClockCircleOutlined />}
//               valueStyle={{ color: '#faad14' }}
//             />
//           </Card>
//         </Col>
//         <Col span={4}>
//           <Card size="small">
//             <Statistic
//               title="Awaiting HOB"
//               value={stats.pendingHeadOfBusiness}
//               prefix={<HourglassOutlined />}
//               valueStyle={{ color: '#9254de' }}
//             />
//           </Card>
//         </Col>
//         <Col span={4}>
//           <Card size="small">
//             <Statistic
//               title="Ready to Disburse"
//               value={stats.approved}
//               prefix={<CheckCircleOutlined />}
//               valueStyle={{ color: '#52c41a' }}
//             />
//           </Card>
//         </Col>
//         <Col span={4}>
//           <Card size="small">
//             <Statistic
//               title="Partial Disbursed"
//               value={stats.partiallyDisbursed}
//               prefix={<SyncOutlined />}
//               valueStyle={{ color: '#1890ff' }}
//             />
//           </Card>
//         </Col>
//         <Col span={4}>
//           <Card size="small">
//             <Statistic
//               title="Justifications"
//               value={stats.justificationsPending}
//               prefix={<FileTextOutlined />}
//               valueStyle={{ color: '#722ed1' }}
//             />
//           </Card>
//         </Col>
//         <Col span={4}>
//           <Card size="small">
//             <Statistic
//               title="Completed"
//               value={stats.completed}
//               prefix={<CheckCircleOutlined />}
//               valueStyle={{ color: '#52c41a' }}
//             />
//           </Card>
//         </Col>
//       </Row>

//       {/* Main Content */}
//       <Card>
//         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
//           <Title level={2} style={{ margin: 0 }}>
//             <BankOutlined /> Finance Cash Approvals
//           </Title>
//           <Space>
//             <Button 
//               icon={<ReloadOutlined />}
//               onClick={handleRefresh}
//               loading={loading}
//             >
//               Refresh
//             </Button>
//             <Button 
//               type="primary"
//               icon={<DownloadOutlined />}
//               onClick={() => setExportModalVisible(true)}
//             >
//               Export Data
//             </Button>
//           </Space>
//         </div>

//         {/* Alert Messages */}
//         {(pendingForMe > 0 || stats.pendingHeadOfBusiness > 0 || readyForDisbursement > 0 || stats.justificationsPending > 0) && (
//           <Alert
//             message={
//               <div>
//                 {pendingForMe > 0 && (
//                   <div>🔔 You have {pendingForMe} cash request(s) waiting for your approval (Finance Level)</div>
//                 )}
//                 {stats.pendingHeadOfBusiness > 0 && (
//                   <div>⏳ {stats.pendingHeadOfBusiness} request(s) are awaiting Head of Business final approval</div>
//                 )}
//                 {readyForDisbursement > 0 && (
//                   <div>💰 {readyForDisbursement} request(s) are ready for disbursement (HOB Approved)</div>
//                 )}
//                 {stats.justificationsPending > 0 && (
//                   <div>📄 {stats.justificationsPending} justification(s) require your review</div>
//                 )}
//               </div>
//             }
//             type="warning"
//             showIcon
//             style={{ marginBottom: '16px' }}
//           />
//         )}

//         {/* Tabs */}
//         <Tabs activeKey={activeTab} onChange={setActiveTab}>
//           <TabPane 
//             tab={
//               <Badge count={stats.pendingFinance} offset={[10, 0]} color="#faad14">
//                 <span>
//                   <ExclamationCircleOutlined />
//                   Your Approvals ({stats.pendingFinance})
//                 </span>
//               </Badge>
//             } 
//             key="pending"
//           >
//             <Table 
//               columns={requestColumns} 
//               dataSource={getFilteredRequests()} 
//               loading={loading}
//               rowKey="_id"
//               pagination={{ 
//                 pageSize: 10,
//                 showSizeChanger: true,
//                 showQuickJumper: true,
//                 showTotal: (total, range) => 
//                   `${range[0]}-${range[1]} of ${total} requests`
//               }}
//               scroll={{ x: 'max-content' }}
//               rowClassName={(record) => {
//                 if (canFinanceApprove(record)) {
//                   return 'highlight-row-urgent'; 
//                 }
//                 return '';
//               }}
//             />
//           </TabPane>

//           {/* NEW TAB: Awaiting HOB */}
//           <TabPane 
//             tab={
//               <Badge count={stats.pendingHeadOfBusiness} offset={[10, 0]} color="#9254de">
//                 <span>
//                   <HourglassOutlined />
//                   Awaiting HOB ({stats.pendingHeadOfBusiness})
//                 </span>
//               </Badge>
//             } 
//             key="awaiting_ceo"
//           >
//             <Table 
//               columns={requestColumns} 
//               dataSource={getFilteredRequests()} 
//               loading={loading}
//               rowKey="_id"
//               pagination={{ 
//                 pageSize: 10,
//                 showSizeChanger: true,
//                 showQuickJumper: true,
//                 showTotal: (total, range) => 
//                   `${range[0]}-${range[1]} of ${total} requests`
//               }}
//               scroll={{ x: 'max-content' }}
//               rowClassName={() => 'highlight-row-awaiting-ceo'}
//             />
//           </TabPane>

//           <TabPane
//             tab={
//               <Badge count={stats.justificationsPending} offset={[10, 0]} color="#722ed1">
//                 <span>
//                   <FileTextOutlined />
//                   Justifications ({stats.justificationsPending})
//                 </span>
//               </Badge>
//             }
//             key="justifications"
//           >
//             {activeTab === 'justifications' && (
//               <Table
//                 columns={justificationColumns}
//                 dataSource={justifications}
//                 loading={loading}
//                 rowKey="_id"
//                 pagination={{ 
//                   pageSize: 10, 
//                   showSizeChanger: true,
//                   showQuickJumper: true,
//                   showTotal: (total, range) => 
//                     `${range[0]}-${range[1]} of ${total} justifications`
//                 }}
//                 scroll={{ x: 1200 }}
//                 size="small"
//                 rowClassName={(record) => {
//                   let className = 'cash-request-row';
//                   if (canUserApproveJustification(record)) {
//                     className += ' pending-approval-row';
//                   }
//                   return className;
//                 }}
//               />
//             )}
//           </TabPane>

//           <TabPane 
//             tab={
//               <Badge count={stats.approved} offset={[10, 0]} color="#52c41a">
//                 <span>
//                   <CheckCircleOutlined />
//                   Ready to Disburse ({stats.approved})
//                 </span>
//               </Badge>
//             } 
//             key="approved"
//           >
//             <Table 
//               columns={requestColumns} 
//               dataSource={getFilteredRequests()} 
//               loading={loading}
//               rowKey="_id"
//               pagination={{ 
//                 pageSize: 10,
//                 showSizeChanger: true,
//                 showQuickJumper: true,
//                 showTotal: (total, range) => 
//                   `${range[0]}-${range[1]} of ${total} requests`
//               }}
//               scroll={{ x: 'max-content' }}
//               rowClassName={() => 'highlight-row-ready'}
//             />
//           </TabPane>

//           <TabPane 
//             tab={
//               <Badge count={stats.partiallyDisbursed} offset={[10, 0]} color="#1890ff">
//                 <span>
//                   <SyncOutlined />
//                   Partially Disbursed ({stats.partiallyDisbursed})
//                 </span>
//               </Badge>
//             } 
//             key="partially_disbursed"
//           >
//             <Table 
//               columns={requestColumns} 
//               dataSource={getFilteredRequests()} 
//               loading={loading}
//               rowKey="_id"
//               pagination={{ 
//                 pageSize: 10,
//                 showSizeChanger: true,
//                 showQuickJumper: true,
//                 showTotal: (total, range) => 
//                   `${range[0]}-${range[1]} of ${total} requests`
//               }}
//               scroll={{ x: 'max-content' }}
//               rowClassName={() => 'highlight-row-partial'}
//             />
//           </TabPane>

//           <TabPane 
//             tab={
//               <Badge count={stats.fullyDisbursed} offset={[10, 0]} color="#13c2c2">
//                 <span>
//                   <DollarOutlined />
//                   Fully Disbursed ({stats.fullyDisbursed})
//                 </span>
//               </Badge>
//             } 
//             key="fully_disbursed"
//           >
//             <Table 
//               columns={requestColumns} 
//               dataSource={getFilteredRequests()} 
//               loading={loading}
//               rowKey="_id"
//               pagination={{ 
//                 pageSize: 10,
//                 showSizeChanger: true,
//                 showQuickJumper: true,
//                 showTotal: (total, range) => 
//                   `${range[0]}-${range[1]} of ${total} requests`
//               }}
//               scroll={{ x: 'max-content' }}
//             />
//           </TabPane>

//           <TabPane 
//             tab={
//               <span>
//                 <CheckCircleOutlined />
//                 Completed ({stats.completed})
//               </span>
//             } 
//             key="completed"
//           >
//             <Table 
//               columns={requestColumns} 
//               dataSource={getFilteredRequests()} 
//               loading={loading}
//               rowKey="_id"
//               pagination={{ 
//                 pageSize: 10,
//                 showSizeChanger: true,
//                 showQuickJumper: true,
//                 showTotal: (total, range) => 
//                   `${range[0]}-${range[1]} of ${total} requests`
//               }}
//               scroll={{ x: 'max-content' }}
//             />
//           </TabPane>

//           <TabPane 
//             tab={
//               <span>
//                 <CloseCircleOutlined />
//                 Rejected ({stats.rejected})
//               </span>
//             } 
//             key="rejected"
//           >
//             <Table 
//               columns={requestColumns} 
//               dataSource={getFilteredRequests()} 
//               loading={loading}
//               rowKey="_id"
//               pagination={{ 
//                 pageSize: 10,
//                 showSizeChanger: true,
//                 showQuickJumper: true,
//                 showTotal: (total, range) => 
//                   `${range[0]}-${range[1]} of ${total} requests`
//               }}
//               scroll={{ x: 'max-content' }}
//             />
//           </TabPane>
//         </Tabs>
//       </Card>

//       {/* Modals */}
//       <DisbursementModal
//         visible={disbursementModalVisible}
//         request={selectedDisbursementRequest}
//         onSubmit={handleDisbursementSubmit}
//         onCancel={() => {
//           setDisbursementModalVisible(false);
//           setSelectedDisbursementRequest(null);
//         }}
//       />

//       <JustificationApprovalModal
//         visible={justificationModalVisible}
//         request={selectedJustificationRequest}
//         onSubmit={handleJustificationSubmit}
//         onCancel={() => {
//           setJustificationModalVisible(false);
//           setSelectedJustificationRequest(null);
//         }}
//       />

//       <CashRequestExportModal
//         visible={exportModalVisible}
//         onCancel={() => setExportModalVisible(false)}
//       />

//       {/* Styles */}
//       <style>{`
//         .highlight-row-urgent {
//           background-color: #fff7e6 !important;
//           border-left: 4px solid #faad14 !important;
//         }
//         .highlight-row-urgent:hover {
//           background-color: #fff1d6 !important;
//         }
//         .highlight-row-awaiting-ceo {
//           background-color: #f9f0ff !important;
//           border-left: 4px solid #9254de !important;
//         }
//         .highlight-row-awaiting-ceo:hover {
//           background-color: #efdbff !important;
//         }
//         .highlight-row-ready {
//           background-color: #f6ffed !important;
//           border-left: 4px solid #52c41a !important;
//         }
//         .highlight-row-ready:hover {
//           background-color: #d9f7be !important;
//         }
//         .highlight-row-partial {
//           background-color: #e6f7ff !important;
//           border-left: 4px solid #1890ff !important;
//         }
//         .highlight-row-partial:hover {
//           background-color: #bae7ff !important;
//         }
//         .cash-request-row {
//           background-color: #fafafa;
//         }
//         .cash-request-row:hover {
//           background-color: #f0f0f0 !important;
//         }
//         .pending-approval-row {
//           border-left: 3px solid #faad14;
//           background-color: #fff7e6;
//         }
//         .pending-approval-row:hover {
//           background-color: #fff1d6 !important;
//         }
//       `}</style>
//     </div>
//   );
// };

// export default FinanceCashApprovals;













// import React, { useState, useEffect, useCallback } from 'react';
// import { useNavigate } from 'react-router-dom';
// import { useSelector } from 'react-redux';
// import {
//   Card,
//   Table,
//   Tag,
//   Space,
//   Typography,
//   Button,
//   Alert,
//   Spin,
//   message,
//   Badge,
//   Tooltip,
//   Tabs,
//   Progress,
//   Statistic,
//   Row,
//   Col
// } from 'antd';
// import {
//   CheckCircleOutlined,
//   CloseCircleOutlined,
//   ClockCircleOutlined,
//   DollarOutlined,
//   CalendarOutlined,
//   BankOutlined,
//   EyeOutlined,
//   ReloadOutlined,
//   ExclamationCircleOutlined,
//   SendOutlined,
//   FileTextOutlined,
//   AuditOutlined,
//   DownloadOutlined,
//   SyncOutlined,
//   HourglassOutlined
// } from '@ant-design/icons';
// import { cashRequestAPI } from '../../services/cashRequestAPI';
// import CashRequestExportModal from './CashRequestExport';
// import DisbursementModal from './DisbursementModal';
// import JustificationApprovalModal from './JustificationApprovalModal';

// const { Title, Text } = Typography;
// const { TabPane } = Tabs;

// const FinanceCashApprovals = () => {
//   const navigate = useNavigate();
//   const { user } = useSelector((state) => state.auth);
  
//   const [requests, setRequests] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [activeTab, setActiveTab] = useState('pending');
//   const [exportModalVisible, setExportModalVisible] = useState(false);
  
//   // Disbursement modal state
//   const [disbursementModalVisible, setDisbursementModalVisible] = useState(false);
//   const [selectedDisbursementRequest, setSelectedDisbursementRequest] = useState(null);
  
//   // Justification modal state
//   const [justificationModalVisible, setJustificationModalVisible] = useState(false);
//   const [selectedJustificationRequest, setSelectedJustificationRequest] = useState(null);
  
//   const [stats, setStats] = useState({
//     pendingFinance: 0,
//     pendingHeadOfBusiness: 0,  // ✅ NEW: Track requests awaiting CEO
//     approved: 0,
//     partiallyDisbursed: 0,
//     fullyDisbursed: 0,
//     completed: 0,
//     rejected: 0,
//     justificationsPending: 0
//   });
//   const [justifications, setJustifications] = useState([]);

//   // ============ ✅ NEW HELPER FUNCTIONS FOR V2 FLOW ============

//   /**
//    * Check if Finance can APPROVE this request (at Finance level)
//    */
//   const canFinanceApprove = useCallback((request) => {
//     if (!request || !user?.email) return false;
    
//     // Must be at pending_finance status
//     if (request.status !== 'pending_finance') return false;
    
//     // Find Finance's pending step
//     const financeStep = request.approvalChain?.find(step =>
//       step.approver?.email?.toLowerCase() === user.email.toLowerCase() &&
//       step.approver?.role === 'Finance Officer' &&
//       step.status === 'pending'
//     );
    
//     if (!financeStep) return false;
    
//     // Check if all previous levels are approved
//     const previousLevels = request.approvalChain.filter(s => s.level < financeStep.level);
//     const allPreviousApproved = previousLevels.every(s => s.status === 'approved');
    
//     return allPreviousApproved;
//   }, [user?.email]);

//   /**
//    * Check if Finance can DISBURSE this request (after Head of Business approval)
//    */
//   const canFinanceDisburse = useCallback((request) => {
//     if (!request) return false;
    
//     // ✅ V2 RULE: Can only disburse AFTER Head of Business approves
//     // Status must be 'approved' (meaning all approvals including CEO are complete)
//     // OR partially_disbursed (continuing disbursement)
//     const validStatuses = ['approved', 'partially_disbursed'];
    
//     if (!validStatuses.includes(request.status)) {
//       return false;
//     }
    
//     // Check if remaining balance exists
//     const remainingBalance = request.remainingBalance || 0;
    
//     return remainingBalance > 0;
//   }, []);

//   /**
//    * Check if request is awaiting Head of Business approval (after Finance)
//    */
//   const isAwaitingHeadOfBusiness = (request) => {
//     return request.status === 'pending_head_of_business';
//   };

//   // ============ EXISTING HELPER FUNCTIONS ============

//   const isJustificationStatus = (status) => {
//     return status && (
//       status.includes('justification_pending') || 
//       status.includes('justification_rejected') ||
//       status === 'completed'
//     );
//   };

//   const extractJustificationLevel = (status) => {
//     if (!status || !status.includes('justification_')) return null;
    
//     const levelMap = {
//       'justification_pending_supervisor': 1,
//       'justification_pending_departmental_head': 2,
//       'justification_pending_hr': 3,              // ✅ NEW
//       'justification_pending_finance': 4,
//       'justification_rejected_supervisor': 1,
//       'justification_rejected_departmental_head': 2,
//       'justification_rejected_hr': 3,             // ✅ NEW
//       'justification_rejected_finance': 4
//     };
    
//     return levelMap[status] || null;
//   };

//   const getJustificationStatusInfo = (status, level = null) => {
//     const statusLevel = level || extractJustificationLevel(status);
    
//     const levelNames = {
//       1: 'Supervisor',
//       2: 'Departmental Head',
//       3: 'HR Head',              // ✅ UPDATED
//       4: 'Finance'
//     };
    
//     if (status === 'completed') {
//       return {
//         text: 'Completed',
//         color: 'cyan',
//         icon: <CheckCircleOutlined />,
//         description: 'All approvals completed'
//       };
//     }
    
//     if (status?.includes('justification_rejected')) {
//       return {
//         text: `Revision Required (${levelNames[statusLevel]})`,
//         color: 'gold',
//         icon: <ExclamationCircleOutlined />,
//         description: `Rejected at Level ${statusLevel} - ${levelNames[statusLevel]}`
//       };
//     }
    
//     if (status?.includes('justification_pending')) {
//       return {
//         text: `Level ${statusLevel}/4: Pending ${levelNames[statusLevel]}`,
//         color: 'orange',
//         icon: <ClockCircleOutlined />,
//         description: `Awaiting approval from ${levelNames[statusLevel]}`
//       };
//     }
    
//     return {
//       text: status?.replace(/_/g, ' ') || 'Unknown',
//       color: 'default',
//       icon: null,
//       description: ''
//     };
//   };

//   const canUserApproveJustification = useCallback((request) => {
//     if (!request.justificationApprovalChain || !user?.email) {
//       return false;
//     }

//     if (!isJustificationStatus(request.status)) {
//       return false;
//     }

//     const currentStatusLevel = extractJustificationLevel(request.status);
    
//     if (!currentStatusLevel) {
//       return false;
//     }

//     const userPendingSteps = request.justificationApprovalChain.filter(step => {
//       const emailMatch = step.approver?.email?.toLowerCase() === user.email.toLowerCase();
//       const isPending = step.status === 'pending';
      
//       return emailMatch && isPending;
//     });

//     if (userPendingSteps.length === 0) {
//       return false;
//     }

//     const canApprove = userPendingSteps.some(step => step.level === currentStatusLevel);

//     return canApprove;
//   }, [user?.email]);

//   // ============ DATA FETCHING ============

//   const fetchAllData = useCallback(async () => {
//     try {
//       setLoading(true);
//       console.log('Fetching all cash requests and justifications...');

//       const response = await cashRequestAPI.getFinanceRequests();

//       if (response && response.success) {
//         const allData = response.data || [];
        
//         console.log('Total records fetched:', allData.length);
        
//         // Improved: More precise separation
//         const cashRequestsOnly = allData.filter(req =>
//           !isJustificationStatus(req.status) &&
//           [
//             'pending_finance',           // ✅ Finance approval needed
//             'pending_head_of_business',  // ✅ NEW: Awaiting HOB after Finance
//             'approved',                  // ✅ Ready for disbursement
//             'disbursed', 
//             'partially_disbursed', 
//             'fully_disbursed', 
//             'denied'
//           ].includes(req.status)
//         );
//         const justificationsOnly = allData.filter(req => isJustificationStatus(req.status));
        
//         console.log('Cash requests:', cashRequestsOnly.length);
//         console.log('Justifications:', justificationsOnly.length);
        
//         setRequests(cashRequestsOnly);
//         setJustifications(justificationsOnly);

//         const pendingJustifications = justificationsOnly.filter(j => 
//           canUserApproveJustification(j)
//         ).length;

//         console.log('Pending justifications for user:', pendingJustifications);

//         // ✅ UPDATED: Calculate stats for V2 flow
//         const calculatedStats = {
//           pendingFinance: cashRequestsOnly.filter(req => canFinanceApprove(req)).length,
//           pendingHeadOfBusiness: cashRequestsOnly.filter(req => isAwaitingHeadOfBusiness(req)).length,  // ✅ NEW
//           approved: cashRequestsOnly.filter(req => req.status === 'approved').length,
//           partiallyDisbursed: cashRequestsOnly.filter(req => 
//             req.status === 'partially_disbursed' || 
//             (req.status === 'disbursed' && (req.remainingBalance || 0) > 0)
//           ).length,
//           fullyDisbursed: cashRequestsOnly.filter(req => 
//             req.status === 'fully_disbursed' || 
//             (req.status === 'disbursed' && (req.remainingBalance || 0) === 0)
//           ).length,
//           completed: allData.filter(req => req.status === 'completed').length,
//           rejected: cashRequestsOnly.filter(req => req.status === 'denied').length,
//           justificationsPending: pendingJustifications
//         };

//         console.log('✅ V2 Calculated stats:', calculatedStats);
//         setStats(calculatedStats);
//       } else {
//         throw new Error('Failed to fetch data');
//       }
//     } catch (error) {
//       console.error('Error fetching data:', error);
//       message.error(error.response?.data?.message || 'Failed to load finance approvals');
//       setRequests([]);
//       setJustifications([]);
//     } finally {
//       setLoading(false);
//     }
//   }, [canUserApproveJustification, canFinanceApprove]);

//   useEffect(() => {
//     if (user?.email) {
//       fetchAllData();
//     }
//   }, [fetchAllData, user?.email]);

//   const handleRefresh = async () => {
//     await fetchAllData();
//     message.success('Data refreshed successfully');
//   };

//   // ============ DISBURSEMENT HANDLERS ============

//   const handleOpenDisbursementModal = (request) => {
//     setSelectedDisbursementRequest(request);
//     setDisbursementModalVisible(true);
//   };

//   const handleDisbursementSubmit = async ({ requestId, amount, notes }) => {
//     try {
//       console.log('Processing disbursement:', { requestId, amount, notes });
      
//       const response = await cashRequestAPI.processDisbursement(requestId, {
//         amount,
//         notes
//       });

//       if (response.success) {
//         message.success(response.message || 'Disbursement processed successfully');
//         setDisbursementModalVisible(false);
//         setSelectedDisbursementRequest(null);
//         await fetchAllData();
//       } else {
//         throw new Error(response.message || 'Failed to process disbursement');
//       }
//     } catch (error) {
//       console.error('Disbursement error:', error);
//       message.error(error.response?.data?.message || 'Failed to process disbursement');
//     }
//   };

//   // ============ JUSTIFICATION HANDLERS ============

//   const handleOpenJustificationModal = (request) => {
//     setSelectedJustificationRequest(request);
//     setJustificationModalVisible(true);
//   };

//   const handleJustificationSubmit = async ({ requestId, decision, comments }) => {
//     try {
//       console.log('Processing justification decision:', { requestId, decision, comments });
      
//       const response = await cashRequestAPI.processJustificationDecision(requestId, {
//         decision,
//         comments
//       });

//       if (response.success) {
//         message.success(response.message || `Justification ${decision} successfully`);
//         setJustificationModalVisible(false);
//         setSelectedJustificationRequest(null);
//         await fetchAllData();
//       } else {
//         throw new Error(response.message || 'Failed to process justification');
//       }
//     } catch (error) {
//       console.error('Justification decision error:', error);
//       message.error(error.response?.data?.message || 'Failed to process justification');
//     }
//   };

//   const handleReviewJustification = (requestId) => {
//     navigate(`/finance/justification/${requestId}`);
//   };

//   // ============ ✅ UPDATED: Status Tag for V2 Flow ============
  
//   const getStatusTag = (status) => {
//     if (isJustificationStatus(status)) {
//       const statusInfo = getJustificationStatusInfo(status);
//       return (
//         <Tooltip title={statusInfo.description}>
//           <Tag color={statusInfo.color} icon={statusInfo.icon}>
//             {statusInfo.text}
//           </Tag>
//         </Tooltip>
//       );
//     }

//     const statusMap = {
//       'pending_finance': { 
//         color: 'orange', 
//         icon: <ClockCircleOutlined />, 
//         text: 'Finance Approval Required' 
//       },
//       'pending_head_of_business': {  // ✅ NEW
//         color: 'purple',
//         icon: <HourglassOutlined />,
//         text: 'Awaiting HOB Final Approval'
//       },
//       'approved': { 
//         color: 'green', 
//         icon: <CheckCircleOutlined />, 
//         text: 'Approved - Ready for Disbursement' 
//       },
//       'disbursed': {
//         color: 'processing',
//         icon: <SyncOutlined spin />,
//         text: 'Disbursed'
//       },
//       'partially_disbursed': { 
//         color: 'processing', 
//         icon: <SyncOutlined spin />, 
//         text: 'Partially Disbursed' 
//       },
//       'fully_disbursed': { 
//         color: 'cyan', 
//         icon: <DollarOutlined />, 
//         text: 'Fully Disbursed - Awaiting Justification' 
//       },
//       'completed': { 
//         color: 'green', 
//         icon: <CheckCircleOutlined />, 
//         text: 'Completed' 
//       },
//       'denied': { 
//         color: 'red', 
//         icon: <CloseCircleOutlined />, 
//         text: 'Rejected' 
//       }
//     };

//     const statusInfo = statusMap[status] || { 
//       color: 'default', 
//       text: status?.replace('_', ' ') || 'Unknown' 
//     };

//     return (
//       <Tag color={statusInfo.color} icon={statusInfo.icon}>
//         {statusInfo.text}
//       </Tag>
//     );
//   };

//   const getUrgencyTag = (urgency) => {
//     const urgencyMap = {
//       'urgent': { color: 'red', text: 'Urgent' },
//       'high': { color: 'red', text: 'High' },
//       'medium': { color: 'orange', text: 'Medium' },
//       'low': { color: 'green', text: 'Low' }
//     };
//     const urgencyInfo = urgencyMap[urgency] || { color: 'default', text: urgency };

//     return (
//       <Tag color={urgencyInfo.color}>
//         {urgencyInfo.text}
//       </Tag>
//     );
//   };

//   const getFilteredRequests = () => {
//     switch (activeTab) {
//       case 'pending':
//         return requests.filter(req => req.status === 'pending_finance');
//       case 'awaiting_ceo':  // ✅ NEW TAB
//         return requests.filter(req => req.status === 'pending_head_of_business');
//       case 'approved':
//         return requests.filter(req => req.status === 'approved');
//       case 'partially_disbursed':
//         return requests.filter(req =>
//           req.status === 'partially_disbursed' ||
//           (req.status === 'disbursed' && (req.remainingBalance || 0) > 0)
//         );
//       case 'fully_disbursed':
//         return requests.filter(req =>
//           req.status === 'fully_disbursed' ||
//           (req.status === 'disbursed' && (req.remainingBalance || 0) === 0)
//         );
//       case 'completed':
//         return requests.filter(req => req.status === 'completed');
//       case 'rejected':
//         return requests.filter(req => req.status === 'denied');
//       default:
//         return requests;
//     }
//   };

//   // ============ ✅ UPDATED: Table Columns with V2 Actions ============
  
//   const requestColumns = [
//     {
//       title: 'Request ID',
//       dataIndex: '_id',
//       key: 'id',
//       render: (id) => (
//         <Tag color="blue">
//           REQ-{id.toString().slice(-6).toUpperCase()}
//         </Tag>
//       ),
//       width: 120
//     },
//     {
//       title: 'Employee',
//       key: 'employee',
//       render: (_, record) => (
//         <div>
//           <Text strong>{record.employee?.fullName || 'N/A'}</Text>
//           <br />
//           <Text type="secondary" style={{ fontSize: '12px' }}>
//             {record.employee?.position || 'N/A'}
//           </Text>
//           <br />
//           <Tag color="blue" size="small">{record.employee?.department || 'N/A'}</Tag>
//         </div>
//       ),
//       width: 180
//     },
//     {
//       title: 'Request Details',
//       key: 'requestDetails',
//       render: (_, record) => (
//         <div>
//           <Text strong style={{ color: '#1890ff' }}>
//             XAF {Number(record.amountRequested || 0).toLocaleString()}
//           </Text>
//           <br />
//           <Text type="secondary" style={{ fontSize: '12px' }}>
//             Type: {record.requestType?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'N/A'}
//           </Text>
//           <br />
//           <Tooltip title={record.purpose}>
//             <Text ellipsis style={{ maxWidth: 200, fontSize: '11px', color: '#666' }}>
//               {record.purpose && record.purpose.length > 40 
//                 ? `${record.purpose.substring(0, 40)}...` 
//                 : record.purpose || 'No purpose specified'
//               }
//             </Text>
//           </Tooltip>
//         </div>
//       ),
//       width: 200
//     },
//     {
//       title: 'Priority & Dates',
//       key: 'priorityDate',
//       render: (_, record) => (
//         <div>
//           {getUrgencyTag(record.urgency)}
//           <br />
//           <Text type="secondary" style={{ fontSize: '11px' }}>
//             <CalendarOutlined /> Expected: {record.requiredDate ? new Date(record.requiredDate).toLocaleDateString('en-GB') : 'N/A'}
//           </Text>
//           <br />
//           <Text type="secondary" style={{ fontSize: '11px' }}>
//             Submitted: {record.createdAt ? new Date(record.createdAt).toLocaleDateString('en-GB') : 'N/A'}
//           </Text>
//         </div>
//       ),
//       sorter: (a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0),
//       width: 140
//     },
//     {
//       title: 'Disbursement Status',
//       key: 'disbursementStatus',
//       render: (_, record) => {
//         const amountRequested = record.amountRequested || 0;
//         const totalDisbursed = record.totalDisbursed || 0;
//         const remainingBalance = record.remainingBalance || 0;
        
//         const progress = amountRequested > 0 
//           ? Math.round((totalDisbursed / amountRequested) * 100) 
//           : 0;

//         if (record.status === 'approved') {
//           return (
//             <div>
//               <Tag color="green" size="small">
//                 <CheckCircleOutlined /> Ready
//               </Tag>
//               <br />
//               <Text type="secondary" style={{ fontSize: '10px' }}>
//                 0 / {amountRequested.toLocaleString()}
//               </Text>
//             </div>
//           );
//         }

//         if (record.status === 'pending_head_of_business') {  // ✅ NEW
//           return (
//             <div>
//               <Tag color="purple" size="small">
//                 <HourglassOutlined /> Awaiting HOB
//               </Tag>
//               <br />
//               <Text type="secondary" style={{ fontSize: '10px' }}>
//                 Budget Reserved
//               </Text>
//             </div>
//           );
//         }

//         if (['partially_disbursed', 'fully_disbursed', 'disbursed'].includes(record.status)) {
//           return (
//             <div>
//               <Progress 
//                 percent={progress} 
//                 size="small" 
//                 status={progress === 100 ? 'success' : 'active'}
//                 style={{ marginBottom: '4px' }}
//               />
//               <Text style={{ fontSize: '11px', display: 'block' }}>
//                 <Text strong style={{ color: progress === 100 ? '#52c41a' : '#1890ff' }}>
//                   {totalDisbursed.toLocaleString()}
//                 </Text>
//                 {' / '}
//                 <Text type="secondary">{amountRequested.toLocaleString()}</Text>
//               </Text>
//               {remainingBalance > 0 && (
//                 <Text type="secondary" style={{ fontSize: '10px', display: 'block' }}>
//                   Remaining: {remainingBalance.toLocaleString()}
//                 </Text>
//               )}
//               <Text type="secondary" style={{ fontSize: '10px' }}>
//                 {record.disbursements?.length || 0} payment(s)
//               </Text>
//             </div>
//           );
//         }

//         return <Text type="secondary" style={{ fontSize: '11px' }}>Not disbursed</Text>;
//       },
//       width: 180
//     },
//     {
//       title: 'Status',
//       dataIndex: 'status',
//       key: 'status',
//       render: (status) => getStatusTag(status),
//       width: 220
//     },
//     {
//       title: 'Actions',
//       key: 'actions',
//       render: (_, record) => (
//         <Space direction="vertical" size="small">
//           <Button 
//             type="link" 
//             icon={<EyeOutlined />}
//             onClick={() => navigate(`/finance/cash-request/${record._id}`)}
//             size="small"
//           >
//             View Details
//           </Button>
          
//           {/* ✅ UPDATED: Finance Approval Button (Only at pending_finance) */}
//           {canFinanceApprove(record) && (
//             <Button 
//               type="primary"
//               size="small"
//               icon={<CheckCircleOutlined />}
//               onClick={() => navigate(`/finance/cash-request/${record._id}`)}
//             >
//               Approve & Allocate Budget
//             </Button>
//           )}
          
//           {/* ✅ INFO: Show if awaiting CEO */}
//           {isAwaitingHeadOfBusiness(record) && (
//             <Tooltip title="Awaiting Head of Business final approval before disbursement">
//               <Button 
//                 size="small"
//                 icon={<HourglassOutlined />}
//                 disabled
//                 style={{ color: '#9254de', borderColor: '#9254de' }}
//               >
//                 Awaiting HOB Approval
//               </Button>
//             </Tooltip>
//           )}
          
//           {/* ✅ UPDATED: Disbursement Button (Only AFTER CEO approves) */}
//           {canFinanceDisburse(record) && (
//             <Button 
//               type="default"
//               size="small"
//               icon={<SendOutlined />}
//               onClick={() => handleOpenDisbursementModal(record)}
//               style={{ color: '#52c41a', borderColor: '#52c41a' }}
//             >
//               {record.status === 'partially_disbursed' ? 'Continue Disbursement' : 'Disburse'}
//             </Button>
//           )}
//         </Space>
//       ),
//       width: 200
//     }
//   ];

//   const justificationColumns = [
//     {
//       title: 'Request ID',
//       dataIndex: '_id',
//       key: 'id',
//       width: 140,
//       render: (id) => <Tag color="blue">REQ-{id.toString().slice(-6).toUpperCase()}</Tag>
//     },
//     {
//       title: 'Employee',
//       key: 'employee',
//       render: (_, record) => (
//         <div>
//           <Text strong>{record.employee?.fullName || 'N/A'}</Text>
//           <br />
//           <Tag color="blue" size="small">
//             {record.employee?.department || 'N/A'}
//           </Tag>
//         </div>
//       ),
//       width: 180
//     },
//     {
//       title: 'Financial Summary',
//       key: 'financial',
//       render: (_, record) => {
//         const disbursed = record.disbursementDetails?.amount || record.totalDisbursed || 0;
//         const spent = record.justification?.amountSpent || 0;
//         const returned = record.justification?.balanceReturned || 0;
//         const isBalanced = Math.abs((spent + returned) - disbursed) < 0.01;

//         return (
//           <div>
//             <Text type="secondary" style={{ fontSize: '11px' }}>
//               Disbursed: XAF {disbursed.toLocaleString()}
//             </Text>
//             <br />
//             <Text type="secondary" style={{ fontSize: '11px' }}>
//               Spent: XAF {spent.toLocaleString()}
//             </Text>
//             <br />
//             <Text type="secondary" style={{ fontSize: '11px' }}>
//               Returned: XAF {returned.toLocaleString()}
//             </Text>
//             <br />
//             {!isBalanced && (
//               <Tag color="warning" size="small">Unbalanced</Tag>
//             )}
//           </div>
//         );
//       },
//       width: 180
//     },
//     {
//       title: 'Submitted Date',
//       key: 'date',
//       render: (_, record) => (
//         <Text type="secondary">
//           {record.justification?.justificationDate 
//             ? new Date(record.justification.justificationDate).toLocaleDateString('en-GB')
//             : 'N/A'
//           }
//         </Text>
//       ),
//       width: 120
//     },
//     {
//       title: 'Approval Progress',
//       key: 'progress',
//       render: (_, record) => {
//         if (!record.justificationApprovalChain) return <Text type="secondary">No chain</Text>;
        
//         const currentLevel = extractJustificationLevel(record.status);
//         const totalLevels = record.justificationApprovalChain.length;
//         const approvedCount = record.justificationApprovalChain.filter(s => s.status === 'approved').length;
        
//         return (
//           <div>
//             <Progress 
//               percent={Math.round((approvedCount / totalLevels) * 100)} 
//               size="small"
//               status={record.status === 'completed' ? 'success' : 'active'}
//               showInfo={false}
//             />
//             <Text style={{ fontSize: '11px' }}>
//               Level {currentLevel || approvedCount + 1}/{totalLevels}
//             </Text>
//           </div>
//         );
//       },
//       width: 120
//     },
//     {
//       title: 'Status',
//       key: 'justificationStatus',
//       render: (_, record) => (
//         <div>
//           {getStatusTag(record.status)}
//           {canUserApproveJustification(record) && (
//             <div style={{ marginTop: 4 }}>
//               <Tag color="gold" size="small">Your Turn</Tag>
//             </div>
//           )}
//         </div>
//       ),
//       width: 200
//     },
//     {
//       title: 'Documents',
//       key: 'documents',
//       render: (_, record) => (
//         <Badge 
//           count={record.justification?.documents?.length || 0} 
//           showZero
//           style={{ backgroundColor: '#52c41a' }}
//         >
//           <FileTextOutlined style={{ fontSize: '16px' }} />
//         </Badge>
//       ),
//       width: 100
//     },
//     {
//       title: 'Action',
//       key: 'action',
//       width: 180,
//       render: (_, record) => (
//         <Space size="small" direction="vertical">
//           <Button
//             size="small"
//             icon={<EyeOutlined />}
//             onClick={() => handleReviewJustification(record._id)}
//             block
//           >
//             View Details
//           </Button>
//           {canUserApproveJustification(record) && (
//             <Button
//               size="small"
//               type="primary"
//               icon={<AuditOutlined />}
//               onClick={() => handleOpenJustificationModal(record)}
//               block
//             >
//               Approve/Reject
//             </Button>
//           )}
//         </Space>
//       )
//     }
//   ];

//   const pendingForMe = requests.filter(req => canFinanceApprove(req)).length;
//   const readyForDisbursement = stats.approved + stats.partiallyDisbursed;

//   if (loading && requests.length === 0 && justifications.length === 0) {
//     return (
//       <div style={{ padding: '24px', textAlign: 'center' }}>
//         <Spin size="large" />
//         <div style={{ marginTop: '16px' }}>Loading finance cash approvals...</div>
//       </div>
//     );
//   }

//   return (
//     <div style={{ padding: '24px' }}>
//       {/* ✅ UPDATED Stats Cards */}
//       <Row gutter={16} style={{ marginBottom: '24px' }}>
//         <Col span={4}>
//           <Card size="small">
//             <Statistic
//               title="Your Approvals"
//               value={pendingForMe}
//               prefix={<ClockCircleOutlined />}
//               valueStyle={{ color: '#faad14' }}
//             />
//           </Card>
//         </Col>
//         <Col span={4}>
//           <Card size="small">
//             <Statistic
//               title="Awaiting HOB"
//               value={stats.pendingHeadOfBusiness}
//               prefix={<HourglassOutlined />}
//               valueStyle={{ color: '#9254de' }}
//             />
//           </Card>
//         </Col>
//         <Col span={4}>
//           <Card size="small">
//             <Statistic
//               title="Ready to Disburse"
//               value={stats.approved}
//               prefix={<CheckCircleOutlined />}
//               valueStyle={{ color: '#52c41a' }}
//             />
//           </Card>
//         </Col>
//         <Col span={4}>
//           <Card size="small">
//             <Statistic
//               title="Partial Disbursed"
//               value={stats.partiallyDisbursed}
//               prefix={<SyncOutlined />}
//               valueStyle={{ color: '#1890ff' }}
//             />
//           </Card>
//         </Col>
//         <Col span={4}>
//           <Card size="small">
//             <Statistic
//               title="Justifications"
//               value={stats.justificationsPending}
//               prefix={<FileTextOutlined />}
//               valueStyle={{ color: '#722ed1' }}
//             />
//           </Card>
//         </Col>
//         <Col span={4}>
//           <Card size="small">
//             <Statistic
//               title="Completed"
//               value={stats.completed}
//               prefix={<CheckCircleOutlined />}
//               valueStyle={{ color: '#52c41a' }}
//             />
//           </Card>
//         </Col>
//       </Row>

//       {/* Main Content */}
//       <Card>
//         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
//           <Title level={2} style={{ margin: 0 }}>
//             <BankOutlined /> Finance Cash Approvals
//           </Title>
//           <Space>
//             <Button 
//               icon={<ReloadOutlined />}
//               onClick={handleRefresh}
//               loading={loading}
//             >
//               Refresh
//             </Button>
//             <Button 
//               type="primary"
//               icon={<DownloadOutlined />}
//               onClick={() => setExportModalVisible(true)}
//             >
//               Export Data
//             </Button>
//           </Space>
//         </div>

//         {/* ✅ UPDATED Alert Messages */}
//         {(pendingForMe > 0 || stats.pendingHeadOfBusiness > 0 || readyForDisbursement > 0 || stats.justificationsPending > 0) && (
//           <Alert
//             message={
//               <div>
//                 {pendingForMe > 0 && (
//                   <div>🔔 You have {pendingForMe} cash request(s) waiting for your approval (Finance Level)</div>
//                 )}
//                 {stats.pendingHeadOfBusiness > 0 && (
//                   <div>⏳ {stats.pendingHeadOfBusiness} request(s) are awaiting Head of Business final approval</div>
//                 )}
//                 {readyForDisbursement > 0 && (
//                   <div>💰 {readyForDisbursement} request(s) are ready for disbursement (CEO Approved)</div>
//                 )}
//                 {stats.justificationsPending > 0 && (
//                   <div>📄 {stats.justificationsPending} justification(s) require your review</div>
//                 )}
//               </div>
//             }
//             type="warning"
//             showIcon
//             style={{ marginBottom: '16px' }}
//           />
//         )}

//         {/* ✅ UPDATED Tabs with new "Awaiting HOB" tab */}
//         <Tabs activeKey={activeTab} onChange={setActiveTab}>
//           <TabPane 
//             tab={
//               <Badge count={stats.pendingFinance} offset={[10, 0]} color="#faad14">
//                 <span>
//                   <ExclamationCircleOutlined />
//                   Your Approvals ({stats.pendingFinance})
//                 </span>
//               </Badge>
//             } 
//             key="pending"
//           >
//             <Table 
//               columns={requestColumns} 
//               dataSource={getFilteredRequests()} 
//               loading={loading}
//               rowKey="_id"
//               pagination={{ 
//                 pageSize: 10,
//                 showSizeChanger: true,
//                 showQuickJumper: true,
//                 showTotal: (total, range) => 
//                   `${range[0]}-${range[1]} of ${total} requests`
//               }}
//               scroll={{ x: 'max-content' }}
//               rowClassName={(record) => {
//                 if (canFinanceApprove(record)) {
//                   return 'highlight-row-urgent'; 
//                 }
//                 return '';
//               }}
//             />
//           </TabPane>

//           {/* ✅ NEW TAB: Awaiting HOB */}
//           <TabPane 
//             tab={
//               <Badge count={stats.pendingHeadOfBusiness} offset={[10, 0]} color="#9254de">
//                 <span>
//                   <HourglassOutlined />
//                   Awaiting HOB ({stats.pendingHeadOfBusiness})
//                 </span>
//               </Badge>
//             } 
//             key="awaiting_ceo"
//           >
//             <Table 
//               columns={requestColumns} 
//               dataSource={getFilteredRequests()} 
//               loading={loading}
//               rowKey="_id"
//               pagination={{ 
//                 pageSize: 10,
//                 showSizeChanger: true,
//                 showQuickJumper: true,
//                 showTotal: (total, range) => 
//                   `${range[0]}-${range[1]} of ${total} requests`
//               }}
//               scroll={{ x: 'max-content' }}
//               rowClassName={() => 'highlight-row-awaiting-ceo'}
//             />
//           </TabPane>

//           <TabPane
//             tab={
//               <Badge count={stats.justificationsPending} offset={[10, 0]} color="#722ed1">
//                 <span>
//                   <FileTextOutlined />
//                   Justifications ({stats.justificationsPending})
//                 </span>
//               </Badge>
//             }
//             key="justifications"
//           >
//             {activeTab === 'justifications' && (
//               <Table
//                 columns={justificationColumns}
//                 dataSource={justifications}
//                 loading={loading}
//                 rowKey="_id"
//                 pagination={{ 
//                   pageSize: 10, 
//                   showSizeChanger: true,
//                   showQuickJumper: true,
//                   showTotal: (total, range) => 
//                     `${range[0]}-${range[1]} of ${total} justifications`
//                 }}
//                 scroll={{ x: 1200 }}
//                 size="small"
//                 rowClassName={(record) => {
//                   let className = 'cash-request-row';
//                   if (canUserApproveJustification(record)) {
//                     className += ' pending-approval-row';
//                   }
//                   return className;
//                 }}
//               />
//             )}
//           </TabPane>

//           <TabPane 
//             tab={
//               <Badge count={stats.approved} offset={[10, 0]} color="#52c41a">
//                 <span>
//                   <CheckCircleOutlined />
//                   Ready to Disburse ({stats.approved})
//                 </span>
//               </Badge>
//             } 
//             key="approved"
//           >
//             <Table 
//               columns={requestColumns} 
//               dataSource={getFilteredRequests()} 
//               loading={loading}
//               rowKey="_id"
//               pagination={{ 
//                 pageSize: 10,
//                 showSizeChanger: true,
//                 showQuickJumper: true,
//                 showTotal: (total, range) => 
//                   `${range[0]}-${range[1]} of ${total} requests`
//               }}
//               scroll={{ x: 'max-content' }}
//               rowClassName={() => 'highlight-row-ready'}
//             />
//           </TabPane>

//           <TabPane 
//             tab={
//               <Badge count={stats.partiallyDisbursed} offset={[10, 0]} color="#1890ff">
//                 <span>
//                   <SyncOutlined />
//                   Partially Disbursed ({stats.partiallyDisbursed})
//                 </span>
//               </Badge>
//             } 
//             key="partially_disbursed"
//           >
//             <Table 
//               columns={requestColumns} 
//               dataSource={getFilteredRequests()} 
//               loading={loading}
//               rowKey="_id"
//               pagination={{ 
//                 pageSize: 10,
//                 showSizeChanger: true,
//                 showQuickJumper: true,
//                 showTotal: (total, range) => 
//                   `${range[0]}-${range[1]} of ${total} requests`
//               }}
//               scroll={{ x: 'max-content' }}
//               rowClassName={() => 'highlight-row-partial'}
//             />
//           </TabPane>

//           <TabPane 
//             tab={
//               <Badge count={stats.fullyDisbursed} offset={[10, 0]} color="#13c2c2">
//                 <span>
//                   <DollarOutlined />
//                   Fully Disbursed ({stats.fullyDisbursed})
//                 </span>
//               </Badge>
//             } 
//             key="fully_disbursed"
//           >
//             <Table 
//               columns={requestColumns} 
//               dataSource={getFilteredRequests()} 
//               loading={loading}
//               rowKey="_id"
//               pagination={{ 
//                 pageSize: 10,
//                 showSizeChanger: true,
//                 showQuickJumper: true,
//                 showTotal: (total, range) => 
//                   `${range[0]}-${range[1]} of ${total} requests`
//               }}
//               scroll={{ x: 'max-content' }}
//             />
//           </TabPane>

//           <TabPane 
//             tab={
//               <span>
//                 <CheckCircleOutlined />
//                 Completed ({stats.completed})
//               </span>
//             } 
//             key="completed"
//           >
//             <Table 
//               columns={requestColumns} 
//               dataSource={getFilteredRequests()} 
//               loading={loading}
//               rowKey="_id"
//               pagination={{ 
//                 pageSize: 10,
//                 showSizeChanger: true,
//                 showQuickJumper: true,
//                 showTotal: (total, range) => 
//                   `${range[0]}-${range[1]} of ${total} requests`
//               }}
//               scroll={{ x: 'max-content' }}
//             />
//           </TabPane>

//           <TabPane 
//             tab={
//               <span>
//                 <CloseCircleOutlined />
//                 Rejected ({stats.rejected})
//               </span>
//             } 
//             key="rejected"
//           >
//             <Table 
//               columns={requestColumns} 
//               dataSource={getFilteredRequests()} 
//               loading={loading}
//               rowKey="_id"
//               pagination={{ 
//                 pageSize: 10,
//                 showSizeChanger: true,
//                 showQuickJumper: true,
//                 showTotal: (total, range) => 
//                   `${range[0]}-${range[1]} of ${total} requests`
//               }}
//               scroll={{ x: 'max-content' }}
//             />
//           </TabPane>
//         </Tabs>
//       </Card>

//       {/* Modals */}
//       <DisbursementModal
//         visible={disbursementModalVisible}
//         request={selectedDisbursementRequest}
//         onSubmit={handleDisbursementSubmit}
//         onCancel={() => {
//           setDisbursementModalVisible(false);
//           setSelectedDisbursementRequest(null);
//         }}
//       />

//       <JustificationApprovalModal
//         visible={justificationModalVisible}
//         request={selectedJustificationRequest}
//         onSubmit={handleJustificationSubmit}
//         onCancel={() => {
//           setJustificationModalVisible(false);
//           setSelectedJustificationRequest(null);
//         }}
//       />

//       <CashRequestExportModal
//         visible={exportModalVisible}
//         onCancel={() => setExportModalVisible(false)}
//       />

//       {/* ✅ UPDATED Styles with new "awaiting-ceo" row class */}
//       <style>{`
//         .highlight-row-urgent {
//           background-color: #fff7e6 !important;
//           border-left: 4px solid #faad14 !important;
//         }
//         .highlight-row-urgent:hover {
//           background-color: #fff1d6 !important;
//         }
//         .highlight-row-awaiting-ceo {
//           background-color: #f9f0ff !important;
//           border-left: 4px solid #9254de !important;
//         }
//         .highlight-row-awaiting-ceo:hover {
//           background-color: #efdbff !important;
//         }
//         .highlight-row-ready {
//           background-color: #f6ffed !important;
//           border-left: 4px solid #52c41a !important;
//         }
//         .highlight-row-ready:hover {
//           background-color: #d9f7be !important;
//         }
//         .highlight-row-partial {
//           background-color: #e6f7ff !important;
//           border-left: 4px solid #1890ff !important;
//         }
//         .highlight-row-partial:hover {
//           background-color: #bae7ff !important;
//         }
//         .cash-request-row {
//           background-color: #fafafa;
//         }
//         .cash-request-row:hover {
//           background-color: #f0f0f0 !important;
//         }
//         .pending-approval-row {
//           border-left: 3px solid #faad14;
//           background-color: #fff7e6;
//         }
//         .pending-approval-row:hover {
//           background-color: #fff1d6 !important;
//         }
//       `}</style>
//     </div>
//   );
// };

// export default FinanceCashApprovals;















// import React, { useState, useEffect, useCallback } from 'react';
// import { useNavigate } from 'react-router-dom';
// import { useSelector } from 'react-redux';
// import {
//   Card,
//   Table,
//   Tag,
//   Space,
//   Typography,
//   Button,
//   Alert,
//   Spin,
//   message,
//   Badge,
//   Tooltip,
//   Tabs,
//   Progress,
//   Statistic,
//   Row,
//   Col
// } from 'antd';
// import {
//   CheckCircleOutlined,
//   CloseCircleOutlined,
//   ClockCircleOutlined,
//   DollarOutlined,
//   CalendarOutlined,
//   BankOutlined,
//   EyeOutlined,
//   ReloadOutlined,
//   ExclamationCircleOutlined,
//   SendOutlined,
//   FileTextOutlined,
//   AuditOutlined,
//   DownloadOutlined,
//   SyncOutlined
// } from '@ant-design/icons';
// import { cashRequestAPI } from '../../services/cashRequestAPI';
// import CashRequestExportModal from './CashRequestExport';
// import DisbursementModal from './DisbursementModal';
// import JustificationApprovalModal from './JustificationApprovalModal';

// const { Title, Text } = Typography;
// const { TabPane } = Tabs;

// const FinanceCashApprovals = () => {
//   const navigate = useNavigate();
//   const { user } = useSelector((state) => state.auth);
  
//   const [requests, setRequests] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [activeTab, setActiveTab] = useState('pending');
//   const [exportModalVisible, setExportModalVisible] = useState(false);
  
//   // Disbursement modal state
//   const [disbursementModalVisible, setDisbursementModalVisible] = useState(false);
//   const [selectedDisbursementRequest, setSelectedDisbursementRequest] = useState(null);
  
//   // Justification modal state
//   const [justificationModalVisible, setJustificationModalVisible] = useState(false);
//   const [selectedJustificationRequest, setSelectedJustificationRequest] = useState(null);
  
//   const [stats, setStats] = useState({
//     pendingFinance: 0,
//     approved: 0,
//     partiallyDisbursed: 0,
//     fullyDisbursed: 0,
//     completed: 0,
//     rejected: 0,
//     justificationsPending: 0
//   });
//   const [justifications, setJustifications] = useState([]);

//   // ============ HELPER FUNCTIONS ============

//   const isJustificationStatus = (status) => {
//     return status && (
//       status.includes('justification_pending') || 
//       status.includes('justification_rejected') ||
//       status === 'completed'
//     );
//   };

//   const extractJustificationLevel = (status) => {
//     if (!status || !status.includes('justification_')) return null;
    
//     const levelMap = {
//       'justification_pending_supervisor': 1,
//       'justification_pending_departmental_head': 2,
//       'justification_pending_head_of_business': 3,
//       'justification_pending_finance': 4,
//       'justification_rejected_supervisor': 1,
//       'justification_rejected_departmental_head': 2,
//       'justification_rejected_head_of_business': 3,
//       'justification_rejected_finance': 4
//     };
    
//     return levelMap[status] || null;
//   };

//   const getJustificationStatusInfo = (status, level = null) => {
//     const statusLevel = level || extractJustificationLevel(status);
    
//     const levelNames = {
//       1: 'Supervisor',
//       2: 'Departmental Head',
//       3: 'Head of Business',
//       4: 'Finance'
//     };
    
//     if (status === 'completed') {
//       return {
//         text: 'Completed',
//         color: 'cyan',
//         icon: <CheckCircleOutlined />,
//         description: 'All approvals completed'
//       };
//     }
    
//     if (status?.includes('justification_rejected')) {
//       return {
//         text: `Revision Required (${levelNames[statusLevel]})`,
//         color: 'gold',
//         icon: <ExclamationCircleOutlined />,
//         description: `Rejected at Level ${statusLevel} - ${levelNames[statusLevel]}`
//       };
//     }
    
//     if (status?.includes('justification_pending')) {
//       return {
//         text: `Level ${statusLevel}/4: Pending ${levelNames[statusLevel]}`,
//         color: 'orange',
//         icon: <ClockCircleOutlined />,
//         description: `Awaiting approval from ${levelNames[statusLevel]}`
//       };
//     }
    
//     return {
//       text: status?.replace(/_/g, ' ') || 'Unknown',
//       color: 'default',
//       icon: null,
//       description: ''
//     };
//   };

//   const canUserApproveJustification = useCallback((request) => {
//     if (!request.justificationApprovalChain || !user?.email) {
//       return false;
//     }

//     if (!isJustificationStatus(request.status)) {
//       return false;
//     }

//     const currentStatusLevel = extractJustificationLevel(request.status);
    
//     if (!currentStatusLevel) {
//       return false;
//     }

//     const userPendingSteps = request.justificationApprovalChain.filter(step => {
//       const emailMatch = step.approver?.email?.toLowerCase() === user.email.toLowerCase();
//       const isPending = step.status === 'pending';
      
//       return emailMatch && isPending;
//     });

//     if (userPendingSteps.length === 0) {
//       return false;
//     }

//     const canApprove = userPendingSteps.some(step => step.level === currentStatusLevel);

//     return canApprove;
//   }, [user?.email]);

//   // ============ DATA FETCHING ============

//   const fetchAllData = useCallback(async () => {
//     try {
//       setLoading(true);
//       console.log('Fetching all cash requests and justifications...');

//       const response = await cashRequestAPI.getFinanceRequests();

//       if (response && response.success) {
//         const allData = response.data || [];
        
//         console.log('Total records fetched:', allData.length);
        
//         // Improved: More precise separation
//         const cashRequestsOnly = allData.filter(req =>
//           !isJustificationStatus(req.status) &&
//           ['pending_finance', 'approved', 'disbursed', 'partially_disbursed', 'fully_disbursed', 'denied'].includes(req.status)
//         );
//         const justificationsOnly = allData.filter(req => isJustificationStatus(req.status));
        
//         console.log('Cash requests:', cashRequestsOnly.length);
//         console.log('Justifications:', justificationsOnly.length);
        
//         setRequests(cashRequestsOnly);
//         setJustifications(justificationsOnly);

//         const pendingJustifications = justificationsOnly.filter(j => 
//           canUserApproveJustification(j)
//         ).length;

//         console.log('Pending justifications for user:', pendingJustifications);

//         const calculatedStats = {
//           pendingFinance: cashRequestsOnly.filter(req => req.teamRequestMetadata?.userHasPendingApproval).length,
//           approved: cashRequestsOnly.filter(req => req.status === 'approved').length,
//           partiallyDisbursed: cashRequestsOnly.filter(req => 
//             req.status === 'partially_disbursed' || 
//             (req.status === 'disbursed' && (req.remainingBalance || 0) > 0)
//           ).length,
//           fullyDisbursed: cashRequestsOnly.filter(req => 
//             req.status === 'fully_disbursed' || 
//             (req.status === 'disbursed' && (req.remainingBalance || 0) === 0)
//           ).length,
//           completed: allData.filter(req => req.status === 'completed').length,
//           rejected: cashRequestsOnly.filter(req => req.status === 'denied').length,
//           justificationsPending: pendingJustifications
//         };

//         console.log('Calculated stats:', calculatedStats);
//         setStats(calculatedStats);
//       } else {
//         throw new Error('Failed to fetch data');
//       }
//     } catch (error) {
//       console.error('Error fetching data:', error);
//       message.error(error.response?.data?.message || 'Failed to load finance approvals');
//       setRequests([]);
//       setJustifications([]);
//     } finally {
//       setLoading(false);
//     }
//   }, [canUserApproveJustification]);

//   useEffect(() => {
//     if (user?.email) {
//       fetchAllData();
//     }
//   }, [fetchAllData, user?.email]);

//   const handleRefresh = async () => {
//     await fetchAllData();
//     message.success('Data refreshed successfully');
//   };

//   // ============ DISBURSEMENT HANDLERS ============

//   const handleOpenDisbursementModal = (request) => {
//     setSelectedDisbursementRequest(request);
//     setDisbursementModalVisible(true);
//   };

//   const handleDisbursementSubmit = async ({ requestId, amount, notes }) => {
//     try {
//       console.log('Processing disbursement:', { requestId, amount, notes });
      
//       const response = await cashRequestAPI.processDisbursement(requestId, {
//         amount,
//         notes
//       });

//       if (response.success) {
//         message.success(response.message || 'Disbursement processed successfully');
//         setDisbursementModalVisible(false);
//         setSelectedDisbursementRequest(null);
//         await fetchAllData();
//       } else {
//         throw new Error(response.message || 'Failed to process disbursement');
//       }
//     } catch (error) {
//       console.error('Disbursement error:', error);
//       message.error(error.response?.data?.message || 'Failed to process disbursement');
//     }
//   };

//   // ============ JUSTIFICATION HANDLERS ============

//   const handleOpenJustificationModal = (request) => {
//     setSelectedJustificationRequest(request);
//     setJustificationModalVisible(true);
//   };

//   const handleJustificationSubmit = async ({ requestId, decision, comments }) => {
//     try {
//       console.log('Processing justification decision:', { requestId, decision, comments });
      
//       const response = await cashRequestAPI.processJustificationDecision(requestId, {
//         decision,
//         comments
//       });

//       if (response.success) {
//         message.success(response.message || `Justification ${decision} successfully`);
//         setJustificationModalVisible(false);
//         setSelectedJustificationRequest(null);
//         await fetchAllData();
//       } else {
//         throw new Error(response.message || 'Failed to process justification');
//       }
//     } catch (error) {
//       console.error('Justification decision error:', error);
//       message.error(error.response?.data?.message || 'Failed to process justification');
//     }
//   };

//   const handleReviewJustification = (requestId) => {
//     navigate(`/finance/justification/${requestId}`);
//   };

//   const getStatusTag = (status) => {
//     if (isJustificationStatus(status)) {
//       const statusInfo = getJustificationStatusInfo(status);
//       return (
//         <Tooltip title={statusInfo.description}>
//           <Tag color={statusInfo.color} icon={statusInfo.icon}>
//             {statusInfo.text}
//           </Tag>
//         </Tooltip>
//       );
//     }

//     const statusMap = {
//       'pending_finance': { 
//         color: 'orange', 
//         icon: <ClockCircleOutlined />, 
//         text: 'Your Approval Required' 
//       },
//       'approved': { 
//         color: 'green', 
//         icon: <CheckCircleOutlined />, 
//         text: 'Approved - Ready for Disbursement' 
//       },
//       'disbursed': {
//         color: 'processing',
//         icon: <SyncOutlined spin />,
//         text: 'Disbursed'
//       },
//       'partially_disbursed': { 
//         color: 'processing', 
//         icon: <SyncOutlined spin />, 
//         text: 'Partially Disbursed' 
//       },
//       'fully_disbursed': { 
//         color: 'cyan', 
//         icon: <DollarOutlined />, 
//         text: 'Fully Disbursed - Awaiting Justification' 
//       },
//       'completed': { 
//         color: 'green', 
//         icon: <CheckCircleOutlined />, 
//         text: 'Completed' 
//       },
//       'denied': { 
//         color: 'red', 
//         icon: <CloseCircleOutlined />, 
//         text: 'Rejected' 
//       }
//     };

//     const statusInfo = statusMap[status] || { 
//       color: 'default', 
//       text: status?.replace('_', ' ') || 'Unknown' 
//     };

//     return (
//       <Tag color={statusInfo.color} icon={statusInfo.icon}>
//         {statusInfo.text}
//       </Tag>
//     );
//   };

//   const getUrgencyTag = (urgency) => {
//     const urgencyMap = {
//       'urgent': { color: 'red', text: 'Urgent' },
//       'high': { color: 'red', text: 'High' },
//       'medium': { color: 'orange', text: 'Medium' },
//       'low': { color: 'green', text: 'Low' }
//     };
//     const urgencyInfo = urgencyMap[urgency] || { color: 'default', text: urgency };

//     return (
//       <Tag color={urgencyInfo.color}>
//         {urgencyInfo.text}
//       </Tag>
//     );
//   };

//   const getFilteredRequests = () => {
//     switch (activeTab) {
//       case 'pending':
//         return requests.filter(req => req.status === 'pending_finance');
//       case 'approved':
//         return requests.filter(req => req.status === 'approved');
//       case 'partially_disbursed':
//         return requests.filter(req =>
//           req.status === 'partially_disbursed' ||
//           (req.status === 'disbursed' && (req.remainingBalance || 0) > 0)
//         );
//       case 'fully_disbursed':
//         return requests.filter(req =>
//           req.status === 'fully_disbursed' ||
//           (req.status === 'disbursed' && (req.remainingBalance || 0) === 0)
//         );
//       case 'completed':
//         return requests.filter(req => req.status === 'completed');
//       case 'rejected':
//         return requests.filter(req => req.status === 'denied');
//       default:
//         return requests;
//     }
//   };

//   const requestColumns = [
//     {
//       title: 'Request ID',
//       dataIndex: 'id',
//       key: 'id',
//       render: (id) => (
//         <Tag color="blue">
//           REQ-{id.toString().slice(-6).toUpperCase()}
//         </Tag>
//       ),
//       width: 120
//     },
//     {
//       title: 'Employee',
//       key: 'employee',
//       render: (_, record) => (
//         <div>
//           <Text strong>{record.employee?.fullName || 'N/A'}</Text>
//           <br />
//           <Text type="secondary" style={{ fontSize: '12px' }}>
//             {record.employee?.position || 'N/A'}
//           </Text>
//           <br />
//           <Tag color="blue" size="small">{record.employee?.department || 'N/A'}</Tag>
//         </div>
//       ),
//       width: 180
//     },
//     {
//       title: 'Request Details',
//       key: 'requestDetails',
//       render: (_, record) => (
//         <div>
//           <Text strong style={{ color: '#1890ff' }}>
//             XAF {Number(record.amountRequested || 0).toLocaleString()}
//           </Text>
//           <br />
//           <Text type="secondary" style={{ fontSize: '12px' }}>
//             Type: {record.requestType?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'N/A'}
//           </Text>
//           <br />
//           <Tooltip title={record.purpose}>
//             <Text ellipsis style={{ maxWidth: 200, fontSize: '11px', color: '#666' }}>
//               {record.purpose && record.purpose.length > 40 
//                 ? `${record.purpose.substring(0, 40)}...` 
//                 : record.purpose || 'No purpose specified'
//               }
//             </Text>
//           </Tooltip>
//         </div>
//       ),
//       width: 200
//     },
//     {
//       title: 'Priority & Dates',
//       key: 'priorityDate',
//       render: (_, record) => (
//         <div>
//           {getUrgencyTag(record.urgency)}
//           <br />
//           <Text type="secondary" style={{ fontSize: '11px' }}>
//             <CalendarOutlined /> Expected: {record.requiredDate ? new Date(record.requiredDate).toLocaleDateString('en-GB') : 'N/A'}
//           </Text>
//           <br />
//           <Text type="secondary" style={{ fontSize: '11px' }}>
//             Submitted: {record.createdAt ? new Date(record.createdAt).toLocaleDateString('en-GB') : 'N/A'}
//           </Text>
//         </div>
//       ),
//       sorter: (a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0),
//       width: 140
//     },
//     {
//       title: 'Disbursement Status',
//       key: 'disbursementStatus',
//       render: (_, record) => {
//         const amountRequested = record.amountRequested || 0;
//         const totalDisbursed = record.totalDisbursed || 0;
//         const remainingBalance = record.remainingBalance || 0;
        
//         // Calculate progress based on amountRequested
//         const progress = amountRequested > 0 
//           ? Math.round((totalDisbursed / amountRequested) * 100) 
//           : 0;

//         if (record.status === 'approved') {
//           return (
//             <div>
//               <Tag color="orange" size="small">
//                 <ExclamationCircleOutlined /> Ready
//               </Tag>
//               <br />
//               <Text type="secondary" style={{ fontSize: '10px' }}>
//                 0 / {amountRequested.toLocaleString()}
//               </Text>
//             </div>
//           );
//         }

//         if (['partially_disbursed', 'fully_disbursed', 'disbursed'].includes(record.status)) {
//           return (
//             <div>
//               <Progress 
//                 percent={progress} 
//                 size="small" 
//                 status={progress === 100 ? 'success' : 'active'}
//                 style={{ marginBottom: '4px' }}
//               />
//               <Text style={{ fontSize: '11px', display: 'block' }}>
//                 <Text strong style={{ color: progress === 100 ? '#52c41a' : '#1890ff' }}>
//                   {totalDisbursed.toLocaleString()}
//                 </Text>
//                 {' / '}
//                 <Text type="secondary">{amountRequested.toLocaleString()}</Text>
//               </Text>
//               {remainingBalance > 0 && (
//                 <Text type="secondary" style={{ fontSize: '10px', display: 'block' }}>
//                   Remaining: {remainingBalance.toLocaleString()}
//                 </Text>
//               )}
//               <Text type="secondary" style={{ fontSize: '10px' }}>
//                 {record.disbursements?.length || 0} payment(s)
//               </Text>
//             </div>
//           );
//         }

//         return <Text type="secondary" style={{ fontSize: '11px' }}>Not disbursed</Text>;
//       },
//       width: 180
//     },
//     {
//       title: 'Status',
//       dataIndex: 'status',
//       key: 'status',
//       render: (status) => getStatusTag(status),
//       width: 200
//     },
//     {
//       title: 'Actions',
//       key: 'actions',
//       render: (_, record) => (
//         <Space direction="vertical" size="small">
//           <Button 
//             type="link" 
//             icon={<EyeOutlined />}
//             onClick={() => navigate(`/finance/cash-request/${record._id}`)}
//             size="small"
//           >
//             View Details
//           </Button>
//           {record.status === 'pending_finance' && (
//             <Button 
//               type="primary"
//               size="small"
//               icon={<CheckCircleOutlined />}
//               onClick={() => navigate(`/finance/cash-request/${record._id}`)}
//             >
//               Process Approval
//             </Button>
//           )}
//           {(['approved', 'partially_disbursed'].includes(record.status) || 
//             (record.status === 'disbursed' && (record.remainingBalance || 0) > 0)) && (
//             <Button 
//               type="default"
//               size="small"
//               icon={<SendOutlined />}
//               onClick={() => handleOpenDisbursementModal(record)}
//               style={{ color: '#52c41a', borderColor: '#52c41a' }}
//             >
//               Disburse
//             </Button>
//           )}
//         </Space>
//       ),
//       width: 150
//     }
//   ];

//   const justificationColumns = [
//     {
//       title: 'Request ID',
//       dataIndex: 'id',
//       key: 'id',
//       width: 140,
//       render: (id) => <Tag color="blue">REQ-{id.toString().slice(-6).toUpperCase()}</Tag>
//     },
//     {
//       title: 'Employee',
//       key: 'employee',
//       render: (_, record) => (
//         <div>
//           <Text strong>{record.employee?.fullName || 'N/A'}</Text>
//           <br />
//           <Tag color="blue" size="small">
//             {record.employee?.department || 'N/A'}
//           </Tag>
//         </div>
//       ),
//       width: 180
//     },
//     {
//       title: 'Financial Summary',
//       key: 'financial',
//       render: (_, record) => {
//         const disbursed = record.disbursementDetails?.amount || record.totalDisbursed || 0;
//         const spent = record.justification?.amountSpent || 0;
//         const returned = record.justification?.balanceReturned || 0;
//         const isBalanced = Math.abs((spent + returned) - disbursed) < 0.01;

//         return (
//           <div>
//             <Text type="secondary" style={{ fontSize: '11px' }}>
//               Disbursed: XAF {disbursed.toLocaleString()}
//             </Text>
//             <br />
//             <Text type="secondary" style={{ fontSize: '11px' }}>
//               Spent: XAF {spent.toLocaleString()}
//             </Text>
//             <br />
//             <Text type="secondary" style={{ fontSize: '11px' }}>
//               Returned: XAF {returned.toLocaleString()}
//             </Text>
//             <br />
//             {!isBalanced && (
//               <Tag color="warning" size="small">Unbalanced</Tag>
//             )}
//           </div>
//         );
//       },
//       width: 180
//     },
//     {
//       title: 'Submitted Date',
//       key: 'date',
//       render: (_, record) => (
//         <Text type="secondary">
//           {record.justification?.justificationDate 
//             ? new Date(record.justification.justificationDate).toLocaleDateString('en-GB')
//             : 'N/A'
//           }
//         </Text>
//       ),
//       width: 120
//     },
//     {
//       title: 'Approval Progress',
//       key: 'progress',
//       render: (_, record) => {
//         if (!record.justificationApprovalChain) return <Text type="secondary">No chain</Text>;
        
//         const currentLevel = extractJustificationLevel(record.status);
//         const totalLevels = record.justificationApprovalChain.length;
//         const approvedCount = record.justificationApprovalChain.filter(s => s.status === 'approved').length;
        
//         return (
//           <div>
//             <Progress 
//               percent={Math.round((approvedCount / totalLevels) * 100)} 
//               size="small"
//               status={record.status === 'completed' ? 'success' : 'active'}
//               showInfo={false}
//             />
//             <Text style={{ fontSize: '11px' }}>
//               Level {currentLevel || approvedCount + 1}/{totalLevels}
//             </Text>
//           </div>
//         );
//       },
//       width: 120
//     },
//     {
//       title: 'Status',
//       key: 'justificationStatus',
//       render: (_, record) => (
//         <div>
//           {getStatusTag(record.status)}
//           {canUserApproveJustification(record) && (
//             <div style={{ marginTop: 4 }}>
//               <Tag color="gold" size="small">Your Turn</Tag>
//             </div>
//           )}
//         </div>
//       ),
//       width: 200
//     },
//     {
//       title: 'Documents',
//       key: 'documents',
//       render: (_, record) => (
//         <Badge 
//           count={record.justification?.documents?.length || 0} 
//           showZero
//           style={{ backgroundColor: '#52c41a' }}
//         >
//           <FileTextOutlined style={{ fontSize: '16px' }} />
//         </Badge>
//       ),
//       width: 100
//     },
//     {
//       title: 'Action',
//       key: 'action',
//       width: 180,
//       render: (_, record) => (
//         <Space size="small" direction="vertical">
//           <Button
//             size="small"
//             icon={<EyeOutlined />}
//             onClick={() => handleReviewJustification(record._id)}
//             block
//           >
//             View Details
//           </Button>
//           {canUserApproveJustification(record) && (
//             <Button
//               size="small"
//               type="primary"
//               icon={<AuditOutlined />}
//               onClick={() => handleOpenJustificationModal(record)}
//               block
//             >
//               Approve/Reject
//             </Button>
//           )}
//         </Space>
//       )
//     }
//   ];

//   const pendingForMe = requests.filter(req => req.teamRequestMetadata?.userHasPendingApproval).length;
//   const readyForDisbursement = stats.approved + stats.partiallyDisbursed;

//   if (loading && requests.length === 0 && justifications.length === 0) {
//     return (
//       <div style={{ padding: '24px', textAlign: 'center' }}>
//         <Spin size="large" />
//         <div style={{ marginTop: '16px' }}>Loading finance cash approvals...</div>
//       </div>
//     );
//   }

//   return (
//     <div style={{ padding: '24px' }}>
//       {/* Stats Cards */}
//       <Row gutter={16} style={{ marginBottom: '24px' }}>
//         <Col span={4}>
//           <Card size="small">
//             <Statistic
//               title="Your Approvals"
//               value={pendingForMe}
//               prefix={<ClockCircleOutlined />}
//               valueStyle={{ color: '#faad14' }}
//             />
//           </Card>
//         </Col>
//         <Col span={4}>
//           <Card size="small">
//             <Statistic
//               title="Ready to Disburse"
//               value={stats.approved}
//               prefix={<CheckCircleOutlined />}
//               valueStyle={{ color: '#52c41a' }}
//             />
//           </Card>
//         </Col>
//         <Col span={4}>
//           <Card size="small">
//             <Statistic
//               title="Partial Disbursed"
//               value={stats.partiallyDisbursed}
//               prefix={<SyncOutlined />}
//               valueStyle={{ color: '#1890ff' }}
//             />
//           </Card>
//         </Col>
//         <Col span={4}>
//           <Card size="small">
//             <Statistic
//               title="Fully Disbursed"
//               value={stats.fullyDisbursed}
//               prefix={<DollarOutlined />}
//               valueStyle={{ color: '#13c2c2' }}
//             />
//           </Card>
//         </Col>
//         <Col span={4}>
//           <Card size="small">
//             <Statistic
//               title="Justifications"
//               value={stats.justificationsPending}
//               prefix={<FileTextOutlined />}
//               valueStyle={{ color: '#722ed1' }}
//             />
//           </Card>
//         </Col>
//         <Col span={4}>
//           <Card size="small">
//             <Statistic
//               title="Completed"
//               value={stats.completed}
//               prefix={<CheckCircleOutlined />}
//               valueStyle={{ color: '#52c41a' }}
//             />
//           </Card>
//         </Col>
//       </Row>

//       {/* Main Content */}
//       <Card>
//         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
//           <Title level={2} style={{ margin: 0 }}>
//             <BankOutlined /> Finance Cash Approvals
//           </Title>
//           <Space>
//             <Button 
//               icon={<ReloadOutlined />}
//               onClick={handleRefresh}
//               loading={loading}
//             >
//               Refresh
//             </Button>
//             <Button 
//               type="primary"
//               icon={<DownloadOutlined />}
//               onClick={() => setExportModalVisible(true)}
//             >
//               Export Data
//             </Button>
//           </Space>
//         </div>

//         {(pendingForMe > 0 || readyForDisbursement > 0 || stats.justificationsPending > 0) && (
//           <Alert
//             message={
//               <div>
//                 {pendingForMe > 0 && (
//                   <div>🔔 You have {pendingForMe} cash request(s) waiting for your approval</div>
//                 )}
//                 {readyForDisbursement > 0 && (
//                   <div>💰 {readyForDisbursement} request(s) are ready for disbursement</div>
//                 )}
//                 {stats.justificationsPending > 0 && (
//                   <div>📄 {stats.justificationsPending} justification(s) require your review</div>
//                 )}
//               </div>
//             }
//             type="warning"
//             showIcon
//             style={{ marginBottom: '16px' }}
//           />
//         )}

//         <Tabs activeKey={activeTab} onChange={setActiveTab}>
//           <TabPane 
//             tab={
//               <Badge count={stats.pendingFinance} offset={[10, 0]} color="#faad14">
//                 <span>
//                   <ExclamationCircleOutlined />
//                   Pending Approval ({stats.pendingFinance})
//                 </span>
//               </Badge>
//             } 
//             key="pending"
//           >
//             <Table 
//               columns={requestColumns} 
//               dataSource={getFilteredRequests()} 
//               loading={loading}
//               rowKey="_id"
//               pagination={{ 
//                 pageSize: 10,
//                 showSizeChanger: true,
//                 showQuickJumper: true,
//                 showTotal: (total, range) => 
//                   `${range[0]}-${range[1]} of ${total} requests`
//               }}
//               scroll={{ x: 'max-content' }}
//               rowClassName={(record) => {
//                 if (record.status === 'pending_finance') {
//                   return 'highlight-row-urgent'; 
//                 }
//                 return '';
//               }}
//             />
//           </TabPane>

//           <TabPane
//             tab={
//               <Badge count={stats.justificationsPending} offset={[10, 0]} color="#1890ff">
//                 <span>
//                   <FileTextOutlined />
//                   Justifications ({stats.justificationsPending})
//                 </span>
//               </Badge>
//             }
//             key="justifications"
//           >
//             {activeTab === 'justifications' && (
//               <Table
//                 columns={justificationColumns}
//                 dataSource={justifications}
//                 loading={loading}
//                 rowKey="_id"
//                 pagination={{ 
//                   pageSize: 10, 
//                   showSizeChanger: true,
//                   showQuickJumper: true,
//                   showTotal: (total, range) => 
//                     `${range[0]}-${range[1]} of ${total} justifications`
//                 }}
//                 scroll={{ x: 1200 }}
//                 size="small"
//                 rowClassName={(record) => {
//                   let className = 'cash-request-row';
//                   if (canUserApproveJustification(record)) {
//                     className += ' pending-approval-row';
//                   }
//                   return className;
//                 }}
//               />
//             )}
//           </TabPane>

//           <TabPane 
//             tab={
//               <Badge count={stats.approved} offset={[10, 0]} color="#52c41a">
//                 <span>
//                   <CheckCircleOutlined />
//                   Ready to Disburse ({stats.approved})
//                 </span>
//               </Badge>
//             } 
//             key="approved"
//           >
//             <Table 
//               columns={requestColumns} 
//               dataSource={getFilteredRequests()} 
//               loading={loading}
//               rowKey="_id"
//               pagination={{ 
//                 pageSize: 10,
//                 showSizeChanger: true,
//                 showQuickJumper: true,
//                 showTotal: (total, range) => 
//                   `${range[0]}-${range[1]} of ${total} requests`
//               }}
//               scroll={{ x: 'max-content' }}
//               rowClassName={() => 'highlight-row-ready'}
//             />
//           </TabPane>

//           <TabPane 
//             tab={
//               <Badge count={stats.partiallyDisbursed} offset={[10, 0]} color="#1890ff">
//                 <span>
//                   <SyncOutlined />
//                   Partially Disbursed ({stats.partiallyDisbursed})
//                 </span>
//               </Badge>
//             } 
//             key="partially_disbursed"
//           >
//             <Table 
//               columns={requestColumns} 
//               dataSource={getFilteredRequests()} 
//               loading={loading}
//               rowKey="_id"
//               pagination={{ 
//                 pageSize: 10,
//                 showSizeChanger: true,
//                 showQuickJumper: true,
//                 showTotal: (total, range) => 
//                   `${range[0]}-${range[1]} of ${total} requests`
//               }}
//               scroll={{ x: 'max-content' }}
//               rowClassName={() => 'highlight-row-partial'}
//             />
//           </TabPane>

//           <TabPane 
//             tab={
//               <Badge count={stats.fullyDisbursed} offset={[10, 0]} color="#13c2c2">
//                 <span>
//                   <DollarOutlined />
//                   Fully Disbursed ({stats.fullyDisbursed})
//                 </span>
//               </Badge>
//             } 
//             key="fully_disbursed"
//           >
//             <Table 
//               columns={requestColumns} 
//               dataSource={getFilteredRequests()} 
//               loading={loading}
//               rowKey="_id"
//               pagination={{ 
//                 pageSize: 10,
//                 showSizeChanger: true,
//                 showQuickJumper: true,
//                 showTotal: (total, range) => 
//                   `${range[0]}-${range[1]} of ${total} requests`
//               }}
//               scroll={{ x: 'max-content' }}
//             />
//           </TabPane>

//           <TabPane 
//             tab={
//               <span>
//                 <CheckCircleOutlined />
//                 Completed ({stats.completed})
//               </span>
//             } 
//             key="completed"
//           >
//             <Table 
//               columns={requestColumns} 
//               dataSource={getFilteredRequests()} 
//               loading={loading}
//               rowKey="_id"
//               pagination={{ 
//                 pageSize: 10,
//                 showSizeChanger: true,
//                 showQuickJumper: true,
//                 showTotal: (total, range) => 
//                   `${range[0]}-${range[1]} of ${total} requests`
//               }}
//               scroll={{ x: 'max-content' }}
//             />
//           </TabPane>

//           <TabPane 
//             tab={
//               <span>
//                 <CloseCircleOutlined />
//                 Rejected ({stats.rejected})
//               </span>
//             } 
//             key="rejected"
//           >
//             <Table 
//               columns={requestColumns} 
//               dataSource={getFilteredRequests()} 
//               loading={loading}
//               rowKey="_id"
//               pagination={{ 
//                 pageSize: 10,
//                 showSizeChanger: true,
//                 showQuickJumper: true,
//                 showTotal: (total, range) => 
//                   `${range[0]}-${range[1]} of ${total} requests`
//               }}
//               scroll={{ x: 'max-content' }}
//             />
//           </TabPane>
//         </Tabs>
//       </Card>

//       {/* Modals */}
//       <DisbursementModal
//         visible={disbursementModalVisible}
//         request={selectedDisbursementRequest}
//         onSubmit={handleDisbursementSubmit}
//         onCancel={() => {
//           setDisbursementModalVisible(false);
//           setSelectedDisbursementRequest(null);
//         }}
//       />

//       <JustificationApprovalModal
//         visible={justificationModalVisible}
//         request={selectedJustificationRequest}
//         onSubmit={handleJustificationSubmit}
//         onCancel={() => {
//           setJustificationModalVisible(false);
//           setSelectedJustificationRequest(null);
//         }}
//       />

//       <CashRequestExportModal
//         visible={exportModalVisible}
//         onCancel={() => setExportModalVisible(false)}
//       />

//       <style>{`
//         .highlight-row-urgent {
//           background-color: #fff7e6 !important;
//           border-left: 4px solid #faad14 !important;
//         }
//         .highlight-row-urgent:hover {
//           background-color: #fff1d6 !important;
//         }
//         .highlight-row-ready {
//           background-color: #f6ffed !important;
//           border-left: 4px solid #52c41a !important;
//         }
//         .highlight-row-ready:hover {
//           background-color: #d9f7be !important;
//         }
//         .highlight-row-partial {
//           background-color: #e6f7ff !important;
//           border-left: 4px solid #1890ff !important;
//         }
//         .highlight-row-partial:hover {
//           background-color: #bae7ff !important;
//         }
//         .cash-request-row {
//           background-color: #fafafa;
//         }
//         .cash-request-row:hover {
//           background-color: #f0f0f0 !important;
//         }
//         .pending-approval-row {
//           border-left: 3px solid #faad14;
//           background-color: #fff7e6;
//         }
//         .pending-approval-row:hover {
//           background-color: #fff1d6 !important;
//         }
//       `}</style>
//     </div>
//   );
// };

// export default FinanceCashApprovals;












// import React, { useState, useEffect, useCallback } from 'react';
// import { useNavigate } from 'react-router-dom';
// import { useSelector } from 'react-redux';
// import {
//   Card,
//   Table,
//   Tag,
//   Space,
//   Typography,
//   Button,
//   Alert,
//   Spin,
//   message,
//   Badge,
//   Tooltip,
//   Tabs,
//   Progress,
//   Statistic,
//   Row,
//   Col
// } from 'antd';
// import {
//   CheckCircleOutlined,
//   CloseCircleOutlined,
//   ClockCircleOutlined,
//   DollarOutlined,
//   CalendarOutlined,
//   BankOutlined,
//   EyeOutlined,
//   ReloadOutlined,
//   ExclamationCircleOutlined,
//   SendOutlined,
//   FileTextOutlined,
//   AuditOutlined,
//   DownloadOutlined,
//   SyncOutlined
// } from '@ant-design/icons';
// import { cashRequestAPI } from '../../services/cashRequestAPI';
// import CashRequestExportModal from './CashRequestExport';
// import DisbursementModal from './DisbursementModal';
// import JustificationApprovalModal from './JustificationApprovalModal';

// const { Title, Text } = Typography;
// const { TabPane } = Tabs;

// const FinanceCashApprovals = () => {
//   const navigate = useNavigate();
//   const { user } = useSelector((state) => state.auth);
  
//   const [requests, setRequests] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [activeTab, setActiveTab] = useState('pending');
//   const [exportModalVisible, setExportModalVisible] = useState(false);
  
//   // Disbursement modal state
//   const [disbursementModalVisible, setDisbursementModalVisible] = useState(false);
//   const [selectedDisbursementRequest, setSelectedDisbursementRequest] = useState(null);
  
//   // Justification modal state
//   const [justificationModalVisible, setJustificationModalVisible] = useState(false);
//   const [selectedJustificationRequest, setSelectedJustificationRequest] = useState(null);
  
//   const [stats, setStats] = useState({
//     pendingFinance: 0,
//     approved: 0,
//     partiallyDisbursed: 0,
//     fullyDisbursed: 0,
//     completed: 0,
//     rejected: 0,
//     justificationsPending: 0
//   });
//   const [justifications, setJustifications] = useState([]);

//   // ============ HELPER FUNCTIONS ============

//   const isJustificationStatus = (status) => {
//     return status && (
//       status.includes('justification_pending') || 
//       status.includes('justification_rejected') ||
//       status === 'completed'
//     );
//   };

//   const extractJustificationLevel = (status) => {
//     if (!status || !status.includes('justification_')) return null;
    
//     const levelMap = {
//       'justification_pending_supervisor': 1,
//       'justification_pending_departmental_head': 2,
//       'justification_pending_head_of_business': 3,
//       'justification_pending_finance': 4,
//       'justification_rejected_supervisor': 1,
//       'justification_rejected_departmental_head': 2,
//       'justification_rejected_head_of_business': 3,
//       'justification_rejected_finance': 4
//     };
    
//     return levelMap[status] || null;
//   };

//   const getJustificationStatusInfo = (status, level = null) => {
//     const statusLevel = level || extractJustificationLevel(status);
    
//     const levelNames = {
//       1: 'Supervisor',
//       2: 'Departmental Head',
//       3: 'Head of Business',
//       4: 'Finance'
//     };
    
//     if (status === 'completed') {
//       return {
//         text: 'Completed',
//         color: 'cyan',
//         icon: <CheckCircleOutlined />,
//         description: 'All approvals completed'
//       };
//     }
    
//     if (status?.includes('justification_rejected')) {
//       return {
//         text: `Revision Required (${levelNames[statusLevel]})`,
//         color: 'gold',
//         icon: <ExclamationCircleOutlined />,
//         description: `Rejected at Level ${statusLevel} - ${levelNames[statusLevel]}`
//       };
//     }
    
//     if (status?.includes('justification_pending')) {
//       return {
//         text: `Level ${statusLevel}/4: Pending ${levelNames[statusLevel]}`,
//         color: 'orange',
//         icon: <ClockCircleOutlined />,
//         description: `Awaiting approval from ${levelNames[statusLevel]}`
//       };
//     }
    
//     return {
//       text: status?.replace(/_/g, ' ') || 'Unknown',
//       color: 'default',
//       icon: null,
//       description: ''
//     };
//   };

//   const canUserApproveJustification = useCallback((request) => {
//     if (!request.justificationApprovalChain || !user?.email) {
//       return false;
//     }

//     if (!isJustificationStatus(request.status)) {
//       return false;
//     }

//     const currentStatusLevel = extractJustificationLevel(request.status);
    
//     if (!currentStatusLevel) {
//       return false;
//     }

//     const userPendingSteps = request.justificationApprovalChain.filter(step => {
//       const emailMatch = step.approver?.email?.toLowerCase() === user.email.toLowerCase();
//       const isPending = step.status === 'pending';
      
//       return emailMatch && isPending;
//     });

//     if (userPendingSteps.length === 0) {
//       return false;
//     }

//     const canApprove = userPendingSteps.some(step => step.level === currentStatusLevel);

//     return canApprove;
//   }, [user?.email]);

//   // ============ DATA FETCHING ============

//   const fetchAllData = useCallback(async () => {
//     try {
//       setLoading(true);
//       console.log('Fetching all cash requests and justifications...');

//       const response = await cashRequestAPI.getFinanceRequests();

//       if (response && response.success) {
//         const allData = response.data || [];
        
//         console.log('Total records fetched:', allData.length);
        
//         // Improved: More precise separation
//         const cashRequestsOnly = allData.filter(req =>
//           !isJustificationStatus(req.status) &&
//           ['pending_finance', 'approved', 'disbursed', 'partially_disbursed', 'fully_disbursed', 'denied'].includes(req.status)
//         );
//         const justificationsOnly = allData.filter(req => isJustificationStatus(req.status));
        
//         console.log('Cash requests:', cashRequestsOnly.length);
//         console.log('Justifications:', justificationsOnly.length);
        
//         setRequests(cashRequestsOnly);
//         setJustifications(justificationsOnly);

//         const pendingJustifications = justificationsOnly.filter(j => 
//           canUserApproveJustification(j)
//         ).length;

//         console.log('Pending justifications for user:', pendingJustifications);

//         const calculatedStats = {
//           pendingFinance: cashRequestsOnly.filter(req => req.teamRequestMetadata?.userHasPendingApproval).length,
//           approved: cashRequestsOnly.filter(req => req.status === 'approved').length,
//           partiallyDisbursed: cashRequestsOnly.filter(req => 
//             req.status === 'partially_disbursed' || 
//             (req.status === 'disbursed' && (req.remainingBalance || 0) > 0)
//           ).length,
//           fullyDisbursed: cashRequestsOnly.filter(req => 
//             req.status === 'fully_disbursed' || 
//             (req.status === 'disbursed' && (req.remainingBalance || 0) === 0)
//           ).length,
//           completed: allData.filter(req => req.status === 'completed').length,
//           rejected: cashRequestsOnly.filter(req => req.status === 'denied').length,
//           justificationsPending: pendingJustifications
//         };

//         console.log('Calculated stats:', calculatedStats);
//         setStats(calculatedStats);
//       } else {
//         throw new Error('Failed to fetch data');
//       }
//     } catch (error) {
//       console.error('Error fetching data:', error);
//       message.error(error.response?.data?.message || 'Failed to load finance approvals');
//       setRequests([]);
//       setJustifications([]);
//     } finally {
//       setLoading(false);
//     }
//   }, [canUserApproveJustification]);

//   useEffect(() => {
//     if (user?.email) {
//       fetchAllData();
//     }
//   }, [fetchAllData, user?.email]);

//   const handleRefresh = async () => {
//     await fetchAllData();
//     message.success('Data refreshed successfully');
//   };

//   // ============ DISBURSEMENT HANDLERS ============

//   const handleOpenDisbursementModal = (request) => {
//     setSelectedDisbursementRequest(request);
//     setDisbursementModalVisible(true);
//   };

//   const handleDisbursementSubmit = async ({ requestId, amount, notes }) => {
//     try {
//       console.log('Processing disbursement:', { requestId, amount, notes });
      
//       const response = await cashRequestAPI.processDisbursement(requestId, {
//         amount,
//         notes
//       });

//       if (response.success) {
//         message.success(response.message || 'Disbursement processed successfully');
//         setDisbursementModalVisible(false);
//         setSelectedDisbursementRequest(null);
//         await fetchAllData();
//       } else {
//         throw new Error(response.message || 'Failed to process disbursement');
//       }
//     } catch (error) {
//       console.error('Disbursement error:', error);
//       message.error(error.response?.data?.message || 'Failed to process disbursement');
//     }
//   };

//   // ============ JUSTIFICATION HANDLERS ============

//   const handleOpenJustificationModal = (request) => {
//     setSelectedJustificationRequest(request);
//     setJustificationModalVisible(true);
//   };

//   const handleJustificationSubmit = async ({ requestId, decision, comments }) => {
//     try {
//       console.log('Processing justification decision:', { requestId, decision, comments });
      
//       const response = await cashRequestAPI.processJustificationDecision(requestId, {
//         decision,
//         comments
//       });

//       if (response.success) {
//         message.success(response.message || `Justification ${decision} successfully`);
//         setJustificationModalVisible(false);
//         setSelectedJustificationRequest(null);
//         await fetchAllData();
//       } else {
//         throw new Error(response.message || 'Failed to process justification');
//       }
//     } catch (error) {
//       console.error('Justification decision error:', error);
//       message.error(error.response?.data?.message || 'Failed to process justification');
//     }
//   };

//   const handleReviewJustification = (requestId) => {
//     navigate(`/finance/cash-request/${requestId}`);
//   };

//   const getStatusTag = (status) => {
//     if (isJustificationStatus(status)) {
//       const statusInfo = getJustificationStatusInfo(status);
//       return (
//         <Tooltip title={statusInfo.description}>
//           <Tag color={statusInfo.color} icon={statusInfo.icon}>
//             {statusInfo.text}
//           </Tag>
//         </Tooltip>
//       );
//     }

//     const statusMap = {
//       'pending_finance': { 
//         color: 'orange', 
//         icon: <ClockCircleOutlined />, 
//         text: 'Your Approval Required' 
//       },
//       'approved': { 
//         color: 'green', 
//         icon: <CheckCircleOutlined />, 
//         text: 'Approved - Ready for Disbursement' 
//       },
//       'disbursed': {
//         color: 'processing',
//         icon: <SyncOutlined spin />,
//         text: 'Disbursed'
//       },
//       'partially_disbursed': { 
//         color: 'processing', 
//         icon: <SyncOutlined spin />, 
//         text: 'Partially Disbursed' 
//       },
//       'fully_disbursed': { 
//         color: 'cyan', 
//         icon: <DollarOutlined />, 
//         text: 'Fully Disbursed - Awaiting Justification' 
//       },
//       'completed': { 
//         color: 'green', 
//         icon: <CheckCircleOutlined />, 
//         text: 'Completed' 
//       },
//       'denied': { 
//         color: 'red', 
//         icon: <CloseCircleOutlined />, 
//         text: 'Rejected' 
//       }
//     };

//     const statusInfo = statusMap[status] || { 
//       color: 'default', 
//       text: status?.replace('_', ' ') || 'Unknown' 
//     };

//     return (
//       <Tag color={statusInfo.color} icon={statusInfo.icon}>
//         {statusInfo.text}
//       </Tag>
//     );
//   };

//   const getUrgencyTag = (urgency) => {
//     const urgencyMap = {
//       'urgent': { color: 'red', text: 'Urgent' },
//       'high': { color: 'red', text: 'High' },
//       'medium': { color: 'orange', text: 'Medium' },
//       'low': { color: 'green', text: 'Low' }
//     };
//     const urgencyInfo = urgencyMap[urgency] || { color: 'default', text: urgency };

//     return (
//       <Tag color={urgencyInfo.color}>
//         {urgencyInfo.text}
//       </Tag>
//     );
//   };

//   const getFilteredRequests = () => {
//     switch (activeTab) {
//       case 'pending':
//         return requests.filter(req => req.status === 'pending_finance');
//       case 'approved':
//         return requests.filter(req => req.status === 'approved');
//       case 'partially_disbursed':
//         return requests.filter(req =>
//           req.status === 'partially_disbursed' ||
//           (req.status === 'disbursed' && (req.remainingBalance || 0) > 0)
//         );
//       case 'fully_disbursed':
//         return requests.filter(req =>
//           req.status === 'fully_disbursed' ||
//           (req.status === 'disbursed' && (req.remainingBalance || 0) === 0)
//         );
//       case 'completed':
//         return requests.filter(req => req.status === 'completed');
//       case 'rejected':
//         return requests.filter(req => req.status === 'denied');
//       default:
//         return requests;
//     }
//   };

//   const requestColumns = [
//     {
//       title: 'Request ID',
//       dataIndex: 'id',
//       key: 'id',
//       render: (id) => (
//         <Tag color="blue">
//           REQ-{id.toString().slice(-6).toUpperCase()}
//         </Tag>
//       ),
//       width: 120
//     },
//     {
//       title: 'Employee',
//       key: 'employee',
//       render: (_, record) => (
//         <div>
//           <Text strong>{record.employee?.fullName || 'N/A'}</Text>
//           <br />
//           <Text type="secondary" style={{ fontSize: '12px' }}>
//             {record.employee?.position || 'N/A'}
//           </Text>
//           <br />
//           <Tag color="blue" size="small">{record.employee?.department || 'N/A'}</Tag>
//         </div>
//       ),
//       width: 180
//     },
//     {
//       title: 'Request Details',
//       key: 'requestDetails',
//       render: (_, record) => (
//         <div>
//           <Text strong style={{ color: '#1890ff' }}>
//             XAF {Number(record.amountRequested || 0).toLocaleString()}
//           </Text>
//           <br />
//           <Text type="secondary" style={{ fontSize: '12px' }}>
//             Type: {record.requestType?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'N/A'}
//           </Text>
//           <br />
//           <Tooltip title={record.purpose}>
//             <Text ellipsis style={{ maxWidth: 200, fontSize: '11px', color: '#666' }}>
//               {record.purpose && record.purpose.length > 40 
//                 ? `${record.purpose.substring(0, 40)}...` 
//                 : record.purpose || 'No purpose specified'
//               }
//             </Text>
//           </Tooltip>
//         </div>
//       ),
//       width: 200
//     },
//     {
//       title: 'Priority & Dates',
//       key: 'priorityDate',
//       render: (_, record) => (
//         <div>
//           {getUrgencyTag(record.urgency)}
//           <br />
//           <Text type="secondary" style={{ fontSize: '11px' }}>
//             <CalendarOutlined /> Expected: {record.requiredDate ? new Date(record.requiredDate).toLocaleDateString('en-GB') : 'N/A'}
//           </Text>
//           <br />
//           <Text type="secondary" style={{ fontSize: '11px' }}>
//             Submitted: {record.createdAt ? new Date(record.createdAt).toLocaleDateString('en-GB') : 'N/A'}
//           </Text>
//         </div>
//       ),
//       sorter: (a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0),
//       width: 140
//     },
//     {
//       title: 'Disbursement Status',
//       key: 'disbursementStatus',
//       render: (_, record) => {
//         const amountRequested = record.amountRequested || 0;
//         const totalDisbursed = record.totalDisbursed || 0;
//         const remainingBalance = record.remainingBalance || 0;
        
//         // Calculate progress based on amountRequested (not amountApproved)
//         const progress = amountRequested > 0 
//           ? Math.round((totalDisbursed / amountRequested) * 100) 
//           : 0;

//         if (record.status === 'approved') {
//           return (
//             <Tag color="orange" size="small">
//               <ExclamationCircleOutlined /> Ready for Disbursement
//             </Tag>
//           );
//         }

//         if (['partially_disbursed', 'fully_disbursed', 'disbursed'].includes(record.status)) {
//           return (
//             <div>
//               <Progress 
//                 percent={progress} 
//                 size="small" 
//                 status={progress === 100 ? 'success' : 'active'}
//               />
//               <Text style={{ fontSize: '11px' }}>
//                 {totalDisbursed.toLocaleString()} / {amountRequested.toLocaleString()}
//               </Text>
//               <br />
//               <Text type="secondary" style={{ fontSize: '10px' }}>
//                 {record.disbursements?.length || 0} payment(s)
//               </Text>
//             </div>
//           );
//         }

//         return <Text type="secondary" style={{ fontSize: '11px' }}>Not disbursed</Text>;
//       },
//       width: 160
//     },
//     {
//       title: 'Status',
//       dataIndex: 'status',
//       key: 'status',
//       render: (status) => getStatusTag(status),
//       width: 200
//     },
//     {
//       title: 'Actions',
//       key: 'actions',
//       render: (_, record) => (
//         <Space direction="vertical" size="small">
//           <Button 
//             type="link" 
//             icon={<EyeOutlined />}
//             onClick={() => navigate(`/finance/cash-request/${record._id}`)}
//             size="small"
//           >
//             View Details
//           </Button>
//           {record.status === 'pending_finance' && (
//             <Button 
//               type="primary"
//               size="small"
//               icon={<CheckCircleOutlined />}
//               onClick={() => navigate(`/finance/cash-request/${record._id}`)}
//             >
//               Process Approval
//             </Button>
//           )}
//           {(['approved', 'partially_disbursed'].includes(record.status) || 
//             (record.status === 'disbursed' && (record.remainingBalance || 0) > 0)) && (
//             <Button 
//               type="default"
//               size="small"
//               icon={<SendOutlined />}
//               onClick={() => handleOpenDisbursementModal(record)}
//               style={{ color: '#52c41a', borderColor: '#52c41a' }}
//             >
//               Disburse
//             </Button>
//           )}
//         </Space>
//       ),
//       width: 150
//     }
//   ];

//   const justificationColumns = [
//     {
//       title: 'Request ID',
//       dataIndex: 'id',
//       key: 'id',
//       width: 140,
//       render: (id) => <Tag color="blue">REQ-{id.toString().slice(-6).toUpperCase()}</Tag>
//     },
//     {
//       title: 'Employee',
//       key: 'employee',
//       render: (_, record) => (
//         <div>
//           <Text strong>{record.employee?.fullName || 'N/A'}</Text>
//           <br />
//           <Tag color="blue" size="small">
//             {record.employee?.department || 'N/A'}
//           </Tag>
//         </div>
//       ),
//       width: 180
//     },
//     {
//       title: 'Financial Summary',
//       key: 'financial',
//       render: (_, record) => {
//         const disbursed = record.disbursementDetails?.amount || record.totalDisbursed || 0;
//         const spent = record.justification?.amountSpent || 0;
//         const returned = record.justification?.balanceReturned || 0;
//         const isBalanced = Math.abs((spent + returned) - disbursed) < 0.01;

//         return (
//           <div>
//             <Text type="secondary" style={{ fontSize: '11px' }}>
//               Disbursed: XAF {disbursed.toLocaleString()}
//             </Text>
//             <br />
//             <Text type="secondary" style={{ fontSize: '11px' }}>
//               Spent: XAF {spent.toLocaleString()}
//             </Text>
//             <br />
//             <Text type="secondary" style={{ fontSize: '11px' }}>
//               Returned: XAF {returned.toLocaleString()}
//             </Text>
//             <br />
//             {!isBalanced && (
//               <Tag color="warning" size="small">Unbalanced</Tag>
//             )}
//           </div>
//         );
//       },
//       width: 180
//     },
//     {
//       title: 'Submitted Date',
//       key: 'date',
//       render: (_, record) => (
//         <Text type="secondary">
//           {record.justification?.justificationDate 
//             ? new Date(record.justification.justificationDate).toLocaleDateString('en-GB')
//             : 'N/A'
//           }
//         </Text>
//       ),
//       width: 120
//     },
//     {
//       title: 'Approval Progress',
//       key: 'progress',
//       render: (_, record) => {
//         if (!record.justificationApprovalChain) return <Text type="secondary">No chain</Text>;
        
//         const currentLevel = extractJustificationLevel(record.status);
//         const totalLevels = record.justificationApprovalChain.length;
//         const approvedCount = record.justificationApprovalChain.filter(s => s.status === 'approved').length;
        
//         return (
//           <div>
//             <Progress 
//               percent={Math.round((approvedCount / totalLevels) * 100)} 
//               size="small"
//               status={record.status === 'completed' ? 'success' : 'active'}
//               showInfo={false}
//             />
//             <Text style={{ fontSize: '11px' }}>
//               Level {currentLevel || approvedCount + 1}/{totalLevels}
//             </Text>
//           </div>
//         );
//       },
//       width: 120
//     },
//     {
//       title: 'Status',
//       key: 'justificationStatus',
//       render: (_, record) => (
//         <div>
//           {getStatusTag(record.status)}
//           {canUserApproveJustification(record) && (
//             <div style={{ marginTop: 4 }}>
//               <Tag color="gold" size="small">Your Turn</Tag>
//             </div>
//           )}
//         </div>
//       ),
//       width: 200
//     },
//     {
//       title: 'Documents',
//       key: 'documents',
//       render: (_, record) => (
//         <Badge 
//           count={record.justification?.documents?.length || 0} 
//           showZero
//           style={{ backgroundColor: '#52c41a' }}
//         >
//           <FileTextOutlined style={{ fontSize: '16px' }} />
//         </Badge>
//       ),
//       width: 100
//     },
//     {
//       title: 'Action',
//       key: 'action',
//       width: 180,
//       render: (_, record) => (
//         <Space size="small" direction="vertical">
//           <Button
//             size="small"
//             icon={<EyeOutlined />}
//             onClick={() => handleReviewJustification(record._id)}
//             block
//           >
//             View Details
//           </Button>
//           {canUserApproveJustification(record) && (
//             <Button
//               size="small"
//               type="primary"
//               icon={<AuditOutlined />}
//               onClick={() => handleOpenJustificationModal(record)}
//               block
//             >
//               Approve/Reject
//             </Button>
//           )}
//         </Space>
//       )
//     }
//   ];

//   const pendingForMe = requests.filter(req => req.teamRequestMetadata?.userHasPendingApproval).length;
//   const readyForDisbursement = stats.approved + stats.partiallyDisbursed;

//   if (loading && requests.length === 0 && justifications.length === 0) {
//     return (
//       <div style={{ padding: '24px', textAlign: 'center' }}>
//         <Spin size="large" />
//         <div style={{ marginTop: '16px' }}>Loading finance cash approvals...</div>
//       </div>
//     );
//   }

//   return (
//     <div style={{ padding: '24px' }}>
//       {/* Stats Cards */}
//       <Row gutter={16} style={{ marginBottom: '24px' }}>
//         <Col span={4}>
//           <Card size="small">
//             <Statistic
//               title="Your Approvals"
//               value={pendingForMe}
//               prefix={<ClockCircleOutlined />}
//               valueStyle={{ color: '#faad14' }}
//             />
//           </Card>
//         </Col>
//         <Col span={4}>
//           <Card size="small">
//             <Statistic
//               title="Ready to Disburse"
//               value={stats.approved}
//               prefix={<CheckCircleOutlined />}
//               valueStyle={{ color: '#52c41a' }}
//             />
//           </Card>
//         </Col>
//         <Col span={4}>
//           <Card size="small">
//             <Statistic
//               title="Partial Disbursed"
//               value={stats.partiallyDisbursed}
//               prefix={<SyncOutlined />}
//               valueStyle={{ color: '#1890ff' }}
//             />
//           </Card>
//         </Col>
//         <Col span={4}>
//           <Card size="small">
//             <Statistic
//               title="Fully Disbursed"
//               value={stats.fullyDisbursed}
//               prefix={<DollarOutlined />}
//               valueStyle={{ color: '#13c2c2' }}
//             />
//           </Card>
//         </Col>
//         <Col span={4}>
//           <Card size="small">
//             <Statistic
//               title="Justifications"
//               value={stats.justificationsPending}
//               prefix={<FileTextOutlined />}
//               valueStyle={{ color: '#722ed1' }}
//             />
//           </Card>
//         </Col>
//         <Col span={4}>
//           <Card size="small">
//             <Statistic
//               title="Completed"
//               value={stats.completed}
//               prefix={<CheckCircleOutlined />}
//               valueStyle={{ color: '#52c41a' }}
//             />
//           </Card>
//         </Col>
//       </Row>

//       {/* Main Content */}
//       <Card>
//         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
//           <Title level={2} style={{ margin: 0 }}>
//             <BankOutlined /> Finance Cash Approvals
//           </Title>
//           <Space>
//             <Button 
//               icon={<ReloadOutlined />}
//               onClick={handleRefresh}
//               loading={loading}
//             >
//               Refresh
//             </Button>
//             <Button 
//               type="primary"
//               icon={<DownloadOutlined />}
//               onClick={() => setExportModalVisible(true)}
//             >
//               Export Data
//             </Button>
//           </Space>
//         </div>

//         {(pendingForMe > 0 || readyForDisbursement > 0 || stats.justificationsPending > 0) && (
//           <Alert
//             message={
//               <div>
//                 {pendingForMe > 0 && (
//                   <div>🔔 You have {pendingForMe} cash request(s) waiting for your approval</div>
//                 )}
//                 {readyForDisbursement > 0 && (
//                   <div>💰 {readyForDisbursement} request(s) are ready for disbursement</div>
//                 )}
//                 {stats.justificationsPending > 0 && (
//                   <div>📄 {stats.justificationsPending} justification(s) require your review</div>
//                 )}
//               </div>
//             }
//             type="warning"
//             showIcon
//             style={{ marginBottom: '16px' }}
//           />
//         )}

//         <Tabs activeKey={activeTab} onChange={setActiveTab}>
//           <TabPane 
//             tab={
//               <Badge count={stats.pendingFinance} offset={[10, 0]} color="#faad14">
//                 <span>
//                   <ExclamationCircleOutlined />
//                   Pending Approval ({stats.pendingFinance})
//                 </span>
//               </Badge>
//             } 
//             key="pending"
//           >
//             <Table 
//               columns={requestColumns} 
//               dataSource={getFilteredRequests()} 
//               loading={loading}
//               rowKey="_id"
//               pagination={{ 
//                 pageSize: 10,
//                 showSizeChanger: true,
//                 showQuickJumper: true,
//                 showTotal: (total, range) => 
//                   `${range[0]}-${range[1]} of ${total} requests`
//               }}
//               scroll={{ x: 'max-content' }}
//               rowClassName={(record) => {
//                 if (record.status === 'pending_finance') {
//                   return 'highlight-row-urgent'; 
//                 }
//                 return '';
//               }}
//             />
//           </TabPane>

//           <TabPane
//             tab={
//               <Badge count={stats.justificationsPending} offset={[10, 0]} color="#1890ff">
//                 <span>
//                   <FileTextOutlined />
//                   Justifications ({stats.justificationsPending})
//                 </span>
//               </Badge>
//             }
//             key="justifications"
//           >
//             {activeTab === 'justifications' && (
//               <Table
//                 columns={justificationColumns}
//                 dataSource={justifications}
//                 loading={loading}
//                 rowKey="_id"
//                 pagination={{ 
//                   pageSize: 10, 
//                   showSizeChanger: true,
//                   showQuickJumper: true,
//                   showTotal: (total, range) => 
//                     `${range[0]}-${range[1]} of ${total} justifications`
//                 }}
//                 scroll={{ x: 1200 }}
//                 size="small"
//                 rowClassName={(record) => {
//                   let className = 'cash-request-row';
//                   if (canUserApproveJustification(record)) {
//                     className += ' pending-approval-row';
//                   }
//                   return className;
//                 }}
//               />
//             )}
//           </TabPane>

//           <TabPane 
//             tab={
//               <Badge count={stats.approved} offset={[10, 0]} color="#52c41a">
//                 <span>
//                   <CheckCircleOutlined />
//                   Ready to Disburse ({stats.approved})
//                 </span>
//               </Badge>
//             } 
//             key="approved"
//           >
//             <Table 
//               columns={requestColumns} 
//               dataSource={getFilteredRequests()} 
//               loading={loading}
//               rowKey="_id"
//               pagination={{ 
//                 pageSize: 10,
//                 showSizeChanger: true,
//                 showQuickJumper: true,
//                 showTotal: (total, range) => 
//                   `${range[0]}-${range[1]} of ${total} requests`
//               }}
//               scroll={{ x: 'max-content' }}
//               rowClassName={() => 'highlight-row-ready'}
//             />
//           </TabPane>

//           <TabPane 
//             tab={
//               <Badge count={stats.partiallyDisbursed} offset={[10, 0]} color="#1890ff">
//                 <span>
//                   <SyncOutlined />
//                   Partially Disbursed ({stats.partiallyDisbursed})
//                 </span>
//               </Badge>
//             } 
//             key="partially_disbursed"
//           >
//             <Table 
//               columns={requestColumns} 
//               dataSource={getFilteredRequests()} 
//               loading={loading}
//               rowKey="_id"
//               pagination={{ 
//                 pageSize: 10,
//                 showSizeChanger: true,
//                 showQuickJumper: true,
//                 showTotal: (total, range) => 
//                   `${range[0]}-${range[1]} of ${total} requests`
//               }}
//               scroll={{ x: 'max-content' }}
//               rowClassName={() => 'highlight-row-partial'}
//             />
//           </TabPane>

//           <TabPane 
//             tab={
//               <Badge count={stats.fullyDisbursed} offset={[10, 0]} color="#13c2c2">
//                 <span>
//                   <DollarOutlined />
//                   Fully Disbursed ({stats.fullyDisbursed})
//                 </span>
//               </Badge>
//             } 
//             key="fully_disbursed"
//           >
//             <Table 
//               columns={requestColumns} 
//               dataSource={getFilteredRequests()} 
//               loading={loading}
//               rowKey="_id"
//               pagination={{ 
//                 pageSize: 10,
//                 showSizeChanger: true,
//                 showQuickJumper: true,
//                 showTotal: (total, range) => 
//                   `${range[0]}-${range[1]} of ${total} requests`
//               }}
//               scroll={{ x: 'max-content' }}
//             />
//           </TabPane>

//           <TabPane 
//             tab={
//               <span>
//                 <CheckCircleOutlined />
//                 Completed ({stats.completed})
//               </span>
//             } 
//             key="completed"
//           >
//             <Table 
//               columns={requestColumns} 
//               dataSource={getFilteredRequests()} 
//               loading={loading}
//               rowKey="_id"
//               pagination={{ 
//                 pageSize: 10,
//                 showSizeChanger: true,
//                 showQuickJumper: true,
//                 showTotal: (total, range) => 
//                   `${range[0]}-${range[1]} of ${total} requests`
//               }}
//               scroll={{ x: 'max-content' }}
//             />
//           </TabPane>

//           <TabPane 
//             tab={
//               <span>
//                 <CloseCircleOutlined />
//                 Rejected ({stats.rejected})
//               </span>
//             } 
//             key="rejected"
//           >
//             <Table 
//               columns={requestColumns} 
//               dataSource={getFilteredRequests()} 
//               loading={loading}
//               rowKey="_id"
//               pagination={{ 
//                 pageSize: 10,
//                 showSizeChanger: true,
//                 showQuickJumper: true,
//                 showTotal: (total, range) => 
//                   `${range[0]}-${range[1]} of ${total} requests`
//               }}
//               scroll={{ x: 'max-content' }}
//             />
//           </TabPane>
//         </Tabs>
//       </Card>

//       {/* Modals */}
//       <DisbursementModal
//         visible={disbursementModalVisible}
//         request={selectedDisbursementRequest}
//         onSubmit={handleDisbursementSubmit}
//         onCancel={() => {
//           setDisbursementModalVisible(false);
//           setSelectedDisbursementRequest(null);
//         }}
//       />

//       <JustificationApprovalModal
//         visible={justificationModalVisible}
//         request={selectedJustificationRequest}
//         onSubmit={handleJustificationSubmit}
//         onCancel={() => {
//           setJustificationModalVisible(false);
//           setSelectedJustificationRequest(null);
//         }}
//       />

//       <CashRequestExportModal
//         visible={exportModalVisible}
//         onCancel={() => setExportModalVisible(false)}
//       />

//       <style>{`
//         .highlight-row-urgent {
//           background-color: #fff7e6 !important;
//           border-left: 4px solid #faad14 !important;
//         }
//         .highlight-row-urgent:hover {
//           background-color: #fff1d6 !important;
//         }
//         .highlight-row-ready {
//           background-color: #f6ffed !important;
//           border-left: 4px solid #52c41a !important;
//         }
//         .highlight-row-ready:hover {
//           background-color: #d9f7be !important;
//         }
//         .highlight-row-partial {
//           background-color: #e6f7ff !important;
//           border-left: 4px solid #1890ff !important;
//         }
//         .highlight-row-partial:hover {
//           background-color: #bae7ff !important;
//         }
//         .cash-request-row {
//           background-color: #fafafa;
//         }
//         .cash-request-row:hover {
//           background-color: #f0f0f0 !important;
//         }
//         .pending-approval-row {
//           border-left: 3px solid #faad14;
//           background-color: #fff7e6;
//         }
//         .pending-approval-row:hover {
//           background-color: #fff1d6 !important;
//         }
//       `}</style>
//     </div>
//   );
// };

// export default FinanceCashApprovals;














// import React, { useState, useEffect, useCallback } from 'react';
// import { useNavigate } from 'react-router-dom';
// import { useSelector } from 'react-redux';
// import {
//   Card,
//   Table,
//   Tag,
//   Space,
//   Typography,
//   Button,
//   Alert,
//   Spin,
//   message,
//   Badge,
//   Tooltip,
//   Tabs,
//   Progress,
//   Statistic,
//   Row,
//   Col
// } from 'antd';
// import {
//   CheckCircleOutlined,
//   CloseCircleOutlined,
//   ClockCircleOutlined,
//   DollarOutlined,
//   CalendarOutlined,
//   BankOutlined,
//   EyeOutlined,
//   ReloadOutlined,
//   ExclamationCircleOutlined,
//   SendOutlined,
//   FileTextOutlined,
//   AuditOutlined,
//   DownloadOutlined,
//   SyncOutlined
// } from '@ant-design/icons';
// import { cashRequestAPI } from '../../services/cashRequestAPI';
// import CashRequestExportModal from './CashRequestExport';

// const { Title, Text } = Typography;
// const { TabPane } = Tabs;

// const FinanceCashApprovals = () => {
//   const navigate = useNavigate();
//   const { user } = useSelector((state) => state.auth);
  
//   const [requests, setRequests] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [activeTab, setActiveTab] = useState('pending');
//   const [exportModalVisible, setExportModalVisible] = useState(false);
//   const [stats, setStats] = useState({
//     pendingFinance: 0,
//     approved: 0,
//     partiallyDisbursed: 0,
//     fullyDisbursed: 0,
//     completed: 0,
//     rejected: 0,
//     justificationsPending: 0
//   });
//   const [justifications, setJustifications] = useState([]);

//   // ============ HELPER FUNCTIONS ============

//   // Check if status is a justification status
//   const isJustificationStatus = (status) => {
//     return status && (
//       status.includes('justification_pending') || 
//       status.includes('justification_rejected') ||
//       status === 'completed'
//     );
//   };

//   // Extract level number from justification status
//   const extractJustificationLevel = (status) => {
//     if (!status || !status.includes('justification_')) return null;
    
//     const levelMap = {
//       'justification_pending_supervisor': 1,
//       'justification_pending_departmental_head': 2,
//       'justification_pending_head_of_business': 3,
//       'justification_pending_finance': 4,
//       'justification_rejected_supervisor': 1,
//       'justification_rejected_departmental_head': 2,
//       'justification_rejected_head_of_business': 3,
//       'justification_rejected_finance': 4
//     };
    
//     return levelMap[status] || null;
//   };

//   // Get human-readable justification status
//   const getJustificationStatusInfo = (status, level = null) => {
//     const statusLevel = level || extractJustificationLevel(status);
    
//     const levelNames = {
//       1: 'Supervisor',
//       2: 'Departmental Head',
//       3: 'Head of Business',
//       4: 'Finance'
//     };
    
//     if (status === 'completed') {
//       return {
//         text: 'Completed',
//         color: 'cyan',
//         icon: <CheckCircleOutlined />,
//         description: 'All approvals completed'
//       };
//     }
    
//     if (status?.includes('justification_rejected')) {
//       return {
//         text: `Revision Required (${levelNames[statusLevel]})`,
//         color: 'gold',
//         icon: <ExclamationCircleOutlined />,
//         description: `Rejected at Level ${statusLevel} - ${levelNames[statusLevel]}`
//       };
//     }
    
//     if (status?.includes('justification_pending')) {
//       return {
//         text: `Level ${statusLevel}/4: Pending ${levelNames[statusLevel]}`,
//         color: 'orange',
//         icon: <ClockCircleOutlined />,
//         description: `Awaiting approval from ${levelNames[statusLevel]}`
//       };
//     }
    
//     return {
//       text: status?.replace(/_/g, ' ') || 'Unknown',
//       color: 'default',
//       icon: null,
//       description: ''
//     };
//   };

//   // Check if user can approve justification
//   const canUserApproveJustification = useCallback((request) => {
//     if (!request.justificationApprovalChain || !user?.email) {
//       return false;
//     }

//     if (!isJustificationStatus(request.status)) {
//       return false;
//     }

//     const currentStatusLevel = extractJustificationLevel(request.status);
    
//     if (!currentStatusLevel) {
//       return false;
//     }

//     const userPendingSteps = request.justificationApprovalChain.filter(step => {
//       const emailMatch = step.approver?.email?.toLowerCase() === user.email.toLowerCase();
//       const isPending = step.status === 'pending';
      
//       return emailMatch && isPending;
//     });

//     if (userPendingSteps.length === 0) {
//       return false;
//     }

//     const canApprove = userPendingSteps.some(step => step.level === currentStatusLevel);

//     return canApprove;
//   }, [user?.email]);

//   // ============ DATA FETCHING ============

//   const fetchAllData = useCallback(async () => {
//     try {
//       setLoading(true);
//       console.log('Fetching all cash requests and justifications...');

//       const response = await cashRequestAPI.getSupervisorRequests();

//       if (response && response.success) {
//         const allData = response.data || [];
        
//         console.log('Total records fetched:', allData.length);
        
//         // Separate cash requests from justifications
//         const cashRequestsOnly = allData.filter(req => !isJustificationStatus(req.status));
//         const justificationsOnly = allData.filter(req => isJustificationStatus(req.status));
        
//         console.log('Cash requests:', cashRequestsOnly.length);
//         console.log('Justifications:', justificationsOnly.length);
        
//         setRequests(cashRequestsOnly);
//         setJustifications(justificationsOnly);

//         // Calculate stats
//         const pendingJustifications = justificationsOnly.filter(j => 
//           canUserApproveJustification(j)
//         ).length;

//         console.log('Pending justifications for user:', pendingJustifications);

//         const calculatedStats = {
//           pendingFinance: cashRequestsOnly.filter(req => req.teamRequestMetadata?.userHasPendingApproval).length,
//           approved: cashRequestsOnly.filter(req => req.status === 'approved').length,
//           partiallyDisbursed: cashRequestsOnly.filter(req => req.status === 'partially_disbursed').length,
//           fullyDisbursed: cashRequestsOnly.filter(req => req.status === 'fully_disbursed').length,
//           completed: allData.filter(req => req.status === 'completed').length,
//           rejected: cashRequestsOnly.filter(req => req.status === 'denied').length,
//           justificationsPending: pendingJustifications
//         };

//         console.log('Calculated stats:', calculatedStats);
//         setStats(calculatedStats);
//       } else {
//         throw new Error('Failed to fetch data');
//       }
//     } catch (error) {
//       console.error('Error fetching data:', error);
//       message.error(error.response?.data?.message || 'Failed to load finance approvals');
//       setRequests([]);
//       setJustifications([]);
//     } finally {
//       setLoading(false);
//     }
//   }, [canUserApproveJustification]);

//   useEffect(() => {
//     if (user?.email) {
//       fetchAllData();
//     }
//   }, [fetchAllData, user?.email]);

//   const handleRefresh = async () => {
//     await fetchAllData();
//     message.success('Data refreshed successfully');
//   };

//   const handleDisburse = async (requestId) => {
//     try {
//       console.log('Navigating to disburse:', requestId);
//       navigate(`/finance/cash-request/${requestId}`);
//     } catch (error) {
//       console.error('Error navigating:', error);
//       message.error('Failed to open request');
//     }
//   };

//   const handleReviewJustification = (requestId) => {
//     navigate(`/finance/cash-request/${requestId}`);
//   };

//   const getStatusTag = (status) => {
//     // Handle justification statuses specially
//     if (isJustificationStatus(status)) {
//       const statusInfo = getJustificationStatusInfo(status);
//       return (
//         <Tooltip title={statusInfo.description}>
//           <Tag color={statusInfo.color} icon={statusInfo.icon}>
//             {statusInfo.text}
//           </Tag>
//         </Tooltip>
//       );
//     }

//     const statusMap = {
//       'pending_finance': { 
//         color: 'orange', 
//         icon: <ClockCircleOutlined />, 
//         text: 'Your Approval Required' 
//       },
//       'approved': { 
//         color: 'green', 
//         icon: <CheckCircleOutlined />, 
//         text: 'Approved - Ready for Disbursement' 
//       },
//       'partially_disbursed': { 
//         color: 'processing', 
//         icon: <SyncOutlined spin />, 
//         text: 'Partially Disbursed' 
//       },
//       'fully_disbursed': { 
//         color: 'cyan', 
//         icon: <DollarOutlined />, 
//         text: 'Fully Disbursed - Awaiting Justification' 
//       },
//       'completed': { 
//         color: 'green', 
//         icon: <CheckCircleOutlined />, 
//         text: 'Completed' 
//       },
//       'denied': { 
//         color: 'red', 
//         icon: <CloseCircleOutlined />, 
//         text: 'Rejected' 
//       }
//     };

//     const statusInfo = statusMap[status] || { 
//       color: 'default', 
//       text: status?.replace('_', ' ') || 'Unknown' 
//     };

//     return (
//       <Tag color={statusInfo.color} icon={statusInfo.icon}>
//         {statusInfo.text}
//       </Tag>
//     );
//   };

//   const getUrgencyTag = (urgency) => {
//     const urgencyMap = {
//       'urgent': { color: 'red', text: 'Urgent' },
//       'high': { color: 'red', text: 'High' },
//       'medium': { color: 'orange', text: 'Medium' },
//       'low': { color: 'green', text: 'Low' }
//     };

//     const urgencyInfo = urgencyMap[urgency] || { color: 'default', text: urgency };

//     return (
//       <Tag color={urgencyInfo.color}>
//         {urgencyInfo.text}
//       </Tag>
//     );
//   };

//   const getFilteredRequests = () => {
//     switch (activeTab) {
//       case 'pending':
//         return requests.filter(req => {
//           if (req.teamRequestMetadata && typeof req.teamRequestMetadata.userHasPendingApproval !== 'undefined') {
//             return req.teamRequestMetadata.userHasPendingApproval;
//           }
//           return req.status === 'pending_finance';
//         });
//       case 'approved':
//         return requests.filter(req => req.status === 'approved');
//       case 'partially_disbursed':
//         return requests.filter(req => req.status === 'partially_disbursed');
//       case 'fully_disbursed':
//         return requests.filter(req => req.status === 'fully_disbursed');
//       case 'completed':
//         return requests.filter(req => req.status === 'completed');
//       case 'rejected':
//         return requests.filter(req => req.status === 'denied');
//       default:
//         return requests;
//     }
//   };

//   const requestColumns = [
//     {
//       title: 'Request ID',
//       dataIndex: '_id',
//       key: '_id',
//       render: (id) => (
//         <Tag color="blue">
//           REQ-{id.toString().slice(-6).toUpperCase()}
//         </Tag>
//       ),
//       width: 120
//     },
//     {
//       title: 'Employee',
//       key: 'employee',
//       render: (_, record) => (
//         <div>
//           <Text strong>{record.employee?.fullName || 'N/A'}</Text>
//           <br />
//           <Text type="secondary" style={{ fontSize: '12px' }}>
//             {record.employee?.position || 'N/A'}
//           </Text>
//           <br />
//           <Tag color="blue" size="small">{record.employee?.department || 'N/A'}</Tag>
//         </div>
//       ),
//       width: 180
//     },
//     {
//       title: 'Request Details',
//       key: 'requestDetails',
//       render: (_, record) => (
//         <div>
//           <Text strong style={{ color: '#1890ff' }}>
//             XAF {Number(record.amountRequested || 0).toLocaleString()}
//           </Text>
//           <br />
//           <Text type="secondary" style={{ fontSize: '12px' }}>
//             Type: {record.requestType?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'N/A'}
//           </Text>
//           <br />
//           <Tooltip title={record.purpose}>
//             <Text ellipsis style={{ maxWidth: 200, fontSize: '11px', color: '#666' }}>
//               {record.purpose && record.purpose.length > 40 ? 
//                 `${record.purpose.substring(0, 40)}...` : 
//                 record.purpose || 'No purpose specified'
//               }
//             </Text>
//           </Tooltip>
//         </div>
//       ),
//       width: 200
//     },
//     {
//       title: 'Priority & Dates',
//       key: 'priorityDate',
//       render: (_, record) => (
//         <div>
//           {getUrgencyTag(record.urgency)}
//           <br />
//           <Text type="secondary" style={{ fontSize: '11px' }}>
//             <CalendarOutlined /> Expected: {record.requiredDate ? new Date(record.requiredDate).toLocaleDateString('en-GB') : 'N/A'}
//           </Text>
//           <br />
//           <Text type="secondary" style={{ fontSize: '11px' }}>
//             Submitted: {record.createdAt ? new Date(record.createdAt).toLocaleDateString('en-GB') : 'N/A'}
//           </Text>
//         </div>
//       ),
//       sorter: (a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0),
//       width: 140
//     },
//     {
//       title: 'Disbursement Status',
//       key: 'disbursementStatus',
//       render: (_, record) => {
//         const amountApproved = record.amountApproved || record.amountRequested || 0;
//         const totalDisbursed = record.totalDisbursed || 0;
//         const remainingBalance = record.remainingBalance || 0;
//         const progress = record.disbursementProgress || 0;

//         if (record.status === 'approved') {
//           return (
//             <Tag color="orange" size="small">
//               <ExclamationCircleOutlined /> Ready for Disbursement
//             </Tag>
//           );
//         }

//         if (['partially_disbursed', 'fully_disbursed'].includes(record.status)) {
//           return (
//             <div>
//               <Progress 
//                 percent={progress} 
//                 size="small" 
//                 status={progress === 100 ? 'success' : 'active'}
//               />
//               <Text style={{ fontSize: '11px' }}>
//                 {totalDisbursed.toLocaleString()} / {amountApproved.toLocaleString()}
//               </Text>
//               <br />
//               <Text type="secondary" style={{ fontSize: '10px' }}>
//                 {record.disbursements?.length || 0} payment(s)
//               </Text>
//             </div>
//           );
//         }

//         return <Text type="secondary" style={{ fontSize: '11px' }}>Not disbursed</Text>;
//       },
//       width: 160
//     },
//     {
//       title: 'Status',
//       dataIndex: 'status',
//       key: 'status',
//       render: (status) => getStatusTag(status),
//       width: 200
//     },
//     {
//       title: 'Actions',
//       key: 'actions',
//       render: (_, record) => (
//         <Space direction="vertical" size="small">
//           <Button 
//             type="link" 
//             icon={<EyeOutlined />}
//             onClick={() => navigate(`/finance/cash-request/${record._id}`)}
//             size="small"
//           >
//             View Details
//           </Button>
//           {record.status === 'pending_finance' && (
//             <Button 
//               type="primary"
//               size="small"
//               icon={<CheckCircleOutlined />}
//               onClick={() => navigate(`/finance/cash-request/${record._id}`)}
//             >
//               Process Approval
//             </Button>
//           )}
//           {['approved', 'partially_disbursed'].includes(record.status) && (
//             <Button 
//               type="default"
//               size="small"
//               icon={<SendOutlined />}
//               onClick={() => handleDisburse(record._id)}
//               style={{ color: '#52c41a', borderColor: '#52c41a' }}
//             >
//               Disburse
//             </Button>
//           )}
//         </Space>
//       ),
//       width: 150
//     }
//   ];

//   const justificationColumns = [
//     {
//       title: 'Request ID',
//       dataIndex: '_id',
//       key: '_id',
//       width: 140,
//       render: (id) => <Tag color="blue">REQ-{id.toString().slice(-6).toUpperCase()}</Tag>
//     },
//     {
//       title: 'Employee',
//       key: 'employee',
//       render: (_, record) => (
//         <div>
//           <Text strong>{record.employee?.fullName || 'N/A'}</Text>
//           <br />
//           <Tag color="blue" size="small">
//             {record.employee?.department || 'N/A'}
//           </Tag>
//         </div>
//       ),
//       width: 180
//     },
//     {
//       title: 'Financial Summary',
//       key: 'financial',
//       render: (_, record) => {
//         const disbursed = record.disbursementDetails?.amount || record.totalDisbursed || 0;
//         const spent = record.justification?.amountSpent || 0;
//         const returned = record.justification?.balanceReturned || 0;
//         const isBalanced = Math.abs((spent + returned) - disbursed) < 0.01;

//         return (
//           <div>
//             <Text type="secondary" style={{ fontSize: '11px' }}>
//               Disbursed: XAF {disbursed.toLocaleString()}
//             </Text>
//             <br />
//             <Text type="secondary" style={{ fontSize: '11px' }}>
//               Spent: XAF {spent.toLocaleString()}
//             </Text>
//             <br />
//             <Text type="secondary" style={{ fontSize: '11px' }}>
//               Returned: XAF {returned.toLocaleString()}
//             </Text>
//             <br />
//             {!isBalanced && (
//               <Tag color="warning" size="small">Unbalanced</Tag>
//             )}
//           </div>
//         );
//       },
//       width: 180
//     },
//     {
//       title: 'Submitted Date',
//       key: 'date',
//       render: (_, record) => (
//         <Text type="secondary">
//           {record.justification?.justificationDate 
//             ? new Date(record.justification.justificationDate).toLocaleDateString('en-GB')
//             : 'N/A'
//           }
//         </Text>
//       ),
//       width: 120
//     },
//     {
//       title: 'Approval Progress',
//       key: 'progress',
//       render: (_, record) => {
//         if (!record.justificationApprovalChain) return <Text type="secondary">No chain</Text>;
        
//         const currentLevel = extractJustificationLevel(record.status);
//         const totalLevels = record.justificationApprovalChain.length;
//         const approvedCount = record.justificationApprovalChain.filter(s => s.status === 'approved').length;
        
//         return (
//           <div>
//             <Progress 
//               percent={Math.round((approvedCount / totalLevels) * 100)} 
//               size="small"
//               status={record.status === 'completed' ? 'success' : 'active'}
//               showInfo={false}
//             />
//             <Text style={{ fontSize: '11px' }}>
//               Level {currentLevel || approvedCount + 1}/{totalLevels}
//             </Text>
//           </div>
//         );
//       },
//       width: 120
//     },
//     {
//       title: 'Status',
//       key: 'justificationStatus',
//       render: (_, record) => (
//         <div>
//           {getStatusTag(record.status)}
//           {canUserApproveJustification(record) && (
//             <div style={{ marginTop: 4 }}>
//               <Tag color="gold" size="small">Your Turn</Tag>
//             </div>
//           )}
//         </div>
//       ),
//       width: 200
//     },
//     {
//       title: 'Documents',
//       key: 'documents',
//       render: (_, record) => (
//         <Badge 
//           count={record.justification?.documents?.length || 0} 
//           showZero
//           style={{ backgroundColor: '#52c41a' }}
//         >
//           <FileTextOutlined style={{ fontSize: '16px' }} />
//         </Badge>
//       ),
//       width: 100
//     },
//     {
//       title: 'Action',
//       key: 'action',
//       width: 140,
//       render: (_, record) => (
//         <Space size="small">
//           <Button
//             size="small"
//             icon={<EyeOutlined />}
//             onClick={() => handleReviewJustification(record._id)}
//           >
//             View
//           </Button>
//           {canUserApproveJustification(record) && (
//             <Button
//               size="small"
//               type="primary"
//               icon={<AuditOutlined />}
//               onClick={() => handleReviewJustification(record._id)}
//             >
//               Review
//             </Button>
//           )}
//         </Space>
//       )
//     }
//   ];

//   const pendingForMe = requests.filter(req => req.teamRequestMetadata?.userHasPendingApproval).length;
//   const readyForDisbursement = stats.approved + stats.partiallyDisbursed;

//   if (loading && requests.length === 0 && justifications.length === 0) {
//     return (
//       <div style={{ padding: '24px', textAlign: 'center' }}>
//         <Spin size="large" />
//         <div style={{ marginTop: '16px' }}>Loading finance cash approvals...</div>
//       </div>
//     );
//   }

//   return (
//     <div style={{ padding: '24px' }}>
//       {/* Stats Cards */}
//       <Row gutter={16} style={{ marginBottom: '24px' }}>
//         <Col span={4}>
//           <Card size="small">
//             <Statistic
//               title="Your Approvals"
//               value={pendingForMe}
//               prefix={<ClockCircleOutlined />}
//               valueStyle={{ color: '#faad14' }}
//             />
//           </Card>
//         </Col>
//         <Col span={4}>
//           <Card size="small">
//             <Statistic
//               title="Ready to Disburse"
//               value={stats.approved}
//               prefix={<CheckCircleOutlined />}
//               valueStyle={{ color: '#52c41a' }}
//             />
//           </Card>
//         </Col>
//         <Col span={4}>
//           <Card size="small">
//             <Statistic
//               title="Partial Disbursed"
//               value={stats.partiallyDisbursed}
//               prefix={<SyncOutlined />}
//               valueStyle={{ color: '#1890ff' }}
//             />
//           </Card>
//         </Col>
//         <Col span={4}>
//           <Card size="small">
//             <Statistic
//               title="Fully Disbursed"
//               value={stats.fullyDisbursed}
//               prefix={<DollarOutlined />}
//               valueStyle={{ color: '#13c2c2' }}
//             />
//           </Card>
//         </Col>
//         <Col span={4}>
//           <Card size="small">
//             <Statistic
//               title="Justifications"
//               value={stats.justificationsPending}
//               prefix={<FileTextOutlined />}
//               valueStyle={{ color: '#722ed1' }}
//             />
//           </Card>
//         </Col>
//         <Col span={4}>
//           <Card size="small">
//             <Statistic
//               title="Completed"
//               value={stats.completed}
//               prefix={<CheckCircleOutlined />}
//               valueStyle={{ color: '#52c41a' }}
//             />
//           </Card>
//         </Col>
//       </Row>

//       {/* Main Content */}
//       <Card>
//         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
//           <Title level={2} style={{ margin: 0 }}>
//             <BankOutlined /> Finance Cash Approvals
//           </Title>
//           <Space>
//             <Button 
//               icon={<ReloadOutlined />}
//               onClick={handleRefresh}
//               loading={loading}
//             >
//               Refresh
//             </Button>
//             <Button 
//               type="primary"
//               icon={<DownloadOutlined />}
//               onClick={() => setExportModalVisible(true)}
//             >
//               Export Data
//             </Button>
//           </Space>
//         </div>

//         {(pendingForMe > 0 || readyForDisbursement > 0 || stats.justificationsPending > 0) && (
//           <Alert
//             message={
//               <div>
//                 {pendingForMe > 0 && (
//                   <div>🔔 You have {pendingForMe} cash request(s) waiting for your approval</div>
//                 )}
//                 {readyForDisbursement > 0 && (
//                   <div>💰 {readyForDisbursement} request(s) are ready for disbursement</div>
//                 )}
//                 {stats.justificationsPending > 0 && (
//                   <div>📄 {stats.justificationsPending} justification(s) require your review</div>
//                 )}
//               </div>
//             }
//             type="warning"
//             showIcon
//             style={{ marginBottom: '16px' }}
//           />
//         )}

//         <Tabs activeKey={activeTab} onChange={setActiveTab}>
//           <TabPane 
//             tab={
//               <Badge count={stats.pendingFinance} offset={[10, 0]} color="#faad14">
//                 <span>
//                   <ExclamationCircleOutlined />
//                   Pending Approval ({stats.pendingFinance})
//                 </span>
//               </Badge>
//             } 
//             key="pending"
//           >
//             <Table 
//               columns={requestColumns} 
//               dataSource={getFilteredRequests()} 
//               loading={loading}
//               rowKey="_id"
//               pagination={{ 
//                 pageSize: 10,
//                 showSizeChanger: true,
//                 showQuickJumper: true,
//                 showTotal: (total, range) => 
//                   `${range[0]}-${range[1]} of ${total} requests`
//               }}
//               scroll={{ x: 'max-content' }}
//               rowClassName={(record) => {
//                 if (record.status === 'pending_finance') {
//                   return 'highlight-row-urgent'; 
//                 }
//                 return '';
//               }}
//             />
//           </TabPane>

//           <TabPane
//             tab={
//               <Badge count={stats.justificationsPending} offset={[10, 0]} color="#1890ff">
//                 <span>
//                   <FileTextOutlined />
//                   Justifications ({stats.justificationsPending})
//                 </span>
//               </Badge>
//             }
//             key="justifications"
//           >
//             {activeTab === 'justifications' && (
//               <Table
//                 columns={justificationColumns}
//                 dataSource={justifications}
//                 loading={loading}
//                 rowKey="_id"
//                 pagination={{ 
//                   pageSize: 10, 
//                   showSizeChanger: true,
//                   showQuickJumper: true,
//                   showTotal: (total, range) => 
//                     `${range[0]}-${range[1]} of ${total} justifications`
//                 }}
//                 scroll={{ x: 1200 }}
//                 size="small"
//                 rowClassName={(record) => {
//                   let className = 'cash-request-row';
//                   if (canUserApproveJustification(record)) {
//                     className += ' pending-approval-row';
//                   }
//                   return className;
//                 }}
//               />
//             )}
//           </TabPane>

//           <TabPane 
//             tab={
//               <Badge count={stats.approved} offset={[10, 0]} color="#52c41a">
//                 <span>
//                   <CheckCircleOutlined />
//                   Ready to Disburse ({stats.approved})
//                 </span>
//               </Badge>
//             } 
//             key="approved"
//           >
//             <Table 
//               columns={requestColumns} 
//               dataSource={getFilteredRequests()} 
//               loading={loading}
//               rowKey="_id"
//               pagination={{ 
//                 pageSize: 10,
//                 showSizeChanger: true,
//                 showQuickJumper: true,
//                 showTotal: (total, range) => 
//                   `${range[0]}-${range[1]} of ${total} requests`
//               }}
//               scroll={{ x: 'max-content' }}
//               rowClassName={() => 'highlight-row-ready'}
//             />
//           </TabPane>

//           <TabPane 
//             tab={
//               <Badge count={stats.partiallyDisbursed} offset={[10, 0]} color="#1890ff">
//                 <span>
//                   <SyncOutlined />
//                   Partially Disbursed ({stats.partiallyDisbursed})
//                 </span>
//               </Badge>
//             } 
//             key="partially_disbursed"
//           >
//             <Table 
//               columns={requestColumns} 
//               dataSource={getFilteredRequests()} 
//               loading={loading}
//               rowKey="_id"
//               pagination={{ 
//                 pageSize: 10,
//                 showSizeChanger: true,
//                 showQuickJumper: true,
//                 showTotal: (total, range) => 
//                   `${range[0]}-${range[1]} of ${total} requests`
//               }}
//               scroll={{ x: 'max-content' }}
//               rowClassName={() => 'highlight-row-partial'}
//             />
//           </TabPane>

//           <TabPane 
//             tab={
//               <Badge count={stats.fullyDisbursed} offset={[10, 0]} color="#13c2c2">
//                 <span>
//                   <DollarOutlined />
//                   Fully Disbursed ({stats.fullyDisbursed})
//                 </span>
//               </Badge>
//             } 
//             key="fully_disbursed"
//           >
//             <Table 
//               columns={requestColumns} 
//               dataSource={getFilteredRequests()} 
//               loading={loading}
//               rowKey="_id"
//               pagination={{ 
//                 pageSize: 10,
//                 showSizeChanger: true,
//                 showQuickJumper: true,
//                 showTotal: (total, range) => 
//                   `${range[0]}-${range[1]} of ${total} requests`
//               }}
//               scroll={{ x: 'max-content' }}
//             />
//           </TabPane>

//           <TabPane 
//             tab={
//               <span>
//                 <CheckCircleOutlined />
//                 Completed ({stats.completed})
//               </span>
//             } 
//             key="completed"
//           >
//             <Table 
//               columns={requestColumns} 
//               dataSource={getFilteredRequests()} 
//               loading={loading}
//               rowKey="_id"
//               pagination={{ 
//                 pageSize: 10,
//                 showSizeChanger: true,
//                 showQuickJumper: true,
//                 showTotal: (total, range) => 
//                   `${range[0]}-${range[1]} of ${total} requests`
//               }}
//               scroll={{ x: 'max-content' }}
//             />
//           </TabPane>

//           <TabPane 
//             tab={
//               <span>
//                 <CloseCircleOutlined />
//                 Rejected ({stats.rejected})
//               </span>
//             } 
//             key="rejected"
//           >
//             <Table 
//               columns={requestColumns} 
//               dataSource={getFilteredRequests()} 
//               loading={loading}
//               rowKey="_id"
//               pagination={{ 
//                 pageSize: 10,
//                 showSizeChanger: true,
//                 showQuickJumper: true,
//                 showTotal: (total, range) => 
//                   `${range[0]}-${range[1]} of ${total} requests`
//               }}
//               scroll={{ x: 'max-content' }}
//             />
//           </TabPane>
//         </Tabs>
//       </Card>

//       {/* Export Modal */}
//       <CashRequestExportModal
//         visible={exportModalVisible}
//         onCancel={() => setExportModalVisible(false)}
//       />

//       <style>{`
//         .highlight-row-urgent {
//           background-color: #fff7e6 !important;
//           border-left: 4px solid #faad14 !important;
//         }
//         .highlight-row-urgent:hover {
//           background-color: #fff1d6 !important;
//         }
//         .highlight-row-ready {
//           background-color: #f6ffed !important;
//           border-left: 4px solid #52c41a !important;
//         }
//         .highlight-row-ready:hover {
//           background-color: #d9f7be !important;
//         }
//         .highlight-row-partial {
//           background-color: #e6f7ff !important;
//           border-left: 4px solid #1890ff !important;
//         }
//         .highlight-row-partial:hover {
//           background-color: #bae7ff !important;
//         }
//         .cash-request-row {
//           background-color: #fafafa;
//         }
//         .cash-request-row:hover {
//           background-color: #f0f0f0 !important;
//         }
//         .pending-approval-row {
//           border-left: 3px solid #faad14;
//           background-color: #fff7e6;
//         }
//         .pending-approval-row:hover {
//           background-color: #fff1d6 !important;
//         }
//       `}</style>
//     </div>
//   );
// };

// export default FinanceCashApprovals;








// import React, { useState, useEffect, useCallback } from 'react';
// import { useNavigate } from 'react-router-dom';
// import { useSelector } from 'react-redux';
// import {
//   Card,
//   Table,
//   Tag,
//   Space,
//   Typography,
//   Button,
//   Alert,
//   Spin,
//   message,
//   Badge,
//   Tooltip,
//   Tabs,
//   Progress,
//   Statistic,
//   Row,
//   Col
// } from 'antd';
// import {
//   CheckCircleOutlined,
//   CloseCircleOutlined,
//   ClockCircleOutlined,
//   DollarOutlined,
//   CalendarOutlined,
//   BankOutlined,
//   EyeOutlined,
//   ReloadOutlined,
//   ExclamationCircleOutlined,
//   SendOutlined,
//   FileTextOutlined,
//   AuditOutlined
// } from '@ant-design/icons';
// import { cashRequestAPI } from '../../services/cashRequestAPI';

// const { Title, Text } = Typography;
// const { TabPane } = Tabs;

// const FinanceCashApprovals = () => {
//   const navigate = useNavigate();
//   const { user } = useSelector((state) => state.auth);
  
//   const [requests, setRequests] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [activeTab, setActiveTab] = useState('pending');
//   const [stats, setStats] = useState({
//     pendingFinance: 0,
//     approved: 0,
//     disbursed: 0,
//     completed: 0,
//     rejected: 0,
//     justificationsPending: 0
//   });
//   const [justifications, setJustifications] = useState([]);

//   // ============ HELPER FUNCTIONS ============

//   // Check if status is a justification status
//   const isJustificationStatus = (status) => {
//     return status && (
//       status.includes('justification_pending') || 
//       status.includes('justification_rejected') ||
//       status === 'completed'
//     );
//   };

//   // Extract level number from justification status
//   const extractJustificationLevel = (status) => {
//     if (!status || !status.includes('justification_')) return null;
    
//     const levelMap = {
//       'justification_pending_supervisor': 1,
//       'justification_pending_departmental_head': 2,
//       'justification_pending_head_of_business': 3,
//       'justification_pending_finance': 4,
//       'justification_rejected_supervisor': 1,
//       'justification_rejected_departmental_head': 2,
//       'justification_rejected_head_of_business': 3,
//       'justification_rejected_finance': 4
//     };
    
//     return levelMap[status] || null;
//   };

//   // Get human-readable justification status
//   const getJustificationStatusInfo = (status, level = null) => {
//     const statusLevel = level || extractJustificationLevel(status);
    
//     const levelNames = {
//       1: 'Supervisor',
//       2: 'Departmental Head',
//       3: 'Head of Business',
//       4: 'Finance'
//     };
    
//     if (status === 'completed') {
//       return {
//         text: 'Completed',
//         color: 'cyan',
//         icon: <CheckCircleOutlined />,
//         description: 'All approvals completed'
//       };
//     }
    
//     if (status?.includes('justification_rejected')) {
//       return {
//         text: `Revision Required (${levelNames[statusLevel]})`,
//         color: 'gold',
//         icon: <ExclamationCircleOutlined />,
//         description: `Rejected at Level ${statusLevel} - ${levelNames[statusLevel]}`
//       };
//     }
    
//     if (status?.includes('justification_pending')) {
//       return {
//         text: `Level ${statusLevel}/4: Pending ${levelNames[statusLevel]}`,
//         color: 'orange',
//         icon: <ClockCircleOutlined />,
//         description: `Awaiting approval from ${levelNames[statusLevel]}`
//       };
//     }
    
//     return {
//       text: status?.replace(/_/g, ' ') || 'Unknown',
//       color: 'default',
//       icon: null,
//       description: ''
//     };
//   };

//   // Check if user can approve justification
//   const canUserApproveJustification = useCallback((request) => {
//     if (!request.justificationApprovalChain || !user?.email) {
//       return false;
//     }

//     // CRITICAL: Only check if status is actually a justification status
//     if (!isJustificationStatus(request.status)) {
//       return false;
//     }

//     // Get current status level from the status string
//     const currentStatusLevel = extractJustificationLevel(request.status);
    
//     if (!currentStatusLevel) {
//       return false;
//     }

//     // Find ALL pending steps for this user at ANY level (to support multi-role users)
//     const userPendingSteps = request.justificationApprovalChain.filter(step => {
//       const emailMatch = step.approver?.email?.toLowerCase() === user.email.toLowerCase();
//       const isPending = step.status === 'pending';
      
//       return emailMatch && isPending;
//     });

//     if (userPendingSteps.length === 0) {
//       return false;
//     }

//     // Check if ANY of the user's pending steps match the current status level
//     const canApprove = userPendingSteps.some(step => step.level === currentStatusLevel);

//     return canApprove;
//   }, [user?.email]);

//   // ============ DATA FETCHING ============

//   const fetchAllData = useCallback(async () => {
//     try {
//       setLoading(true);
//       console.log('Fetching all cash requests and justifications using supervisor endpoint...');

//       // Use the supervisor endpoint which has the most complete and current data
//       const response = await cashRequestAPI.getSupervisorRequests();

//       if (response && response.success) {
//         const allData = response.data || [];
        
//         console.log('Total records fetched:', allData.length);
        
//         // Separate cash requests from justifications
//         const cashRequestsOnly = allData.filter(req => !isJustificationStatus(req.status));
//         const justificationsOnly = allData.filter(req => isJustificationStatus(req.status));
        
//         console.log('Cash requests:', cashRequestsOnly.length);
//         console.log('Justifications:', justificationsOnly.length);
        
//         setRequests(cashRequestsOnly);
//         setJustifications(justificationsOnly);

//         // Calculate stats
//         const pendingJustifications = justificationsOnly.filter(j => 
//           canUserApproveJustification(j)
//         ).length;

//         console.log('Pending justifications for user:', pendingJustifications);

//         const calculatedStats = {
//           pendingFinance: cashRequestsOnly.filter(req => req.teamRequestMetadata?.userHasPendingApproval).length,
//           approved: cashRequestsOnly.filter(req => req.teamRequestMetadata?.userHasApproved).length,
//           disbursed: cashRequestsOnly.filter(req => req.status === 'disbursed').length,
//           completed: allData.filter(req => req.status === 'completed').length,
//           rejected: cashRequestsOnly.filter(req => req.status === 'denied').length,
//           justificationsPending: pendingJustifications
//         };

//         console.log('Calculated stats:', calculatedStats);
//         setStats(calculatedStats);
//       } else {
//         throw new Error('Failed to fetch data');
//       }
//     } catch (error) {
//       console.error('Error fetching data:', error);
//       message.error(error.response?.data?.message || 'Failed to load finance approvals');
//       setRequests([]);
//       setJustifications([]);
//     } finally {
//       setLoading(false);
//     }
//   }, [canUserApproveJustification]);

//   useEffect(() => {
//     if (user?.email) {
//       fetchAllData();
//     }
//   }, [fetchAllData, user?.email]);

//   const handleRefresh = async () => {
//     await fetchAllData();
//     message.success('Data refreshed successfully');
//   };

//   const handleDisburse = async (requestId) => {
//     try {
//       console.log('Disbursing cash request:', requestId);
//       navigate(`/finance/cash-request/${requestId}`);
//     } catch (error) {
//       console.error('Error disbursing request:', error);
//       message.error('Failed to disburse cash request');
//     }
//   };

//   const handleReviewJustification = (requestId) => {
//     navigate(`/finance/cash-request/${requestId}`);
//   };

//   // Secure file download handler
//   const handleDownloadAttachment = async (requestId, attachment) => {
//     try {
//       if (!attachment.fileName && !attachment.name) {
//         message.error('No filename available for this attachment');
//         return;
//       }

//       const fileName = attachment.fileName || attachment.name;
//       const blob = await cashRequestAPI.downloadAttachment(requestId, fileName);
      
//       const url = window.URL.createObjectURL(blob);
//       const link = document.createElement('a');
//       link.href = url;
//       link.download = fileName;
      
//       document.body.appendChild(link);
//       link.click();
//       document.body.removeChild(link);
//       window.URL.revokeObjectURL(url);
      
//       message.success(`Downloaded ${fileName}`);
//     } catch (error) {
//       console.error('Error downloading attachment:', error);
//       message.error('Failed to download attachment');
//     }
//   };

//   const getStatusTag = (status) => {
//     // Handle justification statuses specially
//     if (isJustificationStatus(status)) {
//       const statusInfo = getJustificationStatusInfo(status);
//       return (
//         <Tooltip title={statusInfo.description}>
//           <Tag color={statusInfo.color} icon={statusInfo.icon}>
//             {statusInfo.text}
//           </Tag>
//         </Tooltip>
//       );
//     }

//     const statusMap = {
//       'pending_finance': { 
//         color: 'orange', 
//         icon: <ClockCircleOutlined />, 
//         text: 'Your Approval Required' 
//       },
//       'approved': { 
//         color: 'green', 
//         icon: <CheckCircleOutlined />, 
//         text: 'Approved - Ready for Disbursement' 
//       },
//       'disbursed': { 
//         color: 'cyan', 
//         icon: <DollarOutlined />, 
//         text: 'Disbursed - Awaiting Justification' 
//       },
//       'completed': { 
//         color: 'green', 
//         icon: <CheckCircleOutlined />, 
//         text: 'Completed' 
//       },
//       'denied': { 
//         color: 'red', 
//         icon: <CloseCircleOutlined />, 
//         text: 'Rejected' 
//       }
//     };

//     const statusInfo = statusMap[status] || { 
//       color: 'default', 
//       text: status?.replace('_', ' ') || 'Unknown' 
//     };

//     return (
//       <Tag color={statusInfo.color} icon={statusInfo.icon}>
//         {statusInfo.text}
//       </Tag>
//     );
//   };

//   const getUrgencyTag = (urgency) => {
//     const urgencyMap = {
//       'high': { color: 'red', text: 'High' },
//       'medium': { color: 'orange', text: 'Medium' },
//       'low': { color: 'green', text: 'Low' }
//     };

//     const urgencyInfo = urgencyMap[urgency] || { color: 'default', text: urgency };

//     return (
//       <Tag color={urgencyInfo.color}>
//         {urgencyInfo.text}
//       </Tag>
//     );
//   };

//   const getFilteredRequests = () => {
//     switch (activeTab) {
//       case 'pending':
//         return requests.filter(req => {
//           if (req.teamRequestMetadata && typeof req.teamRequestMetadata.userHasPendingApproval !== 'undefined') {
//             return req.teamRequestMetadata.userHasPendingApproval;
//           }
//           return req.status === 'pending_finance';
//         });
//       case 'approved':
//         return requests.filter(req => {
//           if (req.teamRequestMetadata && typeof req.teamRequestMetadata.userHasApproved !== 'undefined') {
//             return req.teamRequestMetadata.userHasApproved || req.status === 'approved';
//           }
//           return req.status === 'approved';
//         });
//       case 'disbursed':
//         return requests.filter(req => req.status === 'disbursed');
//       case 'completed':
//         return requests.filter(req => req.status === 'completed');
//       case 'rejected':
//         return requests.filter(req => req.status === 'denied');
//       default:
//         return requests;
//     }
//   };

//   const requestColumns = [
//     {
//       title: 'Employee',
//       key: 'employee',
//       render: (_, record) => (
//         <div>
//           <Text strong>{record.employee?.fullName || 'N/A'}</Text>
//           <br />
//           <Text type="secondary" style={{ fontSize: '12px' }}>
//             {record.employee?.position || 'N/A'}
//           </Text>
//           <br />
//           <Tag color="blue" size="small">{record.employee?.department || 'N/A'}</Tag>
//         </div>
//       ),
//       width: 180
//     },
//     {
//       title: 'Request Details',
//       key: 'requestDetails',
//       render: (_, record) => (
//         <div>
//           <Text strong style={{ color: '#1890ff' }}>
//             XAF {Number(record.amountRequested || 0).toLocaleString()}
//           </Text>
//           <br />
//           <Text type="secondary" style={{ fontSize: '12px' }}>
//             Type: {record.requestType?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'N/A'}
//           </Text>
//           <br />
//           <Tooltip title={record.purpose}>
//             <Text ellipsis style={{ maxWidth: 200, fontSize: '11px', color: '#666' }}>
//               {record.purpose && record.purpose.length > 40 ? 
//                 `${record.purpose.substring(0, 40)}...` : 
//                 record.purpose || 'No purpose specified'
//               }
//             </Text>
//           </Tooltip>
//         </div>
//       ),
//       width: 200
//     },
//     {
//       title: 'Priority & Dates',
//       key: 'priorityDate',
//       render: (_, record) => (
//         <div>
//           {getUrgencyTag(record.urgency)}
//           <br />
//           <Text type="secondary" style={{ fontSize: '11px' }}>
//             <CalendarOutlined /> Expected: {record.requiredDate ? new Date(record.requiredDate).toLocaleDateString('en-GB') : 'N/A'}
//           </Text>
//           <br />
//           <Text type="secondary" style={{ fontSize: '11px' }}>
//             Submitted: {record.createdAt ? new Date(record.createdAt).toLocaleDateString('en-GB') : 'N/A'}
//           </Text>
//         </div>
//       ),
//       sorter: (a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0),
//       width: 140
//     },
//     {
//       title: 'Supervisor Approval',
//       key: 'supervisorApproval',
//       render: (_, record) => {
//         const supervisorApproval = record.approvalChain?.find(step => step.level === 1 && step.status === 'approved');
        
//         return (
//           <div>
//             {supervisorApproval ? (
//               <>
//                 <Tag color="green" size="small">
//                   <CheckCircleOutlined /> Approved
//                 </Tag>
//                 <br />
//                 <Text type="secondary" style={{ fontSize: '11px' }}>
//                   By: {supervisorApproval.approver?.name || 'Supervisor'}
//                 </Text>
//                 <br />
//                 <Text type="secondary" style={{ fontSize: '11px' }}>
//                   {supervisorApproval.actionDate ? new Date(supervisorApproval.actionDate).toLocaleDateString('en-GB') : 'N/A'}
//                 </Text>
//                 {supervisorApproval.comments && (
//                   <Tooltip title={supervisorApproval.comments}>
//                     <br />
//                     <Text style={{ fontSize: '10px', color: '#666' }}>
//                       💬 View comments
//                     </Text>
//                   </Tooltip>
//                 )}
//               </>
//             ) : (
//               <Tag color="orange" size="small">
//                 <ClockCircleOutlined /> Pending
//               </Tag>
//             )}
//           </div>
//         );
//       },
//       width: 140
//     },
//     {
//       title: 'Status',
//       dataIndex: 'status',
//       key: 'status',
//       render: (status) => getStatusTag(status),
//       width: 180
//     },
//     {
//       title: 'Disbursement Info',
//       key: 'disbursement',
//       render: (_, record) => (
//         <div>
//           {record.disbursementDetails ? (
//             <>
//               <Tag color="cyan" size="small">
//                 <DollarOutlined /> Disbursed
//               </Tag>
//               <br />
//               <Text type="secondary" style={{ fontSize: '11px' }}>
//                 Amount: XAF {Number(record.disbursementDetails.amount || 0).toLocaleString()}
//               </Text>
//               <br />
//               <Text type="secondary" style={{ fontSize: '11px' }}>
//                 Date: {record.disbursementDetails.date ? new Date(record.disbursementDetails.date).toLocaleDateString('en-GB') : 'N/A'}
//               </Text>
//             </>
//           ) : record.status === 'approved' ? (
//             <Tag color="orange" size="small">
//               <ExclamationCircleOutlined /> Ready for Disbursement
//             </Tag>
//           ) : (
//             <Text type="secondary" style={{ fontSize: '11px' }}>
//               Not disbursed
//             </Text>
//           )}
//         </div>
//       ),
//       width: 160
//     },
//     {
//       title: 'Attachments',
//       key: 'attachments',
//       render: (_, record) => (
//         <div>
//           {record.attachments && record.attachments.length > 0 ? (
//             <Space direction="vertical" size="small">
//               {record.attachments.slice(0, 2).map((attachment, index) => (
//                 <Button 
//                   key={index}
//                   size="small" 
//                   type="link"
//                   onClick={() => handleDownloadAttachment(record._id, attachment)}
//                   style={{ padding: 0, fontSize: '11px' }}
//                 >
//                   📎 {(attachment.fileName || attachment.name).length > 15 ? 
//                     `${(attachment.fileName || attachment.name).substring(0, 15)}...` : 
//                     (attachment.fileName || attachment.name)
//                   }
//                 </Button>
//               ))}
//               {record.attachments.length > 2 && (
//                 <Text type="secondary" style={{ fontSize: '10px' }}>
//                   +{record.attachments.length - 2} more
//                 </Text>
//               )}
//             </Space>
//           ) : (
//             <Text type="secondary" style={{ fontSize: '11px' }}>No attachments</Text>
//           )}
//         </div>
//       ),
//       width: 120
//     },
//     {
//       title: 'Actions',
//       key: 'actions',
//       render: (_, record) => (
//         <Space direction="vertical" size="small">
//           <Button 
//             type="link" 
//             icon={<EyeOutlined />}
//             onClick={() => navigate(`/finance/cash-request/${record._id}`)}
//             size="small"
//           >
//             View Details
//           </Button>
//           {record.status === 'pending_finance' && (
//             <Button 
//               type="primary"
//               size="small"
//               icon={<CheckCircleOutlined />}
//               onClick={() => navigate(`/finance/cash-request/${record._id}`)}
//             >
//               Process Approval
//             </Button>
//           )}
//           {record.status === 'approved' && (
//             <Button 
//               type="default"
//               size="small"
//               icon={<SendOutlined />}
//               onClick={() => handleDisburse(record._id)}
//               style={{ color: '#52c41a', borderColor: '#52c41a' }}
//             >
//               Disburse
//             </Button>
//           )}
//         </Space>
//       ),
//       width: 130
//     }
//   ];

//   const justificationColumns = [
//     {
//       title: 'Request ID',
//       dataIndex: '_id',
//       key: '_id',
//       width: 140,
//       render: (id) => <Tag color="blue">REQ-{id.toString().slice(-6).toUpperCase()}</Tag>
//     },
//     {
//       title: 'Employee',
//       key: 'employee',
//       render: (_, record) => (
//         <div>
//           <Text strong>{record.employee?.fullName || 'N/A'}</Text>
//           <br />
//           <Tag color="blue" size="small">
//             {record.employee?.department || 'N/A'}
//           </Tag>
//         </div>
//       ),
//       width: 180
//     },
//     {
//       title: 'Financial Summary',
//       key: 'financial',
//       render: (_, record) => {
//         const disbursed = record.disbursementDetails?.amount || 0;
//         const spent = record.justification?.amountSpent || 0;
//         const returned = record.justification?.balanceReturned || 0;
//         const isBalanced = Math.abs((spent + returned) - disbursed) < 0.01;

//         return (
//           <div>
//             <Text type="secondary" style={{ fontSize: '11px' }}>
//               Disbursed: XAF {disbursed.toLocaleString()}
//             </Text>
//             <br />
//             <Text type="secondary" style={{ fontSize: '11px' }}>
//               Spent: XAF {spent.toLocaleString()}
//             </Text>
//             <br />
//             <Text type="secondary" style={{ fontSize: '11px' }}>
//               Returned: XAF {returned.toLocaleString()}
//             </Text>
//             <br />
//             {!isBalanced && (
//               <Tag color="warning" size="small">Unbalanced</Tag>
//             )}
//           </div>
//         );
//       },
//       width: 180
//     },
//     {
//       title: 'Submitted Date',
//       key: 'date',
//       render: (_, record) => (
//         <Text type="secondary">
//           {record.justification?.justificationDate 
//             ? new Date(record.justification.justificationDate).toLocaleDateString('en-GB')
//             : 'N/A'
//           }
//         </Text>
//       ),
//       width: 120
//     },
//     {
//       title: 'Approval Progress',
//       key: 'progress',
//       render: (_, record) => {
//         if (!record.justificationApprovalChain) return <Text type="secondary">No chain</Text>;
        
//         const currentLevel = extractJustificationLevel(record.status);
//         const totalLevels = record.justificationApprovalChain.length;
//         const approvedCount = record.justificationApprovalChain.filter(s => s.status === 'approved').length;
        
//         return (
//           <div>
//             <Progress 
//               percent={Math.round((approvedCount / totalLevels) * 100)} 
//               size="small"
//               status={record.status === 'completed' ? 'success' : 'active'}
//               showInfo={false}
//             />
//             <Text style={{ fontSize: '11px' }}>
//               Level {currentLevel || approvedCount + 1}/{totalLevels}
//             </Text>
//           </div>
//         );
//       },
//       width: 120
//     },
//     {
//       title: 'Status',
//       key: 'justificationStatus',
//       render: (_, record) => (
//         <div>
//           {getStatusTag(record.status)}
//           {canUserApproveJustification(record) && (
//             <div style={{ marginTop: 4 }}>
//               <Tag color="gold" size="small">Your Turn</Tag>
//             </div>
//           )}
//         </div>
//       ),
//       width: 200
//     },
//     {
//       title: 'Documents',
//       key: 'documents',
//       render: (_, record) => (
//         <Badge 
//           count={record.justification?.documents?.length || 0} 
//           showZero
//           style={{ backgroundColor: '#52c41a' }}
//         >
//           <FileTextOutlined style={{ fontSize: '16px' }} />
//         </Badge>
//       ),
//       width: 100
//     },
//     {
//       title: 'Action',
//       key: 'action',
//       width: 140,
//       render: (_, record) => (
//         <Space size="small">
//           <Button
//             size="small"
//             icon={<EyeOutlined />}
//             onClick={() => handleReviewJustification(record._id)}
//           >
//             View
//           </Button>
//           {canUserApproveJustification(record) && (
//             <Button
//               size="small"
//               type="primary"
//               icon={<AuditOutlined />}
//               onClick={() => handleReviewJustification(record._id)}
//             >
//               Review
//             </Button>
//           )}
//         </Space>
//       )
//     }
//   ];

//   const pendingForMe = requests.filter(req => req.teamRequestMetadata?.userHasPendingApproval).length;
//   const readyForDisbursement = requests.filter(req => req.status === 'approved').length;

//   if (loading && requests.length === 0 && justifications.length === 0) {
//     return (
//       <div style={{ padding: '24px', textAlign: 'center' }}>
//         <Spin size="large" />
//         <div style={{ marginTop: '16px' }}>Loading finance cash approvals...</div>
//       </div>
//     );
//   }

//   return (
//     <div style={{ padding: '24px' }}>
//       {/* Stats Cards */}
//       <Row gutter={16} style={{ marginBottom: '24px' }}>
//         <Col span={5}>
//           <Card size="small">
//             <Statistic
//               title="Your Approvals"
//               value={pendingForMe}
//               prefix={<ClockCircleOutlined />}
//               valueStyle={{ color: '#faad14' }}
//             />
//           </Card>
//         </Col>
//         <Col span={5}>
//           <Card size="small">
//             <Statistic
//               title="Ready to Disburse"
//               value={readyForDisbursement}
//               prefix={<CheckCircleOutlined />}
//               valueStyle={{ color: '#52c41a' }}
//             />
//           </Card>
//         </Col>
//         <Col span={4}>
//           <Card size="small">
//             <Statistic
//               title="Disbursed"
//               value={stats.disbursed || 0}
//               prefix={<DollarOutlined />}
//               valueStyle={{ color: '#1890ff' }}
//             />
//           </Card>
//         </Col>
//         <Col span={5}>
//           <Card size="small">
//             <Statistic
//               title="Pending Justifications"
//               value={stats.justificationsPending}
//               prefix={<FileTextOutlined />}
//               valueStyle={{ color: '#722ed1' }}
//             />
//           </Card>
//         </Col>
//         <Col span={5}>
//           <Card size="small">
//             <Statistic
//               title="Completed"
//               value={stats.completed || 0}
//               prefix={<CheckCircleOutlined />}
//               valueStyle={{ color: '#52c41a' }}
//             />
//           </Card>
//         </Col>
//       </Row>

//       {/* Main Content */}
//       <Card>
//         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
//           <Title level={2} style={{ margin: 0 }}>
//             <BankOutlined /> Finance Cash Approvals
//           </Title>
//           <Space>
//             <Button 
//               icon={<ReloadOutlined />}
//               onClick={handleRefresh}
//               loading={loading}
//             >
//               Refresh
//             </Button>
//           </Space>
//         </div>

//         {(pendingForMe > 0 || readyForDisbursement > 0 || stats.justificationsPending > 0) && (
//           <Alert
//             message={
//               <div>
//                 {pendingForMe > 0 && (
//                   <div>🔔 You have {pendingForMe} cash request(s) waiting for your approval</div>
//                 )}
//                 {readyForDisbursement > 0 && (
//                   <div>💰 {readyForDisbursement} request(s) are ready for disbursement</div>
//                 )}
//                 {stats.justificationsPending > 0 && (
//                   <div>📄 {stats.justificationsPending} justification(s) require your review</div>
//                 )}
//               </div>
//             }
//             type="warning"
//             showIcon
//             style={{ marginBottom: '16px' }}
//           />
//         )}

//         <Tabs activeKey={activeTab} onChange={setActiveTab}>
//           <TabPane 
//             tab={
//               <Badge count={stats.pendingFinance} offset={[10, 0]} color="#faad14">
//                 <span>
//                   <ExclamationCircleOutlined />
//                   Pending Approval ({stats.pendingFinance})
//                 </span>
//               </Badge>
//             } 
//             key="pending"
//           >
//             <Table 
//               columns={requestColumns} 
//               dataSource={getFilteredRequests()} 
//               loading={loading}
//               rowKey="_id"
//               pagination={{ 
//                 pageSize: 10,
//                 showSizeChanger: true,
//                 showQuickJumper: true,
//                 showTotal: (total, range) => 
//                   `${range[0]}-${range[1]} of ${total} requests`
//               }}
//               scroll={{ x: 'max-content' }}
//               rowClassName={(record) => {
//                 if (record.status === 'pending_finance') {
//                   return 'highlight-row-urgent'; 
//                 }
//                 return '';
//               }}
//             />
//           </TabPane>

//           <TabPane
//             tab={
//               <Badge count={stats.justificationsPending} offset={[10, 0]} color="#1890ff">
//                 <span>
//                   <FileTextOutlined />
//                   Justifications ({stats.justificationsPending})
//                 </span>
//               </Badge>
//             }
//             key="justifications"
//           >
//             {activeTab === 'justifications' && (
//               <Table
//                 columns={justificationColumns}
//                 dataSource={justifications}
//                 loading={loading}
//                 rowKey="_id"
//                 pagination={{ 
//                   pageSize: 10, 
//                   showSizeChanger: true,
//                   showQuickJumper: true,
//                   showTotal: (total, range) => 
//                     `${range[0]}-${range[1]} of ${total} justifications`
//                 }}
//                 scroll={{ x: 1200 }}
//                 size="small"
//                 rowClassName={(record) => {
//                   let className = 'cash-request-row';
//                   if (canUserApproveJustification(record)) {
//                     className += ' pending-approval-row';
//                   }
//                   return className;
//                 }}
//               />
//             )}
//           </TabPane>

//           <TabPane 
//             tab={
//               <Badge count={stats.approved} offset={[10, 0]} color="#52c41a">
//                 <span>
//                   <DollarOutlined />
//                   Ready to Disburse ({stats.approved})
//                 </span>
//               </Badge>
//             } 
//             key="approved"
//           >
//             <Table 
//               columns={requestColumns} 
//               dataSource={getFilteredRequests()} 
//               loading={loading}
//               rowKey="_id"
//               pagination={{ 
//                 pageSize: 10,
//                 showSizeChanger: true,
//                 showQuickJumper: true,
//                 showTotal: (total, range) => 
//                   `${range[0]}-${range[1]} of ${total} requests`
//               }}
//               scroll={{ x: 'max-content' }}
//               rowClassName={() => 'highlight-row-ready'}
//             />
//           </TabPane>

//           <TabPane 
//             tab={
//               <span>
//                 <SendOutlined />
//                 Disbursed ({stats.disbursed})
//               </span>
//             } 
//             key="disbursed"
//           >
//             <Table 
//               columns={requestColumns} 
//               dataSource={getFilteredRequests()} 
//               loading={loading}
//               rowKey="_id"
//               pagination={{ 
//                 pageSize: 10,
//                 showSizeChanger: true,
//                 showQuickJumper: true,
//                 showTotal: (total, range) => 
//                   `${range[0]}-${range[1]} of ${total} requests`
//               }}
//               scroll={{ x: 'max-content' }}
//             />
//           </TabPane>

//           <TabPane 
//             tab={
//               <span>
//                 <CheckCircleOutlined />
//                 Completed ({stats.completed})
//               </span>
//             } 
//             key="completed"
//           >
//             <Table 
//               columns={requestColumns} 
//               dataSource={getFilteredRequests()} 
//               loading={loading}
//               rowKey="_id"
//               pagination={{ 
//                 pageSize: 10,
//                 showSizeChanger: true,
//                 showQuickJumper: true,
//                 showTotal: (total, range) => 
//                   `${range[0]}-${range[1]} of ${total} requests`
//               }}
//               scroll={{ x: 'max-content' }}
//             />
//           </TabPane>

//           <TabPane 
//             tab={
//               <span>
//                 <CloseCircleOutlined />
//                 Rejected ({stats.rejected})
//               </span>
//             } 
//             key="rejected"
//           >
//             <Table 
//               columns={requestColumns} 
//               dataSource={getFilteredRequests()} 
//               loading={loading}
//               rowKey="_id"
//               pagination={{ 
//                 pageSize: 10,
//                 showSizeChanger: true,
//                 showQuickJumper: true,
//                 showTotal: (total, range) => 
//                   `${range[0]}-${range[1]} of ${total} requests`
//               }}
//               scroll={{ x: 'max-content' }}
//             />
//           </TabPane>
//         </Tabs>
//       </Card>

//       <style>{`
//         .highlight-row-urgent {
//           background-color: #fff7e6 !important;
//           border-left: 4px solid #faad14 !important;
//         }
//         .highlight-row-urgent:hover {
//           background-color: #fff1d6 !important;
//         }
//         .highlight-row-ready {
//           background-color: #f6ffed !important;
//           border-left: 4px solid #52c41a !important;
//         }
//         .highlight-row-ready:hover {
//           background-color: #d9f7be !important;
//         }
//         .cash-request-row {
//           background-color: #fafafa;
//         }
//         .cash-request-row:hover {
//           background-color: #f0f0f0 !important;
//         }
//         .pending-approval-row {
//           border-left: 3px solid #faad14;
//           background-color: #fff7e6;
//         }
//         .pending-approval-row:hover {
//           background-color: #fff1d6 !important;
//         }
//       `}</style>
//     </div>
//   );
// };

// export default FinanceCashApprovals;







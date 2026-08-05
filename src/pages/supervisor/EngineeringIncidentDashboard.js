// pages/supervisor/EngineeringIncidentDashboard.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Full management dashboard — visible to Pascal, Didier, Kelvin, Admin, CEO.
// Approval chain: Pascal (L1) → Didier (L2) → Kelvin (L3)
// Each approver can edit the report at their active level before signing.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Card, Table, Tag, Space, Button, Typography, Row, Col,
  Statistic, Select, DatePicker, Input, message, Modal,
  Tooltip, Badge, Empty, Tabs, Alert, Dropdown, Spin,
  Progress, Avatar, Divider
} from 'antd';
import {
  EyeOutlined, CheckCircleOutlined, CloseCircleOutlined,
  ReloadOutlined, SafetyCertificateOutlined, ClockCircleOutlined,
  ExportOutlined, ShareAltOutlined, CopyOutlined, FilePdfOutlined,
  FileExcelOutlined, DownOutlined, FilterOutlined, BarChartOutlined,
  UserOutlined, WarningOutlined, ThunderboltOutlined,
  SearchOutlined, EditOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import engineeringIncidentAPI from '../../services/engineeringIncidentAPI';

const { Title, Text, Paragraph } = Typography;
const { RangePicker } = DatePicker;

// ── Status map — matches backend overallStatus enum ───────────────────────────
const STATUS_MAP = {
  draft:                  { color: 'default', label: 'Draft'                          },
  pending_review:         { color: 'orange',  label: 'Pending Review'                 },
  pending_approval:       { color: 'purple',  label: 'Pending Approval'               },
  pending_final_approval: { color: 'cyan',    label: 'Pending Final Approval'         },
  approved:               { color: 'green',   label: 'Approved'                       },
  rejected:               { color: 'red',     label: 'Rejected'                       },
};

const SEVERITY_COLOR = {
  'P1 / Critical': 'red',
  'P2 / High':     'orange',
  'P3 / Medium':   'gold',
  'P4 / Low':      'green',
};

// ── Approver config — matches backend ENGINEERING_APPROVERS exactly ───────────
// key: lowercase email → config for that approver
const APPROVER_CONFIG = {
  'pascal.rodrique@gratoglobal.com': {
    level:    1,
    role:     'reviewed_by',
    label:    'Reviewer',
    name:     'Pascal Assam',
    nextStatus: 'pending_approval'
  },
  'didier.oyong@gratoengineering.com': {
    level:    2,
    role:     'approved_by',
    label:    'Approver',
    name:     'Didier Oyong',
    nextStatus: 'pending_final_approval'
  },
  'kelvin.eyong@gratoglobal.com': {
    level:    3,
    role:     'final_approved_by',
    label:    'Final Approver',
    name:     'E.T Kelvin',
    nextStatus: 'approved'
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────
const EngineeringIncidentDashboard = () => {
  const navigate = useNavigate();
  const { user } = useSelector(s => s.auth);

  const [reports,   setReports]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [stats,     setStats]     = useState({ total: 0, pending: 0, approved: 0, rejected: 0, bySeverity: [] });
  const [filters,   setFilters]   = useState({ status: 'all', severity: 'all', search: '', dateRange: null });
  const [exporting, setExporting] = useState(false);

  // Approval modal
  const [approvalModal,   setApprovalModal]   = useState({ open: false, report: null, decision: '' });
  const [approvalComment, setApprovalComment] = useState('');
  const [approving,       setApproving]       = useState(false);

  // Share link modal
  const [shareModal, setShareModal] = useState({ open: false, link: '', reportNumber: '' });

  // Determine logged-in user's approver config
  const userEmail      = (user?.email || '').toLowerCase();
  const isAdminCEO     = ['admin', 'ceo'].includes(user?.role);
  const myApproverConf = APPROVER_CONFIG[userEmail] || null;
  const isApprover     = !!myApproverConf;

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [listRes, statsRes] = await Promise.all([
        engineeringIncidentAPI.getAll({ limit: 200 }),
        engineeringIncidentAPI.getDashboardStats(),
      ]);
      if (listRes.data.success)  setReports(listRes.data.data  || []);
      if (statsRes.data.success) setStats(statsRes.data.data);
    } catch (err) {
      message.error(err.response?.data?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  // ── Can THIS user action a given report? ─────────────────────────────────
  // Condition: it is their level's turn AND their step is still pending.
  const canAction = useCallback((report) => {
    if (!myApproverConf) return false;
    if (isAdminCEO)      return false; // admins view only

    const myStep = (report.approvalChain || []).find(
      s => s.approver?.email?.toLowerCase() === userEmail && s.status === 'pending'
    );
    if (!myStep) return false;
    // Confirm it is actually this approver's turn (level matches current)
    return report.currentApprovalLevel === myApproverConf.level;
  }, [myApproverConf, isAdminCEO, userEmail]);

  // ── Can THIS user edit a given report? ───────────────────────────────────
  const canEdit = useCallback((report) => {
    // Admins can always edit
    if (isAdminCEO) return true;
    // Approver can edit when it is their active turn
    return canAction(report);
  }, [canAction, isAdminCEO]);

  const pendingMyAction = reports.filter(canAction);

  // ── Open approval modal ───────────────────────────────────────────────────
  const openApprovalModal = (report, decision) => {
    setApprovalModal({ open: true, report, decision });
    setApprovalComment('');
  };

  // ── Submit approval / rejection ───────────────────────────────────────────
  const handleApproval = async () => {
    if (!approvalModal.report) return;
    if (approvalModal.decision === 'rejected' && !approvalComment.trim()) {
      message.warning('Please provide a reason for rejection.');
      return;
    }
    try {
      setApproving(true);
      await engineeringIncidentAPI.approve(approvalModal.report._id, {
        decision: approvalModal.decision,
        comments: approvalComment
      });
      message.success(`Report ${approvalModal.decision} successfully`);
      setApprovalModal({ open: false, report: null, decision: '' });
      fetchAll();
    } catch (err) {
      message.error(err.response?.data?.message || 'Action failed');
    } finally {
      setApproving(false);
    }
  };

  // ── Export ────────────────────────────────────────────────────────────────
  const handleExportPDF = async (id, reportNumber) => {
    try { await engineeringIncidentAPI.exportPDF(id, reportNumber); }
    catch { message.error('PDF export failed'); }
  };

  const handleBulkExcelExport = async () => {
    try {
      setExporting(true);
      const params = {};
      if (filters.status   !== 'all') params.status   = filters.status;
      if (filters.severity !== 'all') params.severity = filters.severity;
      if (filters.dateRange) {
        params.startDate = filters.dateRange[0].toISOString();
        params.endDate   = filters.dateRange[1].toISOString();
      }
      await engineeringIncidentAPI.exportExcel(params);
    } catch { message.error('Excel export failed'); }
    finally   { setExporting(false); }
  };

  // ── Share link ────────────────────────────────────────────────────────────
  const handleGenerateLink = async (id, reportNumber) => {
    try {
      const res = await engineeringIncidentAPI.generateShareLink(id);
      setShareModal({ open: true, link: res.data.data.shareLink, reportNumber });
    } catch (err) { message.error(err.response?.data?.message || 'Failed'); }
  };

  // ── Client-side filter ────────────────────────────────────────────────────
  const filtered = reports.filter(r => {
    if (filters.status   !== 'all' && r.overallStatus !== filters.status)  return false;
    if (filters.severity !== 'all' && r.severity      !== filters.severity) return false;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      if (!(r.title?.toLowerCase().includes(q) ||
            r.reportNumber?.toLowerCase().includes(q) ||
            r.affectedSiteLocation?.toLowerCase().includes(q) ||
            r.submittedBy?.fullName?.toLowerCase().includes(q))) return false;
    }
    if (filters.dateRange) {
      const d = dayjs(r.createdAt);
      if (d.isBefore(filters.dateRange[0], 'day') || d.isAfter(filters.dateRange[1], 'day')) return false;
    }
    return true;
  });

  // ── Table columns ─────────────────────────────────────────────────────────
  const columns = [
    {
      title: 'Report #', dataIndex: 'reportNumber', key: 'reportNumber', width: 140, fixed: 'left',
      render: n => <Text code style={{ fontSize: 11 }}>{n}</Text>
    },
    {
      title: 'Title / Site', key: 'title', width: 230,
      render: (_, r) => (
        <div>
          <Text strong style={{ fontSize: 13, display: 'block' }}>{r.title}</Text>
          <Text type="secondary" style={{ fontSize: 11 }}>📍 {r.affectedSiteLocation}</Text>
        </div>
      )
    },
    {
      title: 'Severity', dataIndex: 'severity', key: 'severity', width: 110,
      render: s => <Tag color={SEVERITY_COLOR[s] || 'default'} style={{ fontWeight: 600 }}>{s}</Tag>
    },
    {
      title: 'Status', dataIndex: 'overallStatus', key: 'status', width: 180,
      render: s => {
        const info = STATUS_MAP[s] || { color: 'default', label: s };
        return <Tag color={info.color}>{info.label}</Tag>;
      }
    },
    {
      title: 'Approvals', key: 'approvals', width: 130,
      render: (_, r) => {
        const chain = r.approvalChain || [];
        const done  = chain.filter(s => s.status === 'approved').length;
        return (
          <Space direction="vertical" size={2}>
            <Text style={{ fontSize: 11 }}>{done}/{chain.length} signed</Text>
            <Space size={4}>
              {chain.map((step, i) => (
                <Tooltip
                  key={i}
                  title={`${step.label}: ${
                    step.status === 'approved'
                      ? `✓ ${step.approver?.name || ''} ${step.actionDate ? '— ' + dayjs(step.actionDate).format('DD MMM') : ''}`
                      : step.status === 'rejected'
                      ? `✗ Rejected`
                      : `Pending — ${step.approver?.name || ''}`
                  }`}
                >
                  <div style={{
                    width: 14, height: 14, borderRadius: '50%',
                    background: step.status === 'approved' ? '#52c41a'
                              : step.status === 'rejected' ? '#f5222d'
                              : '#d9d9d9',
                    border: '1px solid rgba(0,0,0,0.1)'
                  }} />
                </Tooltip>
              ))}
            </Space>
          </Space>
        );
      }
    },
    {
      title: 'Submitted By', key: 'submittedBy', width: 140,
      render: (_, r) => (
        <div>
          <Text style={{ fontSize: 12 }}>{r.submittedBy?.fullName || '—'}</Text>
          <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>
            {r.createdAt ? dayjs(r.createdAt).format('DD MMM YYYY') : ''}
          </Text>
        </div>
      )
    },
    {
      title: 'SLA', dataIndex: 'slaStatus', key: 'sla', width: 120,
      render: s => (
        <Tag color={s === 'Within SLA' ? 'green' : 'red'} style={{ fontSize: 10 }}>{s}</Tag>
      )
    },
    {
      title: 'Actions', key: 'actions', width: 220, fixed: 'right',
      render: (_, r) => (
        <Space size={4} wrap>
          <Tooltip title="View Details">
            <Button type="link" size="small" icon={<EyeOutlined />}
              onClick={() => navigate(`/engineering-incidents/${r._id}`)} />
          </Tooltip>

          {/* Edit — only shown when it is this approver's active turn */}
          {canEdit(r) && (
            <Tooltip title="Edit Report">
              <Button type="link" size="small" icon={<EditOutlined />}
                style={{ color: '#faad14' }}
                onClick={() => navigate(`/engineering-incidents/${r._id}/edit`)} />
            </Tooltip>
          )}

          {/* Approve / Reject — only when it is their turn */}
          {canAction(r) && (
            <>
              <Tooltip title="Approve">
                <Button type="link" size="small" icon={<CheckCircleOutlined />}
                  style={{ color: '#52c41a' }}
                  onClick={() => openApprovalModal(r, 'approved')} />
              </Tooltip>
              <Tooltip title="Reject">
                <Button type="link" danger size="small" icon={<CloseCircleOutlined />}
                  onClick={() => openApprovalModal(r, 'rejected')} />
              </Tooltip>
            </>
          )}

          <Tooltip title="Export PDF">
            <Button type="link" size="small" icon={<FilePdfOutlined />}
              onClick={() => handleExportPDF(r._id, r.reportNumber)} />
          </Tooltip>

          <Tooltip title="Get Share Link">
            <Button type="link" size="small" icon={<ShareAltOutlined />}
              onClick={() => handleGenerateLink(r._id, r.reportNumber)} />
          </Tooltip>
        </Space>
      )
    }
  ];

  // ─────────────────────────────────────────────────────────────────────────
  if (loading && !reports.length) {
    return <div style={{ padding: 24, textAlign: 'center' }}><Spin size="large" /></div>;
  }

  const bySeverityData = stats.bySeverity || [];

  return (
    <div style={{ padding: 24 }}>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <Card
        style={{ marginBottom: 24, background: 'linear-gradient(135deg,#0f3460 0%,#16213e 60%,#1a1a2e 100%)', border: 'none' }}
        bodyStyle={{ padding: '28px 32px' }}
      >
        <Row align="middle" justify="space-between" wrap>
          <Col>
            <Title level={2} style={{ color: 'white', margin: 0 }}>
              <SafetyCertificateOutlined /> Engineering Incident Reports
            </Title>
            <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>
              Technical Department — Management Dashboard
            </Text>
            {myApproverConf && (
              <div style={{ marginTop: 8 }}>
                <Tag color="blue" style={{ fontSize: 12 }}>
                  Your Role: Level {myApproverConf.level} — {myApproverConf.label} ({myApproverConf.name})
                </Tag>
                {pendingMyAction.length > 0 && (
                  <Badge count={pendingMyAction.length} style={{ marginLeft: 8, background: '#f5222d' }} />
                )}
              </div>
            )}
            {isAdminCEO && (
              <div style={{ marginTop: 8 }}>
                <Tag color="gold" style={{ fontSize: 12 }}>Admin — View Only</Tag>
              </div>
            )}
          </Col>
          <Col>
            <Space wrap>
              <Button icon={<ReloadOutlined />} onClick={fetchAll} loading={loading}
                style={{ background: 'rgba(255,255,255,0.15)', color: 'white', borderColor: 'rgba(255,255,255,0.3)' }}>
                Refresh
              </Button>
              <Dropdown menu={{
                items: [{
                  key: 'excel',
                  label: 'Export Current View (Excel)',
                  icon: <FileExcelOutlined />,
                  onClick: handleBulkExcelExport
                }]
              }}>
                <Button icon={<ExportOutlined />} loading={exporting}
                  style={{ background: 'rgba(255,255,255,0.15)', color: 'white', borderColor: 'rgba(255,255,255,0.3)' }}>
                  Export <DownOutlined />
                </Button>
              </Dropdown>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* ── Stats ────────────────────────────────────────────────────────── */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        {[
          { label: 'Total Reports',  value: stats.total,    color: '#1890ff', icon: <SafetyCertificateOutlined /> },
          { label: 'Pending Action', value: stats.pending,  color: '#faad14', icon: <ClockCircleOutlined />       },
          { label: 'Approved',       value: stats.approved, color: '#52c41a', icon: <CheckCircleOutlined />       },
          { label: 'Rejected',       value: stats.rejected, color: '#f5222d', icon: <CloseCircleOutlined />       },
        ].map(s => (
          <Col xs={12} md={6} key={s.label}>
            <Card hoverable style={{ borderTop: `3px solid ${s.color}` }}>
              <Statistic
                title={<Text style={{ fontSize: 12 }}>{s.label}</Text>}
                value={s.value}
                prefix={React.cloneElement(s.icon, { style: { color: s.color } })}
                valueStyle={{ color: s.color, fontSize: 30, fontWeight: 700 }}
              />
            </Card>
          </Col>
        ))}
      </Row>

      {/* ── Severity breakdown ────────────────────────────────────────────── */}
      {bySeverityData.length > 0 && (
        <Card style={{ marginBottom: 24 }} bodyStyle={{ padding: '16px 24px' }}>
          <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 12 }}>
            <BarChartOutlined /> Severity Breakdown
          </Text>
          <Row gutter={16}>
            {bySeverityData.map(item => {
              const pct = stats.total > 0 ? Math.round((item.count / stats.total) * 100) : 0;
              return (
                <Col xs={24} sm={12} md={6} key={item._id}>
                  <div style={{ marginBottom: 8 }}>
                    <Row justify="space-between">
                      <Tag color={SEVERITY_COLOR[item._id] || 'default'} style={{ fontSize: 11 }}>{item._id}</Tag>
                      <Text style={{ fontSize: 12 }}>{item.count} ({pct}%)</Text>
                    </Row>
                    <Progress
                      percent={pct}
                      showInfo={false}
                      strokeColor={
                        item._id === 'P1 / Critical' ? '#f5222d' :
                        item._id === 'P2 / High'     ? '#fa8c16' :
                        item._id === 'P3 / Medium'   ? '#faad14' : '#52c41a'
                      }
                      style={{ marginTop: 4 }}
                    />
                  </div>
                </Col>
              );
            })}
          </Row>
        </Card>
      )}

      {/* My action alert */}
      {pendingMyAction.length > 0 && (
        <Alert
          message={`You have ${pendingMyAction.length} report${pendingMyAction.length > 1 ? 's' : ''} awaiting your action`}
          description="You can edit each report before approving or rejecting it."
          type="warning"
          showIcon
          icon={<ThunderboltOutlined />}
          style={{ marginBottom: 16 }}
        />
      )}

      {/* ── Tabs ─────────────────────────────────────────────────────────── */}
      <Card>
        <Tabs
          defaultActiveKey={pendingMyAction.length > 0 ? 'action' : 'all'}
          items={[
            {
              key: 'action',
              label: (
                <Space>
                  Needs My Action
                  {pendingMyAction.length > 0 && (
                    <Badge count={pendingMyAction.length} style={{ background: '#f5222d' }} />
                  )}
                </Space>
              ),
              children: (
                <ActionTab
                  reports={pendingMyAction}
                  loading={loading}
                  canAction={canAction}
                  canEdit={canEdit}
                  openApprovalModal={openApprovalModal}
                  handleExportPDF={handleExportPDF}
                  handleGenerateLink={handleGenerateLink}
                  navigate={navigate}
                />
              )
            },
            {
              key: 'all',
              label: `All Reports (${reports.length})`,
              children: (
                <AllTab
                  reports={filtered}
                  totalReports={reports.length}
                  loading={loading}
                  filters={filters}
                  setFilters={setFilters}
                  columns={columns}
                />
              )
            }
          ]}
        />
      </Card>

      {/* ── Approval Modal ────────────────────────────────────────────────── */}
      <Modal
        title={
          <Space>
            {approvalModal.decision === 'approved'
              ? <CheckCircleOutlined style={{ color: '#52c41a' }} />
              : <CloseCircleOutlined style={{ color: '#f5222d' }} />}
            {approvalModal.decision === 'approved' ? 'Approve Report' : 'Reject Report'}
          </Space>
        }
        open={approvalModal.open}
        onCancel={() => setApprovalModal({ open: false, report: null, decision: '' })}
        width={580}
        footer={[
          <Button key="cancel"
            onClick={() => setApprovalModal({ open: false, report: null, decision: '' })}>
            Cancel
          </Button>,
          <Button key="confirm" type="primary" loading={approving}
            danger={approvalModal.decision === 'rejected'}
            style={approvalModal.decision === 'approved'
              ? { background: '#52c41a', borderColor: '#52c41a' } : {}}
            onClick={handleApproval}
          >
            {approvalModal.decision === 'approved' ? 'Approve & Sign' : 'Reject'}
          </Button>
        ]}
      >
        {approvalModal.report && (
          <div>
            <Alert
              message={`${approvalModal.decision === 'approved' ? '✅ Approving' : '❌ Rejecting'}: ${approvalModal.report.reportNumber}`}
              description={approvalModal.report.title}
              type={approvalModal.decision === 'approved' ? 'success' : 'error'}
              showIcon
              style={{ marginBottom: 16 }}
            />

            <ApprovalReportSummary report={approvalModal.report} />

            {/* Approval chain current state */}
            <div style={{ margin: '12px 0', padding: '10px 14px', background: '#fafafa', borderRadius: 6, border: '1px solid #f0f0f0' }}>
              <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>Approval Chain Progress</Text>
              <Space size={16}>
                {(approvalModal.report.approvalChain || []).map((step, i) => (
                  <div key={i} style={{ textAlign: 'center' }}>
                    <div style={{
                      width: 20, height: 20, borderRadius: '50%', margin: '0 auto 4px',
                      background: step.status === 'approved' ? '#52c41a'
                                : step.status === 'rejected' ? '#f5222d'
                                : step.status === 'pending' && approvalModal.report.currentApprovalLevel === step.level
                                ? '#faad14' : '#d9d9d9'
                    }} />
                    <Text style={{ fontSize: 10 }}>{step.label}</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 10 }}>{step.approver?.name?.split(' ').slice(-1)[0]}</Text>
                  </div>
                ))}
              </Space>
            </div>

            <Divider style={{ margin: '16px 0' }} />

            <div>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>
                {approvalModal.decision === 'rejected' ? 'Rejection Reason (required)' : 'Comments (optional)'}
              </Text>
              <Input.TextArea
                rows={4}
                value={approvalComment}
                onChange={e => setApprovalComment(e.target.value)}
                placeholder={approvalModal.decision === 'rejected'
                  ? 'Explain why this report is being rejected…'
                  : 'Add any comments or observations…'}
                maxLength={500}
                showCount
              />
            </div>

            {approvalModal.decision === 'approved' && (
              <Alert
                message="Your digital signature (from your profile) will be automatically attached to this report."
                type="info"
                showIcon
                style={{ marginTop: 12 }}
              />
            )}

            {/* Link to edit before approving */}
            {approvalModal.report && (
              <Alert
                message={
                  <span>
                    Need to make changes first?{' '}
                    <a href={`/engineering-incidents/${approvalModal.report._id}/edit`}
                       target="_blank" rel="noreferrer">
                      Open report editor ↗
                    </a>
                  </span>
                }
                type="warning"
                style={{ marginTop: 12 }}
              />
            )}
          </div>
        )}
      </Modal>

      {/* ── Share Link Modal ──────────────────────────────────────────────── */}
      <Modal
        title={<Space><ShareAltOutlined /> Share Link — {shareModal.reportNumber}</Space>}
        open={shareModal.open}
        onCancel={() => setShareModal(s => ({ ...s, open: false }))}
        footer={[<Button key="close" onClick={() => setShareModal(s => ({ ...s, open: false }))}>Close</Button>]}
      >
        <Alert
          message="Public link — no login required. Valid for 30 days."
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
        <Input
          value={shareModal.link}
          readOnly
          addonAfter={
            <Tooltip title="Copy to clipboard">
              <CopyOutlined
                style={{ cursor: 'pointer' }}
                onClick={() => { navigator.clipboard.writeText(shareModal.link); message.success('Copied!'); }}
              />
            </Tooltip>
          }
        />
        <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 8 }}>
          Share this link with anyone outside the system who needs to view this report.
        </Text>
      </Modal>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENT: My Action Tab
// ─────────────────────────────────────────────────────────────────────────────
const ActionTab = ({
  reports, loading, canAction, canEdit,
  openApprovalModal, handleExportPDF, handleGenerateLink, navigate
}) => {
  const actionCols = [
    {
      title: 'Report #', dataIndex: 'reportNumber', key: 'reportNumber', width: 140,
      render: n => <Text code style={{ fontSize: 11 }}>{n}</Text>
    },
    {
      title: 'Title / Site', key: 'title', width: 240,
      render: (_, r) => (
        <div>
          <Text strong>{r.title}</Text>
          <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>📍 {r.affectedSiteLocation}</Text>
          <Text type="secondary" style={{ fontSize: 11 }}>
            🕐 {r.incidentStartDateTime ? dayjs(r.incidentStartDateTime).format('DD MMM YYYY HH:mm') : ''}
          </Text>
        </div>
      )
    },
    {
      title: 'Severity', dataIndex: 'severity', key: 'severity', width: 120,
      render: s => <Tag color={SEVERITY_COLOR[s] || 'default'}>{s}</Tag>
    },
    {
      title: 'Submitted By', key: 'submittedBy', width: 140,
      render: (_, r) => (
        <Space>
          <Avatar size="small" icon={<UserOutlined />} />
          <div>
            <Text style={{ fontSize: 12 }}>{r.submittedBy?.fullName || '—'}</Text>
            <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>
              {r.createdAt ? dayjs(r.createdAt).format('DD MMM') : ''}
            </Text>
          </div>
        </Space>
      )
    },
    {
      title: 'Actions', key: 'actions', width: 280,
      render: (_, r) => (
        <Space wrap>
          <Button size="small" icon={<EyeOutlined />}
            onClick={() => navigate(`/engineering-incidents/${r._id}`)}>
            View
          </Button>

          {/* Edit before acting */}
          {canEdit(r) && (
            <Button size="small" icon={<EditOutlined />}
              style={{ borderColor: '#faad14', color: '#faad14' }}
              onClick={() => navigate(`/engineering-incidents/${r._id}/edit`)}>
              Edit
            </Button>
          )}

          {canAction(r) && (
            <>
              <Button size="small" type="primary" icon={<CheckCircleOutlined />}
                style={{ background: '#52c41a', borderColor: '#52c41a' }}
                onClick={() => openApprovalModal(r, 'approved')}>
                Approve
              </Button>
              <Button size="small" danger icon={<CloseCircleOutlined />}
                onClick={() => openApprovalModal(r, 'rejected')}>
                Reject
              </Button>
            </>
          )}

          <Tooltip title="Export PDF">
            <Button size="small" icon={<FilePdfOutlined />}
              onClick={() => handleExportPDF(r._id, r.reportNumber)} />
          </Tooltip>
          <Tooltip title="Share Link">
            <Button size="small" icon={<ShareAltOutlined />}
              onClick={() => handleGenerateLink(r._id, r.reportNumber)} />
          </Tooltip>
        </Space>
      )
    }
  ];

  if (reports.length === 0) {
    return (
      <Empty
        description="No reports currently require your action."
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        style={{ margin: '40px 0' }}
      />
    );
  }

  return (
    <Table
      columns={actionCols}
      dataSource={reports.map(r => ({ ...r, key: r._id }))}
      loading={loading}
      pagination={{ pageSize: 10 }}
      scroll={{ x: 'max-content' }}
      rowClassName={() => 'row-needs-action'}
    />
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENT: All Reports Tab
// ─────────────────────────────────────────────────────────────────────────────
const AllTab = ({ reports, totalReports, loading, filters, setFilters, columns }) => (
  <>
    <Row gutter={12} style={{ marginBottom: 16 }} wrap>
      <Col xs={24} sm={8} md={6}>
        <Input.Search
          prefix={<SearchOutlined />}
          placeholder="Search title, report #, site, name…"
          value={filters.search}
          onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
          allowClear
        />
      </Col>
      <Col xs={12} sm={6} md={4}>
        <Select style={{ width: '100%' }} value={filters.status}
          onChange={v => setFilters(f => ({ ...f, status: v }))}>
          <Select.Option value="all">All Status</Select.Option>
          {Object.entries(STATUS_MAP).map(([k, v]) => (
            <Select.Option key={k} value={k}>{v.label}</Select.Option>
          ))}
        </Select>
      </Col>
      <Col xs={12} sm={6} md={4}>
        <Select style={{ width: '100%' }} value={filters.severity}
          onChange={v => setFilters(f => ({ ...f, severity: v }))}>
          <Select.Option value="all">All Severity</Select.Option>
          {Object.keys(SEVERITY_COLOR).map(s => (
            <Select.Option key={s} value={s}>{s}</Select.Option>
          ))}
        </Select>
      </Col>
      <Col xs={24} sm={8} md={6}>
        <RangePicker style={{ width: '100%' }} value={filters.dateRange}
          onChange={dates => setFilters(f => ({ ...f, dateRange: dates }))} />
      </Col>
      <Col>
        <Button icon={<FilterOutlined />}
          onClick={() => setFilters({ status: 'all', severity: 'all', search: '', dateRange: null })}>
          Clear
        </Button>
      </Col>
    </Row>

    <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
      Showing {reports.length} of {totalReports} reports
    </Text>

    {reports.length === 0 ? (
      <Empty description="No reports match your filters." style={{ margin: '40px 0' }} />
    ) : (
      <Table
        columns={columns}
        dataSource={reports.map(r => ({ ...r, key: r._id }))}
        loading={loading}
        pagination={{ pageSize: 15, showSizeChanger: true, showTotal: (t, [a, b]) => `${a}–${b} of ${t}` }}
        scroll={{ x: 'max-content' }}
        rowClassName={r =>
          r.severity === 'P1 / Critical' ? 'row-critical' :
          r.overallStatus === 'approved' ? 'row-approved' : ''
        }
      />
    )}

    <style>{`
      .row-critical     td { background: #fff1f0 !important; border-left: 3px solid #f5222d !important; }
      .row-needs-action td { background: #fffbe6 !important; border-left: 3px solid #faad14 !important; }
      .row-approved     td { background: #f6ffed !important; }
    `}</style>
  </>
);

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENT: Report Summary in Approval Modal
// ─────────────────────────────────────────────────────────────────────────────
const ApprovalReportSummary = ({ report }) => (
  <div style={{ background: '#fafafa', borderRadius: 8, padding: '12px 16px', border: '1px solid #f0f0f0' }}>
    <Row gutter={16}>
      <Col xs={24} sm={12}>
        <Space direction="vertical" size={4}>
          <div>
            <Text type="secondary" style={{ fontSize: 11 }}>Severity</Text>
            <Tag color={SEVERITY_COLOR[report.severity] || 'default'} style={{ display: 'block', marginTop: 2 }}>
              {report.severity}
            </Tag>
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: 11 }}>SLA Status</Text>
            <Tag color={report.slaStatus === 'Within SLA' ? 'green' : 'red'} style={{ display: 'block', marginTop: 2 }}>
              {report.slaStatus}
            </Tag>
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: 11 }}>Affected Site</Text>
            <Text style={{ fontSize: 12, display: 'block' }}>{report.affectedSiteLocation}</Text>
          </div>
        </Space>
      </Col>
      <Col xs={24} sm={12}>
        <Space direction="vertical" size={4}>
          <div>
            <Text type="secondary" style={{ fontSize: 11 }}>Incident Status</Text>
            <Text style={{ fontSize: 12, display: 'block' }}>{report.incidentStatus}</Text>
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: 11 }}>Submitted By</Text>
            <Text style={{ fontSize: 12, display: 'block' }}>{report.submittedBy?.fullName || '—'}</Text>
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: 11 }}>Submitted On</Text>
            <Text style={{ fontSize: 12, display: 'block' }}>
              {report.createdAt ? dayjs(report.createdAt).format('DD/MM/YYYY HH:mm') : '—'}
            </Text>
          </div>
        </Space>
      </Col>
    </Row>
    <Divider style={{ margin: '10px 0' }} />
    <Text type="secondary" style={{ fontSize: 11 }}>Narrative (excerpt)</Text>
    <Paragraph
      ellipsis={{ rows: 3 }}
      style={{ fontSize: 12, marginTop: 4, marginBottom: 0, color: '#333' }}
    >
      {report.detailsNarrative || '—'}
    </Paragraph>
  </div>
);

export default EngineeringIncidentDashboard;




// pages/employee/EmployeeEngineeringIncidentDetail.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Read-only detail view for employees to track their submitted report.
// Approval chain: Pascal (L1) → Didier (L2) → Kelvin (L3)
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Tag, Space, Button, Spin, Typography,
  Divider, Row, Col, Alert, Steps, Tooltip, message,
  Collapse, Table
} from 'antd';
import {
  ArrowLeftOutlined, SafetyCertificateOutlined, ClockCircleOutlined,
  CheckCircleOutlined, CloseCircleOutlined, ExportOutlined,
  ShareAltOutlined, CopyOutlined, DownloadOutlined, FileTextOutlined,
  WarningOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import engineeringIncidentAPI from '../../services/engineeringIncidentAPI';

const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;

// ── Status map — matches backend overallStatus enum ───────────────────────────
const STATUS_MAP = {
  draft:                   { color: 'default', label: 'Draft',                          icon: <FileTextOutlined />    },
  pending_review:          { color: 'orange',  label: 'Pending Review — Pascal',        icon: <ClockCircleOutlined /> },
  pending_approval:        { color: 'purple',  label: 'Pending Approval — Didier',      icon: <ClockCircleOutlined /> },
  pending_final_approval:  { color: 'cyan',    label: 'Pending Final Approval — Kelvin',icon: <ClockCircleOutlined /> },
  approved:                { color: 'green',   label: 'Fully Approved',                 icon: <CheckCircleOutlined /> },
  rejected:                { color: 'red',     label: 'Rejected',                       icon: <CloseCircleOutlined /> },
};

const SEVERITY_COLOR = {
  'P1 / Critical': 'red',
  'P2 / High':     'orange',
  'P3 / Medium':   'gold',
  'P4 / Low':      'green'
};

// ── Approval chain definition (mirrors backend ENGINEERING_APPROVERS) ─────────
const APPROVAL_CHAIN_META = [
  { role: 'reviewed_by',       label: 'Reviewed By',    color: '#1890ff' },
  { role: 'approved_by',       label: 'Approved By',    color: '#722ed1' },
  { role: 'final_approved_by', label: 'Final Approval', color: '#13c2c2' }
];

// ── Helpers ───────────────────────────────────────────────────────────────────
const InfoRow = ({ label, value }) => (
  <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
    <Text style={{ minWidth: 200, color: '#888', fontSize: 12, fontWeight: 500 }}>{label}:</Text>
    <Text style={{ fontSize: 13 }}>{value || '—'}</Text>
  </div>
);

const LongText = ({ label, text }) => (
  <div style={{ marginBottom: 16 }}>
    <Text strong style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 4 }}>{label}</Text>
    <div style={{ background: '#fafafa', border: '1px solid #f0f0f0', borderRadius: 6, padding: '10px 14px' }}>
      <Paragraph style={{ margin: 0, fontSize: 13, whiteSpace: 'pre-wrap' }}>{text || '—'}</Paragraph>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const EmployeeEngineeringIncidentDetail = () => {
  const { id }   = useParams();
  const navigate = useNavigate();

  const [report,    setReport]    = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [shareLink, setShareLink] = useState('');
  const [copying,   setCopying]   = useState(false);

  useEffect(() => { fetchReport(); }, [id]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const res = await engineeringIncidentAPI.getById(id);
      if (res.data.success) setReport(res.data.data);
      else throw new Error(res.data.message);
    } catch (err) {
      message.error(err.response?.data?.message || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    try { await engineeringIncidentAPI.exportPDF(id, report.reportNumber); }
    catch { message.error('PDF export failed'); }
  };

  const handleGenerateLink = async () => {
    try {
      const res = await engineeringIncidentAPI.generateShareLink(id);
      setShareLink(res.data.data.shareLink);
      message.success('Share link generated (valid 30 days)');
    } catch (err) { message.error(err.response?.data?.message || 'Failed'); }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareLink);
    setCopying(true);
    message.success('Link copied!');
    setTimeout(() => setCopying(false), 2000);
  };

  if (loading) return <div style={{ padding: 24, textAlign: 'center' }}><Spin size="large" /></div>;
  if (!report)  return <Alert message="Report not found" type="error" style={{ margin: 24 }} />;

  const statusInfo    = STATUS_MAP[report.overallStatus] || { color: 'default', label: report.overallStatus };
  const chain         = report.approvalChain || [];
  const approvedCount = chain.filter(s => s.status === 'approved').length;

  // Helper: get chain step by role
  const stepByRole = (role) => chain.find(c => c.role === role);

  return (
    <div style={{ padding: 24, maxWidth: 1000, margin: '0 auto' }}>
      {/* Back */}
      <Button icon={<ArrowLeftOutlined />} style={{ marginBottom: 16 }}
        onClick={() => navigate('/employee/engineering-incident-reports')}>
        Back to My Reports
      </Button>

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <Card
        style={{ marginBottom: 24, background: 'linear-gradient(135deg,#0f3460,#16213e)', border: 'none' }}
        bodyStyle={{ padding: '24px 32px' }}
      >
        <Row align="middle" justify="space-between" wrap>
          <Col>
            <Title level={3} style={{ color: 'white', margin: 0 }}>
              <SafetyCertificateOutlined /> {report.title}
            </Title>
            <Space style={{ marginTop: 8 }} wrap>
              <Text code style={{ color: '#91d5ff', background: 'rgba(255,255,255,0.1)' }}>
                {report.reportNumber}
              </Text>
              <Tag color={statusInfo.color}>{statusInfo.label}</Tag>
              <Tag color={SEVERITY_COLOR[report.severity] || 'default'}>{report.severity}</Tag>
            </Space>
          </Col>
          <Col>
            <Space wrap style={{ marginTop: 8 }}>
              <Button icon={<ExportOutlined />} onClick={handleExportPDF}
                style={{ background: 'rgba(255,255,255,0.15)', color: 'white', borderColor: 'rgba(255,255,255,0.3)' }}>
                Export PDF
              </Button>
              {!shareLink ? (
                <Button icon={<ShareAltOutlined />} onClick={handleGenerateLink}
                  style={{ background: 'rgba(255,255,255,0.15)', color: 'white', borderColor: 'rgba(255,255,255,0.3)' }}>
                  Get Share Link
                </Button>
              ) : (
                <Button icon={<CopyOutlined />} onClick={handleCopyLink}
                  type="primary" style={{ background: '#52c41a', borderColor: '#52c41a' }}>
                  {copying ? 'Copied!' : 'Copy Link'}
                </Button>
              )}
            </Space>
          </Col>
        </Row>

        {shareLink && (
          <Alert
            message={`Share link (30 days): ${shareLink}`}
            type="success"
            style={{ marginTop: 16, background: 'rgba(82,196,26,0.15)', border: '1px solid rgba(82,196,26,0.4)', color: 'white' }}
          />
        )}
      </Card>

      {/* ── Approval Progress ───────────────────────────────────────────────── */}
      <Card
        title="Approval Progress"
        style={{ marginBottom: 24 }}
        extra={<Text type="secondary">{approvedCount} / {chain.length} signed</Text>}
      >
        <Steps
          size="small"
          current={approvedCount}
          status={report.overallStatus === 'rejected' ? 'error' : 'process'}
          items={[
            {
              title: 'Submitted',
              description: dayjs(report.createdAt).format('DD MMM YYYY'),
              status: 'finish'
            },
            ...chain.map(step => ({
              title: step.label,
              description: (
                <div>
                  <div style={{ fontSize: 11 }}>{step.approver?.name}</div>
                  {step.status === 'approved' && (
                    <div style={{ fontSize: 11, color: '#52c41a' }}>
                      ✓ {step.actionDate ? dayjs(step.actionDate).format('DD MMM YYYY') : ''}
                    </div>
                  )}
                  {step.status === 'rejected' && (
                    <div style={{ fontSize: 11, color: '#f5222d' }}>✗ Rejected</div>
                  )}
                  {step.comments && (
                    <div style={{ fontSize: 11, color: '#888', fontStyle: 'italic', marginTop: 2 }}>
                      "{step.comments}"
                    </div>
                  )}
                </div>
              ),
              status: step.status === 'approved' ? 'finish'
                    : step.status === 'rejected' ? 'error'
                    : 'wait'
            }))
          ]}
        />
      </Card>

      {/* ── Collapsible Sections ────────────────────────────────────────────── */}
      <Collapse defaultActiveKey={['1', '2']} style={{ marginBottom: 24 }}>

        {/* Section 1 — Incident Description */}
        <Panel key="1" header={<Text strong>1. Incident Description</Text>}>
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <InfoRow label="Incident ID"         value={report.incidentId} />
              <InfoRow label="Reported Date/Time"  value={report.reportedDateTime ? dayjs(report.reportedDateTime).format('DD/MM/YYYY HH:mm') : ''} />
              <InfoRow label="Incident Start"      value={report.incidentStartDateTime ? dayjs(report.incidentStartDateTime).format('DD/MM/YYYY HH:mm') : ''} />
              <InfoRow label="Resolution Date"     value={report.resolutionDateTime ? dayjs(report.resolutionDateTime).format('DD/MM/YYYY HH:mm') : 'N/A'} />
              <InfoRow label="Duration"            value={report.duration} />
            </Col>
            <Col xs={24} sm={12}>
              <InfoRow label="Severity"    value={<Tag color={SEVERITY_COLOR[report.severity]}>{report.severity}</Tag>} />
              <InfoRow label="SLA Status"  value={<Tag color={report.slaStatus === 'Within SLA' ? 'green' : 'red'}>{report.slaStatus}</Tag>} />
              <InfoRow label="Status"      value={report.incidentStatus} />
              <InfoRow label="Change ID"   value={report.changeId} />
              <InfoRow label="Problem ID"  value={report.existingProblemId} />
            </Col>
          </Row>
          <InfoRow label="Incident Type(s)"  value={(report.incidentTypes || []).join(', ')} />
          <InfoRow label="Affected Site"     value={report.affectedSiteLocation} />
          <LongText label="Affected Services"   text={report.affectedServices} />
          <LongText label="Details / Narrative" text={report.detailsNarrative} />
          {report.resolutionSummary && <LongText label="Resolution Summary" text={report.resolutionSummary} />}
        </Panel>

        {/* Section 2 — Business Impact */}
        <Panel key="2" header={<Text strong>2. Business Impact</Text>}>
          <Row gutter={16}>
            <Col xs={24} sm={8}><InfoRow label="Impact Level"      value={report.impactLevel} /></Col>
            <Col xs={24} sm={8}><InfoRow label="Financial Impact"  value={report.financialImpact} /></Col>
            <Col xs={24} sm={8}><InfoRow label="Reputational Risk" value={report.reputationalRisk} /></Col>
          </Row>
          {/* ── numberOfSitesAffected (renamed from numberOfUsersAffected) ── */}
          <InfoRow label="Sites Affected"    value={report.numberOfSitesAffected} />
          <InfoRow label="Regulatory Impact" value={report.regulatoryImpact} />
          <LongText label="Services Affected"  text={report.impactAffectedServices} />
          {report.impactDescription && <LongText label="Impact Description" text={report.impactDescription} />}
        </Panel>

        {/* Section 3 — Activity Sequence */}
        <Panel key="3" header={<Text strong>3. Sequence of Activities</Text>}>
          {report.activityLogEntries?.length > 0 ? (
            <Table
              size="small"
              pagination={false}
              dataSource={report.activityLogEntries.map((e, i) => ({ ...e, key: i }))}
              columns={[
                { title: 'Date',        dataIndex: 'date',        width: 110 },
                { title: 'Time',        dataIndex: 'time',        width: 80  },
                { title: 'Action',      dataIndex: 'action'               },
                { title: 'Responsible', dataIndex: 'responsible', width: 160 },
              ]}
            />
          ) : (
            <LongText label="Activity Log" text={report.activityLog} />
          )}
        </Panel>

        {/* Section 4 — Preliminary Findings */}
        <Panel key="4" header={<Text strong>4. Preliminary Findings</Text>}>
          <LongText label="Initial Observation" text={report.initialObservation} />
          {report.systemsChecked && <LongText label="Systems Checked" text={report.systemsChecked} />}
          <InfoRow label="Tests Performed"    value={(report.testsPerformed  || []).join(', ')} />
          <InfoRow label="Initial Conclusion" value={(report.initialConclusion || []).join(', ')} />
          <LongText label="Detailed Findings" text={report.detailedFindings} />
        </Panel>

        {/* Section 5 — Root Cause */}
        <Panel key="5" header={<Text strong>5. Root Cause</Text>}>
          <InfoRow label="RCA Method"          value={report.rcaMethod} />
          <InfoRow label="Root Cause Category" value={(report.rootCauseCategories || []).join(', ')} />
          <InfoRow label="Confirmed By"        value={report.rootCauseConfirmedBy} />
          {report.contributingFactors && <LongText label="Contributing Factors" text={report.contributingFactors} />}
          <LongText label="Root Cause Description" text={report.rootCauseDescription} />
        </Panel>

        {/* Section 6 — Key Challenges */}
        <Panel key="6" header={<Text strong>6. Key Challenges</Text>}>
          <Row gutter={16}>
            {[
              ['Logistics Challenges',    report.logisticsChallenges],
              ['Security / Access Issues',report.securityAccessIssues],
              ['Spare Parts',             report.sparePartsAvailability],
              ['Communication Issues',    report.communicationIssues],
              ['Vendor Delays',           report.vendorDelays],
            ].map(([label, val]) => (
              <Col xs={24} sm={12} key={label}>
                <InfoRow
                  label={label}
                  value={
                    <Tag color={val === 'Yes' || val === 'Yes — delayed' ? 'orange' : 'green'}>
                      {val}
                    </Tag>
                  }
                />
              </Col>
            ))}
          </Row>
          {report.challengeDetails && <LongText label="Challenge Details" text={report.challengeDetails} />}
        </Panel>

        {/* Section 7 — Recommendations */}
        <Panel key="7" header={<Text strong>7. Recommendations / Actions</Text>}>
          {report.actionItems?.length > 0 ? (
            <Table
              size="small"
              pagination={false}
              dataSource={(report.actionItems || []).map((a, i) => ({ ...a, key: i }))}
              columns={[
                { title: 'Action',      dataIndex: 'action'              },
                { title: 'Owner',       dataIndex: 'owner',   width: 140 },
                { title: 'Target Date', dataIndex: 'targetDate', width: 110 },
                {
                  title: 'Status', dataIndex: 'status', width: 100,
                  render: s => <Tag color={s === 'Done' ? 'green' : s === 'In Progress' ? 'orange' : 'blue'}>{s}</Tag>
                },
              ]}
            />
          ) : (
            <LongText label="Recommendation / Action Items" text={report.recommendationText} />
          )}
          {report.additionalRecommendations && (
            <LongText label="Additional Recommendations" text={report.additionalRecommendations} />
          )}
        </Panel>

        {/* Section 8 — Evidence & Attachments */}
        <Panel key="8" header={<Text strong>8. Evidence & Attachments ({(report.attachments || []).length})</Text>}>
          {report.attachments?.length > 0 ? (
            report.attachments.map((att, i) => (
              <div
                key={i}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '8px 12px', background: '#fafafa', borderRadius: 6,
                  marginBottom: 8, border: '1px solid #f0f0f0'
                }}
              >
                <FileTextOutlined style={{ color: '#1890ff', fontSize: 20 }} />
                <div style={{ flex: 1 }}>
                  <Text strong style={{ fontSize: 13 }}>{att.name}</Text>
                  <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>
                    {((att.size || 0) / 1024).toFixed(1)} KB
                    {att.mimetype && <span style={{ marginLeft: 8, color: '#aaa' }}>{att.mimetype}</span>}
                  </Text>
                </div>
                <Button
                  type="link"
                  icon={<DownloadOutlined />}
                  onClick={async () => {
                    try {
                      const res = await fetch(att.url);
                      if (!res.ok) throw new Error(`Server returned ${res.status}`);
                      const blob    = await res.blob();
                      const blobUrl = window.URL.createObjectURL(
                        new Blob([blob], { type: att.mimetype || 'application/octet-stream' })
                      );
                      const link = document.createElement('a');
                      link.href  = blobUrl;
                      link.setAttribute('download', att.name || 'attachment');
                      document.body.appendChild(link);
                      link.click();
                      link.remove();
                      window.URL.revokeObjectURL(blobUrl);
                    } catch (err) {
                      console.error('Download error:', err);
                      message.error(`Download failed: ${err.message}`);
                    }
                  }}
                >
                  Download
                </Button>
              </div>
            ))
          ) : (
            <Text type="secondary">No attachments submitted.</Text>
          )}
        </Panel>

        {/* Section 9 — Approvals & Sign-Off */}
        {/* ── 3-level chain: Pascal (L1) → Didier (L2) → Kelvin (L3) ────── */}
        <Panel key="9" header={<Text strong>9. Approvals & Sign-Off</Text>}>

          {/* Prepared By + 3 approver cards */}
          <Row gutter={[12, 12]}>
            {/* Prepared By */}
            <Col xs={24} sm={12} md={6}>
              <SignOffCard
                label="Prepared By"
                name={report.preparedByName}
                designation={report.preparedByDesignation}
                date={report.preparedByDate}
                signed        // always shown as signed once submitted
                color="#595959"
              />
            </Col>

            {/* Level 1 — Pascal */}
            <Col xs={24} sm={12} md={6}>
              <SignOffCard
                label="Reviewed By"
                name={report.reviewedByName}
                designation={report.reviewedByDesignation}
                date={report.reviewedByDate}
                signed={stepByRole('reviewed_by')?.status === 'approved'}
                rejected={stepByRole('reviewed_by')?.status === 'rejected'}
                comments={stepByRole('reviewed_by')?.comments}
                color="#1890ff"
              />
            </Col>

            {/* Level 2 — Didier */}
            <Col xs={24} sm={12} md={6}>
              <SignOffCard
                label="Approved By"
                name={report.approvedByName}
                designation={report.approvedByDesignation}
                date={report.approvedByDate}
                signed={stepByRole('approved_by')?.status === 'approved'}
                rejected={stepByRole('approved_by')?.status === 'rejected'}
                comments={stepByRole('approved_by')?.comments}
                color="#722ed1"
              />
            </Col>

            {/* Level 3 — Kelvin */}
            <Col xs={24} sm={12} md={6}>
              <SignOffCard
                label="Final Approval"
                name={report.finalApprovedByName}
                designation={report.finalApprovedByDesignation}
                date={report.finalApprovedByDate}
                signed={stepByRole('final_approved_by')?.status === 'approved'}
                rejected={stepByRole('final_approved_by')?.status === 'rejected'}
                comments={stepByRole('final_approved_by')?.comments}
                color="#13c2c2"
              />
            </Col>
          </Row>

          {report.approverComments && (
            <Alert
              message="Approver Comments"
              description={report.approverComments}
              type={report.overallStatus === 'rejected' ? 'error' : 'info'}
              showIcon
              style={{ marginTop: 16 }}
            />
          )}
        </Panel>
      </Collapse>

      {/* Bottom status alerts */}
      {report.overallStatus === 'approved' && (
        <Alert
          message="This Engineering Incident Report has been fully approved by all three signatories."
          type="success"
          showIcon
          style={{ marginTop: 16 }}
        />
      )}
      {report.overallStatus === 'rejected' && (
        <Alert
          message="Report Rejected"
          description={report.approverComments || 'Please review the comments and resubmit if necessary.'}
          type="error"
          showIcon
          style={{ marginTop: 16 }}
        />
      )}
      {report.overallStatus === 'pending_final_approval' && (
        <Alert
          message="Awaiting final approval from Mr. E.T Kelvin (Head of Business)."
          type="info"
          showIcon
          style={{ marginTop: 16 }}
        />
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENT: Sign-Off Card
// ─────────────────────────────────────────────────────────────────────────────
const SignOffCard = ({ label, name, designation, date, signed, rejected, comments, color }) => (
  <Card
    size="small"
    style={{
      textAlign: 'center',
      background: signed ? '#f6ffed' : rejected ? '#fff1f0' : '#fafafa',
      borderTop: `3px solid ${color}`,
      height: '100%'
    }}
  >
    <Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</Text>

    {/* Signature area */}
    <div style={{
      height: 40,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      margin: '6px 0'
    }}>
      {signed ? (
        <Text style={{ fontSize: 12, color: '#52c41a', fontWeight: 600 }}>✓ Signed</Text>
      ) : rejected ? (
        <Text style={{ fontSize: 12, color: '#f5222d', fontWeight: 600 }}>✗ Rejected</Text>
      ) : (
        <Text type="secondary" style={{ fontSize: 11, fontStyle: 'italic' }}>Awaiting signature</Text>
      )}
    </div>

    <Divider style={{ margin: '6px 0' }} />
    <Text strong style={{ fontSize: 12 }}>{name || '—'}</Text>
    <br />
    <Text type="secondary" style={{ fontSize: 11 }}>{designation || ''}</Text>
    {date && (
      <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>
        {dayjs(date).format('DD/MM/YYYY')}
      </div>
    )}
    {comments && (
      <Tooltip title={comments}>
        <Text type="secondary" style={{ fontSize: 10, display: 'block', marginTop: 4, fontStyle: 'italic' }}>
          💬 {comments.length > 40 ? comments.slice(0, 40) + '…' : comments}
        </Text>
      </Tooltip>
    )}
  </Card>
);

export default EmployeeEngineeringIncidentDetail;
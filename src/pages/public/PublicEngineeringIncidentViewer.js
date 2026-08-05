// pages/public/PublicEngineeringIncidentViewer.jsx
// ─────────────────────────────────────────────────────────────────────────────
// No-auth public viewer for shared Engineering Incident Reports.
// Accessed via /engineering-incidents/public/:token
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Card, Tag, Space, Spin, Typography, Divider, Row, Col,
  Alert, Steps, Collapse, Table, Result
} from 'antd';
import {
  SafetyCertificateOutlined, ClockCircleOutlined,
  CheckCircleOutlined, CloseCircleOutlined, FileTextOutlined,
  WarningOutlined, DownloadOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import engineeringIncidentAPI from '../../services/engineeringIncidentAPI';

const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;

// ── Constants ─────────────────────────────────────────────────────────────────
const STATUS_MAP = {
  draft:            { color: 'default',  label: 'Draft'                     },
  pending_review:   { color: 'orange',   label: 'Pending Review'            },
  pending_approval: { color: 'purple',   label: 'Pending Approval'          },
  pending_hse:      { color: 'cyan',     label: 'Pending HSE Sign-Off'      },
  approved:         { color: 'green',    label: 'Fully Approved'            },
  rejected:         { color: 'red',      label: 'Rejected'                  },
};

const SEVERITY_COLOR = {
  'P1 / Critical': 'red',
  'P2 / High':     'orange',
  'P3 / Medium':   'gold',
  'P4 / Low':      'green',
};

// ── Sub-components ────────────────────────────────────────────────────────────
const InfoRow = ({ label, value }) => (
  <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
    <Text style={{ minWidth: 200, color: '#888', fontSize: 12, fontWeight: 500 }}>
      {label}:
    </Text>
    <Text style={{ fontSize: 13 }}>{value || '—'}</Text>
  </div>
);

const LongText = ({ label, text }) => (
  <div style={{ marginBottom: 16 }}>
    <Text strong style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 4 }}>
      {label}
    </Text>
    <div style={{
      background: '#fafafa', border: '1px solid #f0f0f0',
      borderRadius: 6, padding: '10px 14px',
    }}>
      <Paragraph style={{ margin: 0, fontSize: 13, whiteSpace: 'pre-wrap' }}>
        {text || '—'}
      </Paragraph>
    </div>
  </div>
);

// ── Main component ────────────────────────────────────────────────────────────
const PublicEngineeringIncidentViewer = () => {
  const { token }           = useParams();
  const [report,  setReport]  = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    if (!token) {
      setError('No share token provided.');
      setLoading(false);
      return;
    }
    fetchReport();
  }, [token]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const res = await engineeringIncidentAPI.getPublicReport(token);
      if (res.data.success) {
        setReport(res.data.data);
      } else {
        setError(res.data.message || 'Report not found.');
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to load report.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg,#0f3460,#16213e)',
      }}>
        <Spin size="large" />
        <Text style={{ color: 'white', marginTop: 16, fontSize: 15 }}>
          Loading report…
        </Text>
      </div>
    );
  }

  // ── Error / expired ──────────────────────────────────────────────────────
  if (error || !report) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: 'linear-gradient(135deg,#0f3460,#16213e)',
        padding: 24,
      }}>
        <Card style={{ maxWidth: 500, width: '100%', textAlign: 'center', borderRadius: 12 }}>
          <Result
            status="404"
            title="Report Not Found"
            subTitle={
              error ||
              'This share link may have expired or the report does not exist. Share links are valid for 30 days.'
            }
            extra={
              <div style={{ fontSize: 13, color: '#888', marginTop: 8 }}>
                <SafetyCertificateOutlined style={{ marginRight: 6 }} />
                Grato Engineering ERP
              </div>
            }
          />
        </Card>
      </div>
    );
  }

  // ── Derived values ───────────────────────────────────────────────────────
  const statusInfo    = STATUS_MAP[report.overallStatus] || { color: 'default', label: report.overallStatus };
  const chain         = report.approvalChain || [];
  const approvedCount = chain.filter(s => s.status === 'approved').length;

  return (
    <div style={{ background: '#f5f7fa', minHeight: '100vh' }}>

      {/* ── Top banner ─────────────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg,#0f3460,#16213e)',
        padding: '24px 32px',
        boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
      }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          {/* Company header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <SafetyCertificateOutlined style={{ fontSize: 32, color: '#91d5ff' }} />
            <div>
              <Text style={{ color: '#91d5ff', fontSize: 12, display: 'block', letterSpacing: 1 }}>
                GRATO ENGINEERING GLOBAL LIMITED
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>
                Internal Safety &amp; Operations Document — Read-Only Public View
              </Text>
            </div>
          </div>

          {/* Report title row */}
          <Row align="middle" justify="space-between" wrap>
            <Col>
              <Title level={3} style={{ color: 'white', margin: 0 }}>
                {report.title}
              </Title>
              <Space style={{ marginTop: 8 }} wrap>
                <Text code style={{ color: '#91d5ff', background: 'rgba(255,255,255,0.1)' }}>
                  {report.reportNumber || report.displayId}
                </Text>
                <Tag color={statusInfo.color}>{statusInfo.label}</Tag>
                <Tag color={SEVERITY_COLOR[report.severity] || 'default'}>{report.severity}</Tag>
              </Space>
            </Col>
          </Row>
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '24px 16px' }}>

        {/* Read-only notice */}
        <Alert
          message="This is a read-only public view of an Engineering Incident Report shared via a secure link."
          type="info"
          showIcon
          style={{ marginBottom: 24 }}
        />

        {/* Approval progress */}
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
                status: 'finish',
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
                      : 'wait',
              })),
            ]}
          />
        </Card>

        {/* Collapsible sections */}
        <Collapse defaultActiveKey={['1', '2']} style={{ marginBottom: 24 }}>

          {/* Section 1 — Incident Description */}
          <Panel key="1" header={<Text strong>1. Incident Description</Text>}>
            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <InfoRow label="Incident ID"        value={report.incidentId} />
                <InfoRow label="Reported Date/Time" value={report.reportedDateTime     ? dayjs(report.reportedDateTime).format('DD/MM/YYYY HH:mm')     : ''} />
                <InfoRow label="Incident Start"     value={report.incidentStartDateTime ? dayjs(report.incidentStartDateTime).format('DD/MM/YYYY HH:mm') : ''} />
                <InfoRow label="Resolution Date"    value={report.resolutionDateTime   ? dayjs(report.resolutionDateTime).format('DD/MM/YYYY HH:mm')   : 'N/A'} />
                <InfoRow label="Duration"           value={report.duration} />
              </Col>
              <Col xs={24} sm={12}>
                <InfoRow label="Severity"   value={<Tag color={SEVERITY_COLOR[report.severity]}>{report.severity}</Tag>} />
                <InfoRow label="SLA Status" value={<Tag color={report.slaStatus === 'Within SLA' ? 'green' : 'red'}>{report.slaStatus}</Tag>} />
                <InfoRow label="Status"     value={report.incidentStatus} />
                <InfoRow label="Change ID"  value={report.changeId} />
                <InfoRow label="Problem ID" value={report.existingProblemId} />
              </Col>
            </Row>
            <InfoRow label="Incident Type(s)" value={(report.incidentTypes || []).join(', ')} />
            <InfoRow label="Affected Site"    value={report.affectedSiteLocation} />
            <LongText label="Affected Services"    text={report.affectedServices} />
            <LongText label="Details / Narrative"  text={report.detailsNarrative} />
            {report.resolutionSummary && (
              <LongText label="Resolution Summary" text={report.resolutionSummary} />
            )}
          </Panel>

          {/* Section 2 — Business Impact */}
          <Panel key="2" header={<Text strong>2. Business Impact</Text>}>
            <Row gutter={16}>
              <Col xs={24} sm={8}><InfoRow label="Impact Level"      value={report.impactLevel} /></Col>
              <Col xs={24} sm={8}><InfoRow label="Financial Impact"  value={report.financialImpact} /></Col>
              <Col xs={24} sm={8}><InfoRow label="Reputational Risk" value={report.reputationalRisk} /></Col>
            </Row>
            <InfoRow label="Users Affected"    value={report.numberOfUsersAffected} />
            <InfoRow label="Regulatory Impact" value={report.regulatoryImpact} />
            <LongText label="Services Affected"  text={report.impactAffectedServices} />
            {report.impactDescription && (
              <LongText label="Impact Description" text={report.impactDescription} />
            )}
          </Panel>

          {/* Section 3 — Sequence of Activities */}
          <Panel key="3" header={<Text strong>3. Sequence of Activities</Text>}>
            {report.activityLogEntries?.length > 0 ? (
              <Table
                size="small"
                pagination={false}
                dataSource={report.activityLogEntries.map((e, i) => ({ ...e, key: i }))}
                columns={[
                  { title: 'Date',        dataIndex: 'date',        width: 110 },
                  { title: 'Time',        dataIndex: 'time',        width: 80  },
                  { title: 'Action',      dataIndex: 'action'                  },
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
            {report.systemsChecked && (
              <LongText label="Systems Checked" text={report.systemsChecked} />
            )}
            <InfoRow label="Tests Performed"    value={(report.testsPerformed   || []).join(', ')} />
            <InfoRow label="Initial Conclusion" value={(report.initialConclusion || []).join(', ')} />
            <LongText label="Detailed Findings" text={report.detailedFindings} />
          </Panel>

          {/* Section 5 — Root Cause */}
          <Panel key="5" header={<Text strong>5. Root Cause</Text>}>
            <InfoRow label="RCA Method"          value={report.rcaMethod} />
            <InfoRow label="Root Cause Category" value={(report.rootCauseCategories || []).join(', ')} />
            <InfoRow label="Confirmed By"        value={report.rootCauseConfirmedBy} />
            {report.contributingFactors && (
              <LongText label="Contributing Factors" text={report.contributingFactors} />
            )}
            <LongText label="Root Cause Description" text={report.rootCauseDescription} />
          </Panel>

          {/* Section 6 — Key Challenges */}
          <Panel key="6" header={<Text strong>6. Key Challenges</Text>}>
            <Row gutter={16}>
              {[
                ['Logistics Challenges',     report.logisticsChallenges],
                ['Security / Access Issues', report.securityAccessIssues],
                ['Spare Parts',              report.sparePartsAvailability],
                ['Communication Issues',     report.communicationIssues],
                ['Vendor Delays',            report.vendorDelays],
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
            {report.challengeDetails && (
              <LongText label="Challenge Details" text={report.challengeDetails} />
            )}
          </Panel>

          {/* Section 7 — Recommendations */}
          <Panel key="7" header={<Text strong>7. Recommendations / Actions</Text>}>
            {report.actionItems?.length > 0 ? (
              <Table
                size="small"
                pagination={false}
                dataSource={(report.actionItems || []).map((a, i) => ({ ...a, key: i }))}
                columns={[
                  { title: 'Action',      dataIndex: 'action'                                                                                               },
                  { title: 'Owner',       dataIndex: 'owner',      width: 140                                                                              },
                  { title: 'Target Date', dataIndex: 'targetDate', width: 110                                                                              },
                  {
                    title: 'Status', dataIndex: 'status', width: 100,
                    render: s => (
                      <Tag color={s === 'Done' ? 'green' : s === 'In Progress' ? 'orange' : 'blue'}>
                        {s}
                      </Tag>
                    ),
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
          <Panel
            key="8"
            header={<Text strong>8. Evidence &amp; Attachments ({(report.attachments || []).length})</Text>}
          >
            {report.attachments?.length > 0 ? (
              report.attachments.map((att, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '8px 12px', background: '#fafafa', borderRadius: 6,
                    marginBottom: 8, border: '1px solid #f0f0f0',
                  }}
                >
                  <FileTextOutlined style={{ color: '#E63946', fontSize: 20 }} />
                  <div style={{ flex: 1 }}>
                    <Text strong style={{ fontSize: 13 }}>{att.name}</Text>
                    <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>
                      {((att.size || 0) / 1024).toFixed(1)} KB
                    </Text>
                  </div>
                  {/* Cloudinary URLs are public — link directly */}
                  {att.url?.startsWith('http') ? (
                    <a
                      href={att.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      download={att.name}
                      style={{ color: '#E63946', fontSize: 13 }}
                    >
                      <DownloadOutlined style={{ marginRight: 4 }} />
                      Download
                    </a>
                  ) : (
                    <Text type="secondary" style={{ fontSize: 12 }}>Not available</Text>
                  )}
                </div>
              ))
            ) : (
              <Text type="secondary">No attachments submitted.</Text>
            )}

            {report.additionalAttachmentTypes?.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <Text strong style={{ fontSize: 12 }}>Additional Document Types: </Text>
                {report.additionalAttachmentTypes.map(t => <Tag key={t}>{t}</Tag>)}
              </div>
            )}
          </Panel>

          {/* Section 9 — Approvals & Sign-Off */}
          <Panel key="9" header={<Text strong>9. Approvals &amp; Sign-Off</Text>}>
            <Row gutter={16}>
              {[
                {
                  label: 'Prepared By',
                  name:  report.preparedByName,
                  desig: report.preparedByDesignation,
                  date:  report.preparedByDate,
                  role:  'prepared_by',
                },
                {
                  label: 'Reviewed By',
                  name:  report.reviewedByName,
                  desig: report.reviewedByDesignation,
                  date:  report.reviewedByDate,
                  role:  'reviewed_by',
                },
                {
                  label: 'Approved By',
                  name:  report.approvedByName,
                  desig: report.approvedByDesignation,
                  date:  report.approvedByDate,
                  role:  'approved_by',
                },
              ].map(s => {
                const chainStep = chain.find(c => c.role === s.role);
                const isSigned  = chainStep?.status === 'approved' || s.role === 'prepared_by';
                return (
                  <Col xs={24} sm={8} key={s.label}>
                    <Card size="small" style={{ textAlign: 'center', background: '#fafafa' }}>
                      <Text type="secondary" style={{ fontSize: 11 }}>{s.label}</Text>

                      {/* Signature image if available */}
                      {chainStep?.signatureUrl && (
                        <div style={{
                          height: 56, display: 'flex', alignItems: 'center',
                          justifyContent: 'center', margin: '8px 0',
                        }}>
                          <img
                            src={chainStep.signatureUrl}
                            alt={`${s.label} signature`}
                            style={{ maxHeight: 50, maxWidth: '100%', objectFit: 'contain' }}
                            onError={e => { e.target.style.display = 'none'; }}
                          />
                        </div>
                      )}

                      <div style={{ height: isSigned && !chainStep?.signatureUrl ? 36 : undefined, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Text type="secondary" style={{ fontSize: 11, fontStyle: 'italic' }}>
                          {isSigned ? '✓ Signed' : 'Awaiting signature'}
                        </Text>
                      </div>

                      <Divider style={{ margin: '6px 0' }} />
                      <Text strong style={{ fontSize: 12 }}>{s.name || '—'}</Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: 11 }}>{s.desig || ''}</Text>
                      {s.date && (
                        <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>
                          {dayjs(s.date).format('DD/MM/YYYY')}
                        </div>
                      )}
                    </Card>
                  </Col>
                );
              })}
            </Row>

            {/* HSE Sign-Off */}
            <Card
              size="small"
              style={{ marginTop: 12, background: '#e6fffb', borderColor: '#36cfc9' }}
            >
              <Row align="middle">
                <Col flex="auto">
                  <Text strong style={{ color: '#13c2c2' }}>
                    HSE Sign-Off — {chain[2]?.approver?.name || 'Mr. Ovo Bechem'}
                  </Text>
                  <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
                    HSE Coordinator
                  </Text>
                  {chain[2]?.signatureUrl && (
                    <img
                      src={chain[2].signatureUrl}
                      alt="HSE signature"
                      style={{ maxHeight: 48, maxWidth: 160, objectFit: 'contain', marginTop: 8, display: 'block' }}
                      onError={e => { e.target.style.display = 'none'; }}
                    />
                  )}
                </Col>
                <Col>
                  <Tag color={chain[2]?.status === 'approved' ? 'green' : 'orange'}>
                    {chain[2]?.status === 'approved' ? '✓ HSE Approved' : 'Pending HSE'}
                  </Tag>
                  {chain[2]?.actionDate && (
                    <Text type="secondary" style={{ fontSize: 11, display: 'block', textAlign: 'right' }}>
                      {dayjs(chain[2].actionDate).format('DD/MM/YYYY')}
                    </Text>
                  )}
                </Col>
              </Row>
            </Card>

            {report.approverComments && (
              <Alert
                message="Approver Comments"
                description={report.approverComments}
                type={report.overallStatus === 'rejected' ? 'error' : 'info'}
                showIcon
                style={{ marginTop: 12 }}
              />
            )}
          </Panel>
        </Collapse>

        {/* Final status alert */}
        {report.overallStatus === 'approved' && (
          <Alert
            message="This Engineering Incident Report has been fully approved."
            type="success"
            showIcon
            style={{ marginTop: 16 }}
          />
        )}
        {report.overallStatus === 'rejected' && (
          <Alert
            message="Report Rejected"
            description={report.approverComments || 'This report was rejected. Please contact the submitter for details.'}
            type="error"
            showIcon
            style={{ marginTop: 16 }}
          />
        )}

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: 32, padding: '16px 0', borderTop: '1px solid #f0f0f0' }}>
          <SafetyCertificateOutlined style={{ color: '#1890ff', marginRight: 6 }} />
          <Text type="secondary" style={{ fontSize: 12 }}>
            Grato Engineering Global Limited — Engineering Incident Report System
          </Text>
          <br />
          <Text type="secondary" style={{ fontSize: 11 }}>
            This link is valid for 30 days from generation. Report: {report.reportNumber || report.displayId}
          </Text>
        </div>
      </div>
    </div>
  );
};

export default PublicEngineeringIncidentViewer;




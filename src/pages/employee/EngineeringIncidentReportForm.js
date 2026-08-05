// pages/employee/EngineeringIncidentReportForm.jsx
// ─────────────────────────────────────────────────────────────────────────────
// 9-section multi-step form — Technical department employees only
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Form, Input, Select, Button, Card, Typography, Space, Row, Col,
  Steps, Divider, Tag, Spin, Alert, DatePicker,
  Checkbox, Radio, Upload, message, Progress, Badge
} from 'antd';
import {
  SafetyCertificateOutlined, UploadOutlined, ArrowLeftOutlined,
  ArrowRightOutlined, SaveOutlined, ExclamationCircleOutlined,
  PlusOutlined, MinusCircleOutlined, ClockCircleOutlined, ToolOutlined,
  EnvironmentOutlined, FileTextOutlined, WarningOutlined, BulbOutlined,
  CameraOutlined, AuditOutlined
} from '@ant-design/icons';
import engineeringIncidentAPI from '../../services/engineeringIncidentAPI';

const { Title, Text } = Typography;
const { TextArea }    = Input;
const { Option }      = Select;

// ── Section configs ───────────────────────────────────────────────────────────
const SECTIONS = [
  { title: 'Incident Description',   icon: <ExclamationCircleOutlined />, color: '#f5222d' },
  { title: 'Business Impact',        icon: <WarningOutlined />,           color: '#fa8c16' },
  { title: 'Activity Sequence',      icon: <ClockCircleOutlined />,       color: '#faad14' },
  { title: 'Preliminary Findings',   icon: <ToolOutlined />,              color: '#1890ff' },
  { title: 'Root Cause',             icon: <BulbOutlined />,              color: '#722ed1' },
  { title: 'Key Challenges',         icon: <EnvironmentOutlined />,       color: '#eb2f96' },
  { title: 'Recommendations',        icon: <FileTextOutlined />,          color: '#52c41a' },
  { title: 'Evidence & Attachments', icon: <CameraOutlined />,            color: '#13c2c2' },
  { title: 'Approvals & Sign-Off',   icon: <AuditOutlined />,             color: '#595959' }
];

// ── Enum constants (must match backend model exactly) ─────────────────────────
const INCIDENT_TYPES = [
  'Grid Outage', 'Generator Failure', 'Fuel Shortage / Diesel Runout',
  'ATS / AMF Failure', 'Rectifier Failure', 'Power Cabinet Issue',
  'Battery Failure', 'Theft', 'Fire / Burned Equipment',
  'Lightning / Weather Damage', 'Planned / Maintenance Activity',
  'Cascade Passive', 'Landlord / Access Issue', 'Vendor / Third-Party Delay',
  'Software / Configuration Error', 'Other'
];

const TESTS_PERFORMED = [
  'Generator Manual Start Test', 'ATS / AMF Bypass Test', 'Fuel Level Check',
  'Oil Level Check', 'Coolant / Water Level Check', 'Battery Voltage Check',
  'Rectifier Reset / Module Check', 'Grid Voltage / Phase Check',
  'Control Panel / Card Reset', 'Load Measurement (KVA / Amperage)',
  'Visual Inspection (On-site)', 'Remote Diagnostics (NOC)',
  'Reboot / Power Reset', 'Cable / Wiring Inspection',
  'Fuel Line / Pump Check', 'Other'
];

const INITIAL_CONCLUSIONS = [
  'Grid Outage — External', 'Grid Bad Voltage / Phase Issue',
  'Generator Overload', 'Generator Mechanical Fault',
  'Generator Control / Card Fault', 'Fuel Shortage', 'ATS / AMF Fault',
  'Battery / Backup Failure', 'Rectifier Fault', 'Power Cabinet Issue',
  'Theft', 'Fire / Physical Damage', 'Lightning / Weather Related',
  'Cascade from Parent Site', 'Planned Activity', 'Human Error',
  'Unknown — Investigation Ongoing'
];

const ROOT_CAUSE_CATEGORIES = [
  'External Grid Failure', 'Generator Mechanical Fault',
  'Generator Electrical Fault', 'Fuel / Diesel Supply Issue',
  'ATS / Control Panel Fault', 'Battery / Backup Degradation',
  'Rectifier / Power Equipment Fault', 'Physical Damage (Fire / Lightning)',
  'Theft / Vandalism', 'Cascade / Dependency Failure',
  'Process / Maintenance Gap', 'Human Factor',
  'Third-Party / Vendor Failure', 'Environmental / Infrastructure', 'Unknown'
];

// Approval chain displayed in Section 9 — matches backend ENGINEERING_APPROVERS
const APPROVAL_CHAIN = [
  { level: 1, label: 'Reviewed By',    name: 'Mr. Pascal Assam',  role: 'Operations Manager', color: '#1890ff' },
  { level: 2, label: 'Approved By',    name: 'Mr. Didier Oyong',  role: 'Technical Director',  color: '#722ed1' },
  { level: 3, label: 'Final Approval', name: 'Mr. E.T Kelvin',    role: 'Head of Business',    color: '#13c2c2' }
];

// Accepted file types for upload (images, docs, video, archives)
const UPLOAD_ACCEPT = [
  // Images
  '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp',
  // Documents
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt', '.rtf',
  // Video
  '.mp4', '.mov', '.avi', '.mkv', '.webm', '.wmv', '.3gp', '.3g2',
  // Archives
  '.zip', '.rar', '.7z', '.tar', '.gz', '.bz2'
].join(',');

// Max file size hint displayed to user (matches uploadMiddleware 500 MB limit)
const MAX_FILE_SIZE_MB = 500;
const MAX_FILES        = 20;

// ── Reusable sub-components ───────────────────────────────────────────────────
const SectionCard = ({ title, icon, color, children, note }) => (
  <Card
    style={{ marginBottom: 0, border: `1px solid ${color}20` }}
    headStyle={{ background: `${color}10`, borderBottom: `2px solid ${color}` }}
    title={
      <Space>
        <span style={{ color, fontSize: 18 }}>{icon}</span>
        <Text strong style={{ color: '#262626', fontSize: 15 }}>{title}</Text>
      </Space>
    }
  >
    {note && <Alert message={note} type="info" showIcon style={{ marginBottom: 20, fontSize: 12 }} />}
    {children}
  </Card>
);

// ─────────────────────────────────────────────────────────────────────────────
// MAIN FORM COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const EngineeringIncidentReportForm = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  const [form]           = Form.useForm();
  const [currentSection, setCurrentSection] = useState(0);
  const [sectionValues,  setSectionValues]  = useState({});
  const [fileList,       setFileList]       = useState([]);
  const [submitting,     setSubmitting]     = useState(false);
  const [activityRows,   setActivityRows]   = useState([
    { date: '', time: '', action: '', responsible: '' }
  ]);
  const [actionRows, setActionRows] = useState([
    { action: '', owner: '', targetDate: '', status: 'Open' }
  ]);

  // Guard: Technical dept only
  useEffect(() => {
    if (user?.department !== 'Technical' && user?.role !== 'admin') {
      message.error('This form is only available to Technical department employees.');
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const saveCurrentSection = useCallback(async () => {
    try {
      const vals = form.getFieldsValue();
      setSectionValues(prev => ({ ...prev, ...vals }));
    } catch (_) {}
  }, [form]);

  useEffect(() => {
    if (Object.keys(sectionValues).length) form.setFieldsValue(sectionValues);
  }, [currentSection]); // eslint-disable-line

  const handleNext = async () => {
    try {
      await saveCurrentSection();
      const fields = getValidationFields(currentSection);
      if (fields.length) await form.validateFields(fields);
      setCurrentSection(s => Math.min(s + 1, SECTIONS.length - 1));
      window.scrollTo(0, 0);
    } catch {
      message.error('Please fill in all required fields before continuing.');
    }
  };

  const handlePrev = async () => {
    await saveCurrentSection();
    setCurrentSection(s => Math.max(s - 1, 0));
    window.scrollTo(0, 0);
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      await saveCurrentSection();
      const allValues = { ...sectionValues, ...form.getFieldsValue() };
      const fd = new FormData();

      const app = (key, val) => {
        if (val !== undefined && val !== null && val !== '') {
          fd.append(key, typeof val === 'object' && !(val instanceof Date)
            ? JSON.stringify(val) : String(val));
        }
      };

      // Section 1
      app('title',                allValues.title);
      app('incidentId',           allValues.incidentId || '');
      app('reportedDateTime',     allValues.reportedDateTime?.toISOString?.() || new Date().toISOString());
      app('incidentStartDateTime',allValues.incidentStartDateTime?.toISOString?.());
      app('resolutionDateTime',   allValues.resolutionDateTime?.toISOString?.() || '');
      app('duration',             allValues.duration || '');
      app('severity',             allValues.severity);
      app('incidentTypes',        JSON.stringify(allValues.incidentTypes || []));
      app('affectedSiteLocation', allValues.affectedSiteLocation);
      app('affectedServices',     allValues.affectedServices);
      app('slaStatus',            allValues.slaStatus);
      app('changeId',             allValues.changeId || 'N/A');
      app('existingProblemId',    allValues.existingProblemId || 'N/A');
      app('incidentStatus',       allValues.incidentStatus);
      app('detailsNarrative',     allValues.detailsNarrative);
      app('resolutionSummary',    allValues.resolutionSummary || '');
      // Section 2
      app('impactLevel',            allValues.impactLevel);
      app('impactAffectedServices', allValues.impactAffectedServices);
      app('numberOfSitesAffected',  allValues.numberOfSitesAffected || '');
      app('financialImpact',        allValues.financialImpact);
      app('regulatoryImpact',       allValues.regulatoryImpact);
      app('reputationalRisk',       allValues.reputationalRisk);
      app('impactDescription',      allValues.impactDescription || '');
      // Section 3
      const logText = activityRows.filter(r => r.action)
        .map(r => `${r.date} | ${r.time} | ${r.action} | ${r.responsible}`).join('\n');
      app('activityLog', logText || allValues.activityLog || '');
      app('activityLogEntries', JSON.stringify(activityRows.filter(r => r.action)));
      // Section 4
      app('initialObservation', allValues.initialObservation);
      app('systemsChecked',     allValues.systemsChecked || '');
      app('testsPerformed',     JSON.stringify(allValues.testsPerformed || []));
      app('initialConclusion',  JSON.stringify(allValues.initialConclusion || []));
      app('detailedFindings',   allValues.detailedFindings);
      // Section 5
      app('rcaMethod',             allValues.rcaMethod || '');
      app('rootCauseCategories',   JSON.stringify(allValues.rootCauseCategories || []));
      app('contributingFactors',   allValues.contributingFactors || '');
      app('rootCauseConfirmedBy',  allValues.rootCauseConfirmedBy);
      app('rootCauseDescription',  allValues.rootCauseDescription);
      // Section 6
      app('logisticsChallenges',   allValues.logisticsChallenges);
      app('securityAccessIssues',  allValues.securityAccessIssues);
      app('sparePartsAvailability',allValues.sparePartsAvailability);
      app('communicationIssues',   allValues.communicationIssues);
      app('vendorDelays',          allValues.vendorDelays);
      app('challengeDetails',      allValues.challengeDetails || '');
      // Section 7
      const recText = actionRows.filter(r => r.action)
        .map(r => `${r.action} | ${r.owner} | ${r.targetDate} | ${r.status}`).join('\n');
      app('recommendationText',       recText || allValues.recommendationText || '');
      app('actionItems',              JSON.stringify(actionRows.filter(r => r.action)));
      app('additionalRecommendations',allValues.additionalRecommendations || '');
      // Section 8
      app('additionalAttachmentTypes', JSON.stringify(allValues.additionalAttachmentTypes || []));
      app('otherAttachmentsSpec',      allValues.otherAttachmentsSpec || '');
      const edArr = [];
      for (let i = 1; i <= 8; i++) {
        const d = allValues[`evidenceDesc${i}`];
        if (d) edArr.push({ index: i - 1, description: d });
      }
      app('evidenceDescriptions', JSON.stringify(edArr));
      // Section 9
      app('preparedByName',        allValues.preparedByName || user?.fullName || '');
      app('preparedByDesignation', allValues.preparedByDesignation || user?.position || '');

      fileList.forEach(f => {
        if (f.originFileObj) fd.append('attachments', f.originFileObj);
      });

      const res = await engineeringIncidentAPI.create(fd);
      if (res.data.success) {
        message.success('Engineering Incident Report submitted successfully!');
        navigate('/employee/engineering-incident-reports', {
          state: { submitted: true, reportNumber: res.data.data.reportNumber }
        });
      } else {
        throw new Error(res.data.message || 'Submission failed');
      }
    } catch (err) {
      console.error(err);
      message.error(err.response?.data?.message || err.message || 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const getValidationFields = (section) => {
    const map = {
      0: ['title', 'reportedDateTime', 'incidentStartDateTime', 'severity',
          'incidentTypes', 'affectedSiteLocation', 'affectedServices',
          'slaStatus', 'incidentStatus', 'detailsNarrative'],
      1: ['impactLevel', 'impactAffectedServices', 'regulatoryImpact', 'reputationalRisk'],
      2: [],
      3: ['initialObservation', 'detailedFindings'],
      4: ['rootCauseCategories', 'rootCauseConfirmedBy', 'rootCauseDescription'],
      5: ['logisticsChallenges', 'securityAccessIssues', 'sparePartsAvailability',
          'communicationIssues', 'vendorDelays'],
      6: [],
      7: [],
      8: ['preparedByName']
    };
    return map[section] || [];
  };

  const progressPct = Math.round(((currentSection + 1) / SECTIONS.length) * 100);

  const renderSection = () => {
    switch (currentSection) {
      case 0: return <Section1 form={form} />;
      case 1: return <Section2 form={form} />;
      case 2: return <Section3 activityRows={activityRows} setActivityRows={setActivityRows} form={form} />;
      case 3: return <Section4 form={form} />;
      case 4: return <Section5 form={form} />;
      case 5: return <Section6 form={form} />;
      case 6: return <Section7 actionRows={actionRows} setActionRows={setActionRows} form={form} />;
      case 7: return <Section8 fileList={fileList} setFileList={setFileList} form={form} />;
      case 8: return <Section9 form={form} user={user} />;
      default: return null;
    }
  };

  if (user?.department !== 'Technical' && user?.role !== 'admin') {
    return <div style={{ padding: 24 }}><Spin /></div>;
  }

  return (
    <div style={{ padding: '24px', maxWidth: 1000, margin: '0 auto' }}>
      {/* Header */}
      <Card
        style={{ marginBottom: 24, background: 'linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%)', border: 'none' }}
        bodyStyle={{ padding: '28px 32px' }}
      >
        <Row align="middle" gutter={16}>
          <Col>
            <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 12, padding: '12px 16px' }}>
              <SafetyCertificateOutlined style={{ fontSize: 36, color: '#40a9ff' }} />
            </div>
          </Col>
          <Col flex="auto">
            <Title level={3} style={{ color: 'white', margin: 0 }}>Engineering Incident Report</Title>
            <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13 }}>
              GRATO ENGINEERING GLOBAL LIMITED — Internal Safety & Operations Document
            </Text>
            <br />
            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontStyle: 'italic' }}>
              CONFIDENTIALITY: No part of this document may be disclosed to any third party without prior written consent.
            </Text>
          </Col>
          <Col>
            <Tag color="blue" style={{ fontSize: 12, padding: '4px 12px' }}>
              Section {currentSection + 1} / {SECTIONS.length}
            </Tag>
          </Col>
        </Row>
        <Progress
          percent={progressPct}
          showInfo={false}
          strokeColor={{ '0%': '#40a9ff', '100%': '#52c41a' }}
          trailColor="rgba(255,255,255,0.15)"
          style={{ marginTop: 20, marginBottom: 0 }}
        />
      </Card>

      {/* Steps */}
      <Card style={{ marginBottom: 24 }} bodyStyle={{ padding: '16px 24px' }}>
        <Steps
          current={currentSection}
          size="small"
          style={{ overflowX: 'auto' }}
          items={SECTIONS.map((s, i) => ({
            title: <span style={{ fontSize: 11 }}>{s.title}</span>,
            icon: React.cloneElement(s.icon, {
              style: { color: i === currentSection ? s.color : i < currentSection ? '#52c41a' : '#bfbfbf' }
            }),
            status: i < currentSection ? 'finish' : i === currentSection ? 'process' : 'wait'
          }))}
        />
      </Card>

      {/* Form */}
      <Form
        form={form}
        layout="vertical"
        autoComplete="off"
        preserve={true}
        initialValues={{
          incidentStatus:        'Open',
          slaStatus:             'Within SLA',
          preparedByName:        user?.fullName || '',
          preparedByDesignation: user?.position || ''
        }}
      >
        {renderSection()}
      </Form>

      {/* Navigation */}
      <Card style={{ marginTop: 24 }} bodyStyle={{ padding: '16px 24px' }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={currentSection === 0 ? () => navigate('/employee/engineering-incident-reports') : handlePrev}
              size="large"
            >
              {currentSection === 0 ? 'Cancel' : 'Previous'}
            </Button>
          </Col>
          <Col>
            <Text type="secondary" style={{ fontSize: 12 }}>{SECTIONS[currentSection].title}</Text>
          </Col>
          <Col>
            {currentSection < SECTIONS.length - 1 ? (
              <Button
                type="primary"
                icon={<ArrowRightOutlined />}
                iconPosition="end"
                onClick={handleNext}
                size="large"
                style={{ background: SECTIONS[currentSection].color, borderColor: SECTIONS[currentSection].color }}
              >
                Next: {SECTIONS[currentSection + 1]?.title}
              </Button>
            ) : (
              <Button
                type="primary"
                icon={<SaveOutlined />}
                onClick={handleSubmit}
                loading={submitting}
                size="large"
                style={{ background: '#52c41a', borderColor: '#52c41a', paddingInline: 32 }}
              >
                Submit Report
              </Button>
            )}
          </Col>
        </Row>
      </Card>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 1
// ─────────────────────────────────────────────────────────────────────────────
const Section1 = ({ form }) => (
  <SectionCard title="1. Incident Description" icon={<ExclamationCircleOutlined />} color="#f5222d"
    note="Complete all fields. Mandatory fields are marked with *">
    <Row gutter={16}>
      <Col xs={24} sm={12}>
        <Form.Item name="incidentId" label="Incident ID">
          <Input placeholder="Auto-generated or enter manually" />
        </Form.Item>
      </Col>
      <Col xs={24} sm={12}>
        <Form.Item name="title" label="Incident Title *" rules={[{ required: true, message: 'Required' }]}>
          <Input placeholder="e.g. Generator Failure at Site X" maxLength={200} showCount />
        </Form.Item>
      </Col>
    </Row>
    <Row gutter={16}>
      <Col xs={24} sm={12}>
        <Form.Item name="reportedDateTime" label="Reported Date / Time *" rules={[{ required: true, message: 'Required' }]}>
          <DatePicker showTime style={{ width: '100%' }} format="DD/MM/YYYY HH:mm" placeholder="Select date and time" />
        </Form.Item>
      </Col>
      <Col xs={24} sm={12}>
        <Form.Item name="incidentStartDateTime" label="Incident Start Date / Time *" rules={[{ required: true, message: 'Required' }]}>
          <DatePicker showTime style={{ width: '100%' }} format="DD/MM/YYYY HH:mm" placeholder="Select date and time" />
        </Form.Item>
      </Col>
    </Row>
    <Row gutter={16}>
      <Col xs={24} sm={12}>
        <Form.Item name="resolutionDateTime" label="Resolution Date / Time">
          <DatePicker showTime style={{ width: '100%' }} format="DD/MM/YYYY HH:mm" placeholder="Leave blank if unresolved" />
        </Form.Item>
      </Col>
      <Col xs={24} sm={12}>
        <Form.Item name="duration" label="Duration">
          <Input placeholder="e.g. 3 hours 20 minutes" />
        </Form.Item>
      </Col>
    </Row>
    <Row gutter={16}>
      <Col xs={24} sm={12}>
        <Form.Item name="severity" label="Severity *" rules={[{ required: true, message: 'Required' }]}>
          <Select placeholder="Select severity">
            {['P1 / Critical', 'P2 / High', 'P3 / Medium', 'P4 / Low'].map(s => (
              <Option key={s} value={s}>
                <Tag color={s.startsWith('P1') ? 'red' : s.startsWith('P2') ? 'orange' : s.startsWith('P3') ? 'gold' : 'green'}>{s}</Tag>
              </Option>
            ))}
          </Select>
        </Form.Item>
      </Col>
      <Col xs={24} sm={12}>
        <Form.Item name="slaStatus" label="SLA Status *" rules={[{ required: true, message: 'Required' }]}>
          <Select>
            <Option value="Within SLA">Within SLA</Option>
            <Option value="Outside SLA (OSLA)">Outside SLA (OSLA)</Option>
          </Select>
        </Form.Item>
      </Col>
    </Row>
    <Form.Item name="incidentTypes" label="Incident Type *" rules={[{ required: true, message: 'Select at least one type' }]}>
      <Checkbox.Group>
        <Row gutter={[8, 8]}>
          {INCIDENT_TYPES.map(t => <Col xs={12} sm={8} key={t}><Checkbox value={t}>{t}</Checkbox></Col>)}
        </Row>
      </Checkbox.Group>
    </Form.Item>
    <Form.Item name="affectedSiteLocation" label="Affected Site / Location *" rules={[{ required: true, message: 'Required' }]}>
      <Input placeholder="e.g. Bonaberi Data Centre, Site Alpha" />
    </Form.Item>
    <Form.Item name="affectedServices" label="Affected Services *" rules={[{ required: true, message: 'Required' }]}>
      <TextArea rows={3} placeholder="List all services, systems, or equipment affected" showCount maxLength={1000} />
    </Form.Item>
    <Row gutter={16}>
      <Col xs={24} sm={8}>
        <Form.Item name="incidentStatus" label="Incident Status *" rules={[{ required: true, message: 'Required' }]}>
          <Select>
            {['Open', 'In Progress', 'Resolved', 'Closed'].map(s => <Option key={s} value={s}>{s}</Option>)}
          </Select>
        </Form.Item>
      </Col>
      <Col xs={24} sm={8}>
        <Form.Item name="changeId" label="Change ID">
          <Input placeholder="Change ID or N/A" />
        </Form.Item>
      </Col>
      <Col xs={24} sm={8}>
        <Form.Item name="existingProblemId" label="Existing Problem ID">
          <Input placeholder="Problem ID or N/A" />
        </Form.Item>
      </Col>
    </Row>
    <Form.Item name="detailsNarrative" label="Details / Narrative *"
      rules={[{ required: true, message: 'Required' }, { min: 30, message: 'Please provide more detail (min 30 chars)' }]}>
      <TextArea rows={5} placeholder="Provide a full description of what happened, when it was discovered, and how it was reported." showCount maxLength={3000} />
    </Form.Item>
    <Form.Item name="resolutionSummary" label="Resolution Summary">
      <TextArea rows={3} placeholder="Describe the steps taken to resolve the incident and confirm service restoration." showCount maxLength={2000} />
    </Form.Item>
  </SectionCard>
);

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 2
// ─────────────────────────────────────────────────────────────────────────────
const Section2 = ({ form }) => (
  <SectionCard title="2. Business Impact" icon={<WarningOutlined />} color="#fa8c16"
    note="Assess the operational, financial, and reputational impact of this incident.">
    <Form.Item name="impactLevel" label="Impact Level *" rules={[{ required: true, message: 'Required' }]}>
      <Select placeholder="Select impact level" size="large">
        {[
          { v: 'Critical (Revenue Loss)', c: 'red' },
          { v: 'High (Major Disruption)', c: 'orange' },
          { v: 'Medium (Partial Outage)', c: 'gold' },
          { v: 'Low (Minor Degradation)', c: 'green' }
        ].map(({ v, c }) => (
          <Option key={v} value={v}><Tag color={c}>{v}</Tag></Option>
        ))}
      </Select>
    </Form.Item>
    <Form.Item name="impactAffectedServices" label="Services Affected *" rules={[{ required: true, message: 'Required' }]}>
      <TextArea rows={3} placeholder="List all business services or functions impacted" showCount maxLength={1000} />
    </Form.Item>
    <Row gutter={16}>
      <Col xs={24} sm={8}>
        <Form.Item name="numberOfSitesAffected" label="Number of Sites Affected">
          <Input placeholder="e.g. 4 cascade sites affected" />
        </Form.Item>
      </Col>
      <Col xs={24} sm={8}>
        <Form.Item name="financialImpact" label="Financial Impact">
          <Select allowClear placeholder="Select financial impact">
            {['None', 'Minor', 'Significant', 'Severe — quantify below'].map(v => <Option key={v} value={v}>{v}</Option>)}
          </Select>
        </Form.Item>
      </Col>
      <Col xs={24} sm={8}>
        <Form.Item name="reputationalRisk" label="Reputational Risk *" rules={[{ required: true, message: 'Required' }]}>
          <Select>
            {['High', 'Medium', 'Low', 'None'].map(v => <Option key={v} value={v}>{v}</Option>)}
          </Select>
        </Form.Item>
      </Col>
    </Row>
    <Form.Item name="regulatoryImpact" label="Regulatory Impact *" rules={[{ required: true, message: 'Required' }]}>
      <Radio.Group>
        <Radio value="Yes — described below">Yes — described below</Radio>
        <Radio value="No">No</Radio>
      </Radio.Group>
    </Form.Item>
    <Form.Item name="impactDescription" label="Impact Description">
      <TextArea rows={4} placeholder="Provide full details of business impact including financial estimates, regulatory implications, client notifications, and any SLA penalties incurred." showCount maxLength={2000} />
    </Form.Item>
  </SectionCard>
);

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 3
// ─────────────────────────────────────────────────────────────────────────────
const Section3 = ({ activityRows, setActivityRows, form }) => {
  const addRow    = () => setActivityRows(r => [...r, { date: '', time: '', action: '', responsible: '' }]);
  const removeRow = (i) => setActivityRows(r => r.filter((_, idx) => idx !== i));
  const updateRow = (i, field, value) => setActivityRows(r => r.map((row, idx) => idx === i ? { ...row, [field]: value } : row));

  return (
    <SectionCard title="3. Sequence of Activities to Restore Service" icon={<ClockCircleOutlined />} color="#faad14"
      note="Document each action taken in chronological order.">
      <Alert message="Format: DD/MM/YYYY | HH:MM | Action Carried Out | Responsible Team / Person" type="warning" showIcon style={{ marginBottom: 16 }} />
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
          <thead>
            <tr style={{ background: '#fffbe6' }}>
              {['Date (DD/MM/YYYY)', 'Time (HH:MM)', 'Action Carried Out', 'Responsible Team / Person', ''].map(h => (
                <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600, fontSize: 12, borderBottom: '2px solid #faad14', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {activityRows.map((row, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#fffbe6' }}>
                <td style={{ padding: 4 }}><Input value={row.date} onChange={e => updateRow(i, 'date', e.target.value)} placeholder="12/07/2025" size="small" style={{ width: 110 }} /></td>
                <td style={{ padding: 4 }}><Input value={row.time} onChange={e => updateRow(i, 'time', e.target.value)} placeholder="08:15" size="small" style={{ width: 72 }} /></td>
                <td style={{ padding: 4 }}><Input value={row.action} onChange={e => updateRow(i, 'action', e.target.value)} placeholder="Describe the action taken" size="small" /></td>
                <td style={{ padding: 4 }}><Input value={row.responsible} onChange={e => updateRow(i, 'responsible', e.target.value)} placeholder="NOC Team / J. Mensah" size="small" style={{ width: 150 }} /></td>
                <td style={{ padding: 4 }}>
                  {activityRows.length > 1 && (
                    <Button danger type="text" size="small" icon={<MinusCircleOutlined />} onClick={() => removeRow(i)} />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Button type="dashed" onClick={addRow} icon={<PlusOutlined />} style={{ marginTop: 12, width: '100%' }}>Add Activity Row</Button>
      <Divider style={{ margin: '16px 0' }}><Text type="secondary" style={{ fontSize: 12 }}>Or paste raw log below</Text></Divider>
      <Form.Item name="activityLog">
        <TextArea rows={4} placeholder={`12/07/2025 | 08:15 | Incident detected via monitoring alert | NOC Team`} showCount maxLength={5000} />
      </Form.Item>
    </SectionCard>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 4
// ─────────────────────────────────────────────────────────────────────────────
const Section4 = ({ form }) => (
  <SectionCard title="4. Preliminary Findings" icon={<ToolOutlined />} color="#1890ff"
    note="Record initial observations and diagnostic steps taken.">
    <Form.Item name="initialObservation" label="Initial Observation *" rules={[{ required: true, message: 'Required' }]}>
      <TextArea rows={4} placeholder="What was first noticed? How was the issue discovered?" showCount maxLength={2000} />
    </Form.Item>
    <Form.Item name="systemsChecked" label="Systems / Equipment Checked">
      <TextArea rows={3} placeholder="List all systems, devices, and infrastructure checked during initial investigation" showCount maxLength={1500} />
    </Form.Item>
    <Form.Item name="testsPerformed" label="Tests Performed">
      <Checkbox.Group>
        <Row gutter={[8, 8]}>
          {TESTS_PERFORMED.map(t => <Col xs={12} sm={8} key={t}><Checkbox value={t}>{t}</Checkbox></Col>)}
        </Row>
      </Checkbox.Group>
    </Form.Item>
    <Form.Item name="initialConclusion" label="Initial Conclusion">
      <Checkbox.Group>
        <Row gutter={[8, 8]}>
          {INITIAL_CONCLUSIONS.map(t => <Col xs={12} sm={8} key={t}><Checkbox value={t}>{t}</Checkbox></Col>)}
        </Row>
      </Checkbox.Group>
    </Form.Item>
    <Form.Item name="detailedFindings" label="Detailed Findings *" rules={[{ required: true, message: 'Required' }]}>
      <TextArea rows={5} placeholder="Provide a comprehensive account of all findings from the investigation phase." showCount maxLength={3000} />
    </Form.Item>
  </SectionCard>
);

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 5
// ─────────────────────────────────────────────────────────────────────────────
const Section5 = ({ form }) => (
  <SectionCard title="5. Identified Root Cause" icon={<BulbOutlined />} color="#722ed1"
    note="Document the confirmed root cause and methodology used.">
    <Row gutter={16}>
      <Col xs={24} sm={12}>
        <Form.Item name="rcaMethod" label="RCA Method Used">
          <Select placeholder="Select RCA method" allowClear>
            {['5-Why Analysis', 'Fishbone (Ishikawa) Diagram', 'Fault Tree Analysis', 'Other'].map(m => <Option key={m} value={m}>{m}</Option>)}
          </Select>
        </Form.Item>
      </Col>
      <Col xs={24} sm={12}>
        <Form.Item name="rootCauseConfirmedBy" label="Root Cause Confirmed By *" rules={[{ required: true, message: 'Required' }]}>
          <Input placeholder="Name and designation of confirming person" />
        </Form.Item>
      </Col>
    </Row>
    <Form.Item name="rootCauseCategories" label="Root Cause Category *" rules={[{ required: true, message: 'Select at least one category' }]}>
      <Checkbox.Group>
        <Row gutter={[8, 8]}>
          {ROOT_CAUSE_CATEGORIES.map(c => <Col xs={12} sm={8} key={c}><Checkbox value={c}>{c}</Checkbox></Col>)}
        </Row>
      </Checkbox.Group>
    </Form.Item>
    <Form.Item name="contributingFactors" label="Contributing Factors">
      <TextArea rows={3} placeholder="List all secondary factors that contributed to the incident or its severity" showCount maxLength={1500} />
    </Form.Item>
    <Form.Item name="rootCauseDescription" label="Root Cause Description *"
      rules={[{ required: true, message: 'Required' }, { min: 30, message: 'Please provide more detail' }]}>
      <TextArea rows={5} placeholder="Provide a full explanation of the root cause, the chain of events, and how it led to the incident." showCount maxLength={3000} />
    </Form.Item>
  </SectionCard>
);

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 6
// ─────────────────────────────────────────────────────────────────────────────
const Section6 = ({ form }) => {
  const yesNoItem = (name, label, options = ['Yes', 'No']) => (
    <Form.Item name={name} label={label} rules={[{ required: true, message: 'Required' }]}>
      <Radio.Group>{options.map(o => <Radio key={o} value={o}>{o}</Radio>)}</Radio.Group>
    </Form.Item>
  );
  return (
    <SectionCard title="6. Key Challenges" icon={<EnvironmentOutlined />} color="#eb2f96"
      note="Identify any obstacles encountered during the incident response.">
      <Row gutter={[24, 0]}>
        <Col xs={24} sm={12}>
          {yesNoItem('logisticsChallenges',  'Logistics Challenges *')}
          {yesNoItem('securityAccessIssues', 'Security / Access Issues *')}
          {yesNoItem('communicationIssues',  'Communication Issues *')}
        </Col>
        <Col xs={24} sm={12}>
          {yesNoItem('sparePartsAvailability', 'Spare Parts Availability *', ['Yes — delayed', 'No issues'])}
          {yesNoItem('vendorDelays', 'Vendor / Third-Party Delays *')}
        </Col>
      </Row>
      <Divider />
      <Form.Item name="challengeDetails" label="Challenge Details">
        <TextArea rows={5} placeholder="Describe all challenges in detail including specific delays, blockers, access restrictions, or communication failures encountered." showCount maxLength={2000} />
      </Form.Item>
    </SectionCard>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 7
// ─────────────────────────────────────────────────────────────────────────────
const Section7 = ({ actionRows, setActionRows, form }) => {
  const addRow    = () => setActionRows(r => [...r, { action: '', owner: '', targetDate: '', status: 'Open' }]);
  const removeRow = (i) => setActionRows(r => r.filter((_, idx) => idx !== i));
  const updateRow = (i, field, value) => setActionRows(r => r.map((row, idx) => idx === i ? { ...row, [field]: value } : row));
  return (
    <SectionCard title="7. Recommendations / Actions" icon={<FileTextOutlined />} color="#52c41a"
      note="Document all corrective and preventive actions arising from this incident.">
      <div style={{ overflowX: 'auto', marginBottom: 16 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
          <thead>
            <tr style={{ background: '#f6ffed' }}>
              {['Action Description', 'Owner', 'Target Date', 'Status', ''].map(h => (
                <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600, fontSize: 12, borderBottom: '2px solid #52c41a' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {actionRows.map((row, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#f6ffed' }}>
                <td style={{ padding: 4 }}><Input value={row.action} onChange={e => updateRow(i, 'action', e.target.value)} placeholder="Replace faulty UPS unit at Site A" size="small" /></td>
                <td style={{ padding: 4 }}><Input value={row.owner} onChange={e => updateRow(i, 'owner', e.target.value)} placeholder="Maintenance Team" size="small" style={{ width: 140 }} /></td>
                <td style={{ padding: 4 }}><Input value={row.targetDate} onChange={e => updateRow(i, 'targetDate', e.target.value)} placeholder="30/07/2025" size="small" style={{ width: 100 }} /></td>
                <td style={{ padding: 4 }}>
                  <Select value={row.status} onChange={v => updateRow(i, 'status', v)} size="small" style={{ width: 110 }}>
                    {['Open', 'In Progress', 'Done'].map(s => <Option key={s} value={s}>{s}</Option>)}
                  </Select>
                </td>
                <td style={{ padding: 4 }}>
                  {actionRows.length > 1 && <Button danger type="text" size="small" icon={<MinusCircleOutlined />} onClick={() => removeRow(i)} />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Button type="dashed" onClick={addRow} icon={<PlusOutlined />} style={{ width: '100%', marginBottom: 16 }}>Add Action Item</Button>
      <Divider />
      <Form.Item name="additionalRecommendations" label="Additional Recommendations">
        <TextArea rows={4} placeholder="Any further preventive measures, process improvements, or policy changes recommended to prevent recurrence." showCount maxLength={2000} />
      </Form.Item>
    </SectionCard>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 8 — PHOTO EVIDENCE & ATTACHMENTS
// ── Accepts: images, documents, video (mp4/mov/avi/mkv/webm/wmv/3gp),
//             archives (zip/rar/7z/tar/gz)
// ─────────────────────────────────────────────────────────────────────────────
const Section8 = ({ fileList, setFileList, form }) => (
  <SectionCard title="8. Photo Evidence & Attachments" icon={<CameraOutlined />} color="#13c2c2"
    note={`Upload all relevant files. Accepted: Images, PDF, Word, Excel, Video (MP4/MOV/AVI/MKV/WEBM/WMV/3GP), Archives (ZIP/RAR/7Z/TAR/GZ). Max ${MAX_FILE_SIZE_MB} MB per file, ${MAX_FILES} files total.`}>
    <Alert
      message="File upload items must be attached here."
      type="info"
      showIcon
      style={{ marginBottom: 20 }}
    />
    <Form.Item label="Upload Evidence Files">
      <Upload
        multiple
        fileList={fileList}
        beforeUpload={() => false}
        onChange={({ fileList: fl }) => {
          const valid = fl.filter(f => {
            const sizeMb = (f.size || 0) / 1024 / 1024;
            const ok = !f.size || sizeMb < MAX_FILE_SIZE_MB;
            if (!ok) message.error(`${f.name} exceeds ${MAX_FILE_SIZE_MB} MB`);
            return ok;
          }).slice(0, MAX_FILES);
          setFileList(valid);
        }}
        accept={UPLOAD_ACCEPT}
        maxCount={MAX_FILES}
      >
        <Button
          icon={<UploadOutlined />}
          size="large"
          style={{ borderStyle: 'dashed', width: '100%', height: 80 }}
        >
          Click or Drag Files Here<br />
          <Text type="secondary" style={{ fontSize: 11 }}>
            Images · PDF · Word · Excel · Video · ZIP/RAR — Max {MAX_FILE_SIZE_MB} MB each, {MAX_FILES} files
          </Text>
        </Button>
      </Upload>
    </Form.Item>
    <Divider>Evidence Descriptions</Divider>
    {[1, 2, 3, 4].map(n => (
      <Form.Item key={n} name={`evidenceDesc${n}`} label={`Evidence Description — File ${n}`}>
        <TextArea rows={2} placeholder={`Describe what File ${n} shows (location, equipment, timestamp, relevance)`} maxLength={500} showCount />
      </Form.Item>
    ))}
    <Form.Item name="evidenceDesc5" label="Evidence Description — Files 5–20 (if applicable)">
      <TextArea rows={2} placeholder="Describe any additional files submitted" maxLength={500} showCount />
    </Form.Item>
    <Divider>Additional Attachment Types</Divider>
    <Form.Item name="additionalAttachmentTypes" label="Additional Attachments Submitted">
      <Checkbox.Group>
        <Row gutter={[8, 8]}>
          {[
            'Network / Topology Diagram', 'Alarm Screenshots', 'Configuration Backup Files',
            'Equipment Replacement Records', 'Vendor / Supplier Reports',
            'Change Request Documentation', 'SLA / Penalty Calculation Sheet',
            'Post-Incident Review (PIR) Report', 'Other'
          ].map(t => (
            <Col xs={24} sm={12} key={t}><Checkbox value={t}>{t}</Checkbox></Col>
          ))}
        </Row>
      </Checkbox.Group>
    </Form.Item>
    <Form.Item name="otherAttachmentsSpec" label="Other Attachments — specify">
      <TextArea rows={2} placeholder="Describe any other attachments not listed above" maxLength={500} showCount />
    </Form.Item>
  </SectionCard>
);

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 9 — APPROVALS & SIGN-OFF
// ── 3-level chain: Pascal (L1) → Didier (L2) → Kelvin (L3)
// ── Each approver can edit the report at their active level before signing.
// ─────────────────────────────────────────────────────────────────────────────
const Section9 = ({ form, user }) => (
  <SectionCard title="9. Approvals & Sign-Off" icon={<AuditOutlined />} color="#595959"
    note="Physical signatures are required on the printed version. Complete the digital fields below for record-keeping.">
    <Alert
      message="Approval Workflow"
      description={
        <div>
          <p style={{ margin: '4px 0' }}>
            After submission this report is routed through three approval levels in sequence.
            Each approver may edit the report before signing off.
          </p>
          <Space direction="vertical" size={6} style={{ width: '100%', marginTop: 12 }}>
            {APPROVAL_CHAIN.map(s => (
              <div key={s.level} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Badge count={s.level} style={{ backgroundColor: s.color }} />
                <Tag color={s.color}>{s.label}</Tag>
                <Text strong>{s.name}</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>— {s.role}</Text>
              </div>
            ))}
          </Space>
        </div>
      }
      type="info"
      showIcon
      style={{ marginBottom: 24 }}
    />

    <Divider>Prepared By (Submitter)</Divider>
    <Row gutter={16}>
      <Col xs={24} sm={12}>
        <Form.Item name="preparedByName" label="Prepared By — Name *" rules={[{ required: true, message: 'Required' }]}>
          <Input placeholder="Your full name" />
        </Form.Item>
      </Col>
      <Col xs={24} sm={12}>
        <Form.Item name="preparedByDesignation" label="Prepared By — Designation / Title">
          <Input placeholder="Your role / designation" />
        </Form.Item>
      </Col>
    </Row>

    <Divider>Level 1 — Reviewed By (Auto-assigned: Pascal Assam)</Divider>
    <Row gutter={16}>
      <Col xs={24} sm={12}><Input value="Mr. Pascal Assam"    disabled addonBefore="Name"        style={{ marginBottom: 16 }} /></Col>
      <Col xs={24} sm={12}><Input value="Operations Manager"  disabled addonBefore="Designation" style={{ marginBottom: 16 }} /></Col>
    </Row>

    <Divider>Level 2 — Approved By (Auto-assigned: Didier Oyong)</Divider>
    <Row gutter={16}>
      <Col xs={24} sm={12}><Input value="Mr. Didier Oyong"    disabled addonBefore="Name"        style={{ marginBottom: 16 }} /></Col>
      <Col xs={24} sm={12}><Input value="Technical Director"  disabled addonBefore="Designation" style={{ marginBottom: 16 }} /></Col>
    </Row>

    <Divider>Level 3 — Final Approval (Auto-assigned: Mr. E.T Kelvin)</Divider>
    <Row gutter={16}>
      <Col xs={24} sm={12}><Input value="Mr. E.T Kelvin"      disabled addonBefore="Name"        style={{ marginBottom: 16 }} /></Col>
      <Col xs={24} sm={12}><Input value="Head of Business"    disabled addonBefore="Designation" style={{ marginBottom: 16 }} /></Col>
    </Row>

    <Alert
      message="Dates and signatures are captured automatically when each approver reviews and signs in the system."
      type="warning"
      showIcon
      style={{ marginTop: 8 }}
    />
  </SectionCard>
);

export default EngineeringIncidentReportForm;




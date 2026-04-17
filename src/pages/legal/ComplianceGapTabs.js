// ============================================================
// NEW FILE: pages/legal/ComplianceGapTabs.js
// Import and add these tabs to LegalComplianceCenter.js
// ============================================================
import React, { useState, useCallback, useEffect } from 'react';
import {
  Alert, Badge, Button, Card, Col, Divider, Form, Input, InputNumber,
  message, Modal, Popconfirm, Progress, Row, Select, Space, Statistic,
  Table, Tag, Tabs, Timeline, Typography
} from 'antd';
import {
  CheckCircleOutlined, ExclamationCircleOutlined, FileProtectOutlined,
  LockOutlined, PlusOutlined, ReloadOutlined, SafetyCertificateOutlined,
  WarningOutlined
} from '@ant-design/icons';
import { legalAPI } from '../../services/api';

const { Text, Title } = Typography;
const fmt     = (v) => Number(v || 0).toLocaleString();
const fmtDate = (v) => v ? new Date(v).toLocaleDateString() : '—';
const today   = new Date().toISOString().slice(0, 10);

const sevColor = { low:'blue', medium:'orange', high:'red', critical:'red', fatality:'red' };

// ─────────────────────────────────────────────────────────────────────────────
// RISK MATRIX TAB  — heat map + register
// ─────────────────────────────────────────────────────────────────────────────
export const RiskMatrixTab = () => {
  const [data,    setData]    = useState({ risks: [], heatmap: [] });
  const [loading, setLoading] = useState(false);
  const [modal,   setModal]   = useState(false);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    try { setLoading(true); const r = await legalAPI.getRiskMatrix(); setData(r.data || { risks: [], heatmap: [] }); }
    catch { message.error('Failed to load risk matrix'); } finally { setLoading(false); }
  }, []);

  const handleCreate = async (values) => {
    try { await legalAPI.createRiskEntry(values); message.success('Risk entry created'); setModal(false); form.resetFields(); await load(); }
    catch (e) { message.error(e.response?.data?.message || 'Failed'); }
  };

  // 5×5 heat map grid
  const HeatMap = ({ heatmap }) => {
    const COLORS = { 1:'#52c41a', 2:'#52c41a', 3:'#faad14', 4:'#faad14', 5:'#faad14', 6:'#faad14', 9:'#faad14', 10:'#ff7a45', 12:'#ff7a45', 15:'#ff4d4f', 16:'#ff4d4f', 20:'#ff4d4f', 25:'#ff4d4f' };
    const getCount = (l, i) => { const cell = heatmap.find(h => h._id.likelihood === l && h._id.impact === i); return cell ? cell.count : 0; };
    const getColor = (l, i) => { const s = l * i; if (s <= 4) return '#52c41a'; if (s <= 9) return '#faad14'; if (s <= 16) return '#ff7a45'; return '#ff4d4f'; };
    return (
      <div style={{ marginBottom: 20 }}>
        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>Risk heat map (residual scores)</Text>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 4, maxWidth: 340 }}>
          <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}></div>
          {[1,2,3,4,5].map(i => <div key={i} style={{ fontSize: 11, textAlign:'center', color:'var(--color-text-secondary)' }}>I={i}</div>)}
          {[5,4,3,2,1].map(l => (
            <React.Fragment key={l}>
              <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', alignSelf:'center' }}>L={l}</div>
              {[1,2,3,4,5].map(i => {
                const count = getCount(l, i);
                const bg = getColor(l, i);
                return <div key={i} style={{ background: bg, opacity: 0.7 + (count > 0 ? 0.3 : 0), borderRadius: 4, height: 44, display:'flex', alignItems:'center', justifyContent:'center', fontSize: 13, fontWeight: 500, color: '#fff' }}>{count > 0 ? count : ''}</div>;
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
    );
  };

  const columns = [
    { title: 'Ref',       dataIndex: 'riskRef',       key: 'rf', width: 130 },
    { title: 'Risk',      dataIndex: 'title',         key: 'ti' },
    { title: 'Category',  dataIndex: 'category',      key: 'ca', width: 120, render: v => <Tag>{v}</Tag> },
    { title: 'Inherent',  dataIndex: 'inherentRating', key: 'ir', width: 100, render: v => <Tag color={sevColor[v]}>{v}</Tag> },
    { title: 'Residual',  dataIndex: 'residualRating', key: 'rr', width: 100, render: v => v ? <Tag color={sevColor[v]}>{v}</Tag> : '—' },
    { title: 'Appetite ✓',dataIndex: 'withinAppetite', key: 'wa', width: 100, render: v => v ? <Tag color="green">Yes</Tag> : <Tag color="red">Breach</Tag> },
    { title: 'Treatment', dataIndex: 'treatment',     key: 'tr', width: 100 },
    { title: 'Status',    dataIndex: 'status',        key: 'st', width: 110, render: v => <Tag>{v?.replace('_',' ')}</Tag> }
  ];

  return (
    <>
      <HeatMap heatmap={data.heatmap || []} />
      <Card title="Risk register" extra={<Space><Button onClick={load}>Load</Button><Button type="primary" icon={<PlusOutlined />} onClick={() => setModal(true)}>Add risk</Button></Space>}>
        <Table loading={loading} columns={columns} dataSource={data.risks || []} rowKey="_id" pagination={{ pageSize: 10 }} locale={{ emptyText: 'Click Load' }} />
      </Card>
      <Modal open={modal} title="Add risk entry" onCancel={() => setModal(false)} footer={null} width={520}>
        <Form form={form} layout="vertical" onFinish={handleCreate} initialValues={{ category:'operational', inherentLikelihood:3, inherentImpact:3, riskAppetite:'cautious', treatment:'mitigate' }}>
          <Form.Item name="title"       label="Risk title"   rules={[{required:true}]}><Input /></Form.Item>
          <Form.Item name="description" label="Description"><Input.TextArea rows={2} /></Form.Item>
          <Row gutter={12}>
            <Col span={12}><Form.Item name="category" label="Category" rules={[{required:true}]}><Select options={['strategic','operational','financial','compliance','reputational','hsse','technology','third_party'].map(v=>({value:v,label:v}))} /></Form.Item></Col>
            <Col span={12}><Form.Item name="riskAppetite" label="Risk appetite"><Select options={['averse','minimal','cautious','open','hungry'].map(v=>({value:v,label:v}))} /></Form.Item></Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}><Form.Item name="inherentLikelihood" label="Likelihood (1-5)" rules={[{required:true}]}><InputNumber min={1} max={5} style={{width:'100%'}} /></Form.Item></Col>
            <Col span={12}><Form.Item name="inherentImpact" label="Impact (1-5)" rules={[{required:true}]}><InputNumber min={1} max={5} style={{width:'100%'}} /></Form.Item></Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}><Form.Item name="residualLikelihood" label="Residual likelihood"><InputNumber min={1} max={5} style={{width:'100%'}} /></Form.Item></Col>
            <Col span={12}><Form.Item name="residualImpact" label="Residual impact"><InputNumber min={1} max={5} style={{width:'100%'}} /></Form.Item></Col>
          </Row>
          <Form.Item name="treatment"    label="Treatment"><Select options={['accept','avoid','transfer','mitigate'].map(v=>({value:v,label:v}))} /></Form.Item>
          <Form.Item name="treatmentPlan" label="Treatment plan"><Input.TextArea rows={2} /></Form.Item>
          <Button type="primary" htmlType="submit" block>Add to register</Button>
        </Form>
      </Modal>
    </>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// AUDIT SCHEDULER TAB
// ─────────────────────────────────────────────────────────────────────────────
export const AuditSchedulerTab = () => {
  const [audits,  setAudits]  = useState([]);
  const [loading, setLoading] = useState(false);
  const [detail,  setDetail]  = useState(null);
  const [modal,   setModal]   = useState(false);
  const [findingModal, setFindingModal] = useState(false);
  const [form]        = Form.useForm();
  const [findingForm] = Form.useForm();

  const load = useCallback(async () => {
    try { setLoading(true); const r = await legalAPI.getAudits(); setAudits(r.data?.audits || []); }
    catch { message.error('Failed'); } finally { setLoading(false); }
  }, []);

  const loadDetail = async (id) => {
    try { const r = await legalAPI.getAudit(id); setDetail(r.data); }
    catch { message.error('Failed to load audit detail'); }
  };

  const handleCreate = async (v) => {
    try { await legalAPI.createAudit(v); message.success('Audit scheduled'); setModal(false); form.resetFields(); await load(); }
    catch (e) { message.error(e.response?.data?.message || 'Failed'); }
  };

  const handleAddFinding = async (v) => {
    try { await legalAPI.addFinding(detail._id, v); message.success('Finding added'); setFindingModal(false); findingForm.resetFields(); await loadDetail(detail._id); }
    catch (e) { message.error(e.response?.data?.message || 'Failed'); }
  };

  const statusColor = { planned:'blue', in_progress:'orange', completed:'green', cancelled:'default', overdue:'red' };
  const categoryColor = { major_nc:'red', minor_nc:'orange', observation:'blue', opportunity:'green' };

  const columns = [
    { title: 'Ref',     dataIndex: 'auditRef',   key: 'ar', width: 140 },
    { title: 'Title',   dataIndex: 'title',      key: 'ti' },
    { title: 'Type',    dataIndex: 'auditType',  key: 'at', width: 110, render: v => <Tag>{v?.replace('_',' ')}</Tag> },
    { title: 'Planned', dataIndex: 'plannedDate',key: 'pd', width: 110, render: fmtDate },
    { title: 'Status',  dataIndex: 'status',     key: 'st', width: 110, render: v => <Tag color={statusColor[v]}>{v?.replace('_',' ')}</Tag> },
    { title: 'Findings',dataIndex: 'totalFindings',key:'tf',width: 80 },
    { title: 'Result',  dataIndex: 'overallResult',key:'or',width: 110, render: v => <Tag color={v==='pass'?'green':v==='fail'?'red':v==='pending'?'default':'orange'}>{v}</Tag> },
    { title: '', key: 'action', width: 70, render: (_, r) => <Button size="small" onClick={() => loadDetail(r._id)}>Detail</Button> }
  ];

  return (
    <Row gutter={16}>
      <Col span={detail ? 12 : 24}>
        <Card title="Audit schedule" extra={<Space><Button onClick={load}>Load</Button><Button type="primary" icon={<PlusOutlined />} onClick={() => setModal(true)}>Schedule audit</Button></Space>}>
          <Table loading={loading} columns={columns} dataSource={audits} rowKey="_id" pagination={{ pageSize: 10 }} locale={{ emptyText: 'Click Load' }} />
        </Card>
      </Col>
      {detail && (
        <Col span={12}>
          <Card title={detail.auditRef} extra={
            <Space>
              <Button size="small" icon={<PlusOutlined />} onClick={() => setFindingModal(true)}>Add finding</Button>
              <Button size="small" onClick={() => setDetail(null)}>Close</Button>
            </Space>
          }>
            <Row gutter={12} style={{ marginBottom: 12 }}>
              <Col span={8}><Statistic title="Major NCs"    value={detail.majorNCs    || 0} valueStyle={{ color: '#cf1322' }} /></Col>
              <Col span={8}><Statistic title="Minor NCs"    value={detail.minorNCs    || 0} valueStyle={{ color: '#d46b08' }} /></Col>
              <Col span={8}><Statistic title="Observations" value={detail.observations|| 0} valueStyle={{ color: '#096dd9' }} /></Col>
            </Row>
            <Divider plain>Findings & CAPA</Divider>
            {(detail.findings || []).length === 0 ? <Text type="secondary">No findings yet</Text> :
              (detail.findings || []).map(f => (
                <div key={f._id} style={{ padding: '8px 0', borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
                  <Space><Tag color={categoryColor[f.category]}>{f.category?.replace('_',' ')}</Tag><Text style={{ fontSize: 13 }}>{f.description}</Text></Space>
                  {f.capa?.correctiveAction && <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 4 }}>CA: {f.capa.correctiveAction}</div>}
                  <Tag style={{ marginTop: 4 }} color={f.capa?.status === 'verified' ? 'green' : 'default'}>{f.capa?.status || 'pending'}</Tag>
                </div>
              ))}
          </Card>
        </Col>
      )}
      <Modal open={modal} title="Schedule audit" onCancel={() => setModal(false)} footer={null}>
        <Form form={form} layout="vertical" onFinish={handleCreate} initialValues={{ auditType:'internal', frequency:'annual', status:'planned' }}>
          <Form.Item name="title"       label="Audit title"   rules={[{required:true}]}><Input /></Form.Item>
          <Row gutter={12}>
            <Col span={12}><Form.Item name="auditType" label="Type" rules={[{required:true}]}><Select options={['internal','external','surveillance','certification','regulatory'].map(v=>({value:v,label:v}))} /></Form.Item></Col>
            <Col span={12}><Form.Item name="plannedDate" label="Planned date" rules={[{required:true}]}><Input type="date" /></Form.Item></Col>
          </Row>
          <Form.Item name="scope"     label="Scope"><Input /></Form.Item>
          <Form.Item name="standard"  label="Standard (e.g. ISO 9001)"><Input /></Form.Item>
          <Form.Item name="frequency" label="Frequency"><Select options={['one_off','monthly','quarterly','biannual','annual'].map(v=>({value:v,label:v.replace('_',' ')}))} /></Form.Item>
          <Button type="primary" htmlType="submit" block>Schedule</Button>
        </Form>
      </Modal>
      <Modal open={findingModal} title="Add finding" onCancel={() => setFindingModal(false)} footer={null}>
        <Form form={findingForm} layout="vertical" onFinish={handleAddFinding} initialValues={{ category:'minor_nc', riskLevel:'medium' }}>
          <Form.Item name="category"    label="Category" rules={[{required:true}]}><Select options={['major_nc','minor_nc','observation','opportunity'].map(v=>({value:v,label:v.replace('_',' ')}))} /></Form.Item>
          <Form.Item name="description" label="Description" rules={[{required:true}]}><Input.TextArea rows={3} /></Form.Item>
          <Form.Item name="riskLevel"   label="Risk level"><Select options={['low','medium','high','critical'].map(v=>({value:v,label:v}))} /></Form.Item>
          <Form.Item name="dueDate"     label="CAPA due date"><Input type="date" /></Form.Item>
          <Button type="primary" htmlType="submit" block>Add finding</Button>
        </Form>
      </Modal>
    </Row>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// INCIDENT MANAGEMENT TAB
// ─────────────────────────────────────────────────────────────────────────────
export const IncidentManagementTab = () => {
  const [incidents, setIncidents] = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [modal,     setModal]     = useState(false);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    try { setLoading(true); const r = await legalAPI.getIncidents(); setIncidents(r.data?.incidents || []); }
    catch { message.error('Failed'); } finally { setLoading(false); }
  }, []);

  const handleCreate = async (v) => {
    try { await legalAPI.createIncident({ ...v, reportedByName: v.reportedByName || '' }); message.success('Incident reported'); setModal(false); form.resetFields(); await load(); }
    catch (e) { message.error(e.response?.data?.message || 'Failed'); }
  };

  const handleClose = async (id) => {
    try { await legalAPI.closeIncident(id, { closureNotes: 'Closed' }); message.success('Incident closed'); await load(); }
    catch (e) { message.error(e.response?.data?.message || 'Failed'); }
  };

  const statusColor = { open:'orange', under_investigation:'blue', action_pending:'purple', closed:'green', archived:'default' };
  const typeColor   = { accident:'red', near_miss:'orange', environmental:'green', security_breach:'red', data_breach:'red', regulatory_breach:'red', conduct:'purple', other:'default' };

  const columns = [
    { title: 'Ref',      dataIndex: 'incidentRef', key: 'ir', width: 140 },
    { title: 'Title',    dataIndex: 'title',       key: 'ti' },
    { title: 'Type',     dataIndex: 'incidentType',key: 'it', width: 130, render: v => <Tag color={typeColor[v]}>{v?.replace('_',' ')}</Tag> },
    { title: 'Severity', dataIndex: 'severity',    key: 'sv', width: 100, render: v => <Tag color={sevColor[v]}>{v}</Tag> },
    { title: 'Occurred', dataIndex: 'occurredAt',  key: 'oa', width: 110, render: fmtDate },
    { title: 'Status',   dataIndex: 'status',      key: 'st', width: 130, render: v => <Tag color={statusColor[v]}>{v?.replace('_',' ')}</Tag> },
    { title: 'Injuries', dataIndex: 'injuries',    key: 'inj',width: 80,  render: v => v ? <Tag color="red">Yes</Tag> : <Tag>No</Tag> },
    { title: '', key: 'actions', width: 90, render: (_, r) => !['closed','archived'].includes(r.status) &&
      <Popconfirm title="Close incident?" onConfirm={() => handleClose(r._id)}><Button size="small" type="link">Close</Button></Popconfirm> }
  ];

  return (
    <Card title="Incident register" extra={<Space><Button onClick={load}>Load</Button><Button type="primary" icon={<PlusOutlined />} onClick={() => setModal(true)}>Report incident</Button></Space>}>
      <Alert type="info" showIcon style={{ marginBottom: 12 }} message="Near-miss reporting is encouraged and protected. All fields marked required must be completed within 24 hours of the incident." />
      <Table loading={loading} columns={columns} dataSource={incidents} rowKey="_id" pagination={{ pageSize: 10 }} locale={{ emptyText: 'Click Load' }} />
      <Modal open={modal} title="Report incident / near-miss" onCancel={() => setModal(false)} footer={null} width={520}>
        <Form form={form} layout="vertical" onFinish={handleCreate} initialValues={{ incidentType:'near_miss', severity:'medium', injuries: false }}>
          <Form.Item name="title"       label="Title"         rules={[{required:true}]}><Input /></Form.Item>
          <Form.Item name="description" label="Description"   rules={[{required:true}]}><Input.TextArea rows={3} /></Form.Item>
          <Row gutter={12}>
            <Col span={12}><Form.Item name="incidentType" label="Type" rules={[{required:true}]}><Select options={['accident','near_miss','environmental','security_breach','data_breach','property_damage','regulatory_breach','conduct','other'].map(v=>({value:v,label:v.replace('_',' ')}))} /></Form.Item></Col>
            <Col span={12}><Form.Item name="severity" label="Severity" rules={[{required:true}]}><Select options={['low','medium','high','critical','fatality'].map(v=>({value:v,label:v}))} /></Form.Item></Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}><Form.Item name="occurredAt" label="Date occurred" rules={[{required:true}]}><Input type="datetime-local" /></Form.Item></Col>
            <Col span={12}><Form.Item name="location"   label="Location"><Input /></Form.Item></Col>
          </Row>
          <Form.Item name="injuries" label="Injuries?"><Select options={[{value:false,label:'No'},{value:true,label:'Yes'}]} /></Form.Item>
          <Form.Item name="injuryDetails" label="Injury details (if applicable)"><Input.TextArea rows={2} /></Form.Item>
          <Form.Item name="estimatedLoss" label="Estimated loss (XAF)"><InputNumber min={0} style={{width:'100%'}} /></Form.Item>
          <Form.Item name="regulatoryNotificationRequired" label="Regulatory notification required?"><Select options={[{value:false,label:'No'},{value:true,label:'Yes'}]} /></Form.Item>
          <Button type="primary" htmlType="submit" block>Submit report</Button>
        </Form>
      </Modal>
    </Card>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// POLICY MANAGEMENT TAB
// ─────────────────────────────────────────────────────────────────────────────
export const PolicyManagementTab = () => {
  const [policies, setPolicies] = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [modal,    setModal]    = useState(false);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    try { setLoading(true); const r = await legalAPI.getPolicies(); setPolicies(r.data?.policies || []); }
    catch { message.error('Failed'); } finally { setLoading(false); }
  }, []);

  const handleCreate = async (v) => {
    try { await legalAPI.createPolicy(v); message.success('Policy created'); setModal(false); form.resetFields(); await load(); }
    catch (e) { message.error(e.response?.data?.message || 'Failed'); }
  };

  const handleAcknowledge = async (id) => {
    try { await legalAPI.acknowledgePolicy(id, {}); message.success('Policy acknowledged'); await load(); }
    catch (e) { message.error(e.response?.data?.message || 'Failed'); }
  };

  const columns = [
    { title: 'Ref',      dataIndex: 'policyRef',      key: 'pr', width: 120 },
    { title: 'Title',    dataIndex: 'title',           key: 'ti' },
    { title: 'Category', dataIndex: 'category',        key: 'ca', width: 140, render: v => <Tag>{v?.replace('_',' ')}</Tag> },
    { title: 'Version',  dataIndex: 'currentVersion',  key: 'cv', width: 80 },
    { title: 'Coverage', dataIndex: 'coveragePct',     key: 'cp', width: 130,
      render: v => <Progress percent={v || 0} size="small" strokeColor={v >= 80 ? '#52c41a' : v >= 60 ? '#faad14' : '#ff4d4f'} /> },
    { title: 'Next review', dataIndex: 'nextReviewDue',key:'nr', width: 110, render: fmtDate },
    { title: 'Status',   dataIndex: 'status',          key: 'st', width: 100, render: v => <Tag color={v==='active'?'green':v==='draft'?'default':'orange'}>{v}</Tag> },
    { title: '', key: 'actions', width: 80,
      render: (_, r) => <Button size="small" onClick={() => handleAcknowledge(r._id)}>Acknowledge</Button> }
  ];

  return (
    <Card title="Policy register" extra={<Space><Button onClick={load}>Load</Button><Button type="primary" icon={<PlusOutlined />} onClick={() => setModal(true)}>New policy</Button></Space>}>
      <Table loading={loading} columns={columns} dataSource={policies} rowKey="_id" pagination={{ pageSize: 10 }} locale={{ emptyText: 'Click Load' }} />
      <Modal open={modal} title="Create policy" onCancel={() => setModal(false)} footer={null}>
        <Form form={form} layout="vertical" onFinish={handleCreate} initialValues={{ status:'draft', mandatoryFor:'all_staff', reviewFrequencyDays:365 }}>
          <Form.Item name="title"    label="Policy title" rules={[{required:true}]}><Input /></Form.Item>
          <Form.Item name="category" label="Category"     rules={[{required:true}]}>
            <Select options={['hsse','hr','data_protection','anti_bribery','financial','environmental','quality','information_security','code_of_conduct','other'].map(v=>({value:v,label:v.replace('_',' ')}))} />
          </Form.Item>
          <Form.Item name="scope"          label="Scope (who it applies to)"><Input /></Form.Item>
          <Form.Item name="mandatoryFor"   label="Mandatory for">
            <Select options={['all_staff','management','specific_roles','specific_departments'].map(v=>({value:v,label:v.replace('_',' ')}))} />
          </Form.Item>
          <Form.Item name="totalRequired"  label="Total staff required to acknowledge"><InputNumber min={0} style={{width:'100%'}} /></Form.Item>
          <Form.Item name="reviewFrequencyDays" label="Review frequency (days)"><InputNumber min={1} style={{width:'100%'}} /></Form.Item>
          <Button type="primary" htmlType="submit" block>Create policy</Button>
        </Form>
      </Modal>
    </Card>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// WHISTLEBLOWING TAB
// ─────────────────────────────────────────────────────────────────────────────
export const WhistleblowingTab = () => {
  const [cases,    setCases]    = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [reportModal, setReportModal] = useState(false);
  const [statusModal, setStatusModal] = useState(false);
  const [token,    setToken]    = useState('');
  const [tokenResult, setTokenResult] = useState(null);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    try { setLoading(true); const r = await legalAPI.getWBCases(); setCases(r.data?.cases || []); }
    catch { message.error('Failed'); } finally { setLoading(false); }
  }, []);

  const handleSubmit = async (v) => {
    try {
      const r = await legalAPI.submitWhistleblowReport(v);
      message.success(`Report submitted. Your token: ${r.data?.reporterToken} — save this to check your status.`);
      setReportModal(false); form.resetFields();
    } catch (e) { message.error(e.response?.data?.message || 'Failed'); }
  };

  const handleCheckStatus = async () => {
    try { const r = await legalAPI.checkWBStatus(token); setTokenResult(r.data); }
    catch { message.error('Token not found'); }
  };

  const columns = [
    { title: 'Ref',      dataIndex: 'caseRef',   key: 'cr', width: 140 },
    { title: 'Category', dataIndex: 'category',  key: 'ca', width: 140, render: v => <Tag>{v?.replace('_',' ')}</Tag> },
    { title: 'Status',   dataIndex: 'status',    key: 'st', width: 180, render: v => <Tag>{v?.replace(/_/g,' ')}</Tag> },
    { title: 'Anonymous',dataIndex: 'isAnonymous',key:'ia', width: 90,  render: v => v ? <LockOutlined title="Anonymous" /> : '—' },
    { title: 'Received', dataIndex: 'createdAt', key: 'da', width: 110, render: fmtDate }
  ];

  return (
    <>
      <Alert type="warning" showIcon style={{ marginBottom: 16 }}
        message="Whistleblowing cases are confidential. Case details are restricted to assigned investigators and compliance leadership only." />
      <Row gutter={12} style={{ marginBottom: 16 }}>
        <Col span={12}>
          <Button type="primary" icon={<SafetyCertificateOutlined />} block onClick={() => setReportModal(true)}>Submit anonymous report</Button>
        </Col>
        <Col span={12}>
          <Button block onClick={() => setStatusModal(true)}>Check report status (by token)</Button>
        </Col>
      </Row>
      <Card title="Whistleblowing cases — management view" extra={<Button onClick={load}>Load</Button>}>
        <Table loading={loading} columns={columns} dataSource={cases} rowKey="_id" pagination={{ pageSize: 10 }} locale={{ emptyText: 'Click Load' }} />
      </Card>

      <Modal open={reportModal} title="Submit a confidential report" onCancel={() => setReportModal(false)} footer={null}>
        <Alert type="info" showIcon style={{ marginBottom: 12 }} message="Your identity will be protected. You will receive a token to track your report anonymously." />
        <Form form={form} layout="vertical" onFinish={handleSubmit} initialValues={{ isAnonymous: true }}>
          <Form.Item name="category" label="Category" rules={[{required:true}]}>
            <Select options={['fraud','bribery_corruption','harassment','discrimination','health_safety','environmental','data_misuse','financial_misconduct','conflict_of_interest','other'].map(v=>({value:v,label:v.replace(/_/g,' ')}))} />
          </Form.Item>
          <Form.Item name="description" label="Describe the concern (be as specific as possible)" rules={[{required:true}]}>
            <Input.TextArea rows={5} />
          </Form.Item>
          <Form.Item name="allegedParties" label="Alleged parties (names or job titles — no IDs)">
            <Input placeholder="e.g. Senior manager in Finance department" />
          </Form.Item>
          <Form.Item name="contactPreference" label="How should we contact you if we need more information?">
            <Select options={[{value:'none',label:'No contact — stay fully anonymous'},{value:'email_only',label:'Email only'},{value:'phone',label:'Phone'}]} />
          </Form.Item>
          <Button type="primary" htmlType="submit" block>Submit report</Button>
        </Form>
      </Modal>

      <Modal open={statusModal} title="Check report status" onCancel={() => { setStatusModal(false); setTokenResult(null); setToken(''); }} footer={null}>
        <Space.Compact style={{ width: '100%', marginBottom: 16 }}>
          <Input value={token} onChange={e => setToken(e.target.value.toUpperCase())} placeholder="Enter your reporter token" />
          <Button type="primary" onClick={handleCheckStatus}>Check</Button>
        </Space.Compact>
        {tokenResult && (
          <Card size="small">
            <Text strong>Ref: </Text><Text>{tokenResult.caseRef}</Text><br />
            <Text strong>Status: </Text><Tag>{tokenResult.status?.replace(/_/g,' ')}</Tag>
            {(tokenResult.reporterUpdates || []).length > 0 && (
              <>
                <Divider plain>Updates from investigator</Divider>
                <Timeline items={(tokenResult.reporterUpdates || []).map(u => ({ children: <><Text type="secondary" style={{fontSize:12}}>{fmtDate(u.updateDate)}</Text><br />{u.message}</> }))} />
              </>
            )}
          </Card>
        )}
      </Modal>
    </>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// DATA PRIVACY TAB
// ─────────────────────────────────────────────────────────────────────────────
export const DataPrivacyTab = () => {
  const [record,  setRecord]  = useState(null);
  const [loading, setLoading] = useState(false);
  const [modal,   setModal]   = useState(null);  // 'processing' | 'breach' | 'sar' | 'dpia'
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    try { setLoading(true); const r = await legalAPI.getPrivacyRecord(); setRecord(r.data); }
    catch { message.error('Failed'); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async (type, values) => {
    try {
      if (type === 'processing') await legalAPI.addProcessingActivity(values);
      else if (type === 'breach') await legalAPI.addDataBreach(values);
      else if (type === 'sar')    await legalAPI.addSAR(values);
      else if (type === 'dpia')   await legalAPI.addDPIA(values);
      message.success('Added'); setModal(null); form.resetFields(); await load();
    } catch (e) { message.error(e.response?.data?.message || 'Failed'); }
  };

  const breachCols = [
    { title: 'Ref',      dataIndex: 'breachRef',     key: 'br', width: 160 },
    { title: 'Title',    dataIndex: 'title',          key: 'ti' },
    { title: 'Severity', dataIndex: 'severity',       key: 'sv', width: 100, render: v => <Tag color={sevColor[v]}>{v}</Tag> },
    { title: 'Notification', key: 'notif', width: 120,
      render: (_, r) => r.notificationRequired && !r.notifiedAuthority
        ? <Tag color="red">Overdue</Tag> : r.notifiedAuthority ? <Tag color="green">Sent</Tag> : <Tag>N/A</Tag> },
    { title: 'Status',   dataIndex: 'status',         key: 'st', width: 100, render: v => <Tag>{v}</Tag> }
  ];

  const sarCols = [
    { title: 'Ref',      dataIndex: 'sarRef',         key: 'sr', width: 140 },
    { title: 'Type',     dataIndex: 'requestType',    key: 'rt', width: 120, render: v => <Tag>{v}</Tag> },
    { title: 'Received', dataIndex: 'receivedAt',     key: 'ra', width: 110, render: fmtDate },
    { title: 'Deadline', dataIndex: 'deadline',       key: 'dl', width: 110,
      render: (v) => { const overdue = v && new Date(v) < new Date(); return <Text type={overdue ? 'danger' : undefined}>{fmtDate(v)}</Text>; } },
    { title: 'Status',   dataIndex: 'status',         key: 'st', width: 110, render: v => <Tag color={v==='completed'?'green':v==='refused'?'red':'default'}>{v}</Tag> }
  ];

  return (
    <Card title="Data privacy register" extra={<Button onClick={load} loading={loading}>Refresh</Button>}>
      <Row gutter={12} style={{ marginBottom: 16 }}>
        {[
          { label:'Processing activities', count: record?.processingActivities?.length || 0, btn:'+ Activity', type:'processing' },
          { label:'DPIAs',                  count: record?.dpias?.length || 0,                btn:'+ DPIA',     type:'dpia' },
          { label:'Data breaches',          count: record?.breaches?.length || 0,             btn:'+ Breach',   type:'breach', color: (record?.breaches?.length || 0) > 0 ? '#cf1322' : undefined },
          { label:'Subject access requests',count: record?.sars?.length || 0,                btn:'+ SAR',      type:'sar' }
        ].map(k => (
          <Col key={k.label} span={6}>
            <Card size="small">
              <Statistic title={k.label} value={k.count} valueStyle={{ color: k.color }} />
              <Button size="small" style={{ marginTop: 8 }} onClick={() => { setModal(k.type); form.resetFields(); }}>{k.btn}</Button>
            </Card>
          </Col>
        ))}
      </Row>

      <Title level={5} style={{ marginTop: 16 }}>Data breaches</Title>
      <Table size="small" dataSource={record?.breaches || []} columns={breachCols} rowKey="breachRef" pagination={{ pageSize: 5 }} locale={{ emptyText: 'No breaches recorded' }} />

      <Title level={5} style={{ marginTop: 16 }}>Subject access requests</Title>
      <Table size="small" dataSource={record?.sars || []} columns={sarCols} rowKey="sarRef" pagination={{ pageSize: 5 }} locale={{ emptyText: 'No SARs recorded' }} />

      {/* Dynamic modal */}
      <Modal open={!!modal} title={{ processing:'Add processing activity', breach:'Record data breach', sar:'Record subject access request', dpia:'Add DPIA' }[modal]} onCancel={() => setModal(null)} footer={null}>
        <Form form={form} layout="vertical" onFinish={v => handleAdd(modal, v)}>
          {modal === 'processing' && <>
            <Form.Item name="processingActivity" label="Activity name" rules={[{required:true}]}><Input /></Form.Item>
            <Form.Item name="purpose"    label="Purpose"       rules={[{required:true}]}><Input /></Form.Item>
            <Form.Item name="legalBasis" label="Legal basis"   rules={[{required:true}]}><Select options={['consent','contract','legal_obligation','vital_interests','public_task','legitimate_interests'].map(v=>({value:v,label:v.replace('_',' ')}))} /></Form.Item>
            <Form.Item name="retentionPeriod" label="Retention period"><Input placeholder="e.g. 7 years" /></Form.Item>
            <Form.Item name="thirdCountryTransfer" label="Third country transfer?"><Select options={[{value:false,label:'No'},{value:true,label:'Yes'}]} /></Form.Item>
          </>}
          {modal === 'breach' && <>
            <Form.Item name="title"       label="Breach title"   rules={[{required:true}]}><Input /></Form.Item>
            <Form.Item name="description" label="Description"    rules={[{required:true}]}><Input.TextArea rows={3} /></Form.Item>
            <Form.Item name="discoveredAt" label="Discovered at"  rules={[{required:true}]}><Input type="datetime-local" /></Form.Item>
            <Row gutter={12}>
              <Col span={12}><Form.Item name="severity" label="Severity" rules={[{required:true}]}><Select options={['low','medium','high','critical'].map(v=>({value:v,label:v}))} /></Form.Item></Col>
              <Col span={12}><Form.Item name="breachType" label="Type" rules={[{required:true}]}><Select options={['confidentiality','integrity','availability'].map(v=>({value:v,label:v}))} /></Form.Item></Col>
            </Row>
            <Form.Item name="notificationRequired" label="72-hour notification required?"><Select options={[{value:false,label:'No'},{value:true,label:'Yes — 72h clock starts now'}]} /></Form.Item>
          </>}
          {modal === 'sar' && <>
            <Form.Item name="requestType"   label="Request type"   rules={[{required:true}]}><Select options={['access','rectification','erasure','portability','restriction','objection'].map(v=>({value:v,label:v}))} /></Form.Item>
            <Form.Item name="subjectName"   label="Subject name"><Input /></Form.Item>
            <Form.Item name="subjectEmail"  label="Subject email"><Input type="email" /></Form.Item>
            <Form.Item name="receivedAt"    label="Received at" rules={[{required:true}]}><Input type="date" /></Form.Item>
            <Alert type="info" message="A 30-day response deadline will be set automatically." showIcon />
          </>}
          {modal === 'dpia' && <>
            <Form.Item name="title"       label="DPIA title"   rules={[{required:true}]}><Input /></Form.Item>
            <Form.Item name="description" label="Description"><Input.TextArea rows={3} /></Form.Item>
            <Form.Item name="necessityTest" label="Necessity test"><Input.TextArea rows={2} /></Form.Item>
            <Form.Item name="dpoConsulted" label="DPO consulted?"><Select options={[{value:false,label:'No'},{value:true,label:'Yes'}]} /></Form.Item>
          </>}
          <Button type="primary" htmlType="submit" block style={{ marginTop: 12 }}>Save</Button>
        </Form>
      </Modal>
    </Card>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// TRAINING & COMPETENCY TAB
// ─────────────────────────────────────────────────────────────────────────────
export const TrainingTab = () => {
  const [records,  setRecords]  = useState([]);
  const [gapData,  setGapData]  = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [activeView, setActiveView] = useState('register');

  const load = useCallback(async () => {
    try { setLoading(true); const r = await legalAPI.getTrainingRecords(); setRecords(r.data?.records || []); }
    catch { message.error('Failed'); } finally { setLoading(false); }
  }, []);

  const loadGaps = async () => {
    try { setLoading(true); const r = await legalAPI.getGapAnalysis(); setGapData(r.data); }
    catch { message.error('Failed'); } finally { setLoading(false); }
  };

  const registerCols = [
    { title: 'Staff member', dataIndex: ['userId','fullName'], key: 'nm', render: (_, r) => r.userId?.fullName || r.userName },
    { title: 'Department',   dataIndex: 'department',          key: 'dp', width: 140 },
    { title: 'Sessions',     key: 'sessions', width: 80,  render: (_, r) => r.trainingSessions?.length || 0 },
    { title: 'Certs',        key: 'certs',    width: 70,  render: (_, r) => r.certifications?.length || 0 },
    { title: 'Expired certs',key: 'expired',  width: 100, render: (_, r) => { const n = (r.certifications||[]).filter(c=>c.isExpired).length; return n > 0 ? <Tag color="red">{n}</Tag> : <Tag color="green">0</Tag>; } },
    { title: 'Competency gaps',key:'gaps',   width: 120, render: (_, r) => { const g = r.competenciesWithGaps || 0; return g > 0 ? <Tag color="orange">{g} gaps</Tag> : <Tag color="green">OK</Tag>; } }
  ];

  const gapCols = [
    { title: 'Competency', dataIndex: 'competency', key: 'co' },
    { title: 'Category',   dataIndex: 'category',   key: 'ca', width: 120, render: v => <Tag>{v}</Tag> },
    { title: 'Staff assessed', dataIndex: 'totalAssessed', key: 'ta', width: 120 },
    { title: 'With gaps',  dataIndex: 'gaps',        key: 'ga', width: 100 },
    { title: 'Avg gap',    dataIndex: 'avgGap',      key: 'ag', width: 100,
      render: v => <Tag color={v > 2 ? 'red' : v > 1 ? 'orange' : 'green'}>{v}</Tag> }
  ];

  return (
    <Card title="Training & competency" extra={
      <Space>
        <Button onClick={() => { setActiveView('register'); load(); }}>Register</Button>
        <Button onClick={() => { setActiveView('gaps'); loadGaps(); }}>Gap analysis</Button>
      </Space>
    }>
      {activeView === 'register' && (
        <Table loading={loading} columns={registerCols} dataSource={records} rowKey="_id" pagination={{ pageSize: 10 }} locale={{ emptyText: 'Click Register to load' }} />
      )}
      {activeView === 'gaps' && gapData && (
        <>
          <Alert type="info" showIcon style={{ marginBottom: 12 }} message={`Organisation-wide gap analysis across ${gapData.totalStaff} staff members`} />
          <Table loading={loading} columns={gapCols} dataSource={gapData.gaps || []} rowKey="competency" pagination={{ pageSize: 15 }} />
        </>
      )}
    </Card>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SUPPLIER MONITORING TAB
// ─────────────────────────────────────────────────────────────────────────────
export const SupplierMonitoringTab = () => {
  const [records,  setRecords]  = useState([]);
  const [loading,  setLoading]  = useState(false);

  const load = useCallback(async () => {
    try { setLoading(true); const r = await legalAPI.getSupplierMonitoring(); setRecords(r.data?.records || []); }
    catch { message.error('Failed'); } finally { setLoading(false); }
  }, []);

  const handleSanctionsCheck = async (id, result) => {
    try {
      await legalAPI.runSanctionsCheck(id, { result, source: 'Manual check' });
      message.success(`Sanctions check recorded: ${result}`); await load();
    } catch (e) { message.error(e.response?.data?.message || 'Failed'); }
  };

  const columns = [
    { title: 'Supplier', dataIndex: 'supplierName', key: 'sn' },
    { title: 'Score',    dataIndex: 'complianceScore', key: 'cs', width: 120,
      render: v => <Progress percent={v || 0} size="small" strokeColor={v >= 80 ? '#52c41a' : v >= 60 ? '#faad14' : '#ff4d4f'} /> },
    { title: 'Sanctions',dataIndex: 'sanctionsCheckResult', key: 'sc', width: 100,
      render: v => <Tag color={v==='clear'?'green':v==='flagged'?'red':'default'}>{v?.replace('_',' ')}</Tag> },
    { title: 'Blacklisted',dataIndex:'isBlacklisted', key:'bl', width: 90, render: v => v ? <Tag color="red">Yes</Tag> : <Tag color="green">No</Tag> },
    { title: 'Next review', dataIndex:'nextReviewDue', key:'nr', width: 110, render: fmtDate },
    { title: 'Alerts',  key: 'alerts', width: 80, render: (_, r) => { const n = (r.alerts||[]).filter(a=>!a.resolved).length; return n > 0 ? <Badge count={n} color="red" /> : null; } },
    { title: '', key: 'actions', width: 160,
      render: (_, r) => (
        <Space size={4}>
          <Popconfirm title="Mark as clear?" onConfirm={() => handleSanctionsCheck(r._id, 'clear')}><Button size="small">Clear</Button></Popconfirm>
          <Popconfirm title="Flag as sanctioned?" onConfirm={() => handleSanctionsCheck(r._id, 'flagged')}><Button size="small" danger>Flag</Button></Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <Card title="Supplier compliance monitoring" extra={<Button onClick={load}>Load</Button>}>
      <Alert type="info" showIcon style={{ marginBottom: 12 }} message="Sanctions checks should be run on all active suppliers at least annually and before any new contract is signed." />
      <Table loading={loading} columns={columns} dataSource={records} rowKey="_id" pagination={{ pageSize: 10 }} locale={{ emptyText: 'Click Load to fetch' }} />
    </Card>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPLIANCE SUMMARY REPORT TAB
// ─────────────────────────────────────────────────────────────────────────────
export const ComplianceSummaryTab = () => {
  const [report,   setReport]   = useState(null);
  const [loading,  setLoading]  = useState(false);

  const load = useCallback(async () => {
    try { setLoading(true); const r = await legalAPI.getComplianceSummary(); setReport(r.data); }
    catch { message.error('Failed'); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (!report) return <Button onClick={load} loading={loading}>Generate report</Button>;

  const KPI = ({ title, value, sub, color }) => (
    <Col xs={12} sm={8} md={6} style={{ marginBottom: 12 }}>
      <Card size="small" bodyStyle={{ padding: '10px 12px' }}>
        <Statistic title={<span style={{ fontSize: 11 }}>{title}</span>} value={value}
          precision={0} valueStyle={{ fontSize: 16, color }} />
        {sub && <Text type="secondary" style={{ fontSize: 11 }}>{sub}</Text>}
      </Card>
    </Col>
  );

  return (
    <Card title="Board compliance summary report" extra={
      <Space>
        <Text type="secondary" style={{ fontSize: 12 }}>Generated: {fmtDate(report.generatedAt)}</Text>
        <Button onClick={load} loading={loading} icon={<ReloadOutlined />}>Refresh</Button>
      </Space>
    }>
      <Alert type={report.risks?.critical > 0 ? 'error' : report.risks?.open > 0 ? 'warning' : 'success'}
        showIcon style={{ marginBottom: 16 }}
        message={report.risks?.critical > 0 ? `${report.risks.critical} critical risks require immediate board attention.` :
          report.risks?.open > 0 ? `${report.risks.open} open risks — none critical.` : 'All risks within tolerance.'} />

      <Row gutter={12}>
        <KPI title="Open risks"          value={report.risks?.open}          color={report.risks?.open > 0 ? '#cf1322' : '#389e0d'} />
        <KPI title="Critical risks"      value={report.risks?.critical}      color={report.risks?.critical > 0 ? '#cf1322' : '#389e0d'} />
        <KPI title="Within risk appetite" value={report.risks?.withinAppetite} color="#096dd9" sub="risks within tolerance" />
        <KPI title="Open incidents"      value={report.incidents?.open}      color={report.incidents?.open > 0 ? '#d46b08' : '#389e0d'} />
        <KPI title="Scheduled audits"   value={report.audits?.open}         color="#096dd9" />
        <KPI title="Overdue CAPAs"      value={report.audits?.overdueCapas} color={report.audits?.overdueCapas > 0 ? '#cf1322' : '#389e0d'} />
        <KPI title="Open WB cases"      value={report.whistleblowing?.open} color={report.whistleblowing?.open > 0 ? '#d46b08' : '#389e0d'} />
        <KPI title="Active policies"    value={report.policies?.active}     color="#096dd9" />
        <KPI title="Policies below 80% coverage" value={report.policies?.belowCoverage} color={report.policies?.belowCoverage > 0 ? '#d46b08' : '#389e0d'} />
        <KPI title="Open SARs"          value={report.privacy?.openSARs}    color={report.privacy?.openSARs > 0 ? '#d46b08' : '#389e0d'} />
        <KPI title="Open data breaches" value={report.privacy?.openBreaches} color={report.privacy?.openBreaches > 0 ? '#cf1322' : '#389e0d'} />
        <KPI title="Blacklisted suppliers" value={report.suppliers?.blacklisted} color={report.suppliers?.blacklisted > 0 ? '#cf1322' : '#389e0d'} />
        <KPI title="Expired certifications" value={report.training?.expiredCerts} color={report.training?.expiredCerts > 0 ? '#d46b08' : '#389e0d'} />
        <KPI title="Open risk cases"    value={report.riskCases?.open}      color={report.riskCases?.open > 0 ? '#d46b08' : '#389e0d'} />
      </Row>
    </Card>
  );
};
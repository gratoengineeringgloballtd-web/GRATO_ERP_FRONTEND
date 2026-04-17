// pages/legal/LegalComplianceCenter.js
// Route: /legal  (add to App.js)
import React, { useEffect, useState, useCallback } from 'react';
import {
  Alert, Badge, Button, Card, Col, Form, Input, InputNumber,
  message, Modal, Popconfirm, Progress, Row, Select,
  Space, Table, Tabs, Tag, Typography, Statistic, Divider
} from 'antd';
import {
  AuditOutlined, ExclamationCircleOutlined, FileProtectOutlined,
  PlusOutlined, ReloadOutlined, SafetyCertificateOutlined,
  WarningOutlined, CheckCircleOutlined
} from '@ant-design/icons';
import {
  RiskMatrixTab,
  AuditSchedulerTab,
  IncidentManagementTab,
  PolicyManagementTab,
  WhistleblowingTab,
  DataPrivacyTab,
  TrainingTab,
  SupplierMonitoringTab,
  ComplianceSummaryTab
} from './ComplianceGapTabs';
import { legalAPI } from '../../services/api';
import SDDFormPage from './SDDFormPage';

const { Title, Text } = Typography;
const fmtDate = (v) => v ? new Date(v).toLocaleDateString() : '—';
const today   = new Date().toISOString().slice(0, 10);

const severityColor = { low: 'blue', medium: 'orange', high: 'red', critical: 'red' };
const statusColor   = {
  open: 'orange', under_review: 'blue', resolved: 'green', escalated: 'red', closed: 'default',
  compliant: 'green', non_compliant: 'red', under_review_reg: 'blue', not_applicable: 'default',
  active: 'green', expired: 'red', pending_renewal: 'orange', archived: 'default',
  draft: 'default', submitted: 'blue', approved: 'green', rejected: 'red',
  registered: 'green', pending: 'orange', abandoned: 'default'
};

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD TAB
// ─────────────────────────────────────────────────────────────────────────────
const DashboardTab = ({ onRefresh }) => {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    try { setLoading(true); const r = await legalAPI.getDashboard(); setData(r.data); }
    catch { message.error('Failed to load dashboard'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (!data) return <Button onClick={load} loading={loading}>Load dashboard</Button>;
  const { kpis, recentRisks, reviewsDue } = data;

  return (
    <>
      <Row gutter={12} style={{ marginBottom: 16 }}>
        {[
          { title: 'Open risk cases',     value: kpis.openRisks,             color: kpis.openRisks > 0 ? '#cf1322' : '#389e0d' },
          { title: 'Critical risks',      value: kpis.criticalRisks,         color: kpis.criticalRisks > 0 ? '#cf1322' : '#389e0d' },
          { title: 'Docs expiring (30d)', value: kpis.expiringDocs,          color: kpis.expiringDocs > 0 ? '#d46b08' : '#389e0d' },
          { title: 'Active contracts',    value: kpis.activeContracts,       color: '#096dd9' },
          { title: 'Pending SDDs',        value: kpis.pendingSDDs,           color: kpis.pendingSDDs > 0 ? '#d46b08' : '#389e0d' },
          { title: 'Non-compliant regs',  value: kpis.regulatoryNonCompliant,color: kpis.regulatoryNonCompliant > 0 ? '#cf1322' : '#389e0d' },
          { title: 'IP at risk',          value: kpis.ipAtRisk,              color: kpis.ipAtRisk > 0 ? '#cf1322' : '#389e0d' }
        ].map(k => (
          <Col key={k.title} xs={12} sm={8} md={3} style={{ marginBottom: 12 }}>
            <Card size="small" bodyStyle={{ padding: '10px 12px' }}>
              <Statistic title={<span style={{ fontSize: 11 }}>{k.title}</span>}
                value={k.value} precision={0} valueStyle={{ fontSize: 16, color: k.color }} />
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Card size="small" title="Recent open risk cases">
            {recentRisks.length === 0 ? <Text type="secondary">No open risk cases</Text> : (
              recentRisks.map(r => (
                <div key={r._id} style={{ padding: '6px 0', borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
                  <Space>
                    <Tag color={severityColor[r.severity]}>{r.severity}</Tag>
                    <Text style={{ fontSize: 13 }}>{r.title}</Text>
                    <Text type="secondary" style={{ fontSize: 11 }}>{r.module}</Text>
                  </Space>
                </div>
              ))
            )}
          </Card>
        </Col>
        <Col span={12}>
          <Card size="small" title="Document reviews due">
            {reviewsDue.length === 0 ? <Text type="secondary">No reviews due soon</Text> : (
              reviewsDue.map(d => (
                <div key={d._id} style={{ padding: '6px 0', borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
                  <Space>
                    <Tag color="orange">{fmtDate(d.nextReviewDue)}</Tag>
                    <Text style={{ fontSize: 13 }}>{d.name}</Text>
                    <Text type="secondary" style={{ fontSize: 11 }}>{d.module}</Text>
                  </Space>
                </div>
              ))
            )}
          </Card>
        </Col>
      </Row>
    </>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// RISK CASES TAB
// ─────────────────────────────────────────────────────────────────────────────
const RiskCasesTab = ({ module }) => {
  const [cases, setCases]   = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    try { setLoading(true); const r = await legalAPI.getRiskCases({ module }); setCases(r.data?.cases || []); }
    catch { message.error('Failed to load risk cases'); }
    finally { setLoading(false); }
  }, [module]);

  const handleCreate = async (values) => {
    try {
      await legalAPI.createRiskCase({ ...values, module });
      message.success('Risk case created');
      setModalOpen(false); form.resetFields(); await load();
    } catch (e) { message.error(e.response?.data?.message || 'Failed'); }
  };

  const handleResolve = async (id) => {
    try {
      await legalAPI.resolveRiskCase(id, { resolutionNotes: 'Resolved' });
      message.success('Risk case resolved'); await load();
    } catch (e) { message.error(e.response?.data?.message || 'Failed'); }
  };

  const columns = [
    { title: 'Case #',     dataIndex: 'caseNumber',      key: 'cn', width: 140 },
    { title: 'Title',      dataIndex: 'title',           key: 'ti' },
    { title: 'Type',       dataIndex: 'classification',  key: 'cl', width: 140,
      render: v => <Tag color={v === 'outbreak' ? 'red' : v === 'pre_outbreak' ? 'orange' : 'blue'}>{v?.replace('_',' ')}</Tag> },
    { title: 'Severity',   dataIndex: 'severity',        key: 'sv', width: 100,
      render: v => <Tag color={severityColor[v]}>{v}</Tag> },
    { title: 'Status',     dataIndex: 'status',          key: 'st', width: 120,
      render: v => <Tag color={statusColor[v]}>{v?.replace('_',' ')}</Tag> },
    { title: 'Detected',   dataIndex: 'detectedAt',      key: 'da', width: 110, render: fmtDate },
    { title: '', key: 'actions', width: 90,
      render: (_, r) => !['resolved','closed'].includes(r.status) && (
        <Popconfirm title="Mark as resolved?" onConfirm={() => handleResolve(r._id)}>
          <Button size="small" type="link">Resolve</Button>
        </Popconfirm>
      )
    }
  ];

  return (
    <Card title="Risk cases" extra={<Space><Button onClick={load}>Load</Button><Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>New case</Button></Space>}>
      <Table loading={loading} columns={columns} dataSource={cases} rowKey="_id" pagination={{ pageSize: 10 }} locale={{ emptyText: 'Click Load' }} />
      <Modal open={modalOpen} title="New risk case" onCancel={() => setModalOpen(false)} footer={null}>
        <Form form={form} layout="vertical" onFinish={handleCreate} initialValues={{ classification:'pre_outbreak', severity:'medium' }}>
          <Form.Item name="title"          label="Title"          rules={[{required:true}]}><Input /></Form.Item>
          <Form.Item name="description"    label="Description"><Input.TextArea rows={3} /></Form.Item>
          <Form.Item name="classification" label="Classification" rules={[{required:true}]}>
            <Select options={['pre_outbreak','outbreak','post_outbreak'].map(v=>({value:v,label:v.replace('_',' ')}))} />
          </Form.Item>
          <Form.Item name="severity"       label="Severity"       rules={[{required:true}]}>
            <Select options={['low','medium','high','critical'].map(v=>({value:v,label:v}))} />
          </Form.Item>
          <Form.Item name="dueDate"        label="Due date"><Input type="date" /></Form.Item>
          <Button type="primary" htmlType="submit" block>Create</Button>
        </Form>
      </Modal>
    </Card>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPLIANCE DOCUMENTS TAB
// ─────────────────────────────────────────────────────────────────────────────
const DocumentsTab = ({ module }) => {
  const [docs, setDocs]     = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    try { setLoading(true); const r = await legalAPI.getDocuments({ module }); setDocs(r.data?.documents || []); }
    catch { message.error('Failed'); } finally { setLoading(false); }
  }, [module]);

  const handleCreate = async (values) => {
    try {
      await legalAPI.createDocument({ ...values, module });
      message.success('Document added'); setModalOpen(false); form.resetFields(); await load();
    } catch (e) { message.error(e.response?.data?.message || 'Failed'); }
  };

  const columns = [
    { title: 'Name',         dataIndex: 'name',            key: 'nm' },
    { title: 'Type',         dataIndex: 'documentType',    key: 'dt', width: 180 },
    { title: 'Status',       dataIndex: 'status',          key: 'st', width: 130,
      render: v => <Tag color={statusColor[v]}>{v?.replace('_',' ')}</Tag> },
    { title: 'Expiry',       dataIndex: 'expiryDate',      key: 'ex', width: 110, render: v => {
        if (!v) return '—';
        const expired = new Date(v) < new Date();
        return <Text type={expired ? 'danger' : undefined}>{fmtDate(v)}</Text>;
      }
    },
    { title: 'Next review',  dataIndex: 'nextReviewDue',   key: 'nr', width: 110, render: fmtDate },
    { title: 'Approval',     dataIndex: 'approvalStatus',  key: 'as', width: 110,
      render: v => <Tag color={statusColor[v]}>{v}</Tag> }
  ];

  return (
    <Card title="Documents" extra={<Space><Button onClick={load}>Load</Button><Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>Add document</Button></Space>}>
      <Table loading={loading} columns={columns} dataSource={docs} rowKey="_id" pagination={{ pageSize: 10 }} locale={{ emptyText: 'Click Load' }} />
      <Modal open={modalOpen} title="Add document" onCancel={() => setModalOpen(false)} footer={null}>
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item name="name"         label="Document name" rules={[{required:true}]}><Input /></Form.Item>
          <Form.Item name="documentType" label="Document type" rules={[{required:true}]}><Input placeholder="e.g. Certificate of Incorporation" /></Form.Item>
          <Form.Item name="referenceNumber" label="Reference number"><Input /></Form.Item>
          <Row gutter={12}>
            <Col span={12}><Form.Item name="issueDate"  label="Issue date"><Input type="date" /></Form.Item></Col>
            <Col span={12}><Form.Item name="expiryDate" label="Expiry date"><Input type="date" /></Form.Item></Col>
          </Row>
          <Form.Item name="reviewFrequencyDays" label="Review frequency (days)"><InputNumber min={1} style={{width:'100%'}} /></Form.Item>
          <Form.Item name="description" label="Description"><Input.TextArea rows={2} /></Form.Item>
          <Button type="primary" htmlType="submit" block>Save</Button>
        </Form>
      </Modal>
    </Card>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// CONTRACTS TAB
// ─────────────────────────────────────────────────────────────────────────────
const ContractsTab = () => {
  const [contracts, setContracts] = useState([]);
  const [selected, setSelected]   = useState(null);
  const [loading, setLoading]     = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [taskForm] = Form.useForm();

  const load = useCallback(async () => {
    try { setLoading(true); const r = await legalAPI.getContracts(); setContracts(r.data?.contracts || []); }
    catch { message.error('Failed'); } finally { setLoading(false); }
  }, []);

  const loadDetail = async (id) => {
    try { const r = await legalAPI.getContract(id); setSelected(r.data); }
    catch { message.error('Failed to load contract detail'); }
  };

  const handleCreate = async (values) => {
    try {
      await legalAPI.createContract(values);
      message.success('Contract created'); setModalOpen(false); form.resetFields(); await load();
    } catch (e) { message.error(e.response?.data?.message || 'Failed'); }
  };

  const handleAddTask = async (values) => {
    try {
      await legalAPI.addContractTask(selected._id, values);
      message.success('Task added'); setTaskModalOpen(false); taskForm.resetFields();
      await loadDetail(selected._id);
    } catch (e) { message.error(e.response?.data?.message || 'Failed'); }
  };

  const contractColumns = [
    { title: 'Number',   dataIndex: 'contractNumber', key: 'cn', width: 150 },
    { title: 'Name',     dataIndex: 'contractName',   key: 'nm' },
    { title: 'Type',     dataIndex: 'contractType',   key: 'ty', width: 110, render: v => <Tag>{v}</Tag> },
    { title: 'Status',   dataIndex: 'status',         key: 'st', width: 110, render: v => <Tag color={statusColor[v]}>{v}</Tag> },
    { title: 'Starts',   dataIndex: 'startDate',      key: 'sd', width: 110, render: fmtDate },
    { title: 'Ends',     dataIndex: 'endDate',        key: 'ed', width: 110, render: fmtDate },
    { title: 'Margin',   key: 'margin', width: 90,
      render: (_, r) => {
        const margin = r.profitabilityMargin || 0;
        return <Text type={margin >= 0 ? 'success' : 'danger'}>{margin}%</Text>;
      }
    },
    { title: '', key: 'action', width: 70,
      render: (_, r) => <Button size="small" onClick={() => loadDetail(r._id)}>Detail</Button> }
  ];

  return (
    <Row gutter={16}>
      <Col span={selected ? 12 : 24}>
        <Card title="Contracts" extra={<Space><Button onClick={load}>Load</Button><Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>New contract</Button></Space>}>
          <Table loading={loading} columns={contractColumns} dataSource={contracts} rowKey="_id" pagination={{ pageSize: 8 }} locale={{ emptyText: 'Click Load' }} />
        </Card>
      </Col>

      {selected && (
        <Col span={12}>
          <Card title={selected.contractName} extra={
            <Space>
              <Button size="small" icon={<PlusOutlined />} onClick={() => setTaskModalOpen(true)}>Add task</Button>
              <Button size="small" onClick={() => setSelected(null)}>Close</Button>
            </Space>
          }>
            <Row gutter={12} style={{ marginBottom: 12 }}>
              <Col span={8}><Statistic title="Approved cost"   value={selected.approvedCost}  precision={0} /></Col>
              <Col span={8}><Statistic title="Execution cost"  value={selected.executionCost} precision={0} /></Col>
              <Col span={8}><Statistic title="Profitability"   value={selected.profitabilityMargin || 0} suffix="%" valueStyle={{ color: (selected.profitabilityMargin || 0) >= 0 ? '#389e0d' : '#cf1322' }} /></Col>
            </Row>

            <Divider orientation="left" plain>Contract tasks</Divider>
            {(selected.contractTasks || []).length === 0
              ? <Text type="secondary">No tasks yet</Text>
              : (selected.contractTasks || []).map(t => (
                <div key={t._id} style={{ padding: '4px 0', borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
                  <Space>
                    <Tag color={t.status === 'completed' ? 'green' : t.status === 'overdue' ? 'red' : 'default'}>{t.status}</Tag>
                    <Text style={{ fontSize: 13 }}>{t.title}</Text>
                  </Space>
                </div>
              ))}

            <Divider orientation="left" plain>Service levels</Divider>
            {(selected.serviceLevels || []).length === 0
              ? <Text type="secondary">No service levels defined</Text>
              : (selected.serviceLevels || []).map(s => (
                <div key={s._id} style={{ padding: '4px 0' }}>
                  <Text strong style={{ fontSize: 13 }}>{s.name}</Text>
                  <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>{s.target}</Text>
                </div>
              ))}
          </Card>
        </Col>
      )}

      <Modal open={modalOpen} title="New contract" onCancel={() => setModalOpen(false)} footer={null} width={560}>
        <Form form={form} layout="vertical" onFinish={handleCreate} initialValues={{ contractType:'service', status:'draft' }}>
          <Row gutter={12}>
            <Col span={10}><Form.Item name="contractNumber" label="Contract number" rules={[{required:true}]}><Input /></Form.Item></Col>
            <Col span={14}><Form.Item name="contractName"   label="Contract name"   rules={[{required:true}]}><Input /></Form.Item></Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="contractType" label="Type">
                <Select options={['service','supply','framework','project','consultancy','other'].map(v=>({value:v,label:v}))} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="counterpartyName" label="Counterparty"><Input /></Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}><Form.Item name="startDate" label="Start" rules={[{required:true}]}><Input type="date" /></Form.Item></Col>
            <Col span={12}><Form.Item name="endDate"   label="End"><Input type="date" /></Form.Item></Col>
          </Row>
          <Row gutter={12}>
            <Col span={8}><Form.Item name="approvedCost"    label="Approved cost"><InputNumber min={0} style={{width:'100%'}} /></Form.Item></Col>
            <Col span={8}><Form.Item name="approvedRevenue" label="Approved revenue"><InputNumber min={0} style={{width:'100%'}} /></Form.Item></Col>
            <Col span={8}><Form.Item name="periodicReviewDays" label="Review cycle (days)"><InputNumber min={1} style={{width:'100%'}} /></Form.Item></Col>
          </Row>
          <Form.Item name="description" label="Description"><Input.TextArea rows={2} /></Form.Item>
          <Button type="primary" htmlType="submit" block>Create contract</Button>
        </Form>
      </Modal>

      <Modal open={taskModalOpen} title="Add contract task" onCancel={() => setTaskModalOpen(false)} footer={null}>
        <Form form={taskForm} layout="vertical" onFinish={handleAddTask}>
          <Form.Item name="title"       label="Task title"    rules={[{required:true}]}><Input /></Form.Item>
          <Form.Item name="description" label="Description"><Input.TextArea rows={2} /></Form.Item>
          <Form.Item name="dueDate"     label="Due date"><Input type="date" /></Form.Item>
          <Form.Item name="projectTaskId" label="Project task ID (link to project module)"><Input placeholder="ObjectId of linked project task" /></Form.Item>
          <Button type="primary" htmlType="submit" block>Add task</Button>
        </Form>
      </Modal>
    </Row>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// REGULATORY STANDARDS TAB
// ─────────────────────────────────────────────────────────────────────────────
const RegulatoryTab = () => {
  const [standards, setStandards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [disclosureModal, setDisclosureModal] = useState(null);
  const [form] = Form.useForm();
  const [disclosureForm] = Form.useForm();

  const load = useCallback(async () => {
    try { setLoading(true); const r = await legalAPI.getRegulatoryStandards(); setStandards(r.data?.standards || []); }
    catch { message.error('Failed'); } finally { setLoading(false); }
  }, []);

  const handleCreate = async (values) => {
    try {
      await legalAPI.createRegulatoryStandard(values);
      message.success('Standard added'); setModalOpen(false); form.resetFields(); await load();
    } catch (e) { message.error(e.response?.data?.message || 'Failed'); }
  };

  const handleAddDisclosure = async (values) => {
    try {
      await legalAPI.addDisclosure(disclosureModal, values);
      message.success('Disclosure added'); setDisclosureModal(null); disclosureForm.resetFields(); await load();
    } catch (e) { message.error(e.response?.data?.message || 'Failed'); }
  };

  const areaColor = { financials:'blue', data_protection:'purple', health_safety_security:'red', anti_money_laundering:'orange', environmental:'green', other:'default' };

  const columns = [
    { title: 'Standard',     dataIndex: 'standardName',     key: 'sn' },
    { title: 'Area',         dataIndex: 'regulatoryArea',   key: 'ra', width: 160, render: v => <Tag color={areaColor[v]}>{v?.replace(/_/g,' ')}</Tag> },
    { title: 'Body',         dataIndex: 'regulatoryBody',   key: 'rb', width: 150 },
    { title: 'Compliance',   dataIndex: 'complianceStatus', key: 'cs', width: 130,
      render: v => <Tag color={v==='compliant'?'green':v==='non_compliant'?'red':'orange'}>{v?.replace('_',' ')}</Tag> },
    { title: 'Next review',  dataIndex: 'nextReviewDue',    key: 'nr', width: 110, render: fmtDate },
    { title: 'Disclosures',  key: 'disc', width: 110,
      render: (_, r) => <Button size="small" onClick={() => setDisclosureModal(r._id)}>+ Disclosure</Button> }
  ];

  return (
    <Card title="Regulatory standards" extra={<Space><Button onClick={load}>Load</Button><Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>Add standard</Button></Space>}>
      <Table loading={loading} columns={columns} dataSource={standards} rowKey="_id" pagination={{ pageSize: 10 }} locale={{ emptyText: 'Click Load' }} />

      <Modal open={modalOpen} title="Add regulatory standard" onCancel={() => setModalOpen(false)} footer={null}>
        <Form form={form} layout="vertical" onFinish={handleCreate} initialValues={{ complianceStatus:'under_review', jurisdiction:'national', reviewFrequencyDays:180 }}>
          <Form.Item name="standardName"    label="Standard name"    rules={[{required:true}]}><Input /></Form.Item>
          <Form.Item name="regulatoryBody"  label="Regulatory body"  rules={[{required:true}]}><Input /></Form.Item>
          <Form.Item name="regulatoryArea"  label="Regulatory area"  rules={[{required:true}]}>
            <Select options={['financials','data_protection','health_safety_security','anti_money_laundering','environmental','other'].map(v=>({value:v,label:v.replace(/_/g,' ')}))} />
          </Form.Item>
          <Form.Item name="jurisdiction"    label="Jurisdiction">
            <Select options={['state','national','international'].map(v=>({value:v,label:v}))} />
          </Form.Item>
          <Form.Item name="complianceStatus" label="Compliance status">
            <Select options={['compliant','non_compliant','under_review','not_applicable'].map(v=>({value:v,label:v.replace('_',' ')}))} />
          </Form.Item>
          <Form.Item name="reviewFrequencyDays" label="Review frequency (days)"><InputNumber min={1} style={{width:'100%'}} /></Form.Item>
          <Button type="primary" htmlType="submit" block>Save</Button>
        </Form>
      </Modal>

      <Modal open={!!disclosureModal} title="Add disclosure" onCancel={() => setDisclosureModal(null)} footer={null}>
        <Form form={disclosureForm} layout="vertical" onFinish={handleAddDisclosure} initialValues={{ status:'open' }}>
          <Form.Item name="disclosureType" label="Type" rules={[{required:true}]}>
            <Select options={['detected_risk','notification','penalty','litigation','employee_outburst'].map(v=>({value:v,label:v.replace('_',' ')}))} />
          </Form.Item>
          <Form.Item name="description" label="Description" rules={[{required:true}]}><Input.TextArea rows={3} /></Form.Item>
          <Form.Item name="amount"      label="Amount (for penalties)"><InputNumber min={0} style={{width:'100%'}} /></Form.Item>
          <Form.Item name="authority"   label="Authority / body"><Input /></Form.Item>
          <Form.Item name="dueDate"     label="Due date"><Input type="date" /></Form.Item>
          <Button type="primary" htmlType="submit" block>Add disclosure</Button>
        </Form>
      </Modal>
    </Card>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// INTELLECTUAL PROPERTY TAB
// ─────────────────────────────────────────────────────────────────────────────
const IPTab = () => {
  const [ips, setIPs]       = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    try { setLoading(true); const r = await legalAPI.getIPRecords(); setIPs(r.data?.ips || []); }
    catch { message.error('Failed'); } finally { setLoading(false); }
  }, []);

  const handleCreate = async (values) => {
    try {
      await legalAPI.createIPRecord(values);
      message.success('IP record created'); setModalOpen(false); form.resetFields(); await load();
    } catch (e) { message.error(e.response?.data?.message || 'Failed'); }
  };

  const typeColor = { trademark:'blue', patent:'purple', copyright:'teal', trade_secret:'orange' };

  const columns = [
    { title: 'Name',             dataIndex: 'name',             key: 'nm' },
    { title: 'Type',             dataIndex: 'ipType',           key: 'it', width: 120, render: v => <Tag color={typeColor[v]}>{v?.replace('_',' ')}</Tag> },
    { title: 'Reg. number',      dataIndex: 'registrationNumber',key:'rn', width: 130 },
    { title: 'Expiry',           dataIndex: 'expiryDate',       key: 'ex', width: 110, render: fmtDate },
    { title: 'Monitoring',       dataIndex: 'monitoringStatus', key: 'ms', width: 160,
      render: v => <Tag color={v==='active'?'green':v==='in_litigation'?'red':'orange'}>{v?.replace('_',' ')}</Tag> },
    { title: 'Litigations',      key: 'lit', width: 100,
      render: (_, r) => <Text type="secondary">{(r.litigations||[]).length}</Text> },
    { title: 'Trust entities',   key: 'te', width: 110,
      render: (_, r) => <Text type="secondary">{(r.trustEntities||[]).length}</Text> }
  ];

  return (
    <Card title="Intellectual property register" extra={<Space><Button onClick={load}>Load</Button><Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>Register IP</Button></Space>}>
      <Table loading={loading} columns={columns} dataSource={ips} rowKey="_id" pagination={{ pageSize: 10 }} locale={{ emptyText: 'Click Load' }} />
      <Modal open={modalOpen} title="Register intellectual property" onCancel={() => setModalOpen(false)} footer={null}>
        <Form form={form} layout="vertical" onFinish={handleCreate} initialValues={{ status:'registered', monitoringStatus:'active' }}>
          <Form.Item name="name"    label="IP name"  rules={[{required:true}]}><Input /></Form.Item>
          <Form.Item name="ipType"  label="IP type"  rules={[{required:true}]}>
            <Select options={['trademark','patent','copyright','trade_secret'].map(v=>({value:v,label:v.replace('_',' ')}))} />
          </Form.Item>
          <Form.Item name="registrationNumber" label="Registration number"><Input /></Form.Item>
          <Row gutter={12}>
            <Col span={12}><Form.Item name="registrationDate" label="Registered"><Input type="date" /></Form.Item></Col>
            <Col span={12}><Form.Item name="expiryDate"       label="Expiry"><Input type="date" /></Form.Item></Col>
          </Row>
          <Form.Item name="jurisdiction" label="Jurisdiction"><Input /></Form.Item>
          <Form.Item name="description"  label="Description"><Input.TextArea rows={2} /></Form.Item>
          <Button type="primary" htmlType="submit" block>Register</Button>
        </Form>
      </Modal>
    </Card>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SDD LIST TAB
// ─────────────────────────────────────────────────────────────────────────────
const SDDListTab = ({ onOpenForm }) => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    try { setLoading(true); const r = await legalAPI.getSDDRecords(); setRecords(r.data?.records || []); }
    catch { message.error('Failed'); } finally { setLoading(false); }
  }, []);

  const handleNew = async (type) => {
    try {
      const r = await legalAPI.createSDDRecord({ sddType: type });
      message.success('SDD record created');
      onOpenForm(r.data._id);
    } catch (e) { message.error(e.response?.data?.message || 'Failed'); }
  };

  const columns = [
    { title: 'Reference',   dataIndex: 'referenceNumber',  key: 'rn', width: 160 },
    { title: 'Type',        dataIndex: 'sddType',          key: 'ty', width: 100, render: v => <Tag color={v==='internal'?'blue':'purple'}>{v}</Tag> },
    { title: 'Supplier',    dataIndex: ['supplierDetails','name'], key: 'sp', render: v => v || 'Internal' },
    { title: 'Score',       dataIndex: 'score',            key: 'sc', width: 100,
      render: v => <Tag color={v >= 80 ? 'green' : v >= 60 ? 'orange' : 'red'}>{v}%</Tag> },
    { title: 'Status',      dataIndex: 'status',           key: 'st', width: 110, render: v => <Tag color={statusColor[v]}>{v}</Tag> },
    { title: 'Submitted',   dataIndex: 'submittedAt',      key: 'sa', width: 110, render: fmtDate },
    { title: 'Expiry',      dataIndex: 'expiryDate',       key: 'ex', width: 110, render: fmtDate },
    { title: '', key: 'action', width: 70,
      render: (_, r) => <Button size="small" onClick={() => onOpenForm(r._id)}>Open</Button> }
  ];

  return (
    <Card title="Standard due diligence records" extra={
      <Space>
        <Button onClick={load}>Load</Button>
        <Button onClick={() => handleNew('internal')}>+ Internal SDD</Button>
        <Button type="primary" onClick={() => handleNew('external')}>+ External (supplier)</Button>
      </Space>
    }>
      <Alert type="info" showIcon style={{ marginBottom: 12 }}
        message="Internal SDDs are completed by your company. External SDDs are completed by suppliers. Both follow the same question set." />
      <Table loading={loading} columns={columns} dataSource={records} rowKey="_id" pagination={{ pageSize: 10 }} locale={{ emptyText: 'Click Load or create a new SDD' }} />
    </Card>
  );
};


// ─────────────────────────────────────────────────────────────────────────────
// ROOT COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const LegalComplianceCenter = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [openSDDId, setOpenSDDId] = useState(null);

  // If an SDD form is open, render it fullscreen within this route
  if (openSDDId) {
    return <SDDFormPage sddId={openSDDId} onBack={() => setOpenSDDId(null)} />;
  }

  const tabItems = [
    {
      key: 'dashboard',
      label: 'Dashboard',
      children: <DashboardTab />
    },
    {
      key: 'legal',
      label: 'Legal',
      children: (
        <Tabs items={[
          { key: 'docs',  label: 'Documents',   children: <DocumentsTab module="legal" /> },
          { key: 'risks', label: 'Risk cases',  children: <RiskCasesTab module="legal" /> }
        ]} />
      )
    },
    {
      key: 'contracts',
      label: 'Contracts',
      children: <ContractsTab />
    },
    {
      key: 'regulatory',
      label: 'Regulatory',
      children: (
        <Tabs items={[
          { key: 'standards', label: 'Standards',  children: <RegulatoryTab /> },
          { key: 'risks',     label: 'Risk cases', children: <RiskCasesTab module="regulatory" /> },
          { key: 'docs',      label: 'Documents',  children: <DocumentsTab module="regulatory" /> }
        ]} />
      )
    },
    {
      key: 'ip',
      label: 'Intellectual property',
      children: <IPTab />
    },
    {
      key: 'sdd',
      label: 'Due diligence (SDD)',
      children: <SDDListTab onOpenForm={setOpenSDDId} />
    },
    {
      key: 'risk-matrix',
      label: 'Risk matrix',
      children: <RiskMatrixTab />
    },
    {
      key: 'audits',
      label: 'Audit schedule',
      children: <AuditSchedulerTab />
    },
    {
      key: 'incidents',
      label: 'Incidents',
      children: <IncidentManagementTab />
    },
    {
      key: 'policies',
      label: 'Policies',
      children: <PolicyManagementTab />
    },
    {
      key: 'whistleblowing',
      label: 'Whistleblowing',
      children: <WhistleblowingTab />
    },
    {
      key: 'privacy',
      label: 'Data privacy',
      children: <DataPrivacyTab />
    },
    {
      key: 'training',
      label: 'Training & competency',
      children: <TrainingTab />
    },
    {
      key: 'supplier-monitoring',
      label: 'Supplier monitoring',
      children: <SupplierMonitoringTab />
    },
    {
      key: 'compliance-report',
      label: 'Board report',
      children: <ComplianceSummaryTab />
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={3} style={{ margin: 0 }}>Legal &amp; Compliance</Title>
          <Text type="secondary">Part I: Governance  ·  Part II: Standard due diligence</Text>
        </Col>
      </Row>
      <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
    </div>
  );
};

export default LegalComplianceCenter;
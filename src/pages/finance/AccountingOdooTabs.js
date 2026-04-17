// ============================================================
// NEW FILE: pages/finance/AccountingOdooTabs.js
// Import and use these in FinanceAccountingCenter.js
// ============================================================
import React, { useState, useCallback } from 'react';
import {
  Alert, Button, Card, Col, Form, Input, InputNumber, message,
  Modal, Popconfirm, Row, Select, Space, Table, Tag, Typography, Statistic, Tabs
} from 'antd';
import {
  CheckOutlined, PlusOutlined, ReloadOutlined, SendOutlined,
  WarningOutlined, DollarOutlined, DownloadOutlined
} from '@ant-design/icons';
import { accountingAPI } from '../../services/api';

const { Text, Title } = Typography;
const fmt = (v) => Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = (v) => v ? new Date(v).toLocaleDateString() : '-';
const today = new Date().toISOString().slice(0, 10);
const firstOfYear = `${new Date().getFullYear()}-01-01`;

// ─────────────────────────────────────────────────────────────────────────────
// CREDIT NOTES TAB
// ─────────────────────────────────────────────────────────────────────────────
export const CreditNotesTab = () => {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  const load = useCallback(async (params = {}) => {
    try { setLoading(true); const r = await accountingAPI.getCreditNotes(params); setNotes(r.notes || []); }
    catch { message.error('Failed to load credit notes'); } finally { setLoading(false); }
  }, []);

  const handleCreate = async (values) => {
    try {
      await accountingAPI.createCreditNote(values);
      message.success('Credit note created');
      setModalOpen(false); form.resetFields(); await load();
    } catch (e) { message.error(e.response?.data?.message || 'Failed'); }
  };

  const handlePost = async (id, type) => {
    try {
      type === 'customer'
        ? await accountingAPI.postCustomerCreditNote(id)
        : await accountingAPI.postSupplierCreditNote(id);
      message.success('Credit note posted to ledger');
      await load();
    } catch (e) { message.error(e.response?.data?.message || 'Failed'); }
  };

  const columns = [
    { title: 'Number',  dataIndex: 'creditNoteNumber', key: 'cn', width: 160 },
    { title: 'Date',    dataIndex: 'creditNoteDate',   key: 'dt', width: 110, render: fmtDate },
    { title: 'Type',    dataIndex: 'type',             key: 'ty', width: 100,
      render: v => <Tag color={v === 'customer' ? 'blue' : 'orange'}>{v}</Tag> },
    { title: 'Amount',  dataIndex: 'amount',           key: 'am', width: 130, render: fmt },
    { title: 'Reason',  dataIndex: 'reason',           key: 're' },
    { title: 'Status',  dataIndex: 'status',           key: 'st', width: 110,
      render: v => <Tag color={v === 'posted' ? 'green' : v === 'reconciled' ? 'purple' : 'default'}>{v}</Tag> },
    { title: '', key: 'actions', width: 110,
      render: (_, r) => r.status === 'draft' && (
        <Popconfirm title={`Post ${r.type} credit note?`} onConfirm={() => handlePost(r._id, r.type)}>
          <Button size="small" type="link">Post</Button>
        </Popconfirm>
      )}
  ];

  return (
    <Card title="Credit Notes" extra={
      <Space>
        <Button onClick={() => load()}>Load</Button>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>New Credit Note</Button>
      </Space>
    }>
      <Table loading={loading} columns={columns} dataSource={notes} rowKey="_id" pagination={{ pageSize: 12 }} locale={{ emptyText: 'Click Load to fetch' }} />
      <Modal open={modalOpen} title="New Credit Note" onCancel={() => setModalOpen(false)} footer={null}>
        <Form form={form} layout="vertical" onFinish={handleCreate} initialValues={{ creditNoteDate: today, type: 'customer' }}>
          <Form.Item name="type"           label="Type"           rules={[{required:true}]}>
            <Select options={[{value:'customer',label:'Customer (reduce AR)'},{value:'supplier',label:'Supplier (reduce AP)'}]} />
          </Form.Item>
          <Form.Item name="amount"         label="Amount"         rules={[{required:true}]}><InputNumber min={0.01} style={{width:'100%'}} /></Form.Item>
          <Form.Item name="creditNoteDate" label="Date"           rules={[{required:true}]}><Input type="date" /></Form.Item>
          <Form.Item name="reason"         label="Reason"         rules={[{required:true}]}><Input /></Form.Item>
          <Form.Item name="invoiceId"      label="Invoice ID (optional)"><Input placeholder="Customer Invoice ObjectId" /></Form.Item>
          <Form.Item name="supplierInvoiceId" label="Supplier Invoice ID (optional)"><Input placeholder="Supplier Invoice ObjectId" /></Form.Item>
          <Button type="primary" htmlType="submit" block>Create</Button>
        </Form>
      </Modal>
    </Card>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// DUNNING / COLLECTIONS TAB
// ─────────────────────────────────────────────────────────────────────────────
export const DunningTab = () => {
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);

  const load = useCallback(async () => {
    try { setLoading(true); const r = await accountingAPI.getDunningActions(); setActions(r.actions || []); }
    catch { message.error('Failed'); } finally { setLoading(false); }
  }, []);

  const runCheck = async () => {
    try { setRunning(true); const r = await accountingAPI.runDunningCheck(); message.success(`${r.created} new dunning actions created`); await load(); }
    catch (e) { message.error(e.response?.data?.message || 'Failed'); } finally { setRunning(false); }
  };

  const send = async (id) => {
    try { await accountingAPI.sendDunningAction(id); message.success('Sent'); await load(); }
    catch (e) { message.error(e.response?.data?.message || 'Failed'); }
  };

  const levelColor = { 1: 'blue', 2: 'orange', 3: 'red' };
  const levelLabel = { 1: 'Reminder', 2: 'Warning', 3: 'Final notice' };

  const columns = [
    { title: 'Customer', dataIndex: 'customerName', key: 'cn' },
    { title: 'Level', dataIndex: 'level', key: 'lv', width: 120,
      render: v => <Tag color={levelColor[v]}>{levelLabel[v] || `Level ${v}`}</Tag> },
    { title: 'Days overdue', dataIndex: 'daysOverdue', key: 'do', width: 120,
      render: v => <Text type={v > 60 ? 'danger' : v > 30 ? 'warning' : undefined}>{v}</Text> },
    { title: 'Amount due', dataIndex: 'amountDue', key: 'ad', width: 130, render: fmt },
    { title: 'Status', dataIndex: 'status', key: 'st', width: 110,
      render: v => <Tag color={v==='sent'?'green':v==='responded'?'purple':'default'}>{v}</Tag> },
    { title: '', key: 'actions', width: 90,
      render: (_, r) => r.status === 'pending' && (
        <Popconfirm title="Send dunning email?" onConfirm={() => send(r._id)}>
          <Button size="small" icon={<SendOutlined />}>Send</Button>
        </Popconfirm>
      )}
  ];

  return (
    <Card title="Payment Follow-up (Dunning)" extra={
      <Space>
        <Button onClick={load}>Load</Button>
        <Button type="primary" loading={running} onClick={runCheck} icon={<WarningOutlined />}>Run Dunning Check</Button>
      </Space>
    }>
      <Alert type="info" showIcon style={{marginBottom:12}} message="Dunning check scans all overdue invoices and creates follow-up actions at 15, 30, and 60+ days." />
      <Table loading={loading} columns={columns} dataSource={actions} rowKey="_id" pagination={{pageSize:12}} locale={{emptyText:'Click Load or Run Check'}} />
    </Card>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// FIXED ASSETS TAB
// ─────────────────────────────────────────────────────────────────────────────
export const FixedAssetsTab = () => {
  const [register, setRegister] = useState(null);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [reg, list] = await Promise.all([accountingAPI.getFixedAssetRegister(), accountingAPI.getFixedAssets()]);
      setRegister(reg.data); setAssets(list.data || []);
    } catch { message.error('Failed'); } finally { setLoading(false); }
  }, []);

  const handleCreate = async (values) => {
    try {
      await accountingAPI.createFixedAsset(values);
      message.success('Asset created and acquisition posted');
      setModalOpen(false); form.resetFields(); await load();
    } catch (e) { message.error(e.response?.data?.message || 'Failed'); }
  };

  const handleDepreciate = async (id) => {
    try { const r = await accountingAPI.depreciateAsset(id); message.success(`Depreciation posted — ${r.data.remainingLines} periods remaining`); await load(); }
    catch (e) { message.error(e.response?.data?.message || 'Failed'); }
  };

  const statusColor = { draft:'default', active:'green', fully_depreciated:'blue', disposed:'red' };

  const columns = [
    { title: 'Name',         dataIndex: 'name',               key: 'nm' },
    { title: 'Acquired',     dataIndex: 'acquisitionDate',    key: 'ad', width: 110, render: fmtDate },
    { title: 'Cost',         dataIndex: 'acquisitionValue',   key: 'av', width: 130, render: fmt },
    { title: 'Book value',   dataIndex: 'currentBookValue',   key: 'bv', width: 130, render: fmt },
    { title: 'Method',       dataIndex: 'depreciationMethod', key: 'dm', width: 120 },
    { title: 'Life (mo)',    dataIndex: 'usefulLifeMonths',   key: 'ul', width: 90 },
    { title: 'Status',       dataIndex: 'status',             key: 'st', width: 130,
      render: v => <Tag color={statusColor[v]}>{v}</Tag> },
    { title: '', key: 'actions', width: 100,
      render: (_, r) => r.status === 'active' && (
        <Popconfirm title="Post next depreciation?" onConfirm={() => handleDepreciate(r._id)}>
          <Button size="small">Depreciate</Button>
        </Popconfirm>
      )}
  ];

  return (
    <>
      {register && (
        <Row gutter={12} style={{marginBottom:16}}>
          {[
            {title:'Total cost', value:register.totalCost},
            {title:'Accumulated dep.', value:register.totalAccDep},
            {title:'Net book value', value:register.totalNBV}
          ].map(k => (
            <Col key={k.title} span={8}>
              <Card size="small"><Statistic title={k.title} value={k.value} precision={2} /></Card>
            </Col>
          ))}
        </Row>
      )}
      <Card title="Fixed Asset Register" extra={
        <Space>
          <Button onClick={load}>Load</Button>
          <Popconfirm title="Post all due depreciations?" onConfirm={async () => { const r = await accountingAPI.depreciateAll(); message.success(`${r.data.posted} entries posted`); await load(); }}>
            <Button>Depreciate All Due</Button>
          </Popconfirm>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>Add Asset</Button>
        </Space>
      }>
        <Table loading={loading} columns={columns} dataSource={assets} rowKey="_id" pagination={{pageSize:12}} locale={{emptyText:'Click Load'}} />
      </Card>
      <Modal open={modalOpen} title="Add Fixed Asset" onCancel={() => setModalOpen(false)} footer={null}>
        <Form form={form} layout="vertical" onFinish={handleCreate} initialValues={{ depreciationMethod:'straight_line', acquisitionDate: today, assetAccount:'1500', depreciationAccount:'5400', accumulatedAccount:'1510' }}>
          <Form.Item name="name"              label="Asset Name"       rules={[{required:true}]}><Input /></Form.Item>
          <Form.Item name="acquisitionDate"   label="Acquisition Date" rules={[{required:true}]}><Input type="date" /></Form.Item>
          <Form.Item name="acquisitionValue"  label="Cost"             rules={[{required:true}]}><InputNumber min={0} style={{width:'100%'}} /></Form.Item>
          <Form.Item name="residualValue"     label="Residual value"><InputNumber min={0} style={{width:'100%'}} /></Form.Item>
          <Form.Item name="usefulLifeMonths"  label="Useful life (months)" rules={[{required:true}]}><InputNumber min={1} style={{width:'100%'}} /></Form.Item>
          <Form.Item name="depreciationMethod" label="Method" rules={[{required:true}]}>
            <Select options={[{value:'straight_line',label:'Straight line'},{value:'declining_balance',label:'Declining balance'}]} />
          </Form.Item>
          <Form.Item name="description" label="Description"><Input /></Form.Item>
          <Button type="primary" htmlType="submit" block>Create Asset</Button>
        </Form>
      </Modal>
    </>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ANALYTIC / COST CENTRES TAB
// ─────────────────────────────────────────────────────────────────────────────
export const AnalyticTab = () => {
  const [accounts, setAccounts] = useState([]);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState('');
  const [dateRange, setDateRange] = useState({ startDate: firstOfYear, endDate: today });
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    try { setLoading(true); const r = await accountingAPI.getAnalyticAccounts(); setAccounts(r.data || []); }
    catch { message.error('Failed'); } finally { setLoading(false); }
  }, []);

  const loadReport = async () => {
    if (!selectedId) { message.warning('Select a cost centre'); return; }
    try { setLoading(true); const r = await accountingAPI.getAnalyticReport(selectedId, dateRange); setReport(r.data); }
    catch { message.error('Failed to load report'); } finally { setLoading(false); }
  };

  const handleCreate = async (values) => {
    try { await accountingAPI.createAnalyticAccount(values); message.success('Cost centre created'); setModalOpen(false); form.resetFields(); await load(); }
    catch (e) { message.error(e.response?.data?.message || 'Failed'); }
  };

  const acColumns = [
    { title: 'Code', dataIndex: 'code', key: 'co', width: 100 },
    { title: 'Name', dataIndex: 'name', key: 'nm' },
    { title: 'Type', dataIndex: 'type', key: 'ty', width: 120, render: v => <Tag>{v}</Tag> },
    { title: 'Budget', dataIndex: 'budget', key: 'bu', width: 120, render: fmt },
    { title: '', key: 'action', width: 90,
      render: (_, r) => <Button size="small" onClick={() => { setSelectedId(r._id); }}>Select</Button> }
  ];

  const lineColumns = [
    { title: 'Date', dataIndex: 'date', key: 'dt', width: 110, render: fmtDate },
    { title: 'Description', dataIndex: 'name', key: 'nm' },
    { title: 'Account', dataIndex: 'accountCode', key: 'ac', width: 90 },
    { title: 'Amount', dataIndex: 'amount', key: 'am', width: 120,
      render: v => <Text type={v > 0 ? 'danger' : 'success'}>{fmt(Math.abs(v))}</Text> }
  ];

  return (
    <Row gutter={16}>
      <Col span={10}>
        <Card title="Cost Centres" extra={<Space><Button onClick={load}>Load</Button><Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>New</Button></Space>}>
          <Table loading={loading} columns={acColumns} dataSource={accounts} rowKey="_id" pagination={{pageSize:10}} locale={{emptyText:'Click Load'}} />
        </Card>
      </Col>
      <Col span={14}>
        <Card title="Cost Centre Report">
          <Space style={{marginBottom:12}} wrap>
            <Select style={{width:200}} placeholder="Select cost centre" value={selectedId || undefined}
              onChange={setSelectedId}
              options={accounts.map(a => ({value:a._id, label:`${a.code} — ${a.name}`}))} />
            <Input type="date" value={dateRange.startDate} onChange={e => setDateRange(p => ({...p,startDate:e.target.value}))} style={{width:140}} />
            <Text type="secondary">to</Text>
            <Input type="date" value={dateRange.endDate} onChange={e => setDateRange(p => ({...p,endDate:e.target.value}))} style={{width:140}} />
            <Button type="primary" onClick={loadReport} loading={loading}>Generate</Button>
          </Space>
          {report && <>
            <Row gutter={12} style={{marginBottom:12}}>
              <Col span={8}><Card size="small"><Statistic title="Total cost" value={report.totalCost} precision={2} valueStyle={{color:'#cf1322'}} /></Card></Col>
              <Col span={8}><Card size="small"><Statistic title="Total revenue" value={report.totalRevenue} precision={2} valueStyle={{color:'#389e0d'}} /></Card></Col>
              <Col span={8}><Card size="small"><Statistic title="Balance" value={report.balance} precision={2} /></Card></Col>
            </Row>
            <Table size="small" columns={lineColumns} dataSource={report.lines} rowKey={(_, i) => i} pagination={{pageSize:10}} />
          </>}
        </Card>
      </Col>
      <Modal open={modalOpen} title="New Cost Centre" onCancel={() => setModalOpen(false)} footer={null}>
        <Form form={form} layout="vertical" onFinish={handleCreate} initialValues={{type:'cost_centre',isActive:true}}>
          <Form.Item name="code" label="Code" rules={[{required:true}]}><Input style={{textTransform:'uppercase'}} /></Form.Item>
          <Form.Item name="name" label="Name" rules={[{required:true}]}><Input /></Form.Item>
          <Form.Item name="type" label="Type" rules={[{required:true}]}>
            <Select options={['cost_centre','project','department','product'].map(v=>({value:v,label:v}))} />
          </Form.Item>
          <Form.Item name="budget" label="Budget (optional)"><InputNumber min={0} style={{width:'100%'}} /></Form.Item>
          <Button type="primary" htmlType="submit" block>Create</Button>
        </Form>
      </Modal>
    </Row>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// BUDGETS TAB
// ─────────────────────────────────────────────────────────────────────────────
export const BudgetsTab = () => {
  const [budgets, setBudgets] = useState([]);
  const [bva, setBva] = useState(null);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    try { setLoading(true); const r = await accountingAPI.getBudgets(); setBudgets(r.data || []); }
    catch { message.error('Failed'); } finally { setLoading(false); }
  }, []);

  const loadBva = async (id) => {
    try { setLoading(true); const r = await accountingAPI.getBudgetVsActual(id); setBva(r.data); }
    catch { message.error('Failed'); } finally { setLoading(false); }
  };

  const handleCreate = async (values) => {
    try {
      const lines = JSON.parse(values.linesJson || '[]');
      await accountingAPI.createBudget({ ...values, lines });
      message.success('Budget created'); setModalOpen(false); form.resetFields(); await load();
    } catch (e) { message.error(e.response?.data?.message || 'Invalid JSON or failed'); }
  };

  const bvaColumns = [
    { title: 'Account', dataIndex: 'accountCode', key: 'ac', width: 100 },
    { title: 'Budget',  dataIndex: 'plannedAmount', key: 'pl', width: 130, render: fmt },
    { title: 'Actual',  dataIndex: 'actualAmount',  key: 'ac2', width: 130, render: fmt },
    { title: 'Variance', dataIndex: 'variance',     key: 'va', width: 130,
      render: (v, r) => <Text type={r.overBudget ? 'danger' : 'success'}>{fmt(v)}</Text> },
    { title: '%', dataIndex: 'variancePct', key: 'vp', width: 80,
      render: (v, r) => <Text type={r.overBudget ? 'danger' : 'success'}>{v}%</Text> }
  ];

  return (
    <Row gutter={16}>
      <Col span={8}>
        <Card title="Budgets" extra={<Space><Button onClick={load}>Load</Button><Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>New Budget</Button></Space>}>
          <Table loading={loading} dataSource={budgets} rowKey="_id" pagination={{pageSize:8}} locale={{emptyText:'Click Load'}}
            columns={[
              {title:'Name', dataIndex:'name', key:'nm'},
              {title:'Year', dataIndex:'fiscalYear', key:'fy', width:70},
              {title:'Status', dataIndex:'status', key:'st', width:90, render: v => <Tag>{v}</Tag>},
              {title:'', key:'action', width:60, render:(_, r) => <Button size="small" onClick={() => loadBva(r._id)}>View</Button>}
            ]} />
        </Card>
      </Col>
      <Col span={16}>
        <Card title="Budget vs Actual">
          {bva ? (
            <>
              <Row gutter={12} style={{marginBottom:12}}>
                <Col span={8}><Card size="small"><Statistic title="Total budgeted" value={bva.totalPlanned} precision={2} /></Card></Col>
                <Col span={8}><Card size="small"><Statistic title="Total actual" value={bva.totalActual} precision={2} /></Card></Col>
                <Col span={8}><Card size="small"><Statistic title="Total variance" value={bva.totalVariance} precision={2} valueStyle={{color:bva.totalVariance>=0?'#389e0d':'#cf1322'}} /></Card></Col>
              </Row>
              <Table size="small" columns={bvaColumns} dataSource={bva.lines} rowKey={(_, i) => i} pagination={{pageSize:10}} />
            </>
          ) : <Text type="secondary">Select a budget to view actual vs planned.</Text>}
        </Card>
      </Col>
      <Modal open={modalOpen} title="New Budget" onCancel={() => setModalOpen(false)} footer={null}>
        <Form form={form} layout="vertical" onFinish={handleCreate} initialValues={{fiscalYear: new Date().getFullYear(), startDate: firstOfYear, endDate: today, status:'draft'}}>
          <Form.Item name="name"       label="Budget name" rules={[{required:true}]}><Input /></Form.Item>
          <Form.Item name="fiscalYear" label="Fiscal year" rules={[{required:true}]}><InputNumber style={{width:'100%'}} /></Form.Item>
          <Form.Item name="startDate"  label="Start date"  rules={[{required:true}]}><Input type="date" /></Form.Item>
          <Form.Item name="endDate"    label="End date"    rules={[{required:true}]}><Input type="date" /></Form.Item>
          <Form.Item name="linesJson"  label="Budget lines JSON"
            help='[{"accountCode":"5100","plannedAmount":500000},{"accountCode":"5200","plannedAmount":200000}]'>
            <Input.TextArea rows={6} />
          </Form.Item>
          <Button type="primary" htmlType="submit" block>Create Budget</Button>
        </Form>
      </Modal>
    </Row>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// FISCAL YEARS TAB
// ─────────────────────────────────────────────────────────────────────────────
export const FiscalYearsTab = () => {
  const [years, setYears] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    try { setLoading(true); const r = await accountingAPI.getFiscalYears(); setYears(r.data || []); }
    catch { message.error('Failed'); } finally { setLoading(false); }
  }, []);

  const handleCreate = async (values) => {
    try { await accountingAPI.createFiscalYear(values); message.success('Fiscal year created'); setModalOpen(false); form.resetFields(); await load(); }
    catch (e) { message.error(e.response?.data?.message || 'Failed'); }
  };

  const statusColor = { open:'green', locked:'orange', closed:'red' };

  const columns = [
    { title: 'Year', dataIndex: 'year', key: 'yr', width: 80 },
    { title: 'Start', dataIndex: 'startDate', key: 'sd', width: 110, render: fmtDate },
    { title: 'End',   dataIndex: 'endDate',   key: 'ed', width: 110, render: fmtDate },
    { title: 'Status', dataIndex: 'status',   key: 'st', width: 100, render: v => <Tag color={statusColor[v]}>{v}</Tag> },
    { title: 'Closed', dataIndex: 'closedAt', key: 'ca', width: 110, render: fmtDate },
    { title: '', key: 'actions', width: 180,
      render: (_, r) => (
        <Space size={4}>
          {r.status === 'open' && (
            <Popconfirm title={`Lock fiscal year ${r.year}? This closes all periods.`}
              onConfirm={async () => { await accountingAPI.lockFiscalYear(r.year); message.success('Locked'); await load(); }}>
              <Button size="small">Lock</Button>
            </Popconfirm>
          )}
          {r.status === 'locked' && (
            <Popconfirm title={`Close fiscal year ${r.year}? This posts the closing entry.`}
              onConfirm={async () => { await accountingAPI.closeFiscalYear(r.year); message.success('Closed — closing entry posted'); await load(); }}>
              <Button size="small" danger>Close Year</Button>
            </Popconfirm>
          )}
        </Space>
      )}
  ];

  return (
    <Card title="Fiscal Years" extra={<Space><Button onClick={load}>Load</Button><Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>New Year</Button></Space>}>
      <Alert type="warning" showIcon style={{marginBottom:12}}
        message="Lock a year first (closes all periods), then Close to post the retained earnings closing entry. This cannot be undone." />
      <Table loading={loading} columns={columns} dataSource={years} rowKey="_id" pagination={{pageSize:8}} locale={{emptyText:'Click Load'}} />
      <Modal open={modalOpen} title="Create Fiscal Year" onCancel={() => setModalOpen(false)} footer={null}>
        <Form form={form} layout="vertical" onFinish={handleCreate} initialValues={{year: new Date().getFullYear(), startDate: firstOfYear, endDate: today, retainedEarningsAccount:'3100'}}>
          <Form.Item name="year"      label="Year"      rules={[{required:true}]}><InputNumber style={{width:'100%'}} /></Form.Item>
          <Form.Item name="startDate" label="Start"     rules={[{required:true}]}><Input type="date" /></Form.Item>
          <Form.Item name="endDate"   label="End"       rules={[{required:true}]}><Input type="date" /></Form.Item>
          <Form.Item name="retainedEarningsAccount" label="Retained earnings account"><Input /></Form.Item>
          <Form.Item name="notes"     label="Notes"><Input /></Form.Item>
          <Button type="primary" htmlType="submit" block>Create</Button>
        </Form>
      </Modal>
    </Card>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MANAGEMENT REPORT TAB
// ─────────────────────────────────────────────────────────────────────────────
export const ManagementReportTab = () => {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const now = new Date();
  const [params, setParams] = useState({
    startDate: `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`,
    endDate: today,
    compareStartDate: `${now.getFullYear()-1}-${String(now.getMonth()+1).padStart(2,'0')}-01`,
    compareEndDate: `${now.getFullYear()-1}-${String(now.getMonth()+1).padStart(2,'0')}-${new Date(now.getFullYear()-1, now.getMonth()+1, 0).getDate()}`
  });

  const load = async () => {
    try { setLoading(true); const r = await accountingAPI.getManagementReport(params); setReport(r.data); }
    catch { message.error('Failed'); } finally { setLoading(false); }
  };

  return (
    <Card title="Management Report">
      <Space style={{marginBottom:16}} wrap>
        <Text type="secondary">Current period:</Text>
        <Input type="date" value={params.startDate} onChange={e => setParams(p=>({...p,startDate:e.target.value}))} style={{width:150}} />
        <Text type="secondary">to</Text>
        <Input type="date" value={params.endDate} onChange={e => setParams(p=>({...p,endDate:e.target.value}))} style={{width:150}} />
        <Text type="secondary">vs:</Text>
        <Input type="date" value={params.compareStartDate} onChange={e => setParams(p=>({...p,compareStartDate:e.target.value}))} style={{width:150}} />
        <Text type="secondary">to</Text>
        <Input type="date" value={params.compareEndDate} onChange={e => setParams(p=>({...p,compareEndDate:e.target.value}))} style={{width:150}} />
        <Button type="primary" onClick={load} loading={loading}>Generate</Button>
      </Space>
      {report && (
        <>
          <Row gutter={12} style={{marginBottom:16}}>
            {[
              {title:'Revenue', value:report.revenue.current, suffix: report.revenue.growth != null ? ` (${report.revenue.growth > 0 ? '+':''}${report.revenue.growth}% YoY)` : ''},
              {title:'Expenses', value:report.expenses.current, color:'#cf1322'},
              {title:'Net profit', value:report.netProfit.current, color: report.netProfit.current >= 0 ? '#389e0d':'#cf1322', suffix:` (${report.netProfit.margin}% margin)`},
              {title:'Cash balance', value:report.cashBalance},
              {title:'Receivables', value:report.totalReceivables},
              {title:'Payables', value:report.totalPayables},
              {title:'Overdue AR', value:report.overdueAR, color: report.overdueAR > 0 ? '#cf1322':'inherit'},
              {title:'Current ratio', value:report.currentRatio, precision:1}
            ].map(k => (
              <Col key={k.title} xs={12} sm={6} md={3} style={{marginBottom:12}}>
                <Card size="small" bodyStyle={{padding:'10px 12px'}}>
                  <Statistic title={<span style={{fontSize:11}}>{k.title}</span>}
                    value={k.value} precision={k.precision ?? 2}
                    suffix={k.suffix} valueStyle={{fontSize:14, color:k.color}} />
                </Card>
              </Col>
            ))}
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Card size="small" title="Balance sheet health">
                <p><Text type="secondary">Total assets:</Text> <Text strong>{fmt(report.balanceSheet.totalAssets)}</Text></p>
                <p><Text type="secondary">Total liabilities:</Text> <Text strong>{fmt(report.balanceSheet.totalLiabilities)}</Text></p>
                <p><Text type="secondary">Total equity:</Text> <Text strong>{fmt(report.balanceSheet.totalEquity)}</Text></p>
                <Tag color={report.balanceSheet.isBalanced ? 'green':'red'}>{report.balanceSheet.isBalanced ? 'Balanced':'Not balanced'}</Tag>
              </Card>
            </Col>
            <Col span={12}>
              <Card size="small" title="Collections health">
                <p><Text type="secondary">Total receivables:</Text> <Text strong>{fmt(report.totalReceivables)}</Text></p>
                <p><Text type="secondary">Overdue (&gt;15 days):</Text> <Text type={report.overdueAR > 0 ? 'danger':undefined} strong>{fmt(report.overdueAR)}</Text></p>
                <p><Text type="secondary">Total payables:</Text> <Text strong>{fmt(report.totalPayables)}</Text></p>
              </Card>
            </Col>
          </Row>
        </>
      )}
    </Card>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// CURRENCIES TAB
// ─────────────────────────────────────────────────────────────────────────────
export const CurrenciesTab = () => {
  const [currencies, setCurrencies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    try { setLoading(true); const r = await accountingAPI.getCurrencies(); setCurrencies(r.data || []); }
    catch { message.error('Failed'); } finally { setLoading(false); }
  }, []);

  const handleSave = async (values) => {
    try { await accountingAPI.upsertCurrency(values); message.success('Currency saved'); setModalOpen(false); form.resetFields(); await load(); }
    catch (e) { message.error(e.response?.data?.message || 'Failed'); }
  };

  const columns = [
    {title:'Code',   dataIndex:'code',       key:'co', width:80},
    {title:'Name',   dataIndex:'name',       key:'nm'},
    {title:'Symbol', dataIndex:'symbol',     key:'sy', width:80},
    {title:'Rate to base', dataIndex:'rateToBase', key:'rt', width:130, render: v => Number(v).toFixed(6)},
    {title:'Base?',  dataIndex:'isBase',     key:'ib', width:80, render: v => v ? <Tag color="green">Base</Tag> : null},
    {title:'Updated',dataIndex:'updatedAt',  key:'ua', width:110, render: fmtDate}
  ];

  return (
    <Card title="Currencies & Exchange Rates" extra={<Space><Button onClick={load}>Load</Button><Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>Add / Update</Button></Space>}>
      <Alert type="info" showIcon style={{marginBottom:12}} message="Set rateToBase = 1 for your base currency (e.g. XAF). All other rates express how many base units equal 1 unit of that currency." />
      <Table loading={loading} columns={columns} dataSource={currencies} rowKey="code" pagination={{pageSize:10}} locale={{emptyText:'Click Load'}} />
      <Modal open={modalOpen} title="Add / Update Currency" onCancel={() => setModalOpen(false)} footer={null}>
        <Form form={form} layout="vertical" onFinish={handleSave} initialValues={{rateToBase:1, decimalPlaces:2, isBase:false}}>
          <Form.Item name="code"   label="Code (ISO)" rules={[{required:true}]}><Input style={{textTransform:'uppercase'}} placeholder="XAF" /></Form.Item>
          <Form.Item name="name"   label="Name"       rules={[{required:true}]}><Input placeholder="CFA Franc" /></Form.Item>
          <Form.Item name="symbol" label="Symbol"     rules={[{required:true}]}><Input placeholder="FCFA" /></Form.Item>
          <Form.Item name="rateToBase" label="Rate to base" rules={[{required:true}]}><InputNumber min={0.000001} step={0.000001} style={{width:'100%'}} /></Form.Item>
          <Form.Item name="isBase" label="Is base currency?">
            <Select options={[{value:false,label:'No'},{value:true,label:'Yes — this is the base'}]} />
          </Form.Item>
          <Button type="primary" htmlType="submit" block>Save</Button>
        </Form>
      </Modal>
    </Card>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// TAX GROUPS TAB
// ─────────────────────────────────────────────────────────────────────────────
export const TaxGroupsTab = () => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();
  const defaultTaxLines = JSON.stringify([
    { name: 'Standard VAT', rate: 19.25, taxType: 'vat', accountCode: '2200', isInclusive: false, sequence: 10 }
  ], null, 2);

  const load = useCallback(async () => {
    try { setLoading(true); const r = await accountingAPI.getTaxGroups(); setGroups(r.data || []); }
    catch { message.error('Failed'); } finally { setLoading(false); }
  }, []);

  const handleCreate = async (values) => {
    try {
      const taxes = JSON.parse(values.taxesJson || '[]');
      await accountingAPI.createTaxGroup({ ...values, taxes });
      message.success('Tax group created'); setModalOpen(false); form.resetFields(); await load();
    } catch (e) { message.error(e.response?.data?.message || 'Invalid JSON or failed'); }
  };

  const columns = [
    {title:'Name',       dataIndex:'name',     key:'nm'},
    {title:'Taxes',      dataIndex:'taxes',    key:'tx', render: ts => (ts||[]).map(t => <Tag key={t.name}>{t.name} {t.rate}%</Tag>)},
    {title:'Active',     dataIndex:'isActive', key:'ia', width:90, render: v => <Tag color={v?'green':'default'}>{v?'Yes':'No'}</Tag>},
    {title:'', key:'actions', width:90,
      render: (_, r) => (
        <Popconfirm title={r.isActive ? 'Deactivate?' : 'Activate?'}
          onConfirm={async () => { await accountingAPI.updateTaxGroup(r._id, {...r, isActive:!r.isActive}); await load(); }}>
          <Button size="small">{r.isActive ? 'Disable' : 'Enable'}</Button>
        </Popconfirm>
      )}
  ];

  return (
    <Card title="Tax Groups" extra={<Space><Button onClick={load}>Load</Button><Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>New Group</Button></Space>}>
      <Table loading={loading} columns={columns} dataSource={groups} rowKey="_id" pagination={{pageSize:10}} locale={{emptyText:'Click Load'}}
        expandable={{ expandedRowRender: r => <pre style={{margin:0,whiteSpace:'pre-wrap'}}>{JSON.stringify(r.taxes, null, 2)}</pre> }} />
      <Modal open={modalOpen} title="New Tax Group" onCancel={() => setModalOpen(false)} footer={null}>
        <Form form={form} layout="vertical" onFinish={handleCreate} initialValues={{taxesJson: defaultTaxLines}}>
          <Form.Item name="name"        label="Group name" rules={[{required:true}]}><Input placeholder="Standard VAT 19.25%" /></Form.Item>
          <Form.Item name="description" label="Description"><Input /></Form.Item>
          <Form.Item name="taxesJson"   label="Tax lines JSON"
            help="Array of: { name, rate (%), taxType: vat|wht|other, accountCode, isInclusive, sequence }"
            rules={[{required:true}, {validator:(_, v) => { try{JSON.parse(v); return Promise.resolve();} catch{return Promise.reject('Invalid JSON');} }}]}>
            <Input.TextArea rows={8} />
          </Form.Item>
          <Button type="primary" htmlType="submit" block>Create Tax Group</Button>
        </Form>
      </Modal>
    </Card>
  );
};
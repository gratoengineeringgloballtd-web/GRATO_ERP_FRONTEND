import React, { useState, useEffect } from 'react';
import {
  Card, Row, Col, Typography, Button, Select, DatePicker,
  Space, Statistic, Table, Tag, Spin, message, Divider,
  Empty, Alert, Progress, Tabs
} from 'antd';
import {
  DashboardOutlined, DownloadOutlined, FilterOutlined, ReloadOutlined,
  TeamOutlined, DollarOutlined, ShoppingCartOutlined, FileTextOutlined,
  CheckCircleOutlined, ClockCircleOutlined, WarningOutlined,
  BarChartOutlined, PieChartOutlined, LineChartOutlined,
  BankOutlined, ContactsOutlined, ProjectOutlined, TrophyOutlined,
  DatabaseOutlined, BarcodeOutlined, StarOutlined, MedicineBoxOutlined,
  BulbOutlined, LaptopOutlined, ExclamationCircleOutlined, WalletOutlined
} from '@ant-design/icons';
import { Pie, Column, Line, Bar } from '@ant-design/plots';
import moment from 'moment';
import * as XLSX from 'xlsx';
import api from '../../services/api';

const { Title, Text } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;

const formatCurrency = (v, short = false) => {
  if (short) {
    if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B XAF`;
    if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M XAF`;
    if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K XAF`;
    return `${(v || 0).toLocaleString()} XAF`;
  }
  return `XAF ${(v || 0).toLocaleString()}`;
};

const AdminAnalyticsDashboard = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [period, setPeriod] = useState('last30');

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line
  }, []);

  const getDateRange = (p) => {
    const map = {
      last7:         [moment().subtract(7, 'd'), moment()],
      last30:        [moment().subtract(30, 'd'), moment()],
      currentMonth:  [moment().startOf('month'), moment().endOf('month')],
      currentQuarter:[moment().startOf('quarter'), moment().endOf('quarter')],
      currentYear:   [moment().startOf('year'), moment()],
    };
    return map[p] || map.last30;
  };

  const fetchAll = async (p = period) => {
    try {
      setLoading(true);
      const [start, end] = getDateRange(p);
      const params = { startDate: start.format('YYYY-MM-DD'), endDate: end.format('YYYY-MM-DD') };

      const [
        hrRes, cashRes, invoiceRes, prRes, incidentRes,
        itRes, leaveRes, suppliersRes, projectsRes,
        inventoryRes, assetRes, budgetRes, salaryRes, perfRes
      ] = await Promise.allSettled([
        api.get('/hr/employees/statistics'),
        api.get('/cash-requests/dashboard-stats'),
        api.get('/invoices/analytics/dashboard').catch(() => ({ data: {} })),
        api.get('/purchase-requisitions/dashboard-stats'),
        api.get('/incident-reports/dashboard-stats'),
        api.get('/it-support/dashboard/stats'),
        api.get('/leave/dashboard-stats').catch(() => ({ data: { pending: 0, total: 0 } })),
        api.get('/suppliers/admin/approvals/statistics'),
        api.get('/projects/dashboard-stats'),
        api.get('/inventory/dashboard'),
        api.get('/fixed-assets/dashboard'),
        api.get('/budget-codes/stats').catch(() => ({ data: { pending: 0, total: 0 } })),
        api.get('/salary-payments/dashboard-stats'),
        api.get('/supplier-performance/rankings?limit=5').catch(() => ({ data: { data: { rankings: [], summary: {} } } })),
      ]);

      const get = (res, fallback = {}) =>
        res.status === 'fulfilled' ? res.value?.data?.data || res.value?.data || fallback : fallback;

      const hr       = get(hrRes);
      const cash     = get(cashRes);
      const invoice  = get(invoiceRes);
      const pr       = get(prRes);
      const incident = get(incidentRes);
      const it       = get(itRes, { summary: {} });
      const leave    = get(leaveRes);
      const suppliers= get(suppliersRes);
      const projects = get(projectsRes);
      const inv      = get(inventoryRes, { summary: {} });
      const assets   = get(assetRes, { summary: {}, valuation: {} });
      const budget   = get(budgetRes);
      const salary   = get(salaryRes);
      const perf     = get(perfRes, { rankings: [], summary: {} });

      const invSummary   = inv.summary   || {};
      const assetSummary = assets.summary || {};
      const assetVal     = assets.valuation|| {};
      const itSummary    = it.summary    || {};

      setData({
        hr: {
          total:      hr.totalEmployees   || 0,
          active:     hr.activeEmployees  || 0,
          probation:  hr.onProbation      || 0,
          onLeave:    hr.onLeave          || 0,
          expiring:   hr.contractsExpiring|| 0,
        },
        finance: {
          cashPending:    cash.pending   || 0,
          cashTotal:      cash.total     || 0,
          invoicePending: invoice.pending || invoice.pendingAssignment || 0,
          invoiceTotal:   invoice.total  || 0,
          budgetPending:  budget.pending || 0,
          budgetCodes:    budget.total   || 0,
          salaryCurrentMonth: salary.currentMonth || 0,
          salaryYTD:          salary.yearToDate   || 0,
        },
        procurement: {
          prPending:        pr.pending   || 0,
          prTotal:          pr.total     || 0,
          suppliersApproved:suppliers.approved || 0,
          suppliersPending: suppliers.pending  || 0,
          suppliersTotal:   suppliers.total    || 0,
          avgPerfScore:     perf.summary?.averageScore || 0,
          topPerformers:    perf.rankings.filter(r => r.performanceGrade === 'A').length,
        },
        operations: {
          incidentPending: incident.pending || 0,
          incidentTotal:   incident.total   || 0,
          itPending:       itSummary.pending || 0,
          itTotal:         itSummary.total   || 0,
          leavePending:    leave.pending    || 0,
          leaveTotal:      leave.total      || 0,
          projectsPending: projects.pending || 0,
          projectsProgress:projects.inProgress || 0,
          projectsComplete:projects.completed  || 0,
          projectsTotal:   projects.total      || 0,
        },
        assets: {
          inventoryItems:   invSummary.totalItems     || 0,
          lowStock:         invSummary.lowStockItems  || 0,
          outOfStock:       invSummary.outOfStockItems|| 0,
          stockValue:       invSummary.totalStockValue|| 0,
          fixedAssets:      assetSummary.totalAssets   || 0,
          assetsInUse:      assetSummary.inUseAssets   || 0,
          overdueInspections:assetSummary.overdueInspections || 0,
          assetValue:       assetVal.totalCurrentValue || 0,
        },
        topSuppliers: perf.rankings.slice(0, 5),
      });

      message.success('Analytics loaded');
    } catch (err) {
      console.error(err);
      message.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    if (!data) { message.warning('No data to export'); return; }
    try {
      const wb = XLSX.utils.book_new();
      const rows = [
        ['Company Analytics Dashboard'],
        ['Generated:', moment().format('YYYY-MM-DD HH:mm')],
        ['Period:', period],
        [],
        ['HUMAN RESOURCES'],
        ['Total Employees',     data.hr.total],
        ['Active Employees',    data.hr.active],
        ['On Probation',        data.hr.probation],
        ['On Leave',            data.hr.onLeave],
        ['Contracts Expiring',  data.hr.expiring],
        [],
        ['FINANCE'],
        ['Cash Requests Pending',  data.finance.cashPending],
        ['Invoices Pending',        data.finance.invoicePending],
        ['Budget Codes Pending',    data.finance.budgetPending],
        ['Salary Current Month',    formatCurrency(data.finance.salaryCurrentMonth)],
        ['Salary Year-to-Date',     formatCurrency(data.finance.salaryYTD)],
        [],
        ['PROCUREMENT'],
        ['Purchase Requisitions Pending', data.procurement.prPending],
        ['Approved Suppliers',           data.procurement.suppliersApproved],
        ['Suppliers Pending Approval',   data.procurement.suppliersPending],
        ['Avg Supplier Score',           `${data.procurement.avgPerfScore.toFixed(1)}%`],
        [],
        ['OPERATIONS'],
        ['Incidents Pending',  data.operations.incidentPending],
        ['IT Requests Pending',data.operations.itPending],
        ['Leave Requests Pending', data.operations.leavePending],
        ['Projects In Progress',   data.operations.projectsProgress],
        ['Projects Completed',     data.operations.projectsComplete],
        [],
        ['ASSETS & INVENTORY'],
        ['Total Inventory Items', data.assets.inventoryItems],
        ['Low Stock Alerts',      data.assets.lowStock],
        ['Total Fixed Assets',    data.assets.fixedAssets],
        ['Assets In Use',         data.assets.assetsInUse],
        ['Overdue Inspections',   data.assets.overdueInspections],
        ['Stock Value',           formatCurrency(data.assets.stockValue)],
        ['Asset Value',           formatCurrency(data.assets.assetValue)],
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Dashboard');
      XLSX.writeFile(wb, `Admin_Analytics_${moment().format('YYYY-MM-DD')}.xlsx`);
      message.success('Exported to Excel');
    } catch (e) {
      message.error('Export failed');
    }
  };

  if (loading && !data) {
    return (
      <div style={{ padding: 24, textAlign: 'center', minHeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spin size="large" tip="Loading company analytics..." />
      </div>
    );
  }

  // Derived chart data
  const hrPieData = data ? [
    { type: 'Active',    value: data.hr.active },
    { type: 'Probation', value: data.hr.probation },
    { type: 'On Leave',  value: data.hr.onLeave },
    { type: 'Other',     value: Math.max(0, data.hr.total - data.hr.active - data.hr.probation - data.hr.onLeave) },
  ].filter(d => d.value > 0) : [];

  const operationsBarData = data ? [
    { module: 'Incidents',  pending: data.operations.incidentPending,  total: data.operations.incidentTotal },
    { module: 'IT Requests',pending: data.operations.itPending,        total: data.operations.itTotal },
    { module: 'Leave',      pending: data.operations.leavePending,     total: data.operations.leaveTotal },
    { module: 'Cash Req',   pending: data.finance.cashPending,         total: data.finance.cashTotal },
    { module: 'Invoices',   pending: data.finance.invoicePending,      total: data.finance.invoiceTotal },
    { module: 'Requisitions',pending:data.procurement.prPending,       total: data.procurement.prTotal },
  ] : [];

  const pendingBarData = operationsBarData.map(d => ({ module: d.module, count: d.pending }));

  const projectPieData = data ? [
    { type: 'Pending',     value: data.operations.projectsPending },
    { type: 'In Progress', value: data.operations.projectsProgress },
    { type: 'Completed',   value: data.operations.projectsComplete },
  ].filter(d => d.value > 0) : [];

  const supplierPieData = data ? [
    { type: 'Approved', value: data.procurement.suppliersApproved },
    { type: 'Pending',  value: data.procurement.suppliersPending },
    { type: 'Other',    value: Math.max(0, data.procurement.suppliersTotal - data.procurement.suppliersApproved - data.procurement.suppliersPending) },
  ].filter(d => d.value > 0) : [];

  const topSupplierCols = [
    { title: '#', key: 'rank', render: (_, __, i) => i + 1, width: 40 },
    { title: 'Supplier', key: 'name', render: (_, r) => <Text strong>{r.supplierName || r.supplier?.name || 'N/A'}</Text> },
    { title: 'Grade', dataIndex: 'performanceGrade', key: 'grade',
      render: g => <Tag color={g === 'A' ? 'green' : g === 'B' ? 'blue' : 'orange'}>{g}</Tag>, width: 70 },
    { title: 'Score', dataIndex: 'overallScore', key: 'score',
      render: v => <><Text>{(v || 0).toFixed(1)}%</Text><Progress percent={v || 0} size="small" showInfo={false} style={{ width: 60, marginLeft: 8 }} strokeColor={v >= 80 ? '#52c41a' : '#faad14'} /></>, width: 140 },
  ];

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Title level={2} style={{ margin: 0 }}><DashboardOutlined /> Company Analytics Dashboard</Title>
          <Text type="secondary">Real-time overview across all operational modules</Text>
        </Col>
        <Col>
          <Space wrap>
            <Select value={period} style={{ width: 160 }}
              onChange={v => { setPeriod(v); fetchAll(v); }}>
              <Option value="last7">Last 7 Days</Option>
              <Option value="last30">Last 30 Days</Option>
              <Option value="currentMonth">Current Month</Option>
              <Option value="currentQuarter">Current Quarter</Option>
              <Option value="currentYear">Current Year</Option>
            </Select>
            <Button type="primary" icon={<ReloadOutlined />} onClick={() => fetchAll(period)} loading={loading}>Refresh</Button>
            <Button icon={<DownloadOutlined />} onClick={exportToExcel} disabled={!data}>Export</Button>
          </Space>
        </Col>
      </Row>

      {data ? (
        <Tabs defaultActiveKey="overview" size="large">

          {/* ── OVERVIEW TAB ─────────────────────────────────────────────── */}
          <TabPane tab={<Space><DashboardOutlined />Overview</Space>} key="overview">

            {/* Critical alerts */}
            {(data.assets.lowStock > 0 || data.assets.overdueInspections > 0 || data.hr.expiring > 0 || data.procurement.suppliersPending > 0) && (
              <Alert
                message="Items Requiring Attention"
                description={
                  <Space wrap>
                    {data.assets.lowStock > 0 && <Tag color="orange"><WarningOutlined /> {data.assets.lowStock} low stock items</Tag>}
                    {data.assets.overdueInspections > 0 && <Tag color="red"><WarningOutlined /> {data.assets.overdueInspections} overdue asset inspections</Tag>}
                    {data.hr.expiring > 0 && <Tag color="volcano"><ClockCircleOutlined /> {data.hr.expiring} contracts expiring</Tag>}
                    {data.procurement.suppliersPending > 0 && <Tag color="blue"><ContactsOutlined /> {data.procurement.suppliersPending} supplier approvals pending</Tag>}
                  </Space>
                }
                type="warning" showIcon style={{ marginBottom: 24 }}
              />
            )}

            {/* HR Row */}
            <Text strong style={{ fontSize: 14, color: '#666', display: 'block', marginBottom: 8 }}>HUMAN RESOURCES</Text>
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
              {[
                { title: 'Total Employees',    value: data.hr.total,      icon: <TeamOutlined />,          color: '#1890ff' },
                { title: 'Active',             value: data.hr.active,     icon: <CheckCircleOutlined />,   color: '#52c41a' },
                { title: 'On Probation',       value: data.hr.probation,  icon: <ClockCircleOutlined />,   color: '#faad14' },
                { title: 'On Leave',           value: data.hr.onLeave,    icon: <MedicineBoxOutlined />,   color: '#13c2c2' },
                { title: 'Contracts Expiring', value: data.hr.expiring,   icon: <WarningOutlined />,       color: data.hr.expiring > 0 ? '#f5222d' : '#52c41a' },
              ].map((s, i) => (
                <Col xs={12} sm={8} md={4} key={i} style={{ minWidth: 130 }}>
                  <Card size="small">
                    <Statistic title={s.title} value={s.value} prefix={s.icon} valueStyle={{ color: s.color, fontSize: 18 }} />
                  </Card>
                </Col>
              ))}
            </Row>

            {/* Finance Row */}
            <Text strong style={{ fontSize: 14, color: '#666', display: 'block', marginBottom: 8 }}>FINANCE</Text>
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
              {[
                { title: 'Cash Requests Pending', value: data.finance.cashPending,    icon: <DollarOutlined />,    color: '#faad14' },
                { title: 'Invoices Pending',      value: data.finance.invoicePending, icon: <FileTextOutlined />,  color: '#fa8c16' },
                { title: 'Budget Codes Pending',  value: data.finance.budgetPending,  icon: <BankOutlined />,      color: '#722ed1' },
                { title: 'Salary This Month',     value: data.finance.salaryCurrentMonth, icon: <WalletOutlined />,color: '#1890ff', isAmount: true },
                { title: 'Salary Year-to-Date',   value: data.finance.salaryYTD,      icon: <BarChartOutlined />,  color: '#13c2c2', isAmount: true },
              ].map((s, i) => (
                <Col xs={12} sm={8} md={s.isAmount ? 5 : 4} key={i} style={{ minWidth: 140 }}>
                  <Card size="small">
                    <Statistic title={s.title} value={s.value} prefix={s.icon}
                      valueStyle={{ color: s.color, fontSize: s.isAmount ? 14 : 18 }}
                      formatter={s.isAmount ? v => v >= 1e6 ? `${(v/1e6).toFixed(1)}M XAF` : `${(v/1e3).toFixed(0)}K XAF` : undefined}
                    />
                  </Card>
                </Col>
              ))}
            </Row>

            {/* Procurement Row */}
            <Text strong style={{ fontSize: 14, color: '#666', display: 'block', marginBottom: 8 }}>PROCUREMENT & SUPPLIERS</Text>
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
              {[
                { title: 'Requisitions Pending',  value: data.procurement.prPending,          icon: <ShoppingCartOutlined />, color: '#faad14' },
                { title: 'Approved Suppliers',    value: data.procurement.suppliersApproved,  icon: <CheckCircleOutlined />,  color: '#52c41a' },
                { title: 'Suppliers Pending',     value: data.procurement.suppliersPending,   icon: <ClockCircleOutlined />,  color: '#fa8c16' },
                { title: 'Avg Supplier Score',    value: data.procurement.avgPerfScore,        icon: <StarOutlined />,         color: '#fa8c16', suffix: '%', precision: 1 },
                { title: 'Top Performers (A)',    value: data.procurement.topPerformers,       icon: <TrophyOutlined />,       color: '#52c41a' },
              ].map((s, i) => (
                <Col xs={12} sm={8} md={4} key={i} style={{ minWidth: 130 }}>
                  <Card size="small">
                    <Statistic title={s.title} value={s.value} prefix={s.icon}
                      valueStyle={{ color: s.color, fontSize: 18 }}
                      suffix={s.suffix} precision={s.precision ?? 0} />
                  </Card>
                </Col>
              ))}
            </Row>

            {/* Operations Row */}
            <Text strong style={{ fontSize: 14, color: '#666', display: 'block', marginBottom: 8 }}>OPERATIONS</Text>
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
              {[
                { title: 'Incidents Pending',   value: data.operations.incidentPending, icon: <ExclamationCircleOutlined />, color: '#f5222d' },
                { title: 'IT Requests Pending', value: data.operations.itPending,       icon: <LaptopOutlined />,            color: '#722ed1' },
                { title: 'Leave Pending',       value: data.operations.leavePending,    icon: <MedicineBoxOutlined />,       color: '#13c2c2' },
                { title: 'Projects Active',     value: data.operations.projectsProgress,icon: <ProjectOutlined />,           color: '#1890ff' },
                { title: 'Projects Completed',  value: data.operations.projectsComplete,icon: <CheckCircleOutlined />,       color: '#52c41a' },
              ].map((s, i) => (
                <Col xs={12} sm={8} md={4} key={i} style={{ minWidth: 130 }}>
                  <Card size="small">
                    <Statistic title={s.title} value={s.value} prefix={s.icon} valueStyle={{ color: s.color, fontSize: 18 }} />
                  </Card>
                </Col>
              ))}
            </Row>

            {/* Assets Row */}
            <Text strong style={{ fontSize: 14, color: '#666', display: 'block', marginBottom: 8 }}>ASSETS & INVENTORY</Text>
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
              {[
                { title: 'Inventory Items',     value: data.assets.inventoryItems,    icon: <DatabaseOutlined />,  color: '#1890ff' },
                { title: 'Low Stock Alerts',    value: data.assets.lowStock,          icon: <WarningOutlined />,   color: '#faad14' },
                { title: 'Out of Stock',        value: data.assets.outOfStock,        icon: <WarningOutlined />,   color: '#f5222d' },
                { title: 'Total Fixed Assets',  value: data.assets.fixedAssets,       icon: <BarcodeOutlined />,   color: '#722ed1' },
                { title: 'Overdue Inspections', value: data.assets.overdueInspections,icon: <WarningOutlined />,   color: data.assets.overdueInspections > 0 ? '#f5222d' : '#52c41a' },
                { title: 'Stock Value',         value: data.assets.stockValue,         icon: <DollarOutlined />,    color: '#52c41a', isAmount: true },
                { title: 'Asset Value',         value: data.assets.assetValue,         icon: <DollarOutlined />,    color: '#13c2c2', isAmount: true },
              ].map((s, i) => (
                <Col xs={12} sm={8} md={s.isAmount ? 4 : 3} key={i} style={{ minWidth: 120 }}>
                  <Card size="small">
                    <Statistic title={s.title} value={s.value} prefix={s.icon}
                      valueStyle={{ color: s.color, fontSize: s.isAmount ? 13 : 18 }}
                      formatter={s.isAmount ? v => v >= 1e6 ? `${(v/1e6).toFixed(1)}M XAF` : `${(v/1e3).toFixed(0)}K XAF` : undefined}
                    />
                  </Card>
                </Col>
              ))}
            </Row>
          </TabPane>

          {/* ── CHARTS TAB ─────────────────────────────────────────────────── */}
          <TabPane tab={<Space><PieChartOutlined />Charts</Space>} key="charts">
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
              <Col xs={24} lg={8}>
                <Card title="Pending Approvals by Module">
                  {pendingBarData.some(d => d.count > 0) ? (
                    <Bar
                      data={pendingBarData}
                      xField="count"
                      yField="module"
                      height={280}
                      label={{ position: 'right', style: { fontSize: 11 } }}
                      color={({ module }) => {
                        const colors = { 'Incidents': '#f5222d', 'IT Requests': '#722ed1', 'Leave': '#13c2c2', 'Cash Req': '#52c41a', 'Invoices': '#fa8c16', 'Requisitions': '#1890ff' };
                        return colors[module] || '#1890ff';
                      }}
                    />
                  ) : <Empty description="No pending items" />}
                </Card>
              </Col>
              <Col xs={24} lg={8}>
                <Card title="Employee Status Breakdown">
                  {hrPieData.length > 0 ? (
                    <Pie
                      data={hrPieData}
                      angleField="value"
                      colorField="type"
                      radius={0.8}
                      label={{ type: 'outer', content: '{name} {percentage}', style: { fontSize: 11 } }}
                      legend={{ position: 'bottom' }}
                      height={280}
                      color={['#52c41a', '#faad14', '#1890ff', '#bfbfbf']}
                    />
                  ) : <Empty description="No HR data" />}
                </Card>
              </Col>
              <Col xs={24} lg={8}>
                <Card title="Project Status Overview">
                  {projectPieData.length > 0 ? (
                    <Pie
                      data={projectPieData}
                      angleField="value"
                      colorField="type"
                      radius={0.8}
                      label={{ type: 'outer', content: '{name} {percentage}', style: { fontSize: 11 } }}
                      legend={{ position: 'bottom' }}
                      height={280}
                      color={['#faad14', '#1890ff', '#52c41a']}
                    />
                  ) : <Empty description="No project data" />}
                </Card>
              </Col>
            </Row>

            <Row gutter={[16, 16]}>
              <Col xs={24} lg={12}>
                <Card title="Supplier Status Distribution">
                  {supplierPieData.length > 0 ? (
                    <Pie
                      data={supplierPieData}
                      angleField="value"
                      colorField="type"
                      radius={0.8}
                      label={{ type: 'outer', content: '{name} {percentage}', style: { fontSize: 11 } }}
                      legend={{ position: 'bottom' }}
                      height={260}
                      color={['#52c41a', '#faad14', '#bfbfbf']}
                    />
                  ) : <Empty description="No supplier data" />}
                </Card>
              </Col>
              <Col xs={24} lg={12}>
                <Card title="Top 5 Supplier Performance">
                  {data.topSuppliers.length > 0 ? (
                    <Table
                      columns={topSupplierCols}
                      dataSource={data.topSuppliers}
                      rowKey={r => r._id || r.supplier?._id || Math.random()}
                      pagination={false}
                      size="small"
                    />
                  ) : <Empty description="No performance data" />}
                </Card>
              </Col>
            </Row>
          </TabPane>

        </Tabs>
      ) : (
        <Card>
          <Empty description="Click Refresh to load company analytics." />
        </Card>
      )}
    </div>
  );
};

export default AdminAnalyticsDashboard;














// import React, { useState, useEffect } from 'react';
// import {
//   Card,
//   Row,
//   Col,
//   Statistic,
//   Table,
//   Typography,
//   Tag,
//   Space,
//   Button,
//   DatePicker,
//   Select,
//   Spin,
//   message,
//   Progress,
//   Tooltip,
//   Alert
// } from 'antd';
// import {
//   DashboardOutlined,
//   DollarOutlined,
//   UserOutlined,
//   CheckCircleOutlined,
//   CloseCircleOutlined,
//   ClockCircleOutlined,
//   TrendingUpOutlined,
//   BarChartOutlined,
//   FileTextOutlined,
//   TeamOutlined,
//   CalendarOutlined,
//   ExclamationCircleOutlined,
//   ReloadOutlined
// } from '@ant-design/icons';
// import moment from 'moment';
// import api from '../../services/api';

// const { Title, Text } = Typography;
// const { RangePicker } = DatePicker;
// const { Option } = Select;

// const AdminAnalyticsDashboard = () => {
//   const [loading, setLoading] = useState(false);
//   const [dateRange, setDateRange] = useState([
//     moment().subtract(30, 'days'),
//     moment()
//   ]);
//   const [selectedDepartment, setSelectedDepartment] = useState('all');
//   const [analytics, setAnalytics] = useState({
//     overview: {
//       totalRequests: 0,
//       totalAmount: 0,
//       pendingRequests: 0,
//       pendingAmount: 0,
//       approvedRequests: 0,
//       approvedAmount: 0,
//       rejectedRequests: 0,
//       rejectedAmount: 0,
//       averageProcessingTime: 0,
//       approvalRate: 0
//     },
//     departmentBreakdown: [],
//     statusDistribution: [],
//     monthlyTrends: [],
//     topRequesters: [],
//     urgencyDistribution: []
//   });

//   const [departments, setDepartments] = useState([]);

//   useEffect(() => {
//     fetchAnalytics();
//     fetchDepartments();
//   }, [dateRange, selectedDepartment]);

//   const fetchDepartments = async () => {
//     try {
//       const response = await api.get('/api/users/departments');
//       if (response.data.success) {
//         setDepartments(response.data.data || []);
//       }
//     } catch (error) {
//       console.error('Error fetching departments:', error);
//     }
//   };

//   const fetchAnalytics = async () => {
//     try {
//       setLoading(true);
      
//       const params = {
//         startDate: dateRange[0].format('YYYY-MM-DD'),
//         endDate: dateRange[1].format('YYYY-MM-DD'),
//         department: selectedDepartment === 'all' ? undefined : selectedDepartment
//       };

//       const response = await api.get('/api/cash-requests/admin/analytics', { params });
      
//       if (response.data.success) {
//         setAnalytics(response.data.data);
//       } else {
//         message.error('Failed to fetch analytics data');
//       }
//     } catch (error) {
//       console.error('Error fetching analytics:', error);
//       message.error('Failed to load analytics data');
      
//       // Set default empty analytics to prevent UI crashes
//       setAnalytics({
//         overview: {
//           totalRequests: 0,
//           totalAmount: 0,
//           pendingRequests: 0,
//           pendingAmount: 0,
//           approvedRequests: 0,
//           approvedAmount: 0,
//           rejectedRequests: 0,
//           rejectedAmount: 0,
//           averageProcessingTime: 0,
//           approvalRate: 0
//         },
//         departmentBreakdown: [],
//         statusDistribution: [],
//         monthlyTrends: [],
//         topRequesters: [],
//         urgencyDistribution: []
//       });
//     } finally {
//       setLoading(false);
//     }
//   };

//   const getStatusTag = (status) => {
//     const statusMap = {
//       'pending_supervisor': { color: 'orange', text: 'Pending Supervisor' },
//       'pending_finance': { color: 'blue', text: 'Pending Finance' },
//       'approved': { color: 'green', text: 'Approved' },
//       'denied': { color: 'red', text: 'Denied' },
//       'disbursed': { color: 'cyan', text: 'Disbursed' },
//       'completed': { color: 'green', text: 'Completed' }
//     };

//     const config = statusMap[status] || { color: 'default', text: status };
//     return <Tag color={config.color}>{config.text}</Tag>;
//   };

//   const departmentColumns = [
//     {
//       title: 'Department',
//       dataIndex: 'department',
//       key: 'department',
//       render: (dept) => <Text strong>{dept || 'Unknown'}</Text>
//     },
//     {
//       title: 'Total Requests',
//       dataIndex: 'totalRequests',
//       key: 'totalRequests',
//       sorter: (a, b) => a.totalRequests - b.totalRequests
//     },
//     {
//       title: 'Total Amount',
//       dataIndex: 'totalAmount',
//       key: 'totalAmount',
//       render: (amount) => `XAF ${(amount || 0).toLocaleString()}`,
//       sorter: (a, b) => a.totalAmount - b.totalAmount
//     },
//     {
//       title: 'Approval Rate',
//       dataIndex: 'approvalRate',
//       key: 'approvalRate',
//       render: (rate) => (
//         <Progress 
//           percent={Math.round(rate || 0)} 
//           size="small" 
//           status={rate >= 80 ? 'success' : rate >= 60 ? 'normal' : 'exception'}
//         />
//       ),
//       sorter: (a, b) => a.approvalRate - b.approvalRate
//     },
//     {
//       title: 'Avg Processing Time',
//       dataIndex: 'avgProcessingTime',
//       key: 'avgProcessingTime',
//       render: (time) => `${Math.round(time || 0)} hours`
//     }
//   ];

//   const topRequestersColumns = [
//     {
//       title: 'Employee',
//       dataIndex: 'employeeName',
//       key: 'employeeName',
//       render: (name) => <Text strong>{name || 'Unknown'}</Text>
//     },
//     {
//       title: 'Department',
//       dataIndex: 'department',
//       key: 'department',
//       render: (dept) => <Tag color="blue">{dept || 'Unknown'}</Tag>
//     },
//     {
//       title: 'Requests',
//       dataIndex: 'requestCount',
//       key: 'requestCount',
//       sorter: (a, b) => a.requestCount - b.requestCount
//     },
//     {
//       title: 'Total Amount',
//       dataIndex: 'totalAmount',
//       key: 'totalAmount',
//       render: (amount) => `XAF ${(amount || 0).toLocaleString()}`,
//       sorter: (a, b) => a.totalAmount - b.totalAmount
//     },
//     {
//       title: 'Success Rate',
//       dataIndex: 'successRate',
//       key: 'successRate',
//       render: (rate) => (
//         <Progress 
//           percent={Math.round(rate || 0)} 
//           size="small" 
//           status={rate >= 80 ? 'success' : rate >= 60 ? 'normal' : 'exception'}
//         />
//       )
//     }
//   ];

//   if (loading && Object.keys(analytics.overview).length === 0) {
//     return (
//       <div style={{ padding: '24px', textAlign: 'center' }}>
//         <Spin size="large" />
//         <div style={{ marginTop: '16px' }}>Loading analytics dashboard...</div>
//       </div>
//     );
//   }

//   return (
//     <div style={{ padding: '24px' }}>
//       <Card>
//         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
//           <Title level={2} style={{ margin: 0 }}>
//             <DashboardOutlined /> Petty Cash Analytics Dashboard
//           </Title>
//           <Space>
//             <RangePicker
//               value={dateRange}
//               onChange={(dates) => setDateRange(dates)}
//               format="YYYY-MM-DD"
//             />
//             <Select
//               value={selectedDepartment}
//               onChange={setSelectedDepartment}
//               style={{ width: 200 }}
//               placeholder="Select Department"
//             >
//               <Option value="all">All Departments</Option>
//               {departments.map(dept => (
//                 <Option key={dept} value={dept}>{dept}</Option>
//               ))}
//             </Select>
//             <Button 
//               icon={<ReloadOutlined />} 
//               onClick={fetchAnalytics}
//               loading={loading}
//             >
//               Refresh
//             </Button>
//           </Space>
//         </div>

//         {/* Overview Statistics */}
//         <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
//           <Col span={6}>
//             <Card>
//               <Statistic
//                 title="Total Requests"
//                 value={analytics.overview.totalRequests}
//                 prefix={<FileTextOutlined />}
//                 valueStyle={{ color: '#1890ff' }}
//               />
//             </Card>
//           </Col>
//           <Col span={6}>
//             <Card>
//               <Statistic
//                 title="Total Amount"
//                 value={analytics.overview.totalAmount}
//                 prefix="XAF"
//                 formatter={(value) => value?.toLocaleString() || '0'}
//                 valueStyle={{ color: '#52c41a' }}
//               />
//             </Card>
//           </Col>
//           <Col span={6}>
//             <Card>
//               <Statistic
//                 title="Pending Requests"
//                 value={analytics.overview.pendingRequests}
//                 prefix={<ClockCircleOutlined />}
//                 valueStyle={{ color: '#faad14' }}
//               />
//             </Card>
//           </Col>
//           <Col span={6}>
//             <Card>
//               <Statistic
//                 title="Approval Rate"
//                 value={analytics.overview.approvalRate}
//                 suffix="%"
//                 prefix={<CheckCircleOutlined />}
//                 valueStyle={{ 
//                   color: analytics.overview.approvalRate >= 80 ? '#52c41a' : 
//                          analytics.overview.approvalRate >= 60 ? '#faad14' : '#f5222d' 
//                 }}
//               />
//             </Card>
//           </Col>
//         </Row>

//         {/* Status Breakdown */}
//         <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
//           <Col span={6}>
//             <Card size="small">
//               <Statistic
//                 title="Approved"
//                 value={analytics.overview.approvedRequests}
//                 valueStyle={{ color: '#52c41a', fontSize: '18px' }}
//                 suffix={<Text type="secondary">({analytics.overview.approvedAmount?.toLocaleString()} XAF)</Text>}
//               />
//             </Card>
//           </Col>
//           <Col span={6}>
//             <Card size="small">
//               <Statistic
//                 title="Rejected"
//                 value={analytics.overview.rejectedRequests}
//                 valueStyle={{ color: '#f5222d', fontSize: '18px' }}
//                 suffix={<Text type="secondary">({analytics.overview.rejectedAmount?.toLocaleString()} XAF)</Text>}
//               />
//             </Card>
//           </Col>
//           <Col span={6}>
//             <Card size="small">
//               <Statistic
//                 title="Pending Finance"
//                 value={analytics.overview.pendingRequests}
//                 valueStyle={{ color: '#1890ff', fontSize: '18px' }}
//                 suffix={<Text type="secondary">({analytics.overview.pendingAmount?.toLocaleString()} XAF)</Text>}
//               />
//             </Card>
//           </Col>
//           <Col span={6}>
//             <Card size="small">
//               <Statistic
//                 title="Avg Processing Time"
//                 value={Math.round(analytics.overview.averageProcessingTime || 0)}
//                 suffix="hours"
//                 valueStyle={{ color: '#722ed1', fontSize: '18px' }}
//               />
//             </Card>
//           </Col>
//         </Row>

//         {/* Department Performance */}
//         <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
//           <Col span={24}>
//             <Card
//               title={
//                 <Space>
//                   <TeamOutlined />
//                   Department Performance Analysis
//                 </Space>
//               }
//               extra={
//                 <Tooltip title="Shows cash request performance by department">
//                   <ExclamationCircleOutlined />
//                 </Tooltip>
//               }
//             >
//               <Table
//                 columns={departmentColumns}
//                 dataSource={analytics.departmentBreakdown || []}
//                 loading={loading}
//                 rowKey="department"
//                 pagination={{ pageSize: 10 }}
//                 size="small"
//               />
//             </Card>
//           </Col>
//         </Row>

//         {/* Top Requesters */}
//         <Row gutter={[16, 16]}>
//           <Col span={24}>
//             <Card
//               title={
//                 <Space>
//                   <UserOutlined />
//                   Top Requesters Analysis
//                 </Space>
//               }
//               extra={
//                 <Tooltip title="Shows employees with highest request frequency and amounts">
//                   <ExclamationCircleOutlined />
//                 </Tooltip>
//               }
//             >
//               <Table
//                 columns={topRequestersColumns}
//                 dataSource={analytics.topRequesters || []}
//                 loading={loading}
//                 rowKey="employeeId"
//                 pagination={{ pageSize: 10 }}
//                 size="small"
//               />
//             </Card>
//           </Col>
//         </Row>

//         {/* Data Availability Notice */}
//         {analytics.overview.totalRequests === 0 && !loading && (
//           <Alert
//             message="No Data Available"
//             description="No cash requests found for the selected time period and filters. Try adjusting your date range or department filter."
//             type="info"
//             showIcon
//             style={{ marginTop: '24px' }}
//           />
//         )}
//       </Card>
//     </div>
//   );
// };

// export default AdminAnalyticsDashboard;

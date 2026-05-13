import React, { useState, useEffect } from 'react';
import {
  Card, Row, Col, Typography, Button, Select, DatePicker,
  Space, Statistic, Table, Tag, Spin, message, Empty,
  Progress, Divider, Tabs, Alert
} from 'antd';
import {
  ShoppingCartOutlined, DownloadOutlined, FilterOutlined, ReloadOutlined,
  CheckCircleOutlined, ClockCircleOutlined, WarningOutlined,
  BarChartOutlined, PieChartOutlined, DollarOutlined,
  CarOutlined, FileTextOutlined, TruckOutlined, ContactsOutlined,
  TrophyOutlined, StarOutlined, AuditOutlined, LineChartOutlined
} from '@ant-design/icons';
import { Pie, Column, Bar, Line } from '@ant-design/plots';
import moment from 'moment';
import * as XLSX from 'xlsx';
import api from '../../services/api';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;
const { TabPane } = Tabs;

const formatCurrency = v => `XAF ${(v || 0).toLocaleString()}`;

const ProcurementSummaryReport = () => {
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [filters, setFilters] = useState({
    dateRange: 'last30',
    startDate: moment().subtract(30, 'd').format('YYYY-MM-DD'),
    endDate: moment().format('YYYY-MM-DD'),
    status: 'all',
    department: 'all',
  });
  const [customDateRange, setCustomDateRange] = useState(null);
  const [activeTab, setActiveTab] = useState('pos');

  const departments = [
    'CEO Office', 'Technical', 'Business Development & Supply Chain', 'HR & Admin', 'IT',
  ];

  useEffect(() => {
    fetchReportData();
    // eslint-disable-next-line
  }, []);

  const handleDatePreset = (value) => {
    const map = {
      last7:         [moment().subtract(7,  'd'), moment()],
      last30:        [moment().subtract(30, 'd'), moment()],
      currentMonth:  [moment().startOf('month'),  moment().endOf('month')],
      currentQuarter:[moment().startOf('quarter'),moment().endOf('quarter')],
      currentYear:   [moment().startOf('year'),   moment()],
    };
    if (map[value]) {
      setFilters({ ...filters, dateRange: value, startDate: map[value][0].format('YYYY-MM-DD'), endDate: map[value][1].format('YYYY-MM-DD') });
    } else {
      setFilters({ ...filters, dateRange: value });
    }
  };

  const fetchReportData = async () => {
    try {
      setLoading(true);

      const [posRes, prRes, quotesRes, deliveriesRes, suppliersRes, scStatsRes, debitRes] = await Promise.allSettled([
        api.get('/buyer/purchase-orders', { params: { limit: 500 } }),
        api.get('/purchase-requisitions/dashboard-stats'),
        api.get('/buyer/dashboard').catch(() => ({ data: { success: false } })),
        api.get('/buyer/deliveries').catch(() => ({ data: { data: [] } })),
        api.get('/buyer/suppliers', { params: { limit: 500 } }),
        api.get('/buyer/purchase-orders/supply-chain/stats').catch(() => ({ data: { pendingAssignment: 0, inApprovalChain: 0 } })),
        api.get('/debit-notes/dashboard-stats').catch(() => ({ data: { pending: 0, total: 0 } })),
      ]);

      const posPayload  = posRes.status      === 'fulfilled' ? posRes.value?.data          || {} : {};
      const pos         = posPayload.data    || [];
      const poTotal     = posPayload.pagination?.totalRecords || pos.length;
      const pr          = prRes.status       === 'fulfilled' ? prRes.value?.data?.data     || prRes.value?.data || {} : {};
      const buyerDash   = quotesRes.status   === 'fulfilled' ? quotesRes.value?.data?.data || {} : {};
      const deliveries  = deliveriesRes.status === 'fulfilled' ? deliveriesRes.value?.data?.data || [] : [];
      const suppPayload = suppliersRes.status  === 'fulfilled' ? suppliersRes.value?.data  || {} : {};
      const suppliers   = suppPayload.data || suppPayload.suppliers || [];
      const scStats     = scStatsRes.status   === 'fulfilled' ? scStatsRes.value?.data     || {} : {};
      const debitStats  = debitRes.status     === 'fulfilled' ? debitRes.value?.data?.data || debitRes.value?.data || {} : {};

      // PO status breakdown
      const poStatusMap = {};
      pos.forEach(po => {
        const s = po.status || 'unknown';
        poStatusMap[s] = (poStatusMap[s] || 0) + 1;
      });
      const poByStatus = Object.entries(poStatusMap)
        .map(([status, count]) => ({ status: status.replace(/_/g, ' ').toUpperCase(), count }))
        .sort((a, b) => b.count - a.count);

      // Spend by supplier (top 10)
      const supplierSpendMap = {};
      pos.forEach(po => {
        const name = po.supplierDetails?.name || po.supplierId?.name || 'Unknown';
        supplierSpendMap[name] = supplierSpendMap[name] || { total: 0, count: 0 };
        supplierSpendMap[name].total += po.totalAmount || 0;
        supplierSpendMap[name].count++;
      });
      const bySupplierSpend = Object.entries(supplierSpendMap)
        .map(([supplier, d]) => ({ supplier, total: d.total, count: d.count }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);

      // Spend by department (from PO assigned department)
      const deptSpendMap = {};
      pos.forEach(po => {
        const dept = po.assignedDepartment || 'Unassigned';
        deptSpendMap[dept] = deptSpendMap[dept] || { total: 0, count: 0 };
        deptSpendMap[dept].total += po.totalAmount || 0;
        deptSpendMap[dept].count++;
      });
      const byDeptSpend = Object.entries(deptSpendMap)
        .map(([dept, d]) => ({ dept, total: d.total, count: d.count }))
        .sort((a, b) => b.total - a.total);

      // Monthly PO trend
      const monthMap = {};
      pos.forEach(po => {
        const mo = moment(po.creationDate || po.createdAt).format('YYYY-MM');
        monthMap[mo] = monthMap[mo] || { count: 0, amount: 0, delivered: 0 };
        monthMap[mo].count++;
        monthMap[mo].amount += po.totalAmount || 0;
        if (['delivered', 'completed'].includes(po.status)) monthMap[mo].delivered++;
      });
      const monthlyTrend = Object.entries(monthMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, d]) => ({ month, count: d.count, amount: d.amount, delivered: d.delivered }));

      // Delivery rate
      const deliveredCount  = pos.filter(po => ['delivered', 'completed'].includes(po.status)).length;
      const onTimePOs       = pos.filter(po =>
        ['delivered', 'completed'].includes(po.status) &&
        po.performanceMetrics?.onTimeDelivery === true
      ).length;
      const deliveryRate    = deliveredCount > 0 ? Math.round((onTimePOs / deliveredCount) * 100) : 0;

      // Payment terms distribution
      const paymentMap = {};
      pos.forEach(po => {
        const t = po.paymentTerms || 'Unknown';
        paymentMap[t] = (paymentMap[t] || 0) + 1;
      });
      const byPaymentTerms = Object.entries(paymentMap)
        .map(([terms, count]) => ({ terms, count }))
        .sort((a, b) => b.count - a.count);

      // PO source breakdown (tender vs direct)
      const withTender    = pos.filter(po => po.tenderId).length;
      const withoutTender = pos.filter(po => po.createdWithoutTender).length;
      const sourceData    = [
        { source: 'With Tender',    count: withTender },
        { source: 'Direct (Justified)', count: withoutTender },
        { source: 'Other',          count: Math.max(0, pos.length - withTender - withoutTender) },
      ].filter(d => d.count > 0);

      // Quote statistics from buyer dashboard
      const buyerStats = buyerDash?.statistics || {};
      const quoteBreakdown = buyerDash?.statusBreakdown?.quotes || [];
      const getCount = (arr, statuses) => arr.reduce((s, i) => s + (statuses.includes(i._id) ? i.count : 0), 0);

      setReportData({
        overview: {
          totalPOs:          poTotal,
          activePOs:         pos.filter(po => ['approved','sent_to_supplier','acknowledged','in_production','in_transit'].includes(po.status)).length,
          deliveredPOs:      deliveredCount,
          pendingAssignment: scStats.pendingAssignment || 0,
          inApprovalChain:   scStats.inApprovalChain  || 0,
          totalSpend:        pos.reduce((s, po) => s + (po.totalAmount || 0), 0),
          avgPoValue:        pos.length ? Math.round(pos.reduce((s, po) => s + (po.totalAmount || 0), 0) / pos.length) : 0,
          deliveryRate,
          onTimeDeliveries:  onTimePOs,
          totalDelivered:    deliveredCount,
          prPending:         pr.pending  || 0,
          prTotal:           pr.total    || 0,
          quotesPending:     getCount(quoteBreakdown, ['received','under_review']),
          quotesEvaluated:   getCount(quoteBreakdown, ['evaluated']),
          quotesSelected:    getCount(quoteBreakdown, ['selected']),
          activeSuppliers:   suppliers.length,
          debitNotesPending: debitStats.pending || 0,
          debitNotesTotal:   debitStats.total   || 0,
        },
        poByStatus,
        bySupplierSpend,
        byDeptSpend,
        monthlyTrend,
        byPaymentTerms,
        sourceData,
        recentPOs: pos.slice(0, 40),
        deliveries: deliveries.slice(0, 20),
      });

      message.success('Procurement report generated');
    } catch (err) {
      console.error(err);
      message.error('Failed to load procurement report');
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    if (!reportData) { message.warning('No data to export'); return; }
    try {
      const wb = XLSX.utils.book_new();

      const summaryRows = [
        ['Procurement Summary Report'],
        ['Generated:', moment().format('YYYY-MM-DD HH:mm')],
        ['Period:', `${filters.startDate} to ${filters.endDate}`],
        [],
        ['Metric', 'Value'],
        ['Total Purchase Orders',  reportData.overview.totalPOs],
        ['Active POs',             reportData.overview.activePOs],
        ['Delivered POs',          reportData.overview.deliveredPOs],
        ['Pending SC Assignment',  reportData.overview.pendingAssignment],
        ['In Approval Chain',      reportData.overview.inApprovalChain],
        ['Total Procurement Spend',formatCurrency(reportData.overview.totalSpend)],
        ['Average PO Value',       formatCurrency(reportData.overview.avgPoValue)],
        ['On-Time Delivery Rate',  `${reportData.overview.deliveryRate}%`],
        ['Requisitions Pending',   reportData.overview.prPending],
        ['Quotes Pending Eval',    reportData.overview.quotesPending],
        ['Active Suppliers',       reportData.overview.activeSuppliers],
        ['Debit Notes Pending',    reportData.overview.debitNotesPending],
        [],
        ['SUPPLIER SPEND (Top 10)'],
        ['Supplier', 'Total Spend', 'PO Count'],
        ...reportData.bySupplierSpend.map(s => [s.supplier, `XAF ${s.total.toLocaleString()}`, s.count]),
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryRows), 'Summary');

      if (reportData.recentPOs.length) {
        const rows = reportData.recentPOs.map(po => ({
          'PO Number':       po.poNumber,
          'Supplier':        po.supplierDetails?.name || '—',
          'Department':      po.assignedDepartment   || '—',
          'Total Amount':    `XAF ${(po.totalAmount || 0).toLocaleString()}`,
          'Status':          po.status?.replace(/_/g, ' ').toUpperCase(),
          'Payment Terms':   po.paymentTerms || '—',
          'Created':         po.creationDate ? moment(po.creationDate).format('YYYY-MM-DD') : '—',
          'Expected Delivery':po.expectedDeliveryDate ? moment(po.expectedDeliveryDate).format('YYYY-MM-DD') : '—',
          'Actual Delivery': po.actualDeliveryDate   ? moment(po.actualDeliveryDate).format('YYYY-MM-DD')   : '—',
          'On Time':         po.performanceMetrics?.onTimeDelivery != null ? (po.performanceMetrics.onTimeDelivery ? 'Yes' : 'No') : '—',
        }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Purchase Orders');
      }

      XLSX.writeFile(wb, `Procurement_Report_${moment().format('YYYY-MM-DD')}.xlsx`);
      message.success('Exported to Excel');
    } catch (e) {
      message.error('Export failed');
    }
  };

  const poColumns = [
    {
      title: 'PO Number',
      dataIndex: 'poNumber',
      key: 'poNum',
      render: v => <Text code>{v}</Text>,
      width: 140,
    },
    {
      title: 'Supplier',
      key: 'supplier',
      render: (_, r) => <Text strong>{r.supplierDetails?.name || r.supplierId?.name || '—'}</Text>,
    },
    {
      title: 'Dept',
      dataIndex: 'assignedDepartment',
      key: 'dept',
      render: v => v ? <Tag color="blue" style={{ fontSize: 10 }}>{v}</Tag> : <Text type="secondary">—</Text>,
      width: 120,
    },
    {
      title: 'Amount',
      dataIndex: 'totalAmount',
      key: 'amount',
      render: v => <Text strong style={{ color: '#52c41a' }}>{formatCurrency(v || 0)}</Text>,
      sorter: (a, b) => (a.totalAmount || 0) - (b.totalAmount || 0),
      width: 140,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: s => {
        const colors = {
          approved: 'green', sent_to_supplier: 'cyan', delivered: 'purple',
          completed: 'success', draft: 'default', rejected: 'red',
          pending_supply_chain_assignment: 'orange', pending_finance_approval: 'blue',
          pending_department_approval: 'gold',
        };
        return <Tag color={colors[s] || 'default'} style={{ fontSize: 10 }}>{s?.replace(/_/g, ' ').toUpperCase()}</Tag>;
      },
      width: 150,
    },
    {
      title: 'Created',
      key: 'created',
      render: (_, r) => moment(r.creationDate || r.createdAt).format('MMM DD, YYYY'),
      sorter: (a, b) => moment(a.creationDate || a.createdAt).unix() - moment(b.creationDate || b.createdAt).unix(),
      width: 120,
    },
    {
      title: 'Expected Delivery',
      key: 'expected',
      render: (_, r) => {
        if (!r.expectedDeliveryDate) return '—';
        const isLate = ['delivered','completed'].includes(r.status)
          ? r.actualDeliveryDate && moment(r.actualDeliveryDate).isAfter(moment(r.expectedDeliveryDate))
          : moment(r.expectedDeliveryDate).isBefore(moment()) && !['delivered','completed'].includes(r.status);
        return (
          <span style={{ color: isLate ? '#f5222d' : 'inherit' }}>
            {moment(r.expectedDeliveryDate).format('MMM DD, YYYY')}
            {isLate && <Tag color="red" style={{ marginLeft: 4, fontSize: 10 }}>LATE</Tag>}
          </span>
        );
      },
      width: 150,
    },
    {
      title: 'On Time',
      key: 'ontime',
      render: (_, r) => {
        if (r.performanceMetrics?.onTimeDelivery == null) return <Text type="secondary">—</Text>;
        return <Tag color={r.performanceMetrics.onTimeDelivery ? 'green' : 'red'}>{r.performanceMetrics.onTimeDelivery ? '✓' : '✗'}</Tag>;
      },
      width: 80,
    },
  ];

  if (loading && !reportData) {
    return (
      <div style={{ padding: 24, textAlign: 'center', minHeight: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spin size="large" tip="Loading procurement analytics..." />
      </div>
    );
  }

  const ov = reportData?.overview || {};

  return (
    <div style={{ padding: 24 }}>
      <Title level={2}><ShoppingCartOutlined /> Procurement Summary Report</Title>

      {/* Filters */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={5}>
            <Text strong>Date Range</Text>
            <Select style={{ width: '100%', marginTop: 8 }} value={filters.dateRange} onChange={handleDatePreset}>
              <Option value="last7">Last 7 Days</Option>
              <Option value="last30">Last 30 Days</Option>
              <Option value="currentMonth">Current Month</Option>
              <Option value="currentQuarter">Current Quarter</Option>
              <Option value="currentYear">Current Year</Option>
              <Option value="custom">Custom Range</Option>
            </Select>
          </Col>
          {filters.dateRange === 'custom' && (
            <Col xs={24} sm={12} md={7}>
              <Text strong>Custom Range</Text>
              <RangePicker
                style={{ width: '100%', marginTop: 8 }}
                value={customDateRange}
                format="YYYY-MM-DD"
                onChange={dates => {
                  if (dates) {
                    setCustomDateRange(dates);
                    setFilters({ ...filters, startDate: dates[0].format('YYYY-MM-DD'), endDate: dates[1].format('YYYY-MM-DD') });
                  }
                }}
              />
            </Col>
          )}
          <Col xs={24} sm={12} md={5}>
            <Text strong>Department</Text>
            <Select style={{ width: '100%', marginTop: 8 }} value={filters.department}
              onChange={v => setFilters({ ...filters, department: v })}>
              <Option value="all">All Departments</Option>
              {departments.map(d => <Option key={d} value={d}>{d}</Option>)}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={5}>
            <Text strong>PO Status</Text>
            <Select style={{ width: '100%', marginTop: 8 }} value={filters.status}
              onChange={v => setFilters({ ...filters, status: v })}>
              <Option value="all">All Statuses</Option>
              <Option value="approved">Approved</Option>
              <Option value="sent_to_supplier">Sent to Supplier</Option>
              <Option value="delivered">Delivered</Option>
              <Option value="completed">Completed</Option>
              <Option value="pending_supply_chain_assignment">Pending SC Assignment</Option>
            </Select>
          </Col>
          <Col xs={24} sm={24} md={4} style={{ display: 'flex', alignItems: 'flex-end' }}>
            <Space style={{ marginTop: 8 }} wrap>
              <Button type="primary" icon={<FilterOutlined />} onClick={fetchReportData} loading={loading}>Generate</Button>
              <Button icon={<ReloadOutlined />} onClick={fetchReportData} loading={loading}><ReloadOutlined /></Button>
              <Button icon={<DownloadOutlined />} onClick={exportToExcel} disabled={!reportData}>Export</Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {reportData ? (
        <>
          {/* Overview Stats */}
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            {[
              { title: 'Total POs',            value: ov.totalPOs,          icon: <ShoppingCartOutlined />, color: '#1890ff' },
              { title: 'Active POs',            value: ov.activePOs,         icon: <CheckCircleOutlined />,  color: '#52c41a' },
              { title: 'Delivered',             value: ov.deliveredPOs,      icon: <CarOutlined />,          color: '#722ed1' },
              { title: 'Pending SC Assignment', value: ov.pendingAssignment, icon: <ClockCircleOutlined />,  color: '#faad14' },
              { title: 'In Approval Chain',     value: ov.inApprovalChain,   icon: <ClockCircleOutlined />,  color: '#fa8c16' },
              { title: 'Total Spend',           value: ov.totalSpend,        icon: <DollarOutlined />,       color: '#1890ff', isAmount: true },
              { title: 'Average PO Value',      value: ov.avgPoValue,        icon: <BarChartOutlined />,     color: '#13c2c2', isAmount: true },
              { title: 'On-Time Delivery Rate', value: ov.deliveryRate,      icon: <TruckOutlined />,        color: ov.deliveryRate >= 80 ? '#52c41a' : ov.deliveryRate >= 60 ? '#faad14' : '#f5222d', suffix: '%' },
              { title: 'Requisitions Pending',  value: ov.prPending,         icon: <FileTextOutlined />,     color: '#faad14' },
              { title: 'Quotes Pending',        value: ov.quotesPending,     icon: <AuditOutlined />,        color: '#fa8c16' },
              { title: 'Active Suppliers',      value: ov.activeSuppliers,   icon: <ContactsOutlined />,     color: '#52c41a' },
              { title: 'Debit Notes Pending',   value: ov.debitNotesPending, icon: <WarningOutlined />,      color: ov.debitNotesPending > 0 ? '#f5222d' : '#52c41a' },
            ].map((s, i) => (
              <Col xs={12} sm={8} md={2} key={i} style={{ minWidth: 130 }}>
                <Card>
                  <Statistic
                    title={s.title}
                    value={s.value ?? 0}
                    prefix={s.icon}
                    valueStyle={{ color: s.color, fontSize: s.isAmount ? 13 : 18 }}
                    formatter={s.isAmount ? v => v >= 1e6 ? `${(v/1e6).toFixed(1)}M XAF` : `${(v/1e3).toFixed(0)}K XAF` : undefined}
                    suffix={s.suffix}
                  />
                </Card>
              </Col>
            ))}
          </Row>

          {/* Delivery performance summary */}
          {ov.totalDelivered > 0 && (
            <Card style={{ marginBottom: 24 }}>
              <Row gutter={[32, 16]}>
                <Col xs={24} sm={8}>
                  <Text type="secondary">On-Time Delivery Rate</Text>
                  <Progress
                    percent={ov.deliveryRate}
                    strokeColor={ov.deliveryRate >= 80 ? '#52c41a' : ov.deliveryRate >= 60 ? '#faad14' : '#f5222d'}
                    style={{ marginTop: 8 }}
                  />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {ov.onTimeDeliveries} of {ov.totalDelivered} delivered POs were on time
                  </Text>
                </Col>
                <Col xs={24} sm={8}>
                  <Text type="secondary">PO Completion Rate</Text>
                  <Progress
                    percent={ov.totalPOs > 0 ? Math.round((ov.deliveredPOs / ov.totalPOs) * 100) : 0}
                    strokeColor="#1890ff"
                    style={{ marginTop: 8 }}
                  />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {ov.deliveredPOs} of {ov.totalPOs} POs delivered
                  </Text>
                </Col>
                <Col xs={24} sm={8}>
                  <Text type="secondary">Active Pipeline</Text>
                  <Progress
                    percent={ov.totalPOs > 0 ? Math.round((ov.activePOs / ov.totalPOs) * 100) : 0}
                    strokeColor="#722ed1"
                    style={{ marginTop: 8 }}
                  />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {ov.activePOs} POs currently in progress
                  </Text>
                </Col>
              </Row>
            </Card>
          )}

          {/* Tabs for charts and tables */}
          <Tabs activeKey={activeTab} onChange={setActiveTab} size="large" style={{ marginBottom: 24 }}>

            <TabPane tab={<Space><PieChartOutlined />PO Analysis</Space>} key="pos">
              <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} lg={8}>
                  <Card title="PO Status Distribution">
                    {reportData.poByStatus.length > 0 ? (
                      <Pie
                        data={reportData.poByStatus}
                        angleField="count"
                        colorField="status"
                        radius={0.8}
                        label={{ type: 'outer', content: '{name}\n{percentage}', style: { fontSize: 10 } }}
                        legend={{ position: 'bottom' }}
                        height={280}
                      />
                    ) : <Empty description="No PO data" />}
                  </Card>
                </Col>
                <Col xs={24} lg={8}>
                  <Card title="PO Source (Tender vs Direct)">
                    {reportData.sourceData.length > 0 ? (
                      <Pie
                        data={reportData.sourceData}
                        angleField="count"
                        colorField="source"
                        radius={0.8}
                        label={{ type: 'outer', content: '{name}\n{percentage}', style: { fontSize: 11 } }}
                        legend={{ position: 'bottom' }}
                        height={280}
                        color={['#1890ff', '#faad14', '#bfbfbf']}
                      />
                    ) : <Empty description="No source data" />}
                  </Card>
                </Col>
                <Col xs={24} lg={8}>
                  <Card title="Payment Terms Distribution">
                    {reportData.byPaymentTerms.length > 0 ? (
                      <Bar
                        data={reportData.byPaymentTerms}
                        xField="count"
                        yField="terms"
                        height={280}
                        label={{ position: 'right', style: { fontSize: 10 } }}
                        color="#13c2c2"
                      />
                    ) : <Empty description="No data" />}
                  </Card>
                </Col>
              </Row>

              {/* Monthly trend */}
              {reportData.monthlyTrend.length > 1 && (
                <Card title={<Space><LineChartOutlined /><Text>Monthly PO Trend</Text></Space>} style={{ marginBottom: 24 }}>
                  <Row gutter={[16, 0]}>
                    <Col xs={24} lg={12}>
                      <Text type="secondary" style={{ fontSize: 12 }}>PO Count</Text>
                      <Line
                        data={reportData.monthlyTrend}
                        xField="month"
                        yField="count"
                        height={200}
                        point={{ size: 4 }}
                        smooth
                        color="#1890ff"
                        style={{ marginTop: 8 }}
                      />
                    </Col>
                    <Col xs={24} lg={12}>
                      <Text type="secondary" style={{ fontSize: 12 }}>Spend (XAF)</Text>
                      <Line
                        data={reportData.monthlyTrend}
                        xField="month"
                        yField="amount"
                        height={200}
                        point={{ size: 4 }}
                        smooth
                        color="#52c41a"
                        yAxis={{ label: { formatter: v => v >= 1e6 ? `${(v/1e6).toFixed(1)}M` : `${(v/1e3).toFixed(0)}K` } }}
                        tooltip={{ formatter: d => ({ name: 'Spend', value: formatCurrency(d.amount) }) }}
                        style={{ marginTop: 8 }}
                      />
                    </Col>
                  </Row>
                </Card>
              )}
            </TabPane>

            <TabPane tab={<Space><ContactsOutlined />Supplier Spend</Space>} key="suppliers">
              <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} lg={12}>
                  <Card title="Top 10 Suppliers by Spend">
                    {reportData.bySupplierSpend.length > 0 ? (
                      <Bar
                        data={reportData.bySupplierSpend}
                        xField="total"
                        yField="supplier"
                        height={380}
                        label={{
                          position: 'right',
                          style: { fontSize: 10 },
                          formatter: v => v >= 1e6 ? `${(v/1e6).toFixed(1)}M` : `${(v/1e3).toFixed(0)}K`,
                        }}
                        xAxis={{ label: { formatter: v => v >= 1e6 ? `${(v/1e6).toFixed(0)}M` : `${(v/1e3).toFixed(0)}K` } }}
                        color="#eb2f96"
                        tooltip={{ formatter: d => ({ name: d.supplier, value: formatCurrency(d.total) }) }}
                      />
                    ) : <Empty description="No supplier data" />}
                  </Card>
                </Col>
                <Col xs={24} lg={12}>
                  <Card title="Spend by Department">
                    {reportData.byDeptSpend.length > 0 ? (
                      <Bar
                        data={reportData.byDeptSpend}
                        xField="total"
                        yField="dept"
                        height={380}
                        label={{
                          position: 'right',
                          style: { fontSize: 10 },
                          formatter: v => v >= 1e6 ? `${(v/1e6).toFixed(1)}M` : `${(v/1e3).toFixed(0)}K`,
                        }}
                        xAxis={{ label: { formatter: v => v >= 1e6 ? `${(v/1e6).toFixed(0)}M` : `${(v/1e3).toFixed(0)}K` } }}
                        color="#722ed1"
                        tooltip={{ formatter: d => ({ name: d.dept, value: formatCurrency(d.total) }) }}
                      />
                    ) : <Empty description="No department data" />}
                  </Card>
                </Col>
              </Row>
            </TabPane>

            <TabPane tab={<Space><ShoppingCartOutlined />PO Details ({reportData.recentPOs.length})</Space>} key="table">
              <Table
                columns={poColumns}
                dataSource={reportData.recentPOs}
                rowKey={r => r._id || r.poNumber}
                pagination={{ pageSize: 15, showSizeChanger: true, showTotal: (t, r) => `${r[0]}-${r[1]} of ${t}` }}
                scroll={{ x: 1100 }}
                size="small"
              />
            </TabPane>

          </Tabs>
        </>
      ) : (
        <Card>
          <Empty description="Select filters and click Generate to view procurement analytics." />
        </Card>
      )}
    </div>
  );
};

export default ProcurementSummaryReport;






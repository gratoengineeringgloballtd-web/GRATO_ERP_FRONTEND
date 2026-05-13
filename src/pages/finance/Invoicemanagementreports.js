import React, { useState, useEffect } from 'react';
import {
  Card, Row, Col, Typography, Button, Select, DatePicker,
  Space, Statistic, Table, Tag, Spin, message, Empty, Divider, Progress, Tabs  // ← add Tabs here
} from 'antd';
import {
  FileTextOutlined, DownloadOutlined, FilterOutlined, ReloadOutlined,
  CheckCircleOutlined, ClockCircleOutlined, WarningOutlined,
  BarChartOutlined, PieChartOutlined, DollarOutlined,
  TeamOutlined, BankOutlined, ShopOutlined, AuditOutlined, LineChartOutlined
} from '@ant-design/icons';
import { Pie, Column, Bar, Line } from '@ant-design/plots';
import moment from 'moment';
import * as XLSX from 'xlsx';
import api from '../../services/api';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;
// const { TabPane } = (await import('antd')).default || { TabPane: null };

// Use plain Tabs instead to avoid dynamic import issues
// import { Tabs } from 'antd';



const formatCurrency = v => `XAF ${(v || 0).toLocaleString()}`;

const InvoiceManagementReports = () => {
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [filters, setFilters] = useState({
    dateRange: 'last30',
    startDate: moment().subtract(30, 'd').format('YYYY-MM-DD'),
    endDate: moment().format('YYYY-MM-DD'),
    department: 'all',
    status: 'all',
    invoiceType: 'all',
  });
  const [customDateRange, setCustomDateRange] = useState(null);
  const [activeTab, setActiveTab] = useState('employee');

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

      const [empInvoicesRes, supInvoicesRes, analyticsRes] = await Promise.allSettled([
        // Employee invoices — finance view
        api.get('/invoices/finance', { params: { limit: 500, startDate: filters.startDate, endDate: filters.endDate } }),
        // Supplier invoices — finance/admin analytics
        api.get('/suppliers/admin/analytics').catch(() => ({ data: {} })),
        // Invoice analytics dashboard
        api.get('/invoices/analytics/dashboard').catch(() => ({ data: {} })),
      ]);

      const empPayload  = empInvoicesRes.status  === 'fulfilled' ? empInvoicesRes.value?.data  || {} : {};
      const supPayload  = supInvoicesRes.status  === 'fulfilled' ? supInvoicesRes.value?.data  || {} : {};
      const analytics   = analyticsRes.status    === 'fulfilled' ? analyticsRes.value?.data?.data || analyticsRes.value?.data || {} : {};

      const empList = empPayload.data || [];
      const empTotal= empPayload.pagination?.total || empPayload.count || empList.length;

      // Status breakdown — employee invoices
      const empStatusMap = {};
      empList.forEach(inv => {
        const s = inv.approvalStatus || 'unknown';
        empStatusMap[s] = (empStatusMap[s] || 0) + 1;
      });
      const empByStatus = Object.entries(empStatusMap).map(([status, count]) => ({
        status: status.replace(/_/g, ' ').toUpperCase(),
        count,
      }));

      // Department breakdown
      const deptMap = {};
      empList.forEach(inv => {
        const dept = inv.assignedDepartment || inv.employeeDetails?.department || 'Unknown';
        deptMap[dept] = deptMap[dept] || { count: 0, totalAmount: 0 };
        deptMap[dept].count++;
        deptMap[dept].totalAmount += inv.totalAmount || 0;
      });
      const byDepartment = Object.entries(deptMap)
        .map(([dept, d]) => ({ dept, count: d.count, totalAmount: d.totalAmount }))
        .sort((a, b) => b.totalAmount - a.totalAmount);

      // Monthly trend
      const monthMap = {};
      empList.forEach(inv => {
        const mo = moment(inv.uploadedDate || inv.createdAt).format('YYYY-MM');
        monthMap[mo] = monthMap[mo] || { count: 0, amount: 0 };
        monthMap[mo].count++;
        monthMap[mo].amount += inv.totalAmount || 0;
      });
      const monthlyTrend = Object.entries(monthMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, d]) => ({ month, count: d.count, amount: d.amount }));

      // Approval chain depth histogram (how many levels do most invoices have?)
      const depthMap = {};
      empList.forEach(inv => {
        const depth = inv.approvalChain?.length || 0;
        depthMap[depth] = (depthMap[depth] || 0) + 1;
      });
      const byApprovalDepth = Object.entries(depthMap).map(([depth, count]) => ({
        depth: `${depth} level${depth !== '1' ? 's' : ''}`,
        count,
      }));

      // Supplier invoice analytics (from analytics endpoint or mock)
      const supStats = supPayload.data || supPayload || {};

      const pendingStatuses = ['pending_finance_assignment', 'pending_department_approval'];
      const pending  = empList.filter(i => pendingStatuses.includes(i.approvalStatus)).length;
      const approved = empList.filter(i => i.approvalStatus === 'approved').length;
      const processed= empList.filter(i => i.approvalStatus === 'processed').length;
      const rejected = empList.filter(i => i.approvalStatus === 'rejected').length;

      const totalAmount   = empList.reduce((s, i) => s + (i.totalAmount  || 0), 0);
      const approvedAmount= empList.filter(i => i.approvalStatus === 'approved').reduce((s, i) => s + (i.totalAmount || 0), 0);

      setReportData({
        overview: {
          empTotal,
          pending,
          approved,
          processed,
          rejected,
          totalAmount,
          approvedAmount,
          avgAmount: empList.length ? Math.round(totalAmount / empList.length) : 0,
        },
        empByStatus,
        byDepartment,
        monthlyTrend,
        byApprovalDepth,
        recentInvoices: empList.slice(0, 40),
        supStats,
        analytics,
      });

      message.success('Invoice report generated');
    } catch (err) {
      console.error(err);
      message.error('Failed to load invoice report');
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    if (!reportData) { message.warning('No data to export'); return; }
    try {
      const wb = XLSX.utils.book_new();

      const summaryRows = [
        ['Invoice Management Report'],
        ['Generated:', moment().format('YYYY-MM-DD HH:mm')],
        ['Period:', `${filters.startDate} to ${filters.endDate}`],
        [],
        ['Metric', 'Value'],
        ['Total Invoices',     reportData.overview.empTotal],
        ['Pending',            reportData.overview.pending],
        ['Approved',           reportData.overview.approved],
        ['Processed',          reportData.overview.processed],
        ['Rejected',           reportData.overview.rejected],
        ['Total Amount',       `XAF ${reportData.overview.totalAmount.toLocaleString()}`],
        ['Approved Amount',    `XAF ${reportData.overview.approvedAmount.toLocaleString()}`],
        ['Average Amount',     `XAF ${reportData.overview.avgAmount.toLocaleString()}`],
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryRows), 'Summary');

      if (reportData.recentInvoices.length) {
        const rows = reportData.recentInvoices.map(inv => ({
          'Invoice #':    inv.invoiceNumber,
          'PO #':         inv.poNumber || '—',
          'Employee':     inv.employeeDetails?.name || '—',
          'Department':   inv.assignedDepartment || inv.employeeDetails?.department || '—',
          'Amount':       `XAF ${(inv.totalAmount || 0).toLocaleString()}`,
          'Status':       inv.approvalStatus?.replace(/_/g, ' ').toUpperCase(),
          'Uploaded':     inv.uploadedDate ? moment(inv.uploadedDate).format('YYYY-MM-DD') : '—',
          'Approval Level': inv.currentApprovalLevel || 0,
          'Chain Length': inv.approvalChain?.length || 0,
        }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Invoices');
      }

      if (reportData.byDepartment.length) {
        const rows = reportData.byDepartment.map(d => ({
          Department: d.dept, 'Invoice Count': d.count, 'Total Amount': `XAF ${d.totalAmount.toLocaleString()}`,
        }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'By Department');
      }

      XLSX.writeFile(wb, `Invoice_Report_${moment().format('YYYY-MM-DD')}.xlsx`);
      message.success('Exported to Excel');
    } catch (e) {
      message.error('Export failed');
    }
  };

  const invoiceColumns = [
    {
      title: 'Invoice #',
      dataIndex: 'invoiceNumber',
      key: 'inv',
      render: v => <Text code>{v}</Text>,
      width: 130,
    },
    {
      title: 'PO #',
      dataIndex: 'poNumber',
      key: 'po',
      render: v => v ? <Text code>{v}</Text> : <Text type="secondary">—</Text>,
      width: 130,
    },
    {
      title: 'Employee',
      key: 'emp',
      render: (_, r) => (
        <div>
          <Text strong>{r.employeeDetails?.name || '—'}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 11 }}>{r.employeeDetails?.department || '—'}</Text>
        </div>
      ),
    },
    {
      title: 'Amount',
      dataIndex: 'totalAmount',
      key: 'amount',
      render: v => v ? formatCurrency(v) : '—',
      sorter: (a, b) => (a.totalAmount || 0) - (b.totalAmount || 0),
      width: 130,
    },
    {
      title: 'Status',
      dataIndex: 'approvalStatus',
      key: 'status',
      render: s => {
        const colors = {
          pending_finance_assignment: 'orange',
          pending_department_approval: 'blue',
          approved: 'green',
          processed: 'cyan',
          rejected: 'red',
        };
        return <Tag color={colors[s] || 'default'} style={{ fontSize: 10 }}>{s?.replace(/_/g, ' ').toUpperCase()}</Tag>;
      },
      width: 180,
    },
    {
      title: 'Dept',
      dataIndex: 'assignedDepartment',
      key: 'dept',
      render: v => v ? <Tag color="blue" style={{ fontSize: 10 }}>{v}</Tag> : <Text type="secondary">—</Text>,
      width: 130,
    },
    {
      title: 'Approval',
      key: 'approval',
      render: (_, r) => {
        const done = (r.approvalChain || []).filter(s => s.status === 'approved').length;
        const total = (r.approvalChain || []).length;
        if (!total) return '—';
        return (
          <Space size={4}>
            <Text style={{ fontSize: 11 }}>{done}/{total}</Text>
            <Progress percent={total ? Math.round((done/total)*100) : 0} size="small" showInfo={false} style={{ width: 50 }} />
          </Space>
        );
      },
      width: 110,
    },
    {
      title: 'Uploaded',
      key: 'date',
      render: (_, r) => r.uploadedDate ? moment(r.uploadedDate).format('MMM DD, YYYY') : '—',
      sorter: (a, b) => moment(a.uploadedDate || a.createdAt).unix() - moment(b.uploadedDate || b.createdAt).unix(),
      width: 120,
    },
  ];

  if (loading && !reportData) {
    return (
      <div style={{ padding: 24, textAlign: 'center', minHeight: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spin size="large" tip="Loading invoice analytics..." />
      </div>
    );
  }

  const ov = reportData?.overview || {};

  return (
    <div style={{ padding: 24 }}>
      <Title level={2}><FileTextOutlined /> Invoice Management Reports</Title>

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
            <Text strong>Status</Text>
            <Select style={{ width: '100%', marginTop: 8 }} value={filters.status}
              onChange={v => setFilters({ ...filters, status: v })}>
              <Option value="all">All Statuses</Option>
              <Option value="pending_finance_assignment">Pending Assignment</Option>
              <Option value="pending_department_approval">Pending Approval</Option>
              <Option value="approved">Approved</Option>
              <Option value="processed">Processed</Option>
              <Option value="rejected">Rejected</Option>
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
              { title: 'Total Invoices',     value: ov.empTotal,         icon: <FileTextOutlined />,  color: '#1890ff' },
              { title: 'Pending',            value: ov.pending,          icon: <ClockCircleOutlined />,color: '#faad14' },
              { title: 'Approved',           value: ov.approved,         icon: <CheckCircleOutlined />,color: '#52c41a' },
              { title: 'Processed',          value: ov.processed,        icon: <BankOutlined />,      color: '#13c2c2' },
              { title: 'Rejected',           value: ov.rejected,         icon: <WarningOutlined />,   color: '#f5222d' },
              { title: 'Total Amount',       value: ov.totalAmount,      icon: <DollarOutlined />,    color: '#1890ff', isAmount: true },
              { title: 'Approved Amount',    value: ov.approvedAmount,   icon: <DollarOutlined />,    color: '#52c41a', isAmount: true },
              { title: 'Average Amount',     value: ov.avgAmount,        icon: <BarChartOutlined />,  color: '#722ed1', isAmount: true },
            ].map((s, i) => (
              <Col xs={12} sm={8} md={3} key={i} style={{ minWidth: 130 }}>
                <Card>
                  <Statistic title={s.title} value={s.value ?? 0} prefix={s.icon}
                    valueStyle={{ color: s.color, fontSize: s.isAmount ? 14 : 20 }}
                    formatter={s.isAmount ? v => v >= 1e6 ? `${(v/1e6).toFixed(1)}M XAF` : `${(v/1e3).toFixed(0)}K XAF` : undefined}
                  />
                </Card>
              </Col>
            ))}
          </Row>

          {/* Approval rate */}
          {ov.empTotal > 0 && (
            <Card style={{ marginBottom: 24 }}>
              <Row gutter={[32, 16]}>
                <Col xs={24} sm={8}>
                  <Text type="secondary">Approval Rate</Text>
                  <Progress
                    percent={Math.round(((ov.approved + ov.processed) / ov.empTotal) * 100)}
                    strokeColor="#52c41a"
                    style={{ marginTop: 8 }}
                  />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {ov.approved + ov.processed} of {ov.empTotal} invoices approved or processed
                  </Text>
                </Col>
                <Col xs={24} sm={8}>
                  <Text type="secondary">Pending Resolution Rate</Text>
                  <Progress
                    percent={Math.round((ov.pending / ov.empTotal) * 100)}
                    strokeColor="#faad14"
                    style={{ marginTop: 8 }}
                  />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {ov.pending} invoices awaiting action
                  </Text>
                </Col>
                <Col xs={24} sm={8}>
                  <Text type="secondary">Approved Value vs Total Submitted</Text>
                  <Progress
                    percent={ov.totalAmount > 0 ? Math.round((ov.approvedAmount / ov.totalAmount) * 100) : 0}
                    strokeColor="#1890ff"
                    style={{ marginTop: 8 }}
                  />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {formatCurrency(ov.approvedAmount)} of {formatCurrency(ov.totalAmount)} approved
                  </Text>
                </Col>
              </Row>
            </Card>
          )}

          {/* Charts */}
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={24} lg={8}>
              <Card title={<Space><PieChartOutlined /><Text>Status Distribution</Text></Space>}>
                {reportData.empByStatus.length > 0 ? (
                  <Pie
                    data={reportData.empByStatus}
                    angleField="count"
                    colorField="status"
                    radius={0.8}
                    label={{ type: 'outer', content: '{name}\n{percentage}', style: { fontSize: 10 } }}
                    legend={{ position: 'bottom' }}
                    height={280}
                    color={({ status }) => ({
                      'PENDING FINANCE ASSIGNMENT': '#fa8c16',
                      'PENDING DEPARTMENT APPROVAL': '#1890ff',
                      'APPROVED': '#52c41a',
                      'PROCESSED': '#13c2c2',
                      'REJECTED': '#f5222d',
                    }[status] || '#bfbfbf')}
                  />
                ) : <Empty description="No status data" />}
              </Card>
            </Col>
            <Col xs={24} lg={8}>
              <Card title={<Space><BarChartOutlined /><Text>Invoice Count by Department</Text></Space>}>
                {reportData.byDepartment.length > 0 ? (
                  <Bar
                    data={reportData.byDepartment}
                    xField="count"
                    yField="dept"
                    height={280}
                    label={{ position: 'right', style: { fontSize: 10 } }}
                    color="#1890ff"
                  />
                ) : <Empty description="No department data" />}
              </Card>
            </Col>
            <Col xs={24} lg={8}>
              <Card title={<Space><BarChartOutlined /><Text>Approval Chain Length</Text></Space>}>
                {reportData.byApprovalDepth.length > 0 ? (
                  <Column
                    data={reportData.byApprovalDepth}
                    xField="depth"
                    yField="count"
                    height={280}
                    label={{ position: 'top', style: { fontSize: 10 } }}
                    color="#722ed1"
                  />
                ) : <Empty description="No data" />}
              </Card>
            </Col>
          </Row>

          {/* Monthly Trend */}
          {reportData.monthlyTrend.length > 1 && (
            <Card
              title={<Space><LineChartOutlined /><Text>Monthly Invoice Volume & Amount</Text></Space>}
              style={{ marginBottom: 24 }}
            >
              <Row gutter={[16, 0]}>
                <Col xs={24} lg={12}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Invoice Count by Month</Text>
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
                  <Text type="secondary" style={{ fontSize: 12 }}>Invoice Amount by Month (XAF)</Text>
                  <Line
                    data={reportData.monthlyTrend}
                    xField="month"
                    yField="amount"
                    height={200}
                    point={{ size: 4 }}
                    smooth
                    color="#52c41a"
                    yAxis={{ label: { formatter: v => v >= 1e6 ? `${(v/1e6).toFixed(1)}M` : `${(v/1e3).toFixed(0)}K` } }}
                    tooltip={{ formatter: d => ({ name: 'Amount', value: formatCurrency(d.amount) }) }}
                    style={{ marginTop: 8 }}
                  />
                </Col>
              </Row>
            </Card>
          )}

          {/* Department Amount Chart */}
          {reportData.byDepartment.length > 0 && (
            <Card
              title={<Space><DollarOutlined /><Text>Total Invoice Amount by Department</Text></Space>}
              style={{ marginBottom: 24 }}
            >
              <Column
                data={reportData.byDepartment}
                xField="dept"
                yField="totalAmount"
                height={260}
                label={{
                  position: 'top',
                  style: { fontSize: 10 },
                  formatter: v => v >= 1e6 ? `${(v/1e6).toFixed(1)}M` : `${(v/1e3).toFixed(0)}K`,
                }}
                xAxis={{ label: { autoRotate: true, autoHide: true, style: { fontSize: 10 } } }}
                yAxis={{ label: { formatter: v => v >= 1e6 ? `${(v/1e6).toFixed(0)}M` : `${(v/1e3).toFixed(0)}K` } }}
                color="#722ed1"
                tooltip={{ formatter: d => ({ name: d.dept, value: formatCurrency(d.totalAmount) }) }}
              />
            </Card>
          )}

          {/* Invoice Table */}
          <Card title={<Space><FileTextOutlined /><Text>Invoice Records ({reportData.recentInvoices.length})</Text></Space>}>
            <Table
              columns={invoiceColumns}
              dataSource={reportData.recentInvoices}
              rowKey="_id"
              pagination={{ pageSize: 15, showSizeChanger: true, showTotal: (t, r) => `${r[0]}-${r[1]} of ${t}` }}
              scroll={{ x: 1000 }}
              size="small"
            />
          </Card>
        </>
      ) : (
        <Card>
          <Empty description="Select filters and click Generate to view invoice analytics." />
        </Card>
      )}
    </div>
  );
};

export default InvoiceManagementReports;
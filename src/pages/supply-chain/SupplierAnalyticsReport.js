import React, { useState, useEffect } from 'react';
import {
  Card, Row, Col, Typography, Button, Select, DatePicker,
  Space, Statistic, Table, Tag, Spin, message, Divider, Empty, Alert, Progress
} from 'antd';
import {
  ContactsOutlined, DownloadOutlined, FilterOutlined, ReloadOutlined,
  CheckCircleOutlined, ClockCircleOutlined, WarningOutlined,
  BarChartOutlined, PieChartOutlined, DollarOutlined,
  StarOutlined, ShopOutlined, TrophyOutlined, TeamOutlined
} from '@ant-design/icons';
import { Pie, Column, Bar } from '@ant-design/plots';
import moment from 'moment';
import * as XLSX from 'xlsx';
import api from '../../services/api';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

const formatCurrency = v => `XAF ${(v || 0).toLocaleString()}`;

const SupplierAnalyticsReport = () => {
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [filters, setFilters] = useState({
    dateRange: 'last30',
    startDate: moment().subtract(30, 'd').format('YYYY-MM-DD'),
    endDate: moment().format('YYYY-MM-DD'),
    status: 'all',
    category: 'all',
  });
  const [customDateRange, setCustomDateRange] = useState(null);

  const supplierCategories = [
    'IT Accessories','Office Supplies','Equipment','Consumables','Software',
    'Hardware','Furniture','Safety Equipment','Maintenance Supplies','Other',
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

      const [approvalStatsRes, allSuppliersRes, performanceRes, invoiceAnalyticsRes] = await Promise.allSettled([
        api.get('/suppliers/admin/approvals/statistics'),
        api.get('/suppliers/admin/all', { params: { limit: 500 } }),
        api.get('/supplier-performance/rankings?limit=50').catch(() => ({ data: { data: { rankings: [], summary: {} } } })),
        api.get('/suppliers/admin/analytics').catch(() => ({ data: {} })),
      ]);

      const approvalStats    = approvalStatsRes.status    === 'fulfilled' ? approvalStatsRes.value?.data    || {} : {};
      const suppliersPayload = allSuppliersRes.status     === 'fulfilled' ? allSuppliersRes.value?.data     || {} : {};
      const suppliers        = suppliersPayload.data || suppliersPayload.suppliers || [];
      const perfPayload      = performanceRes.status      === 'fulfilled' ? performanceRes.value?.data?.data || {} : {};
      const rankings         = perfPayload.rankings || [];
      const perfSummary      = perfPayload.summary  || {};

      // Category breakdown
      const catMap = {};
      suppliers.forEach(s => {
        const cats = s.categories || s.supplierDetails?.servicesOffered || [];
        (Array.isArray(cats) ? cats : [cats]).forEach(c => {
          catMap[c] = (catMap[c] || 0) + 1;
        });
      });
      const byCategory = Object.entries(catMap)
        .map(([cat, count]) => ({ cat, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Status breakdown
      const statusMap = {};
      suppliers.forEach(s => {
        const st = s.status || s.supplierStatus?.accountStatus || 'unknown';
        statusMap[st] = (statusMap[st] || 0) + 1;
      });
      const byStatus = Object.entries(statusMap).map(([status, count]) => ({ status: status.toUpperCase(), count }));

      // Business type breakdown
      const bizMap = {};
      suppliers.forEach(s => {
        const b = s.businessType || s.supplierDetails?.businessType || 'Other';
        bizMap[b] = (bizMap[b] || 0) + 1;
      });
      const byBizType = Object.entries(bizMap).map(([type, count]) => ({ type, count }));

      // Top suppliers by total business value
      const topByValue = suppliers
        .filter(s => s.performance?.totalBusinessValue > 0)
        .sort((a, b) => (b.performance?.totalBusinessValue || 0) - (a.performance?.totalBusinessValue || 0))
        .slice(0, 10);

      setReportData({
        overview: {
          total:         approvalStats.total         || suppliers.length,
          approved:      approvalStats.approved      || suppliers.filter(s => (s.status || s.supplierStatus?.accountStatus) === 'approved').length,
          pending:       approvalStats.pending       || 0,
          pendingSC:     approvalStats.pending_supply_chain    || 0,
          pendingHOB:    approvalStats.pending_head_of_business|| 0,
          pendingFin:    approvalStats.pending_finance         || 0,
          rejected:      approvalStats.rejected      || suppliers.filter(s => (s.status || s.supplierStatus?.accountStatus) === 'rejected').length,
          suspended:     suppliers.filter(s => (s.status || s.supplierStatus?.accountStatus) === 'suspended').length,
          topPerformers: rankings.filter(r => r.performanceGrade === 'A').length,
          avgScore:      perfSummary.averageScore || 0,
        },
        byCategory,
        byStatus,
        byBizType,
        topByValue,
        rankings: rankings.slice(0, 15),
        supplierList: suppliers.slice(0, 50),
        approvalBreakdown: [
          { stage: 'Supply Chain Review', count: approvalStats.pending_supply_chain    || 0 },
          { stage: 'Head of Business',    count: approvalStats.pending_head_of_business|| 0 },
          { stage: 'Finance Review',      count: approvalStats.pending_finance         || 0 },
        ].filter(s => s.count > 0),
      });

      message.success('Supplier analytics loaded');
    } catch (err) {
      console.error(err);
      message.error('Failed to load supplier analytics');
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    if (!reportData) { message.warning('No data to export'); return; }
    try {
      const wb = XLSX.utils.book_new();

      const summaryRows = [
        ['Supplier Analytics Report'],
        ['Generated:', moment().format('YYYY-MM-DD HH:mm')],
        ['Period:', `${filters.startDate} to ${filters.endDate}`],
        [],
        ['Metric', 'Value'],
        ['Total Suppliers',    reportData.overview.total],
        ['Approved',           reportData.overview.approved],
        ['Pending Approval',   reportData.overview.pending],
        ['Rejected',           reportData.overview.rejected],
        ['Suspended',          reportData.overview.suspended],
        ['Top Performers (A)', reportData.overview.topPerformers],
        ['Average Perf Score', `${reportData.overview.avgScore.toFixed(1)}%`],
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryRows), 'Summary');

      if (reportData.supplierList.length) {
        const rows = reportData.supplierList.map(s => ({
          'Name':          s.name || s.supplierDetails?.companyName,
          'Email':         s.email,
          'Phone':         s.phone || s.supplierDetails?.phoneNumber,
          'Status':        s.status || s.supplierStatus?.accountStatus,
          'Business Type': s.businessType || s.supplierDetails?.businessType,
          'Categories':    (s.categories || []).join(', '),
          'Total Orders':  s.performance?.totalOrders || 0,
          'Total Value':   `XAF ${(s.performance?.totalBusinessValue || 0).toLocaleString()}`,
          'Rating':        s.performance?.overallRating || 'N/A',
          'Onboard Date':  s.createdAt ? moment(s.createdAt).format('YYYY-MM-DD') : 'N/A',
        }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Suppliers');
      }

      XLSX.writeFile(wb, `Supplier_Analytics_${moment().format('YYYY-MM-DD')}.xlsx`);
      message.success('Exported to Excel');
    } catch (e) {
      message.error('Export failed');
    }
  };

  const supplierColumns = [
    {
      title: 'Supplier',
      key: 'name',
      render: (_, r) => (
        <div>
          <Text strong>{r.name || r.supplierDetails?.companyName || 'N/A'}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 11 }}>{r.email}</Text>
        </div>
      ),
    },
    {
      title: 'Type',
      key: 'type',
      render: (_, r) => <Tag>{(r.businessType || r.supplierDetails?.businessType || '—').replace(/_/g, ' ').toUpperCase()}</Tag>,
      width: 140,
    },
    {
      title: 'Categories',
      key: 'cats',
      render: (_, r) => {
        const cats = r.categories || [];
        return cats.slice(0, 2).map((c, i) => <Tag key={i} color="blue" style={{ fontSize: 11 }}>{c}</Tag>);
      },
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, r) => {
        const s = r.status || r.supplierStatus?.accountStatus || 'unknown';
        const colors = { approved: 'green', pending: 'orange', rejected: 'red', suspended: 'volcano' };
        return <Tag color={colors[s] || 'default'}>{s.toUpperCase()}</Tag>;
      },
      width: 100,
    },
    {
      title: 'Orders',
      key: 'orders',
      render: (_, r) => r.performance?.totalOrders ?? '—',
      width: 80,
    },
    {
      title: 'Total Value',
      key: 'value',
      render: (_, r) => r.performance?.totalBusinessValue ? formatCurrency(r.performance.totalBusinessValue) : '—',
      width: 130,
    },
    {
      title: 'Rating',
      key: 'rating',
      render: (_, r) => {
        const v = r.performance?.overallRating;
        return v ? <><StarOutlined style={{ color: '#faad14' }} /> {v.toFixed(1)}/5</> : '—';
      },
      width: 90,
    },
  ];

  const rankingColumns = [
    { title: '#', key: 'rank', render: (_, __, i) => i + 1, width: 50 },
    { title: 'Supplier', key: 'name', render: (_, r) => <Text strong>{r.supplierName || r.supplier?.name || 'N/A'}</Text> },
    {
      title: 'Grade',
      dataIndex: 'performanceGrade',
      key: 'grade',
      render: g => <Tag color={g === 'A' ? 'green' : g === 'B' ? 'blue' : g === 'C' ? 'orange' : 'red'}>{g}</Tag>,
      width: 70,
    },
    {
      title: 'Score',
      dataIndex: 'overallScore',
      key: 'score',
      render: v => (
        <Space>
          <Text>{(v || 0).toFixed(1)}%</Text>
          <Progress percent={v || 0} size="small" showInfo={false} style={{ width: 60 }}
            strokeColor={v >= 80 ? '#52c41a' : v >= 60 ? '#1890ff' : '#faad14'} />
        </Space>
      ),
      width: 150,
    },
    {
      title: 'Evaluations',
      dataIndex: 'evaluationCount',
      key: 'evals',
      width: 100,
    },
  ];

  if (loading && !reportData) {
    return (
      <div style={{ padding: 24, textAlign: 'center', minHeight: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spin size="large" tip="Loading supplier analytics..." />
      </div>
    );
  }

  const ov = reportData?.overview || {};

  return (
    <div style={{ padding: 24 }}>
      <Title level={2}><ContactsOutlined /> Supplier Analytics & Reports</Title>

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
            <Text strong>Status Filter</Text>
            <Select style={{ width: '100%', marginTop: 8 }} value={filters.status}
              onChange={v => setFilters({ ...filters, status: v })}>
              <Option value="all">All Statuses</Option>
              <Option value="approved">Approved</Option>
              <Option value="pending">Pending</Option>
              <Option value="rejected">Rejected</Option>
              <Option value="suspended">Suspended</Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={5}>
            <Text strong>Category</Text>
            <Select style={{ width: '100%', marginTop: 8 }} value={filters.category}
              onChange={v => setFilters({ ...filters, category: v })}>
              <Option value="all">All Categories</Option>
              {supplierCategories.map(c => <Option key={c} value={c}>{c}</Option>)}
            </Select>
          </Col>
          <Col xs={24} sm={24} md={4} style={{ display: 'flex', alignItems: 'flex-end' }}>
            <Space style={{ marginTop: 8 }} wrap>
              <Button type="primary" icon={<FilterOutlined />} onClick={fetchReportData} loading={loading}>Generate</Button>
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
              { title: 'Total Suppliers',     value: ov.total,         icon: <ContactsOutlined />, color: '#1890ff' },
              { title: 'Approved',            value: ov.approved,      icon: <CheckCircleOutlined />,color: '#52c41a' },
              { title: 'Pending Approval',    value: ov.pending,       icon: <ClockCircleOutlined />,color: '#faad14' },
              { title: 'Rejected',            value: ov.rejected,      icon: <WarningOutlined />,   color: '#f5222d' },
              { title: 'Suspended',           value: ov.suspended,     icon: <WarningOutlined />,   color: '#fa8c16' },
              { title: 'Top Performers (A)',  value: ov.topPerformers, icon: <TrophyOutlined />,    color: '#52c41a' },
              { title: 'Avg Performance Score', value: ov.avgScore,    icon: <StarOutlined />,      color: '#fa8c16', suffix: '%', precision: 1 },
            ].map((s, i) => (
              <Col xs={12} sm={8} md={3} key={i} style={{ minWidth: 140 }}>
                <Card>
                  <Statistic title={s.title} value={s.value ?? 0} prefix={s.icon}
                    valueStyle={{ color: s.color, fontSize: 18 }}
                    suffix={s.suffix} precision={s.precision ?? 0} />
                </Card>
              </Col>
            ))}
          </Row>

          {/* Pending approval pipeline */}
          {ov.pending > 0 && reportData.approvalBreakdown.length > 0 && (
            <Card title="Approval Pipeline" style={{ marginBottom: 24 }}>
              <Row gutter={[16, 16]}>
                {reportData.approvalBreakdown.map((stage, i) => (
                  <Col xs={24} sm={8} key={i}>
                    <Card size="small" style={{ backgroundColor: '#fffbe6', border: '1px solid #ffe58f' }}>
                      <Statistic title={stage.stage} value={stage.count}
                        prefix={<ClockCircleOutlined />}
                        valueStyle={{ color: '#faad14' }} />
                    </Card>
                  </Col>
                ))}
              </Row>
            </Card>
          )}

          {/* Charts */}
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={24} lg={8}>
              <Card title={<Space><PieChartOutlined /><Text>Suppliers by Status</Text></Space>}>
                {reportData.byStatus.length > 0 ? (
                  <Pie
                    data={reportData.byStatus}
                    angleField="count"
                    colorField="status"
                    radius={0.8}
                    label={{ type: 'outer', content: '{name} {percentage}', style: { fontSize: 11 } }}
                    legend={{ position: 'bottom' }}
                    height={260}
                    color={({ status }) => ({ APPROVED: '#52c41a', PENDING: '#faad14', REJECTED: '#f5222d', SUSPENDED: '#fa8c16' }[status] || '#1890ff')}
                  />
                ) : <Empty description="No status data" />}
              </Card>
            </Col>
            <Col xs={24} lg={8}>
              <Card title={<Space><BarChartOutlined /><Text>Top Categories by Supplier Count</Text></Space>}>
                {reportData.byCategory.length > 0 ? (
                  <Bar
                    data={reportData.byCategory}
                    xField="count"
                    yField="cat"
                    height={260}
                    label={{ position: 'right', style: { fontSize: 10 } }}
                    color="#1890ff"
                  />
                ) : <Empty description="No category data" />}
              </Card>
            </Col>
            <Col xs={24} lg={8}>
              <Card title={<Space><PieChartOutlined /><Text>Business Type Distribution</Text></Space>}>
                {reportData.byBizType.length > 0 ? (
                  <Pie
                    data={reportData.byBizType}
                    angleField="count"
                    colorField="type"
                    radius={0.8}
                    label={{ type: 'outer', content: '{name} {percentage}', style: { fontSize: 11 } }}
                    legend={{ position: 'bottom' }}
                    height={260}
                  />
                ) : <Empty description="No business type data" />}
              </Card>
            </Col>
          </Row>

          {/* Performance Rankings */}
          {reportData.rankings.length > 0 && (
            <Card
              title={<Space><TrophyOutlined /><Text>Performance Rankings (Top 15)</Text></Space>}
              style={{ marginBottom: 24 }}
            >
              <Table
                columns={rankingColumns}
                dataSource={reportData.rankings}
                rowKey={r => r._id || r.supplier?._id || Math.random()}
                pagination={false}
                size="small"
              />
            </Card>
          )}

          {/* Supplier Directory */}
          <Card title={<Space><ContactsOutlined /><Text>Supplier Directory (showing {reportData.supplierList.length})</Text></Space>}>
            <Table
              columns={supplierColumns}
              dataSource={reportData.supplierList}
              rowKey={r => r._id || r.email}
              pagination={{ pageSize: 15, showSizeChanger: true, showTotal: (t, r) => `${r[0]}-${r[1]} of ${t}` }}
              scroll={{ x: 900 }}
              size="small"
            />
          </Card>
        </>
      ) : (
        <Card>
          <Empty description="Select filters and click Generate to view supplier analytics." />
        </Card>
      )}
    </div>
  );
};

    export default SupplierAnalyticsReport;
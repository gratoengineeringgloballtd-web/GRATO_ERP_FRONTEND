import React, { useState, useEffect } from 'react';
import {
  Card, Row, Col, Typography, Button, Select, DatePicker,
  Space, Statistic, Table, Tag, Spin, message, Empty, Divider
} from 'antd';
import {
  WalletOutlined, DownloadOutlined, FilterOutlined, ReloadOutlined,
  CheckCircleOutlined, ClockCircleOutlined, BarChartOutlined,
  PieChartOutlined, DollarOutlined, CalendarOutlined,
  TeamOutlined, BankOutlined, LineChartOutlined
} from '@ant-design/icons';
import { Pie, Column, Line, Bar } from '@ant-design/plots';
import moment from 'moment';
import * as XLSX from 'xlsx';
import api from '../../services/api';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DEPARTMENTS = ['CEO Office','Technical','Business Development & Supply Chain','HR & Admin','IT'];

const formatCurrency = (v, short = false) => {
  if (short) {
    if (v >= 1e9) return `${(v/1e9).toFixed(2)}B XAF`;
    if (v >= 1e6) return `${(v/1e6).toFixed(2)}M XAF`;
    if (v >= 1e3) return `${(v/1e3).toFixed(0)}K XAF`;
    return `${(v || 0).toLocaleString()} XAF`;
  }
  return `XAF ${(v || 0).toLocaleString()}`;
};

const SalaryPaymentReports = () => {
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [filters, setFilters] = useState({
    year:        moment().year(),
    dateRange:   'currentYear',
    startDate:   moment().startOf('year').format('YYYY-MM-DD'),
    endDate:     moment().format('YYYY-MM-DD'),
    department:  'all',
    status:      'all',
  });
  const [customDateRange, setCustomDateRange] = useState(null);

  useEffect(() => {
    fetchReportData();
    // eslint-disable-next-line
  }, []);

  const handleDatePreset = (value) => {
    const map = {
      currentMonth:  [moment().startOf('month'),  moment().endOf('month')],
      currentQuarter:[moment().startOf('quarter'),moment().endOf('quarter')],
      currentYear:   [moment().startOf('year'),   moment()],
      lastYear:      [moment().subtract(1,'y').startOf('year'), moment().subtract(1,'y').endOf('year')],
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

      const [statsRes, allPaymentsRes] = await Promise.allSettled([
        api.get('/salary-payments/dashboard-stats'),
        api.get('/salary-payments', { params: { status: 'processed', limit: 500 } }),
      ]);

      const dashStats   = statsRes.status       === 'fulfilled' ? statsRes.value?.data?.data       || {} : {};
      const paymentsPayload = allPaymentsRes.status === 'fulfilled' ? allPaymentsRes.value?.data     || {} : {};
      const payments    = paymentsPayload.data || [];

      // Filter by date range
      const filtered = payments.filter(p => {
        const d = moment(`${p.paymentPeriod?.year}-${String(p.paymentPeriod?.month).padStart(2, '0')}`, 'YYYY-MM');
        return d.isBetween(moment(filters.startDate).subtract(1, 'd'), moment(filters.endDate).add(1, 'd'));
      });

      // Department totals across all payments
      const deptMap = {};
      filtered.forEach(p => {
        (p.departmentPayments || []).forEach(dp => {
          const dept = dp.department;
          deptMap[dept] = deptMap[dept] || { total: 0, count: 0 };
          deptMap[dept].total += dp.amount || 0;
          deptMap[dept].count++;
        });
      });
      const byDepartment = Object.entries(deptMap)
        .map(([dept, d]) => ({ dept, total: d.total, count: d.count }))
        .sort((a, b) => b.total - a.total);

      // Monthly trend
      const monthMap = {};
      filtered.forEach(p => {
        const key = `${p.paymentPeriod?.year}-${String(p.paymentPeriod?.month).padStart(2,'0')}`;
        monthMap[key] = (monthMap[key] || 0) + (p.totalAmount || 0);
      });
      const monthlyTrend = Object.entries(monthMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, total]) => ({ month, total }));

      // Year-to-date and current month
      const now = moment();
      const currentMonthPayments = filtered.filter(p =>
        p.paymentPeriod?.month === now.month() + 1 && p.paymentPeriod?.year === now.year()
      );
      const ytdPayments = filtered.filter(p => p.paymentPeriod?.year === now.year());

      const currentMonthTotal = currentMonthPayments.reduce((s, p) => s + (p.totalAmount || 0), 0);
      const ytdTotal          = ytdPayments.reduce((s, p) => s + (p.totalAmount || 0), 0);

      setReportData({
        overview: {
          totalProcessed:      filtered.length,
          totalAmount:         filtered.reduce((s, p) => s + (p.totalAmount || 0), 0),
          currentMonth:        dashStats.currentMonth  || currentMonthTotal,
          yearToDate:          dashStats.yearToDate    || ytdTotal,
          avgPaymentAmount:    filtered.length ? Math.round(filtered.reduce((s, p) => s + (p.totalAmount || 0), 0) / filtered.length) : 0,
          departmentsActive:   Object.keys(deptMap).length,
          lastPaymentDate:     dashStats.recentPayments?.[0]?.processedAt || filtered[0]?.processedAt || null,
          lastPaymentAmount:   filtered[0]?.totalAmount || 0,
        },
        byDepartment,
        monthlyTrend,
        recentPayments: filtered.slice(0, 20),
      });

      message.success('Salary report generated');
    } catch (err) {
      console.error(err);
      message.error('Failed to load salary report');
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    if (!reportData) { message.warning('No data to export'); return; }
    try {
      const wb = XLSX.utils.book_new();

      const summaryRows = [
        ['Salary Payment Report'],
        ['Generated:', moment().format('YYYY-MM-DD HH:mm')],
        ['Period:', `${filters.startDate} to ${filters.endDate}`],
        [],
        ['Metric', 'Value'],
        ['Total Payments Processed', reportData.overview.totalProcessed],
        ['Total Amount Paid',        `XAF ${reportData.overview.totalAmount.toLocaleString()}`],
        ['Current Month Total',      `XAF ${reportData.overview.currentMonth.toLocaleString()}`],
        ['Year-to-Date Total',       `XAF ${reportData.overview.yearToDate.toLocaleString()}`],
        ['Average Payment Amount',   `XAF ${reportData.overview.avgPaymentAmount.toLocaleString()}`],
        ['Departments with Payments', reportData.overview.departmentsActive],
        [],
        ['Department Breakdown'],
        ['Department', 'Total Amount', 'Payment Count'],
        ...reportData.byDepartment.map(d => [d.dept, `XAF ${d.total.toLocaleString()}`, d.count]),
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryRows), 'Summary');

      if (reportData.recentPayments.length) {
        const rows = reportData.recentPayments.map(p => {
          const row = {
            'Period':       `${MONTH_NAMES[(p.paymentPeriod?.month || 1) - 1]} ${p.paymentPeriod?.year}`,
            'Total Amount': `XAF ${(p.totalAmount || 0).toLocaleString()}`,
            'Status':       p.status,
            'Processed At': p.processedAt ? moment(p.processedAt).format('YYYY-MM-DD HH:mm') : 'N/A',
            'Description':  p.description || '',
          };
          DEPARTMENTS.forEach(d => {
            const dp = (p.departmentPayments || []).find(dp => dp.department === d);
            row[d] = dp ? `XAF ${(dp.amount || 0).toLocaleString()}` : '—';
          });
          return row;
        });
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Payments');
      }

      XLSX.writeFile(wb, `Salary_Report_${moment().format('YYYY-MM-DD')}.xlsx`);
      message.success('Exported to Excel');
    } catch (e) {
      message.error('Export failed');
    }
  };

  const paymentColumns = [
    {
      title: 'Period',
      key: 'period',
      render: (_, r) => (
        <Text strong>
          {MONTH_NAMES[(r.paymentPeriod?.month || 1) - 1]} {r.paymentPeriod?.year}
        </Text>
      ),
      width: 110,
    },
    {
      title: 'Total Amount',
      dataIndex: 'totalAmount',
      key: 'total',
      render: v => <Text strong style={{ color: '#52c41a' }}>{formatCurrency(v)}</Text>,
      sorter: (a, b) => (a.totalAmount || 0) - (b.totalAmount || 0),
      width: 140,
    },
    {
      title: 'Departments',
      key: 'depts',
      render: (_, r) => (
        <Space wrap size={4}>
          {(r.departmentPayments || []).map((dp, i) => (
            <Tag key={i} color="blue" style={{ fontSize: 10, padding: '1px 6px' }}>
              {dp.department?.split(' ').map(w => w[0]).join('')}: {formatCurrency(dp.amount, true)}
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: s => <Tag color={s === 'processed' ? 'green' : s === 'draft' ? 'orange' : 'default'}>{s?.toUpperCase()}</Tag>,
      width: 90,
    },
    {
      title: 'Processed At',
      dataIndex: 'processedAt',
      key: 'date',
      render: d => d ? moment(d).format('MMM DD, YYYY') : '—',
      sorter: (a, b) => moment(a.processedAt).unix() - moment(b.processedAt).unix(),
      width: 130,
    },
  ];

  if (loading && !reportData) {
    return (
      <div style={{ padding: 24, textAlign: 'center', minHeight: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spin size="large" tip="Loading salary payment report..." />
      </div>
    );
  }

  const ov = reportData?.overview || {};

  return (
    <div style={{ padding: 24 }}>
      <Title level={2}><WalletOutlined /> Salary Payment Reports</Title>

      {/* Filters */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={5}>
            <Text strong>Date Range</Text>
            <Select style={{ width: '100%', marginTop: 8 }} value={filters.dateRange} onChange={handleDatePreset}>
              <Option value="currentMonth">Current Month</Option>
              <Option value="currentQuarter">Current Quarter</Option>
              <Option value="currentYear">Current Year</Option>
              <Option value="lastYear">Last Year</Option>
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
              {DEPARTMENTS.map(d => <Option key={d} value={d}>{d}</Option>)}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={5}>
            <Text strong>Status</Text>
            <Select style={{ width: '100%', marginTop: 8 }} value={filters.status}
              onChange={v => setFilters({ ...filters, status: v })}>
              <Option value="all">All Statuses</Option>
              <Option value="processed">Processed</Option>
              <Option value="draft">Draft</Option>
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
              { title: 'Total Payments Processed', value: ov.totalProcessed,    icon: <CheckCircleOutlined />, color: '#52c41a' },
              { title: 'Current Month Total',      value: ov.currentMonth,      icon: <CalendarOutlined />,   color: '#1890ff',  isAmount: true },
              { title: 'Year-to-Date Total',       value: ov.yearToDate,        icon: <BarChartOutlined />,   color: '#722ed1',  isAmount: true },
              { title: 'Avg Payment Amount',       value: ov.avgPaymentAmount,  icon: <DollarOutlined />,     color: '#13c2c2',  isAmount: true },
              { title: 'Departments Active',       value: ov.departmentsActive, icon: <TeamOutlined />,       color: '#fa8c16' },
            ].map((s, i) => (
              <Col xs={12} sm={8} md={s.isAmount ? 5 : 4} key={i}>
                <Card>
                  <Statistic
                    title={s.title}
                    value={s.value ?? 0}
                    prefix={s.icon}
                    valueStyle={{ color: s.color, fontSize: s.isAmount ? 16 : 20 }}
                    formatter={s.isAmount ? v => v >= 1e6 ? `${(v/1e6).toFixed(1)}M XAF` : `${(v/1e3).toFixed(0)}K XAF` : undefined}
                  />
                </Card>
              </Col>
            ))}
          </Row>

          {/* Last payment info */}
          {ov.lastPaymentDate && (
            <Card style={{ marginBottom: 24, backgroundColor: '#f6ffed', border: '1px solid #b7eb8f' }}>
              <Space>
                <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 18 }} />
                <Text>Last payment processed: <Text strong>{moment(ov.lastPaymentDate).format('MMMM DD, YYYY [at] HH:mm')}</Text></Text>
                <Text type="secondary">— Total: <Text strong>{formatCurrency(ov.lastPaymentAmount)}</Text></Text>
              </Space>
            </Card>
          )}

          {/* Charts */}
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={24} lg={12}>
              <Card title={<Space><PieChartOutlined /><Text>Payroll Distribution by Department</Text></Space>}>
                {reportData.byDepartment.length > 0 ? (
                  <Pie
                    data={reportData.byDepartment}
                    angleField="total"
                    colorField="dept"
                    radius={0.8}
                    label={{ type: 'outer', content: '{name}\n{percentage}', style: { fontSize: 11 } }}
                    legend={{ position: 'bottom' }}
                    height={280}
                    tooltip={{ formatter: d => ({ name: d.dept, value: formatCurrency(d.total) }) }}
                  />
                ) : <Empty description="No department data" />}
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card title={<Space><BarChartOutlined /><Text>Payroll by Department (XAF)</Text></Space>}>
                {reportData.byDepartment.length > 0 ? (
                  <Bar
                    data={reportData.byDepartment}
                    xField="total"
                    yField="dept"
                    height={280}
                    label={{ position: 'right', style: { fontSize: 10 },
                      formatter: v => v >= 1e6 ? `${(v/1e6).toFixed(1)}M` : `${(v/1e3).toFixed(0)}K` }}
                    xAxis={{ label: { formatter: v => v >= 1e6 ? `${(v/1e6).toFixed(0)}M` : `${(v/1e3).toFixed(0)}K` } }}
                    color="#722ed1"
                    tooltip={{ formatter: d => ({ name: d.dept, value: formatCurrency(d.total) }) }}
                  />
                ) : <Empty description="No data" />}
              </Card>
            </Col>
          </Row>

          {/* Monthly Trend */}
          {reportData.monthlyTrend.length > 1 && (
            <Card
              title={<Space><LineChartOutlined /><Text>Monthly Payroll Trend</Text></Space>}
              style={{ marginBottom: 24 }}
            >
              <Line
                data={reportData.monthlyTrend}
                xField="month"
                yField="total"
                height={260}
                point={{ size: 5, shape: 'circle' }}
                smooth
                yAxis={{
                  label: { formatter: v => v >= 1e6 ? `${(v/1e6).toFixed(1)}M` : `${(v/1e3).toFixed(0)}K` }
                }}
                tooltip={{ formatter: d => ({ name: 'Payroll', value: formatCurrency(d.total) }) }}
                color="#1890ff"
                label={{
                  style: { fontSize: 10 },
                  formatter: v => v >= 1e6 ? `${(v/1e6).toFixed(1)}M` : '',
                }}
              />
            </Card>
          )}

          {/* Payments Table */}
          <Card title={<Space><WalletOutlined /><Text>Payment Records ({reportData.recentPayments.length})</Text></Space>}>
            <Table
              columns={paymentColumns}
              dataSource={reportData.recentPayments}
              rowKey="_id"
              pagination={{ pageSize: 12, showSizeChanger: true, showTotal: (t, r) => `${r[0]}-${r[1]} of ${t}` }}
              scroll={{ x: 900 }}
              size="small"
            />
          </Card>
        </>
      ) : (
        <Card>
          <Empty description="Select filters and click Generate to view salary payment reports." />
        </Card>
      )}
    </div>
  );
};

export default SalaryPaymentReports;
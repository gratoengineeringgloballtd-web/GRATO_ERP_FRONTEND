import React, { useState, useEffect } from 'react';
import {
  Card, Row, Col, Typography, Button, Select, DatePicker,
  Space, Statistic, Table, Tag, Spin, message, Divider, Empty, Progress, Alert
} from 'antd';
import {
  TeamOutlined, DownloadOutlined, FilterOutlined, ReloadOutlined,
  UserOutlined, CheckCircleOutlined, ClockCircleOutlined, WarningOutlined,
  BarChartOutlined, PieChartOutlined, LineChartOutlined, FileTextOutlined,
  CalendarOutlined, SafetyCertificateOutlined, MedicineBoxOutlined
} from '@ant-design/icons';
import { Pie, Column, Bar } from '@ant-design/plots';
import moment from 'moment';
import * as XLSX from 'xlsx';
import api from '../../services/api';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

const HRReports = () => {
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [filters, setFilters] = useState({
    dateRange: 'currentYear',
    startDate: moment().startOf('year').format('YYYY-MM-DD'),
    endDate: moment().format('YYYY-MM-DD'),
    department: 'all',
    status: 'all',
  });
  const [customDateRange, setCustomDateRange] = useState(null);

  const departments = [
    'CEO Office',
    'Technical',
    'Business Development & Supply Chain',
    'HR & Admin',
    'IT',
  ];

  useEffect(() => {
    fetchReportData();
    // eslint-disable-next-line
  }, []);

  const handleDatePreset = (value) => {
    const map = {
      last30:        [moment().subtract(30, 'd'), moment()],
      last90:        [moment().subtract(90, 'd'), moment()],
      currentMonth:  [moment().startOf('month'), moment().endOf('month')],
      currentQuarter:[moment().startOf('quarter'), moment().endOf('quarter')],
      currentYear:   [moment().startOf('year'), moment()],
    };
    if (map[value]) {
      setFilters({
        ...filters,
        dateRange: value,
        startDate: map[value][0].format('YYYY-MM-DD'),
        endDate:   map[value][1].format('YYYY-MM-DD'),
      });
    } else {
      setFilters({ ...filters, dateRange: value });
    }
  };

  const fetchReportData = async () => {
    try {
      setLoading(true);

      const [statsRes, employeesRes, leaveRes, expiringRes] = await Promise.allSettled([
        api.get('/hr/employees/statistics'),
        api.get('/hr/employees', { params: { limit: 500, isActive: filters.status === 'inactive' ? false : true } }),
        api.get('/leave/dashboard-stats').catch(() => ({ data: { pending: 0, total: 0 } })),
        api.get('/hr/contracts/expiring').catch(() => ({ data: { data: [] } })),
      ]);

      const stats   = statsRes.status   === 'fulfilled' ? statsRes.value?.data?.data   || statsRes.value?.data   || {} : {};
      const empList = employeesRes.status === 'fulfilled' ? employeesRes.value?.data?.data || [] : [];
      const leave   = leaveRes.status   === 'fulfilled' ? leaveRes.value?.data         || {} : {};
      const expiring = expiringRes.status === 'fulfilled' ? expiringRes.value?.data?.data || [] : [];

      // Compute department breakdown from employee list
      const deptMap = {};
      empList.forEach(e => {
        const dept = e.department || 'Unknown';
        deptMap[dept] = (deptMap[dept] || 0) + 1;
      });
      const byDepartment = Object.entries(deptMap).map(([dept, count]) => ({ dept, count }));

      // Employment status breakdown
      const statusMap = {};
      empList.forEach(e => {
        const s = e.employmentDetails?.employmentStatus || 'Unknown';
        statusMap[s] = (statusMap[s] || 0) + 1;
      });
      const byStatus = Object.entries(statusMap).map(([status, count]) => ({ status, count }));

      // Role breakdown
      const roleMap = {};
      empList.forEach(e => {
        const r = e.role || 'employee';
        roleMap[r] = (roleMap[r] || 0) + 1;
      });
      const byRole = Object.entries(roleMap).map(([role, count]) => ({ role: role.toUpperCase(), count }));

      setReportData({
        overview: {
          totalEmployees: stats.totalEmployees ?? empList.length,
          activeEmployees: stats.activeEmployees ?? empList.filter(e => e.isActive).length,
          onProbation:     stats.onProbation     ?? empList.filter(e => e.employmentDetails?.employmentStatus === 'Probation').length,
          onLeave:         stats.onLeave         ?? empList.filter(e => e.employmentDetails?.employmentStatus === 'On Leave').length,
          contractsExpiring: expiring.length,
          pendingDocuments:  stats.pendingDocuments ?? 0,
          leavePending:  leave.pending ?? 0,
          leaveTotal:    leave.total   ?? 0,
        },
        byDepartment,
        byStatus,
        byRole,
        expiringContracts: expiring.slice(0, 20),
        employeeList: empList.slice(0, 50),
      });

      message.success('HR report generated');
    } catch (err) {
      console.error('HR report error:', err);
      message.error('Failed to load HR report');
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    if (!reportData) { message.warning('No data to export'); return; }
    try {
      const wb = XLSX.utils.book_new();

      // Summary
      const summary = [
        ['HR Analytics Report'],
        ['Generated:', moment().format('YYYY-MM-DD HH:mm')],
        ['Period:', `${filters.startDate} to ${filters.endDate}`],
        [],
        ['Metric', 'Value'],
        ['Total Employees',       reportData.overview.totalEmployees],
        ['Active Employees',      reportData.overview.activeEmployees],
        ['On Probation',          reportData.overview.onProbation],
        ['On Leave',              reportData.overview.onLeave],
        ['Contracts Expiring Soon', reportData.overview.contractsExpiring],
        ['Leave Requests Pending',  reportData.overview.leavePending],
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summary), 'Summary');

      // Department breakdown
      const deptRows = reportData.byDepartment.map(d => ({ Department: d.dept, 'Employee Count': d.count }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(deptRows), 'By Department');

      // Employee list
      if (reportData.employeeList.length) {
        const empRows = reportData.employeeList.map(e => ({
          'Full Name':    e.fullName,
          'Email':        e.email,
          'Department':   e.department,
          'Position':     e.position,
          'Role':         e.role,
          'Status':       e.employmentDetails?.employmentStatus || 'N/A',
          'Start Date':   e.employmentDetails?.startDate ? moment(e.employmentDetails.startDate).format('YYYY-MM-DD') : 'N/A',
          'Active':       e.isActive ? 'Yes' : 'No',
        }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(empRows), 'Employees');
      }

      XLSX.writeFile(wb, `HR_Report_${moment().format('YYYY-MM-DD')}.xlsx`);
      message.success('Exported to Excel');
    } catch (e) {
      console.error(e);
      message.error('Export failed');
    }
  };

  const employeeColumns = [
    {
      title: 'Name',
      key: 'name',
      render: (_, r) => (
        <div>
          <Text strong>{r.fullName}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>{r.position || 'N/A'}</Text>
        </div>
      ),
    },
    { title: 'Department', dataIndex: 'department', key: 'department', render: d => <Tag color="blue">{d}</Tag> },
    { title: 'Role', dataIndex: 'role', key: 'role', render: r => <Tag>{r?.toUpperCase()}</Tag> },
    {
      title: 'Status',
      key: 'status',
      render: (_, r) => {
        const s = r.employmentDetails?.employmentStatus || 'Unknown';
        const colors = { Probation: 'orange', Ongoing: 'green', 'On Leave': 'blue', Suspended: 'red', 'Notice Period': 'volcano' };
        return <Tag color={colors[s] || 'default'}>{s}</Tag>;
      },
    },
    {
      title: 'Start Date',
      key: 'start',
      render: (_, r) => r.employmentDetails?.startDate ? moment(r.employmentDetails.startDate).format('MMM YYYY') : '—',
    },
    {
      title: 'Active',
      dataIndex: 'isActive',
      key: 'isActive',
      render: v => <Tag color={v ? 'green' : 'red'}>{v ? 'Active' : 'Inactive'}</Tag>,
    },
  ];

  const contractColumns = [
    { title: 'Employee', key: 'emp', render: (_, r) => <Text strong>{r.fullName || r.employee?.fullName || 'N/A'}</Text> },
    { title: 'Department', key: 'dept', render: (_, r) => r.department || r.employee?.department || '—' },
    {
      title: 'Contract End',
      key: 'end',
      render: (_, r) => {
        const d = r.employmentDetails?.contractEndDate || r.contractEndDate;
        if (!d) return '—';
        const daysLeft = moment(d).diff(moment(), 'days');
        return (
          <span>
            {moment(d).format('MMM DD, YYYY')}
            <Tag color={daysLeft <= 30 ? 'red' : daysLeft <= 60 ? 'orange' : 'blue'} style={{ marginLeft: 8 }}>
              {daysLeft} days
            </Tag>
          </span>
        );
      },
    },
    {
      title: 'Contract Type',
      key: 'type',
      render: (_, r) => r.employmentDetails?.contractType || r.contractType || '—',
    },
  ];

  if (loading && !reportData) {
    return (
      <div style={{ padding: 24, textAlign: 'center', minHeight: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spin size="large" tip="Loading HR analytics..." />
      </div>
    );
  }

  const ov = reportData?.overview || {};

  return (
    <div style={{ padding: 24 }}>
      <Title level={2}><TeamOutlined /> HR Analytics & Reports</Title>

      {/* Filters */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={5}>
            <Text strong>Date Range</Text>
            <Select style={{ width: '100%', marginTop: 8 }} value={filters.dateRange} onChange={handleDatePreset}>
              <Option value="last30">Last 30 Days</Option>
              <Option value="last90">Last 90 Days</Option>
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
            <Text strong>Employment Status</Text>
            <Select style={{ width: '100%', marginTop: 8 }} value={filters.status}
              onChange={v => setFilters({ ...filters, status: v })}>
              <Option value="all">All Statuses</Option>
              <Option value="active">Active</Option>
              <Option value="probation">Probation</Option>
              <Option value="inactive">Inactive</Option>
            </Select>
          </Col>
          <Col xs={24} sm={24} md={9} style={{ display: 'flex', alignItems: 'flex-end' }}>
            <Space style={{ marginTop: 8 }} wrap>
              <Button type="primary" icon={<FilterOutlined />} onClick={fetchReportData} loading={loading}>
                Generate Report
              </Button>
              <Button icon={<ReloadOutlined />} onClick={fetchReportData} loading={loading}>Refresh</Button>
              <Button icon={<DownloadOutlined />} onClick={exportToExcel} disabled={!reportData}>Export Excel</Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {reportData ? (
        <>
          {/* Overview Stats */}
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            {[
              { title: 'Total Employees',       value: ov.totalEmployees,       icon: <TeamOutlined />,             color: '#1890ff' },
              { title: 'Active Employees',       value: ov.activeEmployees,      icon: <CheckCircleOutlined />,      color: '#52c41a' },
              { title: 'On Probation',           value: ov.onProbation,          icon: <ClockCircleOutlined />,      color: '#faad14' },
              { title: 'Currently On Leave',     value: ov.onLeave,              icon: <MedicineBoxOutlined />,      color: '#13c2c2' },
              { title: 'Contracts Expiring',     value: ov.contractsExpiring,    icon: <WarningOutlined />,          color: '#f5222d' },
              { title: 'Leave Requests Pending', value: ov.leavePending,         icon: <CalendarOutlined />,         color: '#fa8c16' },
            ].map((s, i) => (
              <Col xs={12} sm={8} md={4} key={i}>
                <Card>
                  <Statistic title={s.title} value={s.value ?? 0} prefix={s.icon}
                    valueStyle={{ color: s.color, fontSize: 20 }} />
                </Card>
              </Col>
            ))}
          </Row>

          {/* Expiring contracts alert */}
          {ov.contractsExpiring > 0 && (
            <Alert
              message={`${ov.contractsExpiring} employee contract${ov.contractsExpiring !== 1 ? 's' : ''} expiring within 90 days`}
              description="Review and initiate renewal process for employees listed in the Expiring Contracts table below."
              type="warning"
              showIcon
              icon={<WarningOutlined />}
              style={{ marginBottom: 24 }}
            />
          )}

          {/* Charts */}
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={24} lg={8}>
              <Card title={<Space><PieChartOutlined /><Text>Headcount by Department</Text></Space>} style={{ height: '100%' }}>
                {reportData.byDepartment.length > 0 ? (
                  <Pie
                    data={reportData.byDepartment}
                    angleField="count"
                    colorField="dept"
                    radius={0.8}
                    label={{ type: 'outer', content: '{name}\n{percentage}', style: { fontSize: 11 } }}
                    legend={{ position: 'bottom' }}
                    height={260}
                  />
                ) : <Empty description="No department data" />}
              </Card>
            </Col>
            <Col xs={24} lg={8}>
              <Card title={<Space><BarChartOutlined /><Text>Employment Status Breakdown</Text></Space>} style={{ height: '100%' }}>
                {reportData.byStatus.length > 0 ? (
                  <Bar
                    data={reportData.byStatus}
                    xField="count"
                    yField="status"
                    height={260}
                    label={{ position: 'right', style: { fontSize: 11 } }}
                    color={['#52c41a', '#faad14', '#1890ff', '#f5222d', '#722ed1', '#13c2c2']}
                  />
                ) : <Empty description="No status data" />}
              </Card>
            </Col>
            <Col xs={24} lg={8}>
              <Card title={<Space><BarChartOutlined /><Text>Headcount by Role</Text></Space>} style={{ height: '100%' }}>
                {reportData.byRole.length > 0 ? (
                  <Column
                    data={reportData.byRole}
                    xField="role"
                    yField="count"
                    height={260}
                    label={{ position: 'top', style: { fontSize: 10 } }}
                    xAxis={{ label: { autoRotate: true, autoHide: true, style: { fontSize: 10 } } }}
                  />
                ) : <Empty description="No role data" />}
              </Card>
            </Col>
          </Row>

          {/* Expiring Contracts Table */}
          {reportData.expiringContracts.length > 0 && (
            <Card
              title={<Space><WarningOutlined style={{ color: '#f5222d' }} /><Text>Expiring Contracts ({reportData.expiringContracts.length})</Text></Space>}
              style={{ marginBottom: 24 }}
            >
              <Table
                columns={contractColumns}
                dataSource={reportData.expiringContracts}
                rowKey="_id"
                pagination={{ pageSize: 10 }}
                size="small"
              />
            </Card>
          )}

          {/* Employee Directory */}
          <Card
            title={<Space><TeamOutlined /><Text>Employee Directory (showing {reportData.employeeList.length})</Text></Space>}
          >
            <Table
              columns={employeeColumns}
              dataSource={reportData.employeeList}
              rowKey="_id"
              pagination={{ pageSize: 15, showSizeChanger: true, showTotal: (t, r) => `${r[0]}-${r[1]} of ${t}` }}
              scroll={{ x: 900 }}
              size="small"
            />
          </Card>
        </>
      ) : (
        <Card>
          <Empty description="Select filters and click Generate Report to view HR analytics." />
        </Card>
      )}
    </div>
  );
};

export default HRReports;
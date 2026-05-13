import React, { useState, useEffect } from 'react';
import {
  Card, Row, Col, Typography, Button, Select, DatePicker,
  Space, Statistic, Table, Tag, Spin, message, Empty, Alert, Progress, Divider
} from 'antd';
import {
  BarcodeOutlined, DownloadOutlined, FilterOutlined, ReloadOutlined,
  CheckCircleOutlined, ClockCircleOutlined, WarningOutlined,
  BarChartOutlined, PieChartOutlined, DollarOutlined,
  ToolOutlined, SwapOutlined, UserOutlined
} from '@ant-design/icons';
import { Pie, Column, Bar } from '@ant-design/plots';
import moment from 'moment';
import * as XLSX from 'xlsx';
import api from '../../services/api';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

const formatCurrency = v => `XAF ${(v || 0).toLocaleString()}`;

const FixedAssetAnalytics = () => {
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [filters, setFilters] = useState({
    dateRange: 'currentYear',
    startDate: moment().startOf('year').format('YYYY-MM-DD'),
    endDate: moment().format('YYYY-MM-DD'),
    status: 'all',
    condition: 'all',
  });
  const [customDateRange, setCustomDateRange] = useState(null);

  useEffect(() => {
    fetchReportData();
    // eslint-disable-next-line
  }, []);

  const handleDatePreset = (value) => {
    const map = {
      last30:        [moment().subtract(30, 'd'), moment()],
      last90:        [moment().subtract(90, 'd'), moment()],
      currentYear:   [moment().startOf('year'),   moment()],
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

      const [dashRes, assetsRes] = await Promise.allSettled([
        api.get('/fixed-assets/dashboard'),
        api.get('/fixed-assets', { params: { limit: 500 } }),
      ]);

      const dash         = dashRes.status   === 'fulfilled' ? dashRes.value?.data?.data   || {} : {};
      const dashSummary  = dash.summary   || {};
      const dashValuation= dash.valuation || {};
      const assetsPayload= assetsRes.status === 'fulfilled' ? assetsRes.value?.data?.data || assetsRes.value?.data?.assets || [] : [];
      const assets       = Array.isArray(assetsPayload) ? assetsPayload : [];

      // Status breakdown
      const statusMap = {};
      assets.forEach(a => { const s = a.status || 'active'; statusMap[s] = (statusMap[s] || 0) + 1; });
      const byStatus = Object.entries(statusMap).map(([status, count]) => ({ status: status.toUpperCase(), count }));

      // Condition breakdown
      const condMap = {};
      assets.forEach(a => { const c = a.condition || 'good'; condMap[c] = (condMap[c] || 0) + 1; });
      const byCondition = Object.entries(condMap).map(([condition, count]) => ({ condition: condition.toUpperCase(), count }));

      // Department breakdown (from currentAssignment)
      const deptMap = {};
      assets.forEach(a => {
        const dept = a.currentAssignment?.assignedDepartment || a.physicalLocation?.building || 'Unassigned';
        deptMap[dept] = (deptMap[dept] || 0) + 1;
      });
      const byDepartment = Object.entries(deptMap)
        .map(([dept, count]) => ({ dept, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);

      // Depreciation method breakdown
      const depMap = {};
      assets.forEach(a => { const m = a.depreciationMethod || 'none'; depMap[m] = (depMap[m] || 0) + 1; });
      const byDepMethod = Object.entries(depMap).map(([method, count]) => ({ method: method.replace(/-/g, ' ').toUpperCase(), count }));

      // Total values
      const totalAcquisitionCost = assets.reduce((s, a) => s + (a.acquisitionCost || 0), 0);
      const totalMaintenanceCost = assets.reduce((s, a) => {
        return s + (a.maintenanceHistory || []).reduce((ms, m) => ms + (m.cost || 0), 0);
      }, 0);

      // Overdue inspections
      const overdueAssets = assets.filter(a => a.nextInspectionDue && moment(a.nextInspectionDue).isBefore(moment()));

      // Assets acquired this year
      const acquiredThisYear = assets.filter(a => moment(a.acquisitionDate).isSameOrAfter(moment().startOf('year')));

      setReportData({
        overview: {
          totalAssets:      dashSummary.totalAssets    || assets.length,
          inUse:            dashSummary.inUseAssets    || assets.filter(a => a.status === 'in-use').length,
          inStorage:        assets.filter(a => a.status === 'in-storage').length,
          inMaintenance:    assets.filter(a => a.status === 'in-maintenance').length,
          retired:          assets.filter(a => ['retired', 'disposed'].includes(a.status)).length,
          overdueInspections: dashSummary.overdueInspections || overdueAssets.length,
          totalAcquisitionCost,
          totalCurrentValue:  dashValuation.totalCurrentValue || 0,
          totalMaintenanceCost,
          acquiredThisYear:   acquiredThisYear.length,
        },
        byStatus,
        byCondition,
        byDepartment,
        byDepMethod,
        overdueAssets: overdueAssets.slice(0, 20),
        recentAssets:  assets.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 30),
        assetList:     assets.slice(0, 50),
      });

      message.success('Asset analytics loaded');
    } catch (err) {
      console.error(err);
      message.error('Failed to load asset analytics');
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    if (!reportData) { message.warning('No data to export'); return; }
    try {
      const wb = XLSX.utils.book_new();

      const summaryRows = [
        ['Fixed Asset Analytics Report'],
        ['Generated:', moment().format('YYYY-MM-DD HH:mm')],
        [],
        ['Metric', 'Value'],
        ['Total Assets',           reportData.overview.totalAssets],
        ['In Use',                 reportData.overview.inUse],
        ['In Storage',             reportData.overview.inStorage],
        ['In Maintenance',         reportData.overview.inMaintenance],
        ['Retired/Disposed',       reportData.overview.retired],
        ['Overdue Inspections',    reportData.overview.overdueInspections],
        ['Total Acquisition Cost', `XAF ${reportData.overview.totalAcquisitionCost.toLocaleString()}`],
        ['Total Current Value',    `XAF ${reportData.overview.totalCurrentValue.toLocaleString()}`],
        ['Total Maintenance Cost', `XAF ${reportData.overview.totalMaintenanceCost.toLocaleString()}`],
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryRows), 'Summary');

      if (reportData.assetList.length) {
        const rows = reportData.assetList.map(a => ({
          'Asset Tag':          a.assetTag,
          'Asset Name':         a.assetName,
          'Status':             a.status,
          'Condition':          a.condition,
          'Acquisition Date':   a.acquisitionDate ? moment(a.acquisitionDate).format('YYYY-MM-DD') : 'N/A',
          'Acquisition Cost':   `XAF ${(a.acquisitionCost || 0).toLocaleString()}`,
          'Assigned To':        a.currentAssignment?.assignedToName || 'Unassigned',
          'Department':         a.currentAssignment?.assignedDepartment || 'N/A',
          'Next Inspection':    a.nextInspectionDue ? moment(a.nextInspectionDue).format('YYYY-MM-DD') : 'N/A',
        }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Assets');
      }

      if (reportData.overdueAssets.length) {
        const rows = reportData.overdueAssets.map(a => ({
          'Asset Tag':          a.assetTag,
          'Asset Name':         a.assetName,
          'Inspection Due':     a.nextInspectionDue ? moment(a.nextInspectionDue).format('YYYY-MM-DD') : 'N/A',
          'Days Overdue':       a.nextInspectionDue ? moment().diff(moment(a.nextInspectionDue), 'days') : 0,
          'Assigned To':        a.currentAssignment?.assignedToName || 'Unassigned',
        }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Overdue Inspections');
      }

      XLSX.writeFile(wb, `FixedAsset_Analytics_${moment().format('YYYY-MM-DD')}.xlsx`);
      message.success('Exported to Excel');
    } catch (e) {
      message.error('Export failed');
    }
  };

  const assetColumns = [
    {
      title: 'Asset Tag',
      dataIndex: 'assetTag',
      key: 'tag',
      render: v => <Text code>{v}</Text>,
      width: 100,
    },
    {
      title: 'Asset Name',
      dataIndex: 'assetName',
      key: 'name',
      render: (v, r) => (
        <div>
          <Text strong>{v}</Text>
          {r.manufacturer && <><br /><Text type="secondary" style={{ fontSize: 11 }}>{r.manufacturer}</Text></>}
        </div>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: s => {
        const colors = { 'in-use': 'green', active: 'cyan', 'in-maintenance': 'orange', 'in-storage': 'blue', retired: 'default', disposed: 'red' };
        return <Tag color={colors[s] || 'default'}>{s?.replace(/-/g, ' ').toUpperCase()}</Tag>;
      },
      width: 120,
    },
    {
      title: 'Condition',
      dataIndex: 'condition',
      key: 'condition',
      render: c => {
        const colors = { excellent: 'green', good: 'cyan', fair: 'orange', poor: 'red', damaged: 'volcano' };
        return <Tag color={colors[c] || 'default'}>{c?.toUpperCase()}</Tag>;
      },
      width: 100,
    },
    {
      title: 'Acquisition Cost',
      dataIndex: 'acquisitionCost',
      key: 'cost',
      render: v => v ? formatCurrency(v) : '—',
      width: 130,
    },
    {
      title: 'Assigned To',
      key: 'assigned',
      render: (_, r) => r.currentAssignment?.assignedToName || <Text type="secondary">Unassigned</Text>,
      width: 140,
    },
    {
      title: 'Next Inspection',
      key: 'inspection',
      render: (_, r) => {
        if (!r.nextInspectionDue) return '—';
        const isOverdue = moment(r.nextInspectionDue).isBefore(moment());
        return (
          <span style={{ color: isOverdue ? '#f5222d' : 'inherit' }}>
            {moment(r.nextInspectionDue).format('MMM DD, YYYY')}
            {isOverdue && <Tag color="red" style={{ marginLeft: 4, fontSize: 10 }}>OVERDUE</Tag>}
          </span>
        );
      },
      width: 160,
    },
  ];

  const overdueColumns = [
    { title: 'Asset Tag', dataIndex: 'assetTag', key: 'tag', render: v => <Text code>{v}</Text>, width: 100 },
    { title: 'Asset Name', dataIndex: 'assetName', key: 'name' },
    {
      title: 'Inspection Due',
      key: 'due',
      render: (_, r) => r.nextInspectionDue ? moment(r.nextInspectionDue).format('MMM DD, YYYY') : '—',
      width: 130,
    },
    {
      title: 'Days Overdue',
      key: 'days',
      render: (_, r) => {
        if (!r.nextInspectionDue) return '—';
        const days = moment().diff(moment(r.nextInspectionDue), 'days');
        return <Tag color={days > 60 ? 'red' : days > 30 ? 'orange' : 'gold'}>{days} days</Tag>;
      },
      width: 120,
    },
    {
      title: 'Assigned To',
      key: 'assigned',
      render: (_, r) => r.currentAssignment?.assignedToName || <Text type="secondary">Unassigned</Text>,
    },
    {
      title: 'Condition',
      dataIndex: 'condition',
      key: 'cond',
      render: c => <Tag color={c === 'poor' || c === 'damaged' ? 'red' : 'orange'}>{c?.toUpperCase()}</Tag>,
      width: 100,
    },
  ];

  if (loading && !reportData) {
    return (
      <div style={{ padding: 24, textAlign: 'center', minHeight: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spin size="large" tip="Loading asset analytics..." />
      </div>
    );
  }

  const ov = reportData?.overview || {};

  return (
    <div style={{ padding: 24 }}>
      <Title level={2}><BarcodeOutlined /> Fixed Asset Analytics</Title>

      {/* Filters */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={5}>
            <Text strong>Date Range</Text>
            <Select style={{ width: '100%', marginTop: 8 }} value={filters.dateRange} onChange={handleDatePreset}>
              <Option value="last30">Last 30 Days</Option>
              <Option value="last90">Last 90 Days</Option>
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
            <Text strong>Asset Status</Text>
            <Select style={{ width: '100%', marginTop: 8 }} value={filters.status}
              onChange={v => setFilters({ ...filters, status: v })}>
              <Option value="all">All Statuses</Option>
              <Option value="active">Active</Option>
              <Option value="in-use">In Use</Option>
              <Option value="in-maintenance">In Maintenance</Option>
              <Option value="in-storage">In Storage</Option>
              <Option value="retired">Retired/Disposed</Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={5}>
            <Text strong>Condition</Text>
            <Select style={{ width: '100%', marginTop: 8 }} value={filters.condition}
              onChange={v => setFilters({ ...filters, condition: v })}>
              <Option value="all">All Conditions</Option>
              <Option value="excellent">Excellent</Option>
              <Option value="good">Good</Option>
              <Option value="fair">Fair</Option>
              <Option value="poor">Poor</Option>
              <Option value="damaged">Damaged</Option>
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
              { title: 'Total Assets',          value: ov.totalAssets,          icon: <BarcodeOutlined />,     color: '#1890ff' },
              { title: 'In Use',                value: ov.inUse,                icon: <CheckCircleOutlined />, color: '#52c41a' },
              { title: 'In Storage',            value: ov.inStorage,            icon: <ClockCircleOutlined />, color: '#13c2c2' },
              { title: 'In Maintenance',        value: ov.inMaintenance,        icon: <ToolOutlined />,        color: '#fa8c16' },
              { title: 'Overdue Inspections',   value: ov.overdueInspections,   icon: <WarningOutlined />,     color: '#f5222d' },
              { title: 'Acquired This Year',    value: ov.acquiredThisYear,     icon: <BarcodeOutlined />,     color: '#722ed1' },
            ].map((s, i) => (
              <Col xs={12} sm={8} md={4} key={i}>
                <Card>
                  <Statistic title={s.title} value={s.value ?? 0} prefix={s.icon}
                    valueStyle={{ color: s.color, fontSize: 18 }} />
                </Card>
              </Col>
            ))}
          </Row>

          {/* Financial Overview */}
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            {[
              { title: 'Total Acquisition Cost', value: ov.totalAcquisitionCost, color: '#1890ff' },
              { title: 'Total Current Value',    value: ov.totalCurrentValue,    color: '#52c41a' },
              { title: 'Total Maintenance Cost', value: ov.totalMaintenanceCost, color: '#fa8c16' },
            ].map((s, i) => (
              <Col xs={24} sm={8} key={i}>
                <Card>
                  <Statistic
                    title={s.title}
                    value={s.value ?? 0}
                    prefix={<DollarOutlined />}
                    valueStyle={{ color: s.color, fontSize: 18 }}
                    formatter={v => v >= 1e6 ? `XAF ${(v/1e6).toFixed(2)}M` : `XAF ${v.toLocaleString()}`}
                  />
                </Card>
              </Col>
            ))}
          </Row>

          {/* Depreciation progress */}
          {(ov.totalAcquisitionCost > 0 && ov.totalCurrentValue > 0) && (
            <Card title="Asset Value Overview" style={{ marginBottom: 24 }}>
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12}>
                  <Text type="secondary">Current Value vs Acquisition Cost</Text>
                  <Progress
                    percent={Math.round((ov.totalCurrentValue / ov.totalAcquisitionCost) * 100)}
                    strokeColor="#52c41a"
                    style={{ marginTop: 8 }}
                  />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Accumulated Depreciation: {formatCurrency(ov.totalAcquisitionCost - ov.totalCurrentValue)}
                    {' '}({Math.round(((ov.totalAcquisitionCost - ov.totalCurrentValue) / ov.totalAcquisitionCost) * 100)}%)
                  </Text>
                </Col>
                <Col xs={24} sm={12}>
                  <Text type="secondary">Asset Utilisation (In Use vs Total)</Text>
                  <Progress
                    percent={Math.round((ov.inUse / ov.totalAssets) * 100)}
                    strokeColor="#1890ff"
                    style={{ marginTop: 8 }}
                  />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {ov.inUse} of {ov.totalAssets} assets currently deployed
                  </Text>
                </Col>
              </Row>
            </Card>
          )}

          {/* Overdue inspections alert */}
          {ov.overdueInspections > 0 && (
            <Alert
              message={`${ov.overdueInspections} asset${ov.overdueInspections !== 1 ? 's' : ''} with overdue inspection${ov.overdueInspections !== 1 ? 's' : ''}`}
              description="These assets require immediate inspection scheduling. Review the table below."
              type="error" showIcon icon={<WarningOutlined />}
              style={{ marginBottom: 24 }}
            />
          )}

          {/* Charts */}
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={24} lg={8}>
              <Card title={<Space><PieChartOutlined /><Text>By Status</Text></Space>}>
                {reportData.byStatus.length > 0 ? (
                  <Pie
                    data={reportData.byStatus}
                    angleField="count"
                    colorField="status"
                    radius={0.8}
                    label={{ type: 'outer', content: '{name} {percentage}', style: { fontSize: 11 } }}
                    legend={{ position: 'bottom' }}
                    height={240}
                    color={({ status }) => ({
                      'IN-USE': '#52c41a', 'ACTIVE': '#1890ff', 'IN-MAINTENANCE': '#fa8c16',
                      'IN-STORAGE': '#13c2c2', 'RETIRED': '#bfbfbf', 'DISPOSED': '#f5222d',
                    }[status] || '#1890ff')}
                  />
                ) : <Empty description="No status data" />}
              </Card>
            </Col>
            <Col xs={24} lg={8}>
              <Card title={<Space><PieChartOutlined /><Text>By Condition</Text></Space>}>
                {reportData.byCondition.length > 0 ? (
                  <Pie
                    data={reportData.byCondition}
                    angleField="count"
                    colorField="condition"
                    radius={0.8}
                    label={{ type: 'outer', content: '{name} {percentage}', style: { fontSize: 11 } }}
                    legend={{ position: 'bottom' }}
                    height={240}
                    color={({ condition }) => ({
                      EXCELLENT: '#52c41a', GOOD: '#1890ff', FAIR: '#faad14', POOR: '#fa8c16', DAMAGED: '#f5222d',
                    }[condition] || '#1890ff')}
                  />
                ) : <Empty description="No condition data" />}
              </Card>
            </Col>
            <Col xs={24} lg={8}>
              <Card title={<Space><BarChartOutlined /><Text>By Department</Text></Space>}>
                {reportData.byDepartment.length > 0 ? (
                  <Bar
                    data={reportData.byDepartment}
                    xField="count"
                    yField="dept"
                    height={240}
                    label={{ position: 'right', style: { fontSize: 10 } }}
                    color="#722ed1"
                  />
                ) : <Empty description="No department data" />}
              </Card>
            </Col>
          </Row>

          {/* Overdue Inspections Table */}
          {reportData.overdueAssets.length > 0 && (
            <Card
              title={<Space><WarningOutlined style={{ color: '#f5222d' }} /><Text>Overdue Inspections ({reportData.overdueAssets.length})</Text></Space>}
              style={{ marginBottom: 24 }}
            >
              <Table
                columns={overdueColumns}
                dataSource={reportData.overdueAssets}
                rowKey="assetTag"
                pagination={{ pageSize: 10 }}
                size="small"
                scroll={{ x: 700 }}
              />
            </Card>
          )}

          {/* Full Asset Table */}
          <Card title={<Space><BarcodeOutlined /><Text>Asset Registry (showing {reportData.assetList.length})</Text></Space>}>
            <Table
              columns={assetColumns}
              dataSource={reportData.assetList}
              rowKey="assetTag"
              pagination={{ pageSize: 15, showSizeChanger: true, showTotal: (t, r) => `${r[0]}-${r[1]} of ${t}` }}
              scroll={{ x: 900 }}
              size="small"
            />
          </Card>
        </>
      ) : (
        <Card>
          <Empty description="Select filters and click Generate to view asset analytics." />
        </Card>
      )}
    </div>
  );
};

export default FixedAssetAnalytics;
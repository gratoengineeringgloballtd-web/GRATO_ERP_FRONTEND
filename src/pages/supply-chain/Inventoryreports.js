import React, { useState, useEffect } from 'react';
import {
  Card, Row, Col, Typography, Button, Select, DatePicker,
  Space, Statistic, Table, Tag, Spin, message, Empty, Alert
} from 'antd';
import {
  DatabaseOutlined, DownloadOutlined, FilterOutlined, ReloadOutlined,
  WarningOutlined, CheckCircleOutlined, ClockCircleOutlined,
  BarChartOutlined, PieChartOutlined, DollarOutlined,
  InboxOutlined, ShoppingOutlined, SwapOutlined, RiseOutlined
} from '@ant-design/icons';
import { Pie, Column, Bar, Line } from '@ant-design/plots';
import moment from 'moment';
import * as XLSX from 'xlsx';
import api from '../../services/api';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

const formatCurrency = v => `XAF ${(v || 0).toLocaleString()}`;

// Safely extract an array from various API response shapes
const toArray = (val) => {
  if (Array.isArray(val)) return val;
  if (val && Array.isArray(val.items)) return val.items;
  if (val && Array.isArray(val.data)) return val.data;
  if (val && Array.isArray(val.transactions)) return val.transactions;
  return [];
};

const InventoryReports = () => {
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [filters, setFilters] = useState({
    dateRange: 'last30',
    startDate: moment().subtract(30, 'd').format('YYYY-MM-DD'),
    endDate: moment().format('YYYY-MM-DD'),
    category: 'all',
    transactionType: 'all',
  });
  const [customDateRange, setCustomDateRange] = useState(null);

  useEffect(() => {
    fetchReportData();
    // eslint-disable-next-line
  }, []);

  const handleDatePreset = (value) => {
    const map = {
      last7:          [moment().subtract(7,  'd'), moment()],
      last30:         [moment().subtract(30, 'd'), moment()],
      currentMonth:   [moment().startOf('month'),  moment().endOf('month')],
      currentQuarter: [moment().startOf('quarter'), moment().endOf('quarter')],
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

      const [dashRes, stockRes, txnRes, alertRes, valRes, movRes] = await Promise.allSettled([
        api.get('/inventory/dashboard'),
        api.get('/inventory/available-stock'),
        api.get('/inventory/transactions', {
          params: { startDate: filters.startDate, endDate: filters.endDate, limit: 200 },
        }),
        api.get('/inventory/reorder-alerts'),
        api.get('/inventory/valuation'),
        api.get('/inventory/movement-report', {
          params: { startDate: filters.startDate, endDate: filters.endDate },
        }),
      ]);

      // Dashboard / summary
      const dash    = dashRes.status === 'fulfilled' ? dashRes.value?.data?.data || {} : {};
      const summary = dash.summary || {};

      // Defensive array extraction for every list
      const stock  = toArray(stockRes.status  === 'fulfilled' ? stockRes.value?.data?.data  ?? stockRes.value?.data  : []);
      const txns   = toArray(txnRes.status    === 'fulfilled' ? txnRes.value?.data?.data    ?? txnRes.value?.data    : []);
      const alerts = toArray(alertRes.status  === 'fulfilled' ? alertRes.value?.data?.data  ?? alertRes.value?.data  : []);

      const valPayload = valRes.status === 'fulfilled' ? valRes.value?.data?.data || {} : {};

      // Category breakdown from stock list
      const catMap = {};
      stock.forEach(item => {
        const cat = item.category || 'Uncategorized';
        catMap[cat] = catMap[cat] || { count: 0, value: 0 };
        catMap[cat].count++;
        catMap[cat].value += (item.stockQuantity || 0) * (item.averageCost || item.standardPrice || 0);
      });
      const byCategory = Object.entries(catMap)
        .map(([cat, d]) => ({ cat, count: d.count, value: d.value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);

      // Transaction type breakdown
      const txnTypeMap = {};
      txns.forEach(t => {
        txnTypeMap[t.transactionType] = (txnTypeMap[t.transactionType] || 0) + 1;
      });
      const byTxnType = Object.entries(txnTypeMap).map(([type, count]) => ({
        type: type.toUpperCase(),
        count,
      }));

      // Monthly transaction trend
      const monthMap = {};
      txns.forEach(t => {
        const mo = moment(t.transactionDate || t.createdAt).format('YYYY-MM');
        monthMap[mo] = monthMap[mo] || { inbound: 0, outbound: 0, total: 0 };
        monthMap[mo].total++;
        if (t.transactionType === 'inbound')  monthMap[mo].inbound++;
        if (t.transactionType === 'outbound') monthMap[mo].outbound++;
      });
      const trendData = Object.entries(monthMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .flatMap(([month, d]) => [
          { month, type: 'Inbound',  count: d.inbound  },
          { month, type: 'Outbound', count: d.outbound },
        ]);

      // Stock status breakdown
      const outOfStock = stock.filter(i => (i.stockQuantity || 0) === 0).length;
      const lowStock   = alerts.length;
      const healthy    = stock.length - outOfStock - lowStock;

      setReportData({
        overview: {
          totalItems:        summary.totalItems      || stock.length,
          lowStock:          summary.lowStockItems   || lowStock,
          outOfStock:        summary.outOfStockItems || outOfStock,
          healthyStock:      Math.max(healthy, 0),
          totalValue:        summary.totalStockValue || valPayload.totalValue || 0,
          totalTransactions: txns.length,
          inboundCount:      txns.filter(t => t.transactionType === 'inbound').length,
          outboundCount:     txns.filter(t => t.transactionType === 'outbound').length,
        },
        byCategory,
        byTxnType,
        trendData,
        reorderAlerts:      alerts.slice(0, 20),
        recentTransactions: txns.slice(0, 30),
        stockItems:         stock.slice(0, 40),
      });

      message.success('Inventory report generated');
    } catch (err) {
      console.error(err);
      message.error('Failed to load inventory report');
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    if (!reportData) { message.warning('No data to export'); return; }
    try {
      const wb = XLSX.utils.book_new();
      const summaryRows = [
        ['Inventory Analytics Report'],
        ['Generated:', moment().format('YYYY-MM-DD HH:mm')],
        ['Period:', `${filters.startDate} to ${filters.endDate}`],
        [],
        ['Metric', 'Value'],
        ['Total Items',            reportData.overview.totalItems],
        ['Low Stock Alerts',       reportData.overview.lowStock],
        ['Out of Stock',           reportData.overview.outOfStock],
        ['Total Stock Value',      `XAF ${reportData.overview.totalValue.toLocaleString()}`],
        ['Transactions in Period', reportData.overview.totalTransactions],
        ['Inbound',                reportData.overview.inboundCount],
        ['Outbound',               reportData.overview.outboundCount],
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryRows), 'Summary');

      if (reportData.reorderAlerts.length) {
        const alertRows = reportData.reorderAlerts.map(i => ({
          'Item Code':     i.code || i.displayCode,
          'Description':   i.description,
          'Category':      i.category,
          'Current Stock': i.stockQuantity,
          'Reorder Point': i.reorderPoint,
          'Min Stock':     i.minimumStock,
        }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(alertRows), 'Reorder Alerts');
      }

      if (reportData.recentTransactions.length) {
        const txnRows = reportData.recentTransactions.map(t => ({
          'Transaction #': t.transactionNumber,
          'Type':          t.transactionType,
          'Quantity':      t.quantity,
          'Unit Price':    t.unitPrice,
          'Status':        t.status,
          'Date':          moment(t.transactionDate || t.createdAt).format('YYYY-MM-DD'),
        }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(txnRows), 'Transactions');
      }

      XLSX.writeFile(wb, `Inventory_Report_${moment().format('YYYY-MM-DD')}.xlsx`);
      message.success('Exported to Excel');
    } catch (e) {
      message.error('Export failed');
    }
  };

  const txnColumns = [
    {
      title: 'Txn #',
      dataIndex: 'transactionNumber',
      key: 'txnNo',
      render: v => <Text code>{v || '—'}</Text>,
      width: 130,
    },
    {
      title: 'Type',
      dataIndex: 'transactionType',
      key: 'type',
      render: t => {
        const colors = { inbound: 'green', outbound: 'orange', adjustment: 'blue', transfer: 'purple' };
        return <Tag color={colors[t] || 'default'}>{t?.toUpperCase()}</Tag>;
      },
      width: 110,
    },
    { title: 'Qty',       dataIndex: 'quantity',  key: 'qty',   width: 70 },
    {
      title: 'Unit Price',
      dataIndex: 'unitPrice',
      key: 'price',
      render: v => v ? formatCurrency(v) : '—',
      width: 120,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: s => (
        <Tag color={s === 'completed' ? 'green' : s === 'pending' ? 'orange' : 'default'}>
          {s?.toUpperCase()}
        </Tag>
      ),
      width: 100,
    },
    {
      title: 'Date',
      key: 'date',
      render: (_, r) => moment(r.transactionDate || r.createdAt).format('MMM DD, YYYY'),
      width: 120,
    },
  ];

  const alertColumns = [
    {
      title: 'Code',
      key: 'code',
      render: (_, r) => <Text code>{r.code || r.displayCode || '—'}</Text>,
      width: 100,
    },
    { title: 'Description', dataIndex: 'description', key: 'desc' },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'cat',
      render: v => <Tag color="blue">{v}</Tag>,
      width: 130,
    },
    {
      title: 'Current Stock',
      dataIndex: 'stockQuantity',
      key: 'stock',
      render: (v, r) => (
        <span>
          <Text style={{ color: v === 0 ? '#f5222d' : '#faad14' }}>{v}</Text>
          {` / min ${r.minimumStock || 0}`}
        </span>
      ),
      width: 130,
    },
    { title: 'Reorder Point', dataIndex: 'reorderPoint', key: 'reorder', width: 110 },
    {
      title: 'Urgency',
      key: 'urgency',
      render: (_, r) => (
        r.stockQuantity === 0
          ? <Tag color="red">OUT OF STOCK</Tag>
          : <Tag color="orange">LOW STOCK</Tag>
      ),
      width: 120,
    },
  ];

  if (loading && !reportData) {
    return (
      <div style={{
        padding: 24, textAlign: 'center', minHeight: 400,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Spin size="large" tip="Loading inventory analytics..." />
      </div>
    );
  }

  const ov = reportData?.overview || {};

  return (
    <div style={{ padding: 24 }}>
      <Title level={2}><DatabaseOutlined /> Inventory Analytics &amp; Reports</Title>

      {/* Filters */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={5}>
            <Text strong>Date Range</Text>
            <Select
              style={{ width: '100%', marginTop: 8 }}
              value={filters.dateRange}
              onChange={handleDatePreset}
            >
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
                    setFilters({
                      ...filters,
                      startDate: dates[0].format('YYYY-MM-DD'),
                      endDate:   dates[1].format('YYYY-MM-DD'),
                    });
                  }
                }}
              />
            </Col>
          )}

          <Col xs={24} sm={12} md={5}>
            <Text strong>Transaction Type</Text>
            <Select
              style={{ width: '100%', marginTop: 8 }}
              value={filters.transactionType}
              onChange={v => setFilters({ ...filters, transactionType: v })}
            >
              <Option value="all">All Types</Option>
              <Option value="inbound">Inbound</Option>
              <Option value="outbound">Outbound</Option>
              <Option value="adjustment">Adjustment</Option>
              <Option value="transfer">Transfer</Option>
            </Select>
          </Col>

          <Col xs={24} sm={24} md={9} style={{ display: 'flex', alignItems: 'flex-end' }}>
            <Space style={{ marginTop: 8 }} wrap>
              <Button type="primary" icon={<FilterOutlined />} onClick={fetchReportData} loading={loading}>
                Generate Report
              </Button>
              <Button icon={<ReloadOutlined />} onClick={fetchReportData} loading={loading}>
                Refresh
              </Button>
              <Button icon={<DownloadOutlined />} onClick={exportToExcel} disabled={!reportData}>
                Export Excel
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {reportData ? (
        <>
          {/* Overview Stats */}
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            {[
              { title: 'Total Inventory Items',  value: ov.totalItems,        icon: <DatabaseOutlined />,    color: '#1890ff' },
              { title: 'Healthy Stock',           value: ov.healthyStock,      icon: <CheckCircleOutlined />, color: '#52c41a' },
              { title: 'Low Stock Alerts',        value: ov.lowStock,          icon: <WarningOutlined />,     color: '#faad14' },
              { title: 'Out of Stock',            value: ov.outOfStock,        icon: <WarningOutlined />,     color: '#f5222d' },
              {
                title: 'Total Stock Value (XAF)', value: ov.totalValue,        icon: <DollarOutlined />,      color: '#722ed1',
                formatter: v => v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(0)}K` : v.toLocaleString(),
              },
              { title: 'Transactions in Period',  value: ov.totalTransactions, icon: <SwapOutlined />,        color: '#13c2c2' },
              { title: 'Inbound Transactions',    value: ov.inboundCount,      icon: <InboxOutlined />,       color: '#52c41a' },
              { title: 'Outbound Transactions',   value: ov.outboundCount,     icon: <ShoppingOutlined />,    color: '#fa8c16' },
            ].map((s, i) => (
              <Col xs={12} sm={8} md={3} key={i} style={{ minWidth: 140 }}>
                <Card>
                  <Statistic
                    title={s.title}
                    value={s.value ?? 0}
                    prefix={s.icon}
                    valueStyle={{ color: s.color, fontSize: 18 }}
                    formatter={s.formatter}
                    precision={0}
                  />
                </Card>
              </Col>
            ))}
          </Row>

          {/* Low stock alert banner */}
          {ov.lowStock > 0 && (
            <Alert
              message={`${ov.lowStock} item${ov.lowStock !== 1 ? 's' : ''} at or below reorder point${ov.outOfStock > 0 ? `, ${ov.outOfStock} completely out of stock` : ''}`}
              type="warning"
              showIcon
              icon={<WarningOutlined />}
              style={{ marginBottom: 24 }}
            />
          )}

          {/* Charts */}
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={24} lg={10}>
              <Card title={<Space><PieChartOutlined /><Text>Stock Value by Category (Top 10)</Text></Space>}>
                {reportData.byCategory.length > 0 ? (
                  <Pie
                    data={reportData.byCategory}
                    angleField="value"
                    colorField="cat"
                    radius={0.8}
                    label={{ type: 'outer', content: '{name}\n{percentage}', style: { fontSize: 11 } }}
                    legend={{ position: 'bottom' }}
                    height={280}
                  />
                ) : <Empty description="No category data" />}
              </Card>
            </Col>

            <Col xs={24} lg={7}>
              <Card title={<Space><BarChartOutlined /><Text>Transaction Types</Text></Space>}>
                {reportData.byTxnType.length > 0 ? (
                  <Bar
                    data={reportData.byTxnType}
                    xField="count"
                    yField="type"
                    height={280}
                    label={{ position: 'right' }}
                    color="#1890ff"
                  />
                ) : <Empty description="No transaction data" />}
              </Card>
            </Col>

            <Col xs={24} lg={7}>
              <Card title={<Space><BarChartOutlined /><Text>Items by Category Count</Text></Space>}>
                {reportData.byCategory.length > 0 ? (
                  <Column
                    data={reportData.byCategory}
                    xField="cat"
                    yField="count"
                    height={280}
                    label={{ position: 'top', style: { fontSize: 10 } }}
                    xAxis={{ label: { autoRotate: true, autoHide: true, style: { fontSize: 9 } } }}
                  />
                ) : <Empty description="No data" />}
              </Card>
            </Col>
          </Row>

          {/* Monthly Trend */}
          {reportData.trendData.length > 0 && (
            <Card
              title={<Space><RiseOutlined /><Text>Transaction Trend</Text></Space>}
              style={{ marginBottom: 24 }}
            >
              <Line
                data={reportData.trendData}
                xField="month"
                yField="count"
                seriesField="type"
                height={260}
                point={{ size: 4 }}
                smooth
                color={['#52c41a', '#fa8c16']}
              />
            </Card>
          )}

          {/* Reorder Alerts Table */}
          {reportData.reorderAlerts.length > 0 && (
            <Card
              title={
                <Space>
                  <WarningOutlined style={{ color: '#faad14' }} />
                  <Text>Reorder Alerts ({reportData.reorderAlerts.length})</Text>
                </Space>
              }
              style={{ marginBottom: 24 }}
            >
              <Table
                columns={alertColumns}
                dataSource={reportData.reorderAlerts}
                rowKey="_id"
                pagination={{ pageSize: 10 }}
                size="small"
                scroll={{ x: 700 }}
                rowClassName={r => r.stockQuantity === 0 ? 'ant-table-row-danger' : ''}
              />
            </Card>
          )}

          {/* Transactions Table */}
          <Card
            title={
              <Space>
                <SwapOutlined />
                <Text>Recent Transactions ({reportData.recentTransactions.length})</Text>
              </Space>
            }
          >
            <Table
              columns={txnColumns}
              dataSource={reportData.recentTransactions}
              rowKey="_id"
              pagination={{
                pageSize: 15,
                showSizeChanger: true,
                showTotal: (t, r) => `${r[0]}-${r[1]} of ${t}`,
              }}
              size="small"
              scroll={{ x: 650 }}
            />
          </Card>
        </>
      ) : (
        <Card>
          <Empty description="Select filters and click Generate Report to view inventory analytics." />
        </Card>
      )}
    </div>
  );
};

export default InventoryReports;
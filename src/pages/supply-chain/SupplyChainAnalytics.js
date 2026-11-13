import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Typography,
  Statistic,
  Progress,
  Table,
  Select,
  Button,
  Space,
  Tag,
  Alert,
  Tabs,
  Spin
} from 'antd';
import {
  LineChartOutlined,
  BarChartOutlined,
  PieChartOutlined,
  DollarOutlined,
  ClockCircleOutlined,
  TeamOutlined,
  ShoppingCartOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  ExportOutlined
} from '@ant-design/icons';
import { purchaseRequisitionAPI } from '../../services/purchaseRequisitionAPI';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const { Title, Text } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;

const SupplyChainAnalytics = () => {
  const [loading, setLoading] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('quarterly');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [analyticsData, setAnalyticsData] = useState({});
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    fetchAnalyticsData();
  }, [selectedPeriod, selectedCategory]);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await purchaseRequisitionAPI.getSupplyChainAnalytics(selectedPeriod, selectedCategory);
      if (res?.success) {
        setAnalyticsData(res.data);
      } else {
        setAnalyticsData({});
        setLoadError(res?.message || 'Failed to load analytics');
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
      setAnalyticsData({});
      setLoadError(error?.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

  const { summary, trendData, categoryBreakdown, vendorPerformance, processingTimes, alerts } = analyticsData;

  if (!summary) {
    return (
      <div style={{ padding: 48, textAlign: 'center' }}>
        {loading ? <Spin size="large" /> : (
          <Alert
            type="error"
            showIcon
            message="Could not load supply chain analytics"
            description={loadError || 'No data returned from the server.'}
            action={<Button size="small" onClick={fetchAnalyticsData}>Retry</Button>}
          />
        )}
      </div>
    );
  }

  const vendorColumns = [
    {
      title: 'Vendor Name',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true
    },
    {
      title: 'Rating',
      dataIndex: 'rating',
      key: 'rating',
      render: (rating) => rating == null ? <Text type="secondary">Not rated</Text> : (
        <div>
          <Progress 
            percent={rating * 20} 
            size="small" 
            format={() => rating} 
            strokeColor={rating >= 4 ? '#52c41a' : rating >= 3.5 ? '#faad14' : '#ff4d4f'}
          />
        </div>
      ),
      width: 100
    },
    {
      title: 'Orders',
      dataIndex: 'orders',
      key: 'orders',
      align: 'center',
      width: 80
    },
    {
      title: 'On-Time %',
      dataIndex: 'onTime',
      key: 'onTime',
      render: (onTime) => onTime == null ? <Text type="secondary">N/A</Text> : (
        <Progress 
          percent={onTime} 
          size="small" 
          strokeColor={onTime >= 90 ? '#52c41a' : onTime >= 75 ? '#faad14' : '#ff4d4f'}
        />
      ),
      width: 100
    },
    {
      title: 'Spend (XAF)',
      dataIndex: 'spend',
      key: 'spend',
      render: (spend) => spend.toLocaleString(),
      align: 'right',
      width: 120
    }
  ];

  const processingColumns = [
    {
      title: 'Stage',
      dataIndex: 'stage',
      key: 'stage'
    },
    {
      title: 'Avg Time (Days)',
      dataIndex: 'avgDays',
      key: 'avgDays',
      render: (days) => days.toFixed(1),
      align: 'center'
    },
    {
      title: 'Success Rate',
      dataIndex: 'percentage',
      key: 'percentage',
      render: (percentage) => (
        <Progress 
          percent={percentage} 
          size="small"
          strokeColor={percentage >= 95 ? '#52c41a' : percentage >= 85 ? '#faad14' : '#ff4d4f'}
        />
      ),
      width: 120
    }
  ];

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <Title level={2} style={{ margin: 0 }}>
            <LineChartOutlined /> Supply Chain Analytics
          </Title>
          <Space>
            <Select value={selectedPeriod} onChange={setSelectedPeriod} style={{ width: 120 }}>
              <Option value="monthly">Monthly</Option>
              <Option value="quarterly">Quarterly</Option>
              <Option value="yearly">Yearly</Option>
            </Select>
            <Select value={selectedCategory} onChange={setSelectedCategory} style={{ width: 150 }}>
              <Option value="all">All Categories</Option>
              <Option value="IT Accessories">IT Accessories</Option>
              <Option value="Hardware">Hardware</Option>
              <Option value="Software">Software</Option>
              <Option value="Office Supplies">Office Supplies</Option>
              <Option value="Furniture">Furniture</Option>
              <Option value="Equipment">Equipment</Option>
              <Option value="Consumables">Consumables</Option>
              <Option value="Other">Other</Option>
            </Select>
            <Button icon={<ExportOutlined />}>Export Report</Button>
          </Space>
        </div>

        {/* Alerts */}
        {alerts && alerts.length > 0 && (
          <Row gutter={16} style={{ marginBottom: '24px' }}>
            {alerts.map((alert, index) => (
              <Col span={8} key={index}>
                <Alert
                  message={alert.message}
                  type={alert.type}
                  showIcon
                  style={{ marginBottom: '8px' }}
                />
              </Col>
            ))}
          </Row>
        )}

        {/* Key Metrics */}
        <Row gutter={16} style={{ marginBottom: '24px' }}>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Total Requisitions"
                value={summary.totalRequisitions}
                prefix={<ShoppingCartOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Total Spend (XAF)"
                value={summary.totalSpend}
                formatter={value => value.toLocaleString()}
                prefix={<DollarOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Avg Processing Time"
                value={summary.averageProcessingTime}
                suffix="days"
                precision={1}
                prefix={<ClockCircleOutlined />}
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Approval Rate"
                value={summary.approvalRate}
                suffix="%"
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: '#722ed1' }}
              />
            </Card>
          </Col>
        </Row>

        {/* Secondary Metrics */}
        <Row gutter={16} style={{ marginBottom: '24px' }}>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Budget Utilization"
                value={summary.budgetUtilization}
                suffix="%"
                valueStyle={{ color: summary.budgetUtilization > 85 ? '#ff4d4f' : '#52c41a' }}
              />
              <Progress percent={summary.budgetUtilization} size="small" style={{ marginTop: 8 }} />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Active Vendors"
                value={summary.activeVendors}
                prefix={<TeamOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Cost Savings (XAF)"
                value={summary.costSavings}
                formatter={value => value.toLocaleString()}
                prefix={<DollarOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Delivery Performance"
                value={summary.deliveryPerformance}
                suffix="%"
                valueStyle={{ color: '#722ed1' }}
              />
              <Progress percent={summary.deliveryPerformance} size="small" style={{ marginTop: 8 }} />
            </Card>
          </Col>
        </Row>
      </Card>

      {/* Charts and Analysis */}
      <Tabs defaultActiveKey="trends">
        <TabPane tab={<><BarChartOutlined /> Trends & Volume</>} key="trends">
          <Row gutter={16}>
            <Col xs={24} lg={12}>
              <Card title="Monthly Requisitions Trend" style={{ marginBottom: '16px' }}>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis yAxisId="left" orientation="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Bar yAxisId="left" dataKey="requisitions" fill="#8884d8" name="Requisitions" />
                    <Line yAxisId="right" type="monotone" dataKey="avgTime" stroke="#ff7300" name="Avg Time (days)" />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card title="Monthly Spend Analysis" style={{ marginBottom: '16px' }}>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => [value.toLocaleString(), 'Spend (XAF)']} />
                    <Bar dataKey="spend" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </Col>
          </Row>
        </TabPane>

        <TabPane tab={<><PieChartOutlined /> Category Analysis</>} key="categories">
          <Row gutter={16}>
            <Col xs={24} lg={12}>
              <Card title="Spend by Category" style={{ marginBottom: '16px' }}>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={categoryBreakdown}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {categoryBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card title="Category Performance" style={{ marginBottom: '16px' }}>
                <div style={{ height: 300, overflowY: 'auto' }}>
                  {categoryBreakdown.map((category, index) => (
                    <div key={category.name} style={{ marginBottom: '16px', padding: '12px', border: '1px solid #f0f0f0', borderRadius: '4px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text strong>{category.name}</Text>
                        <Tag color={COLORS[index % COLORS.length]}>{category.value}%</Tag>
                      </div>
                      <div style={{ marginTop: '8px' }}>
                        <Text type="secondary">Spend: {category.spend.toLocaleString()} XAF</Text>
                        <br />
                        <Text type="secondary">Requisitions: {category.count}</Text>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </Col>
          </Row>
        </TabPane>

        <TabPane tab={<><TeamOutlined /> Vendor Performance</>} key="vendors">
          <Card title="Vendor Performance Analysis">
            <Table
              columns={vendorColumns}
              dataSource={vendorPerformance}
              rowKey="name"
              pagination={false}
              size="small"
            />
          </Card>
        </TabPane>

        <TabPane tab={<><ClockCircleOutlined /> Process Efficiency</>} key="process">
          <Row gutter={16}>
            <Col xs={24} lg={12}>
              <Card title="Processing Stage Analysis">
                <Table
                  columns={processingColumns}
                  dataSource={processingTimes}
                  rowKey="stage"
                  pagination={false}
                  size="small"
                />
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card title="Process Efficiency Insights">
                <Alert
                  message="Key Insights"
                  description={
                    <ul style={{ marginBottom: 0 }}>
                      <li>Supply Chain Review stage has the longest average time (1.8 days)</li>
                      <li>Department Approval has 95% success rate - room for improvement</li>
                      <li>Overall processing time improved by 15% this quarter</li>
                      <li>Finance Approval is the most efficient stage at 1.0 days average</li>
                    </ul>
                  }
                  type="info"
                  showIcon
                />
                <div style={{ marginTop: '16px' }}>
                  <Text strong>Recommendations:</Text>
                  <ul>
                    <li>Implement automated checks for Supply Chain Review</li>
                    <li>Provide additional training for Department Heads</li>
                    <li>Consider parallel processing where possible</li>
                  </ul>
                </div>
              </Card>
            </Col>
          </Row>
        </TabPane>
      </Tabs>
    </div>
  );
};

export default SupplyChainAnalytics;
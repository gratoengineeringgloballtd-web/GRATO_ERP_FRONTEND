import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Typography,
  Table,
  Progress,
  Tag,
  Space,
  Button,
  Alert,
  Timeline,
  Tabs,
  Divider,
  Spin
} from 'antd';
import {
  ShoppingCartOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  DollarOutlined,
  TeamOutlined,
  TruckOutlined,
  WarningOutlined,
  RiseOutlined,
  LineChartOutlined,
  CalendarOutlined,
  FileTextOutlined,
  FileDoneOutlined
} from '@ant-design/icons';
import { purchaseRequisitionAPI } from '../../services/purchaseRequisitionAPI';
import unifiedSupplierAPI from '../../services/unifiedSupplierAPI';

const { Title, Text } = Typography;

// Real status values from PurchaseRequisition's schema enum - used for display only,
// not for filtering (all filtering/counting happens server-side).
const STATUS_LABELS = {
  pending_supervisor: { color: 'orange', text: 'Pending Supervisor' },
  pending_finance_verification: { color: 'orange', text: 'Pending Finance' },
  pending_supply_chain_review: { color: 'gold', text: 'Pending Supply Chain' },
  pending_buyer_assignment: { color: 'gold', text: 'Pending Buyer Assignment' },
  pending_head_approval: { color: 'orange', text: 'Pending Head Approval' },
  pending_ceo_approval: { color: 'orange', text: 'Pending CEO Approval' },
  pending_ceo: { color: 'orange', text: 'Pending CEO Approval' },
  approved: { color: 'green', text: 'Approved' },
  in_procurement: { color: 'blue', text: 'In Procurement' },
  partially_disbursed: { color: 'cyan', text: 'Partially Disbursed' },
  fully_disbursed: { color: 'purple', text: 'Fully Disbursed' },
  completed: { color: 'purple', text: 'Completed' },
  delivered: { color: 'purple', text: 'Delivered' },
  rejected: { color: 'red', text: 'Rejected' },
  supply_chain_rejected: { color: 'red', text: 'Rejected by Supply Chain' },
  cancelled: { color: 'default', text: 'Cancelled' }
};

const getStatusTag = (status) => {
  const info = STATUS_LABELS[status] || { color: 'default', text: (status || '').replace(/_/g, ' ') };
  return <Tag color={info.color}>{info.text}</Tag>;
};

const getUrgencyTag = (urgency) => {
  const urgencyMap = { Low: 'green', Medium: 'orange', High: 'red', Critical: 'red' };
  return <Tag color={urgencyMap[urgency] || 'default'}>{urgency || 'N/A'}</Tag>;
};

const requisitionColumns = [
  {
    title: 'Requisition #',
    dataIndex: 'requisitionNumber',
    key: 'requisitionNumber',
    render: (id) => <Text code>{id}</Text>
  },
  { title: 'Title', dataIndex: 'title', key: 'title', ellipsis: true },
  {
    title: 'Department',
    key: 'department',
    render: (_, record) => record.department || record.employee?.department || 'N/A'
  },
  {
    title: 'Budget (XAF)',
    dataIndex: 'budgetXAF',
    key: 'budgetXAF',
    render: (budget) => (budget || 0).toLocaleString(),
    align: 'right'
  },
  { title: 'Status', dataIndex: 'status', key: 'status', render: getStatusTag },
  { title: 'Urgency', dataIndex: 'urgency', key: 'urgency', render: getUrgencyTag },
  {
    title: 'Submitted',
    dataIndex: 'createdAt',
    key: 'createdAt',
    render: (date) => (date ? new Date(date).toLocaleDateString('en-GB') : 'N/A')
  }
];

const SupplyChainDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [loadErrors, setLoadErrors] = useState([]);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [planningData, setPlanningData] = useState(null);
  const [invoiceStats, setInvoiceStats] = useState(null);
  const [supplierCount, setSupplierCount] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    const errors = [];

    const [statsRes, planningRes, invoiceRes, suppliersRes] = await Promise.all([
      purchaseRequisitionAPI.getDashboardStats(),
      purchaseRequisitionAPI.getProcurementPlanningData(),
      purchaseRequisitionAPI.getSupplyChainInvoiceStats(),
      unifiedSupplierAPI.getAllSuppliers({ status: 'approved', limit: 1 }).catch((err) => ({
        success: false,
        message: err.message
      }))
    ]);

    if (statsRes?.success) setDashboardStats(statsRes.data);
    else errors.push('requisition statistics');

    if (planningRes?.success) setPlanningData(planningRes.data);
    else errors.push('procurement planning data');

    if (invoiceRes?.success) setInvoiceStats(invoiceRes.data);
    else errors.push('invoice queue statistics');

    if (suppliersRes?.success) setSupplierCount(suppliersRes.pagination?.total ?? null);
    else errors.push('supplier count');

    setLoadErrors(errors);
    setLoading(false);
  };

  if (loading) {
    return (
      <div style={{ padding: '48px', textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  const summary = dashboardStats?.summary || {};
  const recent = dashboardStats?.recent || [];
  const upcoming = planningData?.upcoming || [];
  const budgetUtilization = planningData?.budgetUtilization || [];
  const vendorWorkload = planningData?.vendorWorkload || [];

  // Real monthly budget totals, computed from this-month itemCategory rollups returned
  // by the procurement planning endpoint (server-side filtered to the current month).
  const monthAllocated = budgetUtilization.reduce((sum, c) => sum + (c.allocated || 0), 0);
  const monthSpent = budgetUtilization.reduce((sum, c) => sum + (c.spent || 0), 0);
  const monthUtilizationPct = monthAllocated > 0 ? Math.round((monthSpent / monthAllocated) * 100) : 0;

  const upcomingWithDaysLeft = upcoming.map((item) => {
    const daysLeft = item.expectedDate
      ? Math.ceil((new Date(item.expectedDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null;
    return { ...item, daysLeft };
  });

  const urgentDeadlineCount = upcomingWithDaysLeft.filter((i) => i.daysLeft !== null && i.daysLeft <= 3).length;

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <Title level={2}>
          <ShoppingCartOutlined /> Supply Chain Dashboard
        </Title>
        <Text type="secondary">
          Overview of purchase requisitions, procurement activities, and supply chain performance
        </Text>
      </div>

      {loadErrors.length > 0 && (
        <Alert
          style={{ marginBottom: 24 }}
          type="warning"
          showIcon
          message="Some data couldn't be loaded"
          description={`Failed to fetch: ${loadErrors.join(', ')}. The figures shown below reflect only the data that loaded successfully.`}
        />
      )}

      {/* Alerts computed from real data */}
      {(urgentDeadlineCount > 0 || monthAllocated > 0 || (invoiceStats?.pendingAssignment > 0)) && (
        <Row gutter={16} style={{ marginBottom: '24px' }}>
          {urgentDeadlineCount > 0 && (
            <Col span={12}>
              <Alert
                message={`${urgentDeadlineCount} requisition(s) approaching expected delivery within 3 days`}
                description="Review and expedite processing for these items."
                type="warning"
                showIcon
              />
            </Col>
          )}
          {monthAllocated > 0 && (
            <Col span={12}>
              <Alert
                message={`Procurement budget utilization this month: ${monthUtilizationPct}%`}
                description={`XAF ${monthSpent.toLocaleString()} spent of XAF ${monthAllocated.toLocaleString()} allocated across approved requisitions.`}
                type={monthUtilizationPct > 90 ? 'warning' : 'info'}
                showIcon
              />
            </Col>
          )}
          {invoiceStats?.pendingAssignment > 0 && (
            <Col span={12}>
              <Alert
                message={`${invoiceStats.pendingAssignment} supplier invoice(s) awaiting assignment`}
                description="These invoices need a supply chain reviewer assigned before they can proceed."
                type="info"
                showIcon
              />
            </Col>
          )}
        </Row>
      )}

      {/* Key Statistics */}
      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Total Requisitions"
              value={summary.total ?? 0}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Pending Review"
              value={summary.pending ?? 0}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Active Procurements"
              value={summary.inProcurement ?? 0}
              prefix={<ShoppingCartOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Completed"
              value={summary.completed ?? 0}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Financial Overview */}
      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col xs={24} md={12}>
          <Card title={<><DollarOutlined /> Procurement Budget — This Month</>}>
            {monthAllocated > 0 ? (
              <>
                <div style={{ marginBottom: '16px' }}>
                  <Text strong>Allocated (approved requisitions): </Text>
                  <Text>{monthAllocated.toLocaleString()} XAF</Text>
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <Text strong>Actual Spend Recorded: </Text>
                  <Text>{monthSpent.toLocaleString()} XAF</Text>
                </div>
                <Progress
                  percent={monthUtilizationPct}
                  status={monthUtilizationPct > 90 ? 'exception' : 'active'}
                />
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  Based on approved requisitions created this month with recorded procurement cost.
                </Text>
              </>
            ) : (
              <Text type="secondary">No approved requisitions recorded for the current month yet.</Text>
            )}
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title={<><RiseOutlined /> Portfolio Snapshot</>}>
            <Row gutter={16}>
              <Col span={12}>
                <Statistic
                  title="Active Suppliers"
                  value={supplierCount ?? 'N/A'}
                  prefix={<TeamOutlined />}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="Invoices Pending Assignment"
                  value={invoiceStats?.pendingAssignment ?? 'N/A'}
                  prefix={<FileDoneOutlined />}
                  valueStyle={{ color: '#faad14' }}
                />
              </Col>
            </Row>
            <Divider style={{ margin: '16px 0' }} />
            <Row gutter={16}>
              <Col span={12}>
                <Statistic
                  title="Rejected"
                  value={summary.rejected ?? 0}
                  valueStyle={{ color: '#cf1322', fontSize: '18px' }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="Approval Rate"
                  value={dashboardStats?.trends?.approvalRate ?? 0}
                  suffix="%"
                  valueStyle={{ fontSize: '18px' }}
                />
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      {/* Main Content Tabs */}
      <Tabs
        defaultActiveKey="recent"
        items={[
          {
            key: 'recent',
            label: <><FileTextOutlined /> Recent Requisitions</>,
            children: (
              <Card>
                <Table
                  columns={requisitionColumns}
                  dataSource={recent}
                  rowKey="_id"
                  pagination={false}
                  size="small"
                  locale={{ emptyText: 'No requisitions in your queue yet' }}
                />
                <Divider />
                <div style={{ textAlign: 'center' }}>
                  <Button type="primary" href="/supply-chain/requisitions">
                    View All Requisitions
                  </Button>
                </div>
              </Card>
            )
          },
          {
            key: 'deadlines',
            label: <><CalendarOutlined /> Upcoming Deadlines</>,
            children: (
              <Card>
                {upcomingWithDaysLeft.length === 0 ? (
                  <Text type="secondary">No approved requisitions with an expected delivery date in the next 30 days.</Text>
                ) : (
                  <Timeline
                    items={upcomingWithDaysLeft.map((item) => ({
                      key: item._id,
                      color: item.daysLeft <= 3 ? 'red' : item.daysLeft <= 7 ? 'orange' : 'green',
                      dot: item.daysLeft <= 3 ? <WarningOutlined /> : <ClockCircleOutlined />,
                      children: (
                        <div>
                          <Text strong>{item.title}</Text>
                          <br />
                          <Text code>{item.requisitionNumber}</Text> - {getStatusTag(item.status)}
                          <br />
                          <Text type="secondary">
                            Expected: {new Date(item.expectedDate).toLocaleDateString('en-GB')}
                            {item.daysLeft !== null && ` (${item.daysLeft} day${item.daysLeft === 1 ? '' : 's'} left)`}
                          </Text>
                        </div>
                      )
                    }))}
                  />
                )}
              </Card>
            )
          },
          {
            key: 'workload',
            label: <><TeamOutlined /> Buyer Workload</>,
            children: (
              <Card>
                {vendorWorkload.length === 0 ? (
                  <Text type="secondary">No open procurement assignments right now.</Text>
                ) : (
                  <Table
                    dataSource={vendorWorkload}
                    rowKey="buyerId"
                    pagination={false}
                    size="small"
                    columns={[
                      { title: 'Buyer', dataIndex: 'buyerName', key: 'buyerName', render: (n) => n || 'Unassigned' },
                      { title: 'Open Requisitions', dataIndex: 'openCount', key: 'openCount' },
                      {
                        title: 'Total Value (XAF)',
                        dataIndex: 'totalValue',
                        key: 'totalValue',
                        render: (v) => (v || 0).toLocaleString(),
                        align: 'right'
                      }
                    ]}
                  />
                )}
              </Card>
            )
          },
          {
            key: 'analytics',
            label: <><LineChartOutlined /> Analytics</>,
            children: (
              <Row gutter={16}>
                <Col span={24}>
                  <Alert
                    message="Analytics Dashboard"
                    description="Detailed procurement analytics and insights are available in the dedicated analytics section."
                    type="info"
                    showIcon
                    action={
                      <Button size="small" href="/supply-chain/analytics">
                        View Analytics
                      </Button>
                    }
                  />
                </Col>
              </Row>
            )
          }
        ]}
      />

      {/* Quick Actions */}
      <Card title="Quick Actions" style={{ marginTop: '24px' }}>
        <Space wrap>
          <Button type="primary" icon={<ShoppingCartOutlined />} href="/supply-chain/requisitions">
            Manage Requisitions
          </Button>
          <Button icon={<TeamOutlined />} href="/supply-chain/vendors">
            Vendor Management
          </Button>
          <Button icon={<TruckOutlined />} href="/supply-chain/procurement-planning">
            Procurement Planning
          </Button>
          <Button icon={<LineChartOutlined />} href="/supply-chain/analytics">
            View Analytics
          </Button>
        </Space>
      </Card>
    </div>
  );
};

export default SupplyChainDashboard;

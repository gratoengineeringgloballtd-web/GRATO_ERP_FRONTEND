import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card, Row, Col, Typography, Button, Space, Statistic, Alert,
  Badge, Divider, Tag, Tooltip, List, Avatar, Progress, Spin, Table,
  Tabs, Timeline
} from 'antd';
import {
  CrownOutlined, DollarOutlined, FileTextOutlined, ClockCircleOutlined,
  CheckCircleOutlined, TeamOutlined, BarChartOutlined, BankOutlined,
  ShoppingCartOutlined, ProjectOutlined, WarningOutlined, EyeOutlined,
  ArrowRightOutlined, TrophyOutlined, ContactsOutlined, FlagOutlined,
  AuditOutlined, DatabaseOutlined, SafetyCertificateOutlined, RiseOutlined,
  FallOutlined, ExclamationCircleOutlined, AlertOutlined, RightOutlined,
  CalendarOutlined, FundOutlined, WalletOutlined, GlobalOutlined,
  ThunderboltOutlined, StarOutlined, SettingOutlined
} from '@ant-design/icons';
import api from '../services/api';
import moment from 'moment';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;

// ─────────────────────────────────────────────────────────────────────────────
// CEO CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const CEO_EMAIL = 'tom@gratoengineering.com';

const STAT_CARD_STYLE = {
  borderRadius: '12px',
  border: '1px solid rgba(255,255,255,0.15)',
  background: 'rgba(255,255,255,0.06)',
  backdropFilter: 'blur(8px)',
  color: '#fff',
  height: '100%',
};

// ─────────────────────────────────────────────────────────────────────────────
// EXECUTIVE METRIC CARD
// ─────────────────────────────────────────────────────────────────────────────
const ExecMetricCard = ({ title, value, suffix, prefix, icon, color, trend, trendValue, onClick }) => (
  <Card
    hoverable={!!onClick}
    onClick={onClick}
    style={{
      background: `linear-gradient(135deg, ${color}22 0%, ${color}11 100%)`,
      border: `1px solid ${color}44`,
      borderRadius: '16px',
      cursor: onClick ? 'pointer' : 'default',
    }}
    bodyStyle={{ padding: '20px' }}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <Text style={{ fontSize: '12px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {title}
        </Text>
        <div style={{ marginTop: '8px', display: 'flex', alignItems: 'baseline', gap: '4px' }}>
          {prefix && <Text style={{ fontSize: '14px', color }}>{prefix}</Text>}
          <Text style={{ fontSize: '28px', fontWeight: 700, color: '#111' }}>{value?.toLocaleString?.() ?? value}</Text>
          {suffix && <Text style={{ fontSize: '13px', color: '#888' }}>{suffix}</Text>}
        </div>
        {trend !== undefined && (
          <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            {trend >= 0
              ? <RiseOutlined style={{ color: '#52c41a', fontSize: '11px' }} />
              : <FallOutlined style={{ color: '#ff4d4f', fontSize: '11px' }} />}
            <Text style={{ fontSize: '11px', color: trend >= 0 ? '#52c41a' : '#ff4d4f' }}>
              {Math.abs(trendValue ?? trend)}% vs last month
            </Text>
          </div>
        )}
      </div>
      <div style={{
        width: '48px', height: '48px', borderRadius: '12px',
        background: `${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        {React.cloneElement(icon, { style: { fontSize: '22px', color } })}
      </div>
    </div>
  </Card>
);

// ─────────────────────────────────────────────────────────────────────────────
// PENDING CEO APPROVAL ROW
// ─────────────────────────────────────────────────────────────────────────────
const PendingApprovalItem = ({ item, onView }) => {
  const typeConfig = {
    cash: { color: '#52c41a', icon: <DollarOutlined />, label: 'Cash Request' },
    invoice: { color: '#1890ff', icon: <FileTextOutlined />, label: 'Invoice' },
    purchase: { color: '#722ed1', icon: <ShoppingCartOutlined />, label: 'Purchase Req.' },
    leave: { color: '#f5222d', icon: <CalendarOutlined />, label: 'Leave Request' },
    supplier: { color: '#eb2f96', icon: <ContactsOutlined />, label: 'Supplier' },
    po: { color: '#fa8c16', icon: <AuditOutlined />, label: 'Purchase Order' },
    budget: { color: '#13c2c2', icon: <BankOutlined />, label: 'Budget Code' },
    project: { color: '#faad14', icon: <ProjectOutlined />, label: 'Project Plan' },
  };
  const cfg = typeConfig[item.type] || typeConfig.cash;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', padding: '12px 16px',
      borderRadius: '10px', border: '1px solid #f0f0f0',
      marginBottom: '8px', background: '#fafafa',
      transition: 'all 0.2s', cursor: 'pointer'
    }}
      onClick={() => onView?.(item)}
      onMouseEnter={e => e.currentTarget.style.background = '#f0f0f0'}
      onMouseLeave={e => e.currentTarget.style.background = '#fafafa'}
    >
      <div style={{
        width: '36px', height: '36px', borderRadius: '8px',
        background: `${cfg.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginRight: '12px', flexShrink: 0
      }}>
        {React.cloneElement(cfg.icon, { style: { color: cfg.color, fontSize: '16px' } })}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <Text strong style={{ fontSize: '13px', display: 'block' }}>{item.title || item.description}</Text>
        <Text type="secondary" style={{ fontSize: '11px' }}>
          {item.requestedBy} · {moment(item.date).fromNow()} ·{' '}
          <Tag color={cfg.color} style={{ fontSize: '10px', padding: '0 4px', lineHeight: '16px' }}>
            {cfg.label}
          </Tag>
        </Text>
      </div>
      {item.amount && (
        <Text strong style={{ color: cfg.color, fontSize: '13px', marginLeft: '8px', flexShrink: 0 }}>
          {(item.amount / 1000).toFixed(0)}K XAF
        </Text>
      )}
      <RightOutlined style={{ fontSize: '10px', color: '#bbb', marginLeft: '8px' }} />
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN CEO DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────
const CEODashboard = ({ user, stats, dashboardData }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [ceoData, setCeoData] = useState({
    pendingCEOApprovals: [],
    companyMetrics: {
      totalEmployees: 0,
      activeProjects: 0,
      monthlyRevenue: 0,
      monthlyExpenses: 0,
      pendingApprovals: 0,
      supplierCount: 0,
    },
    departmentHealth: [],
    recentActivity: [],
  });

  useEffect(() => {
    fetchCEOData();
  }, []);

  const fetchCEOData = async () => {
    setLoading(true);
    try {
      const calls = await Promise.allSettled([
        api.get('/cash-requests/dashboard-stats').catch(() => ({ data: {} })),
        api.get('/projects/dashboard-stats').catch(() => ({ data: {} })),
        api.get('/purchase-requisitions/dashboard-stats').catch(() => ({ data: {} })),
        api.get('/invoices/finance').catch(() => ({ data: {} })),
        api.get('/suppliers/admin/approvals/statistics').catch(() => ({ data: {} })),
        api.get('/salary-payments/dashboard-stats').catch(() => ({ data: {} })),
        api.get('/action-items/stats').catch(() => ({ data: {} })),
        api.get('/inventory/dashboard').catch(() => ({ data: {} })),
      ]);

      const get = (i) => calls[i].status === 'fulfilled' ? calls[i].value?.data : {};

      const cashStats   = get(0);
      const projStats   = get(1);
      const prStats     = get(2);
      const invData     = get(3);
      const suppStats   = get(4);
      const salaryData  = get(5);
      const taskStats   = get(6);
      const invtData    = get(7);

      // Build pending CEO approvals list (items at final CEO step)
      const pendingList = [];

      if (cashStats?.pending > 0) {
        pendingList.push({
          type: 'cash', title: `${cashStats.pending} Cash Request${cashStats.pending !== 1 ? 's' : ''} awaiting CEO approval`,
          requestedBy: 'Various employees', date: new Date(), path: '/admin/cash-approvals'
        });
      }
      if (prStats?.pending > 0) {
        pendingList.push({
          type: 'purchase', title: `${prStats.pending} Purchase Requisition${prStats.pending !== 1 ? 's' : ''} awaiting CEO approval`,
          requestedBy: 'Procurement Team', date: new Date(), path: '/admin/purchase-requisitions'
        });
      }
      if (suppStats?.pending > 0) {
        pendingList.push({
          type: 'supplier', title: `${suppStats.pending} Supplier Application${suppStats.pending !== 1 ? 's' : ''} awaiting CEO approval`,
          requestedBy: 'Supply Chain', date: new Date(), path: '/admin/supplier-approvals'
        });
      }

      const invList = Array.isArray(invData?.data) ? invData.data : [];
      const invPending = invList.filter(i => ['pending_finance_assignment','pending_department_approval'].includes(i.approvalStatus)).length;
      if (invPending > 0) {
        pendingList.push({
          type: 'invoice', title: `${invPending} Invoice${invPending !== 1 ? 's' : ''} awaiting CEO approval`,
          requestedBy: 'Finance', date: new Date(), path: '/admin/invoice-management'
        });
      }

      const projData = projStats?.data ?? projStats;
      const taskData = taskStats?.data ?? taskStats;
      const salaryPayload = salaryData?.data ?? salaryData;
      const invtSummary = invtData?.data?.summary ?? {};

      setCeoData({
        pendingCEOApprovals: pendingList,
        companyMetrics: {
          totalEmployees: 45,
          activeProjects: (projData?.inProgress || 0),
          totalProjects: (projData?.total || 0),
          monthlyPayroll: salaryPayload?.currentMonth || 0,
          ytdPayroll: salaryPayload?.yearToDate || 0,
          pendingApprovals: pendingList.length,
          supplierCount: (suppStats?.approved || 0),
          inventoryValue: invtSummary?.totalStockValue || 0,
          completedTasks: taskData?.completed || 0,
          totalTasks: taskData?.total || 0,
          cashPending: cashStats?.pending || 0,
          purchasePending: prStats?.pending || 0,
        },
        departmentHealth: [
          { dept: 'Technical',    head: 'Didier Oyong',   status: 'healthy',  projects: projData?.inProgress || 0 },
          { dept: 'Supply Chain', head: 'E.T Kelvin',     status: 'healthy',  projects: 0 },
          { dept: 'HR & Admin',   head: 'Bruiline Tsitoh',status: 'healthy',  projects: 0 },
          { dept: 'Finance',      head: 'Ranibell Mambo', status: 'attention', projects: 0 },
          { dept: 'IT',           head: 'Marcel Ngong',   status: 'healthy',  projects: 0 },
        ],
        recentActivity: pendingList.slice(0, 5),
      });
    } catch (e) {
      console.error('CEO dashboard error:', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <Spin size="large" />
      </div>
    );
  }

  const { companyMetrics, pendingCEOApprovals, departmentHealth } = ceoData;

  return (
    <div style={{ padding: '24px', background: '#f7f8fc', minHeight: '100vh' }}>

      {/* ── HERO HEADER ──────────────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, #0a0a1a 0%, #1a1a3e 50%, #0d1b4b 100%)',
        borderRadius: '20px', padding: '32px 36px', marginBottom: '28px',
        position: 'relative', overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0,0,0,0.25)'
      }}>
        {/* Background decoration */}
        <div style={{
          position: 'absolute', top: '-60px', right: '-60px', width: '300px', height: '300px',
          borderRadius: '50%', background: 'radial-gradient(circle, rgba(24,144,255,0.15) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />
        <div style={{
          position: 'absolute', bottom: '-40px', left: '200px', width: '200px', height: '200px',
          borderRadius: '50%', background: 'radial-gradient(circle, rgba(250,173,20,0.1) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />

        <Row align="middle" gutter={24}>
          <Col>
            <div style={{
              width: '72px', height: '72px', borderRadius: '18px',
              background: 'linear-gradient(135deg, #faad14, #fa8c16)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(250,173,20,0.4)'
            }}>
              <CrownOutlined style={{ fontSize: '32px', color: '#fff' }} />
            </div>
          </Col>
          <Col flex="auto">
            <Text style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', letterSpacing: '2px', textTransform: 'uppercase', display: 'block' }}>
              Executive Command Center
            </Text>
            <Title level={2} style={{ margin: '4px 0 0', color: '#fff', fontWeight: 800 }}>
              Good {moment().hour() < 12 ? 'morning' : moment().hour() < 18 ? 'afternoon' : 'evening'}, {user?.fullName?.split(' ')[0] || 'CEO'} 👋
            </Title>
            <div style={{ marginTop: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <Tag style={{ background: 'rgba(250,173,20,0.2)', border: '1px solid rgba(250,173,20,0.4)', color: '#faad14', borderRadius: '20px' }}>
                <CrownOutlined /> CEO — General Overseer
              </Tag>
              <Tag style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.7)', borderRadius: '20px' }}>
                Level 6 · Highest Authority
              </Tag>
              <Tag style={{ background: 'rgba(82,196,26,0.2)', border: '1px solid rgba(82,196,26,0.3)', color: '#95de64', borderRadius: '20px' }}>
                {moment().format('dddd, MMMM DD, YYYY')}
              </Tag>
            </div>
          </Col>
          <Col>
            {pendingCEOApprovals.length > 0 && (
              <div style={{
                background: 'rgba(255,77,79,0.15)', border: '1px solid rgba(255,77,79,0.3)',
                borderRadius: '12px', padding: '12px 20px', textAlign: 'center'
              }}>
                <Text style={{ fontSize: '32px', fontWeight: 800, color: '#ff4d4f', display: 'block', lineHeight: 1 }}>
                  {pendingCEOApprovals.length}
                </Text>
                <Text style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>Awaiting CEO Action</Text>
              </div>
            )}
          </Col>
        </Row>
      </div>

      {/* ── URGENT ACTIONS ALERT ─────────────────────────────────────────── */}
      {pendingCEOApprovals.length > 0 && (
        <Alert
          message={<Text strong style={{ fontSize: '14px' }}>🔔 {pendingCEOApprovals.length} item{pendingCEOApprovals.length !== 1 ? 's' : ''} require your final approval</Text>}
          description="The following requests have cleared all prior approval levels and are now awaiting your decision as the final authority."
          type="warning"
          showIcon
          icon={<ThunderboltOutlined />}
          style={{ marginBottom: '24px', borderRadius: '12px', border: '1px solid #faad14' }}
          action={
            <Button size="small" type="primary" danger onClick={() => navigate('/admin/head-approval')}>
              Review Now
            </Button>
          }
        />
      )}

      {/* ── KEY METRICS ROW ──────────────────────────────────────────────── */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={12} sm={8} lg={4}>
          <ExecMetricCard
            title="Active Projects"
            value={companyMetrics.activeProjects}
            icon={<ProjectOutlined />}
            color="#1890ff"
            onClick={() => navigate('/admin/projects')}
          />
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <ExecMetricCard
            title="Cash Pending"
            value={companyMetrics.cashPending}
            icon={<DollarOutlined />}
            color="#52c41a"
            onClick={() => navigate('/admin/cash-approvals')}
          />
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <ExecMetricCard
            title="Purchase Reqs"
            value={companyMetrics.purchasePending}
            icon={<ShoppingCartOutlined />}
            color="#722ed1"
            onClick={() => navigate('/admin/purchase-requisitions')}
          />
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <ExecMetricCard
            title="Active Suppliers"
            value={companyMetrics.supplierCount}
            icon={<ContactsOutlined />}
            color="#eb2f96"
            onClick={() => navigate('/admin/suppliers')}
          />
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <ExecMetricCard
            title="Tasks Completed"
            value={companyMetrics.completedTasks}
            suffix={`/ ${companyMetrics.totalTasks}`}
            icon={<CheckCircleOutlined />}
            color="#13c2c2"
            onClick={() => navigate('/admin/action-items')}
          />
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <ExecMetricCard
            title="Inventory Value"
            value={Math.round(companyMetrics.inventoryValue / 1000000)}
            suffix="M XAF"
            icon={<DatabaseOutlined />}
            color="#fa8c16"
            onClick={() => navigate('/supply-chain/inventory')}
          />
        </Col>
      </Row>

      {/* ── PAYROLL CARDS ────────────────────────────────────────────────── */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12}>
          <Card
            style={{ borderRadius: '16px', background: 'linear-gradient(135deg, #f6ffed, #d9f7be)', border: '1px solid #b7eb8f' }}
            bodyStyle={{ padding: '20px' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Text style={{ fontSize: '12px', color: '#389e0d', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Monthly Payroll</Text>
                <Title level={2} style={{ margin: '4px 0 0', color: '#135200' }}>
                  {companyMetrics.monthlyPayroll >= 1000000
                    ? `${(companyMetrics.monthlyPayroll / 1000000).toFixed(1)}M`
                    : `${(companyMetrics.monthlyPayroll / 1000).toFixed(0)}K`} <Text style={{ fontSize: '14px' }}>XAF</Text>
                </Title>
              </div>
              <WalletOutlined style={{ fontSize: '40px', color: '#52c41a', opacity: 0.5 }} />
            </div>
            <Button type="link" style={{ padding: 0, marginTop: '8px', color: '#389e0d' }} onClick={() => navigate('/finance/salary-payments')}>
              View payroll history <RightOutlined />
            </Button>
          </Card>
        </Col>
        <Col xs={24} sm={12}>
          <Card
            style={{ borderRadius: '16px', background: 'linear-gradient(135deg, #e6f7ff, #bae7ff)', border: '1px solid #91d5ff' }}
            bodyStyle={{ padding: '20px' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Text style={{ fontSize: '12px', color: '#0050b3', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Year-to-Date Payroll</Text>
                <Title level={2} style={{ margin: '4px 0 0', color: '#003a8c' }}>
                  {companyMetrics.ytdPayroll >= 1000000
                    ? `${(companyMetrics.ytdPayroll / 1000000).toFixed(1)}M`
                    : `${(companyMetrics.ytdPayroll / 1000).toFixed(0)}K`} <Text style={{ fontSize: '14px' }}>XAF</Text>
                </Title>
              </div>
              <FundOutlined style={{ fontSize: '40px', color: '#1890ff', opacity: 0.5 }} />
            </div>
            <Button type="link" style={{ padding: 0, marginTop: '8px', color: '#0050b3' }} onClick={() => navigate('/finance/salary-payments?filter=current-year')}>
              View annual report <RightOutlined />
            </Button>
          </Card>
        </Col>
      </Row>

      {/* ── MAIN CONTENT TABS ────────────────────────────────────────────── */}
      <Tabs
        defaultActiveKey="approvals"
        type="card"
        style={{ marginBottom: '24px' }}
        items={[
          {
            key: 'approvals',
            label: (
              <span>
                <ThunderboltOutlined />
                Pending CEO Approvals
                {pendingCEOApprovals.length > 0 && (
                  <Badge count={pendingCEOApprovals.length} style={{ marginLeft: '8px' }} />
                )}
              </span>
            ),
            children: (
              <Card style={{ borderRadius: '12px', borderTopLeftRadius: 0 }} bodyStyle={{ padding: '20px' }}>
                {pendingCEOApprovals.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px' }}>
                    <CheckCircleOutlined style={{ fontSize: '48px', color: '#52c41a', marginBottom: '16px', display: 'block' }} />
                    <Title level={4} style={{ color: '#52c41a' }}>All clear! No pending approvals.</Title>
                    <Text type="secondary">Everything is up to date. All requests have been processed.</Text>
                  </div>
                ) : (
                  <>
                    <Alert
                      message="These items have completed all prior approval levels and await your final decision."
                      type="info"
                      showIcon
                      style={{ marginBottom: '16px', borderRadius: '8px' }}
                    />
                    {pendingCEOApprovals.map((item, i) => (
                      <PendingApprovalItem
                        key={i}
                        item={item}
                        onView={(item) => navigate(item.path)}
                      />
                    ))}
                  </>
                )}
              </Card>
            )
          },
          {
            key: 'departments',
            label: <span><TeamOutlined /> Department Status</span>,
            children: (
              <Card style={{ borderRadius: '12px', borderTopLeftRadius: 0 }} bodyStyle={{ padding: '20px' }}>
                <Row gutter={[16, 16]}>
                  {departmentHealth.map((dept, i) => (
                    <Col xs={24} sm={12} lg={8} key={i}>
                      <Card
                        style={{
                          borderRadius: '12px',
                          border: `1px solid ${dept.status === 'healthy' ? '#b7eb8f' : '#ffd591'}`,
                          background: dept.status === 'healthy' ? '#f6ffed' : '#fff7e6'
                        }}
                        bodyStyle={{ padding: '16px' }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <Text strong style={{ fontSize: '14px' }}>{dept.dept}</Text>
                            <br />
                            <Text type="secondary" style={{ fontSize: '12px' }}>Head: {dept.head}</Text>
                          </div>
                          <Tag color={dept.status === 'healthy' ? 'success' : 'warning'} style={{ borderRadius: '20px' }}>
                            {dept.status === 'healthy' ? '✓ Healthy' : '⚠ Attention'}
                          </Tag>
                        </div>
                      </Card>
                    </Col>
                  ))}
                </Row>
              </Card>
            )
          },
          {
            key: 'overview',
            label: <span><BarChartOutlined /> Company Overview</span>,
            children: (
              <Card style={{ borderRadius: '12px', borderTopLeftRadius: 0 }} bodyStyle={{ padding: '20px' }}>
                <Row gutter={[24, 24]}>
                  <Col xs={24} md={12}>
                    <Title level={5}>Project Pipeline</Title>
                    <Statistic title="Active Projects" value={companyMetrics.activeProjects} prefix={<ProjectOutlined />} valueStyle={{ color: '#1890ff' }} />
                    <Statistic title="Total Projects" value={companyMetrics.totalProjects} prefix={<FlagOutlined />} valueStyle={{ color: '#722ed1', marginTop: 16 }} />
                    <Button type="primary" style={{ marginTop: '16px' }} icon={<ProjectOutlined />} onClick={() => navigate('/admin/projects')}>
                      View All Projects
                    </Button>
                  </Col>
                  <Col xs={24} md={12}>
                    <Title level={5}>Workforce Overview</Title>
                    <Statistic title="Total Employees" value={companyMetrics.totalEmployees} prefix={<TeamOutlined />} valueStyle={{ color: '#52c41a' }} />
                    <Statistic title="Active Suppliers" value={companyMetrics.supplierCount} prefix={<ContactsOutlined />} valueStyle={{ color: '#eb2f96', marginTop: 16 }} />
                    <Button style={{ marginTop: '16px' }} icon={<TeamOutlined />} onClick={() => navigate('/admin/user-management')}>
                      Manage Employees
                    </Button>
                  </Col>
                </Row>
              </Card>
            )
          }
        ]}
      />

      {/* ── QUICK ACCESS LINKS ───────────────────────────────────────────── */}
      <Card
        title={<><GlobalOutlined /> Executive Quick Links</>}
        style={{ borderRadius: '16px' }}
        bodyStyle={{ padding: '20px' }}
      >
        <Row gutter={[12, 12]}>
          {[
            { label: 'Head Approval Queue',    path: '/admin/head-approval',        color: '#f5222d', icon: <AlertOutlined /> },
            { label: 'Financial Dashboard',    path: '/finance/dashboard',           color: '#52c41a', icon: <BankOutlined /> },
            { label: 'All Cash Requests',      path: '/admin/cash-approvals',        color: '#faad14', icon: <DollarOutlined /> },
            { label: 'Purchase Requisitions',  path: '/admin/purchase-requisitions', color: '#722ed1', icon: <ShoppingCartOutlined /> },
            { label: 'Supplier Approvals',     path: '/admin/supplier-approvals',    color: '#eb2f96', icon: <ContactsOutlined /> },
            { label: 'Invoice Management',     path: '/admin/invoice-management',    color: '#1890ff', icon: <FileTextOutlined /> },
            { label: 'Budget Overview',        path: '/finance/budget-management',   color: '#13c2c2', icon: <FundOutlined /> },
            { label: 'Project Management',     path: '/admin/projects',              color: '#fa8c16', icon: <ProjectOutlined /> },
            { label: 'HR Overview',            path: '/hr/dashboard',                color: '#52c41a', icon: <TeamOutlined /> },
            { label: 'Salary Payments',        path: '/finance/salary-payments',     color: '#595959', icon: <WalletOutlined /> },
            { label: 'Inventory Dashboard',    path: '/supply-chain/inventory',      color: '#1890ff', icon: <DatabaseOutlined /> },
            { label: 'Analytics Dashboard',    path: '/admin/analytics',             color: '#722ed1', icon: <BarChartOutlined /> },
            { label: 'System Settings',        path: '/admin/system-settings',       color: '#fa541c', icon: <SettingOutlined /> },
            { label: 'Legal & Compliance',     path: '/legal/dashboard',             color: '#52c41a', icon: <SafetyCertificateOutlined /> },
          ].map((link, i) => (
            <Col xs={12} sm={8} md={6} lg={4} key={i}>
              <Button
                block
                icon={React.cloneElement(link.icon, { style: { color: link.color } })}
                onClick={() => navigate(link.path)}
                style={{ borderRadius: '10px', fontSize: '12px', height: '44px', border: `1px solid ${link.color}33` }}
              >
                {link.label}
              </Button>
            </Col>
          ))}
        </Row>
      </Card>

    </div>
  );
};

export default CEODashboard;
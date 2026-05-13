import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Card,
  Row,
  Col,
  Typography,
  Button,
  Space,
  Statistic,
  Alert,
  Badge,
  Divider,
  Tag,
  Tooltip,
  Collapse,
  List,
  Progress,
  Avatar,
  Spin,
  message
} from 'antd';
import {
  DollarOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  TeamOutlined,
  BarChartOutlined,
  BankOutlined,
  UserOutlined,
  SettingOutlined,
  ArrowRightOutlined,
  ExclamationCircleOutlined,
  ToolOutlined,
  BulbOutlined,
  MedicineBoxOutlined,
  SafetyCertificateOutlined,
  LaptopOutlined,
  CrownOutlined,
  EyeOutlined,
  ShoppingCartOutlined,
  TruckOutlined,
  ContactsOutlined,
  SolutionOutlined,
  FundOutlined,
  DeliveredProcedureOutlined,
  DatabaseOutlined,
  PlusOutlined,
  ProjectOutlined,
  PlayCircleOutlined,
  DownOutlined,
  UpOutlined,
  ShareAltOutlined,
  FolderOutlined,
  UploadOutlined,
  FileOutlined,
  FolderPlusOutlined,
  HistoryOutlined,
  LockOutlined,
  NotificationOutlined,
  InboxOutlined,
  BarcodeOutlined,
  StarOutlined,
  TrophyOutlined,
  SwapOutlined,
  WarningOutlined,
  CloseCircleOutlined,
  DownloadOutlined,
  DashboardOutlined,
  ShoppingOutlined,
  SearchOutlined,
  FlagOutlined,
  RightOutlined,
  CalendarOutlined,
  ShopOutlined,
  FileSearchOutlined,
  WalletOutlined,
  FilterOutlined,
  AuditOutlined,
  AccountBookOutlined,
  ScheduleOutlined,
  CarOutlined
} from '@ant-design/icons';
import api from '../services/api';
import moment from 'moment';

const { Title, Text, Paragraph } = Typography;

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const [expandedCards, setExpandedCards] = useState({});
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    cashRequests: { pending: 0, total: 0 },
    invoices: { pending: 0, total: 0 },
    incidentReports: { pending: 0, total: 0 },
    itSupport: { pending: 0, total: 0 },
    suggestions: { pending: 0, total: 0 },
    sickLeave: { pending: 0, total: 0 },
    purchaseRequisitions: { pending: 0, total: 0 },
    buyerRequisitions: { pending: 0, inProgress: 0, quotesReceived: 0, completed: 0 },
    quotes: { pending: 0, evaluated: 0, selected: 0 },
    suppliers: {
      active: 0,
      pending: 0,
      pending_supply_chain: 0,
      pending_head_of_business: 0,
      pending_finance: 0
    },
    purchaseOrders: { active: 0, pending: 0, delivered: 0 },
    projects: { pending: 0, inProgress: 0, completed: 0, total: 0 },
    actionItems: { pending: 0, total: 0 },
    sharepoint: { pending: 0, total: 12 },
    communications: { pending: 0, total: 0 },
    inventory: { totalItems: 0, lowStock: 0, outOfStock: 0, totalValue: 0 },
    fixedAssets: { totalAssets: 0, inUse: 0, overdueInspections: 0, totalValue: 0 },
    supplierPerformance: { totalSuppliers: 0, topPerformers: 0, averageScore: 0 },
    budgetCodes: { pending: 0, total: 0, revisions: 0, transfers: 0 },
    salaryPayments: { currentMonth: 0, yearToDate: 0, totalProcessed: 0 },
    contracts: { total: 0 },
    dataMigration: { pending: 0, completed: 0, failed: 0, total: 0 },
    debitNotes: { pending: 0, total: 0 },
    disbursements: { pending: 0, total: 0 }
  });

  const [dashboardData, setDashboardData] = useState({
    tasks: { total: 0, pending: 0, inProgress: 0, completed: 0 },
    kpis: { overall: 0, count: 0 },
    milestones: { total: 0, inProgress: 0, completed: 0 },
    recentTasks: [],
    pendingApprovals: []
  });

  useEffect(() => {
    fetchDashboardStats();
    loadDashboardData();
  }, []);

  const fetchDashboardStats = async () => {
  try {
    setLoading(true);

    const apiCalls = [];
    const callIndex = {};
    const addCall = (key, promise) => {
      callIndex[key] = apiCalls.length;
      apiCalls.push(promise);
    };

    const isFinanceAdmin = user?.role === 'finance' || user?.role === 'admin' || user?.role === 'ceo';
    const isSupplyChainAdmin = user?.role === 'supply_chain' || user?.role === 'admin' || user?.role === 'ceo';
    const isSupervisor = user?.role === 'supervisor';

    if (isFinanceAdmin) {
      addCall('budgetCodes', api.get('/budget-codes/stats').catch(() => ({ data: { pending: 0, total: 0, revisions: 0, transfers: 0 } })));
    }

    addCall('projects', api.get('/projects/dashboard-stats').catch(() => ({ data: { pending: 0, inProgress: 0, completed: 0, total: 0 } })));
    addCall('incidents', api.get('/incident-reports/dashboard-stats').catch(() => ({ data: { pending: 0, total: 0 } })));
    addCall('sharepoint', api.get('/sharepoint/dashboard-stats').catch(() => ({ data: { pending: 0, total: 0 } })));

    if (user?.role === 'admin' || user?.role === 'hr' || user?.role === 'ceo') {
      addCall('communications', api.get('/communications/stats/dashboard').catch(() => ({ data: { drafts: 0, scheduled: 0, sent: 0 } })));
    }

    if (isSupervisor) {
      addCall('cashRequests', api.get('/cash-requests/supervisor/stats').catch(() => ({ data: { pending: 0, total: 0 } })));
      addCall('itSupport', api.get('/it-support/supervisor').catch(() => ({ data: [] })));
      addCall('sickLeave', api.get('/sick-leave/supervisor/stats').catch(() => ({ data: { pending: 0, total: 0 } })));
      addCall('suggestions', api.get('/suggestions/supervisor/stats').catch(() => ({ data: { pending: 0, total: 0 } })));
    } else {
      addCall('cashRequests', api.get('/cash-requests/dashboard-stats').catch(() => ({ data: { pending: 0, total: 0 } })));
      addCall('itSupport', api.get('/it-support/dashboard/stats').catch(() => ({ data: { summary: { pending: 0, total: 0 } } })));
      addCall('sickLeave', api.get('/sick-leave/dashboard-stats').catch(() => ({ data: { pending: 0, total: 0 } })));
      addCall('suggestions', api.get('/suggestions/dashboard-stats').catch(() => ({ data: { pending: 0, total: 0 } })));
    }

    addCall('purchaseRequisitions', api.get('/purchase-requisitions/dashboard-stats').catch(() => ({ data: { pending: 0, total: 0 } })));

    if (['buyer', 'admin', 'supply_chain', 'ceo'].includes(user?.role)) {
      addCall('buyerDashboard', api.get('/buyer/dashboard').catch(() => ({ data: { success: false, data: { statistics: {}, statusBreakdown: { requisitions: [], quotes: [] } } } })));
    }

    if (user?.role === 'buyer') {
      addCall('buyerSuppliers', api.get('/buyer/suppliers?limit=1').catch(() => ({ data: { pagination: { totalRecords: 0 } } })));
      addCall('debitNotes', api.get('/debit-notes/dashboard-stats').catch(() => ({ data: { pending: 0, total: 0 } })));
    }

    // ── PO stats: supply chain / admin / ceo get the SC endpoint
    //              buyers get their own PO list for counts
    if (isSupplyChainAdmin) {
      addCall('purchaseOrders', api.get('/buyer/purchase-orders/supply-chain/stats').catch(() => ({
        data: { pendingAssignment: 0, assignedToday: 0, rejectedToday: 0, inApprovalChain: 0 }
      })));
    }
    if (['buyer', 'admin', 'ceo'].includes(user?.role)) {
      // Fetch PO list with a high limit to derive counts; pagination total gives overall count
      addCall('buyerPOs', api.get('/buyer/purchase-orders?limit=500').catch(() => ({
        data: { data: [], pagination: { totalRecords: 0 } }
      })));
    }

    let invoiceEndpoint = '/invoices/employee';
    if (isFinanceAdmin) {
      invoiceEndpoint = '/invoices/finance';
    } else if (isSupervisor) {
      invoiceEndpoint = '/invoices/supervisor/all';
    } else if (['hr', 'it', 'buyer', 'supply_chain'].includes(user?.role)) {
      invoiceEndpoint = '/invoices/supervisor/pending';
    }

    addCall('invoices', api.get(invoiceEndpoint).catch(() => ({ data: { success: false, data: [], count: 0, pagination: { total: 0 } } })));

    if (['admin', 'supply_chain', 'finance', 'ceo'].includes(user?.role)) {
      addCall('supplierApprovals', api.get('/suppliers/admin/approvals/statistics').catch(() => ({ data: { pending: 0, pending_supply_chain: 0, pending_head_of_business: 0, pending_finance: 0, approved: 0, rejected: 0, total: 0 } })));
      addCall('contractStats', api.get('/contracts/analytics/statistics').catch(() => ({ data: { overview: { total: 0 } } })));
    }

    if (isSupplyChainAdmin) {
      addCall('inventory', api.get('/inventory/dashboard').catch(() => ({ data: { data: { summary: { totalItems: 0, lowStockItems: 0, outOfStockItems: 0, totalStockValue: 0 } } } })));
      addCall('assets', api.get('/fixed-assets/dashboard').catch(() => ({ data: { data: { summary: { totalAssets: 0, inUseAssets: 0, overdueInspections: 0 }, valuation: { totalCurrentValue: 0 } } } })));
      addCall('supplierPerformance', api.get('/supplier-performance/rankings?limit=10').catch(() => ({ data: { data: { rankings: [], summary: { totalSuppliers: 0, averageScore: 0 } } } })));
    }

    addCall('actionItems', api.get('/action-items/stats').catch(() => ({ data: { success: false, data: { total: 0, completed: 0 } } })));

    if (isFinanceAdmin) {
      addCall('salaryDashboard', api.get('/salary-payments/dashboard-stats').catch(() => ({ data: { success: false, data: { currentMonth: 0, yearToDate: 0, recentPayments: [] } } })));
      addCall('salaryPayments', api.get('/salary-payments?status=processed').catch(() => ({ data: { success: false, count: 0, data: [] } })));
      addCall('disbursements', api.get('/disbursements/dashboard-stats').catch(() => ({ data: { pending: 0, total: 0 } })));
    }

    const responses = await Promise.allSettled(apiCalls);
    const getResponse = (key, fallback) => {
      const idx = callIndex[key];
      if (idx === undefined) return fallback;
      const result = responses[idx];
      if (!result || result.status !== 'fulfilled') return fallback;
      return result.value?.data ?? fallback;
    };
    const unwrapPayload = (payload, fallback) => {
      if (payload && typeof payload === 'object' && Object.prototype.hasOwnProperty.call(payload, 'data')) {
        return payload.data ?? fallback;
      }
      return payload ?? fallback;
    };

    const projectStats = unwrapPayload(getResponse('projects', { data: { pending: 0, inProgress: 0, completed: 0, total: 0 } }), { pending: 0, inProgress: 0, completed: 0, total: 0 });
    const incidentStats = unwrapPayload(getResponse('incidents', { data: { pending: 0, total: 0 } }), { pending: 0, total: 0 });
    const sharepointStats = unwrapPayload(getResponse('sharepoint', { data: { pending: 0, total: 0 } }), { pending: 0, total: 0 });
    const communicationsData = unwrapPayload(getResponse('communications', { data: { drafts: 0, scheduled: 0, sent: 0 } }), { drafts: 0, scheduled: 0, sent: 0 });
    const communicationsStats = { pending: (communicationsData.drafts || 0) + (communicationsData.scheduled || 0), total: communicationsData.sent || 0 };
    const budgetCodesData = unwrapPayload(getResponse('budgetCodes', { data: { pending: 0, total: 0, revisions: 0, transfers: 0 } }), { pending: 0, total: 0, revisions: 0, transfers: 0 });
    const budgetCodesStats = { pending: budgetCodesData.pending || 0, total: budgetCodesData.total || 0, revisions: budgetCodesData.revisions || 0, transfers: budgetCodesData.transfers || 0 };
    const cashStats = unwrapPayload(getResponse('cashRequests', { data: { pending: 0, total: 0 } }), { pending: 0, total: 0 });
    const itSupportPayload = getResponse('itSupport', isSupervisor ? [] : { data: { summary: { pending: 0, total: 0 } } });
    const itSupportData = isSupervisor ? itSupportPayload : unwrapPayload(itSupportPayload, { summary: { pending: 0, total: 0 } });
    const itStats = isSupervisor
      ? { pending: (itSupportData || []).filter(r => ['pending_supervisor', 'pending_it_review'].includes(r.status)).length, total: (itSupportData || []).length }
      : itSupportData?.summary || { pending: 0, total: 0 };
    const leaveStats = unwrapPayload(getResponse('sickLeave', { data: { pending: 0, total: 0 } }), { pending: 0, total: 0 });
    const suggestionsStats = unwrapPayload(getResponse('suggestions', { data: { pending: 0, total: 0 } }), { pending: 0, total: 0 });
    const purchaseRequisitionStats = unwrapPayload(getResponse('purchaseRequisitions', { data: { pending: 0, total: 0 } }), { pending: 0, total: 0 });
    const buyerDashboardData = unwrapPayload(getResponse('buyerDashboard', null), null);
    const buyerStats = buyerDashboardData?.statistics || {};
    const buyerQuoteBreakdown = buyerDashboardData?.statusBreakdown?.quotes || [];
    const getCountByStatus = (items, statuses) => items.reduce((sum, item) => sum + (statuses.includes(item._id) ? item.count : 0), 0);
    const buyerRequisitionsStats = buyerDashboardData
      ? { pending: Math.max((buyerStats.totalAssignedRequisitions || 0) - (buyerStats.inProgressRequisitions || 0) - (buyerStats.completedRequisitions || 0), 0), inProgress: buyerStats.inProgressRequisitions || 0, quotesReceived: getCountByStatus(buyerQuoteBreakdown, ['received', 'clarification_received']), completed: buyerStats.completedRequisitions || 0 }
      : { pending: 0, inProgress: 0, quotesReceived: 0, completed: 0 };
    const quotesStats = buyerDashboardData
      ? { pending: getCountByStatus(buyerQuoteBreakdown, ['received', 'under_review', 'clarification_requested', 'clarification_received']), evaluated: getCountByStatus(buyerQuoteBreakdown, ['evaluated']), selected: getCountByStatus(buyerQuoteBreakdown, ['selected']) }
      : { pending: 0, evaluated: 0, selected: 0 };
    const invoiceData = getResponse('invoices', { data: [], count: 0, pagination: { total: 0 } });
    const invoiceList = Array.isArray(invoiceData.data) ? invoiceData.data : [];
    const invoiceTotal = invoiceData.pagination?.total ?? invoiceData.count ?? invoiceList.length ?? 0;
    const invoicePendingStatuses = ['pending_finance_assignment', 'pending_department_approval'];
    const invoicePending = invoiceEndpoint.includes('/supervisor/pending') ? invoiceTotal : invoiceList.filter(inv => invoicePendingStatuses.includes(inv.approvalStatus)).length;
    const supplierApprovalData = unwrapPayload(getResponse('supplierApprovals', { data: { pending: 0, pending_supply_chain: 0, pending_head_of_business: 0, pending_finance: 0, approved: 0, rejected: 0, total: 0 } }), { pending: 0, pending_supply_chain: 0, pending_head_of_business: 0, pending_finance: 0, approved: 0, rejected: 0, total: 0 });
    const buyerSuppliersPayload = getResponse('buyerSuppliers', { pagination: { totalRecords: 0 } });
    const buyerSuppliersCount = buyerSuppliersPayload?.pagination?.totalRecords ?? 0;
    const approvedSuppliersCount = supplierApprovalData.approved || 0;
    const pendingSuppliersCount = supplierApprovalData.pending || 0;
    const activeSuppliersCount = approvedSuppliersCount > 0 ? approvedSuppliersCount : buyerSuppliersCount;
    const contractStatsData = unwrapPayload(getResponse('contractStats', { data: { overview: { total: 0 } } }), { overview: { total: 0 } });
    const inventoryPayload = getResponse('inventory', { data: { summary: { totalItems: 0, lowStockItems: 0, outOfStockItems: 0, totalStockValue: 0 } } });
    const inventorySummary = inventoryPayload?.data?.summary || inventoryPayload?.summary || { totalItems: 0, lowStockItems: 0, outOfStockItems: 0, totalStockValue: 0 };
    const assetPayload = getResponse('assets', { data: { summary: { totalAssets: 0, inUseAssets: 0, overdueInspections: 0 }, valuation: { totalCurrentValue: 0 } } });
    const assetSummary = assetPayload?.data?.summary || assetPayload?.summary || { totalAssets: 0, inUseAssets: 0, overdueInspections: 0 };
    const assetValuation = assetPayload?.data?.valuation || assetPayload?.valuation || { totalCurrentValue: 0 };
    const supplierPerformancePayload = getResponse('supplierPerformance', { data: { rankings: [], summary: { totalSuppliers: 0, averageScore: 0 } } });
    const supplierPerformanceSummary = supplierPerformancePayload?.data?.summary || supplierPerformancePayload?.summary || { totalSuppliers: 0, averageScore: 0 };
    const supplierPerformanceRankings = supplierPerformancePayload?.data?.rankings || supplierPerformancePayload?.rankings || [];

    // ── Purchase Order stats ──────────────────────────────────────────────────
    // Supply Chain / Admin / CEO: use the SC stats endpoint
    const scPOStats = unwrapPayload(
      getResponse('purchaseOrders', { data: { pendingAssignment: 0, inApprovalChain: 0, assignedToday: 0, rejectedToday: 0 } }),
      { pendingAssignment: 0, inApprovalChain: 0, assignedToday: 0, rejectedToday: 0 }
    );

    // Buyer / Admin / CEO: derive counts from the PO list
    const buyerPOsPayload = getResponse('buyerPOs', { data: [], pagination: { totalRecords: 0 } });
    const buyerPOsList = Array.isArray(buyerPOsPayload?.data) ? buyerPOsPayload.data : [];
    const buyerPOsTotal = buyerPOsPayload?.pagination?.totalRecords ?? buyerPOsList.length ?? 0;

    const PO_ACTIVE_STATUSES = [
      'pending_supply_chain_assignment', 'pending_department_approval',
      'pending_head_of_business_approval', 'pending_finance_approval',
      'pending_head_approval', 'approved', 'sent_to_supplier', 'acknowledged'
    ];
    const PO_PENDING_STATUSES = [
      'draft', 'pending_supply_chain_assignment'
    ];
    const PO_DELIVERED_STATUSES = ['delivered', 'completed'];

    // For SC/admin/CEO use the dedicated stats endpoint values
    // For buyer use list-derived counts; for other roles default to 0
    let purchaseOrderStats;
    if (isSupplyChainAdmin) {
      purchaseOrderStats = {
        // pending = waiting to be assigned by SC
        pending: scPOStats.pendingAssignment || 0,
        // active = in the multi-level approval chain
        active: scPOStats.inApprovalChain || 0,
        // delivered not tracked by this endpoint — derive from buyer list if available
        delivered: buyerPOsList.filter(po => PO_DELIVERED_STATUSES.includes(po.status)).length,
        total: (scPOStats.pendingAssignment || 0) + (scPOStats.inApprovalChain || 0),
        assignedToday: scPOStats.assignedToday || 0,
        rejectedToday: scPOStats.rejectedToday || 0,
      };
    } else if (['buyer', 'admin', 'ceo'].includes(user?.role)) {
      purchaseOrderStats = {
        pending: buyerPOsList.filter(po => PO_PENDING_STATUSES.includes(po.status)).length,
        active: buyerPOsList.filter(po => PO_ACTIVE_STATUSES.includes(po.status)).length,
        delivered: buyerPOsList.filter(po => PO_DELIVERED_STATUSES.includes(po.status)).length,
        total: buyerPOsTotal,
        assignedToday: 0,
        rejectedToday: 0,
      };
    } else {
      purchaseOrderStats = { pending: 0, active: 0, delivered: 0, total: 0, assignedToday: 0, rejectedToday: 0 };
    }
    // ─────────────────────────────────────────────────────────────────────────

    const actionItemsPayload = getResponse('actionItems', { data: { total: 0, completed: 0 } });
    const actionItemsStats = unwrapPayload(actionItemsPayload, { total: 0, completed: 0 });
    const actionItemsPending = Math.max((actionItemsStats.total || 0) - (actionItemsStats.completed || 0), 0);
    const salaryDashboardPayload = getResponse('salaryDashboard', { data: { currentMonth: 0, yearToDate: 0, recentPayments: [] } });
    const salaryDashboardData = unwrapPayload(salaryDashboardPayload, { currentMonth: 0, yearToDate: 0, recentPayments: [] });
    const salaryPaymentsData = getResponse('salaryPayments', { count: 0, data: [] });
    const lastPaymentDate = salaryPaymentsData?.data?.[0]?.processedAt || salaryDashboardData?.recentPayments?.[0]?.processedAt || null;
    const debitNotesStats = unwrapPayload(getResponse('debitNotes', { data: { pending: 0, total: 0 } }), { pending: 0, total: 0 });
    const disbursementsStats = unwrapPayload(getResponse('disbursements', { data: { pending: 0, total: 0 } }), { pending: 0, total: 0 });

    setStats({
      cashRequests: cashStats,
      invoices: { pending: invoicePending || 0, total: invoiceTotal || 0 },
      incidentReports: incidentStats,
      itSupport: { pending: itStats.pending, total: itStats.total },
      suggestions: { pending: suggestionsStats.pending, total: suggestionsStats.total },
      sickLeave: { pending: leaveStats.pending, total: leaveStats.total },
      purchaseRequisitions: { pending: purchaseRequisitionStats.pending || 0, total: purchaseRequisitionStats.total || 0 },
      buyerRequisitions: buyerRequisitionsStats,
      quotes: quotesStats,
      suppliers: { active: activeSuppliersCount || 0, pending: pendingSuppliersCount || 0, pending_supply_chain: supplierApprovalData.pending_supply_chain || 0, pending_head_of_business: supplierApprovalData.pending_head_of_business || 0, pending_finance: supplierApprovalData.pending_finance || 0 },
      purchaseOrders: purchaseOrderStats,
      projects: projectStats,
      actionItems: { pending: actionItemsPending, total: actionItemsStats.total || 0 },
      sharepoint: sharepointStats,
      communications: communicationsStats,
      budgetCodes: budgetCodesStats,
      inventory: { totalItems: inventorySummary.totalItems || 0, lowStock: inventorySummary.lowStockItems || 0, outOfStock: inventorySummary.outOfStockItems || 0, totalValue: inventorySummary.totalStockValue || 0 },
      fixedAssets: { totalAssets: assetSummary.totalAssets || 0, inUse: assetSummary.inUseAssets || 0, overdueInspections: assetSummary.overdueInspections || 0, totalValue: assetValuation.totalCurrentValue || 0 },
      supplierPerformance: { totalSuppliers: supplierPerformanceSummary.totalSuppliers || 0, topPerformers: supplierPerformanceRankings.filter(s => s.performanceGrade === 'A').length || 0, averageScore: supplierPerformanceSummary.averageScore || 0 },
      salaryPayments: { currentMonth: salaryDashboardData.currentMonth || 0, yearToDate: salaryDashboardData.yearToDate || 0, totalProcessed: salaryPaymentsData.count || 0, lastPaymentDate },
      contracts: { total: contractStatsData?.overview?.total || 0 },
      dataMigration: { pending: 0, completed: 0, failed: 0, total: 0 },
      debitNotes: { pending: debitNotesStats.pending || 0, total: debitNotesStats.total || 0 },
      disbursements: { pending: disbursementsStats.pending || 0, total: disbursementsStats.total || 0 }
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
  } finally {
    setLoading(false);
  }
};


  const loadDashboardData = async () => {
    try {
      const promises = [];
      promises.push(api.get('/action-items/stats').catch(() => ({ data: { success: false } })));
      promises.push(api.get('/action-items?view=my-tasks&limit=5').catch(() => ({ data: { success: false } })));
      if (user?.role) {
        promises.push(api.get('/kpis/my-kpis').catch(() => ({ data: { success: false } })));
      }
      if (['supervisor', 'admin', 'supply_chain', 'manager', 'hr', 'it', 'hse', 'buyer', 'technical', 'ceo'].includes(user?.role)) {
        promises.push(api.get('/projects/supervisor/milestones').catch(() => ({ data: { success: false } })));
        promises.push(api.get('/action-items?view=my-approvals').catch(() => ({ data: { success: false } })));
      }

      const results = await Promise.allSettled(promises);
      const newData = { tasks: { total: 0, pending: 0, inProgress: 0, completed: 0 }, kpis: { overall: 0, count: 0 }, milestones: { total: 0, inProgress: 0, completed: 0 }, recentTasks: [], pendingApprovals: [] };

      if (results[0].status === 'fulfilled' && results[0].value.data.success) newData.tasks = results[0].value.data.data;
      if (results[1].status === 'fulfilled' && results[1].value.data.success) newData.recentTasks = results[1].value.data.data.slice(0, 5);
      if (results[2]?.status === 'fulfilled' && results[2].value.data.success) {
        const kpis = results[2].value.data.data;
        if (kpis && kpis.length > 0) {
          const currentKPI = kpis[0];
          if (currentKPI.kpis) {
            const weightedAchievement = currentKPI.kpis.reduce((sum, kpi) => sum + ((kpi.achievement || 0) * kpi.weight / 100), 0);
            newData.kpis = { overall: Math.round(weightedAchievement), count: currentKPI.kpis.length };
          }
        }
      }
      if (results[3]?.status === 'fulfilled' && results[3].value.data.success) {
        const milestones = results[3].value.data.data;
        newData.milestones = { total: milestones.length, inProgress: milestones.filter(m => m.milestone.status === 'In Progress').length, completed: milestones.filter(m => m.milestone.status === 'Completed').length };
      }
      if (results[4]?.status === 'fulfilled' && results[4].value.data.success) {
        const approvals = results[4].value.data.data;
        newData.pendingApprovals = approvals.filter(t => t.status === 'Pending Approval' || t.status === 'Pending Completion Approval' || (t.assignedTo && t.assignedTo.some(a => a.completionStatus === 'submitted'))).slice(0, 5);
      }
      setDashboardData(newData);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    }
  };

  const toggleCardExpansion = (cardKey) => {
    setExpandedCards(prev => ({ ...prev, [cardKey]: !prev[cardKey] }));
  };

  const getRoleCapabilities = (role) => {
    const capabilities = {
      employee: { level: 1, canView: ['all'], canManage: [], canApprove: [], hasTeamAccess: false },
      supervisor: { level: 2, canView: ['all'], canManage: ['team-incidents', 'team-sick-leave', 'milestones', 'task-approvals'], canApprove: ['cash-requests', 'sick-leave', 'purchase-requisitions', 'tasks', 'kpis'], hasTeamAccess: true },
      finance: { level: 3, canView: ['all'], canManage: ['cash-requests', 'invoices', 'financial-reports'], canApprove: ['cash-requests', 'invoices'], hasTeamAccess: true },
      hr: { level: 3, canView: ['all'], canManage: ['incident-reports', 'suggestions', 'sick-leave', 'employee-welfare', 'communications'], canApprove: ['sick-leave', 'incident-reports'], hasTeamAccess: true },
      it: { level: 3, canView: ['all'], canManage: ['it-support', 'it-inventory', 'system-maintenance'], canApprove: ['it-requests'], hasTeamAccess: true },
      supply_chain: { level: 3, canView: ['all'], canManage: ['purchase-requisitions', 'procurement', 'vendor-management', 'inventory', 'fixed-assets', 'projects'], canApprove: ['purchase-requisitions'], hasTeamAccess: true },
      technical: { level: 3, canView: ['all'], canManage: ['team-incidents', 'team-sick-leave', 'milestones', 'task-approvals'], canApprove: ['tasks', 'kpis'], hasTeamAccess: true },
      buyer: { level: 3, canView: ['all'], canManage: ['assigned-requisitions', 'supplier-sourcing', 'quote-evaluation', 'purchase-orders'], canApprove: ['quotes', 'supplier-selection', 'purchase-orders'], hasTeamAccess: true },
      // ── CHANGE 2 of 5: CEO capabilities ──
      ceo: { level: 5, canView: ['all'], canManage: ['all'], canApprove: ['all'], hasTeamAccess: true },
      admin: { level: 4, canView: ['all'], canManage: ['all'], canApprove: ['all'], hasTeamAccess: true }
    };
    return capabilities[role] || capabilities.employee;
  };

  const getPriorityColor = (priority) => ({ 'LOW': 'green', 'MEDIUM': 'blue', 'HIGH': 'orange', 'CRITICAL': 'red' }[priority] || 'default');

  const getStatusColor = (status) => ({ 'Not Started': 'default', 'In Progress': 'processing', 'Pending Approval': 'warning', 'Pending Completion Approval': 'cyan', 'Completed': 'success', 'Rejected': 'error' }[status] || 'default');

  const getModuleCards = () => {
    const userCapabilities = getRoleCapabilities(user?.role);

    const modules = [

      // ── 1. PETTY CASH ────────────────────────────────────────────────────
      {
        key: 'pettycash',
        title: 'Petty Cash Management',
        description: 'Manage cash requests, approvals, and justifications',
        icon: <DollarOutlined style={{ fontSize: '48px', color: '#52c41a' }} />,
        color: '#f6ffed',
        borderColor: '#52c41a',
        stats: stats.cashRequests,
        managementRoles: ['finance', 'admin', 'ceo'],
        actions: {
          base: [
            { label: 'My Requests', path: '/employee/cash-requests', icon: <UserOutlined /> },
            { label: 'New Request', path: '/employee/cash-request/new', icon: <ArrowRightOutlined /> },
            { label: 'Submit Reimbursement', path: '/employee/cash-request/reimbursement/new', icon: <FileTextOutlined /> }
          ],
          supervisor: [{ label: 'Team Requests', path: '/supervisor/cash-approvals', icon: <TeamOutlined />, badge: true }],
          buyer: [{ label: 'Team Requests', path: '/supervisor/cash-approvals', icon: <TeamOutlined />, badge: true }],
          technical: [{ label: 'Team Requests', path: '/supervisor/cash-approvals', icon: <TeamOutlined />, badge: true }],
          hr: [{ label: 'Team Requests', path: '/supervisor/cash-approvals', icon: <TeamOutlined />, badge: true }],
          supply_chain: [{ label: 'Team Requests', path: '/supervisor/cash-approvals', icon: <TeamOutlined />, badge: true }],
          finance: [
            { label: 'Finance Dashboard', path: '/finance/cash-approvals', icon: <CrownOutlined />, primary: true, badge: true },
            { label: 'Team Cash Requests', path: '/supervisor/cash-approvals', icon: <TeamOutlined />, badge: true },
            { label: 'All Requests', path: '/finance/cash-management', icon: <BarChartOutlined /> },
            { label: 'Financial Reports', path: '/finance/cash-reports', icon: <FileTextOutlined /> }
          ],
          admin: [
            { label: 'Admin Dashboard', path: '/admin/cash-approvals', icon: <SettingOutlined />, primary: true },
            { label: 'Team Requests', path: '/supervisor/cash-approvals', icon: <TeamOutlined />, badge: true },
            { label: 'System Analytics', path: '/admin/cash-analytics', icon: <BarChartOutlined /> },
            { label: 'User Management', path: '/admin/cash-users', icon: <TeamOutlined /> }
          ],
          // ── CHANGE 5 (1/23): CEO petty cash actions ──
          ceo: [
            { label: 'Final Approvals',     path: '/supervisor/cash-approvals',  icon: <EyeOutlined />,     primary: true },
            // { label: 'Final Approvals',   path: '/admin/head-approval',   icon: <CrownOutlined />,   badge: true },
            // { label: 'Cash Analytics',    path: '/admin/cash-analytics',  icon: <BarChartOutlined /> },
            { label: 'Financial Reports', path: '/finance/cash-reports',  icon: <FileTextOutlined /> },
          ]
        }
      },

      // ── 2. PROJECT MANAGEMENT ─────────────────────────────────────────────
      {
        key: 'project-management',
        title: 'Project Management',
        description: 'Create and manage organizational projects, track progress, allocate resources, and monitor timelines',
        icon: <ProjectOutlined style={{ fontSize: '48px', color: '#13c2c2' }} />,
        color: '#e6fffb',
        borderColor: '#13c2c2',
        stats: stats.projects,
        managementRoles: ['supply_chain', 'supervisor', 'admin', 'project', 'ceo'],
        actions: {
          _milestones_base: [
            { label: 'My Milestones', path: '/supervisor/milestones', icon: <FlagOutlined />, primary: true, badge: true },
            { label: 'Task Approvals', path: '/supervisor/action-items', icon: <CheckCircleOutlined />, badge: true },
            { label: 'KPI Approvals', path: '/supervisor/kpi-approvals', icon: <TrophyOutlined /> },
            { label: 'Project Plan Approvals', path: '/supervisor/project-plan-approvals', icon: <ScheduleOutlined />, badge: true },
            { label: 'Progress Reports', path: '/supervisor/', icon: <BarChartOutlined /> }
          ],
          employee: [
            { label: 'My Milestones', path: '/supervisor/milestones', icon: <FlagOutlined />, primary: true, badge: true },
            { label: 'Task Approvals', path: '/supervisor/action-items', icon: <CheckCircleOutlined />, badge: true },
            { label: 'KPI Approvals', path: '/supervisor/kpi-approvals', icon: <TrophyOutlined /> },
            { label: 'Project Plan Approvals', path: '/supervisor/project-plan-approvals', icon: <ScheduleOutlined />, badge: true }
          ],
          supervisor: [
            { label: 'My Milestones', path: '/supervisor/milestones', icon: <FlagOutlined />, primary: true, badge: true },
            { label: 'Task Approvals', path: '/supervisor/action-items', icon: <CheckCircleOutlined />, badge: true },
            { label: 'KPI Approvals', path: '/supervisor/kpi-approvals', icon: <TrophyOutlined /> },
            { label: 'Project Plan Approvals', path: '/supervisor/project-plan-approvals', icon: <ScheduleOutlined />, badge: true },
            { label: 'Progress Reports', path: '/supervisor/projects/reports', icon: <BarChartOutlined /> }
          ],
          supply_chain: [
            { label: 'My Milestones', path: '/supervisor/milestones', icon: <FlagOutlined />, primary: true, badge: true },
            { label: 'Task Approvals', path: '/supervisor/action-items', icon: <CheckCircleOutlined />, badge: true },
            { label: 'KPI Approvals', path: '/supervisor/kpi-approvals', icon: <TrophyOutlined /> },
            { label: 'Project Plan Approvals', path: '/supervisor/project-plan-approvals', icon: <ScheduleOutlined />, badge: true },
            { label: 'Progress Reports', path: '/supervisor/', icon: <BarChartOutlined /> }
          ],
          buyer: [
            { label: 'My Milestones', path: '/supervisor/milestones', icon: <FlagOutlined />, primary: true, badge: true },
            { label: 'Task Approvals', path: '/supervisor/action-items', icon: <CheckCircleOutlined />, badge: true },
            { label: 'KPI Approvals', path: '/supervisor/kpi-approvals', icon: <TrophyOutlined /> },
            { label: 'Project Plan Approvals', path: '/supervisor/project-plan-approvals', icon: <ScheduleOutlined />, badge: true }
          ],
          hr: [
            { label: 'My Milestones', path: '/supervisor/milestones', icon: <FlagOutlined />, primary: true, badge: true },
            { label: 'Task Approvals', path: '/supervisor/action-items', icon: <CheckCircleOutlined />, badge: true },
            { label: 'KPI Approvals', path: '/supervisor/kpi-approvals', icon: <TrophyOutlined /> },
            { label: 'Project Plan Approvals', path: '/supervisor/project-plan-approvals', icon: <ScheduleOutlined />, badge: true }
          ],
          technical: [
            { label: 'My Milestones', path: '/supervisor/milestones', icon: <FlagOutlined />, primary: true, badge: true },
            { label: 'Task Approvals', path: '/supervisor/action-items', icon: <CheckCircleOutlined />, badge: true },
            { label: 'KPI Approvals', path: '/supervisor/kpi-approvals', icon: <TrophyOutlined /> },
            { label: 'Project Plan Approvals', path: '/supervisor/project-plan-approvals', icon: <ScheduleOutlined />, badge: true }
          ],
          finance: [
            { label: 'My Milestones', path: '/supervisor/milestones', icon: <FlagOutlined />, primary: true, badge: true },
            { label: 'Task Approvals', path: '/supervisor/action-items', icon: <CheckCircleOutlined />, badge: true },
            { label: 'KPI Approvals', path: '/supervisor/kpi-approvals', icon: <TrophyOutlined /> },
            { label: 'Project Plan Approvals', path: '/supervisor/project-plan-approvals', icon: <ScheduleOutlined />, badge: true }
          ],
          it: [
            { label: 'My Milestones', path: '/supervisor/milestones', icon: <FlagOutlined />, primary: true, badge: true },
            { label: 'Task Approvals', path: '/supervisor/action-items', icon: <CheckCircleOutlined />, badge: true },
            { label: 'KPI Approvals', path: '/supervisor/kpi-approvals', icon: <TrophyOutlined /> },
            { label: 'Project Plan Approvals', path: '/supervisor/project-plan-approvals', icon: <ScheduleOutlined />, badge: true }
          ],
          hse: [
            { label: 'My Milestones', path: '/supervisor/milestones', icon: <FlagOutlined />, primary: true, badge: true },
            { label: 'Task Approvals', path: '/supervisor/action-items', icon: <CheckCircleOutlined />, badge: true },
            { label: 'KPI Approvals', path: '/supervisor/kpi-approvals', icon: <TrophyOutlined /> },
            { label: 'Project Plan Approvals', path: '/supervisor/project-plan-approvals', icon: <ScheduleOutlined />, badge: true }
          ],
          project: [
            { label: 'Project Portal', path: '/project/project-management', icon: <CrownOutlined />, primary: true },
            { label: 'Create Project', path: '/project/projects/new', icon: <PlusOutlined /> },
            { label: 'My Milestones', path: '/supervisor/milestones', icon: <FlagOutlined />, badge: true },
            { label: 'Task Approvals', path: '/supervisor/action-items', icon: <CheckCircleOutlined />, badge: true },
            { label: 'KPI Approvals', path: '/supervisor/kpi-approvals', icon: <TrophyOutlined /> },
            { label: 'Project Plan Approvals', path: '/supervisor/project-plan-approvals', icon: <ScheduleOutlined />, badge: true },
            { label: 'Project Analytics', path: '/project/projects/analytics', icon: <BarChartOutlined /> }
          ],
          admin: [
            { label: 'Admin Dashboard', path: '/admin/project-management', icon: <SettingOutlined />, primary: true },
            { label: 'PM Milestone Review', path: '/admin/pm/milestone-review', icon: <CheckCircleOutlined />, badge: true },
            { label: 'All Projects', path: '/admin/projects', icon: <ProjectOutlined /> },
            { label: 'My Milestones', path: '/supervisor/milestones', icon: <FlagOutlined />, badge: true },
            { label: 'Task Approvals', path: '/supervisor/action-items', icon: <CheckCircleOutlined />, badge: true },
            { label: 'KPI Approvals', path: '/supervisor/kpi-approvals', icon: <TrophyOutlined /> },
            { label: 'Project Plan Approvals', path: '/supervisor/project-plan-approvals', icon: <ScheduleOutlined />, badge: true },
            { label: 'Project Analytics', path: '/admin/projects/analytics', icon: <BarChartOutlined /> },
            { label: 'Resource Planning', path: '/admin/projects/resources', icon: <TeamOutlined /> }
          ],
          // ── CHANGE 5 (2/23): CEO project management actions ──
          ceo: [
            { label: 'All Projects',        path: '/admin/projects',             icon: <ProjectOutlined />,  primary: true },
            { label: 'Project Analytics',   path: '/admin/projects/analytics',   icon: <BarChartOutlined /> },
            { label: 'PM Milestone Review', path: '/admin/pm/milestone-review',  icon: <FlagOutlined />,     badge: true },
            { label: 'KPI Overview',        path: '/supervisor/kpi-approvals',   icon: <TrophyOutlined /> },
            { label: 'Performance Reports', path: '/admin/analytics',            icon: <FundOutlined /> },
          ]
        }
      },

      // ── 3. PURCHASE REQUISITIONS ──────────────────────────────────────────
      {
        key: 'purchase-requisitions',
        title: 'Purchase Requisitions',
        description: user?.role === 'buyer'
          ? 'Manage assigned requisitions, source suppliers, and handle procurement workflow'
          : 'Request procurement through enhanced approval workflow with finance verification and buyer assignment',
        icon: <ShoppingCartOutlined style={{ fontSize: '48px', color: '#722ed1' }} />,
        color: '#f9f0ff',
        borderColor: '#722ed1',
        stats: user?.role === 'buyer' ? stats.buyerRequisitions : stats.purchaseRequisitions,
        managementRoles: ['finance', 'supply_chain', 'buyer', 'hr', 'it', 'admin', 'employee', 'ceo'],
        actions: {
          base: [
            { label: 'My Requisitions', path: '/employee/purchase-requisitions', icon: <UserOutlined /> },
            { label: 'New Requisition', path: '/employee/purchase-requisitions/new', icon: <ArrowRightOutlined /> },
            { label: 'Request Items', path: '/employee/item-requests', icon: <PlusOutlined /> }
          ],
          supervisor: [
            { label: 'Team Requisitions', path: '/supervisor/purchase-requisitions', icon: <TeamOutlined />, badge: true },
            { label: 'PO Approvals', path: '/supervisor/po-approvals', icon: <ShoppingCartOutlined />, badge: true },
            { label: 'Request Items', path: '/employee/item-requests', icon: <PlusOutlined /> }
          ],
          technical: [
            { label: 'Team Requisitions', path: '/supervisor/purchase-requisitions', icon: <TeamOutlined />, badge: true },
            { label: 'PO Approvals', path: '/supervisor/po-approvals', icon: <ShoppingCartOutlined />, badge: true }
          ],
          finance: [
            { label: 'Budget Verification', path: '/finance/purchase-requisitions', icon: <CrownOutlined />, primary: true, badge: true },
            { label: 'Team Requisitions', path: '/supervisor/purchase-requisitions', icon: <TeamOutlined />, badge: true },
            { label: 'PO Approvals', path: '/supervisor/po-approvals', icon: <ShoppingCartOutlined />, badge: true },
            { label: 'Request Items', path: '/employee/item-requests', icon: <PlusOutlined /> },
            { label: 'Finance Dashboard', path: '/finance/dashboard', icon: <BankOutlined /> }
          ],
          hr: [
            { label: 'Team Requisitions', path: '/supervisor/purchase-requisitions', icon: <TeamOutlined />, badge: true },
            { label: 'PO Approvals', path: '/supervisor/po-approvals', icon: <ShoppingCartOutlined />, badge: true },
            { label: 'Request Items', path: '/employee/item-requests', icon: <PlusOutlined /> }
          ],
          it: [
            { label: 'Team Requisitions', path: '/supervisor/purchase-requisitions', icon: <TeamOutlined />, badge: true },
            { label: 'PO Approvals', path: '/supervisor/po-approvals', icon: <ShoppingCartOutlined />, badge: true },
            { label: 'Request Items', path: '/employee/item-requests', icon: <PlusOutlined /> }
          ],
          supply_chain: [
            { label: 'SC Dashboard', path: '/supply-chain/requisitions', icon: <CrownOutlined />, primary: true, badge: true },
            { label: 'PO Assignment', path: '/supply-chain/purchase-orders', icon: <FileTextOutlined />, badge: true },
            { label: 'Head Approval', path: '/supply-chain/head-approval', icon: <CheckCircleOutlined />, badge: true },
            { label: 'Team Requisitions', path: '/supervisor/purchase-requisitions', icon: <TeamOutlined />, badge: true },
            { label: 'Pending PO Assignment', path: '/supply-chain/purchase-orders/pending', icon: <ClockCircleOutlined />, badge: true },
            { label: 'Active POs', path: '/supply-chain/purchase-orders?status=active', icon: <CheckCircleOutlined /> },
            { label: 'Item Management', path: '/supply-chain/item-management', icon: <DatabaseOutlined /> },
            { label: 'Contract Management', path: '/supply-chain/contracts', icon: <FileTextOutlined /> },
            { label: 'PO Approvals', path: '/supervisor/po-approvals', icon: <ShoppingCartOutlined />, badge: true },
            { label: 'Clean Data / Migration', path: '/supply-chain/data-migration-validator', icon: <FilterOutlined /> }
          ],
          buyer: [
            { label: 'My Assignments', path: '/buyer/requisitions', icon: <CrownOutlined />, primary: true, badge: true },
            { label: 'Petty Cash Forms', path: '/buyer/petty-cash', icon: <FileTextOutlined />, badge: true },
            { label: 'PO Approvals', path: '/supervisor/po-approvals', icon: <ShoppingCartOutlined />, badge: true }
          ],
          employee: [
            { label: 'My Requisitions', path: '/employee/purchase-requisitions', icon: <UserOutlined /> },
            { label: 'New Requisition', path: '/employee/purchase-requisitions/new', icon: <ArrowRightOutlined /> },
            { label: 'Request Items', path: '/employee/item-requests', icon: <PlusOutlined /> },
            { label: 'PO Approvals', path: '/supervisor/po-approvals', icon: <ShoppingCartOutlined />, badge: true }
          ],
          admin: [
            { label: 'Admin Dashboard', path: '/admin/purchase-requisitions', icon: <SettingOutlined />, primary: true },
            { label: 'Head Approval', path: '/admin/head-approval', icon: <CheckCircleOutlined />, badge: true },
            { label: 'Team Requisitions', path: '/supervisor/purchase-requisitions', icon: <TeamOutlined />, badge: true },
            { label: 'PO Approvals', path: '/supervisor/po-approvals', icon: <ShoppingCartOutlined />, badge: true },
            { label: 'Clean Data / Migration', path: '/supply-chain/data-migration-validator', icon: <FilterOutlined /> },
            { label: 'Report Generation', path: '/admin/reports', icon: <FileTextOutlined /> }
          ],
          // ── CHANGE 5 (3/23): CEO purchase requisitions actions ──
          ceo: [
            { label: 'Requisitions Overview', path: '/admin/purchase-requisitions', icon: <EyeOutlined />,          primary: true },
            { label: 'Final Approvals',       path: '/supervisor/purchase-requisitions',         icon: <CrownOutlined />,        badge: true },
            { label: 'PO Approvals',          path: '/supervisor/po-approvals',     icon: <CheckCircleOutlined />,  badge: true },
            { label: 'Procurement Reports',   path: '/supply-chain/analytics',             icon: <BarChartOutlined /> },
          ]
        }
      },

      // ── 4. PROCUREMENT MANAGEMENT (buyer / admin / ceo) ───────────────────
      ...(user?.role === 'buyer' || user?.role === 'admin' || user?.role === 'ceo' ? [{
        key: 'buyer-procurement',
        title: 'Procurement Management',
        description: 'Comprehensive procurement: sourcing, quotes, purchase orders, debit notes & delivery tracking',
        icon: <SolutionOutlined style={{ fontSize: '48px', color: '#fa8c16' }} />,
        color: '#fff7e6',
        borderColor: '#fa8c16',
        stats: stats.quotes,
        managementRoles: ['buyer', 'admin', 'ceo'],
        actions: {
          buyer: [
            { label: 'Procurement Dashboard', path: '/buyer/dashboard', icon: <CrownOutlined />, primary: true },
            { label: 'Quote Evaluation', path: '/buyer/quotes', icon: <BarChartOutlined />, badge: true },
            { label: 'Debit Notes', path: '/buyer/debit-notes', icon: <AuditOutlined />, badge: stats.debitNotes?.pending > 0 },
            { label: 'Delivery Tracking', path: '/buyer/deliveries', icon: <CarOutlined /> },
            { label: 'Debit Note Approvals', path: '/supervisor/debit-note-approvals', icon: <CheckCircleOutlined />, badge: true },
            { label: 'Performance Analytics', path: '/buyer/analytics/performance', icon: <FundOutlined /> }
          ],
          admin: [
            { label: 'Buyer Performance', path: '/admin/buyer-analytics', icon: <BarChartOutlined />, primary: true },
            { label: 'Procurement Reports', path: '/admin/procurement-reports', icon: <FileTextOutlined /> },
            { label: 'Delivery Tracking', path: '/buyer/deliveries', icon: <CarOutlined /> },
            { label: 'Debit Note Approvals', path: '/supervisor/debit-note-approvals', icon: <AuditOutlined />, badge: true },
            { label: 'Buyer Management', path: '/admin/buyer-management', icon: <TeamOutlined /> }
          ],
          // ── CHANGE 5 (4/23): CEO procurement actions ──
          ceo: [
            { label: 'Procurement Overview', path: '/admin/analytics',                  icon: <EyeOutlined />,     primary: true },
            { label: 'Buyer Performance',    path: '/admin/buyer-analytics',             icon: <BarChartOutlined /> },
            { label: 'Delivery Tracking',    path: '/buyer/deliveries',                  icon: <CarOutlined /> },
            { label: 'Debit Note Overview',  path: '/supervisor/debit-note-approvals',   icon: <AuditOutlined />,   badge: true },
          ]
        }
      }] : []),

      // ── 5. SUPPLIER MANAGEMENT (buyer / finance / admin / supply_chain / ceo)
      ...(user?.role === 'buyer' || user?.role === 'finance' || user?.role === 'admin' || user?.role === 'supply_chain' || user?.role === 'ceo' ? [{
        key: 'supplier-management',
        title: 'Supplier Management',
        description: user?.role === 'finance'
          ? 'Complete supplier lifecycle: registration, approvals, contracts, invoices, and performance'
          : user?.role === 'supply_chain'
          ? 'Supplier approval workflow: Review and approve new supplier applications'
          : user?.role === 'admin' || user?.role === 'ceo'
          ? 'Supplier approvals and system administration'
          : 'View and manage supplier approvals',
        icon: <ContactsOutlined style={{ fontSize: '48px', color: '#eb2f96' }} />,
        color: '#fff0f6',
        borderColor: '#eb2f96',
        stats: {
          total: (stats.suppliers?.active || 0) + (stats.suppliers?.pending || 0),
          active: stats.suppliers?.active || 0,
          pending: stats.suppliers?.pending || 0,
          myPending: user?.role === 'supply_chain'
            ? stats.suppliers?.pending_supply_chain || 0
            : user?.role === 'finance'
            ? stats.suppliers?.pending_finance || 0
            : stats.suppliers?.pending || 0,
          contracts: stats.contracts?.total || 0
        },
        managementRoles: ['finance', 'admin', 'ceo'],
        actions: {
          finance: [
            { label: 'Supplier Approvals', path: '/finance/supplier-approvals', icon: <CheckCircleOutlined />, primary: true, badge: true },
            { label: 'Supplier Portal', path: '/finance/supplier-management', icon: <CrownOutlined /> },
            { label: 'Active Suppliers', path: '/finance/suppliers?status=active', icon: <ShopOutlined /> },
            { label: 'Pending Approval', path: '/finance/suppliers?status=pending', icon: <ClockCircleOutlined />, badge: true },
            { label: 'Contracts Management', path: '/finance/contracts', icon: <FileTextOutlined /> },
            { label: 'Performance Tracking', path: '/finance/supplier-performance', icon: <StarOutlined /> },
            { label: 'Bulk Import', path: '/finance/suppliers/bulk-import', icon: <UploadOutlined /> }
          ],
          supply_chain: [
            { label: 'My Approvals', path: '/supply-chain/supplier-approvals', icon: <CheckCircleOutlined />, primary: true, badge: true },
            { label: 'Pending Review', path: '/supply-chain/supplier-approvals/pending', icon: <ClockCircleOutlined />, badge: true },
            { label: 'Approval Statistics', path: '/supply-chain/supplier-approvals/statistics', icon: <BarChartOutlined /> }
          ],
          admin: [
            { label: 'Supplier Approvals', path: '/admin/supplier-approvals', icon: <CheckCircleOutlined />, primary: true, badge: true },
            { label: 'Admin Dashboard', path: '/admin/suppliers', icon: <SettingOutlined /> },
            { label: 'Supplier Database', path: '/admin/suppliers', icon: <DatabaseOutlined /> },
            { label: 'Approval Dashboard', path: '/admin/supplier-approvals/dashboard', icon: <DashboardOutlined /> },
            { label: 'System Analytics', path: '/admin/suppliers/analytics', icon: <BarChartOutlined /> }
          ],
          buyer: [
            { label: 'View Suppliers', path: '/buyer/suppliers', icon: <ShopOutlined />, primary: true },
            { label: 'Active Suppliers', path: '/buyer/suppliers?status=active', icon: <CheckCircleOutlined /> },
            { label: 'Supplier Performance', path: '/buyer/supplier-performance', icon: <StarOutlined /> }
          ],
          // ── CHANGE 5 (5/23): CEO supplier management actions ──
          ceo: [
            { label: 'Supplier Overview',    path: '/supply-chain/suppliers/reports',                   icon: <EyeOutlined />,     primary: true },
            { label: 'Approval Dashboard',   path: '/admin/supplier-approvals',          icon: <CrownOutlined />,   badge: true },
            { label: 'Performance Tracking', path: '/supply-chain/supplier-performance', icon: <StarOutlined /> },
            { label: 'Contract Analytics',   path: '/supply-chain/contracts',            icon: <FileTextOutlined /> },
          ]
        }
      }] : []),

      // ── 6. INVOICE MANAGEMENT ─────────────────────────────────────────────
      {
        key: 'invoices',
        title: 'Invoice & Debit Note Management',
        description: user?.role === 'supply_chain'
          ? 'Review and assign supplier invoices; manage debit notes and employee invoice approvals'
          : user?.role === 'buyer'
          ? 'Track invoices and manage debit notes for supplier disputes'
          : 'Upload, track, and approve invoice submissions; manage debit note adjustments',
        icon: <FileTextOutlined style={{ fontSize: '48px', color: '#1890ff' }} />,
        color: '#f0f8ff',
        borderColor: '#1890ff',
        stats: stats.invoices,
        managementRoles: ['finance', 'supply_chain', 'admin', 'ceo'],
        actions: {
          base: [
            { label: 'My Invoices', path: '/employee/invoices', icon: <UserOutlined /> }
          ],
          supervisor: [
            { label: 'Team Invoices', path: '/supervisor/invoice-approvals', icon: <TeamOutlined />, badge: true },
            { label: 'Debit Note Approvals', path: '/supervisor/debit-note-approvals', icon: <AuditOutlined />, badge: true }
          ],
          buyer: [
            { label: 'Team Invoices', path: '/supervisor/invoice-approvals', icon: <TeamOutlined />, badge: true },
            { label: 'Debit Notes', path: '/buyer/debit-notes', icon: <AuditOutlined />, badge: stats.debitNotes?.pending > 0 },
            { label: 'Debit Note Approvals', path: '/supervisor/debit-note-approvals', icon: <CheckCircleOutlined />, badge: true }
          ],
          supply_chain: [
            { label: 'Supplier Invoice Hub', path: '/supply-chain/supplier-invoices', icon: <CrownOutlined />, primary: true, badge: true },
            { label: 'Pending Assignment', path: '/supply-chain/supplier-invoices?status=pending', icon: <ClockCircleOutlined />, badge: true },
            { label: 'In Approval Chain', path: '/supply-chain/supplier-invoices?status=in_approval', icon: <CheckCircleOutlined /> },
            { label: 'Team Invoices', path: '/supervisor/invoice-approvals', icon: <TeamOutlined />, badge: true },
            { label: 'Debit Note Approvals', path: '/supervisor/debit-note-approvals', icon: <AuditOutlined />, badge: true }
          ],
          finance: [
            { label: 'Prepare Invoice', path: '/finance/prepare-invoice', icon: <PlusOutlined />, primary: true },
            { label: 'Invoice Dashboard', path: '/finance/invoice-management', icon: <CrownOutlined />, badge: true },
            { label: 'Final Approvals', path: '/finance/invoice-management?tab=pending_finance_approval', icon: <CheckCircleOutlined />, badge: true },
            { label: 'Team Invoices', path: '/supervisor/invoice-approvals', icon: <TeamOutlined />, badge: true },
            { label: 'Debit Note Approvals', path: '/supervisor/debit-note-approvals', icon: <AuditOutlined />, badge: true },
            { label: 'Payment Processing', path: '/finance/payments', icon: <DollarOutlined /> },
            { label: 'Invoice Analytics', path: '/finance/invoice-analytics', icon: <BarChartOutlined /> }
          ],
          hr: [
            { label: 'Team Invoices', path: '/supervisor/invoice-approvals', icon: <TeamOutlined />, badge: true },
            { label: 'Debit Note Approvals', path: '/supervisor/debit-note-approvals', icon: <AuditOutlined />, badge: true }
          ],
          it: [
            { label: 'Team Invoices', path: '/supervisor/invoice-approvals', icon: <TeamOutlined />, badge: true },
            { label: 'Debit Note Approvals', path: '/supervisor/debit-note-approvals', icon: <AuditOutlined />, badge: true }
          ],
          technical: [
            { label: 'Team Invoices', path: '/supervisor/invoice-approvals', icon: <TeamOutlined />, badge: true },
            { label: 'Debit Note Approvals', path: '/supervisor/debit-note-approvals', icon: <AuditOutlined />, badge: true }
          ],
          admin: [
            { label: 'Admin Dashboard', path: '/admin/invoice-management', icon: <SettingOutlined />, primary: true },
            { label: 'Debit Note Approvals', path: '/supervisor/debit-note-approvals', icon: <AuditOutlined />, badge: true },
            { label: 'Supply Chain View', path: '/supply-chain/supplier-invoices', icon: <ShopOutlined /> },
            { label: 'Finance View', path: '/finance/invoice-management', icon: <BankOutlined /> },
            { label: 'Team Invoices', path: '/supervisor/invoice-approvals', icon: <TeamOutlined />, badge: true }
          ],
          // ── CHANGE 5 (6/23): CEO invoice actions ──
          ceo: [
            { label: 'Invoice Overview',   path: '/finance/invoice-management',  icon: <EyeOutlined />,     primary: true },
            { label: 'Final Approvals',    path: '/admin/head-approval',        icon: <CrownOutlined />,   badge: true },
            { label: 'Invoice Analytics',  path: '/finance/invoice-management/reports', icon: <BarChartOutlined /> },
            { label: 'Payment Reports',    path: '/finance/reports',            icon: <DollarOutlined /> },
          ]
        }
      },

      // ── 7. BUDGET & ACCOUNTING (finance / admin / ceo) ────────────────────
      ...(user?.role === 'finance' || user?.role === 'admin' || user?.role === 'ceo' ? [{
        key: 'budget-management',
        title: 'Budget, Accounting & Finance',
        description: 'Budget oversight, disbursements, accounting center, scheduled reports, and financial analytics',
        icon: <BankOutlined style={{ fontSize: '48px', color: '#722ed1' }} />,
        color: '#f9f0ff',
        borderColor: '#722ed1',
        stats: stats.budgetCodes,
        managementRoles: ['finance', 'admin', 'ceo'],
        actions: {
          finance: [
            { label: 'Budget Dashboard', path: '/finance/budget-management', icon: <DashboardOutlined />, primary: true },
            { label: 'Accounting Center', path: '/finance/accounting', icon: <AccountBookOutlined /> },
            { label: 'Disbursements', path: '/finance/disbursements', icon: <DeliveredProcedureOutlined />, badge: stats.disbursements?.pending > 0 },
            { label: 'Pending Approvals', path: '/finance/budget-codes', icon: <ClockCircleOutlined />, badge: true },
            { label: 'Scheduled Reports', path: '/finance/scheduled-reports', icon: <ScheduleOutlined /> },
            { label: 'Budget Reports', path: '/finance/budget-reports', icon: <BarChartOutlined /> },
            { label: 'Budget Revisions', path: '/finance/budget-revisions', icon: <SwapOutlined />, badge: stats.budgetCodes.revisions > 0 },
            { label: 'Budget Transfers', path: '/finance/budget-transfers', icon: <SwapOutlined />, badge: stats.budgetCodes.transfers > 0 },
            { label: 'Financial Analytics', path: '/finance/budget-analytics', icon: <FundOutlined /> }
          ],
          admin: [
            { label: 'Admin View', path: '/admin/budget-codes', icon: <SettingOutlined />, primary: true },
            { label: 'Accounting Center', path: '/finance/accounting', icon: <AccountBookOutlined /> },
            { label: 'Disbursements', path: '/finance/disbursements', icon: <DeliveredProcedureOutlined />, badge: stats.disbursements?.pending > 0 },
            { label: 'Pending Approvals', path: '/finance/budget-codes', icon: <ClockCircleOutlined />, badge: true },
            { label: 'Scheduled Reports', path: '/finance/scheduled-reports', icon: <ScheduleOutlined /> },
            { label: 'Budget Analytics', path: '/admin/budget-codes/analytics', icon: <BarChartOutlined /> },
            { label: 'Configuration', path: '/admin/budget-code-config', icon: <SettingOutlined /> }
          ],
          // ── CHANGE 5 (7/23): CEO budget actions ──
          ceo: [
            { label: 'Budget Overview',    path: '/finance/budget-management',  icon: <EyeOutlined />,                  primary: true },
            { label: 'Budget Analytics',   path: '/finance/budget-analytics',   icon: <BarChartOutlined /> },
            { label: 'Accounting Center',  path: '/finance/accounting',         icon: <AccountBookOutlined /> },
            { label: 'Financial Reports',  path: '/finance/budget-reports',     icon: <FileTextOutlined /> },
            { label: 'Disbursements',      path: '/finance/disbursements',      icon: <DeliveredProcedureOutlined />,    badge: stats.disbursements?.pending > 0 },
          ]
        }
      }] : []),

      // ── 8. INCIDENT REPORTS ───────────────────────────────────────────────
      {
        key: 'incident-reports',
        title: 'Incident Reports',
        description: 'Report workplace incidents - managed by HSE Coordinator',
        icon: <ExclamationCircleOutlined style={{ fontSize: '48px', color: '#faad14' }} />,
        color: '#fffbf0',
        borderColor: '#faad14',
        stats: stats.incidentReports,
        managementRoles: ['hse', 'admin', 'ceo'],
        actions: {
          base: [
            { label: 'My Reports', path: '/employee/incident-reports', icon: <UserOutlined /> },
            { label: 'New Report', path: '/employee/incident-reports/new', icon: <ArrowRightOutlined /> }
          ],
          supervisor: [{ label: 'Department View', path: '/supervisor/incident-reports', icon: <TeamOutlined /> }],
          technical: [{ label: 'Department View', path: '/supervisor/incident-reports', icon: <TeamOutlined /> }],
          hse: [
            { label: 'HSE Dashboard', path: '/hse/incident-reports', icon: <CrownOutlined />, primary: true, badge: true },
            { label: 'New Reports', path: '/hse/incident-reports?status=submitted', icon: <FileTextOutlined />, badge: true },
            { label: 'Under Investigation', path: '/hse/incident-reports?status=under_investigation', icon: <SearchOutlined /> },
            { label: 'Analytics', path: '/hse/incident-analytics', icon: <BarChartOutlined /> }
          ],
          admin: [
            { label: 'Admin Dashboard', path: '/admin/incident-reports', icon: <SettingOutlined />, primary: true },
            { label: 'HSE View', path: '/hse/incident-reports', icon: <SafetyCertificateOutlined /> }
          ],
          // ── CHANGE 5 (8/23): CEO incident reports actions ──
          ceo: [
            { label: 'Incidents Overview', path: '/admin/incident-reports',   icon: <EyeOutlined />,                primary: true },
            { label: 'HSE Dashboard',      path: '/hse/incident-reports',     icon: <SafetyCertificateOutlined /> },
            { label: 'Analytics',          path: '/hse/incident-analytics',   icon: <BarChartOutlined /> },
          ]
        }
      },

      // ── 9. IT SUPPORT ─────────────────────────────────────────────────────
      {
        key: 'it-support',
        title: 'IT Support',
        description: 'Request IT materials and report device issues',
        icon: <LaptopOutlined style={{ fontSize: '48px', color: '#722ed1' }} />,
        color: '#f9f0ff',
        borderColor: '#722ed1',
        stats: stats.itSupport,
        managementRoles: ['it', 'admin', 'ceo'],
        actions: {
          base: [
            { label: 'My Requests', path: '/employee/it-support', icon: <UserOutlined /> },
            { label: 'Request Materials', path: '/employee/it-support/materials/new', icon: <ArrowRightOutlined /> },
            { label: 'Report Issue', path: '/employee/it-support/issues/new', icon: <ExclamationCircleOutlined /> }
          ],
          supervisor: [{ label: 'Team IT Requests', path: '/supervisor/it-support', icon: <TeamOutlined />, badge: true }],
          supply_chain: [{ label: 'Team IT Requests', path: '/supervisor/it-support', icon: <TeamOutlined />, badge: true }],
          technical: [{ label: 'Team IT Requests', path: '/supervisor/it-support', icon: <TeamOutlined />, badge: true }],
          hr: [{ label: 'Team IT Requests', path: '/supervisor/it-support', icon: <TeamOutlined />, badge: true }],
          it: [
            { label: 'IT Dashboard', path: '/it/support-requests', icon: <CrownOutlined />, primary: true, badge: true },
            { label: 'Team IT Requests', path: '/it/approvals', icon: <TeamOutlined />, badge: true },
            { label: 'Asset Management', path: '/it/asset-management', icon: <ToolOutlined /> },
            { label: 'Inventory Control', path: '/it/inventory', icon: <BarChartOutlined /> },
            { label: 'System Monitoring', path: '/it/system-monitoring', icon: <EyeOutlined /> },
            { label: 'User Management', path: '/it/user-accounts', icon: <UserOutlined /> },
            { label: 'Security Management', path: '/it/security', icon: <SafetyCertificateOutlined /> },
            { label: 'Network Management', path: '/it/network', icon: <LaptopOutlined /> }
          ],
          admin: [
            { label: 'Admin Dashboard', path: '/admin/it-support', icon: <SettingOutlined />, primary: true },
            { label: 'Team IT Requests', path: '/supervisor/it-support', icon: <TeamOutlined />, badge: true },
            { label: 'IT Budget', path: '/admin/it-budget', icon: <DollarOutlined /> }
          ],
          // ── CHANGE 5 (9/23): CEO IT support actions ──
          ceo: [
            { label: 'IT Overview',      path: '/it/support-requests',      icon: <EyeOutlined />,   primary: true },
            { label: 'IT Dashboard',     path: '/it/dashboard',           icon: <LaptopOutlined /> },
            { label: 'Asset Management', path: '/it/asset-management',    icon: <ToolOutlined /> },
          ]
        }
      },

      // ── 10. EMPLOYEE SUGGESTIONS ──────────────────────────────────────────
      {
        key: 'suggestions',
        title: 'Employee Suggestions',
        description: 'Submit anonymous suggestions and feedback',
        icon: <BulbOutlined style={{ fontSize: '48px', color: '#13c2c2' }} />,
        color: '#e6fffb',
        borderColor: '#13c2c2',
        stats: stats.suggestions,
        managementRoles: ['hr', 'admin', 'ceo'],
        actions: {
          base: [
            { label: 'My Suggestions', path: '/employee/suggestions', icon: <UserOutlined /> },
            { label: 'New Suggestion', path: '/employee/suggestions/new', icon: <ArrowRightOutlined /> }
          ],
          supervisor: [{ label: 'Team Feedback', path: '/supervisor/team-suggestions', icon: <TeamOutlined />, badge: true }],
          technical: [{ label: 'Team Feedback', path: '/supervisor/team-suggestions', icon: <TeamOutlined />, badge: true }],
          hr: [
            { label: 'HR Dashboard', path: '/hr/suggestions', icon: <CrownOutlined />, primary: true },
            { label: 'Team Feedback', path: '/supervisor/team-suggestions', icon: <TeamOutlined />, badge: true },
            { label: 'Feedback Analysis', path: '/hr/suggestions/analytics', icon: <BarChartOutlined /> },
            { label: 'Implementation Tracking', path: '/hr/suggestion-implementation', icon: <CheckCircleOutlined /> },
            { label: 'Employee Engagement', path: '/hr/employee-engagement', icon: <TeamOutlined /> },
            { label: 'Survey Management', path: '/hr/surveys', icon: <FileTextOutlined /> },
            { label: 'Recognition Programs', path: '/hr/recognition', icon: <CrownOutlined /> }
          ],
          admin: [
            { label: 'Admin Dashboard', path: '/admin/suggestions', icon: <SettingOutlined />, primary: true },
            { label: 'Team Feedback', path: '/supervisor/team-suggestions', icon: <TeamOutlined />, badge: true },
            { label: 'Strategic Planning', path: '/admin/strategic-suggestions', icon: <BulbOutlined /> }
          ],
          // ── CHANGE 5 (10/23): CEO suggestions actions ──
          ceo: [
            { label: 'Suggestions Overview', path: '/admin/suggestions',          icon: <EyeOutlined />,     primary: true },
            { label: 'Feedback Analytics',   path: '/hr/suggestions/analytics',  icon: <BarChartOutlined /> },
            { label: 'Engagement Report',    path: '/hr/employee-engagement',     icon: <TeamOutlined /> },
          ]
        }
      },

      // ── 11. LEAVE REQUESTS ────────────────────────────────────────────────
      {
        key: 'sick-leave',
        title: 'Leave Requests',
        description: 'Submit and track sick leave applications',
        icon: <MedicineBoxOutlined style={{ fontSize: '48px', color: '#f5222d' }} />,
        color: '#fff1f0',
        borderColor: '#f5222d',
        stats: stats.sickLeave,
        managementRoles: ['hr', 'supervisor', 'admin', 'ceo'],
        actions: {
          base: [
            { label: 'My Leave Requests', path: '/employee/leave', icon: <UserOutlined /> },
            { label: 'New Request', path: '/employee/leave/new', icon: <ArrowRightOutlined /> }
          ],
          supervisor: [
            { label: 'Team Leave Dashboard', path: '/supervisor/sick-leave', icon: <CrownOutlined />, primary: true, badge: true },
            { label: 'Approval Queue', path: '/supervisor/sick-leave/pending', icon: <ClockCircleOutlined /> },
            { label: 'Team Calendar', path: '/supervisor/team-calendar', icon: <TeamOutlined /> }
          ],
          technical: [
            { label: 'Team Leave Dashboard', path: '/supervisor/sick-leave', icon: <CrownOutlined />, primary: true, badge: true },
            { label: 'Approval Queue', path: '/supervisor/sick-leave/pending', icon: <ClockCircleOutlined /> },
            { label: 'Team Calendar', path: '/supervisor/team-calendar', icon: <TeamOutlined /> }
          ],
          hr: [
            { label: 'HR Dashboard', path: '/hr/sick-leave', icon: <CrownOutlined />, primary: true },
            { label: 'Team Leave', path: '/supervisor/sick-leave', icon: <TeamOutlined />, badge: true },
            { label: 'Leave Analytics', path: '/hr/sick-leave/analytics', icon: <BarChartOutlined /> },
            { label: 'Policy Management', path: '/hr/leave-policies', icon: <SafetyCertificateOutlined /> },
            { label: 'Medical Certificates', path: '/hr/medical-certificates', icon: <MedicineBoxOutlined /> },
            { label: 'Leave Balances', path: '/hr/leave-balances', icon: <CheckCircleOutlined /> },
            { label: 'Holiday Calendar', path: '/hr/holiday-calendar', icon: <TeamOutlined /> }
          ],
          admin: [
            { label: 'Admin Dashboard', path: '/admin/sick-leave', icon: <SettingOutlined />, primary: true },
            { label: 'Team Leave', path: '/supervisor/sick-leave', icon: <TeamOutlined />, badge: true },
            { label: 'Compliance Reports', path: '/admin/leave-compliance', icon: <FileTextOutlined /> }
          ],
          // ── CHANGE 5 (11/23): CEO leave actions ──
          ceo: [
            { label: 'Leave Overview',      path: '/admin/sick-leave',            icon: <EyeOutlined />,                primary: true },
            { label: 'HR Dashboard',        path: '/hr/sick-leave',               icon: <MedicineBoxOutlined /> },
            { label: 'Leave Analytics',     path: '/hr/sick-leave/analytics',     icon: <BarChartOutlined /> },
            { label: 'Compliance Reports',  path: '/admin/leave-compliance',      icon: <SafetyCertificateOutlined /> },
          ]
        }
      },

      // ── 12. ACTION ITEMS & TASKS ──────────────────────────────────────────
      {
        key: 'action-items',
        title: 'Action Items & Tasks',
        description: 'Track and manage your daily tasks and project action items with KPI integration',
        icon: <CheckCircleOutlined style={{ fontSize: '48px', color: '#722ed1' }} />,
        color: '#f9f0ff',
        borderColor: '#722ed1',
        stats: dashboardData.tasks,
        managementRoles: ['supply_chain', 'admin', 'finance', 'hr', 'it', 'supervisor', 'ceo'],
        actions: {
          base: [
            { label: 'My Tasks', path: '/employee/tasks', icon: <UserOutlined /> },
            { label: 'New Task', path: '/employee/tasks', icon: <PlusOutlined /> },
            { label: 'My KPIs', path: '/employee/kpis', icon: <TrophyOutlined /> },
            { label: 'Project Plans', path: '/employee/project-plans', icon: <ProjectOutlined /> }
          ],
          supply_chain: [
            { label: 'Task Management', path: '/supply-chain/action-items', icon: <CrownOutlined />, primary: true, badge: true },
            { label: 'Team Tasks', path: '/supply-chain/action-items?view=team', icon: <TeamOutlined /> },
            { label: 'Project Tasks', path: '/supply-chain/action-items?view=projects', icon: <ProjectOutlined /> }
          ],
          supervisor: [
            { label: 'Task Approvals', path: '/supervisor/action-items', icon: <CheckCircleOutlined />, primary: true, badge: true },
            { label: 'KPI Approvals', path: '/supervisor/kpi-approvals', icon: <TrophyOutlined /> },
            { label: 'Behavioral Evaluations', path: '/supervisor/behavioral-evaluations', icon: <UserOutlined /> },
            { label: 'Quarterly Evaluations', path: '/supervisor/quarterly-evaluations', icon: <BarChartOutlined /> }
          ],
          finance: [{ label: 'Team Action Items', path: '/supervisor/action-items', icon: <TeamOutlined />, badge: true }],
          hr: [
            { label: 'Task Approvals', path: '/supervisor/action-items', icon: <CheckCircleOutlined />, primary: true, badge: true },
            { label: 'KPI Approvals', path: '/supervisor/kpi-approvals', icon: <TrophyOutlined /> },
            { label: 'Behavioral Evaluations', path: '/supervisor/behavioral-evaluations', icon: <UserOutlined /> },
            { label: 'Quarterly Evaluations', path: '/supervisor/quarterly-evaluations', icon: <BarChartOutlined /> }
          ],
          technical: [
            { label: 'Task Approvals', path: '/supervisor/action-items', icon: <CheckCircleOutlined />, primary: true, badge: true },
            { label: 'KPI Approvals', path: '/supervisor/kpi-approvals', icon: <TrophyOutlined /> },
            { label: 'Behavioral Evaluations', path: '/supervisor/behavioral-evaluations', icon: <UserOutlined /> },
            { label: 'Quarterly Evaluations', path: '/supervisor/quarterly-evaluations', icon: <BarChartOutlined /> }
          ],
          it: [{ label: 'Team Action Items', path: '/supervisor/action-items', icon: <TeamOutlined />, badge: true }],
          admin: [
            { label: 'Admin Dashboard', path: '/admin/action-items', icon: <SettingOutlined />, primary: true },
            { label: 'Team Action Items', path: '/supervisor/action-items', icon: <TeamOutlined />, badge: true }
          ],
          // ── CHANGE 5 (12/23): CEO action items actions ──
          ceo: [
            { label: 'Tasks Overview',      path: '/admin/action-items',       icon: <EyeOutlined />,     primary: true },
            { label: 'KPI Overview',        path: '/supervisor/kpi-approvals', icon: <TrophyOutlined /> },
            { label: 'Performance Reports', path: '/admin/analytics',          icon: <BarChartOutlined /> },
          ]
        }
      },

      // ── 13. PROJECT PLAN APPROVALS ────────────────────────────────────────
      {
        key: 'project-plans',
        title: 'Project Plan Approvals',
        description: 'Submit and manage weekly project plans with 3-level approval workflow',
        icon: <ScheduleOutlined style={{ fontSize: '48px', color: '#13c2c2' }} />,
        color: '#e6fffb',
        borderColor: '#13c2c2',
        stats: { pending: 0, total: 0 },
        managementRoles: ['supervisor', 'supply_chain', 'admin', 'project', 'ceo'],
        actions: {
          base: [
            { label: 'My Project Plans', path: '/employee/project-plans', icon: <UserOutlined /> },
            { label: 'New Plan', path: '/employee/project-plans', icon: <PlusOutlined /> }
          ],
          supervisor: [
            { label: 'Plan Approvals', path: '/supervisor/project-plan-approvals', icon: <CheckCircleOutlined />, primary: true, badge: true },
            { label: 'My Plans', path: '/employee/project-plans', icon: <FileTextOutlined /> }
          ],
          project: [
            { label: 'Plan Approvals', path: '/supervisor/project-plan-approvals', icon: <CheckCircleOutlined />, primary: true, badge: true },
            { label: 'My Plans', path: '/employee/project-plans', icon: <FileTextOutlined /> }
          ],
          supply_chain: [
            { label: 'Plan Approvals', path: '/supervisor/project-plan-approvals', icon: <CheckCircleOutlined />, primary: true, badge: true },
            { label: 'My Plans', path: '/employee/project-plans', icon: <FileTextOutlined /> }
          ],
          finance: [{ label: 'My Plans', path: '/employee/project-plans', icon: <FileTextOutlined /> }],
          hr: [
            { label: 'Plan Approvals', path: '/supervisor/project-plan-approvals', icon: <CheckCircleOutlined />, primary: true, badge: true },
            { label: 'My Plans', path: '/employee/project-plans', icon: <FileTextOutlined /> }
          ],
          technical: [
            { label: 'Plan Approvals', path: '/supervisor/project-plan-approvals', icon: <CheckCircleOutlined />, primary: true, badge: true },
            { label: 'My Plans', path: '/employee/project-plans', icon: <FileTextOutlined /> }
          ],
          it: [{ label: 'My Plans', path: '/employee/project-plans', icon: <FileTextOutlined /> }],
          buyer: [
            { label: 'Plan Approvals', path: '/supervisor/project-plan-approvals', icon: <CheckCircleOutlined />, primary: true, badge: true },
            { label: 'My Plans', path: '/employee/project-plans', icon: <FileTextOutlined /> }
          ],
          admin: [
            { label: 'All Plan Approvals', path: '/supervisor/project-plan-approvals', icon: <SettingOutlined />, primary: true },
            { label: 'My Plans', path: '/employee/project-plans', icon: <FileTextOutlined /> }
          ],
          // ── CHANGE 5 (13/23): CEO project plan actions ──
          ceo: [
            { label: 'Plan Overview',      path: '/supervisor/project-plan-approvals', icon: <EyeOutlined />,     primary: true },
            { label: 'Project Analytics',  path: '/admin/projects/analytics',          icon: <BarChartOutlined /> },
          ]
        }
      },

      // ── 14. FILE SHARING PORTAL ───────────────────────────────────────────
      {
        key: 'sharepoint',
        title: 'File Sharing Portal',
        description: 'Upload, organise, and share files across departments and company-wide',
        icon: <ShareAltOutlined style={{ fontSize: '48px', color: '#667eea' }} />,
        color: '#f0ebff',
        borderColor: '#667eea',
        stats: stats.sharepoint,
        managementRoles: ['admin', 'supervisor', 'finance', 'hr', 'it', 'supply_chain', 'buyer', 'employee', 'ceo'],
        actions: {
          base: [
            { label: 'Browse Files', path: '/sharepoint/portal', icon: <FolderOutlined /> },
            { label: 'Upload Files', path: '/sharepoint/portal', icon: <UploadOutlined /> },
            { label: 'My Uploads', path: '/sharepoint/my-files', icon: <FileOutlined /> }
          ],
          admin: [
            { label: 'Admin Dashboard', path: '/sharepoint/admin', icon: <CrownOutlined />, primary: true },
            { label: 'Browse Files', path: '/sharepoint/portal', icon: <FolderOutlined /> },
            { label: 'Storage Stats', path: '/sharepoint/analytics', icon: <BarChartOutlined /> },
            { label: 'Activity Log', path: '/sharepoint/activity', icon: <HistoryOutlined /> }
          ],
          // ── CHANGE 5 (14/23): CEO file sharing actions ──
          ceo: [
            { label: 'File Portal',       path: '/sharepoint/portal',    icon: <FolderOutlined />,  primary: true },
            { label: 'Storage Analytics', path: '/sharepoint/analytics', icon: <BarChartOutlined /> },
            { label: 'Activity Log',      path: '/sharepoint/activity',  icon: <HistoryOutlined /> },
          ]
        }
      },

      // ── 15. COMMUNICATIONS (admin / hr / ceo) ─────────────────────────────
      ...(user?.role === 'admin' || user?.role === 'hr' || user?.role === 'ceo' ? [{
        key: 'communications',
        title: 'Communications Portal',
        description: 'Send company-wide announcements, policy updates, and messages to employees',
        icon: <NotificationOutlined style={{ fontSize: '48px', color: '#fa541c' }} />,
        color: '#fff2e8',
        borderColor: '#fa541c',
        stats: stats.communications,
        managementRoles: ['admin', 'hr', 'ceo'],
        actions: {
          admin: [
            { label: 'Communications Hub', path: '/admin/communications', icon: <CrownOutlined />, primary: true, badge: true },
            { label: 'New Message', path: '/admin/communications/new', icon: <PlusOutlined /> },
            { label: 'Scheduled Messages', path: '/admin/communications/scheduled', icon: <ClockCircleOutlined /> },
            { label: 'Message History', path: '/admin/communications/history', icon: <HistoryOutlined /> },
            { label: 'Analytics Dashboard', path: '/admin/communications/analytics', icon: <BarChartOutlined /> },
            { label: 'Message Templates', path: '/admin/communications/templates', icon: <FileTextOutlined /> }
          ],
          hr: [
            { label: 'Communications Hub', path: '/hr/communications', icon: <CrownOutlined />, primary: true, badge: true },
            { label: 'New Message', path: '/hr/communications/new', icon: <PlusOutlined /> },
            { label: 'Scheduled Messages', path: '/hr/communications/scheduled', icon: <ClockCircleOutlined /> },
            { label: 'Message History', path: '/hr/communications/history', icon: <HistoryOutlined /> },
            { label: 'Message Templates', path: '/hr/communications/templates', icon: <FileTextOutlined /> }
          ],
          // ── CHANGE 5 (15/23): CEO communications actions ──
          ceo: [
            { label: 'Communications Hub',  path: '/admin/communications',          icon: <EyeOutlined />,     primary: true },
            { label: 'Message History',     path: '/admin/communications/history',  icon: <HistoryOutlined /> },
            { label: 'Analytics',           path: '/admin/communications/analytics',icon: <BarChartOutlined /> },
          ]
        }
      }] : []),

      // ── 16. INVENTORY MANAGEMENT (supply_chain / admin / ceo) ─────────────
      ...(user?.role === 'supply_chain' || user?.role === 'admin' || user?.role === 'ceo' ? [{
        key: 'inventory-management',
        title: 'Inventory Management',
        description: 'Real-time stock tracking, inbound/outbound transactions, and warehouse management',
        icon: <DatabaseOutlined style={{ fontSize: '48px', color: '#13c2c2' }} />,
        color: '#e6fffb',
        borderColor: '#13c2c2',
        stats: stats.inventory,
        managementRoles: ['supply_chain', 'admin', 'ceo'],
        actions: {
          supply_chain: [
            { label: 'Inventory Dashboard', path: '/supply-chain/inventory', icon: <DashboardOutlined />, primary: true },
            { label: 'Available Stock', path: '/supply-chain/inventory?tab=overview', icon: <DatabaseOutlined /> },
            { label: 'Record Inbound', path: '/supply-chain/inventory/inbound', icon: <InboxOutlined /> },
            { label: 'Record Outbound', path: '/supply-chain/inventory/outbound', icon: <ShoppingOutlined /> },
            { label: 'Reorder Alerts', path: '/supply-chain/inventory?tab=alerts', icon: <WarningOutlined />, badge: true },
            { label: 'Stock Reports', path: '/supply-chain/inventory?tab=reports', icon: <BarChartOutlined /> },
            { label: 'Valuation Report', path: '/supply-chain/inventory/valuation', icon: <DollarOutlined /> }
          ],
          admin: [
            { label: 'Admin Dashboard', path: '/supply-chain/inventory', icon: <SettingOutlined />, primary: true },
            { label: 'Available Stock', path: '/supply-chain/inventory?tab=overview', icon: <DatabaseOutlined /> },
            { label: 'Stock Analytics', path: '/supply-chain/inventory?tab=reports', icon: <BarChartOutlined /> },
            { label: 'System Settings', path: '/admin/inventory-settings', icon: <SettingOutlined /> }
          ],
          // ── CHANGE 5 (16/23): CEO inventory actions ──
          ceo: [
            { label: 'Inventory Overview',  path: '/supply-chain/inventory',               icon: <EyeOutlined />,     primary: true },
            { label: 'Stock Analytics',     path: '/supply-chain/inventory/reports',   icon: <BarChartOutlined /> },
            { label: 'Valuation Report',    path: '/supply-chain/inventory/valuation',     icon: <DollarOutlined /> },
            { label: 'Reorder Alerts',      path: '/supply-chain/inventory?tab=alerts',    icon: <WarningOutlined />, badge: true },
          ]
        }
      }] : []),

      // ── 17. FIXED ASSET REGISTRY (supply_chain / admin / ceo) ─────────────
      ...(user?.role === 'supply_chain' || user?.role === 'admin' || user?.role === 'ceo' ? [{
        key: 'fixed-assets',
        title: 'Fixed Asset Registry',
        description: 'Asset tracking with barcode tags (0001-3000), depreciation, and lifecycle management',
        icon: <BarcodeOutlined style={{ fontSize: '48px', color: '#722ed1' }} />,
        color: '#f9f0ff',
        borderColor: '#722ed1',
        stats: stats.fixedAssets,
        managementRoles: ['supply_chain', 'admin', 'ceo'],
        actions: {
          supply_chain: [
            { label: 'Asset Registry', path: '/supply-chain/fixed-assets', icon: <BarcodeOutlined />, primary: true },
            { label: 'Register New Asset', path: '/supply-chain/fixed-assets/register', icon: <PlusOutlined /> },
            { label: 'Asset Dashboard', path: '/supply-chain/fixed-assets/dashboard', icon: <DashboardOutlined /> },
            { label: 'Assign Assets', path: '/supply-chain/fixed-assets?status=active', icon: <SwapOutlined /> },
            { label: 'Maintenance Schedule', path: '/supply-chain/fixed-assets?filter=maintenance', icon: <ToolOutlined /> },
            { label: 'Depreciation Reports', path: '/supply-chain/fixed-assets/reports/depreciation', icon: <BarChartOutlined /> },
            { label: 'Available Tags', path: '/supply-chain/fixed-assets/available-tags', icon: <BarcodeOutlined /> }
          ],
          admin: [
            { label: 'Admin Dashboard', path: '/supply-chain/fixed-assets', icon: <SettingOutlined />, primary: true },
            { label: 'Asset Registry', path: '/supply-chain/fixed-assets', icon: <BarcodeOutlined /> },
            { label: 'Asset Analytics', path: '/supply-chain/fixed-assets/analytics', icon: <BarChartOutlined /> },
            { label: 'Asset Configuration', path: '/admin/asset-settings', icon: <SettingOutlined /> }
          ],
          // ── CHANGE 5 (17/23): CEO fixed assets actions ──
          ceo: [
            { label: 'Asset Registry',        path: '/supply-chain/fixed-assets',                     icon: <EyeOutlined />,     primary: true },
            { label: 'Asset Analytics',       path: '/supply-chain/fixed-assets/analytics',           icon: <BarChartOutlined /> },
            { label: 'Depreciation Reports',  path: '/supply-chain/fixed-assets/reports/depreciation',icon: <FileTextOutlined /> },
          ]
        }
      }] : []),

      // ── 18. SUPPLIER PERFORMANCE (supply_chain / admin / ceo) ─────────────
      ...(user?.role === 'supply_chain' || user?.role === 'admin' || user?.role === 'ceo' ? [{
        key: 'supplier-performance',
        title: 'Supplier Performance',
        description: 'Evaluate and track supplier performance metrics, rankings, and quality ratings',
        icon: <StarOutlined style={{ fontSize: '48px', color: '#fa8c16' }} />,
        color: '#fff7e6',
        borderColor: '#fa8c16',
        stats: stats.supplierPerformance,
        managementRoles: ['supply_chain', 'admin', 'ceo'],
        actions: {
          supply_chain: [
            { label: 'Performance Dashboard', path: '/supply-chain/supplier-performance', icon: <StarOutlined />, primary: true },
            { label: 'Supplier Rankings', path: '/supply-chain/supplier-performance?tab=rankings', icon: <TrophyOutlined /> },
            { label: 'New Evaluation', path: '/supply-chain/supplier-performance/evaluate', icon: <PlusOutlined /> },
            { label: 'Evaluations', path: '/supply-chain/supplier-performance?tab=evaluations', icon: <FileTextOutlined /> },
            { label: 'Performance Analytics', path: '/supply-chain/supplier-performance/analytics', icon: <BarChartOutlined /> },
            { label: 'Incident Management', path: '/supply-chain/supplier-performance/incidents', icon: <WarningOutlined /> }
          ],
          admin: [
            { label: 'Admin Dashboard', path: '/supply-chain/supplier-performance', icon: <SettingOutlined />, primary: true },
            { label: 'Supplier Rankings', path: '/supply-chain/supplier-performance?tab=rankings', icon: <TrophyOutlined /> },
            { label: 'Performance Reports', path: '/supply-chain/supplier-performance/reports', icon: <BarChartOutlined /> },
            { label: 'System Settings', path: '/admin/supplier-settings', icon: <SettingOutlined /> }
          ],
          // ── CHANGE 5 (18/23): CEO supplier performance actions ──
          ceo: [
            { label: 'Performance Dashboard', path: '/supply-chain/supplier-performance',             icon: <EyeOutlined />,     primary: true },
            { label: 'Rankings',              path: '/supply-chain/supplier-performance?tab=rankings', icon: <TrophyOutlined /> },
            { label: 'Performance Analytics', path: '/supply-chain/supplier-performance/analytics',   icon: <BarChartOutlined /> },
          ]
        }
      }] : []),

      // ── 19. CUSTOMER & VENDOR MANAGEMENT (supply_chain / admin / finance / ceo)
      ...(user?.role === 'supply_chain' || user?.role === 'admin' || user?.role === 'finance' || user?.role === 'ceo' ? [{
        key: 'customer-vendor-management',
        title: 'Customer & Vendor Management',
        description: 'Manage suppliers and customers — onboarding, approvals, profiles, and business relationships',
        icon: <TeamOutlined style={{ fontSize: '48px', color: '#1890ff' }} />,
        color: '#e6f7ff',
        borderColor: '#1890ff',
        stats: {
          suppliers: stats.suppliers?.total || 0,
          customers: stats.customers?.total || 0,
          pending: (stats.suppliers?.pending || 0) + (stats.customers?.pending || 0)
        },
        managementRoles: ['supply_chain', 'admin', 'finance', 'ceo'],
        actions: {
          supply_chain: [
            { label: 'Supplier & Customer Portal', path: '/supply-chain/customer-vendor-management', icon: <TeamOutlined />, primary: true },
            { label: 'Add Customer', path: '/supply-chain/customer-vendor-management?tab=customers&action=add', icon: <UserOutlined /> },
            { label: 'Add Supplier', path: '/supply-chain/supplier-management?action=add', icon: <ShopOutlined /> },
            { label: 'Pending Approvals', path: '/supply-chain/customer-vendor-management?filter=pending', icon: <ClockCircleOutlined />, badge: true },
            { label: 'Active Suppliers', path: '/supply-chain/customer-vendor-management?tab=suppliers&filter=approved', icon: <CheckCircleOutlined /> },
            { label: 'Active Customers', path: '/supply-chain/customer-vendor-management?tab=customers&filter=active', icon: <CheckCircleOutlined /> }
          ],
          finance: [
            { label: 'Customer & Vendor Portal', path: '/supply-chain/customer-vendor-management', icon: <TeamOutlined />, primary: true },
            { label: 'Customer Approvals', path: '/supply-chain/customer-vendor-management?tab=customers&filter=pending', icon: <CheckCircleOutlined />, badge: true },
            { label: 'Supplier Approvals', path: '/supply-chain/customer-vendor-management?tab=suppliers&filter=pending', icon: <CheckCircleOutlined />, badge: true },
            { label: 'Upload Customer PO', path: '/supply-chain/customer-vendor-management?tab=customers', icon: <UploadOutlined /> },
            { label: 'Active Customers', path: '/supply-chain/customer-vendor-management?tab=customers&filter=active', icon: <UserOutlined /> },
            { label: 'Active Suppliers', path: '/supply-chain/customer-vendor-management?tab=suppliers&filter=approved', icon: <ShopOutlined /> }
          ],
          admin: [
            { label: 'Admin Portal', path: '/supply-chain/customer-vendor-management', icon: <SettingOutlined />, primary: true },
            { label: 'Supplier Management', path: '/supply-chain/customer-vendor-management?tab=suppliers', icon: <ShopOutlined /> },
            { label: 'Customer Management', path: '/supply-chain/customer-vendor-management?tab=customers', icon: <UserOutlined /> },
            { label: 'System Analytics', path: '/supply-chain/customer-vendor-analytics', icon: <BarChartOutlined /> }
          ],
          // ── CHANGE 5 (19/23): CEO customer & vendor actions ──
          ceo: [
            { label: 'Vendor Portal',     path: '/supply-chain/customer-vendor-management',  icon: <EyeOutlined />,     primary: true },
            { label: 'System Analytics',  path: '/supply-chain/customer-vendor-analytics',   icon: <BarChartOutlined /> },
          ]
        }
      }] : []),

      // ── 20. SALARY PAYMENT PROCESSING (finance / admin / ceo) ─────────────
      ...(user?.role === 'finance' || user?.role === 'admin' || user?.role === 'ceo' ? [{
        key: 'salary-payments',
        title: 'Salary Payment Processing',
        description: 'Process bulk salary payments by department with budget code allocation and real-time validation',
        icon: <WalletOutlined style={{ fontSize: '48px', color: '#13c2c2' }} />,
        color: '#e6fffb',
        borderColor: '#13c2c2',
        stats: stats.salaryPayments || { currentMonth: 0, yearToDate: 0, totalProcessed: 0, lastPaymentDate: null },
        managementRoles: ['finance', 'admin', 'ceo'],
        actions: {
          finance: [
            { label: 'Process Payment', path: '/finance/salary-payments/new', icon: <PlusOutlined />, primary: true },
            { label: 'Payment History', path: '/finance/salary-payments', icon: <HistoryOutlined /> },
            { label: 'Monthly Summary', path: '/finance/salary-payments?filter=current-month', icon: <CalendarOutlined /> },
            { label: 'Budget Overview', path: '/finance/budget-management', icon: <BankOutlined /> },
            { label: 'Annual Report', path: '/finance/salary-payments?filter=current-year', icon: <BarChartOutlined /> }
          ],
          admin: [
            { label: 'Admin View', path: '/admin/salary-payments', icon: <SettingOutlined />, primary: true },
            { label: 'Payment History', path: '/finance/salary-payments', icon: <HistoryOutlined /> },
            { label: 'Budget Analytics', path: '/admin/salary-analytics', icon: <BarChartOutlined /> }
          ],
          // ── CHANGE 5 (20/23): CEO salary actions ──
          ceo: [
            { label: 'Payroll Overview',  path: '/finance/salary-payments',                           icon: <EyeOutlined />,     primary: true },
            { label: 'Monthly Summary',   path: '/finance/salary-payments?filter=current-month',      icon: <CalendarOutlined /> },
            { label: 'Annual Report',     path: '/finance/salary-payments/reports',       icon: <BarChartOutlined /> },
          ]
        }
      }] : []),

      // ── 21. DATA MIGRATION (supply_chain / admin / ceo) ───────────────────
      ...(user?.role === 'supply_chain' || user?.role === 'admin' || user?.role === 'ceo' ? [{
        key: 'data-migration',
        title: 'Data Migration',
        description: 'Import historical data from Excel spreadsheets (Available Stock, Inbound, Outbound, Suppliers)',
        icon: <UploadOutlined style={{ fontSize: '48px', color: '#eb2f96' }} />,
        color: '#fff0f6',
        borderColor: '#eb2f96',
        stats: stats.dataMigration,
        managementRoles: ['supply_chain', 'admin', 'ceo'],
        actions: {
          supply_chain: [
            { label: 'Migration Tool', path: '/supply-chain/data-migration', icon: <UploadOutlined />, primary: true },
            { label: 'Download Templates', path: '/supply-chain/data-migration?step=templates', icon: <DownloadOutlined /> },
            { label: 'Validate Data', path: '/supply-chain/data-migration-validator', icon: <FilterOutlined /> },
            { label: 'Migration History', path: '/supply-chain/data-migration/history', icon: <HistoryOutlined /> },
            { label: 'Validation Reports', path: '/supply-chain/data-migration/validation', icon: <CheckCircleOutlined /> }
          ],
          admin: [
            { label: 'Admin Migration', path: '/supply-chain/data-migration', icon: <SettingOutlined />, primary: true },
            { label: 'Validate Data', path: '/supply-chain/data-migration-validator', icon: <FilterOutlined /> },
            { label: 'Migration History', path: '/supply-chain/data-migration/history', icon: <HistoryOutlined /> },
            { label: 'System Backup', path: '/admin/backup', icon: <DatabaseOutlined /> }
          ],
          // ── CHANGE 5 (21/23): CEO data migration actions ──
          ceo: [
            { label: 'Migration History',    path: '/supply-chain/data-migration/history',    icon: <HistoryOutlined />,     primary: true },
            { label: 'Validation Reports',   path: '/supply-chain/data-migration/validation', icon: <CheckCircleOutlined /> },
          ]
        }
      }] : []),

      // ── 22. HR MANAGEMENT (hr / ceo) ──────────────────────────────────────
      ...(user?.role === 'hr' || user?.role === 'ceo' ? [{
        key: 'hr-portal',
        title: 'HR Management',
        description: 'Manage employees, contracts, documents, and HR operations',
        icon: <TeamOutlined style={{ fontSize: '48px', color: '#52c41a' }} />,
        color: '#f6ffed',
        borderColor: '#52c41a',
        stats: stats.hrManagement || { totalEmployees: 0, activeEmployees: 0, onProbation: 0, contractsExpiring: 0, onLeave: 0, pendingDocuments: 0 },
        managementRoles: ['hr', 'admin', 'ceo'],
        actions: {
          hr: [
            { label: 'HR Dashboard', path: '/hr/dashboard', icon: <DashboardOutlined />, primary: true },
            { label: 'All Employees', path: '/hr/employees', icon: <TeamOutlined /> },
            { label: 'Add Employee', path: '/hr/employees/new', icon: <PlusOutlined /> },
            { label: 'Contract Management', path: '/hr/contracts', icon: <FileTextOutlined />, badge: true },
            { label: 'Document Center', path: '/hr/documents', icon: <FolderOutlined /> },
            { label: 'Leave Management', path: '/hr/sick-leave', icon: <CalendarOutlined /> },
            { label: 'Reports & Analytics', path: '/hr/reports', icon: <BarChartOutlined /> }
          ],
          // ── CHANGE 5 (22/23): CEO HR management actions ──
          ceo: [
            { label: 'HR Dashboard',       path: '/hr/dashboard',   icon: <EyeOutlined />,     primary: true },
            { label: 'Employee Overview',  path: '/hr/employees',   icon: <TeamOutlined /> },
            { label: 'HR Analytics',       path: '/hr/reports',     icon: <BarChartOutlined /> },
            { label: 'Contract Overview',  path: '/hr/contracts',   icon: <FileTextOutlined /> },
          ]
        }
      }] : []),

      // // ── 23. LEGAL & COMPLIANCE (legal / admin / finance / ceo) ───────────
      // ...(['legal', 'admin', 'finance', 'ceo'].includes(user?.role) ? [{
      //   key: 'legal-compliance',
      //   title: 'Legal & Compliance',
      //   description: 'Supplier due diligence, contract compliance, regulatory tracking, and legal risk management',
      //   icon: <SafetyCertificateOutlined style={{ fontSize: '48px', color: '#52c41a' }} />,
      //   color: '#f6ffed',
      //   borderColor: '#52c41a',
      //   stats: { pending: 0, total: 0 },
      //   managementRoles: ['legal', 'admin', 'finance', 'ceo'],
      //   actions: {
      //     legal: [
      //       { label: 'Legal Dashboard',      path: '/legal/dashboard',   icon: <DashboardOutlined />, primary: true },
      //       { label: 'Due Diligence (SDD)',   path: '/legal/sdd',         icon: <AuditOutlined />,     badge: true },
      //       { label: 'Contract Compliance',  path: '/legal/contracts',   icon: <FileTextOutlined />,  badge: true },
      //       { label: 'Regulatory Tracker',   path: '/legal/regulatory',  icon: <SafetyCertificateOutlined /> },
      //       { label: 'Risk Register',        path: '/legal/risks',       icon: <WarningOutlined /> },
      //       { label: 'Legal Analytics',      path: '/legal/analytics',   icon: <BarChartOutlined /> }
      //     ],
      //     finance: [
      //       { label: 'Legal Overview',       path: '/legal/dashboard',   icon: <DashboardOutlined />, primary: true },
      //       { label: 'SDD Records',          path: '/legal/sdd',         icon: <AuditOutlined /> },
      //       { label: 'Contract Compliance',  path: '/legal/contracts',   icon: <FileTextOutlined /> }
      //     ],
      //     admin: [
      //       { label: 'Admin Legal Dashboard', path: '/legal/dashboard',  icon: <SettingOutlined />,   primary: true },
      //       { label: 'Due Diligence (SDD)',   path: '/legal/sdd',        icon: <AuditOutlined />,     badge: true },
      //       { label: 'Contract Compliance',  path: '/legal/contracts',   icon: <FileTextOutlined />,  badge: true },
      //       { label: 'Regulatory Tracker',   path: '/legal/regulatory',  icon: <SafetyCertificateOutlined /> },
      //       { label: 'Risk Register',        path: '/legal/risks',       icon: <WarningOutlined /> },
      //       { label: 'Legal Analytics',      path: '/legal/analytics',   icon: <BarChartOutlined /> },
      //       { label: 'User Role Management', path: '/admin/legal-roles', icon: <TeamOutlined /> }
      //     ],
      //     // ── CHANGE 5 (23/23): CEO legal & compliance actions ──
      //     ceo: [
      //       { label: 'Legal Dashboard',      path: '/legal/dashboard',   icon: <EyeOutlined />,       primary: true },
      //       { label: 'Due Diligence (SDD)',  path: '/legal/sdd',         icon: <AuditOutlined /> },
      //       { label: 'Contract Compliance',  path: '/legal/contracts',   icon: <FileTextOutlined /> },
      //       { label: 'Risk Register',        path: '/legal/risks',       icon: <WarningOutlined /> },
      //       { label: 'Legal Analytics',      path: '/legal/analytics',   icon: <BarChartOutlined /> },
      //     ]
      //   }
      // }] : []),
    ];

    // ── RENDER ────────────────────────────────────────────────────────────────
    return modules.map(module => {
      const hasManagementAccess = module.managementRoles.includes(user?.role);

      const availableActions = [];
      // CEO gets ONLY ceo actions — no base employee actions mixed in
      if (user?.role === 'ceo') {
        if (module.actions.ceo) {
          availableActions.push(...module.actions.ceo);
        }
      } else {
        availableActions.push(...(module.actions.base || []));
        if (module.actions[user?.role]) {
          availableActions.push(...module.actions[user?.role]);
        }
      }

      const seen = new Set();
      const deduped = availableActions.filter(a => {
        if (seen.has(a.path)) return false;
        seen.add(a.path);
        return true;
      });

      const finalActions = deduped.filter(a => a.label !== 'Purchase Orders');

      const visibleActions = finalActions.slice(0, 3);
      const expandableActions = finalActions.slice(3);
      const isExpanded = expandedCards[module.key];

      const renderActionButton = (action, index, isExpandable = false) => {
        const isPrimary = action.primary || (hasManagementAccess && !isExpandable && index === 0 && !module.actions.base?.length);
        const showBadge = action.badge && (() => {
          if (user?.role === 'buyer' && module.key === 'purchase-requisitions') return (module.stats.pending || 0) + (module.stats.inProgress || 0) > 0;
          if (module.key === 'inventory-management') return module.stats.lowStock > 0;
          if (module.key === 'fixed-assets') return module.stats.overdueInspections > 0;
          if (module.key === 'action-items') return dashboardData.pendingApprovals.length > 0;
          if (action.label === 'Debit Notes' || action.label === 'Debit Note Approvals') return stats.debitNotes?.pending > 0;
          if (action.label === 'Disbursements') return stats.disbursements?.pending > 0;
          return (module.stats.pending || 0) > 0;
        })();

        const badgeCount = (() => {
          if (action.label === 'Debit Notes' || action.label === 'Debit Note Approvals') return stats.debitNotes?.pending || 0;
          if (action.label === 'Disbursements') return stats.disbursements?.pending || 0;
          if (user?.role === 'buyer' && module.key === 'purchase-requisitions') return (module.stats.pending || 0) + (module.stats.inProgress || 0);
          if (module.key === 'inventory-management') return module.stats.lowStock || 0;
          if (module.key === 'fixed-assets') return module.stats.overdueInspections || 0;
          if (module.key === 'action-items') return dashboardData.pendingApprovals.length;
          return module.stats.pending || 0;
        })();

        return (
          <Button
            key={`${isExpandable ? 'exp-' : ''}${index}`}
            type={isPrimary ? 'primary' : 'default'}
            block
            icon={action.icon || <ArrowRightOutlined />}
            onClick={() => navigate(action.path)}
            style={{
              fontSize: '12px',
              ...(isPrimary && { backgroundColor: module.borderColor, borderColor: module.borderColor }),
              ...(isExpandable && { opacity: 0.9 })
            }}
          >
            {action.label}
            {showBadge && (
              <Badge count={badgeCount} style={{ marginLeft: '8px' }} size="small" />
            )}
          </Button>
        );
      };

      return (
        <Col xs={24} sm={24} md={12} lg={8} xl={8} key={module.key}>
          <Card
            hoverable
            style={{ height: '100%', backgroundColor: module.color, border: `2px solid ${module.borderColor}`, borderRadius: '12px', position: 'relative' }}
            bodyStyle={{ padding: '24px' }}
          >
            {hasManagementAccess && (
              <div style={{ position: 'absolute', top: '12px', right: '12px', zIndex: 1 }}>
                <Tooltip title="You have management access to this module">
                  <Badge count={<CrownOutlined style={{ color: '#faad14' }} />} style={{ backgroundColor: 'transparent' }} />
                </Tooltip>
              </div>
            )}

            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              {module.icon}
              <Title level={4} style={{ margin: '16px 0 8px 0', color: '#333' }}>
                {module.title}
                {hasManagementAccess && <Tag color="gold" style={{ marginLeft: '8px', fontSize: '10px' }}>MANAGER</Tag>}
              </Title>
              <Paragraph type="secondary" style={{ margin: 0, fontSize: '12px' }}>
                {module.description}
              </Paragraph>
            </div>

            <Divider />

            {module.key === 'action-items' ? (
              <Row gutter={[8, 8]} style={{ marginBottom: '20px' }}>
                <Col span={12}><Statistic title="Total" value={module.stats.total} prefix={<CheckCircleOutlined />} valueStyle={{ color: '#1890ff', fontSize: '16px' }} /></Col>
                <Col span={12}><Statistic title="In Progress" value={module.stats.inProgress || 0} prefix={<PlayCircleOutlined />} valueStyle={{ color: '#faad14', fontSize: '16px' }} /></Col>
                <Col span={24}><Statistic title="Completed" value={module.stats.completed || 0} prefix={<CheckCircleOutlined />} valueStyle={{ color: '#52c41a', fontSize: '16px' }} /></Col>
              </Row>
            ) : module.key === 'inventory-management' ? (
              <Row gutter={[8, 8]} style={{ marginBottom: '20px' }}>
                <Col span={12}><Statistic title="Total Items" value={module.stats.totalItems} prefix={<DatabaseOutlined />} valueStyle={{ color: '#1890ff', fontSize: '16px' }} /></Col>
                <Col span={12}><Statistic title="Low Stock" value={module.stats.lowStock} prefix={<WarningOutlined />} valueStyle={{ color: '#faad14', fontSize: '16px' }} /></Col>
                <Col span={12}><Statistic title="Out of Stock" value={module.stats.outOfStock} prefix={<CloseCircleOutlined />} valueStyle={{ color: '#f5222d', fontSize: '16px' }} /></Col>
                <Col span={12}><Statistic title="Stock Value" value={Math.round(module.stats.totalValue / 1000)} suffix="K" prefix={<DollarOutlined />} valueStyle={{ color: '#52c41a', fontSize: '16px' }} precision={0} /></Col>
              </Row>
            ) : module.key === 'fixed-assets' ? (
              <Row gutter={[8, 8]} style={{ marginBottom: '20px' }}>
                <Col span={12}><Statistic title="Total Assets" value={module.stats.totalAssets} prefix={<BarcodeOutlined />} valueStyle={{ color: '#1890ff', fontSize: '16px' }} /></Col>
                <Col span={12}><Statistic title="In Use" value={module.stats.inUse} prefix={<CheckCircleOutlined />} valueStyle={{ color: '#52c41a', fontSize: '16px' }} /></Col>
                <Col span={12}><Statistic title="Overdue" value={module.stats.overdueInspections} prefix={<WarningOutlined />} valueStyle={{ color: '#faad14', fontSize: '16px' }} /></Col>
                <Col span={12}><Statistic title="Total Value" value={Math.round(module.stats.totalValue / 1000)} suffix="K" prefix={<DollarOutlined />} valueStyle={{ color: '#722ed1', fontSize: '16px' }} precision={0} /></Col>
              </Row>
            ) : module.key === 'supplier-performance' ? (
              <Row gutter={[8, 8]} style={{ marginBottom: '20px' }}>
                <Col span={12}><Statistic title="Total Suppliers" value={module.stats.totalSuppliers} prefix={<TeamOutlined />} valueStyle={{ color: '#1890ff', fontSize: '16px' }} /></Col>
                <Col span={12}><Statistic title="Top Performers" value={module.stats.topPerformers} prefix={<TrophyOutlined />} valueStyle={{ color: '#52c41a', fontSize: '16px' }} /></Col>
                <Col span={24}><Statistic title="Average Score" value={module.stats.averageScore} suffix="%" prefix={<StarOutlined />} valueStyle={{ color: '#fa8c16', fontSize: '16px' }} precision={1} /></Col>
              </Row>
            ) : module.key === 'data-migration' ? (
              <Row gutter={[8, 8]} style={{ marginBottom: '20px' }}>
                <Col span={12}><Statistic title="Completed" value={module.stats.completed} prefix={<CheckCircleOutlined />} valueStyle={{ color: '#52c41a', fontSize: '16px' }} /></Col>
                <Col span={12}><Statistic title="Pending" value={module.stats.pending} prefix={<ClockCircleOutlined />} valueStyle={{ color: '#faad14', fontSize: '16px' }} /></Col>
              </Row>
            ) : user?.role === 'buyer' && module.key === 'purchase-requisitions' ? (
              <Row gutter={[8, 8]} style={{ marginBottom: '20px' }}>
                <Col span={12}><Statistic title="Pending" value={module.stats.pending} prefix={<ClockCircleOutlined />} valueStyle={{ color: '#faad14', fontSize: '16px' }} /></Col>
                <Col span={12}><Statistic title="In Progress" value={module.stats.inProgress} prefix={<ShoppingCartOutlined />} valueStyle={{ color: '#1890ff', fontSize: '16px' }} /></Col>
                <Col span={12}><Statistic title="Quoted" value={module.stats.quotesReceived} prefix={<FileTextOutlined />} valueStyle={{ color: '#722ed1', fontSize: '16px' }} /></Col>
                <Col span={12}><Statistic title="Completed" value={module.stats.completed} prefix={<CheckCircleOutlined />} valueStyle={{ color: '#52c41a', fontSize: '16px' }} /></Col>
              </Row>
            ) : module.key === 'project-management' ? (
              <Row gutter={[8, 8]} style={{ marginBottom: '20px' }}>
                <Col span={12}><Statistic title="Pending" value={module.stats.pending} prefix={<ClockCircleOutlined />} valueStyle={{ color: '#faad14', fontSize: '16px' }} /></Col>
                <Col span={12}><Statistic title="In Progress" value={module.stats.inProgress} prefix={<PlayCircleOutlined />} valueStyle={{ color: '#1890ff', fontSize: '16px' }} /></Col>
                <Col span={12}><Statistic title="Completed" value={module.stats.completed} prefix={<CheckCircleOutlined />} valueStyle={{ color: '#52c41a', fontSize: '16px' }} /></Col>
                <Col span={12}><Statistic title="Total" value={module.stats.total} prefix={<ProjectOutlined />} valueStyle={{ color: '#722ed1', fontSize: '16px' }} /></Col>
              </Row>
            ) : module.key === 'budget-management' ? (
              <Row gutter={[8, 8]} style={{ marginBottom: '20px' }}>
                <Col span={12}><Statistic title="Pending Approvals" value={module.stats.pending} prefix={<ClockCircleOutlined />} valueStyle={{ color: '#faad14', fontSize: '16px' }} /></Col>
                <Col span={12}><Statistic title="Active Codes" value={module.stats.total} prefix={<BankOutlined />} valueStyle={{ color: '#1890ff', fontSize: '16px' }} /></Col>
                <Col span={12}><Statistic title="Revisions" value={module.stats.revisions} prefix={<SwapOutlined />} valueStyle={{ color: '#722ed1', fontSize: '16px' }} /></Col>
                <Col span={12}><Statistic title="Transfers" value={module.stats.transfers} prefix={<SwapOutlined />} valueStyle={{ color: '#13c2c2', fontSize: '16px' }} /></Col>
              </Row>
            ) : (
              <Row gutter={[16, 16]} style={{ marginBottom: '20px' }}>
                <Col span={12}><Statistic title="Pending" value={module.stats.pending || 0} prefix={<ClockCircleOutlined />} valueStyle={{ color: '#faad14', fontSize: '18px' }} /></Col>
                <Col span={12}><Statistic title="Total" value={module.stats.total || 0} prefix={<BarChartOutlined />} valueStyle={{ color: '#1890ff', fontSize: '18px' }} /></Col>
              </Row>
            )}

            <Space direction="vertical" style={{ width: '100%' }} size="small">
              {visibleActions.map((action, index) => renderActionButton(action, index))}

              {expandableActions.length > 0 && (
                <Collapse
                  ghost
                  activeKey={isExpanded ? ['1'] : []}
                  onChange={() => toggleCardExpansion(module.key)}
                  style={{ backgroundColor: 'transparent', border: 'none' }}
                  items={[{
                    key: '1',
                    label: (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: '#666', padding: '4px 0' }}>
                        <span style={{ marginRight: '8px' }}>{expandableActions.length} more option{expandableActions.length !== 1 ? 's' : ''}</span>
                        {isExpanded ? <UpOutlined /> : <DownOutlined />}
                      </div>
                    ),
                    children: (
                      <Space direction="vertical" style={{ width: '100%' }} size="small">
                        {expandableActions.map((action, index) => renderActionButton(action, index, true))}
                      </Space>
                    ),
                    showArrow: false
                  }]}
                />
              )}
            </Space>
          </Card>
        </Col>
      );
    });
  };

  // ── CHANGE 1 of 5: getRoleInfo with CEO entry ──────────────────────────────
  const getRoleInfo = () => {
    const roleConfig = {
      employee: { title: 'Employee Dashboard', description: 'Access all services and submit requests', icon: <UserOutlined />, color: '#1890ff' },
      supervisor: { title: 'Supervisor Dashboard', description: 'All services + team management, milestone oversight, and task/KPI approvals', icon: <TeamOutlined />, color: '#52c41a' },
      finance: { title: 'Finance Dashboard', description: 'All services + financial management and team oversight', icon: <BankOutlined />, color: '#722ed1' },
      hr: { title: 'HR Dashboard', description: 'All services + HR management and team employee relations', icon: <SafetyCertificateOutlined />, color: '#13c2c2' },
      it: { title: 'IT Dashboard', description: 'All services + IT infrastructure and team support management', icon: <ToolOutlined />, color: '#722ed1' },
      supply_chain: { title: 'Supply Chain Dashboard', description: 'All services + project management, procurement, inventory, assets and team vendor management', icon: <ShoppingCartOutlined />, color: '#fa8c16' },
      buyer: { title: 'Buyer Dashboard', description: 'All services + specialized procurement workflow management', icon: <SolutionOutlined />, color: '#eb2f96' },
      // ── CEO entry BEFORE admin ──
      ceo: {
        title: 'CEO Executive Dashboard',
        description: 'Company-wide oversight — full read access to all modules, final approval authority on every request',
        icon: <CrownOutlined />,
        color: '#faad14'
      },
      admin: { title: 'Administrator Dashboard', description: 'Full system access and comprehensive team management', icon: <SettingOutlined />, color: '#fa541c' }
    };
    return roleConfig[user?.role] || roleConfig.employee;
  };

  const roleInfo = getRoleInfo();
  const userCapabilities = getRoleCapabilities(user?.role);

  const getTotalPending = () => {
    // Only sum the specific pending fields we care about — never double-count
    const base =
      (stats.cashRequests?.pending || 0) +
      (stats.invoices?.pending || 0) +
      (stats.incidentReports?.pending || 0) +
      (stats.itSupport?.pending || 0) +
      (stats.suggestions?.pending || 0) +
      (stats.sickLeave?.pending || 0) +
      (stats.purchaseRequisitions?.pending || 0) +
      (stats.actionItems?.pending || 0) +
      (stats.sharepoint?.pending || 0) +
      (stats.communications?.pending || 0) +
      (stats.budgetCodes?.pending || 0) +
      (stats.debitNotes?.pending || 0) +
      (stats.disbursements?.pending || 0);

    if (user?.role === 'buyer') {
      return (
        (stats.buyerRequisitions?.pending || 0) +
        (stats.buyerRequisitions?.inProgress || 0) +
        (stats.quotes?.pending || 0) +
        (stats.debitNotes?.pending || 0) +
        (stats.itSupport?.pending || 0) +
        (stats.sickLeave?.pending || 0) +
        (stats.suggestions?.pending || 0) +
        (stats.incidentReports?.pending || 0) +
        (stats.cashRequests?.pending || 0)
      );
    }

    if (user?.role === 'supply_chain') {
      return (
        base +
        (stats.inventory?.lowStock || 0) +
        (stats.fixedAssets?.overdueInspections || 0) +
        (stats.suppliers?.pending_supply_chain || 0) +
        dashboardData.pendingApprovals.length
      );
    }

    if (user?.role === 'admin') {
      return (
        base +
        (stats.inventory?.lowStock || 0) +
        (stats.fixedAssets?.overdueInspections || 0) +
        dashboardData.pendingApprovals.length
      );
    }

    if (user?.role === 'ceo') {
      return (
        (stats.cashRequests?.pending || 0) +
        (stats.purchaseRequisitions?.pending || 0) +
        (stats.invoices?.pending || 0) +
        (stats.suppliers?.pending || 0) +
        (stats.incidentReports?.pending || 0) +
        (stats.itSupport?.pending || 0) +
        (stats.sickLeave?.pending || 0) +
        (stats.debitNotes?.pending || 0) +
        (stats.disbursements?.pending || 0) +
        (stats.budgetCodes?.pending || 0) +
        (stats.inventory?.lowStock || 0) +
        (stats.fixedAssets?.overdueInspections || 0) +
        dashboardData.pendingApprovals.length
      );
    }

    if (['supervisor', 'manager', 'hr', 'it', 'hse', 'technical', 'finance'].includes(user?.role)) {
      return base + dashboardData.pendingApprovals.length;
    }

    return base;
  };

  const totalPending = getTotalPending();

  // ── CHANGE 4 of 5: managementModules with 'ceo' in every role list ─────────
  const managementModules = [
    'pettycash','purchase-requisitions','buyer-procurement','supplier-management',
    'invoices','incident-reports','it-support','suggestions','sick-leave',
    'communications','inventory-management','fixed-assets','supplier-performance',
    'data-migration','project-management','action-items','legal-compliance'
  ].filter(module => ({
    'pettycash':              ['finance','hr','admin','ceo'],
    'purchase-requisitions':  ['supply_chain','buyer','hr','it','finance','admin','ceo'],
    'buyer-procurement':      ['buyer','admin','ceo'],
    'supplier-management':    ['buyer','supply_chain','admin','ceo'],
    'invoices':               ['finance','hr','it','admin','ceo'],
    'incident-reports':       ['hse','admin','ceo'],
    'it-support':             ['it','admin','ceo'],
    'suggestions':            ['hr','admin','ceo'],
    'sick-leave':             ['hr','supervisor','admin','ceo'],
    'communications':         ['admin','hr','ceo'],
    'inventory-management':   ['supply_chain','admin','ceo'],
    'fixed-assets':           ['supply_chain','admin','ceo'],
    'supplier-performance':   ['supply_chain','admin','ceo'],
    'data-migration':         ['supply_chain','admin','ceo'],
    'project-management':     ['admin','supply_chain','supervisor','manager','hr','it','hse','technical','finance','ceo'],
    'action-items':           ['admin','supply_chain','supervisor','manager','hr','it','hse','technical','finance','ceo'],
    'legal-compliance':       ['legal','admin','finance','ceo'],
  }[module] || []).includes(user?.role));

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>

      {/* ── WELCOME HEADER ────────────────────────────────────────────────── */}
      <Card style={{ marginBottom: '24px' }}>
        <Row align="middle" gutter={[16, 16]}>
          <Col>
            <div style={{ fontSize: '48px', color: roleInfo.color, background: `${roleInfo.color}15`, padding: '16px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              {roleInfo.icon}
              {userCapabilities.level > 1 && (
                <div style={{ position: 'absolute', top: '-4px', right: '-4px', background: '#faad14', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CrownOutlined style={{ fontSize: '12px', color: 'white' }} />
                </div>
              )}
            </div>
          </Col>
          <Col flex="auto">
            <Title level={2} style={{ margin: 0, color: roleInfo.color }}>
              Welcome back, {user?.fullName || user?.email}! 👋
            </Title>
            <Text type="secondary" style={{ fontSize: '16px' }}>{roleInfo.description}</Text>
            <div style={{ marginTop: '8px' }}>
              <Tag color={roleInfo.color} style={{ textTransform: 'capitalize' }}>{user?.role} Access</Tag>
              {user?.department && <Tag color="blue">{user.department}</Tag>}
              {managementModules.length > 0 && <Tag color="gold" icon={<CrownOutlined />}>{managementModules.length} Management Module{managementModules.length !== 1 ? 's' : ''}</Tag>}
              {userCapabilities.hasTeamAccess && <Tag color="green" icon={<TeamOutlined />}>Team Access Enabled</Tag>}
            </div>
            <div style={{ marginTop: '8px' }}>
              <Text type="secondary" style={{ fontSize: '12px' }}>{moment().format('dddd, MMMM DD, YYYY')}</Text>
            </div>
          </Col>
        </Row>
      </Card>

      {/* ── ACCESS LEVEL ALERT ────────────────────────────────────────────── */}
      {userCapabilities.level > 1 && (
        <Alert
          message={`Enhanced Access Level ${userCapabilities.level}${userCapabilities.hasTeamAccess ? ' - Team Management Enabled' : ''}`}
          description={
            <div>
              <Text strong>Management Access:</Text> {managementModules.join(', ')}
              <br />
              <Text type="secondary">You have administrative privileges for {managementModules.length} module{managementModules.length !== 1 ? 's' : ''} while maintaining access to all employee services.</Text>
              {userCapabilities.hasTeamAccess && <><br /><Text strong style={{ color: '#52c41a' }}>Team Access:</Text><Text type="secondary"> You can view and approve requests from your team members across all modules.</Text></>}
              {user?.role === 'ceo' && <><br /><Text strong style={{ color: '#faad14' }}>CEO Authority:</Text><Text type="secondary"> You have final approval authority on all modules and company-wide read access to every request, report, and analytic.</Text></>}
              {user?.role === 'buyer' && <><br /><Text strong style={{ color: '#eb2f96' }}>Buyer Specialization:</Text><Text type="secondary"> Complete procurement workflow management from requisition to delivery, including debit note handling.</Text></>}
              {user?.role === 'supply_chain' && <><br /><Text strong style={{ color: '#fa8c16' }}>Supply Chain Management:</Text><Text type="secondary"> Full project management, inventory control, asset registry, head approvals, and supplier performance tracking.</Text></>}
              {user?.role === 'finance' && <><br /><Text strong style={{ color: '#722ed1' }}>Finance Management:</Text><Text type="secondary"> Budget codes, accounting center, disbursements, scheduled reports, and salary processing.</Text></>}
              {user?.role === 'supervisor' && <><br /><Text strong style={{ color: '#52c41a' }}>Supervisor Capabilities:</Text><Text type="secondary"> Milestone management, task approvals, KPI evaluations, project plan approvals, and debit note approvals.</Text></>}
              {user?.role === 'admin' && <><br /><Text strong style={{ color: '#fa541c' }}>Admin Capabilities:</Text><Text type="secondary"> Head approval, PM milestone review, full system access across all modules.</Text></>}
            </div>
          }
          type="info"
          showIcon
          icon={<CrownOutlined />}
          style={{ marginBottom: '24px' }}
        />
      )}

      {/* ── PENDING ACTIONS ALERT ─────────────────────────────────────────── */}
      {totalPending > 0 && (
        <Alert
          message={`${totalPending} Pending Actions Required`}
          // description={
          //   <Space wrap>
          //     {['admin', 'supply_chain', 'supervisor', 'manager', 'hr', 'it', 'hse', 'technical'].includes(user?.role) && dashboardData.pendingApprovals.length > 0 && <Text><CheckCircleOutlined /> {dashboardData.pendingApprovals.length} task approval{dashboardData.pendingApprovals.length !== 1 ? 's' : ''}</Text>}
          //     {user?.role === 'buyer' && <><Text><ShoppingCartOutlined /> {stats.buyerRequisitions.pending} new requisition{stats.buyerRequisitions.pending !== 1 ? 's' : ''}</Text><Text><SolutionOutlined /> {stats.buyerRequisitions.inProgress} sourcing in progress</Text><Text><FileTextOutlined /> {stats.quotes.pending} quote{stats.quotes.pending !== 1 ? 's' : ''} to evaluate</Text>{stats.debitNotes?.pending > 0 && <Text><AuditOutlined /> {stats.debitNotes.pending} debit note{stats.debitNotes.pending !== 1 ? 's' : ''} pending</Text>}</>}
          //     {user?.role === 'finance' && stats.budgetCodes.pending > 0 && <Text><BankOutlined /> {stats.budgetCodes.pending} budget code approval{stats.budgetCodes.pending !== 1 ? 's' : ''}</Text>}
          //     {user?.role === 'finance' && stats.disbursements?.pending > 0 && <Text><DeliveredProcedureOutlined /> {stats.disbursements.pending} disbursement{stats.disbursements.pending !== 1 ? 's' : ''} pending</Text>}
          //     {user?.role === 'supply_chain' && stats.suppliers?.pending_supply_chain > 0 && <Text><ContactsOutlined /> {stats.suppliers.pending_supply_chain} supplier approval{stats.suppliers.pending_supply_chain !== 1 ? 's' : ''}</Text>}
          //     {stats.cashRequests.pending > 0 && <Text><DollarOutlined /> {stats.cashRequests.pending} cash request{stats.cashRequests.pending !== 1 ? 's' : ''}</Text>}
          //     {stats.purchaseRequisitions.pending > 0 && user?.role !== 'buyer' && <Text><ShoppingCartOutlined /> {stats.purchaseRequisitions.pending} purchase requisition{stats.purchaseRequisitions.pending !== 1 ? 's' : ''}</Text>}
          //     {stats.invoices.pending > 0 && <Text><FileTextOutlined /> {stats.invoices.pending} invoice{stats.invoices.pending !== 1 ? 's' : ''}</Text>}
          //     {stats.incidentReports.pending > 0 && <Text><ExclamationCircleOutlined /> {stats.incidentReports.pending} incident report{stats.incidentReports.pending !== 1 ? 's' : ''}</Text>}
          //     {stats.itSupport.pending > 0 && <Text><LaptopOutlined /> {stats.itSupport.pending} IT request{stats.itSupport.pending !== 1 ? 's' : ''}</Text>}
          //     {stats.sickLeave.pending > 0 && <Text><MedicineBoxOutlined /> {stats.sickLeave.pending} sick leave request{stats.sickLeave.pending !== 1 ? 's' : ''}</Text>}
          //     {stats.communications.pending > 0 && (user?.role === 'admin' || user?.role === 'hr') && <Text><NotificationOutlined /> {stats.communications.pending} communication{stats.communications.pending !== 1 ? 's' : ''} pending</Text>}
          //     {(user?.role === 'supply_chain' || user?.role === 'admin') && stats.inventory.lowStock > 0 && <Text><WarningOutlined /> {stats.inventory.lowStock} item{stats.inventory.lowStock !== 1 ? 's' : ''} low stock</Text>}
          //     {(user?.role === 'supply_chain' || user?.role === 'admin') && stats.fixedAssets.overdueInspections > 0 && <Text><BarcodeOutlined /> {stats.fixedAssets.overdueInspections} asset{stats.fixedAssets.overdueInspections !== 1 ? 's' : ''} overdue inspection</Text>}
          //     {/* ── CEO pending alert items ── */}
          //     {user?.role === 'ceo' && (
          //       <>
          //         {stats.cashRequests?.pending > 0 && (
          //           <Text><CrownOutlined /> {stats.cashRequests.pending} cash request{stats.cashRequests.pending !== 1 ? 's' : ''} awaiting CEO approval</Text>
          //         )}
          //         {stats.purchaseRequisitions?.pending > 0 && (
          //           <Text><ShoppingCartOutlined /> {stats.purchaseRequisitions.pending} purchase requisition{stats.purchaseRequisitions.pending !== 1 ? 's' : ''} awaiting CEO approval</Text>
          //         )}
          //         {stats.invoices?.pending > 0 && (
          //           <Text><FileTextOutlined /> {stats.invoices.pending} invoice{stats.invoices.pending !== 1 ? 's' : ''} awaiting CEO approval</Text>
          //         )}
          //         {stats.suppliers?.pending > 0 && (
          //           <Text><ContactsOutlined /> {stats.suppliers.pending} supplier application{stats.suppliers.pending !== 1 ? 's' : ''} awaiting CEO approval</Text>
          //         )}
          //       </>
          //     )}
          //   </Space>
          // }
          description={
            <Space wrap>
              {/* Task approvals — roles with team access */}
              {['admin', 'supply_chain', 'supervisor', 'manager', 'hr', 'it', 'hse', 'technical', 'ceo'].includes(user?.role) && dashboardData.pendingApprovals.length > 0 &&
                <Text><CheckCircleOutlined /> {dashboardData.pendingApprovals.length} task approval{dashboardData.pendingApprovals.length !== 1 ? 's' : ''}</Text>}

              {/* Buyer-specific items */}
              {user?.role === 'buyer' && <>
                {stats.buyerRequisitions.pending > 0 && <Text><ShoppingCartOutlined /> {stats.buyerRequisitions.pending} new requisition{stats.buyerRequisitions.pending !== 1 ? 's' : ''}</Text>}
                {stats.buyerRequisitions.inProgress > 0 && <Text><SolutionOutlined /> {stats.buyerRequisitions.inProgress} sourcing in progress</Text>}
                {stats.quotes.pending > 0 && <Text><FileTextOutlined /> {stats.quotes.pending} quote{stats.quotes.pending !== 1 ? 's' : ''} to evaluate</Text>}
                {stats.debitNotes?.pending > 0 && <Text><AuditOutlined /> {stats.debitNotes.pending} debit note{stats.debitNotes.pending !== 1 ? 's' : ''} pending</Text>}
              </>}

              {/* Items shown to all non-buyer roles */}
              {user?.role !== 'buyer' && <>
                {stats.cashRequests.pending > 0 &&
                  <Text><DollarOutlined /> {stats.cashRequests.pending} cash request{stats.cashRequests.pending !== 1 ? 's' : ''}</Text>}
                {stats.purchaseRequisitions.pending > 0 &&
                  <Text><ShoppingCartOutlined /> {stats.purchaseRequisitions.pending} purchase requisition{stats.purchaseRequisitions.pending !== 1 ? 's' : ''}</Text>}
                {stats.invoices.pending > 0 &&
                  <Text><FileTextOutlined /> {stats.invoices.pending} invoice{stats.invoices.pending !== 1 ? 's' : ''}</Text>}
                {stats.incidentReports.pending > 0 &&
                  <Text><ExclamationCircleOutlined /> {stats.incidentReports.pending} incident report{stats.incidentReports.pending !== 1 ? 's' : ''}</Text>}
                {stats.itSupport.pending > 0 &&
                  <Text><LaptopOutlined /> {stats.itSupport.pending} IT request{stats.itSupport.pending !== 1 ? 's' : ''}</Text>}
                {stats.sickLeave.pending > 0 &&
                  <Text><MedicineBoxOutlined /> {stats.sickLeave.pending} leave request{stats.sickLeave.pending !== 1 ? 's' : ''}</Text>}
                {stats.suggestions.pending > 0 &&
                  <Text><BulbOutlined /> {stats.suggestions.pending} suggestion{stats.suggestions.pending !== 1 ? 's' : ''}</Text>}
              </>}

              {/* Finance-specific */}
              {user?.role === 'finance' && stats.budgetCodes.pending > 0 &&
                <Text><BankOutlined /> {stats.budgetCodes.pending} budget code approval{stats.budgetCodes.pending !== 1 ? 's' : ''}</Text>}
              {user?.role === 'finance' && stats.disbursements?.pending > 0 &&
                <Text><DeliveredProcedureOutlined /> {stats.disbursements.pending} disbursement{stats.disbursements.pending !== 1 ? 's' : ''} pending</Text>}

              {/* Supply chain specific */}
              {user?.role === 'supply_chain' && stats.suppliers?.pending_supply_chain > 0 &&
                <Text><ContactsOutlined /> {stats.suppliers.pending_supply_chain} supplier approval{stats.suppliers.pending_supply_chain !== 1 ? 's' : ''}</Text>}

              {/* Communications — admin and hr only */}
              {['admin', 'hr'].includes(user?.role) && stats.communications.pending > 0 &&
                <Text><NotificationOutlined /> {stats.communications.pending} communication{stats.communications.pending !== 1 ? 's' : ''} pending</Text>}

              {/* Inventory and assets — supply chain and admin */}
              {['supply_chain', 'admin'].includes(user?.role) && stats.inventory.lowStock > 0 &&
                <Text><WarningOutlined /> {stats.inventory.lowStock} item{stats.inventory.lowStock !== 1 ? 's' : ''} low stock</Text>}
              {['supply_chain', 'admin'].includes(user?.role) && stats.fixedAssets.overdueInspections > 0 &&
                <Text><BarcodeOutlined /> {stats.fixedAssets.overdueInspections} asset{stats.fixedAssets.overdueInspections !== 1 ? 's' : ''} overdue inspection</Text>}

              {/* CEO — consolidated view, no duplication */}
              {user?.role === 'ceo' && <>
                {stats.suppliers?.pending > 0 &&
                  <Text><ContactsOutlined /> {stats.suppliers.pending} supplier application{stats.suppliers.pending !== 1 ? 's' : ''} pending approval</Text>}
                {stats.budgetCodes?.pending > 0 &&
                  <Text><BankOutlined /> {stats.budgetCodes.pending} budget code approval{stats.budgetCodes.pending !== 1 ? 's' : ''}</Text>}
                {stats.disbursements?.pending > 0 &&
                  <Text><DeliveredProcedureOutlined /> {stats.disbursements.pending} disbursement{stats.disbursements.pending !== 1 ? 's' : ''} pending</Text>}
                {stats.inventory?.lowStock > 0 &&
                  <Text><WarningOutlined /> {stats.inventory.lowStock} item{stats.inventory.lowStock !== 1 ? 's' : ''} low stock</Text>}
                {stats.fixedAssets?.overdueInspections > 0 &&
                  <Text><BarcodeOutlined /> {stats.fixedAssets.overdueInspections} asset{stats.fixedAssets.overdueInspections !== 1 ? 's' : ''} overdue inspection</Text>}
              </>}
            </Space>
          }
          type="warning"
          showIcon
          style={{ marginBottom: '24px' }}
        />
      )}

      {/* ── QUICK STATS ROW ───────────────────────────────────────────────── */}
      {(dashboardData.tasks.total > 0 || dashboardData.kpis.count > 0 || dashboardData.milestones.total > 0) && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic title="My Tasks" value={dashboardData.tasks.total} prefix={<CheckCircleOutlined />} valueStyle={{ color: '#1890ff' }} suffix={<Text type="secondary" style={{ fontSize: '14px' }}>/{dashboardData.tasks.inProgress} active</Text>} />
              <Button type="link" onClick={() => navigate('/employee/tasks')} style={{ padding: 0, marginTop: 8 }}>View All Tasks <RightOutlined /></Button>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic title="KPI Achievement" value={dashboardData.kpis.overall} suffix="%" prefix={<TrophyOutlined />} valueStyle={{ color: dashboardData.kpis.overall >= 75 ? '#52c41a' : dashboardData.kpis.overall >= 50 ? '#faad14' : '#f5222d' }} />
              <Button type="link" onClick={() => navigate('/employee/kpis')} style={{ padding: 0, marginTop: 8 }}>View KPIs <RightOutlined /></Button>
            </Card>
          </Col>
          {['admin', 'supply_chain', 'supervisor', 'manager', 'hr', 'it', 'hse', 'technical', 'finance', 'ceo'].includes(user?.role) && (
            <>
              <Col xs={24} sm={12} lg={6}>
                <Card>
                  <Statistic title="My Milestones" value={dashboardData.milestones.total} prefix={<FlagOutlined />} valueStyle={{ color: '#722ed1' }} suffix={<Text type="secondary" style={{ fontSize: '14px' }}>/{dashboardData.milestones.inProgress} active</Text>} />
                  <Button type="link" onClick={() => navigate('/supervisor/milestones')} style={{ padding: 0, marginTop: 8 }}>View Milestones <RightOutlined /></Button>
                </Card>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Card>
                  <Statistic title="Pending Approvals" value={dashboardData.pendingApprovals.length} prefix={<ClockCircleOutlined />} valueStyle={{ color: '#faad14' }} />
                  <Button type="link" onClick={() => navigate('/supervisor/action-items')} style={{ padding: 0, marginTop: 8 }}>Review Now <RightOutlined /></Button>
                </Card>
              </Col>
            </>
          )}
        </Row>
      )}

      {/* ── RECENT TASKS & PENDING APPROVALS ─────────────────────────────── */}
      {(dashboardData.recentTasks.length > 0 || dashboardData.pendingApprovals.length > 0) && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} lg={12}>
            <Card title={<Space><CheckCircleOutlined /><Text strong>Recent Tasks</Text></Space>} extra={<Button type="link" onClick={() => navigate('/employee/tasks')}>View All</Button>}>
              {dashboardData.recentTasks.length === 0 ? (
                <Alert message="No tasks yet" description="You don't have any tasks assigned. Check back later or create a personal task." type="info" showIcon />
              ) : (
                <List dataSource={dashboardData.recentTasks} renderItem={item => {
                  const isOverdue = moment(item.dueDate).isBefore(moment()) && item.status !== 'Completed';
                  return (
                    <List.Item actions={[<Button type="link" size="small" onClick={() => navigate('/employee/tasks')}>View</Button>]}>
                      <List.Item.Meta
                        title={<Space><Text strong>{item.title}</Text><Tag size="small" color={getPriorityColor(item.priority)}>{item.priority}</Tag>{isOverdue && <Tag size="small" color="red" icon={<WarningOutlined />}>Overdue</Tag>}</Space>}
                        description={<Space direction="vertical" size="small" style={{ width: '100%' }}><Text type="secondary" style={{ fontSize: '12px' }}>Due: {moment(item.dueDate).format('MMM DD, YYYY')}</Text><Progress percent={item.progress || 0} size="small" status={item.progress === 100 ? 'success' : 'active'} /></Space>}
                      />
                    </List.Item>
                  );
                }} />
              )}
            </Card>
          </Col>

          {['admin', 'supply_chain', 'supervisor', 'manager', 'hr', 'it', 'hse', 'technical', 'finance', 'ceo'].includes(user?.role) ? (
            <Col xs={24} lg={12}>
              <Card title={<Space><ClockCircleOutlined /><Text strong>Pending Approvals</Text><Badge count={dashboardData.pendingApprovals.length} /></Space>} extra={<Button type="link" onClick={() => navigate('/supervisor/action-items')}>View All</Button>}>
                {dashboardData.pendingApprovals.length === 0 ? (
                  <Alert message="No pending approvals" description="All tasks are up to date. Great work!" type="success" showIcon />
                ) : (
                  <List dataSource={dashboardData.pendingApprovals} renderItem={item => (
                    <List.Item actions={[<Button type="primary" size="small" onClick={() => {
                      if (item.status === 'Pending Approval') navigate(`/supervisor/task-creation-approval/${item._id}`);
                      else {
                        const submitted = item.assignedTo?.find(a => a.completionStatus === 'submitted');
                        if (submitted) navigate(`/supervisor/task-completion-approval/${item._id}/${submitted.user._id}`);
                      }
                    }}>Review</Button>]}>
                      <List.Item.Meta avatar={<Avatar icon={<UserOutlined />} />} title={<Space><Text strong>{item.title}</Text><Tag size="small" color={getStatusColor(item.status)}>{item.status}</Tag></Space>} description={<Space direction="vertical" size="small"><Text type="secondary" style={{ fontSize: '12px' }}>{item.status === 'Pending Approval' ? 'Creation approval needed' : 'Completion review needed'}</Text>{item.assignedTo?.length > 0 && <Text type="secondary" style={{ fontSize: '12px' }}>Assignee: {item.assignedTo[0].user?.fullName}</Text>}</Space>} />
                    </List.Item>
                  )} />
                )}
              </Card>
            </Col>
          ) : (
            <Col xs={24} lg={12}>
              <Card title={<Space><TrophyOutlined /><Text strong>KPI Overview</Text></Space>} extra={<Button type="link" onClick={() => navigate('/employee/kpis')}>View Details</Button>}>
                {dashboardData.kpis.count === 0 ? (
                  <Alert message="No KPIs Set Up" description="Set up your quarterly KPIs to start tracking your performance." type="warning" showIcon action={<Button type="primary" size="small" onClick={() => navigate('/employee/kpis')}>Set Up KPIs</Button>} />
                ) : (
                  <Space direction="vertical" style={{ width: '100%' }} size="large">
                    <div>
                      <Text type="secondary">Overall Achievement</Text>
                      <Progress percent={dashboardData.kpis.overall} strokeColor={{ '0%': '#108ee9', '100%': '#87d068' }} style={{ marginTop: 8 }} />
                    </div>
                    <Alert message={`You have ${dashboardData.kpis.count} KPIs defined for this quarter`} description="Complete tasks linked to your KPIs to increase your achievement score." type="info" showIcon />
                  </Space>
                )}
              </Card>
            </Col>
          )}
        </Row>
      )}

      {/* ── SERVICE MODULE CARDS ──────────────────────────────────────────── */}
      <Title level={3} style={{ marginBottom: '24px' }}>
        Service Modules
        <Text type="secondary" style={{ fontSize: '14px', marginLeft: '16px' }}>
          {user?.role === 'ceo'
            ? 'Company-wide oversight — all 23 modules visible with executive analytics & approvals'
            : `All services available • Enhanced management for your role${userCapabilities.hasTeamAccess ? ' • Team access enabled' : ''}`}
        </Text>
      </Title>

      <Row gutter={[24, 24]}>
        {getModuleCards()}
      </Row>

      {/* ── QUICK LINKS ───────────────────────────────────────────────────── */}
      <Card style={{ marginTop: '24px' }} title="Quick Links">
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6}>
            <Button block icon={<UserOutlined />} onClick={() => navigate('/account-settings')}>Account Settings</Button>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Button block icon={<BarChartOutlined />} onClick={() => navigate('/analytics')} disabled={userCapabilities.level < 2}>Analytics Dashboard</Button>
          </Col>

          {/* ── CEO quick links ── */}
          {user?.role === 'ceo' && (
            <>
              <Col xs={24} sm={12} md={6}>
                <Button
                  block icon={<CrownOutlined />}
                  onClick={() => navigate('/admin/head-approval')}
                  type="primary"
                  style={{ backgroundColor: '#faad14', borderColor: '#faad14' }}
                >
                  Final Approval Queue
                  {stats.cashRequests?.pending > 0 && (
                    <Badge count={stats.cashRequests.pending} style={{ marginLeft: '8px' }} />
                  )}
                </Button>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Button block icon={<BarChartOutlined />} onClick={() => navigate('/admin/analytics')}>
                  Company Analytics
                </Button>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Button block icon={<FundOutlined />} onClick={() => navigate('/finance/budget-management')}>
                  Budget Overview
                </Button>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Button block icon={<TeamOutlined />} onClick={() => navigate('/hr/dashboard')}>
                  HR Overview
                </Button>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Button block icon={<ProjectOutlined />} onClick={() => navigate('/admin/projects')}>
                  All Projects
                </Button>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Button block icon={<ContactsOutlined />} onClick={() => navigate('/admin/supplier-approvals')}>
                  Supplier Approvals
                </Button>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Button block icon={<WalletOutlined />} onClick={() => navigate('/finance/salary-payments')}>
                  Payroll
                </Button>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Button block icon={<SettingOutlined />} onClick={() => navigate('/admin/system-settings')}>
                  System Settings
                </Button>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Button
                  block
                  icon={<CrownOutlined />}
                  onClick={() => navigate('/ceo/availability-settings')}
                  style={{ backgroundColor: '#faad14', borderColor: '#faad14', color: '#fff' }}
                >
                  Availability & Delegation
                </Button>
              </Col>
            </>
          )}

          {user?.role === 'buyer' && (
            <>
              <Col xs={24} sm={12} md={6}>
                <Button block icon={<FundOutlined />} onClick={() => navigate('/buyer/analytics/performance')}>Performance Reports</Button>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Button block icon={<AuditOutlined />} onClick={() => navigate('/buyer/debit-notes')} type="primary" style={{ backgroundColor: '#fa8c16', borderColor: '#fa8c16' }}>
                  Debit Notes
                  {stats.debitNotes?.pending > 0 && <Badge count={stats.debitNotes.pending} style={{ marginLeft: '8px' }} />}
                </Button>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Button block icon={<CarOutlined />} onClick={() => navigate('/buyer/deliveries')}>Delivery Tracking</Button>
              </Col>
            </>
          )}
          {(user?.role === 'supply_chain' || user?.role === 'admin') && (
            <>
              <Col xs={24} sm={12} md={6}><Button block icon={<DatabaseOutlined />} onClick={() => navigate('/supply-chain/inventory')} type="primary" style={{ backgroundColor: '#13c2c2', borderColor: '#13c2c2' }}>Inventory Dashboard</Button></Col>
              <Col xs={24} sm={12} md={6}><Button block icon={<BarcodeOutlined />} onClick={() => navigate('/supply-chain/fixed-assets')} type="primary" style={{ backgroundColor: '#722ed1', borderColor: '#722ed1' }}>Asset Registry</Button></Col>
              <Col xs={24} sm={12} md={6}><Button block icon={<ProjectOutlined />} onClick={() => navigate('/supply-chain/project-management')} type="primary" style={{ backgroundColor: '#13c2c2', borderColor: '#13c2c2' }}>Project Management</Button></Col>
            </>
          )}
          {user?.role === 'supply_chain' && (
            <Col xs={24} sm={12} md={6}>
              <Button block icon={<CheckCircleOutlined />} onClick={() => navigate('/supply-chain/head-approval')} type="primary" style={{ backgroundColor: '#fa8c16', borderColor: '#fa8c16' }}>
                Head Approval
                {stats.suppliers?.pending_head_of_business > 0 && <Badge count={stats.suppliers.pending_head_of_business} style={{ marginLeft: '8px' }} />}
              </Button>
            </Col>
          )}
          {user?.role === 'admin' && (
            <>
              <Col xs={24} sm={12} md={6}><Button block icon={<CheckCircleOutlined />} onClick={() => navigate('/admin/head-approval')} type="primary" style={{ backgroundColor: '#fa541c', borderColor: '#fa541c' }}>Head Approval</Button></Col>
              <Col xs={24} sm={12} md={6}><Button block icon={<FlagOutlined />} onClick={() => navigate('/admin/pm/milestone-review')} type="primary" style={{ backgroundColor: '#13c2c2', borderColor: '#13c2c2' }}>PM Milestone Review</Button></Col>
            </>
          )}
          {['admin', 'supply_chain', 'supervisor', 'manager', 'hr', 'it', 'hse', 'technical'].includes(user?.role) && (
            <>
              <Col xs={24} sm={12} md={6}><Button block icon={<FlagOutlined />} onClick={() => navigate('/supervisor/milestones')} type="primary" style={{ backgroundColor: '#722ed1', borderColor: '#722ed1' }}>My Milestones</Button></Col>
              <Col xs={24} sm={12} md={6}>
                <Button block icon={<CheckCircleOutlined />} onClick={() => navigate('/supervisor/action-items')} type="primary" style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}>
                  Task Approvals
                  {dashboardData.pendingApprovals.length > 0 && <Badge count={dashboardData.pendingApprovals.length} style={{ marginLeft: '8px' }} />}
                </Button>
              </Col>
              <Col xs={24} sm={12} md={6}><Button block icon={<ScheduleOutlined />} onClick={() => navigate('/supervisor/project-plan-approvals')}>Project Plan Approvals</Button></Col>
              <Col xs={24} sm={12} md={6}><Button block icon={<AuditOutlined />} onClick={() => navigate('/supervisor/debit-note-approvals')}>Debit Note Approvals</Button></Col>
            </>
          )}
          {['hr', 'admin'].includes(user?.role) && (
            <Col xs={24} sm={12} md={6}><Button block icon={<SafetyCertificateOutlined />} onClick={() => navigate('/employee-welfare')}>Employee Welfare</Button></Col>
          )}
          {(user?.role === 'admin' || user?.role === 'hr') && (
            <Col xs={24} sm={12} md={6}><Button block icon={<NotificationOutlined />} onClick={() => navigate(`/${user?.role}/communications`)} type="primary" style={{ backgroundColor: '#fa541c', borderColor: '#fa541c' }}>Send Communication</Button></Col>
          )}
          {user?.role === 'finance' && (
            <>
              <Col xs={24} sm={12} md={6}><Button block icon={<DeliveredProcedureOutlined />} onClick={() => navigate('/finance/disbursements')} type="primary" style={{ backgroundColor: '#722ed1', borderColor: '#722ed1' }}>Disbursements{stats.disbursements?.pending > 0 && <Badge count={stats.disbursements.pending} style={{ marginLeft: '8px' }} />}</Button></Col>
              <Col xs={24} sm={12} md={6}><Button block icon={<AccountBookOutlined />} onClick={() => navigate('/finance/accounting')}>Accounting Center</Button></Col>
              <Col xs={24} sm={12} md={6}><Button block icon={<ScheduleOutlined />} onClick={() => navigate('/finance/scheduled-reports')}>Scheduled Reports</Button></Col>
            </>
          )}
          {user?.role === 'admin' && (
            <Col xs={24} sm={12} md={6}><Button block icon={<SettingOutlined />} onClick={() => navigate('/system-settings')}>System Settings</Button></Col>
          )}
        </Row>
      </Card>

      {/* ── ROLE-SPECIFIC SUMMARY PANELS ──────────────────────────────────── */}

      {user?.role === 'buyer' && (
        <Card style={{ marginTop: '24px' }} title="Procurement Performance Summary">
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={6}><Statistic title="Active Requisitions" value={(stats.buyerRequisitions.pending || 0) + (stats.buyerRequisitions.inProgress || 0)} prefix={<ShoppingCartOutlined />} valueStyle={{ color: '#1890ff' }} /></Col>
            <Col xs={24} sm={6}><Statistic title="Quotes Pending" value={stats.quotes.pending} prefix={<FileTextOutlined />} valueStyle={{ color: '#faad14' }} /></Col>
            <Col xs={24} sm={6}><Statistic title="Active Suppliers" value={stats.suppliers.active} prefix={<ContactsOutlined />} valueStyle={{ color: '#52c41a' }} /></Col>
            <Col xs={24} sm={6}><Statistic title="Debit Notes Pending" value={stats.debitNotes?.pending || 0} prefix={<AuditOutlined />} valueStyle={{ color: stats.debitNotes?.pending > 0 ? '#f5222d' : '#52c41a' }} /></Col>
          </Row>
          <Divider />
          <Space>
            <Button type="primary" icon={<BarChartOutlined />} onClick={() => navigate('/buyer/analytics')}>Detailed Analytics</Button>
            <Button icon={<AuditOutlined />} onClick={() => navigate('/buyer/debit-notes')}>Debit Notes</Button>
            <Button icon={<CarOutlined />} onClick={() => navigate('/buyer/deliveries')}>Delivery Tracking</Button>
            <Button icon={<ContactsOutlined />} onClick={() => navigate('/buyer/suppliers')}>Manage Suppliers</Button>
          </Space>
        </Card>
      )}

      {(user?.role === 'supply_chain' || user?.role === 'admin') && (
        <Card style={{ marginTop: '24px' }} title="Inventory & Asset Summary">
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={6}><Statistic title="Total Items" value={stats.inventory.totalItems} prefix={<DatabaseOutlined />} valueStyle={{ color: '#1890ff' }} /></Col>
            <Col xs={24} sm={6}><Statistic title="Low Stock Alerts" value={stats.inventory.lowStock} prefix={<WarningOutlined />} valueStyle={{ color: '#faad14' }} /></Col>
            <Col xs={24} sm={6}><Statistic title="Active POs" value={stats.purchaseOrders?.active || 0} prefix={<FileTextOutlined />} valueStyle={{ color: '#52c41a' }} /></Col>
            <Col xs={24} sm={6}><Statistic title="Pending Deliveries" value={stats.purchaseOrders?.pending || 0} prefix={<TruckOutlined />} valueStyle={{ color: '#1890ff' }} /></Col>
            <Col xs={24} sm={6}><Statistic title="Total Assets" value={stats.fixedAssets.totalAssets} prefix={<BarcodeOutlined />} valueStyle={{ color: '#722ed1' }} /></Col>
            <Col xs={24} sm={6}><Statistic title="Overdue Inspections" value={stats.fixedAssets.overdueInspections} prefix={<WarningOutlined />} valueStyle={{ color: '#f5222d' }} /></Col>
          </Row>
          <Divider />
          <Space>
            <Button type="primary" icon={<DatabaseOutlined />} onClick={() => navigate('/supply-chain/inventory')}>Inventory Dashboard</Button>
            <Button icon={<BarcodeOutlined />} onClick={() => navigate('/supply-chain/fixed-assets')}>Asset Registry</Button>
            <Button icon={<StarOutlined />} onClick={() => navigate('/supply-chain/supplier-performance')}>Supplier Performance</Button>
            <Button icon={<UploadOutlined />} onClick={() => navigate('/supply-chain/data-migration')}>Data Migration</Button>
          </Space>
        </Card>
      )}

      {/* ── CEO Executive Summary Panel ────────────────────────────────────── */}
      {user?.role === 'ceo' && (
        <Card style={{ marginTop: '24px' }} title={<Space><CrownOutlined style={{ color: '#faad14' }} /><span>Executive Summary</span></Space>}>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={6}><Statistic title="Total Projects" value={stats.projects.total} prefix={<ProjectOutlined />} valueStyle={{ color: '#13c2c2' }} /></Col>
            <Col xs={24} sm={6}><Statistic title="Active Suppliers" value={stats.suppliers.active} prefix={<ContactsOutlined />} valueStyle={{ color: '#52c41a' }} /></Col>
            <Col xs={24} sm={6}><Statistic title="Pending Approvals" value={stats.cashRequests.pending + stats.purchaseRequisitions.pending + stats.invoices.pending + stats.suppliers.pending} prefix={<CrownOutlined />} valueStyle={{ color: '#faad14' }} /></Col>
            <Col xs={24} sm={6}><Statistic title="Inventory Items" value={stats.inventory.totalItems} prefix={<DatabaseOutlined />} valueStyle={{ color: '#1890ff' }} /></Col>
            <Col xs={24} sm={6}><Statistic title="Total Assets" value={stats.fixedAssets.totalAssets} prefix={<BarcodeOutlined />} valueStyle={{ color: '#722ed1' }} /></Col>
            <Col xs={24} sm={6}><Statistic title="Low Stock Alerts" value={stats.inventory.lowStock} prefix={<WarningOutlined />} valueStyle={{ color: '#faad14' }} /></Col>
            <Col xs={24} sm={6}><Statistic title="Overdue Inspections" value={stats.fixedAssets.overdueInspections} prefix={<WarningOutlined />} valueStyle={{ color: '#f5222d' }} /></Col>
            <Col xs={24} sm={6}><Statistic title="Avg Supplier Score" value={stats.supplierPerformance.averageScore} suffix="%" prefix={<StarOutlined />} valueStyle={{ color: '#fa8c16' }} precision={1} /></Col>
          </Row>
          <Divider />
          <Space wrap>
            <Button type="primary" icon={<CrownOutlined />} onClick={() => navigate('/admin/head-approval')} style={{ backgroundColor: '#faad14', borderColor: '#faad14' }}>
              Final Approval Queue
              {(stats.cashRequests.pending + stats.purchaseRequisitions.pending + stats.invoices.pending) > 0 && (
                <Badge count={stats.cashRequests.pending + stats.purchaseRequisitions.pending + stats.invoices.pending} style={{ marginLeft: '8px' }} />
              )}
            </Button>
            <Button icon={<BarChartOutlined />} onClick={() => navigate('/admin/analytics')}>Company Analytics</Button>
            <Button icon={<FundOutlined />} onClick={() => navigate('/finance/budget-management')}>Budget Overview</Button>
            <Button icon={<ProjectOutlined />} onClick={() => navigate('/admin/projects')}>All Projects</Button>
            <Button icon={<TeamOutlined />} onClick={() => navigate('/hr/dashboard')}>HR Dashboard</Button>
          </Space>
        </Card>
      )}

      {user?.role === 'finance' && (
        <Card style={{ marginTop: '24px' }} title="Budget & Finance Overview">
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={6}><Statistic title="Pending Approvals" value={stats.budgetCodes.pending} prefix={<ClockCircleOutlined />} valueStyle={{ color: '#faad14' }} /></Col>
            <Col xs={24} sm={6}><Statistic title="Active Budget Codes" value={stats.budgetCodes.total} prefix={<BankOutlined />} valueStyle={{ color: '#1890ff' }} /></Col>
            <Col xs={24} sm={6}><Statistic title="Disbursements Pending" value={stats.disbursements?.pending || 0} prefix={<DeliveredProcedureOutlined />} valueStyle={{ color: stats.disbursements?.pending > 0 ? '#f5222d' : '#52c41a' }} /></Col>
            <Col xs={24} sm={6}><Statistic title="Pending Revisions" value={stats.budgetCodes.revisions} prefix={<SwapOutlined />} valueStyle={{ color: '#722ed1' }} /></Col>
          </Row>
          <Divider />
          <Space>
            <Button type="primary" icon={<DashboardOutlined />} onClick={() => navigate('/finance/budget-management')}>Budget Dashboard</Button>
            <Button icon={<AccountBookOutlined />} onClick={() => navigate('/finance/accounting')}>Accounting Center</Button>
            <Button icon={<DeliveredProcedureOutlined />} onClick={() => navigate('/finance/disbursements')}>Disbursements</Button>
            <Button icon={<ScheduleOutlined />} onClick={() => navigate('/finance/scheduled-reports')}>Scheduled Reports</Button>
            <Button icon={<ClockCircleOutlined />} onClick={() => navigate('/finance/budget-codes')}>
              Pending Approvals
              {stats.budgetCodes.pending > 0 && <Badge count={stats.budgetCodes.pending} style={{ marginLeft: '8px' }} />}
            </Button>
          </Space>
        </Card>
      )}

      {user?.role === 'finance' && (
        <Card style={{ marginTop: '24px' }} title="Salary Payment Overview">
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={6}><Statistic title="Current Month Payroll" value={stats.salaryPayments?.currentMonth || 0} prefix={<WalletOutlined />} valueStyle={{ color: '#13c2c2', fontSize: '20px' }} formatter={v => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v.toLocaleString()} suffix="XAF" /></Col>
            <Col xs={24} sm={6}><Statistic title="Year to Date" value={stats.salaryPayments?.yearToDate || 0} prefix={<DollarOutlined />} valueStyle={{ color: '#1890ff', fontSize: '20px' }} formatter={v => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v.toLocaleString()} suffix="XAF" /></Col>
            <Col xs={24} sm={6}><Statistic title="Payments Processed" value={stats.salaryPayments?.totalProcessed || 0} prefix={<CheckCircleOutlined />} valueStyle={{ color: '#52c41a', fontSize: '20px' }} /></Col>
            <Col xs={24} sm={6}><Statistic title="Avg Per Payment" value={stats.salaryPayments?.totalProcessed > 0 ? Math.round((stats.salaryPayments?.currentMonth || 0) / stats.salaryPayments.totalProcessed) : 0} prefix={<BarChartOutlined />} valueStyle={{ color: '#722ed1', fontSize: '20px' }} formatter={v => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v.toLocaleString()} suffix="XAF" /></Col>
          </Row>
          {stats.salaryPayments?.lastPaymentDate && <Alert message="Last Payment Processed" description={moment(stats.salaryPayments.lastPaymentDate).format('MMMM DD, YYYY [at] HH:mm A')} type="info" showIcon icon={<CalendarOutlined />} style={{ marginTop: '16px' }} />}
          <Divider />
          <Space>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/finance/salary-payments/new')} style={{ backgroundColor: '#13c2c2', borderColor: '#13c2c2' }}>New Payment</Button>
            <Button icon={<HistoryOutlined />} onClick={() => navigate('/finance/salary-payments')}>Payment History</Button>
            <Button icon={<BarChartOutlined />} onClick={() => navigate('/finance/salary-reports')}>View Reports</Button>
            <Button icon={<DownloadOutlined />} onClick={() => message.info('Export feature coming soon')}>Export Data</Button>
          </Space>
        </Card>
      )}

      {(user?.role === 'admin' || user?.role === 'hr') && (
        <Card style={{ marginTop: '24px' }} title="Communications Overview">
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={8}><Statistic title="Drafts & Scheduled" value={stats.communications.pending} prefix={<ClockCircleOutlined />} valueStyle={{ color: '#faad14' }} /></Col>
            <Col xs={24} sm={8}><Statistic title="Sent Messages" value={stats.communications.total} prefix={<CheckCircleOutlined />} valueStyle={{ color: '#52c41a' }} /></Col>
            <Col xs={24} sm={8}><Statistic title="Total Communications" value={(stats.communications.pending || 0) + (stats.communications.total || 0)} prefix={<NotificationOutlined />} valueStyle={{ color: '#1890ff' }} /></Col>
          </Row>
          <Divider />
          <Space>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate(`/${user?.role}/communications/new`)} style={{ backgroundColor: '#fa541c', borderColor: '#fa541c' }}>New Message</Button>
            <Button icon={<HistoryOutlined />} onClick={() => navigate(`/${user?.role}/communications/history`)}>Message History</Button>
            <Button icon={<BarChartOutlined />} onClick={() => navigate(`/${user?.role}/communications/analytics`)}>View Analytics</Button>
          </Space>
        </Card>
      )}

      <Card
        style={{ marginTop: '24px' }}
        title={<Space><BankOutlined style={{ color: '#722ed1' }} /><span>Department Budget Overview</span></Space>}
        extra={<Tag color="purple">{user?.department || 'Your Department'}</Tag>}
      >
        <Paragraph type="secondary">View budget codes, utilization tracking, and financial analytics for your department. Track purchase requisitions, cash requests, and salary payments against allocated budgets.</Paragraph>
        <Alert message="Real-Time Budget Tracking" description="Monitor your department's budget utilization with up-to-date information from all budget sources." type="info" showIcon style={{ marginBottom: '16px' }} />
        <Space wrap>
          <Button type="primary" icon={<DashboardOutlined />} onClick={() => navigate(`/${user?.role === 'employee' ? 'employee' : 'supervisor'}/department-budget`)} style={{ backgroundColor: '#722ed1', borderColor: '#722ed1' }}>View Budget Dashboard</Button>
          <Button icon={<BarChartOutlined />} onClick={() => navigate(`/${user?.role === 'employee' ? 'employee' : 'supervisor'}/department-budget`)}>Budget Analytics</Button>
          <Button icon={<EyeOutlined />} onClick={() => navigate(`/${user?.role === 'employee' ? 'employee' : 'supervisor'}/department-budget`)}>Utilization Tracking</Button>
        </Space>
      </Card>

    </div>
  );
};

export default Dashboard;









// import React, { useState, useEffect } from 'react';
// import { useNavigate } from 'react-router-dom';
// import { useSelector } from 'react-redux';
// import {
//   Card,
//   Row,
//   Col,
//   Typography,
//   Button,
//   Space,
//   Statistic,
//   Alert,
//   Badge,
//   Divider,
//   Tag,
//   Tooltip,
//   Collapse,
//   List,
//   Progress,
//   Avatar,
//   Spin,
//   message
// } from 'antd';
// import {
//   DollarOutlined,
//   FileTextOutlined,
//   ClockCircleOutlined,
//   CheckCircleOutlined,
//   TeamOutlined,
//   BarChartOutlined,
//   BankOutlined,
//   UserOutlined,
//   SettingOutlined,
//   ArrowRightOutlined,
//   ExclamationCircleOutlined,
//   ToolOutlined,
//   BulbOutlined,
//   MedicineBoxOutlined,
//   SafetyCertificateOutlined,
//   LaptopOutlined,
//   CrownOutlined,
//   EyeOutlined,
//   ShoppingCartOutlined,
//   TruckOutlined,
//   ContactsOutlined,
//   SolutionOutlined,
//   FundOutlined,
//   DeliveredProcedureOutlined,
//   DatabaseOutlined,
//   PlusOutlined,
//   ProjectOutlined,
//   PlayCircleOutlined,
//   DownOutlined,
//   UpOutlined,
//   ShareAltOutlined,
//   FolderOutlined,
//   UploadOutlined,
//   FileOutlined,
//   FolderPlusOutlined,
//   HistoryOutlined,
//   LockOutlined,
//   NotificationOutlined,
//   InboxOutlined,
//   BarcodeOutlined,
//   StarOutlined,
//   TrophyOutlined,
//   SwapOutlined,
//   WarningOutlined,
//   CloseCircleOutlined,
//   DownloadOutlined,
//   DashboardOutlined,
//   ShoppingOutlined,
//   SearchOutlined,
//   FlagOutlined,
//   RightOutlined,
//   CalendarOutlined,
//   ShopOutlined,
//   FileSearchOutlined,
//   WalletOutlined,
//   FilterOutlined,
//   AuditOutlined,
//   AccountBookOutlined,
//   ScheduleOutlined,
//   CarOutlined
// } from '@ant-design/icons';
// import api from '../services/api';
// import moment from 'moment';

// const { Title, Text, Paragraph } = Typography;

// const Dashboard = () => {
//   const navigate = useNavigate();
//   const { user } = useSelector((state) => state.auth);
//   const [expandedCards, setExpandedCards] = useState({});
//   const [loading, setLoading] = useState(true);
//   const [stats, setStats] = useState({
//     cashRequests: { pending: 0, total: 0 },
//     invoices: { pending: 0, total: 0 },
//     incidentReports: { pending: 0, total: 0 },
//     itSupport: { pending: 0, total: 0 },
//     suggestions: { pending: 0, total: 0 },
//     sickLeave: { pending: 0, total: 0 },
//     purchaseRequisitions: { pending: 0, total: 0 },
//     buyerRequisitions: { pending: 0, inProgress: 0, quotesReceived: 0, completed: 0 },
//     quotes: { pending: 0, evaluated: 0, selected: 0 },
//     suppliers: {
//       active: 0,
//       pending: 0,
//       pending_supply_chain: 0,
//       pending_head_of_business: 0,
//       pending_finance: 0
//     },
//     purchaseOrders: { active: 0, pending: 0, delivered: 0 },
//     projects: { pending: 0, inProgress: 0, completed: 0, total: 0 },
//     actionItems: { pending: 0, total: 0 },
//     sharepoint: { pending: 0, total: 12 },
//     communications: { pending: 0, total: 0 },
//     inventory: { totalItems: 0, lowStock: 0, outOfStock: 0, totalValue: 0 },
//     fixedAssets: { totalAssets: 0, inUse: 0, overdueInspections: 0, totalValue: 0 },
//     supplierPerformance: { totalSuppliers: 0, topPerformers: 0, averageScore: 0 },
//     budgetCodes: { pending: 0, total: 0, revisions: 0, transfers: 0 },
//     salaryPayments: { currentMonth: 0, yearToDate: 0, totalProcessed: 0 },
//     contracts: { total: 0 },
//     dataMigration: { pending: 0, completed: 0, failed: 0, total: 0 },
//     debitNotes: { pending: 0, total: 0 },
//     disbursements: { pending: 0, total: 0 }
//   });

//   const [dashboardData, setDashboardData] = useState({
//     tasks: { total: 0, pending: 0, inProgress: 0, completed: 0 },
//     kpis: { overall: 0, count: 0 },
//     milestones: { total: 0, inProgress: 0, completed: 0 },
//     recentTasks: [],
//     pendingApprovals: []
//   });

//   useEffect(() => {
//     fetchDashboardStats();
//     loadDashboardData();
//   }, []);

//   const fetchDashboardStats = async () => {
//     try {
//       setLoading(true);

//       const apiCalls = [];
//       const callIndex = {};
//       const addCall = (key, promise) => {
//         callIndex[key] = apiCalls.length;
//         apiCalls.push(promise);
//       };

//       const isFinanceAdmin = user?.role === 'finance' || user?.role === 'admin';
//       const isSupplyChainAdmin = user?.role === 'supply_chain' || user?.role === 'admin';
//       const isSupervisor = user?.role === 'supervisor';

//       if (isFinanceAdmin) {
//         addCall('budgetCodes', api.get('/budget-codes/stats').catch(() => ({ data: { pending: 0, total: 0, revisions: 0, transfers: 0 } })));
//       }

//       addCall('projects', api.get('/projects/dashboard-stats').catch(() => ({ data: { pending: 0, inProgress: 0, completed: 0, total: 0 } })));
//       addCall('incidents', api.get('/incident-reports/dashboard-stats').catch(() => ({ data: { pending: 0, total: 0 } })));
//       addCall('sharepoint', api.get('/sharepoint/dashboard-stats').catch(() => ({ data: { pending: 0, total: 0 } })));

//       if (user?.role === 'admin' || user?.role === 'hr') {
//         addCall('communications', api.get('/communications/stats/dashboard').catch(() => ({ data: { drafts: 0, scheduled: 0, sent: 0 } })));
//       }

//       if (isSupervisor) {
//         addCall('cashRequests', api.get('/cash-requests/supervisor/stats').catch(() => ({ data: { pending: 0, total: 0 } })));
//         addCall('itSupport', api.get('/it-support/supervisor').catch(() => ({ data: [] })));
//         addCall('sickLeave', api.get('/sick-leave/supervisor/stats').catch(() => ({ data: { pending: 0, total: 0 } })));
//         addCall('suggestions', api.get('/suggestions/supervisor/stats').catch(() => ({ data: { pending: 0, total: 0 } })));
//       } else {
//         addCall('cashRequests', api.get('/cash-requests/dashboard-stats').catch(() => ({ data: { pending: 0, total: 0 } })));
//         addCall('itSupport', api.get('/it-support/dashboard/stats').catch(() => ({ data: { summary: { pending: 0, total: 0 } } })));
//         addCall('sickLeave', api.get('/sick-leave/dashboard-stats').catch(() => ({ data: { pending: 0, total: 0 } })));
//         addCall('suggestions', api.get('/suggestions/dashboard-stats').catch(() => ({ data: { pending: 0, total: 0 } })));
//       }

//       addCall('purchaseRequisitions', api.get('/purchase-requisitions/dashboard-stats').catch(() => ({ data: { pending: 0, total: 0 } })));

//       if (['buyer', 'admin', 'supply_chain'].includes(user?.role)) {
//         addCall('buyerDashboard', api.get('/buyer/dashboard').catch(() => ({ data: { success: false, data: { statistics: {}, statusBreakdown: { requisitions: [], quotes: [] } } } })));
//       }

//       if (user?.role === 'buyer') {
//         addCall('buyerSuppliers', api.get('/buyer/suppliers?limit=1').catch(() => ({ data: { pagination: { totalRecords: 0 } } })));
//         addCall('debitNotes', api.get('/debit-notes/dashboard-stats').catch(() => ({ data: { pending: 0, total: 0 } })));
//       }

//       let invoiceEndpoint = '/invoices/employee';
//       if (isFinanceAdmin) {
//         invoiceEndpoint = '/invoices/finance';
//       } else if (isSupervisor) {
//         invoiceEndpoint = '/invoices/supervisor/all';
//       } else if (['hr', 'it', 'buyer', 'supply_chain'].includes(user?.role)) {
//         invoiceEndpoint = '/invoices/supervisor/pending';
//       }

//       addCall('invoices', api.get(invoiceEndpoint).catch(() => ({ data: { success: false, data: [], count: 0, pagination: { total: 0 } } })));

//       if (['admin', 'supply_chain', 'finance'].includes(user?.role)) {
//         addCall('supplierApprovals', api.get('/suppliers/admin/approvals/statistics').catch(() => ({ data: { pending: 0, pending_supply_chain: 0, pending_head_of_business: 0, pending_finance: 0, approved: 0, rejected: 0, total: 0 } })));
//         addCall('contractStats', api.get('/contracts/analytics/statistics').catch(() => ({ data: { overview: { total: 0 } } })));
//       }

//       if (isSupplyChainAdmin) {
//         addCall('inventory', api.get('/inventory/dashboard').catch(() => ({ data: { data: { summary: { totalItems: 0, lowStockItems: 0, outOfStockItems: 0, totalStockValue: 0 } } } })));
//         addCall('assets', api.get('/fixed-assets/dashboard').catch(() => ({ data: { data: { summary: { totalAssets: 0, inUseAssets: 0, overdueInspections: 0 }, valuation: { totalCurrentValue: 0 } } } })));
//         addCall('supplierPerformance', api.get('/supplier-performance/rankings?limit=10').catch(() => ({ data: { data: { rankings: [], summary: { totalSuppliers: 0, averageScore: 0 } } } })));
//         addCall('purchaseOrders', api.get('/buyer/purchase-orders/supply-chain/stats').catch(() => ({ data: { pendingAssignment: 0, assignedToday: 0, rejectedToday: 0, inApprovalChain: 0 } })));
//       }

//       addCall('actionItems', api.get('/action-items/stats').catch(() => ({ data: { success: false, data: { total: 0, completed: 0 } } })));

//       if (isFinanceAdmin) {
//         addCall('salaryDashboard', api.get('/salary-payments/dashboard-stats').catch(() => ({ data: { success: false, data: { currentMonth: 0, yearToDate: 0, recentPayments: [] } } })));
//         addCall('salaryPayments', api.get('/salary-payments?status=processed').catch(() => ({ data: { success: false, count: 0, data: [] } })));
//         addCall('disbursements', api.get('/disbursements/dashboard-stats').catch(() => ({ data: { pending: 0, total: 0 } })));
//       }

//       const responses = await Promise.allSettled(apiCalls);
//       const getResponse = (key, fallback) => {
//         const idx = callIndex[key];
//         if (idx === undefined) return fallback;
//         const result = responses[idx];
//         if (!result || result.status !== 'fulfilled') return fallback;
//         return result.value?.data ?? fallback;
//       };
//       const unwrapPayload = (payload, fallback) => {
//         if (payload && typeof payload === 'object' && Object.prototype.hasOwnProperty.call(payload, 'data')) {
//           return payload.data ?? fallback;
//         }
//         return payload ?? fallback;
//       };

//       const projectStats = unwrapPayload(getResponse('projects', { data: { pending: 0, inProgress: 0, completed: 0, total: 0 } }), { pending: 0, inProgress: 0, completed: 0, total: 0 });
//       const incidentStats = unwrapPayload(getResponse('incidents', { data: { pending: 0, total: 0 } }), { pending: 0, total: 0 });
//       const sharepointStats = unwrapPayload(getResponse('sharepoint', { data: { pending: 0, total: 0 } }), { pending: 0, total: 0 });
//       const communicationsData = unwrapPayload(getResponse('communications', { data: { drafts: 0, scheduled: 0, sent: 0 } }), { drafts: 0, scheduled: 0, sent: 0 });
//       const communicationsStats = { pending: (communicationsData.drafts || 0) + (communicationsData.scheduled || 0), total: communicationsData.sent || 0 };
//       const budgetCodesData = unwrapPayload(getResponse('budgetCodes', { data: { pending: 0, total: 0, revisions: 0, transfers: 0 } }), { pending: 0, total: 0, revisions: 0, transfers: 0 });
//       const budgetCodesStats = { pending: budgetCodesData.pending || 0, total: budgetCodesData.total || 0, revisions: budgetCodesData.revisions || 0, transfers: budgetCodesData.transfers || 0 };
//       const cashStats = unwrapPayload(getResponse('cashRequests', { data: { pending: 0, total: 0 } }), { pending: 0, total: 0 });
//       const itSupportPayload = getResponse('itSupport', isSupervisor ? [] : { data: { summary: { pending: 0, total: 0 } } });
//       const itSupportData = isSupervisor ? itSupportPayload : unwrapPayload(itSupportPayload, { summary: { pending: 0, total: 0 } });
//       const itStats = isSupervisor
//         ? { pending: (itSupportData || []).filter(r => ['pending_supervisor', 'pending_it_review'].includes(r.status)).length, total: (itSupportData || []).length }
//         : itSupportData?.summary || { pending: 0, total: 0 };
//       const leaveStats = unwrapPayload(getResponse('sickLeave', { data: { pending: 0, total: 0 } }), { pending: 0, total: 0 });
//       const suggestionsStats = unwrapPayload(getResponse('suggestions', { data: { pending: 0, total: 0 } }), { pending: 0, total: 0 });
//       const purchaseRequisitionStats = unwrapPayload(getResponse('purchaseRequisitions', { data: { pending: 0, total: 0 } }), { pending: 0, total: 0 });
//       const buyerDashboardData = unwrapPayload(getResponse('buyerDashboard', null), null);
//       const buyerStats = buyerDashboardData?.statistics || {};
//       const buyerQuoteBreakdown = buyerDashboardData?.statusBreakdown?.quotes || [];
//       const getCountByStatus = (items, statuses) => items.reduce((sum, item) => sum + (statuses.includes(item._id) ? item.count : 0), 0);
//       const buyerRequisitionsStats = buyerDashboardData
//         ? { pending: Math.max((buyerStats.totalAssignedRequisitions || 0) - (buyerStats.inProgressRequisitions || 0) - (buyerStats.completedRequisitions || 0), 0), inProgress: buyerStats.inProgressRequisitions || 0, quotesReceived: getCountByStatus(buyerQuoteBreakdown, ['received', 'clarification_received']), completed: buyerStats.completedRequisitions || 0 }
//         : { pending: 0, inProgress: 0, quotesReceived: 0, completed: 0 };
//       const quotesStats = buyerDashboardData
//         ? { pending: getCountByStatus(buyerQuoteBreakdown, ['received', 'under_review', 'clarification_requested', 'clarification_received']), evaluated: getCountByStatus(buyerQuoteBreakdown, ['evaluated']), selected: getCountByStatus(buyerQuoteBreakdown, ['selected']) }
//         : { pending: 0, evaluated: 0, selected: 0 };
//       const invoiceData = getResponse('invoices', { data: [], count: 0, pagination: { total: 0 } });
//       const invoiceList = Array.isArray(invoiceData.data) ? invoiceData.data : [];
//       const invoiceTotal = invoiceData.pagination?.total ?? invoiceData.count ?? invoiceList.length ?? 0;
//       const invoicePendingStatuses = ['pending_finance_assignment', 'pending_department_approval'];
//       const invoicePending = invoiceEndpoint.includes('/supervisor/pending') ? invoiceTotal : invoiceList.filter(inv => invoicePendingStatuses.includes(inv.approvalStatus)).length;
//       const supplierApprovalData = unwrapPayload(getResponse('supplierApprovals', { data: { pending: 0, pending_supply_chain: 0, pending_head_of_business: 0, pending_finance: 0, approved: 0, rejected: 0, total: 0 } }), { pending: 0, pending_supply_chain: 0, pending_head_of_business: 0, pending_finance: 0, approved: 0, rejected: 0, total: 0 });
//       const buyerSuppliersPayload = getResponse('buyerSuppliers', { pagination: { totalRecords: 0 } });
//       const buyerSuppliersCount = buyerSuppliersPayload?.pagination?.totalRecords ?? 0;
//       const approvedSuppliersCount = supplierApprovalData.approved || 0;
//       const pendingSuppliersCount = supplierApprovalData.pending || 0;
//       const activeSuppliersCount = approvedSuppliersCount > 0 ? approvedSuppliersCount : buyerSuppliersCount;
//       const contractStatsData = unwrapPayload(getResponse('contractStats', { data: { overview: { total: 0 } } }), { overview: { total: 0 } });
//       const inventoryPayload = getResponse('inventory', { data: { summary: { totalItems: 0, lowStockItems: 0, outOfStockItems: 0, totalStockValue: 0 } } });
//       const inventorySummary = inventoryPayload?.data?.summary || inventoryPayload?.summary || { totalItems: 0, lowStockItems: 0, outOfStockItems: 0, totalStockValue: 0 };
//       const assetPayload = getResponse('assets', { data: { summary: { totalAssets: 0, inUseAssets: 0, overdueInspections: 0 }, valuation: { totalCurrentValue: 0 } } });
//       const assetSummary = assetPayload?.data?.summary || assetPayload?.summary || { totalAssets: 0, inUseAssets: 0, overdueInspections: 0 };
//       const assetValuation = assetPayload?.data?.valuation || assetPayload?.valuation || { totalCurrentValue: 0 };
//       const supplierPerformancePayload = getResponse('supplierPerformance', { data: { rankings: [], summary: { totalSuppliers: 0, averageScore: 0 } } });
//       const supplierPerformanceSummary = supplierPerformancePayload?.data?.summary || supplierPerformancePayload?.summary || { totalSuppliers: 0, averageScore: 0 };
//       const supplierPerformanceRankings = supplierPerformancePayload?.data?.rankings || supplierPerformancePayload?.rankings || [];
//       const purchaseOrderStats = unwrapPayload(getResponse('purchaseOrders', { data: { pendingAssignment: 0, inApprovalChain: 0 } }), { pendingAssignment: 0, inApprovalChain: 0 });
//       const actionItemsPayload = getResponse('actionItems', { data: { total: 0, completed: 0 } });
//       const actionItemsStats = unwrapPayload(actionItemsPayload, { total: 0, completed: 0 });
//       const actionItemsPending = Math.max((actionItemsStats.total || 0) - (actionItemsStats.completed || 0), 0);
//       const salaryDashboardPayload = getResponse('salaryDashboard', { data: { currentMonth: 0, yearToDate: 0, recentPayments: [] } });
//       const salaryDashboardData = unwrapPayload(salaryDashboardPayload, { currentMonth: 0, yearToDate: 0, recentPayments: [] });
//       const salaryPaymentsData = getResponse('salaryPayments', { count: 0, data: [] });
//       const lastPaymentDate = salaryPaymentsData?.data?.[0]?.processedAt || salaryDashboardData?.recentPayments?.[0]?.processedAt || null;
//       const debitNotesStats = unwrapPayload(getResponse('debitNotes', { data: { pending: 0, total: 0 } }), { pending: 0, total: 0 });
//       const disbursementsStats = unwrapPayload(getResponse('disbursements', { data: { pending: 0, total: 0 } }), { pending: 0, total: 0 });

//       setStats({
//         cashRequests: cashStats,
//         invoices: { pending: invoicePending || 0, total: invoiceTotal || 0 },
//         incidentReports: incidentStats,
//         itSupport: { pending: itStats.pending, total: itStats.total },
//         suggestions: { pending: suggestionsStats.pending, total: suggestionsStats.total },
//         sickLeave: { pending: leaveStats.pending, total: leaveStats.total },
//         purchaseRequisitions: { pending: purchaseRequisitionStats.pending || 0, total: purchaseRequisitionStats.total || 0 },
//         buyerRequisitions: buyerRequisitionsStats,
//         quotes: quotesStats,
//         suppliers: { active: activeSuppliersCount || 0, pending: pendingSuppliersCount || 0, pending_supply_chain: supplierApprovalData.pending_supply_chain || 0, pending_head_of_business: supplierApprovalData.pending_head_of_business || 0, pending_finance: supplierApprovalData.pending_finance || 0 },
//         purchaseOrders: { active: purchaseOrderStats.inApprovalChain || 0, pending: purchaseOrderStats.pendingAssignment || 0, delivered: 0 },
//         projects: projectStats,
//         actionItems: { pending: actionItemsPending, total: actionItemsStats.total || 0 },
//         sharepoint: sharepointStats,
//         communications: communicationsStats,
//         budgetCodes: budgetCodesStats,
//         inventory: { totalItems: inventorySummary.totalItems || 0, lowStock: inventorySummary.lowStockItems || 0, outOfStock: inventorySummary.outOfStockItems || 0, totalValue: inventorySummary.totalStockValue || 0 },
//         fixedAssets: { totalAssets: assetSummary.totalAssets || 0, inUse: assetSummary.inUseAssets || 0, overdueInspections: assetSummary.overdueInspections || 0, totalValue: assetValuation.totalCurrentValue || 0 },
//         supplierPerformance: { totalSuppliers: supplierPerformanceSummary.totalSuppliers || 0, topPerformers: supplierPerformanceRankings.filter(s => s.performanceGrade === 'A').length || 0, averageScore: supplierPerformanceSummary.averageScore || 0 },
//         salaryPayments: { currentMonth: salaryDashboardData.currentMonth || 0, yearToDate: salaryDashboardData.yearToDate || 0, totalProcessed: salaryPaymentsData.count || 0, lastPaymentDate },
//         contracts: { total: contractStatsData?.overview?.total || 0 },
//         dataMigration: { pending: 0, completed: 0, failed: 0, total: 0 },
//         debitNotes: { pending: debitNotesStats.pending || 0, total: debitNotesStats.total || 0 },
//         disbursements: { pending: disbursementsStats.pending || 0, total: disbursementsStats.total || 0 }
//       });
//     } catch (error) {
//       console.error('Error fetching dashboard stats:', error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const loadDashboardData = async () => {
//     try {
//       const promises = [];
//       promises.push(api.get('/action-items/stats').catch(() => ({ data: { success: false } })));
//       promises.push(api.get('/action-items?view=my-tasks&limit=5').catch(() => ({ data: { success: false } })));
//       if (user?.role) {
//         promises.push(api.get('/kpis/my-kpis').catch(() => ({ data: { success: false } })));
//       }
//       if (['supervisor', 'admin', 'supply_chain', 'manager', 'hr', 'it', 'hse', 'buyer', 'technical'].includes(user?.role)) {
//         promises.push(api.get('/projects/supervisor/milestones').catch(() => ({ data: { success: false } })));
//         promises.push(api.get('/action-items?view=my-approvals').catch(() => ({ data: { success: false } })));
//       }

//       const results = await Promise.allSettled(promises);
//       const newData = { tasks: { total: 0, pending: 0, inProgress: 0, completed: 0 }, kpis: { overall: 0, count: 0 }, milestones: { total: 0, inProgress: 0, completed: 0 }, recentTasks: [], pendingApprovals: [] };

//       if (results[0].status === 'fulfilled' && results[0].value.data.success) newData.tasks = results[0].value.data.data;
//       if (results[1].status === 'fulfilled' && results[1].value.data.success) newData.recentTasks = results[1].value.data.data.slice(0, 5);
//       if (results[2]?.status === 'fulfilled' && results[2].value.data.success) {
//         const kpis = results[2].value.data.data;
//         if (kpis && kpis.length > 0) {
//           const currentKPI = kpis[0];
//           if (currentKPI.kpis) {
//             const weightedAchievement = currentKPI.kpis.reduce((sum, kpi) => sum + ((kpi.achievement || 0) * kpi.weight / 100), 0);
//             newData.kpis = { overall: Math.round(weightedAchievement), count: currentKPI.kpis.length };
//           }
//         }
//       }
//       if (results[3]?.status === 'fulfilled' && results[3].value.data.success) {
//         const milestones = results[3].value.data.data;
//         newData.milestones = { total: milestones.length, inProgress: milestones.filter(m => m.milestone.status === 'In Progress').length, completed: milestones.filter(m => m.milestone.status === 'Completed').length };
//       }
//       if (results[4]?.status === 'fulfilled' && results[4].value.data.success) {
//         const approvals = results[4].value.data.data;
//         newData.pendingApprovals = approvals.filter(t => t.status === 'Pending Approval' || t.status === 'Pending Completion Approval' || (t.assignedTo && t.assignedTo.some(a => a.completionStatus === 'submitted'))).slice(0, 5);
//       }
//       setDashboardData(newData);
//     } catch (error) {
//       console.error('Error loading dashboard:', error);
//     }
//   };

//   const toggleCardExpansion = (cardKey) => {
//     setExpandedCards(prev => ({ ...prev, [cardKey]: !prev[cardKey] }));
//   };

//   const getRoleCapabilities = (role) => {
//     const capabilities = {
//       employee: { level: 1, canView: ['all'], canManage: [], canApprove: [], hasTeamAccess: false },
//       supervisor: { level: 2, canView: ['all'], canManage: ['team-incidents', 'team-sick-leave', 'milestones', 'task-approvals'], canApprove: ['cash-requests', 'sick-leave', 'purchase-requisitions', 'tasks', 'kpis'], hasTeamAccess: true },
//       finance: { level: 3, canView: ['all'], canManage: ['cash-requests', 'invoices', 'financial-reports'], canApprove: ['cash-requests', 'invoices'], hasTeamAccess: true },
//       hr: { level: 3, canView: ['all'], canManage: ['incident-reports', 'suggestions', 'sick-leave', 'employee-welfare', 'communications'], canApprove: ['sick-leave', 'incident-reports'], hasTeamAccess: true },
//       it: { level: 3, canView: ['all'], canManage: ['it-support', 'it-inventory', 'system-maintenance'], canApprove: ['it-requests'], hasTeamAccess: true },
//       supply_chain: { level: 3, canView: ['all'], canManage: ['purchase-requisitions', 'procurement', 'vendor-management', 'inventory', 'fixed-assets', 'projects'], canApprove: ['purchase-requisitions'], hasTeamAccess: true },
//       technical: { level: 3, canView: ['all'], canManage: ['team-incidents', 'team-sick-leave', 'milestones', 'task-approvals'], canApprove: ['tasks', 'kpis'], hasTeamAccess: true },
//       buyer: { level: 3, canView: ['all'], canManage: ['assigned-requisitions', 'supplier-sourcing', 'quote-evaluation', 'purchase-orders'], canApprove: ['quotes', 'supplier-selection', 'purchase-orders'], hasTeamAccess: true },
//       admin: { level: 4, canView: ['all'], canManage: ['all'], canApprove: ['all'], hasTeamAccess: true },
//       ceo: {
//         level: 5,
//         canView: ['all'],
//         canManage: ['all'],
//         canApprove: ['all'],
//         hasTeamAccess: true
//       },
//     };
//     return capabilities[role] || capabilities.employee;
//   };

//   const getPriorityColor = (priority) => ({ 'LOW': 'green', 'MEDIUM': 'blue', 'HIGH': 'orange', 'CRITICAL': 'red' }[priority] || 'default');

//   const getStatusColor = (status) => ({ 'Not Started': 'default', 'In Progress': 'processing', 'Pending Approval': 'warning', 'Pending Completion Approval': 'cyan', 'Completed': 'success', 'Rejected': 'error' }[status] || 'default');

//   const getModuleCards = () => {
//     const userCapabilities = getRoleCapabilities(user?.role);

//     // ─────────────────────────────────────────────
//     // MODULE DEFINITIONS
//     // Each module has: key, title, description, icon, color, borderColor,
//     // stats, managementRoles, and actions keyed by role.
//     // 
//     // RULE: first 3 actions are always visible; actions 4+ collapse under
//     // "N more options". Primary (badge-worthy) actions go first.
//     // ─────────────────────────────────────────────

//     const modules = [

//       // ── 1. PETTY CASH ────────────────────────────────────────────────────
//       {
//         key: 'pettycash',
//         title: 'Petty Cash Management',
//         description: 'Manage cash requests, approvals, and justifications',
//         icon: <DollarOutlined style={{ fontSize: '48px', color: '#52c41a' }} />,
//         color: '#f6ffed',
//         borderColor: '#52c41a',
//         stats: stats.cashRequests,
//         managementRoles: ['finance', 'admin'],
//         actions: {
//           base: [
//             { label: 'My Requests', path: '/employee/cash-requests', icon: <UserOutlined /> },
//             { label: 'New Request', path: '/employee/cash-request/new', icon: <ArrowRightOutlined /> },
//             { label: 'Submit Reimbursement', path: '/employee/cash-request/reimbursement/new', icon: <FileTextOutlined /> }
//           ],
//           supervisor: [{ label: 'Team Requests', path: '/supervisor/cash-approvals', icon: <TeamOutlined />, badge: true }],
//           buyer: [{ label: 'Team Requests', path: '/supervisor/cash-approvals', icon: <TeamOutlined />, badge: true }],
//           technical: [{ label: 'Team Requests', path: '/supervisor/cash-approvals', icon: <TeamOutlined />, badge: true }],
//           hr: [{ label: 'Team Requests', path: '/supervisor/cash-approvals', icon: <TeamOutlined />, badge: true }],
//           supply_chain: [{ label: 'Team Requests', path: '/supervisor/cash-approvals', icon: <TeamOutlined />, badge: true }],
//           finance: [
//             { label: 'Finance Dashboard', path: '/finance/cash-approvals', icon: <CrownOutlined />, primary: true, badge: true },
//             { label: 'Team Cash Requests', path: '/supervisor/cash-approvals', icon: <TeamOutlined />, badge: true },
//             { label: 'All Requests', path: '/finance/cash-management', icon: <BarChartOutlined /> },
//             { label: 'Financial Reports', path: '/finance/cash-reports', icon: <FileTextOutlined /> }
//           ],
//           admin: [
//             { label: 'Admin Dashboard', path: '/admin/cash-approvals', icon: <SettingOutlined />, primary: true },
//             { label: 'Team Requests', path: '/supervisor/cash-approvals', icon: <TeamOutlined />, badge: true },
//             { label: 'System Analytics', path: '/admin/cash-analytics', icon: <BarChartOutlined /> },
//             { label: 'User Management', path: '/admin/cash-users', icon: <TeamOutlined /> }
//           ],
//           ceo: [
//             { label: 'Cash Overview',      path: '/admin/cash-approvals',   icon: <EyeOutlined />,      primary: true },
//             { label: 'Final Approvals',    path: '/admin/head-approval',    icon: <CrownOutlined />,    badge: true },
//             { label: 'Cash Analytics',     path: '/admin/cash-analytics',   icon: <BarChartOutlined /> },
//             { label: 'Financial Reports',  path: '/finance/cash-reports',   icon: <FileTextOutlined /> },
//           ],
//         }
//       },

//       // ── 2. PROJECT MANAGEMENT ─────────────────────────────────────────────
//       {
//         key: 'project-management',
//         title: 'Project Management',
//         description: 'Create and manage organizational projects, track progress, allocate resources, and monitor timelines',
//         icon: <ProjectOutlined style={{ fontSize: '48px', color: '#13c2c2' }} />,
//         color: '#e6fffb',
//         borderColor: '#13c2c2',
//         stats: stats.projects,
//         managementRoles: ['supply_chain', 'supervisor', 'admin', 'project'],
//         actions: {
//           // Roles that only have milestone/task access share this base set
//           _milestones_base: [
//             { label: 'My Milestones', path: '/supervisor/milestones', icon: <FlagOutlined />, primary: true, badge: true },
//             { label: 'Task Approvals', path: '/supervisor/action-items', icon: <CheckCircleOutlined />, badge: true },
//             { label: 'KPI Approvals', path: '/supervisor/kpi-approvals', icon: <TrophyOutlined /> },
//             { label: 'Project Plan Approvals', path: '/supervisor/project-plan-approvals', icon: <ScheduleOutlined />, badge: true },
//             { label: 'Progress Reports', path: '/supervisor/', icon: <BarChartOutlined /> }
//           ],
//           employee: [
//             { label: 'My Milestones', path: '/supervisor/milestones', icon: <FlagOutlined />, primary: true, badge: true },
//             { label: 'Task Approvals', path: '/supervisor/action-items', icon: <CheckCircleOutlined />, badge: true },
//             { label: 'KPI Approvals', path: '/supervisor/kpi-approvals', icon: <TrophyOutlined /> },
//             { label: 'Project Plan Approvals', path: '/supervisor/project-plan-approvals', icon: <ScheduleOutlined />, badge: true }
//           ],
//           supervisor: [
//             { label: 'My Milestones', path: '/supervisor/milestones', icon: <FlagOutlined />, primary: true, badge: true },
//             { label: 'Task Approvals', path: '/supervisor/action-items', icon: <CheckCircleOutlined />, badge: true },
//             { label: 'KPI Approvals', path: '/supervisor/kpi-approvals', icon: <TrophyOutlined /> },
//             { label: 'Project Plan Approvals', path: '/supervisor/project-plan-approvals', icon: <ScheduleOutlined />, badge: true },
//             { label: 'Progress Reports', path: '/supervisor/projects/reports', icon: <BarChartOutlined /> }
//           ],
//           supply_chain: [
//             { label: 'My Milestones', path: '/supervisor/milestones', icon: <FlagOutlined />, primary: true, badge: true },
//             { label: 'Task Approvals', path: '/supervisor/action-items', icon: <CheckCircleOutlined />, badge: true },
//             { label: 'KPI Approvals', path: '/supervisor/kpi-approvals', icon: <TrophyOutlined /> },
//             { label: 'Project Plan Approvals', path: '/supervisor/project-plan-approvals', icon: <ScheduleOutlined />, badge: true },
//             { label: 'Progress Reports', path: '/supervisor/', icon: <BarChartOutlined /> }
//           ],
//           buyer: [
//             { label: 'My Milestones', path: '/supervisor/milestones', icon: <FlagOutlined />, primary: true, badge: true },
//             { label: 'Task Approvals', path: '/supervisor/action-items', icon: <CheckCircleOutlined />, badge: true },
//             { label: 'KPI Approvals', path: '/supervisor/kpi-approvals', icon: <TrophyOutlined /> },
//             { label: 'Project Plan Approvals', path: '/supervisor/project-plan-approvals', icon: <ScheduleOutlined />, badge: true }
//           ],
//           hr: [
//             { label: 'My Milestones', path: '/supervisor/milestones', icon: <FlagOutlined />, primary: true, badge: true },
//             { label: 'Task Approvals', path: '/supervisor/action-items', icon: <CheckCircleOutlined />, badge: true },
//             { label: 'KPI Approvals', path: '/supervisor/kpi-approvals', icon: <TrophyOutlined /> },
//             { label: 'Project Plan Approvals', path: '/supervisor/project-plan-approvals', icon: <ScheduleOutlined />, badge: true }
//           ],
//           technical: [
//             { label: 'My Milestones', path: '/supervisor/milestones', icon: <FlagOutlined />, primary: true, badge: true },
//             { label: 'Task Approvals', path: '/supervisor/action-items', icon: <CheckCircleOutlined />, badge: true },
//             { label: 'KPI Approvals', path: '/supervisor/kpi-approvals', icon: <TrophyOutlined /> },
//             { label: 'Project Plan Approvals', path: '/supervisor/project-plan-approvals', icon: <ScheduleOutlined />, badge: true }
//           ],
//           finance: [
//             { label: 'My Milestones', path: '/supervisor/milestones', icon: <FlagOutlined />, primary: true, badge: true },
//             { label: 'Task Approvals', path: '/supervisor/action-items', icon: <CheckCircleOutlined />, badge: true },
//             { label: 'KPI Approvals', path: '/supervisor/kpi-approvals', icon: <TrophyOutlined /> },
//             { label: 'Project Plan Approvals', path: '/supervisor/project-plan-approvals', icon: <ScheduleOutlined />, badge: true }
//           ],
//           it: [
//             { label: 'My Milestones', path: '/supervisor/milestones', icon: <FlagOutlined />, primary: true, badge: true },
//             { label: 'Task Approvals', path: '/supervisor/action-items', icon: <CheckCircleOutlined />, badge: true },
//             { label: 'KPI Approvals', path: '/supervisor/kpi-approvals', icon: <TrophyOutlined /> },
//             { label: 'Project Plan Approvals', path: '/supervisor/project-plan-approvals', icon: <ScheduleOutlined />, badge: true }
//           ],
//           hse: [
//             { label: 'My Milestones', path: '/supervisor/milestones', icon: <FlagOutlined />, primary: true, badge: true },
//             { label: 'Task Approvals', path: '/supervisor/action-items', icon: <CheckCircleOutlined />, badge: true },
//             { label: 'KPI Approvals', path: '/supervisor/kpi-approvals', icon: <TrophyOutlined /> },
//             { label: 'Project Plan Approvals', path: '/supervisor/project-plan-approvals', icon: <ScheduleOutlined />, badge: true }
//           ],
//           project: [
//             { label: 'Project Portal', path: '/project/project-management', icon: <CrownOutlined />, primary: true },
//             { label: 'Create Project', path: '/project/projects/new', icon: <PlusOutlined /> },
//             { label: 'My Milestones', path: '/supervisor/milestones', icon: <FlagOutlined />, badge: true },
//             { label: 'Task Approvals', path: '/supervisor/action-items', icon: <CheckCircleOutlined />, badge: true },
//             { label: 'KPI Approvals', path: '/supervisor/kpi-approvals', icon: <TrophyOutlined /> },
//             { label: 'Project Plan Approvals', path: '/supervisor/project-plan-approvals', icon: <ScheduleOutlined />, badge: true },
//             { label: 'Project Analytics', path: '/project/projects/analytics', icon: <BarChartOutlined /> }
//           ],
//           admin: [
//             { label: 'Admin Dashboard', path: '/admin/project-management', icon: <SettingOutlined />, primary: true },
//             { label: 'PM Milestone Review', path: '/admin/pm/milestone-review', icon: <CheckCircleOutlined />, badge: true },
//             { label: 'All Projects', path: '/admin/projects', icon: <ProjectOutlined /> },
//             { label: 'My Milestones', path: '/supervisor/milestones', icon: <FlagOutlined />, badge: true },
//             { label: 'Task Approvals', path: '/supervisor/action-items', icon: <CheckCircleOutlined />, badge: true },
//             { label: 'KPI Approvals', path: '/supervisor/kpi-approvals', icon: <TrophyOutlined /> },
//             { label: 'Project Plan Approvals', path: '/supervisor/project-plan-approvals', icon: <ScheduleOutlined />, badge: true },
//             { label: 'Project Analytics', path: '/admin/projects/analytics', icon: <BarChartOutlined /> },
//             { label: 'Resource Planning', path: '/admin/projects/resources', icon: <TeamOutlined /> }
//           ],
//           ceo: [
//             { label: 'All Projects',       path: '/admin/projects',              icon: <ProjectOutlined />,  primary: true },
//             { label: 'Project Analytics',  path: '/admin/projects/analytics',    icon: <BarChartOutlined /> },
//             { label: 'PM Milestone Review',path: '/admin/pm/milestone-review',   icon: <FlagOutlined />,     badge: true },
//             { label: 'KPI Overview',       path: '/supervisor/kpi-approvals',    icon: <TrophyOutlined /> },
//             { label: 'Performance Reports',path: '/admin/analytics',             icon: <FundOutlined /> },
//           ],
//         }
//       },

//       // ── 3. PURCHASE REQUISITIONS ──────────────────────────────────────────
//       {
//         key: 'purchase-requisitions',
//         title: 'Purchase Requisitions',
//         description: user?.role === 'buyer'
//           ? 'Manage assigned requisitions, source suppliers, and handle procurement workflow'
//           : 'Request procurement through enhanced approval workflow with finance verification and buyer assignment',
//         icon: <ShoppingCartOutlined style={{ fontSize: '48px', color: '#722ed1' }} />,
//         color: '#f9f0ff',
//         borderColor: '#722ed1',
//         stats: user?.role === 'buyer' ? stats.buyerRequisitions : stats.purchaseRequisitions,
//         managementRoles: ['finance', 'supply_chain', 'buyer', 'hr', 'it', 'admin', 'employee'],
//         actions: {
//           base: [
//             { label: 'My Requisitions', path: '/employee/purchase-requisitions', icon: <UserOutlined /> },
//             { label: 'New Requisition', path: '/employee/purchase-requisitions/new', icon: <ArrowRightOutlined /> },
//             { label: 'Request Items', path: '/employee/item-requests', icon: <PlusOutlined /> }
//           ],
//           supervisor: [
//             { label: 'Team Requisitions', path: '/supervisor/purchase-requisitions', icon: <TeamOutlined />, badge: true },
//             { label: 'PO Approvals', path: '/supervisor/po-approvals', icon: <ShoppingCartOutlined />, badge: true },
//             { label: 'Request Items', path: '/employee/item-requests', icon: <PlusOutlined /> }
//           ],
//           technical: [
//             { label: 'Team Requisitions', path: '/supervisor/purchase-requisitions', icon: <TeamOutlined />, badge: true },
//             { label: 'PO Approvals', path: '/supervisor/po-approvals', icon: <ShoppingCartOutlined />, badge: true }
//           ],
//           finance: [
//             { label: 'Budget Verification', path: '/finance/purchase-requisitions', icon: <CrownOutlined />, primary: true, badge: true },
//             { label: 'Team Requisitions', path: '/supervisor/purchase-requisitions', icon: <TeamOutlined />, badge: true },
//             { label: 'PO Approvals', path: '/supervisor/po-approvals', icon: <ShoppingCartOutlined />, badge: true },
//             { label: 'Request Items', path: '/employee/item-requests', icon: <PlusOutlined /> },
//             { label: 'Finance Dashboard', path: '/finance/dashboard', icon: <BankOutlined /> }
//           ],
//           hr: [
//             { label: 'Team Requisitions', path: '/supervisor/purchase-requisitions', icon: <TeamOutlined />, badge: true },
//             { label: 'PO Approvals', path: '/supervisor/po-approvals', icon: <ShoppingCartOutlined />, badge: true },
//             { label: 'Request Items', path: '/employee/item-requests', icon: <PlusOutlined /> }
//           ],
//           it: [
//             { label: 'Team Requisitions', path: '/supervisor/purchase-requisitions', icon: <TeamOutlined />, badge: true },
//             { label: 'PO Approvals', path: '/supervisor/po-approvals', icon: <ShoppingCartOutlined />, badge: true },
//             { label: 'Request Items', path: '/employee/item-requests', icon: <PlusOutlined /> }
//           ],
//           supply_chain: [
//             { label: 'SC Dashboard', path: '/supply-chain/requisitions', icon: <CrownOutlined />, primary: true, badge: true },
//             { label: 'PO Assignment', path: '/supply-chain/purchase-orders', icon: <FileTextOutlined />, badge: true },
//             { label: 'Head Approval', path: '/supply-chain/head-approval', icon: <CheckCircleOutlined />, badge: true },
//             { label: 'Team Requisitions', path: '/supervisor/purchase-requisitions', icon: <TeamOutlined />, badge: true },
//             { label: 'Pending PO Assignment', path: '/supply-chain/purchase-orders/pending', icon: <ClockCircleOutlined />, badge: true },
//             { label: 'Active POs', path: '/supply-chain/purchase-orders?status=active', icon: <CheckCircleOutlined /> },
//             { label: 'Item Management', path: '/supply-chain/item-management', icon: <DatabaseOutlined /> },
//             { label: 'Contract Management', path: '/supply-chain/contracts', icon: <FileTextOutlined /> },
//             { label: 'PO Approvals', path: '/supervisor/po-approvals', icon: <ShoppingCartOutlined />, badge: true },
//             { label: 'Clean Data / Migration', path: '/supply-chain/data-migration-validator', icon: <FilterOutlined /> }
//           ],
//           buyer: [
//             { label: 'My Assignments', path: '/buyer/requisitions', icon: <CrownOutlined />, primary: true, badge: true },
//             { label: 'Petty Cash Forms', path: '/buyer/petty-cash', icon: <FileTextOutlined />, badge: true },
//             { label: 'PO Approvals', path: '/supervisor/po-approvals', icon: <ShoppingCartOutlined />, badge: true }
//           ],
//           employee: [
//             { label: 'My Requisitions', path: '/employee/purchase-requisitions', icon: <UserOutlined /> },
//             { label: 'New Requisition', path: '/employee/purchase-requisitions/new', icon: <ArrowRightOutlined /> },
//             { label: 'Request Items', path: '/employee/item-requests', icon: <PlusOutlined /> },
//             { label: 'PO Approvals', path: '/supervisor/po-approvals', icon: <ShoppingCartOutlined />, badge: true }
//           ],
//           admin: [
//             { label: 'Admin Dashboard', path: '/admin/purchase-requisitions', icon: <SettingOutlined />, primary: true },
//             { label: 'Head Approval', path: '/admin/head-approval', icon: <CheckCircleOutlined />, badge: true },
//             { label: 'Team Requisitions', path: '/supervisor/purchase-requisitions', icon: <TeamOutlined />, badge: true },
//             { label: 'PO Approvals', path: '/supervisor/po-approvals', icon: <ShoppingCartOutlined />, badge: true },
//             { label: 'Clean Data / Migration', path: '/supply-chain/data-migration-validator', icon: <FilterOutlined /> },
//             { label: 'Report Generation', path: '/admin/reports', icon: <FileTextOutlined /> }
//           ],
//           ceo: [
//             { label: 'Requisitions Overview', path: '/admin/purchase-requisitions', icon: <EyeOutlined />,     primary: true },
//             { label: 'Final Approvals',       path: '/admin/head-approval',         icon: <CrownOutlined />,   badge: true },
//             { label: 'PO Approvals',          path: '/supervisor/po-approvals',     icon: <CheckCircleOutlined />, badge: true },
//             { label: 'Procurement Reports',   path: '/admin/analytics',             icon: <BarChartOutlined /> },
//           ],
//         }
//       },

//       // ── 4. PROCUREMENT MANAGEMENT (buyer / admin) ─────────────────────────
//       ...(user?.role === 'buyer' || user?.role === 'admin' || user?.role === 'ceo' ? [{
//         key: 'buyer-procurement',
//         title: 'Procurement Management',
//         description: 'Comprehensive procurement: sourcing, quotes, purchase orders, debit notes & delivery tracking',
//         icon: <SolutionOutlined style={{ fontSize: '48px', color: '#fa8c16' }} />,
//         color: '#fff7e6',
//         borderColor: '#fa8c16',
//         stats: stats.quotes,
//         managementRoles: ['buyer', 'admin'],
//         actions: {
//           buyer: [
//             { label: 'Procurement Dashboard', path: '/buyer/dashboard', icon: <CrownOutlined />, primary: true },
//             { label: 'Quote Evaluation', path: '/buyer/quotes', icon: <BarChartOutlined />, badge: true },
//             // Debit Notes nested here as per requirement
//             { label: 'Debit Notes', path: '/buyer/debit-notes', icon: <AuditOutlined />, badge: stats.debitNotes?.pending > 0 },
//             { label: 'Delivery Tracking', path: '/buyer/deliveries', icon: <CarOutlined /> },
//             { label: 'Debit Note Approvals', path: '/supervisor/debit-note-approvals', icon: <CheckCircleOutlined />, badge: true },
//             { label: 'Performance Analytics', path: '/buyer/analytics/performance', icon: <FundOutlined /> }
//           ],
//           admin: [
//             { label: 'Buyer Performance', path: '/admin/buyer-analytics', icon: <BarChartOutlined />, primary: true },
//             { label: 'Procurement Reports', path: '/admin/procurement-reports', icon: <FileTextOutlined /> },
//             { label: 'Delivery Tracking', path: '/buyer/deliveries', icon: <CarOutlined /> },
//             { label: 'Debit Note Approvals', path: '/supervisor/debit-note-approvals', icon: <AuditOutlined />, badge: true },
//             { label: 'Buyer Management', path: '/admin/buyer-management', icon: <TeamOutlined /> }
//           ],
//           ceo: [
//             { label: 'Procurement Overview', path: '/admin/analytics',             icon: <EyeOutlined />,     primary: true },
//             { label: 'Buyer Performance',    path: '/admin/buyer-analytics',        icon: <BarChartOutlined /> },
//             { label: 'Delivery Tracking',    path: '/buyer/deliveries',             icon: <CarOutlined /> },
//             { label: 'Debit Note Overview',  path: '/supervisor/debit-note-approvals', icon: <AuditOutlined />, badge: true },
//           ],
//         }
//       }] : []),

//       // ── 5. SUPPLIER MANAGEMENT ────────────────────────────────────────────
//       ...(user?.role === 'buyer' || user?.role === 'finance' || user?.role === 'admin' || user?.role === 'supply_chain' || user?.role === 'ceo' ? [{
//         key: 'supplier-management',
//         title: 'Supplier Management',
//         description: user?.role === 'finance'
//           ? 'Complete supplier lifecycle: registration, approvals, contracts, invoices, and performance'
//           : user?.role === 'supply_chain'
//           ? 'Supplier approval workflow: Review and approve new supplier applications'
//           : user?.role === 'admin'
//           ? 'Supplier approvals and system administration'
//           : 'View and manage supplier approvals',
//         icon: <ContactsOutlined style={{ fontSize: '48px', color: '#eb2f96' }} />,
//         color: '#fff0f6',
//         borderColor: '#eb2f96',
//         stats: {
//           total: (stats.suppliers?.active || 0) + (stats.suppliers?.pending || 0),
//           active: stats.suppliers?.active || 0,
//           pending: stats.suppliers?.pending || 0,
//           myPending: user?.role === 'supply_chain'
//             ? stats.suppliers?.pending_supply_chain || 0
//             : user?.role === 'finance'
//             ? stats.suppliers?.pending_finance || 0
//             : stats.suppliers?.pending || 0,
//           contracts: stats.contracts?.total || 0
//         },
//         managementRoles: ['finance', 'admin'],
//         actions: {
//           finance: [
//             { label: 'Supplier Approvals', path: '/finance/supplier-approvals', icon: <CheckCircleOutlined />, primary: true, badge: true },
//             { label: 'Supplier Portal', path: '/finance/supplier-management', icon: <CrownOutlined /> },
//             { label: 'Active Suppliers', path: '/finance/suppliers?status=active', icon: <ShopOutlined /> },
//             { label: 'Pending Approval', path: '/finance/suppliers?status=pending', icon: <ClockCircleOutlined />, badge: true },
//             { label: 'Contracts Management', path: '/finance/contracts', icon: <FileTextOutlined /> },
//             { label: 'Performance Tracking', path: '/finance/supplier-performance', icon: <StarOutlined /> },
//             { label: 'Bulk Import', path: '/finance/suppliers/bulk-import', icon: <UploadOutlined /> }
//           ],
//           supply_chain: [
//             { label: 'My Approvals', path: '/supply-chain/supplier-approvals', icon: <CheckCircleOutlined />, primary: true, badge: true },
//             { label: 'Pending Review', path: '/supply-chain/supplier-approvals/pending', icon: <ClockCircleOutlined />, badge: true },
//             { label: 'Approval Statistics', path: '/supply-chain/supplier-approvals/statistics', icon: <BarChartOutlined /> }
//           ],
//           admin: [
//             { label: 'Supplier Approvals', path: '/admin/supplier-approvals', icon: <CheckCircleOutlined />, primary: true, badge: true },
//             { label: 'Admin Dashboard', path: '/admin/suppliers', icon: <SettingOutlined /> },
//             { label: 'Supplier Database', path: '/admin/suppliers', icon: <DatabaseOutlined /> },
//             { label: 'Approval Dashboard', path: '/admin/supplier-approvals/dashboard', icon: <DashboardOutlined /> },
//             { label: 'System Analytics', path: '/admin/suppliers/analytics', icon: <BarChartOutlined /> }
//           ],
//           buyer: [
//             { label: 'View Suppliers', path: '/buyer/suppliers', icon: <ShopOutlined />, primary: true },
//             { label: 'Active Suppliers', path: '/buyer/suppliers?status=active', icon: <CheckCircleOutlined /> },
//             { label: 'Supplier Performance', path: '/buyer/supplier-performance', icon: <StarOutlined /> }
//           ],
//           ceo: [
//             { label: 'Supplier Overview',    path: '/admin/suppliers',             icon: <EyeOutlined />,     primary: true },
//             { label: 'Approval Dashboard',   path: '/admin/supplier-approvals',    icon: <CrownOutlined />,   badge: true },
//             { label: 'Performance Tracking', path: '/supply-chain/supplier-performance', icon: <StarOutlined /> },
//             { label: 'Contract Analytics',   path: '/supply-chain/contracts',      icon: <FileTextOutlined /> },
//           ],
//         }
//       }] : []),

//       // ── 6. INVOICE MANAGEMENT ─────────────────────────────────────────────
//       {
//         key: 'invoices',
//         title: 'Invoice & Debit Note Management',
//         description: user?.role === 'supply_chain'
//           ? 'Review and assign supplier invoices; manage debit notes and employee invoice approvals'
//           : user?.role === 'buyer'
//           ? 'Track invoices and manage debit notes for supplier disputes'
//           : 'Upload, track, and approve invoice submissions; manage debit note adjustments',
//         icon: <FileTextOutlined style={{ fontSize: '48px', color: '#1890ff' }} />,
//         color: '#f0f8ff',
//         borderColor: '#1890ff',
//         stats: stats.invoices,
//         managementRoles: ['finance', 'supply_chain', 'admin'],
//         actions: {
//           base: [
//             { label: 'My Invoices', path: '/employee/invoices', icon: <UserOutlined /> }
//           ],
//           supervisor: [
//             { label: 'Team Invoices', path: '/supervisor/invoice-approvals', icon: <TeamOutlined />, badge: true },
//             { label: 'Debit Note Approvals', path: '/supervisor/debit-note-approvals', icon: <AuditOutlined />, badge: true }
//           ],
//           buyer: [
//             { label: 'Team Invoices', path: '/supervisor/invoice-approvals', icon: <TeamOutlined />, badge: true },
//             // Debit notes nested inside Invoices card for buyer per requirement
//             { label: 'Debit Notes', path: '/buyer/debit-notes', icon: <AuditOutlined />, badge: stats.debitNotes?.pending > 0 },
//             { label: 'Debit Note Approvals', path: '/supervisor/debit-note-approvals', icon: <CheckCircleOutlined />, badge: true }
//           ],
//           supply_chain: [
//             { label: 'Supplier Invoice Hub', path: '/supply-chain/supplier-invoices', icon: <CrownOutlined />, primary: true, badge: true },
//             { label: 'Pending Assignment', path: '/supply-chain/supplier-invoices?status=pending', icon: <ClockCircleOutlined />, badge: true },
//             { label: 'In Approval Chain', path: '/supply-chain/supplier-invoices?status=in_approval', icon: <CheckCircleOutlined /> },
//             { label: 'Team Invoices', path: '/supervisor/invoice-approvals', icon: <TeamOutlined />, badge: true },
//             { label: 'Debit Note Approvals', path: '/supervisor/debit-note-approvals', icon: <AuditOutlined />, badge: true }
//           ],
//           finance: [
//             { label: 'Prepare Invoice', path: '/finance/prepare-invoice', icon: <PlusOutlined />, primary: true },
//             { label: 'Invoice Dashboard', path: '/finance/invoice-management', icon: <CrownOutlined />, badge: true },
//             { label: 'Final Approvals', path: '/finance/invoice-management?tab=pending_finance_approval', icon: <CheckCircleOutlined />, badge: true },
//             { label: 'Team Invoices', path: '/supervisor/invoice-approvals', icon: <TeamOutlined />, badge: true },
//             { label: 'Debit Note Approvals', path: '/supervisor/debit-note-approvals', icon: <AuditOutlined />, badge: true },
//             { label: 'Payment Processing', path: '/finance/payments', icon: <DollarOutlined /> },
//             { label: 'Invoice Analytics', path: '/finance/invoice-analytics', icon: <BarChartOutlined /> }
//           ],
//           hr: [
//             { label: 'Team Invoices', path: '/supervisor/invoice-approvals', icon: <TeamOutlined />, badge: true },
//             { label: 'Debit Note Approvals', path: '/supervisor/debit-note-approvals', icon: <AuditOutlined />, badge: true }
//           ],
//           it: [
//             { label: 'Team Invoices', path: '/supervisor/invoice-approvals', icon: <TeamOutlined />, badge: true },
//             { label: 'Debit Note Approvals', path: '/supervisor/debit-note-approvals', icon: <AuditOutlined />, badge: true }
//           ],
//           technical: [
//             { label: 'Team Invoices', path: '/supervisor/invoice-approvals', icon: <TeamOutlined />, badge: true },
//             { label: 'Debit Note Approvals', path: '/supervisor/debit-note-approvals', icon: <AuditOutlined />, badge: true }
//           ],
//           admin: [
//             { label: 'Admin Dashboard', path: '/admin/invoice-management', icon: <SettingOutlined />, primary: true },
//             { label: 'Debit Note Approvals', path: '/supervisor/debit-note-approvals', icon: <AuditOutlined />, badge: true },
//             { label: 'Supply Chain View', path: '/supply-chain/supplier-invoices', icon: <ShopOutlined /> },
//             { label: 'Finance View', path: '/finance/invoice-management', icon: <BankOutlined /> },
//             { label: 'Team Invoices', path: '/supervisor/invoice-approvals', icon: <TeamOutlined />, badge: true }
//           ],
//           ceo: [
//             { label: 'Invoice Overview',     path: '/admin/invoice-management',    icon: <EyeOutlined />,     primary: true },
//             { label: 'Final Approvals',      path: '/admin/head-approval',         icon: <CrownOutlined />,   badge: true },
//             { label: 'Invoice Analytics',    path: '/finance/invoice-analytics',   icon: <BarChartOutlined /> },
//             { label: 'Payment Reports',      path: '/finance/reports',             icon: <DollarOutlined /> },
//           ],
//         }
//       },

//       // ── 7. BUDGET & ACCOUNTING (finance / admin) ──────────────────────────
//       ...(user?.role === 'finance' || user?.role === 'admin' || user?.role === 'ceo' ? [{
//         key: 'budget-management',
//         title: 'Budget, Accounting & Finance',
//         description: 'Budget oversight, disbursements, accounting center, scheduled reports, and financial analytics',
//         icon: <BankOutlined style={{ fontSize: '48px', color: '#722ed1' }} />,
//         color: '#f9f0ff',
//         borderColor: '#722ed1',
//         stats: stats.budgetCodes,
//         managementRoles: ['finance', 'admin'],
//         actions: {
//           finance: [
//             { label: 'Budget Dashboard', path: '/finance/budget-management', icon: <DashboardOutlined />, primary: true },
//             { label: 'Accounting Center', path: '/finance/accounting', icon: <AccountBookOutlined /> },
//             { label: 'Disbursements', path: '/finance/disbursements', icon: <DeliveredProcedureOutlined />, badge: stats.disbursements?.pending > 0 },
//             { label: 'Pending Approvals', path: '/finance/budget-codes', icon: <ClockCircleOutlined />, badge: true },
//             { label: 'Scheduled Reports', path: '/finance/scheduled-reports', icon: <ScheduleOutlined /> },
//             { label: 'Budget Reports', path: '/finance/budget-reports', icon: <BarChartOutlined /> },
//             { label: 'Budget Revisions', path: '/finance/budget-revisions', icon: <SwapOutlined />, badge: stats.budgetCodes.revisions > 0 },
//             { label: 'Budget Transfers', path: '/finance/budget-transfers', icon: <SwapOutlined />, badge: stats.budgetCodes.transfers > 0 },
//             { label: 'Financial Analytics', path: '/finance/budget-analytics', icon: <FundOutlined /> }
//           ],
//           admin: [
//             { label: 'Admin View', path: '/admin/budget-codes', icon: <SettingOutlined />, primary: true },
//             { label: 'Accounting Center', path: '/finance/accounting', icon: <AccountBookOutlined /> },
//             { label: 'Disbursements', path: '/finance/disbursements', icon: <DeliveredProcedureOutlined />, badge: stats.disbursements?.pending > 0 },
//             { label: 'Pending Approvals', path: '/finance/budget-codes', icon: <ClockCircleOutlined />, badge: true },
//             { label: 'Scheduled Reports', path: '/finance/scheduled-reports', icon: <ScheduleOutlined /> },
//             { label: 'Budget Analytics', path: '/admin/budget-codes/analytics', icon: <BarChartOutlined /> },
//             { label: 'Configuration', path: '/admin/budget-code-config', icon: <SettingOutlined /> }
//           ],
//           ceo: [
//             { label: 'Budget Overview',      path: '/finance/budget-management',   icon: <EyeOutlined />,     primary: true },
//             { label: 'Budget Analytics',     path: '/finance/budget-analytics',    icon: <BarChartOutlined /> },
//             { label: 'Accounting Center',    path: '/finance/accounting',          icon: <AccountBookOutlined /> },
//             { label: 'Financial Reports',    path: '/finance/budget-reports',      icon: <FileTextOutlined /> },
//             { label: 'Disbursements',        path: '/finance/disbursements',       icon: <DeliveredProcedureOutlined />, badge: stats.disbursements?.pending > 0 },
//           ],
//         }
//       }] : []),

//       // ── 8. INCIDENT REPORTS ───────────────────────────────────────────────
//       {
//         key: 'incident-reports',
//         title: 'Incident Reports',
//         description: 'Report workplace incidents - managed by HSE Coordinator',
//         icon: <ExclamationCircleOutlined style={{ fontSize: '48px', color: '#faad14' }} />,
//         color: '#fffbf0',
//         borderColor: '#faad14',
//         stats: stats.incidentReports,
//         managementRoles: ['hse', 'admin'],
//         actions: {
//           base: [
//             { label: 'My Reports', path: '/employee/incident-reports', icon: <UserOutlined /> },
//             { label: 'New Report', path: '/employee/incident-reports/new', icon: <ArrowRightOutlined /> }
//           ],
//           supervisor: [{ label: 'Department View', path: '/supervisor/incident-reports', icon: <TeamOutlined /> }],
//           technical: [{ label: 'Department View', path: '/supervisor/incident-reports', icon: <TeamOutlined /> }],
//           hse: [
//             { label: 'HSE Dashboard', path: '/hse/incident-reports', icon: <CrownOutlined />, primary: true, badge: true },
//             { label: 'New Reports', path: '/hse/incident-reports?status=submitted', icon: <FileTextOutlined />, badge: true },
//             { label: 'Under Investigation', path: '/hse/incident-reports?status=under_investigation', icon: <SearchOutlined /> },
//             { label: 'Analytics', path: '/hse/incident-analytics', icon: <BarChartOutlined /> }
//           ],
//           admin: [
//             { label: 'Admin Dashboard', path: '/admin/incident-reports', icon: <SettingOutlined />, primary: true },
//             { label: 'HSE View', path: '/hse/incident-reports', icon: <SafetyCertificateOutlined /> }
//           ],
//           ceo: [
//             { label: 'Incidents Overview',   path: '/admin/incident-reports',      icon: <EyeOutlined />,     primary: true },
//             { label: 'HSE Dashboard',        path: '/hse/incident-reports',        icon: <SafetyCertificateOutlined /> },
//             { label: 'Analytics',            path: '/hse/incident-analytics',      icon: <BarChartOutlined /> },
//           ],
//         }
//       },

//       // ── 9. IT SUPPORT ─────────────────────────────────────────────────────
//       {
//         key: 'it-support',
//         title: 'IT Support',
//         description: 'Request IT materials and report device issues',
//         icon: <LaptopOutlined style={{ fontSize: '48px', color: '#722ed1' }} />,
//         color: '#f9f0ff',
//         borderColor: '#722ed1',
//         stats: stats.itSupport,
//         managementRoles: ['it', 'admin'],
//         actions: {
//           base: [
//             { label: 'My Requests', path: '/employee/it-support', icon: <UserOutlined /> },
//             { label: 'Request Materials', path: '/employee/it-support/materials/new', icon: <ArrowRightOutlined /> },
//             { label: 'Report Issue', path: '/employee/it-support/issues/new', icon: <ExclamationCircleOutlined /> }
//           ],
//           supervisor: [{ label: 'Team IT Requests', path: '/supervisor/it-support', icon: <TeamOutlined />, badge: true }],
//           supply_chain: [{ label: 'Team IT Requests', path: '/supervisor/it-support', icon: <TeamOutlined />, badge: true }],
//           technical: [{ label: 'Team IT Requests', path: '/supervisor/it-support', icon: <TeamOutlined />, badge: true }],
//           hr: [{ label: 'Team IT Requests', path: '/supervisor/it-support', icon: <TeamOutlined />, badge: true }],
//           it: [
//             { label: 'IT Dashboard', path: '/it/support-requests', icon: <CrownOutlined />, primary: true, badge: true },
//             { label: 'Team IT Requests', path: '/it/approvals', icon: <TeamOutlined />, badge: true },
//             { label: 'Asset Management', path: '/it/asset-management', icon: <ToolOutlined /> },
//             { label: 'Inventory Control', path: '/it/inventory', icon: <BarChartOutlined /> },
//             { label: 'System Monitoring', path: '/it/system-monitoring', icon: <EyeOutlined /> },
//             { label: 'User Management', path: '/it/user-accounts', icon: <UserOutlined /> },
//             { label: 'Security Management', path: '/it/security', icon: <SafetyCertificateOutlined /> },
//             { label: 'Network Management', path: '/it/network', icon: <LaptopOutlined /> }
//           ],
//           admin: [
//             { label: 'Admin Dashboard', path: '/admin/it-support', icon: <SettingOutlined />, primary: true },
//             { label: 'Team IT Requests', path: '/supervisor/it-support', icon: <TeamOutlined />, badge: true },
//             { label: 'IT Budget', path: '/admin/it-budget', icon: <DollarOutlined /> }
//           ],
//            ceo: [
//             { label: 'IT Overview',          path: '/admin/it-support',            icon: <EyeOutlined />,     primary: true },
//             { label: 'IT Dashboard',         path: '/it/dashboard',                icon: <LaptopOutlined /> },
//             { label: 'Asset Management',     path: '/it/asset-management',         icon: <ToolOutlined /> },
//           ],
//         }
//       },

//       // ── 10. EMPLOYEE SUGGESTIONS ──────────────────────────────────────────
//       {
//         key: 'suggestions',
//         title: 'Employee Suggestions',
//         description: 'Submit anonymous suggestions and feedback',
//         icon: <BulbOutlined style={{ fontSize: '48px', color: '#13c2c2' }} />,
//         color: '#e6fffb',
//         borderColor: '#13c2c2',
//         stats: stats.suggestions,
//         managementRoles: ['hr', 'admin'],
//         actions: {
//           base: [
//             { label: 'My Suggestions', path: '/employee/suggestions', icon: <UserOutlined /> },
//             { label: 'New Suggestion', path: '/employee/suggestions/new', icon: <ArrowRightOutlined /> }
//           ],
//           supervisor: [{ label: 'Team Feedback', path: '/supervisor/team-suggestions', icon: <TeamOutlined />, badge: true }],
//           technical: [{ label: 'Team Feedback', path: '/supervisor/team-suggestions', icon: <TeamOutlined />, badge: true }],
//           hr: [
//             { label: 'HR Dashboard', path: '/hr/suggestions', icon: <CrownOutlined />, primary: true },
//             { label: 'Team Feedback', path: '/supervisor/team-suggestions', icon: <TeamOutlined />, badge: true },
//             { label: 'Feedback Analysis', path: '/hr/suggestions/analytics', icon: <BarChartOutlined /> },
//             { label: 'Implementation Tracking', path: '/hr/suggestion-implementation', icon: <CheckCircleOutlined /> },
//             { label: 'Employee Engagement', path: '/hr/employee-engagement', icon: <TeamOutlined /> },
//             { label: 'Survey Management', path: '/hr/surveys', icon: <FileTextOutlined /> },
//             { label: 'Recognition Programs', path: '/hr/recognition', icon: <CrownOutlined /> }
//           ],
//           admin: [
//             { label: 'Admin Dashboard', path: '/admin/suggestions', icon: <SettingOutlined />, primary: true },
//             { label: 'Team Feedback', path: '/supervisor/team-suggestions', icon: <TeamOutlined />, badge: true },
//             { label: 'Strategic Planning', path: '/admin/strategic-suggestions', icon: <BulbOutlined /> }
//           ],
//           ceo: [
//             { label: 'Suggestions Overview', path: '/admin/suggestions',           icon: <EyeOutlined />,     primary: true },
//             { label: 'Feedback Analytics',   path: '/hr/suggestions/analytics',   icon: <BarChartOutlined /> },
//             { label: 'Engagement Report',    path: '/hr/employee-engagement',      icon: <TeamOutlined /> },
//           ],
//         }
//       },

//       // ── 11. LEAVE REQUESTS ────────────────────────────────────────────────
//       {
//         key: 'sick-leave',
//         title: 'Leave Requests',
//         description: 'Submit and track sick leave applications',
//         icon: <MedicineBoxOutlined style={{ fontSize: '48px', color: '#f5222d' }} />,
//         color: '#fff1f0',
//         borderColor: '#f5222d',
//         stats: stats.sickLeave,
//         managementRoles: ['hr', 'supervisor', 'admin'],
//         actions: {
//           base: [
//             { label: 'My Leave Requests', path: '/employee/leave', icon: <UserOutlined /> },
//             { label: 'New Request', path: '/employee/leave/new', icon: <ArrowRightOutlined /> }
//           ],
//           supervisor: [
//             { label: 'Team Leave Dashboard', path: '/supervisor/sick-leave', icon: <CrownOutlined />, primary: true, badge: true },
//             { label: 'Approval Queue', path: '/supervisor/sick-leave/pending', icon: <ClockCircleOutlined /> },
//             { label: 'Team Calendar', path: '/supervisor/team-calendar', icon: <TeamOutlined /> }
//           ],
//           technical: [
//             { label: 'Team Leave Dashboard', path: '/supervisor/sick-leave', icon: <CrownOutlined />, primary: true, badge: true },
//             { label: 'Approval Queue', path: '/supervisor/sick-leave/pending', icon: <ClockCircleOutlined /> },
//             { label: 'Team Calendar', path: '/supervisor/team-calendar', icon: <TeamOutlined /> }
//           ],
//           hr: [
//             { label: 'HR Dashboard', path: '/hr/sick-leave', icon: <CrownOutlined />, primary: true },
//             { label: 'Team Leave', path: '/supervisor/sick-leave', icon: <TeamOutlined />, badge: true },
//             { label: 'Leave Analytics', path: '/hr/sick-leave/analytics', icon: <BarChartOutlined /> },
//             { label: 'Policy Management', path: '/hr/leave-policies', icon: <SafetyCertificateOutlined /> },
//             { label: 'Medical Certificates', path: '/hr/medical-certificates', icon: <MedicineBoxOutlined /> },
//             { label: 'Leave Balances', path: '/hr/leave-balances', icon: <CheckCircleOutlined /> },
//             { label: 'Holiday Calendar', path: '/hr/holiday-calendar', icon: <TeamOutlined /> }
//           ],
//           admin: [
//             { label: 'Admin Dashboard', path: '/admin/sick-leave', icon: <SettingOutlined />, primary: true },
//             { label: 'Team Leave', path: '/supervisor/sick-leave', icon: <TeamOutlined />, badge: true },
//             { label: 'Compliance Reports', path: '/admin/leave-compliance', icon: <FileTextOutlined /> }
//           ],
//           ceo: [
//             { label: 'Leave Overview',       path: '/admin/sick-leave',            icon: <EyeOutlined />,     primary: true },
//             { label: 'HR Dashboard',         path: '/hr/sick-leave',               icon: <MedicineBoxOutlined /> },
//             { label: 'Leave Analytics',      path: '/hr/sick-leave/analytics',     icon: <BarChartOutlined /> },
//             { label: 'Compliance Reports',   path: '/admin/leave-compliance',      icon: <SafetyCertificateOutlined /> },
//           ],
//         }
//       },

//       // ── 12. ACTION ITEMS & TASKS ──────────────────────────────────────────
//       {
//         key: 'action-items',
//         title: 'Action Items & Tasks',
//         description: 'Track and manage your daily tasks and project action items with KPI integration',
//         icon: <CheckCircleOutlined style={{ fontSize: '48px', color: '#722ed1' }} />,
//         color: '#f9f0ff',
//         borderColor: '#722ed1',
//         stats: dashboardData.tasks,
//         managementRoles: ['supply_chain', 'admin', 'finance', 'hr', 'it', 'supervisor'],
//         actions: {
//           base: [
//             { label: 'My Tasks', path: '/employee/tasks', icon: <UserOutlined /> },
//             { label: 'New Task', path: '/employee/tasks', icon: <PlusOutlined /> },
//             { label: 'My KPIs', path: '/employee/kpis', icon: <TrophyOutlined /> },
//             { label: 'Project Plans', path: '/employee/project-plans', icon: <ProjectOutlined /> }
//           ],
//           supply_chain: [
//             { label: 'Task Management', path: '/supply-chain/action-items', icon: <CrownOutlined />, primary: true, badge: true },
//             { label: 'Team Tasks', path: '/supply-chain/action-items?view=team', icon: <TeamOutlined /> },
//             { label: 'Project Tasks', path: '/supply-chain/action-items?view=projects', icon: <ProjectOutlined /> }
//           ],
//           supervisor: [
//             { label: 'Task Approvals', path: '/supervisor/action-items', icon: <CheckCircleOutlined />, primary: true, badge: true },
//             { label: 'KPI Approvals', path: '/supervisor/kpi-approvals', icon: <TrophyOutlined /> },
//             { label: 'Behavioral Evaluations', path: '/supervisor/behavioral-evaluations', icon: <UserOutlined /> },
//             { label: 'Quarterly Evaluations', path: '/supervisor/quarterly-evaluations', icon: <BarChartOutlined /> }
//           ],
//           finance: [{ label: 'Team Action Items', path: '/supervisor/action-items', icon: <TeamOutlined />, badge: true }],
//           hr: [
//             { label: 'Task Approvals', path: '/supervisor/action-items', icon: <CheckCircleOutlined />, primary: true, badge: true },
//             { label: 'KPI Approvals', path: '/supervisor/kpi-approvals', icon: <TrophyOutlined /> },
//             { label: 'Behavioral Evaluations', path: '/supervisor/behavioral-evaluations', icon: <UserOutlined /> },
//             { label: 'Quarterly Evaluations', path: '/supervisor/quarterly-evaluations', icon: <BarChartOutlined /> }
//           ],
//           technical: [
//             { label: 'Task Approvals', path: '/supervisor/action-items', icon: <CheckCircleOutlined />, primary: true, badge: true },
//             { label: 'KPI Approvals', path: '/supervisor/kpi-approvals', icon: <TrophyOutlined /> },
//             { label: 'Behavioral Evaluations', path: '/supervisor/behavioral-evaluations', icon: <UserOutlined /> },
//             { label: 'Quarterly Evaluations', path: '/supervisor/quarterly-evaluations', icon: <BarChartOutlined /> }
//           ],
//           it: [{ label: 'Team Action Items', path: '/supervisor/action-items', icon: <TeamOutlined />, badge: true }],
//           admin: [
//             { label: 'Admin Dashboard', path: '/admin/action-items', icon: <SettingOutlined />, primary: true },
//             { label: 'Team Action Items', path: '/supervisor/action-items', icon: <TeamOutlined />, badge: true }
//           ],
//           ceo: [
//             { label: 'Tasks Overview',       path: '/admin/action-items',          icon: <EyeOutlined />,     primary: true },
//             { label: 'KPI Overview',         path: '/supervisor/kpi-approvals',    icon: <TrophyOutlined /> },
//             { label: 'Performance Reports',  path: '/admin/analytics',             icon: <BarChartOutlined /> },
//           ],
//         }
//       },

//       // ── 13. PROJECT PLAN APPROVALS ────────────────────────────────────────
//       {
//         key: 'project-plans',
//         title: 'Project Plan Approvals',
//         description: 'Submit and manage weekly project plans with 3-level approval workflow',
//         icon: <ScheduleOutlined style={{ fontSize: '48px', color: '#13c2c2' }} />,
//         color: '#e6fffb',
//         borderColor: '#13c2c2',
//         stats: { pending: 0, total: 0 },
//         managementRoles: ['supervisor', 'supply_chain', 'admin', 'project'],
//         actions: {
//           base: [
//             { label: 'My Project Plans', path: '/employee/project-plans', icon: <UserOutlined /> },
//             { label: 'New Plan', path: '/employee/project-plans', icon: <PlusOutlined /> }
//           ],
//           supervisor: [
//             { label: 'Plan Approvals', path: '/supervisor/project-plan-approvals', icon: <CheckCircleOutlined />, primary: true, badge: true },
//             { label: 'My Plans', path: '/employee/project-plans', icon: <FileTextOutlined /> }
//           ],
//           project: [
//             { label: 'Plan Approvals', path: '/supervisor/project-plan-approvals', icon: <CheckCircleOutlined />, primary: true, badge: true },
//             { label: 'My Plans', path: '/employee/project-plans', icon: <FileTextOutlined /> }
//           ],
//           supply_chain: [
//             { label: 'Plan Approvals', path: '/supervisor/project-plan-approvals', icon: <CheckCircleOutlined />, primary: true, badge: true },
//             { label: 'My Plans', path: '/employee/project-plans', icon: <FileTextOutlined /> }
//           ],
//           finance: [{ label: 'My Plans', path: '/employee/project-plans', icon: <FileTextOutlined /> }],
//           hr: [
//             { label: 'Plan Approvals', path: '/supervisor/project-plan-approvals', icon: <CheckCircleOutlined />, primary: true, badge: true },
//             { label: 'My Plans', path: '/employee/project-plans', icon: <FileTextOutlined /> }
//           ],
//           technical: [
//             { label: 'Plan Approvals', path: '/supervisor/project-plan-approvals', icon: <CheckCircleOutlined />, primary: true, badge: true },
//             { label: 'My Plans', path: '/employee/project-plans', icon: <FileTextOutlined /> }
//           ],
//           it: [{ label: 'My Plans', path: '/employee/project-plans', icon: <FileTextOutlined /> }],
//           buyer: [
//             { label: 'Plan Approvals', path: '/supervisor/project-plan-approvals', icon: <CheckCircleOutlined />, primary: true, badge: true },
//             { label: 'My Plans', path: '/employee/project-plans', icon: <FileTextOutlined /> }
//           ],
//           admin: [
//             { label: 'All Plan Approvals', path: '/supervisor/project-plan-approvals', icon: <SettingOutlined />, primary: true },
//             { label: 'My Plans', path: '/employee/project-plans', icon: <FileTextOutlined /> }
//           ],
//           ceo: [
//             { label: 'Plan Overview',        path: '/supervisor/project-plan-approvals', icon: <EyeOutlined />, primary: true },
//             { label: 'Project Analytics',    path: '/admin/projects/analytics',    icon: <BarChartOutlined /> },
//           ],
//         }
//       },

//       // ── 14. FILE SHARING PORTAL ───────────────────────────────────────────
//       {
//         key: 'sharepoint',
//         title: 'File Sharing Portal',
//         description: 'Upload, organise, and share files across departments and company-wide',
//         icon: <ShareAltOutlined style={{ fontSize: '48px', color: '#667eea' }} />,
//         color: '#f0ebff',
//         borderColor: '#667eea',
//         stats: stats.sharepoint,
//         managementRoles: ['admin', 'supervisor', 'finance', 'hr', 'it', 'supply_chain', 'buyer', 'employee'],
//         actions: {
//           base: [
//             { label: 'Browse Files', path: '/sharepoint/portal', icon: <FolderOutlined /> },
//             { label: 'Upload Files', path: '/sharepoint/portal', icon: <UploadOutlined /> },
//             { label: 'My Uploads', path: '/sharepoint/my-files', icon: <FileOutlined /> }
//           ],
//           admin: [
//             { label: 'Admin Dashboard', path: '/sharepoint/admin', icon: <CrownOutlined />, primary: true },
//             { label: 'Browse Files', path: '/sharepoint/portal', icon: <FolderOutlined /> },
//             { label: 'Storage Stats', path: '/sharepoint/analytics', icon: <BarChartOutlined /> },
//             { label: 'Activity Log', path: '/sharepoint/activity', icon: <HistoryOutlined /> }
//           ],
//           ceo: [
//             { label: 'File Portal',          path: '/sharepoint/portal',           icon: <FolderOutlined />,  primary: true },
//             { label: 'Storage Analytics',    path: '/sharepoint/analytics',        icon: <BarChartOutlined /> },
//             { label: 'Activity Log',         path: '/sharepoint/activity',         icon: <HistoryOutlined /> },
//           ],
//         }
//       },

//       // ── 15. COMMUNICATIONS (admin / hr) ───────────────────────────────────
//       // ...(user?.role === 'admin' || user?.role === 'hr' ? [{
//       ...(user?.role === 'admin' || user?.role === 'hr' || user?.role === 'ceo' ? [{
//         key: 'communications',
//         title: 'Communications Portal',
//         description: 'Send company-wide announcements, policy updates, and messages to employees',
//         icon: <NotificationOutlined style={{ fontSize: '48px', color: '#fa541c' }} />,
//         color: '#fff2e8',
//         borderColor: '#fa541c',
//         stats: stats.communications,
//         managementRoles: ['admin', 'hr'],
//         actions: {
//           admin: [
//             { label: 'Communications Hub', path: '/admin/communications', icon: <CrownOutlined />, primary: true, badge: true },
//             { label: 'New Message', path: '/admin/communications/new', icon: <PlusOutlined /> },
//             { label: 'Scheduled Messages', path: '/admin/communications/scheduled', icon: <ClockCircleOutlined /> },
//             { label: 'Message History', path: '/admin/communications/history', icon: <HistoryOutlined /> },
//             { label: 'Analytics Dashboard', path: '/admin/communications/analytics', icon: <BarChartOutlined /> },
//             { label: 'Message Templates', path: '/admin/communications/templates', icon: <FileTextOutlined /> }
//           ],
//           hr: [
//             { label: 'Communications Hub', path: '/hr/communications', icon: <CrownOutlined />, primary: true, badge: true },
//             { label: 'New Message', path: '/hr/communications/new', icon: <PlusOutlined /> },
//             { label: 'Scheduled Messages', path: '/hr/communications/scheduled', icon: <ClockCircleOutlined /> },
//             { label: 'Message History', path: '/hr/communications/history', icon: <HistoryOutlined /> },
//             { label: 'Message Templates', path: '/hr/communications/templates', icon: <FileTextOutlined /> }
//           ],
//           ceo: [
//             { label: 'Communications Hub',   path: '/admin/communications',        icon: <EyeOutlined />,     primary: true },
//             { label: 'Message History',      path: '/admin/communications/history',icon: <HistoryOutlined /> },
//             { label: 'Analytics',            path: '/admin/communications/analytics', icon: <BarChartOutlined /> },
//           ],
//         }
//       }] : []),

//       // ── 16. INVENTORY MANAGEMENT (supply_chain / admin) ───────────────────
//       // ...(user?.role === 'supply_chain' || user?.role === 'admin' ? [{
//       ...(user?.role === 'supply_chain' || user?.role === 'admin' || user?.role === 'ceo' || user?.role === 'buyer' ? [{ 
//         key: 'inventory-management',
//         title: 'Inventory Management',
//         description: 'Real-time stock tracking, inbound/outbound transactions, and warehouse management',
//         icon: <DatabaseOutlined style={{ fontSize: '48px', color: '#13c2c2' }} />,
//         color: '#e6fffb',
//         borderColor: '#13c2c2',
//         stats: stats.inventory,
//         managementRoles: ['supply_chain', 'admin'],
//         actions: {
//           supply_chain: [
//             { label: 'Inventory Dashboard', path: '/supply-chain/inventory', icon: <DashboardOutlined />, primary: true },
//             { label: 'Available Stock', path: '/supply-chain/inventory?tab=overview', icon: <DatabaseOutlined /> },
//             { label: 'Record Inbound', path: '/supply-chain/inventory/inbound', icon: <InboxOutlined /> },
//             { label: 'Record Outbound', path: '/supply-chain/inventory/outbound', icon: <ShoppingOutlined /> },
//             { label: 'Reorder Alerts', path: '/supply-chain/inventory?tab=alerts', icon: <WarningOutlined />, badge: true },
//             { label: 'Stock Reports', path: '/supply-chain/inventory?tab=reports', icon: <BarChartOutlined /> },
//             { label: 'Valuation Report', path: '/supply-chain/inventory/valuation', icon: <DollarOutlined /> }
//           ],
//           admin: [
//             { label: 'Admin Dashboard', path: '/supply-chain/inventory', icon: <SettingOutlined />, primary: true },
//             { label: 'Available Stock', path: '/supply-chain/inventory?tab=overview', icon: <DatabaseOutlined /> },
//             { label: 'Stock Analytics', path: '/supply-chain/inventory?tab=reports', icon: <BarChartOutlined /> },
//             { label: 'System Settings', path: '/admin/inventory-settings', icon: <SettingOutlined /> }
//           ],
//           ceo: [
//             { label: 'Inventory Overview',   path: '/supply-chain/inventory',      icon: <EyeOutlined />,     primary: true },
//             { label: 'Stock Analytics',      path: '/supply-chain/inventory?tab=reports', icon: <BarChartOutlined /> },
//             { label: 'Valuation Report',     path: '/supply-chain/inventory/valuation', icon: <DollarOutlined /> },
//             { label: 'Reorder Alerts',       path: '/supply-chain/inventory?tab=alerts', icon: <WarningOutlined />, badge: true },
//           ],
//         }
//       }] : []),

//       // ── 17. FIXED ASSET REGISTRY (supply_chain / admin) ───────────────────
//       ...(user?.role === 'supply_chain' || user?.role === 'admin' || user?.role === 'ceo' ? [{
//         key: 'fixed-assets',
//         title: 'Fixed Asset Registry',
//         description: 'Asset tracking with barcode tags (0001-3000), depreciation, and lifecycle management',
//         icon: <BarcodeOutlined style={{ fontSize: '48px', color: '#722ed1' }} />,
//         color: '#f9f0ff',
//         borderColor: '#722ed1',
//         stats: stats.fixedAssets,
//         managementRoles: ['supply_chain', 'admin'],
//         actions: {
//           supply_chain: [
//             { label: 'Asset Registry', path: '/supply-chain/fixed-assets', icon: <BarcodeOutlined />, primary: true },
//             { label: 'Register New Asset', path: '/supply-chain/fixed-assets/register', icon: <PlusOutlined /> },
//             { label: 'Asset Dashboard', path: '/supply-chain/fixed-assets/dashboard', icon: <DashboardOutlined /> },
//             { label: 'Assign Assets', path: '/supply-chain/fixed-assets?status=active', icon: <SwapOutlined /> },
//             { label: 'Maintenance Schedule', path: '/supply-chain/fixed-assets?filter=maintenance', icon: <ToolOutlined /> },
//             { label: 'Depreciation Reports', path: '/supply-chain/fixed-assets/reports/depreciation', icon: <BarChartOutlined /> },
//             { label: 'Available Tags', path: '/supply-chain/fixed-assets/available-tags', icon: <BarcodeOutlined /> }
//           ],
//           admin: [
//             { label: 'Admin Dashboard', path: '/supply-chain/fixed-assets', icon: <SettingOutlined />, primary: true },
//             { label: 'Asset Registry', path: '/supply-chain/fixed-assets', icon: <BarcodeOutlined /> },
//             { label: 'Asset Analytics', path: '/supply-chain/fixed-assets/analytics', icon: <BarChartOutlined /> },
//             { label: 'Asset Configuration', path: '/admin/asset-settings', icon: <SettingOutlined /> }
//           ],
//           ceo: [
//             { label: 'Asset Registry',       path: '/supply-chain/fixed-assets',   icon: <EyeOutlined />,     primary: true },
//             { label: 'Asset Analytics',      path: '/supply-chain/fixed-assets/analytics', icon: <BarChartOutlined /> },
//             { label: 'Depreciation Reports', path: '/supply-chain/fixed-assets/reports/depreciation', icon: <FileTextOutlined /> },
//           ],
//         }
//       }] : []),

//       // ── 18. SUPPLIER PERFORMANCE (supply_chain / admin) ───────────────────
//       ...(user?.role === 'supply_chain' || user?.role === 'admin' || user?.role === 'ceo' ? [{
//         key: 'supplier-performance',
//         title: 'Supplier Performance',
//         description: 'Evaluate and track supplier performance metrics, rankings, and quality ratings',
//         icon: <StarOutlined style={{ fontSize: '48px', color: '#fa8c16' }} />,
//         color: '#fff7e6',
//         borderColor: '#fa8c16',
//         stats: stats.supplierPerformance,
//         managementRoles: ['supply_chain', 'admin'],
//         actions: {
//           supply_chain: [
//             { label: 'Performance Dashboard', path: '/supply-chain/supplier-performance', icon: <StarOutlined />, primary: true },
//             { label: 'Supplier Rankings', path: '/supply-chain/supplier-performance?tab=rankings', icon: <TrophyOutlined /> },
//             { label: 'New Evaluation', path: '/supply-chain/supplier-performance/evaluate', icon: <PlusOutlined /> },
//             { label: 'Evaluations', path: '/supply-chain/supplier-performance?tab=evaluations', icon: <FileTextOutlined /> },
//             { label: 'Performance Analytics', path: '/supply-chain/supplier-performance/analytics', icon: <BarChartOutlined /> },
//             { label: 'Incident Management', path: '/supply-chain/supplier-performance/incidents', icon: <WarningOutlined /> }
//           ],
//           admin: [
//             { label: 'Admin Dashboard', path: '/supply-chain/supplier-performance', icon: <SettingOutlined />, primary: true },
//             { label: 'Supplier Rankings', path: '/supply-chain/supplier-performance?tab=rankings', icon: <TrophyOutlined /> },
//             { label: 'Performance Reports', path: '/supply-chain/supplier-performance/reports', icon: <BarChartOutlined /> },
//             { label: 'System Settings', path: '/admin/supplier-settings', icon: <SettingOutlined /> }
//           ],
//           ceo: [
//             { label: 'Performance Dashboard',path: '/supply-chain/supplier-performance', icon: <EyeOutlined />, primary: true },
//             { label: 'Rankings',             path: '/supply-chain/supplier-performance?tab=rankings', icon: <TrophyOutlined /> },
//             { label: 'Performance Analytics',path: '/supply-chain/supplier-performance/analytics', icon: <BarChartOutlined /> },
//           ],
//         }
//       }] : []),

//       // ── 19. CUSTOMER & VENDOR MANAGEMENT ─────────────────────────────────
//       ...(user?.role === 'supply_chain' || user?.role === 'admin' || user?.role === 'finance' || user?.role === 'ceo' ? [{
//         key: 'customer-vendor-management',
//         title: 'Customer & Vendor Management',
//         description: 'Manage suppliers and customers — onboarding, approvals, profiles, and business relationships',
//         icon: <TeamOutlined style={{ fontSize: '48px', color: '#1890ff' }} />,
//         color: '#e6f7ff',
//         borderColor: '#1890ff',
//         stats: {
//           suppliers: stats.suppliers?.total || 0,
//           customers: stats.customers?.total || 0,
//           pending: (stats.suppliers?.pending || 0) + (stats.customers?.pending || 0)
//         },
//         managementRoles: ['supply_chain', 'admin', 'finance'],
//         actions: {
//           supply_chain: [
//             { label: 'Supplier & Customer Portal', path: '/supply-chain/customer-vendor-management', icon: <TeamOutlined />, primary: true },
//             { label: 'Add Customer', path: '/supply-chain/customer-vendor-management?tab=customers&action=add', icon: <UserOutlined /> },
//             { label: 'Add Supplier', path: '/supply-chain/supplier-management?action=add', icon: <ShopOutlined /> },
//             { label: 'Pending Approvals', path: '/supply-chain/customer-vendor-management?filter=pending', icon: <ClockCircleOutlined />, badge: true },
//             { label: 'Active Suppliers', path: '/supply-chain/customer-vendor-management?tab=suppliers&filter=approved', icon: <CheckCircleOutlined /> },
//             { label: 'Active Customers', path: '/supply-chain/customer-vendor-management?tab=customers&filter=active', icon: <CheckCircleOutlined /> }
//           ],
//           finance: [
//             { label: 'Customer & Vendor Portal', path: '/supply-chain/customer-vendor-management', icon: <TeamOutlined />, primary: true },
//             { label: 'Customer Approvals', path: '/supply-chain/customer-vendor-management?tab=customers&filter=pending', icon: <CheckCircleOutlined />, badge: true },
//             { label: 'Supplier Approvals', path: '/supply-chain/customer-vendor-management?tab=suppliers&filter=pending', icon: <CheckCircleOutlined />, badge: true },
//             { label: 'Upload Customer PO', path: '/supply-chain/customer-vendor-management?tab=customers', icon: <UploadOutlined /> },
//             { label: 'Active Customers', path: '/supply-chain/customer-vendor-management?tab=customers&filter=active', icon: <UserOutlined /> },
//             { label: 'Active Suppliers', path: '/supply-chain/customer-vendor-management?tab=suppliers&filter=approved', icon: <ShopOutlined /> }
//           ],
//           admin: [
//             { label: 'Admin Portal', path: '/supply-chain/customer-vendor-management', icon: <SettingOutlined />, primary: true },
//             { label: 'Supplier Management', path: '/supply-chain/customer-vendor-management?tab=suppliers', icon: <ShopOutlined /> },
//             { label: 'Customer Management', path: '/supply-chain/customer-vendor-management?tab=customers', icon: <UserOutlined /> },
//             { label: 'System Analytics', path: '/supply-chain/customer-vendor-analytics', icon: <BarChartOutlined /> }
//           ],
//           ceo: [
//             { label: 'Vendor Portal',        path: '/supply-chain/customer-vendor-management', icon: <EyeOutlined />, primary: true },
//             { label: 'System Analytics',     path: '/supply-chain/customer-vendor-analytics', icon: <BarChartOutlined /> },
//           ],
//         }
//       }] : []),

//       // ── 20. SALARY PAYMENT PROCESSING (finance / admin) ───────────────────
//       // ...(user?.role === 'finance' || user?.role === 'admin' ? [{
//       ...(user?.role === 'finance' || user?.role === 'admin' || user?.role === 'ceo' ? [{
//         key: 'salary-payments',
//         title: 'Salary Payment Processing',
//         description: 'Process bulk salary payments by department with budget code allocation and real-time validation',
//         icon: <WalletOutlined style={{ fontSize: '48px', color: '#13c2c2' }} />,
//         color: '#e6fffb',
//         borderColor: '#13c2c2',
//         stats: stats.salaryPayments || { currentMonth: 0, yearToDate: 0, totalProcessed: 0, lastPaymentDate: null },
//         managementRoles: ['finance', 'admin'],
//         actions: {
//           finance: [
//             { label: 'Process Payment', path: '/finance/salary-payments/new', icon: <PlusOutlined />, primary: true },
//             { label: 'Payment History', path: '/finance/salary-payments', icon: <HistoryOutlined /> },
//             { label: 'Monthly Summary', path: '/finance/salary-payments?filter=current-month', icon: <CalendarOutlined /> },
//             { label: 'Budget Overview', path: '/finance/budget-management', icon: <BankOutlined /> },
//             { label: 'Annual Report', path: '/finance/salary-payments?filter=current-year', icon: <BarChartOutlined /> }
//           ],
//           admin: [
//             { label: 'Admin View', path: '/admin/salary-payments', icon: <SettingOutlined />, primary: true },
//             { label: 'Payment History', path: '/finance/salary-payments', icon: <HistoryOutlined /> },
//             { label: 'Budget Analytics', path: '/admin/salary-analytics', icon: <BarChartOutlined /> }
//           ],
//           ceo: [
//             { label: 'Payroll Overview',     path: '/finance/salary-payments',     icon: <EyeOutlined />,     primary: true },
//             { label: 'Monthly Summary',      path: '/finance/salary-payments?filter=current-month', icon: <CalendarOutlined /> },
//             { label: 'Annual Report',        path: '/finance/salary-payments?filter=current-year',  icon: <BarChartOutlined /> },
//           ],
//         }
//       }] : []),

//       // ── 21. DATA MIGRATION (supply_chain / admin) ─────────────────────────
//       ...(user?.role === 'supply_chain' || user?.role === 'admin' ? [{
//         key: 'data-migration',
//         title: 'Data Migration',
//         description: 'Import historical data from Excel spreadsheets (Available Stock, Inbound, Outbound, Suppliers)',
//         icon: <UploadOutlined style={{ fontSize: '48px', color: '#eb2f96' }} />,
//         color: '#fff0f6',
//         borderColor: '#eb2f96',
//         stats: stats.dataMigration,
//         managementRoles: ['supply_chain', 'admin'],
//         actions: {
//           supply_chain: [
//             { label: 'Migration Tool', path: '/supply-chain/data-migration', icon: <UploadOutlined />, primary: true },
//             { label: 'Download Templates', path: '/supply-chain/data-migration?step=templates', icon: <DownloadOutlined /> },
//             { label: 'Validate Data', path: '/supply-chain/data-migration-validator', icon: <FilterOutlined /> },
//             { label: 'Migration History', path: '/supply-chain/data-migration/history', icon: <HistoryOutlined /> },
//             { label: 'Validation Reports', path: '/supply-chain/data-migration/validation', icon: <CheckCircleOutlined /> }
//           ],
//           admin: [
//             { label: 'Admin Migration', path: '/supply-chain/data-migration', icon: <SettingOutlined />, primary: true },
//             { label: 'Validate Data', path: '/supply-chain/data-migration-validator', icon: <FilterOutlined /> },
//             { label: 'Migration History', path: '/supply-chain/data-migration/history', icon: <HistoryOutlined /> },
//             { label: 'System Backup', path: '/admin/backup', icon: <DatabaseOutlined /> }
//           ]
//         }
//       }] : []),

//       // ── 22. HR MANAGEMENT (hr only — note: empty string condition fixed) ──
//       // ...(user?.role === 'hr' ? [{
//       ...(user?.role === 'hr' || user?.role === 'ceo' ? [{
//         key: 'hr-portal',
//         title: 'HR Management',
//         description: 'Manage employees, contracts, documents, and HR operations',
//         icon: <TeamOutlined style={{ fontSize: '48px', color: '#52c41a' }} />,
//         color: '#f6ffed',
//         borderColor: '#52c41a',
//         stats: stats.hrManagement || { totalEmployees: 0, activeEmployees: 0, onProbation: 0, contractsExpiring: 0, onLeave: 0, pendingDocuments: 0 },
//         managementRoles: ['hr', 'admin'],
//         actions: {
//           hr: [
//             { label: 'HR Dashboard', path: '/hr/dashboard', icon: <DashboardOutlined />, primary: true },
//             { label: 'All Employees', path: '/hr/employees', icon: <TeamOutlined /> },
//             { label: 'Add Employee', path: '/hr/employees/new', icon: <PlusOutlined /> },
//             { label: 'Contract Management', path: '/hr/contracts', icon: <FileTextOutlined />, badge: true },
//             { label: 'Document Center', path: '/hr/documents', icon: <FolderOutlined /> },
//             { label: 'Leave Management', path: '/hr/sick-leave', icon: <CalendarOutlined /> },
//             { label: 'Reports & Analytics', path: '/hr/reports', icon: <BarChartOutlined /> }
//           ],
//           ceo: [
//             { label: 'HR Dashboard',         path: '/hr/dashboard',                icon: <EyeOutlined />,     primary: true },
//             { label: 'Employee Overview',    path: '/hr/employees',                icon: <TeamOutlined /> },
//             { label: 'HR Analytics',         path: '/hr/reports',                  icon: <BarChartOutlined /> },
//             { label: 'Contract Overview',    path: '/hr/contracts',                icon: <FileTextOutlined /> },
//           ],
//         }
//       }] : []),
//       // // ── 23. LEGAL & COMPLIANCE ────────────────────────────────────────────
//       // // ...(['legal', 'admin', 'finance'].includes(user?.role) ? [{
//       // ...(['legal','admin','finance','ceo'].includes(user?.role) ? [{
//       //   key: 'legal-compliance',
//       //   title: 'Legal & Compliance',
//       //   description: 'Supplier due diligence, contract compliance, regulatory tracking, and legal risk management',
//       //   icon: <SafetyCertificateOutlined style={{ fontSize: '48px', color: '#52c41a' }} />,
//       //   color: '#f6ffed',
//       //   borderColor: '#52c41a',
//       //   stats: { pending: 0, total: 0 },
//       //   managementRoles: ['legal', 'admin', 'finance'],
//       //   actions: {
//       //     legal: [
//       //       { label: 'Legal Dashboard',        path: '/legal/dashboard',          icon: <DashboardOutlined />, primary: true },
//       //       { label: 'Due Diligence (SDD)',     path: '/legal/sdd',                icon: <AuditOutlined />,     badge: true },
//       //       { label: 'Contract Compliance',    path: '/legal/contracts',          icon: <FileTextOutlined />,  badge: true },
//       //       { label: 'Regulatory Tracker',     path: '/legal/regulatory',         icon: <SafetyCertificateOutlined /> },
//       //       { label: 'Risk Register',          path: '/legal/risks',              icon: <WarningOutlined /> },
//       //       { label: 'Legal Analytics',        path: '/legal/analytics',          icon: <BarChartOutlined /> }
//       //     ],
//       //     finance: [
//       //       { label: 'Legal Overview',         path: '/legal/dashboard',          icon: <DashboardOutlined />, primary: true },
//       //       { label: 'SDD Records',            path: '/legal/sdd',                icon: <AuditOutlined /> },
//       //       { label: 'Contract Compliance',    path: '/legal/contracts',          icon: <FileTextOutlined /> }
//       //     ],
//       //     admin: [
//       //       { label: 'Admin Legal Dashboard',  path: '/legal/dashboard',          icon: <SettingOutlined />,   primary: true },
//       //       { label: 'Due Diligence (SDD)',     path: '/legal/sdd',                icon: <AuditOutlined />,     badge: true },
//       //       { label: 'Contract Compliance',    path: '/legal/contracts',          icon: <FileTextOutlined />,  badge: true },
//       //       { label: 'Regulatory Tracker',     path: '/legal/regulatory',         icon: <SafetyCertificateOutlined /> },
//       //       { label: 'Risk Register',          path: '/legal/risks',              icon: <WarningOutlined /> },
//       //       { label: 'Legal Analytics',        path: '/legal/analytics',          icon: <BarChartOutlined /> },
//       //       { label: 'User Role Management',   path: '/admin/legal-roles',        icon: <TeamOutlined /> }
//       //     ],
//       //     // ceo: [
//       //     //   { label: 'Legal Dashboard',      path: '/legal/dashboard',             icon: <EyeOutlined />,     primary: true },
//       //     //   { label: 'Due Diligence (SDD)',  path: '/legal/sdd',                   icon: <AuditOutlined /> },
//       //     //   { label: 'Contract Compliance',  path: '/legal/contracts',             icon: <FileTextOutlined /> },
//       //     //   { label: 'Risk Register',        path: '/legal/risks',                 icon: <WarningOutlined /> },
//       //     //   { label: 'Legal Analytics',      path: '/legal/analytics',             icon: <BarChartOutlined /> },
//       //     // ],
//       //   }
//       // }] : []),
//     ];

//     // ── RENDER ────────────────────────────────────────────────────────────────
//     return modules.map(module => {
//       const hasManagementAccess = module.managementRoles.includes(user?.role);

//       // Aggregate role-specific actions on top of base actions (no duplicates)
//       const availableActions = [];
//       availableActions.push(...(module.actions.base || []));
//       if (module.actions[user?.role]) {
//         availableActions.push(...module.actions[user?.role]);
//       }

//       // Remove any duplicate paths
//       const seen = new Set();
//       const deduped = availableActions.filter(a => {
//         if (seen.has(a.path)) return false;
//         seen.add(a.path);
//         return true;
//       });

//       // Remove 'Purchase Orders' label actions kept from old code
//       const finalActions = deduped.filter(a => a.label !== 'Purchase Orders');

//       const visibleActions = finalActions.slice(0, 3);
//       const expandableActions = finalActions.slice(3);
//       const isExpanded = expandedCards[module.key];

//       const renderActionButton = (action, index, isExpandable = false) => {
//         const isPrimary = action.primary || (hasManagementAccess && !isExpandable && index === 0 && !module.actions.base?.length);
//         const showBadge = action.badge && (() => {
//           if (user?.role === 'buyer' && module.key === 'purchase-requisitions') return (module.stats.pending || 0) + (module.stats.inProgress || 0) > 0;
//           if (module.key === 'inventory-management') return module.stats.lowStock > 0;
//           if (module.key === 'fixed-assets') return module.stats.overdueInspections > 0;
//           if (module.key === 'action-items') return dashboardData.pendingApprovals.length > 0;
//           if (action.label === 'Debit Notes' || action.label === 'Debit Note Approvals') return stats.debitNotes?.pending > 0;
//           if (action.label === 'Disbursements') return stats.disbursements?.pending > 0;
//           return (module.stats.pending || 0) > 0;
//         })();

//         const badgeCount = (() => {
//           if (action.label === 'Debit Notes' || action.label === 'Debit Note Approvals') return stats.debitNotes?.pending || 0;
//           if (action.label === 'Disbursements') return stats.disbursements?.pending || 0;
//           if (user?.role === 'buyer' && module.key === 'purchase-requisitions') return (module.stats.pending || 0) + (module.stats.inProgress || 0);
//           if (module.key === 'inventory-management') return module.stats.lowStock || 0;
//           if (module.key === 'fixed-assets') return module.stats.overdueInspections || 0;
//           if (module.key === 'action-items') return dashboardData.pendingApprovals.length;
//           return module.stats.pending || 0;
//         })();

//         return (
//           <Button
//             key={`${isExpandable ? 'exp-' : ''}${index}`}
//             type={isPrimary ? 'primary' : 'default'}
//             block
//             icon={action.icon || <ArrowRightOutlined />}
//             onClick={() => navigate(action.path)}
//             style={{
//               fontSize: '12px',
//               ...(isPrimary && { backgroundColor: module.borderColor, borderColor: module.borderColor }),
//               ...(isExpandable && { opacity: 0.9 })
//             }}
//           >
//             {action.label}
//             {showBadge && (
//               <Badge count={badgeCount} style={{ marginLeft: '8px' }} size="small" />
//             )}
//           </Button>
//         );
//       };

//       return (
//         <Col xs={24} sm={24} md={12} lg={8} xl={8} key={module.key}>
//           <Card
//             hoverable
//             style={{ height: '100%', backgroundColor: module.color, border: `2px solid ${module.borderColor}`, borderRadius: '12px', position: 'relative' }}
//             bodyStyle={{ padding: '24px' }}
//           >
//             {hasManagementAccess && (
//               <div style={{ position: 'absolute', top: '12px', right: '12px', zIndex: 1 }}>
//                 <Tooltip title="You have management access to this module">
//                   <Badge count={<CrownOutlined style={{ color: '#faad14' }} />} style={{ backgroundColor: 'transparent' }} />
//                 </Tooltip>
//               </div>
//             )}

//             <div style={{ textAlign: 'center', marginBottom: '20px' }}>
//               {module.icon}
//               <Title level={4} style={{ margin: '16px 0 8px 0', color: '#333' }}>
//                 {module.title}
//                 {hasManagementAccess && <Tag color="gold" style={{ marginLeft: '8px', fontSize: '10px' }}>MANAGER</Tag>}
//               </Title>
//               <Paragraph type="secondary" style={{ margin: 0, fontSize: '12px' }}>
//                 {module.description}
//               </Paragraph>
//             </div>

//             <Divider />

//             {/* Stats rendering */}
//             {module.key === 'action-items' ? (
//               <Row gutter={[8, 8]} style={{ marginBottom: '20px' }}>
//                 <Col span={12}><Statistic title="Total" value={module.stats.total} prefix={<CheckCircleOutlined />} valueStyle={{ color: '#1890ff', fontSize: '16px' }} /></Col>
//                 <Col span={12}><Statistic title="In Progress" value={module.stats.inProgress || 0} prefix={<PlayCircleOutlined />} valueStyle={{ color: '#faad14', fontSize: '16px' }} /></Col>
//                 <Col span={24}><Statistic title="Completed" value={module.stats.completed || 0} prefix={<CheckCircleOutlined />} valueStyle={{ color: '#52c41a', fontSize: '16px' }} /></Col>
//               </Row>
//             ) : module.key === 'inventory-management' ? (
//               <Row gutter={[8, 8]} style={{ marginBottom: '20px' }}>
//                 <Col span={12}><Statistic title="Total Items" value={module.stats.totalItems} prefix={<DatabaseOutlined />} valueStyle={{ color: '#1890ff', fontSize: '16px' }} /></Col>
//                 <Col span={12}><Statistic title="Low Stock" value={module.stats.lowStock} prefix={<WarningOutlined />} valueStyle={{ color: '#faad14', fontSize: '16px' }} /></Col>
//                 <Col span={12}><Statistic title="Out of Stock" value={module.stats.outOfStock} prefix={<CloseCircleOutlined />} valueStyle={{ color: '#f5222d', fontSize: '16px' }} /></Col>
//                 <Col span={12}><Statistic title="Stock Value" value={Math.round(module.stats.totalValue / 1000)} suffix="K" prefix={<DollarOutlined />} valueStyle={{ color: '#52c41a', fontSize: '16px' }} precision={0} /></Col>
//               </Row>
//             ) : module.key === 'fixed-assets' ? (
//               <Row gutter={[8, 8]} style={{ marginBottom: '20px' }}>
//                 <Col span={12}><Statistic title="Total Assets" value={module.stats.totalAssets} prefix={<BarcodeOutlined />} valueStyle={{ color: '#1890ff', fontSize: '16px' }} /></Col>
//                 <Col span={12}><Statistic title="In Use" value={module.stats.inUse} prefix={<CheckCircleOutlined />} valueStyle={{ color: '#52c41a', fontSize: '16px' }} /></Col>
//                 <Col span={12}><Statistic title="Overdue" value={module.stats.overdueInspections} prefix={<WarningOutlined />} valueStyle={{ color: '#faad14', fontSize: '16px' }} /></Col>
//                 <Col span={12}><Statistic title="Total Value" value={Math.round(module.stats.totalValue / 1000)} suffix="K" prefix={<DollarOutlined />} valueStyle={{ color: '#722ed1', fontSize: '16px' }} precision={0} /></Col>
//               </Row>
//             ) : module.key === 'supplier-performance' ? (
//               <Row gutter={[8, 8]} style={{ marginBottom: '20px' }}>
//                 <Col span={12}><Statistic title="Total Suppliers" value={module.stats.totalSuppliers} prefix={<TeamOutlined />} valueStyle={{ color: '#1890ff', fontSize: '16px' }} /></Col>
//                 <Col span={12}><Statistic title="Top Performers" value={module.stats.topPerformers} prefix={<TrophyOutlined />} valueStyle={{ color: '#52c41a', fontSize: '16px' }} /></Col>
//                 <Col span={24}><Statistic title="Average Score" value={module.stats.averageScore} suffix="%" prefix={<StarOutlined />} valueStyle={{ color: '#fa8c16', fontSize: '16px' }} precision={1} /></Col>
//               </Row>
//             ) : module.key === 'data-migration' ? (
//               <Row gutter={[8, 8]} style={{ marginBottom: '20px' }}>
//                 <Col span={12}><Statistic title="Completed" value={module.stats.completed} prefix={<CheckCircleOutlined />} valueStyle={{ color: '#52c41a', fontSize: '16px' }} /></Col>
//                 <Col span={12}><Statistic title="Pending" value={module.stats.pending} prefix={<ClockCircleOutlined />} valueStyle={{ color: '#faad14', fontSize: '16px' }} /></Col>
//               </Row>
//             ) : user?.role === 'buyer' && module.key === 'purchase-requisitions' ? (
//               <Row gutter={[8, 8]} style={{ marginBottom: '20px' }}>
//                 <Col span={12}><Statistic title="Pending" value={module.stats.pending} prefix={<ClockCircleOutlined />} valueStyle={{ color: '#faad14', fontSize: '16px' }} /></Col>
//                 <Col span={12}><Statistic title="In Progress" value={module.stats.inProgress} prefix={<ShoppingCartOutlined />} valueStyle={{ color: '#1890ff', fontSize: '16px' }} /></Col>
//                 <Col span={12}><Statistic title="Quoted" value={module.stats.quotesReceived} prefix={<FileTextOutlined />} valueStyle={{ color: '#722ed1', fontSize: '16px' }} /></Col>
//                 <Col span={12}><Statistic title="Completed" value={module.stats.completed} prefix={<CheckCircleOutlined />} valueStyle={{ color: '#52c41a', fontSize: '16px' }} /></Col>
//               </Row>
//             ) : module.key === 'project-management' ? (
//               <Row gutter={[8, 8]} style={{ marginBottom: '20px' }}>
//                 <Col span={12}><Statistic title="Pending" value={module.stats.pending} prefix={<ClockCircleOutlined />} valueStyle={{ color: '#faad14', fontSize: '16px' }} /></Col>
//                 <Col span={12}><Statistic title="In Progress" value={module.stats.inProgress} prefix={<PlayCircleOutlined />} valueStyle={{ color: '#1890ff', fontSize: '16px' }} /></Col>
//                 <Col span={12}><Statistic title="Completed" value={module.stats.completed} prefix={<CheckCircleOutlined />} valueStyle={{ color: '#52c41a', fontSize: '16px' }} /></Col>
//                 <Col span={12}><Statistic title="Total" value={module.stats.total} prefix={<ProjectOutlined />} valueStyle={{ color: '#722ed1', fontSize: '16px' }} /></Col>
//               </Row>
//             ) : module.key === 'budget-management' ? (
//               <Row gutter={[8, 8]} style={{ marginBottom: '20px' }}>
//                 <Col span={12}><Statistic title="Pending Approvals" value={module.stats.pending} prefix={<ClockCircleOutlined />} valueStyle={{ color: '#faad14', fontSize: '16px' }} /></Col>
//                 <Col span={12}><Statistic title="Active Codes" value={module.stats.total} prefix={<BankOutlined />} valueStyle={{ color: '#1890ff', fontSize: '16px' }} /></Col>
//                 <Col span={12}><Statistic title="Revisions" value={module.stats.revisions} prefix={<SwapOutlined />} valueStyle={{ color: '#722ed1', fontSize: '16px' }} /></Col>
//                 <Col span={12}><Statistic title="Transfers" value={module.stats.transfers} prefix={<SwapOutlined />} valueStyle={{ color: '#13c2c2', fontSize: '16px' }} /></Col>
//               </Row>
//             ) : (
//               <Row gutter={[16, 16]} style={{ marginBottom: '20px' }}>
//                 <Col span={12}><Statistic title="Pending" value={module.stats.pending || 0} prefix={<ClockCircleOutlined />} valueStyle={{ color: '#faad14', fontSize: '18px' }} /></Col>
//                 <Col span={12}><Statistic title="Total" value={module.stats.total || 0} prefix={<BarChartOutlined />} valueStyle={{ color: '#1890ff', fontSize: '18px' }} /></Col>
//               </Row>
//             )}

//             <Space direction="vertical" style={{ width: '100%' }} size="small">
//               {visibleActions.map((action, index) => renderActionButton(action, index))}

//               {expandableActions.length > 0 && (
//                 <Collapse
//                   ghost
//                   activeKey={isExpanded ? ['1'] : []}
//                   onChange={() => toggleCardExpansion(module.key)}
//                   style={{ backgroundColor: 'transparent', border: 'none' }}
//                   items={[{
//                     key: '1',
//                     label: (
//                       <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: '#666', padding: '4px 0' }}>
//                         <span style={{ marginRight: '8px' }}>{expandableActions.length} more option{expandableActions.length !== 1 ? 's' : ''}</span>
//                         {isExpanded ? <UpOutlined /> : <DownOutlined />}
//                       </div>
//                     ),
//                     children: (
//                       <Space direction="vertical" style={{ width: '100%' }} size="small">
//                         {expandableActions.map((action, index) => renderActionButton(action, index, true))}
//                       </Space>
//                     ),
//                     showArrow: false
//                   }]}
//                 />
//               )}
//             </Space>
//           </Card>
//         </Col>
//       );
//     });
//   };

//   const getRoleInfo = () => {
//     const roleConfig = {
//       employee: { title: 'Employee Dashboard', description: 'Access all services and submit requests', icon: <UserOutlined />, color: '#1890ff' },
//       supervisor: { title: 'Supervisor Dashboard', description: 'All services + team management, milestone oversight, and task/KPI approvals', icon: <TeamOutlined />, color: '#52c41a' },
//       finance: { title: 'Finance Dashboard', description: 'All services + financial management and team oversight', icon: <BankOutlined />, color: '#722ed1' },
//       hr: { title: 'HR Dashboard', description: 'All services + HR management and team employee relations', icon: <SafetyCertificateOutlined />, color: '#13c2c2' },
//       it: { title: 'IT Dashboard', description: 'All services + IT infrastructure and team support management', icon: <ToolOutlined />, color: '#722ed1' },
//       supply_chain: { title: 'Supply Chain Dashboard', description: 'All services + project management, procurement, inventory, assets and team vendor management', icon: <ShoppingCartOutlined />, color: '#fa8c16' },
//       buyer: { title: 'Buyer Dashboard', description: 'All services + specialized procurement workflow management', icon: <SolutionOutlined />, color: '#eb2f96' },
//       admin: { title: 'Administrator Dashboard', description: 'Full system access and comprehensive team management', icon: <SettingOutlined />, color: '#fa541c' },
//       ceo: {
//         title: 'CEO Executive Dashboard',
//         description: 'Company-wide oversight — full read access to all modules, final approval authority on every request',
//         icon: <CrownOutlined />,
//         color: '#faad14'
//       },
//     };
//     return roleConfig[user?.role] || roleConfig.employee;
//   };

//   const roleInfo = getRoleInfo();
//   const userCapabilities = getRoleCapabilities(user?.role);

//   const getTotalPending = () => {
//     const base = Object.values(stats).reduce((sum, stat) => sum + (stat?.pending || 0), 0);
//     if (user?.role === 'buyer') return base + (stats.buyerRequisitions.pending || 0) + (stats.buyerRequisitions.inProgress || 0) + (stats.quotes.pending || 0);
//     if (user?.role === 'supply_chain' || user?.role === 'admin') return base + (stats.inventory.lowStock || 0) + (stats.fixedAssets.overdueInspections || 0);
//     if (['supervisor', 'admin', 'supply_chain', 'manager'].includes(user?.role)) return base + dashboardData.pendingApprovals.length;
//     if (user?.role === 'ceo') {
//       // CEO sees pending from every channel
//       return base
//         + (stats.buyerRequisitions?.pending || 0)
//         + (stats.buyerRequisitions?.inProgress || 0)
//         + (stats.quotes?.pending || 0)
//         + (stats.inventory?.lowStock || 0)
//         + (stats.fixedAssets?.overdueInspections || 0)
//         + dashboardData.pendingApprovals.length;
//     }
//     return base;
//   };

//   const totalPending = getTotalPending();

//   // const managementModules = ['pettycash', 'purchase-requisitions', 'buyer-procurement', 'supplier-management', 'invoices', 'incident-reports', 'it-support', 'suggestions', 'sick-leave', 'communications', 'inventory-management', 'fixed-assets', 'supplier-performance', 'data-migration', 'project-management', 'action-items', 'legal-compliance']
//   //   .filter(module => ({
//   //     'pettycash': ['finance', 'hr', 'admin'],
//   //     'purchase-requisitions': ['supply_chain', 'buyer', 'hr', 'it', 'finance', 'admin'],
//   //     'buyer-procurement': ['buyer', 'admin'],
//   //     'supplier-management': ['buyer', 'supply_chain', 'admin'],
//   //     'invoices': ['finance', 'hr', 'it', 'admin'],
//   //     'incident-reports': ['hse', 'admin'],
//   //     'it-support': ['it', 'admin'],
//   //     'suggestions': ['hr', 'admin'],
//   //     'sick-leave': ['hr', 'supervisor', 'admin'],
//   //     'communications': ['admin', 'hr'],
//   //     'inventory-management': ['supply_chain', 'admin'],
//   //     'fixed-assets': ['supply_chain', 'admin'],
//   //     'supplier-performance': ['supply_chain', 'admin'],
//   //     'data-migration': ['supply_chain', 'admin'],
//   //     'project-management': ['admin', 'supply_chain', 'supervisor', 'manager', 'hr', 'it', 'hse', 'technical', 'finance'],
//   //     'action-items': ['admin', 'supply_chain', 'supervisor', 'manager', 'hr', 'it', 'hse', 'technical', 'finance'],
//   //     'legal-compliance': ['legal', 'admin', 'finance'],
//   //   }[module] || []).includes(user?.role));

//   const managementModules = [
//     'pettycash','purchase-requisitions','buyer-procurement','supplier-management',
//     'invoices','incident-reports','it-support','suggestions','sick-leave',
//     'communications','inventory-management','fixed-assets','supplier-performance',
//     'data-migration','project-management','action-items','legal-compliance'
//   ].filter(module => ({
//     'pettycash':              ['finance','hr','admin','ceo'],
//     'purchase-requisitions':  ['supply_chain','buyer','hr','it','finance','admin','ceo'],
//     'buyer-procurement':      ['buyer','admin','ceo'],
//     'supplier-management':    ['buyer','supply_chain','admin','ceo'],
//     'invoices':               ['finance','hr','it','admin','ceo'],
//     'incident-reports':       ['hse','admin','ceo'],
//     'it-support':             ['it','admin','ceo'],
//     'suggestions':            ['hr','admin','ceo'],
//     'sick-leave':             ['hr','supervisor','admin','ceo'],
//     'communications':         ['admin','hr','ceo'],
//     'inventory-management':   ['supply_chain','admin','ceo'],
//     'fixed-assets':           ['supply_chain','admin','ceo'],
//     'supplier-performance':   ['supply_chain','admin','ceo'],
//     'data-migration':         ['supply_chain','admin','ceo'],
//     'project-management':     ['admin','supply_chain','supervisor','manager','hr','it','hse','technical','finance','ceo'],
//     'action-items':           ['admin','supply_chain','supervisor','manager','hr','it','hse','technical','finance','ceo'],
//     'legal-compliance':       ['legal','admin','finance','ceo'],
//   }[module] || []).includes(user?.role));

//   if (loading) {
//     return (
//       <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
//         <Spin size="large" />
//       </div>
//     );
//   }

//   return (
//     <div style={{ padding: '24px' }}>

//       {/* ── WELCOME HEADER ────────────────────────────────────────────────── */}
//       <Card style={{ marginBottom: '24px' }}>
//         <Row align="middle" gutter={[16, 16]}>
//           <Col>
//             <div style={{ fontSize: '48px', color: roleInfo.color, background: `${roleInfo.color}15`, padding: '16px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
//               {roleInfo.icon}
//               {userCapabilities.level > 1 && (
//                 <div style={{ position: 'absolute', top: '-4px', right: '-4px', background: '#faad14', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
//                   <CrownOutlined style={{ fontSize: '12px', color: 'white' }} />
//                 </div>
//               )}
//             </div>
//           </Col>
//           <Col flex="auto">
//             <Title level={2} style={{ margin: 0, color: roleInfo.color }}>
//               Welcome back, {user?.fullName || user?.email}! 👋
//             </Title>
//             <Text type="secondary" style={{ fontSize: '16px' }}>{roleInfo.description}</Text>
//             <div style={{ marginTop: '8px' }}>
//               <Tag color={roleInfo.color} style={{ textTransform: 'capitalize' }}>{user?.role} Access</Tag>
//               {user?.department && <Tag color="blue">{user.department}</Tag>}
//               {managementModules.length > 0 && <Tag color="gold" icon={<CrownOutlined />}>{managementModules.length} Management Module{managementModules.length !== 1 ? 's' : ''}</Tag>}
//               {userCapabilities.hasTeamAccess && <Tag color="green" icon={<TeamOutlined />}>Team Access Enabled</Tag>}
//             </div>
//             <div style={{ marginTop: '8px' }}>
//               <Text type="secondary" style={{ fontSize: '12px' }}>{moment().format('dddd, MMMM DD, YYYY')}</Text>
//             </div>
//           </Col>
//         </Row>
//       </Card>

//       {/* ── ACCESS LEVEL ALERT ────────────────────────────────────────────── */}
//       {userCapabilities.level > 1 && (
//         <Alert
//           message={`Enhanced Access Level ${userCapabilities.level}${userCapabilities.hasTeamAccess ? ' - Team Management Enabled' : ''}`}
//           description={
//             <div>
//               <Text strong>Management Access:</Text> {managementModules.join(', ')}
//               <br />
//               <Text type="secondary">You have administrative privileges for {managementModules.length} module{managementModules.length !== 1 ? 's' : ''} while maintaining access to all employee services.</Text>
//               {userCapabilities.hasTeamAccess && <><br /><Text strong style={{ color: '#52c41a' }}>Team Access:</Text><Text type="secondary"> You can view and approve requests from your team members across all modules.</Text></>}
//               {user?.role === 'buyer' && <><br /><Text strong style={{ color: '#eb2f96' }}>Buyer Specialization:</Text><Text type="secondary"> Complete procurement workflow management from requisition to delivery, including debit note handling.</Text></>}
//               {user?.role === 'supply_chain' && <><br /><Text strong style={{ color: '#fa8c16' }}>Supply Chain Management:</Text><Text type="secondary"> Full project management, inventory control, asset registry, head approvals, and supplier performance tracking.</Text></>}
//               {user?.role === 'finance' && <><br /><Text strong style={{ color: '#722ed1' }}>Finance Management:</Text><Text type="secondary"> Budget codes, accounting center, disbursements, scheduled reports, and salary processing.</Text></>}
//               {user?.role === 'supervisor' && <><br /><Text strong style={{ color: '#52c41a' }}>Supervisor Capabilities:</Text><Text type="secondary"> Milestone management, task approvals, KPI evaluations, project plan approvals, and debit note approvals.</Text></>}
//               {user?.role === 'admin' && <><br /><Text strong style={{ color: '#fa541c' }}>Admin Capabilities:</Text><Text type="secondary"> Head approval, PM milestone review, full system access across all modules.</Text></>}
//               {user?.role === 'ceo' && <><br /><Text strong style={{ color: '#fa541c' }}>CEO Capabilities:</Text><Text type="secondary"> Full system access across all modules.</Text></>}
//             </div>
//           }
//           type="info"
//           showIcon
//           icon={<CrownOutlined />}
//           style={{ marginBottom: '24px' }}
//         />
//       )}

//       {/* ── PENDING ACTIONS ALERT ─────────────────────────────────────────── */}
//       {totalPending > 0 && (
//         <Alert
//           message={`${totalPending} Pending Actions Required`}
//           description={
//             <Space wrap>
//               {['admin', 'supply_chain', 'supervisor', 'manager', 'hr', 'it', 'hse', 'technical'].includes(user?.role) && dashboardData.pendingApprovals.length > 0 && <Text><CheckCircleOutlined /> {dashboardData.pendingApprovals.length} task approval{dashboardData.pendingApprovals.length !== 1 ? 's' : ''}</Text>}
//               {user?.role === 'buyer' && <><Text><ShoppingCartOutlined /> {stats.buyerRequisitions.pending} new requisition{stats.buyerRequisitions.pending !== 1 ? 's' : ''}</Text><Text><SolutionOutlined /> {stats.buyerRequisitions.inProgress} sourcing in progress</Text><Text><FileTextOutlined /> {stats.quotes.pending} quote{stats.quotes.pending !== 1 ? 's' : ''} to evaluate</Text>{stats.debitNotes?.pending > 0 && <Text><AuditOutlined /> {stats.debitNotes.pending} debit note{stats.debitNotes.pending !== 1 ? 's' : ''} pending</Text>}</>}
//               {user?.role === 'finance' && stats.budgetCodes.pending > 0 && <Text><BankOutlined /> {stats.budgetCodes.pending} budget code approval{stats.budgetCodes.pending !== 1 ? 's' : ''}</Text>}
//               {user?.role === 'finance' && stats.disbursements?.pending > 0 && <Text><DeliveredProcedureOutlined /> {stats.disbursements.pending} disbursement{stats.disbursements.pending !== 1 ? 's' : ''} pending</Text>}
//               {user?.role === 'supply_chain' && stats.suppliers?.pending_supply_chain > 0 && <Text><ContactsOutlined /> {stats.suppliers.pending_supply_chain} supplier approval{stats.suppliers.pending_supply_chain !== 1 ? 's' : ''}</Text>}
//               {stats.cashRequests.pending > 0 && <Text><DollarOutlined /> {stats.cashRequests.pending} cash request{stats.cashRequests.pending !== 1 ? 's' : ''}</Text>}
//               {stats.purchaseRequisitions.pending > 0 && user?.role !== 'buyer' && <Text><ShoppingCartOutlined /> {stats.purchaseRequisitions.pending} purchase requisition{stats.purchaseRequisitions.pending !== 1 ? 's' : ''}</Text>}
//               {stats.invoices.pending > 0 && <Text><FileTextOutlined /> {stats.invoices.pending} invoice{stats.invoices.pending !== 1 ? 's' : ''}</Text>}
//               {stats.incidentReports.pending > 0 && <Text><ExclamationCircleOutlined /> {stats.incidentReports.pending} incident report{stats.incidentReports.pending !== 1 ? 's' : ''}</Text>}
//               {stats.itSupport.pending > 0 && <Text><LaptopOutlined /> {stats.itSupport.pending} IT request{stats.itSupport.pending !== 1 ? 's' : ''}</Text>}
//               {stats.sickLeave.pending > 0 && <Text><MedicineBoxOutlined /> {stats.sickLeave.pending} sick leave request{stats.sickLeave.pending !== 1 ? 's' : ''}</Text>}
//               {stats.communications.pending > 0 && (user?.role === 'admin' || user?.role === 'hr') && <Text><NotificationOutlined /> {stats.communications.pending} communication{stats.communications.pending !== 1 ? 's' : ''} pending</Text>}
//               {(user?.role === 'supply_chain' || user?.role === 'admin') && stats.inventory.lowStock > 0 && <Text><WarningOutlined /> {stats.inventory.lowStock} item{stats.inventory.lowStock !== 1 ? 's' : ''} low stock</Text>}
//               {(user?.role === 'supply_chain' || user?.role === 'admin') && stats.fixedAssets.overdueInspections > 0 && <Text><BarcodeOutlined /> {stats.fixedAssets.overdueInspections} asset{stats.fixedAssets.overdueInspections !== 1 ? 's' : ''} overdue inspection</Text>}
//             </Space>
//           }
//           type="warning"
//           showIcon
//           style={{ marginBottom: '24px' }}
//         />
//       )}

//       {/* ── QUICK STATS ROW ───────────────────────────────────────────────── */}
//       {(dashboardData.tasks.total > 0 || dashboardData.kpis.count > 0 || dashboardData.milestones.total > 0) && (
//         <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
//           <Col xs={24} sm={12} lg={6}>
//             <Card>
//               <Statistic title="My Tasks" value={dashboardData.tasks.total} prefix={<CheckCircleOutlined />} valueStyle={{ color: '#1890ff' }} suffix={<Text type="secondary" style={{ fontSize: '14px' }}>/{dashboardData.tasks.inProgress} active</Text>} />
//               <Button type="link" onClick={() => navigate('/employee/tasks')} style={{ padding: 0, marginTop: 8 }}>View All Tasks <RightOutlined /></Button>
//             </Card>
//           </Col>
//           <Col xs={24} sm={12} lg={6}>
//             <Card>
//               <Statistic title="KPI Achievement" value={dashboardData.kpis.overall} suffix="%" prefix={<TrophyOutlined />} valueStyle={{ color: dashboardData.kpis.overall >= 75 ? '#52c41a' : dashboardData.kpis.overall >= 50 ? '#faad14' : '#f5222d' }} />
//               <Button type="link" onClick={() => navigate('/employee/kpis')} style={{ padding: 0, marginTop: 8 }}>View KPIs <RightOutlined /></Button>
//             </Card>
//           </Col>
//           {['admin', 'supply_chain', 'supervisor', 'manager', 'hr', 'it', 'hse', 'technical', 'finance'].includes(user?.role) && (
//             <>
//               <Col xs={24} sm={12} lg={6}>
//                 <Card>
//                   <Statistic title="My Milestones" value={dashboardData.milestones.total} prefix={<FlagOutlined />} valueStyle={{ color: '#722ed1' }} suffix={<Text type="secondary" style={{ fontSize: '14px' }}>/{dashboardData.milestones.inProgress} active</Text>} />
//                   <Button type="link" onClick={() => navigate('/supervisor/milestones')} style={{ padding: 0, marginTop: 8 }}>View Milestones <RightOutlined /></Button>
//                 </Card>
//               </Col>
//               <Col xs={24} sm={12} lg={6}>
//                 <Card>
//                   <Statistic title="Pending Approvals" value={dashboardData.pendingApprovals.length} prefix={<ClockCircleOutlined />} valueStyle={{ color: '#faad14' }} />
//                   <Button type="link" onClick={() => navigate('/supervisor/action-items')} style={{ padding: 0, marginTop: 8 }}>Review Now <RightOutlined /></Button>
//                 </Card>
//               </Col>
//             </>
//           )}
//         </Row>
//       )}

//       {/* ── RECENT TASKS & PENDING APPROVALS ─────────────────────────────── */}
//       {(dashboardData.recentTasks.length > 0 || dashboardData.pendingApprovals.length > 0) && (
//         <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
//           <Col xs={24} lg={12}>
//             <Card title={<Space><CheckCircleOutlined /><Text strong>Recent Tasks</Text></Space>} extra={<Button type="link" onClick={() => navigate('/employee/tasks')}>View All</Button>}>
//               {dashboardData.recentTasks.length === 0 ? (
//                 <Alert message="No tasks yet" description="You don't have any tasks assigned. Check back later or create a personal task." type="info" showIcon />
//               ) : (
//                 <List dataSource={dashboardData.recentTasks} renderItem={item => {
//                   const isOverdue = moment(item.dueDate).isBefore(moment()) && item.status !== 'Completed';
//                   return (
//                     <List.Item actions={[<Button type="link" size="small" onClick={() => navigate('/employee/tasks')}>View</Button>]}>
//                       <List.Item.Meta
//                         title={<Space><Text strong>{item.title}</Text><Tag size="small" color={getPriorityColor(item.priority)}>{item.priority}</Tag>{isOverdue && <Tag size="small" color="red" icon={<WarningOutlined />}>Overdue</Tag>}</Space>}
//                         description={<Space direction="vertical" size="small" style={{ width: '100%' }}><Text type="secondary" style={{ fontSize: '12px' }}>Due: {moment(item.dueDate).format('MMM DD, YYYY')}</Text><Progress percent={item.progress || 0} size="small" status={item.progress === 100 ? 'success' : 'active'} /></Space>}
//                       />
//                     </List.Item>
//                   );
//                 }} />
//               )}
//             </Card>
//           </Col>

//           {['admin', 'supply_chain', 'supervisor', 'manager', 'hr', 'it', 'hse', 'technical', 'finance'].includes(user?.role) ? (
//             <Col xs={24} lg={12}>
//               <Card title={<Space><ClockCircleOutlined /><Text strong>Pending Approvals</Text><Badge count={dashboardData.pendingApprovals.length} /></Space>} extra={<Button type="link" onClick={() => navigate('/supervisor/action-items')}>View All</Button>}>
//                 {dashboardData.pendingApprovals.length === 0 ? (
//                   <Alert message="No pending approvals" description="All tasks are up to date. Great work!" type="success" showIcon />
//                 ) : (
//                   <List dataSource={dashboardData.pendingApprovals} renderItem={item => (
//                     <List.Item actions={[<Button type="primary" size="small" onClick={() => {
//                       if (item.status === 'Pending Approval') navigate(`/supervisor/task-creation-approval/${item._id}`);
//                       else {
//                         const submitted = item.assignedTo?.find(a => a.completionStatus === 'submitted');
//                         if (submitted) navigate(`/supervisor/task-completion-approval/${item._id}/${submitted.user._id}`);
//                       }
//                     }}>Review</Button>]}>
//                       <List.Item.Meta avatar={<Avatar icon={<UserOutlined />} />} title={<Space><Text strong>{item.title}</Text><Tag size="small" color={getStatusColor(item.status)}>{item.status}</Tag></Space>} description={<Space direction="vertical" size="small"><Text type="secondary" style={{ fontSize: '12px' }}>{item.status === 'Pending Approval' ? 'Creation approval needed' : 'Completion review needed'}</Text>{item.assignedTo?.length > 0 && <Text type="secondary" style={{ fontSize: '12px' }}>Assignee: {item.assignedTo[0].user?.fullName}</Text>}</Space>} />
//                     </List.Item>
//                   )} />
//                 )}
//               </Card>
//             </Col>
//           ) : (
//             <Col xs={24} lg={12}>
//               <Card title={<Space><TrophyOutlined /><Text strong>KPI Overview</Text></Space>} extra={<Button type="link" onClick={() => navigate('/employee/kpis')}>View Details</Button>}>
//                 {dashboardData.kpis.count === 0 ? (
//                   <Alert message="No KPIs Set Up" description="Set up your quarterly KPIs to start tracking your performance." type="warning" showIcon action={<Button type="primary" size="small" onClick={() => navigate('/employee/kpis')}>Set Up KPIs</Button>} />
//                 ) : (
//                   <Space direction="vertical" style={{ width: '100%' }} size="large">
//                     <div>
//                       <Text type="secondary">Overall Achievement</Text>
//                       <Progress percent={dashboardData.kpis.overall} strokeColor={{ '0%': '#108ee9', '100%': '#87d068' }} style={{ marginTop: 8 }} />
//                     </div>
//                     <Alert message={`You have ${dashboardData.kpis.count} KPIs defined for this quarter`} description="Complete tasks linked to your KPIs to increase your achievement score." type="info" showIcon />
//                   </Space>
//                 )}
//               </Card>
//             </Col>
//           )}
//         </Row>
//       )}

//       {/* ── SERVICE MODULE CARDS ──────────────────────────────────────────── */}
//       <Title level={3} style={{ marginBottom: '24px' }}>
//         Service Modules
//         <Text type="secondary" style={{ fontSize: '14px', marginLeft: '16px' }}>
//           All services available • Enhanced management for your role{userCapabilities.hasTeamAccess && ' • Team access enabled'}
//         </Text>
//       </Title>

//       <Row gutter={[24, 24]}>
//         {getModuleCards()}
//       </Row>

//       {/* ── QUICK LINKS ───────────────────────────────────────────────────── */}
//       <Card style={{ marginTop: '24px' }} title="Quick Links">
//         <Row gutter={[16, 16]}>
//           <Col xs={24} sm={12} md={6}>
//             <Button block icon={<UserOutlined />} onClick={() => navigate('/account-settings')}>Account Settings</Button>
//           </Col>
//           <Col xs={24} sm={12} md={6}>
//             <Button block icon={<BarChartOutlined />} onClick={() => navigate('/analytics')} disabled={userCapabilities.level < 2}>Analytics Dashboard</Button>
//           </Col>
//           {user?.role === 'buyer' && (
//             <>
//               <Col xs={24} sm={12} md={6}>
//                 <Button block icon={<FundOutlined />} onClick={() => navigate('/buyer/analytics/performance')}>Performance Reports</Button>
//               </Col>
//               <Col xs={24} sm={12} md={6}>
//                 <Button block icon={<AuditOutlined />} onClick={() => navigate('/buyer/debit-notes')} type="primary" style={{ backgroundColor: '#fa8c16', borderColor: '#fa8c16' }}>
//                   Debit Notes
//                   {stats.debitNotes?.pending > 0 && <Badge count={stats.debitNotes.pending} style={{ marginLeft: '8px' }} />}
//                 </Button>
//               </Col>
//               <Col xs={24} sm={12} md={6}>
//                 <Button block icon={<CarOutlined />} onClick={() => navigate('/buyer/deliveries')}>Delivery Tracking</Button>
//               </Col>
//             </>
//           )}
//           {(user?.role === 'supply_chain' || user?.role === 'admin') && (
//             <>
//               <Col xs={24} sm={12} md={6}><Button block icon={<DatabaseOutlined />} onClick={() => navigate('/supply-chain/inventory')} type="primary" style={{ backgroundColor: '#13c2c2', borderColor: '#13c2c2' }}>Inventory Dashboard</Button></Col>
//               <Col xs={24} sm={12} md={6}><Button block icon={<BarcodeOutlined />} onClick={() => navigate('/supply-chain/fixed-assets')} type="primary" style={{ backgroundColor: '#722ed1', borderColor: '#722ed1' }}>Asset Registry</Button></Col>
//               <Col xs={24} sm={12} md={6}><Button block icon={<ProjectOutlined />} onClick={() => navigate('/supply-chain/project-management')} type="primary" style={{ backgroundColor: '#13c2c2', borderColor: '#13c2c2' }}>Project Management</Button></Col>
//             </>
//           )}
//           {user?.role === 'supply_chain' && (
//             <Col xs={24} sm={12} md={6}>
//               <Button block icon={<CheckCircleOutlined />} onClick={() => navigate('/supply-chain/head-approval')} type="primary" style={{ backgroundColor: '#fa8c16', borderColor: '#fa8c16' }}>
//                 Head Approval
//                 {stats.suppliers?.pending_head_of_business > 0 && <Badge count={stats.suppliers.pending_head_of_business} style={{ marginLeft: '8px' }} />}
//               </Button>
//             </Col>
//           )}
//           {user?.role === 'admin' && (
//             <>
//               <Col xs={24} sm={12} md={6}><Button block icon={<CheckCircleOutlined />} onClick={() => navigate('/admin/head-approval')} type="primary" style={{ backgroundColor: '#fa541c', borderColor: '#fa541c' }}>Head Approval</Button></Col>
//               <Col xs={24} sm={12} md={6}><Button block icon={<FlagOutlined />} onClick={() => navigate('/admin/pm/milestone-review')} type="primary" style={{ backgroundColor: '#13c2c2', borderColor: '#13c2c2' }}>PM Milestone Review</Button></Col>
//             </>
//           )}
//           {['admin', 'supply_chain', 'supervisor', 'manager', 'hr', 'it', 'hse', 'technical'].includes(user?.role) && (
//             <>
//               <Col xs={24} sm={12} md={6}><Button block icon={<FlagOutlined />} onClick={() => navigate('/supervisor/milestones')} type="primary" style={{ backgroundColor: '#722ed1', borderColor: '#722ed1' }}>My Milestones</Button></Col>
//               <Col xs={24} sm={12} md={6}>
//                 <Button block icon={<CheckCircleOutlined />} onClick={() => navigate('/supervisor/action-items')} type="primary" style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}>
//                   Task Approvals
//                   {dashboardData.pendingApprovals.length > 0 && <Badge count={dashboardData.pendingApprovals.length} style={{ marginLeft: '8px' }} />}
//                 </Button>
//               </Col>
//               <Col xs={24} sm={12} md={6}><Button block icon={<ScheduleOutlined />} onClick={() => navigate('/supervisor/project-plan-approvals')}>Project Plan Approvals</Button></Col>
//               <Col xs={24} sm={12} md={6}><Button block icon={<AuditOutlined />} onClick={() => navigate('/supervisor/debit-note-approvals')}>Debit Note Approvals</Button></Col>
//             </>
//           )}
//           {['hr', 'admin'].includes(user?.role) && (
//             <Col xs={24} sm={12} md={6}><Button block icon={<SafetyCertificateOutlined />} onClick={() => navigate('/employee-welfare')}>Employee Welfare</Button></Col>
//           )}
//           {(user?.role === 'admin' || user?.role === 'hr') && (
//             <Col xs={24} sm={12} md={6}><Button block icon={<NotificationOutlined />} onClick={() => navigate(`/${user?.role}/communications`)} type="primary" style={{ backgroundColor: '#fa541c', borderColor: '#fa541c' }}>Send Communication</Button></Col>
//           )}
//           {user?.role === 'finance' && (
//             <>
//               <Col xs={24} sm={12} md={6}><Button block icon={<DeliveredProcedureOutlined />} onClick={() => navigate('/finance/disbursements')} type="primary" style={{ backgroundColor: '#722ed1', borderColor: '#722ed1' }}>Disbursements{stats.disbursements?.pending > 0 && <Badge count={stats.disbursements.pending} style={{ marginLeft: '8px' }} />}</Button></Col>
//               <Col xs={24} sm={12} md={6}><Button block icon={<AccountBookOutlined />} onClick={() => navigate('/finance/accounting')}>Accounting Center</Button></Col>
//               <Col xs={24} sm={12} md={6}><Button block icon={<ScheduleOutlined />} onClick={() => navigate('/finance/scheduled-reports')}>Scheduled Reports</Button></Col>
//             </>
//           )}
//           {user?.role === 'admin' && (
//             <Col xs={24} sm={12} md={6}><Button block icon={<SettingOutlined />} onClick={() => navigate('/system-settings')}>System Settings</Button></Col>
//           )}
//            {user?.role === 'ceo' && (
//             <>
//               <Col xs={24} sm={12} md={6}>
//                 <Button
//                   block icon={<CrownOutlined />}
//                   onClick={() => navigate('/admin/head-approval')}
//                   type="primary"
//                   style={{ backgroundColor: '#faad14', borderColor: '#faad14' }}
//                 >
//                   Final Approval Queue
//                   {stats.cashRequests?.pending > 0 && (
//                     <Badge count={stats.cashRequests.pending} style={{ marginLeft: '8px' }} />
//                   )}
//                 </Button>
//               </Col>
//               <Col xs={24} sm={12} md={6}>
//                 <Button block icon={<BarChartOutlined />} onClick={() => navigate('/admin/analytics')}>
//                   Company Analytics
//                 </Button>
//               </Col>
//               <Col xs={24} sm={12} md={6}>
//                 <Button block icon={<FundOutlined />} onClick={() => navigate('/finance/budget-management')}>
//                   Budget Overview
//                 </Button>
//               </Col>
//               <Col xs={24} sm={12} md={6}>
//                 <Button block icon={<TeamOutlined />} onClick={() => navigate('/hr/dashboard')}>
//                   HR Overview
//                 </Button>
//               </Col>
//               <Col xs={24} sm={12} md={6}>
//                 <Button block icon={<ProjectOutlined />} onClick={() => navigate('/admin/projects')}>
//                   All Projects
//                 </Button>
//               </Col>
//               <Col xs={24} sm={12} md={6}>
//                 <Button block icon={<ContactsOutlined />} onClick={() => navigate('/admin/supplier-approvals')}>
//                   Supplier Approvals
//                 </Button>
//               </Col>
//               <Col xs={24} sm={12} md={6}>
//                 <Button block icon={<WalletOutlined />} onClick={() => navigate('/finance/salary-payments')}>
//                   Payroll
//                 </Button>
//               </Col>
//               <Col xs={24} sm={12} md={6}>
//                 <Button block icon={<SettingOutlined />} onClick={() => navigate('/admin/system-settings')}>
//                   System Settings
//                 </Button>
//               </Col>
//             </>
//           )}
//         </Row>
//       </Card>

//       {/* ── ROLE-SPECIFIC SUMMARY PANELS ──────────────────────────────────── */}

//       {/* Buyer procurement performance */}
//       {user?.role === 'buyer' && (
//         <Card style={{ marginTop: '24px' }} title="Procurement Performance Summary">
//           <Row gutter={[16, 16]}>
//             <Col xs={24} sm={6}><Statistic title="Active Requisitions" value={(stats.buyerRequisitions.pending || 0) + (stats.buyerRequisitions.inProgress || 0)} prefix={<ShoppingCartOutlined />} valueStyle={{ color: '#1890ff' }} /></Col>
//             <Col xs={24} sm={6}><Statistic title="Quotes Pending" value={stats.quotes.pending} prefix={<FileTextOutlined />} valueStyle={{ color: '#faad14' }} /></Col>
//             <Col xs={24} sm={6}><Statistic title="Active Suppliers" value={stats.suppliers.active} prefix={<ContactsOutlined />} valueStyle={{ color: '#52c41a' }} /></Col>
//             <Col xs={24} sm={6}><Statistic title="Debit Notes Pending" value={stats.debitNotes?.pending || 0} prefix={<AuditOutlined />} valueStyle={{ color: stats.debitNotes?.pending > 0 ? '#f5222d' : '#52c41a' }} /></Col>
//           </Row>
//           <Divider />
//           <Space>
//             <Button type="primary" icon={<BarChartOutlined />} onClick={() => navigate('/buyer/analytics')}>Detailed Analytics</Button>
//             <Button icon={<AuditOutlined />} onClick={() => navigate('/buyer/debit-notes')}>Debit Notes</Button>
//             <Button icon={<CarOutlined />} onClick={() => navigate('/buyer/deliveries')}>Delivery Tracking</Button>
//             <Button icon={<ContactsOutlined />} onClick={() => navigate('/buyer/suppliers')}>Manage Suppliers</Button>
//           </Space>
//         </Card>
//       )}

//       {/* Supply chain inventory & asset summary */}
//       {(user?.role === 'supply_chain' || user?.role === 'admin') && (
//         <Card style={{ marginTop: '24px' }} title="Inventory & Asset Summary">
//           <Row gutter={[16, 16]}>
//             <Col xs={24} sm={6}><Statistic title="Total Items" value={stats.inventory.totalItems} prefix={<DatabaseOutlined />} valueStyle={{ color: '#1890ff' }} /></Col>
//             <Col xs={24} sm={6}><Statistic title="Low Stock Alerts" value={stats.inventory.lowStock} prefix={<WarningOutlined />} valueStyle={{ color: '#faad14' }} /></Col>
//             <Col xs={24} sm={6}><Statistic title="Active POs" value={stats.purchaseOrders?.active || 0} prefix={<FileTextOutlined />} valueStyle={{ color: '#52c41a' }} /></Col>
//             <Col xs={24} sm={6}><Statistic title="Pending Deliveries" value={stats.purchaseOrders?.pending || 0} prefix={<TruckOutlined />} valueStyle={{ color: '#1890ff' }} /></Col>
//             <Col xs={24} sm={6}><Statistic title="Total Assets" value={stats.fixedAssets.totalAssets} prefix={<BarcodeOutlined />} valueStyle={{ color: '#722ed1' }} /></Col>
//             <Col xs={24} sm={6}><Statistic title="Overdue Inspections" value={stats.fixedAssets.overdueInspections} prefix={<WarningOutlined />} valueStyle={{ color: '#f5222d' }} /></Col>
//           </Row>
//           <Divider />
//           <Space>
//             <Button type="primary" icon={<DatabaseOutlined />} onClick={() => navigate('/supply-chain/inventory')}>Inventory Dashboard</Button>
//             <Button icon={<BarcodeOutlined />} onClick={() => navigate('/supply-chain/fixed-assets')}>Asset Registry</Button>
//             <Button icon={<StarOutlined />} onClick={() => navigate('/supply-chain/supplier-performance')}>Supplier Performance</Button>
//             <Button icon={<UploadOutlined />} onClick={() => navigate('/supply-chain/data-migration')}>Data Migration</Button>
//           </Space>
//         </Card>
//       )}

//       {/* Finance budget overview */}
//       {user?.role === 'finance' && (
//         <Card style={{ marginTop: '24px' }} title="Budget & Finance Overview">
//           <Row gutter={[16, 16]}>
//             <Col xs={24} sm={6}><Statistic title="Pending Approvals" value={stats.budgetCodes.pending} prefix={<ClockCircleOutlined />} valueStyle={{ color: '#faad14' }} /></Col>
//             <Col xs={24} sm={6}><Statistic title="Active Budget Codes" value={stats.budgetCodes.total} prefix={<BankOutlined />} valueStyle={{ color: '#1890ff' }} /></Col>
//             <Col xs={24} sm={6}><Statistic title="Disbursements Pending" value={stats.disbursements?.pending || 0} prefix={<DeliveredProcedureOutlined />} valueStyle={{ color: stats.disbursements?.pending > 0 ? '#f5222d' : '#52c41a' }} /></Col>
//             <Col xs={24} sm={6}><Statistic title="Pending Revisions" value={stats.budgetCodes.revisions} prefix={<SwapOutlined />} valueStyle={{ color: '#722ed1' }} /></Col>
//           </Row>
//           <Divider />
//           <Space>
//             <Button type="primary" icon={<DashboardOutlined />} onClick={() => navigate('/finance/budget-management')}>Budget Dashboard</Button>
//             <Button icon={<AccountBookOutlined />} onClick={() => navigate('/finance/accounting')}>Accounting Center</Button>
//             <Button icon={<DeliveredProcedureOutlined />} onClick={() => navigate('/finance/disbursements')}>Disbursements</Button>
//             <Button icon={<ScheduleOutlined />} onClick={() => navigate('/finance/scheduled-reports')}>Scheduled Reports</Button>
//             <Button icon={<ClockCircleOutlined />} onClick={() => navigate('/finance/budget-codes')}>
//               Pending Approvals
//               {stats.budgetCodes.pending > 0 && <Badge count={stats.budgetCodes.pending} style={{ marginLeft: '8px' }} />}
//             </Button>
//           </Space>
//         </Card>
//       )}

//       {/* Finance salary overview */}
//       {user?.role === 'finance' && (
//         <Card style={{ marginTop: '24px' }} title="Salary Payment Overview">
//           <Row gutter={[16, 16]}>
//             <Col xs={24} sm={6}><Statistic title="Current Month Payroll" value={stats.salaryPayments?.currentMonth || 0} prefix={<WalletOutlined />} valueStyle={{ color: '#13c2c2', fontSize: '20px' }} formatter={v => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v.toLocaleString()} suffix="XAF" /></Col>
//             <Col xs={24} sm={6}><Statistic title="Year to Date" value={stats.salaryPayments?.yearToDate || 0} prefix={<DollarOutlined />} valueStyle={{ color: '#1890ff', fontSize: '20px' }} formatter={v => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v.toLocaleString()} suffix="XAF" /></Col>
//             <Col xs={24} sm={6}><Statistic title="Payments Processed" value={stats.salaryPayments?.totalProcessed || 0} prefix={<CheckCircleOutlined />} valueStyle={{ color: '#52c41a', fontSize: '20px' }} /></Col>
//             <Col xs={24} sm={6}><Statistic title="Avg Per Payment" value={stats.salaryPayments?.totalProcessed > 0 ? Math.round((stats.salaryPayments?.currentMonth || 0) / stats.salaryPayments.totalProcessed) : 0} prefix={<BarChartOutlined />} valueStyle={{ color: '#722ed1', fontSize: '20px' }} formatter={v => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v.toLocaleString()} suffix="XAF" /></Col>
//           </Row>
//           {stats.salaryPayments?.lastPaymentDate && <Alert message="Last Payment Processed" description={moment(stats.salaryPayments.lastPaymentDate).format('MMMM DD, YYYY [at] HH:mm A')} type="info" showIcon icon={<CalendarOutlined />} style={{ marginTop: '16px' }} />}
//           <Divider />
//           <Space>
//             <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/finance/salary-payments/new')} style={{ backgroundColor: '#13c2c2', borderColor: '#13c2c2' }}>New Payment</Button>
//             <Button icon={<HistoryOutlined />} onClick={() => navigate('/finance/salary-payments')}>Payment History</Button>
//             <Button icon={<BarChartOutlined />} onClick={() => navigate('/finance/salary-reports')}>View Reports</Button>
//             <Button icon={<DownloadOutlined />} onClick={() => message.info('Export feature coming soon')}>Export Data</Button>
//           </Space>
//         </Card>
//       )}

//       {/* Admin / HR communications */}
//       {(user?.role === 'admin' || user?.role === 'hr' || user?.role === 'ceo') && (
//         <Card style={{ marginTop: '24px' }} title="Communications Overview">
//           <Row gutter={[16, 16]}>
//             <Col xs={24} sm={8}><Statistic title="Drafts & Scheduled" value={stats.communications.pending} prefix={<ClockCircleOutlined />} valueStyle={{ color: '#faad14' }} /></Col>
//             <Col xs={24} sm={8}><Statistic title="Sent Messages" value={stats.communications.total} prefix={<CheckCircleOutlined />} valueStyle={{ color: '#52c41a' }} /></Col>
//             <Col xs={24} sm={8}><Statistic title="Total Communications" value={(stats.communications.pending || 0) + (stats.communications.total || 0)} prefix={<NotificationOutlined />} valueStyle={{ color: '#1890ff' }} /></Col>
//           </Row>
//           <Divider />
//           <Space>
//             <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate(`/${user?.role}/communications/new`)} style={{ backgroundColor: '#fa541c', borderColor: '#fa541c' }}>New Message</Button>
//             <Button icon={<HistoryOutlined />} onClick={() => navigate(`/${user?.role}/communications/history`)}>Message History</Button>
//             <Button icon={<BarChartOutlined />} onClick={() => navigate(`/${user?.role}/communications/analytics`)}>View Analytics</Button>
//           </Space>
//         </Card>
//       )}

//       {user?.role === 'ceo' && (
//         <>
//           {stats.cashRequests?.pending > 0 && (
//             <Text><CrownOutlined /> {stats.cashRequests.pending} cash request{stats.cashRequests.pending !== 1 ? 's' : ''} awaiting CEO approval</Text>
//           )}
//           {stats.purchaseRequisitions?.pending > 0 && (
//             <Text><ShoppingCartOutlined /> {stats.purchaseRequisitions.pending} purchase requisition{stats.purchaseRequisitions.pending !== 1 ? 's' : ''} awaiting CEO approval</Text>
//           )}
//           {stats.invoices?.pending > 0 && (
//             <Text><FileTextOutlined /> {stats.invoices.pending} invoice{stats.invoices.pending !== 1 ? 's' : ''} awaiting CEO approval</Text>
//           )}
//           {stats.suppliers?.pending > 0 && (
//             <Text><ContactsOutlined /> {stats.suppliers.pending} supplier application{stats.suppliers.pending !== 1 ? 's' : ''} awaiting CEO approval</Text>
//           )}
//         </>
//       )}

//       {/* Department budget — visible to all */}
//       <Card
//         style={{ marginTop: '24px' }}
//         title={<Space><BankOutlined style={{ color: '#722ed1' }} /><span>Department Budget Overview</span></Space>}
//         extra={<Tag color="purple">{user?.department || 'Your Department'}</Tag>}
//       >
//         <Paragraph type="secondary">View budget codes, utilization tracking, and financial analytics for your department. Track purchase requisitions, cash requests, and salary payments against allocated budgets.</Paragraph>
//         <Alert message="Real-Time Budget Tracking" description="Monitor your department's budget utilization with up-to-date information from all budget sources." type="info" showIcon style={{ marginBottom: '16px' }} />
//         <Space wrap>
//           <Button type="primary" icon={<DashboardOutlined />} onClick={() => navigate(`/${user?.role === 'employee' ? 'employee' : 'supervisor'}/department-budget`)} style={{ backgroundColor: '#722ed1', borderColor: '#722ed1' }}>View Budget Dashboard</Button>
//           <Button icon={<BarChartOutlined />} onClick={() => navigate(`/${user?.role === 'employee' ? 'employee' : 'supervisor'}/department-budget`)}>Budget Analytics</Button>
//           <Button icon={<EyeOutlined />} onClick={() => navigate(`/${user?.role === 'employee' ? 'employee' : 'supervisor'}/department-budget`)}>Utilization Tracking</Button>
//         </Space>
//       </Card>

//     </div>
//   );
// };

// export default Dashboard;
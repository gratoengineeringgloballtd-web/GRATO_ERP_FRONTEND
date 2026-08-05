// ═══════════════════════════════════════════════════════════════════════════
// FILE: src/components/DelegatedQueuePanel.jsx  (NEW FILE)
//
// PURPOSE: A collapsible panel embeddable on any module page.
//          Shows items pending the current user's action AS A DELEGATE —
//          i.e. approval steps that were transferred from another user.
//
// USAGE:
//   import DelegatedQueuePanel from '../../components/DelegatedQueuePanel';
//
//   // At the top of SupervisorCashApprovals, FinanceBudgetCodeApprovals, etc.:
//   <DelegatedQueuePanel processType="cash_request" onNavigate={navigate} />
//
// PROPS:
//   processType  {string}   — one of the keys from delegationProcessTypes.js
//   onNavigate   {function} — navigate function (from useNavigate)
//   style        {object}   — optional extra Card styles
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Collapse, Badge, Table, Tag, Button, Space, Alert,
  Typography, Empty, Spin, Avatar, Tooltip,
} from 'antd';
import {
  SwapOutlined, UserOutlined, ClockCircleOutlined,
  ArrowRightOutlined, CrownOutlined, ReloadOutlined,
} from '@ant-design/icons';
import moment from 'moment';
import api from '../services/api';
import { useUserDelegation } from '../contexts/UserDelegationContext';

const { Text } = Typography;

// ─────────────────────────────────────────────────────────────────────────────
// Amount display helper
// ─────────────────────────────────────────────────────────────────────────────
const AMOUNT_FIELDS = {
  cash_request:         'amountRequested',
  purchase_requisition: 'budgetXAF',
  invoice:              'totalAmount',
  purchase_order:       'totalAmount',
  debit_note:           'debitAmount',
  budget_code:          'budget',
  salary_payment:       'totalAmount',
};

function getAmount(doc, processType) {
  const field = AMOUNT_FIELDS[processType];
  if (!field || !doc[field]) return null;
  return `${Number(doc[field]).toLocaleString()} XAF`;
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const DelegatedQueuePanel = ({ processType, onNavigate, style = {} }) => {
  const { findDelegatorFor, hasIncoming } = useUserDelegation();

  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(false);
  const [open,    setOpen]    = useState(true);

  const delegator = findDelegatorFor(processType);

  const fetchItems = useCallback(async () => {
    if (!delegator) return;
    setLoading(true);
    try {
      const res = await api.get(`/delegations/my-pending/${processType}`);
      setItems(res.data.data || []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [delegator, processType]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  // Don't render if no one has delegated this type to the current user
  if (!hasIncoming || !delegator) return null;

  // ── Table columns (generic — works for all process types) ────────────────
  const columns = [
    {
      title:  'ID',
      key:    'id',
      width:  120,
      render: (_, row) => (
        <Text strong style={{ fontFamily: 'monospace' }}>
          {row.displayId || row._id?.toString()?.slice(-8)?.toUpperCase()}
        </Text>
      ),
    },
    {
      title:  'On Behalf Of',
      key:    'onBehalf',
      render: (_, row) => {
        // Find the delegatedFrom info on the active chain step
        const step = row.approvalChain?.find(
          (s) => s.status === 'pending' && s.delegatedFrom?.email
        );
        const originalOwner = step?.delegatedFrom?.name || step?.delegatedFrom?.email || '—';
        return (
          <Space size="small">
            <Avatar size="small" icon={<UserOutlined />} style={{ backgroundColor: '#faad14' }} />
            <Text>{originalOwner}</Text>
          </Space>
        );
      },
    },
    {
      title:  'Amount',
      key:    'amount',
      width:  150,
      render: (_, row) => {
        const amt = getAmount(row, processType);
        return amt ? <Text strong>{amt}</Text> : <Text type="secondary">—</Text>;
      },
    },
    {
      title:  'Submitted',
      key:    'date',
      width:  130,
      render: (_, row) => (
        <Text type="secondary" style={{ fontSize: '12px' }}>
          {moment(row.createdAt).format('DD MMM YYYY')}
        </Text>
      ),
    },
    {
      title:  'Waiting',
      key:    'waiting',
      width:  100,
      render: (_, row) => {
        const days = moment().diff(moment(row.createdAt), 'days');
        return (
          <Tag color={days > 5 ? 'red' : days > 2 ? 'orange' : 'default'}>
            {days}d
          </Tag>
        );
      },
    },
    {
      title:  '',
      key:    'action',
      width:  80,
      render: (_, row) => (
        <Button
          size="small"
          type="primary"
          icon={<ArrowRightOutlined />}
          onClick={() => {
            if (onNavigate) onNavigate(`/${processType.replace(/_/g, '-')}s/${row._id}`);
          }}
        >
          Review
        </Button>
      ),
    },
  ];

  return (
    <Card
      style={{
        marginBottom: '24px',
        border:       '2px solid #1890ff',
        borderRadius: '12px',
        ...style,
      }}
      bodyStyle={{ padding: '0' }}
    >
      <Collapse
        ghost
        activeKey={open ? ['panel'] : []}
        onChange={(keys) => setOpen(keys.includes('panel'))}
        items={[{
          key:       'panel',
          showArrow: true,
          label: (
            <Space style={{ padding: '8px 0' }}>
              <SwapOutlined style={{ color: '#1890ff' }} />
              <Text strong>
                Delegated to Me — {processType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
              </Text>
              <Badge
                count={items.length}
                style={{ backgroundColor: '#1890ff' }}
                showZero
              />
              {delegator && (
                <Tag color="geekblue" style={{ fontSize: '11px' }}>
                  Acting for {delegator.delegatorName}
                </Tag>
              )}
              <Tooltip title="Refresh">
                <Button
                  size="small"
                  type="text"
                  icon={<ReloadOutlined />}
                  onClick={(e) => { e.stopPropagation(); fetchItems(); }}
                  loading={loading}
                />
              </Tooltip>
            </Space>
          ),
          children: loading ? (
            <div style={{ textAlign: 'center', padding: '32px' }}>
              <Spin />
            </div>
          ) : items.length === 0 ? (
            <Empty
              description="No delegated items pending your action"
              style={{ padding: '32px' }}
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          ) : (
            <>
              <Alert
                type="info"
                showIcon
                icon={<CrownOutlined />}
                style={{ margin: '0 16px 12px', borderRadius: '8px' }}
                message={`You are acting on behalf of ${delegator?.delegatorName}. Your approvals will record "Approved by you on behalf of ${delegator?.delegatorName}".`}
              />
              <Table
                dataSource={items}
                columns={columns}
                rowKey="_id"
                size="small"
                pagination={{ pageSize: 5, size: 'small' }}
                style={{ padding: '0 0 8px' }}
              />
            </>
          ),
        }]}
      />
    </Card>
  );
};

export default DelegatedQueuePanel;


// ═══════════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════════
//
// BELOW: App.jsx and Dashboard.jsx patches (separate from the component)
//
// ═══════════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════════


/*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
APP.JSX PATCH — 4 changes
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PATCH A — Add imports at the top of App.jsx

  import { UserDelegationProvider } from './contexts/UserDelegationContext';
  import UserDelegationSettings from './pages/delegation/UserDelegationSettings';


PATCH B — Add /delegation/* route inside <Routes> (before the fallback * route)

  <Route
    path="/delegation"
    element={<ProtectedRoute><PettyCashLayout /></ProtectedRoute>}
  >
    <Route index    element={<Navigate to="/delegation/settings" replace />} />
    <Route
      path="settings"
      element={<UserDelegationSettings />}
    />
  </Route>


PATCH C — Add to server.js / app.js (backend):

  app.use('/api/delegations', require('./routes/userDelegationRoutes'));


PATCH D — Wrap <AppRoutes /> with <UserDelegationProvider>
  (INSIDE <CEODelegationProvider> if that was already added)

  Change:
    <CEODelegationProvider>
      <AppRoutes />
    </CEODelegationProvider>

  To:
    <CEODelegationProvider>
      <UserDelegationProvider>
        <AppRoutes />
      </UserDelegationProvider>
    </CEODelegationProvider>


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DASHBOARD.JSX PATCH — Add delegation banner + settings quick link
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PATCH E — Add import at top of Dashboard.jsx

  import { useUserDelegation } from '../contexts/UserDelegationContext';


PATCH F — Add inside Dashboard component, after the CEODelegation destructure:

  const {
    outgoing:     myDelegations,
    incoming:     delegatedToMe,
    isFullyLocked,
    lockedTypes,
    hasIncoming:  hasDelegatedToMe,
  } = useUserDelegation();


PATCH G — Add TWO banners in the JSX return, after the pending actions Alert
          and before the Quick Stats Row:

  // ── USER DELEGATION: outgoing (I have delegated) ──────────────────────────
  {myDelegations.filter((d) => d.status === 'active').length > 0 && (
    <Alert
      type="warning"
      showIcon
      icon={<SwapOutlined />}
      style={{ marginBottom: '16px', borderRadius: '12px' }}
      message={
        <Text strong>
          You are in read-only mode for{' '}
          {myDelegations.some((d) => d.scope === 'all')
            ? 'all processes'
            : `${lockedTypes.length} process type(s)`}
        </Text>
      }
      description={
        <Space>
          <Text>
            Your delegate(s) are handling your submissions and approvals.
          </Text>
          <Button
            size="small"
            icon={<SwapOutlined />}
            onClick={() => navigate('/delegation/settings')}
          >
            Manage Delegations
          </Button>
        </Space>
      }
    />
  )}

  // ── USER DELEGATION: incoming (someone delegated to me) ───────────────────
  {hasDelegatedToMe && (
    <Alert
      type="info"
      showIcon
      icon={<CrownOutlined />}
      style={{ marginBottom: '16px', borderRadius: '12px' }}
      message={
        <Text strong>
          {delegatedToMe.filter((d) => d.status === 'active').length} user(s) have delegated processes to you
        </Text>
      }
      description={
        <Space>
          <Text>
            You can submit and approve on their behalf. Check the
            "Delegated to Me" panels on each module page.
          </Text>
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => navigate('/delegation/settings?tab=incoming')}
          >
            View Incoming
          </Button>
        </Space>
      }
    />
  )}


PATCH H — Add a "Delegation Settings" quick link in the Quick Links card
          (after the Account Settings button, visible to all users):

  <Col xs={24} sm={12} md={6}>
    <Button
      block
      icon={<SwapOutlined />}
      onClick={() => navigate('/delegation/settings')}
      type={myDelegations.filter(d => d.status === 'active').length > 0 ? 'primary' : 'default'}
      style={myDelegations.filter(d => d.status === 'active').length > 0
        ? { backgroundColor: '#faad14', borderColor: '#faad14' }
        : {}}
    >
      Delegation Settings
      {myDelegations.filter(d => d.status === 'active').length > 0 && (
        <Badge
          count={myDelegations.filter(d => d.status === 'active').length}
          style={{ marginLeft: '8px' }}
        />
      )}
    </Button>
  </Col>


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
HOW TO ADD DelegatedQueuePanel TO EXISTING MODULE PAGES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Add this to the TOP of each module page's JSX return (before the main list):

  import DelegatedQueuePanel from '../../components/DelegatedQueuePanel';
  import { useNavigate } from 'react-router-dom';

  // In the component:
  const navigate = useNavigate();

  // In the JSX:
  <DelegatedQueuePanel processType="cash_request" onNavigate={navigate} />


Add to the following pages with the matching processType:

  Page                           processType
  ─────────────────────────────────────────────────────────────────
  SupervisorCashApprovals        cash_request
  FinanceCashApprovals           cash_request
  SupervisorPurchaseRequisitions purchase_requisition
  FinancePurchaseRequisitions    purchase_requisition
  SupervisorInvoiceApprovals     invoice
  FinanceInvoiceApproval         invoice
  SupervisorPOApprovals          purchase_order
  DebitNoteApprovals             debit_note
  FinanceBudgetCodeApprovals     budget_code
  SalaryPaymentList              salary_payment
  SupervisorSickLeaveApprovals   leave_request
  HSEIncidentReports             incident_report
  ITSupportRequests              it_support
  HRSuggestions                  suggestion
  ProjectPlanApproval            project_plan


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
HOW TO ADD ON-BEHALF-OF TO SUBMISSION FORMS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

In each submission form (CashRequestForm, PurchaseRequisitionForm, etc.):

1. Fetch who has delegated to the current user for this process type:

   const { findDelegatorFor } = useUserDelegation();
   const delegators = incoming.filter(d =>
     d.status === 'active' &&
     (d.scope === 'all' || d.processTypes.includes('cash_request'))
   );

   Or use the context's incoming list directly.

2. Add this field to the form (only show when delegators.length > 0):

   {delegators.length > 0 && (
     <Form.Item
       name="onBehalfOfEmail"
       label={
         <Space>
           <CrownOutlined style={{ color: '#faad14' }} />
           Submit on behalf of (optional)
         </Space>
       }
     >
       <Select
         placeholder="Submit as yourself (default)"
         allowClear
       >
         {delegators.map((d) => (
           <Option key={d.delegatorEmail} value={d.delegatorEmail}>
             {d.delegatorName}
             <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
               — they delegated to you
             </Text>
           </Option>
         ))}
       </Select>
     </Form.Item>
   )}

3. Include in the API call body:
   onBehalfOfEmail: values.onBehalfOfEmail || undefined

4. In the controller, after enforceDelegationLock + resolveDelegateIdentity:

   const principalEmail = req.principalUser.email;
   // Use principalEmail to look up the approval chain
   // Set document.employee = req.principalUser._id
   // Set document.submittedBy = req.submittedByUser._id (B's ID)

   // Example for CashRequest:
   const chain = getCashRequestApprovalChain(
     req.principalUser.email,   // ← use A's email, not req.user.email
     requestType,
     amount
   );
   cashRequest.employee    = req.principalUser._id;
   cashRequest.submittedBy = req.submittedByUser._id;
   cashRequest.submittedByName = req.submittedByUser.fullName;
   cashRequest.onBehalfNote    = req.delegationContext.onBehalfNote;

   // After save:
   await logDelegatedSubmission(req, cashRequest, 'cash_request');
*/
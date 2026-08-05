// ═══════════════════════════════════════════════════════════════════════════
// FILE: src/contexts/CEODelegationContext.jsx  (NEW FILE)
//
// PURPOSE:
//   Fetches the current user's active CEO delegations once at app startup
//   and makes them available to every component via context.
//
//   Two consumers:
//     1. EnhancedProtectedRoute  — grants route access when delegation covers
//                                  a required role (e.g. supply_chain user
//                                  accessing /finance/* because they are
//                                  delegated `budget_code`)
//     2. Dashboard               — injects delegation-only module cards for
//                                  modules the user wouldn't normally see
//
// USAGE:
//   • Wrap <AppRoutes> with <CEODelegationProvider> in App.jsx
//   • Read with useCEODelegation() hook anywhere inside the tree
// ═══════════════════════════════════════════════════════════════════════════

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { useSelector } from 'react-redux';
import api from '../services/api';

// ─────────────────────────────────────────────────────────────────────────────
// DELEGATION → ROLE GRANT MAP
//
// Defines which normally-restricted roles a delegation type unlocks for the
// delegate.  Only types that can reach CEO-restricted route groups need an
// entry; types whose approval pages are already reachable via /supervisor/*
// (which all staff roles can access) don't need one.
// ─────────────────────────────────────────────────────────────────────────────
export const DELEGATION_ROLE_GRANTS = {
  // budget_code approvals live under /finance — grant finance-level access
  budget_code:    ['finance'],

  // salary_payment approvals live under /finance
  salary_payment: ['finance'],

  // supplier approvals live under /admin and /finance
  supplier:       ['finance', 'admin'],

  // invoice final-approval step lives under /finance
  invoice:        ['finance'],

  // purchase_requisition head-approval lives under /admin
  purchase_requisition: ['admin'],

  // cash_request, debit_note, purchase_order, project_plan are all reachable
  // via /supervisor/* which every authenticated user can reach — no extra grant needed
};

// ─────────────────────────────────────────────────────────────────────────────
// DELEGATION → APPROVAL PATH MAP
//
// The URL the delegate should be sent to for each delegated type.
// Where the type's normal approval page is role-restricted (e.g. /finance/*)
// we use the /ceo-delegate/* mirror route added in App.jsx instead.
// ─────────────────────────────────────────────────────────────────────────────
export const DELEGATION_APPROVAL_PATHS = {
  cash_request:         '/supervisor/cash-approvals',
  purchase_requisition: '/ceo-delegate/purchase-requisitions',
  invoice:              '/ceo-delegate/invoice-approvals',
  purchase_order:       '/supervisor/po-approvals',
  debit_note:           '/supervisor/debit-note-approvals',
  budget_code:          '/ceo-delegate/budget-codes',
  budget_transfer:      '/ceo-delegate/budget-codes',
  salary_payment:       '/ceo-delegate/salary-payments',
  supplier:             '/ceo-delegate/supplier-approvals',
  project_plan:         '/supervisor/project-plan-approvals',
};

// ─────────────────────────────────────────────────────────────────────────────
// DELEGATION TYPE → MODULE KEY MAP
//
// Which module card in the Dashboard each delegated request type belongs to.
// Used to avoid showing two cards for the same module when multiple types
// map to one card.
// ─────────────────────────────────────────────────────────────────────────────
export const DELEGATION_MODULE_MAP = {
  cash_request:         'pettycash',
  purchase_requisition: 'purchase-requisitions',
  invoice:              'invoices',
  debit_note:           'invoices',
  purchase_order:       'buyer-procurement',
  budget_code:          'budget-management',
  budget_transfer:      'budget-management',
  salary_payment:       'salary-payments',
  supplier:             'supplier-management',
  project_plan:         'project-plans',
};

// ─────────────────────────────────────────────────────────────────────────────
// MODULE TEMPLATES
//
// Visual config (title, icon class, colors) for each module key so we can
// render delegation-only cards for modules the user doesn't normally see.
// Icons are referenced by name strings — the Dashboard resolves them to JSX.
// ─────────────────────────────────────────────────────────────────────────────
export const DELEGATION_MODULE_TEMPLATES = {
  'pettycash': {
    title:       'Petty Cash Management',
    iconType:    'DollarOutlined',
    color:       '#f6ffed',
    borderColor: '#52c41a',
    iconColor:   '#52c41a',
    description: 'CEO approval authority delegated to you for cash requests',
  },
  'purchase-requisitions': {
    title:       'Purchase Requisitions',
    iconType:    'ShoppingCartOutlined',
    color:       '#f9f0ff',
    borderColor: '#722ed1',
    iconColor:   '#722ed1',
    description: 'CEO approval authority delegated to you for purchase requisitions',
  },
  'invoices': {
    title:       'Invoice Management',
    iconType:    'FileTextOutlined',
    color:       '#f0f8ff',
    borderColor: '#1890ff',
    iconColor:   '#1890ff',
    description: 'CEO approval authority delegated to you for invoices',
  },
  'buyer-procurement': {
    title:       'Procurement / Purchase Orders',
    iconType:    'SolutionOutlined',
    color:       '#fff7e6',
    borderColor: '#fa8c16',
    iconColor:   '#fa8c16',
    description: 'CEO approval authority delegated to you for purchase orders',
  },
  'budget-management': {
    title:       'Budget & Finance',
    iconType:    'BankOutlined',
    color:       '#f9f0ff',
    borderColor: '#722ed1',
    iconColor:   '#722ed1',
    description: 'CEO approval authority delegated to you for budget codes / finance',
  },
  'salary-payments': {
    title:       'Salary Payment Processing',
    iconType:    'WalletOutlined',
    color:       '#e6fffb',
    borderColor: '#13c2c2',
    iconColor:   '#13c2c2',
    description: 'CEO approval authority delegated to you for salary payments',
  },
  'supplier-management': {
    title:       'Supplier Management',
    iconType:    'ContactsOutlined',
    color:       '#fff0f6',
    borderColor: '#eb2f96',
    iconColor:   '#eb2f96',
    description: 'CEO approval authority delegated to you for supplier approvals',
  },
  'project-plans': {
    title:       'Project Plan Approvals',
    iconType:    'ScheduleOutlined',
    color:       '#e6fffb',
    borderColor: '#13c2c2',
    iconColor:   '#13c2c2',
    description: 'CEO approval authority delegated to you for project plans',
  },
};


// ─────────────────────────────────────────────────────────────────────────────
// CONTEXT
// ─────────────────────────────────────────────────────────────────────────────

const CEODelegationContext = createContext({
  isGlobalDelegate:  false,
  delegatedTypes:    [],   // [{ requestType, label, approvalPath, delegatedAt }]
  grantedRoles:      [],   // extra roles unlocked by delegation (e.g. ['finance'])
  loading:           false,
  refresh:           () => {},
});

export const useCEODelegation = () => useContext(CEODelegationContext);


// ─────────────────────────────────────────────────────────────────────────────
// PROVIDER
// ─────────────────────────────────────────────────────────────────────────────

export const CEODelegationProvider = ({ children }) => {
  const { user, isAuthenticated } = useSelector((state) => state.auth);

  const [state, setState] = useState({
    isGlobalDelegate: false,
    delegatedTypes:   [],
    grantedRoles:     [],
    loading:          false,
  });

  const fetchDelegations = useCallback(async () => {
    // CEO sees everything natively — no delegation fetch needed
    // Unauthenticated users — skip
    if (!isAuthenticated || !user || user.role === 'ceo') return;

    setState((prev) => ({ ...prev, loading: true }));

    try {
      const res = await api.get('/ceo/my-delegations');
      if (!res.data.success) return;

      const { isGlobalDelegate, delegatedTypes } = res.data.data;

      // Build the set of extra roles unlocked by active delegations
      const grantedRoles = new Set();
      if (isGlobalDelegate) {
        // Global delegate → all CEO-gated roles
        ['finance', 'admin'].forEach((r) => grantedRoles.add(r));
      } else {
        delegatedTypes.forEach(({ requestType }) => {
          (DELEGATION_ROLE_GRANTS[requestType] || []).forEach((r) =>
            grantedRoles.add(r)
          );
        });
      }

      // Enrich each delegation with its approval path
      const enriched = delegatedTypes.map((d) => ({
        ...d,
        approvalPath: DELEGATION_APPROVAL_PATHS[d.requestType] || null,
        moduleKey:    DELEGATION_MODULE_MAP[d.requestType]    || null,
      }));

      setState({
        isGlobalDelegate,
        delegatedTypes:  enriched,
        grantedRoles:    [...grantedRoles],
        loading:         false,
      });
    } catch {
      // Silent fail — user simply has no delegations
      setState((prev) => ({ ...prev, loading: false }));
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    fetchDelegations();
  }, [fetchDelegations]);

  return (
    <CEODelegationContext.Provider
      value={{ ...state, refresh: fetchDelegations }}
    >
      {children}
    </CEODelegationContext.Provider>
  );
};

export default CEODelegationContext;
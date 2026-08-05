// src/config/supplierInvoiceStatus.js
//
// Single source of truth for every `approvalStatus` value that exists on the
// SupplierInvoice model. Import this anywhere a status needs to be rendered
// (tables, tabs, badges, timelines) instead of re-declaring a partial
// statusMap in each component — that's how pending_supply_chain_assignment,
// pending_department_head_approval and pending_head_of_business_approval
// ended up with no visual representation in either page.

import React from 'react';
import {
  TeamOutlined,
  UserOutlined,
  CrownOutlined,
  BankOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  DollarOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import { Tag } from 'antd';

// `order` is the position in the happy-path lifecycle, used to drive the
// <Steps> overview. rejected/paid are terminal and don't need an order for
// step placement (paid is treated as "after approved").
export const INVOICE_STATUS_CONFIG = {
  pending_supply_chain_assignment: {
    order: 0,
    color: 'blue',
    text: 'Pending Supply Chain Assignment',
    shortText: 'Awaiting Assignment',
    icon: <TeamOutlined />
  },
  pending_department_head_approval: {
    order: 1,
    color: 'gold',
    text: 'Awaiting Department Head Approval',
    shortText: 'Dept. Head',
    icon: <UserOutlined />
  },
  pending_head_of_business_approval: {
    order: 2,
    color: 'orange',
    text: 'Awaiting Head of Business Approval',
    shortText: 'Head of Business',
    icon: <CrownOutlined />
  },
  pending_finance_approval: {
    order: 3,
    color: 'purple',
    text: 'Awaiting Finance Approval',
    shortText: 'Finance',
    icon: <BankOutlined />
  },
  pending_ceo_approval: {
    order: 4,
    color: 'volcano',
    text: 'Awaiting CEO Approval',
    shortText: 'CEO',
    icon: <CrownOutlined />
  },
  approved: {
    order: 5,
    color: 'green',
    text: 'Fully Approved',
    shortText: 'Approved',
    icon: <CheckCircleOutlined />
  },
  paid: {
    order: 6,
    color: 'cyan',
    text: 'Paid',
    shortText: 'Paid',
    icon: <DollarOutlined />
  },
  rejected: {
    order: -1,
    color: 'red',
    text: 'Rejected',
    shortText: 'Rejected',
    icon: <CloseCircleOutlined />
  }
};

const FALLBACK = {
  order: -1,
  color: 'default',
  text: 'Unknown',
  shortText: 'Unknown',
  icon: <ClockCircleOutlined />
};

export const getStatusConfig = (status) => INVOICE_STATUS_CONFIG[status] || FALLBACK;

// Drop-in replacement for the `getStatusTag` helper that existed (partially)
// in both components.
export const StatusTag = ({ status }) => {
  const cfg = getStatusConfig(status);
  return (
    <Tag color={cfg.color} icon={cfg.icon}>
      {cfg.text}
    </Tag>
  );
};

// Maps an approval-chain step's `approver.role` string to a stage key, so we
// can figure out which stage a given chain entry represents regardless of
// which department's chain was used (chains vary in length: some skip
// "Head of Business", some add "CEO").
export const roleToStatusKey = (role = '') => {
  const r = role.toLowerCase();
  if (r.includes('ceo')) return 'pending_ceo_approval';
  if (r.includes('finance')) return 'pending_finance_approval';
  if (r.includes('head of business')) return 'pending_head_of_business_approval';
  return 'pending_department_head_approval';
};
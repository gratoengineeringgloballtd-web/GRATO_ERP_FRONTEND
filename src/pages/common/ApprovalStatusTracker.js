// src/components/common/ApprovalStatusTracker.jsx
//
// Renders where a SupplierInvoice currently sits in its approval lifecycle.
// Built to work for ANY invoice regardless of which department's chain was
// used (chains vary in length — Dept Head -> Finance, or Dept Head -> Head
// of Business -> Finance, or ... -> CEO), by reading invoice.approvalChain
// directly instead of assuming a fixed set of stages.
//
// Usage (identical in both the Finance page and the Supply Chain page):
//   <ApprovalStatusTracker invoice={selectedInvoice} onDownloadFile={downloadFile} />
//
// `onDownloadFile(fileMetadata, label)` is optional — pass the existing
// downloadFile/handleFileDownload function from each page so signed
// documents stay clickable inside the tracker.

import React from 'react';
import { Steps, Timeline, Tag, Typography, Button, Space, Alert, Card } from 'antd';
import {
  TeamOutlined,
  UserOutlined,
  CrownOutlined,
  BankOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  DownloadOutlined,
  FileTextOutlined,
  HistoryOutlined
} from '@ant-design/icons';
import { getStatusConfig, roleToStatusKey } from '../config/supplierInvoiceStatus';

const { Text, Title } = Typography;

const stageIcon = (key) => {
  switch (key) {
    case 'pending_supply_chain_assignment': return <TeamOutlined />;
    case 'pending_department_head_approval': return <UserOutlined />;
    case 'pending_head_of_business_approval': return <CrownOutlined />;
    case 'pending_finance_approval': return <BankOutlined />;
    case 'pending_ceo_approval': return <CrownOutlined />;
    case 'paid': return <DollarOutlined />;
    default: return <CheckCircleOutlined />;
  }
};

/**
 * Builds the ordered list of stages for the <Steps> overview:
 * Submitted -> Supply Chain Assignment -> [one entry per approvalChain level] -> Payment
 */
function buildStages(invoice) {
  const stages = [
    {
      key: 'submitted',
      title: 'Submitted',
      description: invoice.uploadedDate
        ? new Date(invoice.uploadedDate).toLocaleDateString('en-GB')
        : '',
      icon: <FileTextOutlined />
    },
    {
      key: 'pending_supply_chain_assignment',
      title: 'Supply Chain',
      description: invoice.assignedDepartment
        ? `Assigned to ${invoice.assignedDepartment}`
        : 'Assignment pending',
      icon: <TeamOutlined />
    }
  ];

  (invoice.approvalChain || [])
    .slice()
    .sort((a, b) => a.level - b.level)
    .forEach((step) => {
      const statusKey = roleToStatusKey(step.approver?.role);
      stages.push({
        key: `chain_${step.level}`,
        title: getStatusConfig(statusKey).shortText,
        description: step.approver?.name || '',
        icon: stageIcon(statusKey),
        chainStep: step
      });
    });

  stages.push({
    key: 'paid',
    title: 'Payment',
    description: invoice.paymentStatus === 'paid' ? 'Paid' : 'Awaiting payment',
    icon: <DollarOutlined />
  });

  return stages;
}

/** Determines which stage index is "current" and whether the whole thing is rejected. */
function computeProgress(invoice, stages) {
  if (invoice.approvalStatus === 'rejected') {
    // Find the stage that was rejected (supply chain, or a chain level)
    if (invoice.supplyChainReview?.action === 'rejected') {
      return { current: 1, isRejected: true, rejectedAt: 'pending_supply_chain_assignment' };
    }
    const rejectedStep = (invoice.approvalChain || []).find((s) => s.status === 'rejected');
    const idx = rejectedStep
      ? stages.findIndex((s) => s.chainStep?.level === rejectedStep.level)
      : stages.length - 1;
    return { current: idx, isRejected: true, rejectedAt: rejectedStep };
  }

  if (invoice.approvalStatus === 'paid') {
    return { current: stages.length - 1, isRejected: false };
  }
  if (invoice.approvalStatus === 'approved') {
    return { current: stages.length - 2, isRejected: false };
  }
  if (invoice.approvalStatus === 'pending_supply_chain_assignment') {
    return { current: 1, isRejected: false };
  }

  const activeLevel = invoice.currentApprovalLevel;
  const idx = stages.findIndex((s) => s.chainStep?.level === activeLevel);
  return { current: idx === -1 ? 1 : idx, isRejected: false };
}

const ApprovalStatusTracker = ({ invoice, onDownloadFile }) => {
  if (!invoice) return null;

  const stages = buildStages(invoice);
  const { current, isRejected } = computeProgress(invoice, stages);
  const statusCfg = getStatusConfig(invoice.approvalStatus);

  return (
    <div>
      <Space align="center" style={{ marginBottom: 16 }}>
        <Title level={5} style={{ margin: 0 }}>
          <HistoryOutlined /> Approval Status
        </Title>
        <Tag color={statusCfg.color} icon={statusCfg.icon}>{statusCfg.text}</Tag>
      </Space>

      <Steps
        size="small"
        current={current}
        status={isRejected ? 'error' : undefined}
        items={stages.map((s) => ({
          title: s.title,
          description: s.description,
          icon: s.icon
        }))}
        style={{ marginBottom: 20, overflowX: 'auto' }}
      />

      {isRejected && (
        <Alert
          type="error"
          showIcon
          message="This invoice was rejected"
          description={
            invoice.supplyChainReview?.rejectionReason ||
            (invoice.approvalChain || []).find((s) => s.status === 'rejected')?.comments ||
            'No reason provided.'
          }
          style={{ marginBottom: 16 }}
        />
      )}

      {/* Supply Chain assignment entry */}
      {invoice.supplyChainReview?.action === 'assigned' && (
        <Card size="small" style={{ marginBottom: 12, backgroundColor: '#f6ffed' }}>
          <Space direction="vertical" size={2} style={{ width: '100%' }}>
            <Text strong><TeamOutlined /> Supply Chain — Assigned</Text>
            <Text type="secondary">
              {invoice.supplyChainReview.reviewDate &&
                new Date(invoice.supplyChainReview.reviewDate).toLocaleDateString('en-GB')}
              {invoice.supplyChainReview.reviewTime && ` at ${invoice.supplyChainReview.reviewTime}`}
              {' — '}assigned to <Text strong>{invoice.assignedDepartment}</Text>
            </Text>
            {invoice.supplyChainReview.comments && (
              <Text italic>{invoice.supplyChainReview.comments}</Text>
            )}
            {invoice.supplyChainReview.signedDocument?.publicId && onDownloadFile && (
              <Button
                size="small"
                type="link"
                icon={<DownloadOutlined />}
                onClick={() => onDownloadFile(invoice.supplyChainReview.signedDocument, 'Supply Chain Signed Document')}
              >
                View signed document
              </Button>
            )}
          </Space>
        </Card>
      )}

      {/* Detailed per-level timeline */}
      {invoice.approvalChain?.length > 0 && (
        <Timeline style={{ marginTop: 8 }}>
          {invoice.approvalChain
            .slice()
            .sort((a, b) => a.level - b.level)
            .map((step, index) => {
              let color = 'gray';
              let icon = <ClockCircleOutlined />;
              if (step.status === 'approved') { color = 'green'; icon = <CheckCircleOutlined />; }
              if (step.status === 'rejected') { color = 'red'; icon = <CloseCircleOutlined />; }
              const isCurrent = step.level === invoice.currentApprovalLevel && step.status === 'pending';

              return (
                <Timeline.Item key={index} color={color} dot={icon}>
                  <Text strong>Level {step.level}: {step.approver?.name}</Text>
                  {isCurrent && <Tag color="gold" style={{ marginLeft: 8 }}>Current</Tag>}
                  <br />
                  <Text type="secondary">{step.approver?.role} — {step.approver?.email}</Text>
                  <br />
                  {step.status === 'pending' && (
                    <Tag color={isCurrent ? 'gold' : 'orange'}>
                      {isCurrent ? 'Awaiting Action' : 'Pending'}
                    </Tag>
                  )}
                  {step.status === 'approved' && (
                    <>
                      <Tag color="green">Approved & Signed</Tag>
                      {step.actionDate && (
                        <Text type="secondary">
                          {' '}{new Date(step.actionDate).toLocaleDateString('en-GB')}
                          {step.actionTime && ` at ${step.actionTime}`}
                        </Text>
                      )}
                      {step.signedDocument?.publicId && onDownloadFile && (
                        <div style={{ marginTop: 4 }}>
                          <Button
                            size="small"
                            type="link"
                            icon={<DownloadOutlined />}
                            onClick={() => onDownloadFile(step.signedDocument, `Level ${step.level} - ${step.approver?.name}`)}
                          >
                            View signed document
                          </Button>
                        </div>
                      )}
                      {step.comments && (
                        <div style={{ marginTop: 4 }}>
                          <Text italic>Comment: {step.comments}</Text>
                        </div>
                      )}
                    </>
                  )}
                  {step.status === 'rejected' && (
                    <>
                      <Tag color="red">Rejected</Tag>
                      {step.comments && (
                        <div style={{ marginTop: 4, color: '#ff4d4f' }}>
                          <Text>Reason: {step.comments}</Text>
                        </div>
                      )}
                    </>
                  )}
                </Timeline.Item>
              );
            })}
        </Timeline>
      )}

      {!invoice.approvalChain?.length && invoice.approvalStatus === 'pending_supply_chain_assignment' && (
        <Alert
          type="info"
          showIcon
          message="Awaiting Supply Chain assignment"
          description="The approval chain (Department Head → ... → Finance) is created once Supply Chain assigns this invoice to a department."
        />
      )}
    </div>
  );
};

export default ApprovalStatusTracker;
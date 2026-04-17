import React, { useState } from 'react';
import {
  Card, Button, Form, Input, Select, InputNumber, Table,
  Tag, Space, Typography, Divider, Alert, Modal, Descriptions,
  Row, Col, Badge, message, Tooltip
} from 'antd';
import {
  SendOutlined, CheckCircleOutlined, FilePdfOutlined,
  PlusOutlined, DeleteOutlined, InfoCircleOutlined,
  UserOutlined, ClockCircleOutlined, BoxPlotOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { itSupportAPI } from '../../services/api';

const { Text, Title } = Typography;
const { Option } = Select;
const { TextArea } = Input;

// ─────────────────────────────────────────────
// PDF Generator (client-side, print-to-PDF)
// ─────────────────────────────────────────────
export const generateDischargePDF = (request, dispatchedItems, itStaffName) => {
  const companyName = 'Grato Global';
  const ticketNumber = request.ticketNumber;
  const employee = request.employee;
  const now = dayjs().format('MMMM DD, YYYY [at] HH:mm');
  const acknowledgedAt = request.acknowledgmentSignature?.signedAt
    ? dayjs(request.acknowledgmentSignature.signedAt).format('MMMM DD, YYYY [at] HH:mm')
    : null;

  const requestedItemsRows = (request.requestedItems || []).map((item, i) => `
    <tr style="background:${i % 2 === 0 ? '#f9f9f9' : '#fff'}">
      <td style="padding:8px 12px;border-bottom:1px solid #eee">${item.item || '—'}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center">${item.quantity || '—'}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee">${item.brand || '—'}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee">${item.specifications || '—'}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right">${item.estimatedCost ? item.estimatedCost.toLocaleString() + ' XAF' : '—'}</td>
    </tr>
  `).join('');

  const dispatchedItemsRows = (dispatchedItems || []).map((item, i) => `
    <tr style="background:${i % 2 === 0 ? '#f0f7ff' : '#fff'}">
      <td style="padding:8px 12px;border-bottom:1px solid #eee">${item.name || '—'}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee">${item.brand || '—'}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee">${item.model || '—'}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee">${item.serialNumber || '—'}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center">${item.quantity || '—'}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee">${item.assetTag || '—'}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee">${item.condition || '—'}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee">${item.notes || '—'}</td>
    </tr>
  `).join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <title>IT Discharge Document - ${ticketNumber}</title>
      <style>
        @page { margin: 20mm; size: A4; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; color: #1a1a1a; line-height: 1.5; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 16px; border-bottom: 3px solid #1890ff; margin-bottom: 24px; }
        .company-name { font-size: 22px; font-weight: 700; color: #1890ff; letter-spacing: -0.5px; }
        .doc-title { font-size: 13px; color: #666; margin-top: 4px; }
        .ticket-badge { background: #1890ff; color: white; padding: 6px 14px; border-radius: 6px; font-size: 13px; font-weight: 600; }
        .section { margin-bottom: 20px; }
        .section-title { font-size: 13px; font-weight: 700; color: #1890ff; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px; padding-bottom: 4px; border-bottom: 1px solid #e6f4ff; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; }
        .info-item { display: flex; flex-direction: column; }
        .info-label { font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 0.4px; }
        .info-value { font-size: 12px; font-weight: 500; color: #1a1a1a; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; }
        thead tr { background: #1890ff; color: white; }
        thead th { padding: 8px 12px; text-align: left; font-weight: 600; font-size: 11px; }
        .status-badge { display: inline-block; background: #f6ffed; color: #52c41a; border: 1px solid #b7eb8f; padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 600; }
        .signature-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 32px; }
        .sig-box { border: 1px solid #d9d9d9; border-radius: 6px; padding: 16px; min-height: 80px; }
        .sig-label { font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 8px; }
        .sig-name { font-size: 13px; font-weight: 600; margin-top: 12px; }
        .sig-date { font-size: 11px; color: #666; }
        .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #eee; font-size: 10px; color: #999; text-align: center; }
        .highlight-row td { background: #fffbe6 !important; }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="company-name">${companyName}</div>
          <div class="doc-title">IT Equipment Discharge Document</div>
        </div>
        <div>
          <div class="ticket-badge">${ticketNumber}</div>
          <div style="font-size:11px;color:#666;margin-top:6px;text-align:right">Generated: ${now}</div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Employee Information</div>
        <div class="info-grid">
          <div class="info-item"><span class="info-label">Full Name</span><span class="info-value">${employee?.fullName || '—'}</span></div>
          <div class="info-item"><span class="info-label">Department</span><span class="info-value">${employee?.department || '—'}</span></div>
          <div class="info-item"><span class="info-label">Email</span><span class="info-value">${employee?.email || '—'}</span></div>
          <div class="info-item"><span class="info-label">Request Date</span><span class="info-value">${dayjs(request.createdAt).format('MMM DD, YYYY')}</span></div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Requested Items</div>
        <table>
          <thead><tr>
            <th>Item</th><th>Quantity</th><th>Brand</th><th>Specifications</th><th>Est. Cost</th>
          </tr></thead>
          <tbody>${requestedItemsRows || '<tr><td colspan="5" style="padding:12px;text-align:center;color:#999">No requested items recorded</td></tr>'}</tbody>
        </table>
      </div>

      <div class="section">
        <div class="section-title">Dispatched Items</div>
        <table>
          <thead><tr>
            <th>Item Name</th><th>Brand</th><th>Model</th><th>Serial No.</th><th style="text-align:center">Qty</th><th>Asset Tag</th><th>Condition</th><th>Notes</th>
          </tr></thead>
          <tbody>${dispatchedItemsRows || '<tr><td colspan="8" style="padding:12px;text-align:center;color:#999">No dispatched items recorded</td></tr>'}</tbody>
        </table>
      </div>

      <div class="section">
        <div class="section-title">Dispatch Status</div>
        <div class="info-grid">
          <div class="info-item"><span class="info-label">Dispatched By</span><span class="info-value">${itStaffName || '—'}</span></div>
          <div class="info-item"><span class="info-label">Dispatch Date</span><span class="info-value">${request.dischargeSignature?.signedAt ? dayjs(request.dischargeSignature.signedAt).format('MMM DD, YYYY HH:mm') : now}</span></div>
          <div class="info-item"><span class="info-label">Status</span><span class="info-value"><span class="status-badge">${request.status === 'discharge_complete' ? '✓ Acknowledged' : 'Pending Acknowledgment'}</span></span></div>
          ${acknowledgedAt ? `<div class="info-item"><span class="info-label">Acknowledged On</span><span class="info-value">${acknowledgedAt}</span></div>` : ''}
        </div>
      </div>

      <div class="signature-grid">
        <div class="sig-box">
          <div class="sig-label">IT Staff — Dispatched By</div>
          <div style="height:40px;border-bottom:1px dashed #ccc;margin-bottom:8px"></div>
          <div class="sig-name">${itStaffName || '—'}</div>
          <div class="sig-date">${request.dischargeSignature?.signedAt ? dayjs(request.dischargeSignature.signedAt).format('MMM DD, YYYY') : now}</div>
        </div>
        <div class="sig-box">
          <div class="sig-label">Employee — Acknowledgment of Receipt</div>
          <div style="height:40px;border-bottom:1px dashed #ccc;margin-bottom:8px"></div>
          <div class="sig-name">${request.status === 'discharge_complete' ? (employee?.fullName || '—') : 'Pending...'}</div>
          <div class="sig-date">${acknowledgedAt || 'Not yet acknowledged'}</div>
        </div>
      </div>

      <div class="footer">
        This document serves as an official record of IT equipment discharge for ${companyName}. 
        Ticket: ${ticketNumber} | Generated on ${now}
      </div>
    </body>
    </html>
  `;

  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => {
    win.print();
  }, 500);
};

// ─────────────────────────────────────────────
// Dispatch Form — shown to IT staff when status = 'resolved'
// ─────────────────────────────────────────────
const CONDITION_OPTIONS = ['New', 'Excellent', 'Good', 'Fair', 'Refurbished'];

const defaultItem = () => ({
  name: '', brand: '', model: '', serialNumber: '',
  quantity: 1, assetTag: '', condition: 'New', notes: ''
});

export const ITDispatchForm = ({ request, currentUser, onSuccess }) => {
  const [form] = Form.useForm();
  const [items, setItems] = useState(
    (request.requestedItems?.length > 0
      ? request.requestedItems.map(ri => ({
          name: ri.item || '',
          brand: ri.brand || '',
          model: ri.model || '',
          serialNumber: '',
          quantity: ri.quantity || 1,
          assetTag: '',
          condition: 'New',
          notes: ''
        }))
      : [defaultItem()])
  );
  const [submitting, setSubmitting] = useState(false);

  const updateItem = (index, field, value) => {
    setItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };

  const addItem = () => setItems(prev => [...prev, defaultItem()]);
  const removeItem = (index) => {
    if (items.length === 1) return message.warning('At least one item is required');
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    const hasEmpty = items.some(it => !it.name.trim());
    if (hasEmpty) return message.error('Please fill in the Item Name for all dispatched items');

    try {
      setSubmitting(true);
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/it-support/${request._id}/discharge`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ dischargedItems: items })
        }
      );
      const data = await response.json();
      if (data.success) {
        message.success('Items dispatched successfully. Awaiting employee acknowledgment.');
        onSuccess?.();
      } else {
        throw new Error(data.message);
      }
    } catch (err) {
      message.error(err.message || 'Failed to dispatch items');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card
      style={{ marginBottom: 16, border: '2px solid #1890ff', borderRadius: 10 }}
      title={
        <Space>
          <SendOutlined style={{ color: '#1890ff' }} />
          <Text strong style={{ color: '#1890ff', fontSize: 15 }}>Dispatch Items to Employee</Text>
          <Tag color="blue">Action Required</Tag>
        </Space>
      }
    >
      <Alert
        message="Ready to Dispatch"
        description="This request has been resolved. Fill in the actual item details being dispatched (may differ from what was requested) and submit to notify the employee."
        type="info"
        showIcon
        style={{ marginBottom: 20 }}
      />

      {items.map((item, index) => (
        <Card
          key={index}
          size="small"
          style={{ marginBottom: 12, background: '#fafcff', border: '1px solid #d0e8ff', borderRadius: 8 }}
          title={
            <Space>
              <BoxPlotOutlined style={{ color: '#1890ff' }} />
              <Text strong style={{ fontSize: 13 }}>Item {index + 1}</Text>
              {request.requestedItems?.[index] && (
                <Tooltip title={`Originally requested: ${request.requestedItems[index].item}`}>
                  <Tag color="geekblue" style={{ fontSize: 11 }}>
                    Requested: {request.requestedItems[index].item}
                  </Tag>
                </Tooltip>
              )}
            </Space>
          }
          extra={
            items.length > 1 && (
              <Button
                type="text"
                danger
                size="small"
                icon={<DeleteOutlined />}
                onClick={() => removeItem(index)}
              />
            )
          }
        >
          <Row gutter={[12, 12]}>
            <Col xs={24} sm={12} md={8}>
              <div>
                <Text style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>
                  Item Name <span style={{ color: 'red' }}>*</span>
                </Text>
                <Input
                  value={item.name}
                  onChange={e => updateItem(index, 'name', e.target.value)}
                  placeholder="e.g. Wireless Mouse"
                  status={!item.name.trim() ? 'warning' : ''}
                />
              </div>
            </Col>
            <Col xs={12} sm={6} md={4}>
              <div>
                <Text style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>Brand</Text>
                <Input
                  value={item.brand}
                  onChange={e => updateItem(index, 'brand', e.target.value)}
                  placeholder="e.g. Logitech"
                />
              </div>
            </Col>
            <Col xs={12} sm={6} md={4}>
              <div>
                <Text style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>Model</Text>
                <Input
                  value={item.model}
                  onChange={e => updateItem(index, 'model', e.target.value)}
                  placeholder="e.g. MX Master 3"
                />
              </div>
            </Col>
            <Col xs={12} sm={8} md={4}>
              <div>
                <Text style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>Serial Number</Text>
                <Input
                  value={item.serialNumber}
                  onChange={e => updateItem(index, 'serialNumber', e.target.value)}
                  placeholder="SN-XXXX"
                />
              </div>
            </Col>
            <Col xs={6} sm={4} md={2}>
              <div>
                <Text style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>Qty</Text>
                <InputNumber
                  min={1}
                  value={item.quantity}
                  onChange={val => updateItem(index, 'quantity', val)}
                  style={{ width: '100%' }}
                />
              </div>
            </Col>
            <Col xs={12} sm={8} md={4}>
              <div>
                <Text style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>Asset Tag</Text>
                <Input
                  value={item.assetTag}
                  onChange={e => updateItem(index, 'assetTag', e.target.value)}
                  placeholder="TAG-XXXX"
                />
              </div>
            </Col>
            <Col xs={12} sm={8} md={4}>
              <div>
                <Text style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>Condition</Text>
                <Select
                  value={item.condition}
                  onChange={val => updateItem(index, 'condition', val)}
                  style={{ width: '100%' }}
                >
                  {CONDITION_OPTIONS.map(c => <Option key={c} value={c}>{c}</Option>)}
                </Select>
              </div>
            </Col>
            <Col xs={24} sm={16} md={20}>
              <div>
                <Text style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>Notes</Text>
                <Input
                  value={item.notes}
                  onChange={e => updateItem(index, 'notes', e.target.value)}
                  placeholder="Any additional notes about this item..."
                />
              </div>
            </Col>
          </Row>
        </Card>
      ))}

      <Space style={{ marginTop: 8, marginBottom: 20 }}>
        <Button icon={<PlusOutlined />} onClick={addItem} type="dashed">
          Add Another Item
        </Button>
      </Space>

      <Divider style={{ margin: '16px 0' }} />

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
        <Button
          type="primary"
          icon={<SendOutlined />}
          loading={submitting}
          onClick={handleSubmit}
          size="large"
          style={{ minWidth: 180 }}
        >
          Dispatch Items
        </Button>
      </div>
    </Card>
  );
};

// ─────────────────────────────────────────────
// Dispatch Status View — shown to IT after dispatch (status = pending_acknowledgment or discharge_complete)
// ─────────────────────────────────────────────
export const ITDispatchStatusCard = ({ request, currentUser }) => {
  const isPendingAck = request.status === 'pending_acknowledgment';
  const isComplete = request.status === 'discharge_complete';
  const dispatched = request.dischargedItems || [];
  const itStaffName = request.dischargeSignature?.name || currentUser?.fullName || 'IT Staff';

  const columns = [
    { title: 'Item Name', dataIndex: 'name', key: 'name', render: v => <Text strong>{v}</Text> },
    { title: 'Brand', dataIndex: 'brand', key: 'brand', render: v => v || '—' },
    { title: 'Model', dataIndex: 'model', key: 'model', render: v => v || '—' },
    { title: 'Serial No.', dataIndex: 'serialNumber', key: 'serialNumber', render: v => v ? <Text code style={{ fontSize: 11 }}>{v}</Text> : '—' },
    { title: 'Qty', dataIndex: 'quantity', key: 'quantity', width: 60, align: 'center' },
    { title: 'Asset Tag', dataIndex: 'assetTag', key: 'assetTag', render: v => v || '—' },
    { title: 'Condition', dataIndex: 'condition', key: 'condition', render: v => v ? <Tag color="blue">{v}</Tag> : '—' },
    { title: 'Notes', dataIndex: 'notes', key: 'notes', render: v => v || '—' },
  ];

  return (
    <Card
      style={{
        marginBottom: 16,
        border: `2px solid ${isComplete ? '#52c41a' : '#faad14'}`,
        borderRadius: 10
      }}
      title={
        <Space>
          {isComplete
            ? <CheckCircleOutlined style={{ color: '#52c41a' }} />
            : <ClockCircleOutlined style={{ color: '#faad14' }} />
          }
          <Text strong style={{ color: isComplete ? '#52c41a' : '#faad14', fontSize: 15 }}>
            {isComplete ? 'Dispatch Complete — Acknowledged' : 'Items Dispatched — Awaiting Acknowledgment'}
          </Text>
        </Space>
      }
      extra={
        <Button
          icon={<FilePdfOutlined />}
          onClick={() => generateDischargePDF(request, dispatched, itStaffName)}
          type={isComplete ? 'primary' : 'default'}
        >
          Download PDF
        </Button>
      }
    >
      {isPendingAck && (
        <Alert
          message="Waiting for Employee Acknowledgment"
          description={`Items have been dispatched to ${request.employee?.fullName}. The employee must confirm receipt on their end.`}
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {isComplete && (
        <Alert
          message="Employee Has Acknowledged Receipt"
          description={
            <Space direction="vertical" size={2}>
              <Text>Acknowledged by: <Text strong>{request.acknowledgmentSignature?.name || request.employee?.fullName}</Text></Text>
              <Text>Date: <Text strong>{request.acknowledgmentSignature?.signedAt ? dayjs(request.acknowledgmentSignature.signedAt).format('MMM DD, YYYY [at] HH:mm') : '—'}</Text></Text>
            </Space>
          }
          type="success"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <Descriptions size="small" column={2} style={{ marginBottom: 16 }}>
        <Descriptions.Item label="Dispatched By">
          <Space><UserOutlined />{itStaffName}</Space>
        </Descriptions.Item>
        <Descriptions.Item label="Dispatch Date">
          {request.dischargeSignature?.signedAt
            ? dayjs(request.dischargeSignature.signedAt).format('MMM DD, YYYY HH:mm')
            : dayjs().format('MMM DD, YYYY HH:mm')}
        </Descriptions.Item>
        <Descriptions.Item label="Total Items Dispatched">
          <Badge count={dispatched.length} style={{ backgroundColor: '#1890ff' }} />
        </Descriptions.Item>
        <Descriptions.Item label="Acknowledgment Status">
          {isComplete
            ? <Tag color="success" icon={<CheckCircleOutlined />}>Acknowledged</Tag>
            : <Tag color="warning" icon={<ClockCircleOutlined />}>Pending</Tag>
          }
        </Descriptions.Item>
      </Descriptions>

      {dispatched.length > 0 && (
        <>
          <Divider orientation="left" style={{ fontSize: 12, color: '#888' }}>Dispatched Items</Divider>
          <Table
            columns={columns}
            dataSource={dispatched.map((d, i) => ({ ...d, key: i }))}
            size="small"
            pagination={false}
            scroll={{ x: 'max-content' }}
          />
        </>
      )}
    </Card>
  );
};
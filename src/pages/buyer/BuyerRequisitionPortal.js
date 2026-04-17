import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card, Table, Button, Space, Typography, Tag, Row, Col, Statistic,
  Modal, Form, Input, Select, DatePicker, InputNumber, Tabs, Badge,
  Drawer, message, Alert, Divider, Tooltip, Steps, Checkbox, Rate,
  Timeline
} from 'antd';
import {
  ShoppingCartOutlined, EyeOutlined, SendOutlined, UserOutlined,
  DollarOutlined, CalendarOutlined, FileTextOutlined, CheckCircleOutlined,
  ClockCircleOutlined, MailOutlined, SettingOutlined, TruckOutlined,
  FilterOutlined, ExportOutlined, GlobalOutlined,
  CopyOutlined, DownloadOutlined, ExclamationCircleOutlined
} from '@ant-design/icons';
import moment from 'moment';
import { buyerRequisitionAPI } from '../../services/buyerRequisitionAPI';
import EnhancedSupplierSelection from '../../components/EnhancedSupplierSelection';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;
const { Step } = Steps;

const BuyerRequisitionPortal = () => {
  const navigate = useNavigate();

  const [requisitions,             setRequisitions]             = useState([]);
  const [allRequisitions,          setAllRequisitions]          = useState([]);
  const [selectedRequisition,      setSelectedRequisition]      = useState(null);
  const [detailDrawerVisible,      setDetailDrawerVisible]      = useState(false);
  const [sourcingDrawerVisible,    setSourcingDrawerVisible]    = useState(false);
  const [supplierSelectionVisible, setSupplierSelectionVisible] = useState(false);
  const [loading,                  setLoading]                  = useState(false);
  const [statsLoading,             setStatsLoading]             = useState(false);
  const [suppliers,                setSuppliers]                = useState([]);
  const [selectedSuppliers,        setSelectedSuppliers]        = useState([]);
  const [sourcingForm]   = Form.useForm();
  const [activeTab,      setActiveTab]      = useState('pending');
  const [currentStep,    setCurrentStep]    = useState(0);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Acknowledgment state
  const [acknowledgmentModalVisible,  setAcknowledgmentModalVisible]  = useState(false);
  const [selectedDisbursement,        setSelectedDisbursement]        = useState(null);
  const [acknowledgingDisbursement,   setAcknowledgingDisbursement]   = useState(false);
  const [acknowledgmentForm] = Form.useForm();

  // ── fetch helpers ────────────────────────────────────────────────────────

  const loadAllRequisitionsForStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const res = await buyerRequisitionAPI.getAssignedRequisitions({});
      if (res.success) setAllRequisitions(res.data || []);
    } catch (err) {
      console.error('Stats load error:', err);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const loadRequisitions = useCallback(async () => {
    try {
      setLoading(true);

      const statusFilter = {
        pending:              { sourcingStatus: 'pending_sourcing' },
        in_progress:          { sourcingStatus: 'in_progress'     },
        quoted:               { sourcingStatus: 'quotes_received' },
        completed:            { sourcingStatus: 'completed'       },
        justified:            { justified: true },
        needs_acknowledgment: { sourcingStatus: 'needs_acknowledgment' },
        all:                  {}
      };

      const filters = statusFilter[activeTab] ?? {};
      const res = await buyerRequisitionAPI.getAssignedRequisitions(filters);

      if (res.success) {
        setRequisitions(res.data || []);
        if (activeTab === 'all') setAllRequisitions(res.data || []);
      } else {
        message.error(res.message || 'Failed to load requisitions');
      }
    } catch (err) {
      message.error(err.message || 'Error loading requisitions');
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => { loadAllRequisitionsForStats(); }, [loadAllRequisitionsForStats]);
  useEffect(() => { loadRequisitions();             }, [loadRequisitions]);

  const loadSuppliers = async (category) => {
    if (!category) { message.warning('No category specified'); return; }
    try {
      setLoading(true);
      const res = await buyerRequisitionAPI.getSuppliersByCategory(category);
      setSuppliers(res.success ? (res.data || []) : []);
      if (!res.success) message.error(res.message || 'Failed to load suppliers');
    } catch (err) {
      message.error(err.message || 'Error loading suppliers');
      setSuppliers([]);
    } finally { setLoading(false); }
  };

  // ── stats ────────────────────────────────────────────────────────────────
  const stats = {
    pending:             allRequisitions.filter(r => r.sourcingStatus === 'pending_sourcing').length,
    inProgress:          allRequisitions.filter(r => r.sourcingStatus === 'in_progress').length,
    quoted:              allRequisitions.filter(r => r.sourcingStatus === 'quotes_received').length,
    completed:           allRequisitions.filter(r => r.sourcingStatus === 'completed').length,
    justified:           allRequisitions.filter(r => r.sourcingStatus === 'justified').length,
    needsAcknowledgment: allRequisitions.filter(r => r.sourcingStatus === 'needs_acknowledgment').length,
  };

  // ── frontend search filter ───────────────────────────────────────────────
  const filteredRequisitions = searchQuery.trim() === ''
    ? requisitions
    : requisitions.filter(r => {
        const q = searchQuery.toLowerCase();
        return (
          (r.id?.toString() || '').toLowerCase().includes(q)         ||
          (r.title         || '').toLowerCase().includes(q)          ||
          (r.requester     || '').toLowerCase().includes(q)          ||
          (r.department    || '').toLowerCase().includes(q)
        );
      });

  // ── display helpers ──────────────────────────────────────────────────────

  const getStatusTag = (status) => {
    const map = {
      pending_sourcing:                    { color: 'orange',   text: 'Pending Sourcing'            },
      in_progress:                         { color: 'blue',     text: 'Sourcing in Progress'        },
      quotes_received:                     { color: 'purple',   text: 'Quotes Received'             },
      completed:                           { color: 'green',    text: 'Completed'                   },
      justified:                           { color: 'gold',     text: 'Needs Justification'         },
      needs_acknowledgment:                { color: 'volcano',  text: 'Needs Acknowledgment'        },
      partially_disbursed:                 { color: 'cyan',     text: 'Partially Disbursed'         },
      fully_disbursed:                     { color: 'geekblue', text: 'Fully Disbursed'             },
      justification_pending_supervisor:    { color: 'gold',     text: 'Justification – Supervisor'  },
      justification_pending_finance:       { color: 'gold',     text: 'Justification – Finance'    },
      justification_pending_supply_chain:  { color: 'gold',     text: 'Justification – SC'         },
      justification_pending_head:          { color: 'gold',     text: 'Justification – Head'       },
      justification_rejected:              { color: 'red',      text: 'Justification Rejected'     },
      justification_approved:              { color: 'green',    text: 'Justification Approved'     }
    };
    const s = map[status] || { color: 'default', text: status };
    return <Tag color={s.color}>{s.text}</Tag>;
  };

  const getUrgencyTag = (urgency) => {
    const map = { Low: 'green', Medium: 'orange', High: 'red', Urgent: 'volcano' };
    return <Tag color={map[urgency] || 'default'}>{urgency}</Tag>;
  };

  // ── event handlers ───────────────────────────────────────────────────────

  const handleViewDetails = async (record) => {
    try {
      setLoading(true);
      const res = await buyerRequisitionAPI.getRequisitionDetails(record.id);
      if (res.success) { setSelectedRequisition(res.data); setDetailDrawerVisible(true); }
      else message.error(res.message || 'Failed to load details');
    } catch (err) { message.error(err.message || 'Error loading details'); }
    finally { setLoading(false); }
  };

  const handleStartSourcing = async (record) => {
    try {
      setSelectedRequisition(record);
      await loadSuppliers(record.category);
      setSelectedSuppliers([]);
      sourcingForm.resetFields();
      sourcingForm.setFieldsValue({
        expectedDeliveryDate: record.expectedDeliveryDate
          ? moment(record.expectedDeliveryDate) : moment().add(14, 'days'),
        quotationDeadline:    moment().add(5, 'days'),
        paymentTerms:         '30 days',
        deliveryLocation:     record.deliveryLocation || '',
        evaluationCriteria:   { quality: 40, cost: 35, delivery: 25 }
      });
      setCurrentStep(0);
      setSourcingDrawerVisible(true);
    } catch (err) { message.error('Failed to initialise sourcing process'); }
  };

  const handleSupplierToggle = (id, checked) =>
    setSelectedSuppliers(prev => checked ? [...prev, id] : prev.filter(x => x !== id));

  const validateSourcingForm = async () => {
    try {
      await sourcingForm.validateFields();
      const edd = sourcingForm.getFieldValue('expectedDeliveryDate');
      const qd  = sourcingForm.getFieldValue('quotationDeadline');
      if (!edd) throw new Error('Expected delivery date is required');
      if (!qd)  throw new Error('Quotation deadline is required');
      if (qd.isAfter(edd)) throw new Error('Quotation deadline must be before delivery date');
      const c = sourcingForm.getFieldValue('evaluationCriteria');
      if (c) {
        const total = (c.quality || 0) + (c.cost || 0) + (c.delivery || 0);
        if (total !== 100) throw new Error(`Criteria weights must total 100% (currently ${total}%)`);
      }
      return true;
    } catch (err) {
      message.error(err.errorFields ? err.errorFields[0].errors[0] : err.message);
      return false;
    }
  };

  const handleSupplierSelectionConfirm = async (supplierData) => {
    try {
      if (!(await validateSourcingForm())) return;
      setLoading(true);

      const fv = sourcingForm.getFieldsValue(true);
      const rfqData = {
        selectedSuppliers:      supplierData.selectedSuppliers      || [],
        externalSupplierEmails: supplierData.externalSupplierEmails || [],
        expectedDeliveryDate:   fv.expectedDeliveryDate?.toISOString() ?? null,
        quotationDeadline:      fv.quotationDeadline?.toISOString()    ?? null,
        paymentTerms:           fv.paymentTerms        || '30 days',
        deliveryLocation:       fv.deliveryLocation    || selectedRequisition.deliveryLocation,
        specialRequirements:    fv.specialRequirements || '',
        evaluationCriteria:     fv.evaluationCriteria  || { quality: 40, cost: 35, delivery: 25 }
      };

      const validation = buyerRequisitionAPI.validateRFQData(rfqData);
      if (!validation.isValid) { validation.errors.forEach(e => message.error(e)); setLoading(false); return; }
      validation.warnings.forEach(w => message.warning(w));

      Modal.confirm({
        title: 'Confirm RFQ Submission',
        content: (
          <div>
            <p>Sending RFQ to:</p>
            <ul>
              <li><strong>Registered:</strong> {validation.totalSuppliers}</li>
              <li><strong>External:</strong>   {validation.totalExternalSuppliers}</li>
            </ul>
            <p>Deadline: {fv.quotationDeadline?.format('MMM DD, YYYY')}</p>
            <p>Delivery: {fv.expectedDeliveryDate?.format('MMM DD, YYYY')}</p>
            {validation.hasExternalSuppliers && (
              <Alert message="External suppliers receive email invitations." type="info" showIcon style={{ marginTop: 12 }} />
            )}
          </div>
        ),
        onOk: async () => {
          try {
            const res = await buyerRequisitionAPI.createAndSendRFQ(selectedRequisition.id, rfqData);
            if (res.success) {
              const { totalSuppliersInvited = 0, registeredSuppliersInvited = 0, externalSuppliersInvited = 0 } = res.data;
              message.success(
                `RFQ sent to ${totalSuppliersInvited} supplier(s) ` +
                `(${registeredSuppliersInvited} registered, ${externalSuppliersInvited} external)`
              );
              setSupplierSelectionVisible(false);
              setSourcingDrawerVisible(false);
              setCurrentStep(0);
              setSelectedSuppliers([]);
              setSelectedRequisition(null);
              await Promise.all([loadRequisitions(), loadAllRequisitionsForStats()]);
            } else {
              message.error(res.message || 'Failed to submit RFQ');
            }
          } catch (err) {
            message.error(err.message || 'Failed to submit RFQ');
          } finally { setLoading(false); }
        },
        onCancel: () => setLoading(false)
      });
    } catch (err) {
      message.error(err.message || 'Failed to process supplier selection');
      setLoading(false);
    }
  };

  const handleSubmitSourcing = async () => {
    if (await validateSourcingForm()) setSupplierSelectionVisible(true);
  };

  // ── acknowledgment handler ───────────────────────────────────────────────

  const handleAcknowledgeDisbursement = async (values) => {
    if (!selectedRequisition || !selectedDisbursement) return;
    try {
      setAcknowledgingDisbursement(true);
      const response = await fetch(
        `/api/purchase-requisitions/${selectedRequisition.id}/disbursements/${selectedDisbursement._id}/acknowledge`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify(values)
        }
      );
      const data = await response.json();
      if (data.success) {
        message.success('Disbursement receipt acknowledged successfully!');
        setAcknowledgmentModalVisible(false);
        setSelectedDisbursement(null);
        acknowledgmentForm.resetFields();
        // Refresh drawer with updated data
        await handleViewDetails({ id: selectedRequisition.id });
        await Promise.all([loadRequisitions(), loadAllRequisitionsForStats()]);
      } else {
        message.error(data.message || 'Failed to acknowledge disbursement');
      }
    } catch (err) {
      message.error(err.message || 'Failed to acknowledge disbursement');
    } finally {
      setAcknowledgingDisbursement(false);
    }
  };

  // ── table columns ────────────────────────────────────────────────────────

  const columns = [
    {
      title: 'Requisition Details', key: 'details', width: 210,
      render: (_, r) => (
        <Space direction="vertical" size="small">
          <Text strong>{r.title}</Text>
          <Space size="small">
            <Tag color="blue">{r.id}</Tag>
            <Tag color="green">{r.category}</Tag>
          </Space>
        </Space>
      )
    },
    {
      title: 'Requester', key: 'requester', width: 150,
      render: (_, r) => (
        <Space direction="vertical" size="small">
          <Text>{r.requester}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>{r.department}</Text>
        </Space>
      )
    },
    {
      title: 'Budget', key: 'budget', width: 140,
      render: (_, r) => (
        <Text strong style={{ color: '#1890ff' }}>
          XAF {r.budget?.toLocaleString() ?? '—'}
        </Text>
      )
    },
    {
      title: 'Items', dataIndex: 'items', key: 'items', align: 'center', width: 70,
      render: items => (
        <Badge count={Array.isArray(items) ? items.length : 0} showZero>
          <FileTextOutlined />
        </Badge>
      )
    },
    {
      title: 'Expected Delivery', key: 'delivery', width: 145,
      render: (_, r) => {
        if (!r.expectedDeliveryDate) return <Text type="secondary">Not set</Text>;
        const overdue = moment(r.expectedDeliveryDate).isBefore(moment());
        return (
          <Space direction="vertical" size={0}>
            <Text style={{ color: overdue ? '#ff4d4f' : undefined }}>
              {moment(r.expectedDeliveryDate).format('MMM DD, YYYY')}
            </Text>
            <Text type="secondary" style={{ fontSize: 11 }}>
              {moment(r.expectedDeliveryDate).fromNow()}
            </Text>
            {overdue && <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />}
          </Space>
        );
      }
    },
    {
      title: 'Urgency', dataIndex: 'urgency', key: 'urgency', width: 100,
      render: getUrgencyTag
    },
    {
      title: 'Status', dataIndex: 'sourcingStatus', key: 'sourcingStatus', width: 190,
      render: getStatusTag
    },
    {
      title: 'Actions', key: 'actions', width: 200, fixed: 'right',
      render: (_, r) => (
        <Space wrap>
          <Tooltip title="View Details">
            <Button type="link" size="small" icon={<EyeOutlined />}
              onClick={() => handleViewDetails(r)} />
          </Tooltip>

          {r.sourcingStatus === 'pending_sourcing' && (
            <Tooltip title="Start Sourcing">
              <Button type="primary" size="small" icon={<SendOutlined />}
                onClick={() => handleStartSourcing(r)}>
                Source
              </Button>
            </Tooltip>
          )}

          {r.sourcingStatus === 'in_progress' && (
            <Tooltip title="Manage Sourcing">
              <Button size="small" icon={<SettingOutlined />}
                onClick={() => handleStartSourcing(r)}>
                Manage
              </Button>
            </Tooltip>
          )}

          {r.sourcingStatus === 'justified' && (
            <Tooltip title="Open Justification Form">
              <Button type="dashed" size="small" icon={<FileTextOutlined />}
                onClick={() => navigate(`/buyer/requisitions/${r.id}/justify`)}>
                Justify
              </Button>
            </Tooltip>
          )}

          {r.sourcingStatus === 'needs_acknowledgment' && (
            <Tooltip title="View & Acknowledge Disbursements">
              <Button
                type="primary"
                size="small"
                icon={<CheckCircleOutlined />}
                onClick={() => handleViewDetails(r)}
                style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
              >
                Acknowledge
              </Button>
            </Tooltip>
          )}
        </Space>
      )
    }
  ];

  const sourcingSteps = [
    { title: 'Supplier Selection', description: 'Choose suppliers to invite' },
    { title: 'Sourcing Criteria',  description: 'Set evaluation criteria'    },
    { title: 'Review & Submit',    description: 'Send to suppliers'          }
  ];

  // ── render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: 24 }}>

      {/* Header */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={2} style={{ margin: 0 }}>
            <ShoppingCartOutlined style={{ marginRight: 8, color: '#1890ff' }} />
            Purchase Requisition Management
          </Title>
        </Col>
        <Col>
          <Space>
            <Button icon={<ExportOutlined />}>Export Report</Button>
            <Button icon={<FilterOutlined />}>Filters</Button>
          </Space>
        </Col>
      </Row>

      {/* Global search bar */}
      <Row style={{ marginBottom: 24 }}>
        <Col span={24}>
          <Input.Search
            placeholder="Search by requisition number, title, requester or department..."
            allowClear
            size="large"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onSearch={value => setSearchQuery(value)}
            style={{ width: '100%' }}
          />
        </Col>
      </Row>

      {/* Stats */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {[
          { title: 'Pending Sourcing',      value: stats.pending,             icon: <ClockCircleOutlined />, color: '#faad14' },
          { title: 'In Progress',           value: stats.inProgress,          icon: <SendOutlined />,        color: '#1890ff' },
          { title: 'Quotes Received',       value: stats.quoted,              icon: <MailOutlined />,        color: '#722ed1' },
          { title: 'Completed',             value: stats.completed,           icon: <CheckCircleOutlined />, color: '#52c41a' },
          { title: 'Needs Acknowledgment',  value: stats.needsAcknowledgment, icon: <DollarOutlined />,      color: '#fa541c' },
        ].map(s => (
          <Col span={4} key={s.title}>
            <Card>
              <Statistic
                title={s.title}
                value={statsLoading ? '…' : s.value}
                prefix={s.icon}
                valueStyle={{ color: s.color }}
              />
            </Card>
          </Col>
        ))}
      </Row>

      {/* Alerts */}
      {stats.pending > 0 && (
        <Alert
          message={`${stats.pending} requisition(s) pending sourcing`}
          description="Ready for supplier selection and RFQ creation."
          type="warning" showIcon
          action={<Button size="small" type="primary" onClick={() => setActiveTab('pending')}>View</Button>}
          style={{ marginBottom: 16 }}
        />
      )}
      {stats.justified > 0 && (
        <Alert
          message={`${stats.justified} requisition(s) need justification`}
          description="Cash has been disbursed. Please complete the purchase justification form."
          type="info" showIcon
          action={<Button size="small" type="primary" onClick={() => setActiveTab('justified')}>View</Button>}
          style={{ marginBottom: 16 }}
        />
      )}
      {stats.needsAcknowledgment > 0 && (
        <Alert
          message={`${stats.needsAcknowledgment} requisition(s) need disbursement acknowledgment`}
          description="Cash has been disbursed. Please acknowledge receipt of the funds."
          type="warning" showIcon
          action={
            <Button size="small" type="primary" onClick={() => setActiveTab('needs_acknowledgment')}>
              View
            </Button>
          }
          style={{ marginBottom: 24 }}
        />
      )}

      {/* Tabs */}
      <Tabs
        activeKey={activeTab}
        onChange={tab => { setActiveTab(tab); setSearchQuery(''); }}
        style={{ marginBottom: 0 }}
        items={[
          {
            key: 'pending',
            label: <Badge count={stats.pending} offset={[10, 0]}>Pending Sourcing ({stats.pending})</Badge>
          },
          {
            key: 'in_progress',
            label: <Badge count={stats.inProgress} offset={[10, 0]}>In Progress ({stats.inProgress})</Badge>
          },
          { key: 'quoted',    label: `Quotes Received (${stats.quoted})`     },
          { key: 'completed', label: `Completed (${stats.completed})`        },
          {
            key: 'justified',
            label: <Badge count={stats.justified} offset={[10, 0]}>Needs Justification ({stats.justified})</Badge>
          },
          {
            key: 'needs_acknowledgment',
            label: (
              <Badge count={stats.needsAcknowledgment} offset={[10, 0]}>
                Needs Acknowledgment ({stats.needsAcknowledgment})
              </Badge>
            )
          },
          { key: 'all', label: `All Requisitions (${allRequisitions.length})` }
        ]}
      />

      {/* Table */}
      <Card>
        {searchQuery && (
          <div style={{ marginBottom: 12 }}>
            <Text type="secondary">
              Showing {filteredRequisitions.length} result{filteredRequisitions.length !== 1 ? 's' : ''} for{' '}
              <Text strong>"{searchQuery}"</Text>
            </Text>
          </div>
        )}
        <Table
          columns={columns}
          dataSource={filteredRequisitions}
          loading={loading}
          rowKey="id"
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            defaultPageSize: 20,
            pageSizeOptions: ['10', '20', '50', '100'],
            showTotal: (total, range) =>
              searchQuery
                ? `${range[0]}–${range[1]} of ${total} results for "${searchQuery}"`
                : `${range[0]}–${range[1]} of ${total} requisitions`
          }}
          scroll={{ x: 'max-content' }}
        />
      </Card>

      {/* Supplier Selection Modal */}
      <EnhancedSupplierSelection
        visible={supplierSelectionVisible}
        onCancel={() => setSupplierSelectionVisible(false)}
        onConfirm={handleSupplierSelectionConfirm}
        loading={loading}
        category={selectedRequisition?.category}
      />

      {/* ── Detail Drawer ──────────────────────────────────────────────────── */}
      <Drawer
        title={<Title level={4}>Requisition Details</Title>}
        placement="right" width={800}
        open={detailDrawerVisible}
        onClose={() => { setDetailDrawerVisible(false); setSelectedRequisition(null); }}
      >
        {selectedRequisition && (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Card size="small">
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Text type="secondary">Requisition ID:</Text>
                  <div><Text strong>{selectedRequisition.id}</Text></div>
                  <Text type="secondary">Title:</Text>
                  <div><Text strong>{selectedRequisition.title}</Text></div>
                  <Text type="secondary">Requester:</Text>
                  <div><UserOutlined style={{ marginRight: 8 }} />{selectedRequisition.requester}</div>
                  <Text type="secondary">Department:</Text>
                  <div><Text>{selectedRequisition.department}</Text></div>
                  <Text type="secondary">Request Date:</Text>
                  <div>
                    <CalendarOutlined style={{ marginRight: 8 }} />
                    {moment(selectedRequisition.requestDate).format('MMM DD, YYYY')}
                  </div>
                </Col>
                <Col span={12}>
                  <Text type="secondary">Expected Delivery:</Text>
                  <div>
                    <TruckOutlined style={{ marginRight: 8 }} />
                    {selectedRequisition.expectedDeliveryDate
                      ? moment(selectedRequisition.expectedDeliveryDate).format('MMM DD, YYYY')
                      : 'Not specified'}
                  </div>
                  <Text type="secondary">Budget:</Text>
                  <div>
                    <DollarOutlined style={{ marginRight: 8, color: '#1890ff' }} />
                    <Text strong style={{ color: '#1890ff' }}>
                      XAF {selectedRequisition.budget?.toLocaleString() || '—'}
                    </Text>
                  </div>
                  <Text type="secondary">Urgency:</Text>
                  <div>{getUrgencyTag(selectedRequisition.urgency)}</div>
                  <Text type="secondary">Category:</Text>
                  <div><Tag color="blue">{selectedRequisition.category}</Tag></div>
                  <Text type="secondary">Status:</Text>
                  <div>{getStatusTag(selectedRequisition.sourcingStatus)}</div>
                  <Text type="secondary">Delivery Location:</Text>
                  <div>
                    <GlobalOutlined style={{ marginRight: 8 }} />
                    {selectedRequisition.deliveryLocation || 'Not specified'}
                  </div>
                </Col>
              </Row>
            </Card>

            <Card size="small" title="Items Requested">
              <Table
                columns={[
                  { title: 'Description',   dataIndex: 'description',   key: 'description'   },
                  { title: 'Quantity',       dataIndex: 'quantity',       key: 'quantity',      width: 80 },
                  { title: 'Unit',           dataIndex: 'unit',           key: 'unit',          width: 80 },
                  { title: 'Specifications', dataIndex: 'specifications', key: 'specifications' }
                ]}
                dataSource={selectedRequisition.items || []}
                pagination={false} size="small" rowKey={(_, i) => i}
              />
            </Card>

            {/* ── Disbursement History — buyer acknowledges receipt ── */}
            {['needs_acknowledgment', 'justified'].includes(selectedRequisition.sourcingStatus) && (
              <Card
                size="small"
                title={
                  <Space>
                    <DollarOutlined />
                    <Text strong>Disbursement History</Text>
                  </Space>
                }
                style={{ borderColor: '#fa541c' }}
                headStyle={{ backgroundColor: '#fff2e8' }}
              >
                {(!selectedRequisition.disbursements ||
                  selectedRequisition.disbursements.length === 0) ? (
                  <Text type="secondary">No disbursements recorded yet.</Text>
                ) : (
                  <Timeline>
                    {selectedRequisition.disbursements.map((disb, index) => (
                      <Timeline.Item
                        key={index}
                        color={disb.acknowledged ? 'green' : 'orange'}
                        dot={
                          disb.acknowledged
                            ? <CheckCircleOutlined style={{ color: '#52c41a' }} />
                            : <DollarOutlined style={{ color: '#fa8c16' }} />
                        }
                      >
                        <Space direction="vertical" style={{ width: '100%' }}>
                          <Space>
                            <Text strong>Payment #{disb.disbursementNumber}</Text>
                            {disb.acknowledged ? (
                              <Tag color="success" icon={<CheckCircleOutlined />}>
                                Acknowledged
                              </Tag>
                            ) : (
                              <Tag color="warning" icon={<ClockCircleOutlined />}>
                                Awaiting Acknowledgment
                              </Tag>
                            )}
                          </Space>

                          <Text>
                            Amount:{' '}
                            <Text strong style={{ color: '#1890ff' }}>
                              XAF {disb.amount?.toLocaleString()}
                            </Text>
                          </Text>

                          <Text type="secondary" style={{ fontSize: 12 }}>
                            Disbursed: {new Date(disb.date).toLocaleString('en-GB')}
                          </Text>

                          {disb.acknowledged && (
                            <>
                              <Text type="success" style={{ fontSize: 12 }}>
                                ✅ Acknowledged:{' '}
                                {new Date(disb.acknowledgmentDate).toLocaleString('en-GB')}
                              </Text>
                              {disb.acknowledgmentMethod && (
                                <Text style={{ fontSize: 12 }}>
                                  Method:{' '}
                                  {disb.acknowledgmentMethod.replace('_', ' ').toUpperCase()}
                                </Text>
                              )}
                              {disb.acknowledgmentNotes && (
                                <Text italic style={{ fontSize: 12, color: '#52c41a' }}>
                                  "{disb.acknowledgmentNotes}"
                                </Text>
                              )}
                            </>
                          )}

                          {!disb.acknowledged && (
                            <Button
                              type="primary"
                              size="small"
                              icon={<CheckCircleOutlined />}
                              onClick={() => {
                                setSelectedDisbursement(disb);
                                acknowledgmentForm.setFieldsValue({
                                  acknowledgmentMethod: 'cash',
                                  acknowledgmentNotes:  ''
                                });
                                setAcknowledgmentModalVisible(true);
                              }}
                              style={{ backgroundColor: '#52c41a', borderColor: '#52c41a', marginTop: 4 }}
                            >
                              Acknowledge Receipt
                            </Button>
                          )}
                        </Space>
                      </Timeline.Item>
                    ))}
                  </Timeline>
                )}
              </Card>
            )}

            <Card size="small" title="📝 Purchase Justification">
              <Alert
                message="Complete purchase justification"
                description="Use the justification form to provide the full breakdown and receipts."
                type="info" style={{ marginBottom: 16 }} showIcon
              />
              <Button type="primary" icon={<FileTextOutlined />}
                onClick={() => navigate(`/buyer/requisitions/${selectedRequisition?.id}/justify`)}>
                Open Justification Form
              </Button>
            </Card>

            {selectedRequisition.notes && (
              <Card size="small" title="Notes">
                <Paragraph>{selectedRequisition.notes}</Paragraph>
              </Card>
            )}

            {selectedRequisition.sourcingDetails && (
              <Card size="small" title="Sourcing Timeline">
                <Timeline size="small">
                  <Timeline.Item color="blue">
                    <Text strong>Assigned to Buyer</Text>
                    <div>
                      <Text type="secondary">
                        {moment(selectedRequisition.assignmentDate).format('MMM DD, YYYY HH:mm')}
                      </Text>
                    </div>
                  </Timeline.Item>
                  <Timeline.Item color="green">
                    <Text strong>Sourcing Initiated</Text>
                    <div>
                      <Text type="secondary">
                        {moment(selectedRequisition.sourcingDetails.submissionDate).format('MMM DD, YYYY HH:mm')}
                      </Text>
                    </div>
                    <div>
                      <Text type="secondary">
                        Sent to {selectedRequisition.sourcingDetails.selectedSuppliers?.length || 0} supplier(s)
                      </Text>
                    </div>
                  </Timeline.Item>
                  <Timeline.Item color="orange">
                    <Text strong>Expected Quote Response</Text>
                    <div>
                      <Text type="secondary">
                        {moment(selectedRequisition.sourcingDetails.expectedQuoteResponse).format('MMM DD, YYYY')}
                      </Text>
                    </div>
                  </Timeline.Item>
                </Timeline>
              </Card>
            )}

            <Card size="small">
              <Space wrap>
                {selectedRequisition.sourcingStatus === 'pending_sourcing' && (
                  <Button type="primary" icon={<SendOutlined />}
                    onClick={() => { setDetailDrawerVisible(false); handleStartSourcing(selectedRequisition); }}>
                    Start Sourcing Process
                  </Button>
                )}
                {selectedRequisition.sourcingStatus === 'in_progress' && (
                  <Button icon={<SettingOutlined />}
                    onClick={() => { setDetailDrawerVisible(false); handleStartSourcing(selectedRequisition); }}>
                    Manage Sourcing
                  </Button>
                )}
                {selectedRequisition.sourcingStatus === 'justified' && (
                  <Button type="primary" icon={<FileTextOutlined />}
                    onClick={() => navigate(`/buyer/requisitions/${selectedRequisition?.id}/justify`)}>
                    Open Justification Form
                  </Button>
                )}
                <Button icon={<CopyOutlined />}>Copy ID</Button>
                <Button icon={<DownloadOutlined />}>Download PDF</Button>
              </Space>
            </Card>
          </Space>
        )}
      </Drawer>

      {/* ── Sourcing Drawer ────────────────────────────────────────────────── */}
      <Drawer
        title={<Title level={4}>Sourcing Management — {selectedRequisition?.title}</Title>}
        placement="right" width={1000}
        open={sourcingDrawerVisible}
        onClose={() => { setSourcingDrawerVisible(false); setSelectedRequisition(null); setCurrentStep(0); }}
        footer={
          <Row justify="space-between">
            <Col>
              <Space>
                <Button onClick={() => setSourcingDrawerVisible(false)}>Cancel</Button>
                {currentStep > 0 && (
                  <Button onClick={() => setCurrentStep(s => s - 1)}>Previous</Button>
                )}
              </Space>
            </Col>
            <Col>
              <Space>
                <Text type="secondary">Step {currentStep + 1} of {sourcingSteps.length}</Text>
                {currentStep < sourcingSteps.length - 1 ? (
                  <Button type="primary"
                    onClick={() => setCurrentStep(s => s + 1)}
                    disabled={currentStep === 0 && selectedSuppliers.length === 0}>
                    Next
                  </Button>
                ) : (
                  <Button type="primary" icon={<SendOutlined />}
                    loading={loading} onClick={handleSubmitSourcing}>
                    Select Suppliers
                  </Button>
                )}
              </Space>
            </Col>
          </Row>
        }
      >
        {selectedRequisition && (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Steps current={currentStep}>
              {sourcingSteps.map((s, i) => (
                <Step key={i} title={s.title} description={s.description} />
              ))}
            </Steps>

            {currentStep === 0 && (
              <Alert
                message="Ready for Supplier Selection"
                description="Click 'Select Suppliers' to choose registered suppliers and add external supplier emails for this RFQ."
                type="info" showIcon
              />
            )}

            {currentStep === 1 && (
              <Card title="Sourcing Criteria" bordered={false}>
                <Form form={sourcingForm} layout="vertical">
                  <Row gutter={[16, 16]}>
                    <Col span={12}>
                      <Form.Item name="expectedDeliveryDate" label="Expected Delivery Date"
                        rules={[{ required: true, message: 'Required' }]}>
                        <DatePicker style={{ width: '100%' }}
                          disabledDate={d => d && d < moment().add(1, 'day')} />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item name="quotationDeadline" label="Quotation Deadline"
                        rules={[{ required: true, message: 'Required' }]}>
                        <DatePicker style={{ width: '100%' }}
                          disabledDate={d => d && d < moment().add(1, 'day')} />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item name="paymentTerms" label="Payment Terms"
                        rules={[{ required: true, message: 'Required' }]}>
                        <Select>
                          {['15 days','30 days','45 days','60 days','Cash on delivery','Advance payment']
                            .map(v => <Option key={v} value={v}>{v}</Option>)}
                        </Select>
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item name="deliveryLocation" label="Delivery Location">
                        <Input placeholder="Delivery address" />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Divider>Evaluation Criteria (must total 100%)</Divider>
                  <Row gutter={[16, 16]}>
                    {[['quality','Quality (%)'],['cost','Cost (%)'],['delivery','Delivery (%)']].map(([f, l]) => (
                      <Col span={8} key={f}>
                        <Form.Item name={['evaluationCriteria', f]} label={l}>
                          <InputNumber min={0} max={100} style={{ width: '100%' }}
                            formatter={v => `${v}%`} parser={v => v.replace('%', '')} />
                        </Form.Item>
                      </Col>
                    ))}
                  </Row>
                  <Form.Item name="specialRequirements" label="Special Requirements (Optional)">
                    <TextArea rows={3} placeholder="Any special conditions for this procurement…" />
                  </Form.Item>
                </Form>
              </Card>
            )}
          </Space>
        )}
      </Drawer>

      {/* ── Acknowledgment Modal ───────────────────────────────────────────── */}
      <Modal
        title={
          <Space>
            <CheckCircleOutlined style={{ color: '#52c41a' }} />
            Acknowledge Disbursement Receipt
          </Space>
        }
        open={acknowledgmentModalVisible}
        onCancel={() => {
          setAcknowledgmentModalVisible(false);
          setSelectedDisbursement(null);
          acknowledgmentForm.resetFields();
        }}
        footer={null}
        width={600}
        destroyOnClose
      >
        {selectedDisbursement && (
          <div>
            <Alert
              message="Confirm Money Receipt"
              description={
                <div>
                  <p style={{ margin: 0 }}>You are acknowledging receipt of:</p>
                  <Text strong style={{ fontSize: 18, color: '#1890ff' }}>
                    XAF {selectedDisbursement.amount?.toLocaleString()}
                  </Text>
                  <br />
                  <Text type="secondary">
                    Payment #{selectedDisbursement.disbursementNumber} • Disbursed on{' '}
                    {new Date(selectedDisbursement.date).toLocaleDateString('en-GB')}
                  </Text>
                </div>
              }
              type="info"
              showIcon
              style={{ marginBottom: 20 }}
            />

            <Alert
              message="Important"
              description="By acknowledging, you confirm that you have physically received the money. This action cannot be undone."
              type="warning"
              showIcon
              style={{ marginBottom: 20 }}
            />

            <Form
              form={acknowledgmentForm}
              layout="vertical"
              onFinish={handleAcknowledgeDisbursement}
            >
              <Form.Item
                name="acknowledgmentMethod"
                label="How did you receive the money?"
                rules={[{ required: true, message: 'Please select receipt method' }]}
              >
                <Select placeholder="Select receipt method" size="large">
                  <Option value="cash">
                    💵 Cash — Received physical cash
                  </Option>
                  <Option value="bank_transfer">
                    🏦 Bank Transfer — Money credited to bank account
                  </Option>
                  <Option value="mobile_money">
                    📱 Mobile Money — Received via mobile money
                  </Option>
                </Select>
              </Form.Item>

              <Form.Item
                name="acknowledgmentNotes"
                label="Additional Notes (Optional)"
                help="Any comments about receiving the money (e.g. transaction reference)"
              >
                <TextArea
                  rows={3}
                  placeholder="E.g., Received in full. Transaction ref: TXN123456..."
                  showCount
                  maxLength={200}
                />
              </Form.Item>

              <Form.Item style={{ marginBottom: 0 }}>
                <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                  <Button
                    onClick={() => {
                      setAcknowledgmentModalVisible(false);
                      setSelectedDisbursement(null);
                      acknowledgmentForm.resetFields();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={acknowledgingDisbursement}
                    icon={<CheckCircleOutlined />}
                    size="large"
                    style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
                  >
                    ✅ Confirm I Received the Money
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </div>
        )}
      </Modal>

    </div>
  );
};

export default BuyerRequisitionPortal;









// import React, { useState, useEffect } from 'react';
// import {
//   Card,
//   Table,
//   Button,
//   Space,
//   Typography,
//   Tag,
//   Row,
//   Col,
//   Statistic,
//   Modal,
//   Form,
//   Input,
//   Select,
//   DatePicker,
//   InputNumber,
//   Tabs,
//   Badge,
//   Drawer,
//   message,
//   Alert,
//   Divider,
//   Tooltip,
//   Steps,
//   Checkbox,
//   Rate,
//   Timeline,
//   Avatar,
//   List,
//   Upload,
//   Spin
// } from 'antd';
// import {
//   ShoppingCartOutlined,
//   EyeOutlined,
//   SendOutlined,
//   UserOutlined,
//   DollarOutlined,
//   CalendarOutlined,
//   FileTextOutlined,
//   StarOutlined,
//   CheckCircleOutlined,
//   ClockCircleOutlined,
//   MailOutlined,
//   SettingOutlined,
//   PlusOutlined,
//   EditOutlined,
//   DeleteOutlined,
//   TeamOutlined,
//   TruckOutlined,
//   BankOutlined,
//   BarChartOutlined,
//   FilterOutlined,
//   ExportOutlined,
//   PhoneOutlined,
//   GlobalOutlined,
//   SafetyCertificateOutlined,
//   TagOutlined,
//   CopyOutlined,
//   UploadOutlined,
//   DownloadOutlined,
//   ExclamationCircleOutlined,
//   SolutionOutlined
// } from '@ant-design/icons';
// import moment from 'moment';
// import { buyerRequisitionAPI } from '../../services/buyerRequisitionAPI';

// const { Title, Text, Paragraph } = Typography;
// const { TextArea } = Input;
// const { Option } = Select;
// const { Step } = Steps;

// const BuyerRequisitionPortal = () => {
//   const [requisitions, setRequisitions] = useState([]);
//   const [selectedRequisition, setSelectedRequisition] = useState(null);
//   const [detailDrawerVisible, setDetailDrawerVisible] = useState(false);
//   const [sourcingDrawerVisible, setSourcingDrawerVisible] = useState(false);
//   const [loading, setLoading] = useState(false);
//   const [suppliers, setSuppliers] = useState([]);
//   const [selectedSuppliers, setSelectedSuppliers] = useState([]);
//   const [externalSupplierEmails, setExternalSupplierEmails] = useState([]);
//   const [emailInput, setEmailInput] = useState('');
//   const [sourcingForm] = Form.useForm();
//   const [activeTab, setActiveTab] = useState('pending');
//   const [currentStep, setCurrentStep] = useState(0);

//   // Load requisitions on component mount
//   useEffect(() => {
//     loadRequisitions();
//   }, [activeTab]);

//   const loadRequisitions = async () => {
//     try {
//       setLoading(true);
      
//       // Map activeTab to API filter
//       const statusFilter = {
//         'pending': { sourcingStatus: 'pending_sourcing' },
//         'in_progress': { sourcingStatus: 'in_progress' },
//         'quoted': { sourcingStatus: 'quotes_received' },
//         'completed': { sourcingStatus: 'completed' },
//         'all': {}
//       };

//       const filters = statusFilter[activeTab] || {};
//       console.log('Loading requisitions with filters:', filters);
      
//       const response = await buyerRequisitionAPI.getAssignedRequisitions(filters);
      
//       if (response.success) {
//         setRequisitions(response.data || []);
//         console.log('Loaded requisitions:', response.data?.length || 0);
//       } else {
//         message.error(response.message || 'Failed to load requisitions');
//       }
//     } catch (error) {
//       console.error('Error loading requisitions:', error);
//       message.error(error.message || 'Error loading requisitions. Please try again.');
//     } finally {
//       setLoading(false);
//     }
//   };

//   const loadSuppliers = async (category) => {
//     if (!category) {
//       message.warning('No category specified for supplier search');
//       return;
//     }

//     try {
//       setLoading(true);
//       console.log('Loading suppliers for category:', category);
      
//       const response = await buyerRequisitionAPI.getSuppliersByCategory(category);
      
//       if (response.success) {
//         setSuppliers(response.data || []);
//         console.log('Loaded suppliers:', response.data?.length || 0);
//       } else {
//         message.error(response.message || 'Failed to load suppliers');
//         setSuppliers([]);
//       }
//     } catch (error) {
//       console.error('Error loading suppliers:', error);
//       message.error(error.message || 'Error loading suppliers. Please try again.');
//       setSuppliers([]);
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Filter requisitions by status
//   const getFilteredRequisitions = () => {
//     return requisitions; // Already filtered by API call
//   };

//   const getStatusTag = (status) => {
//     const statusMap = {
//       'pending_sourcing': { color: 'orange', text: 'Pending Sourcing' },
//       'in_progress': { color: 'blue', text: 'Sourcing in Progress' },
//       'quotes_received': { color: 'purple', text: 'Quotes Received' },
//       'completed': { color: 'green', text: 'Completed' }
//     };
//     const statusInfo = statusMap[status] || { color: 'default', text: status };
//     return <Tag color={statusInfo.color}>{statusInfo.text}</Tag>;
//   };

//   const getUrgencyTag = (urgency) => {
//     const urgencyMap = {
//       'Low': 'green',
//       'Medium': 'orange',
//       'High': 'red',
//       'Urgent': 'volcano'
//     };
//     return <Tag color={urgencyMap[urgency] || 'default'}>{urgency}</Tag>;
//   };

//   const handleViewDetails = async (requisition) => {
//     try {
//       setLoading(true);
//       console.log('Loading details for requisition:', requisition.id);
      
//       const response = await buyerRequisitionAPI.getRequisitionDetails(requisition.id);
      
//       if (response.success) {
//         setSelectedRequisition(response.data);
//         setDetailDrawerVisible(true);
//       } else {
//         message.error(response.message || 'Failed to load requisition details');
//       }
//     } catch (error) {
//       console.error('Error loading requisition details:', error);
//       message.error(error.message || 'Error loading requisition details');
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleStartSourcing = async (requisition) => {
//     try {
//       console.log('Starting sourcing for requisition:', requisition);
      
//       setSelectedRequisition(requisition);
      
//       // Load suppliers for this category
//       await loadSuppliers(requisition.category);
      
//       setSelectedSuppliers([]);
//       sourcingForm.resetFields();
      
//       // Set default form values
//       sourcingForm.setFieldsValue({
//         expectedDeliveryDate: requisition.expectedDeliveryDate ? moment(requisition.expectedDeliveryDate) : moment().add(14, 'days'),
//         quotationDeadline: moment().add(5, 'days'),
//         paymentTerms: '30 days',
//         deliveryLocation: requisition.deliveryLocation || '',
//         evaluationCriteria: {
//           quality: 40,
//           cost: 35,
//           delivery: 25
//         }
//       });
      
//       setCurrentStep(0);
//       setSourcingDrawerVisible(true);
//     } catch (error) {
//       console.error('Error starting sourcing:', error);
//       message.error('Failed to initialize sourcing process');
//     }
//   };

//   const handleSupplierSelection = (supplierId, checked) => {
//     console.log('Supplier selection changed:', { supplierId, checked });
    
//     if (checked) {
//       setSelectedSuppliers(prev => [...prev, supplierId]);
//     } else {
//       setSelectedSuppliers(prev => prev.filter(id => id !== supplierId));
//     }
//   };

//   const handleAddExternalSupplier = () => {
//     const email = emailInput.trim();
//     if (!email) {
//       message.error('Please enter an email address');
//       return;
//     }

//     // Basic email validation
//     const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//     if (!emailRegex.test(email)) {
//       message.error('Please enter a valid email address');
//       return;
//     }

//     if (externalSupplierEmails.includes(email)) {
//       message.error('This email has already been added');
//       return;
//     }

//     setExternalSupplierEmails(prev => [...prev, email]);
//     setEmailInput('');
//     message.success('External supplier email added successfully');
//   };

//   const handleRemoveExternalSupplier = (email) => {
//     setExternalSupplierEmails(prev => prev.filter(e => e !== email));
//     message.success('External supplier email removed');
//   };

//   const validateSourcingForm = async () => {
//     try {
//       // Validate form fields
//       await sourcingForm.validateFields();
      
//       // Check supplier selection (either registered or external)
//       if (selectedSuppliers.length === 0 && externalSupplierEmails.length === 0) {
//         throw new Error('Please select at least one registered supplier or add at least one external supplier email');
//       }
  
//       // Get form values for additional validation
//       const expectedDeliveryDate = sourcingForm.getFieldValue('expectedDeliveryDate');
//       const quotationDeadline = sourcingForm.getFieldValue('quotationDeadline');
  
//       // Validate dates are present (Ant Design should handle this with rules, but double-check)
//       if (!expectedDeliveryDate) {
//         throw new Error('Expected delivery date is required');
//       }
  
//       if (!quotationDeadline) {
//         throw new Error('Quotation deadline is required');
//       }
  
//       // Validate date logic
//       if (quotationDeadline.isAfter(expectedDeliveryDate)) {
//         throw new Error('Quotation deadline must be before expected delivery date');
//       }
  
//       // Validate evaluation criteria weights
//       const criteria = sourcingForm.getFieldValue('evaluationCriteria');
//       if (criteria) {
//         const quality = criteria.quality || 0;
//         const cost = criteria.cost || 0;
//         const delivery = criteria.delivery || 0;
//         const totalWeight = quality + cost + delivery;
        
//         if (totalWeight !== 100) {
//           throw new Error(`Evaluation criteria weights must total 100% (currently: ${totalWeight}%)`);
//         }
//       }
  
//       return true;
//     } catch (error) {
//       if (error.errorFields) {
//         // Form validation errors from Ant Design
//         const firstError = error.errorFields[0];
//         message.error(`Please fix: ${firstError.errors[0]}`);
//       } else {
//         // Custom validation errors
//         message.error(error.message);
//       }
//       return false;
//     }
//   };

//   const handleSubmitSourcing = async () => {
//     try {
//       console.log('Submitting sourcing request...');
      
//       // Validate form and selections
//       const isValid = await validateSourcingForm();
//       if (!isValid) return;
  
//       setLoading(true);
  
//       // Get form values - use getFieldsValue(true) to get all values including nested ones
//       const formValues = sourcingForm.getFieldsValue(true);
//       console.log('Form values:', formValues);
  
//       // Additional validation to check if dates are actually present
//       const expectedDeliveryDate = sourcingForm.getFieldValue('expectedDeliveryDate');
//       const quotationDeadline = sourcingForm.getFieldValue('quotationDeadline');
      
//       console.log('Expected delivery date:', expectedDeliveryDate);
//       console.log('Quotation deadline:', quotationDeadline);
  
//       // Validate that required dates are present
//       if (!expectedDeliveryDate) {
//         message.error('Expected delivery date is required');
//         setLoading(false);
//         return;
//       }
  
//       if (!quotationDeadline) {
//         message.error('Quotation deadline is required');
//         setLoading(false);
//         return;
//       }
  
//       // Prepare RFQ data with proper date formatting
//       const rfqData = {
//         selectedSuppliers: selectedSuppliers,
//         externalSupplierEmails: externalSupplierEmails,
//         expectedDeliveryDate: expectedDeliveryDate ? expectedDeliveryDate.toISOString() : null,
//         quotationDeadline: quotationDeadline ? quotationDeadline.toISOString() : null,
//         paymentTerms: formValues.paymentTerms || '30 days',
//         deliveryLocation: formValues.deliveryLocation || selectedRequisition.deliveryLocation,
//         specialRequirements: formValues.specialRequirements || '',
//         evaluationCriteria: formValues.evaluationCriteria || { quality: 40, cost: 35, delivery: 25 }
//       };
  
//       console.log('Prepared RFQ data:', rfqData);
  
//       // Additional check after preparing RFQ data
//       if (!rfqData.expectedDeliveryDate) {
//         message.error('Expected delivery date is required');
//         setLoading(false);
//         return;
//       }
  
//       if (!rfqData.quotationDeadline) {
//         message.error('Quotation deadline is required');
//         setLoading(false);
//         return;
//       }
  
//       // Validate RFQ data
//       const validation = buyerRequisitionAPI.validateRFQData(rfqData);
      
//       if (!validation.isValid) {
//         validation.errors.forEach(error => message.error(error));
//         setLoading(false);
//         return;
//       }
  
//       // Show warnings if any
//       validation.warnings.forEach(warning => message.warning(warning));
  
//       // Submit RFQ to API
//       console.log('Sending RFQ for requisition:', selectedRequisition.id);
//       const response = await buyerRequisitionAPI.createAndSendRFQ(selectedRequisition.id, rfqData);
  
//       console.log('RFQ response:', response);
  
//       if (response.success) {
//         const totalRecipients = selectedSuppliers.length + externalSupplierEmails.length;
//         message.success(`Sourcing request sent to ${totalRecipients} supplier(s) successfully! (${selectedSuppliers.length} registered, ${externalSupplierEmails.length} external)`);
        
//         // Close drawer and reset state
//         setSourcingDrawerVisible(false);
//         setCurrentStep(0);
//         setSelectedSuppliers([]);
//         setExternalSupplierEmails([]);
//         setEmailInput('');
//         setSelectedRequisition(null);
        
//         // Reload requisitions to show updated status
//         await loadRequisitions();
//       } else {
//         message.error(response.message || 'Failed to submit sourcing request');
//       }
  
//     } catch (error) {
//       console.error('Error submitting sourcing:', error);
//       message.error(error.message || 'Failed to submit sourcing request');
//     } finally {
//       setLoading(false);
//     }
//   };

//   const columns = [
//     {
//       title: 'Requisition Details',
//       key: 'details',
//       render: (_, record) => (
//         <div>
//           <Text strong>{record.title}</Text>
//           <br />
//           <Text type="secondary" style={{ fontSize: '12px' }}>
//             {record.id}
//           </Text>
//           <br />
//           <Tag size="small" color="blue">{record.category}</Tag>
//         </div>
//       ),
//       width: 200
//     },
//     {
//       title: 'Requester',
//       key: 'requester',
//       render: (_, record) => (
//         <div>
//           <Text strong>{record.requester}</Text>
//           <br />
//           <Text type="secondary" style={{ fontSize: '12px' }}>
//             {record.department}
//           </Text>
//         </div>
//       ),
//       width: 150
//     },
//     {
//       title: 'Budget',
//       key: 'budget',
//       render: (_, record) => (
//         <Text strong style={{ color: '#1890ff' }}>
//           XAF {record.budget?.toLocaleString()}
//         </Text>
//       ),
//       width: 120
//     },
//     {
//       title: 'Items',
//       dataIndex: 'items',
//       key: 'items',
//       render: (items) => Array.isArray(items) ? items.length : 0,
//       align: 'center',
//       width: 80
//     },
//     {
//       title: 'Expected Delivery',
//       key: 'delivery',
//       render: (_, record) => {
//         const deliveryDate = record.expectedDeliveryDate;
//         if (!deliveryDate) return 'Not specified';
        
//         const isOverdue = moment(deliveryDate).isBefore(moment());
//         return (
//           <div>
//             <CalendarOutlined /> {moment(deliveryDate).format('MMM DD, YYYY')}
//             <br />
//             <Text type={isOverdue ? "danger" : "secondary"} style={{ fontSize: '11px' }}>
//               {moment(deliveryDate).fromNow()}
//             </Text>
//             {isOverdue && <ExclamationCircleOutlined style={{ color: '#ff4d4f', marginLeft: 4 }} />}
//           </div>
//         );
//       },
//       width: 130
//     },
//     {
//       title: 'Urgency',
//       dataIndex: 'urgency',
//       key: 'urgency',
//       render: (urgency) => getUrgencyTag(urgency),
//       width: 100
//     },
//     {
//       title: 'Sourcing Status',
//       dataIndex: 'sourcingStatus',
//       key: 'sourcingStatus',
//       render: (status) => getStatusTag(status),
//       width: 150
//     },
//     {
//       title: 'Actions',
//       key: 'actions',
//       render: (_, record) => (
//         <Space size="small">
//           <Tooltip title="View Details">
//             <Button 
//               size="small" 
//               icon={<EyeOutlined />}
//               onClick={() => handleViewDetails(record)}
//             />
//           </Tooltip>
//           {record.sourcingStatus === 'pending_sourcing' && (
//             <Tooltip title="Start Sourcing">
//               <Button 
//                 size="small" 
//                 type="primary"
//                 icon={<ShoppingCartOutlined />}
//                 onClick={() => handleStartSourcing(record)}
//               >
//                 Source
//               </Button>
//             </Tooltip>
//           )}
//           {record.sourcingStatus === 'in_progress' && (
//             <Tooltip title="Manage Sourcing">
//               <Button 
//                 size="small" 
//                 type="primary"
//                 ghost
//                 icon={<SettingOutlined />}
//                 onClick={() => handleStartSourcing(record)}
//               >
//                 Manage
//               </Button>
//             </Tooltip>
//           )}
//         </Space>
//       ),
//       width: 120,
//       fixed: 'right'
//     }
//   ];

//   const stats = {
//     pending: requisitions.filter(req => req.sourcingStatus === 'pending_sourcing').length,
//     inProgress: requisitions.filter(req => req.sourcingStatus === 'in_progress').length,
//     quoted: requisitions.filter(req => req.sourcingStatus === 'quotes_received').length,
//     completed: requisitions.filter(req => req.sourcingStatus === 'completed').length
//   };

//   const renderSupplierCard = (supplier) => (
//     <Card 
//       key={supplier.id}
//       size="small" 
//       style={{ 
//         marginBottom: '12px',
//         border: selectedSuppliers.includes(supplier.id) ? '2px solid #1890ff' : '1px solid #d9d9d9'
//       }}
//       bodyStyle={{ padding: '16px' }}
//     >
//       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
//         <div style={{ flex: 1 }}>
//           <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
//             <Checkbox
//               checked={selectedSuppliers.includes(supplier.id)}
//               onChange={(e) => handleSupplierSelection(supplier.id, e.target.checked)}
//               style={{ marginRight: '12px' }}
//             />
//             <div>
//               <Text strong style={{ fontSize: '16px' }}>{supplier.name}</Text>
//               <div style={{ marginTop: '4px' }}>
//                 <Rate disabled defaultValue={supplier.rating} style={{ fontSize: '12px' }} />
//                 <Text type="secondary" style={{ marginLeft: '8px', fontSize: '12px' }}>
//                   {supplier.rating}/5.0
//                 </Text>
//               </div>
//             </div>
//           </div>
          
//           <Row gutter={[16, 8]}>
//             <Col span={12}>
//               <Text type="secondary" style={{ fontSize: '12px' }}>Contact:</Text>
//               <br />
//               <Text style={{ fontSize: '12px' }}>
//                 <MailOutlined /> {supplier.email}
//               </Text>
//               <br />
//               <Text style={{ fontSize: '12px' }}>
//                 <PhoneOutlined /> {supplier.phone}
//               </Text>
//             </Col>
//             <Col span={12}>
//               <Text type="secondary" style={{ fontSize: '12px' }}>Location & Website:</Text>
//               <br />
//               <Text style={{ fontSize: '12px' }}>
//                 {typeof supplier.address === 'string' ? supplier.address : 
//                  supplier.address ? `${supplier.address.street || ''}, ${supplier.address.city || ''}, ${supplier.address.state || ''} ${supplier.address.postalCode || ''}, ${supplier.address.country || ''}`.replace(/^,\s*|,\s*$/g, '').replace(/,\s*,/g, ',') : 
//                  'Address not available'}
//               </Text>
//               {/* <Text style={{ fontSize: '12px' }}>{supplier.address}</Text> */}
//               <br />
//               <Text style={{ fontSize: '12px' }}>
//                 <GlobalOutlined /> {supplier.website}
//               </Text>
//             </Col>
//           </Row>
          
//           <Divider style={{ margin: '12px 0' }} />
          
//           <Row gutter={[16, 8]}>
//             <Col span={8}>
//               <Text type="secondary" style={{ fontSize: '11px' }}>Reliability:</Text>
//               <br />
//               <Tag color={supplier.reliability === 'Excellent' ? 'green' : supplier.reliability === 'Good' ? 'blue' : 'orange'}>
//                 {supplier.reliability}
//               </Tag>
//             </Col>
//             <Col span={8}>
//               <Text type="secondary" style={{ fontSize: '11px' }}>Price Level:</Text>
//               <br />
//               <Tag color={supplier.priceCompetitiveness === 'High' ? 'green' : supplier.priceCompetitiveness === 'Medium' ? 'blue' : 'orange'}>
//                 {supplier.priceCompetitiveness}
//               </Tag>
//             </Col>
//             <Col span={8}>
//               <Text type="secondary" style={{ fontSize: '11px' }}>Delivery:</Text>
//               <br />
//               <Text style={{ fontSize: '11px' }}>{supplier.deliveryCapacity}</Text>
//             </Col>
//           </Row>
          
//           <div style={{ marginTop: '8px' }}>
//             <Text type="secondary" style={{ fontSize: '11px' }}>Specializations:</Text>
//             <br />
//             <Space wrap size="small" style={{ marginTop: '4px' }}>
//               {supplier.specialization?.map(spec => (
//                 <Tag key={spec} size="small" color="purple">{spec}</Tag>
//               ))}
//             </Space>
//           </div>
          
//           <div style={{ marginTop: '8px' }}>
//             <Text type="secondary" style={{ fontSize: '11px' }}>Certifications:</Text>
//             <br />
//             <Space wrap size="small" style={{ marginTop: '4px' }}>
//               {supplier.certifications?.map(cert => (
//                 <Tag key={cert} size="small" color="gold" icon={<SafetyCertificateOutlined />}>
//                   {cert}
//                 </Tag>
//               ))}
//             </Space>
//           </div>
          
//           <div style={{ marginTop: '8px' }}>
//             <Text type="secondary" style={{ fontSize: '11px' }}>
//               Last Transaction: {moment(supplier.lastTransaction).format('MMM DD, YYYY')}
//             </Text>
//           </div>
//         </div>
//       </div>
//     </Card>
//   );

//   const sourcingSteps = [
//     {
//       title: 'Supplier Selection',
//       description: 'Choose suppliers to invite for quotation'
//     },
//     {
//       title: 'Sourcing Criteria',
//       description: 'Set evaluation criteria and requirements'
//     },
//     {
//       title: 'Review & Submit',
//       description: 'Review details and send to suppliers'
//     }
//   ];

//   return (
//     <div style={{ padding: '24px' }}>
//       <Card>
//         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
//           <Title level={2} style={{ margin: 0 }}>
//             <ShoppingCartOutlined /> Buyer - Purchase Requisition Management
//           </Title>
//           <Space>
//             <Button icon={<ExportOutlined />}>
//               Export Report
//             </Button>
//             <Button icon={<FilterOutlined />}>
//               Filters
//             </Button>
//           </Space>
//         </div>

//         {/* Statistics */}
//         <Row gutter={16} style={{ marginBottom: '24px' }}>
//           <Col span={6}>
//             <Statistic
//               title="Pending Sourcing"
//               value={stats.pending}
//               prefix={<ClockCircleOutlined />}
//               valueStyle={{ color: '#faad14' }}
//             />
//           </Col>
//           <Col span={6}>
//             <Statistic
//               title="Sourcing in Progress"
//               value={stats.inProgress}
//               prefix={<ShoppingCartOutlined />}
//               valueStyle={{ color: '#1890ff' }}
//             />
//           </Col>
//           <Col span={6}>
//             <Statistic
//               title="Quotes Received"
//               value={stats.quoted}
//               prefix={<FileTextOutlined />}
//               valueStyle={{ color: '#722ed1' }}
//             />
//           </Col>
//           <Col span={6}>
//             <Statistic
//               title="Completed"
//               value={stats.completed}
//               prefix={<CheckCircleOutlined />}
//               valueStyle={{ color: '#52c41a' }}
//             />
//           </Col>
//         </Row>

//         {/* Alert for pending actions */}
//         {stats.pending > 0 && (
//           <Alert
//             message={`${stats.pending} Requisition${stats.pending !== 1 ? 's' : ''} Awaiting Sourcing`}
//             description="You have purchase requisitions that require sourcing attention. Start the procurement process to meet delivery deadlines."
//             type="warning"
//             showIcon
//             action={
//               <Button 
//                 size="small" 
//                 type="primary" 
//                 onClick={() => setActiveTab('pending')}
//               >
//                 View Pending
//               </Button>
//             }
//             style={{ marginBottom: '24px' }}
//           />
//         )}

//         {/* Tabs */}
//         <Tabs activeKey={activeTab} onChange={setActiveTab}>
//           <Tabs.TabPane 
//             tab={
//               <Badge count={stats.pending} size="small">
//                 <span><ClockCircleOutlined /> Pending Sourcing ({stats.pending})</span>
//               </Badge>
//             } 
//             key="pending"
//           />
//           <Tabs.TabPane 
//             tab={
//               <Badge count={stats.inProgress} size="small">
//                 <span><ShoppingCartOutlined /> In Progress ({stats.inProgress})</span>
//               </Badge>
//             } 
//             key="in_progress"
//           />
//           <Tabs.TabPane 
//             tab={
//               <span><FileTextOutlined /> Quotes Received ({stats.quoted})</span>
//             } 
//             key="quoted"
//           />
//           <Tabs.TabPane 
//             tab={
//               <span><CheckCircleOutlined /> Completed ({stats.completed})</span>
//             } 
//             key="completed"
//           />
//           <Tabs.TabPane 
//             tab={
//               <span>All Requisitions</span>
//             } 
//             key="all"
//           />
//         </Tabs>

//         <Table
//           columns={columns}
//           dataSource={getFilteredRequisitions()}
//           rowKey="id"
//           loading={loading}
//           pagination={{
//             pageSize: 10,
//             showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} requisitions`
//           }}
//           scroll={{ x: 'max-content' }}
//         />
//       </Card>

//       {/* Requisition Details Drawer */}
//       <Drawer
//         title={
//           <Space>
//             <FileTextOutlined />
//             Requisition Details
//           </Space>
//         }
//         placement="right"
//         width={800}
//         open={detailDrawerVisible}
//         onClose={() => {
//           setDetailDrawerVisible(false);
//           setSelectedRequisition(null);
//         }}
//       >
//         {selectedRequisition && (
//           <div>
//             {/* Requisition Header */}
//             <Card size="small" title="Requisition Information" style={{ marginBottom: '16px' }}>
//               <Row gutter={[16, 16]}>
//                 <Col span={12}>
//                   <Text strong>Requisition ID:</Text>
//                   <br />
//                   <Text code>{selectedRequisition.id}</Text>
//                 </Col>
//                 <Col span={12}>
//                   <Text strong>Title:</Text>
//                   <br />
//                   <Text>{selectedRequisition.title}</Text>
//                 </Col>
//                 <Col span={12}>
//                   <Text strong>Requester:</Text>
//                   <br />
//                   <Avatar size="small" icon={<UserOutlined />} style={{ marginRight: 8 }} />
//                   {selectedRequisition.requester}
//                 </Col>
//                 <Col span={12}>
//                   <Text strong>Department:</Text>
//                   <br />
//                   <Text>{selectedRequisition.department}</Text>
//                 </Col>
//                 <Col span={12}>
//                   <Text strong>Request Date:</Text>
//                   <br />
//                   <CalendarOutlined /> {moment(selectedRequisition.requestDate).format('MMM DD, YYYY')}
//                 </Col>
//                 <Col span={12}>
//                   <Text strong>Expected Delivery:</Text>
//                   <br />
//                   <CalendarOutlined /> {selectedRequisition.expectedDeliveryDate ? 
//                     moment(selectedRequisition.expectedDeliveryDate).format('MMM DD, YYYY') : 
//                     'Not specified'
//                   }
//                 </Col>
//                 <Col span={12}>
//                   <Text strong>Budget:</Text>
//                   <br />
//                   <Text strong style={{ color: '#1890ff' }}>
//                     <DollarOutlined /> XAF {selectedRequisition.budget?.toLocaleString() || 'Not specified'}
//                   </Text>
//                 </Col>
//                 <Col span={12}>
//                   <Text strong>Urgency:</Text>
//                   <br />
//                   {getUrgencyTag(selectedRequisition.urgency)}
//                 </Col>
//                 <Col span={12}>
//                   <Text strong>Category:</Text>
//                   <br />
//                   <Tag color="blue">{selectedRequisition.category}</Tag>
//                 </Col>
//                 <Col span={12}>
//                   <Text strong>Sourcing Status:</Text>
//                   <br />
//                   {getStatusTag(selectedRequisition.sourcingStatus)}
//                 </Col>
//                 <Col span={24}>
//                   <Text strong>Delivery Location:</Text>
//                   <br />
//                   <TruckOutlined /> {selectedRequisition.deliveryLocation || 'Not specified'}
//                 </Col>
//               </Row>
//             </Card>

//             {/* Items List */}
//             <Card size="small" title="Items to Procure" style={{ marginBottom: '16px' }}>
//               <Table
//                 columns={[
//                   {
//                     title: 'Description',
//                     dataIndex: 'description',
//                     key: 'description'
//                   },
//                   {
//                     title: 'Quantity',
//                     dataIndex: 'quantity',
//                     key: 'quantity',
//                     width: 80,
//                     align: 'center'
//                   },
//                   {
//                     title: 'Unit',
//                     dataIndex: 'unit',
//                     key: 'unit',
//                     width: 80,
//                     align: 'center'
//                   },
//                   {
//                     title: 'Specifications',
//                     dataIndex: 'specifications',
//                     key: 'specifications'
//                   }
//                 ]}
//                 dataSource={selectedRequisition.items || []}
//                 pagination={false}
//                 size="small"
//                 rowKey="id"
//               />
//             </Card>

//             {/* Notes */}
//             {selectedRequisition.notes && (
//               <Card size="small" title="Additional Notes" style={{ marginBottom: '16px' }}>
//                 <Paragraph>{selectedRequisition.notes}</Paragraph>
//               </Card>
//             )}

//             {/* Sourcing History */}
//             {selectedRequisition.sourcingDetails && (
//               <Card size="small" title="Sourcing History" style={{ marginBottom: '16px' }}>
//                 <Timeline>
//                   <Timeline.Item color="blue">
//                     <Text strong>Assignment to Buyer</Text>
//                     <br />
//                     <Text type="secondary">
//                       {moment(selectedRequisition.assignmentDate).format('MMM DD, YYYY HH:mm')}
//                     </Text>
//                   </Timeline.Item>
//                   <Timeline.Item color="orange">
//                     <Text strong>Sourcing Initiated</Text>
//                     <br />
//                     <Text type="secondary">
//                       {moment(selectedRequisition.sourcingDetails.submissionDate).format('MMM DD, YYYY HH:mm')}
//                     </Text>
//                     <br />
//                     <Text style={{ fontSize: '12px' }}>
//                       Sent to {selectedRequisition.sourcingDetails.selectedSuppliers?.length || 0} supplier(s)
//                     </Text>
//                   </Timeline.Item>
//                   <Timeline.Item color="purple">
//                     <Text strong>Expected Quote Response</Text>
//                     <br />
//                     <Text type="secondary">
//                       {moment(selectedRequisition.sourcingDetails.expectedQuoteResponse).format('MMM DD, YYYY')}
//                     </Text>
//                   </Timeline.Item>
//                 </Timeline>
//               </Card>
//             )}

//             {/* Action Buttons */}
//             <Space style={{ marginTop: '16px' }}>
//               {selectedRequisition.sourcingStatus === 'pending_sourcing' && (
//                 <Button 
//                   type="primary" 
//                   icon={<ShoppingCartOutlined />}
//                   onClick={() => {
//                     setDetailDrawerVisible(false);
//                     handleStartSourcing(selectedRequisition);
//                   }}
//                 >
//                   Start Sourcing Process
//                 </Button>
//               )}
//               {selectedRequisition.sourcingStatus === 'in_progress' && (
//                 <Button 
//                   type="primary" 
//                   ghost
//                   icon={<SettingOutlined />}
//                   onClick={() => {
//                     setDetailDrawerVisible(false);
//                     handleStartSourcing(selectedRequisition);
//                   }}
//                 >
//                   Manage Sourcing
//                 </Button>
//               )}
//               <Button icon={<CopyOutlined />}>
//                 Copy Requisition ID
//               </Button>
//               <Button icon={<DownloadOutlined />}>
//                 Download PDF
//               </Button>
//             </Space>
//           </div>
//         )}
//       </Drawer>

//       {/* Sourcing Management Drawer */}
//       <Drawer
//         title={
//           <Space>
//             <ShoppingCartOutlined />
//             Sourcing Management - {selectedRequisition?.title}
//           </Space>
//         }
//         placement="right"
//         width={1000}
//         open={sourcingDrawerVisible}
//         onClose={() => {
//           setSourcingDrawerVisible(false);
//           setSelectedRequisition(null);
//           setCurrentStep(0);
//         }}
//         footer={
//           <div style={{ textAlign: 'right' }}>
//             <Space>
//               <Button onClick={() => setSourcingDrawerVisible(false)}>
//                 Cancel
//               </Button>
//               {currentStep > 0 && (
//                 <Button onClick={() => setCurrentStep(currentStep - 1)}>
//                   Previous
//                 </Button>
//               )}
//               {currentStep < sourcingSteps.length - 1 ? (
//                 <Button 
//                   type="primary" 
//                   onClick={() => setCurrentStep(currentStep + 1)}
//                   disabled={currentStep === 0 && selectedSuppliers.length === 0 && externalSupplierEmails.length === 0}
//                 >
//                   Next
//                 </Button>
//               ) : (
//                 <Button 
//                   type="primary" 
//                   icon={<SendOutlined />}
//                   loading={loading}
//                   onClick={handleSubmitSourcing}
//                 >
//                   Send to Suppliers
//                 </Button>
//               )}
//             </Space>
//           </div>
//         }
//       >
//         {selectedRequisition && (
//           <div>
//             {/* Progress Steps */}
//             <Steps current={currentStep} style={{ marginBottom: '32px' }}>
//               {sourcingSteps.map((step, index) => (
//                 <Step key={index} title={step.title} description={step.description} />
//               ))}
//             </Steps>

//             {/* Step 0: Supplier Selection */}
//             {currentStep === 0 && (
//               <div>
//                 <Card size="small" title="Available Suppliers" style={{ marginBottom: '16px' }}>
//                   <Alert
//                     message={`Found ${suppliers.length} supplier(s) for category: ${selectedRequisition.category}`}
//                     description="Select suppliers you want to invite for quotation. The system automatically filtered suppliers based on the item category."
//                     type="info"
//                     showIcon
//                     style={{ marginBottom: '16px' }}
//                   />
                  
//                   {loading ? (
//                     <div style={{ textAlign: 'center', padding: '20px' }}>
//                       <Spin size="large" />
//                       <div style={{ marginTop: '16px' }}>Loading suppliers...</div>
//                     </div>
//                   ) : suppliers.length === 0 ? (
//                     <Alert
//                       message="No suppliers found"
//                       description="No suppliers are registered for this category. Please contact the system administrator."
//                       type="warning"
//                       showIcon
//                     />
//                   ) : (
//                     <div>
//                       {suppliers.map(supplier => renderSupplierCard(supplier))}
//                     </div>
//                   )}
//                 </Card>

//                 <Card size="small" title="Selection Summary">
//                   <Text strong>{selectedSuppliers.length}</Text> supplier(s) selected
//                   {selectedSuppliers.length > 0 && (
//                     <div style={{ marginTop: '8px' }}>
//                       <Space wrap>
//                         {selectedSuppliers.map(supplierId => {
//                           const supplier = suppliers.find(s => s.id === supplierId);
//                           return supplier ? (
//                             <Tag key={supplierId} color="blue" closable onClose={() => handleSupplierSelection(supplierId, false)}>
//                               {supplier.name}
//                             </Tag>
//                           ) : null;
//                         })}
//                       </Space>
//                     </div>
//                   )}
//                 </Card>

//                 <Card size="small" title="External Suppliers" style={{ marginBottom: '16px' }}>
//                   <Alert
//                     message="Add External Suppliers"
//                     description="You can also send RFQs to suppliers who are not registered in our system by adding their email addresses."
//                     type="info"
//                     showIcon
//                     style={{ marginBottom: '16px' }}
//                   />
                  
//                   <Space.Compact style={{ width: '100%', marginBottom: '16px' }}>
//                     <Input 
//                       placeholder="Enter supplier email address"
//                       value={emailInput}
//                       onChange={(e) => setEmailInput(e.target.value)}
//                       onPressEnter={handleAddExternalSupplier}
//                     />
//                     <Button type="primary" icon={<PlusOutlined />} onClick={handleAddExternalSupplier}>
//                       Add
//                     </Button>
//                   </Space.Compact>

//                   {externalSupplierEmails.length > 0 && (
//                     <div>
//                       <Text strong style={{ display: 'block', marginBottom: '8px' }}>
//                         External Suppliers ({externalSupplierEmails.length}):
//                       </Text>
//                       <Space wrap>
//                         {externalSupplierEmails.map((email, index) => (
//                           <Tag 
//                             key={index} 
//                             color="orange" 
//                             closable 
//                             onClose={() => handleRemoveExternalSupplier(email)}
//                             icon={<MailOutlined />}
//                           >
//                             {email}
//                           </Tag>
//                         ))}
//                       </Space>
//                     </div>
//                   )}
//                 </Card>
//               </div>
//             )}

//             {/* Step 1: Sourcing Criteria */}
//             {currentStep === 1 && (
//               <Form form={sourcingForm} layout="vertical">
//                 <Card size="small" title="Sourcing Requirements" style={{ marginBottom: '16px' }}>
//                   <Row gutter={[16, 16]}>
//                     <Col span={12}>
//                       <Form.Item
//                         name="expectedDeliveryDate"
//                         label="Expected Delivery Date"
//                         rules={[{ required: true, message: 'Please select expected delivery date' }]}
//                       >
//                         <DatePicker 
//                           style={{ width: '100%' }}
//                           disabledDate={(current) => current && current < moment().add(1, 'day')}
//                         />
//                       </Form.Item>
//                     </Col>
//                     <Col span={12}>
//                       <Form.Item
//                         name="quotationDeadline"
//                         label="Quotation Response Deadline"
//                         rules={[{ required: true, message: 'Please select quotation deadline' }]}
//                       >
//                         <DatePicker 
//                           style={{ width: '100%' }}
//                           disabledDate={(current) => current && current < moment().add(1, 'day')}
//                         />
//                       </Form.Item>
//                     </Col>
//                   </Row>

//                   <Row gutter={[16, 16]}>
//                     <Col span={12}>
//                       <Form.Item
//                         name="paymentTerms"
//                         label="Payment Terms"
//                         rules={[{ required: true, message: 'Please select payment terms' }]}
//                       >
//                         <Select placeholder="Select payment terms">
//                           <Option value="15 days">15 days</Option>
//                           <Option value="30 days">30 days</Option>
//                           <Option value="45 days">45 days</Option>
//                           <Option value="60 days">60 days</Option>
//                           <Option value="Cash on delivery">Cash on delivery</Option>
//                           <Option value="Advance payment">Advance payment</Option>
//                         </Select>
//                       </Form.Item>
//                     </Col>
//                     <Col span={12}>
//                       <Form.Item
//                         name="deliveryLocation"
//                         label="Delivery Location"
//                         rules={[{ required: true, message: 'Please specify delivery location' }]}
//                       >
//                         <Input placeholder="Specify delivery location" />
//                       </Form.Item>
//                     </Col>
//                   </Row>
//                 </Card>

//                 {/* Evaluation Criteria removed as per requirements */}

//                 <Card size="small" title="Additional Requirements" style={{ marginBottom: '16px' }}>
//                   <Form.Item
//                     name="specialRequirements"
//                     label="Special Requirements or Instructions"
//                   >
//                     <TextArea 
//                       rows={4}
//                       placeholder="Enter any special requirements, technical specifications, quality standards, or delivery instructions..."
//                       showCount
//                       maxLength={1000}
//                     />
//                   </Form.Item>

//                   <Form.Item
//                     name="attachments"
//                     label="Technical Specifications (Optional)"
//                   >
//                     <Upload.Dragger
//                       multiple
//                       beforeUpload={() => false}
//                       accept=".pdf,.doc,.docx,.jpg,.png,.xlsx"
//                     >
//                       <p className="ant-upload-drag-icon">
//                         <UploadOutlined />
//                       </p>
//                       <p className="ant-upload-text">Click or drag file to upload technical specifications</p>
//                       <p className="ant-upload-hint">
//                         Support for multiple file upload. Accepted formats: PDF, DOC, DOCX, JPG, PNG, XLSX
//                       </p>
//                     </Upload.Dragger>
//                   </Form.Item>
//                 </Card>
//               </Form>
//             )}

//             {/* Step 2: Review & Submit */}
//             {currentStep === 2 && (
//               <div>
//                 <Alert
//                   message="Review Sourcing Details"
//                   description="Please review all details before sending the Request for Quotation (RFQ) to selected suppliers."
//                   type="info"
//                   showIcon
//                   style={{ marginBottom: '16px' }}
//                 />

//                 <Card size="small" title="Selected Suppliers" style={{ marginBottom: '16px' }}>
//                   {selectedSuppliers.length > 0 && (
//                     <>
//                       <Text strong style={{ display: 'block', marginBottom: '12px' }}>
//                         Registered Suppliers ({selectedSuppliers.length}):
//                       </Text>
//                       <List
//                         dataSource={selectedSuppliers.map(id => suppliers.find(s => s.id === id)).filter(Boolean)}
//                         renderItem={supplier => (
//                           <List.Item>
//                             <List.Item.Meta
//                               avatar={<Avatar icon={<TeamOutlined />} />}
//                               title={supplier.name}
//                               description={
//                                 <div>
//                                   <Text type="secondary">{supplier.email} | {supplier.phone}</Text>
//                                   <br />
//                                   <Space size="small">
//                                     <Tag color="blue">Rating: {supplier.rating}/5</Tag>
//                                     <Tag color="green">{supplier.reliability}</Tag>
//                                   </Space>
//                                 </div>
//                               }
//                             />
//                           </List.Item>
//                         )}
//                       />
//                     </>
//                   )}

//                   {externalSupplierEmails.length > 0 && (
//                     <>
//                       {selectedSuppliers.length > 0 && <Divider />}
//                       <Text strong style={{ display: 'block', marginBottom: '12px' }}>
//                         External Suppliers ({externalSupplierEmails.length}):
//                       </Text>
//                       <List
//                         dataSource={externalSupplierEmails}
//                         renderItem={email => (
//                           <List.Item>
//                             <List.Item.Meta
//                               avatar={<Avatar icon={<MailOutlined />} style={{ backgroundColor: '#ff7a00' }} />}
//                               title={email}
//                               description={<Text type="secondary">External supplier - will receive RFQ via email</Text>}
//                             />
//                           </List.Item>
//                         )}
//                       />
//                     </>
//                   )}

//                   {selectedSuppliers.length === 0 && externalSupplierEmails.length === 0 && (
//                     <Text type="secondary">No suppliers selected</Text>
//                   )}
//                 </Card>

//                 <Card size="small" title="Sourcing Summary" style={{ marginBottom: '16px' }}>
//                   <Row gutter={[16, 16]}>
//                     <Col span={12}>
//                       <Text strong>Expected Delivery:</Text>
//                       <br />
//                       <CalendarOutlined /> {sourcingForm.getFieldValue('expectedDeliveryDate')?.format('MMM DD, YYYY')}
//                     </Col>
//                     <Col span={12}>
//                       <Text strong>Payment Terms:</Text>
//                       <br />
//                       <BankOutlined /> {sourcingForm.getFieldValue('paymentTerms')}
//                     </Col>
//                     <Col span={12}>
//                       <Text strong>Quote Deadline:</Text>
//                       <br />
//                       <ClockCircleOutlined /> {sourcingForm.getFieldValue('quotationDeadline')?.format('MMM DD, YYYY')}
//                     </Col>
//                     <Col span={12}>
//                       <Text strong>Delivery Location:</Text>
//                       <br />
//                       <TruckOutlined /> {sourcingForm.getFieldValue('deliveryLocation')}
//                     </Col>
//                   </Row>
                  
//                   <Divider />
                  
//                   <Text strong>Evaluation Criteria:</Text>
//                   <Row gutter={[16, 8]} style={{ marginTop: '8px' }}>
//                     <Col span={8}>
//                       Quality: {sourcingForm.getFieldValue(['evaluationCriteria', 'quality'])}%
//                     </Col>
//                     <Col span={8}>
//                       Cost: {sourcingForm.getFieldValue(['evaluationCriteria', 'cost'])}%
//                     </Col>
//                     <Col span={8}>
//                       Delivery: {sourcingForm.getFieldValue(['evaluationCriteria', 'delivery'])}%
//                     </Col>
//                   </Row>
//                 </Card>

//                 <Card size="small" title="Items to be Quoted">
//                   <Table
//                     columns={[
//                       {
//                         title: 'Item Description',
//                         dataIndex: 'description',
//                         key: 'description'
//                       },
//                       {
//                         title: 'Quantity',
//                         dataIndex: 'quantity',
//                         key: 'quantity',
//                         width: 80,
//                         align: 'center'
//                       },
//                       {
//                         title: 'Unit',
//                         dataIndex: 'unit',
//                         key: 'unit',
//                         width: 80,
//                         align: 'center'
//                       },
//                       {
//                         title: 'Specifications',
//                         dataIndex: 'specifications',
//                         key: 'specifications'
//                       }
//                     ]}
//                     dataSource={selectedRequisition.items || []}
//                     pagination={false}
//                     size="small"
//                     rowKey="id"
//                   />
//                 </Card>
//               </div>
//             )}
//           </div>
//         )}
//       </Drawer>
//     </div>
//   );
// };

// export default BuyerRequisitionPortal;





import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Table,
  Button,
  Modal,
  Select,
  Typography,
  Tag,
  Space,
  Input,
  Timeline,
  Descriptions,
  Progress,
  Alert,
  message,
  Popconfirm,
  Tooltip,
  Badge,
  Statistic,
  Row,
  Col,
  notification,
  Drawer,
  List,
  Avatar,
  Tabs,
  Steps,
  Upload,
  Form,
  Radio,
  Divider,
  App
} from 'antd';
import {
  FileTextOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  UserOutlined,
  CalendarOutlined,
  AuditOutlined,
  FileOutlined,
  ReloadOutlined,
  DashboardOutlined,
  ExportOutlined,
  ShopOutlined,
  BankOutlined,
  DollarOutlined,
  CrownOutlined,
  EyeOutlined,
  HistoryOutlined,
  DownloadOutlined,
  UploadOutlined,
  SendOutlined,
  InboxOutlined
} from '@ant-design/icons';
import api from '../../services/api';
import * as XLSX from 'xlsx';
import { StatusTag } from '../config/supplierInvoiceStatus';
import ApprovalStatusTracker from '../common/ApprovalStatusTracker';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;
const { Option } = Select;
const { TextArea } = Input;

const FinanceInvoiceApprovalPage = () => {
  const [combinedInvoices, setCombinedInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [approvalModalVisible, setApprovalModalVisible] = useState(false);
  const [analyticsDrawerVisible, setAnalyticsDrawerVisible] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [activeTab, setActiveTab] = useState('pending_finance_approval');
  const [analytics, setAnalytics] = useState(null);
  const [approvalDecision, setApprovalDecision] = useState('');
  const [approvalComments, setApprovalComments] = useState('');
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });
  const [budgetCodes, setBudgetCodes] = useState([]);
  const [selectedBudgetCode, setSelectedBudgetCode] = useState(null);
  const [downloadingFile, setDownloadingFile] = useState(false);
  const [signedDocumentFile, setSignedDocumentFile] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [downloadedInvoice, setDownloadedInvoice] = useState(false);
  const [form] = Form.useForm();

  const fetchEmployeeInvoices = useCallback(async () => {
    try {
      const response = await api.get(`/invoices/finance`);
      
      if (response.data.success) {
        return (response.data.data || []).map(invoice => ({
          ...invoice,
          invoiceType: 'employee',
          key: `emp_${invoice._id}`
        }));
      }
      return [];
    } catch (error) {
      console.error('Error fetching employee invoices:', error);
      return [];
    }
  }, []);

  const fetchSupplierInvoices = useCallback(async () => {
    try {
      const response = await api.get(`/suppliers/admin/invoices`);
      
      if (response.data.success) {
        return (response.data.data || []).map(invoice => ({
          ...invoice,
          invoiceType: 'supplier',
          key: `sup_${invoice._id}`,
          employeeDetails: {
            name: invoice.supplierDetails?.companyName || 'N/A',
            position: invoice.supplierDetails?.contactName || 'Contact',
            department: invoice.serviceCategory || 'Supplier'
          }
        }));
      }
      return [];
    } catch (error) {
      console.error('Error fetching supplier invoices:', error);
      return [];
    }
  }, []);

  const fetchAllInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const [employeeResults, supplierResults] = await Promise.all([
        fetchEmployeeInvoices(),
        fetchSupplierInvoices()
      ]);
      
      const combined = [...employeeResults, ...supplierResults].sort((a, b) => {
        const dateA = new Date(a.uploadedDate || a.createdAt || 0);
        const dateB = new Date(b.uploadedDate || b.createdAt || 0);
        return dateB - dateA;
      });
      
      setCombinedInvoices(combined);
      setPagination(prev => ({ ...prev, total: combined.length }));
    } catch (error) {
      console.error('Error fetching invoices:', error);
      message.error('Failed to fetch invoices');
    } finally {
      setLoading(false);
    }
  }, [fetchEmployeeInvoices, fetchSupplierInvoices]);

  const fetchAnalytics = useCallback(async () => {
    try {
      const results = await Promise.allSettled([
        api.get('/suppliers/admin/analytics'),
        api.get('/invoices/analytics/dashboard')
      ]);
      
      const combinedAnalytics = {
        topSuppliers: [],
        recentActivity: []
      };
      
      if (results[0].status === 'fulfilled' && results[0].value.data.success) {
        const supplierData = results[0].value.data.data;
        if (supplierData.topSuppliers) {
          combinedAnalytics.topSuppliers = supplierData.topSuppliers;
        }
        if (supplierData.recentActivity) {
          combinedAnalytics.recentActivity = supplierData.recentActivity.map(item => ({...item, type: 'supplier'}));
        }
      }
      
      combinedAnalytics.recentActivity.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      combinedAnalytics.recentActivity = combinedAnalytics.recentActivity.slice(0, 15);
      
      setAnalytics(combinedAnalytics);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    }
  }, []);

  const fetchBudgetCodes = useCallback(async () => {
    try {
      const response = await api.get('/budget-codes');
      if (response.data.success) {
        setBudgetCodes(response.data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch budget codes:', error);
    }
  }, []);

  useEffect(() => {
    fetchAllInvoices();
    fetchAnalytics();
    fetchBudgetCodes();
  }, [fetchAllInvoices, fetchAnalytics, fetchBudgetCodes]);

  const handleFinanceApproval = async (values) => {
    const { decision, comments, budgetCode, allocationAmount, paymentMethod } = values;

    if (!signedDocumentFile) {
      message.error('Please upload a signed document');
      return;
    }

    try {
      setLoading(true);
      
      // Prepare form data with file upload
      const formData = new FormData();
      formData.append('decision', decision);
      formData.append('comments', comments);
      if (budgetCode) {
        formData.append('budgetCode', budgetCode);
      }
      if (allocationAmount) {
        formData.append('allocationAmount', parseFloat(allocationAmount));
      }
      if (paymentMethod) {
        formData.append('paymentMethod', paymentMethod);
      }
      formData.append('signedDocument', signedDocumentFile);
      
      const response = await api.put(
        `/suppliers/supervisor/invoices/${selectedInvoice._id}/decision`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      
      if (response.data.success) {
        notification.success({
          message: `Invoice ${decision}`,
          description: decision === 'approved' 
            ? `Invoice has been approved for ${selectedInvoice?.currency} ${parseFloat(allocationAmount || selectedInvoice?.invoiceAmount).toLocaleString()} via ${paymentMethod} and is ready for payment processing.`
            : 'Invoice has been rejected and supplier will be notified.',
          duration: 5
        });
        setApprovalModalVisible(false);
        setSelectedInvoice(null);
        setApprovalDecision('');
        setApprovalComments('');
        setSelectedBudgetCode(null);
        form.resetFields();
        resetSigningWorkflow();
        fetchAllInvoices();
      }
    } catch (error) {
      message.error(error.response?.data?.message || 'Failed to process approval');
    } finally {
      setLoading(false);
    }
  };

  const handleProcessPayment = async (invoice) => {
    try {
      setLoading(true);
      
      const isSupplierInvoice = invoice.invoiceType === 'supplier';
      const endpoint = isSupplierInvoice 
        ? `/suppliers/admin/invoices/${invoice._id}/payment`
        : `/invoices/finance/process/${invoice._id}`;
      
      const paymentAmount = invoice.allocationAmount || invoice.invoiceAmount;
      const response = await api.post(endpoint, {
        paymentAmount: paymentAmount,
        paymentMethod: invoice.paymentMethod || 'Bank Transfer',
        comments: 'Payment processed by finance'
      });
      
      if (response.data.success) {
        notification.success({
          message: 'Payment Processed',
          description: `Payment of ${invoice.currency} ${paymentAmount.toLocaleString()} has been processed successfully via ${invoice.paymentMethod || 'Bank Transfer'}.`,
          duration: 5
        });
        fetchAllInvoices();
      }
    } catch (error) {
      message.error(error.response?.data?.message || 'Failed to process payment');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (invoice) => {
    try {
      const isSupplierInvoice = invoice.invoiceType === 'supplier';
      const endpoint = isSupplierInvoice 
        ? `/suppliers/invoices/${invoice._id}`
        : `/invoices/${invoice._id}`;
      
      const response = await api.get(endpoint);
      
      if (response.data.success) {
        setSelectedInvoice({
          ...response.data.data,
          invoiceType: invoice.invoiceType
        });
        setDetailsModalVisible(true);
      }
    } catch (error) {
      message.error('Failed to fetch invoice details');
    }
  };


  const handleDownloadInvoice = async () => {
  if (!selectedInvoice) {
    message.error('No invoice selected');
    return;
  }

  try {
    setDownloadingFile(true);
    message.loading({ content: 'Preparing invoice for download...', key: 'invoicedownload' });

    const response = await api.get(
      `/suppliers/invoices/${selectedInvoice._id}/download-for-signing`
    );

    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to get download URL');
    }

    const { url, originalName } = response.data.data;

    if (!url) {
      throw new Error('No download URL returned from server');
    }

    // Extract publicId from Cloudinary URL
    const urlMatch = url.match(/\/upload\/(?:v\d+\/)?(.+)$/);
    if (!urlMatch) {
      throw new Error('Could not parse file URL');
    }

    const publicId = urlMatch[1];
    const filename = originalName || publicId.split('/').pop() || 'invoice.pdf';

    const fileResponse = await api.get(
      `/suppliers/files/proxy?publicId=${encodeURIComponent(publicId)}&resourceType=raw`,
      { responseType: 'blob' }
    );

    const blob = new Blob([fileResponse.data], {
      type: fileResponse.headers['content-type'] || 'application/pdf'
    });

    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);

    message.success({ 
      content: 'Invoice downloaded. Please sign and upload.', 
      key: 'invoicedownload' 
    });
    setDownloadedInvoice(true);
    setCurrentStep(1);

  } catch (error) {
    console.error('Download error:', error);
    message.error({ 
      content: error.message || 'Failed to download invoice', 
      key: 'invoicedownload' 
    });
  } finally {
    setDownloadingFile(false);
  }
};

  const handleFileUpload = (info) => {
    const { file } = info;
    
    const isValidType = file.type === 'application/pdf' || 
                        file.type === 'image/jpeg' || 
                        file.type === 'image/png' ||
                        file.type === 'image/jpg';
    
    if (!isValidType) {
      message.error('File must be PDF, JPG, or PNG');
      return;
    }

    const isValidSize = file.size / 1024 / 1024 < 10;
    if (!isValidSize) {
      message.error('File must be less than 10MB');
      return;
    }

    setSignedDocumentFile(file);
    message.success(`${file.name} selected successfully`);
    setCurrentStep(2);
  };

  const resetSigningWorkflow = () => {
    setSignedDocumentFile(null);
    setDownloadedInvoice(false);
    setCurrentStep(0);
  };

  const downloadFile = async (fileData, label = 'file') => {
  if (!fileData?.publicId && !fileData?.url) {
    message.error('File not available');
    return;
  }

  try {
    setDownloadingFile(true);
    message.loading({ content: `Downloading ${label}...`, key: 'filedownload' });

    const publicId = fileData.publicId || fileData.cloudinaryId || fileData.relativePath;
    const resourceType = fileData.resourceType || 'raw';
    const filename = fileData.originalName || fileData.name || 
                     publicId?.split('/').pop() || `${label}.pdf`;

    if (!publicId) {
      throw new Error('No file identifier available');
    }

    const response = await api.get(
      `/suppliers/files/proxy?publicId=${encodeURIComponent(publicId)}&resourceType=${resourceType}`,
      { responseType: 'blob' }
    );

    const blob = new Blob([response.data], {
      type: response.headers['content-type'] || 'application/pdf'
    });

    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);

    message.success({ content: `${label} downloaded successfully`, key: 'filedownload' });
  } catch (error) {
    console.error('Download error:', error);
    message.error({ content: `Failed to download ${label}`, key: 'filedownload' });
  } finally {
    setDownloadingFile(false);
  }
};

  const exportToExcel = () => {
    const exportData = combinedInvoices.map(invoice => ({
      'Type': invoice.invoiceType === 'supplier' ? 'Supplier' : 'Employee',
      'PO Number': invoice.poNumber,
      'Invoice Number': invoice.invoiceNumber,
      'Company/Employee': invoice.invoiceType === 'supplier' 
        ? invoice.supplierDetails?.companyName 
        : invoice.employeeDetails?.name || 'N/A',
      'Amount': `${invoice.currency || 'XAF'} ${invoice.invoiceAmount}`,
      'Status': invoice.approvalStatus?.replace(/_/g, ' ').toUpperCase(),
      'Department': invoice.assignedDepartment || 'Not assigned'
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Finance Invoices');
    XLSX.writeFile(wb, `finance_invoices_${new Date().toISOString().split('T')[0]}.xlsx`);
    message.success('Invoice data exported successfully');
  };

  const getApprovalProgress = (invoice) => {
    if (!invoice.approvalChain || invoice.approvalChain.length === 0) return 0;
    const approved = invoice.approvalChain.filter(step => step.status === 'approved').length;
    return Math.round((approved / invoice.approvalChain.length) * 100);
  };

  const getTabCount = (status) => {
    if (status === 'all') return combinedInvoices.length;
    return combinedInvoices.filter(inv => {
      switch (status) {
        case 'pending_supply_chain_assignment':
          return inv.approvalStatus === 'pending_supply_chain_assignment';
        case 'pending_department_head_approval':
          return inv.approvalStatus === 'pending_department_head_approval';
        case 'pending_head_of_business_approval':
          return inv.approvalStatus === 'pending_head_of_business_approval';
        case 'pending_finance_approval':
          return inv.approvalStatus === 'pending_finance_approval';
        case 'pending_ceo_approval':
          return inv.approvalStatus === 'pending_ceo_approval';
        case 'approved':
          return inv.approvalStatus === 'approved';
        case 'rejected':
          return inv.approvalStatus === 'rejected';
        case 'paid':
          return inv.approvalStatus === 'paid' || inv.paymentStatus === 'paid';
        default:
          return false;
      }
    }).length;
  };

  const columns = [
    {
      title: 'Type',
      dataIndex: 'invoiceType',
      key: 'type',
      width: 80,
      render: (type) => (
        <Tag color={type === 'supplier' ? 'green' : 'blue'} icon={type === 'supplier' ? <ShopOutlined /> : <UserOutlined />}>
          {type === 'supplier' ? 'Supplier' : 'Employee'}
        </Tag>
      )
    },
    {
      title: 'PO Number',
      dataIndex: 'poNumber',
      key: 'poNumber',
      render: (text) => <Text code>{text}</Text>,
      width: 150
    },
    {
      title: 'Invoice Number',
      dataIndex: 'invoiceNumber',
      key: 'invoiceNumber',
      width: 140
    },
    {
      title: 'Company/Employee',
      key: 'entity',
      render: (_, record) => (
        <div>
          <Text strong>
            {record.invoiceType === 'supplier' 
              ? record.supplierDetails?.companyName 
              : record.employeeDetails?.name || 'N/A'}
          </Text>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.invoiceType === 'supplier'
              ? record.supplierDetails?.contactName
              : record.employeeDetails?.position || 'N/A'}
          </Text>
        </div>
      ),
      width: 220
    },
    {
      title: 'Amount',
      dataIndex: 'invoiceAmount',
      key: 'amount',
      render: (amount, record) => (
        <Text strong>{record.currency || 'XAF'} {amount?.toLocaleString() || 0}</Text>
      ),
      width: 120
    },
    {
      title: 'Status',
      dataIndex: 'approvalStatus',
      key: 'status',
      render: (status, record) => (
        <div>
          <StatusTag status={status} />
          {record.invoiceType === 'supplier' && 
           status === 'pending_finance_approval' && 
           record.currentApprovalLevel === 3 && (
            <>
              <br />
              <Tag size="small" color="purple">Level 3 - Finance</Tag>
            </>
          )}
        </div>
      ),
      width: 180
    },
    {
      title: 'Progress',
      key: 'progress',
      render: (_, record) => {
        const progress = getApprovalProgress(record);
        let status = 'active';
        if (record.approvalStatus === 'rejected') status = 'exception';
        if (record.approvalStatus === 'approved' || record.approvalStatus === 'paid') status = 'success';
        
        return (
          <div style={{ width: 80 }}>
            <Progress percent={progress} size="small" status={status} showInfo={false} />
            <Text style={{ fontSize: '11px' }}>{progress}%</Text>
          </div>
        );
      },
      width: 100
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="View Details">
            <Button
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handleViewDetails(record)}
            />
          </Tooltip>

          {/* Finance approval button */}
          {record.invoiceType === 'supplier' &&
          record.approvalStatus === 'pending_finance_approval' && (
            <Tooltip title="Finance Final Approval">
              <Button
                size="small"
                type="primary"
                icon={<CheckCircleOutlined />}
                onClick={async () => {
                  try {
                    setLoading(true);
                    const response = await api.get(`/suppliers/invoices/${record._id}`);
                    if (response.data.success) {
                      setSelectedInvoice({
                        ...response.data.data,
                        invoiceType: 'supplier'
                      });
                      resetSigningWorkflow();
                      setApprovalModalVisible(true);
                    }
                  } catch (error) {
                    message.error('Failed to fetch invoice details');
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                Review
              </Button>
            </Tooltip>
          )}

          {/* CEO approval button */}
          {record.invoiceType === 'supplier' &&
          record.approvalStatus === 'pending_ceo_approval' && (
            <Tooltip title="CEO Final Approval">
              <Button
                size="small"
                type="primary"
                style={{ backgroundColor: '#fa8c16', borderColor: '#fa8c16' }}
                icon={<CrownOutlined />}
                onClick={async () => {
                  try {
                    setLoading(true);
                    const response = await api.get(`/suppliers/invoices/${record._id}`);
                    if (response.data.success) {
                      setSelectedInvoice({
                        ...response.data.data,
                        invoiceType: 'supplier'
                      });
                      resetSigningWorkflow();
                      setApprovalModalVisible(true);
                    }
                  } catch (error) {
                    message.error('Failed to fetch invoice details');
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                CEO Review
              </Button>
            </Tooltip>
          )}

          {/* Payment button */}
          {record.approvalStatus === 'approved' && (
            <Popconfirm
              title="Process payment for this invoice?"
              description={`Amount: ${record.currency} ${(record.allocationAmount || record.invoiceAmount)?.toLocaleString()} via ${record.paymentMethod || 'Bank Transfer'}`}
              onConfirm={() => handleProcessPayment(record)}
              okText="Process"
              cancelText="Cancel"
            >
              <Button size="small" type="primary" ghost icon={<DollarOutlined />}>
                Pay
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
      width: 180,
      fixed: 'right'
    }
  ];

  return (
    <App>
      <div style={{ padding: '24px' }}>
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <Title level={2} style={{ margin: 0 }}>
              <AuditOutlined /> Finance Invoice Management
            </Title>
            <Space>
              <Button icon={<DashboardOutlined />} onClick={() => setAnalyticsDrawerVisible(true)}>Analytics</Button>
              <Button icon={<ExportOutlined />} onClick={exportToExcel}>Export</Button>
              <Button icon={<ReloadOutlined />} onClick={() => { fetchAllInvoices(); fetchAnalytics(); }} loading={loading}>Refresh</Button>
            </Space>
          </div>

          <Tabs activeKey={activeTab} onChange={setActiveTab}>
            {/* <TabPane
              tab={
                <Badge count={getTabCount('pending_supply_chain_assignment')} size="small" style={{ backgroundColor: '#1890ff' }}>
                  <span><TeamOutlined /> Awaiting Assignment ({getTabCount('pending_supply_chain_assignment')})</span>
                </Badge>
              }
              key="pending_supply_chain_assignment"
            /> */}
            {/* <TabPane
              tab={
                <Badge count={getTabCount('pending_department_head_approval')} size="small" style={{ backgroundColor: '#faad14' }}>
                  <span><UserOutlined /> Dept. Head ({getTabCount('pending_department_head_approval')})</span>
                </Badge>
              }
              key="pending_department_head_approval"
            /> */}
            
            <TabPane
              tab={
                <Badge count={getTabCount('pending_finance_approval')} size="small" style={{ backgroundColor: '#722ed1' }}>
                  <span><ClockCircleOutlined /> Finance Approval ({getTabCount('pending_finance_approval')})</span>
                </Badge>
              }
              key="pending_finance_approval"
            />
            <TabPane
              tab={
                <Badge count={getTabCount('pending_head_of_business_approval')} size="small" style={{ backgroundColor: '#fa8c16' }}>
                  <span><CrownOutlined /> Head of Business ({getTabCount('pending_head_of_business_approval')})</span>
                </Badge>
              }
              key="pending_head_of_business_approval"
            />
            <TabPane
              tab={
                <Badge count={getTabCount('pending_ceo_approval')} size="small" style={{ backgroundColor: '#fa8c16' }}>
                  <span><CrownOutlined /> CEO Approval ({getTabCount('pending_ceo_approval')})</span>
                </Badge>
              }
              key="pending_ceo_approval"
            />
            <TabPane
              tab={
                <Badge count={getTabCount('approved')} size="small" style={{ backgroundColor: '#52c41a' }}>
                  <span><CheckCircleOutlined /> Approved ({getTabCount('approved')})</span>
                </Badge>
              }
              key="approved"
            />
            <TabPane
              tab={
                <Badge count={getTabCount('rejected')} size="small" style={{ backgroundColor: '#ff4d4f' }}>
                  <span><CloseCircleOutlined /> Rejected ({getTabCount('rejected')})</span>
                </Badge>
              }
              key="rejected"
            />
            <TabPane
              tab={
                <Badge count={getTabCount('paid')} size="small" style={{ backgroundColor: '#13c2c2' }}>
                  <span><DollarOutlined /> Paid ({getTabCount('paid')})</span>
                </Badge>
              }
              key="paid"
            />
            <TabPane
              tab={
                <Badge count={getTabCount('all')} size="small" style={{ backgroundColor: '#8c8c8c' }}>
                  <span><FileTextOutlined /> All ({getTabCount('all')})</span>
                </Badge>
              }
              key="all"
            />
          </Tabs>

        <Table
          columns={columns}
            dataSource={combinedInvoices.filter(invoice => {
              switch (activeTab) {
                case 'all':
                  return true;
                case 'pending_supply_chain_assignment':
                  return invoice.approvalStatus === 'pending_supply_chain_assignment';
                case 'pending_department_head_approval':
                  return invoice.approvalStatus === 'pending_department_head_approval';
                case 'pending_head_of_business_approval':
                  return invoice.approvalStatus === 'pending_head_of_business_approval';
                case 'pending_finance_approval':
                  return invoice.approvalStatus === 'pending_finance_approval';
                case 'pending_ceo_approval':
                  return invoice.approvalStatus === 'pending_ceo_approval';
                case 'approved':
                  return invoice.approvalStatus === 'approved';
                case 'rejected':
                  return invoice.approvalStatus === 'rejected';
                case 'paid':
                  return invoice.approvalStatus === 'paid' || invoice.paymentStatus === 'paid';
                default:
                  return false;
              }
            })}
          loading={loading}
          rowKey="key"
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} invoices`
          }}
          scroll={{ x: 1500 }}
          size="small"
        />
      </Card>

      {/* Approval Modal */}
      <Modal
  title={
    <Space>
      {selectedInvoice?.approvalStatus === 'pending_ceo_approval'
        ? <><CrownOutlined /> CEO Final Approval</>
        : <><CheckCircleOutlined /> Finance Final Approval</>
      }
    </Space>
  }
  open={approvalModalVisible}
  onCancel={() => {
    setApprovalModalVisible(false);
    setSelectedInvoice(null);
    setApprovalDecision('');
    setApprovalComments('');
    setSelectedBudgetCode(null);
    form.resetFields();
    resetSigningWorkflow();
  }}
  footer={null}
  width={800}
>
  {selectedInvoice && (
    <div>
      {selectedInvoice.approvalStatus === 'pending_ceo_approval' ? (
        // ── CEO APPROVAL VIEW ─────────────────────────────────────────────
        <>
          <Alert
            message="CEO Final Approval"
            description="Review the invoice and finance decisions below. You only need to sign, upload and give final approval — budget and payment details were set by Finance."
            type="info"
            showIcon
            icon={<CrownOutlined />}
            style={{ marginBottom: 16 }}
          />

          {/* Invoice Summary */}
          <Descriptions bordered size="small" column={2} style={{ marginBottom: 16 }}>
            <Descriptions.Item label="Supplier">
              {selectedInvoice.supplierDetails?.companyName}
            </Descriptions.Item>
            <Descriptions.Item label="Invoice">
              {selectedInvoice.invoiceNumber}
            </Descriptions.Item>
            <Descriptions.Item label="PO Number">
              {selectedInvoice.poNumber}
            </Descriptions.Item>
            <Descriptions.Item label="Invoice Amount">
              <Text strong>
                {selectedInvoice.currency} {selectedInvoice.invoiceAmount?.toLocaleString()}
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="Department">
              {selectedInvoice.assignedDepartment}
            </Descriptions.Item>
            <Descriptions.Item label="Service Category">
              <Tag color="purple">{selectedInvoice.serviceCategory}</Tag>
            </Descriptions.Item>
          </Descriptions>

          {/* Finance Decisions (read-only) */}
          <Card
            size="small"
            title={<Space><BankOutlined /><Text strong>Finance Decisions (Set by Finance Officer)</Text></Space>}
            style={{ marginBottom: 16, backgroundColor: '#f6ffed', borderColor: '#b7eb8f' }}
          >
            <Descriptions size="small" column={2}>
              <Descriptions.Item label="Approved Amount">
                <Text strong style={{ color: '#52c41a' }}>
                  {selectedInvoice.currency} {(selectedInvoice.allocationAmount || selectedInvoice.invoiceAmount)?.toLocaleString()}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Payment Method">
                <Tag color="blue">{selectedInvoice.paymentMethod || 'Not set'}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Budget Code" span={2}>
                {selectedInvoice.allocatedBudgetCode
                  ? <Tag color="green">{selectedInvoice.allocatedBudgetCode?.code || selectedInvoice.allocatedBudgetCode}</Tag>
                  : <Text type="secondary">Not yet allocated</Text>
                }
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {/* Previous Signed Documents */}
          <Card
            size="small"
            title={<Space><FileOutlined /><Text strong>Signed Documents from Previous Approvers</Text></Space>}
            style={{ marginBottom: 16 }}
          >
            <Space wrap>
              {selectedInvoice.supplyChainReview?.signedDocument?.publicId && (
                <Button
                  icon={<DownloadOutlined />}
                  onClick={() => downloadFile(
                    selectedInvoice.supplyChainReview.signedDocument,
                    'Supply Chain Signed Document'
                  )}
                >
                  SC Signed Doc
                </Button>
              )}
              {selectedInvoice.approvalChain?.map((step, i) =>
                step.status === 'approved' && step.signedDocument?.publicId ? (
                  <Button
                    key={i}
                    icon={<DownloadOutlined />}
                    onClick={() => downloadFile(
                      step.signedDocument,
                      `Level ${step.level} - ${step.approver?.name}`
                    )}
                  >
                    L{step.level} — {step.approver?.name}
                  </Button>
                ) : null
              )}
              {!selectedInvoice.supplyChainReview?.signedDocument?.publicId &&
               !selectedInvoice.approvalChain?.some(s => s.status === 'approved' && s.signedDocument?.publicId) && (
                <Text type="secondary">No signed documents available yet</Text>
              )}
            </Space>
          </Card>

          {/* CEO Signing Workflow */}
          <Steps current={currentStep} style={{ marginBottom: 24 }}>
            <Steps.Step title="Download" icon={<DownloadOutlined />} />
            <Steps.Step title="Sign" icon={<FileTextOutlined />} />
            <Steps.Step title="Upload" icon={<UploadOutlined />} />
            <Steps.Step title="Approve" icon={<SendOutlined />} />
          </Steps>

          <Divider />

          {/* Download */}
          <Card
            size="small"
            style={{
              marginBottom: 16,
              backgroundColor: currentStep === 0 ? '#fff7e6' : '#f5f5f5',
              borderColor: currentStep === 0 ? '#faad14' : '#d9d9d9'
            }}
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text strong>Step 1: Download Invoice for Signing</Text>
              <Button
                type={currentStep === 0 ? 'primary' : 'default'}
                icon={<DownloadOutlined />}
                loading={downloadingFile}
                onClick={handleDownloadInvoice}
                disabled={downloadedInvoice}
                block
              >
                {downloadedInvoice ? 'Downloaded ✓' : 'Download Invoice'}
              </Button>
            </Space>
          </Card>

          {/* Upload Signed */}
          <Card
            size="small"
            style={{
              marginBottom: 16,
              backgroundColor: currentStep === 1 ? '#fff7e6' : '#f5f5f5',
              borderColor: currentStep === 1 ? '#faad14' : '#d9d9d9'
            }}
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text strong>
                Step 2: Upload Signed Document <Text type="danger">*</Text>
              </Text>
              <Upload.Dragger
                accept=".pdf,.jpg,.jpeg,.png"
                maxCount={1}
                beforeUpload={(file) => { handleFileUpload({ file }); return false; }}
                onRemove={() => { setSignedDocumentFile(null); setCurrentStep(1); }}
                disabled={!downloadedInvoice}
                fileList={signedDocumentFile ? [{ uid: '-1', name: signedDocumentFile.name, status: 'done' }] : []}
              >
                <p className="ant-upload-drag-icon"><InboxOutlined /></p>
                <p className="ant-upload-text">Upload your signed copy</p>
                <p className="ant-upload-hint">PDF, JPG, PNG (Max 10MB)</p>
              </Upload.Dragger>
            </Space>
          </Card>

          {/* CEO Simple Decision Form — no budget fields */}
          <Form
            form={form}
            layout="vertical"
            onFinish={handleFinanceApproval}
          >
            <Form.Item
              name="decision"
              label={<Text strong>Your Decision</Text>}
              rules={[{ required: true, message: 'Please make a decision' }]}
            >
              <Radio.Group disabled={!signedDocumentFile}>
                <Radio.Button value="approved" style={{ color: '#52c41a' }}>
                  <CheckCircleOutlined /> Approve for Payment
                </Radio.Button>
                <Radio.Button value="rejected" style={{ color: '#f5222d' }}>
                  <CloseCircleOutlined /> Reject
                </Radio.Button>
              </Radio.Group>
            </Form.Item>

            <Form.Item
              name="comments"
              label={<Text strong>Comments</Text>}
            >
              <Input.TextArea
                rows={3}
                placeholder="Add any final comments..."
                maxLength={300}
                showCount
              />
            </Form.Item>

            <Form.Item>
              <Space>
                <Button onClick={() => {
                  setApprovalModalVisible(false);
                  setSelectedInvoice(null);
                  form.resetFields();
                  resetSigningWorkflow();
                }}>
                  Cancel
                </Button>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  disabled={!signedDocumentFile || !form.getFieldValue('decision')}
                  icon={<CrownOutlined />}
                >
                  Submit CEO Decision
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </>
      ) : (
        // ── FINANCE APPROVAL VIEW ─────────────────────────────────────────
        <>
          <Alert
            message="Final Approval Level - Document Signing Required"
            description="As Finance Officer, you must download, sign, and upload the invoice before approving. You will also set the budget code and payment method."
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
          />

          <Descriptions bordered size="small" column={2} style={{ marginBottom: 16 }}>
            <Descriptions.Item label="Supplier">
              {selectedInvoice.supplierDetails?.companyName}
            </Descriptions.Item>
            <Descriptions.Item label="Invoice">
              {selectedInvoice.invoiceNumber}
            </Descriptions.Item>
            <Descriptions.Item label="PO Number">
              {selectedInvoice.poNumber}
            </Descriptions.Item>
            <Descriptions.Item label="Amount">
              <Text strong>
                {selectedInvoice.currency} {selectedInvoice.invoiceAmount?.toLocaleString()}
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="Department">
              {selectedInvoice.assignedDepartment}
            </Descriptions.Item>
          </Descriptions>

          <Steps current={currentStep} style={{ marginBottom: 24 }}>
            <Steps.Step title="Download" icon={<DownloadOutlined />} />
            <Steps.Step title="Sign" icon={<FileTextOutlined />} />
            <Steps.Step title="Upload" icon={<UploadOutlined />} />
            <Steps.Step title="Approve" icon={<SendOutlined />} />
          </Steps>

          <Divider />

          {/* Download */}
          <Card
            size="small"
            style={{
              marginBottom: 16,
              backgroundColor: currentStep === 0 ? '#fff7e6' : '#f5f5f5',
              borderColor: currentStep === 0 ? '#faad14' : '#d9d9d9'
            }}
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text strong>Step 1: Download Invoice</Text>
              <Button
                type={currentStep === 0 ? 'primary' : 'default'}
                icon={<DownloadOutlined />}
                loading={downloadingFile}
                onClick={handleDownloadInvoice}
                disabled={downloadedInvoice}
                block
              >
                {downloadedInvoice ? 'Downloaded ✓' : 'Download Invoice for Signing'}
              </Button>
            </Space>
          </Card>

          {/* Upload Signed */}
          <Card
            size="small"
            style={{
              marginBottom: 16,
              backgroundColor: currentStep === 1 ? '#fff7e6' : '#f5f5f5',
              borderColor: currentStep === 1 ? '#faad14' : '#d9d9d9'
            }}
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text strong>
                Step 2: Upload Signed Document <Text type="danger">*</Text>
              </Text>
              <Upload.Dragger
                accept=".pdf,.jpg,.jpeg,.png"
                maxCount={1}
                beforeUpload={(file) => { handleFileUpload({ file }); return false; }}
                onRemove={() => { setSignedDocumentFile(null); setCurrentStep(1); }}
                disabled={!downloadedInvoice}
                fileList={signedDocumentFile ? [{ uid: '-1', name: signedDocumentFile.name, status: 'done' }] : []}
              >
                <p className="ant-upload-drag-icon"><InboxOutlined /></p>
                <p className="ant-upload-text">Upload signed document</p>
                <p className="ant-upload-hint">PDF, JPG, PNG (Max 10MB)</p>
              </Upload.Dragger>
            </Space>
          </Card>

          {/* Finance Decision Form with budget fields */}
          <Form
            form={form}
            layout="vertical"
            onFinish={handleFinanceApproval}
          >
            <Form.Item
              name="decision"
              label={<Text strong>Your Decision</Text>}
              rules={[{ required: true, message: 'Please make a decision' }]}
            >
              <Radio.Group disabled={!signedDocumentFile}>
                <Radio.Button value="approved" style={{ color: '#52c41a' }}>
                  <CheckCircleOutlined /> Approve for Payment
                </Radio.Button>
                <Radio.Button value="rejected" style={{ color: '#f5222d' }}>
                  <CloseCircleOutlined /> Reject
                </Radio.Button>
              </Radio.Group>
            </Form.Item>

            <Form.Item
              noStyle
              shouldUpdate={(prev, curr) => prev.decision !== curr.decision || prev.budgetCode !== curr.budgetCode}
            >
              {({ getFieldValue }) =>
                getFieldValue('decision') === 'approved' ? (
                  <>
                    <Form.Item
                      name="budgetCode"
                      label={<Text strong>Budget Code <Text type="danger">*</Text></Text>}
                      rules={[{ required: true, message: 'Please select a budget code' }]}
                    >
                      <Select placeholder="Select budget code for payment allocation">
                        {budgetCodes.map(code => (
                          <Option key={code._id} value={code._id} label={code.code}>
                            <div>
                              <Text strong>{code.code}</Text>
                              <br />
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                {code.description || 'No description'}
                              </Text>
                            </div>
                          </Option>
                        ))}
                      </Select>
                    </Form.Item>

                    {getFieldValue('budgetCode') && (
                      <>
                        <Form.Item
                          name="allocationAmount"
                          label={<Text strong>Amount to Deduct <Text type="danger">*</Text></Text>}
                          rules={[
                            { required: true, message: 'Please enter amount' },
                            {
                              validator: (_, value) => {
                                if (!value) return Promise.resolve();
                                if (isNaN(parseFloat(value)) || parseFloat(value) <= 0) {
                                  return Promise.reject(new Error('Amount must be greater than 0'));
                                }
                                return Promise.resolve();
                              }
                            }
                          ]}
                        >
                          <Input
                            type="number"
                            placeholder="Enter amount"
                            step="0.01"
                            min="0"
                            addonBefore={selectedInvoice?.currency}
                          />
                        </Form.Item>

                        <Form.Item
                          name="paymentMethod"
                          label={<Text strong>Payment Method <Text type="danger">*</Text></Text>}
                          rules={[{ required: true, message: 'Please select payment method' }]}
                        >
                          <Select placeholder="Select payment method">
                            <Option value="Bank Transfer">Bank Transfer</Option>
                            <Option value="Mobile Money">Mobile Money</Option>
                            <Option value="Cash">Cash</Option>
                          </Select>
                        </Form.Item>
                      </>
                    )}
                  </>
                ) : null
              }
            </Form.Item>

            <Form.Item
              name="comments"
              label={<Text strong>Comments</Text>}
              rules={[{
                required: form.getFieldValue('decision') === 'rejected',
                message: 'Comments required for rejection'
              }]}
            >
              <Input.TextArea
                rows={3}
                placeholder={
                  form.getFieldValue('decision') === 'rejected'
                    ? 'Provide reason for rejection...'
                    : 'Add any comments...'
                }
                maxLength={300}
                showCount
              />
            </Form.Item>

            <Form.Item
              noStyle
              shouldUpdate
            >
              {({ getFieldValue }) => (
                <Form.Item>
                  <Space>
                    <Button onClick={() => {
                      setApprovalModalVisible(false);
                      setSelectedInvoice(null);
                      form.resetFields();
                      resetSigningWorkflow();
                    }}>
                      Cancel
                    </Button>
                    <Button
                      type="primary"
                      htmlType="submit"
                      loading={loading}
                      disabled={
                        !signedDocumentFile ||
                        !getFieldValue('decision') ||
                        (getFieldValue('decision') === 'approved' && (
                          !getFieldValue('budgetCode') ||
                          !getFieldValue('allocationAmount') ||
                          !getFieldValue('paymentMethod')
                        ))
                      }
                      icon={getFieldValue('decision') === 'approved'
                        ? <CheckCircleOutlined />
                        : <CloseCircleOutlined />
                      }
                    >
                      Submit {getFieldValue('decision') === 'approved' ? 'Approval' : 'Rejection'}
                    </Button>
                  </Space>
                </Form.Item>
              )}
            </Form.Item>
          </Form>
        </>
      )}
    </div>
  )}
</Modal>

      {/* Analytics Drawer */}
      <Drawer
        title="Invoice Analytics Dashboard"
        placement="right"
        width={800}
        open={analyticsDrawerVisible}
        onClose={() => setAnalyticsDrawerVisible(false)}
      >
        {analytics && (
          <div style={{ padding: '20px' }}>
            <Title level={4}><DashboardOutlined /> Combined Invoice Analytics</Title>
            
            <Row gutter={16} style={{ marginBottom: '20px' }}>
              <Col span={8}>
                <Statistic title="Total Invoices" value={combinedInvoices.length} prefix={<FileTextOutlined />} />
              </Col>
              <Col span={8}>
                <Statistic 
                  title="Employee Invoices" 
                  value={combinedInvoices.filter(inv => inv.invoiceType === 'employee').length} 
                  valueStyle={{ color: '#1890ff' }}
                  prefix={<UserOutlined />} 
                />
              </Col>
              <Col span={8}>
                <Statistic 
                  title="Supplier Invoices" 
                  value={combinedInvoices.filter(inv => inv.invoiceType === 'supplier').length} 
                  valueStyle={{ color: '#52c41a' }}
                  prefix={<ShopOutlined />} 
                />
              </Col>
            </Row>

            {analytics.topSuppliers && analytics.topSuppliers.length > 0 && (
              <Card title="Top Suppliers by Value" style={{ marginBottom: '20px' }}>
                <List
                  dataSource={analytics.topSuppliers}
                  renderItem={(item) => (
                    <List.Item>
                      <List.Item.Meta
                        avatar={<Avatar icon={<ShopOutlined />} />}
                        title={item.supplierName}
                        description={`Invoices: ${item.count} | Total: XAF ${item.totalAmount?.toLocaleString() || 0}`}
                      />
                    </List.Item>
                  )}
                />
              </Card>
            )}
          </div>
        )}
      </Drawer>
    </div>
    {/* Details Modal - ADD before closing </App> tag */}
    <Modal
      title={<Space><FileTextOutlined />Invoice Details & Approval History</Space>}
      open={detailsModalVisible}
      onCancel={() => {
        setDetailsModalVisible(false);
        setSelectedInvoice(null);
      }}
      footer={null}
      width={900}
    >
      {selectedInvoice && (
        <div>
          <Descriptions bordered column={2} size="small" style={{ marginBottom: 20 }}>
            <Descriptions.Item label="Type" span={2}>
              <Tag color={selectedInvoice.invoiceType === 'supplier' ? 'green' : 'blue'}>
                {selectedInvoice.invoiceType === 'supplier' ? 'Supplier Invoice' : 'Employee Invoice'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="PO Number" span={2}>
              <Text code copyable>{selectedInvoice.poNumber}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Invoice Number">
              {selectedInvoice.invoiceNumber}
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              <StatusTag status={selectedInvoice.approvalStatus} />
            </Descriptions.Item>
            {selectedInvoice.invoiceType === 'supplier' ? (
              <>
                <Descriptions.Item label="Supplier" span={2}>
                  {selectedInvoice.supplierDetails?.companyName}
                </Descriptions.Item>
                <Descriptions.Item label="Contact">
                  {selectedInvoice.supplierDetails?.contactName}
                </Descriptions.Item>
                <Descriptions.Item label="Service Category">
                  <Tag color="purple">{selectedInvoice.serviceCategory}</Tag>
                </Descriptions.Item>
              </>
            ) : (
              <Descriptions.Item label="Employee" span={2}>
                {selectedInvoice.employeeDetails?.name}
              </Descriptions.Item>
            )}
            <Descriptions.Item label="Amount">
              <Text strong>
                {selectedInvoice.currency || 'XAF'} {selectedInvoice.invoiceAmount?.toLocaleString()}
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="Department">
              {selectedInvoice.assignedDepartment || 'N/A'}
            </Descriptions.Item>
          </Descriptions>

          {/* Attached Files */}
          <Card size="small" title="Attached Files" style={{ marginBottom: 20 }}>
            <Space wrap>
              {selectedInvoice.poFile?.publicId && (
                <Button
                  icon={<FileOutlined />}
                  onClick={() => downloadFile(selectedInvoice.poFile, 'PO File')}
                >
                  PO File
                </Button>
              )}
              {selectedInvoice.invoiceFile?.publicId && (
                <Button
                  icon={<FileOutlined />}
                  onClick={() => downloadFile(selectedInvoice.invoiceFile, 'Invoice File')}
                >
                  Invoice File
                </Button>
              )}
              {selectedInvoice.supplyChainReview?.signedDocument?.publicId && (
                <Button
                  icon={<FileOutlined />}
                  onClick={() => downloadFile(
                    selectedInvoice.supplyChainReview.signedDocument,
                    'SC Signed Document'
                  )}
                >
                  SC Signed Doc
                </Button>
              )}
              {!selectedInvoice.poFile?.publicId &&
              !selectedInvoice.invoiceFile?.publicId &&
              !selectedInvoice.supplyChainReview?.signedDocument?.publicId && (
                <Text type="secondary">No files attached</Text>
              )}
            </Space>
          </Card>

          {/* Approval Status Tracker - replaces the old hand-rolled Timeline,
              works for any invoice regardless of which stage it's at */}
          {selectedInvoice.invoiceType === 'supplier' && (
            <>
              <Divider />
              <ApprovalStatusTracker invoice={selectedInvoice} onDownloadFile={downloadFile} />
            </>
          )}
        </div>
      )}
    </Modal>
    </App>
  );
};

export default FinanceInvoiceApprovalPage;












// import React, { useState, useEffect, useCallback } from 'react';
// import {
//   Card,
//   Table,
//   Button,
//   Modal,
//   Select,
//   Typography,
//   Tag,
//   Space,
//   Input,
//   Timeline,
//   Descriptions,
//   Progress,
//   Alert,
//   message,
//   Popconfirm,
//   Tooltip,
//   Badge,
//   Statistic,
//   Row,
//   Col,
//   notification,
//   Drawer,
//   List,
//   Avatar,
//   Tabs,
//   Steps,
//   Upload,
//   Form,
//   Radio,
//   Divider,
//   App,
// } from 'antd';
// import {
//   FileTextOutlined,
//   TeamOutlined,
//   CheckCircleOutlined,
//   CloseCircleOutlined,
//   ClockCircleOutlined,
//   UserOutlined,
//   CalendarOutlined,
//   AuditOutlined,
//   FileOutlined,
//   ReloadOutlined,
//   DashboardOutlined,
//   ExportOutlined,
//   ShopOutlined,
//   BankOutlined,
//   DollarOutlined,
//   CrownOutlined,
//   EyeOutlined,
//   HistoryOutlined,
//   DownloadOutlined,
//   UploadOutlined,
//   SendOutlined,
//   InboxOutlined,
// } from '@ant-design/icons';
// import api from '../../services/api';
// import * as XLSX from 'xlsx';
// import { StatusTag } from '../config/supplierInvoiceStatus';
// import ApprovalStatusTracker from '../common/ApprovalStatusTracker';


// const { Title, Text, Paragraph } = Typography;
// const { TabPane } = Tabs;
// const { Option } = Select;
// const { TextArea } = Input;

// const FinanceInvoiceApprovalPage = () => {
//   const [combinedInvoices, setCombinedInvoices] = useState([]);
//   const [loading, setLoading] = useState(false);
//   const [detailsModalVisible, setDetailsModalVisible] = useState(false);
//   const [approvalModalVisible, setApprovalModalVisible] = useState(false);
//   const [analyticsDrawerVisible, setAnalyticsDrawerVisible] = useState(false);
//   const [selectedInvoice, setSelectedInvoice] = useState(null);
//   const [activeTab, setActiveTab] = useState('pending_finance_approval');
//   const [analytics, setAnalytics] = useState(null);
//   const [approvalDecision, setApprovalDecision] = useState('');
//   const [approvalComments, setApprovalComments] = useState('');
//   const [pagination, setPagination] = useState({
//     current: 1,
//     pageSize: 10,
//     total: 0
//   });
//   const [budgetCodes, setBudgetCodes] = useState([]);
//   const [selectedBudgetCode, setSelectedBudgetCode] = useState(null);
//   const [downloadingFile, setDownloadingFile] = useState(false);
//   const [signedDocumentFile, setSignedDocumentFile] = useState(null);
//   const [currentStep, setCurrentStep] = useState(0);
//   const [downloadedInvoice, setDownloadedInvoice] = useState(false);
//   const [form] = Form.useForm();

//   const fetchEmployeeInvoices = useCallback(async () => {
//     try {
//       const response = await api.get(`/invoices/finance`);
      
//       if (response.data.success) {
//         return (response.data.data || []).map(invoice => ({
//           ...invoice,
//           invoiceType: 'employee',
//           key: `emp_${invoice._id}`
//         }));
//       }
//       return [];
//     } catch (error) {
//       console.error('Error fetching employee invoices:', error);
//       return [];
//     }
//   }, []);

//   const fetchSupplierInvoices = useCallback(async () => {
//     try {
//       const response = await api.get(`/suppliers/admin/invoices`);
      
//       if (response.data.success) {
//         return (response.data.data || []).map(invoice => ({
//           ...invoice,
//           invoiceType: 'supplier',
//           key: `sup_${invoice._id}`,
//           employeeDetails: {
//             name: invoice.supplierDetails?.companyName || 'N/A',
//             position: invoice.supplierDetails?.contactName || 'Contact',
//             department: invoice.serviceCategory || 'Supplier'
//           }
//         }));
//       }
//       return [];
//     } catch (error) {
//       console.error('Error fetching supplier invoices:', error);
//       return [];
//     }
//   }, []);

//   const fetchAllInvoices = useCallback(async () => {
//     setLoading(true);
//     try {
//       const [employeeResults, supplierResults] = await Promise.all([
//         fetchEmployeeInvoices(),
//         fetchSupplierInvoices()
//       ]);
      
//       const combined = [...employeeResults, ...supplierResults].sort((a, b) => {
//         const dateA = new Date(a.uploadedDate || a.createdAt || 0);
//         const dateB = new Date(b.uploadedDate || b.createdAt || 0);
//         return dateB - dateA;
//       });
      
//       setCombinedInvoices(combined);
//       setPagination(prev => ({ ...prev, total: combined.length }));
//     } catch (error) {
//       console.error('Error fetching invoices:', error);
//       message.error('Failed to fetch invoices');
//     } finally {
//       setLoading(false);
//     }
//   }, [fetchEmployeeInvoices, fetchSupplierInvoices]);

//   const fetchAnalytics = useCallback(async () => {
//     try {
//       const results = await Promise.allSettled([
//         api.get('/suppliers/admin/analytics'),
//         api.get('/invoices/analytics/dashboard')
//       ]);
      
//       const combinedAnalytics = {
//         topSuppliers: [],
//         recentActivity: []
//       };
      
//       if (results[0].status === 'fulfilled' && results[0].value.data.success) {
//         const supplierData = results[0].value.data.data;
//         if (supplierData.topSuppliers) {
//           combinedAnalytics.topSuppliers = supplierData.topSuppliers;
//         }
//         if (supplierData.recentActivity) {
//           combinedAnalytics.recentActivity = supplierData.recentActivity.map(item => ({...item, type: 'supplier'}));
//         }
//       }
      
//       combinedAnalytics.recentActivity.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
//       combinedAnalytics.recentActivity = combinedAnalytics.recentActivity.slice(0, 15);
      
//       setAnalytics(combinedAnalytics);
//     } catch (error) {
//       console.error('Failed to fetch analytics:', error);
//     }
//   }, []);

//   const fetchBudgetCodes = useCallback(async () => {
//     try {
//       const response = await api.get('/budget-codes');
//       if (response.data.success) {
//         setBudgetCodes(response.data.data || []);
//       }
//     } catch (error) {
//       console.error('Failed to fetch budget codes:', error);
//     }
//   }, []);

//   useEffect(() => {
//     fetchAllInvoices();
//     fetchAnalytics();
//     fetchBudgetCodes();
//   }, [fetchAllInvoices, fetchAnalytics, fetchBudgetCodes]);

//   const handleFinanceApproval = async (values) => {
//     const { decision, comments, budgetCode, allocationAmount, paymentMethod } = values;

//     if (!signedDocumentFile) {
//       message.error('Please upload a signed document');
//       return;
//     }

//     try {
//       setLoading(true);
      
//       // Prepare form data with file upload
//       const formData = new FormData();
//       formData.append('decision', decision);
//       formData.append('comments', comments);
//       if (budgetCode) {
//         formData.append('budgetCode', budgetCode);
//       }
//       if (allocationAmount) {
//         formData.append('allocationAmount', parseFloat(allocationAmount));
//       }
//       if (paymentMethod) {
//         formData.append('paymentMethod', paymentMethod);
//       }
//       formData.append('signedDocument', signedDocumentFile);
      
//       const response = await api.put(
//         `/suppliers/supervisor/invoices/${selectedInvoice._id}/decision`,
//         formData,
//         {
//           headers: {
//             'Content-Type': 'multipart/form-data'
//           }
//         }
//       );
      
//       if (response.data.success) {
//         notification.success({
//           message: `Invoice ${decision}`,
//           description: decision === 'approved' 
//             ? `Invoice has been approved for ${selectedInvoice?.currency} ${parseFloat(allocationAmount || selectedInvoice?.invoiceAmount).toLocaleString()} via ${paymentMethod} and is ready for payment processing.`
//             : 'Invoice has been rejected and supplier will be notified.',
//           duration: 5
//         });
//         setApprovalModalVisible(false);
//         setSelectedInvoice(null);
//         setApprovalDecision('');
//         setApprovalComments('');
//         setSelectedBudgetCode(null);
//         form.resetFields();
//         resetSigningWorkflow();
//         fetchAllInvoices();
//       }
//     } catch (error) {
//       message.error(error.response?.data?.message || 'Failed to process approval');
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleProcessPayment = async (invoice) => {
//     try {
//       setLoading(true);
      
//       const isSupplierInvoice = invoice.invoiceType === 'supplier';
//       const endpoint = isSupplierInvoice 
//         ? `/suppliers/admin/invoices/${invoice._id}/payment`
//         : `/invoices/finance/process/${invoice._id}`;
      
//       const paymentAmount = invoice.allocationAmount || invoice.invoiceAmount;
//       const response = await api.post(endpoint, {
//         paymentAmount: paymentAmount,
//         paymentMethod: invoice.paymentMethod || 'Bank Transfer',
//         comments: 'Payment processed by finance'
//       });
      
//       if (response.data.success) {
//         notification.success({
//           message: 'Payment Processed',
//           description: `Payment of ${invoice.currency} ${paymentAmount.toLocaleString()} has been processed successfully via ${invoice.paymentMethod || 'Bank Transfer'}.`,
//           duration: 5
//         });
//         fetchAllInvoices();
//       }
//     } catch (error) {
//       message.error(error.response?.data?.message || 'Failed to process payment');
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleViewDetails = async (invoice) => {
//     try {
//       const isSupplierInvoice = invoice.invoiceType === 'supplier';
//       const endpoint = isSupplierInvoice 
//         ? `/suppliers/invoices/${invoice._id}`
//         : `/invoices/${invoice._id}`;
      
//       const response = await api.get(endpoint);
      
//       if (response.data.success) {
//         setSelectedInvoice({
//           ...response.data.data,
//           invoiceType: invoice.invoiceType
//         });
//         setDetailsModalVisible(true);
//       }
//     } catch (error) {
//       message.error('Failed to fetch invoice details');
//     }
//   };


//   const handleDownloadInvoice = async () => {
//   if (!selectedInvoice) {
//     message.error('No invoice selected');
//     return;
//   }

//   try {
//     setDownloadingFile(true);
//     message.loading({ content: 'Preparing invoice for download...', key: 'invoicedownload' });

//     const response = await api.get(
//       `/suppliers/invoices/${selectedInvoice._id}/download-for-signing`
//     );

//     if (!response.data.success) {
//       throw new Error(response.data.message || 'Failed to get download URL');
//     }

//     const { url, originalName } = response.data.data;

//     if (!url) {
//       throw new Error('No download URL returned from server');
//     }

//     // Extract publicId from Cloudinary URL
//     const urlMatch = url.match(/\/upload\/(?:v\d+\/)?(.+)$/);
//     if (!urlMatch) {
//       throw new Error('Could not parse file URL');
//     }

//     const publicId = urlMatch[1];
//     const filename = originalName || publicId.split('/').pop() || 'invoice.pdf';

//     const fileResponse = await api.get(
//       `/suppliers/files/proxy?publicId=${encodeURIComponent(publicId)}&resourceType=raw`,
//       { responseType: 'blob' }
//     );

//     const blob = new Blob([fileResponse.data], {
//       type: fileResponse.headers['content-type'] || 'application/pdf'
//     });

//     const blobUrl = window.URL.createObjectURL(blob);
//     const link = document.createElement('a');
//     link.href = blobUrl;
//     link.download = filename;
//     document.body.appendChild(link);
//     link.click();
//     document.body.removeChild(link);
//     window.URL.revokeObjectURL(blobUrl);

//     message.success({ 
//       content: 'Invoice downloaded. Please sign and upload.', 
//       key: 'invoicedownload' 
//     });
//     setDownloadedInvoice(true);
//     setCurrentStep(1);

//   } catch (error) {
//     console.error('Download error:', error);
//     message.error({ 
//       content: error.message || 'Failed to download invoice', 
//       key: 'invoicedownload' 
//     });
//   } finally {
//     setDownloadingFile(false);
//   }
// };

//   const handleFileUpload = (info) => {
//     const { file } = info;
    
//     const isValidType = file.type === 'application/pdf' || 
//                         file.type === 'image/jpeg' || 
//                         file.type === 'image/png' ||
//                         file.type === 'image/jpg';
    
//     if (!isValidType) {
//       message.error('File must be PDF, JPG, or PNG');
//       return;
//     }

//     const isValidSize = file.size / 1024 / 1024 < 10;
//     if (!isValidSize) {
//       message.error('File must be less than 10MB');
//       return;
//     }

//     setSignedDocumentFile(file);
//     message.success(`${file.name} selected successfully`);
//     setCurrentStep(2);
//   };

//   const resetSigningWorkflow = () => {
//     setSignedDocumentFile(null);
//     setDownloadedInvoice(false);
//     setCurrentStep(0);
//   };

//   const downloadFile = async (fileData, label = 'file') => {
//   if (!fileData?.publicId && !fileData?.url) {
//     message.error('File not available');
//     return;
//   }

//   try {
//     setDownloadingFile(true);
//     message.loading({ content: `Downloading ${label}...`, key: 'filedownload' });

//     const publicId = fileData.publicId || fileData.cloudinaryId || fileData.relativePath;
//     const resourceType = fileData.resourceType || 'raw';
//     const filename = fileData.originalName || fileData.name || 
//                      publicId?.split('/').pop() || `${label}.pdf`;

//     if (!publicId) {
//       throw new Error('No file identifier available');
//     }

//     const response = await api.get(
//       `/suppliers/files/proxy?publicId=${encodeURIComponent(publicId)}&resourceType=${resourceType}`,
//       { responseType: 'blob' }
//     );

//     const blob = new Blob([response.data], {
//       type: response.headers['content-type'] || 'application/pdf'
//     });

//     const blobUrl = window.URL.createObjectURL(blob);
//     const link = document.createElement('a');
//     link.href = blobUrl;
//     link.download = filename;
//     document.body.appendChild(link);
//     link.click();
//     document.body.removeChild(link);
//     window.URL.revokeObjectURL(blobUrl);

//     message.success({ content: `${label} downloaded successfully`, key: 'filedownload' });
//   } catch (error) {
//     console.error('Download error:', error);
//     message.error({ content: `Failed to download ${label}`, key: 'filedownload' });
//   } finally {
//     setDownloadingFile(false);
//   }
// };

//   const exportToExcel = () => {
//     const exportData = combinedInvoices.map(invoice => ({
//       'Type': invoice.invoiceType === 'supplier' ? 'Supplier' : 'Employee',
//       'PO Number': invoice.poNumber,
//       'Invoice Number': invoice.invoiceNumber,
//       'Company/Employee': invoice.invoiceType === 'supplier' 
//         ? invoice.supplierDetails?.companyName 
//         : invoice.employeeDetails?.name || 'N/A',
//       'Amount': `${invoice.currency || 'XAF'} ${invoice.invoiceAmount}`,
//       'Status': invoice.approvalStatus?.replace(/_/g, ' ').toUpperCase(),
//       'Department': invoice.assignedDepartment || 'Not assigned'
//     }));

//     const ws = XLSX.utils.json_to_sheet(exportData);
//     const wb = XLSX.utils.book_new();
//     XLSX.utils.book_append_sheet(wb, ws, 'Finance Invoices');
//     XLSX.writeFile(wb, `finance_invoices_${new Date().toISOString().split('T')[0]}.xlsx`);
//     message.success('Invoice data exported successfully');
//   };

//   const getStatusTag = (status) => {
//     const statusMap = {
//       'pending_finance_approval': { color: 'purple', text: 'Awaiting Finance Approval', icon: <BankOutlined /> },
//       'approved': { color: 'green', text: 'Fully Approved', icon: <CheckCircleOutlined /> },
//       'rejected': { color: 'red', text: 'Rejected', icon: <CloseCircleOutlined /> },
//       'paid': { color: 'cyan', text: 'Paid', icon: <DollarOutlined /> }
//     };
//     const config = statusMap[status] || { color: 'default', text: status?.replace(/_/g, ' ') || 'Unknown', icon: null };
//     return <Tag color={config.color} icon={config.icon}>{config.text}</Tag>;
//   };

//   const getApprovalProgress = (invoice) => {
//     if (!invoice.approvalChain || invoice.approvalChain.length === 0) return 0;
//     const approved = invoice.approvalChain.filter(step => step.status === 'approved').length;
//     return Math.round((approved / invoice.approvalChain.length) * 100);
//   };

//   const getTabCount = (status) => {
//     return combinedInvoices.filter(inv => {
//       switch (status) {
//         case 'pending_finance_approval':
//           return inv.approvalStatus === 'pending_finance_approval';
//         case 'pending_ceo_approval':
//           return inv.approvalStatus === 'pending_ceo_approval';
//         case 'approved':
//           return inv.approvalStatus === 'approved';
//         case 'rejected':
//           return inv.approvalStatus === 'rejected';
//         case 'paid':
//           return inv.approvalStatus === 'paid' || inv.paymentStatus === 'paid';
//         default:
//           return false;
//       }
//     }).length;
//   };

//   const columns = [
//     {
//       title: 'Type',
//       dataIndex: 'invoiceType',
//       key: 'type',
//       width: 80,
//       render: (type) => (
//         <Tag color={type === 'supplier' ? 'green' : 'blue'} icon={type === 'supplier' ? <ShopOutlined /> : <UserOutlined />}>
//           {type === 'supplier' ? 'Supplier' : 'Employee'}
//         </Tag>
//       )
//     },
//     {
//       title: 'PO Number',
//       dataIndex: 'poNumber',
//       key: 'poNumber',
//       render: (text) => <Text code>{text}</Text>,
//       width: 150
//     },
//     {
//       title: 'Invoice Number',
//       dataIndex: 'invoiceNumber',
//       key: 'invoiceNumber',
//       width: 140
//     },
//     {
//       title: 'Company/Employee',
//       key: 'entity',
//       render: (_, record) => (
//         <div>
//           <Text strong>
//             {record.invoiceType === 'supplier' 
//               ? record.supplierDetails?.companyName 
//               : record.employeeDetails?.name || 'N/A'}
//           </Text>
//           <br />
//           <Text type="secondary" style={{ fontSize: '12px' }}>
//             {record.invoiceType === 'supplier'
//               ? record.supplierDetails?.contactName
//               : record.employeeDetails?.position || 'N/A'}
//           </Text>
//         </div>
//       ),
//       width: 220
//     },
//     {
//       title: 'Amount',
//       dataIndex: 'invoiceAmount',
//       key: 'amount',
//       render: (amount, record) => (
//         <Text strong>{record.currency || 'XAF'} {amount?.toLocaleString() || 0}</Text>
//       ),
//       width: 120
//     },
//     {
//       title: 'Status',
//       dataIndex: 'approvalStatus',
//       key: 'status',
//       render: (status, record) => (
//         <div>
//           {getStatusTag(status)}
//           {record.invoiceType === 'supplier' && 
//            status === 'pending_finance_approval' && 
//            record.currentApprovalLevel === 3 && (
//             <>
//               <br />
//               <Tag size="small" color="purple">Level 3 - Finance</Tag>
//             </>
//           )}
//         </div>
//       ),
//       width: 180
//     },
//     {
//       title: 'Progress',
//       key: 'progress',
//       render: (_, record) => {
//         const progress = getApprovalProgress(record);
//         let status = 'active';
//         if (record.approvalStatus === 'rejected') status = 'exception';
//         if (record.approvalStatus === 'approved' || record.approvalStatus === 'paid') status = 'success';
        
//         return (
//           <div style={{ width: 80 }}>
//             <Progress percent={progress} size="small" status={status} showInfo={false} />
//             <Text style={{ fontSize: '11px' }}>{progress}%</Text>
//           </div>
//         );
//       },
//       width: 100
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

//           {/* Finance approval button */}
//           {record.invoiceType === 'supplier' &&
//           record.approvalStatus === 'pending_finance_approval' && (
//             <Tooltip title="Finance Final Approval">
//               <Button
//                 size="small"
//                 type="primary"
//                 icon={<CheckCircleOutlined />}
//                 onClick={async () => {
//                   try {
//                     setLoading(true);
//                     const response = await api.get(`/suppliers/invoices/${record._id}`);
//                     if (response.data.success) {
//                       setSelectedInvoice({
//                         ...response.data.data,
//                         invoiceType: 'supplier'
//                       });
//                       resetSigningWorkflow();
//                       setApprovalModalVisible(true);
//                     }
//                   } catch (error) {
//                     message.error('Failed to fetch invoice details');
//                   } finally {
//                     setLoading(false);
//                   }
//                 }}
//               >
//                 Review
//               </Button>
//             </Tooltip>
//           )}

//           {/* CEO approval button */}
//           {record.invoiceType === 'supplier' &&
//           record.approvalStatus === 'pending_ceo_approval' && (
//             <Tooltip title="CEO Final Approval">
//               <Button
//                 size="small"
//                 type="primary"
//                 style={{ backgroundColor: '#fa8c16', borderColor: '#fa8c16' }}
//                 icon={<CrownOutlined />}
//                 onClick={async () => {
//                   try {
//                     setLoading(true);
//                     const response = await api.get(`/suppliers/invoices/${record._id}`);
//                     if (response.data.success) {
//                       setSelectedInvoice({
//                         ...response.data.data,
//                         invoiceType: 'supplier'
//                       });
//                       resetSigningWorkflow();
//                       setApprovalModalVisible(true);
//                     }
//                   } catch (error) {
//                     message.error('Failed to fetch invoice details');
//                   } finally {
//                     setLoading(false);
//                   }
//                 }}
//               >
//                 CEO Review
//               </Button>
//             </Tooltip>
//           )}

//           {/* Payment button */}
//           {record.approvalStatus === 'approved' && (
//             <Popconfirm
//               title="Process payment for this invoice?"
//               description={`Amount: ${record.currency} ${(record.allocationAmount || record.invoiceAmount)?.toLocaleString()} via ${record.paymentMethod || 'Bank Transfer'}`}
//               onConfirm={() => handleProcessPayment(record)}
//               okText="Process"
//               cancelText="Cancel"
//             >
//               <Button size="small" type="primary" ghost icon={<DollarOutlined />}>
//                 Pay
//               </Button>
//             </Popconfirm>
//           )}
//         </Space>
//       ),
//       width: 180,
//       fixed: 'right'
//     }
//   ];

//   return (
//     <App>
//       <div style={{ padding: '24px' }}>
//         <Card>
//           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
//             <Title level={2} style={{ margin: 0 }}>
//               <AuditOutlined /> Finance Invoice Management
//             </Title>
//             <Space>
//               <Button icon={<DashboardOutlined />} onClick={() => setAnalyticsDrawerVisible(true)}>Analytics</Button>
//               <Button icon={<ExportOutlined />} onClick={exportToExcel}>Export</Button>
//               <Button icon={<ReloadOutlined />} onClick={() => { fetchAllInvoices(); fetchAnalytics(); }} loading={loading}>Refresh</Button>
//             </Space>
//           </div>

//           <Tabs activeKey={activeTab} onChange={setActiveTab}>
//             <TabPane
//               tab={
//                 <Badge count={getTabCount('pending_finance_approval')} size="small" style={{ backgroundColor: '#722ed1' }}>
//                   <span><ClockCircleOutlined /> Finance Approval ({getTabCount('pending_finance_approval')})</span>
//                 </Badge>
//               }
//               key="pending_finance_approval"
//             />
//             <TabPane
//               tab={
//                 <Badge count={getTabCount('pending_ceo_approval')} size="small" style={{ backgroundColor: '#fa8c16' }}>
//                   <span><CrownOutlined /> CEO Approval ({getTabCount('pending_ceo_approval')})</span>
//                 </Badge>
//               }
//               key="pending_ceo_approval"
//             />
//             <TabPane
//               tab={
//                 <Badge count={getTabCount('approved')} size="small" style={{ backgroundColor: '#52c41a' }}>
//                   <span><CheckCircleOutlined /> Approved ({getTabCount('approved')})</span>
//                 </Badge>
//               }
//               key="approved"
//             />
//             <TabPane
//               tab={
//                 <Badge count={getTabCount('rejected')} size="small" style={{ backgroundColor: '#ff4d4f' }}>
//                   <span><CloseCircleOutlined /> Rejected ({getTabCount('rejected')})</span>
//                 </Badge>
//               }
//               key="rejected"
//             />
//             <TabPane
//               tab={
//                 <Badge count={getTabCount('paid')} size="small" style={{ backgroundColor: '#13c2c2' }}>
//                   <span><DollarOutlined /> Paid ({getTabCount('paid')})</span>
//                 </Badge>
//               }
//               key="paid"
//             />
//           </Tabs>

//         <Table
//           columns={columns}
//             dataSource={combinedInvoices.filter(invoice => {
//               switch (activeTab) {
//                 case 'pending_finance_approval':
//                   return invoice.approvalStatus === 'pending_finance_approval';
//                 case 'pending_ceo_approval':
//                   return invoice.approvalStatus === 'pending_ceo_approval';
//                 case 'approved':
//                   return invoice.approvalStatus === 'approved';
//                 case 'rejected':
//                   return invoice.approvalStatus === 'rejected';
//                 case 'paid':
//                   return invoice.approvalStatus === 'paid' || invoice.paymentStatus === 'paid';
//                 default:
//                   return false;
//               }
//             })}
//           loading={loading}
//           rowKey="key"
//           pagination={{
//             ...pagination,
//             showSizeChanger: true,
//             showQuickJumper: true,
//             showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} invoices`
//           }}
//           scroll={{ x: 1500 }}
//           size="small"
//         />
//       </Card>

//       {/* Approval Modal */}
//       <Modal
//   title={
//     <Space>
//       {selectedInvoice?.approvalStatus === 'pending_ceo_approval'
//         ? <><CrownOutlined /> CEO Final Approval</>
//         : <><CheckCircleOutlined /> Finance Final Approval</>
//       }
//     </Space>
//   }
//   open={approvalModalVisible}
//   onCancel={() => {
//     setApprovalModalVisible(false);
//     setSelectedInvoice(null);
//     setApprovalDecision('');
//     setApprovalComments('');
//     setSelectedBudgetCode(null);
//     form.resetFields();
//     resetSigningWorkflow();
//   }}
//   footer={null}
//   width={800}
// >
//   {selectedInvoice && (
//     <div>
//       {selectedInvoice.approvalStatus === 'pending_ceo_approval' ? (
//         // ── CEO APPROVAL VIEW ─────────────────────────────────────────────
//         <>
//           <Alert
//             message="CEO Final Approval"
//             description="Review the invoice and finance decisions below. You only need to sign, upload and give final approval — budget and payment details were set by Finance."
//             type="info"
//             showIcon
//             icon={<CrownOutlined />}
//             style={{ marginBottom: 16 }}
//           />

//           {/* Invoice Summary */}
//           <Descriptions bordered size="small" column={2} style={{ marginBottom: 16 }}>
//             <Descriptions.Item label="Supplier">
//               {selectedInvoice.supplierDetails?.companyName}
//             </Descriptions.Item>
//             <Descriptions.Item label="Invoice">
//               {selectedInvoice.invoiceNumber}
//             </Descriptions.Item>
//             <Descriptions.Item label="PO Number">
//               {selectedInvoice.poNumber}
//             </Descriptions.Item>
//             <Descriptions.Item label="Invoice Amount">
//               <Text strong>
//                 {selectedInvoice.currency} {selectedInvoice.invoiceAmount?.toLocaleString()}
//               </Text>
//             </Descriptions.Item>
//             <Descriptions.Item label="Department">
//               {selectedInvoice.assignedDepartment}
//             </Descriptions.Item>
//             <Descriptions.Item label="Service Category">
//               <Tag color="purple">{selectedInvoice.serviceCategory}</Tag>
//             </Descriptions.Item>
//           </Descriptions>

//           {/* Finance Decisions (read-only) */}
//           <Card
//             size="small"
//             title={<Space><BankOutlined /><Text strong>Finance Decisions (Set by Finance Officer)</Text></Space>}
//             style={{ marginBottom: 16, backgroundColor: '#f6ffed', borderColor: '#b7eb8f' }}
//           >
//             <Descriptions size="small" column={2}>
//               <Descriptions.Item label="Approved Amount">
//                 <Text strong style={{ color: '#52c41a' }}>
//                   {selectedInvoice.currency} {(selectedInvoice.allocationAmount || selectedInvoice.invoiceAmount)?.toLocaleString()}
//                 </Text>
//               </Descriptions.Item>
//               <Descriptions.Item label="Payment Method">
//                 <Tag color="blue">{selectedInvoice.paymentMethod || 'Not set'}</Tag>
//               </Descriptions.Item>
//               <Descriptions.Item label="Budget Code" span={2}>
//                 {selectedInvoice.allocatedBudgetCode
//                   ? <Tag color="green">{selectedInvoice.allocatedBudgetCode?.code || selectedInvoice.allocatedBudgetCode}</Tag>
//                   : <Text type="secondary">Not yet allocated</Text>
//                 }
//               </Descriptions.Item>
//             </Descriptions>
//           </Card>

//           {/* Previous Signed Documents */}
//           <Card
//             size="small"
//             title={<Space><FileOutlined /><Text strong>Signed Documents from Previous Approvers</Text></Space>}
//             style={{ marginBottom: 16 }}
//           >
//             <Space wrap>
//               {selectedInvoice.supplyChainReview?.signedDocument?.publicId && (
//                 <Button
//                   icon={<DownloadOutlined />}
//                   onClick={() => downloadFile(
//                     selectedInvoice.supplyChainReview.signedDocument,
//                     'Supply Chain Signed Document'
//                   )}
//                 >
//                   SC Signed Doc
//                 </Button>
//               )}
//               {selectedInvoice.approvalChain?.map((step, i) =>
//                 step.status === 'approved' && step.signedDocument?.publicId ? (
//                   <Button
//                     key={i}
//                     icon={<DownloadOutlined />}
//                     onClick={() => downloadFile(
//                       step.signedDocument,
//                       `Level ${step.level} - ${step.approver?.name}`
//                     )}
//                   >
//                     L{step.level} — {step.approver?.name}
//                   </Button>
//                 ) : null
//               )}
//               {!selectedInvoice.supplyChainReview?.signedDocument?.publicId &&
//                !selectedInvoice.approvalChain?.some(s => s.status === 'approved' && s.signedDocument?.publicId) && (
//                 <Text type="secondary">No signed documents available yet</Text>
//               )}
//             </Space>
//           </Card>

//           {/* CEO Signing Workflow */}
//           <Steps current={currentStep} style={{ marginBottom: 24 }}>
//             <Steps.Step title="Download" icon={<DownloadOutlined />} />
//             <Steps.Step title="Sign" icon={<FileTextOutlined />} />
//             <Steps.Step title="Upload" icon={<UploadOutlined />} />
//             <Steps.Step title="Approve" icon={<SendOutlined />} />
//           </Steps>

//           <Divider />

//           {/* Download */}
//           <Card
//             size="small"
//             style={{
//               marginBottom: 16,
//               backgroundColor: currentStep === 0 ? '#fff7e6' : '#f5f5f5',
//               borderColor: currentStep === 0 ? '#faad14' : '#d9d9d9'
//             }}
//           >
//             <Space direction="vertical" style={{ width: '100%' }}>
//               <Text strong>Step 1: Download Invoice for Signing</Text>
//               <Button
//                 type={currentStep === 0 ? 'primary' : 'default'}
//                 icon={<DownloadOutlined />}
//                 loading={downloadingFile}
//                 onClick={handleDownloadInvoice}
//                 disabled={downloadedInvoice}
//                 block
//               >
//                 {downloadedInvoice ? 'Downloaded ✓' : 'Download Invoice'}
//               </Button>
//             </Space>
//           </Card>

//           {/* Upload Signed */}
//           <Card
//             size="small"
//             style={{
//               marginBottom: 16,
//               backgroundColor: currentStep === 1 ? '#fff7e6' : '#f5f5f5',
//               borderColor: currentStep === 1 ? '#faad14' : '#d9d9d9'
//             }}
//           >
//             <Space direction="vertical" style={{ width: '100%' }}>
//               <Text strong>
//                 Step 2: Upload Signed Document <Text type="danger">*</Text>
//               </Text>
//               <Upload.Dragger
//                 accept=".pdf,.jpg,.jpeg,.png"
//                 maxCount={1}
//                 beforeUpload={(file) => { handleFileUpload({ file }); return false; }}
//                 onRemove={() => { setSignedDocumentFile(null); setCurrentStep(1); }}
//                 disabled={!downloadedInvoice}
//                 fileList={signedDocumentFile ? [{ uid: '-1', name: signedDocumentFile.name, status: 'done' }] : []}
//               >
//                 <p className="ant-upload-drag-icon"><InboxOutlined /></p>
//                 <p className="ant-upload-text">Upload your signed copy</p>
//                 <p className="ant-upload-hint">PDF, JPG, PNG (Max 10MB)</p>
//               </Upload.Dragger>
//             </Space>
//           </Card>

//           {/* CEO Simple Decision Form — no budget fields */}
//           <Form
//             form={form}
//             layout="vertical"
//             onFinish={handleFinanceApproval}
//           >
//             <Form.Item
//               name="decision"
//               label={<Text strong>Your Decision</Text>}
//               rules={[{ required: true, message: 'Please make a decision' }]}
//             >
//               <Radio.Group disabled={!signedDocumentFile}>
//                 <Radio.Button value="approved" style={{ color: '#52c41a' }}>
//                   <CheckCircleOutlined /> Approve for Payment
//                 </Radio.Button>
//                 <Radio.Button value="rejected" style={{ color: '#f5222d' }}>
//                   <CloseCircleOutlined /> Reject
//                 </Radio.Button>
//               </Radio.Group>
//             </Form.Item>

//             <Form.Item
//               name="comments"
//               label={<Text strong>Comments</Text>}
//             >
//               <Input.TextArea
//                 rows={3}
//                 placeholder="Add any final comments..."
//                 maxLength={300}
//                 showCount
//               />
//             </Form.Item>

//             <Form.Item>
//               <Space>
//                 <Button onClick={() => {
//                   setApprovalModalVisible(false);
//                   setSelectedInvoice(null);
//                   form.resetFields();
//                   resetSigningWorkflow();
//                 }}>
//                   Cancel
//                 </Button>
//                 <Button
//                   type="primary"
//                   htmlType="submit"
//                   loading={loading}
//                   disabled={!signedDocumentFile || !form.getFieldValue('decision')}
//                   icon={<CrownOutlined />}
//                 >
//                   Submit CEO Decision
//                 </Button>
//               </Space>
//             </Form.Item>
//           </Form>
//         </>
//       ) : (
//         // ── FINANCE APPROVAL VIEW ─────────────────────────────────────────
//         <>
//           <Alert
//             message="Final Approval Level - Document Signing Required"
//             description="As Finance Officer, you must download, sign, and upload the invoice before approving. You will also set the budget code and payment method."
//             type="warning"
//             showIcon
//             style={{ marginBottom: 16 }}
//           />

//           <Descriptions bordered size="small" column={2} style={{ marginBottom: 16 }}>
//             <Descriptions.Item label="Supplier">
//               {selectedInvoice.supplierDetails?.companyName}
//             </Descriptions.Item>
//             <Descriptions.Item label="Invoice">
//               {selectedInvoice.invoiceNumber}
//             </Descriptions.Item>
//             <Descriptions.Item label="PO Number">
//               {selectedInvoice.poNumber}
//             </Descriptions.Item>
//             <Descriptions.Item label="Amount">
//               <Text strong>
//                 {selectedInvoice.currency} {selectedInvoice.invoiceAmount?.toLocaleString()}
//               </Text>
//             </Descriptions.Item>
//             <Descriptions.Item label="Department">
//               {selectedInvoice.assignedDepartment}
//             </Descriptions.Item>
//           </Descriptions>

//           <Steps current={currentStep} style={{ marginBottom: 24 }}>
//             <Steps.Step title="Download" icon={<DownloadOutlined />} />
//             <Steps.Step title="Sign" icon={<FileTextOutlined />} />
//             <Steps.Step title="Upload" icon={<UploadOutlined />} />
//             <Steps.Step title="Approve" icon={<SendOutlined />} />
//           </Steps>

//           <Divider />

//           {/* Download */}
//           <Card
//             size="small"
//             style={{
//               marginBottom: 16,
//               backgroundColor: currentStep === 0 ? '#fff7e6' : '#f5f5f5',
//               borderColor: currentStep === 0 ? '#faad14' : '#d9d9d9'
//             }}
//           >
//             <Space direction="vertical" style={{ width: '100%' }}>
//               <Text strong>Step 1: Download Invoice</Text>
//               <Button
//                 type={currentStep === 0 ? 'primary' : 'default'}
//                 icon={<DownloadOutlined />}
//                 loading={downloadingFile}
//                 onClick={handleDownloadInvoice}
//                 disabled={downloadedInvoice}
//                 block
//               >
//                 {downloadedInvoice ? 'Downloaded ✓' : 'Download Invoice for Signing'}
//               </Button>
//             </Space>
//           </Card>

//           {/* Upload Signed */}
//           <Card
//             size="small"
//             style={{
//               marginBottom: 16,
//               backgroundColor: currentStep === 1 ? '#fff7e6' : '#f5f5f5',
//               borderColor: currentStep === 1 ? '#faad14' : '#d9d9d9'
//             }}
//           >
//             <Space direction="vertical" style={{ width: '100%' }}>
//               <Text strong>
//                 Step 2: Upload Signed Document <Text type="danger">*</Text>
//               </Text>
//               <Upload.Dragger
//                 accept=".pdf,.jpg,.jpeg,.png"
//                 maxCount={1}
//                 beforeUpload={(file) => { handleFileUpload({ file }); return false; }}
//                 onRemove={() => { setSignedDocumentFile(null); setCurrentStep(1); }}
//                 disabled={!downloadedInvoice}
//                 fileList={signedDocumentFile ? [{ uid: '-1', name: signedDocumentFile.name, status: 'done' }] : []}
//               >
//                 <p className="ant-upload-drag-icon"><InboxOutlined /></p>
//                 <p className="ant-upload-text">Upload signed document</p>
//                 <p className="ant-upload-hint">PDF, JPG, PNG (Max 10MB)</p>
//               </Upload.Dragger>
//             </Space>
//           </Card>

//           {/* Finance Decision Form with budget fields */}
//           <Form
//             form={form}
//             layout="vertical"
//             onFinish={handleFinanceApproval}
//           >
//             <Form.Item
//               name="decision"
//               label={<Text strong>Your Decision</Text>}
//               rules={[{ required: true, message: 'Please make a decision' }]}
//             >
//               <Radio.Group disabled={!signedDocumentFile}>
//                 <Radio.Button value="approved" style={{ color: '#52c41a' }}>
//                   <CheckCircleOutlined /> Approve for Payment
//                 </Radio.Button>
//                 <Radio.Button value="rejected" style={{ color: '#f5222d' }}>
//                   <CloseCircleOutlined /> Reject
//                 </Radio.Button>
//               </Radio.Group>
//             </Form.Item>

//             <Form.Item
//               noStyle
//               shouldUpdate={(prev, curr) => prev.decision !== curr.decision || prev.budgetCode !== curr.budgetCode}
//             >
//               {({ getFieldValue }) =>
//                 getFieldValue('decision') === 'approved' ? (
//                   <>
//                     <Form.Item
//                       name="budgetCode"
//                       label={<Text strong>Budget Code <Text type="danger">*</Text></Text>}
//                       rules={[{ required: true, message: 'Please select a budget code' }]}
//                     >
//                       <Select placeholder="Select budget code for payment allocation">
//                         {budgetCodes.map(code => (
//                           <Option key={code._id} value={code._id} label={code.code}>
//                             <div>
//                               <Text strong>{code.code}</Text>
//                               <br />
//                               <Text type="secondary" style={{ fontSize: 12 }}>
//                                 {code.description || 'No description'}
//                               </Text>
//                             </div>
//                           </Option>
//                         ))}
//                       </Select>
//                     </Form.Item>

//                     {getFieldValue('budgetCode') && (
//                       <>
//                         <Form.Item
//                           name="allocationAmount"
//                           label={<Text strong>Amount to Deduct <Text type="danger">*</Text></Text>}
//                           rules={[
//                             { required: true, message: 'Please enter amount' },
//                             {
//                               validator: (_, value) => {
//                                 if (!value) return Promise.resolve();
//                                 if (isNaN(parseFloat(value)) || parseFloat(value) <= 0) {
//                                   return Promise.reject(new Error('Amount must be greater than 0'));
//                                 }
//                                 return Promise.resolve();
//                               }
//                             }
//                           ]}
//                         >
//                           <Input
//                             type="number"
//                             placeholder="Enter amount"
//                             step="0.01"
//                             min="0"
//                             addonBefore={selectedInvoice?.currency}
//                           />
//                         </Form.Item>

//                         <Form.Item
//                           name="paymentMethod"
//                           label={<Text strong>Payment Method <Text type="danger">*</Text></Text>}
//                           rules={[{ required: true, message: 'Please select payment method' }]}
//                         >
//                           <Select placeholder="Select payment method">
//                             <Option value="Bank Transfer">Bank Transfer</Option>
//                             <Option value="Mobile Money">Mobile Money</Option>
//                             <Option value="Cash">Cash</Option>
//                           </Select>
//                         </Form.Item>
//                       </>
//                     )}
//                   </>
//                 ) : null
//               }
//             </Form.Item>

//             <Form.Item
//               name="comments"
//               label={<Text strong>Comments</Text>}
//               rules={[{
//                 required: form.getFieldValue('decision') === 'rejected',
//                 message: 'Comments required for rejection'
//               }]}
//             >
//               <Input.TextArea
//                 rows={3}
//                 placeholder={
//                   form.getFieldValue('decision') === 'rejected'
//                     ? 'Provide reason for rejection...'
//                     : 'Add any comments...'
//                 }
//                 maxLength={300}
//                 showCount
//               />
//             </Form.Item>

//             <Form.Item
//               noStyle
//               shouldUpdate
//             >
//               {({ getFieldValue }) => (
//                 <Form.Item>
//                   <Space>
//                     <Button onClick={() => {
//                       setApprovalModalVisible(false);
//                       setSelectedInvoice(null);
//                       form.resetFields();
//                       resetSigningWorkflow();
//                     }}>
//                       Cancel
//                     </Button>
//                     <Button
//                       type="primary"
//                       htmlType="submit"
//                       loading={loading}
//                       disabled={
//                         !signedDocumentFile ||
//                         !getFieldValue('decision') ||
//                         (getFieldValue('decision') === 'approved' && (
//                           !getFieldValue('budgetCode') ||
//                           !getFieldValue('allocationAmount') ||
//                           !getFieldValue('paymentMethod')
//                         ))
//                       }
//                       icon={getFieldValue('decision') === 'approved'
//                         ? <CheckCircleOutlined />
//                         : <CloseCircleOutlined />
//                       }
//                     >
//                       Submit {getFieldValue('decision') === 'approved' ? 'Approval' : 'Rejection'}
//                     </Button>
//                   </Space>
//                 </Form.Item>
//               )}
//             </Form.Item>
//           </Form>
//         </>
//       )}
//     </div>
//   )}
// </Modal>

//       {/* Analytics Drawer */}
//       <Drawer
//         title="Invoice Analytics Dashboard"
//         placement="right"
//         width={800}
//         open={analyticsDrawerVisible}
//         onClose={() => setAnalyticsDrawerVisible(false)}
//       >
//         {analytics && (
//           <div style={{ padding: '20px' }}>
//             <Title level={4}><DashboardOutlined /> Combined Invoice Analytics</Title>
            
//             <Row gutter={16} style={{ marginBottom: '20px' }}>
//               <Col span={8}>
//                 <Statistic title="Total Invoices" value={combinedInvoices.length} prefix={<FileTextOutlined />} />
//               </Col>
//               <Col span={8}>
//                 <Statistic 
//                   title="Employee Invoices" 
//                   value={combinedInvoices.filter(inv => inv.invoiceType === 'employee').length} 
//                   valueStyle={{ color: '#1890ff' }}
//                   prefix={<UserOutlined />} 
//                 />
//               </Col>
//               <Col span={8}>
//                 <Statistic 
//                   title="Supplier Invoices" 
//                   value={combinedInvoices.filter(inv => inv.invoiceType === 'supplier').length} 
//                   valueStyle={{ color: '#52c41a' }}
//                   prefix={<ShopOutlined />} 
//                 />
//               </Col>
//             </Row>

//             {analytics.topSuppliers && analytics.topSuppliers.length > 0 && (
//               <Card title="Top Suppliers by Value" style={{ marginBottom: '20px' }}>
//                 <List
//                   dataSource={analytics.topSuppliers}
//                   renderItem={(item) => (
//                     <List.Item>
//                       <List.Item.Meta
//                         avatar={<Avatar icon={<ShopOutlined />} />}
//                         title={item.supplierName}
//                         description={`Invoices: ${item.count} | Total: XAF ${item.totalAmount?.toLocaleString() || 0}`}
//                       />
//                     </List.Item>
//                   )}
//                 />
//               </Card>
//             )}
//           </div>
//         )}
//       </Drawer>
//     </div>
//     {/* Details Modal - ADD before closing </App> tag */}
//     <Modal
//       title={<Space><FileTextOutlined />Invoice Details & Approval History</Space>}
//       open={detailsModalVisible}
//       onCancel={() => {
//         setDetailsModalVisible(false);
//         setSelectedInvoice(null);
//       }}
//       footer={null}
//       width={900}
//     >
//       {selectedInvoice && (
//         <div>
//           <Descriptions bordered column={2} size="small" style={{ marginBottom: 20 }}>
//             <Descriptions.Item label="Type" span={2}>
//               <Tag color={selectedInvoice.invoiceType === 'supplier' ? 'green' : 'blue'}>
//                 {selectedInvoice.invoiceType === 'supplier' ? 'Supplier Invoice' : 'Employee Invoice'}
//               </Tag>
//             </Descriptions.Item>
//             <Descriptions.Item label="PO Number" span={2}>
//               <Text code copyable>{selectedInvoice.poNumber}</Text>
//             </Descriptions.Item>
//             <Descriptions.Item label="Invoice Number">
//               {selectedInvoice.invoiceNumber}
//             </Descriptions.Item>
//             {/* <Descriptions.Item label="Status">
//               <StatusTag status={selectedInvoice.approvalStatus} />
//             </Descriptions.Item> */}
//             <Descriptions.Item label="Status">
//               {getStatusTag(selectedInvoice.approvalStatus)}
//             </Descriptions.Item>
//             {selectedInvoice.invoiceType === 'supplier' ? (
//               <>
//                 <Descriptions.Item label="Supplier" span={2}>
//                   {selectedInvoice.supplierDetails?.companyName}
//                 </Descriptions.Item>
//                 <Descriptions.Item label="Contact">
//                   {selectedInvoice.supplierDetails?.contactName}
//                 </Descriptions.Item>
//                 <Descriptions.Item label="Service Category">
//                   <Tag color="purple">{selectedInvoice.serviceCategory}</Tag>
//                 </Descriptions.Item>
//               </>
//             ) : (
//               <Descriptions.Item label="Employee" span={2}>
//                 {selectedInvoice.employeeDetails?.name}
//               </Descriptions.Item>
//             )}
//             <Descriptions.Item label="Amount">
//               <Text strong>
//                 {selectedInvoice.currency || 'XAF'} {selectedInvoice.invoiceAmount?.toLocaleString()}
//               </Text>
//             </Descriptions.Item>
//             <Descriptions.Item label="Department">
//               {selectedInvoice.assignedDepartment || 'N/A'}
//             </Descriptions.Item>
//           </Descriptions>

//           {/* Attached Files */}
//           <Card size="small" title="Attached Files" style={{ marginBottom: 20 }}>
//             <Space wrap>
//               {selectedInvoice.poFile?.publicId && (
//                 <Button
//                   icon={<FileOutlined />}
//                   onClick={() => downloadFile(selectedInvoice.poFile, 'PO File')}
//                 >
//                   PO File
//                 </Button>
//               )}
//               {selectedInvoice.invoiceFile?.publicId && (
//                 <Button
//                   icon={<FileOutlined />}
//                   onClick={() => downloadFile(selectedInvoice.invoiceFile, 'Invoice File')}
//                 >
//                   Invoice File
//                 </Button>
//               )}
//               {selectedInvoice.supplyChainReview?.signedDocument?.publicId && (
//                 <Button
//                   icon={<FileOutlined />}
//                   onClick={() => downloadFile(
//                     selectedInvoice.supplyChainReview.signedDocument,
//                     'SC Signed Document'
//                   )}
//                 >
//                   SC Signed Doc
//                 </Button>
//               )}
//               {!selectedInvoice.poFile?.publicId &&
//               !selectedInvoice.invoiceFile?.publicId &&
//               !selectedInvoice.supplyChainReview?.signedDocument?.publicId && (
//                 <Text type="secondary">No files attached</Text>
//               )}
//             </Space>
//           </Card>

//           {/* Approval Status Tracker - replaces the old hand-rolled Timeline */}
//           {selectedInvoice.invoiceType === 'supplier' && (
//             <>
//               <Divider />
//               <ApprovalStatusTracker invoice={selectedInvoice} onDownloadFile={downloadFile} />
//             </>
//           )}
//         </div>
//       )}
//     </Modal>
//     </App>
//   );
// };

// export default FinanceInvoiceApprovalPage;


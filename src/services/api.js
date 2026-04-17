import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5001',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

api.interceptors.response.use((response) => {
  return response;
}, (error) => {
  if (error.response?.status === 401) {
    if (!window.location.pathname.includes('/login')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location = '/login';
    }
  }
  return Promise.reject(error);
});

export const projectsAPI = {
  // Get active projects
  getActiveProjects: async () => {
    try {
      console.log('=== CALLING GET ACTIVE PROJECTS ===');
      const response = await api.get('/projects/active');
      return response.data;
    } catch (error) {
      console.error('API: Error fetching active projects:', error);
      throw error;
    }
  },

  // Get all projects
  getAllProjects: async (params = {}) => {
    try {
      const response = await api.get('/projects', { params });
      return response.data;
    } catch (error) {
      console.error('API: Error fetching all projects:', error);
      throw error;
    }
  },

  // Get project by ID
  getProjectById: async (projectId) => {
    try {
      const response = await api.get(`/projects/${projectId}`);
      return response.data;
    } catch (error) {
      console.error('API: Error fetching project details:', error);
      throw error;
    }
  }
};

// Project Plans endpoints
export const projectPlanAPI = {
  // Employee endpoints
  getMyPlans: async () => {
    const response = await api.get('/project-plans/my-plans');
    return response.data;
  },

  getStats: async () => {
    const response = await api.get('/project-plans/stats');
    return response.data;
  },

  createPlan: async (planData) => {
    const response = await api.post('/project-plans', planData);
    return response.data;
  },

  updatePlan: async (planId, planData) => {
    const response = await api.put(`/project-plans/${planId}`, planData);
    return response.data;
  },

  deletePlan: async (planId) => {
    const response = await api.delete(`/project-plans/${planId}`);
    return response.data;
  },

  getPlanById: async (planId) => {
    const response = await api.get(`/project-plans/${planId}`);
    return response.data;
  },

  // NEW: Submit for approval
  submitForApproval: async (planId) => {
    const response = await api.post(`/project-plans/${planId}/submit`);
    return response.data;
  },

  // Approver endpoints
  getPendingApprovals: async () => {
    const response = await api.get('/project-plans/pending-approvals');
    return response.data;
  },

  getAllPlans: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `/project-plans/all?${queryString}` : '/project-plans/all';
    const response = await api.get(url);
    return response.data;
  },

  approvePlan: async (planId, comments) => {
    const response = await api.post(`/project-plans/${planId}/approve`, { comments });
    return response.data;
  },

  rejectPlan: async (planId, comments) => {
    const response = await api.post(`/project-plans/${planId}/reject`, { comments });
    return response.data;
  },

  // Completion items endpoints
  markItemComplete: async (planId, itemId, notes = '') => {
    const response = await api.post(`/project-plans/${planId}/completion-items/${itemId}/complete`, { notes });
    return response.data;
  },

  unmarkItemComplete: async (planId, itemId) => {
    const response = await api.post(`/project-plans/${planId}/completion-items/${itemId}/uncomplete`);
    return response.data;
  }
};


// Salary API
export const salaryPaymentAPI = {
  create: async (formData) => {
    const response = await api.post('/salary-payments', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  getAll: async (params = {}) => {
    const response = await api.get('/salary-payments', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/salary-payments/${id}`);
    return response.data;
  },

  downloadDocument: async (paymentId, documentId) => {
    const response = await api.get(
      `/salary-payments/${paymentId}/documents/${documentId}/download`,
      { responseType: 'blob' }
    );
    return response.data;
  },

  getDashboardStats: async () => {
    const response = await api.get('/salary-payments/dashboard-stats');
    return response.data;
  }
};

// ===== IT SUPPORT API =====
export const itSupportAPI = {
  getDashboardStats: async () => {
    try {
      console.log('Fetching dashboard stats...');
      const response = await api.get('/it-support/dashboard/stats');
      console.log('Dashboard stats response:', response.data);
      return response.data;
    } catch (error) {
      console.error('API: Error fetching dashboard stats:', error);
      if (error.response?.status === 404 || error.response?.status === 304) {
        console.warn('Dashboard stats endpoint not found, returning mock data');
        return {
          success: true,
          data: {
            summary: {
              total: 0,
              pending: 0,
              inProgress: 0,
              resolved: 0,
              materialRequests: 0,
              technicalIssues: 0,
              critical: 0,
              slaBreached: 0
            },
            recent: [],
            trends: {
              resolutionRate: 0,
              avgResponseTime: 0,
              slaCompliance: 100
            }
          }
        };
      }
      throw error;
    }
  },

  getRequestsByRole: async (params = {}) => {
    try {
      console.log('Fetching requests by role...');
      const response = await api.get('/it-support/role/requests', { params });
      console.log('Role-based requests response:', response.data);
      return response.data;
    } catch (error) {
      console.error('API: Error fetching role-based requests:', error);
      throw error;
    }
  },

  getEmployeeRequests: async (params = {}) => {
    try {
      console.log('Fetching employee requests...');
      const response = await api.get('/it-support/employee', { params });
      console.log('Employee requests response:', response.data);
      return response.data;
    } catch (error) {
      console.error('API: Error fetching employee requests:', error);
      throw error;
    }
  },

  getSupervisorRequests: async (params = {}) => {
    try {
      console.log('Fetching supervisor requests...');
      const response = await api.get('/it-support/supervisor', { params });
      console.log('Supervisor requests response:', response.data);
      return response.data;
    } catch (error) {
      console.error('API: Error fetching supervisor requests:', error);
      throw error;
    }
  },

  getITDepartmentRequests: async (params = {}) => {
    try {
      console.log('Fetching IT department requests...');
      const response = await api.get('/it-support/it-department', { params });
      console.log('IT department requests response:', response.data);
      return response.data;
    } catch (error) {
      console.error('API: Error fetching IT department requests:', error);
      throw error;
    }
  },

  getAllRequests: async (params = {}) => {
    try {
      console.log('Fetching all admin requests...');
      const response = await api.get('/it-support/admin', { params });
      console.log('All admin requests response:', response.data);
      return response.data;
    } catch (error) {
      console.error('API: Error fetching all admin requests:', error);
      throw error;
    }
  },

  // Create material request with file upload
  createMaterialRequest: async (requestData) => {
    try {
      const formData = new FormData();

      // Generate ticket number
      const ticketNumber = `ITM-${Date.now()}`;

      // Basic fields
      formData.append('ticketNumber', ticketNumber);
      formData.append('requestType', 'material_request');
      formData.append('title', requestData.title || 'Material Request');
      formData.append('description', requestData.description);
      formData.append('category', requestData.category || 'hardware');
      formData.append('subcategory', requestData.subcategory || 'accessories');
      formData.append('priority', requestData.priority || 'medium');
      formData.append('urgency', requestData.urgency || 'normal');
      formData.append('businessJustification', requestData.businessJustification || '');
      formData.append('businessImpact', requestData.businessImpact || '');
      formData.append('location', requestData.location || 'Office');

      // Contact info
      if (requestData.contactInfo) {
        formData.append('contactInfo', JSON.stringify(requestData.contactInfo));
      }

      // Requested items
      if (requestData.requestedItems && requestData.requestedItems.length > 0) {
        formData.append('requestedItems', JSON.stringify(requestData.requestedItems));
      }

      // Additional fields
      if (requestData.preferredContactMethod) {
        formData.append('preferredContactMethod', requestData.preferredContactMethod);
      }

      // Handle file attachments
      if (requestData.attachments && requestData.attachments.length > 0) {
        requestData.attachments.forEach((file) => {
          if (file.originFileObj) {
            formData.append('attachments', file.originFileObj);
          } else if (file instanceof File) {
            formData.append('attachments', file);
          }
        });
      }

      console.log('Submitting material request...');

      const response = await api.post('/it-support', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 60000,
      });

      return response.data;
    } catch (error) {
      console.error('API: Error creating material request:', error);
      throw error;
    }
  },

  // Create technical issue with file upload
  createTechnicalIssue: async (requestData) => {
    try {
      const formData = new FormData();

      // Generate ticket number
      const ticketNumber = `ITI-${Date.now()}`;

      // Basic fields
      formData.append('ticketNumber', ticketNumber);
      formData.append('requestType', 'technical_issue');
      formData.append('title', requestData.title);
      formData.append('description', requestData.description);
      formData.append('category', requestData.category);
      formData.append('subcategory', requestData.subcategory);
      formData.append('priority', requestData.severity || 'medium');
      formData.append('urgency', requestData.urgency || 'normal');
      formData.append('businessJustification', requestData.businessImpact || '');
      formData.append('businessImpact', requestData.businessImpact || '');
      formData.append('location', requestData.location);

      // Contact info
      if (requestData.contactInfo) {
        formData.append('contactInfo', JSON.stringify(requestData.contactInfo));
      }

      // Device details
      if (requestData.deviceDetails) {
        formData.append('deviceDetails', JSON.stringify(requestData.deviceDetails));
      }

      // Issue details
      if (requestData.issueDetails) {
        formData.append('issueDetails', JSON.stringify(requestData.issueDetails));
      }

      // Troubleshooting information
      if (requestData.troubleshootingAttempted !== undefined) {
        formData.append('troubleshootingAttempted', requestData.troubleshootingAttempted);
      }

      if (requestData.troubleshootingSteps && requestData.troubleshootingSteps.length > 0) {
        formData.append('troubleshootingSteps', JSON.stringify(requestData.troubleshootingSteps));
      }

      // Additional fields
      if (requestData.preferredContactMethod) {
        formData.append('preferredContactMethod', requestData.preferredContactMethod);
      }

      // Handle file attachments
      if (requestData.attachments && requestData.attachments.length > 0) {
        requestData.attachments.forEach((file) => {
          if (file.originFileObj) {
            formData.append('attachments', file.originFileObj);
          } else if (file instanceof File) {
            formData.append('attachments', file);
          }
        });
      }

      console.log('Submitting technical issue with', requestData.attachments?.length || 0, 'attachments...');

      const response = await api.post('/it-support', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 60000,
      });

      return response.data;
    } catch (error) {
      console.error('API: Error creating technical issue:', error);
      throw error;
    }
  },

  getRequestById: async (requestId) => {
    try {
      const response = await api.get(`/it-support/${requestId}`);
      return response.data;
    } catch (error) {
      console.error('API: Error fetching IT request details:', error);
      throw error;
    }
  },

  processSupervisorDecision: async (requestId, decision) => {
    try {
      const response = await api.put(`/it-support/${requestId}/supervisor`, decision);
      return response.data;
    } catch (error) {
      console.error('API: Error processing supervisor decision:', error);
      throw error;
    }
  },

  processITDepartmentDecision: async (requestId, decision) => {
    try {
      const response = await api.put(`/it-support/${requestId}/it-department`, decision);
      return response.data;
    } catch (error) {
      console.error('API: Error processing IT department decision:', error);
      throw error;
    }
  },

  updateFulfillmentStatus: async (requestId, statusData) => {
    try {
      const response = await api.put(`/it-support/${requestId}/fulfillment`, statusData);
      return response.data;
    } catch (error) {
      console.error('API: Error updating fulfillment status:', error);
      throw error;
    }
  },

  updateRequest: async (requestId, updateData) => {
    try {
      const response = await api.put(`/it-support/${requestId}`, updateData);
      return response.data;
    } catch (error) {
      console.error('API: Error updating IT request:', error);
      throw error;
    }
  },

  deleteRequest: async (requestId) => {
    try {
      const response = await api.delete(`/it-support/${requestId}`);
      return response.data;
    } catch (error) {
      console.error('API: Error deleting IT request:', error);
      throw error;
    }
  },

  saveDraft: async (draftData) => {
    try {
      const response = await api.post('/it-support/draft', draftData);
      return response.data;
    } catch (error) {
      console.error('API: Error saving draft:', error);
      throw error;
    }
  },

  getApprovalChainPreview: async (department, employeeName) => {
    try {
      const response = await api.post('/it-support/preview-approval-chain', {
        department,
        employeeName
      });
      return response.data;
    } catch (error) {
      console.error('API: Error getting approval chain preview:', error);
      throw error;
    }
  },

  downloadAttachment: (requestId, fileName) => {
    // Return download URL
    return `${process.env.REACT_APP_API_URL}/it-support/download/${requestId}/${fileName}`;
  }
};

// ===== CASH REQUEST API =====
export const cashRequestAPI = {
  // Employee functions
  create: async (formData) => {
    console.log('API: Creating cash request...');
    console.log('FormData entries:');
    
    for (let pair of formData.entries()) {
      if (pair[1] instanceof File) {
        console.log(`${pair[0]}: File - ${pair[1].name} (${pair[1].size} bytes)`);
      } else {
        console.log(`${pair[0]}:`, pair[1]);
      }
    }

    const config = {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 60000, 
    };
    
    try {
      const response = await api.post('/cash-requests', formData, config);
      console.log('API: Cash request created successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('API: Error creating cash request:', error);
      
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
        console.error('Response headers:', error.response.headers);
      }
      
      throw error;
    }
  },

  getEmployeeRequests: async (params = {}) => {
    try {
      const response = await api.get('/cash-requests/employee', { params });
      return response.data;
    } catch (error) {
      console.error('API: Error fetching employee cash requests:', error);
      throw error;
    }
  },

  getRequestById: async (requestId) => {
    try {
      const response = await api.get(`/cash-requests/${requestId}`);
      return response.data;
    } catch (error) {
      console.error('API: Error fetching cash request details:', error);
      throw error;
    }
  },

  updateRequest: async (requestId, updateData) => {
    try {
      const response = await api.put(`/cash-requests/${requestId}`, updateData);
      return response.data;
    } catch (error) {
      console.error('API: Error updating cash request:', error);
      throw error;
    }
  },

  deleteRequest: async (requestId) => {
    try {
      const response = await api.delete(`/cash-requests/${requestId}`);
      return response.data;
    } catch (error) {
      console.error('API: Error deleting cash request:', error);
      throw error;
    }
  },

  getSupervisorRequests: async (params = {}) => {
    try {
      const response = await api.get('/cash-requests/supervisor', { params });
      return response.data;
    } catch (error) {
      console.error('API: Error fetching supervisor cash requests:', error);
      throw error;
    }
  },

  processSupervisorDecision: async (requestId, decision) => {
    try {
      const response = await api.put(`/cash-requests/${requestId}/supervisor`, decision);
      return response.data;
    } catch (error) {
      console.error('API: Error processing supervisor decision:', error);
      throw error;
    }
  },

  getSupervisorJustifications: async (params = {}) => {
    try {
      const response = await api.get('/cash-requests/supervisor/justifications', { params });
      return response.data;
    } catch (error) {
      console.error('API: Error fetching supervisor justifications:', error);
      throw error;
    }
  },

  processSupervisorJustificationDecision: async (requestId, decision) => {
    try {
      const response = await api.put(`/cash-requests/${requestId}/supervisor/justification`, decision);
      return response.data;
    } catch (error) {
      console.error('API: Error processing supervisor justification decision:', error);
      throw error;
    }
  },

  getFinanceRequests: async (params = {}) => {
    try {
      const response = await api.get('/cash-requests/finance', { params });
      return response.data;
    } catch (error) {
      console.error('API: Error fetching finance cash requests:', error);
      throw error;
    }
  },

  processFinanceDecision: async (requestId, decision) => {
    try {
      const response = await api.put(`/cash-requests/${requestId}/finance`, decision);
      return response.data;
    } catch (error) {
      console.error('API: Error processing finance decision:', error);
      throw error;
    }
  },

  getFinanceJustifications: async (params = {}) => {
    try {
      const response = await api.get('/cash-requests/finance/justifications', { params });
      return response.data;
    } catch (error) {
      console.error('API: Error fetching finance justifications:', error);
      throw error;
    }
  },

  processFinanceJustificationDecision: async (requestId, decision) => {
    try {
      const response = await api.put(`/cash-requests/${requestId}/finance/justification`, decision);
      return response.data;
    } catch (error) {
      console.error('API: Error processing finance justification decision:', error);
      throw error;
    }
  },

  getAllRequests: async (params = {}) => {
    try {
      const response = await api.get('/cash-requests/admin', { params });
      return response.data;
    } catch (error) {
      console.error('API: Error fetching all cash requests:', error);
      throw error;
    }
  },

  getAdminRequestDetails: async (requestId) => {
    try {
      const response = await api.get(`/cash-requests/admin/${requestId}`);
      return response.data;
    } catch (error) {
      console.error('API: Error fetching admin request details:', error);
      throw error;
    }
  },

  submitJustification: async (requestId, formData) => {
    console.log('API: Submitting justification...');
    console.log('FormData entries:');
    
    for (let pair of formData.entries()) {
      if (pair[1] instanceof File) {
        console.log(`${pair[0]}: File - ${pair[1].name} (${pair[1].size} bytes)`);
      } else {
        console.log(`${pair[0]}:`, pair[1]);
      }
    }

    const config = {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 60000,
    };
    
    try {
      const response = await api.post(`/cash-requests/${requestId}/justification`, formData, config);
      console.log('API: Justification submitted successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('API: Error submitting justification:', error);
      
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
        console.error('Response headers:', error.response.headers);
      }
      
      throw error;
    }
  },

  getRequestForJustification: async (requestId) => {
    try {
      const response = await api.get(`/cash-requests/employee/${requestId}/justify`);
      return response.data;
    } catch (error) {
      console.error('API: Error fetching request for justification:', error);
      throw error;
    }
  },

  getStats: async (params = {}) => {
    try {
      const response = await api.get('/cash-requests/analytics/statistics', { params });
      return response.data;
    } catch (error) {
      console.error('API: Error fetching cash request stats:', error);
      throw error;
    }
  },

  getDashboardStats: async () => {
    try {
      const response = await api.get('/cash-requests/dashboard/stats');
      return response.data;
    } catch (error) {
      console.error('API: Error fetching dashboard stats:', error);
      throw error;
    }
  },

  getApprovalChainPreview: async (employeeName, department) => {
    try {
      const response = await api.post('/cash-requests/preview-approval-chain', {
        employeeName,
        department
      });
      return response.data;
    } catch (error) {
      console.error('API: Error getting approval chain preview:', error);
      throw error;
    }
  },

  downloadAttachment: async (requestId, fileName) => {
    try {
      const response = await api.get(`/cash-requests/${requestId}/attachment/${fileName}`, {
        responseType: 'blob',
      });
      return response.data;
    } catch (error) {
      console.error('API: Error downloading attachment:', error);
      throw error;
    }
  }, 

};

export const legalAPI = {
 
  // Dashboard
  getDashboard: async () =>
    (await api.get('/legal/dashboard')).data,
 
  // Compliance documents
  getDocuments: async (params = {}) =>
    (await api.get('/legal/documents', { params })).data,
  createDocument: async (payload) =>
    (await api.post('/legal/documents', payload)).data,
  updateDocument: async (id, payload) =>
    (await api.put(`/legal/documents/${id}`, payload)).data,
  reviewDocument: async (id, payload) =>
    (await api.post(`/legal/documents/${id}/review`, payload)).data,
  approveDocument: async (id, payload) =>
    (await api.post(`/legal/documents/${id}/approve`, payload)).data,
 
  // Risk cases
  getRiskCases: async (params = {}) =>
    (await api.get('/legal/risk-cases', { params })).data,
  createRiskCase: async (payload) =>
    (await api.post('/legal/risk-cases', payload)).data,
  updateRiskCase: async (id, payload) =>
    (await api.put(`/legal/risk-cases/${id}`, payload)).data,
  resolveRiskCase: async (id, payload) =>
    (await api.post(`/legal/risk-cases/${id}/resolve`, payload)).data,
 
  // Contracts
  getContracts: async (params = {}) =>
    (await api.get('/legal/contracts', { params })).data,
  getContract: async (id) =>
    (await api.get(`/legal/contracts/${id}`)).data,
  createContract: async (payload) =>
    (await api.post('/legal/contracts', payload)).data,
  updateContract: async (id, payload) =>
    (await api.put(`/legal/contracts/${id}`, payload)).data,
  addServiceLevel: async (id, payload) =>
    (await api.post(`/legal/contracts/${id}/service-levels`, payload)).data,
  addContractTask: async (id, payload) =>
    (await api.post(`/legal/contracts/${id}/tasks`, payload)).data,
  updateContractTask: async (contractId, taskId, payload) =>
    (await api.patch(`/legal/contracts/${contractId}/tasks/${taskId}`, payload)).data,
 
  // Regulatory standards
  getRegulatoryStandards: async (params = {}) =>
    (await api.get('/legal/regulatory', { params })).data,
  createRegulatoryStandard: async (payload) =>
    (await api.post('/legal/regulatory', payload)).data,
  updateRegulatoryStandard: async (id, payload) =>
    (await api.put(`/legal/regulatory/${id}`, payload)).data,
  addDisclosure: async (id, payload) =>
    (await api.post(`/legal/regulatory/${id}/disclosures`, payload)).data,
 
  // Intellectual property
  getIPRecords: async (params = {}) =>
    (await api.get('/legal/ip', { params })).data,
  createIPRecord: async (payload) =>
    (await api.post('/legal/ip', payload)).data,
  updateIPRecord: async (id, payload) =>
    (await api.put(`/legal/ip/${id}`, payload)).data,
  addLitigation: async (id, payload) =>
    (await api.post(`/legal/ip/${id}/litigations`, payload)).data,
  addTrustEntity: async (id, payload) =>
    (await api.post(`/legal/ip/${id}/trust-entities`, payload)).data,
 
  // SDD
  getSDDTemplate: async () =>
    (await api.get('/legal/sdd/template')).data,
  getSDDRecords: async (params = {}) =>
    (await api.get('/legal/sdd', { params })).data,
  getSDDRecord: async (id) =>
    (await api.get(`/legal/sdd/${id}`)).data,
  createSDDRecord: async (payload) =>
    (await api.post('/legal/sdd', payload)).data,
  saveSDDAnswers: async (id, answers, unmetCriticalPoints) =>
    (await api.patch(`/legal/sdd/${id}/answers`, { answers, unmetCriticalPoints })).data,
  submitSDD: async (id, payload) =>
    (await api.post(`/legal/sdd/${id}/submit`, payload)).data,
  reviewSDD: async (id, payload) =>
    (await api.post(`/legal/sdd/${id}/review`, payload)).data,
  getSupplierProfile: async (supplierId) =>
    (await api.get(`/legal/sdd/supplier/${supplierId}/profile`)).data,

  // Document versioning
  getDocumentVersions:     async (docId)       => (await api.get(`/legal/documents/${docId}/versions`)).data,
  createDocumentVersion:   async (docId, d)    => (await api.post(`/legal/documents/${docId}/versions`, d)).data,
 
  // Risk matrix
  getRiskMatrix:           async (p={})        => (await api.get('/legal/risk-matrix', {params:p})).data,
  createRiskEntry:         async (d)           => (await api.post('/legal/risk-matrix', d)).data,
  updateRiskEntry:         async (id,d)        => (await api.put(`/legal/risk-matrix/${id}`, d)).data,
 
  // Audits
  getAudits:               async (p={})        => (await api.get('/legal/audits', {params:p})).data,
  getAudit:                async (id)          => (await api.get(`/legal/audits/${id}`)).data,
  createAudit:             async (d)           => (await api.post('/legal/audits', d)).data,
  updateAudit:             async (id,d)        => (await api.put(`/legal/audits/${id}`, d)).data,
  addFinding:              async (id,d)        => (await api.post(`/legal/audits/${id}/findings`, d)).data,
  updateCAPA:              async (id,fid,d)    => (await api.patch(`/legal/audits/${id}/findings/${fid}/capa`, d)).data,
 
  // Incidents
  getIncidents:            async (p={})        => (await api.get('/legal/incidents', {params:p})).data,
  createIncident:          async (d)           => (await api.post('/legal/incidents', d)).data,
  updateIncident:          async (id,d)        => (await api.put(`/legal/incidents/${id}`, d)).data,
  addCorrectiveAction:     async (id,d)        => (await api.post(`/legal/incidents/${id}/corrective-actions`, d)).data,
  closeIncident:           async (id,d)        => (await api.post(`/legal/incidents/${id}/close`, d)).data,
 
  // Policies
  getPolicies:             async (p={})        => (await api.get('/legal/policies', {params:p})).data,
  createPolicy:            async (d)           => (await api.post('/legal/policies', d)).data,
  updatePolicy:            async (id,d)        => (await api.put(`/legal/policies/${id}`, d)).data,
  publishPolicyVersion:    async (id,d)        => (await api.post(`/legal/policies/${id}/versions`, d)).data,
  acknowledgePolicy:       async (id,d)        => (await api.post(`/legal/policies/${id}/acknowledge`, d)).data,
 
  // Whistleblowing
  submitWhistleblowReport: async (d)           => (await api.post('/legal/whistleblowing/report', d)).data,
  checkWBStatus:           async (token)       => (await api.get(`/legal/whistleblowing/status/${token}`)).data,
  getWBCases:              async (p={})        => (await api.get('/legal/whistleblowing', {params:p})).data,
  getWBCase:               async (id)          => (await api.get(`/legal/whistleblowing/${id}`)).data,
  updateWBCase:            async (id,d)        => (await api.put(`/legal/whistleblowing/${id}`, d)).data,
  addWBLog:                async (id,d)        => (await api.post(`/legal/whistleblowing/${id}/log`, d)).data,
  sendReporterUpdate:      async (id,d)        => (await api.post(`/legal/whistleblowing/${id}/reporter-update`, d)).data,
 
  // Data privacy
  getPrivacyRecord:        async ()            => (await api.get('/legal/privacy')).data,
  addProcessingActivity:   async (d)           => (await api.post('/legal/privacy/processing', d)).data,
  addDPIA:                 async (d)           => (await api.post('/legal/privacy/dpias', d)).data,
  addDataBreach:           async (d)           => (await api.post('/legal/privacy/breaches', d)).data,
  addSAR:                  async (d)           => (await api.post('/legal/privacy/sars', d)).data,
 
  // Training
  getTrainingRecords:      async (p={})        => (await api.get('/legal/training', {params:p})).data,
  createTrainingRecord:    async (d)           => (await api.post('/legal/training', d)).data,
  updateTrainingRecord:    async (id,d)        => (await api.put(`/legal/training/${id}`, d)).data,
  addTrainingSession:      async (id,d)        => (await api.post(`/legal/training/${id}/sessions`, d)).data,
  addCertification:        async (id,d)        => (await api.post(`/legal/training/${id}/certifications`, d)).data,
  updateCompetency:        async (id,d)        => (await api.post(`/legal/training/${id}/competencies`, d)).data,
  getGapAnalysis:          async (p={})        => (await api.get('/legal/training/gap-analysis', {params:p})).data,
 
  // Supplier monitoring
  getSupplierMonitoring:   async (p={})        => (await api.get('/legal/supplier-monitoring', {params:p})).data,
  createSupplierMonitor:   async (d)           => (await api.post('/legal/supplier-monitoring', d)).data,
  updateSupplierMonitor:   async (id,d)        => (await api.put(`/legal/supplier-monitoring/${id}`, d)).data,
  runSanctionsCheck:       async (id,d)        => (await api.post(`/legal/supplier-monitoring/${id}/sanctions-check`, d)).data,
  addReassessmentTrigger:  async (id,d)        => (await api.post(`/legal/supplier-monitoring/${id}/reassessment`, d)).data,
 
  // Compliance summary report
  getComplianceSummary:    async ()            => (await api.get('/legal/reports/compliance-summary')).data,
};
 

export const accountingAPI = {
  bootstrapDefaultChart: async () => {
    const response = await api.post('/accounting/bootstrap/default-chart');
    return response.data;
  },

  bootstrapDefaultRules: async () => {
    const response = await api.post('/accounting/bootstrap/default-rules');
    return response.data;
  },

  getAccounts: async (params = {}) => {
    const response = await api.get('/accounting/accounts', { params });
    return response.data;
  },

  createAccount: async (payload) => {
    const response = await api.post('/accounting/accounts', payload);
    return response.data;
  },

  getRules: async (params = {}) => {
    const response = await api.get('/accounting/rules', { params });
    return response.data;
  },

  createRule: async (payload) => {
    const response = await api.post('/accounting/rules', payload);
    return response.data;
  },

  updateRule: async (ruleId, payload) => {
    const response = await api.put(`/accounting/rules/${ruleId}`, payload);
    return response.data;
  },

  getJournalEntries: async (params = {}) => {
    const response = await api.get('/accounting/journal-entries', { params });
    return response.data;
  },

  createJournalEntry: async (payload) => {
    const response = await api.post('/accounting/journal-entries', payload);
    return response.data;
  },

  reverseJournalEntry: async (entryId, payload) => {
    const response = await api.post(`/accounting/journal-entries/${entryId}/reverse`, payload);
    return response.data;
  },

  getPeriods: async (params = {}) => {
    const response = await api.get('/accounting/periods', { params });
    return response.data;
  },

  openPeriod: async (payload) => {
    const response = await api.post('/accounting/periods/open', payload);
    return response.data;
  },

  closePeriod: async (payload) => {
    const response = await api.post('/accounting/periods/close', payload);
    return response.data;
  },

  getTrialBalance: async (params = {}) => {
    const response = await api.get('/accounting/reports/trial-balance', { params });
    return response.data;
  },

  getGeneralLedger: async (accountId, params = {}) => {
    const response = await api.get(`/accounting/reports/general-ledger/${accountId}`, { params });
    return response.data;
  },

  postPartialInvoiceTerm: async (invoiceId, termIndex) => {
    const response = await api.post(`/accounting/postings/invoices/${invoiceId}/payment-terms/${termIndex}`);
    return response.data;
  },
 
  postCompletionItem: async (planId, itemId) => {
    const response = await api.post(`/accounting/postings/project-plans/${planId}/completion-items/${itemId}`);
    return response.data;
  },
 
  getProfitAndLoss: async (params = {}) => {
    const response = await api.get('/accounting/reports/profit-and-loss', { params });
    return response.data;
  },
 
  getBalanceSheet: async (params = {}) => {
    const response = await api.get('/accounting/reports/balance-sheet', { params });
    return response.data;
  },

  // P1 — Payments
  getPayments: async (params = {}) => {
    const response = await api.get('/accounting/payments', { params });
    return response.data;
  },
  createPayment: async (payload) => {
    const response = await api.post('/accounting/payments', payload);
    return response.data;
  },
  postPaymentReceipt: async (paymentId) => {
    const response = await api.post(`/accounting/postings/payments/${paymentId}/receipt`);
    return response.data;
  },
  postSupplierPayment: async (paymentId) => {
    const response = await api.post(`/accounting/postings/payments/${paymentId}/supplier`);
    return response.data;
  },
 
  // P2 — Aged reports
  getAgedReceivables: async (params = {}) => {
    const response = await api.get('/accounting/reports/aged-receivables', { params });
    return response.data;
  },
  getAgedPayables: async (params = {}) => {
    const response = await api.get('/accounting/reports/aged-payables', { params });
    return response.data;
  },
 
  // P3 — Maker-checker
  submitJournalForReview: async (entryId) => {
    const response = await api.post(`/accounting/journal-entries/${entryId}/submit`);
    return response.data;
  },
  approveJournal: async (entryId) => {
    const response = await api.post(`/accounting/journal-entries/${entryId}/approve`);
    return response.data;
  },
  rejectJournal: async (entryId, reason) => {
    const response = await api.post(`/accounting/journal-entries/${entryId}/reject`, { reason });
    return response.data;
  },
 
  // P4 — VAT return
  getVATReturn: async (params = {}) => {
    const response = await api.get('/accounting/reports/vat-return', { params });
    return response.data;
  },
 
  // P5 — Dashboard KPIs
  getDashboardKPIs: async () => {
    const response = await api.get('/accounting/dashboard/kpis');
    return response.data;
  },
 
  // P6 — Cash flow
  getCashFlowStatement: async (params = {}) => {
    const response = await api.get('/accounting/reports/cash-flow', { params });
    return response.data;
  },
 
  // P7 — Bank reconciliation
  getBankTransactions: async (params = {}) => {
    const response = await api.get('/accounting/bank/transactions', { params });
    return response.data;
  },
  importBankTransactions: async (payload) => {
    const response = await api.post('/accounting/bank/import', payload);
    return response.data;
  },
  reconcileTransaction: async (payload) => {
    const response = await api.post('/accounting/bank/reconcile', payload);
    return response.data;
  },
  getReconciliationSummary: async (params = {}) => {
    const response = await api.get('/accounting/bank/summary', { params });
    return response.data;
  },
 
  // P8 — Audit log + exports
  getAuditLog: async (params = {}) => {
    const response = await api.get('/accounting/audit-log', { params });
    return response.data;
  },
  exportCSV: (endpoint, params = {}) => {
    const query = new URLSearchParams(params).toString();
    window.open(`${api.defaults.baseURL}/accounting/exports/${endpoint}${query ? '?' + query : ''}`, '_blank');
  },

    // Tax groups
  getTaxGroups:          async (p={}) => (await api.get('/accounting/tax-groups', {params:p})).data,
  createTaxGroup:        async (d)    => (await api.post('/accounting/tax-groups', d)).data,
  updateTaxGroup:        async (id,d) => (await api.put(`/accounting/tax-groups/${id}`, d)).data,
 
  // Currencies
  getCurrencies:         async ()     => (await api.get('/accounting/currencies')).data,
  upsertCurrency:        async (d)    => (await api.post('/accounting/currencies', d)).data,
  postFXGainLoss:        async (d)    => (await api.post('/accounting/currencies/fx-gain-loss', d)).data,
 
  // Credit notes
  getCreditNotes:        async (p={}) => (await api.get('/accounting/credit-notes', {params:p})).data,
  createCreditNote:      async (d)    => (await api.post('/accounting/credit-notes', d)).data,
  postCustomerCreditNote:async (id)   => (await api.post(`/accounting/credit-notes/${id}/post-customer`)).data,
  postSupplierCreditNote:async (id)   => (await api.post(`/accounting/credit-notes/${id}/post-supplier`)).data,
 
  // Dunning
  getDunningActions:     async (p={}) => (await api.get('/accounting/dunning', {params:p})).data,
  runDunningCheck:       async ()     => (await api.post('/accounting/dunning/run')).data,
  sendDunningAction:     async (id)   => (await api.post(`/accounting/dunning/${id}/send`)).data,
 
  // Payment batches
  getPaymentBatches:     async (p={}) => (await api.get('/accounting/payment-batches', {params:p})).data,
  createPaymentBatch:    async (d)    => (await api.post('/accounting/payment-batches', d)).data,
  validatePaymentBatch:  async (id)   => (await api.post(`/accounting/payment-batches/${id}/validate`)).data,
 
  // Fixed assets
  getFixedAssets:        async (p={}) => (await api.get('/accounting/fixed-assets', {params:p})).data,
  getFixedAssetRegister: async ()     => (await api.get('/accounting/fixed-assets/register')).data,
  createFixedAsset:      async (d)    => (await api.post('/accounting/fixed-assets', d)).data,
  depreciateAsset:       async (id)   => (await api.post(`/accounting/fixed-assets/${id}/depreciate`)).data,
  depreciateAll:         async ()     => (await api.post('/accounting/fixed-assets/depreciate-all')).data,
 
  // Analytic accounting
  getAnalyticAccounts:   async (p={}) => (await api.get('/accounting/analytic/accounts', {params:p})).data,
  createAnalyticAccount: async (d)    => (await api.post('/accounting/analytic/accounts', d)).data,
  getAnalyticReport:     async (id,p) => (await api.get(`/accounting/analytic/accounts/${id}/report`, {params:p})).data,
 
  // Budgets
  getBudgets:            async (p={}) => (await api.get('/accounting/budgets', {params:p})).data,
  createBudget:          async (d)    => (await api.post('/accounting/budgets', d)).data,
  getBudgetVsActual:     async (id)   => (await api.get(`/accounting/budgets/${id}/vs-actual`)).data,
 
  // Fiscal years
  getFiscalYears:        async ()     => (await api.get('/accounting/fiscal-years')).data,
  createFiscalYear:      async (d)    => (await api.post('/accounting/fiscal-years', d)).data,
  lockFiscalYear:        async (yr)   => (await api.post(`/accounting/fiscal-years/${yr}/lock`)).data,
  closeFiscalYear:       async (yr)   => (await api.post(`/accounting/fiscal-years/${yr}/close`)).data,
 
  // Comparative reports
  getComparativePL:      async (periods) => (await api.post('/accounting/reports/comparative-pl', {periods})).data,
  getComparativeBS:      async (dates)   => (await api.post('/accounting/reports/comparative-balance-sheet', {dates})).data,
 
  // Management report
  getManagementReport:   async (p={}) => (await api.get('/accounting/reports/management', {params:p})).data,
 
  // Cash rounding
  applyCashRounding:     async (d)    => (await api.post('/accounting/cash-rounding/apply', d)).data,
 
};

export default api;




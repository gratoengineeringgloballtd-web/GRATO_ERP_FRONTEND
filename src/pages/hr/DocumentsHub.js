// src/pages/hr/DocumentsHub.js
//
// Entry point for /hr/documents. The standalone DocumentManager component has no way
// to pick which employee's documents it's showing - it just takes employeeId/employee
// as props. This page adds the missing employee-selection step: search/browse employees,
// pick one, manage their documents, then come back and pick another.
import React, { useState, useEffect, useCallback } from 'react';
import { Card, Input, List, Avatar, Tag, Typography, Button, Empty, Spin, message } from 'antd';
import { UserOutlined, SearchOutlined, ArrowLeftOutlined, FolderOutlined } from '@ant-design/icons';
import api from '../../services/api';
import DocumentManager from './DocumentManager';

const { Title, Text } = Typography;

const DocumentsHub = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  const fetchEmployees = useCallback(async (searchTerm) => {
    try {
      setLoading(true);
      const response = await api.get('/hr/employees', {
        params: { search: searchTerm || undefined, limit: 100 }
      });
      setEmployees(response.data.data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
      message.error('Failed to load employees');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const handleSearch = (value) => {
    setSearch(value);
    fetchEmployees(value);
  };

  const documentCount = (employee) => {
    const docs = employee.employmentDetails?.documents || {};
    return Object.values(docs).filter(d => d && (Array.isArray(d) ? d.length > 0 : true)).length;
  };

  // ── Employee selected — show their documents ────────────────────────────
  if (selectedEmployee) {
    return (
      <div style={{ padding: 24 }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => setSelectedEmployee(null)}
          style={{ marginBottom: 16 }}
        >
          Back to employee list
        </Button>
        <Card style={{ marginBottom: 16 }}>
          <Title level={4} style={{ margin: 0 }}>
            <UserOutlined style={{ marginRight: 8 }} />
            {selectedEmployee.fullName}
          </Title>
          <Text type="secondary">
            {selectedEmployee.position} • {selectedEmployee.department}
          </Text>
        </Card>
        <DocumentManager
          employeeId={selectedEmployee._id}
          employee={selectedEmployee}
          onUpdate={() => fetchEmployees(search)}
        />
      </div>
    );
  }

  // ── No employee selected yet — show the picker ───────────────────────────
  return (
    <div style={{ padding: 24 }}>
      <Title level={2} style={{ marginBottom: 8 }}>
        <FolderOutlined style={{ marginRight: 8, color: '#1890ff' }} />
        Employee Documents
      </Title>
      <Text type="secondary">Select an employee to view or upload their documents.</Text>

      <Card style={{ marginTop: 16 }}>
        <Input.Search
          placeholder="Search by name, email, or employee ID..."
          allowClear
          onSearch={handleSearch}
          onChange={(e) => { if (!e.target.value) handleSearch(''); }}
          prefix={<SearchOutlined />}
          style={{ marginBottom: 16 }}
        />

        <Spin spinning={loading}>
          {employees.length === 0 && !loading ? (
            <Empty description="No employees found" />
          ) : (
            <List
              itemLayout="horizontal"
              dataSource={employees}
              renderItem={(emp) => (
                <List.Item
                  style={{ cursor: 'pointer' }}
                  onClick={() => setSelectedEmployee(emp)}
                  actions={[
                    <Button type="link" icon={<FolderOutlined />}>Manage Documents</Button>
                  ]}
                >
                  <List.Item.Meta
                    avatar={<Avatar icon={<UserOutlined />} />}
                    title={emp.fullName}
                    description={
                      <>
                        <Text type="secondary">{emp.email}</Text>
                        {emp.department && <Tag style={{ marginLeft: 8 }}>{emp.department}</Tag>}
                        {emp.position && <Text type="secondary" style={{ marginLeft: 8 }}>{emp.position}</Text>}
                      </>
                    }
                  />
                  <Tag color={documentCount(emp) > 0 ? 'blue' : 'default'}>
                    {documentCount(emp)} document type(s) on file
                  </Tag>
                </List.Item>
              )}
            />
          )}
        </Spin>
      </Card>
    </div>
  );
};

export default DocumentsHub;

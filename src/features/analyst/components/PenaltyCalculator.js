import React from 'react';
import { Table, Tag, Typography } from 'antd';
import { calculatePenalties } from '../analystUtils';

const { Text } = Typography;

const PenaltyCalculator = ({ data }) => {
  const penalties = [
    {
      key: '1',
      siteId: 'SITE001',
      siteName: 'Bonaberi 1',
      startTime: '2023-07-10 08:30',
      endTime: '2023-07-10 14:45',
      duration: '6:15',
      priority: 'P2',
      penalty: 250000,
      status: 'Pending'
    },
    // More penalty data...
  ];

  const columns = [
    {
      title: 'Site',
      dataIndex: 'siteName',
      key: 'siteName',
      render: (text, record) => (
        <div>
          <div>{text}</div>
          <Text type="secondary">{record.siteId}</Text>
        </div>
      ),
    },
    {
      title: 'Duration',
      dataIndex: 'duration',
      key: 'duration',
    },
    {
      title: 'Priority',
      dataIndex: 'priority',
      key: 'priority',
      render: (priority) => (
        <Tag color={priority === 'P1' ? 'red' : priority === 'P2' ? 'orange' : 'blue'}>
          {priority}
        </Tag>
      ),
    },
    {
      title: 'Penalty (XAF)',
      dataIndex: 'penalty',
      key: 'penalty',
      render: (penalty) => (
        <Text strong>{penalty.toLocaleString()}</Text>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={status === 'Paid' ? 'green' : status === 'Pending' ? 'orange' : 'red'}>
          {status}
        </Tag>
      ),
    },
  ];

  return (
    <Table
      columns={columns}
      dataSource={penalties}
      pagination={{ pageSize: 10 }}
      summary={() => (
        <Table.Summary.Row>
          <Table.Summary.Cell index={0}>Total</Table.Summary.Cell>
          <Table.Summary.Cell index={1}></Table.Summary.Cell>
          <Table.Summary.Cell index={2}></Table.Summary.Cell>
          <Table.Summary.Cell index={3}>
            <Text strong>1,250,000</Text>
          </Table.Summary.Cell>
          <Table.Summary.Cell index={4}></Table.Summary.Cell>
        </Table.Summary.Row>
      )}
    />
  );
};

export default PenaltyCalculator;
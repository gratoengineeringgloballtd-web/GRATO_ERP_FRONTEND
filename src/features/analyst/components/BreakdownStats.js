import React from 'react';
import { Table, Tag, Spin } from 'antd';
import { useDispatch, useSelector } from 'react-redux';
import { fetchBreakdownStats } from '../analystSlice';

const BreakdownStats = () => {
  const dispatch = useDispatch();
  const { stats = {}, loading } = useSelector((state) => state.analyst);

  React.useEffect(() => {
    dispatch(fetchBreakdownStats());
  }, [dispatch]);

  // Provide default values for stats
  const {
    totalBreakdowns = 0,
    avgDuration = '0:00',
    maxDuration = '0:00',
    gratoResponsible = 0,
    totalPenalties = 0
  } = stats;

  const columns = [
    {
      title: 'Metric',
      dataIndex: 'metric',
      key: 'metric',
    },
    {
      title: 'Value',
      dataIndex: 'value',
      key: 'value',
      render: (value) => (
        <Tag color={value.includes('↑') ? 'red' : value.includes('↓') ? 'green' : 'blue'}>
          {value}
        </Tag>
      ),
    },
  ];

  const data = [
    { key: '1', metric: 'Total Breakdowns', value: totalBreakdowns.toString() },
    { key: '2', metric: 'Avg. Duration', value: avgDuration },
    { key: '3', metric: 'Max Duration', value: maxDuration },
    { key: '4', metric: 'GRATO Responsible', value: gratoResponsible.toString() },
    { key: '5', metric: 'Penalties (XAF)', value: totalPenalties.toString() },
  ];

  return (
    <Spin spinning={loading}>
      <Table
        columns={columns}
        dataSource={data}
        loading={loading}
        pagination={false}
        size="small"
      />
    </Spin>
  );
};

export default BreakdownStats;
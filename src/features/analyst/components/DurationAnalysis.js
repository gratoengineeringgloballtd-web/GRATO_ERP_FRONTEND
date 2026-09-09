import React from 'react';
import { Line } from 'react-chartjs-2';
import { Card, Select } from 'antd';
import { useDispatch, useSelector } from 'react-redux';
import { fetchBreakdownStats } from '../analystSlice';

const { Option } = Select;

const DurationAnalysis = () => {
  const dispatch = useDispatch();
  const { stats } = useSelector((state) => state.analyst);
  const [timeRange, setTimeRange] = React.useState('7days');

  const data = {
    labels: stats.durationTrend?.labels || [],
    datasets: [
      {
        label: 'Avg. Duration (hrs)',
        data: stats.durationTrend?.values || [],
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Breakdown Duration Trend',
      },
    },
  };

  return (
    <Card
      title="Duration Analysis"
      extra={
        <Select defaultValue="7days" style={{ width: 120 }} onChange={setTimeRange}>
          <Option value="7days">Last 7 Days</Option>
          <Option value="30days">Last 30 Days</Option>
          <Option value="90days">Last 90 Days</Option>
        </Select>
      }
    >
      <div style={{ height: 400 }}>
        <Line data={data} options={options} />
      </div>
    </Card>
  );
};

export default DurationAnalysis;
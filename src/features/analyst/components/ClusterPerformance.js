import React from 'react';
import { Bar } from 'react-chartjs-2';
import { Card } from 'antd';
import { useDispatch, useSelector } from 'react-redux';
import { fetchBreakdownStats } from '../analystSlice';

const ClusterPerformance = () => {
  const dispatch = useDispatch();
  const { stats, loading } = useSelector((state) => state.analyst);

  React.useEffect(() => {
    dispatch(fetchBreakdownStats());
  }, [dispatch]);

  const data = {
    labels: stats.clusters?.map(c => c.name) || [],
    datasets: [
      {
        label: 'Breakdowns',
        data: stats.clusters?.map(c => c.breakdowns) || [],
        backgroundColor: 'rgba(255, 99, 132, 0.6)',
      },
      {
        label: 'Avg. Duration (hrs)',
        data: stats.clusters?.map(c => c.avgDuration) || [],
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
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
        text: 'Cluster Performance',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  return (
    <div style={{ height: 300 }}>
      <Bar data={data} options={options} />
    </div>
  );
};

export default ClusterPerformance;
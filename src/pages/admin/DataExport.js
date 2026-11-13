import React, { useEffect, useState } from 'react';
import { Card, Select, Button, Space, Typography, Checkbox, DatePicker, message, Spin, Alert, Row, Col } from 'antd';
import { DownloadOutlined, FileExcelOutlined } from '@ant-design/icons';
import api from '../../services/api';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const DataExport = () => {
  const [resources, setResources] = useState([]);
  const [resource, setResource] = useState(null);
  const [columns, setColumns] = useState([]);
  const [selected, setSelected] = useState([]);
  const [range, setRange] = useState(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    api.get('/data-exports/resources').then((r) => setResources(r.data.data || [])).catch(() => message.error('Failed to load exportable data'));
  }, []);

  const pick = async (key) => {
    setResource(key); setColumns([]); setSelected([]);
    setLoading(true);
    try {
      const res = await api.get(`/data-exports/${key}/columns`);
      const cols = res.data.data || [];
      setColumns(cols); setSelected(cols.slice(0, 15).map((c) => c.key));
    } catch (e) { message.error(e?.response?.data?.message || 'Failed to load columns'); }
    finally { setLoading(false); }
  };

  const download = async () => {
    setDownloading(true);
    try {
      const params = { columns: selected.join(',') };
      if (range?.[0]) { params.from = range[0].format('YYYY-MM-DD'); params.to = range[1].format('YYYY-MM-DD'); }
      const res = await api.get(`/data-exports/${resource}`, { params, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv;charset=utf-8' }));
      const a = document.createElement('a');
      a.href = url; a.download = `${resource}-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(url);
      message.success('Download started');
    } catch (e) {
      message.error('Export failed');
    } finally { setDownloading(false); }
  };

  return (
    <div>
      <Space align="center" style={{ marginBottom: 16 }}>
        <FileExcelOutlined style={{ fontSize: 24 }} />
        <Title level={3} style={{ margin: 0 }}>Data Export</Title>
      </Space>
      <Alert type="info" showIcon style={{ marginBottom: 16 }} message="Export any list to a CSV file that opens in Excel. You only see data your role is allowed to export, and every export is recorded in the audit trail." />
      <Card>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Space wrap>
            <Select placeholder="What do you want to export?" style={{ width: 280 }} value={resource} onChange={pick}
              options={resources.map((r) => ({ value: r.key, label: r.label }))} />
            <RangePicker value={range} onChange={setRange} placeholder={['Created from', 'Created to']} />
            <Button type="primary" icon={<DownloadOutlined />} disabled={!resource || !selected.length} loading={downloading} onClick={download}>Download CSV</Button>
          </Space>
          {loading ? <Spin /> : columns.length > 0 && (
            <div>
              <Space style={{ marginBottom: 8 }}>
                <Text strong>Columns ({selected.length}/{columns.length})</Text>
                <Button size="small" onClick={() => setSelected(columns.map((c) => c.key))}>All</Button>
                <Button size="small" onClick={() => setSelected([])}>None</Button>
              </Space>
              <Checkbox.Group value={selected} onChange={setSelected} style={{ width: '100%' }}>
                <Row gutter={[8, 8]}>{columns.map((c) => <Col key={c.key} xs={24} sm={12} md={8} lg={6}><Checkbox value={c.key}>{c.key}</Checkbox></Col>)}</Row>
              </Checkbox.Group>
            </div>
          )}
        </Space>
      </Card>
    </div>
  );
};

export default DataExport;

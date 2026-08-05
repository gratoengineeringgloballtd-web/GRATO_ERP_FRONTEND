import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Upload, Button, Input, Form, Typography, message, Space } from 'antd';
import { InboxOutlined, FilePdfOutlined, RightOutlined } from '@ant-design/icons';
import documentSigningAPI from '../../services/documentSigningAPI';

const { Title, Paragraph, Text } = Typography;
const { Dragger } = Upload;

const DocumentUpload = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState([]);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (values) => {
    if (fileList.length === 0) {
      return message.warning('Select a PDF to upload');
    }
    try {
      setUploading(true);
      const fd = new FormData();
      fd.append('file', fileList[0].originFileObj || fileList[0]);
      fd.append('title', values.title || fileList[0].name.replace(/\.pdf$/i, ''));
      if (values.description) fd.append('description', values.description);

      const res = await documentSigningAPI.uploadDocument(fd);
      message.success('PDF uploaded — let\'s place the signature fields');
      navigate(`/employee/documents/sign/${res.data.data.document._id}/fields`);
    } catch (err) {
      message.error(err.response?.data?.message || 'Failed to upload PDF');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 720, margin: '0 auto' }}>
      <Card>
        <Title level={3}><FilePdfOutlined style={{ color: '#f5222d', marginRight: 8 }} />Send a document for signature</Title>
        <Paragraph type="secondary">
          Upload a PDF, mark where each person should sign, choose who's involved, and we'll route it
          for sequential signing — no login needed by the people you send it to.
        </Paragraph>

        <Form form={form} layout="vertical" onFinish={handleUpload}>
          <Form.Item label="Document title" name="title">
            <Input placeholder="e.g. Vendor Service Agreement — Q3 2026" />
          </Form.Item>

          <Form.Item label="Notes (optional)" name="description">
            <Input.TextArea rows={2} placeholder="Any context for the people who'll sign this" />
          </Form.Item>

          <Form.Item label="PDF file" required>
            <Dragger
              accept=".pdf"
              multiple={false}
              maxCount={1}
              fileList={fileList}
              beforeUpload={(file) => {
                if (file.type !== 'application/pdf') {
                  message.error('Only PDF files are supported');
                  return false;
                }
                setFileList([file]);
                return false; // we upload manually via documentSigningAPI
              }}
              onRemove={() => setFileList([])}
            >
              <p className="ant-upload-drag-icon"><InboxOutlined /></p>
              <p className="ant-upload-text">Click or drag a PDF file here</p>
              <p className="ant-upload-hint">Maximum 25MB. Only .pdf files are accepted.</p>
            </Dragger>
          </Form.Item>

          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button type="primary" htmlType="submit" loading={uploading} icon={<RightOutlined />}>
              Continue to field placement
            </Button>
          </Space>
        </Form>
      </Card>
    </div>
  );
};

export default DocumentUpload;
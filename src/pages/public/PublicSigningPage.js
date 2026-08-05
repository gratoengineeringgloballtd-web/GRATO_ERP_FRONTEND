import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  Card, Button, Space, Typography, Result, Spin, message, Modal,
  Input, Tag, Tooltip, Alert
} from 'antd';
import {
  FilePdfOutlined, CheckCircleOutlined, CloseCircleOutlined,
  EditOutlined, FontColorsOutlined, CalendarOutlined, FileTextOutlined,
  ClockCircleOutlined, SafetyCertificateOutlined
} from '@ant-design/icons';
import * as pdfjsLib from 'pdfjs-dist';
import SignatureCanvas from './SignaturePadModal';
import documentSigningAPI from '../../services/documentSigningAPI';

// pdfjs-dist v5+ ships ESM-only builds — the worker file is now `pdf.worker.min.mjs`,
// not `pdf.worker.min.js` (that legacy UMD filename no longer exists past v4),
// which is why a stale CDN URL 404s.
//
// We point at a copy of the worker served from the public/ folder rather than
// resolving it via `new URL(..., import.meta.url)` against node_modules —
// that pattern has known bundling issues on Create React App's Webpack 5
// setup (heap/build failures reported by CRA users). Serving it as a plain
// static asset sidesteps module resolution entirely.
//
// Setup required (one-time): copy the worker into your public/ folder. Add
// this to your package.json "scripts" so it runs automatically on install/build:
//   "postinstall": "cp node_modules/pdfjs-dist/build/pdf.worker.min.mjs public/pdf.worker.min.mjs"
// (Windows: use `copy` instead of `cp`, or a small Node script for cross-platform.)
pdfjsLib.GlobalWorkerOptions.workerSrc = `${window.location.origin}/pdf.worker.min.mjs`;

const { Title, Text, Paragraph } = Typography;

const FIELD_TYPE_META = {
  signature: { label: 'Signature', icon: <EditOutlined /> },
  initials:  { label: 'Initials',  icon: <FontColorsOutlined /> },
  date:      { label: 'Date',      icon: <CalendarOutlined /> },
  text:      { label: 'Text',      icon: <FileTextOutlined /> }
};

// This page is intentionally NOT behind any auth context — the documentId +
// token in the URL is the entire identity proof, matching the no-login
// DocuSign-style pattern used elsewhere in this app (ExternalQuoteForm).
const PublicSigningPage = () => {
  const { documentId, token } = useParams();

  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [errorState, setErrorState] = useState(null);
  const [pdfLoadError, setPdfLoadError] = useState(null);

  const [pdfDoc, setPdfDoc] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [values, setValues] = useState({}); // fieldId -> value
  const [signaturePadField, setSignaturePadField] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => { loadSession(); }, [documentId, token]);

  const loadSession = async () => {
    setLoading(true);
    setErrorState(null);

    // ── Step 1: validate the session/token via the backend ──────────────────
    // This is the ONLY thing that should ever produce "invalid or expired link".
    let sessionData;
    try {
      const res = await documentSigningAPI.getPublicSigningSession(documentId, token);
      sessionData = res.data.data;
      setSession(sessionData);
    } catch (err) {
      setErrorState(err.response?.data?.message || 'This signing link is invalid or has expired.');
      setLoading(false);
      return;
    }

    // ── Step 2: render the PDF, kept separate on purpose ─────────────────────
    // A failure here (bad worker file, network hiccup fetching the PDF,
    // CORS issue) is a RENDERING problem, not a token problem — it must
    // never be reported with the "invalid or expired" message, or real
    // token errors become indistinguishable from a misconfigured worker file.
    if (sessionData.status === 'ready_to_sign') {
      try {
        // pdfjs-dist 5.6+/6.x tightened getDocument's parameter validation —
        // passing a bare string is no longer reliably accepted as `url`.
        // Always pass an explicit { url } object.
        const pdf = await pdfjsLib.getDocument({ url: sessionData.originalFile.path }).promise;
        setPdfDoc(pdf);
        const firstFieldPage = sessionData.fields[0]?.page || 1;
        setCurrentPage(firstFieldPage);
      } catch (pdfErr) {
        console.error('PDF rendering failed:', pdfErr);
        setPdfLoadError(
          'The document loaded, but the PDF viewer failed to render it. ' +
          'This is usually a setup issue (e.g. the PDF.js worker file is missing) rather than a problem with your signing link — please contact IT support.'
        );
      }
    }

    setLoading(false);
  };

  const renderPage = useCallback(async () => {
    if (!pdfDoc) return;

    // Wait for the next animation frame — guarantees the canvas is in the DOM
    // after the loading spinner unmounts and the canvas element mounts.
    await new Promise(resolve => requestAnimationFrame(resolve));

    if (!canvasRef.current) return;

    const page = await pdfDoc.getPage(currentPage);
    const containerWidth = containerRef.current?.clientWidth || 800;
    const baseViewport = page.getViewport({ scale: 1 });
    const scale = Math.max(0.1, Math.min(containerWidth / baseViewport.width, 1.4));
    const viewport = page.getViewport({ scale });
    const canvas = canvasRef.current;
    if (!canvas) return; // guard against unmount during async gap

    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
  }, [pdfDoc, currentPage]);

  useEffect(() => { renderPage(); }, [renderPage]);

  if (loading) {
    return <CenteredSpinner text="Loading document…" />;
  }

  if (errorState) {
    return (
      <CenteredPage>
        <Result status="error" title="Unable to open this document" subTitle={errorState} />
      </CenteredPage>
    );
  }

  if (session?.status === 'completed') {
    return (
      <CenteredPage>
        <Result
          status="success"
          icon={<CheckCircleOutlined />}
          title="This document is fully signed"
          subTitle={`"${session.documentTitle}" has already been completed by all signers.`}
        />
      </CenteredPage>
    );
  }

  if (session?.status === 'already_signed') {
    return (
      <CenteredPage>
        <Result
          status="success"
          title="You've already signed this document"
          subTitle={`Signed on ${new Date(session.signedAt).toLocaleString()}. No further action is needed from you.`}
        />
      </CenteredPage>
    );
  }

  if (session?.status === 'not_your_turn') {
    return (
      <CenteredPage>
        <Result
          icon={<ClockCircleOutlined style={{ color: '#faad14' }} />}
          title="Not your turn yet"
          subTitle={session.message}
        />
      </CenteredPage>
    );
  }

  if (session?.status === 'rejected_by_you') {
    return (
      <CenteredPage>
        <Result
          status="info"
          icon={<CloseCircleOutlined style={{ color: '#f5222d' }} />}
          title="You've declined to sign this document"
          subTitle="The person who sent it has been notified of your reason."
        />
      </CenteredPage>
    );
  }

  // status === 'ready_to_sign'
  const allRequiredFilled = session.fields
    .filter(f => f.required)
    .every(f => values[f._id] !== undefined && values[f._id] !== '');

  const handleFieldClick = (field) => {
    if (field.type === 'signature' || field.type === 'initials') {
      setSignaturePadField(field);
    } else if (field.type === 'date') {
      setValues(prev => ({ ...prev, [field._id]: new Date().toLocaleDateString() }));
    }
    // 'text' fields are edited inline via the Input below
  };

  const handleSignatureSave = (dataUrl) => {
    setValues(prev => ({ ...prev, [signaturePadField._id]: dataUrl }));
    setSignaturePadField(null);
  };

  const handleSubmitSignature = async () => {
    if (!allRequiredFilled) {
      return message.warning('Please complete all required fields before signing');
    }
    Modal.confirm({
      title: 'Confirm your signature',
      content: 'By continuing, you confirm that you are electronically signing this document. This action cannot be undone.',
      okText: 'Sign document',
      onOk: async () => {
        try {
          setSubmitting(true);
          const filledFields = Object.entries(values).map(([fieldId, value]) => ({ fieldId, value }));
          const res = await documentSigningAPI.submitSignature(documentId, token, filledFields);
          message.success(res.data.data.completed ? 'Document fully signed!' : 'Your signature was recorded');
          setSession(prev => ({ ...prev, status: res.data.data.completed ? 'completed' : 'already_signed', signedAt: new Date() }));
        } catch (err) {
          message.error(err.response?.data?.message || 'Failed to record signature');
        } finally { setSubmitting(false); }
      }
    });
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) return message.warning('Please provide a reason');
    try {
      setSubmitting(true);
      await documentSigningAPI.rejectAsSigner(documentId, token, rejectReason.trim());
      message.success('Document declined — the sender has been notified');
      setRejectModalOpen(false);
      setSession(prev => ({ ...prev, status: 'rejected_by_you' }));
    } catch (err) {
      message.error(err.response?.data?.message || 'Failed to submit rejection');
    } finally { setSubmitting(false); }
  };

  const fieldsOnCurrentPage = session.fields.filter(f => f.page === currentPage);
  const pagesWithFields = [...new Set(session.fields.map(f => f.page))].sort((a, b) => a - b);

  return (
    <div style={{ background: '#f0f2f5', minHeight: '100vh', padding: '24px 16px' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <Card style={{ marginBottom: 16 }}>
          <Space style={{ width: '100%', justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <Space direction="vertical" size={0}>
              <Title level={4} style={{ margin: 0 }}><FilePdfOutlined style={{ color: '#f5222d', marginRight: 8 }} />{session.documentTitle}</Title>
              <Text type="secondary">Sent by {session.initiatorName} · You are signer {session.signer.level} of {session.signer.totalLevels}</Text>
            </Space>
            <Tag icon={<SafetyCertificateOutlined />} color="blue">Secure signing link — no login required</Tag>
          </Space>
        </Card>

        {session.description && (
          <Alert style={{ marginBottom: 16 }} type="info" message={session.description} showIcon />
        )}

        <Card>
          {pdfLoadError ? (
            <Alert type="error" showIcon message="Couldn't display the document" description={pdfLoadError} />
          ) : (
            <>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                {pagesWithFields.map(p => (
                  <Button
                    key={p}
                    size="small"
                    type={p === currentPage ? 'primary' : 'default'}
                    onClick={() => setCurrentPage(p)}
                  >
                    Page {p} ({session.fields.filter(f => f.page === p).length})
                  </Button>
                ))}
              </div>

              <div ref={containerRef} style={{ position: 'relative', overflow: 'auto', textAlign: 'center' }}>
                <div style={{ position: 'relative', display: 'inline-block', boxShadow: '0 2px 12px rgba(0,0,0,0.15)' }}>
                  <canvas ref={canvasRef} style={{ display: 'block', background: 'white' }} />
                  {fieldsOnCurrentPage.map(field => {
                    const filled = values[field._id] !== undefined && values[field._id] !== '';
                    return (
                      <div
                        key={field._id}
                        onClick={() => field.type === 'text' ? null : handleFieldClick(field)}
                        style={{
                          position: 'absolute',
                          left: `${field.x * 100}%`, top: `${field.y * 100}%`,
                          width: `${field.width * 100}%`, height: `${field.height * 100}%`,
                          border: `2px solid ${filled ? '#52c41a' : '#1890ff'}`,
                          background: filled ? '#52c41a0F' : '#1890ff1A',
                          borderRadius: 4, cursor: field.type === 'text' ? 'default' : 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          overflow: 'hidden'
                        }}
                      >
                        {field.type === 'text' ? (
                          <Input
                            size="small"
                            variant="borderless"
                            placeholder={field.label || 'Type here'}
                            value={values[field._id] || ''}
                            onChange={(e) => setValues(prev => ({ ...prev, [field._id]: e.target.value }))}
                            style={{ width: '100%', height: '100%', textAlign: 'center' }}
                          />
                        ) : filled ? (
                          field.type === 'date'
                            ? <Text strong>{values[field._id]}</Text>
                            : <img src={values[field._id]} alt="signature" style={{ maxWidth: '100%', maxHeight: '100%' }} />
                        ) : (
                          <Tag color="blue" style={{ fontSize: 10, margin: 0 }}>
                            {FIELD_TYPE_META[field.type].icon} Click to {field.type === 'date' ? 'stamp date' : field.type}
                            {field.required && ' *'}
                          </Tag>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </Card>

        <Card style={{ marginTop: 16 }}>
          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <Button danger icon={<CloseCircleOutlined />} onClick={() => setRejectModalOpen(true)}>
              Decline to sign
            </Button>
            <Tooltip title={!allRequiredFilled ? 'Complete all required fields first' : ''}>
              <Button
                type="primary" size="large"
                icon={<CheckCircleOutlined />}
                disabled={!allRequiredFilled}
                loading={submitting}
                onClick={handleSubmitSignature}
              >
                {allRequiredFilled ? 'Sign Document' : `Complete ${session.fields.filter(f => f.required && !values[f._id]).length} more field(s)`}
              </Button>
            </Tooltip>
          </Space>
        </Card>
      </div>

      {signaturePadField && (
        <SignatureCanvas
          fieldType={signaturePadField.type}
          onSave={handleSignatureSave}
          onCancel={() => setSignaturePadField(null)}
        />
      )}

      <Modal
        title="Decline to sign this document"
        open={rejectModalOpen}
        onOk={handleReject}
        onCancel={() => setRejectModalOpen(false)}
        okText="Submit decline" okButtonProps={{ danger: true, loading: submitting }}
      >
        <Paragraph type="secondary">
          Let the sender know why you're declining — this stops the signing chain and they'll need to correct and resend it.
        </Paragraph>
        <Input.TextArea
          rows={4}
          placeholder="e.g. The amount in section 3 doesn't match what we agreed."
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
        />
      </Modal>
    </div>
  );
};

const CenteredPage = ({ children }) => (
  <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f2f5', padding: 24 }}>
    <Card style={{ maxWidth: 520, width: '100%' }}>{children}</Card>
  </div>
);

const CenteredSpinner = ({ text }) => (
  <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f0f2f5' }}>
    <Spin size="large" />
    <Text type="secondary" style={{ marginTop: 16 }}>{text}</Text>
  </div>
);

export default PublicSigningPage;
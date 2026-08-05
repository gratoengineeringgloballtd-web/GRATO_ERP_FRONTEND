import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Button, Space, Typography, Steps, Select, Radio, List, Tag,
  message, Spin, Empty, Tooltip, Modal, Input, Avatar, Divider, Badge, Row, Alert
} from 'antd';
import {
  LeftOutlined, RightOutlined, DeleteOutlined, PlusOutlined,
  UserOutlined, SendOutlined, FontColorsOutlined, EditOutlined,
  CalendarOutlined, FileTextOutlined, DragOutlined, TeamOutlined,
  CheckCircleOutlined, ArrowUpOutlined, ArrowDownOutlined, SearchOutlined
} from '@ant-design/icons';
import * as pdfjsLib from 'pdfjs-dist';
import documentSigningAPI from '../../services/documentSigningAPI';
import api from '../../services/api';

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
const { Search } = Input;

// Distinct colors per signer level so fields are visually attributable at a glance
const LEVEL_COLORS = ['#1890ff', '#722ed1', '#fa8c16', '#13c2c2', '#eb2f96', '#52c41a', '#f5222d', '#faad14'];
const colorForLevel = (level) => LEVEL_COLORS[(level - 1) % LEVEL_COLORS.length];

const FIELD_TYPE_META = {
  signature: { label: 'Signature', icon: <EditOutlined />, defaultW: 0.18, defaultH: 0.045 },
  initials:  { label: 'Initials',  icon: <FontColorsOutlined />, defaultW: 0.06, defaultH: 0.04 },
  date:      { label: 'Date',      icon: <CalendarOutlined />, defaultW: 0.10, defaultH: 0.03 },
  text:      { label: 'Text',      icon: <FileTextOutlined />, defaultW: 0.15, defaultH: 0.03 }
};

const DocumentFieldPlacement = () => {
  const { documentId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [doc, setDoc] = useState(null);
  const [pageDims, setPageDims] = useState([]); // [{ width, height }] from upload metadata
  const [currentPage, setCurrentPage] = useState(1);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [pdfLoadError, setPdfLoadError] = useState(null);

  const [step, setStep] = useState(0); // 0 = place fields, 1 = configure chain, 2 = review & submit

  // ── Chain state ────────────────────────────────────────────────────────────
  const [chainMode, setChainMode] = useState('hierarchical');
  const [hierarchicalPreview, setHierarchicalPreview] = useState([]);
  const [signerList, setSignerList] = useState([]); // unified ordered list, regardless of mode
  const [userSearchResults, setUserSearchResults] = useState([]);
  const [searchingUsers, setSearchingUsers] = useState(false);

  // ── Field placement state ───────────────────────────────────────────────────
  const [fields, setFields] = useState([]);
  const [activeFieldType, setActiveFieldType] = useState('signature');
  const [activeSignerLevel, setActiveSignerLevel] = useState(1);
  const [selectedFieldId, setSelectedFieldId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const dragStateRef = useRef(null);

  // ── Load document + render first page ──────────────────────────────────────
  useEffect(() => { loadDocument(); }, [documentId]);

  const loadDocument = async () => {
    setLoading(true);

    // ── Step 1: fetch the document record itself ─────────────────────────────
    // A failure here is a real "document not found / access denied / network"
    // problem — this is the only thing that should produce "Failed to load document".
    let d;
    try {
      const res = await documentSigningAPI.getDocumentDetails(documentId);
      d = res.data.data;
      setDoc(d);
      setFields((d.fields || []).map(f => ({ ...f, id: f._id || `local-${Math.random()}` })));
      setChainMode(d.chainMode || 'hierarchical');

      if (d.signers?.length > 0) {
        setSignerList(d.signers.map(s => ({
          level: s.level, userId: s.user?._id || s.user, name: s.name, email: s.email,
          role: s.role, isExtra: s.isExtra
        })));
      }

      const previewRes = await documentSigningAPI.getChainPreview();
      setHierarchicalPreview(previewRes.data.data || []);
      if (!d.signers?.length) {
        setSignerList((previewRes.data.data || []).map(s => ({ ...s, userId: null })));
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'Failed to load document');
      setLoading(false);
      return;
    }

    // ── Step 2: render the PDF, kept separate on purpose ─────────────────────
    // A rendering failure (missing worker file, bad URL, CORS) is NOT the
    // same as the document failing to load — conflating the two produces a
    // misleading "Failed to load document" message for what's actually a
    // PDF-viewer setup issue.
    try {
      // pdfjs-dist 5.6+/6.x tightened getDocument's parameter validation —
      // passing a bare string is no longer reliably accepted as `url`.
      // Always pass an explicit { url } object.
      const pdf = await pdfjsLib.getDocument({ url: d.originalFile.path }).promise;
      setPdfDoc(pdf);

      const dims = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const vp = page.getViewport({ scale: 1 });
        dims.push({ width: vp.width, height: vp.height });
      }
      setPageDims(dims);
    } catch (pdfErr) {
      console.error('PDF rendering failed:', pdfErr);
      setPdfLoadError(
        'The document loaded, but the PDF viewer failed to render it. ' +
        'This is usually a setup issue (e.g. the PDF.js worker file is missing) rather than a problem with the document itself — please contact IT support.'
      );
    } finally {
      setLoading(false);
    }
  };

  // ── Render current page to canvas ───────────────────────────────────────────
  // Uses a small delay via requestAnimationFrame to ensure the canvas element
  // has been committed to the DOM before we try to paint — without this,
  // canvasRef.current is null when renderPage first fires (the canvas is
  // conditionally rendered and only appears after loading=false).
  const renderPage = useCallback(async () => {
    if (!pdfDoc) return;

    // Wait for the next animation frame — guarantees the canvas is in the DOM
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
    const ctx = canvas.getContext('2d');
    await page.render({ canvasContext: ctx, viewport }).promise;
  }, [pdfDoc, currentPage]);

  useEffect(() => { renderPage(); }, [renderPage]);

  // ── Field CRUD ───────────────────────────────────────────────────────────────
  const fieldsOnCurrentPage = fields.filter(f => f.page === currentPage);

  const addFieldAtPosition = (xFrac, yFrac) => {
    if (signerList.length === 0) {
      message.warning('Add at least one signer before placing fields');
      return;
    }
    const meta = FIELD_TYPE_META[activeFieldType];
    const newField = {
      id: `local-${Date.now()}-${Math.random()}`,
      page: currentPage,
      x: Math.max(0, Math.min(1 - meta.defaultW, xFrac - meta.defaultW / 2)),
      y: Math.max(0, Math.min(1 - meta.defaultH, yFrac - meta.defaultH / 2)),
      width: meta.defaultW,
      height: meta.defaultH,
      type: activeFieldType,
      assignedSignerLevel: activeSignerLevel,
      required: true,
      label: ''
    };
    setFields(prev => [...prev, newField]);
    setSelectedFieldId(newField.id);
  };

  const handleCanvasClick = (e) => {
    if (dragStateRef.current) return; // ignore click that follows a drag
    const rect = canvasRef.current.getBoundingClientRect();
    const xFrac = (e.clientX - rect.left) / rect.width;
    const yFrac = (e.clientY - rect.top) / rect.height;
    if (e.target === canvasRef.current) {
      addFieldAtPosition(xFrac, yFrac);
    }
  };

  const removeField = (id) => {
    setFields(prev => prev.filter(f => f.id !== id));
    if (selectedFieldId === id) setSelectedFieldId(null);
  };

  // ── Drag-to-move field boxes ─────────────────────────────────────────────────
  const handleFieldMouseDown = (e, field) => {
    e.stopPropagation();
    setSelectedFieldId(field.id);
    const containerRect = canvasRef.current.getBoundingClientRect();
    dragStateRef.current = {
      fieldId: field.id,
      startX: e.clientX, startY: e.clientY,
      origX: field.x, origY: field.y,
      containerWidth: containerRect.width, containerHeight: containerRect.height
    };

    const onMouseMove = (moveEvt) => {
      if (!dragStateRef.current) return;
      const ds = dragStateRef.current;
      const dxFrac = (moveEvt.clientX - ds.startX) / ds.containerWidth;
      const dyFrac = (moveEvt.clientY - ds.startY) / ds.containerHeight;
      setFields(prev => prev.map(f => f.id === ds.fieldId
        ? { ...f, x: Math.max(0, Math.min(1 - f.width, ds.origX + dxFrac)), y: Math.max(0, Math.min(1 - f.height, ds.origY + dyFrac)) }
        : f));
    };
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      setTimeout(() => { dragStateRef.current = null; }, 50); // small delay so the trailing click is suppressed
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  // ── Resize handle (bottom-right corner) ─────────────────────────────────────
  const handleResizeMouseDown = (e, field) => {
    e.stopPropagation();
    const containerRect = canvasRef.current.getBoundingClientRect();
    const ds = {
      fieldId: field.id, startX: e.clientX, startY: e.clientY,
      origW: field.width, origH: field.height,
      containerWidth: containerRect.width, containerHeight: containerRect.height
    };
    dragStateRef.current = ds; // also suppress trailing click

    const onMouseMove = (moveEvt) => {
      const dwFrac = (moveEvt.clientX - ds.startX) / ds.containerWidth;
      const dhFrac = (moveEvt.clientY - ds.startY) / ds.containerHeight;
      setFields(prev => prev.map(f => f.id === ds.fieldId
        ? { ...f, width: Math.max(0.03, Math.min(1 - f.x, ds.origW + dwFrac)), height: Math.max(0.02, Math.min(1 - f.y, ds.origH + dhFrac)) }
        : f));
    };
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      setTimeout(() => { dragStateRef.current = null; }, 50);
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  // ── Chain configuration helpers ─────────────────────────────────────────────
  const searchUsers = async (query) => {
    if (!query || query.length < 2) { setUserSearchResults([]); return; }
    try {
      setSearchingUsers(true);
      const res = await api.get('/sharepoint/users/search', { params: { q: query } });
      setUserSearchResults(res.data.data || []);
    } catch {
      setUserSearchResults([]);
    } finally { setSearchingUsers(false); }
  };

  const addSignerToChain = (user) => {
    const newSigner = { userId: user._id, name: user.fullName, email: user.email, role: user.position || user.role, isExtra: true };
    setSignerList(prev => {
      const next = [...prev, newSigner];
      return next.map((s, i) => ({ ...s, level: i + 1 }));
    });
  };

  const removeSignerFromChain = (index) => {
    const removedLevel = index + 1;
    if (fields.some(f => f.assignedSignerLevel === removedLevel)) {
      message.warning('Reassign or remove fields tied to this signer before removing them from the chain.');
      return;
    }
    setSignerList(prev => prev.filter((_, i) => i !== index).map((s, i) => ({ ...s, level: i + 1 })));
  };

  const moveSigner = (index, direction) => {
    setSignerList(prev => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next.map((s, i) => ({ ...s, level: i + 1 }));
    });
  };

  const switchToHierarchical = () => {
    setChainMode('hierarchical');
    setSignerList(hierarchicalPreview.map(s => ({ ...s, userId: null })));
  };

  const switchToCustom = () => {
    setChainMode('custom');
    // Keep whatever is currently configured as the starting point for full manual control
  };

  // ── Save / submit ────────────────────────────────────────────────────────────
  const saveFieldsToServer = async () => {
    const payload = fields.map(f => ({
      page: f.page, x: f.x, y: f.y, width: f.width, height: f.height,
      type: f.type, assignedSignerLevel: f.assignedSignerLevel,
      label: f.label, required: f.required
    }));
    await documentSigningAPI.saveFields(documentId, payload);
  };

  const saveChainToServer = async () => {
    const payload = signerList.map(s => ({ userId: s.userId, email: s.email, isExtra: !!s.isExtra }));
    await documentSigningAPI.configureChain(documentId, { chainMode, signers: payload });
  };

  const handleNextStep = async () => {
    try {
      if (step === 0) {
        if (fields.length === 0) return message.warning('Place at least one field before continuing');
        await saveFieldsToServer();
        setStep(1);
      } else if (step === 1) {
        if (signerList.length === 0) return message.warning('Add at least one signer');
        await saveChainToServer();
        setStep(2);
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'Failed to save — please check your entries');
    }
  };

  const handleSubmit = async () => {
    Modal.confirm({
      title: 'Submit for signing?',
      content: `This will send a signing request to ${signerList[0]?.name || 'the first signer'}. The document cannot be edited once submitted.`,
      okText: 'Submit', cancelText: 'Cancel',
      onOk: async () => {
        try {
          setSubmitting(true);
          await saveFieldsToServer();
          await saveChainToServer();
          await documentSigningAPI.submitDocument(documentId);
          message.success('Document submitted — the first signer has been notified by email');
          navigate('/employee/documents/sign');
        } catch (err) {
          message.error(err.response?.data?.message || 'Failed to submit document');
        } finally { setSubmitting(false); }
      }
    });
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>;
  }
  if (!doc) {
    return <Empty description="Document not found" style={{ marginTop: 80 }} />;
  }

  const totalPages = pageDims.length;
  const selectedField = fields.find(f => f.id === selectedFieldId);

  return (
    <div style={{ padding: 24 }}>
      <Card style={{ marginBottom: 16 }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Title level={3} style={{ margin: 0 }}>{doc.title}</Title>
          <Steps
            current={step}
            size="small"
            items={[
              { title: 'Place signature fields' },
              { title: 'Configure signing order' },
              { title: 'Review & submit' }
            ]}
          />
        </Space>
      </Card>

      {step === 0 && (
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          <PlacementToolbar
            activeFieldType={activeFieldType} setActiveFieldType={setActiveFieldType}
            activeSignerLevel={activeSignerLevel} setActiveSignerLevel={setActiveSignerLevel}
            signerList={signerList}
            currentPage={currentPage} totalPages={totalPages}
            setCurrentPage={setCurrentPage}
            selectedField={selectedField}
            onUpdateField={(updates) => setFields(prev => prev.map(f => f.id === selectedFieldId ? { ...f, ...updates } : f))}
            onDeleteField={() => removeField(selectedFieldId)}
            fieldsOnPage={fieldsOnCurrentPage.length}
          />

          <div ref={containerRef} style={{ flex: 1, background: '#f0f2f5', borderRadius: 8, padding: 16, position: 'relative', overflow: 'auto' }}>
            {pdfLoadError ? (
              <Alert type="error" showIcon message="Couldn't display the document" description={pdfLoadError} />
            ) : (
              <>
                <div style={{ position: 'relative', display: 'inline-block', boxShadow: '0 2px 12px rgba(0,0,0,0.15)' }}>
                  <canvas
                    ref={canvasRef}
                    onClick={handleCanvasClick}
                    style={{ display: 'block', cursor: 'crosshair', background: 'white' }}
                  />
                  {fieldsOnCurrentPage.map(field => (
                    <FieldOverlayBox
                      key={field.id}
                      field={field}
                      isSelected={field.id === selectedFieldId}
                      color={colorForLevel(field.assignedSignerLevel)}
                      signerName={signerList[field.assignedSignerLevel - 1]?.name || `Level ${field.assignedSignerLevel}`}
                      onMouseDown={(e) => handleFieldMouseDown(e, field)}
                      onResizeMouseDown={(e) => handleResizeMouseDown(e, field)}
                      onClick={() => setSelectedFieldId(field.id)}
                      onDelete={() => removeField(field.id)}
                    />
                  ))}
                </div>
                <Text type="secondary" style={{ display: 'block', textAlign: 'center', marginTop: 12 }}>
                  Click anywhere on the page to drop a {FIELD_TYPE_META[activeFieldType].label.toLowerCase()} field for{' '}
                  <Text strong style={{ color: colorForLevel(activeSignerLevel) }}>
                    {signerList[activeSignerLevel - 1]?.name || `Signer ${activeSignerLevel}`}
                  </Text>. Drag to reposition, drag the corner to resize.
                </Text>
              </>
            )}
          </div>
        </div>
      )}

      {step === 1 && (
        <ChainConfigStep
          chainMode={chainMode}
          onSwitchHierarchical={switchToHierarchical}
          onSwitchCustom={switchToCustom}
          signerList={signerList}
          onMoveSigner={moveSigner}
          onRemoveSigner={removeSignerFromChain}
          onAddSigner={addSignerToChain}
          userSearchResults={userSearchResults}
          onSearchUsers={searchUsers}
          searchingUsers={searchingUsers}
        />
      )}

      {step === 2 && (
        <ReviewStep doc={doc} fields={fields} signerList={signerList} pageDims={pageDims} />
      )}

      <Card style={{ marginTop: 16 }}>
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Button disabled={step === 0} onClick={() => setStep(s => s - 1)}>Back</Button>
          {step < 2 ? (
            <Button type="primary" onClick={handleNextStep}>Continue</Button>
          ) : (
            <Button type="primary" icon={<SendOutlined />} loading={submitting} onClick={handleSubmit}>
              Submit for Signing
            </Button>
          )}
        </Space>
      </Card>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════════════════════════════════════════

const PlacementToolbar = ({
  activeFieldType, setActiveFieldType, activeSignerLevel, setActiveSignerLevel,
  signerList, currentPage, totalPages, setCurrentPage, selectedField, onUpdateField, onDeleteField, fieldsOnPage
}) => (
  <Card size="small" style={{ width: 280, flexShrink: 0 }} title="Field Tools">
    <Space direction="vertical" style={{ width: '100%' }} size="middle">
      <div>
        <Text strong style={{ fontSize: 12 }}>FIELD TYPE</Text>
        <Radio.Group
          value={activeFieldType}
          onChange={(e) => setActiveFieldType(e.target.value)}
          style={{ display: 'flex', flexDirection: 'column', marginTop: 8, gap: 4 }}
        >
          {Object.entries(FIELD_TYPE_META).map(([key, meta]) => (
            <Radio.Button key={key} value={key} style={{ textAlign: 'left' }}>
              {meta.icon} {meta.label}
            </Radio.Button>
          ))}
        </Radio.Group>
      </div>

      <Divider style={{ margin: '4px 0' }} />

      <div>
        <Text strong style={{ fontSize: 12 }}>PLACING FOR SIGNER</Text>
        <Select
          value={activeSignerLevel}
          onChange={setActiveSignerLevel}
          style={{ width: '100%', marginTop: 8 }}
          disabled={signerList.length === 0}
        >
          {signerList.map((s, i) => (
            <Select.Option key={i + 1} value={i + 1}>
              <Tag color={colorForLevel(i + 1)} style={{ marginRight: 4 }}>L{i + 1}</Tag>
              {s.name || s.email}
              {s.isExtra && <Tag style={{ marginLeft: 4 }} color="purple">extra</Tag>}
            </Select.Option>
          ))}
        </Select>
        {signerList.length === 0 && (
          <Text type="warning" style={{ fontSize: 11 }}>
            Default signing chain will load on the next step — or you can configure it now in Step 2.
          </Text>
        )}
      </div>

      <Divider style={{ margin: '4px 0' }} />

      <div>
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Button size="small" icon={<LeftOutlined />} disabled={currentPage <= 1} onClick={() => setCurrentPage(p => p - 1)} />
          <Text>Page {currentPage} of {totalPages}</Text>
          <Button size="small" icon={<RightOutlined />} disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)} />
        </Space>
        <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>
          {fieldsOnPage} field{fieldsOnPage !== 1 ? 's' : ''} on this page
        </Text>
      </div>

      {selectedField && (
        <>
          <Divider style={{ margin: '4px 0' }} />
          <div>
            <Text strong style={{ fontSize: 12 }}>SELECTED FIELD</Text>
            <Space direction="vertical" style={{ width: '100%', marginTop: 8 }} size="small">
              <Input
                size="small"
                placeholder="Optional label (e.g. 'Sign here')"
                value={selectedField.label}
                onChange={(e) => onUpdateField({ label: e.target.value })}
              />
              <Space>
                <Text style={{ fontSize: 12 }}>Required</Text>
                <Radio.Group
                  size="small"
                  value={selectedField.required}
                  onChange={(e) => onUpdateField({ required: e.target.value })}
                >
                  <Radio.Button value={true}>Yes</Radio.Button>
                  <Radio.Button value={false}>No</Radio.Button>
                </Radio.Group>
              </Space>
              <Button danger size="small" icon={<DeleteOutlined />} block onClick={onDeleteField}>
                Delete Field
              </Button>
            </Space>
          </div>
        </>
      )}
    </Space>
  </Card>
);

const FieldOverlayBox = ({ field, isSelected, color, signerName, onMouseDown, onResizeMouseDown, onClick, onDelete }) => (
  <div
    onMouseDown={onMouseDown}
    onClick={onClick}
    style={{
      position: 'absolute',
      left: `${field.x * 100}%`,
      top: `${field.y * 100}%`,
      width: `${field.width * 100}%`,
      height: `${field.height * 100}%`,
      border: `2px ${isSelected ? 'solid' : 'dashed'} ${color}`,
      background: `${color}1A`,
      borderRadius: 4,
      cursor: 'move',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      userSelect: 'none'
    }}
  >
    <Tag color={color} style={{ fontSize: 10, margin: 0, lineHeight: '16px', pointerEvents: 'none' }}>
      {FIELD_TYPE_META[field.type].label} · {signerName}
    </Tag>
    {isSelected && (
      <>
        <DragOutlined style={{ position: 'absolute', top: -8, left: -8, color, background: 'white', borderRadius: '50%', fontSize: 14, padding: 2 }} />
        <div
          onMouseDown={onResizeMouseDown}
          style={{ position: 'absolute', bottom: -6, right: -6, width: 12, height: 12, background: color, borderRadius: 3, cursor: 'nwse-resize', border: '2px solid white' }}
        />
        <Tooltip title="Delete field">
          <DeleteOutlined
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            style={{ position: 'absolute', top: -8, right: -8, color: 'white', background: '#f5222d', borderRadius: '50%', fontSize: 12, padding: 3, cursor: 'pointer' }}
          />
        </Tooltip>
      </>
    )}
  </div>
);

const ChainConfigStep = ({
  chainMode, onSwitchHierarchical, onSwitchCustom, signerList,
  onMoveSigner, onRemoveSigner, onAddSigner, userSearchResults, onSearchUsers, searchingUsers
}) => (
  <Card title="Configure the signing chain">
    <Paragraph type="secondary">
      By default, this document follows your normal hierarchical approval line (supervisor → department head → …).
      You can switch to a fully custom order, and you can insert additional people anywhere in either mode.
      Signers act <Text strong>strictly in sequence</Text> — each person is only notified once everyone before them has signed.
    </Paragraph>

    <Radio.Group
      value={chainMode}
      onChange={(e) => e.target.value === 'hierarchical' ? onSwitchHierarchical() : onSwitchCustom()}
      style={{ marginBottom: 20 }}
    >
      <Radio.Button value="hierarchical"><TeamOutlined /> Default hierarchy</Radio.Button>
      <Radio.Button value="custom"><EditOutlined /> Fully custom order</Radio.Button>
    </Radio.Group>

    <List
      bordered
      dataSource={signerList}
      locale={{ emptyText: 'No signers configured yet' }}
      renderItem={(signer, index) => (
        <List.Item
          actions={[
            <Tooltip title="Move up" key="up"><Button size="small" icon={<ArrowUpOutlined />} disabled={index === 0} onClick={() => onMoveSigner(index, -1)} /></Tooltip>,
            <Tooltip title="Move down" key="down"><Button size="small" icon={<ArrowDownOutlined />} disabled={index === signerList.length - 1} onClick={() => onMoveSigner(index, 1)} /></Tooltip>,
            <Tooltip title="Remove" key="remove"><Button size="small" danger icon={<DeleteOutlined />} onClick={() => onRemoveSigner(index)} /></Tooltip>
          ]}
        >
          <List.Item.Meta
            avatar={<Avatar style={{ backgroundColor: colorForLevel(index + 1) }}>{index + 1}</Avatar>}
            title={<Space>{signer.name || signer.email} {signer.isExtra && <Tag color="purple">added by you</Tag>}</Space>}
            description={<Space>{signer.role && <Tag>{signer.role}</Tag>}<Text type="secondary" style={{ fontSize: 12 }}>{signer.email}</Text></Space>}
          />
        </List.Item>
      )}
    />

    <Divider />

    <Title level={5}>Insert a person anywhere in the chain</Title>
    <Search
      placeholder="Search by name or email…"
      prefix={<SearchOutlined />}
      loading={searchingUsers}
      onChange={(e) => onSearchUsers(e.target.value)}
      style={{ maxWidth: 400, marginBottom: 12 }}
      allowClear
    />
    {userSearchResults.length > 0 && (
      <List
        size="small"
        bordered
        style={{ maxWidth: 500 }}
        dataSource={userSearchResults}
        renderItem={(u) => (
          <List.Item
            actions={[<Button key="add" size="small" type="link" icon={<PlusOutlined />} onClick={() => onAddSigner(u)}>Add to end</Button>]}
          >
            <List.Item.Meta avatar={<Avatar icon={<UserOutlined />} />} title={u.fullName} description={`${u.email} · ${u.department || ''}`} />
          </List.Item>
        )}
      />
    )}
    <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 8 }}>
      New additions land at the end of the list — use the up/down arrows above to move them into the exact position you want.
    </Text>
  </Card>
);

const ReviewStep = ({ doc, fields, signerList, pageDims }) => (
  <Card title="Review before submitting">
    <Row gutter={24}>
      <div style={{ flex: 1 }}>
        <Title level={5}>Document</Title>
        <Paragraph><Text strong>{doc.title}</Text> · {pageDims.length} page{pageDims.length !== 1 ? 's' : ''} · {fields.length} field{fields.length !== 1 ? 's' : ''}</Paragraph>

        <Title level={5}>Signing order ({signerList.length} signer{signerList.length !== 1 ? 's' : ''})</Title>
        <List
          size="small"
          dataSource={signerList}
          renderItem={(s, i) => (
            <List.Item>
              <Space>
                <Badge count={i + 1} style={{ backgroundColor: colorForLevel(i + 1) }} />
                <Text strong>{s.name || s.email}</Text>
                {s.role && <Tag>{s.role}</Tag>}
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {fields.filter(f => f.assignedSignerLevel === i + 1).length} field(s) assigned
                </Text>
              </Space>
            </List.Item>
          )}
        />
      </div>
    </Row>
    <Divider />
    <Paragraph type="secondary" style={{ fontSize: 13 }}>
      <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 6 }} />
      Once submitted, <Text strong>{signerList[0]?.name || 'the first signer'}</Text> will receive an email with a secure link to sign —
      no login required on their end. Each subsequent signer is notified only after the person before them completes their part.
      If anyone declines, the chain stops and you'll be notified immediately so you can correct and resubmit.
    </Paragraph>
  </Card>
);

export default DocumentFieldPlacement;










// import React, { useState, useEffect, useRef, useCallback } from 'react';
// import { useParams, useNavigate } from 'react-router-dom';
// import {
//   Card, Button, Space, Typography, Steps, Select, Radio, List, Tag,
//   message, Spin, Empty, Tooltip, Modal, Input, Avatar, Divider, Badge, Row, Alert
// } from 'antd';
// import {
//   LeftOutlined, RightOutlined, DeleteOutlined, PlusOutlined,
//   UserOutlined, SendOutlined, FontColorsOutlined, EditOutlined,
//   CalendarOutlined, FileTextOutlined, DragOutlined, TeamOutlined,
//   CheckCircleOutlined, ArrowUpOutlined, ArrowDownOutlined, SearchOutlined
// } from '@ant-design/icons';
// import * as pdfjsLib from 'pdfjs-dist';
// import documentSigningAPI from '../../services/documentSigningAPI';
// import api from '../../services/api';

// // pdfjs-dist v5+ ships ESM-only builds — the worker file is now `pdf.worker.min.mjs`,
// // not `pdf.worker.min.js` (that legacy UMD filename no longer exists past v4),
// // which is why a stale CDN URL 404s.
// //
// // We point at a copy of the worker served from the public/ folder rather than
// // resolving it via `new URL(..., import.meta.url)` against node_modules —
// // that pattern has known bundling issues on Create React App's Webpack 5
// // setup (heap/build failures reported by CRA users). Serving it as a plain
// // static asset sidesteps module resolution entirely.
// //
// // Setup required (one-time): copy the worker into your public/ folder. Add
// // this to your package.json "scripts" so it runs automatically on install/build:
// //   "postinstall": "cp node_modules/pdfjs-dist/build/pdf.worker.min.mjs public/pdf.worker.min.mjs"
// // (Windows: use `copy` instead of `cp`, or a small Node script for cross-platform.)
// pdfjsLib.GlobalWorkerOptions.workerSrc = `${window.location.origin}/pdf.worker.min.mjs`;

// const { Title, Text, Paragraph } = Typography;
// const { Search } = Input;

// // Distinct colors per signer level so fields are visually attributable at a glance
// const LEVEL_COLORS = ['#1890ff', '#722ed1', '#fa8c16', '#13c2c2', '#eb2f96', '#52c41a', '#f5222d', '#faad14'];
// const colorForLevel = (level) => LEVEL_COLORS[(level - 1) % LEVEL_COLORS.length];

// const FIELD_TYPE_META = {
//   signature: { label: 'Signature', icon: <EditOutlined />, defaultW: 0.18, defaultH: 0.045 },
//   initials:  { label: 'Initials',  icon: <FontColorsOutlined />, defaultW: 0.06, defaultH: 0.04 },
//   date:      { label: 'Date',      icon: <CalendarOutlined />, defaultW: 0.10, defaultH: 0.03 },
//   text:      { label: 'Text',      icon: <FileTextOutlined />, defaultW: 0.15, defaultH: 0.03 }
// };

// const DocumentFieldPlacement = () => {
//   const { documentId } = useParams();
//   const navigate = useNavigate();

//   const [loading, setLoading] = useState(true);
//   const [doc, setDoc] = useState(null);
//   const [pageDims, setPageDims] = useState([]); // [{ width, height }] from upload metadata
//   const [currentPage, setCurrentPage] = useState(1);
//   const [pdfDoc, setPdfDoc] = useState(null);
//   const [pdfLoadError, setPdfLoadError] = useState(null);

//   const [step, setStep] = useState(0); // 0 = place fields, 1 = configure chain, 2 = review & submit

//   // ── Chain state ────────────────────────────────────────────────────────────
//   const [chainMode, setChainMode] = useState('hierarchical');
//   const [hierarchicalPreview, setHierarchicalPreview] = useState([]);
//   const [signerList, setSignerList] = useState([]); // unified ordered list, regardless of mode
//   const [userSearchResults, setUserSearchResults] = useState([]);
//   const [searchingUsers, setSearchingUsers] = useState(false);

//   // ── Field placement state ───────────────────────────────────────────────────
//   const [fields, setFields] = useState([]);
//   const [activeFieldType, setActiveFieldType] = useState('signature');
//   const [activeSignerLevel, setActiveSignerLevel] = useState(1);
//   const [selectedFieldId, setSelectedFieldId] = useState(null);
//   const [submitting, setSubmitting] = useState(false);

//   const canvasRef = useRef(null);
//   const containerRef = useRef(null);
//   const dragStateRef = useRef(null);

//   // ── Load document + render first page ──────────────────────────────────────
//   useEffect(() => { loadDocument(); }, [documentId]);

//   const loadDocument = async () => {
//     setLoading(true);

//     // ── Step 1: fetch the document record itself ─────────────────────────────
//     // A failure here is a real "document not found / access denied / network"
//     // problem — this is the only thing that should produce "Failed to load document".
//     let d;
//     try {
//       const res = await documentSigningAPI.getDocumentDetails(documentId);
//       d = res.data.data;
//       setDoc(d);
//       setFields((d.fields || []).map(f => ({ ...f, id: f._id || `local-${Math.random()}` })));
//       setChainMode(d.chainMode || 'hierarchical');

//       if (d.signers?.length > 0) {
//         setSignerList(d.signers.map(s => ({
//           level: s.level, userId: s.user?._id || s.user, name: s.name, email: s.email,
//           role: s.role, isExtra: s.isExtra
//         })));
//       }

//       const previewRes = await documentSigningAPI.getChainPreview();
//       setHierarchicalPreview(previewRes.data.data || []);
//       if (!d.signers?.length) {
//         setSignerList((previewRes.data.data || []).map(s => ({ ...s, userId: null })));
//       }
//     } catch (err) {
//       message.error(err.response?.data?.message || 'Failed to load document');
//       setLoading(false);
//       return;
//     }

//     // ── Step 2: render the PDF, kept separate on purpose ─────────────────────
//     // A rendering failure (missing worker file, bad URL, CORS) is NOT the
//     // same as the document failing to load — conflating the two produces a
//     // misleading "Failed to load document" message for what's actually a
//     // PDF-viewer setup issue.
//     try {
//       // pdfjs-dist 5.6+/6.x tightened getDocument's parameter validation —
//       // passing a bare string is no longer reliably accepted as `url`.
//       // Always pass an explicit { url } object.
//       const pdf = await pdfjsLib.getDocument({ url: d.originalFile.path }).promise;
//       setPdfDoc(pdf);

//       const dims = [];
//       for (let i = 1; i <= pdf.numPages; i++) {
//         const page = await pdf.getPage(i);
//         const vp = page.getViewport({ scale: 1 });
//         dims.push({ width: vp.width, height: vp.height });
//       }
//       setPageDims(dims);
//     } catch (pdfErr) {
//       console.error('PDF rendering failed:', pdfErr);
//       setPdfLoadError(
//         'The document loaded, but the PDF viewer failed to render it. ' +
//         'This is usually a setup issue (e.g. the PDF.js worker file is missing) rather than a problem with the document itself — please contact IT support.'
//       );
//     } finally {
//       setLoading(false);
//     }
//   };

//   // ── Render current page to canvas ───────────────────────────────────────────
//   const renderPage = useCallback(async () => {
//     if (!pdfDoc || !canvasRef.current) return;
//     const page = await pdfDoc.getPage(currentPage);
//     const containerWidth = containerRef.current?.clientWidth || 800;
//     const baseViewport = page.getViewport({ scale: 1 });
//     const scale = Math.min(containerWidth / baseViewport.width, 1.4);

//     const viewport = page.getViewport({ scale });
//     const canvas = canvasRef.current;
//     canvas.width = viewport.width;
//     canvas.height = viewport.height;
//     const ctx = canvas.getContext('2d');
//     await page.render({ canvasContext: ctx, viewport }).promise;
//   }, [pdfDoc, currentPage]);

//   useEffect(() => { renderPage(); }, [renderPage]);

//   // ── Field CRUD ───────────────────────────────────────────────────────────────
//   const fieldsOnCurrentPage = fields.filter(f => f.page === currentPage);

//   const addFieldAtPosition = (xFrac, yFrac) => {
//     if (signerList.length === 0) {
//       message.warning('Add at least one signer before placing fields');
//       return;
//     }
//     const meta = FIELD_TYPE_META[activeFieldType];
//     const newField = {
//       id: `local-${Date.now()}-${Math.random()}`,
//       page: currentPage,
//       x: Math.max(0, Math.min(1 - meta.defaultW, xFrac - meta.defaultW / 2)),
//       y: Math.max(0, Math.min(1 - meta.defaultH, yFrac - meta.defaultH / 2)),
//       width: meta.defaultW,
//       height: meta.defaultH,
//       type: activeFieldType,
//       assignedSignerLevel: activeSignerLevel,
//       required: true,
//       label: ''
//     };
//     setFields(prev => [...prev, newField]);
//     setSelectedFieldId(newField.id);
//   };

//   const handleCanvasClick = (e) => {
//     if (dragStateRef.current) return; // ignore click that follows a drag
//     const rect = canvasRef.current.getBoundingClientRect();
//     const xFrac = (e.clientX - rect.left) / rect.width;
//     const yFrac = (e.clientY - rect.top) / rect.height;
//     if (e.target === canvasRef.current) {
//       addFieldAtPosition(xFrac, yFrac);
//     }
//   };

//   const removeField = (id) => {
//     setFields(prev => prev.filter(f => f.id !== id));
//     if (selectedFieldId === id) setSelectedFieldId(null);
//   };

//   // ── Drag-to-move field boxes ─────────────────────────────────────────────────
//   const handleFieldMouseDown = (e, field) => {
//     e.stopPropagation();
//     setSelectedFieldId(field.id);
//     const containerRect = canvasRef.current.getBoundingClientRect();
//     dragStateRef.current = {
//       fieldId: field.id,
//       startX: e.clientX, startY: e.clientY,
//       origX: field.x, origY: field.y,
//       containerWidth: containerRect.width, containerHeight: containerRect.height
//     };

//     const onMouseMove = (moveEvt) => {
//       if (!dragStateRef.current) return;
//       const ds = dragStateRef.current;
//       const dxFrac = (moveEvt.clientX - ds.startX) / ds.containerWidth;
//       const dyFrac = (moveEvt.clientY - ds.startY) / ds.containerHeight;
//       setFields(prev => prev.map(f => f.id === ds.fieldId
//         ? { ...f, x: Math.max(0, Math.min(1 - f.width, ds.origX + dxFrac)), y: Math.max(0, Math.min(1 - f.height, ds.origY + dyFrac)) }
//         : f));
//     };
//     const onMouseUp = () => {
//       document.removeEventListener('mousemove', onMouseMove);
//       document.removeEventListener('mouseup', onMouseUp);
//       setTimeout(() => { dragStateRef.current = null; }, 50); // small delay so the trailing click is suppressed
//     };
//     document.addEventListener('mousemove', onMouseMove);
//     document.addEventListener('mouseup', onMouseUp);
//   };

//   // ── Resize handle (bottom-right corner) ─────────────────────────────────────
//   const handleResizeMouseDown = (e, field) => {
//     e.stopPropagation();
//     const containerRect = canvasRef.current.getBoundingClientRect();
//     const ds = {
//       fieldId: field.id, startX: e.clientX, startY: e.clientY,
//       origW: field.width, origH: field.height,
//       containerWidth: containerRect.width, containerHeight: containerRect.height
//     };
//     dragStateRef.current = ds; // also suppress trailing click

//     const onMouseMove = (moveEvt) => {
//       const dwFrac = (moveEvt.clientX - ds.startX) / ds.containerWidth;
//       const dhFrac = (moveEvt.clientY - ds.startY) / ds.containerHeight;
//       setFields(prev => prev.map(f => f.id === ds.fieldId
//         ? { ...f, width: Math.max(0.03, Math.min(1 - f.x, ds.origW + dwFrac)), height: Math.max(0.02, Math.min(1 - f.y, ds.origH + dhFrac)) }
//         : f));
//     };
//     const onMouseUp = () => {
//       document.removeEventListener('mousemove', onMouseMove);
//       document.removeEventListener('mouseup', onMouseUp);
//       setTimeout(() => { dragStateRef.current = null; }, 50);
//     };
//     document.addEventListener('mousemove', onMouseMove);
//     document.addEventListener('mouseup', onMouseUp);
//   };

//   // ── Chain configuration helpers ─────────────────────────────────────────────
//   const searchUsers = async (query) => {
//     if (!query || query.length < 2) { setUserSearchResults([]); return; }
//     try {
//       setSearchingUsers(true);
//       const res = await api.get('/sharepoint/users/search', { params: { q: query } });
//       setUserSearchResults(res.data.data || []);
//     } catch {
//       setUserSearchResults([]);
//     } finally { setSearchingUsers(false); }
//   };

//   const addSignerToChain = (user) => {
//     const newSigner = { userId: user._id, name: user.fullName, email: user.email, role: user.position || user.role, isExtra: true };
//     setSignerList(prev => {
//       const next = [...prev, newSigner];
//       return next.map((s, i) => ({ ...s, level: i + 1 }));
//     });
//   };

//   const removeSignerFromChain = (index) => {
//     const removedLevel = index + 1;
//     if (fields.some(f => f.assignedSignerLevel === removedLevel)) {
//       message.warning('Reassign or remove fields tied to this signer before removing them from the chain.');
//       return;
//     }
//     setSignerList(prev => prev.filter((_, i) => i !== index).map((s, i) => ({ ...s, level: i + 1 })));
//   };

//   const moveSigner = (index, direction) => {
//     setSignerList(prev => {
//       const next = [...prev];
//       const target = index + direction;
//       if (target < 0 || target >= next.length) return prev;
//       [next[index], next[target]] = [next[target], next[index]];
//       return next.map((s, i) => ({ ...s, level: i + 1 }));
//     });
//   };

//   const switchToHierarchical = () => {
//     setChainMode('hierarchical');
//     setSignerList(hierarchicalPreview.map(s => ({ ...s, userId: null })));
//   };

//   const switchToCustom = () => {
//     setChainMode('custom');
//     // Keep whatever is currently configured as the starting point for full manual control
//   };

//   // ── Save / submit ────────────────────────────────────────────────────────────
//   const saveFieldsToServer = async () => {
//     const payload = fields.map(f => ({
//       page: f.page, x: f.x, y: f.y, width: f.width, height: f.height,
//       type: f.type, assignedSignerLevel: f.assignedSignerLevel,
//       label: f.label, required: f.required
//     }));
//     await documentSigningAPI.saveFields(documentId, payload);
//   };

//   const saveChainToServer = async () => {
//     const payload = signerList.map(s => ({ userId: s.userId, email: s.email, isExtra: !!s.isExtra }));
//     await documentSigningAPI.configureChain(documentId, { chainMode, signers: payload });
//   };

//   const handleNextStep = async () => {
//     try {
//       if (step === 0) {
//         if (fields.length === 0) return message.warning('Place at least one field before continuing');
//         await saveFieldsToServer();
//         setStep(1);
//       } else if (step === 1) {
//         if (signerList.length === 0) return message.warning('Add at least one signer');
//         await saveChainToServer();
//         setStep(2);
//       }
//     } catch (err) {
//       message.error(err.response?.data?.message || 'Failed to save — please check your entries');
//     }
//   };

//   const handleSubmit = async () => {
//     Modal.confirm({
//       title: 'Submit for signing?',
//       content: `This will send a signing request to ${signerList[0]?.name || 'the first signer'}. The document cannot be edited once submitted.`,
//       okText: 'Submit', cancelText: 'Cancel',
//       onOk: async () => {
//         try {
//           setSubmitting(true);
//           await saveFieldsToServer();
//           await saveChainToServer();
//           await documentSigningAPI.submitDocument(documentId);
//           message.success('Document submitted — the first signer has been notified by email');
//           navigate('/employee/documents/sign');
//         } catch (err) {
//           message.error(err.response?.data?.message || 'Failed to submit document');
//         } finally { setSubmitting(false); }
//       }
//     });
//   };

//   if (loading) {
//     return <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>;
//   }
//   if (!doc) {
//     return <Empty description="Document not found" style={{ marginTop: 80 }} />;
//   }

//   const totalPages = pageDims.length;
//   const selectedField = fields.find(f => f.id === selectedFieldId);

//   return (
//     <div style={{ padding: 24 }}>
//       <Card style={{ marginBottom: 16 }}>
//         <Space direction="vertical" style={{ width: '100%' }}>
//           <Title level={3} style={{ margin: 0 }}>{doc.title}</Title>
//           <Steps
//             current={step}
//             size="small"
//             items={[
//               { title: 'Place signature fields' },
//               { title: 'Configure signing order' },
//               { title: 'Review & submit' }
//             ]}
//           />
//         </Space>
//       </Card>

//       {step === 0 && (
//         <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
//           <PlacementToolbar
//             activeFieldType={activeFieldType} setActiveFieldType={setActiveFieldType}
//             activeSignerLevel={activeSignerLevel} setActiveSignerLevel={setActiveSignerLevel}
//             signerList={signerList}
//             currentPage={currentPage} totalPages={totalPages}
//             setCurrentPage={setCurrentPage}
//             selectedField={selectedField}
//             onUpdateField={(updates) => setFields(prev => prev.map(f => f.id === selectedFieldId ? { ...f, ...updates } : f))}
//             onDeleteField={() => removeField(selectedFieldId)}
//             fieldsOnPage={fieldsOnCurrentPage.length}
//           />

//           <div ref={containerRef} style={{ flex: 1, background: '#f0f2f5', borderRadius: 8, padding: 16, position: 'relative', overflow: 'auto' }}>
//             {pdfLoadError ? (
//               <Alert type="error" showIcon message="Couldn't display the document" description={pdfLoadError} />
//             ) : (
//               <>
//                 <div style={{ position: 'relative', display: 'inline-block', boxShadow: '0 2px 12px rgba(0,0,0,0.15)' }}>
//                   <canvas
//                     ref={canvasRef}
//                     onClick={handleCanvasClick}
//                     style={{ display: 'block', cursor: 'crosshair', background: 'white' }}
//                   />
//                   {fieldsOnCurrentPage.map(field => (
//                     <FieldOverlayBox
//                       key={field.id}
//                       field={field}
//                       isSelected={field.id === selectedFieldId}
//                       color={colorForLevel(field.assignedSignerLevel)}
//                       signerName={signerList[field.assignedSignerLevel - 1]?.name || `Level ${field.assignedSignerLevel}`}
//                       onMouseDown={(e) => handleFieldMouseDown(e, field)}
//                       onResizeMouseDown={(e) => handleResizeMouseDown(e, field)}
//                       onClick={() => setSelectedFieldId(field.id)}
//                       onDelete={() => removeField(field.id)}
//                     />
//                   ))}
//                 </div>
//                 <Text type="secondary" style={{ display: 'block', textAlign: 'center', marginTop: 12 }}>
//                   Click anywhere on the page to drop a {FIELD_TYPE_META[activeFieldType].label.toLowerCase()} field for{' '}
//                   <Text strong style={{ color: colorForLevel(activeSignerLevel) }}>
//                     {signerList[activeSignerLevel - 1]?.name || `Signer ${activeSignerLevel}`}
//                   </Text>. Drag to reposition, drag the corner to resize.
//                 </Text>
//               </>
//             )}
//           </div>
//         </div>
//       )}

//       {step === 1 && (
//         <ChainConfigStep
//           chainMode={chainMode}
//           onSwitchHierarchical={switchToHierarchical}
//           onSwitchCustom={switchToCustom}
//           signerList={signerList}
//           onMoveSigner={moveSigner}
//           onRemoveSigner={removeSignerFromChain}
//           onAddSigner={addSignerToChain}
//           userSearchResults={userSearchResults}
//           onSearchUsers={searchUsers}
//           searchingUsers={searchingUsers}
//         />
//       )}

//       {step === 2 && (
//         <ReviewStep doc={doc} fields={fields} signerList={signerList} pageDims={pageDims} />
//       )}

//       <Card style={{ marginTop: 16 }}>
//         <Space style={{ width: '100%', justifyContent: 'space-between' }}>
//           <Button disabled={step === 0} onClick={() => setStep(s => s - 1)}>Back</Button>
//           {step < 2 ? (
//             <Button type="primary" onClick={handleNextStep}>Continue</Button>
//           ) : (
//             <Button type="primary" icon={<SendOutlined />} loading={submitting} onClick={handleSubmit}>
//               Submit for Signing
//             </Button>
//           )}
//         </Space>
//       </Card>
//     </div>
//   );
// };

// // ═══════════════════════════════════════════════════════════════════════════
// // Sub-components
// // ═══════════════════════════════════════════════════════════════════════════

// const PlacementToolbar = ({
//   activeFieldType, setActiveFieldType, activeSignerLevel, setActiveSignerLevel,
//   signerList, currentPage, totalPages, setCurrentPage, selectedField, onUpdateField, onDeleteField, fieldsOnPage
// }) => (
//   <Card size="small" style={{ width: 280, flexShrink: 0 }} title="Field Tools">
//     <Space direction="vertical" style={{ width: '100%' }} size="middle">
//       <div>
//         <Text strong style={{ fontSize: 12 }}>FIELD TYPE</Text>
//         <Radio.Group
//           value={activeFieldType}
//           onChange={(e) => setActiveFieldType(e.target.value)}
//           style={{ display: 'flex', flexDirection: 'column', marginTop: 8, gap: 4 }}
//         >
//           {Object.entries(FIELD_TYPE_META).map(([key, meta]) => (
//             <Radio.Button key={key} value={key} style={{ textAlign: 'left' }}>
//               {meta.icon} {meta.label}
//             </Radio.Button>
//           ))}
//         </Radio.Group>
//       </div>

//       <Divider style={{ margin: '4px 0' }} />

//       <div>
//         <Text strong style={{ fontSize: 12 }}>PLACING FOR SIGNER</Text>
//         <Select
//           value={activeSignerLevel}
//           onChange={setActiveSignerLevel}
//           style={{ width: '100%', marginTop: 8 }}
//           disabled={signerList.length === 0}
//         >
//           {signerList.map((s, i) => (
//             <Select.Option key={i + 1} value={i + 1}>
//               <Tag color={colorForLevel(i + 1)} style={{ marginRight: 4 }}>L{i + 1}</Tag>
//               {s.name || s.email}
//               {s.isExtra && <Tag style={{ marginLeft: 4 }} color="purple">extra</Tag>}
//             </Select.Option>
//           ))}
//         </Select>
//         {signerList.length === 0 && (
//           <Text type="warning" style={{ fontSize: 11 }}>
//             Default signing chain will load on the next step — or you can configure it now in Step 2.
//           </Text>
//         )}
//       </div>

//       <Divider style={{ margin: '4px 0' }} />

//       <div>
//         <Space style={{ width: '100%', justifyContent: 'space-between' }}>
//           <Button size="small" icon={<LeftOutlined />} disabled={currentPage <= 1} onClick={() => setCurrentPage(p => p - 1)} />
//           <Text>Page {currentPage} of {totalPages}</Text>
//           <Button size="small" icon={<RightOutlined />} disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)} />
//         </Space>
//         <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>
//           {fieldsOnPage} field{fieldsOnPage !== 1 ? 's' : ''} on this page
//         </Text>
//       </div>

//       {selectedField && (
//         <>
//           <Divider style={{ margin: '4px 0' }} />
//           <div>
//             <Text strong style={{ fontSize: 12 }}>SELECTED FIELD</Text>
//             <Space direction="vertical" style={{ width: '100%', marginTop: 8 }} size="small">
//               <Input
//                 size="small"
//                 placeholder="Optional label (e.g. 'Sign here')"
//                 value={selectedField.label}
//                 onChange={(e) => onUpdateField({ label: e.target.value })}
//               />
//               <Space>
//                 <Text style={{ fontSize: 12 }}>Required</Text>
//                 <Radio.Group
//                   size="small"
//                   value={selectedField.required}
//                   onChange={(e) => onUpdateField({ required: e.target.value })}
//                 >
//                   <Radio.Button value={true}>Yes</Radio.Button>
//                   <Radio.Button value={false}>No</Radio.Button>
//                 </Radio.Group>
//               </Space>
//               <Button danger size="small" icon={<DeleteOutlined />} block onClick={onDeleteField}>
//                 Delete Field
//               </Button>
//             </Space>
//           </div>
//         </>
//       )}
//     </Space>
//   </Card>
// );

// const FieldOverlayBox = ({ field, isSelected, color, signerName, onMouseDown, onResizeMouseDown, onClick, onDelete }) => (
//   <div
//     onMouseDown={onMouseDown}
//     onClick={onClick}
//     style={{
//       position: 'absolute',
//       left: `${field.x * 100}%`,
//       top: `${field.y * 100}%`,
//       width: `${field.width * 100}%`,
//       height: `${field.height * 100}%`,
//       border: `2px ${isSelected ? 'solid' : 'dashed'} ${color}`,
//       background: `${color}1A`,
//       borderRadius: 4,
//       cursor: 'move',
//       display: 'flex',
//       alignItems: 'center',
//       justifyContent: 'center',
//       userSelect: 'none'
//     }}
//   >
//     <Tag color={color} style={{ fontSize: 10, margin: 0, lineHeight: '16px', pointerEvents: 'none' }}>
//       {FIELD_TYPE_META[field.type].label} · {signerName}
//     </Tag>
//     {isSelected && (
//       <>
//         <DragOutlined style={{ position: 'absolute', top: -8, left: -8, color, background: 'white', borderRadius: '50%', fontSize: 14, padding: 2 }} />
//         <div
//           onMouseDown={onResizeMouseDown}
//           style={{ position: 'absolute', bottom: -6, right: -6, width: 12, height: 12, background: color, borderRadius: 3, cursor: 'nwse-resize', border: '2px solid white' }}
//         />
//         <Tooltip title="Delete field">
//           <DeleteOutlined
//             onClick={(e) => { e.stopPropagation(); onDelete(); }}
//             style={{ position: 'absolute', top: -8, right: -8, color: 'white', background: '#f5222d', borderRadius: '50%', fontSize: 12, padding: 3, cursor: 'pointer' }}
//           />
//         </Tooltip>
//       </>
//     )}
//   </div>
// );

// const ChainConfigStep = ({
//   chainMode, onSwitchHierarchical, onSwitchCustom, signerList,
//   onMoveSigner, onRemoveSigner, onAddSigner, userSearchResults, onSearchUsers, searchingUsers
// }) => (
//   <Card title="Configure the signing chain">
//     <Paragraph type="secondary">
//       By default, this document follows your normal hierarchical approval line (supervisor → department head → …).
//       You can switch to a fully custom order, and you can insert additional people anywhere in either mode.
//       Signers act <Text strong>strictly in sequence</Text> — each person is only notified once everyone before them has signed.
//     </Paragraph>

//     <Radio.Group
//       value={chainMode}
//       onChange={(e) => e.target.value === 'hierarchical' ? onSwitchHierarchical() : onSwitchCustom()}
//       style={{ marginBottom: 20 }}
//     >
//       <Radio.Button value="hierarchical"><TeamOutlined /> Default hierarchy</Radio.Button>
//       <Radio.Button value="custom"><EditOutlined /> Fully custom order</Radio.Button>
//     </Radio.Group>

//     <List
//       bordered
//       dataSource={signerList}
//       locale={{ emptyText: 'No signers configured yet' }}
//       renderItem={(signer, index) => (
//         <List.Item
//           actions={[
//             <Tooltip title="Move up" key="up"><Button size="small" icon={<ArrowUpOutlined />} disabled={index === 0} onClick={() => onMoveSigner(index, -1)} /></Tooltip>,
//             <Tooltip title="Move down" key="down"><Button size="small" icon={<ArrowDownOutlined />} disabled={index === signerList.length - 1} onClick={() => onMoveSigner(index, 1)} /></Tooltip>,
//             <Tooltip title="Remove" key="remove"><Button size="small" danger icon={<DeleteOutlined />} onClick={() => onRemoveSigner(index)} /></Tooltip>
//           ]}
//         >
//           <List.Item.Meta
//             avatar={<Avatar style={{ backgroundColor: colorForLevel(index + 1) }}>{index + 1}</Avatar>}
//             title={<Space>{signer.name || signer.email} {signer.isExtra && <Tag color="purple">added by you</Tag>}</Space>}
//             description={<Space>{signer.role && <Tag>{signer.role}</Tag>}<Text type="secondary" style={{ fontSize: 12 }}>{signer.email}</Text></Space>}
//           />
//         </List.Item>
//       )}
//     />

//     <Divider />

//     <Title level={5}>Insert a person anywhere in the chain</Title>
//     <Search
//       placeholder="Search by name or email…"
//       prefix={<SearchOutlined />}
//       loading={searchingUsers}
//       onChange={(e) => onSearchUsers(e.target.value)}
//       style={{ maxWidth: 400, marginBottom: 12 }}
//       allowClear
//     />
//     {userSearchResults.length > 0 && (
//       <List
//         size="small"
//         bordered
//         style={{ maxWidth: 500 }}
//         dataSource={userSearchResults}
//         renderItem={(u) => (
//           <List.Item
//             actions={[<Button key="add" size="small" type="link" icon={<PlusOutlined />} onClick={() => onAddSigner(u)}>Add to end</Button>]}
//           >
//             <List.Item.Meta avatar={<Avatar icon={<UserOutlined />} />} title={u.fullName} description={`${u.email} · ${u.department || ''}`} />
//           </List.Item>
//         )}
//       />
//     )}
//     <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 8 }}>
//       New additions land at the end of the list — use the up/down arrows above to move them into the exact position you want.
//     </Text>
//   </Card>
// );

// const ReviewStep = ({ doc, fields, signerList, pageDims }) => (
//   <Card title="Review before submitting">
//     <Row gutter={24}>
//       <div style={{ flex: 1 }}>
//         <Title level={5}>Document</Title>
//         <Paragraph><Text strong>{doc.title}</Text> · {pageDims.length} page{pageDims.length !== 1 ? 's' : ''} · {fields.length} field{fields.length !== 1 ? 's' : ''}</Paragraph>

//         <Title level={5}>Signing order ({signerList.length} signer{signerList.length !== 1 ? 's' : ''})</Title>
//         <List
//           size="small"
//           dataSource={signerList}
//           renderItem={(s, i) => (
//             <List.Item>
//               <Space>
//                 <Badge count={i + 1} style={{ backgroundColor: colorForLevel(i + 1) }} />
//                 <Text strong>{s.name || s.email}</Text>
//                 {s.role && <Tag>{s.role}</Tag>}
//                 <Text type="secondary" style={{ fontSize: 12 }}>
//                   {fields.filter(f => f.assignedSignerLevel === i + 1).length} field(s) assigned
//                 </Text>
//               </Space>
//             </List.Item>
//           )}
//         />
//       </div>
//     </Row>
//     <Divider />
//     <Paragraph type="secondary" style={{ fontSize: 13 }}>
//       <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 6 }} />
//       Once submitted, <Text strong>{signerList[0]?.name || 'the first signer'}</Text> will receive an email with a secure link to sign —
//       no login required on their end. Each subsequent signer is notified only after the person before them completes their part.
//       If anyone declines, the chain stops and you'll be notified immediately so you can correct and resubmit.
//     </Paragraph>
//   </Card>
// );

// export default DocumentFieldPlacement;




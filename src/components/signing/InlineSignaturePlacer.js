// ═══════════════════════════════════════════════════════════════════════════
// components/signing/InlineSignaturePlacer.js
//
// Preview a document, drag your SAVED signature to where you want it, resize it, optionally add
// your name and/or the date, and report the position to the parent via onChange. The parent
// sends it with its approve request and the server stamps it (services/inlineSigningService.js).
//
// Positions are fractions of the page (0-1) from the top-left, like the signing portal's fields.
//
// Props:
//   documentUrl  API path that returns the document bytes (PDF / PNG / JPG)
//   onChange     (value|null) => void
//                value = { placements: [
//                   {type:'signature', page,x,y,width,height},
//                   {type:'name'|'date', page,x,y,size}   (optional; size = text height / page height)
//                ] }
//   disabled     boolean
//   userName     optional, shown in the live name preview
// ═══════════════════════════════════════════════════════════════════════════
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Button, Checkbox, Slider, Space, Spin, Tag, Typography } from 'antd';
import {
  DeleteOutlined, EditOutlined, LeftOutlined, RightOutlined, ZoomInOutlined, ZoomOutOutlined
} from '@ant-design/icons';
import * as pdfjsLib from 'pdfjs-dist';
import api from '../../services/api';

pdfjsLib.GlobalWorkerOptions.workerSrc = `${window.location.origin}/pdf.worker.min.js`;

const { Text } = Typography;
const MAX_PAGE_WIDTH = 920;
const MIN_SIG = 0.05;
const MAX_SIG = 0.6;
const MIN_TXT = 0.008;
const MAX_TXT = 0.04;
const DEFAULT_TXT = 0.014;

const formatToday = () =>
  new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

const InlineSignaturePlacer = ({ documentUrl, onChange, disabled = false, userName = '' }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [kind, setKind] = useState(null); // 'pdf' | 'image'
  const [pdfDoc, setPdfDoc] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [numPages, setNumPages] = useState(1);
  const [pageNum, setPageNum] = useState(1);
  const [pageSize, setPageSize] = useState({ w: 0, h: 0 });
  const [containerWidth, setContainerWidth] = useState(MAX_PAGE_WIDTH);
  const [signedCopy, setSignedCopy] = useState(false);
  const [copySource, setCopySource] = useState('');

  const [signatureUrl, setSignatureUrl] = useState(null);
  const [signatureRatio, setSignatureRatio] = useState(0.35); // height / width
  const [signatureChecked, setSignatureChecked] = useState(false);

  // placement: x,y = top-left as page fractions, w = width as page fraction
  const [placement, setPlacement] = useState(null);
  // optional text stamps, each with its own position and size (size = text height / page height)
  const [nameStamp, setNameStamp] = useState(null);
  const [dateStamp, setDateStamp] = useState(null);
  const [selected, setSelected] = useState('sig'); // 'sig' | 'name' | 'date'
  const [profileName, setProfileName] = useState('');

  const canvasRef = useRef(null);
  const imgRef = useRef(null);
  const wrapRef = useRef(null);
  const scrollRef = useRef(null);
  const dragRef = useRef(null);
  const renderToken = useRef(0);

  // fit the page to the available width
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(() => {
      const w = Math.floor(el.clientWidth - 18);
      if (w > 200) setContainerWidth(Math.min(w, MAX_PAGE_WIDTH));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [loading]);

  // ── load the document ────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    let objectUrl = null;
    (async () => {
      setLoading(true); setError(null); setPdfDoc(null); setImageUrl(null); setPlacement(null);
      try {
        const res = await api.get(documentUrl, { responseType: 'blob' });
        if (cancelled) return;
        setSignedCopy(String(res.headers['x-signed-copy']) === 'true');
        try { setCopySource(decodeURIComponent(res.headers['x-copy-source'] || '')); } catch (e) { setCopySource(''); }
        const blob = res.data;
        if (blob.type === 'application/pdf') {
          const data = await blob.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({ data }).promise;
          if (cancelled) return;
          setPdfDoc(pdf); setNumPages(pdf.numPages); setPageNum(1); setKind('pdf');
        } else if (blob.type.startsWith('image/')) {
          objectUrl = URL.createObjectURL(blob);
          setImageUrl(objectUrl); setNumPages(1); setPageNum(1); setKind('image');
        } else {
          throw new Error('This file type cannot be previewed.');
        }
      } catch (e) {
        if (!cancelled) setError(e.response?.status === 403
          ? 'You do not have permission to view this document.'
          : (e.message || 'Could not load the document.'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [documentUrl]);

  // ── load the signer's saved signature ───────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    api.get('/document-signing/my-signature')
      .then((res) => {
        if (cancelled) return;
        const url = res.data?.data?.dataUrl || null;
        setProfileName(res.data?.data?.name || '');
        setSignatureUrl(url);
        if (url) {
          const img = new Image();
          img.onload = () => { if (!cancelled && img.width) setSignatureRatio(img.height / img.width); };
          img.src = url;
        }
      })
      .catch(() => { if (!cancelled) setSignatureUrl(null); })
      .finally(() => { if (!cancelled) setSignatureChecked(true); });
    return () => { cancelled = true; };
  }, []);

  // ── render the current PDF page ─────────────────────────────────────────
  useEffect(() => {
    if (kind !== 'pdf' || !pdfDoc) return undefined;
    const token = ++renderToken.current;
    (async () => {
      const page = await pdfDoc.getPage(pageNum);
      const base = page.getViewport({ scale: 1 });
      const scale = Math.min(containerWidth / base.width, 2.5);
      const viewport = page.getViewport({ scale });
      const canvas = canvasRef.current;
      if (!canvas || token !== renderToken.current) return;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      setPageSize({ w: viewport.width, h: viewport.height });
      await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
    })().catch(() => {});
    return () => { renderToken.current += 1; };
  }, [kind, pdfDoc, pageNum, containerWidth]);

  const onImageLoad = () => {
    const img = imgRef.current;
    if (img) setPageSize({ w: img.clientWidth, h: img.clientHeight });
  };
  useEffect(() => {
    if (kind === 'image' && imgRef.current) setPageSize({ w: imgRef.current.clientWidth, h: imgRef.current.clientHeight });
  }, [kind, containerWidth]);

  // ── report the positions to the parent ─────────────────────────────────
  useEffect(() => {
    if (!onChange) return;
    if (!placement || !pageSize.w || !pageSize.h) { onChange(null); return; }
    const height = (placement.w * pageSize.w * signatureRatio) / pageSize.h;
    const placements = [{ type: 'signature', page: placement.page, x: placement.x, y: placement.y, width: placement.w, height }];
    if (nameStamp) placements.push({ type: 'name', ...nameStamp });
    if (dateStamp) placements.push({ type: 'date', ...dateStamp });
    onChange({ placements });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placement, nameStamp, dateStamp, pageSize.w, pageSize.h, signatureRatio]);

  const heightFraction = useCallback((w) => (
    pageSize.h ? (w * pageSize.w * signatureRatio) / pageSize.h : 0.1
  ), [pageSize.w, pageSize.h, signatureRatio]);

  const clamp = useCallback((x, y, w) => ({
    x: Math.min(Math.max(x, 0), Math.max(1 - w, 0)),
    y: Math.min(Math.max(y, 0), Math.max(1 - heightFraction(w), 0))
  }), [heightFraction]);

  const clampText = (x, y, size) => ({
    x: Math.min(Math.max(x, 0), 0.97),
    y: Math.min(Math.max(y, 0), Math.max(1 - size * 1.3, 0))
  });

  const placeSignature = () => {
    const w = placement ? placement.w : 0.28;
    const pos = clamp(0.6, 0.78, w);
    setPlacement({ page: pageNum, w, ...pos });
    setSelected('sig');
  };

  // "Move selected to this page": the selected element jumps to the page being viewed
  const moveSelectedHere = () => {
    if (selected === 'sig' && placement) setPlacement({ ...placement, page: pageNum });
    if (selected === 'name' && nameStamp) setNameStamp({ ...nameStamp, page: pageNum });
    if (selected === 'date' && dateStamp) setDateStamp({ ...dateStamp, page: pageNum });
  };

  // default spot for a new name / date line: just under the signature
  const defaultTextSpot = (slot) => {
    const sigH = heightFraction(placement.w);
    const y = placement.y + sigH + 0.006 + (slot === 'date' && nameStamp ? DEFAULT_TXT * 1.5 : 0);
    return { page: placement.page, ...clampText(placement.x, y, DEFAULT_TXT), size: DEFAULT_TXT };
  };
  const toggleName = (on) => {
    if (!on) { setNameStamp(null); if (selected === 'name') setSelected('sig'); return; }
    setNameStamp(defaultTextSpot('name')); setSelected('name');
  };
  const toggleDate = (on) => {
    if (!on) { setDateStamp(null); if (selected === 'date') setSelected('sig'); return; }
    setDateStamp(defaultTextSpot('date')); setSelected('date');
  };
  const removeAll = () => { setPlacement(null); setNameStamp(null); setDateStamp(null); setSelected('sig'); };

  // largest signature width that still fits on the page from its position
  const fitWidth = (x, y) => Math.max(MIN_SIG, Math.min(MAX_SIG, 1 - x,
    (1 - y) * pageSize.h / (pageSize.w * signatureRatio || 1)));

  // the slider / +- buttons act on the selected element
  const selectedSize = selected === 'sig' ? (placement ? placement.w : 0)
    : selected === 'name' ? (nameStamp ? nameStamp.size : 0)
    : (dateStamp ? dateStamp.size : 0);
  const sizeBounds = selected === 'sig' ? [MIN_SIG, MAX_SIG, 0.005] : [MIN_TXT, MAX_TXT, 0.001];
  const sizeStep = selected === 'sig' ? 0.02 : 0.002;

  const setSize = (value) => {
    if (selected === 'sig') {
      setPlacement((p) => p && { ...p, w: Math.min(Math.max(value, MIN_SIG), Math.min(MAX_SIG, fitWidth(p.x, p.y))) });
    } else {
      const size = Math.min(Math.max(value, MIN_TXT), MAX_TXT);
      const setter = selected === 'name' ? setNameStamp : setDateStamp;
      setter((t) => t && { ...t, size, ...clampText(t.x, t.y, size) });
    }
  };

  // ── dragging / resizing (pointer events: mouse, pen and touch) ──────────
  const rectOf = () => wrapRef.current.getBoundingClientRect();
  const current = (target) => (target === 'sig' ? placement : target === 'name' ? nameStamp : dateStamp);

  const startDrag = (target) => (e) => {
    const item = current(target);
    if (disabled || !item) return;
    e.preventDefault();
    setSelected(target);
    const rect = rectOf();
    dragRef.current = {
      mode: 'move', target,
      dx: (e.clientX - rect.left) / rect.width - item.x,
      dy: (e.clientY - rect.top) / rect.height - item.y
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onHandleDown = (e) => {
    if (disabled || !placement) return;
    e.preventDefault(); e.stopPropagation();
    setSelected('sig');
    dragRef.current = { mode: 'resize', target: 'sig' };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e) => {
    const d = dragRef.current;
    if (!d) return;
    const rect = rectOf();
    if (d.mode === 'move') {
      const x = (e.clientX - rect.left) / rect.width - d.dx;
      const y = (e.clientY - rect.top) / rect.height - d.dy;
      if (d.target === 'sig') setPlacement((p) => p && ({ ...p, ...clamp(x, y, p.w) }));
      else {
        const setter = d.target === 'name' ? setNameStamp : setDateStamp;
        setter((t) => t && ({ ...t, ...clampText(x, y, t.size) }));
      }
    } else if (placement) {
      // resize the signature: the bottom-right corner follows the pointer, keeping the aspect ratio
      const px = (e.clientX - rect.left) / rect.width;
      setPlacement((p) => p && ({ ...p, w: Math.min(Math.max(px - p.x, MIN_SIG), Math.min(MAX_SIG, fitWidth(p.x, p.y))) }));
    }
  };
  const onPointerUp = () => { dragRef.current = null; };

  // ── UI ──────────────────────────────────────────────────────────────────
  if (loading) return <div style={{ textAlign: 'center', padding: 32 }}><Spin tip="Loading document..." /></div>;
  if (error) return <Alert type="error" showIcon message="Document preview unavailable" description={error} />;

  const showBox = placement && placement.page === pageNum && signatureUrl;
  const displayName = profileName || userName || 'Your name';
  const selectedLabel = selected === 'sig' ? 'Signature' : selected === 'name' ? 'Name' : 'Date';
  const textBox = (target, item, text) => (item && item.page === pageNum ? (
    <div
      key={target}
      onPointerDown={startDrag(target)}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      style={{
        position: 'absolute',
        left: `${item.x * 100}%`,
        top: `${item.y * 100}%`,
        fontSize: item.size * pageSize.h,
        lineHeight: 1.1,
        whiteSpace: 'nowrap',
        color: '#111',
        fontFamily: 'Helvetica, Arial, sans-serif',
        padding: '0 2px',
        outline: selected === target ? '1px dashed #1677ff' : '1px dashed transparent',
        background: selected === target ? 'rgba(22,119,255,0.06)' : 'transparent',
        cursor: disabled ? 'default' : 'grab',
        touchAction: 'none'
      }}
    >
      {text}
    </div>
  ) : null);

  return (
    <div>
      {signatureChecked && !signatureUrl && (
        <Alert
          type="warning" showIcon style={{ marginBottom: 12 }}
          message="No saved signature found on your profile"
          description="Add a signature to your profile to sign on screen, or use the upload option instead. You can still approve without signing."
        />
      )}

      {/* toolbar: everything stays visible above the preview */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12,
        padding: '8px 12px', marginBottom: 8, background: '#fafafa', border: '1px solid #f0f0f0', borderRadius: 6
      }}>
        {signedCopy
          ? <Tag color="green" style={{ margin: 0 }}>Showing signed copy ({copySource})</Tag>
          : <Tag style={{ margin: 0 }}>Showing the original document</Tag>}

        <Button type="primary" icon={<EditOutlined />} onClick={placeSignature} disabled={disabled || !signatureUrl}>
          {placement ? 'Re-place signature' : 'Place my signature'}
        </Button>

        {placement && (
          <>
            <Checkbox checked={!!nameStamp} onChange={(e) => toggleName(e.target.checked)} disabled={disabled}>
              Add my name
            </Checkbox>
            <Checkbox checked={!!dateStamp} onChange={(e) => toggleDate(e.target.checked)} disabled={disabled}>
              Add date
            </Checkbox>
            <Button icon={<DeleteOutlined />} onClick={removeAll} disabled={disabled}>
              Remove all
            </Button>
          </>
        )}

        {numPages > 1 && (
          <Space size={6} style={{ marginLeft: 'auto' }}>
            <Button size="small" icon={<LeftOutlined />} disabled={pageNum <= 1} onClick={() => setPageNum(pageNum - 1)} />
            <Text>Page {pageNum} of {numPages}</Text>
            <Button size="small" icon={<RightOutlined />} disabled={pageNum >= numPages} onClick={() => setPageNum(pageNum + 1)} />
          </Space>
        )}
      </div>

      {placement && (
        <div style={{
          display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12,
          padding: '6px 12px', marginBottom: 8, border: '1px solid #f0f0f0', borderRadius: 6
        }}>
          <Space size={6}>
            <Text type="secondary">Selected:</Text>
            <Button size="small" type={selected === 'sig' ? 'primary' : 'default'} onClick={() => setSelected('sig')}>Signature</Button>
            {nameStamp && <Button size="small" type={selected === 'name' ? 'primary' : 'default'} onClick={() => setSelected('name')}>Name</Button>}
            {dateStamp && <Button size="small" type={selected === 'date' ? 'primary' : 'default'} onClick={() => setSelected('date')}>Date</Button>}
          </Space>
          <Space size={6} align="center">
            <Text type="secondary">{selectedLabel} size</Text>
            <Button size="small" icon={<ZoomOutOutlined />} disabled={disabled}
                    onClick={() => setSize(selectedSize - sizeStep)} />
            <Slider min={sizeBounds[0]} max={sizeBounds[1]} step={sizeBounds[2]} value={selectedSize} onChange={setSize}
                    tooltip={{ formatter: (v) => (selected === 'sig' ? `${Math.round(v * 100)}%` : `${Math.round(v * 842)} pt`) }}
                    disabled={disabled} style={{ width: 180, margin: '0 6px' }} />
            <Button size="small" icon={<ZoomInOutlined />} disabled={disabled}
                    onClick={() => setSize(selectedSize + sizeStep)} />
          </Space>
          <Button size="small" onClick={moveSelectedHere} disabled={disabled}>Move selected to this page</Button>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Drag anything to position it. Drag the signature's corner to resize it.
          </Text>
        </div>
      )}

      <div
        ref={scrollRef}
        style={{ maxHeight: '68vh', overflow: 'auto', border: '1px solid #d9d9d9', background: '#f5f5f5', padding: 8 }}
      >
        <div
          ref={wrapRef}
          style={{
            position: 'relative', margin: '0 auto', userSelect: 'none',
            width: pageSize.w || 'auto', maxWidth: '100%'
          }}
        >
          {kind === 'pdf'
            ? <canvas ref={canvasRef} style={{ display: 'block', background: '#fff' }} />
            : <img ref={imgRef} src={imageUrl} alt="Invoice" onLoad={onImageLoad}
                   style={{ display: 'block', width: containerWidth, maxWidth: '100%', background: '#fff' }} />}

          {showBox && (
            <div
              onPointerDown={startDrag('sig')}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              style={{
                position: 'absolute',
                left: `${placement.x * 100}%`,
                top: `${placement.y * 100}%`,
                width: `${placement.w * 100}%`,
                height: `${heightFraction(placement.w) * 100}%`,
                border: selected === 'sig' ? '2px dashed #1677ff' : '2px dashed #bcd7ff',
                background: 'rgba(22,119,255,0.06)',
                cursor: disabled ? 'default' : 'grab',
                touchAction: 'none'
              }}
            >
              <img src={signatureUrl} alt="Your signature" draggable={false}
                   style={{ width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none' }} />

              {/* resize handle */}
              <div
                onPointerDown={onHandleDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                title="Drag to resize"
                style={{
                  position: 'absolute', right: -7, bottom: -7, width: 14, height: 14,
                  background: '#1677ff', border: '2px solid #fff', borderRadius: 3,
                  cursor: 'nwse-resize', touchAction: 'none'
                }}
              />
            </div>
          )}

          {textBox('name', nameStamp, displayName)}
          {textBox('date', dateStamp, formatToday())}
        </div>
      </div>
    </div>
  );
};

export default InlineSignaturePlacer;

import React, { useRef, useState, useEffect } from 'react';
import { Modal, Button, Space, Typography, Tabs, Input } from 'antd';
import { ClearOutlined, CheckOutlined } from '@ant-design/icons';

const { Text } = Typography;

// A self-contained signature pad: draw with mouse/touch, or type-and-style
// as a fallback for accessibility / no-touch devices. Exports a transparent
// PNG data URL sized to fit the target field, consumed by pdfSigningService
// on the backend (drawImage with aspect-fit).
const SignatureCanvas = ({ fieldType, onSave, onCancel }) => {
  const canvasRef = useRef(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef(null);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [mode, setMode] = useState('draw'); // 'draw' | 'type'
  const [typedText, setTypedText] = useState('');

  const label = fieldType === 'initials' ? 'initials' : 'signature';

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, [mode]);

  const getPoint = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const startDraw = (e) => {
    e.preventDefault();
    isDrawingRef.current = true;
    lastPointRef.current = getPoint(e);
  };

  const draw = (e) => {
    if (!isDrawingRef.current) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext('2d');
    const point = getPoint(e);
    ctx.beginPath();
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    lastPointRef.current = point;
    if (!hasDrawn) setHasDrawn(true);
  };

  const endDraw = () => { isDrawingRef.current = false; };

  const handleClear = () => {
    const canvas = canvasRef.current;
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const handleSave = () => {
    if (mode === 'draw') {
      if (!hasDrawn) return;
      onSave(canvasRef.current.toDataURL('image/png'));
    } else {
      if (!typedText.trim()) return;
      // Render typed text onto an offscreen canvas in a cursive-ish font
      const offCanvas = document.createElement('canvas');
      offCanvas.width = 400;
      offCanvas.height = 120;
      const ctx = offCanvas.getContext('2d');
      ctx.clearRect(0, 0, offCanvas.width, offCanvas.height);
      ctx.font = `48px "Brush Script MT", "Segoe Script", cursive`;
      ctx.fillStyle = '#1a1a1a';
      ctx.textBaseline = 'middle';
      ctx.fillText(typedText.trim(), 16, offCanvas.height / 2);
      onSave(offCanvas.toDataURL('image/png'));
    }
  };

  return (
    <Modal
      title={`Add your ${label}`}
      open
      onCancel={onCancel}
      footer={null}
      width={480}
      destroyOnClose
    >
      <Tabs
        activeKey={mode}
        onChange={setMode}
        items={[
          {
            key: 'draw', label: 'Draw',
            children: (
              <Space direction="vertical" style={{ width: '100%' }}>
                <canvas
                  ref={canvasRef}
                  width={420}
                  height={fieldType === 'initials' ? 140 : 160}
                  style={{ border: '1px dashed #d9d9d9', borderRadius: 4, width: '100%', touchAction: 'none', cursor: 'crosshair', background: 'white' }}
                  onMouseDown={startDraw}
                  onMouseMove={draw}
                  onMouseUp={endDraw}
                  onMouseLeave={endDraw}
                  onTouchStart={startDraw}
                  onTouchMove={draw}
                  onTouchEnd={endDraw}
                />
                <Text type="secondary" style={{ fontSize: 12 }}>Draw with your mouse or finger above.</Text>
              </Space>
            )
          },
          {
            key: 'type', label: 'Type',
            children: (
              <Space direction="vertical" style={{ width: '100%' }}>
                <Input
                  size="large"
                  placeholder={`Type your ${label}`}
                  value={typedText}
                  onChange={(e) => setTypedText(e.target.value)}
                />
                {typedText.trim() && (
                  <div style={{ border: '1px dashed #d9d9d9', borderRadius: 4, padding: 16, textAlign: 'center' }}>
                    <span style={{ fontFamily: '"Brush Script MT", "Segoe Script", cursive', fontSize: 36 }}>{typedText}</span>
                  </div>
                )}
              </Space>
            )
          }
        ]}
      />

      <Space style={{ width: '100%', justifyContent: 'space-between', marginTop: 16 }}>
        {mode === 'draw' ? (
          <Button icon={<ClearOutlined />} onClick={handleClear}>Clear</Button>
        ) : <span />}
        <Space>
          <Button onClick={onCancel}>Cancel</Button>
          <Button
            type="primary" icon={<CheckOutlined />}
            disabled={mode === 'draw' ? !hasDrawn : !typedText.trim()}
            onClick={handleSave}
          >
            Use this {label}
          </Button>
        </Space>
      </Space>
    </Modal>
  );
};

export default SignatureCanvas;
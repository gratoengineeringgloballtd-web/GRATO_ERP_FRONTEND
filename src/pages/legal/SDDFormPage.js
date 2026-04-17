// pages/legal/SDDFormPage.js
// Renders the full SDD questionnaire section by section with autosave.
import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Alert, Button, Card, Col, Divider, Form, Input, InputNumber,
  message, Progress, Row, Select, Space, Spin, Switch, Tag, Typography
} from 'antd';
import { ArrowLeftOutlined, CheckOutlined, SaveOutlined, SendOutlined } from '@ant-design/icons';
import { legalAPI } from '../../services/api';

const { Title, Text } = Typography;

const SECTION_LABELS = {
  general_info:             'General information',
  legal_regulatory:         'Legal & regulatory',
  technical_evaluation:     'Technical evaluation',
  governance:               'Business governance',
  'hsse.quality_assurance': 'HSSE — Quality assurance',
  'hsse.hse_policy':        'HSSE — HSE policy',
  'hsse.safety_performance':'HSSE — Safety performance',
  'hsse.environmental':     'HSSE — Environmental',
  'hsse.emergency':         'HSSE — Emergency preparedness'
};

const SECTION_ORDER = Object.keys(SECTION_LABELS);

// Single question renderer
const QuestionField = ({ answer, onChange }) => {
  if (!answer) return null;
  const { questionText, questionKey, answer: value, answerText, notApplicable } = answer;

  // Detect type from the template (we encode it in the question text pattern)
  const isBoolean = questionText.toLowerCase().includes('?') && !questionText.toLowerCase().includes('please state') && !questionText.toLowerCase().includes('list ') && !questionText.toLowerCase().includes('what arrangements');
  const isTextarea = questionText.toLowerCase().includes('list ') || questionText.toLowerCase().includes('what arrangements') || questionText.toLowerCase().includes('manual input');
  const isNumber   = questionText.toLowerCase().includes('number of') || questionText.toLowerCase().includes('frequency') || questionText.toLowerCase().includes('rate (%)') || questionText.toLowerCase().includes('year 1') || questionText.toLowerCase().includes('year 2') || questionText.toLowerCase().includes('year 3');
  const isFile     = questionText.toLowerCase().includes('(attach)') || questionText.toLowerCase().includes('attach copy') || questionText.toLowerCase().includes('attach evidence');
  const isDate     = questionKey.includes('_date');

  return (
    <div style={{ padding: '10px 0', borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
      <Row align="middle" gutter={16}>
        <Col flex="auto">
          <Text style={{ fontSize: 13 }}>{questionText}</Text>
        </Col>
        <Col>
          <Space>
            <Text type="secondary" style={{ fontSize: 11 }}>N/A</Text>
            <Switch
              size="small"
              checked={notApplicable}
              onChange={v => onChange({ notApplicable: v, answer: v ? null : value })}
            />
          </Space>
        </Col>
      </Row>

      {!notApplicable && (
        <div style={{ marginTop: 8 }}>
          {isFile ? (
            <Input
              placeholder="Paste Cloudinary URL or document link"
              value={answerText || ''}
              size="small"
              style={{ maxWidth: 400 }}
              onChange={e => onChange({ answerText: e.target.value, answer: !!e.target.value })}
            />
          ) : isNumber ? (
            <InputNumber
              size="small"
              min={0}
              value={value}
              onChange={v => onChange({ answer: v })}
              style={{ width: 120 }}
            />
          ) : isDate ? (
            <Input
              type="date"
              size="small"
              value={value || ''}
              style={{ width: 160 }}
              onChange={e => onChange({ answer: e.target.value })}
            />
          ) : isTextarea ? (
            <Input.TextArea
              rows={3}
              size="small"
              value={answerText || ''}
              onChange={e => onChange({ answerText: e.target.value, answer: !!e.target.value })}
              style={{ maxWidth: 500 }}
            />
          ) : isBoolean ? (
            <Space>
              {['Yes', 'No'].map(opt => (
                <Button
                  key={opt}
                  size="small"
                  type={value === (opt === 'Yes') ? 'primary' : 'default'}
                  style={value === (opt === 'Yes') ? {} : {}}
                  onClick={() => onChange({ answer: opt === 'Yes' })}
                >
                  {opt}
                </Button>
              ))}
            </Space>
          ) : (
            <Input
              size="small"
              value={answerText || ''}
              style={{ maxWidth: 400 }}
              onChange={e => onChange({ answerText: e.target.value, answer: !!e.target.value })}
            />
          )}
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
const SDDFormPage = ({ sddId, onBack }) => {
  const [record,      setRecord]      = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [activeSection, setActiveSection] = useState(SECTION_ORDER[0]);
  const [dirty,       setDirty]       = useState(false);
  const autosaveTimer = useRef(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const r = await legalAPI.getSDDRecord(sddId);
      setRecord(r.data);
    } catch { message.error('Failed to load SDD record'); }
    finally { setLoading(false); }
  }, [sddId]);

  useEffect(() => { load(); }, [load]);

  // Autosave 3 seconds after last change
  useEffect(() => {
    if (!dirty || !record) return;
    clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => { handleSave(true); }, 3000);
    return () => clearTimeout(autosaveTimer.current);
  }, [dirty, record]);

  const handleAnswerChange = (sectionKey, questionKey, changes) => {
    setRecord(prev => {
      const updated = { ...prev };
      updated.answers = (prev.answers || []).map(a => {
        if (a.sectionKey === sectionKey && a.questionKey === questionKey) {
          return { ...a, ...changes };
        }
        return a;
      });
      return updated;
    });
    setDirty(true);
  };

  const handleSave = async (silent = false) => {
    if (!record) return;
    try {
      setSaving(true);
      const r = await legalAPI.saveSDDAnswers(sddId, record.answers, record.unmetCriticalPoints);
      setRecord(prev => ({
        ...prev,
        score: r.score,
        scoreBySection: r.scoreBySection,
        answeredQuestions: r.answeredQuestions,
        totalQuestions: r.totalQuestions
      }));
      setDirty(false);
      if (!silent) message.success('Saved');
    } catch (e) { message.error(e.response?.data?.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  const handleSubmit = async () => {
    await handleSave(true);
    try {
      await legalAPI.submitSDD(sddId, { submittedByName: 'Current User' });
      message.success('SDD submitted for review');
      await load();
    } catch (e) { message.error(e.response?.data?.message || 'Submit failed'); }
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}><Spin /></div>;
  if (!record) return null;

  const sectionAnswers = (sectionKey) =>
    (record.answers || []).filter(a => a.sectionKey === sectionKey);

  const sectionScore = (sectionKey) => {
    const s = record.scoreBySection?.[sectionKey];
    return s ? s.score : 0;
  };

  const totalProgress = record.totalQuestions > 0
    ? Math.round((record.answeredQuestions / record.totalQuestions) * 100)
    : 0;

  const isReadOnly = !['draft'].includes(record.status);

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={onBack}>Back to SDD list</Button>
            <Title level={4} style={{ margin: 0 }}>
              {record.referenceNumber} — {record.sddType === 'internal' ? 'Internal SDD' : `Supplier SDD: ${record.supplierDetails?.name || 'unnamed'}`}
            </Title>
            <Tag color={record.status === 'approved' ? 'green' : record.status === 'rejected' ? 'red' : record.status === 'submitted' ? 'blue' : 'default'}>
              {record.status}
            </Tag>
          </Space>
        </Col>
        <Col>
          <Space>
            {dirty && <Text type="secondary" style={{ fontSize: 12 }}>Unsaved changes…</Text>}
            {saving && <Text type="secondary" style={{ fontSize: 12 }}>Saving…</Text>}
            {!isReadOnly && <Button icon={<SaveOutlined />} onClick={() => handleSave(false)} loading={saving}>Save</Button>}
            {!isReadOnly && record.status === 'draft' && (
              <Button type="primary" icon={<SendOutlined />} onClick={handleSubmit}>Submit for review</Button>
            )}
          </Space>
        </Col>
      </Row>

      {/* Score summary */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Row gutter={24} align="middle">
          <Col span={6}>
            <Progress type="circle" percent={record.score} size={80}
              strokeColor={record.score >= 80 ? '#52c41a' : record.score >= 60 ? '#faad14' : '#ff4d4f'} />
          </Col>
          <Col span={6}>
            <Text type="secondary" style={{ fontSize: 12 }}>Overall score</Text>
            <div><Text strong style={{ fontSize: 20 }}>{record.score}%</Text></div>
          </Col>
          <Col span={6}>
            <Text type="secondary" style={{ fontSize: 12 }}>Completion</Text>
            <Progress percent={totalProgress} size="small" />
            <Text style={{ fontSize: 12 }}>{record.answeredQuestions} / {record.totalQuestions} answered</Text>
          </Col>
          <Col span={6}>
            <Space direction="vertical" size={0}>
              <Text style={{ fontSize: 12 }}>Yes: <Text strong>{record.yesCount}</Text></Text>
              <Text style={{ fontSize: 12 }}>No:  <Text strong>{record.noCount}</Text></Text>
              <Text style={{ fontSize: 12 }}>N/A: <Text strong>{record.naCount}</Text></Text>
            </Space>
          </Col>
        </Row>
      </Card>

      {isReadOnly && (
        <Alert type="info" showIcon style={{ marginBottom: 16 }}
          message={`This SDD is ${record.status} and cannot be edited. ${record.reviewerNotes ? 'Reviewer notes: ' + record.reviewerNotes : ''}`} />
      )}

      {/* Section navigation + content */}
      <Row gutter={16}>
        {/* Left nav */}
        <Col span={5}>
          <Card size="small" title="Sections" bodyStyle={{ padding: 0 }}>
            {SECTION_ORDER.map(key => {
              const answers = sectionAnswers(key);
              if (answers.length === 0) return null;
              const score = sectionScore(key);
              return (
                <div key={key}
                  onClick={() => setActiveSection(key)}
                  style={{
                    padding: '8px 12px',
                    cursor: 'pointer',
                    background: activeSection === key ? 'var(--color-background-secondary)' : 'transparent',
                    borderLeft: activeSection === key ? '3px solid var(--color-border-info)' : '3px solid transparent'
                  }}>
                  <Text style={{ fontSize: 12, display: 'block' }}>{SECTION_LABELS[key]}</Text>
                  <Progress percent={score} size="small" showInfo={false}
                    strokeColor={score >= 80 ? '#52c41a' : score >= 60 ? '#faad14' : '#ff4d4f'} />
                  <Text type="secondary" style={{ fontSize: 11 }}>{score}%</Text>
                </div>
              );
            })}
          </Card>
        </Col>

        {/* Questions */}
        <Col span={19}>
          <Card title={SECTION_LABELS[activeSection]}
            extra={<Text type="secondary" style={{ fontSize: 12 }}>Score: {sectionScore(activeSection)}%</Text>}>

            {/* Special field for unmet critical points (technical evaluation) */}
            {activeSection === 'technical_evaluation' && (
              <>
                {sectionAnswers(activeSection).map(answer => (
                  <QuestionField key={answer.questionKey} answer={answer}
                    onChange={changes => !isReadOnly && handleAnswerChange(activeSection, answer.questionKey, changes)} />
                ))}
                <Divider plain>Unmet critical points</Divider>
                <Input.TextArea
                  rows={4}
                  placeholder="List any critical requirements that are not met (one per line)"
                  value={(record.unmetCriticalPoints || []).join('\n')}
                  disabled={isReadOnly}
                  onChange={e => {
                    const lines = e.target.value.split('\n').filter(Boolean);
                    setRecord(prev => ({ ...prev, unmetCriticalPoints: lines }));
                    setDirty(true);
                  }}
                />
              </>
            )}

            {activeSection !== 'technical_evaluation' && sectionAnswers(activeSection).map(answer => (
              <QuestionField key={answer.questionKey} answer={answer}
                onChange={changes => !isReadOnly && handleAnswerChange(activeSection, answer.questionKey, changes)} />
            ))}

            {/* Section navigation buttons */}
            <Row justify="space-between" style={{ marginTop: 20 }}>
              <Col>
                {SECTION_ORDER.indexOf(activeSection) > 0 && (
                  <Button onClick={() => setActiveSection(SECTION_ORDER[SECTION_ORDER.indexOf(activeSection) - 1])}>
                    Previous section
                  </Button>
                )}
              </Col>
              <Col>
                {SECTION_ORDER.indexOf(activeSection) < SECTION_ORDER.length - 1 && (
                  <Button type="primary" onClick={() => setActiveSection(SECTION_ORDER[SECTION_ORDER.indexOf(activeSection) + 1])}>
                    Next section
                  </Button>
                )}
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default SDDFormPage;
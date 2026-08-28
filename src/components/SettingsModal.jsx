import { useEffect, useState } from 'react';
import { Plus, Trash2, Download, Upload, RotateCcw, Save } from 'lucide-react';
import Modal from './Modal.jsx';
import { normalizeGradeScale, validateGradeScale } from '../utils/gradeCalculations.js';
import { DEFAULT_GRADE_SCALE } from '../data/defaultGradeScale.js';

let gradeCounter = 0;
const gradeId = () => globalThis.crypto?.randomUUID?.() ?? `grade-${Date.now()}-${gradeCounter++}`;

export default function SettingsModal({
  open,
  onClose,
  gradeScale,
  onSaveGradeScale,
  settings,
  setSettings,
  onExportData,
  onImportClick,
  onResetGradeScale,
  onDeleteAll
}) {
  const [draftScale, setDraftScale] = useState(() => gradeScale.map((g) => ({ ...g })));

  useEffect(() => {
    if (open) setDraftScale(gradeScale.map((g) => ({ ...g })));
  }, [open, gradeScale]);

  const validation = validateGradeScale(draftScale);
  const updateGrade = (id, field, value) => {
    setDraftScale((current) => current.map((g) => g.id === id ? { ...g, [field]: value } : g));
  };

  const saveScale = () => {
    if (!validation.valid) return;
    onSaveGradeScale(normalizeGradeScale(draftScale));
  };

  const resetExample = () => {
    const next = DEFAULT_GRADE_SCALE.map((g) => ({ ...g }));
    setDraftScale(next);
    onResetGradeScale(next);
  };

  return (
    <Modal open={open} title="Grade & data settings" onClose={onClose} wide>
      <div className="settings-grid">
        <section className="settings-section">
          <div className="section-heading compact-heading"><div><h3>Grade scale</h3><p>Edit a draft, then save it. Invalid or duplicate thresholds never replace the active scale.</p></div></div>
          <div className="grade-editor">
            {draftScale.map((grade) => (
              <div className="grade-editor-row" key={grade.id}>
                <input aria-label={`Grade label ${grade.label || 'unnamed'}`} value={grade.label} onChange={(e) => updateGrade(grade.id, 'label', e.target.value)} />
                <label><span>Minimum %</span><input aria-label={`${grade.label || 'Grade'} minimum percentage`} type="number" min="0" max="100" step="any" value={grade.min} onChange={(e) => updateGrade(grade.id, 'min', e.target.value)} /></label>
                <button className="icon-button danger-quiet" type="button" onClick={() => setDraftScale((current) => current.filter((g) => g.id !== grade.id))} aria-label={`Remove ${grade.label || 'grade'}`}><Trash2 size={16} /></button>
              </div>
            ))}
          </div>
          {!validation.valid && <div className="inline-alert danger" role="alert">{validation.message}</div>}
          {validation.valid && <div className="inline-alert success">Valid scale. Thresholds are ordered from highest to lowest when saved.</div>}
          <div className="row-actions settings-actions">
            <button className="button secondary" type="button" onClick={() => setDraftScale((current) => [...current, { id: gradeId(), label: 'New', min: 0 }])}><Plus size={16} /> Add Grade</button>
            <button className="button primary" type="button" disabled={!validation.valid} onClick={saveScale}><Save size={16} /> Save Grade Scale</button>
            <button className="button ghost" type="button" onClick={resetExample}><RotateCcw size={16} /> Reset Example Scale</button>
          </div>
        </section>

        <section className="settings-section">
          <h3>Mark precision</h3>
          <p className="helper-copy">Required raw marks preserve full precision internally. Choose how the display handles marks.</p>
          <label className="toggle-row"><span><strong>Whole-number raw marks</strong><small>Round required raw marks upward with Math.ceil.</small></span><input type="checkbox" checked={Boolean(settings.wholeRawMarks)} onChange={(e) => setSettings((s) => ({ ...s, wholeRawMarks: e.target.checked }))} /></label>
          <label className="field-block"><span>Decimal display precision</span><select value={settings.precision} onChange={(e) => setSettings((s) => ({ ...s, precision: Number(e.target.value) }))}><option value="0">0 decimals</option><option value="1">1 decimal</option><option value="2">2 decimals</option><option value="3">3 decimals</option></select></label>
        </section>

        <section className="settings-section">
          <h3>Backup & restore</h3>
          <p className="helper-copy">Export saved scenarios, grade scale, and settings as JSON. Imported data is schema-checked before replacement.</p>
          <div className="row-actions"><button className="button secondary" type="button" onClick={onExportData}><Download size={16} /> Export Data</button><button className="button ghost" type="button" onClick={onImportClick}><Upload size={16} /> Import Data</button></div>
        </section>

        <section className="settings-section danger-zone">
          <h3>Data controls</h3>
          <p className="helper-copy">Saved data exists only in this browser. Clearing browser storage can remove it.</p>
          <button className="button danger" type="button" onClick={onDeleteAll}>Delete All Saved Data</button>
        </section>
      </div>
    </Modal>
  );
}

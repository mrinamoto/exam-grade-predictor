import { Copy, Trash2, Upload, Pencil, GitCompareArrows } from 'lucide-react';

export default function SavedScenarios({ scenarios, selectedIds, onToggleCompare, onLoad, onDuplicate, onRename, onDelete }) {
  return (
    <section className="panel" id="saved-scenarios" aria-labelledby="scenario-heading">
      <div className="section-heading"><span className="eyebrow">Saved Scenarios</span><h2 id="scenario-heading">Compare planning assumptions</h2><p>Saved scenarios are mathematical planning snapshots, not official grades.</p></div>
      {!scenarios.length ? (
        <div className="empty-state"><div className="empty-icon"><GitCompareArrows size={24} /></div><h3>No scenarios saved yet</h3><p>Save your current plan to compare different pending-assessment assumptions later.</p></div>
      ) : (
        <div className="scenario-grid">
          {scenarios.map((scenario) => (
            <article className={`scenario-card ${selectedIds.includes(scenario.id) ? 'selected' : ''}`} key={scenario.id}>
              <div className="scenario-card-head"><div><span className="scenario-date">{new Date(scenario.dateSaved).toLocaleDateString()}</span><h3>{scenario.name}</h3><p>{scenario.courseCode || 'No course code'} · {scenario.courseName || 'Untitled Course'}</p></div><label className="compare-check"><input type="checkbox" checked={selectedIds.includes(scenario.id)} disabled={!selectedIds.includes(scenario.id) && selectedIds.length >= 3} onChange={() => onToggleCompare(scenario.id)} /><span>Compare</span></label></div>
              <div className="scenario-metrics"><span><small>Projected</small><strong>{scenario.projectedScore === null ? '—' : `${scenario.projectedScore.toFixed(2)}%`}</strong></span><span><small>Grade</small><strong>{scenario.projectedGrade || '—'}</strong></span><span><small>Target</small><strong>{scenario.targetLabel || '—'}</strong></span></div>
              <div className="scenario-actions"><button className="button mini secondary" onClick={() => onLoad(scenario)}><Upload size={14} /> Load</button><button className="icon-button" onClick={() => onDuplicate(scenario)} aria-label="Duplicate scenario"><Copy size={15} /></button><button className="icon-button" onClick={() => onRename(scenario)} aria-label="Rename scenario"><Pencil size={15} /></button><button className="icon-button danger-quiet" onClick={() => onDelete(scenario.id)} aria-label="Delete scenario"><Trash2 size={15} /></button></div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

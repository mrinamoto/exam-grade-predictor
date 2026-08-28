import { Plus, Trash2 } from 'lucide-react';
import { assessmentErrors } from '../utils/validation.js';
import { calculateAssessmentPercentage, calculateWeightedContribution } from '../utils/gradeCalculations.js';

function FieldError({ children }) {
  return children ? <div className="field-error">{children}</div> : null;
}

function DesktopRow({ assessment, onChange, onRemove }) {
  const errors = assessmentErrors(assessment);
  const percentage = assessment.status === 'completed' ? calculateAssessmentPercentage(assessment.score, assessment.maxScore) : null;
  const contribution = assessment.status === 'completed' ? calculateWeightedContribution(assessment.score, assessment.maxScore, assessment.weight) : null;
  return (
    <tr>
      <td><input aria-label="Assessment name" aria-invalid={Boolean(errors.name)} value={assessment.name} onChange={(e) => onChange('name', e.target.value)} /><FieldError>{errors.name}</FieldError></td>
      <td><input aria-label={`${assessment.name} score earned`} type="number" min="0" step="any" aria-invalid={Boolean(errors.score)} value={assessment.score} disabled={assessment.status === 'pending'} onChange={(e) => onChange('score', e.target.value)} placeholder="—" /><FieldError>{errors.score}</FieldError></td>
      <td><input aria-label={`${assessment.name} maximum score`} type="number" min="0.01" step="any" aria-invalid={Boolean(errors.maxScore)} value={assessment.maxScore} onChange={(e) => onChange('maxScore', e.target.value)} /><FieldError>{errors.maxScore}</FieldError></td>
      <td><input aria-label={`${assessment.name} weight`} type="number" min="0" max="100" step="any" aria-invalid={Boolean(errors.weight)} value={assessment.weight} onChange={(e) => onChange('weight', e.target.value)} /><FieldError>{errors.weight}</FieldError></td>
      <td><select aria-label={`${assessment.name} status`} value={assessment.status} onChange={(e) => onChange('status', e.target.value)}><option value="completed">Completed</option><option value="pending">Pending</option></select></td>
      <td className="numeric-cell">{percentage === null ? '—' : `${percentage.toFixed(2)}%`}</td>
      <td className="numeric-cell">{contribution === null ? '—' : contribution.toFixed(2)}</td>
      <td><button className="icon-button danger-quiet" onClick={onRemove} aria-label={`Remove ${assessment.name}`}><Trash2 size={17} /></button></td>
    </tr>
  );
}

function MobileCard({ assessment, onChange, onRemove }) {
  const errors = assessmentErrors(assessment);
  const percentage = assessment.status === 'completed' ? calculateAssessmentPercentage(assessment.score, assessment.maxScore) : null;
  const contribution = assessment.status === 'completed' ? calculateWeightedContribution(assessment.score, assessment.maxScore, assessment.weight) : null;
  return (
    <article className="assessment-card-mobile">
      <div className="mobile-card-title"><input aria-label="Assessment name" aria-invalid={Boolean(errors.name)} value={assessment.name} onChange={(e) => onChange('name', e.target.value)} /><button className="icon-button danger-quiet" onClick={onRemove} aria-label={`Remove ${assessment.name}`}><Trash2 size={17} /></button></div>
      <div className="mobile-input-grid">
        <label>Score<input type="number" min="0" step="any" aria-invalid={Boolean(errors.score)} value={assessment.score} disabled={assessment.status === 'pending'} onChange={(e) => onChange('score', e.target.value)} placeholder="Pending" /></label>
        <label>Max<input type="number" min="0.01" step="any" aria-invalid={Boolean(errors.maxScore)} value={assessment.maxScore} onChange={(e) => onChange('maxScore', e.target.value)} /></label>
        <label>Weight %<input type="number" min="0" max="100" step="any" aria-invalid={Boolean(errors.weight)} value={assessment.weight} onChange={(e) => onChange('weight', e.target.value)} /></label>
        <label>Status<select value={assessment.status} onChange={(e) => onChange('status', e.target.value)}><option value="completed">Completed</option><option value="pending">Pending</option></select></label>
      </div>
      {(errors.score || errors.maxScore || errors.weight || errors.name) && <div className="field-error">{errors.score || errors.maxScore || errors.weight || errors.name}</div>}
      <div className="mobile-metrics"><span><small>Percentage</small><strong>{percentage === null ? '—' : `${percentage.toFixed(2)}%`}</strong></span><span><small>Contribution</small><strong>{contribution === null ? '—' : contribution.toFixed(2)}</strong></span></div>
    </article>
  );
}

export default function AssessmentList({ assessments, onUpdate, onAdd, onRequestRemove }) {
  return (
    <section className="panel" aria-labelledby="assessment-heading">
      <div className="section-heading split">
        <div><span className="eyebrow">Assessment Breakdown</span><h2 id="assessment-heading">Build your course model</h2><p>Scores, maximum marks, and weights stay editable. Pending rows are used by the planner.</p></div>
        <button className="button secondary" onClick={onAdd}><Plus size={17} /> Add Assessment</button>
      </div>
      <div className="desktop-assessment-table table-scroll">
        <table className="data-table">
          <thead><tr><th>Assessment</th><th>Score</th><th>Max</th><th>Weight %</th><th>Status</th><th>%</th><th>Contribution</th><th></th></tr></thead>
          <tbody>{assessments.map((a) => <DesktopRow key={a.id} assessment={a} onChange={(field, value) => onUpdate(a.id, field, value)} onRemove={() => onRequestRemove(a.id)} />)}</tbody>
        </table>
      </div>
      <div className="mobile-assessment-list">{assessments.map((a) => <MobileCard key={a.id} assessment={a} onChange={(field, value) => onUpdate(a.id, field, value)} onRemove={() => onRequestRemove(a.id)} />)}</div>
    </section>
  );
}

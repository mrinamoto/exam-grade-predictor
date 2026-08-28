export default function ScenarioComparison({ scenarios, selectedIds }) {
  const selected = selectedIds.map((id) => scenarios.find((s) => s.id === id)).filter(Boolean);
  if (selected.length < 2) return null;
  return (
    <section className="panel" aria-labelledby="comparison-heading">
      <div className="section-heading"><span className="eyebrow">Scenario Comparison</span><h2 id="comparison-heading">Side-by-side outcomes</h2><p>Select up to three saved scenarios. Each card keeps the grade-scale snapshot used when it was saved.</p></div>
      <div className="comparison-grid">
        {selected.map((s) => <article className="comparison-card" key={s.id}><h3>{s.name}</h3><dl><div><dt>Projected Score</dt><dd>{s.projectedScore === null ? '—' : `${s.projectedScore.toFixed(2)}%`}</dd></div><div><dt>Letter Grade</dt><dd>{s.projectedGrade || '—'}</dd></div><div><dt>Pass Status</dt><dd>{s.passStatus || '—'}</dd></div><div><dt>Target</dt><dd>{s.targetLabel || '—'}</dd></div><div><dt>Target Difference</dt><dd>{s.targetDifference === null ? '—' : `${s.targetDifference >= 0 ? '+' : ''}${s.targetDifference.toFixed(2)} pts`}</dd></div><div><dt>Saved Assumptions</dt><dd>{s.assumptionsSummary || s.finalAssumption || '—'}</dd></div></dl></article>)}
      </div>
    </section>
  );
}

import { RotateCcw, Sparkles } from 'lucide-react';
import { meetsThreshold } from '../utils/gradeCalculations.js';

const PRESETS = [50, 60, 70, 80, 90, 100];

export default function WhatIfSimulator({ pending, simulations, setSimulation, reset, projectedScore, projectedGrade, target, passMark, allKnown }) {
  if (!pending.length) {
    return <section className="panel"><div className="section-heading"><span className="eyebrow">What-If Simulator</span><h2>No pending assessments</h2><p>Mark an assessment as Pending to simulate future performance without changing actual results.</p></div></section>;
  }

  return (
    <section className="panel accent-panel" aria-labelledby="whatif-heading">
      <div className="section-heading split">
        <div><span className="eyebrow">What-If Simulator</span><h2 id="whatif-heading">Test future score combinations</h2><p>Simulations stay separate from completed marks. Changing status never silently converts a prediction into an actual result.</p></div>
        <button className="button ghost" type="button" onClick={reset}><RotateCcw size={16} /> Reset What-If</button>
      </div>
      <div className="simulator-list">
        {pending.map((a) => {
          const value = simulations[a.id] ?? '';
          return (
            <div className="simulator-row" key={a.id}>
              <div className="simulator-label"><strong>{a.name}</strong><span>{a.weight}% of course · max {a.maxScore}</span></div>
              <div className="slider-wrap">
                <input aria-label={`${a.name} what-if score percentage`} aria-valuetext={value === '' ? 'No simulation entered; slider position 0 percent' : `${value}% simulated score`} type="range" min="0" max="100" step="1" value={value === '' ? 0 : value} onChange={(e) => setSimulation(a.id, e.target.value)} />
                <div className="slider-scale" aria-hidden="true"><span>0</span><span>50</span><span>100</span></div>
              </div>
              <label className="percent-input"><span>What-If %</span><input type="number" min="0" max="100" step="any" value={value} placeholder="—" onChange={(e) => setSimulation(a.id, e.target.value)} /></label>
              <div className="preset-row" aria-label={`${a.name} what-if presets`}>{PRESETS.map((preset) => <button type="button" key={preset} className="preset-chip" aria-pressed={Number(value) === preset && value !== ''} onClick={() => setSimulation(a.id, preset)}>{preset}%</button>)}</div>
            </div>
          );
        })}
      </div>
      <div className="simulation-result" aria-live="polite">
        <div><span className="eyebrow"><Sparkles size={14} /> Scenario result</span><strong>{allKnown ? `${projectedScore.toFixed(2)}%` : 'Complete pending assumptions'}</strong><small>{allKnown ? `${projectedGrade} · ${meetsThreshold(projectedScore, passMark) ? 'Pass' : 'Fail'}${target !== null ? ` · ${meetsThreshold(projectedScore, target) ? 'Target reached' : `${(target - projectedScore).toFixed(2)} pts below target`}` : ''}` : 'Every pending assessment needs a What-If percentage and total weight must be exactly 100%.'}</small></div>
      </div>
    </section>
  );
}

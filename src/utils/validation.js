import { EPSILON } from './gradeCalculations.js';

export function assessmentErrors(a) {
  const errors = {};
  if (!String(a.name ?? '').trim()) errors.name = 'Assessment name is required.';
  const max = Number(a.maxScore);
  if (!Number.isFinite(max) || max <= 0) errors.maxScore = 'Maximum score must be greater than 0.';
  const weight = Number(a.weight);
  if (!Number.isFinite(weight) || weight < 0 || weight > 100) errors.weight = 'Weight must be between 0 and 100.';
  if (a.status === 'completed') {
    const score = Number(a.score);
    if (a.score === '' || !Number.isFinite(score) || score < 0) errors.score = 'Enter a valid score of 0 or higher.';
    else if (Number.isFinite(max) && score > max + EPSILON) errors.score = 'Score cannot exceed maximum marks.';
  }
  return errors;
}

export function hasErrors(errorObject) {
  return Object.keys(errorObject).length > 0;
}

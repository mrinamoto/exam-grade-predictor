export const EPSILON = 1e-9;

const num = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const clamp = (value, min = 0, max = 100) => Math.min(max, Math.max(min, value));
export const approximatelyEqual = (a, b, epsilon = EPSILON) => Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= epsilon;

export function isValidAssessment(a, { requireScore = false } = {}) {
  const max = num(a?.maxScore);
  const weight = num(a?.weight);
  const score = num(a?.score);
  if (!a?.name?.trim()) return false;
  if (max === null || max <= 0) return false;
  if (weight === null || weight < 0 || weight > 100) return false;
  if (requireScore || a?.status === 'completed') {
    if (score === null || score < 0 || score > max + EPSILON) return false;
  }
  return a?.status === 'completed' || a?.status === 'pending';
}

export function calculateAssessmentPercentage(score, maxScore) {
  const s = num(score);
  const m = num(maxScore);
  if (s === null || m === null || m <= 0 || s < 0 || s > m + EPSILON) return null;
  return (Math.min(s, m) / m) * 100;
}

export function calculateWeightedContribution(score, maxScore, weight) {
  const percentage = calculateAssessmentPercentage(score, maxScore);
  const w = num(weight);
  if (percentage === null || w === null || w < 0 || w > 100) return null;
  return (percentage * w) / 100;
}

export function getCompletedAssessments(assessments = []) {
  return assessments.filter((a) => a.status === 'completed' && isValidAssessment(a, { requireScore: true }));
}

export function getPendingAssessments(assessments = []) {
  return assessments.filter((a) => a.status === 'pending' && isValidAssessment(a));
}

export function calculateCoursePoints(assessments) {
  return getCompletedAssessments(assessments).reduce((sum, a) => {
    return sum + (calculateWeightedContribution(a.score, a.maxScore, a.weight) ?? 0);
  }, 0);
}

export function calculateCompletedWeight(assessments) {
  return getCompletedAssessments(assessments).reduce((sum, a) => sum + Number(a.weight), 0);
}

export function calculatePendingWeight(assessments) {
  return getPendingAssessments(assessments).reduce((sum, a) => sum + Number(a.weight), 0);
}

export function calculateTotalWeight(assessments = []) {
  return assessments.reduce((sum, a) => {
    const w = num(a.weight);
    return sum + (w !== null && w >= 0 ? w : 0);
  }, 0);
}

export function calculateCurrentAverage(assessments) {
  const points = calculateCoursePoints(assessments);
  const weight = calculateCompletedWeight(assessments);
  return weight > EPSILON ? (points / weight) * 100 : null;
}

export function calculateProjectedScore(assessments, simulations = {}) {
  let total = 0;
  let representedWeight = 0;
  let allKnown = true;

  for (const a of assessments) {
    if (!isValidAssessment(a)) {
      allKnown = false;
      continue;
    }

    const weight = Number(a.weight);
    representedWeight += weight;

    if (a.status === 'completed') {
      const contribution = calculateWeightedContribution(a.score, a.maxScore, weight);
      if (contribution === null) allKnown = false;
      else total += contribution;
      continue;
    }

    const simulatedPercentage = num(simulations[a.id]);
    if (simulatedPercentage === null || simulatedPercentage < 0 || simulatedPercentage > 100) {
      allKnown = false;
    } else {
      total += (simulatedPercentage * weight) / 100;
    }
  }

  return { score: total, representedWeight, allKnown };
}

export function calculateRequiredRemainingAverage(coursePoints, remainingWeight, target) {
  const k = num(coursePoints);
  const r = num(remainingWeight);
  const g = num(target);
  if (k === null || r === null || g === null || r <= EPSILON) return null;
  return ((g - k) / r) * 100;
}

export function calculateRequiredAssessmentScore({
  coursePoints,
  target,
  targetAssessment,
  pendingAssessments,
  simulations = {}
}) {
  if (!targetAssessment || targetAssessment.status !== 'pending' || !isValidAssessment(targetAssessment)) return null;
  const targetWeight = num(targetAssessment.weight);
  const g = num(target);
  const k = num(coursePoints);
  if (targetWeight === null || targetWeight <= EPSILON || g === null || k === null) return null;

  let assumedPoints = 0;
  const missingAssumptions = [];
  for (const a of pendingAssessments) {
    if (a.id === targetAssessment.id) continue;
    if (!isValidAssessment(a)) {
      missingAssumptions.push(a.id);
      continue;
    }
    const sim = num(simulations[a.id]);
    if (sim === null || sim < 0 || sim > 100) {
      missingAssumptions.push(a.id);
      continue;
    }
    assumedPoints += (sim * Number(a.weight)) / 100;
  }

  if (missingAssumptions.length) {
    return { requiredPercent: null, preciseRaw: null, assumedPoints, missingAssumptions };
  }

  let requiredPercent = ((g - k - assumedPoints) / targetWeight) * 100;
  if (approximatelyEqual(requiredPercent, 0)) requiredPercent = 0;
  if (approximatelyEqual(requiredPercent, 100)) requiredPercent = 100;

  const maxScore = num(targetAssessment.maxScore);
  const preciseRaw = maxScore !== null && maxScore > 0 ? (requiredPercent / 100) * maxScore : null;
  return { requiredPercent, preciseRaw, assumedPoints, missingAssumptions: [] };
}

export function calculateRequiredRawMark(requiredPercent, maxScore, { wholeMarks = true, precision = 2 } = {}) {
  const required = num(requiredPercent);
  const max = num(maxScore);
  if (required === null || max === null || max <= 0 || required < 0 || required > 100 + EPSILON) return null;
  const precise = (Math.min(100, required) / 100) * max;
  if (wholeMarks) return Math.ceil(precise - EPSILON);
  const digits = Number.isInteger(precision) && precision >= 0 && precision <= 10 ? precision : 2;
  return Number(precise.toFixed(digits));
}

export function meetsThreshold(score, threshold) {
  const s = num(score);
  const t = num(threshold);
  return s !== null && t !== null && s + EPSILON >= t;
}

export function calculateBestPossibleScore(assessments) {
  const current = calculateCoursePoints(assessments);
  const pendingWeight = calculatePendingWeight(assessments);
  return clamp(current + pendingWeight, 0, 100);
}

export function calculateMinimumMathematicalOutcome(assessments) {
  return clamp(calculateCoursePoints(assessments), 0, 100);
}

export function normalizeGradeScale(scale) {
  if (!Array.isArray(scale)) return [];
  return scale
    .map((g, index) => ({
      id: String(g.id ?? `grade-${index}`),
      label: String(g.label ?? '').trim(),
      min: Number(g.min)
    }))
    .filter((g) => g.label && Number.isFinite(g.min) && g.min >= 0 && g.min <= 100)
    .sort((a, b) => b.min - a.min);
}

export function validateGradeScale(scale) {
  if (!Array.isArray(scale) || !scale.length) return { valid: false, message: 'Add at least one grade threshold.' };
  const normalized = normalizeGradeScale(scale);
  if (normalized.length !== scale.length) return { valid: false, message: 'Every grade needs a label and a minimum from 0 to 100.' };
  const labels = normalized.map((g) => g.label.toLowerCase());
  if (new Set(labels).size !== labels.length) return { valid: false, message: 'Grade labels must be unique.' };
  const mins = normalized.map((g) => g.min);
  if (new Set(mins).size !== mins.length) return { valid: false, message: 'Grade thresholds must be unique.' };
  if (!mins.some((min) => approximatelyEqual(min, 0))) return { valid: false, message: 'Include a lowest grade threshold at 0% so every possible score has a grade.' };
  return { valid: true, message: '' };
}

export function getLetterGrade(score, scale) {
  const n = num(score);
  if (n === null) return '—';
  const normalized = normalizeGradeScale(scale);
  const match = normalized.find((g) => n + EPSILON >= g.min);
  return match?.label ?? '—';
}

export function getTargetPercentage({ targetType, targetPercentage, targetGrade, gradeScale }) {
  if (targetType === 'grade') {
    const grade = normalizeGradeScale(gradeScale).find((g) => g.label === targetGrade);
    return grade ? grade.min : null;
  }
  const target = num(targetPercentage);
  return target !== null && target >= 0 && target <= 100 ? target : null;
}

export function calculateGradePossibilities(assessments, gradeScale) {
  const coursePoints = calculateCoursePoints(assessments);
  const remainingWeight = calculatePendingWeight(assessments);
  return normalizeGradeScale(gradeScale).map((grade) => {
    if (remainingWeight <= EPSILON) {
      return { ...grade, required: null, status: coursePoints + EPSILON >= grade.min ? 'secured' : 'not-reachable' };
    }

    let required = calculateRequiredRemainingAverage(coursePoints, remainingWeight, grade.min);
    if (approximatelyEqual(required, 0)) required = 0;
    if (approximatelyEqual(required, 100)) required = 100;

    let status = 'reachable';
    if (required <= 0) status = 'secured';
    else if (required > 100) status = 'not-reachable';
    else if (required === 100) status = 'perfect-score';

    return { ...grade, required, status };
  });
}

export function getReachability(required) {
  if (required === null || !Number.isFinite(required)) return { label: 'Needs more information', tone: 'neutral' };
  if (required <= EPSILON) return { label: 'Target Already Secured', tone: 'success' };
  if (required > 100 + EPSILON) return { label: 'Target Not Achievable', tone: 'danger' };
  if (approximatelyEqual(required, 100)) return { label: 'Perfect Score Required', tone: 'warning' };
  if (required <= 60) return { label: 'Comfortably Achievable', tone: 'success' };
  if (required <= 80) return { label: 'Achievable', tone: 'info' };
  return { label: 'Requires Strong Performance', tone: 'warning' };
}

export function getAssessmentBreakdown(assessments) {
  return assessments.map((a) => {
    const percentage = a.status === 'completed' ? calculateAssessmentPercentage(a.score, a.maxScore) : null;
    const contribution = a.status === 'completed' ? calculateWeightedContribution(a.score, a.maxScore, a.weight) : null;
    return { ...a, percentage, contribution };
  });
}

export function getWeightState(assessments = []) {
  const parsed = assessments.map((a) => num(a?.weight));
  const hasInvalid = parsed.some((w) => w === null || w < 0);
  const total = calculateTotalWeight(assessments);
  if (hasInvalid) return { total, status: 'Invalid', tone: 'danger', message: 'Every assessment weight must be a number from 0 to 100.' };
  if (approximatelyEqual(total, 100)) return { total: 100, status: 'Valid', tone: 'success', message: 'Assessment weights total 100%.' };
  if (total < 100) return { total, status: 'Incomplete', tone: 'warning', message: `${(100 - total).toFixed(2).replace(/\.00$/, '')}% of the course weight is currently unassigned.` };
  return { total, status: 'Over 100%', tone: 'danger', message: 'Assessment weights exceed 100%. Adjust them before calculating a final course grade.' };
}

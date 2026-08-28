import assert from 'node:assert/strict';
import {
  calculateAssessmentPercentage,
  calculateWeightedContribution,
  calculateCoursePoints,
  calculateCompletedWeight,
  calculateCurrentAverage,
  calculatePendingWeight,
  calculateRequiredRemainingAverage,
  calculateRequiredAssessmentScore,
  calculateRequiredRawMark,
  calculateBestPossibleScore,
  calculateMinimumMathematicalOutcome,
  calculateProjectedScore,
  calculateGradePossibilities,
  getLetterGrade,
  getReachability,
  getWeightState,
  meetsThreshold,
  validateGradeScale
} from '../src/utils/gradeCalculations.js';
import { assessmentErrors } from '../src/utils/validation.js';
import { buildBreakdownCsv } from '../src/utils/exportUtils.js';
import { readStorage, safeParse, writeStorage } from '../src/utils/storageUtils.js';
import { DEFAULT_GRADE_SCALE } from '../src/data/defaultGradeScale.js';

const almost = (actual, expected, epsilon = 1e-9) => assert.ok(Math.abs(actual - expected) <= epsilon, `${actual} != ${expected}`);
const completed = (id, score, maxScore, weight, name = id) => ({ id, name, score, maxScore, weight, status: 'completed' });
const pending = (id, maxScore, weight, name = id) => ({ id, name, score: '', maxScore, weight, status: 'pending' });

// 1) Weighted contribution and validation.
assert.equal(calculateAssessmentPercentage(8, 10), 80);
assert.equal(calculateWeightedContribution(8, 10, 10), 8);
assert.equal(calculateWeightedContribution(18, 20, 10), 9);
assert.equal(calculateAssessmentPercentage(11, 10), null, 'score > max must not enter calculations');
assert.equal(calculateAssessmentPercentage(-1, 10), null);
assert.equal(calculateAssessmentPercentage(1, 0), null);
assert.equal(calculateWeightedContribution(8, 10, 101), null);
assert.ok(assessmentErrors(completed('x', 11, 10, 10)).score);

// 2) Current average must be normalized by completed weight, not by 100.
const partial = [completed('q', 8, 10, 10, 'Quiz'), completed('a', 18, 20, 10, 'Assignment')];
assert.equal(calculateCoursePoints(partial), 17);
assert.equal(calculateCompletedWeight(partial), 20);
assert.equal(calculateCurrentAverage(partial), 85);

// 3) Full-course result.
const allDone = [completed('a', 80, 100, 50), completed('b', 90, 100, 50)];
assert.equal(getWeightState(allDone).status, 'Valid');
const allDoneProjection = calculateProjectedScore(allDone, {});
assert.equal(allDoneProjection.allKnown, true);
assert.equal(allDoneProjection.score, 85);

// 4) Weight states: 90 / 100 / 110, without normalization.
assert.equal(getWeightState([{ name: 'x', weight: 90 }]).status, 'Incomplete');
assert.equal(getWeightState([{ name: 'x', weight: 100 }]).status, 'Valid');
assert.equal(getWeightState([{ name: 'x', weight: 110 }]).status, 'Over 100%');
assert.equal(getWeightState([{ name: 'x', weight: -10 }, { name: 'y', weight: 100 }]).status, 'Invalid');

// 5) Required final / remaining formulas.
assert.equal(calculateRequiredRemainingAverage(55, 40, 75), 50);
assert.equal(calculateRequiredRemainingAverage(80, 20, 75), -25);
assert.equal(calculateRequiredRemainingAverage(40, 20, 75), 175);
assert.equal(calculateRequiredRemainingAverage(40, 0, 75), null);

// 6) Selected assessment planner requires assumptions for every other pending assessment.
const pendingRows = [pending('project', 100, 20, 'Project'), pending('final', 50, 40, 'Final Exam')];
let req = calculateRequiredAssessmentScore({ coursePoints: 30, target: 75, targetAssessment: pendingRows[1], pendingAssessments: pendingRows, simulations: {} });
assert.deepEqual(req.missingAssumptions, ['project']);
req = calculateRequiredAssessmentScore({ coursePoints: 30, target: 75, targetAssessment: pendingRows[1], pendingAssessments: pendingRows, simulations: { project: 85 } });
almost(req.requiredPercent, 70);
almost(req.preciseRaw, 35);

// 7) Raw mark conversion and upward rounding.
req = calculateRequiredAssessmentScore({ coursePoints: 46.2, target: 75, targetAssessment: pendingRows[1], pendingAssessments: [pendingRows[1]], simulations: {} });
almost(req.requiredPercent, 72);
almost(req.preciseRaw, 36);
assert.equal(calculateRequiredRawMark(70.4, 50, { wholeMarks: true }), 36); // 35.2 -> 36
assert.equal(calculateRequiredRawMark(72, 50, { wholeMarks: true }), 36);
assert.equal(calculateRequiredRawMark(72.25, 50, { wholeMarks: false, precision: 2 }), 36.13);
assert.equal(calculateRequiredRawMark(127, 50, { wholeMarks: true }), null);

// 8) Secured / impossible / exact-100 logic.
assert.equal(getReachability(-0.0000000001).label, 'Target Already Secured');
assert.equal(getReachability(100).label, 'Perfect Score Required');
assert.equal(getReachability(100.00001).label, 'Target Not Achievable');
let exact = calculateRequiredAssessmentScore({ coursePoints: 35, target: 75, targetAssessment: pending('f', 50, 40), pendingAssessments: [pending('f', 50, 40)], simulations: {} });
assert.equal(exact.requiredPercent, 100);

// 9) What-If projection must not mutate actual marks.
const course = [
  completed('q', 8, 10, 10, 'Quiz'),
  completed('a', 18, 20, 10, 'Assignment'),
  completed('m', 24, 30, 30, 'Midterm'),
  pending('f', 50, 50, 'Final Exam')
];
const before = structuredClone(course);
assert.equal(calculateCoursePoints(course), 41);
assert.equal(calculatePendingWeight(course), 50);
assert.equal(calculateBestPossibleScore(course), 91);
assert.equal(calculateMinimumMathematicalOutcome(course), 41);
const projection = calculateProjectedScore(course, { f: 80 });
assert.equal(projection.allKnown, true);
assert.equal(projection.representedWeight, 100);
assert.equal(projection.score, 81);
assert.deepEqual(course, before, 'What-If calculations must not overwrite actual assessments');

// Best-case is capped at 100 even for an invalid overweight model.
const overweight = [completed('a', 100, 100, 70), pending('b', 100, 70)];
assert.equal(calculateBestPossibleScore(overweight), 100);

// 10) Grade possibilities including perfect-score status.
const possibilityCourse = [completed('earned', 50, 50, 50), pending('remaining', 100, 40)];
const possibilities = calculateGradePossibilities(possibilityCourse, DEFAULT_GRADE_SCALE);
assert.equal(possibilities.find((g) => g.label === 'A+').status, 'perfect-score'); // 50 + 40 = 90 only with 100%
assert.equal(possibilities.find((g) => g.label === 'A').status, 'reachable');
assert.equal(possibilities.find((g) => g.label === 'D').status, 'secured');

// 11) Grade boundaries and floating-point tolerance.
assert.equal(getLetterGrade(90, DEFAULT_GRADE_SCALE), 'A+');
assert.equal(getLetterGrade(89.99, DEFAULT_GRADE_SCALE), 'A');
assert.equal(getLetterGrade(85, DEFAULT_GRADE_SCALE), 'A');
assert.equal(getLetterGrade(84.99, DEFAULT_GRADE_SCALE), 'A-');
assert.equal(getLetterGrade(80, DEFAULT_GRADE_SCALE), 'A-');
assert.equal(getLetterGrade(79.999999999, DEFAULT_GRADE_SCALE), 'A-');
assert.equal(getLetterGrade(79.99, DEFAULT_GRADE_SCALE), 'B+');
assert.equal(getLetterGrade(50, DEFAULT_GRADE_SCALE), 'D');
assert.equal(getLetterGrade(49.99, DEFAULT_GRADE_SCALE), 'F');

// 12) Custom grade-scale validation.
assert.equal(validateGradeScale(DEFAULT_GRADE_SCALE).valid, true);
assert.equal(validateGradeScale([{ id: '1', label: 'A', min: 80 }, { id: '2', label: 'A', min: 70 }]).valid, false);
assert.equal(validateGradeScale([{ id: '1', label: 'A', min: 80 }, { id: '2', label: 'B', min: 80 }]).valid, false);
assert.equal(validateGradeScale([{ id: '1', label: 'A', min: 101 }]).valid, false);
assert.equal(validateGradeScale([{ id: '1', label: 'A', min: -1 }]).valid, false);
assert.equal(validateGradeScale([{ id: '1', label: 'A', min: 80 }, { id: '2', label: 'F', min: 10 }]).valid, false, 'scale must cover scores down to 0%');

// 13) Pass/fail threshold tolerance.
assert.equal(meetsThreshold(50, 50), true);
assert.equal(meetsThreshold(49.999999999, 50), true);
assert.equal(meetsThreshold(49.99, 50), false);

// 14) CSV escaping: commas, quotes, Unicode.
const csv = buildBreakdownCsv({
  courseName: 'Data, Systems “Lab”',
  courseCode: 'CSE-Ω',
  rows: [{ name: 'Quiz, "One"', score: 8, maxScore: 10, percentage: 80, weight: 10, contribution: 8, status: 'completed' }],
  summary: { Note: 'বাংলা, "quoted"' }
});
assert.match(csv, /"Quiz, ""One"""/);
assert.match(csv, /"বাংলা, ""quoted"""/);
assert.match(csv, /CSE-Ω/);

// 15) localStorage safe fallback behavior.
assert.deepEqual(safeParse('{bad json', { fallback: true }), { fallback: true });
const store = new Map();
globalThis.localStorage = {
  getItem: (key) => store.has(key) ? store.get(key) : null,
  setItem: (key, value) => store.set(key, value),
  removeItem: (key) => store.delete(key)
};
assert.equal(writeStorage('test', { ok: true }), true);
assert.deepEqual(readStorage('test', null), { ok: true });
store.set('broken', '{not-json');
assert.deepEqual(readStorage('broken', { recovered: true }), { recovered: true });

process.stdout.write('Audit tests passed: math, boundaries, What-If, reachability, validation, CSV escaping, and storage safety.\n');

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BarChart3,
  BookOpenCheck,
  ClipboardCopy,
  Download,
  Gauge,
  GraduationCap,
  Plus,
  RotateCcw,
  Save,
  Target,
  TrendingUp,
} from 'lucide-react';
import Header from './components/Header.jsx';
import AssessmentList from './components/AssessmentList.jsx';
import WhatIfSimulator from './components/WhatIfSimulator.jsx';
import SavedScenarios from './components/SavedScenarios.jsx';
import ScenarioComparison from './components/ScenarioComparison.jsx';
import SettingsModal from './components/SettingsModal.jsx';
import ConfirmDialog from './components/ConfirmDialog.jsx';
import Modal from './components/Modal.jsx';
import ToastStack from './components/Toast.jsx';
import { DEFAULT_ASSESSMENTS, DEFAULT_GRADE_SCALE, EXAMPLE_COURSE } from './data/defaultGradeScale.js';
import {
  calculateBestPossibleScore,
  calculateCompletedWeight,
  calculateCoursePoints,
  calculateCurrentAverage,
  calculateGradePossibilities,
  calculateMinimumMathematicalOutcome,
  calculatePendingWeight,
  calculateProjectedScore,
  calculateRequiredAssessmentScore,
  calculateRequiredRawMark,
  calculateRequiredRemainingAverage,
  getAssessmentBreakdown,
  getLetterGrade,
  getPendingAssessments,
  getReachability,
  getTargetPercentage,
  getWeightState,
  isValidAssessment,
  meetsThreshold,
  normalizeGradeScale,
  validateGradeScale
} from './utils/gradeCalculations.js';
import { assessmentErrors, hasErrors } from './utils/validation.js';
import { DATA_VERSION, KEYS, readStorage, removeStorage, writeStorage } from './utils/storageUtils.js';
import { downloadBlob, exportBreakdownCsv } from './utils/exportUtils.js';

const DEFAULT_SETTINGS = { wholeRawMarks: true, precision: 2 };
const freshAssessments = () => DEFAULT_ASSESSMENTS.map((a) => ({ ...a }));
let fallbackId = 0;
const uid = () => globalThis.crypto?.randomUUID?.() ?? `id-${Date.now()}-${fallbackId++}`;

function safeEditableNumber(value, fallback = '') {
  return typeof value === 'number' || typeof value === 'string' ? value : fallback;
}

function sanitizeAssessments(value, fallback = []) {
  if (!Array.isArray(value)) return fallback.map((a) => ({ ...a }));
  return value
    .filter((a) => a && typeof a === 'object' && !Array.isArray(a))
    .map((a) => ({
      id: typeof a.id === 'string' && a.id ? a.id : uid(),
      name: typeof a.name === 'string' ? a.name : '',
      score: a.score === '' || a.score === null || a.score === undefined ? '' : safeEditableNumber(a.score),
      maxScore: a.maxScore === '' || a.maxScore === null || a.maxScore === undefined ? '' : safeEditableNumber(a.maxScore),
      weight: a.weight === '' || a.weight === null || a.weight === undefined ? '' : safeEditableNumber(a.weight),
      status: a.status === 'completed' ? 'completed' : 'pending'
    }));
}

function sanitizeSimulations(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).flatMap(([id, raw]) => {
    if (raw === '') return [[id, '']];
    const n = Number(raw);
    return Number.isFinite(n) ? [[id, Math.min(100, Math.max(0, n))]] : [];
  }));
}

function sanitizeSettings(value) {
  const precision = Number(value?.precision);
  return {
    wholeRawMarks: typeof value?.wholeRawMarks === 'boolean' ? value.wholeRawMarks : DEFAULT_SETTINGS.wholeRawMarks,
    precision: [0, 1, 2, 3].includes(precision) ? precision : DEFAULT_SETTINGS.precision
  };
}

function normalizeScenario(item) {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
  const assessments = sanitizeAssessments(item.assessments);
  const savedScale = validateGradeScale(item.gradeScale).valid
    ? normalizeGradeScale(item.gradeScale)
    : DEFAULT_GRADE_SCALE.map((g) => ({ ...g }));
  const simulations = sanitizeSimulations(item.simulations);
  const passMarkRaw = Number(item.passMark);
  const passMark = Number.isFinite(passMarkRaw) ? Math.min(100, Math.max(0, passMarkRaw)) : 50;
  const targetType = item.targetType === 'grade' ? 'grade' : 'percentage';
  const requestedTargetGrade = typeof item.targetGrade === 'string' ? item.targetGrade : '';
  const targetGrade = savedScale.some((g) => g.label === requestedTargetGrade)
    ? requestedTargetGrade
    : savedScale.find((g) => g.min > 0)?.label || savedScale[0]?.label || '—';
  const targetPercentageRaw = Number(item.targetPercentage ?? item.target);
  const targetPercentage = Number.isFinite(targetPercentageRaw) ? Math.min(100, Math.max(0, targetPercentageRaw)) : 80;
  const target = getTargetPercentage({ targetType, targetPercentage, targetGrade, gradeScale: savedScale });
  const weightState = getWeightState(assessments);
  const projection = calculateProjectedScore(assessments, simulations);
  const projectedScore = weightState.status === 'Valid' && projection.allKnown ? projection.score : null;
  const projectedGrade = projectedScore === null ? '—' : getLetterGrade(projectedScore, savedScale);
  const assumptionsSummary = assessments
    .filter((a) => a.status === 'pending' && simulations[a.id] !== undefined && simulations[a.id] !== '' && Number.isFinite(Number(simulations[a.id])))
    .map((a) => `${a.name}: ${Number(simulations[a.id]).toFixed(2)}%`)
    .join(' · ') || item.assumptionsSummary || item.finalAssumption || 'No future assumptions saved';

  return {
    ...item,
    id: typeof item.id === 'string' && item.id ? item.id : uid(),
    name: typeof item.name === 'string' && item.name.trim() ? item.name : 'Recovered Scenario',
    courseName: typeof item.courseName === 'string' ? item.courseName : '',
    courseCode: typeof item.courseCode === 'string' ? item.courseCode : '',
    assessments,
    gradeScale: savedScale.map((g) => ({ ...g })),
    simulations,
    passMark,
    targetType,
    targetGrade,
    targetPercentage,
    target,
    targetLabel: targetType === 'grade' ? targetGrade : target !== null ? `${target.toFixed(2)}%` : '—',
    projectedScore,
    projectedGrade,
    passStatus: projectedScore === null ? 'Incomplete' : projectedScore + 1e-9 >= passMark ? 'Pass' : 'Fail',
    targetDifference: projectedScore === null || target === null ? null : projectedScore - target,
    assumptionsSummary,
    dateSaved: Number.isNaN(Date.parse(item.dateSaved)) ? new Date().toISOString() : item.dateSaved
  };
}

function sanitizeScenarios(value) {
  if (!Array.isArray(value)) return [];
  return value.map(normalizeScenario).filter(Boolean);
}

function isBackupShapeValid(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  if (!Array.isArray(value.scenarios) || !Array.isArray(value.gradeScale)) return false;
  if (!value.settings || typeof value.settings !== 'object' || Array.isArray(value.settings)) return false;
  if (!value.scenarios.every((s) => s && typeof s === 'object' && !Array.isArray(s) && Array.isArray(s.assessments) && Array.isArray(s.gradeScale))) return false;
  return validateGradeScale(value.gradeScale).valid;
}

function fmt(value, precision = 2, suffix = '%') {
  return value === null || value === undefined || !Number.isFinite(value) ? '—' : `${value.toFixed(precision)}${suffix}`;
}

function metricStatus(projectedFinal, currentAverage, coursePoints, completedWeight, remainingWeight) {
  if (projectedFinal !== null) return { label: 'Projected final result', value: projectedFinal, helper: 'All assigned course weight is represented by actual or What-If scores.' };
  if (currentAverage !== null) return { label: 'Current average', value: currentAverage, helper: `${coursePoints.toFixed(2)} course points earned across ${completedWeight.toFixed(2)}% completed weight. ${remainingWeight.toFixed(2)}% remains.` };
  return { label: 'Start planning', value: null, helper: 'Complete at least one assessment to calculate your current performance.' };
}

function buildScenario({ courseName, courseCode, assessments, gradeScale, passMark, targetType, targetGrade, targetPercentage, target, simulations, projectedFinal }) {
  const assumptionsSummary = assessments
    .filter((a) => a.status === 'pending' && simulations[a.id] !== undefined && simulations[a.id] !== '' && Number.isFinite(Number(simulations[a.id])))
    .map((a) => `${a.name}: ${Number(simulations[a.id]).toFixed(2)}%`)
    .join(' · ') || 'No future assumptions saved';
  const projectedGrade = projectedFinal === null ? '—' : getLetterGrade(projectedFinal, gradeScale);
  const targetLabel = targetType === 'grade' ? targetGrade : target !== null ? `${target.toFixed(2)}%` : '—';
  return {
    id: uid(),
    name: `${courseCode || courseName || 'Course'} Scenario`,
    courseName,
    courseCode,
    assessments: assessments.map((a) => ({ ...a })),
    gradeScale: normalizeGradeScale(gradeScale).map((g) => ({ ...g })),
    passMark,
    targetType,
    targetGrade,
    targetPercentage,
    target,
    targetLabel,
    simulations: { ...simulations },
    projectedScore: projectedFinal,
    projectedGrade,
    passStatus: projectedFinal === null ? 'Incomplete' : projectedFinal + 1e-9 >= passMark ? 'Pass' : 'Fail',
    targetDifference: projectedFinal === null || target === null ? null : projectedFinal - target,
    assumptionsSummary,
    dateSaved: new Date().toISOString()
  };
}

export default function App() {
  const storedDraft = readStorage(KEYS.draft, null);
  const initialDraft = storedDraft && typeof storedDraft === 'object' && !Array.isArray(storedDraft) ? storedDraft : null;
  const [theme, setTheme] = useState(() => { const saved = readStorage(KEYS.theme, null); return saved === 'dark' || saved === 'light' ? saved : (window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'); });
  const [gradeScale, setGradeScale] = useState(() => { const saved = readStorage(KEYS.gradeScale, null); return validateGradeScale(saved).valid ? normalizeGradeScale(saved) : DEFAULT_GRADE_SCALE.map((g) => ({ ...g })); });
  const [settings, setSettings] = useState(() => sanitizeSettings(readStorage(KEYS.settings, {})));
  const [scenarios, setScenarios] = useState(() => sanitizeScenarios(readStorage(KEYS.scenarios, [])));
  const [courseName, setCourseName] = useState(typeof initialDraft?.courseName === 'string' ? initialDraft.courseName : '');
  const [courseCode, setCourseCode] = useState(typeof initialDraft?.courseCode === 'string' ? initialDraft.courseCode : '');
  const [passMark, setPassMark] = useState(() => { const n = Number(initialDraft?.passMark); return Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 50; });
  const [assessments, setAssessments] = useState(() => sanitizeAssessments(initialDraft?.assessments, DEFAULT_ASSESSMENTS));
  const [targetType, setTargetType] = useState(initialDraft?.targetType === 'percentage' ? 'percentage' : 'grade');
  const [targetGrade, setTargetGrade] = useState(initialDraft?.targetGrade ?? 'A-');
  const [targetPercentage, setTargetPercentage] = useState(() => { const raw = initialDraft?.targetPercentage; return typeof raw === 'number' || typeof raw === 'string' ? raw : 80; });
  const [simulations, setSimulations] = useState(() => sanitizeSimulations(initialDraft?.simulations));
  const [targetAssessmentId, setTargetAssessmentId] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [renameScenario, setRenameScenario] = useState(null);
  const [renameText, setRenameText] = useState('');
  const [selectedScenarioIds, setSelectedScenarioIds] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [pendingImport, setPendingImport] = useState(null);
  const importRef = useRef(null);

  const precision = Number(settings.precision ?? 2);
  const normalizedScale = useMemo(() => normalizeGradeScale(gradeScale), [gradeScale]);
  const gradeScaleValidation = useMemo(() => validateGradeScale(gradeScale), [gradeScale]);
  const pending = useMemo(() => getPendingAssessments(assessments), [assessments]);
  const assessmentModelValid = useMemo(() => assessments.every((a) => isValidAssessment(a)), [assessments]);
  const weightState = useMemo(() => getWeightState(assessments), [assessments]);
  const courseModelReady = weightState.status === 'Valid' && assessmentModelValid;
  const coursePoints = useMemo(() => calculateCoursePoints(assessments), [assessments]);
  const completedWeight = useMemo(() => calculateCompletedWeight(assessments), [assessments]);
  const pendingWeight = useMemo(() => calculatePendingWeight(assessments), [assessments]);
  const currentAverage = useMemo(() => calculateCurrentAverage(assessments), [assessments]);
  const target = useMemo(() => getTargetPercentage({ targetType, targetPercentage, targetGrade, gradeScale: normalizedScale }), [targetType, targetPercentage, targetGrade, normalizedScale]);
  const projection = useMemo(() => calculateProjectedScore(assessments, simulations), [assessments, simulations]);
  const projectedFinal = courseModelReady && projection.allKnown ? projection.score : null;
  const projectedGrade = projectedFinal === null ? '—' : getLetterGrade(projectedFinal, normalizedScale);
  const bestPossible = useMemo(() => calculateBestPossibleScore(assessments), [assessments]);
  const minimumOutcome = useMemo(() => calculateMinimumMathematicalOutcome(assessments), [assessments]);
  const requiredRemaining = target !== null && pendingWeight > 0 && courseModelReady ? calculateRequiredRemainingAverage(coursePoints, pendingWeight, target) : null;
  const passRequirement = pendingWeight > 0 && courseModelReady ? calculateRequiredRemainingAverage(coursePoints, pendingWeight, Number(passMark)) : null;
  const reachability = getReachability(requiredRemaining);
  const gradePossibilities = useMemo(() => calculateGradePossibilities(assessments, normalizedScale), [assessments, normalizedScale]);
  const breakdown = useMemo(() => getAssessmentBreakdown(assessments), [assessments]);
  const selectedTargetAssessment = pending.find((a) => a.id === targetAssessmentId) || null;
  const requiredSelected = target !== null && selectedTargetAssessment && courseModelReady ? calculateRequiredAssessmentScore({ coursePoints, target, targetAssessment: selectedTargetAssessment, pendingAssessments: pending, simulations }) : null;
  const hero = metricStatus(projectedFinal, currentAverage, coursePoints, completedWeight, pendingWeight);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    writeStorage(KEYS.theme, theme);
  }, [theme]);

  useEffect(() => { writeStorage(KEYS.gradeScale, gradeScale); }, [gradeScale]);
  useEffect(() => { writeStorage(KEYS.settings, settings); }, [settings]);
  useEffect(() => { writeStorage(KEYS.scenarios, scenarios); }, [scenarios]);
  useEffect(() => { writeStorage(KEYS.dataVersion, DATA_VERSION); }, []);
  useEffect(() => {
    writeStorage(KEYS.draft, { courseName, courseCode, passMark, assessments, targetType, targetGrade, targetPercentage, simulations });
  }, [courseName, courseCode, passMark, assessments, targetType, targetGrade, targetPercentage, simulations]);

  useEffect(() => {
    if (!pending.length) {
      setTargetAssessmentId('');
      return;
    }
    if (pending.some((a) => a.id === targetAssessmentId)) return;
    const preferred = pending.find((a) => a.id === 'final') || pending[0];
    setTargetAssessmentId(preferred.id);
  }, [pending, targetAssessmentId]);

  useEffect(() => {
    if (!normalizedScale.some((g) => g.label === targetGrade)) {
      const next = normalizedScale.find((g) => g.min > 0);
      if (next) setTargetGrade(next.label);
    }
  }, [normalizedScale, targetGrade]);

  const toast = (message, tone = 'success') => {
    const id = uid();
    setToasts((current) => [...current, { id, message, tone }]);
    window.setTimeout(() => setToasts((current) => current.filter((t) => t.id !== id)), 3000);
  };

  const updateAssessment = (id, field, value) => {
    setAssessments((current) => current.map((a) => {
      if (a.id !== id) return a;
      const next = { ...a, [field]: value };
      if (field === 'status' && value === 'pending') next.score = '';
      return next;
    }));
    if (field === 'status') {
      setSimulations((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
    }
  };

  const addAssessment = () => {
    setAssessments((current) => [...current, { id: uid(), name: 'New Assessment', score: '', maxScore: 100, weight: 0, status: 'pending' }]);
  };

  const requestRemove = (id) => {
    const row = assessments.find((a) => a.id === id);
    const hasData = row && (row.score !== '' || Number(row.weight) > 0);
    if (!hasData) {
      setAssessments((current) => current.filter((a) => a.id !== id));
      setSimulations((current) => { const next = { ...current }; delete next[id]; return next; });
      return;
    }
    setConfirm({ title: 'Delete assessment?', message: `Remove ${row.name} and its entered data from the current calculator?`, confirmText: 'Delete Assessment', destructive: true, action: () => {
      setAssessments((current) => current.filter((a) => a.id !== id));
      setSimulations((current) => { const next = { ...current }; delete next[id]; return next; });
      toast('Assessment deleted', 'info');
    }});
  };

  const setSimulation = (id, value) => {
    if (value === '') return setSimulations((current) => ({ ...current, [id]: '' }));
    const n = Number(value);
    if (!Number.isFinite(n)) return;
    setSimulations((current) => ({ ...current, [id]: Math.min(100, Math.max(0, n)) }));
  };

  const loadExample = () => {
    setCourseName(EXAMPLE_COURSE.courseName);
    setCourseCode(EXAMPLE_COURSE.courseCode);
    setPassMark(EXAMPLE_COURSE.passMark);
    setTargetType(EXAMPLE_COURSE.targetType);
    setTargetGrade(EXAMPLE_COURSE.targetGrade);
    setTargetPercentage(EXAMPLE_COURSE.targetPercentage);
    setAssessments(EXAMPLE_COURSE.assessments.map((a) => ({ ...a })));
    setSimulations({ final: 80 });
    toast('Example course loaded', 'info');
  };

  const resetCalculator = () => setConfirm({ title: 'Reset current calculator?', message: 'This clears the current course, marks, targets, and What-If values. Saved scenarios will remain.', confirmText: 'Reset Calculator', destructive: true, action: () => {
    setCourseName(''); setCourseCode(''); setPassMark(50); setAssessments(freshAssessments()); setTargetType('grade'); setTargetGrade(normalizedScale.find((g) => g.min > 0)?.label || 'A-'); setTargetPercentage(80); setSimulations({}); removeStorage(KEYS.draft); toast('Calculator reset', 'info');
  }});

  const saveScenario = () => {
    if (assessments.some((a) => hasErrors(assessmentErrors(a)))) {
      toast('Fix assessment validation errors before saving', 'danger');
      return;
    }
    if (!gradeScaleValidation.valid) {
      toast('Fix the grade scale before saving', 'danger');
      return;
    }
    const scenario = buildScenario({ courseName, courseCode, assessments, gradeScale: normalizedScale, passMark: Number(passMark), targetType, targetGrade, targetPercentage: Number(targetPercentage), target, simulations, projectedFinal });
    const existingNames = scenarios.filter((s) => s.name.startsWith(scenario.name)).length;
    scenario.name = `${scenario.name} ${existingNames + 1}`;
    setScenarios((current) => [scenario, ...current]);
    toast('Scenario saved');
  };

  const loadScenario = (scenario) => {
    setCourseName(scenario.courseName || '');
    setCourseCode(scenario.courseCode || '');
    setAssessments(sanitizeAssessments(scenario.assessments));
    setGradeScale((scenario.gradeScale || DEFAULT_GRADE_SCALE).map((g) => ({ ...g })));
    setPassMark(scenario.passMark ?? 50);
    setTargetType(scenario.targetType ?? 'percentage');
    setTargetGrade(scenario.targetGrade ?? 'A-');
    setTargetPercentage(scenario.targetPercentage ?? scenario.target ?? 80);
    setSimulations(sanitizeSimulations(scenario.simulations));
    toast('Scenario loaded with its saved grade scale', 'info');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const duplicateScenario = (scenario) => {
    setScenarios((current) => [{ ...scenario, id: uid(), name: `${scenario.name} Copy`, dateSaved: new Date().toISOString() }, ...current]);
    toast('Scenario duplicated');
  };

  const requestRename = (scenario) => { setRenameScenario(scenario); setRenameText(scenario.name); };
  const applyRename = () => {
    const trimmed = renameText.trim();
    if (!trimmed) return;
    setScenarios((current) => current.map((s) => s.id === renameScenario.id ? { ...s, name: trimmed } : s));
    setRenameScenario(null); toast('Scenario renamed');
  };

  const requestDeleteScenario = (id) => setConfirm({ title: 'Delete saved scenario?', message: 'This permanently removes the selected planning snapshot from this browser.', confirmText: 'Delete Scenario', destructive: true, action: () => {
    setScenarios((current) => current.filter((s) => s.id !== id));
    setSelectedScenarioIds((current) => current.filter((selected) => selected !== id));
    toast('Scenario deleted', 'info');
  }});

  const toggleCompare = (id) => setSelectedScenarioIds((current) => current.includes(id) ? current.filter((x) => x !== id) : current.length < 3 ? [...current, id] : current);

  const copySummary = async () => {
    const lines = [
      `Course: ${courseName || 'Untitled Course'}${courseCode ? ` (${courseCode})` : ''}`,
      `Current Average: ${fmt(currentAverage, precision)}`,
      `Completed Weight: ${fmt(completedWeight, precision)}`,
      `Course Points Earned: ${fmt(coursePoints, precision, ' / 100')}`,
      `Target: ${targetType === 'grade' ? targetGrade : fmt(target, precision)}`,
      `Required Remaining Average: ${fmt(requiredRemaining, precision)}`,
      `Required Selected Score: ${!requiredSelected ? '—' : requiredSelected.missingAssumptions.length ? 'Needs other pending assumptions' : requiredSelected.requiredPercent <= 0 ? 'Target secured' : requiredSelected.requiredPercent > 100 ? 'Not achievable' : `${requiredSelected.requiredPercent.toFixed(precision)}% on ${selectedTargetAssessment?.name || 'selected assessment'}${requiredRawDisplay !== null ? ` (${requiredRawDisplay}/${selectedTargetAssessment?.maxScore})` : ''}`}`,
      `Projected Result: ${projectedFinal === null ? 'Incomplete' : `${fmt(projectedFinal, precision)} (${projectedGrade})`}`
    ];
    try { await navigator.clipboard.writeText(lines.join('\n')); toast('Summary copied'); }
    catch { toast('Clipboard access was blocked by the browser', 'danger'); }
  };

  const exportCsv = () => exportBreakdownCsv({ courseName, courseCode, rows: breakdown, summary: {
    'Current Average': fmt(currentAverage, precision),
    'Course Points': fmt(coursePoints, precision, ' / 100'),
    'Completed Weight': fmt(completedWeight, precision),
    'Projected Final': projectedFinal === null ? 'Incomplete' : fmt(projectedFinal, precision),
    'Projected Grade': projectedGrade,
    'Pass Status': projectedFinal === null ? 'Incomplete' : meetsThreshold(projectedFinal, passMark) ? 'Pass' : 'Fail',
    'Target': targetType === 'grade' ? targetGrade : fmt(target, precision),
    'Required Selected Score': !requiredSelected ? '—' : requiredSelected.missingAssumptions.length ? 'Needs other pending assumptions' : requiredSelected.requiredPercent <= 0 ? 'Target secured' : requiredSelected.requiredPercent > 100 ? 'Not achievable' : `${requiredSelected.requiredPercent.toFixed(precision)}% on ${selectedTargetAssessment?.name || 'selected assessment'}`
  }});

  const exportData = () => downloadBlob('exam-grade-predictor-backup.json', JSON.stringify({ dataVersion: DATA_VERSION, exportedAt: new Date().toISOString(), scenarios, gradeScale: normalizedScale, settings }, null, 2), 'application/json');

  const handleImportFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      if (!isBackupShapeValid(parsed)) throw new Error('schema');
      setPendingImport(parsed);
      setSettingsOpen(false);
      setConfirm({ title: 'Replace saved data?', message: 'Importing will replace saved scenarios, grade scale, and app settings in this browser. Your current calculator inputs are not replaced.', confirmText: 'Import Data', destructive: false, action: () => {
        setScenarios(sanitizeScenarios(parsed.scenarios)); setGradeScale(normalizeGradeScale(parsed.gradeScale)); setSettings(sanitizeSettings(parsed.settings)); setPendingImport(null); toast('Data imported');
      }});
    } catch {
      toast('Invalid backup file. Import cancelled.', 'danger');
    }
  };

  const deleteAllSaved = () => {
    setSettingsOpen(false);
    setConfirm({ title: 'Delete all saved data?', message: 'This removes scenarios, saved grade scale, settings, theme preference, and the current draft from this browser.', confirmText: 'Delete All Data', destructive: true, action: () => {
      Object.values(KEYS).forEach(removeStorage);
      setScenarios([]); setGradeScale(DEFAULT_GRADE_SCALE.map((g) => ({ ...g }))); setSettings(DEFAULT_SETTINGS); setTheme('light'); setCourseName(''); setCourseCode(''); setPassMark(50); setAssessments(freshAssessments()); setSimulations({}); setTargetType('grade'); setTargetGrade('A-'); setTargetPercentage(80); toast('All saved data deleted', 'info');
    }});
  };

  const requiredRawDisplay = (() => {
    if (!requiredSelected || requiredSelected.preciseRaw === null || requiredSelected.requiredPercent === null) return null;
    if (requiredSelected.requiredPercent <= 0) return 0;
    if (requiredSelected.requiredPercent > 100) return null;
    return calculateRequiredRawMark(requiredSelected.requiredPercent, selectedTargetAssessment?.maxScore, { wholeMarks: settings.wholeRawMarks, precision });
  })();

  const insight = (() => {
    if (currentAverage === null) return 'Enter at least one completed assessment to generate a grade insight.';
    if (target === null) return `You are currently averaging ${currentAverage.toFixed(precision)}% across completed assessments.`;
    if (requiredRemaining !== null && requiredRemaining <= 0) return `Your entered completed work already secures the ${targetType === 'grade' ? targetGrade : `${target.toFixed(precision)}%`} target mathematically.`;
    if (requiredRemaining !== null && requiredRemaining > 100) return `The selected target is not reachable through the currently assigned remaining course weight.`;
    if (requiredRemaining !== null) return `You are averaging ${currentAverage.toFixed(precision)}% across completed work and need ${requiredRemaining.toFixed(precision)}% on average across the remaining ${pendingWeight.toFixed(precision)}%.`;
    return `You are currently averaging ${currentAverage.toFixed(precision)}% across completed assessments.`;
  })();

  const gradeIcon = projectedFinal !== null ? GraduationCap : Gauge;
  const HeroIcon = gradeIcon;

  return (
    <div className="app-shell">
      <Header theme={theme} onToggleTheme={() => setTheme((t) => t === 'dark' ? 'light' : 'dark')} onOpenSettings={() => setSettingsOpen(true)} onSave={saveScenario} onPrint={() => window.print()} />

      <main className="app-main">
        <section className="intro-grid no-print">
          <div className="intro-copy">
            <span className="eyebrow">Academic planning workspace</span>
            <h1>Plan the grade before the grade plans you.</h1>
            <p>Model weighted assessments, see what is mathematically possible, and test future marks without confusing predictions with actual results.</p>
            <div className="intro-actions"><button className="button primary" onClick={loadExample}><BookOpenCheck size={17} /> Load Example</button><button className="button ghost" onClick={resetCalculator}><RotateCcw size={17} /> Reset</button></div>
          </div>
          <div className="hero-result-card">
            <div className="hero-icon"><HeroIcon size={24} /></div>
            <span>{hero.label}</span>
            <strong>{hero.value === null ? '—' : `${hero.value.toFixed(precision)}%`}</strong>
            <p>{hero.helper}</p>
            <div className="hero-meta"><span>{projectedFinal !== null ? projectedGrade : currentAverage !== null ? getLetterGrade(currentAverage, normalizedScale) : 'No grade yet'}</span><span>{target !== null ? `Target ${targetType === 'grade' ? targetGrade : `${target.toFixed(precision)}%`}` : 'No target'}</span></div>
          </div>
        </section>

        <section className="panel no-print" aria-labelledby="course-setup-heading">
          <div className="section-heading split"><div><span className="eyebrow">Course Setup</span><h2 id="course-setup-heading">Course details & rules</h2><p>The default weights and grade scale are editable examples, not university-specific rules.</p></div><div className={`status-pill ${weightState.tone}`}>{weightState.status}: {weightState.total.toFixed(2).replace(/\.00$/, '')}%</div></div>
          <div className="course-grid">
            <label className="field-block"><span>Course Name <small>optional</small></span><input value={courseName} onChange={(e) => setCourseName(e.target.value)} placeholder="Database Management System" /></label>
            <label className="field-block"><span>Course Code <small>optional</small></span><input value={courseCode} onChange={(e) => setCourseCode(e.target.value)} placeholder="CSE312" /></label>
            <label className="field-block"><span>Pass Mark %</span><input type="number" min="0" max="100" step="any" value={passMark} onChange={(e) => setPassMark(Math.min(100, Math.max(0, Number(e.target.value) || 0)))} /></label>
          </div>
          <div className={`inline-alert ${weightState.tone}`}>{weightState.message}</div>
          {!assessmentModelValid && <div className="inline-alert danger" role="alert">One or more assessment rows contain invalid or incomplete required fields. Final projections and target calculations are paused until those rows are fixed.</div>}
        </section>

        {assessments.length ? <AssessmentList assessments={assessments} onUpdate={updateAssessment} onAdd={addAssessment} onRequestRemove={requestRemove} /> : (
          <section className="panel empty-state no-print"><div className="empty-icon"><Plus size={24} /></div><h2>Add your first assessment to start predicting your course grade.</h2><div className="row-actions"><button className="button primary" onClick={addAssessment}><Plus size={17} /> Add Assessment</button><button className="button ghost" onClick={loadExample}>Load Example</button></div></section>
        )}

        <section className="metric-grid no-print" aria-label="Current performance summary">
          <article className="metric-card"><span>Current Average</span><strong>{fmt(currentAverage, precision)}</strong><small>Performance across completed weight only.</small></article>
          <article className="metric-card"><span>Course Points Earned</span><strong>{fmt(coursePoints, precision, '')}<em> / 100</em></strong><small>Weighted points already secured toward the final course score.</small></article>
          <article className="metric-card"><span>Completed Weight</span><strong>{fmt(completedWeight, precision)}</strong><small>Remaining assigned weight: {fmt(pendingWeight, precision)}</small></article>
          <article className="metric-card"><span>Projected Final</span><strong>{projectedFinal === null ? 'Incomplete' : fmt(projectedFinal, precision)}</strong><small>{projectedFinal === null ? 'Complete all pending What-If assumptions and use 100% total weight.' : `${projectedGrade} · ${meetsThreshold(projectedFinal, passMark) ? 'Pass' : 'Fail'}`}</small></article>
        </section>

        <section className="planning-grid no-print">
          <article className="panel target-panel">
            <div className="section-heading"><span className="eyebrow">Target Result</span><h2>Choose the outcome you want</h2><p>Letter-grade presets are derived from your active grading scale.</p></div>
            <div className="segmented" role="group" aria-label="Target type"><button type="button" aria-pressed={targetType === 'grade'} className={targetType === 'grade' ? 'active' : ''} onClick={() => setTargetType('grade')}>Letter Grade</button><button type="button" aria-pressed={targetType === 'percentage'} className={targetType === 'percentage' ? 'active' : ''} onClick={() => setTargetType('percentage')}>Percentage</button></div>
            {targetType === 'grade' ? (
              <div className="grade-preset-grid">{normalizedScale.filter((g) => g.min > 0).map((g) => <button type="button" key={g.id} aria-pressed={targetGrade === g.label} className={`grade-chip ${targetGrade === g.label ? 'active' : ''}`} onClick={() => setTargetGrade(g.label)}><strong>{g.label}</strong><span>{g.min}%+</span></button>)}<button type="button" className="grade-chip" onClick={() => { setTargetType('percentage'); setTargetPercentage(Number(passMark)); }}><strong>Pass</strong><span>{Number(passMark).toFixed(0)}%+</span></button></div>
            ) : <label className="field-block large-input"><span>Target course percentage</span><input type="number" min="0" max="100" step="any" aria-invalid={target === null} value={targetPercentage} onChange={(e) => setTargetPercentage(e.target.value)} />{target === null && <small className="field-error">Enter a target between 0 and 100.</small>}</label>}
            <div className={`reachability ${reachability.tone}`}><Target size={18} /><div><strong>{reachability.label}</strong><span>{requiredRemaining === null ? 'A valid 100% course model with remaining assigned weight is needed.' : requiredRemaining <= 0 ? 'No additional points are needed for this target.' : requiredRemaining > 100 ? `It would require ${requiredRemaining.toFixed(precision)}% average across remaining work.` : `Need ${requiredRemaining.toFixed(precision)}% average across the remaining ${pendingWeight.toFixed(precision)}%.`}</span></div></div>
            {passRequirement !== null && <div className="pass-note">Pass requirement: {passRequirement <= 0 ? 'already mathematically secured' : passRequirement > 100 ? 'not reachable with the assigned remaining work' : `${passRequirement.toFixed(precision)}% average across remaining work to reach ${Number(passMark).toFixed(precision)}%.`}</div>}
          </article>

          <article className="panel required-panel">
            <div className="section-heading"><span className="eyebrow">Remaining Grade Planner</span><h2>Required score for one pending assessment</h2><p>When several assessments remain, enter What-If assumptions for the others first.</p></div>
            {pending.length ? <>
              <label className="field-block"><span>Calculate Required Score For</span><select value={targetAssessmentId} onChange={(e) => setTargetAssessmentId(e.target.value)}>{pending.map((a) => <option key={a.id} value={a.id}>{a.name} ({a.weight}%)</option>)}</select></label>
              {!requiredSelected ? <div className="required-display muted">Choose a valid target and a pending assessment.</div> : requiredSelected.missingAssumptions.length ? (
                <div className="required-display warning"><span>Need future assumptions</span><strong>{requiredSelected.missingAssumptions.length} pending input{requiredSelected.missingAssumptions.length > 1 ? 's' : ''}</strong><p>Use the What-If simulator for every other pending assessment. The selected assessment is solved mathematically.</p></div>
              ) : requiredSelected.requiredPercent <= 0 ? (
                <div className="required-display success"><span>Target already secured</span><strong>0% required</strong><p>Your completed work plus the entered assumptions already reaches this target.</p></div>
              ) : requiredSelected.requiredPercent > 100 ? (
                <div className="required-display danger"><span>Not achievable through {selectedTargetAssessment?.name}</span><strong>&gt; 100% needed</strong><p>This target cannot be reached through the selected assessment under the current assumptions.</p></div>
              ) : Math.abs(requiredSelected.requiredPercent - 100) <= 1e-9 ? (
                <div className="required-display warning"><span>Perfect score required on {selectedTargetAssessment?.name}</span><strong>100%</strong><p>{requiredRawDisplay !== null ? `You need the full ${requiredRawDisplay} / ${selectedTargetAssessment.maxScore} raw marks under the current assumptions.` : 'A perfect percentage is required.'}</p></div>
              ) : (
                <div className="required-display success"><span>Required {selectedTargetAssessment?.name} percentage</span><strong>{requiredSelected.requiredPercent.toFixed(precision)}%</strong><p>{requiredRawDisplay !== null ? `At least ${requiredRawDisplay} / ${selectedTargetAssessment.maxScore} raw marks${settings.wholeRawMarks ? ' (rounded upward when needed).' : '.'}` : 'Raw mark cannot be calculated.'}</p></div>
              )}
            </> : <div className="required-display muted">All assessments are completed. There is no pending assessment to solve.</div>}
          </article>
        </section>

        <WhatIfSimulator pending={pending} simulations={simulations} setSimulation={setSimulation} reset={() => { setSimulations({}); toast('What-If values cleared', 'info'); }} projectedScore={projection.score} projectedGrade={getLetterGrade(projection.score, normalizedScale)} target={target} passMark={Number(passMark)} allKnown={courseModelReady && projection.allKnown} />

        <section className="analytics-grid no-print">
          <article className="panel">
            <div className="section-heading"><span className="eyebrow">Outcome Range</span><h2>Best and minimum mathematical outcomes</h2><p>These are boundary calculations, not predictions.</p></div>
            {!courseModelReady ? <div className={`inline-alert ${weightState.status === 'Valid' ? 'danger' : weightState.tone}`}>Outcome bounds require a complete 100% weighting model with valid assessment inputs.</div> : <div className="outcome-range">
              <div><span>Minimum Mathematical Outcome</span><strong>{fmt(minimumOutcome, precision)}</strong><small>If every remaining assigned assessment scores 0%.</small></div>
              <div className="range-line"><span style={{ width: `${Math.min(100, Math.max(0, minimumOutcome))}%` }}></span><i style={{ left: `${Math.min(100, Math.max(0, bestPossible))}%` }}></i></div>
              <div><span>Best Possible Final Result</span><strong>{fmt(bestPossible, precision)} · {getLetterGrade(bestPossible, normalizedScale)}</strong><small>If every remaining assigned assessment scores 100%.</small></div>
            </div>}
          </article>

          <article className="panel">
            <div className="section-heading"><span className="eyebrow">Grade Insight</span><h2>What the math says now</h2></div>
            <div className="insight-box"><TrendingUp size={21} /><p>{insight}</p></div>
            <div className="score-gap"><span>Target gap</span><strong>{projectedFinal !== null && target !== null ? `${meetsThreshold(projectedFinal, target) ? 'Exceeded by ' : 'Need '}${Math.abs(projectedFinal - target).toFixed(precision)} pts` : requiredRemaining !== null ? `Need ${Math.max(0, requiredRemaining).toFixed(precision)}% remaining avg` : '—'}</strong></div>
          </article>
        </section>

        <section className="panel no-print" aria-labelledby="contribution-heading">
          <div className="section-heading"><span className="eyebrow">Grade Breakdown</span><h2 id="contribution-heading">Weighted contribution transparency</h2><p>Each completed score is converted to a percentage, then multiplied by its course weight.</p></div>
          <div className="contribution-list">{breakdown.map((row) => <div className="contribution-row" key={row.id}><div className="contribution-meta"><strong>{row.name}</strong><span>{row.status === 'completed' ? `${row.score} / ${row.maxScore} · ${fmt(row.percentage, precision)} · Weight ${row.weight}%` : `Pending · Weight ${row.weight}%`}</span></div><div className="contribution-track"><span style={{ width: `${row.contribution === null ? 0 : Math.min(100, (row.contribution / Math.max(Number(row.weight), 0.0001)) * 100)}%` }}></span></div><strong className="contribution-value">{row.contribution === null ? '—' : row.contribution.toFixed(precision)}</strong></div>)}</div>
        </section>

        <section className="panel no-print" aria-labelledby="ladder-heading">
          <div className="section-heading"><span className="eyebrow">Grade Possibility Table</span><h2 id="ladder-heading">See which grades remain reachable</h2><p>Required averages are based only on the assigned remaining course weight.</p></div>
          {!courseModelReady ? <div className={`inline-alert ${weightState.status === 'Valid' ? 'danger' : weightState.tone}`}>Grade reachability requires a complete 100% weighting model with valid assessment inputs.</div> : <div className="possibility-table-wrap"><table className="data-table possibility-table"><thead><tr><th>Grade</th><th>Minimum</th><th>Required Remaining Average</th><th>Status</th></tr></thead><tbody>{gradePossibilities.map((g) => <tr key={g.id}><td><strong>{g.label}</strong></td><td>{g.min}%</td><td>{g.required === null ? '—' : g.status === 'secured' ? '0% needed' : g.status === 'not-reachable' ? 'More than 100%' : `${g.required.toFixed(precision)}%`}</td><td><span className={`status-pill ${g.status === 'secured' ? 'success' : g.status === 'not-reachable' ? 'danger' : g.status === 'perfect-score' ? 'warning' : 'info'}`}>{g.status === 'secured' ? 'Secured' : g.status === 'not-reachable' ? 'Not Reachable' : g.status === 'perfect-score' ? 'Perfect Score Required' : 'Reachable'}</span></td></tr>)}</tbody></table></div>}
        </section>

        <section className="panel no-print">
          <div className="section-heading split"><div><span className="eyebrow">Export & Report</span><h2>Take your planning result with you</h2><p>CSV exports calculation detail; Print opens an A4-friendly Grade Prediction Report.</p></div><div className="row-actions"><button className="button secondary" onClick={copySummary}><ClipboardCopy size={16} /> Copy Summary</button><button className="button secondary" onClick={exportCsv}><Download size={16} /> Export CSV</button><button className="button primary" onClick={() => window.print()}><BarChart3 size={16} /> Print / Save PDF</button></div></div>
        </section>

        <SavedScenarios scenarios={scenarios} selectedIds={selectedScenarioIds} onToggleCompare={toggleCompare} onLoad={loadScenario} onDuplicate={duplicateScenario} onRename={requestRename} onDelete={requestDeleteScenario} />
        <ScenarioComparison scenarios={scenarios} selectedIds={selectedScenarioIds} />

        <footer className="app-footer no-print"><span>Frontend-only · No database · Saved scenarios and settings use localStorage.</span><span>Default grade boundaries are examples only.</span></footer>
      </main>

      <section className="print-report" aria-label="Grade Prediction Report">
        <div className="print-header"><div><p>Exam Grade Predictor</p><h1>Grade Prediction Report</h1><span>{courseName || 'Untitled Course'}{courseCode ? ` · ${courseCode}` : ''}</span></div><div className="print-grade"><small>{projectedFinal !== null ? 'Projected Final Grade' : 'Completed-Work Grade'}</small><strong>{projectedFinal !== null ? projectedGrade : currentAverage !== null ? getLetterGrade(currentAverage, normalizedScale) : '—'}</strong><span>{projectedFinal !== null ? fmt(projectedFinal, precision) : fmt(currentAverage, precision)}</span></div></div>
        <table><thead><tr><th>Assessment</th><th>Score</th><th>Max</th><th>%</th><th>Weight</th><th>Contribution</th><th>Status</th></tr></thead><tbody>{breakdown.map((r) => <tr key={r.id}><td>{r.name}</td><td>{r.status === 'completed' ? r.score : '—'}</td><td>{r.maxScore}</td><td>{fmt(r.percentage, precision)}</td><td>{r.weight}%</td><td>{r.contribution === null ? '—' : r.contribution.toFixed(precision)}</td><td>{r.status}</td></tr>)}</tbody></table>
        <div className="print-summary"><div><span>Current Average</span><strong>{fmt(currentAverage, precision)}</strong></div><div><span>Course Points</span><strong>{coursePoints.toFixed(precision)} / 100</strong></div><div><span>Completed Weight</span><strong>{fmt(completedWeight, precision)}</strong></div><div><span>Projected Final</span><strong>{projectedFinal === null ? 'Incomplete' : fmt(projectedFinal, precision)}</strong></div><div><span>Letter Grade</span><strong>{projectedFinal === null ? (currentAverage !== null ? `${getLetterGrade(currentAverage, normalizedScale)} (completed work)` : '—') : projectedGrade}</strong></div><div><span>Pass Status</span><strong>{projectedFinal === null ? (currentAverage !== null && meetsThreshold(currentAverage, passMark) ? 'Currently Above Pass Threshold' : 'Currently Below Pass Threshold') : meetsThreshold(projectedFinal, passMark) ? 'Pass' : 'Fail'}</strong></div><div><span>Target</span><strong>{targetType === 'grade' ? targetGrade : fmt(target, precision)}</strong></div><div><span>Required Score</span><strong>{requiredSelected?.requiredPercent !== null && requiredSelected?.requiredPercent !== undefined && requiredSelected.missingAssumptions?.length === 0 ? (requiredSelected.requiredPercent > 100 ? 'Not achievable' : requiredSelected.requiredPercent <= 0 ? 'Target secured' : `${requiredSelected.requiredPercent.toFixed(precision)}% on ${selectedTargetAssessment?.name || 'selected assessment'}`) : fmt(requiredRemaining, precision)}</strong></div></div>
        <p className="print-note">What-If values are mathematical scenarios, not predictions of future academic performance. Grade boundaries depend on the active custom scale.</p>
        <div className="print-generated">Generated: {new Date().toLocaleString()}</div>
      </section>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} gradeScale={gradeScale} onSaveGradeScale={(next) => { setGradeScale(next); toast('Grade scale updated'); }} settings={settings} setSettings={setSettings} onExportData={exportData} onImportClick={() => importRef.current?.click()} onResetGradeScale={(next) => { setGradeScale(next); toast('Grade scale reset', 'info'); }} onDeleteAll={deleteAllSaved} />
      <input ref={importRef} className="hidden-input" type="file" accept="application/json,.json" onChange={handleImportFile} />

      <ConfirmDialog open={Boolean(confirm)} title={confirm?.title || ''} message={confirm?.message || ''} confirmText={confirm?.confirmText} destructive={confirm?.destructive} onCancel={() => { setConfirm(null); if (pendingImport) setPendingImport(null); }} onConfirm={() => { const action = confirm?.action; setConfirm(null); action?.(); }} />

      <Modal open={Boolean(renameScenario)} title="Rename scenario" onClose={() => setRenameScenario(null)}>
        <label className="field-block"><span>Scenario name</span><input value={renameText} onChange={(e) => setRenameText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && applyRename()} /></label>
        <div className="modal-actions"><button className="button ghost" onClick={() => setRenameScenario(null)}>Cancel</button><button className="button primary" disabled={!renameText.trim()} onClick={applyRename}><Save size={16} /> Save Name</button></div>
      </Modal>

      <ToastStack toasts={toasts} />
    </div>
  );
}

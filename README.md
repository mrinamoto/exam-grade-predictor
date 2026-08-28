# Exam Grade Predictor

A polished, frontend-only academic planning application for calculating weighted performance, exploring future grade scenarios, and determining what score is required to reach a target.

## Project Overview

Exam Grade Predictor helps students model a course using editable assessment components such as quizzes, assignments, midterms, projects, labs, presentations, and final exams. It separates **current average** from **course points already earned**, supports pending assessments, and avoids pretending that an incomplete course has a known final result.

## Problem It Solves

Students often make three mistakes when estimating grades:

1. They average assessment percentages without considering weights.
2. They confuse earned course points with their average across completed work.
3. They treat guesses about future exams as if they were actual marks.

This application makes those distinctions explicit and provides transparent formulas.

## Main Features

- Editable course name, code, pass mark, and grade scale
- Dynamic assessment rows with Completed/Pending status
- Weight validation for below, equal to, or above 100%
- Current weighted course points
- Current average across completed course weight
- Projected final score only when the course model is mathematically complete
- Target percentage or target letter grade
- Required average across all remaining work
- Required score for a selected pending assessment
- Required raw mark with optional upward whole-mark rounding
- Multi-assessment What-If simulator
- Best possible and minimum mathematical outcomes (shown only for a complete 100% weighting model)
- Grade possibility / reachability table
- Pass-threshold requirement
- Saved planning scenarios using localStorage
- Scenario load, duplicate, rename, delete, and compare
- Historical grade-scale snapshot in saved scenarios
- CSV grade-breakdown export
- JSON backup/import for scenarios and settings
- Copyable summary
- A4-friendly print report / Save as PDF
- Light and dark themes
- Responsive desktop, tablet, and mobile layouts
- Accessible labels, keyboard focus states, modal focus handling, and text status indicators

## Technology Stack

- React
- Vite
- JavaScript
- Modern CSS
- Lucide React
- Browser localStorage

There is **no backend, API, database, authentication system, Firebase, Supabase, MySQL, MongoDB, PostgreSQL, PHP, or Express server**.

## Weighted Grade Calculation

For an assessment:

```text
Assessment Percentage = (Score Earned / Maximum Score) × 100
Weighted Contribution = Assessment Percentage × Weight / 100
```

Example:

```text
Quiz = 8 / 10
Quiz Percentage = 80%
Quiz Weight = 10%
Weighted Contribution = 80 × 10 / 100 = 8 course points
```

## Current Average vs Course Points

These values are deliberately different.

```text
Current Course Points = sum of completed weighted contributions
Current Average = Current Course Points / Completed Weight × 100
```

If a student has earned 41 course points from 50% completed course weight:

```text
Course Points = 41 / 100
Current Average = 41 / 50 × 100 = 82%
```

The application does not incorrectly display 41% as the student's completed-work average.

## Required Final Score Formula

If a selected assessment is the only unresolved component after all other future assumptions have been supplied:

```text
Required Assessment % =
(Target Overall % - Existing Course Points - Assumed Future Points)
/ Selected Assessment Weight × 100
```

If only a 40%-weight Final remains and the student already has 55 course points:

```text
Target = 75%
Required Final = (75 - 55) / 40 × 100 = 50%
```

## Required Remaining Average

When several assessments remain:

```text
Required Remaining Average =
(Target Overall % - Current Course Points)
/ Remaining Weight × 100
```

The app does not blindly invent a single required Final score when other pending assessments have no assumptions.

## Letter Grade System

The included grade scale is an editable **example only**:

- A+ = 90+
- A = 85+
- A- = 80+
- B+ = 75+
- B = 70+
- B- = 65+
- C+ = 60+
- C = 55+
- D = 50+
- F = 0+

Different institutions use different grade boundaries. Edit the scale in Settings.

## Custom Grade Scale

Settings lets the user edit grade labels and minimum percentages. The editor uses a draft-and-save flow: invalid percentages, duplicate labels, or duplicate thresholds cannot replace the active scale. A lowest 0% threshold is required so every possible course percentage maps to a grade. Valid thresholds are ordered from highest to lowest when saved. Saved scenarios store a snapshot of the grade scale that existed when the scenario was saved.

## Pass / Fail

The pass mark is configurable. A completed/projected 100%-weight model can show Pass or Fail. An incomplete course uses wording such as current threshold status rather than claiming a final result.

## What-If Analysis

Pending assessments accept simulated percentages through both numeric inputs and sliders. Presets from 50% to 100% make quick comparison easy. Simulated values remain separate from actual completed marks.

## Best Possible Grade

The best possible final score assumes 100% on every currently pending, assigned assessment. This is a mathematical ceiling, not a prediction.

## Grade Possibility Table

For each configured grade, the table calculates the average required across remaining assigned course weight and labels the result as:

- Secured
- Reachable
- Perfect Score Required
- Not Reachable

The target planner may additionally describe reachable targets as comfortably achievable or requiring strong performance. These are deterministic planning labels, not institutional standards.

## Saved Scenarios

A scenario stores:

- course information
- assessments
- grade-scale snapshot
- pass mark
- target configuration
- What-If assumptions
- projected result when available
- save date

Scenarios can be loaded, duplicated, renamed, deleted, and compared up to three at a time.

## localStorage

The project uses versioned keys:

```text
examGradePredictor.scenarios
examGradePredictor.gradeScale
examGradePredictor.settings
examGradePredictor.theme
examGradePredictor.draft
examGradePredictor.dataVersion
```

JSON is parsed safely. Corrupted storage falls back to defaults instead of crashing the UI.

## Export / Print

- **Export CSV**: assessment score, maximum mark, percentage, weight, contribution, and status
- **Export Data**: JSON backup for saved scenarios, grade scale, and settings
- **Import Data**: validates basic schema and grade-scale validity before replacement
- **Copy Summary**: uses the Clipboard API
- **Print / Save PDF**: uses an A4-oriented `@media print` report

## Responsive Design

The interface is designed for common desktop, tablet, and phone widths. On smaller screens the assessment table becomes touch-friendly assessment cards rather than a squeezed desktop table.

## Accessibility

The app includes semantic sections, visible labels, keyboard focus styles, accessible names for icon buttons, range inputs with labels, status text in addition to color, and focus containment/escape handling for modal dialogs.

## Project Structure

```text
exam-grade-predictor/
├── index.html
├── package.json
├── README.md
├── PROJECT_GUIDE.md
├── FINAL_AUDIT.md
├── scripts/
│   └── test-calculations.mjs
└── src/
    ├── App.jsx
    ├── main.jsx
    ├── components/
    │   ├── AssessmentList.jsx
    │   ├── ConfirmDialog.jsx
    │   ├── Header.jsx
    │   ├── Modal.jsx
    │   ├── SavedScenarios.jsx
    │   ├── ScenarioComparison.jsx
    │   ├── SettingsModal.jsx
    │   ├── Toast.jsx
    │   └── WhatIfSimulator.jsx
    ├── data/
    │   └── defaultGradeScale.js
    ├── utils/
    │   ├── exportUtils.js
    │   ├── gradeCalculations.js
    │   ├── storageUtils.js
    │   └── validation.js
    └── styles/
        ├── app.css
        ├── globals.css
        ├── print.css
        └── responsive.css
```

## Final Audit Record

`FINAL_AUDIT.md` documents the final mathematics, validation, storage, accessibility, responsive, and build-environment audit.

## Installation

Requirements: Node.js 20.19+ or 22.12+ (or a newer compatible release).

```bash
npm install
```

## Run Locally

```bash
npm run dev
```

Open the local URL shown by Vite.

## Production Build

```bash
npm run build
npm run preview
```

## Calculation Test

```bash
npm run test:audit
```

The audit suite verifies weighted contribution, current average vs course points, full-course projection, 90/100/110 weight states, required selected-assessment scores, raw-mark rounding, multiple pending assumptions, secured/impossible/exact-100 targets, What-If non-mutation, best/minimum bounds, letter-grade boundaries with floating-point tolerance, grade-scale validation, CSV escaping, and malformed localStorage fallback.

## Final Audit Hardening

The final audit added several correctness safeguards:

- `score > maxScore`, negative scores, zero maximum marks, and invalid per-assessment weights return no calculated percentage/contribution.
- Exact 100% requirements are treated as achievable and labeled **Perfect Score Required**, not impossible.
- Best-case display never exceeds 100% because the project has no extra-credit model.
- Over-100% course weighting blocks final outcome/reachability interpretation until corrected.
- Grade-scale edits are drafted first and only replace the active scale after validation.
- What-If values are cleared when an assessment status changes, preventing stale simulation values from being mistaken for current inputs.
- The default Final Exam is identified by its stable assessment ID for default selection; calculation logic itself works with any pending assessment and does not depend on its name.
- Saved scenario outcomes are re-derived from their saved assessments, simulations, pass mark, and grade-scale snapshot when recovered/imported.
- CSV output quotes fields correctly and includes a UTF-8 BOM on download for better Unicode spreadsheet compatibility.

## Limitations

- Results depend entirely on user-entered marks, weights, and assessment status.
- Different universities and schools use different grading systems.
- The default grade scale is only an editable example.
- The application does not access official university records.
- What-If results are mathematical scenarios, not predictions of future academic performance.
- Saved data stays only in the current browser.
- Clearing localStorage may remove scenarios and settings.
- There is no cross-device synchronization.
- No extra-credit model is implemented; score cannot exceed maximum marks.
- The app does not claim official grade-prediction accuracy.

## Future Improvements

Possible extensions include course portfolios across multiple subjects, GPA/CGPA integration, optional cloud synchronization, richer charting, import from LMS exports, institution-specific reusable templates, and automated unit-test coverage for more boundary cases.

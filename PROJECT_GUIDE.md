# Exam Grade Predictor — Project Guide

This guide is written for a university student who needs to understand, demonstrate, and explain the project clearly in a presentation or viva.

## 1. Project overview
Exam Grade Predictor is a browser-based academic planning application. A student enters assessments, marks, maximum marks, and course weights. The app calculates current performance and helps plan future scores.

## 2. Problem solved
Students often estimate grades incorrectly because course components have different weights. This app uses weighted mathematics and clearly separates completed results from future scenarios.

## 3. Main features
Dynamic assessments, weight validation, current average, course points, target planning, required-score calculation, What-If simulation, best-case result, grade possibility table, custom grade scale, pass/fail logic, local scenario storage, export, backup, and print reporting.

## 4. Technology used
React handles the interface and state. Vite runs the development/build workflow. JavaScript contains the calculations. CSS handles layout and themes. Lucide React provides icons. localStorage stores browser-local data.

## 5. Why React
React is suitable because many UI values depend on the same changing data. When a score, weight, target, or simulation changes, React recalculates and updates dependent components predictably.

## 6. Why Vite
Vite gives a fast development server, simple React setup, ES-module support, and an optimized production build with minimal configuration.

## 7. Why no backend/database
The project does not need user accounts or server-side shared data. Academic planning inputs can stay inside the browser, which keeps deployment simple and demonstrates frontend state management.

## 8. Assessment data structure
Each assessment uses an object similar to:

```js
{
  id,
  name,
  score,
  maxScore,
  weight,
  status
}
```

`status` is either `completed` or `pending`.

## 9. Assessment weights
A weight tells us how much an assessment contributes to the final course percentage. A 10% Quiz can add at most 10 course points.

## 10. Why weights should total 100%
A complete course model normally represents the full course. If the total is below 100%, some course weight is missing. If it is above 100%, the model is mathematically inconsistent.

## 11. Assessment percentage formula

```text
Assessment Percentage = Score / Maximum Score × 100
```

Example: `8 / 10 × 100 = 80%`.

## 12. Weighted contribution formula

```text
Weighted Contribution = Assessment Percentage × Weight / 100
```

For an 80% Quiz with weight 10%, the contribution is 8 course points.

## 13. Current course points
Current course points are the sum of weighted contributions from completed assessments. They are measured against the full 100-point course.

## 14. Current average

```text
Current Average = Course Points / Completed Weight × 100
```

It measures performance only across work already completed.

## 15. Difference between Current Average and Course Points
If 50% of the course is completed and the student has earned 41 course points, course points are `41 / 100`, but current average is `41 / 50 × 100 = 82%`.

## 16. Projected final grade
A projected final score is shown only when the assessment weights total 100% and every pending component has a What-If value. Completed marks remain actual; pending values remain simulations.

## 17. Pending assessments
Pending assessments have known maximum marks and weights but do not need an actual score. They can receive temporary What-If percentages.

## 18. Required final score formula
If only one target assessment is unresolved after other assumptions:

```text
Required % =
(Target - Existing Course Points - Other Assumed Future Points)
/ Target Assessment Weight × 100
```

## 19. Required raw final mark

```text
Required Raw Mark = Required Percentage / 100 × Maximum Mark
```

If 72% is required on a 50-mark Final, the precise raw mark is 36.

## 20. Why required raw marks may use Math.ceil
If only whole marks are allowed and the precise requirement is 35.2/50, 35 is not enough. `Math.ceil(35.2)` gives 36, the minimum whole mark that actually reaches the target.

## 21. Multiple remaining assessments
When Project and Final are both pending, there is no unique required Final score until the user provides an assumption for Project. The app refuses to pretend there is one.

## 22. Required remaining average

```text
Required Remaining Average =
(Target - Current Course Points) / Remaining Weight × 100
```

This is useful when several components remain.

## 23. Target percentage
The user can directly enter a final course target such as 80%.

## 24. Target letter grade
The user can choose a grade such as A-. The app converts it to the minimum percentage defined by the active grade scale.

## 25. Letter-grade lookup
Grade thresholds are sorted from highest minimum to lowest. The first threshold that the score reaches determines the displayed letter grade.

## 26. Custom grading scale
The grade editor works on a local draft. Invalid percentages, duplicate labels, and duplicate threshold percentages cannot replace the active grading scale. The scale must include a lowest 0% threshold so there is no uncovered score range. Valid thresholds are normalized into descending order when saved.

## 27. Pass/fail logic
When a final/projected full-course score is known, it is compared with the custom pass mark. While the course is incomplete, the app avoids calling the status a final Pass/Fail.

## 28. What-If simulator
Each pending assessment gets a temporary percentage. Sliders provide fast testing and numeric inputs provide precision. Simulations do not overwrite actual marks.

## 29. Best possible result

```text
Best Possible = Existing Course Points + all Pending Weights
```

because 100% performance in a pending component earns its full weight as course points.

## 30. Grade possibility table
For each letter-grade threshold, the app calculates the required average across remaining work. The result is classified as Secured, Reachable, Perfect Score Required (exactly 100%), or Not Reachable (more than 100%).

## 31. Impossible target detection
If a required percentage is greater than 100, the app displays that the target is not achievable. Exactly 100% is still achievable and is labeled Perfect Score Required. It never presents 127% as a normal valid score.

## 32. Saved scenarios
A scenario is a snapshot of a planning state. It stores course data, assessments, target, simulation values, pass mark, projected result, and the grade scale that existed at save time.

## 33. localStorage
localStorage is a browser key-value storage API. Values are stored as JSON strings and persist after refresh in the same browser unless cleared.

## 34. Data backup
The Settings panel exports scenarios, grade scale, and settings to JSON. Import performs basic schema and grade-scale validation before replacement.

## 35. CSV export
The CSV includes assessment name, score, maximum score, calculated percentage, weight, contribution, and status. CSV values are quoted and embedded quotes are escaped.

## 36. Print report
A print-only section is styled with `@media print`. Navigation and editing controls are hidden, creating an A4-friendly Grade Prediction Report that can be saved as PDF from the browser print dialog.

## 37. Charts
The project intentionally uses a small number of visualizations. Weighted contribution is shown with progress bars and the outcome range is shown as a compact score range.

## 38. Theme system
A light/dark theme value is stored in localStorage. CSS variables switch background, surface, border, text, and status colors.

## 39. Important React hooks
- `useState`: stores course inputs, assessments, scenarios, theme, and dialogs.
- `useMemo`: derives calculation-heavy values from current state.
- `useEffect`: persists browser data and synchronizes theme/document behavior.
- `useRef`: references the hidden JSON import input and modal elements.

## 40. Formula utility functions
All core grade formulas live in `src/utils/gradeCalculations.js`. This includes weighted contribution, current average, required remaining average, selected-assessment requirements, required raw-mark rounding, best/minimum outcomes, grade lookup, threshold tolerance, and grade possibilities. Components call these functions instead of rewriting formulas in many places.

## 41. Input validation
Maximum score must be greater than zero. Weight must be 0–100. Completed score must be numeric, non-negative, and not greater than maximum marks. Invalid values do not become valid calculations.

## 42. Responsive design
Desktop uses a data table and multi-column dashboard. Tablet reduces the grid. Mobile replaces the assessment table with stacked cards and keeps touch targets large.

## 43. Accessibility
Inputs have labels, icon buttons have `aria-label`, statuses contain text rather than only color, focus states are visible, sliders have accessible names, and modals use unique title IDs, Escape handling, focus containment, and focus restoration.

## 44. How to run project

```bash
npm install
npm run dev
```

## 45. How to build project

```bash
npm run build
npm run preview
```

## 46. How to change default weights
Edit `DEFAULT_ASSESSMENTS` in `src/data/defaultGradeScale.js`. These are examples only. Users can also change weights directly in the UI.

## 47. How to change grade scale
Use Settings, edit the grade-scale draft, and click **Save Grade Scale**. Invalid drafts are blocked. You can also edit `DEFAULT_GRADE_SCALE` in `src/data/defaultGradeScale.js` for the initial example.

## 48. How to add assessment types
Click **Add Assessment**. The assessment name is free text, so it can represent Presentation, Lab, Project, Attendance, Viva, Class Test, Practical, or another component.

## 49. Common errors and fixes
- **Weights below 100%**: assign the missing weight.
- **Weights above 100%**: reduce one or more weights.
- **Score disabled**: switch status from Pending to Completed.
- **No projected final**: ensure total weight is 100% and every pending item has a What-If value.
- **No required selected score**: enter What-If values for every other pending assessment.
- **Import fails**: verify the file is a backup JSON exported by the app.
- **Saved data disappeared**: browser storage may have been cleared or a different browser/profile is being used.

## 50. Limitations
Results depend on user data. Grading rules differ by institution. The default scale is not official. There is no official-record integration, cloud account, or cross-device synchronization. What-If outputs are mathematical scenarios rather than predictions.

## 51. Future improvements
Potential upgrades: GPA/CGPA integration, multiple courses in one semester, cloud sync, institution templates, richer automated tests, LMS import, and optional server accounts.

## Final audit notes
The final audit verifies these implementation details:

- The completed-work average is never confused with course points.
- Invalid assessment marks do not generate percentage or contribution values.
- Required raw marks use full precision internally and round upward only when whole marks are enabled.
- Multiple pending assessments require explicit assumptions for every non-selected pending component.
- Exact 100% is reachable; values over 100% are not.
- What-If calculations do not mutate completed marks, and status changes clear stale simulations for that assessment.
- Over-100% weighting blocks final outcome and grade-possibility interpretation.
- The calculation engine does not depend on an assessment being literally named “Final Exam”; the default Final row has a stable `final` ID only for default UI selection.
- Saved scenarios keep a grade-scale snapshot and are re-derived from saved inputs when recovered.
- Malformed browser JSON falls back safely.
- CSV fields escape commas and quotes and preserve Unicode.

Audit command:

```bash
npm run test:audit
```

# Viva Questions and Answers

### 1. What is a weighted grade?
A weighted grade gives different assessments different importance. A 50% Final affects the course result more than a 10% Quiz.

### 2. Why can’t we simply average Quiz, Midterm, and Final percentages?
Because their weights may be different. A simple arithmetic average ignores how much each component contributes to the course.

### 3. What is weighted contribution?
It is the number of final course percentage points earned from one assessment.

### 4. How do you calculate weighted contribution?
`(score / maxScore × 100) × weight / 100`.

### 5. What is the difference between current average and course points?
Current average measures performance across completed weight. Course points measure how many points have already been earned toward the full 100-point course.

### 6. Why is 41 course points not always a 41% current average?
If only 50% of course weight is completed, 41 points means `41 / 50 = 82%` average on completed work.

### 7. How is the required Final score calculated?
The app subtracts already earned course points and other future assumed points from the target, then divides the remaining points by the Final weight.

### 8. What happens if the required Final score is over 100%?
The target is labeled not achievable through that assessment. The app does not show the impossible percentage as a normal valid score.

### 9. What happens if the required score is zero or negative?
The target is already mathematically secured under the entered data and assumptions.

### 10. Why does the app use Math.ceil for some raw marks?
If whole marks are required, rounding down could fail the target. Math.ceil returns the smallest whole mark that is sufficient.

### 11. How does What-If analysis work?
Pending assessments receive temporary simulated percentages. The app recomputes a projected result without converting those simulations into actual completed marks.

### 12. Why is the grading scale customizable?
Different universities use different letter-grade boundaries, so fixed universal thresholds would be inaccurate.

### 13. How does localStorage work here?
JavaScript stores JSON strings under named browser keys. The data persists in the same browser after refresh.

### 14. Why is there no database?
The project is intentionally frontend-only and does not require shared accounts or server-side persistence.

### 15. How is the best possible grade calculated?
The app assumes 100% in every pending assessment, so each pending assessment contributes its full weight.

### 16. What is the minimum mathematical outcome?
It is the final score if every remaining assigned assessment receives 0%.

### 17. How does the app determine pass/fail?
It compares a known full-course projected/final percentage with the configured pass mark.

### 18. Why doesn’t an incomplete course always show Pass or Fail?
Remaining assessments can still change the result, so calling it final Pass/Fail would be misleading.

### 19. How are multiple pending assessments handled?
The app calculates the average needed across all remaining work. To solve one specific assessment, the user must provide assumptions for the other pending items.

### 20. What is the grade possibility table?
It shows how much average performance is required across remaining work to reach each configured letter grade.

### 21. What does “Secured” mean?
Even if the student scores 0 on remaining assigned assessments, the existing course points are already enough to meet that grade threshold.

### 22. What does “Not Reachable” mean?
The grade would require an average above 100% across the remaining assigned weight.

### 23. Why save a grade-scale snapshot inside a scenario?
If the global scale changes later, the saved scenario still records the grading rules that were used when it was created.

### 24. How do you prevent localStorage corruption from crashing the app?
Storage reads use safe JSON parsing with fallback defaults inside try/catch logic.

### 25. How is CSV escaping handled?
Every CSV value is quoted, and quote characters inside a value are doubled.

### 26. How does the print report work?
A print-only report exists in the page and CSS displays it only during printing while hiding navigation and editing controls.

### 27. What is Vite’s role?
Vite provides the development server and builds optimized static production files into the `dist` folder.

### 28. Why centralize calculation functions?
It avoids duplicated formulas, makes logic easier to test, and prevents different UI components from calculating the same grade differently.

### 29. What validation is performed on an assessment?
Name is required, maximum score must be positive, weight must be 0–100, and a completed score must be between 0 and maximum score.

### 30. Is this an AI grade predictor?
No. The insight text and calculations are deterministic mathematics. The app does not claim to predict future academic behavior using AI.

### 31. What happens when weights total only 90%?
The UI reports that 10% is unassigned and avoids presenting a complete final course result.

### 32. What happens when weights total 110%?
The app reports that the weights exceed 100% and the course model must be corrected.

### 33. What is the role of `useMemo` here?
It derives values such as current average, course points, grade possibilities, and projections only when their dependencies change.

### 34. Can saved scenarios synchronize to another device?
No. localStorage is local to the current browser/profile. A user can manually export/import a JSON backup.

### 35. What is the biggest limitation of the project?
Its accuracy is limited by the grading rules and marks entered by the user; it does not read official university systems.


### 36. Why is exactly 100% not classified as impossible?
Because 100% is still a valid achievable score. The app labels it **Perfect Score Required**. Only a requirement above 100% is mathematically unreachable without extra credit.

### 37. Why must the grade scale include a 0% threshold?
The app stores only minimum thresholds. A lowest 0% entry ensures every possible score has a matching grade and prevents an uncovered range below the lowest configured threshold.

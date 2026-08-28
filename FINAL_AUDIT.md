# Exam Grade Predictor — Final Audit Record

This audit was performed against the existing Phase 1 Exam Grade Predictor. The application architecture and working features were preserved and hardened rather than replaced with an unrelated implementation.

## Mathematical verification

Verified and regression-tested:

- Assessment percentage: `score / maxScore × 100`
- Weighted contribution: `assessment percentage × weight / 100`
- Current Course Points as the sum of completed weighted contributions
- Current Average as `course points / completed weight × 100`
- Full-course projected percentage only when the course model is valid and every pending score is known
- Weight states for incomplete, exactly 100%, over 100%, and malformed weights
- Required average across remaining course weight
- Required score for a selected pending assessment with explicit assumptions for every other pending assessment
- Required raw mark conversion and upward whole-mark rounding
- Target already secured, exact 100% perfect-score requirement, and impossible >100% requirement
- Best possible and minimum mathematical outcomes
- Grade possibility statuses: Secured, Reachable, Perfect Score Required, Not Reachable
- Grade-boundary tolerance for floating-point noise
- Pass/fail threshold tolerance

## Validation and data-safety verification

- Completed score must be between 0 and maximum score
- Maximum score must be greater than 0
- Assessment weight must be between 0 and 100
- Invalid assessment rows block final-course interpretation
- Grade thresholds must be valid, unique, and include a 0% floor
- Grade-scale edits use a draft-and-save flow so invalid drafts do not replace the active scale
- What-If scores stay separate from actual completed marks
- Saved scenarios keep their grade-scale snapshot and are re-derived when loaded from stored data
- Malformed localStorage JSON falls back safely
- Backup import is schema-checked before replacement
- CSV output escapes commas, quotes, and Unicode correctly

## UI, responsive, and accessibility audit

Reviewed the desktop/tablet/mobile layout and responsive rules for the requested target widths. The CSS provides default desktop behavior plus breakpoints at 1120px, 900px, 700px, and 460px to cover 1440, 1024, 768, 430, and 375 pixel targets.

Accessibility hardening includes:

- semantic headings and labelled controls
- `aria-invalid` on invalid assessment fields
- `aria-pressed` for target and What-If preset controls where appropriate
- accessible range labels/value text
- text labels in addition to color for status states
- focus-trapped dialogs with Escape handling, focus restoration, and React-generated unique title IDs
- custom confirmation dialogs instead of browser alerts

## Static/code-quality checks

Passed locally in the audit environment:

- calculation/storage/export regression suite (`npm run test:audit`)
- JavaScript/JSX parsing and unused-local/unused-parameter checks with the available TypeScript compiler
- CSS parsing for all project stylesheets with the available PostCSS parser
- source scan for `console.log`, `Math.random`, browser `alert()`, and fragile Final-name regex matching

No occurrences of those banned/fragile patterns remain in application source.

## Production dependency/build verification

The project declares normal Vite/React dependencies and the pinned versions were cross-checked as published package versions. In this audit sandbox, `npm install` could not reach `registry.npmjs.org` because DNS resolution returned `EAI_AGAIN`. Because dependencies could not be installed in this environment, the Vite production build and dev-server launch cannot honestly be marked as executed successfully here.

This is an environment/network limitation, not a substituted build result. On a machine with npm registry access, run:

```bash
npm install
npm run test:audit
npm run build
npm run dev
```

The final ZIP intentionally excludes generated `node_modules` and `dist` folders.

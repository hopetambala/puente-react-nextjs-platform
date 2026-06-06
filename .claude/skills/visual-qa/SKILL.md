---
name: visual-qa
description: >
  Use when: taking screenshots of the running Puente Manage app to audit
  visual quality, spot layout or typography regressions, or verify that a
  redesign change looks correct in the browser. Runs Playwright headlessly,
  logs in, and screenshots every authenticated page. Saves PNGs to
  .claude/screenshots/ then reads them back so issues can be diagnosed and
  fixed immediately.
---

# Visual QA — screenshot + fix workflow

## Steps

1. Confirm `yarn dev` is running on port 3000 (start it in background if not).
2. Run the screenshot script:
   ```
   PARSE_USERNAME=Test PARSE_PASSWORD=test node .claude/skills/visual-qa/screenshot.mjs
   ```
3. Read each PNG from `.claude/screenshots/` using the Read tool.
4. For each screenshot, list every visual defect (spacing, typography, colour,
   alignment, overflow, broken layout).
5. Fix defects in order of severity — layout breaks first, then spacing, then
   colour/type.
6. After fixing, re-run the script and compare before/after screenshots.
7. Repeat until no defects remain.

## Pages captured

| File prefix | Route |
|---|---|
| 00-landing | / |
| 01-login | /account/login |
| 02-dashboard | /quick-start |
| 03-form-manager | /forms/form-manager |
| 04-form-creator | /forms/form-creator |
| 05-form-marketplace | /forms/form-marketplace |
| 06-data-visualization | /data/data-visualization |
| 07-account-management | /account/management |

## Credentials

Username: `Test`  Password: `test`
Override with env vars `PARSE_USERNAME` / `PARSE_PASSWORD`.

## Output

Screenshots saved to `.claude/screenshots/<timestamp>_<page>.png` at 2× device
pixel ratio (1440 × 900 viewport) so text is sharp.

/**
 * Stylelint: the CSS half of the a11y gate (docs/responsive-a11y-overhaul.md,
 * "A11y tooling stack").
 *
 * The custom rules below prevent, at write time, the systemic failures the
 * audit found: focus outlines removed, px font sizes that ignore the user's
 * text size, raw colours that bypass the contrast-checked tokens, 100vh that
 * hides content under mobile browser chrome, and :focus styles that flash on
 * every mouse click.
 *
 * Violations that existed when the gate went in are counted, per file and per
 * rule, in `stylelint-baseline.json`. `yarn lint:css` (scripts/lint-css.mjs)
 * fails when any count goes up, or when one goes down without the baseline
 * being regenerated, so the list only shrinks. Running stylelint directly (or
 * in an editor) shows every violation, baselined or not, at full severity.
 */

// The one place allowed to reset outlines and style :focus, because it is
// where the global :focus-visible ring lives (PR 1b).
const GLOBAL_FOCUS_FILE = 'app/impacto-design-system/_css/root.css';
// The one place raw colour values may be written: the legacy alias layer that
// maps old names onto dlite tokens.
const TOKEN_ALIAS_FILE = 'app/impacto-design-system/_css/variables.css';

const A11Y_RULES = {
  // WCAG 2.4.7 / 2.4.11: never remove the focus indicator.
  'declaration-property-value-disallowed-list': [
    {
      outline: ['none', '0', '/^0\\s/', '/^none\\s/'],
      'outline-style': ['none'],
      'outline-width': ['0', '/^0[a-z]+$/'],
      // 100vh is taller than the visible area on mobile browsers, so the
      // bottom of the page sits under the toolbar. Use dvh.
      '/^(height|min-height|max-height|block-size|min-block-size|max-block-size)$/': ['/\\b100vh\\b/'],
    },
    { message: (prop, value) => `"${prop}: ${value}" is not allowed. Keep focus visible (WCAG 2.4.7) and use dvh, not 100vh.` },
  ],
  // WCAG 1.4.4: text must scale with the user's font size. Use the type tokens.
  'declaration-property-unit-disallowed-list': [
    { 'font-size': ['px'], font: ['px'] },
    { message: 'px font sizes ignore the reader\'s text size (WCAG 1.4.4). Use a --tk-dlite-semantic-typography-size-* token or rem.' },
  ],
  'declaration-no-important': true,
  // Colours come from the contrast-checked tokens, never from literals.
  'color-no-hex': true,
  'color-named': 'never',
  'function-disallowed-list': [['rgb', 'rgba', 'hsl', 'hsla', 'hwb', 'lab', 'lch', 'oklab', 'oklch', 'color']],
  // Stacking order comes from tokens, so layers can't drift.
  'declaration-property-value-allowed-list': [
    { 'z-index': ['/^var\\(--/', 'auto', 'inherit', 'initial', 'unset'] },
    { message: 'Use a z-index token (var(--…)), not a literal.' },
  ],
  // :focus fires on mouse clicks too; :focus-visible is what keyboard users see.
  'selector-pseudo-class-disallowed-list': [['focus'], { message: 'Use :focus-visible (or :focus-within), not :focus.' }],
};

module.exports = {
  extends: ['stylelint-config-standard-scss'],
  reportNeedlessDisables: true,
  reportInvalidScopeDisables: true,
  rules: {
    ...A11Y_RULES,

    // ── CSS Modules, not style preferences ─────────────────────────────────
    // Class names are read from JS as styles.fooBar, so camelCase is the
    // convention here, not kebab-case.
    'selector-class-pattern': null,
    'selector-id-pattern': null,
    'scss/dollar-variable-pattern': null,
    // :global() and composes are CSS Modules syntax.
    'selector-pseudo-class-no-unknown': [true, { ignorePseudoClasses: ['global', 'local'] }],
    'property-no-unknown': [true, { ignoreProperties: ['composes'] }],
    // Custom property names follow the dlite token names
    // (--tk-dlite-primitive-fontWeight-*), which are not kebab-case.
    'custom-property-pattern': null,

    // ── Formatting: Prettier's job, not the gate's ──────────────────────────
    // These rules only re-order or re-space correct CSS. Turning them on would
    // bury the a11y signal under thousands of whitespace warnings.
    'declaration-empty-line-before': null,
    'rule-empty-line-before': null,
    'at-rule-empty-line-before': null,
    'custom-property-empty-line-before': null,
    'comment-empty-line-before': null,
    'scss/double-slash-comment-empty-line-before': null,
    'comment-whitespace-inside': null,
    'scss/comment-no-empty': null,
    'length-zero-no-unit': null,
    'shorthand-property-no-redundant-values': null,
    'declaration-block-no-redundant-longhand-properties': null,
    'color-hex-length': null,
    'alpha-value-notation': null,
    'color-function-notation': null,
    'color-function-alias-notation': null,
    'value-keyword-case': null,
    'font-family-name-quotes': null,
    'import-notation': null,
    'number-max-precision': null,
    'media-feature-range-notation': null,
    'selector-not-notation': null,
    'selector-attribute-quotes': null,
    'property-no-vendor-prefix': null,
    'value-no-vendor-prefix': null,
    'selector-no-vendor-prefix': null,
    'at-rule-no-vendor-prefix': null,
    'keyframes-name-pattern': null,
    'hue-degree-notation': null,
    'scss/at-extend-no-missing-placeholder': null,
  },
  overrides: [
    {
      files: [GLOBAL_FOCUS_FILE],
      rules: {
        'declaration-property-value-disallowed-list': [{
          '/^(height|min-height|max-height|block-size|min-block-size|max-block-size)$/': ['/\\b100vh\\b/'],
        }],
        'selector-pseudo-class-disallowed-list': null,
      },
    },
    {
      files: [TOKEN_ALIAS_FILE],
      rules: {
        'color-no-hex': null,
        'color-named': null,
        'function-disallowed-list': null,
      },
    },
  ],
};

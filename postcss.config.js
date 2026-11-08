/**
 * PostCSS for Next.js. Writing this file replaces Next's built-in config, so
 * the first and last plugins restate Next 12's defaults exactly
 * (https://nextjs.org/docs/advanced-features/customizing-postcss-config).
 *
 * The two in the middle make the dlite breakpoint tokens usable in CSS:
 * `@media (--tk-dlite-bp-lg-down) { … }`. CSS custom properties can't be used
 * inside @media, so dlite publishes the breakpoints as @custom-media in
 * web/custom-media.css. global-data makes those definitions visible to every
 * stylesheet without importing them (and emits nothing); custom-media then
 * expands each query to its px value at build time. One breakpoint scale for
 * the whole app — see docs/responsive-a11y-overhaul.md, PR 1.
 */
module.exports = {
  plugins: {
    'postcss-flexbugs-fixes': {},
    '@csstools/postcss-global-data': {
      files: [require.resolve('style-dictionary-dlite-tokens/web/custom-media.css')],
    },
    'postcss-custom-media': {},
    'postcss-preset-env': {
      autoprefixer: { flexbox: 'no-2009' },
      stage: 3,
      features: { 'custom-properties': false },
    },
  },
};

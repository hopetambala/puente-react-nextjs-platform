/** @type { import('@storybook/react').Preview } */
// The same stylesheets pages/_app.js loads for the design system, so a story
// renders with real tokens. Without them every colour is unset and the a11y
// contrast results describe a page nobody sees.
import "style-dictionary-dlite-tokens/web/puente/default/primitives.css";
import "style-dictionary-dlite-tokens/web/puente/default/reset.css";
import "style-dictionary-dlite-tokens/web/puente/default/semantics.css";
import "style-dictionary-dlite-tokens/web/puente/default/utilities.css";
import "style-dictionary-dlite-tokens/web/puente/default/components.css";
import "style-dictionary-dlite-tokens/web/puente/default/variables.css";
import "app/impacto-design-system/_css/root.css";

import { BREAKPOINTS, WCAG_TAGS } from "../a11y.config";

const viewports = Object.fromEntries(
  Object.entries(BREAKPOINTS).map(([name, width]) => [
    name,
    { name: `${name} · ${width}px`, styles: { width: `${width}px`, height: "900px" }, type: "desktop" },
  ]),
);

const preview = {
  parameters: {
    actions: { argTypesRegex: "^on[A-Z].*" },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    viewport: { viewports },
    // The addon panel uses the same WCAG 2.2 AA rule set as the test-runner.
    a11y: { options: { runOnly: { type: "tag", values: WCAG_TAGS } } },
  },
};

export default preview;

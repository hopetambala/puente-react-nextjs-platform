import { createTheme } from '@material-ui/core/styles';

// MUI theme aligned with dlite Puente brand tokens. Temporary: Material-UI is
// removed from Manage by the responsive/a11y overhaul (docs/responsive-a11y-overhaul.md),
// and this file goes with it. Until then MUI 4 needs raw hex (no CSS vars), so
// these mirror the dlite values that pass WCAG AA contrast.
const theme = createTheme({
  palette: {
    primary: {
      main: '#1B5FDB', // blue-600, dlite 0.4.0 action-primary: white text 5.67:1 (the old #3D80FC was 3.69:1)
    },
    secondary: {
      main: '#FFE680', // --tk-dlite-primitive-color-yellow-200 (Puente accent)
    },
    error: {
      main: '#BF3813', // --tk-dlite-semantic-color-feedback-danger: 5.5:1 (MUI red.A400 was 3.85:1)
    },
    background: {
      default: '#F7F7F7', // --tk-dlite-primitive-color-neutral-100
    },
  },
  typography: {
    fontFamily: '"Plus Jakarta Sans", Roboto, Helvetica, Arial, sans-serif',
    h1: { fontFamily: '"Plus Jakarta Sans", Roboto, sans-serif', fontWeight: 700, letterSpacing: '-0.02em' },
    h2: { fontFamily: '"Plus Jakarta Sans", Roboto, sans-serif', fontWeight: 600, letterSpacing: '-0.02em' },
    h3: { fontFamily: '"Plus Jakarta Sans", Roboto, sans-serif', fontWeight: 600, letterSpacing: '-0.02em' },
    h4: { fontFamily: '"Plus Jakarta Sans", Roboto, sans-serif', fontWeight: 600 },
    h5: { fontFamily: '"Plus Jakarta Sans", Roboto, sans-serif', fontWeight: 600 },
    h6: { fontFamily: '"Plus Jakarta Sans", Roboto, sans-serif', fontWeight: 600 },
    button: { fontFamily: '"Plus Jakarta Sans", Roboto, sans-serif', fontWeight: 500, letterSpacing: '0.01em' },
  },
  shape: {
    borderRadius: 8, // --tk-dlite-semantic-border-radius-md
  },
});

export default theme;

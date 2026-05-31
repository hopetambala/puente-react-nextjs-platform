import { red } from '@material-ui/core/colors';
import { createTheme } from '@material-ui/core/styles';

// MUI theme aligned with dlite Puente brand tokens.
// MUI 4 requires raw hex values (no CSS vars), so these mirror the dlite primitives.
const theme = createTheme({
  palette: {
    primary: {
      main: '#3D80FC', // --tk-dlite-primitive-color-blue-600 (Puente brand)
    },
    secondary: {
      main: '#FFE680', // --tk-dlite-primitive-color-yellow-200 (Puente accent)
    },
    error: {
      main: red.A400, // --tk-dlite-semantic-color-feedback-danger
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

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
});

export default theme;

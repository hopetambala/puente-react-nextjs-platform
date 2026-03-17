import { makeStyles } from '@material-ui/core/styles';

const drawerWidth = 220;
const drawerCollapsed = 64;

const useStyles = makeStyles((theme) => ({
  root: {
    display: 'flex',
  },
  drawer: {
    width: drawerWidth,
    flexShrink: 0,
    whiteSpace: 'nowrap',
    '& .MuiDrawer-paper': {
      borderRight: 'none',
      backgroundColor: '#FFFFFF',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      overflowX: 'hidden',
    },
  },
  drawerOpen: {
    width: drawerWidth,
    transition: theme.transitions.create('width', {
      easing: theme.transitions.easing.sharp,
      duration: 200,
    }),
  },
  drawerClose: {
    width: drawerCollapsed,
    transition: theme.transitions.create('width', {
      easing: theme.transitions.easing.sharp,
      duration: 200,
    }),
    overflowX: 'hidden',
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 12px',
    borderBottom: '1px solid var(--color-border)',
    minHeight: 56,
  },
  brandName: {
    fontFamily: '"Plus Jakarta Sans", sans-serif',
    fontWeight: 700,
    fontSize: '1.125rem',
    letterSpacing: '-0.02em',
    color: 'var(--tk-dlite-primitive-color-blue-600)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
  },
  collapseBtn: {
    padding: 6,
    borderRadius: 6,
    minWidth: 'unset',
    color: 'var(--tk-dlite-semantic-color-text-secondary)',
    '&:hover': {
      backgroundColor: 'var(--tk-dlite-primitive-color-neutral-100)',
    },
  },
  navSection: {
    padding: '8px',
    flex: 1,
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '10px 12px',
    borderRadius: 8,
    cursor: 'pointer',
    color: 'var(--tk-dlite-semantic-color-text-secondary)',
    textDecoration: 'none',
    transition: 'background-color 0.15s ease, color 0.15s ease',
    marginBottom: 2,
    '&:hover': {
      backgroundColor: 'var(--tk-dlite-primitive-color-neutral-100)',
      color: 'var(--tk-dlite-semantic-color-text-primary)',
    },
  },
  navItemActive: {
    backgroundColor: 'var(--tk-dlite-primitive-color-blue-100)',
    color: 'var(--tk-dlite-primitive-color-blue-600)',
    '&:hover': {
      backgroundColor: 'var(--tk-dlite-primitive-color-blue-100)',
      color: 'var(--tk-dlite-primitive-color-blue-600)',
    },
  },
  navIcon: {
    fontSize: 20,
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 20,
    height: 20,
  },
  navLabel: {
    fontFamily: '"Plus Jakarta Sans", sans-serif',
    fontWeight: 500,
    fontSize: '0.875rem',
    lineHeight: 1.4,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
  },
  bottomSection: {
    padding: '8px',
    borderTop: '1px solid var(--color-border)',
  },
  dangerItem: {
    color: 'var(--tk-dlite-semantic-color-feedback-danger)',
    '&:hover': {
      backgroundColor: 'var(--tk-dlite-primitive-color-red-100)',
      color: 'var(--tk-dlite-semantic-color-feedback-danger)',
    },
  },
  content: {
    flexGrow: 1,
    padding: theme.spacing(3),
    backgroundColor: '#F7F7F7',
    minHeight: '100vh',
  },
}));

export default useStyles;

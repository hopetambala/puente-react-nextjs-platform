import Drawer from '@material-ui/core/Drawer';
import ChevronLeftIcon from '@material-ui/icons/ChevronLeft';
import ChevronRightIcon from '@material-ui/icons/ChevronRight';
import CreateIcon from '@material-ui/icons/CreateOutlined';
import ExitToAppIcon from '@material-ui/icons/ExitToApp';
import FormatListBulletedIcon from '@material-ui/icons/FormatListBulletedOutlined';
import PersonOutline from '@material-ui/icons/PersonOutline';
import StoreIcon from '@material-ui/icons/Store';
import { retrieveCurrentUserAsyncFunction, retrieveSignOutFunction } from 'app/modules/user';
import classNames from 'classnames';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { useState } from 'react';

import useStyles from './index.style';

const navItems = [
  { icon: FormatListBulletedIcon, label: 'Form Manager', path: '/forms/form-manager' },
  { icon: CreateIcon, label: 'Form Creator', path: '/forms/form-creator' },
  { icon: StoreIcon, label: 'Marketplace', path: '/forms/form-marketplace' },
];

function NavItem({ icon: Icon, label, onClick, active, danger, open, classes }) {
  return (
    <div
      role="button"
      tabIndex={0}
      className={classNames(classes.navItem, {
        [classes.navItemActive]: active,
        [classes.dangerItem]: danger,
      })}
      onClick={onClick}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      title={!open ? label : undefined}
    >
      <Icon className={classes.navIcon} fontSize="small" />
      {open && <span className={classes.navLabel}>{label}</span>}
    </div>
  );
}

export default function Header({ children }) {
  const { t } = useTranslation('common');
  const classes = useStyles();
  const [open, setDrawerOpen] = useState(true);
  const router = useRouter();

  const logout = () => retrieveSignOutFunction().then(() => router.push('/account/login'));
  const manage = async () => {
    const user = await retrieveCurrentUserAsyncFunction();
    return router.push(`/account/management?objectId=${user.id}`);
  };

  return (
    <div className={classes.root}>
      <Drawer
        variant="permanent"
        className={classNames(classes.drawer, {
          [classes.drawerOpen]: open,
          [classes.drawerClose]: !open,
        })}
        classes={{
          paper: classNames({
            [classes.drawerOpen]: open,
            [classes.drawerClose]: !open,
          }),
        }}
      >
        <div className={classes.brand}>
          {/* Product name — not copy, never translated. */}
          {open && <span className={classes.brandName}>Puente</span>}
          <div
            role="button"
            tabIndex={0}
            className={classes.collapseBtn}
            onClick={() => setDrawerOpen(!open)}
            onKeyDown={(e) => e.key === 'Enter' && setDrawerOpen(!open)}
          >
            {open ? <ChevronLeftIcon fontSize="small" /> : <ChevronRightIcon fontSize="small" />}
          </div>
        </div>

        <div className={classes.navSection}>
          {navItems.map((item) => (
            <NavItem
              key={item.path}
              icon={item.icon}
              label={item.label}
              onClick={() => router.push(item.path)}
              active={router.pathname === item.path}
              open={open}
              classes={classes}
            />
          ))}
        </div>

        <div className={classes.bottomSection}>
          <NavItem
            icon={PersonOutline}
            label={t('nav_account')}
            onClick={manage}
            open={open}
            classes={classes}
          />
          <NavItem
            icon={ExitToAppIcon}
            label={t('nav_logout')}
            onClick={logout}
            danger
            open={open}
            classes={classes}
          />
        </div>
      </Drawer>
      <main className={classes.content}>
        {children}
      </main>
    </div>
  );
}

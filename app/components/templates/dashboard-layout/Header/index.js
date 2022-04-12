import { List, ListItem } from '@material-ui/core';
import CssBaseline from '@material-ui/core/CssBaseline';
import Divider from '@material-ui/core/Divider';
import Drawer from '@material-ui/core/Drawer';
import IconButton from '@material-ui/core/IconButton';
import ChevronLeftIcon from '@material-ui/icons/ChevronLeft';
import ChevronRightIcon from '@material-ui/icons/ChevronRight';
import CreateIcon from '@material-ui/icons/Create';
import ExitToAppIcon from '@material-ui/icons/ExitToApp';
import FormatListBulletedIcon from '@material-ui/icons/FormatListBulleted';
import GetAppIcon from '@material-ui/icons/GetApp';
import StoreIcon from '@material-ui/icons/Store';
import theme from 'app/modules/theme';
import { retrieveSignOutFunction } from 'app/modules/user';
import clsx from 'clsx';
import { useRouter } from 'next/router';
import React from 'react';

import HeaderItem from './HeaderItem';
import useStyles from './index.style';

export default function Header({ children }) {
  const classes = useStyles();
  const [open, setDrawerOpen] = React.useState(false);
  const router = useRouter();

  const logout = () => retrieveSignOutFunction().then(() => router.push('/'));

  return (
    <div className={classes.root}>
      <CssBaseline />
      <Drawer
        variant="permanent"
        className={clsx(classes.drawer, {
          [classes.drawerOpen]: open,
          [classes.drawerClose]: !open,
        })}
        classes={{
          paper: clsx({
            [classes.drawerOpen]: open,
            [classes.drawerClose]: !open,
          }),
        }}
      >
        <div className={classes.toolbar}>
          {open && <h1>Puente</h1>}
          <IconButton onClick={() => setDrawerOpen(!open)}>
            {open ? <ChevronLeftIcon /> : <ChevronRightIcon />}
          </IconButton>
        </div>
        <Divider />
        <List>
          <HeaderItem link="/forms/form-marketplace" text="Marketplace">
            <StoreIcon />
          </HeaderItem>
          <HeaderItem link="/forms/form-manager" text="Manager">
            <FormatListBulletedIcon />
          </HeaderItem>
          <HeaderItem link="/forms/form-creator" text="Creator">
            <CreateIcon />
          </HeaderItem>
          <HeaderItem link="/data/data-exporter" text="Exporter">
            <GetAppIcon />
          </HeaderItem>
        </List>
        <List>
          <ListItem>
            <IconButton onClick={logout} style={{ color: theme.palette.error.main }}>
              {open ? <ExitToAppIcon /> : <ExitToAppIcon />}
            </IconButton>
          </ListItem>
        </List>
      </Drawer>
      <main className={classes.content}>
        <div className={classes.toolbar} />
        {children}
      </main>
    </div>
  );
}

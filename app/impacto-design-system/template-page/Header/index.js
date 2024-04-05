import { List, ListItem } from '@material-ui/core';
import CssBaseline from '@material-ui/core/CssBaseline';
import Divider from '@material-ui/core/Divider';
import Drawer from '@material-ui/core/Drawer';
import IconButton from '@material-ui/core/IconButton';
import BarChartOutlinedIcon from '@material-ui/icons/BarChartOutlined';
import ChevronLeftIcon from '@material-ui/icons/ChevronLeft';
import ChevronRightIcon from '@material-ui/icons/ChevronRight';
import CreateIcon from '@material-ui/icons/CreateOutlined';
import ExitToAppIcon from '@material-ui/icons/ExitToApp';
import FormatListBulletedIcon from '@material-ui/icons/FormatListBulletedOutlined';
import PersonOutline from '@material-ui/icons/PersonOutline';
import InsightsIcon from '@material-ui/icons/SearchOutlined';
import StoreIcon from '@material-ui/icons/Store';
import theme from 'app/modules/theme';
import { retrieveCurrentUserAsyncFunction, retrieveSignOutFunction } from 'app/modules/user';
import clsx from 'clsx';
import { useRouter } from 'next/router';
import React, { useState } from 'react';

import useStyles from './index.style';

const TabText = ({ isOpen, text }) => (isOpen ? <h4 style={{ marginLeft: 'var(--spacer-m)' }}>{text}</h4> : <></>);

export default function Header({ children }) {
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
          <IconButton onClick={() => setDrawerOpen(!open)}>
            {open ? <ChevronLeftIcon /> : <ChevronRightIcon />}
          </IconButton>
        </div>
        <List>
          <ListItem>
            <IconButton onClick={() => router.push('/forms/form-manager')}>
              <FormatListBulletedIcon />
              <TabText isOpen={open} text="Form Manager" />
            </IconButton>
          </ListItem>
          <ListItem>
            <IconButton onClick={() => router.push('/forms/form-creator')}>
              <CreateIcon />
              <TabText isOpen={open} text="Form Creator" />
            </IconButton>
          </ListItem>
          <ListItem>
            <IconButton onClick={() => router.push('/forms/form-marketplace')}>
              <StoreIcon />
              <TabText isOpen={open} text="Form Marketplace" />
            </IconButton>
          </ListItem>
          <ListItem>
            <IconButton onClick={() => router.push('/data/data-visualization')}>
              <InsightsIcon />
              <TabText isOpen={open} text="Quick Insights" />
            </IconButton>
          </ListItem>
          <ListItem>
            <IconButton onClick={() => router.push('/data/data-analysis')}>
              <BarChartOutlinedIcon />
              <TabText isOpen={open} text="Analytics Manager" />
            </IconButton>
          </ListItem>
        </List>
        <Divider />
        <List>
          <ListItem>
            <IconButton onClick={manage}>
              <PersonOutline />
              <TabText isOpen={open} text="Account Details" />
            </IconButton>
          </ListItem>
          <ListItem>
            <IconButton
              onClick={logout}
              style={{ color: theme.palette.error.main }}
            >
              <ExitToAppIcon />
              <TabText isOpen={open} text="Log out" />
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

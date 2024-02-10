import { List, ListItem } from '@material-ui/core';
import CssBaseline from '@material-ui/core/CssBaseline';
import Divider from '@material-ui/core/Divider';
import Drawer from '@material-ui/core/Drawer';
import HomeIcon from "@material-ui/icons/HomeOutlined";
import IconButton from '@material-ui/core/IconButton';
import ChevronLeftIcon from '@material-ui/icons/ChevronLeft';
import ChevronRightIcon from '@material-ui/icons/ChevronRight';
import InsightsIcon from "@material-ui/icons/SearchOutlined";
import CreateIcon from '@material-ui/icons/CreateOutlined';
import ExitToAppIcon from '@material-ui/icons/ExitToApp';
import FormatListBulletedIcon from '@material-ui/icons/FormatListBulletedOutlined';
import BarChartOutlinedIcon from "@material-ui/icons/BarChartOutlined";
import PersonOutline from '@material-ui/icons/PersonOutline';
import StoreIcon from '@material-ui/icons/Store';
import theme from 'app/modules/theme';
import { retrieveCurrentUserAsyncFunction, retrieveSignOutFunction } from 'app/modules/user';
import clsx from 'clsx';
import { useRouter } from 'next/router';
import React from 'react';

import useStyles from './index.style';

const TabText = ({ isOpen, text }) =>
  isOpen ? <h4 style={{ marginLeft: "var(--spacer-m)" }}>{text}</h4> : <></>;

export default function Header({ children }) {
  const classes = useStyles();
  const [open, setDrawerOpen] = React.useState(false);
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
          {open && <h1>PUENTE</h1>}
          <IconButton onClick={() => setDrawerOpen(!open)}>
            {open ? <ChevronLeftIcon /> : <ChevronRightIcon />}
          </IconButton>
        </div>
        <Divider />
        <List>
          <ListItem>
            <IconButton onClick={() => router.push("/quick-start")}>
              <HomeIcon />
              <TabText isOpen={open} text="Home" />
            </IconButton>
          </ListItem>
          <ListItem>
            <IconButton onClick={() => router.push("/forms/form-manager")}>
              <FormatListBulletedIcon />
              <TabText isOpen={open} text="Form Manager" />
            </IconButton>
          </ListItem>
          <ListItem>
            <IconButton onClick={() => router.push("/forms/form-creator")}>
              <CreateIcon />
              <TabText isOpen={open} text="Form Creator" />
            </IconButton>
          </ListItem>
          <ListItem>
            <IconButton onClick={() => router.push("/data/data-visualization")}>
              <InsightsIcon />
              <TabText isOpen={open} text="Quick Insights" />
            </IconButton>
          </ListItem>
          <ListItem>
            <IconButton onClick={() => router.push("/data/data-analysis")}>
              <BarChartOutlinedIcon />
              <TabText isOpen={open} text="Analytics Manager" />
            </IconButton>
          </ListItem>
          <ListItem>
            <IconButton onClick={() => router.push("/forms/form-marketplace")}>
              <StoreIcon />
              <TabText isOpen={open} text="Home" />
            </IconButton>
          </ListItem>
        </List>
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

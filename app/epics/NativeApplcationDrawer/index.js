import Button from '@material-ui/core/Button';
import Drawer from '@material-ui/core/Drawer';
import { withStyles } from '@material-ui/core/styles';
import React, { useState } from 'react';

import NativeApp from './NativeApp';

const styles = {
  list: {
    width: 250,
  },
  fullList: {
    width: 'auto',
  },
};

const TemporaryDrawer = ({ formItems, isOpen, onClose }) => {
  const sideList = (
    <div>
      <NativeApp
        formItems={formItems}
      />
    </div>
  );

  return (
    <Drawer anchor="right" open={isOpen} onClose={onClose}>
      <div tabIndex={0} role="button">
        {sideList}
      </div>
    </Drawer>
  );
};

export default withStyles(styles)(TemporaryDrawer);

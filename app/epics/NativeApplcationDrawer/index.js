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

const TemporaryDrawer = ({ formItems }) => {
  const [open, setOpen] = useState(false);

  const toggleDrawer = (newOpen) => {
    setOpen(newOpen);
  };

  const sideList = (
    <div>
      <NativeApp
        formItems={formItems}
      />
    </div>
  );

  return (
    <div>
      <Button onClick={() => toggleDrawer(true)}>Show Preview</Button>

      <Drawer anchor="right" open={open} onClose={() => toggleDrawer(false)}>
        <div
          tabIndex={0}
          role="button"
        >
          {sideList}
        </div>
      </Drawer>
    </div>
  );
};

export default withStyles(styles)(TemporaryDrawer);

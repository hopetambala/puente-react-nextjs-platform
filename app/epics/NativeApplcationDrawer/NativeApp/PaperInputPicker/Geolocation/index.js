import Button from '@material-ui/core/Button';
import React from 'react';
import {
  View,
} from 'react-native-web';

import { theme } from '../../theme';
import {
  stylesDefault,
} from '../index.style';

const Geolocation = ({ formikKey }) => (
  <View key={formikKey} style={stylesDefault.container}>
    <Button
      variant="outlined"
      theme={theme}
      color="primary"
    >
      Get Location
    </Button>
  </View>
);

export default Geolocation;

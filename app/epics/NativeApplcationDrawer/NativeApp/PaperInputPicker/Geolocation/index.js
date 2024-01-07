import Button from 'app/impacto-design-system/button';
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
      text='Get Location'
    />
  </View>
);

export default Geolocation;

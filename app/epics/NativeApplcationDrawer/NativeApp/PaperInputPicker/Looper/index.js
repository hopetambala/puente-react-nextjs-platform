import Button from 'app/impacto-design-system/button';
import React from 'react';
import {
  View,
} from 'react-native-web';

import {
  stylesDefault,
} from '../index.style';

const Looper = ({
  translatedLabel,
}) => (
  <View style={stylesDefault.container}>
    <Button variant="outlined" color="primary"> text=
      {'Add additional '}
      {translatedLabel}
    </Button>
  </View>
);

export default Looper;

import TextField from '@material-ui/core/TextField';
import React from 'react';
import {
  StyleSheet, View,
} from 'react-native-web';

import { stylesDefault, stylesPaper } from '../index.style';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingLeft: 15,
    paddingRight: 15,
    paddingTop: 10,
    marginBottom: 75,
  },
});

const AutoFill = (props) => {
  const {
    translatedLabel,
  } = props;

  return (
    <View style={styles.container}>
      <TextField
        label={translatedLabel}
        mode="outlined"
        theme={stylesPaper}
        style={stylesDefault.label}
      />
    </View>
  );
};

export default AutoFill;

import {
  StyleSheet,
} from 'react-native-web';

import { theme } from '../theme';

const stylesDefault = StyleSheet.create({
  horizontalLine: {
    borderBottomColor: '#D0D0D0',
    borderBottomWidth: 1,
    marginTop: 10,
    marginBottom: 10,

  },
  inputItem: {
    flex: 7,
    marginHorizontal: 5,
  },
  multiInputContainer: {
    flexDirection: 'row',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 10,
  },
  header: {
    fontWeight: 'bold',
    marginTop: 10,
  },
  label: {
    fontWeight: 'bold',
    color: theme.colors.black,
    backgroundColor: theme.colors.background,
  },
  labelImage: {
    fontWeight: 'bold',
    color: theme.colors.black,
    backgroundColor: theme.colors.background,
    paddingBottom: 10,
  },

});

const stylesPaper = {
  colors: {
    placeholder: theme.colors.black,
  },
  text: theme.colors.priary,
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
});

const styleX = StyleSheet.create({
  sideLabel: {
    flex: 1,
    marginTop: 'auto',
    marginBottom: 'auto',
    padding: 10,
    fontSize: 15,
  },
  textSplit: {
    fontSize: 35,
    marginLeft: 'auto',
    marginRight: 'auto',
    marginTop: 'auto',
    marginBottom: 25,
  },
});

const styleButton = StyleSheet.create({
  selected: {
    backgroundColor: 'primary',
    borderColor: 'primary',
    borderWidth: 1,
    borderRadius: 5,
    alignItems: 'center',
    color: 'primary',
    paddingHorizontal: 15,
    paddingVertical: 5,
    margin: 5,
  },
  unselected: {
    borderWidth: 1,
    borderColor: 'primary',
    borderRadius: 5,
    paddingHorizontal: 15,
    paddingVertical: 5,
    margin: 5,
  },
});

export {
  styleButton, styles, stylesDefault, stylesPaper, styleX,
};

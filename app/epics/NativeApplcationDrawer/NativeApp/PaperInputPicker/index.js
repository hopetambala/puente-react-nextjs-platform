import TextField from '@material-ui/core/TextField';
import * as React from 'react';
import {
  Text, TouchableWithoutFeedback, View,
} from 'react-native-web';

import { layout } from '../theme';
import AutoFill from './AutoFill';
import Geolocation from './Geolocation';
import {
  styleButton, stylesDefault, stylesPaper, styleX,
} from './index.style';
import Looper from './Looper';

const PaperInputPicker = ({
  data,
}) => {
  const {
    label, formikKey, fieldType, sideLabel,
  } = data;

  const translatedLabel = label || '';
  const translatedLabelSide = sideLabel || '';

  return (
    <>
      {fieldType === 'input' && (
        <View style={stylesDefault.container} key={formikKey}>
          {translatedLabel.length > 30
            && <Text style={stylesDefault.label}>{translatedLabel}</Text>}
          <TextField
            label={translatedLabel}
            variant="outlined"
            color="primary"
          />
        </View>
      )}
      {fieldType === 'numberInput' && (
        <View style={stylesDefault.container} key={formikKey}>
          {translatedLabel.length > 30
            && (
              <Text style={[stylesDefault.label, {
                bottom: -15, zIndex: 1, left: 5, padding: 5,
              }]}
              >
                {translatedLabel}
              </Text>
            )}
          <TextField
            label={translatedLabel.length > 30 ? '' : translatedLabel}
            variant="outlined"
            keyboardType="numeric"
            theme={stylesPaper}
            color="primary"
          />
        </View>
      )}
      {fieldType === 'inputSideLabel' && (
        <View style={stylesDefault.container} key={formikKey}>
          <View style={{ flexDirection: 'row' }}>
            <TextField
              label={translatedLabel}
              variant="outlined"
              theme={{ colors: { placeholder: 'primary' }, text: 'black' }}
              color="primary"
            />
            <Text style={styleX.sideLabel}>{translatedLabelSide}</Text>
          </View>
        </View>
      )}
      {fieldType === 'inputSideLabelNum' && (
        <View style={stylesDefault} key={formikKey}>
          <View style={{ flexDirection: 'row' }}>
            <TextField
              label={translatedLabel}
              variant="outlined"
              keyboardType="numeric"
              theme={stylesPaper}
              color="primary"
            />
            <Text style={styleX.sideLabel}>{translatedLabelSide}</Text>
          </View>
        </View>
      )}
      {fieldType === 'inputSideLabelTextQuestNumber' && (
        <View style={stylesDefault} key={formikKey}>
          <Text style={stylesDefault.label}>{translatedLabel}</Text>
          <View style={{ flexDirection: 'row' }}>
            <TextField
              variant="outlined"
              keyboardType="numeric"
              theme={{ colors: { placeholder: 'primary' }, text: 'black' }}
              color="primary"
            />
            <Text style={styleX.sideLabel}>{translatedLabelSide}</Text>
          </View>
        </View>
      )}
      {fieldType === 'inputSideBySideLabel' && (
        <View style={stylesDefault} key={formikKey}>
          <View style={{ flexDirection: 'row' }}>
            <TextField
              label={translatedLabel}
              variant="outlined"
              theme={{ colors: { placeholder: 'primary' }, text: 'black' }}
              color="primary"
            />
            <Text style={styleX.sideLabel}>{translatedLabelSide}</Text>
            <TextField
              label={translatedLabel}
              variant="outlined"
              theme={{ colors: { placeholder: 'primary' }, text: 'black' }}
              color="primary"
            />
          </View>
        </View>
      )}
      {fieldType === 'select' && (
        <View key={formikKey} style={stylesDefault.container}>
          <Text style={[layout.selectLabel, stylesDefault.label]}>{translatedLabel}</Text>
          <View style={layout.buttonGroupContainer}>
            {data.options && data.options.map((result) => (
              <View key={result.value}>
                {/* non-selected value */}
                <TouchableWithoutFeedback>
                  <View style={styleButton.unselected} color="primary">
                    <Text style={{ color: 'primary' }} color="primary">
                      {result.label}
                    </Text>
                  </View>
                </TouchableWithoutFeedback>
              </View>
            ))}
          </View>
        </View>
      )}
      {fieldType === 'selectMulti' && (
        <View key={formikKey} style={stylesDefault.container}>
          <Text style={[layout.selectLabel, stylesDefault.label]}>{translatedLabel}</Text>
          <View style={layout.buttonGroupContainer}>
            {data.options && data.options.map((result) => (
              <View key={result.value}>
                {/* non-selected value */}
                <View style={stylesDefault}>
                  <TouchableWithoutFeedback>
                    <View style={styleButton.unselected}>
                      <Text style={{ color: 'primary' }}>
                        {result.label}
                      </Text>
                    </View>
                  </TouchableWithoutFeedback>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}
      {(fieldType === 'autofill' || fieldType === 'autofillms') && (
        <View key={formikKey}>
          <AutoFill
            translatedLabel={translatedLabel}
          />
        </View>
      )}
      {fieldType === 'geolocation' && (
        <Geolocation
          formikKey={formikKey}
        />
      )}
      {fieldType === 'header' && (
        <View key={translatedLabel} style={stylesDefault.container}>
          <h1>{translatedLabel}</h1>
          <View
            style={stylesDefault.horizontalLine}
          />
        </View>
      )}
      {fieldType === 'multiInputRow' && (
        <View style={stylesDefault.container}>
          <Text style={stylesDefault.label}>{translatedLabel}</Text>
          <View style={stylesDefault.multiInputContainer}>
            {data.options.map((result) => (result.textSplit ? (
              <View key={`${result}`} style={{ flex: 1 }}>
                <Text style={styleX.textSplit}>{result.label}</Text>
              </View>
            ) : (
              <View key={result.value} style={stylesDefault.inputItem}>
                <TextField
                  label={result.label}
                  variant="outlined"
                  theme={{ colors: { placeholder: 'primary' }, text: 'black' }}
                />
              </View>
            )))}
          </View>
        </View>
      )}
      {fieldType === 'multiInputRowNum' && (
      <View style={stylesDefault.container}>
        <Text style={stylesDefault.label}>{translatedLabel}</Text>
        <View style={stylesDefault.multiInputContainer}>
          {data.options.map((result) => (result.textSplit ? (
            <View key={`${result}`} style={{ flex: 1 }}>
              <Text style={styleX.textSplit}>{result.label}</Text>
            </View>
          ) : (
            <View key={result.value} style={stylesDefault.inputItem}>
              <TextField
                label={result.label}
                variant="outlined"
                theme={{ colors: { placeholder: 'primary' }, text: 'black' }}
              />
            </View>
          )))}
        </View>
      </View>
      )}
      {fieldType === 'loop' && (
      <View key={formikKey}>
        <Looper
          translatedLabel={translatedLabel}
        />
      </View>
      )}
      {/* relies on function to clean the values prior to submission */}
      {fieldType === 'loopSameForm' && (
        <View key={formikKey}>
          <Looper
            translatedLabel={translatedLabel}
          />
        </View>
      )}

    </>
  );
};

export default PaperInputPicker;

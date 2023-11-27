import Box from '@material-ui/core/Box';

import PaperInputPicker from './PaperInputPicker';

const NativeApp = ({
  formItems,
}) => (
  <Box
    sx={{
      width: 400,
      height: 600,
      backgroundColor: '#F5F5F5',
      my: 30,
      margin: 50,
      borderRadius: 25,
      overflow: 'auto',
    }}
  >
    <Box
      sx={{
        backgroundColor: '#FFE680',
        borderRadius: 25,
        overflow: 'auto',
      }}
    >
      <h1 style={{ marginLeft: 20 }}>PUENTE</h1>
    </Box>

    {formItems && formItems.map((result) => (
      <PaperInputPicker
        data={result}
        customForm
      />
    ))}
  </Box>
);

export default NativeApp;

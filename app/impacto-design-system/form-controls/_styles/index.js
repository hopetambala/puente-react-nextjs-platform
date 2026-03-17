import { FormControl, InputLabel } from '@material-ui/core';
import styled from 'styled-components';

export const StyledInputLabel = styled(InputLabel)`
  && {
    .req-label {
      color: var(--tk-dlite-semantic-color-feedback-danger);
    }
  }
`;

export const StyledFormControl = styled(FormControl)`
  && {
    width: 100%;
    display: block;
    position: relative;
  }
`;

export const StyledAutoSelectInputLabel = styled(InputLabel)`
  && {
    position: relative;
    .req-label {
      color: var(--tk-dlite-semantic-color-feedback-danger);
    }
    transform: translate(0, 1.5px) scale(0.75);
    transform-origin: top left;
  }
`;

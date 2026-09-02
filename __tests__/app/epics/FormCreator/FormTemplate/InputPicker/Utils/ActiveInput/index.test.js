import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import React from 'react';

jest.mock('next-i18next', () => ({ useTranslation: () => ({ t: (k) => k }) }));

const ActiveInput = require('app/epics/FormCreator/FormTemplate/InputPicker/Utils/ActiveInput').default;

describe('ActiveInput — copy', () => {
  it('routes the required-answer checkbox label through t()', () => {
    render(<ActiveInput activeInput setActiveInput={jest.fn()} />);
    expect(screen.getByLabelText('form_creator_answer_required')).toBeInTheDocument();
  });
});

import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import React from 'react';

// `t` echoes the key, so asserting a key proves the string reached `t()`.
jest.mock('next-i18next', () => ({ useTranslation: () => ({ t: (k) => k }) }));

jest.mock('app/impacto-design-system', () => ({
  Button: ({ text, onClick }) => <button type="button" onClick={onClick}>{text}</button>,
}));
jest.mock('app/epics/FormCreator/FormTemplate/InputPicker/Utils', () => () => null);
jest.mock('app/epics/FormCreator/FormTemplate/InputPicker/Geolocation/index.module.scss', () => ({}));

const Geolocation = require('app/epics/FormCreator/FormTemplate/InputPicker/Geolocation').default;

const item = { id: 'geo-1', fieldType: 'geolocation' };
const props = { item, formItems: [item], setFormItems: jest.fn(), removeValue: jest.fn() };

describe('Geolocation block — copy', () => {
  it('routes its heading through t()', () => {
    render(<Geolocation {...props} />);
    expect(screen.getByRole('heading', { name: 'form_creator_type_geolocation' })).toBeInTheDocument();
  });

  it('routes the remove control through t(), sharing the key with its sibling blocks', () => {
    render(<Geolocation {...props} />);
    expect(screen.getByRole('button', { name: 'form_creator_remove_question' })).toBeInTheDocument();
  });
});

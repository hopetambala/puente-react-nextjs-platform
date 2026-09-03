import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import React from 'react';

jest.mock('next-i18next', () => ({ useTranslation: () => ({ t: (k) => k }) }));

jest.mock('app/impacto-design-system', () => ({
  Button: ({ text, onClick }) => <button type="button" onClick={onClick}>{text}</button>,
}));
jest.mock('app/epics/FormCreator/FormTemplate/InputPicker/Utils', () => () => null);
jest.mock('app/epics/FormCreator/FormTemplate/InputPicker/Header/index.module.scss', () => ({}));

const Header = require('app/epics/FormCreator/FormTemplate/InputPicker/Header').default;

const item = { id: 'hdr-1', fieldType: 'header' };
const props = { item, formItems: [item], setFormItems: jest.fn(), removeValue: jest.fn() };

describe('Header block — copy', () => {
  it('routes its heading through t()', () => {
    render(<Header {...props} />);
    expect(screen.getByRole('heading', { name: 'form_creator_type_header' })).toBeInTheDocument();
  });

  it('routes the remove control through t()', () => {
    render(<Header {...props} />);
    expect(screen.getByRole('button', { name: 'form_creator_remove_header' })).toBeInTheDocument();
  });

  it('routes the title placeholder through t()', () => {
    render(<Header {...props} />);
    expect(screen.getByPlaceholderText('form_creator_untitled_header')).toBeInTheDocument();
  });
});

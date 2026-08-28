import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

jest.mock('app/impacto-design-system', () => ({
  Button: ({ text, onClick }) => <button type="button" onClick={onClick}>{text}</button>,
  Stack: ({ children }) => <div>{children}</div>,
}));

jest.mock('app/epics/FormCreator/FormTemplate/InputPicker/Utils', () => () => null);
jest.mock('app/epics/FormCreator/FormTemplate/InputPicker/Loop/index.module.scss', () => ({}));

const Loop = require('app/epics/FormCreator/FormTemplate/InputPicker/Loop').default;

describe('questions to repeat', () => {
  it('lists a geolocation field in the repeat group without warning about a nested loop', () => {
    const nameItem = {
      id: 'item-name', fieldType: 'input', label: 'Name', formikKey: 'Name',
    };
    const geolocationItem = { id: 'item-geo', fieldType: 'geolocation' };
    const loopItem = { id: 'item-loop', fieldType: 'loop', label: 'Household members' };

    render(
      <Loop
        item={loopItem}
        formItems={[nameItem, geolocationItem, loopItem]}
        setFormItems={jest.fn()}
        removeValue={jest.fn()}
      />
    );

    // Repeat the two questions preceding the loop: "Name" and the geolocation field.
    fireEvent.change(screen.getByPlaceholderText('eg. 3'), { target: { value: '2' } });

    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('geolocation')).toBeInTheDocument();
    expect(
      screen.queryByText(/repeat group contains another repeat group/i)
    ).not.toBeInTheDocument();
  });
});

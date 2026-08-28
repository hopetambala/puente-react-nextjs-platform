import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { AppWrapper, useGlobalState } from 'app/store';

// ─── RED: store writes do not re-render consumers ─────────────────────────────
// addPropToStore mutates the existing store object and hands the same reference
// back to setGlobalStore, so React bails out of the update. Anything rendering a
// value out of the store keeps showing what was there at mount — caught before a
// user clicks a form in the Marketplace and the page keeps showing the old one.

const STORE_KEY = '/forms/form-manager';
const EMPTY_LABEL = 'No form selected';
const SELECTED_FORM = 'Community Health Survey';

// Mirrors how the epics use the store: read through contextManagment.store,
// write through contextManagment.addPropToStore from a click handler.
function SelectedFormBanner() {
  const { contextManagment } = useGlobalState();
  const selected = contextManagment.store[STORE_KEY];

  return (
    <div>
      <p>{selected || EMPTY_LABEL}</p>
      <button
        type="button"
        onClick={() => contextManagment.addPropToStore(STORE_KEY, SELECTED_FORM)}
      >
        Select form
      </button>
      <button
        type="button"
        onClick={() => contextManagment.removePropFromStore(STORE_KEY)}
      >
        Clear form
      </button>
    </div>
  );
}

describe('Store updates', () => {
  it('re-renders a consumer with the new value after addPropToStore', async () => {
    render(
      <AppWrapper>
        <SelectedFormBanner />
      </AppWrapper>,
    );

    expect(screen.getByText(EMPTY_LABEL)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Select form' }));

    expect(screen.getByText(SELECTED_FORM)).toBeInTheDocument();
  });

  it('re-renders a consumer back to empty after removePropFromStore', async () => {
    render(
      <AppWrapper>
        <SelectedFormBanner />
      </AppWrapper>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Select form' }));
    expect(screen.getByText(SELECTED_FORM)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Clear form' }));

    expect(screen.getByText(EMPTY_LABEL)).toBeInTheDocument();
  });
});

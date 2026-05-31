import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';

jest.mock('next-i18next', () => ({
  useTranslation: () => ({
    t: (key) => ({
      inspector_editing: 'EDITING',
      inspector_block_props: 'Block properties',
      inspector_label: 'Label',
      inspector_formik_key: 'formikKey',
      inspector_required: 'Required',
      inspector_allow_other: 'Allow "Other" with text',
      inspector_multi_select: 'Multi-select',
      inspector_options: 'Options',
      inspector_schema_hint: 'Schema-aware.',
    }[key] ?? key),
  }),
}));

// ─── RED: Inspector panel not yet implemented ─────────────────────────────────
// These tests will fail until app/epics/FormCreator/Inspector/index.js exists
// and FormCreator wires it up.

const Inspector = require('app/epics/FormCreator/Inspector').default;

const baseBlock = {
  id: 'block-1',
  formikKey: 'typeofwaterdoyoudrink',
  label: 'What type of water do you drink?',
  fieldType: 'select',
  required: false,
  allowOther: false,
  multiSelect: false,
  options: ['Tap, treated', 'Tap, untreated', 'Bottled'],
};

function renderInspector(block = baseBlock, onChange = jest.fn(), onClose = jest.fn()) {
  return render(
    <Inspector block={block} onChange={onChange} onClose={onClose} />,
  );
}

// ─── Rendering ────────────────────────────────────────────────────────────────

describe('Inspector — rendering', () => {
  it('renders the panel heading "EDITING"', () => {
    renderInspector();
    expect(screen.getByText('EDITING')).toBeInTheDocument();
  });

  it('renders the label field with the block label as value', () => {
    renderInspector();
    const input = screen.getByLabelText('Label');
    expect(input).toHaveValue(baseBlock.label);
  });

  it('renders the formikKey as a read-only mono field', () => {
    renderInspector();
    expect(screen.getByText(baseBlock.formikKey)).toBeInTheDocument();
    const key = screen.getByTestId('inspector-formik-key');
    expect(key).toBeInTheDocument();
  });

  it('renders the Required toggle', () => {
    renderInspector();
    expect(screen.getByLabelText('Required')).toBeInTheDocument();
  });

  it('renders the Allow "Other" toggle', () => {
    renderInspector();
    expect(screen.getByLabelText('Allow "Other" with text')).toBeInTheDocument();
  });

  it('renders the Multi-select toggle', () => {
    renderInspector();
    expect(screen.getByLabelText('Multi-select')).toBeInTheDocument();
  });

  it('renders each option in the options list', () => {
    renderInspector();
    expect(screen.getByText('Tap, treated')).toBeInTheDocument();
    expect(screen.getByText('Tap, untreated')).toBeInTheDocument();
    expect(screen.getByText('Bottled')).toBeInTheDocument();
  });

  it('renders the schema-aware hint box', () => {
    renderInspector();
    expect(screen.getByTestId('inspector-hint')).toBeInTheDocument();
    expect(screen.getByText(/Schema-aware/)).toBeInTheDocument();
  });

  it('renders the close button', () => {
    renderInspector();
    expect(screen.getByTestId('inspector-close')).toBeInTheDocument();
  });
});

// ─── Toggle state ─────────────────────────────────────────────────────────────

describe('Inspector — Required toggle reflects block prop', () => {
  it('Required checkbox is unchecked when block.required is false', () => {
    renderInspector({ ...baseBlock, required: false });
    expect(screen.getByLabelText('Required')).not.toBeChecked();
  });

  it('Required checkbox is checked when block.required is true', () => {
    renderInspector({ ...baseBlock, required: true });
    expect(screen.getByLabelText('Required')).toBeChecked();
  });
});

// ─── onChange callback ────────────────────────────────────────────────────────

describe('Inspector — onChange', () => {
  it('calls onChange with updated label when label input changes', () => {
    const onChange = jest.fn();
    renderInspector(baseBlock, onChange);
    const input = screen.getByLabelText('Label');
    fireEvent.change(input, { target: { value: 'New label' } });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ label: 'New label' }),
    );
  });

  it('calls onChange with required:true when Required toggle is clicked', () => {
    const onChange = jest.fn();
    renderInspector({ ...baseBlock, required: false }, onChange);
    fireEvent.click(screen.getByLabelText('Required'));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ required: true }),
    );
  });

  it('calls onChange with multiSelect:true when Multi-select toggle is clicked', () => {
    const onChange = jest.fn();
    renderInspector({ ...baseBlock, multiSelect: false }, onChange);
    fireEvent.click(screen.getByLabelText('Multi-select'));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ multiSelect: true }),
    );
  });
});

// ─── onClose callback ─────────────────────────────────────────────────────────

describe('Inspector — onClose', () => {
  it('calls onClose when the close button is clicked', () => {
    const onClose = jest.fn();
    renderInspector(baseBlock, jest.fn(), onClose);
    fireEvent.click(screen.getByTestId('inspector-close'));
    expect(onClose).toHaveBeenCalled();
  });
});

// ─── __KEY__OTHER chip ────────────────────────────────────────────────────────

describe('Inspector — Other chip', () => {
  it('shows __KEY__OTHER chip when allowOther is true', () => {
    renderInspector({ ...baseBlock, allowOther: true });
    expect(screen.getByText('__KEY__OTHER')).toBeInTheDocument();
  });

  it('does not show __KEY__OTHER chip when allowOther is false', () => {
    renderInspector({ ...baseBlock, allowOther: false });
    expect(screen.queryByText('__KEY__OTHER')).not.toBeInTheDocument();
  });
});

// ─── null block (no selection) ────────────────────────────────────────────────

describe('Inspector — null block', () => {
  it('renders nothing when block is null', () => {
    const { container } = render(
      <Inspector block={null} onChange={jest.fn()} onClose={jest.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });
});

// ─── RED: Phase 7 — Inspector i18n ────────────────────────────────────────────
// If hardcoded strings return, these fail — ensuring i18n keys stay in place.

describe('Phase 7 — Inspector uses i18n keys', () => {
  it('renders inspector_editing key value (not hardcoded)', () => {
    renderInspector();
    // t('inspector_editing') returns 'EDITING' via mock
    expect(screen.getByText('EDITING')).toBeInTheDocument();
  });

  it('renders inspector_block_props key value', () => {
    renderInspector();
    expect(screen.getByText('Block properties')).toBeInTheDocument();
  });
});

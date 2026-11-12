import { Button } from 'app/impacto-design-system';

export default {
  title: 'Components/Actions/Button',
  component: Button,
  // This component will have an automatically generated Autodocs entry: https://storybook.js.org/docs/react/writing-docs/autodocs
  tags: ['autodocs'],
};
export const Default = {
  args: {
    text: 'Primary',
    intent: 'primary',
  },
};

export const Secondary = { args: { text: 'Cancel' } };
export const Danger = { args: { text: 'Delete form', intent: 'danger' } };
export const Loading = { args: { text: 'Export', isLoading: true } };
export const Disabled = { args: { text: 'Publish', intent: 'primary', isDisabled: true } };
export const IconOnly = { args: { text: 'Delete question', icon: 'delete', isIconOnly: true } };
export const LongLabelWraps = {
  args: { text: 'Exportar todos los registros de esta organización como CSV', intent: 'primary' },
  decorators: [(Story) => <div style={{ maxWidth: '16rem' }}><Story /></div>],
};

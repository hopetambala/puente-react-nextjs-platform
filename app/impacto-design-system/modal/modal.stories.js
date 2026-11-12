import Modal from '.';

export default {
  title: 'Components/Overlays/Modal',
  component: Modal,
  tags: ['autodocs'],
  args: { open: true, handleClose: () => {}, action: () => {} },
};

export const DangerConfirmation = {
  args: { text: 'Delete this form? Its records stay.', actionText: 'Delete form', intent: 'danger' },
};

export const PrimaryConfirmation = {
  args: { text: 'Rename "Barrio Prueba" to "Barrio Nuevo" on 12 records?', actionText: 'Rename', intent: 'primary' },
};

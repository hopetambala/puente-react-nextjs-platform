import Toast from '.';

export default {
  title: 'Components/Feedback/Toast',
  component: Toast,
  tags: ['autodocs'],
  args: { closeToast: () => {} },
};

export const Info = { args: { text: 'Export started. It will download when it is ready.' } };
export const Success = { args: { text: 'Form published.', isSuccess: true } };
export const Warning = { args: { text: 'Some records have no community.', isWarning: true } };
export const Error = { args: { text: "Couldn't export: you were signed out. Sign in and try again.", isError: true } };

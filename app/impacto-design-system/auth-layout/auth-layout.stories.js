import Button from '../button';
import AuthLayout from '.';

export default {
  title: 'Components/Layout/AuthLayout',
  component: AuthLayout,
  parameters: { layout: 'fullscreen' },
};

export const WithTagline = {
  args: {
    title: 'Sign in',
    tagline: 'The clinic ran in a school courtyard. By the time we packed up, the records were already in San Juan.',
    footer: <span>v0.1.2</span>,
    children: (
      <>
        <h1>Puente Manage</h1>
        <p>Build forms, monitor the field, and analyze responses.</p>
        <Button text="Sign in" intent="primary" isFullWidth />
      </>
    ),
  },
};

export const Plain = {
  args: { title: 'Account verified', children: <h1>Account verified</h1> },
};

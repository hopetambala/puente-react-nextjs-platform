import Button from '../button';
import Panel from '.';

export default {
  title: 'Components/Layout/Panel',
  component: Panel,
  tags: ['autodocs'],
};

export const Default = { args: { title: 'Registry', children: <p>Organizations and their short codes.</p> } };
export const WithAction = {
  args: { title: 'Members', action: <Button isSmall text="Invite" />, children: <p>Seven people.</p> },
};

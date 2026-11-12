import Button from '../button';
import Sheet from '.';

export default {
  title: 'Components/Overlays/Sheet',
  component: Sheet,
  tags: ['autodocs'],
  args: { open: true, onClose: () => {}, title: 'Record details' },
};

export const WithFooter = {
  args: {
    children: <p>Comunidad Ejemplo · surveyed by ada@example.org on 7 Oct 2026.</p>,
    footer: (
      <>
        <Button text="Discard" />
        <Button text="Save" intent="primary" />
      </>
    ),
  },
};

export const LongContent = {
  args: {
    children: (
      <div>
        {Array.from({ length: 30 }, (_, i) => <p key={i}>Field {i + 1}: a value long enough to wrap on a phone screen.</p>)}
      </div>
    ),
    footer: <Button text="Save" intent="primary" />,
  },
};

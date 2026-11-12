import SegmentedControl from '.';

export default {
  title: 'Components/Forms/SegmentedControl',
  component: SegmentedControl,
  tags: ['autodocs'],
};

export const Default = {
  args: {
    label: 'View',
    value: 'records',
    options: [{ label: 'Records', value: 'records' }, { label: 'Community audit', value: 'audit' }],
  },
};

export const ManyOptionsWrap = {
  args: {
    label: 'Status',
    value: 'all',
    options: ['all', 'complete', 'missing key fields', 'possible duplicate', 'unresolved household'].map((v) => ({ label: v, value: v })),
  },
};

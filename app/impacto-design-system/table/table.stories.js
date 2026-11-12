import Table from '.';

const columns = [
  { accessorKey: 'community', header: 'Community' },
  { accessorKey: 'records', header: 'Records' },
  { accessorKey: 'synced', header: 'Last synced' },
];
const data = [
  { community: 'Comunidad Ejemplo', records: 412, synced: '2 days ago' },
  { community: 'Barrio Prueba', records: 98, synced: '36 days ago' },
  { community: 'Los Llanos de Pérez, sector norte', records: 7, synced: 'today' },
];

export default {
  title: 'Components/Data/Table',
  component: Table,
  tags: ['autodocs'],
  args: { caption: 'Records by community', columns, data },
};

export const Default = {};
export const CaptionVisible = { args: { isCaptionVisible: true } };
export const Empty = { args: { data: [] } };

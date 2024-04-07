import { faker } from '@faker-js/faker';
import { createColumnHelper } from '@tanstack/react-table';
import React from 'react';

import { v4 as uuid } from 'uuid';
import Button from '../button';
import { Tag } from '../tag/tag';

export type SurveyRecord = {
  id: string;
  name: string;
  dateOfBirth: string;
  score: React.ReactNode;
  market: string;
  enrollment: React.ReactNode;
};

const columnHelper = createColumnHelper<SurveyRecord>();

export const columns = [
  columnHelper.accessor('name', {
    cell: (info) => info.getValue(),
    header: () => <span>Name</span>,
  }),
  columnHelper.accessor('dateOfBirth', {
    cell: (info) => info.getValue(),
    header: () => <span>Date of Birth</span>,
  }),
  columnHelper.accessor('score', {
    cell: (info) => info.getValue(),
    header: () => <span>Score</span>,
    enableSorting: false,
  }),
  columnHelper.accessor('market', {
    cell: (info) => info.getValue(),
    header: () => <span>Market</span>,
  }),
  columnHelper.accessor('enrollment', {
    cell: (info) => info.getValue(),
    header: () => <span>Accept or Reject?</span>,
    enableSorting: false,
  }),
];

export const hoverColumn = columnHelper.accessor('name', {
  cell: () => (
    <div style={{ background: 'var(--color-bg' }}>
      <Button icon="edit" isIconOnly />
      <Button icon="accessAlarms" isIconOnly />
      <Button icon="done" isIconOnly />
    </div>
  ),
  header: () => null,
  id: 'hover',
});

function createRandomSurveyRecord(args?: Partial<SurveyRecord>): SurveyRecord {
  return {
    id: uuid(),
    name: faker.helpers.arrayElement([
      'Gabriel Magalhaes',
      'Rob Holding',
      'Kieran Tierney',
      'Oleksandr Zinchenko',
      'Thomas Partey',
      'Granit Xhaka',
      'Emile Smith Rowe',
      'Bukayo Saka',
      'Martin Odegaard',
      'Gabriel Martinelli',
      'Calum Chambers',
      'Mohamed Elneny',
      'Mat Ryan',
      'Aaron Ramsdale',
      'Albert Sambi Lokonga',
      'Nuno Tavares',
      'Takuma Asano',
      'Eddie Nketiah',
    ]),
    dateOfBirth: faker.date
      .between('1992-01-01', '2001-01-01')
      .toISOString()
      .split('T')[0],
    score: faker.helpers.arrayElement([
      <Tag key={uuid()} text="Red" color="red" />,
      <Tag key={uuid()} text="Orange" color="orange" />,
      <Tag key={uuid()} text="Yellow" color="yellow" />,
      <Tag key={uuid()} text="Green" color="green" />,
    ]),
    market: faker.helpers.arrayElement([
      'D.C.',
      'Brooklyn',
      'North Carolina',
      'New York City',
    ]),
    enrollment: faker.helpers.arrayElement([
      <>
        <Button isSmall text="Hi" />
        <Button isSmall text="Bye" />
      </>,
    ]),
    ...args,
  }
}

const getExampleData = (length = 5) => Array.from({ length }, createRandomSurveyRecord);
export const defaultData = getExampleData(5);
export const searchData = [
  ...getExampleData(10),
  createRandomSurveyRecord({ name: 'Bukayo Saka', market: 'Brooklyn' }),
  createRandomSurveyRecord({ name: 'Bukayo Saka', market: 'Brooklyn' }),
];
export const paginationData = getExampleData(200);

export const TEST_MARKET_OPTIONS = [
  { label: 'New York City', value: 'New York City' },
  { label: 'Brooklyn', value: 'Brooklyn' },
  { label: 'North Carolina', value: 'North Carolina' },
  { label: 'Washington DC', value: 'D.C.' },
];

/**
 * Search Helpers
 */
export const searchByValue = (array: any[], string: string) =>
  array.filter((o: any) =>
    Object.keys(o).some((k) => {
      if (typeof o[k] !== 'string') return;
      return o[k].toLowerCase().includes(string.toLowerCase());
    }),
  );

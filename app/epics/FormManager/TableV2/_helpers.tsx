import { createColumnHelper } from '@tanstack/react-table'
import { Tag } from 'app/impacto-design-system'
import { CSVButton } from './CSVButton'

export type FormRow = {
  id: string
  name: string
  status: React.ReactNode
  createdAt: string
  updatedAt: string
  // actions: React.ReactNode
}

interface Cell { getValue: () => any }

const columnHelper = createColumnHelper<FormRow>()

export const columns = (organization: string) => [
  columnHelper.accessor("name", {
    cell: (info: Cell) => info.getValue(),
    header: () => <span>Name</span>,
  }),
  columnHelper.accessor("status", {
    cell: () => <Tag color="green" text="Published" />,
    header: () => <span>Status</span>,
    enableSorting: false,
  }),
  columnHelper.accessor(
    (row: { createdAt: FormRow["createdAt"] }) => row.createdAt,
    {
      id: "createdAt",
      cell: (info: Cell) => info.getValue(),
      header: () => <span>Created</span>,
    }
  ),
  columnHelper.accessor(
    (row: { updatedAt: FormRow["updatedAt"] }) => row.updatedAt,
    {
      id: "updatedAt",
      cell: (info: Cell) => info.getValue(),
      header: () => <span>Updated</span>,
    }
  ),
  columnHelper.display({
    id: "download",
    cell: (row: any) => (
      <CSVButton form={row.row.original} surveyingOrganization={organization} />
    ),
  }),
  // columnHelper.accessor('actions', {
  //   cell: (info: Cell) => info.getValue(),
  //   header: () => <span>Actions</span>,
  //   enableSorting: false,
  // }),
]

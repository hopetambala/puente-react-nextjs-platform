import { ColumnDef } from '@tanstack/react-table'
import { retrieveCustomData } from 'app/modules/cloud-code'

import { Table } from 'app/impacto-design-system'
import { useEffect, useState } from 'react'
import { FormRow, columns } from './_helpers'

interface TableData {
  columns: ColumnDef<FormRow>[]
  data: any[] | undefined
}

const FormManagerTable = ({ data, organization }: { data: TableData['data'], organization: string }) => {
  return <Table units="records" columns={columns(organization)} data={data?.length ? data : []} />
}

const FormManagerTableContainer = ({
  organization,
}: {
  organization: string
}) => {
  const [tableData, setTableData] = useState<TableData['data']>()

  useEffect(() => {
    retrieveCustomData(organization).then((records) => {
      setTableData(records)
    })
  }, [])

  /**
   * GET FORM DATA
   */

  return <FormManagerTable data={tableData} organization={organization} />
}

export default FormManagerTableContainer

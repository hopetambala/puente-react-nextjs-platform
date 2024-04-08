import FormCreator from "app/epics/FormCreator"
import { Page } from "app/impacto-design-system"
import { parseUserValue } from "app/modules/user"
import { useGlobalState } from "app/store"

export default function Forms() {
  const { contextManagment } = useGlobalState()
  const user = parseUserValue()
  return (
    <Page header footer>
      <FormCreator context={contextManagment} user={user} />
    </Page>
  )
}

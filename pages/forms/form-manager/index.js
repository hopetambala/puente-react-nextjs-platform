import FormManager from "app/epics/FormManager"
import { Page } from "app/impacto-design-system"
import { parseUserValue } from "app/modules/user"
import { useGlobalState } from "app/store"
import { useRouter } from "next/router"

export default function Manager() {
  const { contextManagment } = useGlobalState()
  const router = useRouter()
  const user = parseUserValue()

  return (
    <Page header footer>
      <main className="container">
        <div>Form Manager</div>
        <FormManager router={router} context={contextManagment} user={user} />
      </main>
    </Page>
  )
}

import FormCreator from 'app/components/epics/FormCreator'
import Page from 'app/components/templates/dashboard-layout'
import { parseUserValue } from 'app/modules/user'
import { useGlobalState } from 'app/store'

import styles from './index.module.scss'

export default function Forms() {
    const { contextManagment } = useGlobalState()
    const user = parseUserValue()
    return (
        <Page header footer>
            <main className={styles.formCreator}>
                <div className={styles.container}>
                    <FormCreator context={contextManagment} user={user} />
                </div>
            </main>
        </Page>
    )
}

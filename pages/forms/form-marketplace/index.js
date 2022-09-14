import FormMarketplace from 'app/components/epics/FormMarketplace'
import Page from 'app/components/templates/dashboard-layout'
import { parseUserValue } from 'app/modules/user'
import { useGlobalState } from 'app/store'
import { useRouter } from 'next/router'

import styles from './index.module.scss'

export default function Marketplace() {
    const { contextManagment } = useGlobalState()
    const router = useRouter()
    const user = parseUserValue()

    return (
        <Page header footer>
            <main className={styles.formMarketplace}>
                <div className={styles.container}>
                    <FormMarketplace
                        router={router}
                        context={contextManagment}
                        user={user}
                    />
                </div>
            </main>
        </Page>
    )
}

import { Card } from 'app/components/design-system/molecules'

import styles from './index.module.scss'

export default function QuickStart() {
    return (
        <div className={styles.index}>
            <main>
                <h1 className={styles.title}>Welcome to Puente Manage</h1>
                <h1>Quick Start Guide</h1>

                <div className={styles.grid}>
                    <Card
                        title="Form Creator"
                        description="Create Forms for Puente Collect"
                        nextLink="/forms/form-creator"
                    />
                    <Card
                        title="Form Manager"
                        description="Manage Forms for Puente Collect"
                        nextLink="/forms/form-manager"
                    />
                    <Card
                        title="Form Marketplace"
                        description="Manage Marketplace"
                        nextLink="/forms/form-marketplace"
                    />
                    <Card
                        title="Data Exporter"
                        description="Download data"
                        nextLink="/data/data-exporter"
                    />
                </div>
            </main>
            <style jsx global>
                {`
                    html,
                    body {
                        padding: 0;
                        margin: 0;
                        font-family: -apple-system, BlinkMacSystemFont, Segoe UI,
                            Roboto, Oxygen, Ubuntu, Cantarell, Fira Sans,
                            Droid Sans, Helvetica Neue, sans-serif;
                    }

                    * {
                        box-sizing: border-box;
                    }
                `}
            </style>
        </div>
    )
}

import FormManager from 'app/epics/FormManager';
import { AppShell, PageHeader } from 'app/impacto-design-system';
import { parseUserValue } from 'app/modules/user';
import { useGlobalState } from 'app/store';
import { useRouter } from 'next/router';


export default function Manager() {
  const { contextManagment } = useGlobalState();
  const router = useRouter();
  const user = parseUserValue();

  return (
    <AppShell breadcrumb={['Forms', 'Form Manager']}>
      <PageHeader
        title="Form Manager"
        sub="Create, manage, and export your data collection forms."
      />
      <FormManager
        router={router}
        context={contextManagment}
        user={user}
      />
    </AppShell>
  );
}

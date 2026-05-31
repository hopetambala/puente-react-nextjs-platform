import FormCreator from 'app/epics/FormCreator';
import { AppShell } from 'app/impacto-design-system';
import { parseUserValue } from 'app/modules/user';
import { useGlobalState } from 'app/store';

export default function Forms() {
  const { contextManagment } = useGlobalState();
  const user = parseUserValue();
  return (
    <AppShell breadcrumb={['Forms', 'Form Creator']} fullBleed>
      <FormCreator
        context={contextManagment}
        user={user}
      />
    </AppShell>
  );
}

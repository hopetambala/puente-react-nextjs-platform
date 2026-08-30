import { Badge, Button, EmptyState, Panel } from 'app/impacto-design-system';
import { useTranslation } from 'next-i18next';
import PropTypes from 'prop-types';
import { useState } from 'react';

import styles from './OrganizationAdmin.module.css';

/** "WOF, W.O.F." -> ['WOF', 'W.O.F.']; blanks dropped so a trailing comma is harmless. */
const parseAliases = (value) => value
  .split(',')
  .map((a) => a.trim())
  .filter(Boolean);

/**
 * One organization in the registry.
 *
 * The alias set is the signature of this surface. Records carry the string the
 * field COLLECTED, so an organization's data is spread across every spelling it
 * has ever been called — filtering on the canonical name alone once showed a
 * Rayjon user 13% of their own records, with nothing on screen to say so.
 * Rendering the set as discrete chips, with the canonical name marked as an
 * implicit member, is what makes that rule visible instead of folklore.
 */
function OrganizationRow({ organization, onEditAliases }) {
  const { t } = useTranslation('common');
  const [draft, setDraft] = useState((organization.aliases || []).join(', '));
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await onEditAliases({
        shortCode: organization.shortCode,
        aliases: parseAliases(draft),
      });
    } catch (e) {
      // Verbatim: the server names the offending value, and that is the one
      // fact needed to fix the input.
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.orgRow}>
      <div className={styles.orgIdentity}>
        <span className={styles.orgName}>{organization.name}</span>
        <span className={styles.orgShortCode}>{organization.shortCode}</span>
      </div>

      <div className={styles.aliasSet}>
        <Badge variant="blue">
          <span data-testid={`implicit-alias-${organization.shortCode}`}>
            {organization.name}
          </span>
        </Badge>
        <span className={styles.implicitNote}>{t('org_admin_alias_implicit')}</span>
        {(organization.aliases || []).map((alias) => (
          <Badge key={alias} variant="purple">{alias}</Badge>
        ))}
      </div>

      <div className={styles.aliasEditor}>
        <label className={styles.fieldLabel} htmlFor={`aliases-${organization.shortCode}`}>
          {t('org_admin_aliases_label')}
        </label>
        <input
          id={`aliases-${organization.shortCode}`}
          data-testid={`aliases-${organization.shortCode}`}
          className={styles.input}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <Button
          text={t('org_admin_aliases_save')}
          onClick={save}
          isDisabled={saving}
          data-testid={`aliases-save-${organization.shortCode}`}
        />
      </div>

      {error && (
        <p className={styles.error} data-testid={`aliases-error-${organization.shortCode}`}>
          {error}
        </p>
      )}
    </div>
  );
}

OrganizationRow.propTypes = {
  organization: PropTypes.shape({
    name: PropTypes.string,
    shortCode: PropTypes.string,
    aliases: PropTypes.arrayOf(PropTypes.string),
  }).isRequired,
  onEditAliases: PropTypes.func.isRequired,
};

/** Register a partner. The live blocker: since the picker landed, this is the
 *  only way a new partner organization can come to exist. */
function CreateOrganizationForm({ onCreate }) {
  const { t } = useTranslation('common');
  const [name, setName] = useState('');
  const [shortCode, setShortCode] = useState('');
  const [aliases, setAliases] = useState('');
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    // Refuse locally rather than letting the server reject an obviously empty
    // form — a round-trip to learn what the field label already said is waste.
    if (!name.trim() || !shortCode.trim()) {
      setError(t('org_admin_create_required'));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onCreate({
        name: name.trim(),
        shortCode: shortCode.trim(),
        aliases: parseAliases(aliases),
        active: true,
      });
      setName('');
      setShortCode('');
      setAliases('');
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.createForm}>
      <div className={styles.field}>
        <label className={styles.fieldLabel} htmlFor="create-name">
          {t('org_admin_create_name')}
        </label>
        <input
          id="create-name"
          data-testid="create-name"
          className={styles.input}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div className={styles.field}>
        <label className={styles.fieldLabel} htmlFor="create-shortcode">
          {t('org_admin_create_shortcode')}
        </label>
        <input
          id="create-shortcode"
          data-testid="create-shortcode"
          className={styles.input}
          value={shortCode}
          onChange={(e) => setShortCode(e.target.value)}
        />
        <p className={styles.hint}>{t('org_admin_create_shortcode_hint')}</p>
      </div>

      <div className={styles.field}>
        <label className={styles.fieldLabel} htmlFor="create-aliases">
          {t('org_admin_create_aliases')}
        </label>
        <input
          id="create-aliases"
          data-testid="create-aliases"
          className={styles.input}
          value={aliases}
          onChange={(e) => setAliases(e.target.value)}
        />
        <p className={styles.hint}>{t('org_admin_create_aliases_hint')}</p>
      </div>

      <Button
        text={t('org_admin_create_submit')}
        intent="primary"
        onClick={submit}
        isDisabled={saving}
        data-testid="create-submit"
      />

      {error && <p className={styles.error} data-testid="create-error">{error}</p>}
    </div>
  );
}

CreateOrganizationForm.propTypes = { onCreate: PropTypes.func.isRequired };

/**
 * Accounts whose typed organization matches no alias.
 *
 * Four distinct states, and conflating any two of them is the defect this
 * component exists to avoid: a failed read and a clean result look identical on
 * screen, and only one of them means everything is fine.
 */
function UnresolvedQueue({
  unresolved, accountsChecked, unavailable, truncated,
}) {
  const { t } = useTranslation('common');

  if (unavailable) {
    return (
      <div data-testid="unresolved-unavailable" className={styles.warning}>
        {t('org_admin_unresolved_unavailable')}
      </div>
    );
  }

  return (
    <>
      <p className={styles.denominator} data-testid="unresolved-denominator">
        {t('org_admin_unresolved_count')}
        {': '}
        <strong>{unresolved.length}</strong>
        {' / '}
        {accountsChecked}
      </p>

      {truncated && (
        <div data-testid="unresolved-truncated" className={styles.warning}>
          {t('org_admin_unresolved_truncated')}
        </div>
      )}

      {unresolved.length === 0 ? (
        <div data-testid="unresolved-empty">
          <EmptyState
            message={t('org_admin_unresolved_empty')}
            sub={t('org_admin_unresolved_empty_sub')}
          />
        </div>
      ) : (
        <ul className={styles.queue}>
          {unresolved.map((account) => (
            <li key={account.objectId} className={styles.queueRow}>
              <span className={styles.typedString}>{account.organization || '—'}</span>
              <span className={styles.queueMeta}>{account.username}</span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

UnresolvedQueue.propTypes = {
  unresolved: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  accountsChecked: PropTypes.number.isRequired,
  unavailable: PropTypes.bool.isRequired,
  truncated: PropTypes.bool.isRequired,
};

export default function OrganizationAdmin({ data, onCreate, onEditAliases }) {
  const { t } = useTranslation('common');
  const {
    organizations, accountsChecked, unresolved, unavailable, truncated,
  } = data;

  return (
    <div className={styles.surface}>
      <Panel title={t('org_admin_registry_title')}>
        {organizations.length === 0 ? (
          <EmptyState message={t('org_admin_registry_empty')} />
        ) : (
          organizations.map((organization) => (
            <OrganizationRow
              key={organization.shortCode}
              organization={organization}
              onEditAliases={onEditAliases}
            />
          ))
        )}
      </Panel>

      <Panel title={t('org_admin_unresolved_title')}>
        <UnresolvedQueue
          unresolved={unresolved}
          accountsChecked={accountsChecked}
          unavailable={unavailable}
          truncated={Boolean(truncated)}
        />
      </Panel>

      <Panel title={t('org_admin_create_title')}>
        <CreateOrganizationForm onCreate={onCreate} />
      </Panel>
    </div>
  );
}

OrganizationAdmin.propTypes = {
  data: PropTypes.shape({
    organizations: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
    accountsChecked: PropTypes.number.isRequired,
    unresolved: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
    unavailable: PropTypes.bool.isRequired,
    truncated: PropTypes.bool,
  }).isRequired,
  onCreate: PropTypes.func.isRequired,
  onEditAliases: PropTypes.func.isRequired,
};

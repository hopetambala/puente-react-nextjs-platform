import { Badge, Button, EmptyState } from 'app/impacto-design-system';
import { useTranslation } from 'next-i18next';
import PropTypes from 'prop-types';
import { useState } from 'react';

import styles from './OrganizationAdmin.module.css';

/**
 * One member of an organization, with the two actions an admin actually has.
 *
 * Status is stated in WORDS, not colour alone — a colourblind reviewer deciding
 * who may administer their organization must be able to read it.
 */
function MemberRow({ member, onSetOrgAdmin, onSetUserActive }) {
  const { t } = useTranslation('common');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const run = async (action) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (e) {
      // Verbatim. The server says what to do about it — "appoint another admin
      // first" — and that is the only actionable part of the message.
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const name = [member.firstname, member.lastname].filter(Boolean).join(' ');

  return (
    <li className={styles.memberRow}>
      <div className={styles.memberIdentity}>
        <span className={styles.memberName}>{name || member.username}</span>
        <span className={styles.memberUsername}>{member.username}</span>
      </div>

      <div className={styles.memberStatus}>
        {member.isOrgAdmin && (
          <Badge variant="purple">
            <span data-testid={`member-admin-${member.objectId}`}>
              {t('org_admin_member_is_admin')}
            </span>
          </Badge>
        )}
        {member.deactivated && (
          <Badge variant="red">
            <span data-testid={`member-deactivated-${member.objectId}`}>
              {t('org_admin_member_deactivated')}
            </span>
          </Badge>
        )}
      </div>

      <div className={styles.memberActions}>
        <Button
          text={member.isOrgAdmin
            ? t('org_admin_member_demote')
            : t('org_admin_member_promote')}
          isDisabled={busy}
          onClick={() => run(() => onSetOrgAdmin({
            userId: member.objectId, isAdmin: !member.isOrgAdmin,
          }))}
        />
        <Button
          text={member.deactivated
            ? t('org_admin_member_reactivate')
            : t('org_admin_member_deactivate')}
          intent={member.deactivated ? null : 'danger'}
          isDisabled={busy}
          onClick={() => run(() => onSetUserActive({
            userId: member.objectId, active: Boolean(member.deactivated),
          }))}
        />
      </div>

      {error && (
        <p className={styles.error} data-testid={`member-error-${member.objectId}`}>
          {error}
        </p>
      )}
    </li>
  );
}

MemberRow.propTypes = {
  member: PropTypes.shape({
    objectId: PropTypes.string,
    username: PropTypes.string,
    firstname: PropTypes.string,
    lastname: PropTypes.string,
    isOrgAdmin: PropTypes.bool,
    deactivated: PropTypes.bool,
  }).isRequired,
  onSetOrgAdmin: PropTypes.func.isRequired,
  onSetUserActive: PropTypes.func.isRequired,
};

/**
 * The people in one organization.
 *
 * `unavailable` renders distinctly and never as an empty team: "we could not
 * read the members" and "this organization has none" look identical otherwise,
 * and only one of them is fine.
 */
export default function MembersPanel({
  shortCode, members, unavailable, onSetOrgAdmin, onSetUserActive,
}) {
  const { t } = useTranslation('common');

  if (unavailable) {
    return (
      <div className={styles.warning} data-testid="members-unavailable">
        {t('org_admin_members_unavailable')}
      </div>
    );
  }

  if (!members.length) {
    return (
      <div data-testid="members-empty">
        <EmptyState
          message={t('org_admin_members_empty')}
          sub={t('org_admin_members_empty_sub')}
        />
      </div>
    );
  }

  return (
    <ul className={styles.memberList} data-testid={`members-${shortCode}`}>
      {members.map((member) => (
        <MemberRow
          key={member.objectId}
          member={member}
          onSetOrgAdmin={onSetOrgAdmin}
          onSetUserActive={onSetUserActive}
        />
      ))}
    </ul>
  );
}

MembersPanel.defaultProps = { unavailable: false };

MembersPanel.propTypes = {
  shortCode: PropTypes.string.isRequired,
  members: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  unavailable: PropTypes.bool,
  onSetOrgAdmin: PropTypes.func.isRequired,
  onSetUserActive: PropTypes.func.isRequired,
};

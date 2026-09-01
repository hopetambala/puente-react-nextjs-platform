import { Badge, Button, EmptyState, Panel } from 'app/impacto-design-system';
import { summarizeOutstanding } from 'app/modules/billing/whoOwesWhat';
import { useTranslation } from 'next-i18next';
import PropTypes from 'prop-types';
import { useState } from 'react';

import styles from './Billing.module.css';

/**
 * Stripe amounts are integer minor units. Dividing by 100 for display is the
 * only place that conversion happens; the value itself never becomes a float.
 */
const formatMoney = (minorUnits, currency) => new Intl.NumberFormat(undefined, {
  style: 'currency', currency: (currency || 'usd').toUpperCase(),
}).format((minorUnits || 0) / 100);

/**
 * The billing surface — who owes what, and what each organization is on.
 *
 * Staff-only. The route guard is a courtesy; every endpoint behind this screen
 * is gated server-side on `puente_staff`.
 *
 * There is deliberately **no control that settles an invoice**. Stripe holds the
 * money and is the only ledger, so a "mark paid" button here would be the start
 * of a competing opinion about whether cash arrived. A test asserts its absence.
 */
export default function Billing({
  organizations, invoices, now, onSaveOrg, stripeConfigured,
}) {
  const { t } = useTranslation('common');
  // Deliberately NOT persisted. Age is re-asserted as the default on every
  // load, so the screen cannot quietly come up amount-sorted one morning and
  // change which invoice someone chases. Sorting is an act, not a setting.
  const [sortBy, setSortBy] = useState('age');
  const [edits, setEdits] = useState({});
  const [orgError, setOrgError] = useState(null);
  const outstanding = summarizeOutstanding({ invoices, now, sortBy });

  const nameFor = (shortCode) => {
    const org = (organizations || []).find((o) => o.shortCode === shortCode);
    return (org && org.name) || shortCode;
  };

  return (
    <div className={styles.surface}>
      <Panel title={t('billing_who_owes_what')}>
        {/* "Could not read" and "nothing owed" must never share copy. On a money
            screen an unreadable state rendered as zero looks like good news. */}
        {outstanding.unavailable && (
          <p className={styles.unavailable}>{t('billing_outstanding_unavailable')}</p>
        )}

        {!outstanding.unavailable && outstanding.rows.length === 0 && (
          <EmptyState
            message={t('billing_nothing_outstanding')}
            sub={t('billing_nothing_outstanding_detail')}
          />
        )}

        {outstanding.rows.length > 0 && (
          <>
            <div className={styles.totals}>
              <span className={styles.total}>
                {formatMoney(outstanding.total, outstanding.currency)}
              </span>
              <span className="cl-dlite-flex-1" />
              {/* Two controls rather than a toggle: the current order must be
                  readable without inferring it from the button's label. */}
              <Button
                text={t('billing_sort_age')}
                isDisabled={outstanding.sortBy === 'age'}
                onClick={() => setSortBy('age')}
              />
              <Button
                text={t('billing_sort_amount')}
                isDisabled={outstanding.sortBy === 'amount'}
                onClick={() => setSortBy('amount')}
              />
            </div>

            {/* Every partner is a US entity billed in USD, so a non-USD invoice
                is a data error. It is kept out of the total and named - summing
                it would fabricate a rate, hiding it would understate the debt. */}
            {outstanding.unexpectedCurrencies.length > 0 && (
              <p className={styles.unavailable}>{t('billing_unexpected_currency')}</p>
            )}
            {outstanding.rows.map((invoice) => (
              <div key={invoice.stripeInvoiceId} className={styles.row}>
                <div className={`${styles.rowMain} cl-dlite-flex-1`}>
                  <span className={styles.orgName}>{nameFor(invoice.organization)}</span>
                  <span className={styles.meta} data-testid="invoice-id">
                    {invoice.stripeInvoiceId}
                  </span>
                </div>
                <span className={styles.amount}>
                  {formatMoney(invoice.amountDue, invoice.currency)}
                </span>
                {invoice.daysOverdue > 0 && (
                  <span className={styles.overdue}>
                    {/* Branched explicitly, not delegated to i18next. The locale
                        codes here are eng/spa/hat rather than BCP-47 en/es/ht,
                        and i18next resolves plurals through Intl.PluralRules,
                        which does not recognise three-letter codes - so the
                        _one form is never selected and every count renders as
                        "1 days overdue" on a document a partner reads. */}
                    {t(
                      invoice.daysOverdue === 1
                        ? 'billing_days_overdue_one'
                        : 'billing_days_overdue_other',
                      // `days`, not `count`: `count` is reserved and makes i18next
                      // append a plural suffix to an already-suffixed key.
                      { days: invoice.daysOverdue },
                    )}
                  </span>
                )}
              </div>
            ))}
          </>
        )}
      </Panel>

      <Panel title={t('billing_organizations')}>
        {orgError && <p className={styles.unavailable}>{orgError}</p>}
        {!stripeConfigured && (
          <p className={styles.meta}>{t('billing_stripe_not_configured')}</p>
        )}
        {(organizations || []).map((org) => {
          const edit = edits[org.shortCode] || {};
          const plan = edit.plan !== undefined ? edit.plan : (org.plan || '');
          const email = edit.billingEmail !== undefined
            ? edit.billingEmail : (org.billingEmail || '');
          const change = (field) => (e) => setEdits((prev) => ({
            ...prev,
            [org.shortCode]: { ...prev[org.shortCode], [field]: e.target.value },
          }));
          const save = async () => {
            try {
              setOrgError(null);
              await onSaveOrg({ shortCode: org.shortCode, plan, billingEmail: email });
            } catch (error) {
              // Never silent: an unsaved billing address means the invoice goes
              // to the old one, or nowhere.
              setOrgError(error.message);
            }
          };
          return (
            <div key={org.shortCode} className={styles.row}>
              <div className={`${styles.rowMain} cl-dlite-flex-1`}>
                <span className={styles.orgName}>{org.name || org.shortCode}</span>
                <span className={styles.meta}>{org.shortCode}</span>
              </div>
              <input
                className={styles.planInput}
                type="text"
                aria-label={t('billing_plan_label')}
                placeholder={t('billing_plan_placeholder')}
                value={plan}
                onChange={change('plan')}
              />
              <input
                className={styles.emailInput}
                type="email"
                aria-label={t('billing_email_label')}
                placeholder={t('billing_email_placeholder')}
                value={email}
                onChange={change('billingEmail')}
              />
              {/* No plan is a decision nobody has made, not a free customer. */}
              <Badge variant={plan ? 'blue' : 'yellow'}>
                {plan || t('billing_no_plan')}
              </Badge>
              <span data-testid={`save-org:${org.shortCode}`}>
                <Button text={t('billing_save_org')} onClick={save} />
              </span>
              {/* Offered only when there is a plan. The composer would refuse an
                  unpriced organization anyway, and a button that can only fail
                  is worse than no button. */}
              {plan && (
                <span data-testid={`create-invoice:${org.shortCode}`}>
                  <Button
                    text={t('billing_create_invoice')}
                    isDisabled={!stripeConfigured}
                  />
                </span>
              )}
            </div>
          );
        })}
      </Panel>
    </div>
  );
}

Billing.propTypes = {
  organizations: PropTypes.arrayOf(PropTypes.shape({})),
  invoices: PropTypes.arrayOf(PropTypes.shape({})),
  now: PropTypes.instanceOf(Date),
  onSaveOrg: PropTypes.func,
  stripeConfigured: PropTypes.bool,
};

Billing.defaultProps = {
  organizations: [], invoices: [], now: undefined,
  onSaveOrg: () => {}, stripeConfigured: false,
};
